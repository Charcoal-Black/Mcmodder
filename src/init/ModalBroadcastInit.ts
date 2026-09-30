import { Init } from "./Init";

/**
 * 跨标签页弹窗广播的接收端：在**每个**构造了 `Mcmodder` 的标签页上常驻。
 *
 * 职责有二：
 * - 监听 `ModalBroadcaster` 的远端广播，抢到就弹（本标签页可见时），否则挂起等待补弹；
 * - 监听 `visibilitychange`，本标签页变为可见时 `flush` 一次，把挂起中的广播补上。
 *
 * @see `src/modal/ModalBroadcaster.ts` 类注释中的「一次广播的完整流程」。
 */
export class ModalBroadcastInit extends Init {
  canRun() {
    return true;
  }

  run() {
    this.parent.modalBroadcaster.listen();
    document.addEventListener("visibilitychange", () => this.parent.modalBroadcaster.flush());
  }
}
