import { Utils } from "../Utils";
import { Init } from "./Init";
import { VerifyPageInit } from "./VerifyPageInit";

export class VerifyHistoryInit extends Init {

  private stopExpand = false;
  canRun() {
    return this.parent.href.includes("/verify.html");
  }
  run() {
    if (this.configs.getSettings("autoExpandPage")) {
      this.stopExpand = false;
      const maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0])
      const param = window.location.href.split("verify.html?")[1]?.split("&page=")[0]
      if (!param || !maxPage || $(".badge-secondary").text().includes("最近100条")) {
        new VerifyPageInit(this.parent).run();
        return;
      }
      const getHistoryPage = (id: number) => {
        this.parent.utils.createRequest({
          url: `${ this.parent.hostname }/verify.html?${ param }&page=${ id }`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" }
        })
        .then(resp => {
          if (!resp.responseXML) return;
          const d = $(resp.responseXML);
          d.find(".verify-list-list-table tbody").children().appendTo(".verify-list-list-table tbody");
          Utils.commonMsg(`成功加载第 ${ id } / ${ maxPage } 页~`);
          if (id < maxPage && !this.stopExpand) setTimeout(() => getHistoryPage(++id), 1e3);
          else new VerifyPageInit(this.parent).run();
        })
      }
      Utils.commonMsg("准备自动展开，可随时按 Ctrl + C 取消~");
      $("html").bind("keydown", e => {
        if (Utils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) this.stopExpand = true;
      })
      getHistoryPage(2);
      $(".pagination").remove();
    } else {
      new VerifyPageInit(this.parent).run();
    }
  }
}