import { Values } from "../Values";
import { CenterCardInit } from "./center/CenterCardInit";
import { CenterHomeInit } from "./center/CenterHomeInit";
import { CenterRankInit } from "./center/CenterRankInit";
import { CenterSettingInit } from "./center/CenterSettingInit";
import { CenterTaskInit } from "./center/CenterTaskInit";
import { Init } from "./Init";

export class CenterInit extends Init {

  protected pageUID = -1;
  totalExp?: number;
  pageProfile?: Profile;

  canRun() {
    return this.parent.href.includes("center.mcmod.cn");
  }

  isMyPage() {
    return this.pageUID === this.parent.currentUID;
  }

  isFavPage() {
    const favList = this.configs.getSettingsAsNumberList("userFavList") ?? [];
    return favList.includes(this.pageUID) && !this.isMyPage();
  }

  getPageUID() {
    return this.pageUID;
  }

  private readonly centerSettingObserver = new MutationObserver(mutationList => {
    for (const mutation of mutationList) {
      if (mutation.addedNodes.length > 1) {
        new CenterSettingInit(this).run();
        // centerSettingObserver.disconnect();
      }
    }
  });
  private readonly centerRankObserver = new MutationObserver((mutationList, centerRankObserver) => {
    for (const mutation of mutationList) {
      if ((mutation.addedNodes[0] as HTMLElement).className === "center-main lv" && $(".lv-title").length) {
        new CenterRankInit(this).run();
        centerRankObserver.disconnect();
      }
    }
  });
  private readonly centerCardObserver = new MutationObserver((mutationList, centerCardObserver) => {
    for (const mutation of mutationList) {
      if ((mutation.removedNodes[0] as HTMLElement)?.className === "loading") {
        new CenterCardInit(this).run();
        centerCardObserver.disconnect();
      }
    }
  });
  private readonly centerTaskObserver = new MutationObserver((mutationList, centerTaskObserver) => {
    for (const mutation of mutationList) {
      if ((mutation.removedNodes[0] as HTMLElement)?.className === "loading") {
        centerTaskObserver.disconnect();
        new CenterTaskInit(this).run();
      }
    }
  });
  private readonly centerHomeObserver = new MutationObserver((mutationList, centerHomeObserver) => {
    for (const mutation of mutationList) {
      if ((mutation.addedNodes[0] as HTMLElement)?.className === "center-total") {
        new CenterHomeInit(this).run();
        centerHomeObserver.disconnect();
      }
    }
  });

  run() {
    this.pageUID = Number(this.parent.href.split("center.mcmod.cn/")[1].split("/")[0]);

    this.centerHomeObserver.observe($("#center-page-home").get(0), { childList: true });
    if ($("#center-page-setting").length > 0) {
      this.centerSettingObserver.observe($("#center-page-setting").get(0), { childList: true });
    }
    if ($("#center-page-card").length) {
      this.centerCardObserver.observe($("#center-page-card").get(0), { childList: true });
    }
    if ($("#center-page-task").length && this.configs.getSettings("customAdvancements")) {
      this.centerTaskObserver.observe($("#center-page-task").get(0), { childList: true });
    }
    if (this.configs.getSettings("expCalculator")) {
      this.centerRankObserver.observe($("#center-page-rank").get(0), { childList: true });
    }

    // 快捷获取背景图像
    const bgImg = window.getComputedStyle(document.body).backgroundImage.replace('url("', "").replace('")', "");
    const suffix = bgImg.split(".").pop()?.toLowerCase();
    if (bgImg !== this.configs.getSettings("defaultBackground") && 
        suffix && Values.supportedImageSuffix.includes(suffix)) 
      $("div.bbs-link").append(`<p align="right"><a href="${ bgImg }" target="_blank">查看个人中心背景图片</a></p>`);

    // 近期编辑记录
    $("div.bbs-link").append(`
      <p align="right"><a href="${ this.parent.hostname }/verify.html?order=createtime&userid=${ this.getPageUID() }" target="_blank">查看近期提交审核列表</a></p>
    `);
  }
}