import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class EditHistoryPageInit extends McmodderInit {

  private stopExpand = false;
  private startTime = "";
  private endTime = "";

  canRun() {
    return this.parent.href.includes("/history.html") || 
      this.parent.href.includes("/history/");
  }
  private getHistoryPage(id: number, maxPage: number) {
    this.parent.utils.createRequest({
      url: `https://www.mcmod.cn/history.html?starttime=${ this.startTime }&endtime=${ this.endTime }&page=${ id }`,
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      onload: resp => {
        if (!resp.responseXML) {
          McmodderUtils.commonMsg("加载历史编辑记录失败...", false);
          return;
        };
        let d = $(resp.responseXML);
        d.find(".history-list-frame ul").children().appendTo(".history-list-frame ul");
        McmodderUtils.commonMsg(`成功加载第 ${ id } / ${ maxPage } 页~`);
        if (id < maxPage && !this.stopExpand) setTimeout(() => this.getHistoryPage(++id, maxPage), 1e3);
        else {
          $('<input id="mcmodder-history-search" class="form-control" placeholder="输入编辑记录内容以筛选...">')
          .appendTo($(".history-list-head").first())
          .bind("change", e => {
            let s = (e.currentTarget as HTMLInputElement).value;
            $(".history-list-frame li").each(li => {
              if (!$(li).text().includes(s)) $(li).hide();
              else $(li).removeAttr("style");
            });
          });
          this.parent.updateItemTooltip();
        }
      }
    });
  }

  run() {
    // 高亮最新编辑记录
    const lastView = new URLSearchParams(window.location.search).get("t");
    if (lastView != null) {
      $(".history-list-frame li")
      .filter((_, c) => Date.parse($(c).find(".time").text()?.split(" (")[0]) > Number(lastView))
      .addClass("mcmodder-mark-gold");
    }

    if (this.parent.utils.getConfig("autoExpandPage")) {
      this.stopExpand = false;
      if ($(".badge-secondary").text() === "最近100条") return;
      let maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0]);
      let param = new URLSearchParams(window.location.search);
      this.startTime = param.get("starttime") || "";
      this.endTime = param.get("endtime") || "";
      if (!maxPage) return;
      McmodderUtils.commonMsg("准备自动展开，可随时按 Ctrl + C 取消~");
      $("html").bind("keydown", e => {
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) this.stopExpand = true;
      })
      this.getHistoryPage(2, maxPage);
      $(".pagination").remove();
    }
  }
}