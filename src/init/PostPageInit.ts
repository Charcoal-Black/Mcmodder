import { Init } from "./Init";

export class PostPageInit extends Init {
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