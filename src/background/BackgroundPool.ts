import { GM_getValue, GM_setValue } from "$";
import { shallowRef } from "vue";
import type { ConfigRepository } from "../config/ConfigRepository";
import { Values } from "../Values";
import type { BackgroundImageRow } from "./BackgroundRepository";
import { BackgroundRepository } from "./BackgroundRepository";

/**
 * 轮换预设：
 * - `0` 随机：每次加载抽一张，避开上一次（按 weight 加权）—— 兼顾权重与不突兀
 * - `1` 完全随机：纯加权随机，**允许连续重复** —— 权重在这里作用最直接
 * - `2` 顺序循环：按列表顺序取，到底回开头
 * - `3` 洗牌轮完重洗：一轮内每张只出一次，轮完重新洗牌
 * - `4` 每天固定：一天之内固定一张，跨天换一张且与前一天不同
 */
export type BackgroundRotateMode = 0 | 1 | 2 | 3 | 4;

/**
 * 背景图池：缓存两个 slot（白天 / 夜间）的图片，并负责「这一页该用哪张」的决策。
 *
 * # 为什么是同步的
 * 图片存在 GM storage（同步读写），因此 {@link init} 不需要等待网络 / IndexedDB，
 * `StyleLoader` 生成 CSS 的同步流程里可以直接 {@link pick}。
 *
 * # 跨页状态
 * 顺序游标、上次抽中的 id、洗牌袋剩余集合、当天的日期与图片 id 都写在 GM storage，
 * 因此换页面、甚至换域名（设置页在 center、内容页在 www）都保持连续。
 */
export class BackgroundPool {
  /**
   * 图池版本号。
   *
   * 配置面板增删图片后会自增，`StyleLoader` 的 computed 与 `Mcmodder` 的
   * 背景应用逻辑通过它感知变化；本页已选缓存也按它失效。
   */
  static readonly revision = shallowRef(0);

  private static repository: BackgroundRepository | null = null;
  private static readonly cache: Record<"day" | "night", BackgroundImageRow[]> = {
    day: [],
    night: [],
  };
  /** 本页已选的图片地址（同一页面内不再变化） */
  private static readonly picked: Partial<Record<"day" | "night", string>> = {};
  /** `picked` 对应的图池版本；版本变化时清空缓存 */
  private static pickedRevision = -1;
  private static initialized = false;

  private static repo(configs: ConfigRepository) {
    BackgroundPool.repository ??= new BackgroundRepository(configs);
    return BackgroundPool.repository;
  }

  /** 把两个 slot 的图片读进内存（同步） */
  static init(configs: ConfigRepository): void {
    if (BackgroundPool.initialized) return;
    BackgroundPool.initialized = true;
    const repo = BackgroundPool.repo(configs);
    BackgroundPool.cache.day = repo.list("day");
    BackgroundPool.cache.night = repo.list("night");
    BackgroundPool.revision.value += 1;
  }

  /** 重新载入（配置面板增删图片后调用） */
  static reload(configs: ConfigRepository, slot?: "day" | "night"): void {
    const repo = BackgroundPool.repo(configs);
    if (slot === "day" || slot === undefined) {
      BackgroundPool.cache.day = repo.list("day");
    }
    if (slot === "night" || slot === undefined) {
      BackgroundPool.cache.night = repo.list("night");
    }
    BackgroundPool.revision.value += 1;
  }

  /** 当前缓存的图片列表（同步，供配置面板展示） */
  static getImages(slot: "day" | "night"): BackgroundImageRow[] {
    return BackgroundPool.cache[slot];
  }

  /**
   * 解析某个 slot 当前应该使用的背景地址。
   *
   * 图池优先；池为空时回落到旧版手填 URL，再回落到内置默认图。
   *
   * @returns 图片地址；用户主动禁用（旧版配置为 `none`）时返回 `null`。
   */
  static resolve(slot: "day" | "night", configs: ConfigRepository): string | null {
    return (
      BackgroundPool.pick(slot, BackgroundPool.readMode(configs)) ??
      BackgroundPool.fallback(slot, configs)
    );
  }

  /**
   * 图池为空时的兜底地址。
   *
   * 旧版的 `defaultBackground` / `defaultNightBackground` 正常情况下已经迁入图池，
   * 只有用户当时填了 `none`（主动禁用）或值不是合法链接时才会残留。
   */
  static fallback(slot: "day" | "night", configs: ConfigRepository): string | null {
    // const legacy = configs
    //   .getSettings(slot === "day" ? "defaultBackground" : "defaultNightBackground")
    //   ?.trim();
    // if (legacy === "none") return null;
    // const normalized = legacy === undefined ? null : BackgroundRepository.normalizeLink(legacy);
    // if (normalized !== null) return normalized;
    // return slot === "day" ? Values.assets.bg : Values.assets.nightMode.bg;
    void slot;
    void configs;
    return "none";
  }

  /** 某个地址是否来自本脚本（图池或内置默认图），用于区分页面自带背景 */
  static isOwnImage(url: string): boolean {
    if (url.trim().length === 0) return false;
    if (
      BackgroundRepository.sameUrl(url, Values.assets.bg) ||
      BackgroundRepository.sameUrl(url, Values.assets.nightMode.bg)
    ) {
      return true;
    }
    return [...BackgroundPool.cache.day, ...BackgroundPool.cache.night].some((row) =>
      BackgroundRepository.sameUrl(row.dataUrl, url),
    );
  }

  /** 本页已选缓存是否还对应当前图池版本 */
  private static syncPicked(): void {
    if (BackgroundPool.pickedRevision === BackgroundPool.revision.value) return;
    BackgroundPool.pickedRevision = BackgroundPool.revision.value;
    delete BackgroundPool.picked.day;
    delete BackgroundPool.picked.night;
  }

  /**
   * 选一张背景图。
   *
   * @param slot 白天或夜间。
   * @param mode 轮换预设，见 {@link BackgroundRotateMode}。
   * @returns 图片地址（本地 data URL 或外链 URL）；池为空时返回 `null`。
   */
  static pick(slot: "day" | "night", mode: BackgroundRotateMode): string | null {
    BackgroundPool.syncPicked();
    const cached = BackgroundPool.picked[slot];
    if (cached !== undefined) return cached;

    const pool = BackgroundPool.cache[slot];
    if (pool.length === 0) return null;

    let index: number;
    switch (mode) {
      case 1:
        index = BackgroundPool.nextPureRandom(pool);
        break;
      case 2:
        index = BackgroundPool.nextSequential(slot, pool.length);
        break;
      case 3:
        index = BackgroundPool.nextShuffle(slot, pool);
        break;
      case 4:
        index = BackgroundPool.nextDaily(slot, pool);
        break;
      default:
        index = BackgroundPool.nextRandom(slot, pool);
    }
    const dataUrl = pool[index].dataUrl;
    BackgroundPool.picked[slot] = dataUrl;
    return dataUrl;
  }

  /**
   * 模式 1：完全随机。
   * 纯加权随机、不避开上一次 —— 权重高的一张可以连续出现，这正是它的用途。
   */
  private static nextPureRandom(pool: BackgroundImageRow[]): number {
    return BackgroundPool.weightedPick(
      pool,
      pool.map((_, index) => index),
    );
  }

  /** 模式 2：按游标取，取到末尾回到开头 */
  private static nextSequential(slot: "day" | "night", length: number): number {
    const index = BackgroundPool.readNumber(`mcmodderBackgroundCursor_${slot}`) % length;
    GM_setValue(`mcmodderBackgroundCursor_${slot}`, index + 1);
    return index;
  }

  /** 模式 0：加权随机，池内多于一张时避开上一次抽中的 id */
  private static nextRandom(slot: "day" | "night", pool: BackgroundImageRow[]): number {
    if (pool.length === 1) return 0;
    const last = BackgroundPool.readNumber(`mcmodderBackgroundLastId_${slot}`, -1);
    const candidates = pool.flatMap((row, index) => (row.id === last ? [] : [index]));
    const index = BackgroundPool.weightedPick(pool, candidates);
    GM_setValue(`mcmodderBackgroundLastId_${slot}`, pool[index].id ?? -1);
    return index;
  }

  /** 按 weight（默认 1）加权抽一个下标；候选集为空时退回全池 */
  private static weightedPick(pool: BackgroundImageRow[], candidates: number[]): number {
    const indices = candidates.length > 0 ? candidates : pool.map((_, index) => index);
    const weights = indices.map((index) => Math.max(1, pool[index].weight ?? 1));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let k = 0; k < indices.length; k += 1) {
      roll -= weights[k];
      if (roll <= 0) return indices[k];
    }
    return indices[indices.length - 1];
  }

  /**
   * 模式 3：洗牌袋。
   * 把还没出过的图组成候选池，抽一张后从候选池移除；候选池空了重新装满。
   */
  private static nextShuffle(slot: "day" | "night", pool: BackgroundImageRow[]): number {
    const key = `mcmodderBackgroundBag_${slot}`;
    // 图池可能在两次访问之间被增删：先剔除袋里已不存在的 id，否则会误判一轮已结束
    const validIds = new Set(pool.flatMap((row) => (row.id === undefined ? [] : [row.id])));
    const usedIds = new Set<number>(
      (JSON.parse(GM_getValue(key) || "[]") as number[]).filter((id) => validIds.has(id)),
    );
    const remaining = pool.flatMap((row, index) =>
      row.id !== undefined && !usedIds.has(row.id) ? [index] : [],
    );
    if (remaining.length === 0) {
      // 一轮用完：开新的一轮。本轮先抽一张，其余全部进入「待抽」（即 usedIds 只放这一张）。
      // 同时避开上一轮最后一张，否则跨轮会看到连续两次同一张。
      const lastId = BackgroundPool.readNumber(`mcmodderBackgroundLastId_${slot}`, -1);
      const candidates = pool.flatMap((row, index) => (row.id === lastId ? [] : [index]));
      const index = BackgroundPool.weightedPick(
        pool,
        candidates.length > 0 ? candidates : pool.map((_, i) => i),
      );
      const picked = pool[index].id;
      if (picked !== undefined) GM_setValue(`mcmodderBackgroundLastId_${slot}`, picked);
      GM_setValue(key, JSON.stringify(picked === undefined ? [] : [picked]));
      return index;
    }
    const index = BackgroundPool.weightedPick(pool, remaining);
    const picked = pool[index].id;
    if (picked !== undefined) {
      usedIds.add(picked);
      GM_setValue(`mcmodderBackgroundLastId_${slot}`, picked);
    }
    GM_setValue(key, JSON.stringify([...usedIds]));
    return index;
  }

  /**
   * 模式 4：每天固定。
   * 同一天复用同一张（刷新不变）；跨天重新抽，且避开前一天那张。
   */
  private static nextDaily(slot: "day" | "night", pool: BackgroundImageRow[]): number {
    const today = BackgroundPool.todayKey();
    const storedDate = GM_getValue(`mcmodderBackgroundDailyDate_${slot}`);
    const storedId = BackgroundPool.readNumber(`mcmodderBackgroundDailyId_${slot}`, -1);
    if (storedDate === today) {
      const index = pool.findIndex((row) => row.id === storedId);
      if (index >= 0) return index;
    }
    const candidates = pool.flatMap((row, index) => (row.id === storedId ? [] : [index]));
    const index = BackgroundPool.weightedPick(pool, candidates);
    GM_setValue(`mcmodderBackgroundDailyDate_${slot}`, today);
    GM_setValue(`mcmodderBackgroundDailyId_${slot}`, pool[index].id ?? -1);
    return index;
  }

  /** 本地日期键（YYYY-MM-DD） */
  private static todayKey(): string {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private static readNumber(key: string, fallback = 0): number {
    const raw = GM_getValue(key);
    const value = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  /** 清掉本页已选缓存（切换配置后强制重选） */
  static resetPicked(): void {
    delete BackgroundPool.picked.day;
    delete BackgroundPool.picked.night;
  }

  /** 读取当前配置里的轮换预设（缺省为随机） */
  static readMode(configs: ConfigRepository): BackgroundRotateMode {
    const value = configs.getSettings("backgroundPoolRotateMode");
    const valid = value === 1 || value === 2 || value === 3 || value === 4;
    return (valid ? value : 0) as BackgroundRotateMode;
  }
}
