import { GM_getValue, GM_setValue } from "$";
import type { ConfigRepository } from "../config/ConfigRepository";
import { Utils } from "../Utils";

/** 一条背景图记录 */
export interface BackgroundImageRow {
  id?: number;
  /** 归属：白天或夜间 */
  slot: "day" | "night";
  /** 展示用名称；外链缺省时从 URL 里取 */
  name: string;
  /** 是外链还是本地图片 */
  type: "link" | "local";
  /** 图片地址：本地图片为 data URL，外链为 http(s) URL */
  dataUrl: string;
  /** 排序序号，越小越靠前 */
  order: number;
  /** 添加时间戳（毫秒） */
  addedAt: number;
  /** 出现权重（默认 1；越大越容易被抽中，仅「随机」模式生效） */
  weight?: number;
}

/** GM 存储键 */
const STORAGE_KEY = "mcmodderBackgroundPool";

/**
 * 背景图池的仓储。
 *
 * # 为什么用 GM storage 而不是 IndexedDB
 * 设置面板在 `center.mcmod.cn`，而模组页 / 消息中心在 `www.mcmod.cn` ——
 * IndexedDB 按 origin 隔离，在设置页添加的图片主站读不到。GM storage 是
 * 脚本级的全局存储，所有域名共享，因此图片必须存在这里。
 *
 * # 本地图片与体积控制
 * 外链只保存 URL 引用，不占用图片存储空间；本地图片由用户在导入时选择压缩质量，
 * 最长边压到 {@link MAX_EDGE} 像素，每个 slot 最多 {@link MAX_COUNT} 张。
 */
export class BackgroundRepository {
  /** 每个 slot 的图片数量上限 */
  static readonly MAX_COUNT = 20;
  /** 压缩目标最长边（像素） */
  static readonly MAX_EDGE = 1920;

  /** 旧版配置只迁移一次（同一个实例内） */
  private migrated = false;

  constructor(private readonly configs: ConfigRepository) {}

  /** 读取原始记录，不做迁移 */
  private readRaw(): Record<"day" | "night", BackgroundImageRow[]> {
    try {
      const raw = GM_getValue(STORAGE_KEY);
      if (!raw) return { day: [], night: [] };
      const parsed = JSON.parse(raw) as Partial<Record<"day" | "night", BackgroundImageRow[]>>;
      return {
        day: (parsed.day ?? []).map(BackgroundRepository.normalizeRow),
        night: (parsed.night ?? []).map(BackgroundRepository.normalizeRow),
      };
    } catch {
      return { day: [], night: [] };
    }
  }

  /** 写全部（同步） */
  private writeAll(data: Record<"day" | "night", BackgroundImageRow[]>) {
    GM_setValue(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * 补全旧记录的 `type` 字段。
   *
   * 早期版本只有本地图片、没有 `type`，这里按 data URL 前缀推断，
   * 避免界面拿到 `undefined` 后既不是 link 也不是 local。
   */
  private static normalizeRow(row: BackgroundImageRow): BackgroundImageRow {
    return {
      ...row,
      type: row.type ?? (row.dataUrl.startsWith("data:") ? "local" : "link"),
    };
  }

  /** 把旧版的「默认背景 / 默认夜间背景」迁入图池 */
  private migrateLegacy(): void {
    if (this.migrated) return;
    this.migrated = true;

    const entries = [
      { slot: "day", key: "defaultBackground", name: "默认背景" },
      { slot: "night", key: "defaultNightBackground", name: "默认夜间背景" },
    ] as const;

    const data = this.readRaw();
    let changed = false;
    let nextId = BackgroundRepository.nextId(data);
    for (const { slot, key, name } of entries) {
      const legacy = this.configs.getSettings(key)?.trim();
      // 没有配置（新用户）或用户主动禁用（none）时不用迁移；none 保留旧键，
      // 由 BackgroundPool.fallback 继续识别为「不显示背景」。
      if (legacy === undefined || legacy === "" || legacy === "none") continue;
      const url = BackgroundRepository.normalizeLink(legacy);
      // 不是合法的绝对 http(s) 地址就不动它，留在设置里以免丢失
      if (url === null) continue;
      if (!data[slot].some((row) => BackgroundRepository.sameUrl(row.dataUrl, url))) {
        data[slot].push({
          id: nextId,
          slot,
          name,
          type: "link",
          dataUrl: url,
          order: data[slot].reduce((max, row) => Math.max(max, row.order + 1), 0),
          addedAt: Date.now(),
          weight: 1,
        });
        nextId += 1;
        changed = true;
      }
      // 用 setSettings(undefined) 而不是 deleteSettings：后者只改 GM storage，
      // 不会同步缓存的 `mcmodderSettings`，同一页里的 fallback 仍会读到旧值。
      this.configs.setSettings(key, undefined);
    }
    if (changed) this.writeAll(data);
  }

  /** 下一个可用的自增 id（全局唯一，白天 / 夜间共用） */
  private static nextId(data: Record<"day" | "night", BackgroundImageRow[]>): number {
    return [...data.day, ...data.night].reduce((max, row) => Math.max(max, row.id ?? 0), 0) + 1;
  }

  /** 读全部（会先处理旧版配置迁移） */
  private readAll(): Record<"day" | "night", BackgroundImageRow[]> {
    this.migrateLegacy();
    return this.readRaw();
  }

  /** 某个 slot 下的全部图片，按 order 升序 */
  list(slot: "day" | "night"): BackgroundImageRow[] {
    const rows = this.readAll();
    return rows[slot].sort((a, b) => a.order - b.order);
  }

  /** 某个 slot 下的图片数量 */
  count(slot: "day" | "night"): number {
    return this.readAll()[slot].length;
  }

  /** 全部图片地址的总字符数（含 base64 膨胀，用于展示占用） */
  totalBytes(): number {
    const data = this.readAll();
    return [...data.day, ...data.night].reduce((sum, row) => sum + row.dataUrl.length, 0);
  }

  /**
   * 添加一张图片。
   *
   * 本地图片的压缩在导入面板里完成（用户手动选择质量），这里只负责落库，
   * 因此 `source` 对本地图片而言已经是压缩后的 data URL。
   *
   * @param source 本地图片为 data URL，外链为绝对 http(s) URL。
   * @param index 插入位置（0 起）；缺省时追加到末尾。
   * @returns 写库后的完整记录（含自增 id）。
   * @throws 当该 slot 已达 {@link MAX_COUNT}、本地图片数据不是 data URL，
   * 或外链不是合法地址时抛出。
   */
  async add(
    slot: "day" | "night",
    name: string,
    type: "link" | "local",
    source: string,
    index?: number,
  ): Promise<BackgroundImageRow> {
    const data = this.readAll();
    if (data[slot].length >= BackgroundRepository.MAX_COUNT) {
      throw new Error(
        `最多只能添加 ${BackgroundRepository.MAX_COUNT.toLocaleString()} 张${slot === "day" ? "白天" : "夜间"}背景...`,
      );
    }

    let dataUrl: string;
    if (type === "local") {
      if (!source.startsWith("data:image/")) {
        throw new Error("本地图片数据无效，请重新选择图片");
      }
      dataUrl = source;
    } else {
      const normalized = BackgroundRepository.normalizeLink(source);
      if (normalized === null) {
        throw new Error("外链必须是 http:// 或 https:// 开头的完整图片地址");
      }
      dataUrl = normalized;
    }

    const existing = data[slot].sort((a, b) => a.order - b.order);
    const insertAt = index === undefined ? existing.length : Utils.clamp(index, 0, existing.length);
    const row: BackgroundImageRow = {
      id: BackgroundRepository.nextId(data),
      slot,
      name:
        name.trim() || (type === "link" ? BackgroundRepository.linkName(dataUrl) : "未命名背景"),
      type,
      dataUrl,
      order: insertAt,
      addedAt: Date.now(),
      weight: 1,
    };
    existing.splice(insertAt, 0, row);
    data[slot] = existing.map((item, order) => ({ ...item, order }));
    this.writeAll(data);
    return data[slot][insertAt];
  }

  /**
   * 把若干张外链图片原地替换为本地图片。
   *
   * 只更新 `type` 与 `dataUrl`，名称、权重、顺序和添加时间全部保留，
   * 因此转换后图片在列表中的位置不会变化。
   *
   * @param replacements 目标记录 id 与压缩后的 data URL。
   * @returns 实际替换的记录数。
   */
  replaceWithLocal(replacements: { id: number; dataUrl: string }[]): number {
    if (replacements.length === 0) return 0;
    const data = this.readAll();
    const targets = new Map(replacements.map((item) => [item.id, item.dataUrl]));
    let replaced = 0;
    for (const slot of ["day", "night"] as const) {
      for (const row of data[slot]) {
        if (row.id === undefined) continue;
        const dataUrl = targets.get(row.id);
        if (dataUrl === undefined || !dataUrl.startsWith("data:image/")) continue;
        row.type = "local";
        row.dataUrl = dataUrl;
        replaced += 1;
      }
    }
    if (replaced > 0) this.writeAll(data);
    return replaced;
  }

  /**
   * 重命名一张图片（只按 id 找，白天 / 夜间都会查）。
   *
   * 首尾空白会被去掉；去掉后为空的名字视为无效。`name` 只用于展示，
   * 不影响轮换结果，因此调用方改完名后按需 `BackgroundPool.reload` 刷新缓存即可。
   *
   * @returns 更新后的记录；找不到该 id 或名字为空时返回 `null`
   * （名字没有变化时不写库，但仍返回记录）。
   */
  rename(id: number, name: string): BackgroundImageRow | null {
    const trimmed = Utils.regulateFileName(name.trim());
    if (trimmed.length === 0) return null;
    const data = this.readAll();
    for (const slot of ["day", "night"] as const) {
      const row = data[slot].find((item) => item.id === id);
      if (row === undefined) continue;
      if (row.name !== trimmed) {
        row.name = trimmed;
        this.writeAll(data);
      }
      return row;
    }
    return null;
  }

  /** 按 id 删除；可以一次删多张，只写一次库 */
  remove(ids: number | number[]) {
    const doomed = new Set(Array.isArray(ids) ? ids : [ids]);
    const data = this.readAll();
    data.day = data.day.filter((row) => row.id === undefined || !doomed.has(row.id));
    data.night = data.night.filter((row) => row.id === undefined || !doomed.has(row.id));
    this.writeAll(data);
  }

  /** 设置若干张图的权重（1-10，超范围自动夹取）；一次只写一次库 */
  setWeight(ids: number | number[], weight: number) {
    const targets = new Set(Array.isArray(ids) ? ids : [ids]);
    const data = this.readAll();
    const clamped = Utils.clamp(Math.round(weight), 1, 10);
    let changed = false;
    for (const slot of ["day", "night"] as const) {
      for (const row of data[slot]) {
        if (row.id !== undefined && targets.has(row.id)) {
          row.weight = clamped;
          changed = true;
        }
      }
    }
    if (changed) this.writeAll(data);
  }

  /** 清空某个 slot */
  clear(slot: "day" | "night") {
    const data = this.readAll();
    data[slot] = [];
    this.writeAll(data);
  }

  /** 调整顺序：把 `id` 移动到 `targetIndex`（0 起） */
  move(slot: "day" | "night", id: number, targetIndex: number) {
    const data = this.readAll();
    const rows = data[slot].sort((a, b) => a.order - b.order);
    const from = rows.findIndex((row) => row.id === id);
    if (from < 0) return;
    const clamped = Utils.clamp(targetIndex, 0, rows.length - 1);
    if (from === clamped) return;
    const [moved] = rows.splice(from, 1);
    rows.splice(clamped, 0, moved);
    data[slot] = rows.map((row, index) => ({ ...row, order: index }));
    this.writeAll(data);
  }

  /**
   * 校验并规范化一个外链地址。
   *
   * 只接受绝对的 http(s) 地址：相对地址会随页面域名变化，存下来后换页就失效。
   *
   * @returns 规范化后的 `href`；不是合法地址时返回 `null`。
   */
  static normalizeLink(value: string): string | null {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.href;
    } catch {
      return null;
    }
  }

  /** 判断两个地址是否指向同一张图（外链按规范化后的 href 比较） */
  static sameUrl(a: string, b: string): boolean {
    if (a === b) return true;
    const normalizedA = BackgroundRepository.normalizeLink(a);
    const normalizedB = BackgroundRepository.normalizeLink(b);
    return normalizedA !== null && normalizedB !== null && normalizedA === normalizedB;
  }

  /** 从 URL 里取一个可读的默认名称 */
  private static linkName(value: string): string {
    try {
      const url = new URL(value);
      const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
      return name || url.hostname;
    } catch {
      return value;
    }
  }

  /**
   * 把本地图片按给定质量压缩成 data URL。
   *
   * 先在 {@link MAX_EDGE} 内等比缩放，再按 `quality` 编码为 JPEG。
   * 质量由用户在导入面板里手动选择，这里不再自动降质。
   *
   * @param file 用户选择的本地图片。
   * @param fillColor 透明区域填充色（JPEG 不支持透明）。
   * @param quality JPEG 质量，0-1。
   */
  static async compress(file: File | Blob, fillColor: string, quality: number): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      BackgroundRepository.MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      bitmap.close();
      throw new Error("无法创建画布上下文");
    }
    // 透明图（PNG/GIF）转 JPEG 会变黑底：先铺一层与昼夜匹配的底色
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL("image/jpeg", quality);
  }
}
