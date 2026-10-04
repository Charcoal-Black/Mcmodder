import { Utils } from "../../Utils";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

/**
 * 自动查询待审项：定期遍历自己管理的模组区，统计待审数量。
 *
 * 视当前所在页面分两种呈现：
 * - 已在审核后台：在模组下拉菜单里把有待审的模组标黄并挂上「N 个待审！」；
 * - 在别的页面：经 {@link ModalBroadcaster} 广播「有新待审项」弹窗，确认后新标签页打开审核后台。
 */
export class AutoCheckVerifyScheduleRequest extends ScheduleRequestType {
  override readonly priority = 2;

  /**
   * 查询所有管理区域的待审数。
   *
   * 排期为「当前时间 + `autoVerifyDelay` 小时」（该配置是启用开关兼延迟），
   * **排期在函数最开头**，即使用户管理模组列表为空、后续提前 return，任务也仍在续期。
   */
  override async run(list: ScheduleRequestUtils) {
    const autoVerifyDelay = this.configs.getSettings("autoVerifyDelay");
    if (!autoVerifyDelay || autoVerifyDelay < 1e-2) {
      return;
    }
    list.create(
      Date.now() + autoVerifyDelay * 60 * 60 * 1000,
      "autoCheckVerify",
      this.parent.currentUID,
    );
    const adminModList: string[] = this.configs.getProfile("adminModList")?.split(",") || [];
    if (adminModList.length === 0) {
      Utils.commonMsg(
        "脚本尚未记录您的管理模组区域，可能是由于您已经是全域审核员，或是从未访问过自己的个人主页，请访问一次后重试~",
        false,
      );
      return;
    }

    const button = $("#mcmodder-check-verification");
    const inVerifyPage = !!button.length;
    if (inVerifyPage) {
      Utils.setButtonLoadingState(button);
    }

    const total = await this.work(adminModList, inVerifyPage);

    if (total === 0) {
      if (!inVerifyPage) {
        Utils.commonMsg("自动检查待审项已执行~ 当前暂无待审项~");
      }
    } else if (total > 0) {
      if (window.location.href.includes("admin.mcmod.cn")) {
        if (!inVerifyPage) {
          Utils.commonMsg(`当前所管理的模组共有 ${total} 个待审项，请尽快处理~`, false);
          $("[data-page=pageVerifyMod]").click();
        }
      } else {
        // 交给跨标签页弹窗广播：本标签页可见则立即弹，否则由可见的标签页补弹，避免后台标签页也弹一次
        this.parent.modalBroadcaster.send("newVerification", { total: total });
      }
    }

    if (inVerifyPage) {
      Utils.cancelButtonLoadingState(button);
      button.text(`一键查询待审项 (${total}个)`);
    }
  }

  /**
   * 逐个查询管理模组区的待审数并汇总。
   *
   * @param adminModList 自己管理的模组 id 列表。
   * @param inVerifyPage 当前是否就在审核页面上 —— 只有在页面上时才需要标记下拉菜单。
   * @returns 待审总数；请求返回状态异常时返回 `-1`（以区别于「真的是 0 个」）。
   */
  private async work(adminModList: string[], inVerifyPage: boolean) {
    let total = 0;

    const optionMap = new Map<string, number>();
    if (inVerifyPage) {
      const menuOptions = $("#class-version-list").children();
      menuOptions.each((index, node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return true;
        }
        const elem = node as HTMLElement;
        if (elem.dataset.divider) {
          // 审核助理分割线下不属于自己的管理区域，不考虑
          return false;
        }
        const id = elem.getAttribute("value");
        if (id === null) {
          console.error("`id` is null");
          return true;
        }
        optionMap.set(id, Number(index));
      });
    }

    let menuElements = $();
    for (const id of adminModList) {
      const resp = await this.parent.utils.createRequest(
        {
          url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          data: $.param({ data: JSON.stringify({ classID: id }) }),
        },
        "查询待审项数量",
      );
      const state = JSON.parse(resp.responseText)?.state;
      if (state === undefined || state > 0) {
        console.error("返回状态异常: ", resp);
        return -1;
      }
      const count = Number(
        $(JSON.parse(resp.responseText).html)
          .find(".selectJump")
          .next()
          .text()
          .slice(4, -2)
          .replaceAll(",", ""),
      );
      if (count && inVerifyPage) {
        if (total === 0) {
          $("button.btn:nth-child(2)").first().click(); // 展开下拉菜单，便于直观展示内容
          menuElements = $("ul.dropdown-menu:nth-child(1)").children();
        }
        const matchedIndex = optionMap.get(id);
        if (matchedIndex === undefined) {
          console.error("`matchedIndex` is undefined");
          continue;
        }
        const _li = menuElements[matchedIndex];
        if (_li === undefined) {
          console.error("`li` is undefined");
          continue;
        }
        const li = $(_li);
        li.addClass("mcmodder-mark-gold");
        const firstChild = li.children().first();
        firstChild.find(".mcmodder-admin-verify-notify").remove();
        firstChild
          .append(`<span class="mcmodder-admin-verify-notify text-danger">${count}个待审！</span>`)
          .removeClass("disabled");
      }
      total += count;
    }
    return total;
  }
}
