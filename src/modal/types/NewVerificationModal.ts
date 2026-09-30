import { GM_openInTab } from "$";
import { Mcmodder } from "../../Mcmodder";
import { ModalType } from "../ModalType";

/** 「有新待审项」弹窗的跨标签页 payload：待审总数 */
interface NewVerificationModalOption {
  total: number;
}

/**
 * 「有新待审项」提醒弹窗：告知所管理的模组共有多少个待审项，确认后新标签页打开审核后台。
 *
 * 由 `autoCheckVerify` 计划任务在**非审核后台页**上触发，经
 * `ModalBroadcaster` 广播出去，最终由当前可见的标签页（可能就是发起的那个）弹出。
 */
export class NewVerificationModal extends ModalType {
  override option: NewVerificationModalOption;

  /**
   * 审核后台页自带待审下拉菜单与标黄提示，不需要（也不应该）再弹一次窗 ——
   * 发起的标签页可能正是后台页，而记录经广播后可能落到别的页面上，故此处须再次判断。
   */
  override canShow() {
    return !window.location.href.includes("admin.mcmod.cn");
  }

  /**
   * @param parent 全局上下文。
   * @param option 待审总数。
   */
  constructor(parent: Mcmodder, option: NewVerificationModalOption) {
    super(parent);
    this.option = option;
  }

  show() {
    swal.fire({
      type: "warning",
      title: "有新待审项",
      text: `当前所管理的模组共有 ${this.option.total} 个待审项，请尽快处理~`,
      showCancelButton: true,
      confirmButtonText: "前往后台",
      cancelButtonText: "稍后提醒",
      allowOutsideClick: false,
      preConfirm: () => {
        GM_openInTab("https://admin.mcmod.cn/", { active: true });
      },
    });
  }
}
