import { McmodderInit } from "./Init";

export class ItemListInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/class/add/");
  }
  run() {
    if (this.configs.getSettings("moveAds")) {
      $(".center .adsbygoogle").insertAfter(".center .item-list-table");
    }  
  }
}