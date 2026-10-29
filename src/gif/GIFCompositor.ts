import { decodeFrameIndices, type GIFFrameSlice, type GIFDocument } from "./GIFParser";

/** 一帧合成后的画面 */
export interface GIFCompositedFrame {
  /** 整幅画面的 RGBA 数据，长度为 `width * height * 4` */
  rgba: Uint8ClampedArray<ArrayBuffer>;
}

/**
 * 按 GIF89a 的处置规则逐帧合成。
 *
 * # 为什么必须合成
 *
 * 动图的帧大多是**增量帧**：每帧只覆盖画面的一小块，其余部分沿用上一帧的结果。
 * 所以「第 3 帧」本身并不是一幅完整画面——直接把它当图片显示会缺一大块。
 *
 * 只有按处置方式把帧叠起来，才能得到每一帧**实际显示的样子**。
 *
 * # 处置方式
 *
 * - `0` / `1`：保留本帧，下一帧叠在它上面。
 * - `2`：本帧覆盖的矩形区域被清空（恢复成背景，即透明）。
 * - `3`：本帧覆盖的矩形区域恢复成绘制本帧之前的样子。
 */
export function compositeFrames(document: GIFDocument): GIFCompositedFrame[] {
  const { width, height, frames, bytes } = document;
  const canvas = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  // 「恢复前态」需要上一帧之前的画面，单独存一份
  let previous: Uint8ClampedArray<ArrayBuffer> | null = null;

  const result: GIFCompositedFrame[] = [];

  for (const frame of frames) {
    if (frame.disposal === 3) {
      previous = canvas.slice();
    }

    drawFrame(canvas, width, frame, bytes);

    // 输出的是「本帧显示完毕」的画面；处置动作在输出之后才发生
    result.push({ rgba: canvas.slice() });

    if (frame.disposal === 2) {
      // 恢复背景：把本帧覆盖的区域清成透明
      clearRect(canvas, width, frame);
    } else if (frame.disposal === 3 && previous) {
      canvas.set(previous);
      previous = null;
    }
  }

  return result;
}

/** 把一帧画到画布上（透明色不覆盖已有内容） */
function drawFrame(
  canvas: Uint8ClampedArray<ArrayBuffer>,
  canvasWidth: number,
  frame: GIFFrameSlice,
  bytes: Uint8Array,
): void {
  const indices = decodeFrameIndices(bytes, frame);
  const palette = frame.palette;
  const transparent = frame.transparentIndex;

  for (let y = 0; y < frame.height; y++) {
    const targetRow = frame.top + y;
    if (targetRow < 0 || targetRow >= canvas.length / 4 / canvasWidth) continue;
    for (let x = 0; x < frame.width; x++) {
      const index = indices[y * frame.width + x];
      if (index === transparent) continue; // 透明色：保留下层
      const color = palette[index];
      if (!color) continue;
      const targetX = frame.left + x;
      if (targetX < 0 || targetX >= canvasWidth) continue;
      const at = (targetRow * canvasWidth + targetX) * 4;
      canvas[at] = color[0];
      canvas[at + 1] = color[1];
      canvas[at + 2] = color[2];
      canvas[at + 3] = 255;
    }
  }
}

/** 把一帧覆盖的矩形区域清成透明 */
function clearRect(
  canvas: Uint8ClampedArray<ArrayBuffer>,
  canvasWidth: number,
  frame: GIFFrameSlice,
): void {
  const canvasHeight = canvas.length / 4 / canvasWidth;
  for (let y = 0; y < frame.height; y++) {
    const targetRow = frame.top + y;
    if (targetRow < 0 || targetRow >= canvasHeight) continue;
    for (let x = 0; x < frame.width; x++) {
      const targetX = frame.left + x;
      if (targetX < 0 || targetX >= canvasWidth) continue;
      const at = (targetRow * canvasWidth + targetX) * 4;
      canvas[at] = 0;
      canvas[at + 1] = 0;
      canvas[at + 2] = 0;
      canvas[at + 3] = 0;
    }
  }
}
