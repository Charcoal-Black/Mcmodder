/**
 * GIF 的字节级写回：把解析出来的帧片段重新拼成一个 GIF。
 *
 * # 为什么不重新编码
 *
 * 只要不碰像素，就不该重新编码——重新编码会丢颜色、改变文件大小，而且慢。
 * 改时长只是改写 Graphic Control Extension 里的两个字节，其余字节原样搬运，
 * 所以写出来的文件和原文件只差那两个字节，画质一点都不会变。
 *
 * # 拼装方式
 *
 * 文件 = 头部 + 每个输出的帧片段 + 尾部。
 *
 * - 「头部」是第一个帧片段之前的所有字节（文件头、全局调色板、NETSCAPE 循环块……）
 * - 「尾部」是最后一个帧片段之后的所有字节（注释块、结束符……）
 * - 落在两帧之间的扩展块不属于任何一帧，会跟着后面那一帧搬迁
 *
 * 循环次数是文件级的，只影响头部：改次数时只复制头部、改写那两个字节；
 * 原文件没有循环块，就按惯例在逻辑屏幕描述符之后补一个 19 字节的 NETSCAPE2.0 块。
 *
 * 这个拼接方式也是后续「删帧 / 排序 / 复制帧」的基础：只要调整 {@link GIFWriteOptions.order}。
 */

import type { GIFDocument, GIFFrameSlice } from "./GIFParser";

/** {@link writeGIF} 的可选参数 */
export interface GIFWriteOptions {
  /**
   * 输出帧的顺序，元素是**原文件里的帧序号**。
   *
   * 省略时按原顺序输出。重复某个序号即可复制该帧，省略某个序号即可删除该帧。
   */
  order?: number[];
  /**
   * 每一帧输出时的时长（单位 1/100 秒），与 {@link order} 一一对应。
   *
   * 省略的项沿用该帧原来的时长；帧本身没有 GCE 时按需要补一个。
   */
  delaysCentiseconds?: number[];
  /**
   * 循环次数；`0` 表示无限循环。
   *
   * 省略时沿用原文件；原文件没有循环扩展、又给了值时，会补一个。
   */
  loopCount?: number;
}

/**
 * 按给定顺序、时长和循环次数重新拼装 GIF。
 *
 * 不做任何像素处理：没被改动的帧整段原样搬运。
 */
export function writeGIF(document: GIFDocument, options: GIFWriteOptions = {}): Uint8Array {
  const { frames } = document;
  if (frames.length === 0) return document.bytes.slice();

  const order = options.order ?? frames.map((frame) => frame.index);
  const delays = options.delaysCentiseconds;
  const header = writeHeader(
    document,
    options.loopCount === undefined ? null : clampLoopCount(options.loopCount),
  );

  const chunks: Uint8Array[] = [...header.chunks];
  for (let i = 0; i < order.length; i++) {
    const frame = frames[order[i]];
    if (!frame) throw new Error(`帧序号越界：${order[i]}`);
    chunks.push(writeFrame(header.source, frame, delays?.[i] ?? frame.delayCentiseconds));
  }

  // 尾部：最后一个帧片段之后的一切（帧间注释块、结束符……）
  chunks.push(header.source.subarray(frames[frames.length - 1].byteEnd));

  return concat(chunks);
}

/** 头部的拼装结果 */
interface GIFHeaderWrite {
  /** 帧片段和尾部要从这份字节里取：改循环次数时可能是复制出来的副本 */
  source: Uint8Array;
  /** 头部各段，按顺序拼接 */
  chunks: Uint8Array[];
}

/**
 * 拼出头部，必要时改写或补上 NETSCAPE2.0 循环块。
 *
 * @param loopCount 目标循环次数；`null` 表示沿用原文件
 */
function writeHeader(document: GIFDocument, loopCount: number | null): GIFHeaderWrite {
  const { bytes, frames, loopExtension, loopCount: originalLoopCount } = document;
  const headEnd = frames[0].byteStart;
  const untouched = (): GIFHeaderWrite => ({
    source: bytes,
    chunks: [bytes.subarray(0, headEnd)],
  });

  if (loopCount === null) return untouched();

  if (!loopExtension) {
    // 原文件没有循环块：按惯例补在逻辑屏幕描述符 + 全局调色板之后
    const at = Math.min(loopExtensionInsertOffset(bytes), headEnd);
    return {
      source: bytes,
      chunks: [bytes.subarray(0, at), makeLoopExtension(loopCount), bytes.subarray(at, headEnd)],
    };
  }

  if (loopCount === originalLoopCount) return untouched();

  if (loopExtension.end <= headEnd) {
    // 常见情况：循环块就在头部，复制头部后只改那两个字节
    const head = bytes.slice(0, headEnd);
    writeLoopCount(head, loopExtension.countOffset, loopCount);
    return { source: bytes, chunks: [head] };
  }

  // 循环块夹在帧之间：整份复制后原地改，后面的切片跟着用副本
  const source = bytes.slice();
  writeLoopCount(source, loopExtension.countOffset, loopCount);
  return { source, chunks: [source.subarray(0, headEnd)] };
}

/** 输出一帧；时长真的变了才复制字节，没变就连同 GCE 一起原样返回 */
function writeFrame(
  bytes: Uint8Array,
  frame: GIFFrameSlice,
  delayCentiseconds: number,
): Uint8Array {
  const delay = clampDelay(delayCentiseconds);

  if (!frame.hasControlExtension) {
    // 原本没有 GCE：时长为 0 时无需补，否则补一个「不处置、无透明色」的 GCE
    if (delay === 0) return bytes.subarray(frame.byteStart, frame.byteEnd);
    return concat([makeControlExtension(delay), bytes.subarray(frame.byteStart, frame.byteEnd)]);
  }

  if (delay === frame.delayCentiseconds) {
    // 时长没变：整段原样搬运，不复制
    return bytes.subarray(frame.byteStart, frame.byteEnd);
  }

  // 有 GCE：整段复制一份，只改时长那两个字节
  const slice = bytes.slice(frame.byteStart, frame.byteEnd);
  const at = frame.delayOffset - frame.byteStart;
  slice[at] = delay & 0xff;
  slice[at + 1] = (delay >> 8) & 0xff;
  return slice;
}

/**
 * 造一个 Graphic Control Extension。
 *
 * 布局：`21 F9 04 <flags> <时长低> <时长高> <透明色索引> 00`。
 *
 * 只给「原本没有 GCE」的帧用，所以处置方式沿用 0（不处置）、不启用透明色。
 */
function makeControlExtension(delayCentiseconds: number): Uint8Array {
  return new Uint8Array([
    0x21,
    0xf9,
    0x04,
    0x00, // flags：处置方式 0，无透明色
    delayCentiseconds & 0xff,
    (delayCentiseconds >> 8) & 0xff,
    0x00, // 透明色索引（未启用）
    0x00, // 块终止符
  ]);
}

/**
 * 造一个 NETSCAPE2.0 循环扩展块（19 字节）。
 *
 * 布局：`21 FF 0B` + `NETSCAPE2.0` + `03 01 <次数低> <次数高> 00`。
 */
export function makeLoopExtension(loopCount: number): Uint8Array {
  const block = new Uint8Array(19);
  block.set([0x21, 0xff, 0x0b]);
  block.set(
    Array.from("NETSCAPE2.0", (char) => char.charCodeAt(0)),
    3,
  );
  block[14] = 0x03;
  block[15] = 0x01;
  writeLoopCount(block, 16, clampLoopCount(loopCount));
  block[18] = 0x00;
  return block;
}

/** 把循环次数写进小端两个字节 */
function writeLoopCount(target: Uint8Array, offset: number, loopCount: number) {
  target[offset] = loopCount & 0xff;
  target[offset + 1] = (loopCount >> 8) & 0xff;
}

/**
 * 循环扩展应该插在哪：逻辑屏幕描述符（13 字节）和全局调色板之后。
 *
 * 这是应用扩展的惯常位置，也保证插在第一帧之前。
 */
function loopExtensionInsertOffset(bytes: Uint8Array): number {
  const packed = bytes[10] ?? 0;
  const globalTableSize = (packed & 0x80) !== 0 ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
  return 13 + globalTableSize;
}

/** GIF 的时长字段是无符号 16 位，单位 1/100 秒 */
function clampDelay(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(0xffff, Math.max(0, Math.round(value)));
}

/** 循环次数也是无符号 16 位；`0` 表示无限循环 */
function clampLoopCount(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(0xffff, Math.max(0, Math.round(value)));
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
