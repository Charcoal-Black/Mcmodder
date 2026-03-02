import { GM_openInTab } from "$";
import { McmodderUtils } from "../../Utils";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoCheckVerifyScheduleRequest extends ScheduleRequestType {
  protected priority = 2;
  async run(list: ScheduleRequestUtils) {
    list.create(Date.now() + this.parent.utils.getConfig("autoVerifyDelay") * 60 * 60 * 1000, "autoCheckVerify", this.parent.currentUID);
    const adminModList = this.parent.utils.getProfile("adminModList")?.split(",") || [];
    const getVerifyCount = (id: number) => {
      this.parent.utils.createRequest({
        url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        data: $.param({ data: JSON.stringify({ classID: id }) }),
        onload: resp => {
          const state = JSON.parse(resp.responseText)?.state;
          if (state === undefined || state > 0) {
            console.error("返回状态异常: ", resp);
            return;
          }
          total += Number($(JSON.parse(resp.responseText).html).find(".selectJump").next().text().slice(4, -2).replaceAll(",", ""));
          if (adminModList.length > index + 2) {
            getVerifyCount(adminModList[++index]);
            return;
          } else {
            if (!total) McmodderUtils.commonMsg("自动检查待审项已执行~ 当前暂无待审项~");
            else if (window.location.href.includes("admin.mcmod.cn")) {
              McmodderUtils.commonMsg(`当前所管理的模组共有 ${total} 个待审项，请尽快处理~`, false);
              $("[data-page=pageVerifyMod]").click();
            }
            else swal.fire({
              type: "warning",
              title: "有新待审项",
              text: `当前所管理的模组共有 ${total} 个待审项，请尽快处理~`,
              showCancelButton: true,
              confirmButtonText: "前往后台",
              cancelButtonText: "稍后提醒"
            }).then(isConfirm => {
              if (isConfirm.value) GM_openInTab("https://admin.mcmod.cn/", { active: true });
            })
          }
        }
      });
    }
    let index = 0, total = 0;
    if (adminModList) getVerifyCount(adminModList[0]);
  }
}