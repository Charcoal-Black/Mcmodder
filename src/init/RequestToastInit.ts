import { Init } from "./Init";

/**
 * 跨标签页请求提示的接收端：在**每个**构造了 `Mcmodder` 的标签页上常驻。
 *
 * 职责有二：
 * - 监听 `RequestToastBroadcaster` 的远端写入，本页可见就弹、不变就挂起；
 * - 监听 `visibilitychange`，本标签页变为可见时 `flush` 一次，把挂起的记录补上。
 *
 * 始终启用（目前尚无配置项开关），故 `canRun()` 直接放行。
 *
 * @see `src/widget/toast/RequestToastBroadcaster.ts` 类注释中的「记录的生命周期」。
 */
export class RequestToastInit extends Init {
  canRun() {
    return true;
  }

  run() {
    this.parent.requestToastBroadcaster.listen();
    document.addEventListener("visibilitychange", () =>
      this.parent.requestToastBroadcaster.flush(),
    );
  }
}
