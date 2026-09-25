import { GM_openInTab } from "$";
import { Utils } from "../../Utils";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoCheckVerifyScheduleRequest extends ScheduleRequestType {
  override readonly priority = 2;

  override async run(list: ScheduleRequestUtils) {
    const autoVerifyDelay = this.configs.getSettings("autoVerifyDelay");
    if (!autoVerifyDelay) {
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
        const { value } = await swal.fire({
          type: "warning",
          title: "有新待审项",
          text: `当前所管理的模组共有 ${total} 个待审项，请尽快处理~`,
          showCancelButton: true,
          confirmButtonText: "前往后台",
          cancelButtonText: "稍后提醒",
          allowOutsideClick: false,
        });
        if (value) {
          GM_openInTab("https://admin.mcmod.cn/", { active: true });
        }
      }
    }

    if (inVerifyPage) {
      Utils.cancelButtonLoadingState(button);
      button.text(`一键查询待审项 (${total}个)`);
    }
  }

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
      const resp = await this.parent.utils.createRequest({
        url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        data: $.param({ data: JSON.stringify({ classID: id }) }),
      });
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
