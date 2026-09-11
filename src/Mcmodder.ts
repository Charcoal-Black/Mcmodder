import { GM_cookie, GM_getValue, GM_openInTab, GM_setValue } from "$";
import { AdvancementID, AdvancementUtils } from "./advancement/AdvancementUtils";
import { McmodderConfigUtils, McmodderPermission } from "./config/ConfigUtils";
import { DraggableFrame } from "./widget/draggable/DraggableFrame";
import { AdvancementLoader } from "./loader/AdvancementLoader";
import { ConfigLoader } from "./loader/ConfigLoader";
import { MemuCommandLoader } from "./loader/MenuCommandLoader";
import { ScheduleRequestLoader } from "./loader/ScheduleRequestLoader";
import { StorageBufferLoader } from "./loader/StorageBufferLoader";
import { StyleLoader } from "./loader/StyleLoader";
import { ItemCustomTypeList as ItemTypeList, McmodderProfileData, SupabaseTrackSplashResponse } from "./types";
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
import { SupabaseUtils } from "./supabase/SupabaseUtils";
import { Mcmodder3DSplash } from "./widget/Splash3D";
import { EchartsUtils } from "./echarts/EChartsUtils";

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
  readonly isV4: boolean;
  readonly isMac: boolean;
  readonly isMobileClient: boolean;
  href: string;
  ueditorFrame: McmodderUEditor[];
  screenAttachedFrame: ScreenAttachedFrameData[];
  cfgutils: McmodderConfigUtils;
  supabaseUtils: SupabaseUtils;
  echartsUtils: EchartsUtils;
  styleColors: ThemeColorData;
  splash3D?: Mcmodder3DSplash;
  preferredWiderScreen = false;
  isNightMode = false;
  title = "";
  css = "";
  itemTypeList?: ItemTypeList;
  readonly hostname: string;
  private msgAlertCount = 0;
  private readonly titleNode = $("title");
  private readonly linkContentDictionary: Record<string, string> = {};
  private readonly elementColorDictionary: Map<HTMLElement, string> = new Map();
  private readonly elementColorCache: Map<string, string> = new Map();

  constructor() {
    this.isV4 = typeof fuc_topmenu_v4 === "function";
    this.isMac = McmodderUtils.isMac();
    this.isMobileClient = McmodderUtils.isMobileClient();
    const headerUserName = $(".header-user-name a, .name.top-username a, .profilebox").first();
    this.currentUsername = headerUserName.text() || "";
    const win = typeof (globalThis as any).unsafeWindow !== 'undefined' ? (globalThis as any).unsafeWindow : window;
    (win as any).__mcmodder_username__ = this.currentUsername;
    this.currentUID = Number(headerUserName.attr("href")?.split("//center.mcmod.cn/")[1]?.split("/")[0]) || 0;
    this.ueditorFrame = [];
    this.href = window.location.href;
    MemuCommandLoader.run();
    this.title = this.titleNode.html().replace(" - MC百科|最大的Minecraft中文MOD百科", "");
    this.hostname = McmodderValues.hostname;

    this.screenAttachedFrame = [];
    
    this.storageBuffer = new StorageBuffer(this);
    StorageBufferLoader.run(this.storageBuffer);

    this.utils = new McmodderUtils(this);

    this.echartsUtils = new EchartsUtils(this);

    this.cfgutils = new McmodderConfigUtils(this);
    ConfigLoader.run(this.cfgutils);
    this.styleColors = McmodderUtils.getThemeColors(this.utils);

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
      setTimeout(() => new McmodderAdvancedUEditor(editor, this), 3e2);
    } else {
      setTimeout(() => new McmodderUEditor(editor, this), 3e2);
    }
  }

  private readonly generalEditorObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if ((mutation.target as HTMLElement).id === "edui1_iframeholder" && mutation.addedNodes.length) {
        this.callEditor();
        this.generalEditorObserver.disconnect();
      }
    }
  });

  updateItemTooltip() { // 鼠标悬浮预览介绍
    if (this.utils.getConfig("hoverDescription")) {
      $(".common-imglist li, .item-list-type-right span, .relation a").off();
      $("a").filter((_, e) => {
        const href = (e as HTMLAnchorElement).href;
        return /\/\/www1?\.mcmod\.cn\/item\/[0-9]*\.html/.test(href) || /\/\/www1?\.mcmod\.cn\/class\/[0-9]*\.html/.test(href);
      }).filter((_, _c) => {
        const c = $(_c);
        if (c.parents(".mcmodder-item-link").length) return false;
        if (c.parent().hasClass("item-table-hover")) return false;
        return true;
      }).addClass("mcmodder-item-link").removeAttr("title");
      $(".modlist-block .title a").removeClass("mcmodder-item-link");
      $(".mcmodder-item-link[data-toggle=tooltip]:not([data-html])").each((_, e) => {
        $(e).tooltip("dispose");
        e.outerHTML = e.outerHTML;
      })
      $(".mcmodder-item-link").each((_, e) => {
        const href = (e as HTMLAnchorElement).href;
        $(e).attr({
          "data-source-url": href.split("mcmod.cn/")[1],
          "data-toggle": "tooltip",
          "data-html": "true",
          "data-original-title": `
            <div class="mcmodder-preview-container" data-source-url="${ href.split("mcmod.cn/")[1] }">
              <div class="mcmodder-preview-frame maintext">
                <div class="mcmodder-loading"></div>
              </div>
            </div>
          `
        });
      });
      $(document).on("mouseenter", ".mcmodder-item-link", async e => {
        await McmodderUtils.sleep(250);
        const target = e.currentTarget as HTMLAnchorElement;
        const sourceUrl = $(target).attr("data-source-url");
        const previewContainer = $(`.mcmodder-preview-container[data-source-url="${ sourceUrl }"]`);
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
        await McmodderUtils.sleep(750);
        const resp = await this.utils.createRequest({
          url: target.href,
          method: "GET",
          anonymous: true
        });
        if (!resp.responseXML) return;
        if (previewFrame.attr("data-status") === "fulfilled") return;
        const doc = $(resp.responseXML);
        doc.find(".itemname > .tool").remove();
        doc.find(".quote_text legend a").last().remove();
        previewFrame.html(doc.find(".item-content, .class-menu-main .text-area.font14").first().html());
        if (previewFrame.text() === "暂无简介，欢迎协助完善。") {
          previewFrame.html('<span class="mcmodder-common-danger">该资料正文暂无介绍...</span>');
        }
        if (sourceUrl.includes("item/")) {
          doc.find(".itemname")
          .first()
          .insertBefore(previewFrame.children().first())
          .find("h5")
          .each((_, h5) => {
            const keywords = doc.find("meta[name=keywords]").attr("content").split(",");
            let textContent = h5.textContent;
            if (keywords[1]) {
              textContent = ("<a>" + textContent)
              .replace(` (${keywords[1]})`, `</a> <span class="item-h5-ename"><a>${ keywords[1] }</a></span>`);
            } else {
              textContent = `<a>${ textContent }</a>`;
            }
            h5.innerHTML = textContent;
          });
        }
        else if (sourceUrl.includes("class/")) {
          doc.find(".class-title")
          .first()
          .insertBefore(previewFrame.children().first());
        }
        const rightTable = doc.find(".item-data .item-info-table").first();
        rightTable.removeClass("righttable").insertBefore(previewFrame);
        let showImg = (c: Element) => c.outerHTML = c.outerHTML.replaceAll("data-src=", "src=");
        rightTable.find("img").each((_, img) => {
          showImg(img);
        });
        const mcicons = $("#icon-toughness-empty");
        if (!mcicons.length) {
          const module = import.meta.glob('./html/mcicons.html', { query: "?raw", eager: true });
          const mciconsHtml = (module['./html/mcicons.html'] as any).default as string;
          $(mciconsHtml).prependTo(document.body);
        }
        if (this.utils.getConfig("hoverImage")) {
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
      const expirationMs = (profile.expirationDate && profile.expirationDate > Date.now()) ? profile.expirationDate : Date.now() + 30 * 24 * 60 * 60 * 1000;
      const expires = new Date(expirationMs);
      $.cookie("_uuid", profile.uuid, { domain: ".mcmod.cn", path: "/", expires });
      if (typeof GM_cookie !== "undefined" && GM_cookie.set && profile.uuid) {
        GM_cookie.set({
          name: "_uuid",
          value: profile.uuid,
          domain: ".mcmod.cn",
          path: "/",
          expirationDate: Math.floor(expirationMs / 1000)
        }, () => {});
      }
      this.currentUsername = profile.nickname;
    } else {
      $.cookie("_uuid", null, { domain: ".mcmod.cn", path: "/" });
      if (typeof GM_cookie !== "undefined" && GM_cookie.delete) {
        GM_cookie.delete({
          name: "_uuid"
        }, () => {});
      }
      this.currentUsername = "";
    }
    this.currentUID = uid;
  }
  parseCenterProfileFromHTML(htmlString: string, finalUrl: string, uuid: string): { uid: number, profile: McmodderProfileData } | null {
    const doc = $(new DOMParser().parseFromString(htmlString, "text/html"));

    let uid = 0;
    if (finalUrl) {
      const match = finalUrl.match(/center\.mcmod\.cn\/(\d+)/);
      if (match) {
        uid = Number(match[1]);
      }
    }
    if (!uid) {
      const href = doc.find(".header-user-name a, .name.top-username a, .user-icon a").first().attr("href");
      if (href) {
        const match = href.match(/center\.mcmod\.cn\/(\d+)/);
        if (match) {
          uid = Number(match[1]);
        }
      }
    }

    const metadataStr = doc.find("meta[name=keywords]").attr("content") || "";
    const metadata = metadataStr.replace(",我的世界,minecraft,我的世界mod", "").split(",");

    const nickname = metadata[0] || doc.find(".user-name .name, .user-name span").first().text().trim() || doc.find(".header-user-name a").text().trim();
    const username = metadata[1] || nickname;

    if (!uid || !nickname) {
      return null;
    }

    let avatar = doc.find(".user-icon-img img").attr("src") || doc.find(".header-user-avatar img").attr("src") || "";
    if (avatar.startsWith("//")) {
      avatar = "https:" + avatar;
    } else if (avatar.startsWith("/")) {
      avatar = "https://www.mcmod.cn" + avatar;
    }

    const stats = doc.find(".center-total ul").contents();
    const regTimeText = stats.eq(6).children().eq(1).text().trim();
    const regTime = regTimeText ? Date.parse(regTimeText) : Date.now();

    const lvText = doc.find(".user-name .user-lv, .user-lv").text().trim();
    const lvMatch = lvText.match(/\d+/);
    const lv = lvMatch ? Number(lvMatch[0]) : 0;

    const userGroup = stats.eq(0).children().eq(1).text().trim() || "百科用户";

    const editByteText = stats.eq(2).children().eq(1).text().replace(/,/g, "").replace(/字节/g, "").trim();
    const editByte = Number(editByteText) || 0;

    const editNumText = stats.eq(1).children().eq(1).text().replace(/,/g, "").replace(/次/g, "").trim();
    const editNum = Number(editNumText) || 0;

    let editAvg = 0;
    const avgNode = stats.get(3);
    if (avgNode) {
      const avgText = $(avgNode.textContent || "").children().eq(1).text().replace(/,/g, "").replace(/字节/g, "").trim();
      editAvg = Number(avgText) || 0;
    }

    const profile: McmodderProfileData = {
      uuid,
      expirationDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      avatar,
      nickname,
      username,
      regTime,
      lv,
      userGroup,
      editByte,
      editNum,
      editAvg,
      permission: McmodderPermission.NONE
    };

    doc.find(".admin-list").each((_, _c) => {
      const c = $(_c);
      let s: number[] = [], l: "editorModList" | "adminModList" | "devModList" | null = null;
      const t = c.find(".title").text().trim();
      if (t.startsWith("编辑员")) l = "editorModList";
      else if (t.startsWith("管理员")) l = "adminModList";
      else if (t.startsWith("开发者")) l = "devModList";
      if (l) {
        c.find("li a").each((_, d) => {
          const match = (d as HTMLAnchorElement).href?.match(/\/class\/(\d+)/);
          if (match) s.push(Number(match[1]));
        });
        profile[l] = s.join(",");
      }
    });

    let permission: McmodderPermission;
    if (McmodderValues.adminIDList.includes(uid)) permission = McmodderPermission.ADMIN;
    else if (profile.adminModList) permission = McmodderPermission.MANAGER;
    else if (profile.devModList) permission = McmodderPermission.DEVELOPER;
    else if (profile.editorModList) permission = McmodderPermission.EDITOR;
    else if (["禁止发言", "禁止编辑", "禁止访问"].includes(profile.userGroup)) permission = McmodderPermission.BANNED;
    else permission = McmodderPermission.NONE;
    profile.permission = permission;

    return { uid, profile };
  }

  async addProfileByUUID(rawInput: string) {
    if (!rawInput) {
      McmodderUtils.commonMsg("输入的登录凭证不能为空！", false);
      return;
    }
    let uuid = rawInput.trim();
    if (uuid.includes("_uuid=")) {
      const match = uuid.match(/_uuid=([^;\s"']+)/);
      if (match) {
        uuid = match[1].trim();
      }
    }
    uuid = uuid.replace(/^["']|["']$/g, "").trim();
    if (!uuid) {
      McmodderUtils.commonMsg("未能从输入中提取到有效的 _uuid 凭证！", false);
      return;
    }

    swal.fire({
      title: "正在验证登录凭证",
      html: `<p>正在通过 _uuid 获取账号信息，请稍候...</p>`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false
    });

    const previousUuid = $.cookie("_uuid");

    try {
      const initialExpirationMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
      $.cookie("_uuid", uuid, { domain: ".mcmod.cn", path: "/", expires: new Date(initialExpirationMs) });
      if (typeof GM_cookie !== "undefined" && GM_cookie.set) {
        GM_cookie.set({
          name: "_uuid",
          value: uuid,
          domain: ".mcmod.cn",
          path: "/",
          expirationDate: Math.floor(initialExpirationMs / 1000)
        }, () => {});
      }

      const resp = await this.utils.createRequest({
        url: "https://center.mcmod.cn/",
        method: "GET",
        headers: {
          "Cookie": `_uuid=${uuid}`,
          "User-Agent": navigator.userAgent,
          "Referer": "https://www.mcmod.cn/"
        }
      });

      const parsed = this.parseCenterProfileFromHTML(resp.responseText, resp.finalUrl || "", uuid);
      if (!parsed) {
        if (previousUuid) {
          let restoreExpirationMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
          try {
            const myProfilesForRestore = this.utils.getConfigAsNumberList("myProfiles");
            for (const rid of myProfilesForRestore) {
              const rp = this.utils.getProfile("*", rid) as McmodderProfileData;
              if (rp && rp.uuid === previousUuid && rp.expirationDate && rp.expirationDate > Date.now()) {
                restoreExpirationMs = rp.expirationDate;
                break;
              }
            }
          } catch {}
          $.cookie("_uuid", previousUuid, { domain: ".mcmod.cn", path: "/", expires: new Date(restoreExpirationMs) });
          if (typeof GM_cookie !== "undefined" && GM_cookie.set) {
            GM_cookie.set({ name: "_uuid", value: previousUuid, domain: ".mcmod.cn", path: "/", expirationDate: Math.floor(restoreExpirationMs / 1000) }, () => {});
          }
        } else {
          $.cookie("_uuid", null, { domain: ".mcmod.cn", path: "/" });
          if (typeof GM_cookie !== "undefined" && GM_cookie.delete) {
            GM_cookie.delete({ name: "_uuid" }, () => {});
          }
        }
        swal.close();
        McmodderUtils.commonMsg("登录凭证无效或已过期，未能获取到账号信息！", false);
        return;
      }

      const { uid, profile } = parsed;
      const myProfiles = this.utils.getConfigAsNumberList("myProfiles");
      if (!myProfiles.includes(uid)) {
        myProfiles.push(uid);
        this.utils.setConfigAsNumberList("myProfiles", myProfiles);
      }
      this.utils.setAllProfile(profile, uid);
      this.switchProfile(uid);

      swal.fire({
        type: "success",
        title: "账号添加成功",
        text: `已成功添加账号 [UID:${uid}] ${profile.nickname || profile.username} 并完成登录切换！是否立即刷新页面以应用新账号登录状态？`,
        showCancelButton: true,
        confirmButtonText: "立即刷新",
        cancelButtonText: "稍后刷新"
      }).then(confirmRes => {
        if (confirmRes && confirmRes.value) {
          window.location.reload();
        } else {
          this.fireProfileSelectFrame();
        }
      });
    } catch (err) {
      if (previousUuid) {
        let restoreExpirationMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
        try {
          const myProfilesForRestore = this.utils.getConfigAsNumberList("myProfiles");
          for (const rid of myProfilesForRestore) {
            const rp = this.utils.getProfile("*", rid) as McmodderProfileData;
            if (rp && rp.uuid === previousUuid && rp.expirationDate && rp.expirationDate > Date.now()) {
              restoreExpirationMs = rp.expirationDate;
              break;
            }
          }
        } catch {}
        $.cookie("_uuid", previousUuid, { domain: ".mcmod.cn", path: "/", expires: new Date(restoreExpirationMs) });
        if (typeof GM_cookie !== "undefined" && GM_cookie.set) {
          GM_cookie.set({ name: "_uuid", value: previousUuid, domain: ".mcmod.cn", path: "/", expirationDate: Math.floor(restoreExpirationMs / 1000) }, () => {});
        }
      } else {
        $.cookie("_uuid", null, { domain: ".mcmod.cn", path: "/" });
        if (typeof GM_cookie !== "undefined" && GM_cookie.delete) {
          GM_cookie.delete({ name: "_uuid" }, () => {});
        }
      }
      console.error(err);
      swal.close();
      McmodderUtils.commonMsg("获取账号信息失败，请检查网络或稍后重试！", false);
    }
  }

  exportProfilesToJSON() {
    const myProfiles = this.utils.getConfigAsNumberList("myProfiles");
    const profiles: Array<{ uid: number; username: string; nickname: string; uuid: string; expirationDate?: number }> = [];
    myProfiles.forEach(uid => {
      if (!uid) return;
      const p = this.utils.getProfile("*", uid) as McmodderProfileData;
      if (!p || !p.uuid) return;
      profiles.push({
        uid,
        username: p.username,
        nickname: p.nickname,
        uuid: p.uuid,
        expirationDate: p.expirationDate
      });
    });
    if (!profiles.length) {
      McmodderUtils.commonMsg("当前没有可导出的 _uuid 账号信息！", false);
      return;
    }
    const payload = {
      exportTime: new Date().toISOString(),
      version: 1,
      count: profiles.length,
      profiles
    };
    const content = JSON.stringify(payload, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `mcmodder-profiles-uuid-${dateStr}.json`;
    McmodderUtils.saveFile(fileName, content);
    McmodderUtils.commonMsg(`已导出 ${profiles.length} 个账号的 _uuid 至 ${fileName}`);
  }

  fireProfileSelectFrame() {
    const html = $(`<div>
      <p>登录过的用户至少需要在本机访问自己的个人主页一次才会在这里显示~</p>
      <div class="mcmodder-profile-actions">
        <button type="button" id="mcmodder-add-profile-uuid" class="btn btn-sm btn-outline-secondary">
          <i class="fa fa-plus"></i> 使用 _uuid 添加账号
        </button>
        <button type="button" id="mcmodder-export-profile-uuid" class="btn btn-sm btn-outline-secondary">
          <i class="fa fa-download"></i> 导出 _uuid 为 JSON
        </button>
      </div>
      <div id="mcmodder-profile-frame"><ul></ul></div>
    </div>`);
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
      (new McmodderTimer(this, profile.expirationDate)).$instance.appendTo(h.find(".mcmodder-timer-pre"));
      if (profile.uuid === uuid) h.addClass("profile-selected");
    });
    swal.fire({
      title: "切换当前账号",
      html: `<div class="profile-option-container"></div>`,
      showConfirmButton: false
    });
    html.appendTo(".profile-option-container");
    html.find("#mcmodder-add-profile-uuid").click(() => {
      swal.fire({
        title: "使用 _uuid 添加账号",
        html: `
          <p class="text-muted" style="font-size: 13px; text-align: left; margin-bottom: 8px;">
            请输入或粘贴账号登录凭证 Cookie（支持直接输入 _uuid 值或完整 Cookie 字符串）：
          </p>
          <textarea id="mcmodder-uuid-input" class="form-control mcmodder-monospace" rows="3" placeholder="例如：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx 或 _uuid=..."></textarea>
        `,
        showCancelButton: true,
        confirmButtonText: "添加并登录",
        cancelButtonText: "取消"
      }).then(async res => {
        if (!res || !res.value) return;
        const rawInput = $("#mcmodder-uuid-input").val() as string;
        await this.addProfileByUUID(rawInput);
      });
    });
    html.find("#mcmodder-export-profile-uuid").click(() => {
      const myProfilesForCheck = this.utils.getConfigAsNumberList("myProfiles");
      const exportableCount = myProfilesForCheck.filter(uid => {
        const p = this.utils.getProfile("*", uid) as McmodderProfileData;
        return p && !!p.uuid;
      }).length;
      if (!exportableCount) {
        McmodderUtils.commonMsg("当前没有可导出的 _uuid 账号信息！", false);
        return;
      }
      swal.fire({
        title: "导出账号 _uuid",
        html: `<p class="text-muted" style="font-size:13px;text-align:left;">即将导出 <b>${exportableCount}</b> 个已保存账号的 <code>_uuid</code> 凭证至 JSON 文件。<br><span class="text-danger">_uuid 为敏感登录凭证，请勿泄露给他人！妥善保管导出的文件。</span></p>`,
        showCancelButton: true,
        confirmButtonText: "确认导出",
        cancelButtonText: "取消"
      }).then(res => {
        if (res && res.value) this.exportProfilesToJSON();
      });
    });
    $(".profile-option").click(f => {
      let uid = Number(f.currentTarget.getAttribute("uid"));
      if (f.target.className === "delete" || (f.target.parentNode as HTMLElement)?.className === "delete") {
        this.utils.deleteAllProfile(uid);
        const nextProfiles = this.utils.getConfigAsNumberList("myProfiles").filter(e => e !== uid);
        this.utils.setConfigAsNumberList("myProfiles", nextProfiles);
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

  applyCustomFont(font: number) {
    switch (font) {
      case 1: {
        McmodderUtils.addStyle(`* {font-family: ${ McmodderValues.assets.font.fontFamily[font] };}`);
        break;
      }
      case 2: case 3: {
        $(`
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${ McmodderValues.assets.font.link[font] }" rel="stylesheet">
        `).appendTo("head");
        McmodderUtils.addStyle(`* {font-family: ${ McmodderValues.assets.font.fontFamily[font] };}`);
        break;
      }
    }
  }

  async trackSplash() {
    const win = typeof (globalThis as any).unsafeWindow !== 'undefined' ? (globalThis as any).unsafeWindow : window;
    if ((win as any).__mcmodder_splash_tracked__) return;
    if ((win as any).__mcmodder_custom_splash__) {
      (win as any).__mcmodder_splash_tracked__ = true;
      return;
    }

    let splashText = (win as any).__mcmodder_orig_splash__ || "";
    if (!splashText) {
      if (this.href === `${ this.hostname }/`) splashText = $(".ooops .text").first().text();
      else if (this.href === `${ this.hostname }/v4/`) splashText = $(".splash span").first().text();
    }
    if (!splashText) return;

    (win as any).__mcmodder_splash_tracked__ = true;
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
    if (flag) McmodderUtils.commonMsg(`该标语在本地累计已出现 ${flag.toLocaleString()} 次~ 内容为: ${splashText}`);
    else McmodderUtils.commonMsg(`成功记录新的闪烁标语~ 内容为: ${splashText}`);

    if (this.utils.getConfig("supabaseSplash")) {
      if (!this.supabaseUtils.hasClient() || !this.currentUID) return;
      const resp = await this.supabaseUtils.invoke<SupabaseTrackSplashResponse>('track_splash_v2', {
        body: {
          auth_key: this.utils.getProfile("auth_key"),
          splash_text: splashText
        }
      }, errorMsg => {
        if (this.isV4) McmodderUtils.commonMsg(errorMsg, false);
        else (swal as any)({
          type: "error",
          title: "遇到问题",
          text: errorMsg,
          buttons: false,
          timer: 3e3
        });
      });
      if (!resp) return;
      let msg: string;
      if (resp.count == 1) {
        msg = "此标语是首次收录！";
      } else {
        msg = `此标语已是第 ${ resp.count.toLocaleString() } 次收录`;
        if (resp.last_visited_user_id) {
          const last = Date.parse(resp.last_visited_at);
          const time = Date.now() - last;
          const formattedTime = McmodderUtils.getFormattedTime(time);
          const username = resp.last_visited_user_name;
          const userID = resp.last_visited_user_id ? `用户 ${ username } (UID:${ resp.last_visited_user_id }) ` : "未登录用户";
          msg += `，上一次由${ userID }于 ${ formattedTime } 前记录`
        }
        msg += "~";
      }
      if (this.isV4) McmodderUtils.commonMsg(msg);
      else (swal as any)({
        type: "success",
        title: "标语已上传",
        text: msg,
        buttons: false,
        timer: 3e3
      });
    }
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
      this.echartsUtils.enableNightStyle();
      $("html").addClass("dark");
      this.ueditorFrame.forEach(e => {
        e.$document?.find("html").addClass("dark");
      });
      this.elementColorDictionary.forEach((color, e) => {
        const darkenColor = this.elementColorCache.get(color);
        e.style.setProperty("color", darkenColor!);
      });
    }
    else {
      icon.addClass("on");
      if ($("#item-cover-preview-img").first().attr("src") === McmodderValues.assets.nightMode.imagesNone) {
        $("#item-cover-preview-img").attr("src", McmodderValues.assets.mcmod.imagesNone);
      }
      this.echartsUtils.disableNightStyle();
      $("html").removeClass("dark");
      this.ueditorFrame.forEach(e => {
        e.$document?.find("html").removeClass("dark");
      });
      this.elementColorDictionary.forEach((_color, e) => {
        e.style.setProperty("color", this.elementColorDictionary.get(e)!);
      });
    }
  }

  updatePageWidth() {
    const icon = $("#mcmodder-pagewidth-switch i");
    if (this.utils.getConfig("preferredWiderScreen")) {
      this.preferredWiderScreen = true;
      McmodderUtils.addStyle(`.col-lg-12.mcmodder-class-page, .col-lg-12.common-center {width: 100%; margin: 0; margin-top: calc(6 * var(--mcmodder-width-padding-1));}`, "mcmodder-pagewidth-controller");
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
    if (this.utils.getConfig("forceV4") && (this.href === `${ this.hostname }/`)) {
      window.location.href = `${ this.hostname }/v4/`;
    }

    // v2.2- 自定义字体配置兼容
    const useNotoSans = this.utils.getConfig("useNotoSans");
    if (useNotoSans) {
      this.utils.deleteConfig("useNotoSans");
      this.utils.setConfig("customFont", 2);
    }

    const customFont = this.utils.getConfig("customFont");
    if (customFont) {
      this.applyCustomFont(customFont);
    }

    // 关闭主页&整合包区广告
    $("span")
    .filter((_, e) => $(e).attr("style") === McmodderValues.adTitleCss)
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
    if ((this.href === `${ this.hostname }/` ||
        this.href === `${ this.hostname }/v4/`) ||
      this.href === "https://play.mcmod.cn/") {
      this.trackSplash();
      setTimeout(() => this.trackSplash(), 3e2);
    }

    // 后台抓取并更新云端自定义标语列表缓存
    if (this.utils.getConfig("useSupabase") && this.utils.getConfig("fetchCustomSplashes")) {
      this.supabaseUtils.fetchCustomSplashes().then(list => {
        if (list && Array.isArray(list)) {
          GM_setValue("mcmodderCustomSplashes", JSON.stringify(list));
        }
      }).catch(() => {});
    }
    if (this.utils.getConfig("splashStyle") === 1 &&
      (this.href === `${ this.hostname }/` ||
        this.href === `${ this.hostname }/v4/`)) {
      this.splash3D = new Mcmodder3DSplash(this);
      this.splash3D.init();
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
      $(".common-text .figure .lazy").each((_, _e) => {
        const e = _e as HTMLImageElement;
        if (e.complete) {
          f(e);
        } else {
          e.onload = () => f(e);
        }
      });
    }
    else McmodderUtils.addStyle('.common-text .figure {align-items: center;}');
    $(".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a").addClass("mcmodder-content-block");
    $(".common-nav .line").html('<i class="fa fa-chevron-right" />');
    $(".oredict-ad, .worldgen-list-ad").remove();
    if (this.utils.getConfig("defaultBackground") != "none") {
      $("body").filter((_, c) => $(c).css("background-image") === "none").css({
        "background": "var(--mcmodder-image-background)",
        "background-size": "cover"
      });
    }

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

      let userFavList = this.utils.getConfigAsNumberList("userFavList").filter(e => e);
      const myProfileList = this.utils.getConfigAsNumberList("myProfiles");
      let recentlyVisited = this.utils.getConfigAsNumberList("recentlyVisited").filter(e => e && !userFavList.includes(e) && !myProfileList.includes(e));

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
        const favUserOuterContainer = $(`
          <div class="mcmodder-favuser">
            <div class="title">
              最近串门
              <span class="edit">
                <i class="fa fa-pencil"></i>
              </span>
            </div>
            <div class="mcmodder-favuser-container">
              <div class="content"></div>
            </div>
          </div>
        `).insertAfter(myAvatar);
        const favUserContainer = favUserOuterContainer.find(".mcmodder-favuser-container");
        const favUserContent = favUserContainer.find(".content");
        userList.forEach(uid => {
          const profile: McmodderProfileData = this.utils.getAllProfile(uid);
          const node = $(`
            <a class="user" data-uid="${
              uid
            }" data-nickname="${
              profile.nickname
            }" title="${
              profile.nickname
            } · ${
              this.utils.getProfileAbstract(profile, true, true)
            }" target="_blank" href="https://center.mcmod.cn/${
              uid
            }/">
              <div class="avatar">
                <img alt="${ profile.nickname }" src="${ profile.avatar }">
              </div>
              <div class="nickname">${ profile.nickname }</div>
              <div class="nickname delete-text">移除</div>
            </a>
          `).appendTo(favUserContent);
          if (userFavList.includes(uid)) node.addClass("user-fav");
          else node.addClass("user-recent");
        });

        const className = ["star", "pin", "heart"][this.utils.getConfig("favUserDisplayStyle") || 0];
        favUserOuterContainer.addClass(className);

        let deleteMode = false;
        const favUserEdit = favUserOuterContainer.find(".edit");
        const favUserEditIcon = favUserEdit.children().first();
        favUserEdit.click(() => {
          deleteMode = !deleteMode;
          if (deleteMode) {
            favUserOuterContainer.addClass("delete-mode");
            favUserEditIcon.attr("class", "fa fa-close");
          } else {
            favUserOuterContainer.removeClass("delete-mode");
            favUserEditIcon.attr("class", "fa fa-pencil");
          }
        });
        favUserContainer.on("click", ".user", e => {
          if (deleteMode) {
            e.preventDefault();
            const target = $(e.currentTarget);
            const uid = Number(target.attr("data-uid"));
            userFavList = userFavList.filter(id => id != uid);
            recentlyVisited = recentlyVisited.filter(id => id != uid);
            this.utils.setConfigAsNumberList("userFavList", userFavList);
            this.utils.setConfigAsNumberList("recentlyVisited", recentlyVisited);
            target.addClass("deleted");
            setTimeout(() => {
              target.remove();
              const count = favUserContainer.find(".user").length;
              if (count < 1) {
                favUserOuterContainer.remove();
              }
            }, 300);
          }
        });
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

    const textArea = $(".text-area.common-text, .item-content.common-text, .post-row");
    if (this.utils.getConfig("mcmodderUI")) {
      // 去除正文异常背景
      if (!this.utils.getConfig("disableAutoStyleFix")) {
        textArea.find("*").filter((_i, c) => $(c).css("background-color") === "rgb(255, 255, 255)").css("background-color", "");
        textArea.find("span").filter((_i, c) => $(c).css("color") === "rgb(0, 0, 0)").css("color", "");
      }

      // Swiper 调整
      $(".swiper-container").each((_, _container) => {
        const container = $(_container);
        new McmodderSwiper(container);
      });
    }

    // 夜间模式正文颜色自动适配
    if (!this.utils.getConfig("disableAutoStyleFix")) {
      textArea.find("*").each((_, _e) => {
        const e = _e as HTMLElement;
        const css = (e as HTMLElement).style.getPropertyValue("color");
        if (css) {
          const color = McmodderUtils.parseRGB(css);
          if (!color) return;
          const colorStr = McmodderUtils.RGBToColor(color);
          const nightColorStr = McmodderUtils.reverseColorBrightness(color);
          this.elementColorDictionary.set(e, colorStr);
          this.elementColorCache.set(colorStr, nightColorStr);
        }
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
        GM_openInTab(`${ this.hostname }/message/`, { active: true });
        this.notifyUnreadMessage(0);
      });
    }

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
        url: `${ this.hostname }/frame/CommonHeader/`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": this.hostname,
          "Referer": window.location.href,
          "Priority": "u=0",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        },
        data: "version=4.0"
      }).then(resp => {
        try {
          let data = JSON.parse(resp.responseText);
          if (data.state || !data.user.login || !data.user.msg_count) {
            this.notifyUnreadMessage(0);
          } else {
            this.notifyUnreadMessage(data.user.msg_count);
          }
        }
        catch (e) {
          if (e instanceof SyntaxError) {
            console.error("Failed to parse data: " + resp.responseText);
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

    if (this.href.startsWith(this.hostname) && !this.href.includes("tools/cbcreator") && this.utils.getConfig("enableLive2D")) {

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

      $(`<link rel="stylesheet" type="text/css" href="${ this.hostname }/live2d/waifu.css">`).appendTo("head");

      $(`
        <script src="${ this.hostname }/live2d/waifu-tips.js" />
        <script src="${ this.hostname }/live2d/live2d.js" />
        <script type="text/javascript">initModel("${ this.hostname }/live2d/")</script>
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

    window.addEventListener("scroll", McmodderUtils.throttle(() => {
      this.screenAttachedFrame.forEach(e => {
        e.node.style.top = Math.max(0, window.scrollY - e.parentPosY + McmodderValues.headerContainerHeight) + "px";
      });
    }, 16));

    this.updateItemTooltip();
    $(document).on("mouseover", ".tooltip", e => {
      e.currentTarget.remove();
    });

    this.copyright();
    this.updateTitleNode();
  }
}