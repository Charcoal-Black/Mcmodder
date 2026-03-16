import { McmodderInit } from "./Init";

export class ModlistInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/modlist.html");
  }
  run() {
    $(".modlist-filter-block button").css({
      "background-color": "transparent",
      "top": "50%",
      "transform": "translateY(-50%)"
    });
  }
}