import { Init } from "./Init";

export class ItemListInit extends Init {
  canRun() {
    return this.parent.href.includes("/class/add/");
  }
  run() {
    if (this.configs.getSettings("moveAds")) {
      $(".center .adsbygoogle").insertAfter(".center .item-list-table");
    }  
  }
}