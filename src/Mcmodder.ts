import { GM_getValue, GM_openInTab, GM_setValue } from "$";
import { AdvancementID, AdvancementUtils } from "./advancement/AdvancementUtils";
import { ConfigUtils } from "./config/ConfigUtils";
import { DraggableFrame } from "./widget/draggable/DraggableFrame";
import { AdvancementLoader } from "./loader/AdvancementLoader";
import { ConfigLoader } from "./loader/ConfigLoader";
import { MemuCommandLoader } from "./loader/MenuCommandLoader";
import { ScheduleRequestLoader } from "./loader/ScheduleRequestLoader";
import { StorageBufferLoader } from "./loader/StorageBufferLoader";
import { StyleLoader } from "./loader/StyleLoader";
import { ScheduleRequestUtils } from "./schedulerequest/ScheduleRequestUtils";
import { StorageBuffer } from "./StorageBuffer";
import { AdvancedUEditor } from "./ueditor/AdvancedUEditor";
import { UEditor } from "./ueditor/UEditor";
import { Utils, type ThemeColorSet } from "./Utils";
import { Values } from "./Values";
import { Init } from "./init/Init";
import { InitLoader } from "./loader/InitLoader";
import { GeneralEditInit } from "./init/GeneralEditInit";
import { EditorInit } from "./init/EditorInit";
import { Swiper } from "./widget/Swiper";
import { SupabaseUtils } from "./supabase/SupabaseUtils";
import { Splash3D } from "./widget/Splash3D";
import { EchartsUtils } from "./echarts/EChartsUtils";
import { createApp } from "vue";
import FavUser from "./vue/components/FavUser.vue";
import ProfileSelector from "./vue/components/ProfileSelector.vue";
import { ConfigRepository } from "./config/ConfigRepository.ts";

interface ScreenAttachedFrameData {
  node: HTMLElement;
  parentPosY: number;
  parentHeight: number;
}

export class Mcmodder {
  utils: Utils;
  configRepository: ConfigRepository;
  currentUID: number;
  currentUsername: string;
  advutils: AdvancementUtils;
  scheduleRequestUtils: ScheduleRequestUtils;
  storageBuffer: StorageBuffer;
  initList: Init[] = [];
  readonly isV4: boolean;
  readonly isMac: boolean;
  readonly isMobileClient: boolean;
  href: string;
  ueditorFrame: UEditor[];
  screenAttachedFrame: ScreenAttachedFrameData[];
  cfgutils: ConfigUtils;
  supabaseUtils: SupabaseUtils;
  echartsUtils: EchartsUtils;
  styleColors: ThemeColorSet;
  splash3D?: Splash3D;
  preferredWiderScreen = false;
  isNightMode = false;
  title = "";
  css = "";
  itemTypeList?: ItemCustomTypeList;
  readonly hostname: string;
  private msgAlertCount = 0;
  private readonly titleNode = $("title");
  private readonly linkContentDictionary: Record<string, string> = {};
  private readonly elementColorDictionary: Map<HTMLElement, string> = new Map();
  private readonly elementColorCache: Map<string, string> = new Map();

  constructor() {
    this.isV4 = typeof fuc_topmenu_v4 === "function";
    this.isMac = Utils.isMac();
    this.isMobileClient = Utils.isMobileClient();
    const headerUserName = $(".header-user-name a, .name.top-username a, .profilebox").first();
    this.currentUsername = headerUserName.text() || "";
    const win =
      typeof (globalThis as any).unsafeWindow !== "undefined"
        ? (globalThis as any).unsafeWindow
        : window;
    (win as any).__mcmodder_username__ = this.currentUsername;
    this.currentUID =
      Number(headerUserName.attr("href")?.split("//center.mcmod.cn/")[1]?.split("/")[0]) || 0;
    this.ueditorFrame = [];
    this.href = window.location.href;
    MemuCommandLoader.run();
    this.title = this.titleNode.html().replace(" - MC百科|最大的Minecraft中文MOD百科", "");
    this.hostname = Values.hostname;

    this.screenAttachedFrame = [];

    this.storageBuffer = new StorageBuffer(this);
    StorageBufferLoader.run(this.storageBuffer);

    this.utils = new Utils(this);
    this.configRepository = this.utils.configs;

    this.echartsUtils = new EchartsUtils(this);

    this.cfgutils = new ConfigUtils(this);
    ConfigLoader.run(this.cfgutils);
    this.styleColors = Utils.getThemeColors(this.configRepository);

    this.advutils = new AdvancementUtils(this);
    AdvancementLoader.run(this.advutils);

    this.scheduleRequestUtils = new ScheduleRequestUtils(this);
    ScheduleRequestLoader.run(this.scheduleRequestUtils);

    this.supabaseUtils = new SupabaseUtils(this);

    InitLoader.run(this, this.initList);

    StyleLoader.run(this);

    this.main();
  }

  private callEditor() {
    if ($(".edit-tools").length || /\/sandbox\/[0-9]+.html/.test(this.href)) {
      setTimeout(() => new AdvancedUEditor(editor, this), 3e2);
    } else {
      setTimeout(() => new UEditor(editor, this), 3e2);
    }
  }

  private readonly generalEditorObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (
        (mutation.target as HTMLElement).id === "edui1_iframeholder" &&
        mutation.addedNodes.length
      ) {
        this.callEditor();
        this.generalEditorObserver.disconnect();
      }
    }
  });

  updateItemTooltip() {
    // 鼠标悬浮预览介绍
    if (this.configRepository.getSettings("hoverDescription")) {
      $(".common-imglist li, .item-list-type-right span, .relation a").off();
      $("a")
        .filter((_, e) => {
          const href = (e as HTMLAnchorElement).href;
          return (
            /\/\/www1?\.mcmod\.cn\/item\/[0-9]*\.html/.test(href) ||
            /\/\/www1?\.mcmod\.cn\/class\/[0-9]*\.html/.test(href)
          );
        })
        .filter((_, _c) => {
          const c = $(_c);
          if (c.parents(".mcmodder-item-link").length) return false;
          if (c.parent().hasClass("item-table-hover")) return false;
          return true;
        })
        .addClass("mcmodder-item-link")
        .removeAttr("title");
      $(".modlist-block .title a").removeClass("mcmodder-item-link");
      $(".mcmodder-item-link[data-toggle=tooltip]:not([data-html])").each((_, e) => {
        $(e).tooltip("dispose");
        // 强制序列化终极邪道
        // eslint-disable-next-line no-self-assign
        e.outerHTML = e.outerHTML;
      });
      $(".mcmodder-item-link").each((_, e) => {
        const href = (e as HTMLAnchorElement).href;
        $(e).attr({
          "data-source-url": href.split("mcmod.cn/")[1],
          "data-toggle": "tooltip",
          "data-html": "true",
          "data-original-title": `
            <div class="mcmodder-preview-container" data-source-url="${href.split("mcmod.cn/")[1]}">
              <div class="mcmodder-preview-frame maintext">
                <div class="mcmodder-loading"></div>
              </div>
            </div>
          `,
        });
      });
      document.addEventListener("pointerover", async (e) => {
        const target = e.target;
        if (!(
          target instanceof HTMLAnchorElement && target.classList.contains("mcmodder-item-link")
        )) {
          return;
        }
        await Utils.sleep(250);
        const sourceUrl = $(target).attr("data-source-url");
        const previewContainer = $(`.mcmodder-preview-container[data-source-url="${sourceUrl}"]`);
        const previewFrame = previewContainer.find(`.mcmodder-preview-frame`);
        if (!$(target).attr("aria-describedby")) return;
        if (previewFrame.attr("data-status")) return;
        const storagedContent = this.linkContentDictionary[sourceUrl];
        if (storagedContent != undefined) {
          previewFrame.attr("data-status", "fulfilled");
          $(target).attr("data-original-title", storagedContent);
          previewFrame.children().html(storagedContent);
        }
        previewFrame.attr("data-status", "pending");
        await Utils.sleep(750);
        const resp = await this.utils.createRequest({
          url: target.href,
          method: "GET",
          anonymous: true,
        });
        if (!resp.responseXML) return;
        if (previewFrame.attr("data-status") === "fulfilled") return;
        const doc = $(resp.responseXML);
        doc.find(".itemname > .tool").remove();
        doc.find(".quote_text legend a").last().remove();
        previewFrame.html(
          doc.find(".item-content, .class-menu-main .text-area.font14").first().html(),
        );
        if (previewFrame.text() === "暂无简介，欢迎协助完善。") {
          previewFrame.html('<span class="mcmodder-common-danger">该资料正文暂无介绍...</span>');
        }
        if (sourceUrl.includes("item/")) {
          doc
            .find(".itemname")
            .first()
            .insertBefore(previewFrame.children().first())
            .find("h5")
            .each((_, h5) => {
              const keywords = doc.find("meta[name=keywords]").attr("content").split(",");
              let textContent = h5.textContent;
              if (keywords[1]) {
                textContent = ("<a>" + textContent).replace(
                  ` (${keywords[1]})`,
                  `</a> <span class="item-h5-ename"><a>${keywords[1]}</a></span>`,
                );
              } else {
                textContent = `<a>${textContent}</a>`;
              }
              h5.innerHTML = textContent;
            });
        } else if (sourceUrl.includes("class/")) {
          doc.find(".class-title").first().insertBefore(previewFrame.children().first());
        }
        const rightTable = doc.find(".item-data .item-info-table").first();
        rightTable.removeClass("righttable").insertBefore(previewFrame);
        const showImg = (c: Element) => (c.outerHTML = c.outerHTML.replaceAll("data-src=", "src="));
        rightTable.find("img").each((_, img) => {
          showImg(img);
        });
        const mcicons = $("#icon-toughness-empty");
        if (!mcicons.length) {
          const module = import.meta.glob("./html/mcicons.html", {
            query: "?raw",
            eager: true,
          });
          const mciconsHtml = (module["./html/mcicons.html"] as any).default as string;
          $(mciconsHtml).prependTo(document.body);
        }
        if (this.configRepository.getSettings("hoverImage")) {
          previewFrame.find("img").each((_, img) => {
            showImg(img);
            $(img).attr("src", $(img).attr("data-src"));
          });
        }
        rightTable.find("tr").last().remove();
        const final = previewContainer.prop("outerHTML");
        $(target).attr("data-original-title", final);
        this.linkContentDictionary[sourceUrl] = final;
        previewFrame.attr("data-status", "fulfilled");
      });
    }
    Utils.updateAllTooltip();
  }

  notifyUnreadMessage(count: number) {
    this.msgAlertCount = count;
    const redNum = $(".mcmodder-rednum");
    if (count) {
      const text = count.toLocaleString();
      redNum.text(text).show();
    } else {
      redNum.hide();
    }
    this.updateTitleNode();
  }

  updateTitleNode(count = this.msgAlertCount) {
    if (count) {
      const text = count.toLocaleString();
      this.titleNode.html(`[${text} 条新消息!] ${this.title} - MC 百科`);
    } else {
      this.titleNode.html(this.title + " - MC 百科");
    }
  }

  private onEditorSetup() {
    if (!editor._setup_old) {
      editor._setup_old = editor._setup;
      editor._setup = (a: any) => {
        editor._setup_old(a);
        new EditorInit(this).run();
      };
    }
  }

  editorLoad() {
    new GeneralEditInit(this).run();
    if (!$("#editor-frame").length) return;
    if (typeof editor === "undefined") {
      const editorObserver = new MutationObserver((mutationList) => {
        for (const mutation of mutationList) {
          if ((mutation.target as Element).id === "editor-frame" && mutation.removedNodes.length) {
            this.onEditorSetup();
          }
        }
      });
      editorObserver.observe($("#editor-frame").get(0), { childList: true });
    } else {
      this.onEditorSetup();
    }
  }

  static readonly ID_SPLASH_COMPARE = "mcmodder-splash-compare";
  static readonly URL_PUBLIC_SPLASH_LIST =
    "https://github.com/Charcoal-Black/Mcmodder/blob/master/splashes.json";
  static readonly URL_PUBLIC_SPLASH_LIST_RAW =
    "https://raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static readonly URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW =
    "https://hub.gitmirror.com/raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static readonly URL_JSON_POST = "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=1281";

  updateScreenAttachedFrame(node: HTMLElement) {
    const parent = node.parentElement;
    if (!parent) return;
    this.screenAttachedFrame = this.screenAttachedFrame.filter((e) => e.node != node);
    this.screenAttachedFrame.push({
      node: node,
      parentPosY: Utils.getAbsolutePos(parent).y,
      parentHeight: parent.getBoundingClientRect().height,
    });
    // this.screenAttachedFrame = $(".mcmodder-screenattached");
  }

  /**
   * 切换当前账号，即改写标识登录状态的 `_uuid` cookie
   *
   * `_uuid` 为 HttpOnly cookie，只能通过油猴的 `GM_cookie` 接口改写
   *
   * @returns 是否切换成功，失败时已向用户提示
   */
  async switchProfile(uid: number): Promise<boolean> {
    const profile = uid ? this.configRepository.getAllProfile(uid) : undefined;
    const success = profile
      ? await Utils.setUuidCookie(profile.uuid, profile.expirationDate)
      : await Utils.deleteUuidCookie();
    if (!success) {
      Utils.commonMsg(
        "切换账号失败：无法改写 `_uuid` cookie。该 cookie 为 HttpOnly cookie，需要油猴测试版 (Tampermonkey beta) 并在设置中允许脚本访问 HttpOnly cookie ~",
        false,
      );
      return false;
    }
    this.currentUsername = profile ? profile.nickname : "";
    this.currentUID = uid;
    return true;
  }

  private profileSelectorContainer = $("<div>");
  private profileSelector?: InstanceType<typeof ProfileSelector>;

  fireProfileSelectFrame() {
    swal.fire({
      title: "切换当前账号",
      html: `<div class="profile-option-container"></div>`,
      showConfirmButton: false,
    });
    if (!this.profileSelector) {
      this.profileSelector = createApp(ProfileSelector, {
        parent: this,
      }).mount(this.profileSelectorContainer.get(0)) as InstanceType<typeof ProfileSelector>;
    }
    this.profileSelectorContainer.appendTo(".profile-option-container");
  }

  updateSplashListData() {
    const splashes_old: string[] = GM_getValue("mcmodderSplashList").split("\n");
    const splashes: string[] = [],
      count: [string, number][] = [];
    let flag: boolean;
    splashes_old.pop();
    for (let i = 1; i < splashes_old.length; i++) {
      flag = true;
      count.forEach((e, f) => {
        if (e[0] === splashes_old[i]) {
          flag = false;
          count[f][1]++;
        }
      });
      if (flag) count.push([splashes_old[i], 1]);
    }
    count.forEach((e) => splashes.push(`0,${e[0]},${e[1]}`));
    GM_setValue("mcmodderSplashList_v2", splashes.join("\n"));
    GM_setValue("mcmodderSplashList", "");
  }

  applyCustomFont(font: number) {
    switch (font) {
      case 1: {
        Utils.addStyle(`* {font-family: ${Values.assets.font.fontFamily[font]};}`);
        break;
      }
      case 2:
      case 3: {
        $(`
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${Values.assets.font.link[font]}" rel="stylesheet">
        `).appendTo("head");
        Utils.addStyle(`* {font-family: ${Values.assets.font.fontFamily[font]};}`);
        break;
      }
    }
  }

  async trackSplash() {
    const win =
      typeof (globalThis as any).unsafeWindow !== "undefined"
        ? (globalThis as any).unsafeWindow
        : window;
    if ((win as any).__mcmodder_splash_tracked__) return;
    if ((win as any).__mcmodder_custom_splash__) {
      (win as any).__mcmodder_splash_tracked__ = true;
      return;
    }

    let splashText = (win as any).__mcmodder_orig_splash__ || "";
    if (!splashText) {
      if (this.href === `${this.hostname}/`) splashText = $(".ooops .text").first().text();
      else if (this.href === `${this.hostname}/v4/`) splashText = $(".splash span").first().text();
    }
    if (!splashText) return;

    (win as any).__mcmodder_splash_tracked__ = true;
    splashText = splashText.replace(this.currentUsername || "百科酱", "%s");
    const splashes: string[] = GM_getValue("mcmodderSplashList_v2")?.split("\n") || [];
    let flag = 0,
      index = -1;
    splashes.forEach((e, i) => {
      const d = e.split(",");
      if (d[1] === splashText) {
        flag = Number(d[2]) + 1;
        d[2] = flag.toString();
        index = i;
      }
    });
    if (!flag) splashes.push(`${Date.now()},${splashText},1`);
    else splashes[index] = splashes[index].slice(0, splashes[index].lastIndexOf(",") + 1) + flag;
    GM_setValue("mcmodderSplashList_v2", splashes.join("\n"));
    if (flag)
      Utils.commonMsg(`该标语在本地累计已出现 ${flag.toLocaleString()} 次~ 内容为: ${splashText}`);
    else Utils.commonMsg(`成功记录新的闪烁标语~ 内容为: ${splashText}`);

    if (this.configRepository.getSettings("supabaseSplash")) {
      if (!this.supabaseUtils.hasClient() || !this.currentUID) return;
      const resp = await this.supabaseUtils.invoke<SupabaseTrackSplashResponse>(
        "track_splash_v2",
        {
          body: {
            auth_key: this.configRepository.getProfile("auth_key"),
            splash_text: splashText,
          },
        },
        (errorMsg) => {
          if (this.isV4) Utils.commonMsg(errorMsg, false);
          else
            (swal as any)({
              type: "error",
              title: "遇到问题",
              text: errorMsg,
              buttons: false,
              timer: 3e3,
            });
        },
      );
      if (!resp) return;
      let msg: string;
      if (resp.count == 1) {
        msg = "此标语是首次收录！";
      } else {
        msg = `此标语已是第 ${resp.count.toLocaleString()} 次收录`;
        if (resp.last_visited_user_id) {
          const last = Date.parse(resp.last_visited_at);
          const time = Date.now() - last;
          const formattedTime = Utils.getFormattedTime(time);
          const username = resp.last_visited_user_name;
          const userID = resp.last_visited_user_id
            ? `用户 ${username} (UID:${resp.last_visited_user_id}) `
            : "未登录用户";
          msg += `，上一次由${userID}于 ${formattedTime} 前记录`;
        }
        msg += "~";
      }
      if (this.isV4) Utils.commonMsg(msg);
      else
        (swal as any)({
          type: "success",
          title: "标语已上传",
          text: msg,
          buttons: false,
          timer: 3e3,
        });
    }
  }

  tableFix() {
    $("table [align]")
      .each((_, c) => {
        $(c).css("text-align", $(c).attr("align"));
      })
      .removeAttr("align");
    $("table [valign]")
      .each((_, c) => {
        $(c).css("vertical-align", $(c).attr("valign"));
      })
      .removeAttr("valign");
    Utils.addStyle("th {text-align: center;}");
  }

  updateNightMode() {
    const icon = $("#mcmodder-night-switch i");
    if (this.configRepository.getSettings("nightMode")) {
      icon.removeClass("on");
      if ($("#item-cover-preview-img").first().attr("src") === Values.assets.mcmod.imagesNone) {
        $("#item-cover-preview-img").attr("src", Values.assets.nightMode.imagesNone);
      }
      this.echartsUtils.enableNightStyle();
      $("html").addClass("dark");
      this.ueditorFrame.forEach((e) => {
        e.$document?.find("html").addClass("dark");
      });
      this.elementColorDictionary.forEach((color, e) => {
        const darkenColor = this.elementColorCache.get(color);
        e.style.setProperty("color", darkenColor!);
      });
    } else {
      icon.addClass("on");
      if ($("#item-cover-preview-img").first().attr("src") === Values.assets.nightMode.imagesNone) {
        $("#item-cover-preview-img").attr("src", Values.assets.mcmod.imagesNone);
      }
      this.echartsUtils.disableNightStyle();
      $("html").removeClass("dark");
      this.ueditorFrame.forEach((e) => {
        e.$document?.find("html").removeClass("dark");
      });
      this.elementColorDictionary.forEach((_color, e) => {
        e.style.setProperty("color", this.elementColorDictionary.get(e)!);
      });
    }
  }

  updatePageWidth() {
    const icon = $("#mcmodder-pagewidth-switch i");
    if (this.configRepository.getSettings("preferredWiderScreen")) {
      this.preferredWiderScreen = true;
      Utils.addStyle(
        `.col-lg-12.mcmodder-class-page, .col-lg-12.common-center {width: 100%; margin: 0; margin-top: calc(6 * var(--mcmodder-width-padding-1));}`,
        "mcmodder-pagewidth-controller",
      );
      icon.attr("class", "fa fa-compress");
    } else {
      this.preferredWiderScreen = false;
      $("#mcmodder-pagewidth-controller").remove();
      icon.attr("class", "fa fa-expand");
    }
  }

  switchNightMode() {
    if (this.isNightMode) {
      this.configRepository.setSettings("nightMode", false);
    } else {
      this.configRepository.setSettings("nightMode", true);
    }
    this.isNightMode = !this.isNightMode;
  }

  copyright() {
    $(".copyleft")
      .last()
      .append(`<br>☆ MCMODDER v${Values.mcmodderVersion} ☆ ——MC百科编审辅助工具`);
    $(".sidebar-plan .space").last().append(`<br>mcmodder-v${Values.mcmodderVersion}`);
  }

  main() {
    if (this.configRepository.getSettings("forceV4") && this.href === `${this.hostname}/`) {
      window.location.href = `${this.hostname}/v4/`;
    }

    // v2.2- 自定义字体配置兼容
    const useNotoSans = this.configRepository.getSettings("useNotoSans");
    if (useNotoSans) {
      this.configRepository.deleteSettings("useNotoSans");
      this.configRepository.setSettings("customFont", 2);
    }

    const customFont = this.configRepository.getSettings("customFont");
    if (customFont) {
      this.applyCustomFont(customFont);
    }

    // 关闭主页&整合包区广告
    $("span")
      .filter((_, e) => $(e).attr("style") === Values.adTitleCss)
      .html("<a>× 广告</a>")
      .find("a")
      .click((e) => {
        $(e.currentTarget).parent().parent().hide();
      });

    // 自定义物品类型
    this.itemTypeList = this.configRepository.getSettings("itemCustomTypeList") ?? [];
    if (typeof this.itemTypeList === "string") {
      this.configRepository.setSettings("itemCustomTypeList", Values.itemCustomTypeList);
      this.itemTypeList = Values.itemCustomTypeList;
    }
    this.itemTypeList = this.itemTypeList!.concat(Values.itemDefaultTypeList);

    // 闪烁标语追踪系统升级
    if (GM_getValue("mcmodderSplashList")) {
      this.updateSplashListData();
    }

    // 闪烁标语追踪器
    if (
      this.href === `${this.hostname}/` ||
      this.href === `${this.hostname}/v4/` ||
      this.href === "https://play.mcmod.cn/"
    ) {
      this.trackSplash();
      setTimeout(() => this.trackSplash(), 3e2);
    }

    // 后台抓取并更新云端自定义标语列表缓存
    if (
      this.configRepository.getSettings("useSupabase") &&
      this.configRepository.getSettings("fetchCustomSplashes")
    ) {
      this.supabaseUtils
        .fetchCustomSplashes()
        .then((list) => {
          if (list && Array.isArray(list)) {
            GM_setValue("mcmodderCustomSplashes", JSON.stringify(list));
          }
        })
        .catch(() => {});
    }
    if (
      this.configRepository.getSettings("splashStyle") === 1 &&
      (this.href === `${this.hostname}/` || this.href === `${this.hostname}/v4/`)
    ) {
      this.splash3D = new Splash3D(this);
      this.splash3D.init();
    }
    // 冻结进度
    if (this.configRepository.getSettings("freezeAdvancements")) {
      $(".common-task-tip").attr({
        id: "task-mcmodder-frozen",
        class: "mcmodder-task-tip",
      });
    }

    // 愚人节特性
    if (this.configRepository.getSettings("enableAprilFools")) {
      if (this.href.includes("/author/22957.html")) {
        $("div.author-user-avatar img").attr(
          "src",
          "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif",
        );
      }
    }

    // 表格修复
    if (this.configRepository.getSettings("tableFix")) {
      this.tableFix();
    }

    if (this.configRepository.getSettings("tableLeftAlign")) {
      // StyleLoader CSS
      const f = (e: Element) => {
        const c = $(e).next();
        if (c.attr("class") === "figcaption")
          c.css("width", e.getBoundingClientRect().width + "px");
      };
      $(".common-text .figure .lazy").each((_, _e) => {
        const e = _e as HTMLImageElement;
        if (e.complete) {
          f(e);
        } else {
          e.onload = () => f(e);
        }
      });
    } else Utils.addStyle(".common-text .figure {align-items: center;}");
    $(
      ".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a",
    ).addClass("mcmodder-content-block");
    $(".common-nav .line").html('<i class="fa fa-chevron-right" />');
    $(".oredict-ad, .worldgen-list-ad").remove();
    if (this.configRepository.getSettings("defaultBackground") != "none") {
      $("body")
        .filter((_, c) => $(c).css("background-image") === "none")
        .css({
          background: "var(--mcmodder-image-background)",
          "background-size": "cover",
        });
    }

    // 个人菜单
    if (/* this.configRepository.getSettings("mcmodderUI") */ true) {
      const insertPos = $(".header-user .header-layer-block:first-child()");
      if (insertPos.length) {
        const myProfile = this.configRepository.getAllProfile() as Partial<Profile>;
        const avatar = myProfile.avatar
          ? `<a href="//center.mcmod.cn/${this.currentUID}/" target="_blank">
            <img alt="${myProfile.nickname}" src="${myProfile.avatar}">
          </a>`
          : $(".header-user-avatar").html();
        const nickname = myProfile.nickname || $(".header-user-name").text();
        const lv = myProfile.lv
          ? `<span class="mcmodder-profile-lv common-user-lv lv-${myProfile.lv}">Lv.${myProfile.lv}</span>`
          : "";
        const myAvatar = $(
          `<div class="mcmodder-profile">${avatar}<p>${nickname} ${lv}</p></div>`,
        ).insertBefore(insertPos);

        // const hoverListener = $(".header-user-info.hover");
        // const cover = $(`<div class="header-panel-cover">`).insertBefore(myAvatar.parent());
        // cover.bind("pointerover", _e => {
        //   hoverListener.trigger("mouseout");
        // })

        const favUserOuterContainer = $(`
          <div class="mcmodder-favuser-outercontainer" />
        `).insertAfter(myAvatar);
        const favUserApp = createApp(FavUser, {
          parent: this,
        }).mount(favUserOuterContainer.get(0)) as InstanceType<typeof FavUser>;
        if (!favUserApp.isEmpty()) {
          $(".header-layer-block").addClass("with-favuser");
        }

        $(".header-user .header-layer-block li a").each((_, _c) => {
          const c = $(_c);
          const text = c.text();
          c.replaceWith(
            `<a${
              c.text() === "退出登录"
                ? ` id="common-logout-btn"`
                : ` href="${c.prop("href")}" target="_blank"`
            }><i class="${(Values.iconMap as any)[text]}"/><span>${text}</span><i class="fa fa-chevron-right" /></a>`,
          );
        });
      }
    }

    const textArea = $(".text-area.common-text, .item-content.common-text, .post-row");
    if (/* this.configRepository.getSettings("mcmodderUI") */ true) {
      // 去除正文异常背景
      if (!this.configRepository.getSettings("disableAutoStyleFix")) {
        textArea
          .find("*")
          .filter((_i, c) => $(c).css("background-color") === "rgb(255, 255, 255)")
          .css("background-color", "");
        textArea
          .find("span")
          .filter((_i, c) => $(c).css("color") === "rgb(0, 0, 0)")
          .css("color", "");
      }

      // Swiper 调整
      $(".swiper-container").each((_, _container) => {
        const container = $(_container);
        new Swiper(container);
      });
    }

    // 夜间模式正文颜色自动适配
    if (!this.configRepository.getSettings("disableAutoStyleFix")) {
      textArea.find("*").each((_, _e) => {
        const e = _e as HTMLElement;
        const css = (e as HTMLElement).style.getPropertyValue("color");
        if (css) {
          const color = Utils.parseRGB(css);
          if (!color) return;
          const colorStr = Utils.RGBToColor(color);
          const nightColorStr = Utils.reverseColorBrightness(color);
          this.elementColorDictionary.set(e, colorStr);
          this.elementColorCache.set(colorStr, nightColorStr);
        }
      });
    }

    if (this.configRepository.getSettings("adaptableNightMode")) {
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");
      this.configRepository.setSettings("nightMode", scheme.matches);
      scheme.addEventListener("change", () => {
        this.configRepository.setSettings("nightMode", scheme.matches);
      });
    } else this.isNightMode = this.configRepository.getSettings("nightMode") ?? false;

    this.updateNightMode();
    this.updatePageWidth();

    if (!this.configRepository.getSettings("adaptableNightMode")) {
      $(
        '<button id="mcmodder-night-switch" data-toggle="tooltip" data-original-title="夜间模式"><i class="fa fa-lightbulb-o"></i></button>',
      )
        .appendTo(".header-container .header-search, .top-right")
        .click(() => this.switchNightMode());
    }

    $(`<button id="mcmodder-profile-switch" data-toggle="tooltip" data-original-title="切换账号 (按住 Shift 快捷切换)">
      <i class="fa fa-low-vision"></i>
    </button>`)
      .appendTo(".header-container .header-search")
      .click(async (e) => {
        if (Utils.isKeyMatch({ shiftKey: true }, e)) {
          // 按住 Shift 以快捷切换至上一个状态
          const currentUID = this.currentUID;
          const lastUID = this.configRepository.getSettings("lastUid") ?? 0;
          if (!(await this.switchProfile(lastUID))) return;
          Utils.commonMsg("已快捷切换至" + (lastUID ? ` UID:${lastUID} ` : "未登录状态") + " ~");
          this.configRepository.setSettings("lastUid", currentUID);
          return;
        }
        this.fireProfileSelectFrame();
      });

    this.preferredWiderScreen = this.configRepository.getSettings("preferredWiderScreen") ?? false;
    $(`<button id="mcmodder-pagewidth-switch" data-toggle="tooltip" data-original-title="宽窄屏切换">
      <i class="fa fa-${this.preferredWiderScreen ? "compress" : "expand"}"></i>
    </button>`)
      .appendTo(".header-container .header-search")
      .click(() => {
        this.configRepository.setSettings("preferredWiderScreen", !this.preferredWiderScreen);
      });

    if (this.currentUID /* && this.configRepository.getSettings("mcmodderUI") */) {
      $(
        '<button id="mcmodder-message-center" data-toggle="tooltip" data-original-title="消息中心"><i class="fa fa-bell-o"></i></button>',
      )
        .appendTo(".header-container .header-search")
        .click(() => {
          GM_openInTab(`${this.hostname}/message/`, { active: true });
          this.notifyUnreadMessage(0);
        });
    }

    const msgAlert = Number($(".header-user-msg b").text());
    if (/* this.configRepository.getSettings("mcmodderUI") */ true) {
      $(".header-user-msg").remove();
      $(`<div class="mcmodder-rednum">`).appendTo("#mcmodder-message-center");
      this.notifyUnreadMessage(msgAlert);
    }

    if (typeof editor != "undefined") this.callEditor();
    else
      this.generalEditorObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

    // TODO: 取消锁定导航栏

    if (this.isV4 /* && this.configRepository.getSettings("mcmodderUI") */) {
      window.addEventListener(
        "scroll",
        Utils.animationThrottle(() => {
          // 个人目录不会超出屏幕右边界
          const header = $(".header-user").get(0).getBoundingClientRect();
          const menuWidth = 400;
          if (
            header.x + header.width / 2 + menuWidth / 2 >=
            window.innerWidth - Values.headerContainerHeight
          ) {
            $(".header-panel").addClass("mcmodder-header-panel-fixed");
          } else {
            $(".header-panel").removeClass("mcmodder-header-panel-fixed");
          }
        }),
        {
          passive: true,
        },
      );
      window.dispatchEvent(new Event("resize"));
    }

    if (this.isV4 && this.configRepository.getSettings("customAdvancements")) {
      // 更新自定义成就
      const completed = this.configRepository.getProfile("completed");
      if (completed) {
        completed.split(",")?.forEach((sid) => {
          const id = Number(sid);
          const data = this.advutils.getData(id);
          Utils.showTaskTip(
            data.image || "",
            PublicLangData.center.task.list[data.lang].title,
            PublicLangData.center.task.list[data.lang].content,
            "",
            data.range,
            "",
          );
          // playSound();
        });
      }
      this.configRepository.setProfile("completed", "");
    }

    // 实时通讯
    const autoNotifyDelay = this.configRepository.getSettings("alwaysNotify");
    if (
      !window.location.href.includes("https://admin.mcmod.cn/") &&
      typeof fuc_topmenu_sync != "undefined" &&
      autoNotifyDelay &&
      autoNotifyDelay >= 0.1
    )
      setInterval(
        () => {
          this.utils
            .createRequest({
              url: `${this.hostname}/frame/CommonHeader/`,
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                Origin: this.hostname,
                Referer: window.location.href,
                Priority: "u=0",
                Pragma: "no-cache",
                "Cache-Control": "no-cache",
              },
              data: "version=4.0",
            })
            .then((resp) => {
              try {
                const data = JSON.parse(resp.responseText);
                if (data.state || !data.user.login || !data.user.msg_count) {
                  this.notifyUnreadMessage(0);
                } else {
                  this.notifyUnreadMessage(data.user.msg_count);
                }
              } catch (e) {
                if (e instanceof SyntaxError) {
                  console.error("Failed to parse data: " + resp.responseText);
                }
              }
            });
        },
        Math.max(autoNotifyDelay * 1e3 * 60, 6e3),
      );

    this.initList.filter((init) => init.canRun()).forEach((init) => init.run());

    const areaLeft = $(".left");
    const areaRight = $(".class-info-right");
    if (areaLeft.length && areaRight.length) {
      setTimeout(() => {
        const heightLeft = areaLeft.get(0).getBoundingClientRect().height;
        const heightRight = areaRight.get(0).getBoundingClientRect().height;
        $(".col-lg-12.right").css("min-height", `${Math.max(heightLeft, heightRight)}px`);
      }, 1e3);
    }

    if (
      this.href.startsWith(this.hostname) &&
      !this.href.includes("tools/cbcreator") &&
      this.configRepository.getSettings("enableLive2D")
    ) {
      const waifuFrame = $(`<div class="waifu">
        <div class="waifu-tips" style="opacity: 0;"></div>
        <canvas id="live2d" width="220" height="260" class="live2d"></canvas>
        <ul class="waifu-tool">
          <li name="menu" page="pageHome" class="active">
            <span data-original-title="返回主页" data-toggle="tooltip" class="fui-home"></span>
          </li>
          <li>
            <span data-original-title="赶走" data-toggle="tooltip" class="fui-cross"></span>
          </li>
        </ul>
      </div>`).prependTo("body");
      new DraggableFrame(waifuFrame);

      $(
        `<link rel="stylesheet" type="text/css" href="${this.hostname}/live2d/waifu.css">`,
      ).appendTo("head");

      $(`
        <script src="${this.hostname}/live2d/waifu-tips.js" />
        <script src="${this.hostname}/live2d/live2d.js" />
        <script type="text/javascript">initModel("${this.hostname}/live2d/")</script>
      `).appendTo("body");

      $(document).on("click", ".waifu-tool .fui-cross", () => {
        $.cookie("mcmodgirl_hide", null, { path: "/" });
        this.configRepository.setSettings("enableLive2D", false);
      });
      if (this.configRepository.getSettings("customAdvancements"))
        $(document).on("click", ".waifu", () => {
          this.advutils.addProgress(AdvancementID.CLICK_GIRL_100_TIMES);
        });
    }

    $(".common-background").remove();
    $("#key").css("color", "var(--mcmodder-color-text)");

    window.addEventListener(
      "scroll",
      Utils.throttle(() => {
        this.screenAttachedFrame.forEach((e) => {
          e.node.style.top =
            Math.max(0, window.scrollY - e.parentPosY + Values.headerContainerHeight) + "px";
        });
      }, 16),
      {
        passive: true,
      },
    );

    this.updateItemTooltip();
    document.addEventListener("pointerover", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement && target.classList.contains("tooltip"))) {
        return;
      }
      target.remove();
    });

    this.copyright();
    this.updateTitleNode();
  }
}
