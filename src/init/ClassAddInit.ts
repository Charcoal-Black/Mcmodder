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

  private runCrashProtector() {
    $("#mcmodder-crash-protector").html("[刷新中...]");
    this.parent.utils.createRequest({
      url: "https://www.mcmod.cn/class/add/",
      method: "GET",
      onload: resp => {
        if (!resp.responseXML) return;
        let d = $(resp.responseXML);
        $("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html(d.find("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html());
        $("#mcmodder-crash-protector").html("[刷新]");
        McmodderUtils.commonMsg("刷新成功！");
        this.refreshCrashList();
      }
    });
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