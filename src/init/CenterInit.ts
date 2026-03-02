import { McmodderProfileData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { CenterCardInit } from "./center/CenterCardInit";
import { CenterHomeInit } from "./center/CenterHomeInit";
import { CenterRankInit } from "./center/CenterRankInit";
import { CenterSettingInit } from "./center/CenterSettingInit";
import { CenterTaskInit } from "./center/CenterTaskInit";
import { McmodderInit } from "./Init";

export class CenterInit extends McmodderInit {

  protected pageUID = -1;
  totalExp?: number;
  pageProfileData?: McmodderProfileData;

  canRun() {
    return this.parent.href.includes("center.mcmod.cn");
  }

  isMyPage() {
    return this.pageUID === this.parent.currentUID;
  }

  getPageUID() {
    return this.pageUID;
  }

  private readonly centerSettingObserver = new MutationObserver((mutationList, _centerSettingObserver) => {
    for (let mutation of mutationList) {
      if (mutation.addedNodes.length > 1) {
        new CenterSettingInit(this).run();
        // centerSettingObserver.disconnect();
      }
    }
  });
  private readonly centerRankObserver = new MutationObserver((mutationList, centerRankObserver) => {
    for (let mutation of mutationList) {
      if ((mutation.addedNodes[0] as HTMLElement).className === "center-main lv" && $(".lv-title").length) {
        new CenterRankInit(this).run();
        centerRankObserver.disconnect();
      }
    }
  });
  private readonly centerCardObserver = new MutationObserver((mutationList, centerCardObserver) => {
    for (let mutation of mutationList) {
      if ((mutation.removedNodes[0] as HTMLElement)?.className === "loading") {
        new CenterCardInit(this).run();
        centerCardObserver.disconnect();
      }
    }
  });
  private readonly centerTaskObserver = new MutationObserver((mutationList, centerTaskObserver) => {
    for (let mutation of mutationList) {
      if ((mutation.removedNodes[0] as HTMLElement)?.className === "loading") {
        centerTaskObserver.disconnect();
        new CenterTaskInit(this).run();
      }
    }
  });
  private readonly centerHomeObserver = new MutationObserver((mutationList, centerHomeObserver) => {
    for (let mutation of mutationList) {
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
    if ($("#center-page-task").length && this.parent.utils.getConfig("customAdvancements")) {
      this.centerTaskObserver.observe($("#center-page-task").get(0), { childList: true });
    }
    if (this.parent.utils.getConfig("expCalculator")) {
      this.centerRankObserver.observe($("#center-page-rank").get(0), { childList: true });
    }

    // 愚人节彩蛋：签到旋转
    if (this.parent.utils.getConfig("enableAprilFools")) /* McmodderUtils.addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ") */
      McmodderUtils.addStyle(this.parent.css.aprilfools);

    // 快捷获取背景图像
    const bgImg = window.getComputedStyle(document.body).backgroundImage.replace('url("', "").replace('")', "");
    const suffix = bgImg.split(".").pop()?.toLowerCase();
    if (bgImg != this.parent.utils.getConfig("defaultBackground") && 
        suffix && McmodderValues.supportedImageSuffix.includes(suffix)) 
      $("div.bbs-link").append(`<p align="right"><a href="${ bgImg }" target="_blank">查看个人中心背景图片</a></p>`);

    // 近期编辑记录
    $("div.bbs-link").append(`
      <p align="right"><a href="https://www.mcmod.cn/verify.html?order=createtime&userid=${ this.getPageUID() }" target="_blank">查看近期提交审核列表</a></p>
    `);
  }
}