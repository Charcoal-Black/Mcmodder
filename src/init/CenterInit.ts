import { Values } from "../Values";
import { CenterCardInit } from "./center/CenterCardInit";
import { CenterCommentInit } from "./center/CenterCommentInit";
import { CenterHomeInit } from "./center/CenterHomeInit";
import { CenterRankInit } from "./center/CenterRankInit";
import { CenterSettingInit } from "./center/CenterSettingInit";
import { CenterTaskInit } from "./center/CenterTaskInit";
import { Init } from "./Init";

/** SPA 子页的挂载配置 */
interface CenterPage {
  /** 子页容器选择器，不在 DOM 中时直接跳过 */
  selector: string;
  /** 就绪后执行的初始化 */
  init: () => void;
  /** 当前 DOM 是否已就绪；不传则视为「已就绪」（回调自身幂等时可只依赖变化通知） */
  isReady?: () => boolean;
  /** 是否为一次性初始化，默认为 true；为 false 时持续监听后续重渲染 */
  once?: boolean;
  subtree?: boolean;
}

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

  /**
   * 挂载一个 SPA 子页：子页 DOM 有可能在本脚本注入之前就已渲染完成（bFCache 恢复、注入偏晚等），
   * 此时 MutationObserver 不会再补发之前的变更记录，所以先同步检测一次「当前是否已就绪」。
   * 就绪条件只写一遍，之后每次 DOM 变动都用它重新判定，故无需再区分 added/removed 节点。
   */
  private watchPage(page: CenterPage) {
    const target = $(page.selector).get(0);
    if (!target) return;
    const tryInit = () => {
      if (page.isReady && !page.isReady()) return false;
      page.init();
      return true;
    };
    // 一次性初始化在这里就已经完成，无需再挂观察者
    if (tryInit() && page.once) return;
    const observer = new MutationObserver(() => {
      if (tryInit() && page.once) observer.disconnect();
    });
    observer.observe(target, { childList: true, subtree: page.subtree });
  }

  run() {
    this.pageUID = Number(this.parent.href.split("center.mcmod.cn/")[1].split("/")[0]);

    this.watchPage({
      selector: "#center-page-home",
      init: () => new CenterHomeInit(this).run(),
      isReady: () => $("#center-page-home .center-total").length > 0,
    });
    this.watchPage({
      selector: "#center-page-setting",
      init: () => new CenterSettingInit(this).run(),
      isReady: () => $("#center-page-setting").children().length > 1,
      // 设置页每次进入都会重渲染，回调只重绑事件，保持观察
      once: false,
    });
    this.watchPage({
      selector: "#center-page-card",
      init: () => new CenterCardInit(this).run(),
      // 占位 loading 已移除且卡片内容已渲染
      isReady: () =>
        $("#center-page-card .loading").length === 0 &&
        $("#center-page-card .center-content.background").length > 0,
    });
    if (this.configs.getSettings("customAdvancements")) {
      this.watchPage({
        selector: "#center-page-task",
        init: () => new CenterTaskInit(this).run(),
        // 占位 loading 已移除且成就列表已渲染，否则无法解析已取得成就
        isReady: () =>
          $("#center-page-task .loading").length === 0 &&
          $("#center-page-task .center-task-block").length > 0,
      });
    }
    if (this.configs.getSettings("expCalculator")) {
      this.watchPage({
        selector: "#center-page-rank",
        init: () => new CenterRankInit(this).run(),
        isReady: () => $(".center-main.lv").length > 0 && $(".lv-title").length > 0,
      });
    }
    if (this.configs.getSettings("customAttitude_v2")) {
      this.watchPage({
        selector: "#center-page-comment",
        init: () => void new CenterCommentInit(this).run(),
        // 短评面板每次进入都会重渲染：回调自身幂等，保持观察
        once: false,
        subtree: true,
      });
    }

    // 快捷获取背景图像
    const bgImg = window
      .getComputedStyle(document.body)
      .backgroundImage.replace('url("', "")
      .replace('")', "");
    const suffix = bgImg.split(".").pop()?.toLowerCase();
    if (
      bgImg !== this.configs.getSettings("defaultBackground") &&
      suffix &&
      Values.supportedImageSuffix.includes(suffix)
    )
      $("div.bbs-link").append(
        `<p align="right"><a href="${bgImg}" target="_blank">查看个人中心背景图片</a></p>`,
      );

    // 近期编辑记录
    $("div.bbs-link").append(`
      <p align="right"><a href="${this.parent.hostname}/verify.html?order=createtime&userid=${this.getPageUID()}" target="_blank">查看近期提交审核列表</a></p>
    `);
  }
}
