/**
 * 把动图压平后重新编码。
 *
 * # 为什么重排、插帧都必须先压平
 *
 * GIF 的帧大多是**差分帧**：每帧只画一小块，其余部分沿用上一帧。
 * 直接调换字节切片的顺序，新顺序里的「上一帧」就变了，画面会错乱。
 * 例如 B 帧只画了一个球的新位置，把它挪到 A 帧前面，球就会画在空画布上。
 *
 * 插入新帧也是一样：原文件里根本没有这一帧的字节可搬。
 *
 * 所以这时不能搬切片，而要：
 *
 * 1. 按原处置规则把原文件的每一帧合成成**整幅画面**（{@link compositeFrames}，
 *    插入的帧本身就是整幅画面）；
 * 2. 按输出顺序把这些整幅画面重新编码，每帧都是全画布。
 *
 * 这样输出就与界面上看到的缩略图完全一致。
 *
 * # 颜色
 *
 * 全画布的帧用一条共享调色板最省空间，所以优先把整个动图用到的颜色收进一张表。
 * 颜色超过 256 色（只有多张局部调色板叠加时才会发生）才退化成每帧独立的局部调色板；
 * 单帧自己还超 256 色时才做中位切分量化，并通过 {@link GIFFlattenResult.lossy} 报出来。
 *
 * # 透明度
 *
 * 压平后每帧都从「清空过的画布」开始画，所以带透明的动图统一用 `disposal = 2`
 * （显示完就清空），这样透明区域不会透出上一帧的内容；不含透明的动图用 `disposal = 1`。
 *
 * # 会丢什么
 *
 * 重编码只保证「画面 + 时长 + 循环次数」一致：注释、XMP 之类的元数据会丢，
 * 交错标记也不再保留（显示效果不受影响）。只改时长而不换顺序时走的是
 * `GIFWriter` 的字节路径，什么都不会丢。
 */

import { makeLoopExtension } from "./GIFWriter";

/** 压平重编码的输入 */
export interface GIFFlattenOptions {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** 按输出顺序排列的整幅画面，每项长度必须是 `width * height * 4` */
  frames: Uint8ClampedArray<ArrayBuffer>[];
  /** 每一帧的显示时长（1/100 秒），与 {@link frames} 一一对应 */
  delaysCentiseconds: number[];
  /** 循环次数；`0` 表示无限循环 */
  loopCount: number;
  /** 原文件是否真的有循环扩展（`loopCount === 0` 时靠它区分「没有」和「无限」） */
  hasLoopExtension: boolean;
}

/** 压平重编码的结果 */
export interface GIFFlattenResult {
  /** 新 GIF 的字节 */
  bytes: Uint8Array;
  /** 是否因为单帧颜色超过 256 色而做了有损量化 */
  lossy: boolean;
}

/** 一条调色板，以及「颜色 → 索引」的映射 */
interface Palette {
  /** 调色板颜色；需要透明时最后一项是占位色 */
  colors: number[][];
  /** 透明色索引；`-1` 表示不透明 */
  transparentIndex: number;
  /** 原始颜色（打包成整数）→ 调色板索引 */
  mapping: Map<number, number>;
  /** 是否发生了有损量化 */
  lossy: boolean;
}

/**
 * 按给定顺序压平并重编码。
 *
 * @param options 画布尺寸、按输出顺序排列的整幅画面、对应的时长
 */
export function flattenGIF(options: GIFFlattenOptions): GIFFlattenResult {
  const { width, height, frames, delaysCentiseconds } = options;

  const needsTransparent = frames.some(hasTransparentPixel);

  // 先试试能不能用一张全局调色板装下所有颜色
  const union = new Map<number, number>();
  for (const rgba of frames) collectColors(rgba, union);
  const globalLimit = needsTransparent ? 255 : 256;

  let lossy = false;
  let sharedPalette: Palette | null = null;
  let localPalettes: Palette[] | null = null;

  if (union.size <= globalLimit) {
    sharedPalette = buildPalette(union, needsTransparent, globalLimit);
  } else {
    // 颜色太多：每帧用自己的局部调色板，尽量不做量化
    localPalettes = frames.map((rgba) => {
      const histogram = new Map<number, number>();
      collectColors(rgba, histogram);
      const frameTransparent = hasTransparentPixel(rgba);
      const palette = buildPalette(histogram, frameTransparent, frameTransparent ? 255 : 256);
      if (palette.lossy) lossy = true;
      return palette;
    });
  }

  const encodedFrames = frames.map((rgba, index) => {
    const palette = sharedPalette ?? localPalettes![index];
    return {
      indices: mapPixels(rgba, palette.mapping, palette.transparentIndex),
      colors: palette.colors,
      transparentIndex: palette.transparentIndex,
    };
  });

  const bytes = assembleGIF({
    width,
    height,
    frames: encodedFrames,
    sharedPalette,
    delaysCentiseconds,
    loopCount: options.loopCount,
    hasLoopExtension: options.hasLoopExtension,
    disposal: needsTransparent ? 2 : 1,
  });

  return { bytes, lossy };
}

/** 写回用的单帧 */
interface FlattenedFrame {
  indices: Uint8Array;
  colors: number[][];
  transparentIndex: number;
}

interface WriteOptions {
  width: number;
  height: number;
  frames: FlattenedFrame[];
  /** 有值时所有帧共用这张全局调色板，不再写局部调色板 */
  sharedPalette: Palette | null;
  delaysCentiseconds: number[];
  loopCount: number;
  hasLoopExtension: boolean;
  /** 帧处置方式：带透明用 2（显示完清空），否则用 1（保留） */
  disposal: number;
}

/** 按 GIF89a 的字节布局拼出一个完整文件 */
function assembleGIF(options: WriteOptions): Uint8Array {
  const { width, height, frames, sharedPalette, delaysCentiseconds, disposal } = options;

  const chunks: Uint8Array[] = [];

  const header: number[] = [
    0x47,
    0x49,
    0x46,
    0x38,
    0x39,
    0x61, // "GIF89a"
  ];
  pushU16(header, width);
  pushU16(header, height);

  const globalTableBits = sharedPalette ? tableBitsOf(sharedPalette.colors.length) : 0;
  header.push(sharedPalette ? 0x80 | 0x70 | (globalTableBits - 1) : 0x70);
  header.push(0x00); // 背景色索引
  header.push(0x00); // 像素宽高比
  chunks.push(Uint8Array.from(header));

  if (sharedPalette) {
    chunks.push(paletteBytes(sharedPalette.colors, globalTableBits));
  }

  if (options.hasLoopExtension) {
    chunks.push(makeLoopExtension(options.loopCount));
  }

  frames.forEach((frame, index) => {
    const delay = delaysCentiseconds[index] ?? 0;
    const useLocal = !sharedPalette;
    const localBits = tableBitsOf(frame.colors.length);

    const control = new Uint8Array(8);
    control.set([0x21, 0xf9, 0x04]);
    control[3] = ((disposal & 0x07) << 2) | (frame.transparentIndex >= 0 ? 0x01 : 0x00);
    control[4] = delay & 0xff;
    control[5] = (delay >> 8) & 0xff;
    control[6] = frame.transparentIndex >= 0 ? frame.transparentIndex : 0x00;
    control[7] = 0x00;
    chunks.push(control);

    const descriptor = new Uint8Array(10);
    descriptor[0] = 0x2c;
    pushU16At(descriptor, 5, width);
    pushU16At(descriptor, 7, height);
    descriptor[9] = useLocal ? 0x80 | (localBits - 1) : 0x00;
    chunks.push(descriptor);

    if (useLocal) {
      chunks.push(paletteBytes(frame.colors, localBits));
    }

    const minCodeSize = Math.max(2, useLocal ? localBits : globalTableBits);
    chunks.push(Uint8Array.from([minCodeSize]));
    chunks.push(writeSubBlocks(lzwEncode(minCodeSize, frame.indices)));
  });

  chunks.push(Uint8Array.from([0x3b]));
  return concat(chunks);
}

// ─────────────────────────────────────────────────────────────
// 调色板

/** 一条颜色会占用的槽位数：透明色要多占一个 */
function buildPalette(
  histogram: Map<number, number>,
  needsTransparent: boolean,
  limit: number,
): Palette {
  const keys = [...histogram.keys()];
  const mapping = new Map<number, number>();
  let colors: number[][];
  let lossy = false;

  if (keys.length <= limit) {
    colors = keys.map(unpackColor);
    keys.forEach((key, index) => mapping.set(key, index));
  } else {
    const quantized = medianCut(histogram, limit);
    colors = quantized.palette;
    for (const [key, index] of quantized.mapping) mapping.set(key, index);
    lossy = true;
  }

  let transparentIndex = -1;
  if (needsTransparent) {
    transparentIndex = colors.length;
    colors.push([0, 0, 0]);
  }

  return { colors, transparentIndex, mapping, lossy };
}

/** 中位切分量化：把颜色按出现次数加权切成 `maxColors` 桶，每桶取加权平均色 */
function medianCut(
  histogram: Map<number, number>,
  maxColors: number,
): { palette: number[][]; mapping: Map<number, number> } {
  const colors: ColorEntry[] = [];
  for (const [key, count] of histogram) {
    colors.push({ key, count, r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff });
  }

  const boxes: ColorEntry[][] = [colors];
  while (boxes.length < maxColors) {
    let bestIndex = -1;
    let bestRange = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { range } = widestChannel(boxes[i]);
      if (range > bestRange) {
        bestRange = range;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;

    const box = boxes[bestIndex];
    const { channel } = widestChannel(box);
    box.sort((a, b) => channelOf(a, channel) - channelOf(b, channel));

    const total = box.reduce((sum, entry) => sum + entry.count, 0);
    let accumulated = 0;
    let split = 1;
    for (let i = 0; i < box.length - 1; i++) {
      accumulated += box[i].count;
      if (accumulated * 2 >= total) {
        split = i + 1;
        break;
      }
    }
    boxes.splice(bestIndex, 1, box.slice(0, split), box.slice(split));
  }

  const palette: number[][] = [];
  const mapping = new Map<number, number>();
  for (const box of boxes) {
    if (box.length === 0) continue;
    const index = palette.length;
    const total = box.reduce((sum, entry) => sum + entry.count, 0);
    palette.push([
      Math.round(box.reduce((sum, entry) => sum + entry.r * entry.count, 0) / total),
      Math.round(box.reduce((sum, entry) => sum + entry.g * entry.count, 0) / total),
      Math.round(box.reduce((sum, entry) => sum + entry.b * entry.count, 0) / total),
    ]);
    for (const entry of box) mapping.set(entry.key, index);
  }

  return { palette, mapping };
}

interface ColorEntry {
  key: number;
  count: number;
  r: number;
  g: number;
  b: number;
}

function widestChannel(box: ColorEntry[]): { channel: 0 | 1 | 2; range: number } {
  let minR = 255,
    maxR = 0,
    minG = 255,
    maxG = 0,
    minB = 255,
    maxB = 0;
  for (const entry of box) {
    if (entry.r < minR) minR = entry.r;
    if (entry.r > maxR) maxR = entry.r;
    if (entry.g < minG) minG = entry.g;
    if (entry.g > maxG) maxG = entry.g;
    if (entry.b < minB) minB = entry.b;
    if (entry.b > maxB) maxB = entry.b;
  }
  const rangeR = maxR - minR;
  const rangeG = maxG - minG;
  const rangeB = maxB - minB;
  if (rangeR >= rangeG && rangeR >= rangeB) return { channel: 0, range: rangeR };
  if (rangeG >= rangeB) return { channel: 1, range: rangeG };
  return { channel: 2, range: rangeB };
}

function channelOf(entry: ColorEntry, channel: 0 | 1 | 2): number {
  return channel === 0 ? entry.r : channel === 1 ? entry.g : entry.b;
}

// ─────────────────────────────────────────────────────────────
// 像素与颜色

function hasTransparentPixel(rgba: Uint8ClampedArray): boolean {
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] === 0) return true;
  }
  return false;
}

function collectColors(rgba: Uint8ClampedArray, histogram: Map<number, number>): void {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const packed = packColor(rgba[i], rgba[i + 1], rgba[i + 2]);
    histogram.set(packed, (histogram.get(packed) ?? 0) + 1);
  }
}

function mapPixels(
  rgba: Uint8ClampedArray,
  mapping: Map<number, number>,
  transparentIndex: number,
): Uint8Array {
  const indices = new Uint8Array(rgba.length / 4);
  for (let p = 0; p < indices.length; p++) {
    const at = p * 4;
    if (rgba[at + 3] === 0) {
      indices[p] = transparentIndex >= 0 ? transparentIndex : 0;
      continue;
    }
    indices[p] = mapping.get(packColor(rgba[at], rgba[at + 1], rgba[at + 2])) ?? 0;
  }
  return indices;
}

function packColor(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function unpackColor(packed: number): number[] {
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

// ─────────────────────────────────────────────────────────────
// LZW

/**
 * GIF 的 LZW 编码。
 *
 * 与 `GIFParser.lzwDecode` 配对：字典键用「前缀码 * 256 + 符号」的整数，
 * 码长在 `next > 1 << codeSize` 时增长（解码器的字典比编码器慢一格）。
 */
function lzwEncode(minCodeSize: number, indices: Uint8Array): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  const out: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let codeSize = minCodeSize + 1;
  const dictionary = new Map<number, number>();
  let nextCode = endCode + 1;

  const drain = () => {
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };
  const emit = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    drain();
  };
  const reset = () => {
    dictionary.clear();
    nextCode = endCode + 1;
    codeSize = minCodeSize + 1;
  };
  /** 收尾：不足 8 位的残余比特补零成一个完整字节 */
  const finish = () => {
    drain();
    if (bitCount > 0) {
      out.push(bitBuffer & 0xff);
      bitBuffer = 0;
      bitCount = 0;
    }
  };

  emit(clearCode);
  reset();

  if (indices.length === 0) {
    emit(endCode);
    finish();
    return Uint8Array.from(out);
  }

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const symbol = indices[i];
    const key = prefix * 256 + symbol;
    const found = dictionary.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    dictionary.set(key, nextCode++);
    if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
    if (nextCode >= 4096) {
      emit(clearCode);
      reset();
    }
    prefix = symbol;
  }

  emit(prefix);
  emit(endCode);
  finish();
  return Uint8Array.from(out);
}

// ─────────────────────────────────────────────────────────────
// 字节工具

function tableBitsOf(colorCount: number): number {
  return Math.max(1, Math.ceil(Math.log2(Math.max(2, colorCount))));
}

function paletteBytes(colors: number[][], tableBits: number): Uint8Array {
  const size = 1 << tableBits;
  const bytes = new Uint8Array(size * 3);
  for (let i = 0; i < size; i++) {
    const color = colors[i] ?? [0, 0, 0];
    bytes[i * 3] = color[0];
    bytes[i * 3 + 1] = color[1];
    bytes[i * 3 + 2] = color[2];
  }
  return bytes;
}

/** 把 LZW 数据切成 ≤255 字节的子块，并补块终止符 */
function writeSubBlocks(data: Uint8Array): Uint8Array {
  const blockCount = Math.ceil(data.length / 255);
  const out = new Uint8Array(data.length + blockCount + 1);
  let offset = 0;
  for (let i = 0; i < data.length; i += 255) {
    const length = Math.min(255, data.length - i);
    out[offset++] = length;
    out.set(data.subarray(i, i + length), offset);
    offset += length;
  }
  out[offset] = 0;
  return out;
}

function pushU16(target: number[], value: number): void {
  target.push(value & 0xff, (value >> 8) & 0xff);
}

function pushU16At(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
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
