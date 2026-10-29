import { compositeFrames } from "./GIFCompositor";
import { flattenGIF } from "./GIFFlatten";
import { type GIFDocument, parseGIF } from "./GIFParser";
import type { GIFParseOptions, GIFParseResult } from "./GIFTypes";
import { writeGIF } from "./GIFWriter";

/** 一次编辑的结果 */
export interface GIFEditResult {
  /** 编辑后的 GIF 字节 */
  bytes: Uint8Array;
  /**
   * 是否发生了有损量化。
   *
   * 只改时长永远是 `false`；重排帧或插入新帧时如果整个动图的颜色超过 256 色，
   * 就会走量化路径并置 `true`。
   */
  lossy: boolean;
}

/** 一次缩放的结果 */
export interface GIFResizeResult {
  /** 缩放后的 GIF 字节 */
  bytes: Uint8Array;
  /** 每一帧缩放后的整幅画面，与输出顺序一致，可直接拿去做缩略图 */
  frames: Uint8ClampedArray<ArrayBuffer>[];
  /** 是否发生了有损量化 */
  lossy: boolean;
  /**
   * 缩小后无法还原的帧序号。
   *
   * 判断方式：把**编码后**的小图解码出来，按同一条最近邻规则放大回原尺寸，
   * 与原图逐像素比对。不一致的帧说明缩小过程中丢了细节（包括量化造成的有损），
   * 记进这个数组；空数组表示整次缩小可以完全还原。
   *
   * 只在缩小时判断；纯放大不做判断，为 `null`。
   */
  irreversibleFrames: number[] | null;
}

/** 一次帧过渡的结果 */
export interface GIFTweenResult {
  /** 按顺序排好的过渡帧，长度就是要生成的数量；每项都是整幅画面 */
  frames: Uint8ClampedArray<ArrayBuffer>[];
  /**
   * 是否无损过渡。
   *
   * 两帧里每个像素的透明状态都一致时为 `true`，插值只是颜色混合，画面完整；
   * 只要有某个位置一帧透明、另一帧不透明，过渡帧在那里就只能留空，
   * 整次过渡记为 `false`（有几个像素对不上不重要，反正都会留空）。
   */
  lossless: boolean;
}

/**
 * 输出帧的画面来源。
 *
 * - `source`：原文件里的某一帧，取它合成后的整幅画面；
 * - `rgba`：调用方直接给的一幅整幅画面，比如插入的空白帧、上传的静态图片。
 */
export type GIFFrameSource =
  { type: "source"; index: number } | { type: "rgba"; rgba: Uint8ClampedArray<ArrayBuffer> };

/**
 * GIF 的对外工具类。
 *
 * - 读：{@link parse}。
 * - 写：{@link create}（从零新建动图）、{@link applyEdits}（改顺序 / 改时长 / 插帧）、
 *   {@link applyFrameTimes}（只改时长，无损）、{@link resize}（所有帧按最近邻缩放到新尺寸）、
 *   {@link toBlob}（产出可下载的 GIF）。
 * - 过渡：{@link collectFrames}（按帧来源取出整幅画面）、{@link tweenFrames}（在两帧之间线性插值出若干过渡帧）。
 * - 图片：{@link imageToFrame}（静态图片 → 整幅 RGBA）、{@link rgbaToBlobURL}（RGBA → PNG URL）。
 */
export class GIFUtils {
  /**
   * 解析一个 GIF。
   *
   * @param blob 动图的二进制内容
   * @param options 解析选项
   */
  static async parse(blob: Blob, options: GIFParseOptions = {}): Promise<GIFParseResult> {
    const source = new Uint8Array(await blob.arrayBuffer());
    const document = parseGIF(source);
    const loopCount = document.loopCount;

    const frameInfos = document.frames.map((frame) => ({
      index: frame.index,
      left: frame.left,
      top: frame.top,
      width: frame.width,
      height: frame.height,
      delay: frame.delayCentiseconds * 10,
      delayCentiseconds: frame.delayCentiseconds,
      disposal: frame.disposal as 0 | 1 | 2 | 3,
      transparentIndex: frame.transparentIndex < 0 ? null : frame.transparentIndex,
      hasLocalPalette: frame.hasLocalPalette,
      interlaced: frame.interlaced,
    }));

    const frameTimes = frameInfos.map((info) => info.delay);

    let frames: string[] = [];
    let dispose = () => {};

    if (options.renderFrames !== false && document.frames.length > 0) {
      const composited = compositeFrames(document);
      frames = await Promise.all(
        composited.map((frame) =>
          GIFUtils.rgbaToBlobURL(frame.rgba, document.width, document.height),
        ),
      );
      const urls = frames;
      dispose = () => {
        for (const url of urls) URL.revokeObjectURL(url);
      };
    }

    return {
      width: document.width,
      height: document.height,
      frames,
      frameTimes,
      frameInfos,
      loopCount,
      hasLoopExtension: document.loopExtension !== null,
      source,
      dispose,
    };
  }

  /** 通过魔数来判断一个 Blob 是否是 GIF */
  static async isGIFBlob(blob: Blob): Promise<boolean> {
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    return (
      header.length === 4 &&
      header[0] === 0x47 && // G
      header[1] === 0x49 && // I
      header[2] === 0x46 && // F
      header[3] === 0x38 // 8
    );
  }

  /**
   * 把毫秒换算成 GIF 用的时长单位（1/100 秒）。
   *
   * GIF 的时长字段只能存整数厘秒，所以 95ms 写进文件其实是 10cs（也就是 100ms）。
   * 超出 0..65535 的值会被钳制。想让界面上显示的值与文件一致，
   * 就用 `msToCentiseconds(ms) * 10` 回填。
   */
  static msToCentiseconds(ms: number): number {
    if (Number.isNaN(ms)) return 0;
    return Math.min(0xffff, Math.max(0, Math.round(ms / 10)));
  }

  /**
   * 从零开始编码一个动图（新建动图用）。
   *
   * 循环扩展固定写进文件，`loopCount` 为 `0` 时就是无限循环。
   * 颜色超过 256 种时同样会走量化路径并置 `lossy`。
   *
   * @param frames 按顺序排列的整幅画面，每项长度必须是 `width * height * 4`
   * @param width 画布宽度
   * @param height 画布高度
   * @param frameTimes 每一帧的时长（毫秒），与 `frames` 一一对应；按 GIF 的厘秒精度取整
   * @param loopCount 循环次数；`0` 表示无限循环
   */
  static create(
    frames: Uint8ClampedArray<ArrayBuffer>[],
    width: number,
    height: number,
    frameTimes: number[],
    loopCount: number,
  ): GIFEditResult {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error("画布尺寸必须是正整数");
    }
    if (frames.length === 0) {
      throw new Error("至少需要一帧");
    }
    if (frames.length !== frameTimes.length) {
      throw new Error(`帧数不匹配：期望 ${frames.length} 个时长，实际 ${frameTimes.length} 个`);
    }
    return flattenGIF({
      width,
      height,
      frames,
      delaysCentiseconds: frameTimes.map((ms) => GIFUtils.msToCentiseconds(ms)),
      loopCount,
      hasLoopExtension: true,
    });
  }

  /**
   * 按输出顺序取出每一帧的整幅画面（RGBA）。
   *
   * `source` 帧从原文件里合成，`rgba` 帧本身就是整幅画面。做帧与帧之间的像素运算
   * （比如 {@link tweenFrames}）之前，先用它把画面准备好；尺寸对不上或序号越界会抛错。
   *
   * @param source 原始 GIF 字节
   * @param frames 要取画面的帧来源，顺序与返回值一致
   */
  static collectFrames(
    source: Uint8Array,
    frames: GIFFrameSource[],
  ): Uint8ClampedArray<ArrayBuffer>[] {
    return collectFrames(parseGIF(source), frames);
  }

  /**
   * 在两帧之间生成若干过渡帧（逐像素线性插值）。
   *
   * 把两帧之间的颜色变化均分成 `count + 1` 段，第 i 帧（从 1 数到 `count`）
   * 按 `((count + 1 - i) * 起点 + i * 终点) / (count + 1)` 取值：
   * 插入 2 帧时就是 `(2r1+r2)/3` 和 `(r1+2r2)/3`，两端帧本身不会出现在结果里。
   *
   * GIF 只有全透明 / 全不透明，alpha 按 128 二值化（与导入图片帧一致）。
   * 某个坐标上一帧透明、另一帧不透明时没有合理的中间色，过渡帧统一留空，
   * 并把 {@link GIFTweenResult.lossless} 置为 `false`，由调用方决定怎么提示。
   *
   * 这里只算画面，不碰字节：生成结果交给 {@link applyEdits} 的 `type: "rgba"` 帧插进原动图即可。
   *
   * @param from 起始帧的整幅画面
   * @param to 结束帧的整幅画面，长度必须与 `from` 相同
   * @param count 要生成几帧，必须是正整数
   */
  static tweenFrames(
    from: Uint8ClampedArray<ArrayBuffer>,
    to: Uint8ClampedArray<ArrayBuffer>,
    count: number,
  ): GIFTweenResult {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error(`过渡帧数量必须是正整数：${count}`);
    }
    if (from.length !== to.length) {
      throw new Error(`两帧尺寸不一致：${from.length / 4} 与 ${to.length / 4} 像素`);
    }
    if (from.length % 4 !== 0) {
      throw new Error(`画面数据长度不是 4 的倍数：${from.length}`);
    }

    const denominator = count + 1;
    const frames = Array.from(
      { length: count },
      () => new Uint8ClampedArray(new ArrayBuffer(from.length)),
    );
    let lossless = true;

    for (let offset = 0; offset < from.length; offset += 4) {
      const fromOpaque = from[offset + 3] >= 128;
      const toOpaque = to[offset + 3] >= 128;

      // 一帧有颜色、一帧是空的：过渡帧在这个位置只能留空
      if (fromOpaque !== toOpaque) {
        lossless = false;
        continue;
      }
      // 两边都透明，过渡帧同样留空（默认就是全 0，不用动）
      if (!fromOpaque) continue;

      const r1 = from[offset];
      const g1 = from[offset + 1];
      const b1 = from[offset + 2];
      const r2 = to[offset];
      const g2 = to[offset + 1];
      const b2 = to[offset + 2];
      for (let index = 0; index < count; index++) {
        const weight = index + 1;
        const fromWeight = denominator - weight;
        const frame = frames[index];
        frame[offset] = Math.round((fromWeight * r1 + weight * r2) / denominator);
        frame[offset + 1] = Math.round((fromWeight * g1 + weight * g2) / denominator);
        frame[offset + 2] = Math.round((fromWeight * b1 + weight * b2) / denominator);
        frame[offset + 3] = 255;
      }
    }

    return { frames, lossless };
  }

  /**
   * 按新的帧顺序和帧时长改写 GIF。
   *
   * - 帧顺序没变（省略 `frames`，或就是原顺序）时走字节级写回，**完全无损**，
   *   输出与原文只差时长那两个字节；
   * - 重排或插入了新帧时必须先压平再重编码：GIF 的帧大多是差分帧，
   *   直接搬切片会让画面错乱，详见 `GIFFlatten.ts`。
   *
   * @param source 原始 GIF 字节
   * @param frameTimes 每一帧的新时长（毫秒），按**输出顺序**排列
   * @param frames 输出帧的画面来源；省略则按原顺序。
   *               重复某个原帧即复制该帧，不列出某个原帧即删除该帧，
   *               用 `type: "rgba"` 可以插入原文件里没有的画面
   * @param loopCount 循环次数；`0` 表示无限循环。省略时沿用原文件；
   *                  原文件没有循环扩展、又给了值时，会补一个 NETSCAPE2.0 块
   */
  static applyEdits(
    source: Uint8Array,
    frameTimes: number[],
    frames?: GIFFrameSource[],
    loopCount?: number,
  ): GIFEditResult {
    const document = parseGIF(source);
    const expected = frames?.length ?? document.frames.length;
    if (frameTimes.length !== expected) {
      throw new Error(`帧数不匹配：期望 ${expected} 个时长，实际 ${frameTimes.length} 个`);
    }
    const delaysCentiseconds = frameTimes.map((ms) => GIFUtils.msToCentiseconds(ms));

    if (!frames || (frames.length === document.frames.length && isIdentityFrames(frames))) {
      return {
        bytes: writeGIF(document, { delaysCentiseconds, loopCount }),
        lossy: false,
      };
    }

    // 只有确实要重排/插帧时才解码像素，纯改时长走不到这里
    const rgbaFrames = collectFrames(document, frames);

    return flattenGIF({
      width: document.width,
      height: document.height,
      frames: rgbaFrames,
      delaysCentiseconds,
      loopCount: loopCount ?? document.loopCount,
      // 原文件没有循环块、但调用方明确给了次数时，也要补一个
      hasLoopExtension: document.loopExtension !== null || loopCount !== undefined,
    });
  }

  /**
   * 把整个动图缩放到新的画布尺寸。
   *
   * 缩放对所有帧生效：先把每一帧合成成整幅画面，再用最近邻缩放到新尺寸，
   * 最后按新尺寸重新编码一次。GIF 的帧往往只是画布的一小块（还有偏移和处置方式），
   * 不先合成再缩放的话，帧与帧之间会错位。
   *
   * 最近邻不做任何插值，像素画的硬边缘不会被抹糊，和导入图片帧的处理一致。
   *
   * 缩小时还会顺带判断可逆性：把编码后的结果解码、放大回原尺寸逐像素比对，
   * 哪些帧还原不了会记进 {@link GIFResizeResult.irreversibleFrames}。
   * 判断复用已经算好的画面，不需要额外合成或再编码一次。
   *
   * @param source 原始 GIF 字节
   * @param frameTimes 每一帧的时长（毫秒），按输出顺序排列
   * @param frames 输出帧的画面来源，含义同 {@link applyEdits}
   * @param width 新的画布宽度
   * @param height 新的画布高度
   * @param loopCount 循环次数；省略时沿用原文件
   */
  static resize(
    source: Uint8Array,
    frameTimes: number[],
    frames: GIFFrameSource[],
    width: number,
    height: number,
    loopCount?: number,
  ): GIFResizeResult {
    // GIF 的宽高字段只有 16 位
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width > 0xffff ||
      height > 0xffff
    ) {
      throw new Error(`当前画布尺寸 (${width}×${height}) 不合法...`);
    }
    const document = parseGIF(source);
    if (frameTimes.length !== frames.length) {
      throw new Error(
        `当前动图帧数不匹配... (期望 ${frames.length} 个时长，实际 ${frameTimes.length} 个)`,
      );
    }

    const originalFrames = collectFrames(document, frames);
    const resizedFrames = originalFrames.map((rgba) =>
      resizeRGBA(rgba, document.width, document.height, width, height),
    );
    const result = flattenGIF({
      width,
      height,
      frames: resizedFrames,
      delaysCentiseconds: frameTimes.map((ms) => GIFUtils.msToCentiseconds(ms)),
      loopCount: loopCount ?? document.loopCount,
      hasLoopExtension: document.loopExtension !== null || loopCount !== undefined,
    });

    // 只有缩小时才可能丢细节；放大时原图的每个像素都还在画面里，不做判断
    const shrinking = width < document.width || height < document.height;
    return {
      bytes: result.bytes,
      frames: resizedFrames,
      lossy: result.lossy,
      irreversibleFrames: shrinking
        ? findIrreversibleFrames(result.bytes, document.width, document.height, originalFrames)
        : null,
    };
  }

  /**
   * 只改时长，返回新的字节。
   *
   * 只改 Graphic Control Extension 里的两个时长字节——像素数据、调色板、
   * 循环次数、注释块全部原样保留，所以画质不会有一丝损失。
   *
   * @param source 原始 GIF 字节
   * @param frameTimes 每一帧的新时长（毫秒），长度必须与帧数一致
   */
  static applyFrameTimes(source: Uint8Array, frameTimes: number[]): Uint8Array {
    return GIFUtils.applyEdits(source, frameTimes).bytes;
  }

  /** 把字节包装成 GIF Blob，可直接下载或交给 `<img>` 原生播放 */
  static toBlob(bytes: Uint8Array): Blob {
    // `Blob` 要求底层是 `ArrayBuffer`，复制一份同时避免持有外部的大缓冲区
    return new Blob([Uint8Array.from(bytes)], { type: "image/gif" });
  }

  /**
   * 把一张静态图片画成与动图同尺寸的一帧。
   *
   * 等比缩放到能完整放进画布（居中、两侧留透明边），不裁切；缩放不做插值，
   * 与站点的图标缩放（`ItemEditorInit.imgResize`）保持一致，像素画不会被抹糊。
   * GIF 只支持「全透明 / 全不透明」，所以 alpha 按 128 二值化。
   *
   * @param blob 图片文件
   * @param width 画布宽度
   * @param height 画布高度
   * @returns 整幅画面的 RGBA 数据，长度是 `width * height * 4`
   */
  static async imageToFrame(
    blob: Blob,
    width: number,
    height: number,
  ): Promise<Uint8ClampedArray<ArrayBuffer>> {
    const bitmap = await createImageBitmap(blob);
    try {
      return GIFUtils.drawBitmap(bitmap, width, height);
    } finally {
      bitmap.close();
    }
  }

  /**
   * 按图片自己的原始尺寸把它读成一帧 RGBA（新建动图用）。
   *
   * 画布直接跟着图片大小走，不做任何缩放；alpha 同样按 128 二值化。
   *
   * @param blob 图片文件
   */
  static async imageToOriginalFrame(blob: Blob): Promise<{
    rgba: Uint8ClampedArray<ArrayBuffer>;
    width: number;
    height: number;
  }> {
    const bitmap = await createImageBitmap(blob);
    try {
      return {
        rgba: GIFUtils.drawBitmap(bitmap, bitmap.width, bitmap.height),
        width: bitmap.width,
        height: bitmap.height,
      };
    } finally {
      bitmap.close();
    }
  }

  /** 把位图等比放进画布中央并取出整幅 RGBA；GIF 的 alpha 按 128 二值化 */
  private static drawBitmap(
    bitmap: ImageBitmap,
    width: number,
    height: number,
  ): Uint8ClampedArray<ArrayBuffer> {
    if (bitmap.width === 0 || bitmap.height === 0) {
      throw new Error("图片没有有效尺寸");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法创建 canvas 上下文");
    context.imageSmoothingEnabled = false;

    const scale = Math.min(width / bitmap.width, height / bitmap.height);
    // 极窄的图片也至少留 1 像素，免得四舍五入后什么都画不出来
    const drawWidth = Math.max(1, Math.round(bitmap.width * scale));
    const drawHeight = Math.max(1, Math.round(bitmap.height * scale));
    context.drawImage(
      bitmap,
      Math.round((width - drawWidth) / 2),
      Math.round((height - drawHeight) / 2),
      drawWidth,
      drawHeight,
    );

    const imageData = context.getImageData(0, 0, width, height);
    for (let i = 3; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i] >= 128 ? 255 : 0;
    }
    return imageData.data;
  }

  /** 把 RGBA 数据画到 canvas 上并导出成 PNG 的 blob URL（用完要 `URL.revokeObjectURL`） */
  static async rgbaToBlobURL(
    rgba: Uint8ClampedArray<ArrayBuffer>,
    width: number,
    height: number,
  ): Promise<string> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("无法创建 canvas 上下文");
    }
    context.putImageData(new ImageData(rgba, width, height), 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) {
      throw new Error("导出 PNG 失败");
    }
    return URL.createObjectURL(blob);
  }
}

/** 判断输出帧是否按原顺序逐个对应原文件（帧数是否相等由调用方检查） */
function isIdentityFrames(frames: GIFFrameSource[]): boolean {
  return frames.every((frame, index) => frame.type === "source" && frame.index === index);
}

/**
 * 按输出顺序取出每一帧的整幅画面（RGBA）。
 *
 * `source` 帧交给合成器还原成整幅画面，`rgba` 帧直接用；
 * 两者都必须是当前画布尺寸，否则写出来的 GIF 会错位。
 */
function collectFrames(
  document: GIFDocument,
  frames: GIFFrameSource[],
): Uint8ClampedArray<ArrayBuffer>[] {
  const composited = compositeFrames(document);
  return frames.map((frame) => {
    if (frame.type === "rgba") {
      if (frame.rgba.length !== document.width * document.height * 4) {
        throw new Error(
          `插入帧的尺寸不对：期望 ${document.width}x${document.height}，实际 ${frame.rgba.length / 4} 像素`,
        );
      }
      return frame.rgba;
    }
    const compositedFrame = composited[frame.index];
    if (!compositedFrame) throw new Error(`帧序号越界：${frame.index}`);
    return compositedFrame.rgba;
  });
}

/**
 * 最近邻缩放到新尺寸。
 *
 * 目标像素直接取自己在源图里覆盖的那个像素，不做插值：硬边缘不会被抹糊，
 * 透明区域也不会出现半透明的过渡像素。
 */
function resizeRGBA(
  rgba: Uint8ClampedArray<ArrayBuffer>,
  width: number,
  height: number,
  newWidth: number,
  newHeight: number,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(newWidth * newHeight * 4));
  // 每一列只算一次，避免在双重循环里反复做除法
  const sourceX = new Uint32Array(newWidth);
  for (let x = 0; x < newWidth; x++) {
    sourceX[x] = Math.min(width - 1, Math.floor(((x + 0.5) * width) / newWidth));
  }

  for (let y = 0; y < newHeight; y++) {
    const sourceY = Math.min(height - 1, Math.floor(((y + 0.5) * height) / newHeight));
    const sourceRow = sourceY * width * 4;
    let target = y * newWidth * 4;
    for (let x = 0; x < newWidth; x++) {
      const at = sourceRow + sourceX[x] * 4;
      out[target++] = rgba[at];
      out[target++] = rgba[at + 1];
      out[target++] = rgba[at + 2];
      out[target++] = rgba[at + 3];
    }
  }
  return out;
}

/**
 * 找出缩小后无法还原的帧。
 *
 * 用**编码后的字节**判断：先解码出真正会写进文件的小图，再按同一条最近邻规则
 * 放大回原尺寸逐像素比对。这样连量化造成的有损也会算进「不可逆」里，
 * 而不是只看内存里的中间结果。
 *
 * @param bytes 缩放后写出来的 GIF
 * @param originalWidth 缩放前的画布宽度
 * @param originalHeight 缩放前的画布高度
 * @param originalFrames 缩放前每一帧的整幅画面，与 `bytes` 的帧顺序一致
 */
function findIrreversibleFrames(
  bytes: Uint8Array,
  originalWidth: number,
  originalHeight: number,
  originalFrames: Uint8ClampedArray<ArrayBuffer>[],
): number[] {
  const document = parseGIF(bytes);
  const output = compositeFrames(document);
  const irreversible: number[] = [];

  originalFrames.forEach((original, index) => {
    const frame = output[index];
    if (!frame) {
      irreversible.push(index);
      return;
    }
    const restored = resizeRGBA(
      frame.rgba,
      document.width,
      document.height,
      originalWidth,
      originalHeight,
    );
    if (!equalRGBA(restored, original)) irreversible.push(index);
  });

  return irreversible;
}

/**
 * 两幅 RGBA 是否「看起来完全一样」。
 *
 * alpha 必须逐个相同；全透明像素的 RGB 不可见（也存不进 GIF），不参与比较——
 * 否则从 PNG 导入的帧可能因为透明区残留的 RGB 被误判成不可逆。
 */
function equalRGBA(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (a[i + 3] === 0) continue;
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) return false;
  }
  return true;
}
