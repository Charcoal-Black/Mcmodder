import { GM_getValue, GM_setValue } from "$";
import { Utils } from "../Utils";

/** 一条本地背景图记录 */
export interface BackgroundImageRow {
  id?: number;
  /** 归属：白天或夜间 */
  slot: "day" | "night";
  /** 原始文件名，仅用于展示 */
  name: string;
  /** 图片内容（data URL，形如 `data:image/jpeg;base64,...`） */
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
 * 本地背景图的仓储。
 *
 * # 为什么用 GM storage 而不是 IndexedDB
 * 设置面板在 `center.mcmod.cn`，而模组页 / 消息中心在 `www.mcmod.cn` ——
 * IndexedDB 按 origin 隔离，在设置页添加的图片主站读不到。GM storage 是
 * 脚本级的全局存储，所有域名共享，因此图片必须存在这里。
 *
 * # 体积控制
 * 单张原图超过 {@link MAX_FILE_BYTES} 直接拒绝，避免解码超大文件；通过后先经 canvas
 * 压缩：最长边 {@link MAX_EDGE} 像素、JPEG 质量 {@link JPEG_QUALITY}，压缩后单张
 * data URL 仍超过 {@link MAX_BYTES} 时逐级降质量。每个 slot 最多 {@link MAX_COUNT} 张。
 */
export class BackgroundRepository {
  /**
   * 单张原图（用户选中的文件）的体积上限。
   *
   * 与 {@link MAX_BYTES} 不是一回事：这个限制的是压缩前的文件大小，只用来挡掉解码开销
   * 过大的文件，实际能不能存下由压缩后的结果决定。
   */
  static readonly MAX_FILE_BYTES = 8 * 1024 * 1024;
  /** 压缩后单张 data URL 的长度上限（含 base64 膨胀，约合 0.9MB 二进制图片） */
  static readonly MAX_BYTES = 1.2 * 1024 * 1024;
  /** 每个 slot 的图片数量上限 */
  static readonly MAX_COUNT = 20;
  /** 压缩目标最长边（像素） */
  static readonly MAX_EDGE = 1920;
  /** 初始 JPEG 质量 */
  static readonly JPEG_QUALITY = 0.85;

  /** 读全部（同步） */
  private readAll(): Record<"day" | "night", BackgroundImageRow[]> {
    try {
      const raw = GM_getValue(STORAGE_KEY);
      if (!raw) return { day: [], night: [] };
      const parsed = JSON.parse(raw) as Partial<Record<"day" | "night", BackgroundImageRow[]>>;
      return { day: parsed.day ?? [], night: parsed.night ?? [] };
    } catch {
      return { day: [], night: [] };
    }
  }

  /** 写全部（同步） */
  private writeAll(data: Record<"day" | "night", BackgroundImageRow[]>): void {
    GM_setValue(STORAGE_KEY, JSON.stringify(data));
  }

  /** 某个 slot 下的全部图片，按 order 升序 */
  list(slot: "day" | "night"): BackgroundImageRow[] {
    return this.readAll()[slot].sort((a, b) => a.order - b.order);
  }

  /** 某个 slot 下的图片数量 */
  count(slot: "day" | "night"): number {
    return this.readAll()[slot].length;
  }

  /** 全部图片的总字节数（含 base64 膨胀，用于展示占用） */
  totalBytes(): number {
    const data = this.readAll();
    return [...data.day, ...data.night].reduce((sum, row) => sum + row.dataUrl.length, 0);
  }

  /**
   * 添加一张图片（内部先压缩）。
   *
   * @param index 插入位置（0 起）；缺省时追加到末尾。
   * @returns 写库后的完整记录（含自增 id）。
   * @throws 当该 slot 已达 {@link MAX_COUNT}、原图超过 {@link MAX_FILE_BYTES}、
   * 或压缩后仍超出 {@link MAX_BYTES} 时抛出。
   */
  async add(
    slot: "day" | "night",
    name: string,
    file: File,
    index?: number,
  ): Promise<BackgroundImageRow> {
    if (this.readAll()[slot].length >= BackgroundRepository.MAX_COUNT) {
      throw new Error(
        `最多只能添加 ${BackgroundRepository.MAX_COUNT.toLocaleString()} 张${slot === "day" ? "白天" : "夜间"}背景...`,
      );
    }
    // 压缩前先挡掉过大的文件：原图体积和压缩后的结果没有必然关系，别拿它当存储上限
    if (file.size > BackgroundRepository.MAX_FILE_BYTES) {
      throw new Error(
        `原图有 ${Utils.getFormattedSize(file.size)}，超过 ${Utils.getFormattedSize(BackgroundRepository.MAX_FILE_BYTES)} 上限...`,
      );
    }
    const dataUrl = await BackgroundRepository.compress(file, slot);
    if (dataUrl.length > BackgroundRepository.MAX_BYTES) {
      throw new Error(
        `压缩后仍有 ${Utils.getFormattedSize(dataUrl.length)}，超过 ${Utils.getFormattedSize(BackgroundRepository.MAX_BYTES)} 上限...`,
      );
    }
    // 压缩是异步的，期间别的标签页可能已经改过库，落盘前重新读一次
    const data = this.readAll();
    if (data[slot].length >= BackgroundRepository.MAX_COUNT) {
      throw new Error(
        `最多只能添加 ${BackgroundRepository.MAX_COUNT.toLocaleString()} 张${slot === "day" ? "白天" : "夜间"}背景...`,
      );
    }
    const existing = data[slot].sort((a, b) => a.order - b.order);
    const insertAt = index === undefined ? existing.length : Utils.clamp(index, 0, existing.length);
    const nextId =
      [...data.day, ...data.night].reduce((max, row) => Math.max(max, row.id ?? 0), 0) + 1;
    const row: BackgroundImageRow = {
      id: nextId,
      slot,
      name,
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
  remove(ids: number | number[]): void {
    const doomed = new Set(Array.isArray(ids) ? ids : [ids]);
    const data = this.readAll();
    data.day = data.day.filter((row) => row.id === undefined || !doomed.has(row.id));
    data.night = data.night.filter((row) => row.id === undefined || !doomed.has(row.id));
    this.writeAll(data);
  }

  /** 设置若干张图的权重（1-10，超范围自动夹取）；一次只写一次库 */
  setWeight(ids: number | number[], weight: number): void {
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
  clear(slot: "day" | "night"): void {
    const data = this.readAll();
    data[slot] = [];
    this.writeAll(data);
  }

  /** 调整顺序：把 `id` 移动到 `targetIndex`（0 起） */
  move(slot: "day" | "night", id: number, targetIndex: number): void {
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
   * 把图片压缩成 data URL。
   *
   * 先在 {@link MAX_EDGE} 内等比缩放，再按 {@link JPEG_QUALITY} 编码；
   * 若结果仍超过 {@link MAX_BYTES}，逐步降到 0.6。
   */
  private static async compress(file: File, slot: "day" | "night"): Promise<string> {
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
    ctx.fillStyle = slot === "night" ? "#111" : "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let quality = BackgroundRepository.JPEG_QUALITY;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > BackgroundRepository.MAX_BYTES && quality > 0.6) {
      quality -= 0.05;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }
    return dataUrl;
  }
}
