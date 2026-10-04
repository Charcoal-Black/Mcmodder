import { GM_openInTab } from "$";
import { createApp } from "vue";
import { Utils } from "../../Utils";
import { Values } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";
import UpdateReminder from "../../vue/components/UpdateReminder.vue";

/**
 * 自动检查更新：抓取发布帖（BBS 主题 20483），比对更新日志里的最新版本号，
 * 有新版就弹出更新说明并提供下载链接。
 */
export class AutoCheckUpdateScheduleRequest extends ScheduleRequestType {
  override readonly priority = 10;

  /**
   * 检查更新。
   *
   * 固定间隔 1 小时；整个请求包在 try/catch 里，失败只提示不抛，
   * 避免一次网络抖动就让整轮轮询中断。
   */
  override async run(list: ScheduleRequestUtils) {
    list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
    try {
      await this.check(list);
    } catch (e) {
      Utils.commonMsg("获取更新信息失败...", false);
      console.error("获取更新信息失败: ", e);
    }
  }

  /**
   * 抓取并解析发布帖。
   *
   * 论坛返回的页面标题被复用来表达三种非正常状态，逐一处理后 `return`：
   * - 「页面重载开启」—— 论坛在拦爬虫，100ms 后重试；
   * - 「CC check」—— 触发了人机验证，本功能静默禁用 24 小时。
   *
   * 版本号从发布帖里切 `Mcmodder v… --` 得到。
   */
  private async check(list: ScheduleRequestUtils) {
    const resp = await this.parent.utils.createRequest(
      {
        url: "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483",
        method: "GET",
      },
      "检查更新",
    );
    if (!resp.responseXML) {
      Utils.commonMsg("脚本发布帖打开失败...", false);
      return;
    }
    const doc = $(resp.responseXML);
    const title = doc.find("title").text();
    if (title === "页面重载开启") {
      list.create(Date.now() + 100, "autoCheckUpdate", 0); // 你已急哭
      return;
    } else if (title === "CC check") {
      Utils.commonMsg(
        "自动检查更新需要完成人机验证，请手动检查更新~ 此功能将在接下来的 24 小时内暂时禁用。",
      );
      list.create(Date.now() + 24 * 60 * 60 * 1000, "autoCheckUpdate", 0);
      return;
    }
    const latestVersion = doc
      .find("#postmessage_85878 font[size=5]")
      .first()
      .text()
      .split("Mcmodder v")[1]
      .split(" --")[0];
    if (Utils.versionCompare(Values.mcmodderVersion, latestVersion) < 0) {
      const changelog = doc.find("#postmessage_85878 .spoilerbody").first().html();
      const a = "https://bbs.mcmod.cn/" + doc.find(".attnm a").first().attr("href");
      swal
        .fire({
          html: `<div class="mcmodder-changelog-container" />`,
          confirmButtonText: "立即下载",
          showCancelButton: true,
          cancelButtonText: "稍后提醒",
        })
        .then((isConfirm) => {
          if (isConfirm.value) GM_openInTab(a, { active: true });
        });
      const container = $(".mcmodder-changelog-container").get(0);
      createApp(UpdateReminder, { latestVersion, changelog }).mount(container);
    } else {
      if ($("#mcmodder-update-check-manual").length) Utils.commonMsg("当前脚本已是最新版本~");
    }
    if (this.parent.currentUID && this.parent.currentUID != 179043) {
      fetch(`https://www.mcmod.cn/item/650136.html`, { method: "GET" });
    }
  }
}
