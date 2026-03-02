import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";
import { VerifyPageInit } from "./VerifyPageInit";

export class VerifyHistoryInit extends McmodderInit {

  private stopExpand = false;
  canRun() {
    return this.parent.href.includes("/verify.html");
  }
  run() {
    if (this.parent.utils.getConfig("autoExpandPage")) {
      this.stopExpand = false;
      let maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0])
      let param = window.location.href.split("verify.html?")[1]?.split("&page=")[0]
      if (!param || !maxPage || $(".badge-secondary").text().includes("最近100条")) {
        new VerifyPageInit(this.parent).run();
        return;
      }
      let getHistoryPage = (id: number) => {
        this.parent.utils.createRequest({
          url: `https://www.mcmod.cn/verify.html?${param}&page=${id}`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" },
          onload: resp => {
            if (!resp.responseXML) return;
            let d = $(resp.responseXML);
            d.find(".verify-list-list-table tbody").children().appendTo(".verify-list-list-table tbody");
            McmodderUtils.commonMsg(`成功加载第 ${id} / ${maxPage} 页~`);
            if (id < maxPage && !this.stopExpand) setTimeout(() => getHistoryPage(++id), 1e3);
            else new VerifyPageInit(this.parent).run();
          }
        })
      }
      McmodderUtils.commonMsg("准备自动展开，可随时按 Ctrl + C 取消~");
      $("html").bind("keydown", e => {
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) this.stopExpand = true;
      })
      getHistoryPage(2);
      $(".pagination").remove();
    } else {
      new VerifyPageInit(this.parent).run();
    }
  }
}