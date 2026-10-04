import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";

/**
 * 跨标签页弹窗基类：每种可被广播的弹窗都继承本类，由 `ModalBroadcaster` 调度。
 *
 * # 为什么要「类」而不是「一段 swal 配置」
 * GM Storage 只能传 JSON，弹窗里的 `preConfirm`、`interceptEvents` 等**回调无法序列化**。
 * 因此跨标签页传递的只是「弹窗类型 id + 该类型的业务字段」（即 `payload`），
 * 由接收标签页用本类新建弹窗 —— 类与回调都在**接收端**重建，天然无需序列化。
 *
 * # 子类须知
 * 1. 须新增一个 `XxxModalOption` 接口（或类型别名）声明自己的 payload，并覆写 {@link option} 为该类型
 *    —— payload 会被 `JSON.stringify` 原样带走，故只能是**纯数据**（字符串/数字等），
 *    不能放函数或 DOM 引用；
 * 2. 可覆写 {@link canShow}，用于过滤「当前这个接收标签页是否适合弹」——
 *    跨标签页无法控制记录最终落到哪个页面，页面相关的判断只能由接收端自己下
 *    （如待审提醒在审核后台页要用页面内提示而非弹窗）；
 * 3. {@link show} 里直接渲染弹窗（需要事件拦截时用 `Utils.createModal`），
 *    `preConfirm` 等回调可随意使用。
 *
 * 新增弹窗类型后，须在 `src/types/types.d.ts` 的 `ModalTypeTypes` 中登记。
 */
export abstract class ModalType {
  /** 全局上下文 */
  protected readonly parent: Mcmodder;
  /** 配置仓库（`parent.configRepository` 的快捷引用） */
  protected readonly configs: ConfigRepository;
  /**
   * 本弹窗类型的「可跨标签页传输的 option」类型。
   *
   * 子类须将其收窄为自己的 payload 类型（并另起一个 `XxxModalOption` 类型别名），
   * 这样 {@link ModalBroadcastRecord} 才能按 `type` 收窄出对应的 `payload`。
   */
  abstract option: unknown;

  /**
   * 判断当前标签页是否适合弹出该弹窗。
   *
   * 默认放行；子类的页面/状态相关判断写在这里，由 {@link show} 在真正渲染前调用。
   */
  canShow(): boolean {
    return true;
  }

  /** 渲染弹窗。实现时应把内容转成 `SweetAlertOption`，并按需使用 `Utils.createModal`。 */
  abstract show(): void;

  /**
   * @param parent 全局上下文。
   */
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
  }
}
