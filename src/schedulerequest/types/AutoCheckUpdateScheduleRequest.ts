import { GM_openInTab } from "$";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoCheckUpdateScheduleRequest extends ScheduleRequestType {
  protected priority = 10;
  async run(list: ScheduleRequestUtils) {
    const resp = await this.parent.utils.createAsyncRequest({
      url: "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483",
      method: "GET"
    });
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    if (doc.find("title").text() === "页面重载开启") {
      list.create(Date.now() + 100, "autoCheckUpdate", 0); // 你已急哭
      return;
    }
    const latestVersion = doc.find("#postmessage_85878 font[size=5]").first().text().split("Mcmodder v")[1].split(" --")[0];
    if (McmodderUtils.versionCompare(McmodderValues.mcmodderVersion, latestVersion) < 0) {
      const changelog = doc.find("#postmessage_85878 .spoilerbody").first().html();
      const a = "https://bbs.mcmod.cn/" + doc.find(".attnm a").first().attr("href");
      swal.fire({
        html: `
        <div class="mcmodder-changelog-cover">
          <span class="mcmodder-changelog-title">啊哈哈哈、更新来咯！</span>
          <span class="mcmodder-changelog-subtitle">
            <span class="mcmodder-common-danger">${ McmodderValues.mcmodderVersion }</span>
            &nbsp;→&nbsp;
            <span class="mcmodder-common-light">${ latestVersion }</span>
          </span>
        </div>
        <div class="mcmodder-changelog-content">${ changelog }</div>`,
        confirmButtonText: "立即下载",
        showCancelButton: true,
        cancelButtonText: "稍后提醒"
      }).then(isConfirm => {
        if (isConfirm.value) GM_openInTab(a, { active: true });
        else list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
      });
    } else {
      if ($("#mcmodder-update-check-manual").length) McmodderUtils.commonMsg("当前脚本已是最新版本~");
      list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
    }
    if (this.parent.currentUID && this.parent.currentUID != 179043) {
      fetch(`https://www.mcmod.cn/item/650136.html`, { method: "GET" });
    }
  }
}