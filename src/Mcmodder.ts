import { GM_getValue, GM_openInTab, GM_setValue } from "$";
import { AdvancementID, AdvancementUtils } from "./advancement/AdvancementUtils";
import { McmodderConfigUtils } from "./config/ConfigUtils";
import { DraggableFrame } from "./widget/draggable/DraggableFrame";
import { AdvancementLoader } from "./loader/AdvancementLoader";
import { ConfigLoader } from "./loader/ConfigLoader";
import { MemuCommandLoader } from "./loader/MenuCommandLoader";
import { ScheduleRequestLoader } from "./loader/ScheduleRequestLoader";
import { StorageBufferLoader } from "./loader/StorageBufferLoader";
import { StyleLoader } from "./loader/StyleLoader";
import { ItemCustomTypeList as ItemTypeList, McmodderProfileData } from "./types";
import { ScheduleRequestUtils } from "./schedulerequest/ScheduleRequestUtils";
import { StorageBuffer } from "./StorageBuffer";
import { McmodderTimer } from "./widget/Timer";
import { McmodderAdvancedUEditor } from "./ueditor/AdvancedUEditor";
import { McmodderUEditor } from "./ueditor/UEditor";
import { McmodderUtils, ThemeColorData } from "./Utils";
import { McmodderValues } from "./Values";
import { McmodderInit } from "./init/Init";
import { InitLoader } from "./loader/InitLoader";
import { GeneralEditInit } from "./init/GeneralEditInit";
import { EditorInit } from "./init/EditorInit";
import { McmodderSwiper } from "./widget/Swiper";

interface ScreenAttachedFrameData {
  node: HTMLElement,
  parentPosY: number,
  parentHeight: number;
}

export class Mcmodder {

  utils: McmodderUtils;
  currentUID: number;
  currentUsername: string;
  advutils: AdvancementUtils;
  scheduleRequestUtils: ScheduleRequestUtils;
  storageBuffer: StorageBuffer;
  initList: McmodderInit[] = [];
  isV4: boolean;
  isMac: boolean;
  href: string;
  ueditorFrame: McmodderUEditor[];
  screenAttachedFrame: ScreenAttachedFrameData[];
  cfgutils: McmodderConfigUtils;
  styleColors: ThemeColorData;
  preferredWiderScreen = false;
  isNightMode = false;
  title = "";
  classRatingChart?: any;
  centerEditChart?: any;
  css = "";
  itemTypeList?: ItemTypeList;
  private msgAlertCount = 0;
  private readonly titleNode = $("title");

  constructor() {
    this.isV4 = typeof fuc_topmenu_v4 === "function";
    this.isMac = McmodderUtils.isMac();
    this.currentUsername = ($(".header-user-name").get(0)?.childNodes[0] as HTMLElement)?.innerHTML || "";
    this.currentUID = Number($(".header-user-name a, .name.top-username a, .profilebox").first().attr("href")?.split("//center.mcmod.cn/")[1]?.split("/")[0]) || 0;
    this.ueditorFrame = [];
    this.href = window.location.href;
    MemuCommandLoader.run();
    this.title = this.titleNode.html().replace(" - MC百科|最大的Minecraft中文MOD百科", "");

    // Echarts 图表相关兼容
    if (typeof echarts != "undefined") {
      let t = document.getElementById("class-rating");
      if (t) this.classRatingChart = echarts.getInstanceById(t.getAttribute("_echarts_instance_"));
      t = document.getElementById("center-editchart-obj");
      if (t) this.centerEditChart = echarts.getInstanceById(t.getAttribute("_echarts_instance_"));
    }

    this.screenAttachedFrame = [];
    
    this.storageBuffer = new StorageBuffer(this);
    StorageBufferLoader.run(this.storageBuffer);

    this.utils = new McmodderUtils(this);

    this.cfgutils = new McmodderConfigUtils(this);
    ConfigLoader.run(this.cfgutils);
    this.styleColors = McmodderUtils.getThemeColors(this.utils);

    this.advutils = new AdvancementUtils(this);
    AdvancementLoader.run(this.advutils);

    this.scheduleRequestUtils = new ScheduleRequestUtils(this);
    ScheduleRequestLoader.run(this.scheduleRequestUtils);

    InitLoader.run(this, this.initList);
    
    StyleLoader.run(this);

    this.main();
  }

  private callEditor() {
    if ($(".edit-tools").length || $(".post-row").length) {
      setTimeout(() => new McmodderAdvancedUEditor(editor, this), 3e2);
    } else {
      setTimeout(() => new McmodderUEditor(editor, this), 3e2);
    }
  }

  private readonly generalEditorObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if ((mutation.target as HTMLElement).id === "edui1_iframeholder" && mutation.addedNodes.length) {
        this.callEditor();
      }
    }
  });

  updateItemTooltip() { // 鼠标悬浮预览介绍
    if (this.utils.getConfig("hoverDescription")) {
      $(".common-imglist li, .item-list-type-right span, .relation a").off();
      $("a").filter((_, e) => {
        const href = (e as HTMLLinkElement).href;
        return /\/\/www.mcmod.cn\/item\/[0-9]*\.html/.test(href) || /\/\/www.mcmod.cn\/class\/[0-9]*\.html/.test(href);
      }).filter((_, _c) => {
        const c = $(_c);
        if (Array.from(c.parent().prop("classList")).includes("item-table-hover")) return false;
        return true;
      }).addClass("mcmodder-item-link").removeAttr("title");
      $(".modlist-block .title a").removeClass("mcmodder-item-link");
      $(".mcmodder-item-link").each((_, e) => {
        const href = (e as HTMLLinkElement).href;
        $(e).attr({
          "data-source-id": href.split("mcmod.cn/")[1],
          "data-toggle": "tooltip",
          "data-html": "true",
          "data-original-title": `<div class="mcmodder-data-frame maintext" data-source-id="${href.split("mcmod.cn/")[1]}">
            <div class="mcmodder-loading"></div>
          </div>`
        });
      });
      $(document).on("mouseover", ".mcmodder-item-link", async e => {
        let c = e.currentTarget as HTMLLinkElement;
        await McmodderUtils.sleep(1e3);
        let f = $(`.mcmodder-data-frame[data-source-id="${$(c).attr("data-source-id")}"]`);
        if (!$(c).attr("aria-describedby")) return;
        if (f.attr("data-status")) return;
        f.attr("data-status", "pending");
        let resp = await this.utils.createAsyncRequest({
          url: c.href,
          method: "GET",
          anonymous: true
        });
        if (!resp.responseXML) return;
        if (f.attr("data-status") === "fulfilled") return;
        f.attr("data-status", "fulfilled");
        let d = $(resp.responseXML);
        d.find(".itemname > .tool").remove();
        d.find(".quote_text legend a").last().remove();
        f.html(d.find(".item-content, .class-menu-main .text-area.font14").first().html());
        if (f.text() === "暂无简介，欢迎协助完善。") f.html('<span class="mcmodder-common-danger">该资料正文暂无介绍...</span>');
        if ($(c).attr("data-source-id").includes("item/")) d.find(".itemname").first().insertBefore(f.children().first()).find("h5").each((_, h5) => {
          let l = d.find("meta[name=keywords]").attr("content").split(","), s = h5.textContent;
          if (l[1]) s = ("<a>" + s).replace(` (${l[1]})`, `</a> <span class="item-h5-ename"><a>${l[1]}</a></span>`);
          else s = `<a>${ s }</a>`;
          h5.innerHTML = s;
        });
        else if ($(c).attr("data-source-id").includes("class/")) d.find(".class-title").first().insertBefore(f.children().first());
        let g = d.find(".item-data .item-info-table").first().removeClass("righttable").insertBefore(f);
        let showImg = (c: Element) => c.outerHTML = c.outerHTML.replaceAll("data-src=", "src=");
        g.find("img").each((_, c) => {
          showImg(c);
        });
        if (this.utils.getConfig("hoverImage")) {
          f.find("img").each((_, c) => {
            showImg(c);
            $(c).attr("src", $(c).attr("data-src"));
          });
        }
        g.find("tr").last().remove();
        $(c).attr("data-original-title", f.parent().html());
      });
    }
    McmodderUtils.updateAllTooltip();
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
      this.titleNode.html(`[${ text } 条新消息!] ${ this.title } - MC 百科`);
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
      }
    }
  }

  editorLoad() {
    new GeneralEditInit(this).run();
    if (!$("#editor-frame").length) return;
    if (typeof editor === "undefined") {
      const editorObserver = new MutationObserver(mutationList => {
        for (let mutation of mutationList) {
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
  static readonly URL_PUBLIC_SPLASH_LIST = "https://github.com/Charcoal-Black/Mcmodder/blob/master/splashes.json";
  static readonly URL_PUBLIC_SPLASH_LIST_RAW = "https://raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static readonly URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW = "https://hub.gitmirror.com/raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static readonly URL_JSON_POST = "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=1281";

  updateScreenAttachedFrame(node: HTMLElement) {
    const parent = node.parentElement;
    if (!parent) return;
    this.screenAttachedFrame = this.screenAttachedFrame.filter(e => e.node != node);
    this.screenAttachedFrame.push({
      node: node,
      parentPosY: McmodderUtils.getAbsolutePos(parent).y,
      parentHeight: parent.getBoundingClientRect().height
    });
    // this.screenAttachedFrame = $(".mcmodder-screenattached");
  }

  switchProfile(uid: number) {
    if (uid) {
      const profile = this.utils.getProfile("*", uid);
      $.cookie("_uuid", profile.uuid, { domain: ".mcmod.cn", path: "/", expires: new Date(profile.expirationDate) });
      this.currentUsername = profile.nickname;
    } else {
      $.cookie("_uuid", null, { domain: ".mcmod.cn", path: "/" });
      this.currentUsername = "";
    }
    this.currentUID = uid;
  }

  fireProfileSelectFrame() {
    const html = $('<div><p>登录过的用户至少需要在本机访问自己的个人主页一次才会在这里显示~</p><div id="mcmodder-profile-frame"><ul></ul></div></div>');
    const ul = html.find("ul");
    const myProfiles = this.utils.getConfigAsNumberList("myProfiles");
    let uuid = $.cookie("_uuid");
    let h = $(`<li><div class="profile-option empty-profile" uid="0">-- 未登录状态 --</div></li>`).appendTo(ul);
    if (!uuid) h.addClass("profile-selected");
    myProfiles.forEach(uid => {
      if (!uid) return;
      const profile = this.utils.getProfile("*", uid);
      h = $(`<li><div class="profile-option" uid="${uid}">
        <div class="avatar">
          <img src="${profile.avatar}">
        </div>
        <div class="info">
          <div class="title">
            <span class="uid mcmodder-slim-dark">[UID:${uid}]</span>
            <span class="username mcmodder-subtitle">${profile.username + (profile.nickname ? ` (${profile.nickname})` : "")}</span>
            <span class="lv">
              <a class="common-user-lv lv-${profile.lv}">Lv.${profile.lv || "null"}</a>
            </span>
          </div>
          <div class="text">
            ${ this.utils.getProfileAbstract(profile) }
            <a class="delete">
              <i class="fa fa-trash"></i>
            </a>
          </div>
        </div>
      </li>`).appendTo(ul);
      (new McmodderTimer(this, McmodderTimer.DATAGETTER_CONSTANT(profile.expirationDate))).$instance.appendTo(h.find(".mcmodder-timer-pre"));
      if (profile.uuid === uuid) h.addClass("profile-selected");
    });
    swal.fire({
      title: "切换当前账号",
      html: `<div class="profile-option-container"></div>`,
      showConfirmButton: false
    });
    html.appendTo(".profile-option-container");
    $(".profile-option").click(f => {
      let uid = Number(f.currentTarget.getAttribute("uid"));
      if (f.target.className === "delete" || (f.target.parentNode as HTMLElement)?.className === "delete") {
        this.utils.setConfig(uid, null, "userProfile");
        $("#mcmodder-profile-switch").click();
        return;
      }
      this.switchProfile(uid);
      $(".profile-selected").removeClass("profile-selected");
      f.currentTarget.classList.add("profile-selected");
    });
  }

  updateSplashListData() {
    const splashes_old: string[] = GM_getValue("mcmodderSplashList").split("\n");
    let splashes: string[] = [], count: [string, number][] = [], flag: boolean;
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
    count.forEach(e => splashes.push(`0,${ e[0] },${ e[1] }`));
    GM_setValue("mcmodderSplashList_v2", splashes.join("\n"));
    GM_setValue("mcmodderSplashList", "");
  }

  applyCustomFont() {
    $('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&amp;display=swap" rel="stylesheet">').appendTo("head");
    McmodderUtils.addStyle('* {font-family: "Noto Sans SC", "Microsoft YaHei", "微软雅黑", "宋体", sans-serif}');
  }

  trackSplash() {
    let splashText = "";
    if (this.href === "https://www.mcmod.cn/") splashText = $(".ooops .text").first().text();
    else if (this.href === "https://www.mcmod.cn/v4/") splashText = $(".splash span").first().text();
    splashText = splashText.replace(this.currentUsername || "百科酱", "%s");
    let splashes: string[] = GM_getValue("mcmodderSplashList_v2")?.split("\n") || [], flag = 0, index = -1;
    splashes.forEach((e, i) => {
      let d = e.split(",");
      if (d[1] === splashText) {
        flag = Number(d[2]) + 1;
        d[2] = flag.toString();
        index = i;
      }
    });
    if (!flag) splashes.push(`${Date.now()},${splashText},1`);
    else splashes[index] = splashes[index].slice(0, splashes[index].lastIndexOf(",") + 1) + flag;
    GM_setValue("mcmodderSplashList_v2", splashes.join("\n"));
    if (flag) McmodderUtils.commonMsg(`该标语累计已出现 ${flag.toLocaleString()} 次~ 内容为: ${splashText}`);
    else McmodderUtils.commonMsg(`成功记录新的闪烁标语~ 内容为: ${splashText}`);
  }

  tableFix() {
    $("table [align]").each((_, c) => {
      $(c).css("text-align", $(c).attr("align"))
    }).removeAttr("align");
    $("table [valign]").each((_, c) => {
      $(c).css("vertical-align", $(c).attr("valign"));
    }).removeAttr("valign");
    McmodderUtils.addStyle("th {text-align: center;}");
  }

  updateNightMode() {
    const icon = $("#mcmodder-night-switch i");
    if (this.utils.getConfig("nightMode")) {
      icon.removeClass("on");
      if ($("#item-cover-preview-img").first().attr("src") === McmodderValues.assets.mcmod.imagesNone) {
        $("#item-cover-preview-img").attr("src", McmodderValues.assets.nightMode.imagesNone);
      }
      let o = this.classRatingChart?.getOption();
      if (o) {
        o.backgroundColor = "#1118";
        // o.axisPointer[0].lineStyle.color = "#444";
        o.radar[0].splitLine.lineStyle.color = "#1f190e";
        o.series[0].color = "#ee6";
        o.series[0].data[0].areaStyle.color = "rgba(255, 255, 255, 0.5)";
        this.classRatingChart.setOption(o);
      }
      o = this.centerEditChart?.getOption();
      if (o) {
        o.tooltip[0].backgroundColor = "#222";
        o.calendar[0].dayLabel.color = "#fff";
        o.calendar[0].yearLabel.color = "#ee6";
        o.calendar[0].monthLabel.color = "#fff";
        o.calendar[0].itemStyle = {
          color: "#3330",
          borderColor: "#444"
        };
        this.centerEditChart.setOption(o);
      }
      $("html").addClass("dark");
      this.ueditorFrame.forEach(e => {
        e.$document?.find("html").addClass("dark");
      });
    }
    else {
      icon.addClass("on");
      if ($("#item-cover-preview-img").first().attr("src") === McmodderValues.assets.nightMode.imagesNone) {
        $("#item-cover-preview-img").attr("src", McmodderValues.assets.mcmod.imagesNone);
      }
      let o = this.classRatingChart?.getOption();
      if (o) {
        o.backgroundColor = "#fff8";
        // o.axisPointer[0].lineStyle.color = "#B9BEC9";
        o.radar[0].splitLine.lineStyle.color = "#E0E6F1";
        o.series[0].color = "#555";
        o.series[0].data[0].areaStyle.color = "rgba(0, 0, 0, 0.25)";
        this.classRatingChart.setOption(o);
      }
      o = this.centerEditChart?.getOption();
      if (o) {
        o.tooltip[0].backgroundColor = "#fff";
        o.calendar[0].dayLabel.color = "#000";
        o.calendar[0].yearLabel.color = "#aaa";
        o.calendar[0].monthLabel.color = "#000";
        o.calendar[0].itemStyle = {
          color: "#fff0",
          borderColor: "#bbb"
        };
        this.centerEditChart.setOption(o);
      }
      $("html").removeClass("dark");
      this.ueditorFrame.forEach(e => {
        e.$document?.find("html").removeClass("dark");
      });
    }
  }

  updatePageWidth() {
    const icon = $("#mcmodder-pagewidth-switch i");
    if (this.utils.getConfig("preferredWiderScreen")) {
      this.preferredWiderScreen = true;
      McmodderUtils.addStyle(`.col-lg-12.mcmodder-class-page, .col-lg-12.common-center {width: 100%; margin: 0; margin-top: 6em;}`, "mcmodder-pagewidth-controller");
      icon.attr("class", "fa fa-compress");
    } else {
      this.preferredWiderScreen = false;
      $("#mcmodder-pagewidth-controller").remove();
      icon.attr("class", "fa fa-expand");
    }
  }

  switchNightMode() {
    if (this.isNightMode) {
      this.utils.setConfig("nightMode", false);
    } else {
      this.utils.setConfig("nightMode", true);
    }
    this.isNightMode = !this.isNightMode;
  }

  copyright() {
    $(".copyleft").last().append(`<br>☆ MCMODDER v${McmodderValues.mcmodderVersion} ☆ ——MC百科编审辅助工具`);
    $(".sidebar-plan .space").last().append(`<br>mcmodder-v${McmodderValues.mcmodderVersion}`);
  }

  main() {
    if (this.utils.getConfig("forceV4") && (this.href === "https://www.mcmod.cn/")) {
      window.location.href = "https://www.mcmod.cn/v4/";
    }
    if (this.utils.getConfig("useNotoSans")) {
      this.applyCustomFont();
    }

    // 关闭主页&整合包区广告
    $("span")
    .filter((_, e) => $(e).attr("style") === "position: absolute;color: #555;border-radius: 5px;border: 1px solid #555;font-size: 12px;padding: 0 2px;left:5px;top:5px;bottom:auto;right:auto;background:RGBA(255,255,255,.45);")
    .html('<a>× 广告</a>').find("a").click(e => {
      $(e.currentTarget).parent().parent().hide();
    });

    // 自定义物品类型
    this.itemTypeList = this.utils.getConfig("itemCustomTypeList") || [];
    if (typeof this.itemTypeList === "string") {
      this.utils.setConfig("itemCustomTypeList", McmodderValues.itemCustomTypeList);
      this.itemTypeList = McmodderValues.itemCustomTypeList;
    }
    this.itemTypeList = this.itemTypeList!.concat(McmodderValues.itemDefaultTypeList);

    // 闪烁标语追踪系统升级
    if (GM_getValue("mcmodderSplashList")) {
      this.updateSplashListData();
    }

    // 闪烁标语追踪器
    if (this.utils.getConfig("enableSplashTracker") &&
      (this.href === "https://www.mcmod.cn/" ||
        this.href === "https://www.mcmod.cn/v4/") ||
      this.href === "https://play.mcmod.cn/") {
      setTimeout(() => this.trackSplash(), 3e2);
    }

    // 冻结进度
    if (this.utils.getConfig("freezeAdvancements")) {
      $(".common-task-tip").attr({
        "id": "task-mcmodder-frozen",
        "class": "mcmodder-task-tip"
      });
    }

    // 愚人节特性
    if (this.utils.getConfig("enableAprilFools")) {
      if (this.href.includes("/author/22957.html")) {
        $("div.author-user-avatar img").attr("src", "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif");
      }
    }

    // 表格修复
    if (this.utils.getConfig("tableFix")) {
      this.tableFix();
    }

    if (this.utils.getConfig("tableLeftAlign")) {
      // StyleLoader CSS
      let f = (e: Element) => {
        let c = $(e).next();
        if (c.attr("class") === "figcaption") c.css("width", e.getBoundingClientRect().width + "px");
      };
      $(".common-text .figure .lazy").each((_, e) => f(e));
      $(document).on("load", ".common-text .figure .lazy", e => f(e.currentTarget));
    }
    else McmodderUtils.addStyle('.common-text .figure {align-items: center;}');
    $(".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a").addClass("mcmodder-content-block");
    $(".common-nav .line").html('<i class="fa fa-chevron-right" />');
    $(".oredict-ad, .worldgen-list-ad").remove();
    if (this.utils.getConfig("defaultBackground") != "none") $("body").filter((_, c) => $(c).css("background-image") === "none").css({ "background": `url(${this.utils.getConfig("defaultBackground") || "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg"}) fixed`, "background-size": "cover" });

    // 个人菜单
    if (this.utils.getConfig("mcmodderUI")) {
      const myProfile = this.utils.getAllProfile() as Partial<McmodderProfileData>;
      const avatar = myProfile.avatar ?
        `<a href="//center.mcmod.cn/${ this.currentUID }/" target="_blank">
          <img alt="${ myProfile.nickname }" src="${ myProfile.avatar }">
        </a>` : $(".header-user-avatar").html();
      const nickname = myProfile.nickname || $(".header-user-name").text();
      const lv = myProfile.lv ? `<span class="mcmodder-profile-lv common-user-lv lv-${ myProfile.lv }">Lv.${ myProfile.lv }</span>` : "";
      const myAvatar = $(`<div class="mcmodder-profile">${ avatar }<p>${ nickname } ${ lv }</p></div>`)
      .insertBefore(".header-user .header-layer-block:first-child()");

      const userFavList = this.utils.getConfigAsNumberList("userFavList").filter(e => e);
      const myProfileList = this.utils.getConfigAsNumberList("myProfiles");
      const recentlyVisited = this.utils.getConfigAsNumberList("recentlyVisited").filter(e => e && !userFavList.includes(e) && !myProfileList.includes(e));

      let userList;
      if (recentlyVisited.length) {
        // 其实可以预处理把这一步的时间复杂度砍成常数的，但是感觉意义不大
        const userRecentMap: Map<number, number> = new Map;
        recentlyVisited.forEach(id => {
          const count = userRecentMap.get(id);
          userRecentMap.set(id, count ? count + 1 : 1);
        });
        const userRecentCountList: {id: number, count: number}[] = [];
        userRecentMap.forEach((count, id) => {
          userRecentCountList.push({ id: id, count: count });
        });
        const userRecentList = userRecentCountList.sort((a, b) => b.count - a.count).map(e => e.id);
        userList = userFavList.concat(userRecentList);
      }
      else userList = userFavList;
      userList = userList.filter(e => !myProfileList.includes(e));

      if (userList.length) {
        $(".header-layer-block").addClass("with-favuser");
        const favUserOuterContainer = $(`<div class="mcmodder-favuser"><div class="title">最近串门</div><div class="mcmodder-favuser-container"><div class="content"></div></div></div>`).insertAfter(myAvatar);
        const favUserContainer = favUserOuterContainer.find(".mcmodder-favuser-container");
        const favUserContent = favUserContainer.find(".content");
        userList.forEach(uid => {
          const profile: McmodderProfileData = this.utils.getAllProfile(uid);
          const node = $(`<a class="user" title="${ profile.nickname } · ${ this.utils.getProfileAbstract(profile, true) }" target="_blank" href="https://center.mcmod.cn/${ uid }/">
            <div class="avatar">
              <img alt="${ profile.nickname }" src="${ profile.avatar }">
            </div>
            <div class="nickname">${ profile.nickname }</div>
          </a>`).appendTo(favUserContent);
          if (userFavList.includes(uid)) node.addClass("user-fav");
          else node.addClass("user-recent");
        });

        const className = ["star", "pin", "heart"][this.utils.getConfig("favUserDisplayStyle") || 0];
        favUserOuterContainer.addClass(className);
      }
      
      $(".header-user .header-layer-block li a").each((_, _c) => {
        const c = $(_c);
        const text = c.text();
        c.replaceWith(`<a${c.text() === "退出登录" ? 
        ` id="common-logout-btn"` : 
        ` href="${
          c.prop("href")
        }" target="_blank"`}><i class="${
          (McmodderValues.iconMap as any)[text]
        }"/><span>${
          text
        }</span><i class="fa fa-chevron-right" /></a>`);
      });
    }

    if (this.utils.getConfig("mcmodderUI")) {
      // 去除正文异常背景
      let textArea = $(".text-area.common-text, .item-content.common-text, .post-row");
      textArea.find("*").filter((_i, c) => $(c).css("background-color") === "rgb(255, 255, 255)").css("background-color", "unset");
      textArea.find("span").filter((_i, c) => $(c).css("color") === "rgb(0, 0, 0)").css("color", "unset");

      // Swiper 调整
      $(".swiper-container").each((_, _container) => {
        const container = $(_container);
        new McmodderSwiper(container);
      });
    }

    if (this.utils.getConfig("adaptableNightMode")) {
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");
      this.utils.setConfig("nightMode", scheme.matches);
      scheme.addEventListener("change", _ => {
        this.utils.setConfig("nightMode", scheme.matches);
      });
    }
    else this.isNightMode = this.utils.getConfig("nightMode");

    this.updateNightMode();
    this.updatePageWidth();

    if (!this.utils.getConfig("adaptableNightMode")) {
      $('<button id="mcmodder-night-switch" data-toggle="tooltip" data-original-title="夜间模式"><i class="fa fa-lightbulb-o"></i></button>')
      .appendTo(".header-container .header-search, .top-right")
      .click(() => this.switchNightMode());
    }

    $(`<button id="mcmodder-profile-switch" data-toggle="tooltip" data-original-title="切换账号 (按住 Shift 快捷切换)">
      <i class="fa fa-low-vision"></i>
    </button>`)
      .appendTo(".header-container .header-search")
      .click(e => {
        if (McmodderUtils.isKeyMatch({ shiftKey: true }, e)) { // 按住 Shift 以快捷切换至上一个状态
          let t = this.currentUID, l = this.utils.getConfig("lastUid");
          this.switchProfile(l);
          McmodderUtils.commonMsg("已快捷切换至" + (l ? ` UID:${l} ` : "未登录状态") + " ~");
          this.utils.setConfig("lastUid", t);
          return;
        }
        this.fireProfileSelectFrame();
      });
    
    this.preferredWiderScreen = this.utils.getConfig("preferredWiderScreen");
    $(`<button id="mcmodder-pagewidth-switch" data-toggle="tooltip" data-original-title="宽窄屏切换">
      <i class="fa fa-${ this.preferredWiderScreen ? "compress" : "expand" }"></i>
    </button>`)
    .appendTo(".header-container .header-search")
    .click(_e => {
      this.utils.setConfig("preferredWiderScreen", !this.preferredWiderScreen);
    });

    if (this.currentUID && this.utils.getConfig("mcmodderUI")) {
      $('<button id="mcmodder-message-center" data-toggle="tooltip" data-original-title="消息中心"><i class="fa fa-bell-o"></i></button>')
      .appendTo(".header-container .header-search")
      .click(() => {
        GM_openInTab("https://www.mcmod.cn/message/", { active: true });
        this.notifyUnreadMessage(0);
      });
    }
    if (!this.isNightMode) $("#mcmodder-night-switch i").css("text-shadow", "0px 0px 5px gold");

    const msgAlert = Number($(".header-user-msg b").text());
    if (this.utils.getConfig("mcmodderUI")) {
      $(".header-user-msg").remove();
      $(`<div class="mcmodder-rednum">`).appendTo("#mcmodder-message-center");
      this.notifyUnreadMessage(msgAlert);
    }

    if (typeof editor != "undefined") this.callEditor();
    else this.generalEditorObserver.observe(document.body, { childList: true, subtree: true });

    // TODO: 取消锁定导航栏

    if (this.isV4 && this.utils.getConfig("mcmodderUI")) {
      $(window).resize(McmodderUtils.throttle((_e: JQueryEventObject) => { // 个人目录不会超出屏幕右边界
        let l = $(".header-user").get(0).getBoundingClientRect();
        if (l.x + l.width / 2 + 400 / 2 >= window.screen.width - McmodderValues.headerContainerHeight) {
          $(".header-panel").addClass("mcmodder-header-panel-fixed");
        } else {
          $(".header-panel").removeClass("mcmodder-header-panel-fixed");
        }
      }, 16)).resize();
    }

    if (this.isV4 && this.utils.getConfig("customAdvancements")) { // 更新自定义成就
      let completed: string = this.utils.getProfile("completed");
      if (completed) {
        completed.split(",")?.forEach(id => {
          let data = this.advutils.list.filter(e => e.id == id)[0];
          McmodderUtils.showTaskTip(data.image || "",
            PublicLangData.center.task.list[data.lang].title,
            PublicLangData.center.task.list[data.lang].content,
            "", data.range, ""
          );
          // playSound();
        });
      }
      this.utils.setProfile("completed", "");
    }

    // 实时通讯
    const autoNotifyDelay = this.utils.getConfig("alwaysNotify");
    if (!window.location.href.includes("https://admin.mcmod.cn/") && typeof fuc_topmenu_sync != "undefined" && autoNotifyDelay && autoNotifyDelay >= 0.1) setInterval(() => {
      this.utils.createRequest({
        url: "https://www.mcmod.cn/frame/CommonHeader/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://www.mcmod.cn",
          "Referer": window.location.href,
          "Priority": "u=0",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        },
        data: "version=4.0",
        onload: resp => {
          let data = JSON.parse(resp.responseText);
          if (data.state || !data.user.login || !data.user.msg_count) {
            this.notifyUnreadMessage(0);
          } else {
            this.notifyUnreadMessage(data.user.msg_count);
          }
        }
      });
    }, Math.max(autoNotifyDelay * 1e3 * 60, 6e3));

    this.initList.filter(init => init.canRun()).forEach(init => init.run());

    const areaLeft = $(".left");
    const areaRight = $(".class-info-right");
    if (areaLeft.length && areaRight.length) {
      setTimeout(() => {
        const heightLeft = areaLeft.get(0).getBoundingClientRect().height;
        const heightRight = areaRight.get(0).getBoundingClientRect().height;
        $(".col-lg-12.right").css("min-height", `${ Math.max(heightLeft, heightRight) }px`);
      }, 1e3);
    }

    if (this.href.includes("www.mcmod.cn") && !this.href.includes("tools/cbcreator") && this.utils.getConfig("enableLive2D")) {

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

      $('<link rel="stylesheet" type="text/css" href="//www.mcmod.cn/live2d/waifu.css">').appendTo("head");

      $(`
        <script src="//www.mcmod.cn/live2d/waifu-tips.js" />
        <script src="//www.mcmod.cn/live2d/live2d.js" />
        <script type="text/javascript">initModel("//www.mcmod.cn/live2d/")</script>
      `).appendTo("body");

      $(document).on("click", ".waifu-tool .fui-cross", _ => {
        $.cookie("mcmodgirl_hide", null, { path: "/" });
        this.utils.setConfig("enableLive2D", false);
      });
      if (this.utils.getConfig("customAdvancements")) $(document).on("click", ".waifu", () => {
        this.advutils.addProgress(AdvancementID.CLICK_GIRL_100_TIMES);
      });
    }

    $(".common-background").remove();
    $("#key").css("color", "var(--mcmodder-color-text)");

    window.addEventListener("scroll", () => {
      this.screenAttachedFrame.forEach(e => {
        e.node.style.top = Math.max(0, window.scrollY - e.parentPosY + McmodderValues.headerContainerHeight) + "px";
      });
    });

    this.updateItemTooltip();
    $(document).on("mouseover", ".tooltip", e => {
      e.currentTarget.remove();
    });

    this.copyright();
    this.updateTitleNode();
  }
}