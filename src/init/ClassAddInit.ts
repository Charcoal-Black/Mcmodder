import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class ClassAddInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/class/add/");
  }

  private refreshCrashList() {
    const crashList = $('.title.text-danger').first().next();
    crashList.children().first().append(` (${crashList.find(".text-danger").length.toLocaleString()})`);
  }

  private async runCrashProtector() {
    $("#mcmodder-crash-protector").html("[刷新中...]");
    const resp = await this.parent.utils.createRequest({
      url: `${ this.parent.hostname }/class/add/`,
      method: "GET"
    });
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    $("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html(doc.find("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html());
    $("#mcmodder-crash-protector").html("[刷新]");
    McmodderUtils.commonMsg("刷新成功！");
    this.refreshCrashList();
  }

  run() {
    // 提醒撞车小助手
    $('<a id="mcmodder-crash-protector">[刷新]</a>')
    .appendTo($("div.text-danger").first())
    .click(() => {
      this.runCrashProtector();
    });
    this.refreshCrashList();

    if (this.parent.utils.getConfig("classAddHelper")) {
      $("#edit-page-2, #edit-page-3").attr("class", "tab-pane active");
      $("div.swiper-container").remove();
    }

    this.parent.editorLoad();
  }
}