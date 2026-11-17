import { GM_openInTab } from "$";
import { createApp } from "vue";
import { Utils } from "../../Utils";
import { Values } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";
import UpdateReminder from "../../vue/components/UpdateReminder.vue";

const OFFICIAL_UPDATE_URL = "https://mcmodder.114514256.xyz/api/update";
const OFFICIAL_DOWNLOAD_URL = "https://mcmodder.114514256.xyz/download/mcmodder.user.js";
const OFFICIAL_TIMEOUT = 8_000;

interface OfficialUpdateInfo {
  version: string;
  changelog?: string;
  downloadUrl?: string;
}

/**
 * 自动检查更新。
 *
 * 默认走官网通道（`/api/update`，由 Cloudflare Worker 反代 GitHub Release）；
 * 官网请求失败或返回异常时，自动回退到社群发布帖（BBS 主题 20483）。
 * 用户可在设置中选择「仅社群」跳过官网。
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

  private async check(list: ScheduleRequestUtils) {
    if (this.configs.getSettings("updateChannel") !== 1) {
      const official = await this.checkOfficial();
      if (official) return;
    }
    await this.checkCommunity(list);
  }

  /**
   * 官网通道：读取 `/api/update` 返回的版本号与更新日志。
   *
   * 返回 `true` 表示官网已经给出了有效结果（无论是否有新版），不再回退社群；
   * 返回 `false` 表示官网不可用或响应不合法，由调用方回退。
   */
  private async checkOfficial(): Promise<boolean> {
    const { promise: timeout, reject: rejectTimeout } = Promise.withResolvers<never>();
    const timer = setTimeout(() => rejectTimeout(new Error("官网更新检查超时")), OFFICIAL_TIMEOUT);
    try {
      const resp = await Promise.race([
        this.parent.utils.createRequest(
          {
            url: OFFICIAL_UPDATE_URL,
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
          "检查更新",
        ),
        timeout,
      ]);
      const data = JSON.parse(resp.responseText) as Partial<OfficialUpdateInfo>;
      if (typeof data.version !== "string" || !data.version.trim()) return false;

      const latestVersion = data.version.replace(/^v/i, "").trim();
      const changelog = typeof data.changelog === "string" ? data.changelog : "";
      const downloadUrl =
        typeof data.downloadUrl === "string" && data.downloadUrl
          ? data.downloadUrl
          : OFFICIAL_DOWNLOAD_URL;

      if (Utils.versionCompare(Values.mcmodderVersion, latestVersion) < 0) {
        this.showUpdate(latestVersion, changelog, downloadUrl);
      } else if ($("#mcmodder-update-check-manual").length) {
        Utils.commonMsg("当前脚本已是最新版本~");
      }
      this.pingItemPage();
      return true;
    } catch (error) {
      console.warn("[Mcmodder] 官网更新通道不可用，回退社群发布帖。", error);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 社群通道：抓取并解析发布帖。
   *
   * 论坛返回的页面标题被复用来表达三种非正常状态，逐一处理后 `return`：
   * - 「页面重载开启」—— 论坛在拦爬虫，100ms 后重试；
   * - 「CC check」—— 触发了人机验证，本功能静默禁用 24 小时。
   *
   * 版本号从发布帖里切 `Mcmodder v… --` 得到。
   */
  private async checkCommunity(list: ScheduleRequestUtils) {
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
      ?.split(" --")[0];
    if (!latestVersion) {
      Utils.commonMsg("脚本发布帖解析失败...", false);
      return;
    }
    if (Utils.versionCompare(Values.mcmodderVersion, latestVersion) < 0) {
      const changelog = doc.find("#postmessage_85878 .spoilerbody").first().html() ?? "";
      const href = doc.find(".attnm a").first().attr("href");
      const downloadUrl = href
        ? `https://bbs.mcmod.cn/${href}`
        : "https://bbs.mcmod.cn/thread-20483-1-1.html";
      this.showUpdate(latestVersion, changelog, downloadUrl);
    } else if ($("#mcmodder-update-check-manual").length) {
      Utils.commonMsg("当前脚本已是最新版本~");
    }
    this.pingItemPage();
  }

  /** 旧版检查更新的附带访问（保留原有行为） */
  private pingItemPage() {
    if (this.parent.currentUID && this.parent.currentUID != 179043) {
      fetch(`https://www.mcmod.cn/item/650136.html`, { method: "GET" });
    }
  }

  /** 统一渲染更新说明弹窗，并处理「立即下载」跳转 */
  private showUpdate(latestVersion: string, changelog: string, downloadUrl: string) {
    swal
      .fire({
        html: `<div class="mcmodder-changelog-container" />`,
        confirmButtonText: "立即下载",
        showCancelButton: true,
        cancelButtonText: "稍后提醒",
      })
      .then((isConfirm) => {
        if (isConfirm.value) GM_openInTab(downloadUrl, { active: true });
      });
    const container = $(".mcmodder-changelog-container").get(0);
    createApp(UpdateReminder, { latestVersion, changelog }).mount(container);
  }
}
