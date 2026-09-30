import { GM_addValueChangeListener, GM_deleteValue, GM_getValue, GM_setValue } from "$";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";
import { NewVerificationModal } from "./types/NewVerificationModal";

/**
 * 跨标签页弹窗广播器：让「**任意标签页触发**」的弹窗只在一个**用户可见的标签页**上弹出一次。
 *
 * # 要解决的问题
 * 计划任务在每个标签页里都各自轮询，于是后台标签页也会触发弹窗 —— 用户根本没看见，却还要挨个去关。
 * 为此，触发方改为「**广播**：本标签页可见就直接弹，不可见就写进 GM Storage」，
 * 由所有构造了 `Mcmodder` 的标签页监听这条记录，抢到者负责渲染。
 *
 * # 一次广播的完整流程
 * 1. **写入** —— {@link send} 往 {@link ModalBroadcaster.KEY} 写入一条
 *    {@link ModalBroadcastRecord}（`tabID` 记下写入者，`createdAt` 记下时间戳）；
 * 2. **认领** —— 写入方立刻回读一次，只有读回的仍是自己刚写的那条记录，才认定为「我是唯一的弹出者」；
 *    若已被别的标签页覆盖写，则说明对方抢到了，本标签页不再弹
 *    （两个可见标签页在同一瞬间广播仍可能双双认领成功，属亚毫秒级竞态，可接受）；
 * 3. **认领成功** —— 走本地快路径，直接 `new` 出对应的弹窗类并弹出；
 * 4. **无人认领** —— 记录留在 GM Storage 里。各标签页的 `ModalBroadcastInit` 收到远端写入后会
 *    尝试认领，但发起广播时既然没有任何标签页可见，接收方同样不可见，于是记录转入
 *    {@link ModalBroadcaster.flush} 等待的挂起态，直到某个标签页 `visibilitychange` 变为可见时补弹，
 *    或超过 {@link Values.MODAL_BROADCAST_EXPIRE} 后被丢弃。
 *
 * # 为什么不登记为缓存键
 * 这是一次性协调通道，只在广播与认领的瞬间读写，不需要响应式，故不走 `StorageBuffer`，
 * 直接使用 GM API（参见 `src/loader/StorageBufferLoader.ts`）。
 */
export class ModalBroadcaster {
  /** GM Storage 中的广播槽键名：单槽设计，同一时刻只存放一条待弹记录 */
  static readonly KEY = "mcmodderModalBroadcast";
  /** 本标签页标识：本页生命周期内固定，跨标签页唯一 */
  readonly tabID = Utils.randStr(8);

  private readonly parent: Mcmodder;
  /** 本标签页待认领的远端广播 —— {@link ModalBroadcaster.flush} 一弹出即清空 */
  private pending?: ModalBroadcastRecord;

  /** @param parent 全局上下文 */
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  /**
   * 广播一个弹窗：可见时本标签页直接弹，否则留给（即将）可见的标签页弹。
   *
   * @param type 弹窗类型 id，须在 `ModalTypeTypes` 中登记。
   * @param payload 该类型的业务字段（纯数据，可 JSON 序列化）。
   * @returns 是否已由本标签页弹出。
   */
  send<K extends keyof ModalTypeTypes>(type: K, payload: ModalOption<ModalTypeTypes[K]>) {
    const record = {
      id: Utils.randStr(8),
      tabID: this.tabID,
      createdAt: Date.now(),
      type: type,
      payload: payload,
    } as ModalBroadcastRecord;
    GM_setValue(ModalBroadcaster.KEY, JSON.stringify(record));
    if (!this.claim(record.id)) {
      // 已被其他标签页抢先写掉：不再重复弹出
      return false;
    }
    this.show(record);
    return true;
  }

  /** 启动监听：其他标签页 {@link send} 时本页也会收到回调 */
  listen() {
    GM_addValueChangeListener<string>(ModalBroadcaster.KEY, (_key, _oldValue, newValue, remote) => {
      if (!remote || !newValue) return;
      const record = this.parse(newValue);
      if (!record) return;
      this.onRemoteRecord(record);
    });
  }

  /**
   * 弹出所有挂起中的广播（仅在本标签页可见时）。
   *
   * 由 `ModalBroadcastInit` 的 `visibilitychange` 驱动。「挂起中」即代表广播发生时
   * 没有任何标签页可见，故此时只需判断自己是否可见。
   */
  flush() {
    const record = this.pending;
    if (!record) return;
    if (document.visibilityState !== "visible") return;
    this.pending = undefined;
    if (ModalBroadcaster.isExpired(record)) {
      // 太久没人回来过，此时突然弹窗只会莫名其妙
      this.drop(record);
      return;
    }
    if (!this.claim(record.id)) return;
    this.show(record);
  }

  /**
   * 收到其他标签页的广播：先挂起，再交给 {@link ModalBroadcaster.flush} 按可见性决定是否立即弹出。
   *
   * @param record 收到的广播记录。
   */
  private onRemoteRecord(record: ModalBroadcastRecord) {
    this.pending = record;
    this.flush();
  }
  /**
   * 认领指定 id 的广播：只有 GM Storage 中现存记录仍是**本标签页所写**的那条，才算认领成功。
   *
   * 认领成功时顺带清空 GM Storage 中的记录 —— 记录是一次性的，弹窗既已有人接手，
   * 槽位就该让给下一条广播。
   *
   * @param id 要认领的记录 id。
   * @returns 是否认领成功。
   */
  private claim(id: string) {
    const current = this.read();
    if (current?.id !== id || current.tabID !== this.tabID) return false;
    GM_deleteValue(ModalBroadcaster.KEY);
    return true;
  }

  /**
   * 丢弃一条仍无人接手的记录（只在它仍是槽中那一条时才删，避免误删后续广播）。
   *
   * @param record 要丢弃的广播记录。
   */
  private drop(record: ModalBroadcastRecord) {
    if (this.read()?.id === record.id) GM_deleteValue(ModalBroadcaster.KEY);
  }

  /**
   * 判断一条广播是否已过期（距发送超过 {@link Values.MODAL_BROADCAST_EXPIRE}）。
   *
   * @param record 待判断的广播记录。
   */
  static isExpired(record: ModalBroadcastRecord) {
    return Date.now() - record.createdAt > Values.MODAL_BROADCAST_EXPIRE;
  }

  /** 读取 GM Storage 中的广播记录，键不存在或解析失败时返回 undefined */
  private read() {
    const raw = GM_getValue(ModalBroadcaster.KEY) as string | undefined;
    if (!raw) return undefined;
    return this.parse(raw);
  }

  /** 解析一条广播记录，内容损坏时返回 undefined */
  private parse(raw: string) {
    try {
      const record = JSON.parse(raw) as ModalBroadcastRecord;
      return record?.id ? record : undefined;
    } catch (e) {
      console.error("跨标签页弹窗广播记录解析失败: " + e);
      return undefined;
    }
  }

  /**
   * 按记录的 `type` 分派到对应的弹窗类。
   *
   * `ModalTypeTypes` 是 `类型 id → 构造器` 的表，故 `record` 的判别联合与构造器参数联动收窄。
   *
   * @param record 待弹出的广播记录。
   */
  private createType(record: ModalBroadcastRecord) {
    switch (record.type) {
      case "newVerification":
        return new NewVerificationModal(this.parent, record.payload);
    }
  }

  /**
   * 重建并弹出弹窗：类在**接收端**构造，故 `preConfirm` 等回调得以存活，无需序列化。
   *
   * @param record 待弹出的广播记录。
   */
  private show(record: ModalBroadcastRecord) {
    const modal = this.createType(record);
    if (!modal?.canShow()) return;
    modal.show();
  }
}
