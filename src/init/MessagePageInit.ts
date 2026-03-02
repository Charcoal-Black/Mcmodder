import { McmodderInit } from "./Init";

export class MessageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/message/");
  }
  run() {
    if (this.parent.utils.getConfig("lieqi")) {
      $(".content-comment-attitude > i").attr("class", "fas fa-surprise");
      $(".content-comment-attitude").each((_, c) => {
        $(c).contents().last().get(0).textContent = "猎奇";
      });
    }
  }
}