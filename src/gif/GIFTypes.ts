/**
 * GIF 的类型定义。
 *
 * 这些类型描述的是**解析结果**（读进来之后的样子），不是文件在磁盘上的字节布局；
 * 字节布局相关的类型见 `GIFParser.ts`。
 */

/**
 * 帧处置方式（disposal method），见 GIF89a 规范。
 *
 * - `0`：未指定，按 `1` 处理。
 * - `1`：不做处置——本帧绘制后保留在画布上，后续帧叠在它上面。
 * - `2`：恢复背景色——本帧覆盖的矩形区域被清空（清成透明）。
 * - `3`：恢复前态——本帧覆盖的矩形区域恢复成绘制本帧之前的样子。
 *
 * 绝大多数动图用的是 `1`，但 `2` / `3` 会让「按帧解码」这件事必须逐帧合成，
 * 不能只取某一帧的原始数据当整幅画面用。
 */
export type GIFDisposal = 0 | 1 | 2 | 3;

/** 单帧的结构信息（不含像素） */
export interface GIFFrameInfo {
  /** 帧在动图中的序号，从 0 开始 */
  index: number;
  /** 该帧在画布上的左上角横坐标 */
  left: number;
  /** 该帧在画布上的左上角纵坐标 */
  top: number;
  /** 该帧自身的宽度（增量帧通常小于画布宽度） */
  width: number;
  /** 该帧自身的高度 */
  height: number;
  /** 显示时长（毫秒） */
  delay: number;
  /** 显示时长的原始单位值（1/100 秒）；无损写回时用它，{@link delay} 是它的 10 倍 */
  delayCentiseconds: number;
  /** 帧处置方式 */
  disposal: GIFDisposal;
  /** 透明色在调色板中的索引；`null` 表示该帧没有透明色 */
  transparentIndex: number | null;
  /** 该帧是否自带局部调色板（自带时不使用全局调色板） */
  hasLocalPalette: boolean;
  /** 该帧的像素是否以交错方式存储 */
  interlaced: boolean;
}

/** 一个 GIF 的解析结果 */
export interface GIFParseResult {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /**
   * 每一帧的整幅画面，元素是 PNG 的 blob URL，可直接喂给 `<img src>`。
   *
   * 动图的帧大多是「增量帧」（只覆盖画面的一部分），这里的每一项都是**按处置方式
   * 逐帧合成后的完整画面**，而不是帧自身的原始矩形。
   */
  frames: string[];
  /** 每一帧的显示时长（毫秒），与 {@link frames} 一一对应 */
  frameTimes: number[];
  /** 每一帧的结构信息，与 {@link frames} 一一对应 */
  frameInfos: GIFFrameInfo[];
  /** 循环次数；`0` 表示无限循环 */
  loopCount: number;
  /**
   * 文件里是否有 NETSCAPE2.0 循环扩展。
   *
   * `loopCount === 0` 既可能是「没有循环扩展」（播放一次），也可能是「无限循环」，
   * 界面上要靠它区分。
   */
  hasLoopExtension: boolean;
  /** 动图的原始字节，保留下来供后续的无损编辑使用 */
  source: Uint8Array;
  /**
   * 释放 {@link frames} 里那些 blob URL 占用的资源。
   *
   * 换源、关面板时都要调用，否则 blob 会一直挂在内存里。
   */
  dispose: () => void;
}

/** {@link GIFUtils.parse} 的可选项 */
export interface GIFParseOptions {
  /**
   * 是否把每一帧渲染成 PNG blob URL。
   *
   * 默认 `true`。关掉它可以只拿结构信息、不碰 canvas，
   * 大动图能省下不少时间。
   */
  renderFrames?: boolean;
}
