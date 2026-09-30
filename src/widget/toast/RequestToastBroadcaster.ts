import { GM_addValueChangeListener, GM_getValue, GM_setValue } from "$";
import type { Mcmodder } from "../../Mcmodder";
import { Utils } from "../../Utils";
import { Values } from "../../Values";

/**
 * 跨标签页请求提示广播器：让 `Utils.createRequest` 的每一次发包，都在**所有可见的标签页**
 * 上弹一条 iziToast 气泡（请求方法 + URL），便于调试与监控。
 *
 * # 与 {@link import("../../modal/ModalBroadcaster").ModalBroadcaster} 的区别
 * 弹窗是「**互斥**通知」——用户只需在任意一个标签页上处理一次，故那里用了单槽 + 认领协议；
 * 而请求提示是「**监控流**」——每个可见窗口都该看到完整的时间线，故这里：
 * - 不认领、不去重：所有可见标签页各自显示全部记录（同时开着 3 个可见页就是 3 份相同气泡，
 *   这是刻意的 —— 监控工具宁可冗余也不能漏看）；
 * - GM 中是一个**只增不删**的记录数组（追加式），配合接收端的 `seen` 集合做本地去重：
 *   由于数组不会消费，同一条记录会在后续每一次写入中被重复送达，靠 `seen` 挡掉。
 *
 * # 记录的生命周期
 * 1. **写入** —— {@link send} 本地可见时先弹一条（快路径），随后把记录追加进 GM 数组；
 * 2. **送达** —— 各标签页的 `RequestToastInit` 收到远端写入，本页可见则立即弹、不变则挂起；
 * 3. **补弹** —— 本标签页经 `visibilitychange` 变为可见时，补弹挂起的记录（挂起队列只保留最近
 *    {@link Values.REQUEST_TOAST_FLUSH_COUNT} 条，更早的积压直接丢弃，避免切回标签页时
 *    看到一屏早已过时的请求）；
 * 4. **过期** —— 写入与读取时都会剔除比 {@link Values.REQUEST_TOAST_EXPIRE} 更旧的记录，
 *    数组长度另有 {@link Values.REQUEST_TOAST_BUFFER_SIZE} 的硬上限。
 *
 * # 已知取舍
 * GM 数组是「读 → 追加 → 写回」，两个标签页在同一瞬间发包时后写者会覆盖先写者、丢掉一条记录。
 * 全局最短发包间隔本就有 500ms（`minimumRequestInterval`），碰撞概率极低；
 * 且本通道只服务于调试监控，漏一条远好过为此引入分布式锁。
 *
 * # 为什么不登记为缓存键
 * 一次性协调通道，读写均直接走 GM Storage（参见 `src/loader/StorageBufferLoader.ts`）。
 */
export class RequestToastBroadcaster {
  /** GM Storage 中的记录数组键名 */
  static readonly KEY = "mcmodderRequestToasts";
  /** 宿主组合根 */
  private readonly parent: Mcmodder;
  /** 本标签页标识：本页生命周期内固定，跨标签页唯一 */
  readonly tabID = Utils.randStr(8);

  /** 请求方法名 → iziToast 颜色：调试时扫一眼颜色即可分辨读写，命中不了的走灰色兜底 */
  private static readonly methodColors: Record<string, string> = {
    GET: "green",
    POST: "orange",
    PUT: "blue",
    DELETE: "red",
  };

  private static readonly requestMonitorPositions = {
    1: "bottomRight",
    2: "topCenter",
    3: "topLeft",
    4: "topRight",
    5: "bottomLeft",
    6: "bottomCenter",
    7: "center",
  } as const;

  /** 已处理过的记录 id（`Set` 保留插入顺序，超限时从头淘汰） */
  private readonly seen = new Set<string>();
  /** 本标签页挂起中的记录 —— 恒不超过 {@link Values.REQUEST_TOAST_FLUSH_COUNT} 条，一弹出即清空 */
  private pending: RequestToastRecord[] = [];

  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  private get monitorPos() {
    return this.parent.configRepository.getSettings("requestMonitorPosition");
  }

  /**
   * 广播一次请求：本地可见时立即弹出，随后写入 GM Storage 供其它标签页取用。
   *
   * @param method 请求方法名，缺省为 `GET`（与 `GM_xmlhttpRequest` 的默认行为一致）。
   * @param url 请求地址，原样透传。
   */
  send(method: string | undefined, url: string) {
    const record: RequestToastRecord = {
      id: Utils.randStr(8),
      tabID: this.tabID,
      createdAt: Date.now(),
      method: (method || "GET").toUpperCase(),
      url: url,
    };
    if (document.visibilityState === "visible") this.show(record);
    this.append(record);
  }

  /** 启动监听：其它标签页 {@link send} 时本页也会收到回调 */
  listen() {
    GM_addValueChangeListener<string>(
      RequestToastBroadcaster.KEY,
      (_key, _oldValue, newValue, remote) => {
        // `remote` 为 false 即本标签页自己的写入，本地快路径已弹过，不能再走一遍
        if (!remote || !newValue) return;
        const list = this.parse(newValue);
        if (list) this.onRecords(list);
      },
    );
  }

  /**
   * 弹出挂起中的记录（仅在本标签页可见时），只保留最近
   * {@link Values.REQUEST_TOAST_FLUSH_COUNT} 条，其余视为陈旧信息直接丢弃。
   *
   * 由 `RequestToastInit` 的 `visibilitychange` 驱动。
   */
  flush() {
    if (document.visibilityState !== "visible") return;
    const list = this.pending;
    this.pending = [];
    list.forEach((record) => {
      if (!RequestToastBroadcaster.isExpired(record)) this.show(record);
    });
  }

  /**
   * 收到其它标签页的请求记录：逐条去重后，可见则立即弹、不变则挂起等待补弹。
   *
   * @param list 收到的记录数组。
   */
  private onRecords(list: RequestToastRecord[]) {
    for (const record of list) {
      if (this.seen.has(record.id)) continue;
      this.remember(record.id);
      if (document.visibilityState === "visible") {
        this.show(record);
        continue;
      }
      // 挂起队列只保留 {@link Values.REQUEST_TOAST_FLUSH_COUNT} 条 —— 再多 {@link flush} 也不会补弹，
      // 长期挂在后台的标签页因此不会无限堆积记录
      this.pending.push(record);
      if (this.pending.length > Values.REQUEST_TOAST_FLUSH_COUNT) this.pending.shift();
    }
  }

  /**
   * 追加一条记录：先剔除过期项，再截断到 {@link Values.REQUEST_TOAST_BUFFER_SIZE} 条上限。
   *
   * @param record 待写入的记录。
   */
  private append(record: RequestToastRecord) {
    const list = (this.read() ?? []).filter((e) => !RequestToastBroadcaster.isExpired(e));
    list.push(record);
    GM_setValue(
      RequestToastBroadcaster.KEY,
      JSON.stringify(list.slice(-Values.REQUEST_TOAST_BUFFER_SIZE)),
    );
  }

  /**
   * 记住一条已处理的记录 id，并按 {@link Values.REQUEST_TOAST_DEDUP_SIZE} 淘汰最早的那些。
   *
   * @param id 记录 id。
   */
  private remember(id: string) {
    this.seen.add(id);
    while (this.seen.size > Values.REQUEST_TOAST_DEDUP_SIZE) {
      const oldest = this.seen.values().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
  }

  /** 判断一条记录是否已过期（距发送超过 {@link Values.REQUEST_TOAST_EXPIRE}） */
  static isExpired(record: RequestToastRecord) {
    return Date.now() - record.createdAt > Values.REQUEST_TOAST_EXPIRE;
  }

  /** 读取 GM Storage 中的记录数组，键不存在或内容损坏时返回 undefined */
  private read() {
    const raw = GM_getValue(RequestToastBroadcaster.KEY) as string | undefined;
    return raw ? this.parse(raw) : undefined;
  }

  /** 解析记录数组，内容损坏时返回 undefined */
  private parse(raw: string) {
    try {
      const list = JSON.parse(raw) as RequestToastRecord[];
      return Array.isArray(list) ? list : undefined;
    } catch (e) {
      console.error("跨标签页请求提示记录解析失败: " + e);
      return undefined;
    }
  }

  /**
   * 弹出单条请求提示。
   *
   * @param record 待显示的记录。
   */
  private show(record: RequestToastRecord) {
    if (typeof iziToast === "undefined") return;
    const pos = this.monitorPos;
    if (!pos) return;
    iziToast.show({
      title: record.method,
      message: `[${Utils.getFormatted24hTime(new Date(record.createdAt))}] ${record.url}`,
      position: RequestToastBroadcaster.requestMonitorPositions[pos],
      color: RequestToastBroadcaster.methodColors[record.method] || "gray",
      timeout: Values.REQUEST_TOAST_TIMEOUT,
      closeOnClick: true,
    });
  }
}
