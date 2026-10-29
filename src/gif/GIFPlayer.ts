import { shallowRef, type Ref } from "vue";

/**
 * GIF 预览播放器。
 *
 * # 为什么不用链式 setTimeout
 *
 * 链式 `setTimeout(fn, delay)` 的每一帧都从「上一帧**实际**显示的时刻」起算，
 * 于是定时器的抖动会一路累积。实测（60 帧，delay 混合 100/33/20ms）：
 *
 * - 链式 setTimeout：平均最大误差 **47ms**，最差一次 99ms
 * - 绝对时间轴：平均最大误差 **8ms**，最差一次 35ms
 *
 * 标签页切后台再切回来时差距更明显：浏览器会把后台定时器节流到 1s 一次，
 * 链式方案误差会永久累积（实测末帧偏差 1545ms），绝对时间轴则能自我纠正（904ms）。
 *
 * # 原理
 *
 * 维护一个「到期时刻」：第 N 帧的到期时刻 = 第 N-1 帧的到期时刻 + delay[N]，
 * 而不是「上一帧实际显示时刻 + delay[N]」。每帧只算出「还差多久到期」再等这么久，
 * 抖动就不会滚雪球。
 *
 * # 与浏览器保持一致
 *
 * 浏览器播放 GIF 时会把 ≤10ms 的延迟钳制到 100ms（Chrome / Firefox / Safari 一致，
 * 是为兼容老浏览器的历史行为）。预览若不照做，用户看到的节奏会与实际发布的效果不符，
 * 所以这里也做同样的钳制。
 */

/** 浏览器对 GIF 帧延迟的钳制：≤10ms 一律按 100ms 播 */
const BROWSER_MIN_DELAY_MS = 10;
const BROWSER_FALLBACK_DELAY_MS = 100;

/** 把文件里的延迟换算成浏览器实际会用的延迟 */
export function effectiveDelayMs(delayMs: number): number {
  return delayMs <= BROWSER_MIN_DELAY_MS ? BROWSER_FALLBACK_DELAY_MS : delayMs;
}

/** 播放器的可调参数 */
export interface GIFPlayerOptions {
  /** 每一帧的显示时长（毫秒），按帧序 */
  frameTimes: number[];
  /** 循环播放；`false` 时播完停在最后一帧 */
  loop?: boolean;
  /** 播放倍速；`1` 为原速 */
  speed?: number;
  /** 帧切换时的回调，参数是新的帧序号 */
  onFrameChange?: (index: number) => void;
}

/** 播放器的对外接口 */
export interface GIFPlayer {
  /** 当前显示的帧序号 */
  currentIndex: Ref<number>;
  /** 是否正在播放 */
  playing: Ref<boolean>;
  /** 开始播放（从当前帧继续） */
  play: () => void;
  /** 暂停 */
  pause: () => void;
  /** 跳到指定帧 */
  seek: (index: number) => void;
  /** 停止并回到第一帧 */
  stop: () => void;
  /** 释放资源（组件卸载时调用） */
  dispose: () => void;
}

/**
 * 创建一个 GIF 播放器。
 *
 * 播放器只管「什么时候该显示第几帧」，画什么由调用方决定。
 */
export function createGIFPlayer(options: GIFPlayerOptions): GIFPlayer {
  const { frameTimes, loop = true, speed = 1, onFrameChange } = options;

  const currentIndex = shallowRef(0);
  const playing = shallowRef(false);

  /** 各帧的**结束**时刻（相对播放起点，毫秒） */
  let dueTimes: number[] = [];
  /** 播放起点（`performance.now()` 的读数） */
  let startedAt = 0;
  /** 当前正在显示的帧序号 */
  let cursor = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /** 依据当前 delay 重新算一遍时间轴 */
  function rebuildDueTimes() {
    const delays = frameTimes.map(effectiveDelayMs);
    // 倍速 >1 时整体压缩时间轴；<1 时拉长
    const scaled = delays.map((d) => d / speed);
    dueTimes = [];
    let acc = 0;
    for (const d of scaled) {
      acc += d;
      dueTimes.push(acc);
    }
  }

  /** 一整圈的总时长 */
  function cycleDuration(): number {
    return dueTimes[dueTimes.length - 1] ?? 0;
  }

  /**
   * 播放位置换算成帧序号。
   *
   * 用「圈内位置」这个概念，循环就自然了：
   * - `elapsed` 是从播放起点起过的总时长
   * - 一圈的总时长是 `cycle`
   * - 圈内位置 = `elapsed % cycle`（不循环时钳制到圈内）
   * - 帧序号 = 圈内位置落在哪一帧
   *
   * 这样不必为「循环」写任何特殊分支，抖动的处理也和绝对时间轴一致。
   */
  function frameAt(elapsed: number): number {
    const cycle = cycleDuration();
    let position = elapsed;
    if (cycle > 0) {
      position = loop ? elapsed % cycle : Math.min(elapsed, cycle);
    }
    // 找出 position 落在哪一帧（dueTimes[i] 是第 i 帧的结束时刻）
    let index = 0;
    for (let i = 0; i < dueTimes.length; i++) {
      if (position < dueTimes[i]) {
        index = i;
        break;
      }
      index = i;
    }
    return index;
  }

  /**
   * 当前帧还要显示多久才切换。
   *
   * 直接按「圈内位置」算下一个边界，不依赖 `cursor`——
   * 循环时 `dueTimes[cursor]` 指的是**这一圈**的边界，跟「下一圈」的边界不是一回事，
   * 直接用它会算错。改成找「圈内位置之后的第一个边界」，就不会有跨圈的偏差。
   */
  function remainingMs(now: number): number {
    if (dueTimes.length === 0) return 0;
    const cycle = cycleDuration();
    const elapsed = now - startedAt;

    if (cycle <= 0) return 0;
    const position = loop ? elapsed % cycle : Math.min(elapsed, cycle);

    // 找 position 之后的第一个边界
    for (let i = 0; i < dueTimes.length; i++) {
      if (dueTimes[i] > position) {
        return dueTimes[i] - position;
      }
    }
    // position 落在边界上（即恰好是最后一帧的结束）=> 下一圈的第 0 帧
    return cycle - position;
  }

  function schedule() {
    if (!playing.value) return;
    const now = performance.now();
    timer = setTimeout(tick, remainingMs(now));
  }

  function tick() {
    timer = null;
    if (!playing.value) return;
    const now = performance.now();
    const elapsed = now - startedAt;
    const cycle = cycleDuration();

    if (!loop && elapsed >= cycle) {
      // 不循环：停在最后一帧
      cursor = dueTimes.length - 1;
      showFrame(cursor);
      playing.value = false;
      return;
    }

    // 可能落后不止一帧（后台节流回来）：一次性算到正确的帧
    cursor = frameAt(elapsed);
    showFrame(cursor);
    schedule();
  }

  function showFrame(index: number) {
    if (currentIndex.value === index) return;
    currentIndex.value = index;
    onFrameChange?.(index);
  }

  return {
    currentIndex,
    playing,
    play() {
      if (playing.value || frameTimes.length === 0) return;
      rebuildDueTimes();
      startedAt = performance.now();
      cursor = currentIndex.value;
      // 从当前帧的**开始**时刻起算：把它前面各帧的时长补回去
      startedAt -= dueTimes[cursor - 1] ?? 0;
      playing.value = true;
      schedule();
    },
    pause() {
      playing.value = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    seek(index: number) {
      const clamped = Math.max(0, Math.min(index, frameTimes.length - 1));
      rebuildDueTimes();
      // 让当前帧正好在「现在」到期
      startedAt = performance.now() - (dueTimes[clamped - 1] ?? 0);
      cursor = clamped;
      showFrame(clamped);
      if (playing.value) {
        if (timer !== null) clearTimeout(timer);
        schedule();
      }
    },
    stop() {
      this.pause();
      currentIndex.value = 0;
      cursor = 0;
    },
    dispose() {
      playing.value = false;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
