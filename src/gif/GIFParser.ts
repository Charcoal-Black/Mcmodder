/**
 * GIF 的字节级解析：把文件拆成「头部 + 若干帧」，保留每一帧的原始字节范围。
 *
 * # 为什么要保留字节范围
 *
 * 编辑动图时，**不碰像素就不该重新编码**。改时长只是改 GCE 里的两个字节；
 * 删帧是切掉一段字节；插帧是复制一段字节——这些操作都能在原始字节上完成，
 * 保证其余部分一个字节都不动。
 *
 * 所以这里解析出来的帧不是「一坨像素」，而是**指向原文件某一段的视图**：
 * {@link GIFFrameSlice.byteStart} / {@link GIFFrameSlice.byteEnd} 标出它在原始字节里的位置。
 */

/**
 * 一帧在原始字节中的位置，以及它自己的元信息。
 *
 * 「切片」是刻意这么叫的：它不是一份独立的数据，而是**原始字节里的一段**。
 */
export interface GIFFrameSlice {
  /** 帧序号，从 0 开始 */
  index: number;
  /** 该帧（含其 Graphic Control Extension）在原始字节中的起始偏移 */
  byteStart: number;
  /** 该帧在原始字节中的结束偏移（不含） */
  byteEnd: number;
  /** 帧在画布上的左上角横坐标 */
  left: number;
  /** 帧在画布上的左上角纵坐标 */
  top: number;
  /** 帧自身的宽度 */
  width: number;
  /** 帧自身的高度 */
  height: number;
  /** 显示时长，单位 1/100 秒 */
  delayCentiseconds: number;
  /** 帧处置方式 */
  disposal: number;
  /** 透明色在调色板中的索引；`-1` 表示没有透明色 */
  transparentIndex: number;
  /** 帧是否自带局部调色板 */
  hasLocalPalette: boolean;
  /** 帧的像素是否交错存储 */
  interlaced: boolean;
  /** LZW 最小码长 */
  minCodeSize: number;
  /** 该帧像素数据的起始偏移（指向 LZW 数据，不含子块长度字节） */
  dataStart: number;
  /** 该帧像素数据的结束偏移（不含） */
  dataEnd: number;
  /** 该帧使用的调色板；每项是 `[r, g, b]` */
  palette: number[][];
  /** 该帧是否带 Graphic Control Extension（时长、处置方式、透明色都记在这里） */
  hasControlExtension: boolean;
  /**
   * 时长字段（2 字节，小端）在原始字节中的起始偏移；该帧没有 GCE 时为 `-1`。
   *
   * 改时长只需改写这两个字节，文件其余部分一个字节都不动。
   */
  delayOffset: number;
}

/** NETSCAPE2.0 循环扩展块在文件里的位置 */
export interface GIFLoopExtension {
  /** 块起点：引导符 `0x21` 所在的位置 */
  start: number;
  /** 块终点：终止符之后的第一个字节（不包含在块内） */
  end: number;
  /** 循环次数那两个字节的偏移（小端） */
  countOffset: number;
}

/** 整个文件的解析结果 */
export interface GIFDocument {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** 全局调色板；没有则为 `null` */
  globalPalette: number[][] | null;
  /** 背景色在全局调色板中的索引 */
  backgroundColorIndex: number;
  /** 循环次数；`0` 表示无限循环 */
  loopCount: number;
  /**
   * NETSCAPE2.0 循环扩展块的位置；文件里没有时为 `null`。
   *
   * `loopCount === 0` 既可能是「没有循环扩展」，也可能是「无限循环」，
   * 重编码时要靠这个字段区分。
   */
  loopExtension: GIFLoopExtension | null;
  /** 逐帧信息，顺序与文件中一致 */
  frames: GIFFrameSlice[];
  /** 文件的原始字节 */
  bytes: Uint8Array;
}

/**
 * 解析 GIF 的字节结构。
 *
 * 只做结构解析，不解码像素——像素解码见 {@link decodeFrameIndices}。
 */
export function parseGIF(bytes: Uint8Array): GIFDocument {
  let p = 0;
  const readU16 = () => {
    const v = bytes[p] | (bytes[p + 1] << 8);
    p += 2;
    return v;
  };

  const signature = String.fromCharCode(bytes[0], bytes[1], bytes[2]);
  if (signature !== "GIF") {
    throw new Error("不是 GIF 文件：文件头标识错误...");
  }
  const version = String.fromCharCode(bytes[3], bytes[4], bytes[5]);
  if (version !== "87a" && version !== "89a") {
    throw new Error(`不是 GIF 文件：版本标识是 ${version}...`);
  }
  p = 6;

  const width = readU16();
  const height = readU16();
  const packed = bytes[p++];
  const backgroundColorIndex = bytes[p++];
  p += 1; // 像素宽高比，用不上

  const hasGlobalPalette = (packed & 0x80) !== 0;
  const globalPaletteSize = 1 << ((packed & 0x07) + 1);
  let globalPalette: number[][] | null = null;
  if (hasGlobalPalette) {
    globalPalette = readPalette(bytes, p, globalPaletteSize);
    p += globalPaletteSize * 3;
  }

  const frames: GIFFrameSlice[] = [];
  let loopCount = 0;
  let loopExtension: GIFLoopExtension | null = null;

  // 悬在「下一个帧」前面的 Graphic Control Extension
  let pendingControl: {
    delayCentiseconds: number;
    disposal: number;
    transparentIndex: number;
    /** 时长字段在原始字节中的偏移 */
    delayOffset: number;
    start: number;
    end: number;
  } | null = null;

  while (p < bytes.length) {
    const blockStart = p;
    const marker = bytes[p];

    if (marker === 0x3b) {
      // 结束符
      break;
    }

    if (marker === 0x21) {
      // 扩展块
      const label = bytes[p + 1];
      p += 2;
      if (label === 0xf9) {
        // Graphic Control Extension：帧的时长、处置方式、透明色都在这里
        p += 1; // 块长度（恒为 4）
        const flags = bytes[p++];
        const delayOffset = p;
        const delayCentiseconds = bytes[p] | (bytes[p + 1] << 8);
        p += 2;
        const transparentIndex = bytes[p++];
        p += 1; // 块终止符
        pendingControl = {
          delayCentiseconds,
          disposal: (flags >> 2) & 0x07,
          transparentIndex: (flags & 0x01) !== 0 ? transparentIndex : -1,
          delayOffset,
          start: blockStart,
          end: p,
        };
      } else if (label === 0xff) {
        // 应用扩展：NETSCAPE2.0 的第一个子块里是循环次数
        const blockSize = bytes[p];
        const appId = String.fromCharCode(...bytes.subarray(p + 1, p + 1 + blockSize));
        p += 1 + blockSize;
        const subBlockStart = p;
        let loopBlock: GIFLoopExtension | null = null;
        if (appId === "NETSCAPE2.0" && bytes[p] >= 3 && bytes[p + 1] === 1) {
          loopCount = bytes[p + 2] | (bytes[p + 3] << 8);
          // 先记下次数位置，块终点等跳完子块再补
          loopBlock = { start: blockStart, end: 0, countOffset: p + 2 };
        }
        p = subBlockStart;
        // 跳过子块序列
        while (p < bytes.length && bytes[p] !== 0) {
          p += 1 + bytes[p];
        }
        p += 1;
        if (loopBlock) {
          loopBlock.end = p;
          loopExtension = loopBlock;
        }
      } else {
        // 其余扩展（注释、纯文本等）：跳过子块序列
        while (p < bytes.length && bytes[p] !== 0) {
          p += 1 + bytes[p];
        }
        p += 1;
      }
      continue;
    }

    if (marker === 0x2c) {
      // 图像描述符
      p += 1;
      const left = readU16();
      const top = readU16();
      const frameWidth = readU16();
      const frameHeight = readU16();
      const flags = bytes[p++];
      const hasLocalPalette = (flags & 0x80) !== 0;
      const interlaced = (flags & 0x40) !== 0;
      const localPaletteSize = 1 << ((flags & 0x07) + 1);

      let palette = globalPalette;
      if (hasLocalPalette) {
        palette = readPalette(bytes, p, localPaletteSize);
        p += localPaletteSize * 3;
      }

      const minCodeSize = bytes[p++];

      // 像素数据是一串「长度 + 数据」子块；长度字节在解码时跳过
      const dataStart = p;
      while (p < bytes.length && bytes[p] !== 0) {
        p += 1 + bytes[p];
      }
      const dataEnd = p;
      p += 1; // 块终止符

      frames.push({
        index: frames.length,
        byteStart: pendingControl ? pendingControl.start : blockStart,
        byteEnd: p,
        left,
        top,
        width: frameWidth,
        height: frameHeight,
        delayCentiseconds: pendingControl ? pendingControl.delayCentiseconds : 0,
        disposal: pendingControl ? pendingControl.disposal : 0,
        transparentIndex: pendingControl ? pendingControl.transparentIndex : -1,
        hasLocalPalette,
        interlaced,
        minCodeSize,
        dataStart,
        dataEnd,
        palette: palette ?? [],
        hasControlExtension: pendingControl !== null,
        delayOffset: pendingControl ? pendingControl.delayOffset : -1,
      });
      pendingControl = null;
      continue;
    }

    // 未知标记：跳过，避免死循环
    p = blockStart + 1;
  }

  return {
    width,
    height,
    globalPalette,
    backgroundColorIndex,
    loopCount,
    loopExtension,
    frames,
    bytes,
  };
}

/** 从字节里读出 `size` 个 `[r, g, b]` 调色板项 */
function readPalette(bytes: Uint8Array, offset: number, size: number): number[][] {
  const palette: number[][] = [];
  for (let i = 0; i < size; i++) {
    const at = offset + i * 3;
    palette.push([bytes[at], bytes[at + 1], bytes[at + 2]]);
  }
  return palette;
}

/**
 * 解码一帧的 LZW 像素数据，得到「调色板索引」数组。
 *
 * 返回的是索引而不是颜色——索引配合 {@link GIFFrameSlice.palette} 才能还原成颜色，
 * 这也是「放大时调色板可以一个字节都不改」的原因。
 */
export function decodeFrameIndices(bytes: Uint8Array, frame: GIFFrameSlice): Uint8Array {
  const raw = new Uint8Array(frame.dataEnd - frame.dataStart);
  let offset = 0;
  let p = frame.dataStart;
  while (p < frame.dataEnd && bytes[p] !== 0) {
    const length = bytes[p];
    raw.set(bytes.subarray(p + 1, p + 1 + length), offset);
    offset += length;
    p += 1 + length;
  }
  const indices = lzwDecode(frame.minCodeSize, raw, frame.width * frame.height);
  return frame.interlaced ? deinterlace(indices, frame.width) : indices;
}

/**
 * LZW 解码。
 *
 * @param minCodeSize LZW 最小码长
 * @param data 去掉子块长度字节后的 LZW 数据
 * @param pixelCount 期望的像素数
 */
export function lzwDecode(minCodeSize: number, data: Uint8Array, pixelCount: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const prefix = new Int32Array(4096).fill(-1);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4096);
  for (let i = 0; i < clearCode; i++) suffix[i] = i;

  const out = new Uint8Array(pixelCount);
  let outPos = 0;

  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let oldCode = -1;
  let firstChar = 0;

  let bitBuffer = 0;
  let bitCount = 0;
  let dataPos = 0;

  const readCode = (): number => {
    while (bitCount < codeSize) {
      if (dataPos >= data.length) return endCode;
      bitBuffer |= data[dataPos++] << bitCount;
      bitCount += 8;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  while (outPos < pixelCount) {
    const code = readCode();
    if (code === endCode) break;

    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
      oldCode = -1;
      continue;
    }

    if (oldCode === -1) {
      if (code >= clearCode) break; // 数据损坏
      out[outPos++] = code;
      firstChar = code;
      oldCode = code;
      continue;
    }

    let stackTop = 0;
    let current = code;
    if (current === nextCode) {
      // 码恰好等于「下一个待分配码」：这一串就是 oldCode 那串再加它的首字符
      stack[stackTop++] = firstChar;
      current = oldCode;
    }
    while (current > clearCode) {
      stack[stackTop++] = suffix[current];
      current = prefix[current];
    }
    firstChar = suffix[current];
    stack[stackTop++] = firstChar;

    if (nextCode < 4096) {
      prefix[nextCode] = oldCode;
      suffix[nextCode] = firstChar;
      nextCode++;
      if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
    }
    oldCode = code;

    while (stackTop > 0 && outPos < pixelCount) {
      out[outPos++] = stack[--stackTop];
    }
  }

  return out;
}

/**
 * 把交错存储的像素还原成正常行序。
 *
 * 交错帧的行按「前 8 行、隔 8 行、前 4 行隔 4 行、前 2 行隔 2 行」四轮写入，
 * 这里按同样的顺序还原。
 */
export function deinterlace(pixels: Uint8Array, width: number): Uint8Array {
  const rows = Math.floor(pixels.length / width);
  const out = new Uint8Array(pixels.length);
  const offsets = [0, 4, 2, 1];
  const steps = [8, 8, 4, 2];
  let fromRow = 0;
  for (let pass = 0; pass < 4; pass++) {
    for (let toRow = offsets[pass]; toRow < rows; toRow += steps[pass]) {
      out.set(pixels.subarray(fromRow * width, (fromRow + 1) * width), toRow * width);
      fromRow++;
    }
  }
  return out;
}
