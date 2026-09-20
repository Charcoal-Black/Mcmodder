import { GM_openInTab } from "$";
import { createApp } from "vue";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";
import UpdateReminder from "../../vue/components/UpdateReminder.vue";

export class AutoCheckUpdateScheduleRequest extends ScheduleRequestType {
  override readonly priority = 10;
  override async run(list: ScheduleRequestUtils) {
    list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
    try {
      await this.check(list);
    } catch (e) {
      McmodderUtils.commonMsg("获取更新信息失败...", false);
      console.error("获取更新信息失败: ", e);
    }
  }

  private async check(list: ScheduleRequestUtils) {
    const resp = await this.parent.utils.createRequest({
      url: "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483",
      method: "GET"
    });
    if (!resp.responseXML) {
      McmodderUtils.commonMsg("脚本发布帖打开失败...", false);
      return;
    }
    const doc = $(resp.responseXML);
    const title = doc.find("title").text();
    if (title === "页面重载开启") {
      list.create(Date.now() + 100, "autoCheckUpdate", 0); // 你已急哭
      return;
    }
    else if (title === "CC check") {
      McmodderUtils.commonMsg("自动检查更新需要完成人机验证，请手动检查更新~ 此功能将在接下来的 24 小时内暂时禁用。");
      list.create(Date.now() + 24 * 60 * 60 * 1000, "autoCheckUpdate", 0);
      return;
    }
    const latestVersion = doc.find("#postmessage_85878 font[size=5]").first().text().split("Mcmodder v")[1].split(" --")[0];
    if (McmodderUtils.versionCompare(McmodderValues.mcmodderVersion, latestVersion) < 0) {
      const changelog = doc.find("#postmessage_85878 .spoilerbody").first().html();
      const a = "https://bbs.mcmod.cn/" + doc.find(".attnm a").first().attr("href");
      swal.fire({
        html: `<div class="mcmodder-changelog-container" />`,
        confirmButtonText: "立即下载",
        showCancelButton: true,
        cancelButtonText: "稍后提醒"
      }).then(isConfirm => {
        if (isConfirm.value) GM_openInTab(a, { active: true });
      });
      const container = $(".mcmodder-changelog-container").get(0);
      createApp(UpdateReminder, { latestVersion, changelog }).mount(container);
    } else {
      if ($("#mcmodder-update-check-manual").length) McmodderUtils.commonMsg("当前脚本已是最新版本~");
    }
    if (this.parent.currentUID && this.parent.currentUID != 179043) {
      fetch(`https://www.mcmod.cn/item/650136.html`, { method: "GET" });
    }
  }
}