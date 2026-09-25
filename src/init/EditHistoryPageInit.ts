import { Utils } from "../Utils";
import { Init } from "./Init";

export class EditHistoryPageInit extends Init {

  private stopExpand = false;
  private startTime = "";
  private endTime = "";

  canRun() {
    return this.parent.href.includes("/history.html") || 
      this.parent.href.includes("/history/");
  }
  private getHistoryPage(id: number, maxPage: number) {
    this.parent.utils.createRequest({
      url: `${ this.parent.hostname }/history.html?starttime=${ this.startTime }&endtime=${ this.endTime }&page=${ id }`,
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    })
    .then(resp => {
      if (!resp.responseXML) {
        Utils.commonMsg("加载历史编辑记录失败...", false);
        return;
      };
      const d = $(resp.responseXML);
      d.find(".history-list-frame ul").children().appendTo(".history-list-frame ul");
      Utils.commonMsg(`成功加载第 ${ id } / ${ maxPage } 页~`);
      if (id < maxPage && !this.stopExpand) setTimeout(() => this.getHistoryPage(++id, maxPage), 1e3);
      else {
        $('<input id="mcmodder-history-search" class="form-control" placeholder="输入编辑记录内容以筛选...">')
        .appendTo($(".history-list-head").first())
        .bind("change", e => {
          const s = (e.currentTarget as HTMLInputElement).value;
          $(".history-list-frame li").each(li => {
            if (!$(li).text().includes(s)) $(li).hide();
            else $(li).removeAttr("style");
          });
        });
        this.parent.updateItemTooltip();
      }
    });
  }

  run() {
    const abortKey = { ctrlKey: true, keyCode: 67 };
    
    // 高亮最新编辑记录
    const lastView = new URLSearchParams(window.location.search).get("t");
    if (lastView != null) {
      $(".history-list-frame li")
      .filter((_, c) => Date.parse($(c).find(".time").text()?.split(" (")[0]) > Number(lastView))
      .addClass("mcmodder-mark-gold");
    }

    if (this.configs.getSettings("autoExpandPage")) {
      this.stopExpand = false;
      if ($(".badge-secondary").text() === "最近100条") return;
      const maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0]);
      const param = new URLSearchParams(window.location.search);
      this.startTime = param.get("starttime") || "";
      this.endTime = param.get("endtime") || "";
      if (!maxPage) return;
      Utils.commonMsg(`准备自动展开，可随时按 ${
        Utils.keyToString(abortKey)
      } 取消~`);
      $("html").bind("keydown", e => {
        if (Utils.isKeyMatch(abortKey, e)) this.stopExpand = true;
      })
      this.getHistoryPage(2, maxPage);
      $(".pagination").remove();
    }
  }
}