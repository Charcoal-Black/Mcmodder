import { McmodderInit } from "./Init";

export class PostPageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/post/") && 
      this.parent.href.includes(".html");
  }
  run() {
    if (this.configs.getSettings("removePostProtection")) {
      $(".owned").removeClass("owned");
    }
  }
}