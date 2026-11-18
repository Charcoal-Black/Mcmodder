import { GM_getValue, GM_setValue } from "$";

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
 * GM storage 有配额，所以图片在写入前会先经 canvas 压缩：最长边
 * {@link MAX_EDGE} 像素、JPEG 质量 {@link JPEG_QUALITY}，压缩后单张仍超过
 * {@link MAX_BYTES} 时逐级降质量。每个 slot 最多 {@link MAX_COUNT} 张。
 */
export class BackgroundRepository {
  /** 压缩后单张 base64 长度上限（约 1.2MB 图片） */
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
   * 追加一张图片（内部先压缩）。
   *
   * @returns 写库后的完整记录（含自增 id）。
   * @throws 当该 slot 已达 {@link MAX_COUNT}、或压缩后仍超出 {@link MAX_BYTES} 时抛出。
   */
  async add(slot: "day" | "night", name: string, file: File): Promise<BackgroundImageRow> {
    const data = this.readAll();
    if (data[slot].length >= BackgroundRepository.MAX_COUNT) {
      throw new Error(
        `最多只能添加 ${BackgroundRepository.MAX_COUNT} 张${slot === "day" ? "白天" : "夜间"}背景`,
      );
    }
    const dataUrl = await BackgroundRepository.compress(file, slot);
    if (dataUrl.length > BackgroundRepository.MAX_BYTES) {
      throw new Error(
        `压缩后仍有 ${Math.round(dataUrl.length / 1024)}KB，超过上限 ${Math.round(BackgroundRepository.MAX_BYTES / 1024)}KB`,
      );
    }
    const existing = data[slot].sort((a, b) => a.order - b.order);
    const nextId =
      [...data.day, ...data.night].reduce((max, row) => Math.max(max, row.id ?? 0), 0) + 1;
    const order = existing.length === 0 ? 0 : existing[existing.length - 1].order + 1;
    const row: BackgroundImageRow = {
      id: nextId,
      slot,
      name,
      dataUrl,
      order,
      addedAt: Date.now(),
      weight: 1,
    };
    data[slot] = [...existing, row];
    this.writeAll(data);
    return row;
  }

  /** 按 id 删除 */
  remove(id: number): void {
    const data = this.readAll();
    data.day = data.day.filter((row) => row.id !== id);
    data.night = data.night.filter((row) => row.id !== id);
    this.writeAll(data);
  }

  /** 设置某张图的权重（1-10，超范围自动夹取） */
  setWeight(id: number, weight: number): void {
    const data = this.readAll();
    const clamped = Math.max(1, Math.min(10, Math.round(weight)));
    for (const slot of ["day", "night"] as const) {
      const row = data[slot].find((r) => r.id === id);
      if (row) {
        row.weight = clamped;
        this.writeAll(data);
        return;
      }
    }
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
    const clamped = Math.max(0, Math.min(rows.length - 1, targetIndex));
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
