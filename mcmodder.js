// ==UserScript==
// @name         Mcmodder-MC百科编审辅助工具
// @namespace    http://www.mcmod.cn/
// @version      1.6
// @description  MC百科编审辅助工具
// @author       charcoalblack__
// @license      AGPL-3.0
// @match        https://*.mcmod.cn/*
// @exclude      https://api.mcmod.cn/*
// @exclude      https://bbs.mcmod.cn/*
// @exclude      https://www.mcmod.cn/v2/*
// @exclude      https://play.mcmod.cn/add/*
// @exclude      https://www.mcmod.cn/tools/*/*
// @exclude      https://*.mcmod.cn/ueditor/*
// @exclude      https://www.mcmod.cn/script/*
// @exclude      https://www.mcmod.cn/item/aspects/*
// @run-at       document-end
// @iconURL      https://www.mcmod.cn/static/public/images/favicon.ico
// @grant        GM_cookie
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      mcmod.cn
// @connect      www.curseforge.com
// @connect      api.modrinth.com
// @connect      raw.githubusercontent.com
// @connect      hub.gitmirror.com
// ==/UserScript==

class McmodderValues {
  static menuCommands = {
    settings: function () {
      GM_openInTab("https://center.mcmod.cn/#/setting/", { active: true });
    },
    structureEditor: function () {
      GM_openInTab("https://www.mcmod.cn/mcmodder/structureeditor/", { active: true });
    },
    jsonHelper: function () {
      GM_openInTab("https://www.mcmod.cn/mcmodder/jsonhelper/", { active: true });
    },
    exportLogs: function () {
      $("html").empty().html('若遇封IP，请在向作者反馈时发送下列内容，并告知具体封禁时间（精确到秒）以及被封禁时已打开的百科页面数量。下列内容可能包含敏感信息，可考虑私信发送。<textarea id="mcmodder-log-export" style="min-height: 800px; min-width: 100%;">');
      $("#mcmodder-log-export").val(GM_getValue("mcmodderSettings") + "\n" + GM_getValue("scheduleRequestList") + "\n" + GM_getValue("mcmodderLogger"));
    }
  };
  static assets = {
    almanacs: 'https://i.mcmod.cn/editor/upload/20250731/1753943312_179043_WEbO.png',
    progress1: "https://i.mcmod.cn/editor/upload/20241008/1728389750_179043_rcRM.png",
    progress2: "https://i.mcmod.cn/editor/upload/20241018/1729266514_179043_vZVb.png",
    sprite: 'https://i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png',
    cake: 'https://i.mcmod.cn/editor/upload/20250802/1754100170_179043_DWqe.png',
    candle: 'https://i.mcmod.cn/editor/upload/20250802/1754100652_179043_shqU.png',
    mcmod: {
      aprilFools: {
        mcr: "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif"
      },
      imagesNone: 'https://www.mcmod.cn/pages/class/images/none.jpg',
      loading: 'https://www.mcmod.cn/static/public/images/loading-colourful.gif',
      iconStyleSample: 'i.mcmod.cn/editor/upload/20210506/1620236406_2_BaUm.png'
    },
    nightMode: {
      imagesNone: 'https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg'
    }
  };
  static mcmodderVersion = GM_info.script.version || "Unknown";
  static MAX_REQUEST_COUNT = 9178;
  static MAX_RECIPE_LENGTH = 100;
  static headerContainerHeight = $(".top-main, .header-container, #top").get(0)?.getBoundingClientRect()?.height || 50; // 50
  static errorMessage = typeof PublicLangData != "undefined" ? PublicLangData.warning.inform : {};
  static iconMap = {
    "后台管理": "fa fa-university",
    "文件管理": "fa fa-upload",
    "社群管理": "fa fa-university",
    "我的收藏": "fa fa-star",
    "待审列表": "fa fa-mortar-board",
    "用户等级": "fa fa-line-chart",
    "短评动态": "fa fa-bell",
    "成就进度": "fa fa-calendar-check-o",
    "物品背包": "fa fa-suitcase",
    "设置中心": "fa fa-gear",
    "退出登录": "fa fa-sign-out",
    "社群主页": "fa fa-home",
    "修改信息": "fa fa-gear",
    "我的主题": "fa fa-file-text",
    "我的回复": "fa fa-reply-all",
    "社群积分": "fa fa-bar-chart",
    "社群等级": "fa fa-line-chart",
    "社群任务": "fa fa-calendar-check-o",
    "社群勋章": "fa fa-trophy"
  };
  static expReq = [0, 20, 20, 200, 240, 480, 960, 1728, 2918, 4597, 6698,
    8930, 10716, 11252, 9752, 5851, 6437, 7080, 7787, 8567, 9423,
    10366, 11402, 12543, 13796, 15177, 16694, 18363, 20200, 22219, 24442,
    Number.MAX_SAFE_INTEGER - 3e5];
  static formatColors = ["000000", "0000AA", "00AA00", "00AAAA", "AA0000", "AA00AA", "FFAA00", "AAAAAA",
    "555555", "5555FF", "55FF55", "55FFFF", "FF5555", "FF55FF", "FFFF55", "FFFFFF"];
  static ueButton1 = "fullscreen, emotion, undo, redo, insertunorderedlist, insertorderedlist, link, unlink, insertimage, justifyleft, justifycenter, justifyright, justifyjustify, indent, removeformat, formatmatch, inserttable, deletetable, bold, italic, underline, horizontal, forecolor, spechars, superscript, subscript, mctitle".split(", ");
  static ueButton2 = "window-maximize, smile-o, rotate-left, rotate-right, list-ul, list-ol, link, unlink, image, align-left, align-center, align-right, align-justify, indent, eraser, paint-brush, table, trash, bold, italic, underline, minus, font, book, superscript, subscript, header".split(", ");
  static adminIDList = [2, 8, 9, 208, 331, 7926, 7949, 10167, 12422, 14115, 17038, 21294, 29797, 672797];
  static ignoredContextFormatters = ["h1=", "h2=", "h3=", "h4=", "h5=", "ban:", "mark:", "icon:"];
  static supportedImageSuffix = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];
  static importableKeys = ["name", "englishName", "registerName", "metadata", "OredictList",
    "type", "maxStackSize", "maxDurability", "smallIcon", "largeIcon"];
  static allVersionList = [
    [], [], [5], [2], [2, 3, 7], [2], [4], // 1.6-
    [2, 4, 5, 8, 9, 10], [0, 8, 9], [0, 4], // 1.7 ~ 1.9
    [0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2], // 1.11 ~ 1.13
    [0, 1, 2, 3, 4], [0, 1, 2], [0, 1, 2, 3, 4, 5], // 1.14 ~ 1.16
    [0, 1], [0, 1, 2], [0, 1, 2, 3, 4], // 1.17 ~ 1.19
    [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // 1.20 ~ 1.21
  ];
  static loaderSupportVersions = {
    "1": [">=1.21.4", "1.21.4", "1.21.3", "1.21.1", "1.21", "1.20.6", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.13.2", "1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8.8", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.3", "1.4.2", "1.3.2", "1.2.5", "远古版本"],
    "2": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
    "11": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
    "13": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1"],
    "3": ["1.13.2", "1.13.1", "1.13"],
    "4": ["1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.2", "1.3.2"],
    "9": ["1.18.2", "1.18.1", "1.18"],
    "6": [">=1.4.2"],
    "5": [">=1.13"]
  };
  static searchOption = [
    { reg: /^添加模组/, label: "添加模组", exclude: "中的" },
    { reg: /^添加整合包/, label: "添加整合包", exclude: "中的" },
    { reg: /^添加.+教程/, label: "添加教程" },
    { reg: /^编辑模组/, label: "编辑模组", exclude: "中的" },
    { reg: /^编辑整合包/, label: "编辑整合包", exclude: "中的" },
    { reg: /^编辑.+个人作者\/开发团队。/, label: "编辑作者" },
    { reg: /^编辑.+教程。/, label: "编辑教程" },
    { reg: /^在.+中添加.+/, label: "添加资料", exclude: "更新日志。", exclude2: "合成表" },
    { reg: /^在.+中添加.+更新日志。/, label: "添加日志" },
    { reg: /^编辑.+中的.+/, label: "编辑资料", exclude: "更新日志。", exclude2: "合成表" },
    { reg: /^编辑.+中的.+更新日志。/, label: "编辑日志" },
    { reg: /^在资料.+中添加一张合成表。/, label: "添加合成表" },
    { reg: /^编辑资料.+中的一张合成表。/, label: "编辑合成表" },
    { reg: /^删除资料.+中的一张合成表。/, label: "删除合成表" }
  ];
  static AdvancementID = {
    OLD_TEXT_WORD_LENGTH_1000: 0,
    OLD_TEXT_WORD_LENGTH_0: 1,
    VIEW_BELOW_50: 2,
    LAST_EDIT_365: 3,
    EDIT_TIMES_20: 4,
    ADD_POST_WORD_LENGTH_10000: 5,
    EDIT_CLASS_AREA_100: 6,
    USER_EDIT_ALL: 7,
    USER_WORD_ALL: 8,
    USER_WORD_AVG: 9,
    KEEP_EDIT_240DAYS: 10,
    MCMOD_10TH: 11,
    DOWNLOAD_MODS_1: 12,
    WAIT_A_MINUTE: 13,
    FAULT_FINDER: 14,
    MASTER_EDITOR: 15,
    CLICK_GIRL_100_TIMES: 16,
    SKILLFUL_CRAFTSMAN: 17,
    GRAVE_DIGGER: 18,
    ALL_YOUR_FAULT: 19,
    SO_GOOD_TEACHER: 20,
    USER_LV: 21,
    USER_EDIT_TODAY: 22,
    USER_WORD_TODAY: 23,
    USER_ADD_CLASS: 24,
    USER_ADD_MODPACK: 25,
    USER_ADD_POST: 26
  };
  static userItemList = [
    { langdata: "knowledge_fragment", id: 0 },
    { langdata: "technique_crystal", id: 1, isCustom: true },
    { langdata: "memory_cube", id: 2, isCustom: true },
    { langdata: "canning_civilization", id: 3, isCustom: true },
    { langdata: "wisdom_singularity", id: 4, isCustom: true },
    { langdata: "mr_torcherino", id: 5 },
    { langdata: "red_button", id: 6, isCustom: true },
    { langdata: "medal_of_friendship", id: 7, isCustom: true },
    { langdata: "test_1", id: 8, isCustom: true },
    { langdata: "vanilla", id: 9, isCustom: true }
  ];
  static nonItemTypeList = [ // 综合类型
    { text: '模组', icon: "fa-cubes" },
    { text: '整合包', icon: "fa-file-zip-o" },
    { text: '个人作者', icon: "fa-user" },
    { text: '开发团队', icon: "fa-users" }
  ];
  static itemDefaultTypeList = [ // 默认资料类型
    { text: '物品/方块', icon: "\ue604", color: "#1b9100" },
    { text: '群系/群落', icon: "\ue61e", color: "#e69a37" },
    { text: '世界/维度', icon: "\ue62c", color: "#975a0a" },
    { text: '生物/实体', icon: "\ue643", color: "#0c55b9" },
    { text: '附魔/魔咒', icon: "\ue6b2", color: "#a239e4" },
    { text: 'BUFF/DEBUFF', icon: "\ue608", color: "#e4393f" },
    { text: '多方块结构', icon: "\ue662", color: "#810914" },
    { text: '自然生成', icon: "\ue627", color: "#d91baf" },
    { text: '绑定热键', icon: "\ue600", color: "#3a6299" },
    { text: '游戏设定', icon: "\ue628", color: "#4382d8" }
  ];
  static itemCustomTypeList = [
    { text: "元素/要素", icon: "fa-mortar-pestle", color: "#90f" },
    { text: "工具属性", icon: "fa-shapes", color: "#c300ff" },
    { text: "成就/进度", icon: "fa-star", color: "#e3cc25" },
    { text: "新版已移除", icon: "fa-clock-o", color: "#b56f34" },
    { text: "技能", icon: "fa-star-of-david", color: "#6cf" },
    { text: "技能/能力", icon: "fa-magic", color: "#32d4a9" },
    { text: "工具能力", icon: "fa-tools", color: "#f4d329" },
    { text: "编辑规范", icon: "fa-book", color: "#000" },
    { text: "材料类型", icon: "fa-sitemap", color: "#0a9" }
  ];
}

class McmodderUtils {
  constructor(parent) {
    this.parent = parent;
  }

  static isMobileClient() {
    return navigator.userAgent.match(/Mobi/i) ||
      navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/iPhone/i);
  }

  static commonMsg(message, isok = true, title = "") {
    if (typeof common_msg != "function") return;
    common_msg(title || (isok ? "提示" : "错误"), message, isok ? "ok" : "err");
  }

  static showTaskTip(imageUrl, title, text, achieveTime, progress, rewardExp) {
    showTaskTip(imageUrl, title, text, achieveTime, progress, rewardExp);
  }

  static styleColors = utils => new Object({
    tc1: utils.getConfig("themeColor1"),
    tc2: utils.getConfig("themeColor2"),
    tc3: utils.getConfig("themeColor3"),
    td1: McmodderUtils.darkenColor(utils.getConfig("themeColor1"), 0.2),
    td2: McmodderUtils.darkenColor(utils.getConfig("themeColor2"), 0.2),
    tca1: utils.getConfig("themeColor1") + "80",
    tca2: utils.getConfig("themeColor2") + "80",
    tca3: utils.getConfig("themeColor3") + "80",
    tda1: McmodderUtils.darkenColor(utils.getConfig("themeColor1"), 0.2) + "80",
    tda2: McmodderUtils.darkenColor(utils.getConfig("themeColor2"), 0.2) + "80",
    tcaa1: McmodderUtils.darkenColor(utils.getConfig("themeColor1"), 0.2) + "40",
    tcaa2: McmodderUtils.darkenColor(utils.getConfig("themeColor2"), 0.2) + "40"
  });

  static versionCompare(v1, v2) {
    const p1 = v1.split(".").map(Number);
    const p2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  static simpleDeepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  static complexDeepCopy(obj) {
    // TODO ...
    return McmodderUtils.simpleDeepCopy(obj);
  }

  static deleteEmptyProperties(obj) {
    let val;
    Object.keys(obj).forEach(key => {
      val = obj[key];
      if (val === undefined || val === null || (typeof val === "number" && isNaN(val))) delete obj[key];
    });
  }

  getConfig(key, item = "mcmodderSettings", defaultValue = undefined) {
    if (key === undefined) return defaultValue;
    let isCacheable = this.parent.storageBuffer.isCacheable(item);
    let data;
    if (isCacheable) data = this.parent.storageBuffer.data[item];
    else {
      let raw = GM_getValue(item);
      if (raw === undefined) return defaultValue;
      data = JSON.parse(raw);
    }
    if (data === undefined) return defaultValue;
    if (key === null) return data;
    let entry = data[key];
    if (entry === undefined) return defaultValue;
    return entry;
  }

  getAllConfig(item = "mcmodderSettings", defaultValue) {
    let res = this.getConfig(null, item);
    if (res != undefined) return res;
    return defaultValue;
  }

  setConfig(key, value, item = "mcmodderSettings") {
    let obj = JSON.parse(GM_getValue(item) || "{}");
    if (value === null) delete obj[key];
    else obj[key] = value;
    GM_setValue(item, JSON.stringify(obj));
  }

  setAllConfig(item, value) {
    GM_setValue(item, JSON.stringify(value));
  }

  getProfile(key = "*", uid = this.parent.currentUID) {
    let rawProfiles = GM_getValue("userProfile");
    if (!rawProfiles) {
      this.setConfig("userProfile", "{}");
      rawProfiles = "{}";
    }
    let profile = JSON.parse(JSON.parse(rawProfiles)[uid] || "{}");
    if (key === "*") return profile;
    return profile[key];
  }

  setProfile(key, value, uid = this.parent.currentUID) {
    let profiles = JSON.parse(GM_getValue("userProfile") || "{}");
    let profile = JSON.parse(profiles[uid] || "{}");
    if (typeof key === "object") profile = Object.assign(profile, key);
    else profile[key] = value;
    profiles[uid] = JSON.stringify(profile);
    GM_setValue("userProfile", JSON.stringify(profiles));
  }

  getInteract(id) {
    const result = this.getConfig(id, "mcmodderInteracts");
    this.setConfig(id, null, "mcmodderInteracts");
    return result;
  }

  setInteract(value) {
    const id = McmodderUtils.randStr(8);
    this.setConfig(id, value, "mcmodderInteracts");
    return id;
  }

  static playsound(url = "//www.mcmod.cn/static/public/sound/task/levelup.ogg") {
    let task_audio = document.createElement("audio");
    task_audio.setAttribute("muted", "muted");
    task_audio.setAttribute("src", url);
    task_audio.play();
  }

  static rgbToHex(s) {
    return "#" + s.replace(/(?:\(|\)|RGB|rgb)*/g, "")
      .split(",")
      .map(e => parseInt(e))
      .reduce((p, q) => (p << 8) + q)
      .toString(16)
      .padStart(6, "0");
  }

  static getFormattedTime(t) {
    if (t < 0) return `-`;
    if (t < 1e3) return `${t}ms`;
    if (t < 5e3) return `${parseInt(t / 1e3)}s ${t % 1e3}ms`;
    if (t < 6e4) return `${parseInt(t / 1e3)}s`;
    if (t < 3.6e6) return `${parseInt(t / 6e4)}m ${parseInt(t % 6e4 / 1e3)}s`;
    if (t < 8.64e7) return `${parseInt(t / 3.6e6)}h ${parseInt(t % 3.6e6 / 6e4)}m`;
    return `${parseInt(t / 8.64e7)}d`;
  }

  static getFormattedNumber(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(n % 1e12 != 0) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 != 0) + "G";
    if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 != 0) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(n % 1e3 != 0) + "k";
  }

  static getClassFullName(name, ename, abbr) {
    if (!name) return undefined;
    let res = "";
    if (abbr) res += `[${abbr}] `;
    res += name;
    if (ename) res += ` (${ename})`;
    return res;
  }

  static parseClassFullName(fullName) {

    let abbr, name, ename, indexOf;
    if (fullName) {
      fullName = fullName.trim();
      if (fullName.charAt(0) === "[") {
        indexOf = fullName.indexOf("]");
        abbr = fullName.slice(1, indexOf);
        fullName = fullName.slice(indexOf + 2);
      } else {
        abbr = "";
      }
      indexOf = fullName.lastIndexOf(" (");
      if (indexOf >= 0) {
        name = fullName.slice(0, indexOf);
        ename = fullName.slice(indexOf + 2, -1);
      } else {
        name = fullName;
        ename = "";
      }
    }
    return {
      className: name,
      classEname: ename,
      classAbbr: abbr
    };
  }

  static getItemFullName(name, ename) {
    let res = name;
    if (ename) res += ` (${ ename })`;
    return res;
  }

  static async imageURL2base64(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return McmodderUtils.blob2Base64(blob);
    }
    catch (error) {
      console.error('Error converting image to Base64: ', error);
      return null;
    }
  }

  static async blob2Base64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject;
      reader.readAsDataURL(blob);
    });
  }

  static blobToText(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(blob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }

  static appendBase64ImgPrefix(v) {
    if (v && v.slice(0, 11) != "data:image/") return "data:image/png;base64," + v;
    return v;
  }

  static removeBase64ImgPrefix(v) {
    if (v && v.slice(0, 11) === "data:image/") return v.split(";base64,")[1];
    return v;
  }

  static saveFile(fileName, content) {
    const blob = new Blob([content]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
  }

  static highlight(jQueryNode, color = "gold", timeout = 0, scrollIntoView = false) {
    const validColor = ["gold", "pink", "aqua", "greenyellow"];
    if (!validColor.includes(color)) {
      console.error(`Highlight color parameter must be within: [${validColor.join(", ")}]`);
      return;
    }
    const className = `mcmodder-mark-${color}`;
    jQueryNode.addClass(className);
    if (scrollIntoView) jQueryNode.get(0).scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    if (timeout > 0) setTimeout(() => jQueryNode.removeClass(className), timeout);
  }

  static abstractIDFromURL(url, typeList) {
    if (!url || !typeList) return 0;
    if (!(typeList instanceof Array)) typeList = [typeList];
    let res = 0;
    try {
      for (let type of typeList) {
        if (url.includes(type)) {
          res = url.split(`/${type}/`)[1].split(".html")[0].split("/")[0];
          let resNum = Number(res);
          if (!isNaN(resNum)) res = resNum;
          break;
        }
      }
    } finally {
      return res || 0;
    }
  }

  static getImageURLByItemID(id, width = 32, ver = 0) {
    if (![32, 36, 128, 144].includes(width)) {
      console.error(`Highlight color parameter must be within: [${ validColor.join(", ") }]`);
      return "";
    }
    if (!id) return `https://i.mcmod.cn/item/icon/${ width }x${ width }/0.png?v=${ ver }`;
    return `https://i.mcmod.cn/item/icon/${ width }x${ width }/${ parseInt(id / 1e4) }/${ id }.png?v=${ ver }`;
  }

  static getItemURLByID(id) {
    return `https://www.mcmod.cn/item/${ id }.html`;
  }

  static getClassURLByID(id) {
    return `https://www.mcmod.cn/class/${ id }.html`;
  }

  static getCenterURLByID(id) {
    return `https://center.mcmod.cn/${ id }`;
  }

  static versionArrayToString(arr) {
    if (arr[1] === 1) return "远古版本"; // 远古版本统一视为 1.1.0
    if (!arr[2]) arr = arr.slice(0, 2);
    return arr.join(".");
  }

  static darkenColor = (color, percent) => {
    let f = parseInt(color.slice(1), 16);
    let t = percent * 255;
    let r = (f >> 16) - t;
    let g = ((f & 0x00FF00) >> 8) - t;
    let b = (f & 0x0000FF) - t;
    return "#" + (
      0 |
      (Math.max(Math.min(r, 255), 0) << 16) |
      (Math.max(Math.min(g, 255), 0) << 8) |
      Math.max(Math.min(b, 255), 0)
    )
      .toString(16)
      .padStart(6, "0");
  }

  static key2Str(e) {
    // if (!(e instanceof Object)) e = JSON.parse(e);
    if (!e || !e.key) return "未指定";
    let k = [], c;
    if (e.ctrlKey) k.push("Ctrl");
    if (e.shiftKey) k.push("Shift");
    if (e.altKey) k.push("Alt");
    if (e.metaKey) k.push("Meta");
    if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 98 && e.keyCode <= 123)) c = String.fromCharCode(e.keyCode).toUpperCase();
      else if (e.keyCode >= 48 && e.keyCode <= 57) c = String.fromCharCode(e.keyCode);
      else c = e.key;
      k.push(c);
    }
    return k.join(" + ");
  }

  static isKeyMatch(a, b) { // b需要匹配a
    if (!Object.keys(a).length) return false;
    if ((a.ctrlKey && !b.ctrlKey)) return false;
    if (a.shiftKey && !b.shiftKey) return false;
    if (a.altKey && !b.altKey) return false;
    if (a.metaKey && !b.metaKey) return false;
    if (a.keyCode && b.keyCode) {
      if (a.keyCode >= 98 && a.keyCode <= 123) a.keyCode -= 32;
      if (b.keyCode >= 98 && b.keyCode <= 123) b.keyCode -= 32;
      if (a.keyCode != b.keyCode) return false;
    }
    return true;
  }

  isKeyMatchConfig(a, b) {
    return McmodderUtils.isKeyMatch(this.getConfig(a), b);
  }

  static randStr(l = 32) {
    const t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    let n = t.length, r = '';
    for (let i = 0; i < l; i++)
      r += t.charAt(Math.floor(Math.random() * n));
    return r;
  }

  static getAbsolutePos(node) {
    const rect = node.getBoundingClientRect();
    return {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.top
    }
  }

  static debounce(func, wait) {
    let timeout;
    return () => {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    }
  }

  static throttle(func, wait) {
    let lastTime = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastTime >= wait) {
        lastTime = now;
        func.apply(this, args);
      }
    };
  }

  static addStyle(value, id = "", doc = document) {
    if (doc.getElementById(id)) return;
    let style = $('<style type="text/css">').appendTo($("head", doc)).html(value);
    if (id) style.attr("id", id);
  }

  static addScript(loc, content, src, type) {
    let script = document.createElement("script");
    script.type = type ? type : "text/JavaScript";
    if (content) script.innerHTML = content;
    else {
      script.src = src;
      script.async = true;
    }
    loc.appendChild(script);
  }

  static loadScript(loc, content, src, type, id) {
    return new Promise((resolve, reject) => {
      let script = document.createElement("script");
      script.type = type ? type : "text/JavaScript";
      if (id) script.id = id;
      if (src) script.src = src;
      if (content) script.innerHTML = content;
      script.onload = () => resolve();
      loc.appendChild(script);
    });
  }

  static getStartTime(d, num = 1) {
    if (typeof d === "number") d = new Date(d);
    return new Date(d.setHours(0, 0, 0, 0)).getTime() + 24 * 60 * 60 * 1000 * num;
  }

  static getFormattedChineseDate(date = new Date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  static getFormatted24hTime(date = new Date) {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }

  static getFormattedSize = size => {
    size = Number(size) || 0;
    const f = e => new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(e);
    if (size < 1024) return f(size) + " B";
    else if (size < 1048576) return f(size / 1024) + " KiB";
    else if (size < 1073741824) return f(size / 1048576) + " MiB";
    else return f(size / 1073741824) + " GiB";
  }

  static getFormattedCodeDecoratedHTML = str => {

    const res = $("<span>");
    if (str.indexOf("\u00a7") >= 0) {
      let i = 0, color = -1, bold = false, italic = false, obfuscated = false, underline = false, strikethrough = false;
      const length = str.length;
      while (i < length) {
        const span = $("<span>");
        while (str.charAt(i) === "\u00a7") {
          const char2 = str.charAt(i + 1);
          const char2Code = str.charCodeAt(i + 1);
          let isCodeValid = false;
          if ((char2Code >= 48 && char2Code <= 57) || (char2Code >= 97 && char2Code <= 102)) {
            color = (char2Code <= 57 ? char2Code - 48 : char2Code - 87);
            bold = italic = obfuscated = underline = strikethrough = false;
            isCodeValid = true;
          }
          else if (char2 === "k") isCodeValid = obfuscated = true;
          else if (char2 === "l") isCodeValid = bold = true;
          else if (char2 === "m") isCodeValid = strikethrough = true;
          else if (char2 === "n") isCodeValid = underline = true;
          else if (char2 === "o") isCodeValid = italic = true;
          else if (char2 === "r") isCodeValid = true, color = -1, bold = italic = obfuscated = underline = strikethrough = false;

          span.removeAttr("class");
          if (color >= 0) span.addClass(`mcmodder-format-color`).addClass(`mcmodder-format-color-${ color }`);
          if (obfuscated) span.addClass(`mcmodder-format-obfuscated`);
          if (bold) span.addClass(`mcmodder-format-bold`);
          if (strikethrough) span.addClass(`mcmodder-format-strikethrough`);
          if (underline) span.addClass(`mcmodder-format-underline`);
          if (italic) span.addClass(`mcmodder-format-italic`);

          if (isCodeValid) {
            $(`<span>`).attr("class", span.attr("class")).addClass("mcmodder-format-formatter").text(str.slice(i, i + 2)).appendTo(res);
            i += 2;
          } else {
            break;
          }
        }

        let substr = "";
        do {
          substr += str.charAt(i++);
        }
        while (str.charAt(i) != "\u00a7" && i < length);
        span.text(substr).appendTo(res);
      }
    }
    else $("<span>").text(str).appendTo(res);

    res.find("span").each((_, c) => {
      const content = c.innerHTML;
      const matched = content.match(/%\d*\.{0,1}\d*s/g);
      let result = content;
      if (matched) {
        matched.forEach(e => result = result.replaceAll(e, `<code>${ e }</code>`));
        c.innerHTML = result;
      }
    })

    return res.prop("outerHTML");
  }

  updateRequestTime() {
    let minimumRequestInterval = Math.max(this.getConfig("minimumRequestInterval"), 500);
    let now = (new Date()).getTime();
    let lastRequestTime = this.getConfig("lastRequestTime") || now;
    if (lastRequestTime > now + minimumRequestInterval * McmodderValues.MAX_REQUEST_COUNT) {
      console.warn("Scheduled requests have exceeded the maximum limit. New request is ignored.");
      return -1;
    }
    if (now > lastRequestTime) lastRequestTime = now;
    this.setConfig("lastRequestTime", lastRequestTime + minimumRequestInterval);
    return lastRequestTime;
  }

  createRequest(config) {
    const lastRequestTime = this.updateRequestTime(), now = (new Date()).getTime();
    setTimeout(() => {
      const logs = GM_getValue("mcmodderLogger")?.split(";") || [];
      if (logs.length >= McmodderValues.MAX_REQUEST_COUNT / 10) logs.shift();
      let content = `${lastRequestTime}:${config.url}`;
      if (config.data) content += `(${config.data})`;
      logs.push(content);
      GM_setValue("mcmodderLogger", logs.join(";"));
      console.log("Send request: ", config);
      GM_xmlhttpRequest(config);
      // let response = await fetch(url, config);
      // response.text().then(promise => onload(promise));
    }, (lastRequestTime - now));
  }

  async createAsyncRequest(config) {
    const lastRequestTime = this.updateRequestTime(), now = (new Date()).getTime();
    return new Promise(resolve => {
      setTimeout(() => {
        config.onload = resp => resolve(resp);
        const logs = GM_getValue("mcmodderLogger")?.split(";") || [];
        if (logs.length >= McmodderValues.MAX_REQUEST_COUNT / 10) logs.shift();
        let content = `A${lastRequestTime}:${config.url}`;
        if (config.data) content += `(${config.data})`;
        logs.push(content);
        GM_setValue("mcmodderLogger", logs.join(";"));
        console.log("Send Async request: ", config);
        GM_xmlhttpRequest(config);
      }, (lastRequestTime - now));
    });
  }

  static unicode2Character(s) {
    let chineseStr = "", l = s.length;
    for (let i = 0; i < l;) {
      const unicode = s.substr(i, 6);
      if (unicode.substr(0, 2) === "\\u") {
        chineseStr += String.fromCharCode(parseInt(unicode.substr(2), 16));
        i += 6;
      }
      else {
        chineseStr += unicode.charAt(0);
        i += 1;
      }
    }
    return chineseStr;
  }

  static customDateStringToTimestamp(str) {
    const [year, month, day, hour, minute, second] = str.split(/[- :]/);
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }

  static clearContextFormatter(e) {
    e = " " + e;
    const r = McmodderValues.ignoredContextFormatters;
    let m = true;
    while (m) {
      m = false;
      r.forEach(function (i) {
        let p = e.indexOf("[" + i);
        if (p > -1) {
          if (e.slice(p).indexOf("]") < 0) return;
          m = true;
          let s = e.slice(p).split("]")[0].replace("[" + i, "");
          if (i.indexOf("=") > -1) e = e.replace(e.slice(p).split("]")[0] + "]", s);
          /* else if (i === "icon:" && s.includes("=")) {
            s = s.split("=")[1].replace(",", "");
            e = e.replace(e.slice(p).split("]")[0] + "]", s);
          } */
          else e = e.replace(e.slice(p).split("]")[0] + "]", "");
        }
      });
    }
    return e.replace(" ", "");
  }

  static getContextLength(e) {
    const encoder = new TextEncoder();
    let r = McmodderUtils.clearContextFormatter(e);
    return encoder.encode(r).length;
  }

  static isNodeHidden(node) {
    if ($(node).css("display") === "none") return true;
    return false;
  }

  static regulateFileName(name) {
    return name.replace(/[\\\/:*?"<>|]/g, '_').replace(/ /g, '_').substring(0, 255);
  }

  updateClassNameIDMap(className, classID) {
    let classNameIDMap = this.getAllConfig("classNameIDMap", {});
    let idClassNameMap = this.getAllConfig("idClassNameMap", {});
    classNameIDMap[className] = classID;
    idClassNameMap[classID] = className;
    GM_setValue("classNameIDMap", JSON.stringify(classNameIDMap));
    GM_setValue("idClassNameMap", JSON.stringify(idClassNameMap));
  }

  getClassNameByClassID(classID) {
    let idClassNameMap = this.getAllConfig("idClassNameMap", {});
    return idClassNameMap[classID];
  }

  getClassIDByClassName(className) {
    let classNameIDMap = this.getAllConfig("classNameIDMap", {});
    return classNameIDMap[className];
  }

  static updateAllTooltip() {
    return $().tooltip ?
      $('[data-toggle="tooltip"]').tooltip({
        animation: false,
        delay: { show: 200 }
      }) :
      null;
  }

  async getItemByID(id) {
    id = Number(id);
    const resp = await this.createAsyncRequest({
      url: `https://www.mcmod.cn/item/${ id }.html`,
      method: "GET",
      redirect: "manual",
      anonymous: true
    });
    if (resp.status > 300) {
      return;
    }
    const doc = $(resp.responseXML);
    return McmodderUtils.parseItemDocument(doc);
  }

  async getDetailedItemByID(id) {
    if (!this.parent.currentUID) return;
    id = Number(id);
    const resp = await this.createAsyncRequest({
      url: `https://www.mcmod.cn/item/edit/${ id }/`,
      method: "GET",
      redirect: "manual"
    });
    if (resp.status > 300) {
      return;
    }
    const doc = $(resp.responseXML);
    return McmodderUtils.parseItemEditorDocument(doc);
  }

  static parseItemDocument($doc) {
    const keywords = $doc.find("meta[name=keywords]").attr("content").split(",");
    const itemRow = $doc.find(".item-row").first();
    const command = itemRow.find(".item-give")?.attr("data-command")?.slice(9)?.split(" ");
    const righttable = itemRow.find(".righttable tbody > tr");
    const nav = $doc.find(".common-nav li");
    const res = {
      id: McmodderUtils.abstractIDFromURL(nav.eq(6).find("a").attr("href"), "item"),
      classID: McmodderUtils.abstractIDFromURL(nav.eq(4).find("a").attr("href"), "class"),
      name: keywords[0],
      englishName: keywords[1],
      smallIcon: "",
      largeIcon: "",
      creativeTabName: righttable.eq(3).find("a")?.text(),
      harvestTools: `[${ Array.from(righttable.eq(5).find(".item-table-hover"))?.map(e => e.getAttribute("item-id")).join(",") }]`
    };
    if (command) {
      res.registerName = command[0];
      res.maxStackSize = Number(command[1]) || 1;
      if (command.length > 2) res.metadata = Number(command[2]) || 0;
    }
    const itemType = Number(nav.eq(6).find("a").attr(href).split(`/item/list/${ res.id }-`)[1].slice(0, -5));
    if (itemType != 1) res.itemType = itemType;
    McmodderUtils.deleteEmptyProperties(res);
    return res;
  }

  static parseClassDocument($doc) {
    const name = $doc.find(".class-title h3").text();
    const ename = $doc.find(".class-title h4").text();
    const abbr = $doc.find(".class-title .short-name").text().slice(1, -1);
    return {
      className: name,
      classEname: ename,
      classAbbr: abbr
    }
  }

  static async itemDataToEditorData(item) {
    let res = { "item-data": {} };
    let data = res["item-data"];
    if (item.id) {
      res["action"] = "item_edit";
      res["edit-id"] = item.id.toString();
    } else {
      res["action"] = "item-add";
    }
    res["class-id"] = item.classID.toString();

    data["content"] = item.content || "";
    data["name"] = item.name;
    if (item.englishName) data["ename"] = item.englishName;
    data["category"] = { 0: 1 };
    data["type"] = item.creativeTabName;
    data["icon-32x-data"] = item.smallIcon || Mcmodder.appendBase64ImgPrefix(McmodderUtils.getImageURLByItemID(item.id, 32));
    data["icon-128x-data"] = item.largeIcon || Mcmodder.appendBase64ImgPrefix(McmodderUtils.getImageURLByItemID(item.id, 128));
    data["is-general-node"] = "0";
    data["is-general-parents"] = "0";
    if (item.OredictList.length <= 2) data["oredict"] = item.OredictList.slice(1, -1).replaceAll(", ", ",");
    if (item.maxStackSize != undefined) data["maxstack"] = item.maxStackSize.toString();
    // if (item.tools) data["tools"] = item.tools;

    return res;
  }

  static parseItemEditorDocument($doc) {
    const headScript = $doc.find("head > script").last().html().split(";");
    const bodyScript = $doc.find("body > script").last().html();
    const inputs = $doc.find(".input-group");
    const nav = $doc.find(".common-nav li");
    const res = {
      id: McmodderUtils.abstractIDFromURL(nav.eq(8).find("a").attr("href"), "item"),
      classID: Number(headScript[2].slice(16, -1)), // var nClassID = '1'
      creativeTabName: headScript[3].slice(23, -1), // var strItemTypeName = 'foo'
      smallIcon: McmodderUtils.appendBase64ImgPrefix(headScript[5]?.slice(7, -1)),
      largeIcon: McmodderUtils.appendBase64ImgPrefix(headScript[7]?.slice(7, -1)),
      name: inputs.find("[data-multi-id=name]").val(),
      englishName: inputs.find("[data-multi-id=ename]").val(),
      harvestTools: `[${ bodyScript.split(");addItemTools(").slice(1).map(parseInt).join(",") }]`,
      OredictList: `[${ inputs.find("[data-multi-id=oredict]").val() }]`,
      maxDurability: Number(inputs.find("[data-multi-id=damage]").val()),
      maxStackSize: Number(inputs.find("[data-multi-id=maxstack]").val()),
      registerName: inputs.find("[data-multi-id=regname]").val(),
      metadata: inputs.find("[data-multi-id=metadata]").val()
    }
    McmodderUtils.deleteEmptyProperties(res);
    const generalAlert = $(".edit-user-alert.isgeneral");
    if (generalAlert.length) res.generalTo = McmodderUtils.abstractIDFromURL(generalAlert.find("a").attr("href"), "item");
    return res;
  }

  static parseClassEditorDocument(doc) {
    // TODO ...
  }
}

class McmodderRequestQueue {

  constructor(parent, maxConcurrent = 6, minInterval = 750, logger = console) {
    this.parent = parent;
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
    this.logger = logger;
    this.queue = new Array;
    this.isPaused = false;
    this.isIdle = true;
  }

  _pausing() {
    return new Promise((resolve, reject) => {
      if (!this.isPaused) resolve(true);
      else setTimeout(() => {
        resolve(false);
      }, 1e3);
    })
    .then(shouldContinue => {
      if (!shouldContinue) return this._pausing();
    });
  }

  async _create(index, interval, baseInterval = interval) {
    while (this.isPaused) {
      await McmodderUtils.sleep(1e3);
    }
    const request = this.queue[index];
    const result = {
      index: index,
      success: false,
      value: null
    };
    const promise = new Promise((resolve, reject) => {
      this._pausing().then(() => {
        setTimeout(() => {
          resolve(this.parent.utils.createAsyncRequest(request.config));
        }, interval);
      });
    })
    .then(resp => {
      if (resp.status === 200) {
        result.success = true;
        result.value = request.callback(resp, index, this.queue);
      }
      else { // 网络连接成功但返回异常
        this.logger?.error(`访问失败 ${ resp.status }: ${ resp.statusText }`);
        console.error("Failed to access: ", resp);
        if (resp.status === 429) {
          this.logger?.error("等待重试");
          this._create(index, baseInterval * 30, baseInterval);
        }
      }
      return result;
    })
    .catch(err => { // 网络无法连接
      if (err instanceof TypeError) {
        console.error(err);
        this.logger?.error("网络连接失败，等待重试");
        this._create(index, baseInterval * 30, baseInterval);
      }
      else {
        this.logger?.error("未知错误");
        console.error(err);
      }
      return result;
    })
    .finally(() => {
      this.running.delete(promise);
    });
    this.running.add(promise);
  }

  async execute() {
    if (!this.isIdle) {
      console.error("该队列已在运行中");
      return;
    }
    const itemListLength = this.queue.length;
    if (!itemListLength) {
      console.error("队列为空，无法启动");
      return;
    }
    this.isIdle = false;
    this.results = new Array(itemListLength);
    this.running = new Set;
    this.progress = 0;
    while ((this.progress < itemListLength) || this.running.size) {
      if (this.running.size < this.maxConcurrent && this.progress < itemListLength) {
        const index = this.progress;
        if (!this.queue[index]?.hasOwnProperty("config")) continue;
        this._create(index, this.minInterval);
        this.progress++;
      }
      else {
        const result = await Promise.race(this.running);
        if (result?.success) {
          this.results[result.index] = result.value;
        }
      }
    }
    this.isIdle = true;
  }

  setQueue(queue) {
    if (!this.isIdle) this.logger.error("该队列正在运行中，禁止中途修改队列");
    else this.queue = queue;
    return this;
  }

  getProgress() {
    return {
      value: this.progress,
      max: this.queue.length
    }
  }

  getResult() {
    return this.results;
  }

  pause() {
    this.logger.key("已暂停运行");
    this.isPaused = true;
  }

  resume() {
    this.logger.key("已恢复运行");
    this.isPaused = false;
  }

}

class McmodderDetailedItemListRequestQueue extends McmodderRequestQueue {
  constructor(parent, maxConcurrent = 6, minInterval = 750, logger = console) {
    super(parent, maxConcurrent, minInterval, logger);
  }

  _onCallback(resp, index, requestQueue) {
    const doc = $(resp.responseXML);
    const data = McmodderUtils.parseItemEditorDocument(doc);
    console.log(data);
    this.logger.log(`${ data.id } 信息读取完成`);

    const completed = index + 1;
    if (completed % 50 === 0) {
      const total = requestQueue.length;
      this.logger.success(`${ completed.toLocaleDateString() }/${ total.toLocaleDateString() } 已完成 (${Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(completed / total * 100)}%)`);
    }

    return data;
  }

  async run(itemList) {
    const itemListLength = itemList.length;
    const requestList = new Array(itemListLength);
    this.logger.log(`共 ${ itemListLength.toLocaleString() } 个资料`);
    this.logger.log("获取资料详细信息");
    for (const i in itemList) {
      if (!itemList[i].id) {
        this.logger.log(`百科内资料 ID 为空，跳过`);
        continue;
      }
      if (itemList[i].registerName) { // 以注册名的存在与否作为资料是否已有详细信息的判断基准
        this.logger.log(`${ itemList[i].id } 已有注册名，跳过`);
        continue;
      }
      requestList[i] = {
        config: {
          url: `https://www.mcmod.cn/item/edit/${ itemList[i].id }/`,
          method: "GET",
          redirect: "manual"
        },
        callback: (resp, index, requestQueue) => this._onCallback(resp, index, requestQueue)
      }
    }
    await this.setQueue(requestList).execute();
    const requestResults = this.getResult();
    for (const i in requestResults) {
      itemList[i] = Object.assign(itemList[i], requestResults[i]);
    }
    this.logger.log("获取资料详细信息 完成");
  }
}

class McmodderSubmitRequestQueue extends McmodderRequestQueue {
  constructor(parent, maxConcurrent = 1, minInterval = 2000, logger = console) {
    super(parent, maxConcurrent, minInterval, logger);
  }
}

class Pagination {

  static RENDER_RANGE = 4;

  constructor(parent, attr, maxPage = 1, callback, currentPage = 1) {
    this.parent = parent;
    this.maxPage = maxPage;
    this.callback = callback;
    this.$instance = $(`<ul class="pagination common-pages">`);
    if (attr) this.$instance.attr(attr);

    this.bindEvents();

    this.render(currentPage);
  }

  regulatePage(page) {
    return Math.min(Math.max(page, 1), this.maxPage);
  }

  bindEvents() {
    this.$instance.on("click", ".page-link:not(.active)", e => {
      const page = this.regulatePage(Number(e.currentTarget.getAttribute("data-page")));
      this.callback(page);
      this.render(page);
    })

    this.$instance.on("click", ".page-custom", e => {
      e.stopPropagation();
    }).on("keydown", ".page-custom", e => {
      const target = $(e.currentTarget);
      if (e.key === "Escape") {
        target.blur();
        return;
      }
      if (e.key === "Enter") {
        target.blur();
        target.parent().click();
        return;
      }
      const code = e.key.charCodeAt();
      if (code < 48 || code > 57) {
        e.preventDefault();
      }
    }).on("blur", ".page-custom", e => {
      let target = $(e.currentTarget);
      if (isNaN(Number(target.text()))) target.html(page);
      target.parent().attr("data-page", target.text());
    });
  }

  _renderSingle(page, text) {
    return $(`<li class="page-item"><a class="page-link" data-page="${ page }">${ text }</a></li>`);
  }

  render(page) {
    page = this.regulatePage(page);
    this.$instance.empty();

    if (page > 1) {
      this._renderSingle(1, "首页").appendTo(this.$instance);
      this._renderSingle(page - 1, "前页").appendTo(this.$instance);
    }

    for (let i = Math.max(page - Pagination.RENDER_RANGE, 1); i <= Math.min(page + Pagination.RENDER_RANGE, this.maxPage); i++) {
      let entry = $(`<li class="page-item"><a class="page-link" data-page=${ i }>${ i.toLocaleString() }</a></li>`).appendTo(this.$instance);
      if (i === page) entry.addClass("active");
    }

    if (page < this.maxPage) {
      this._renderSingle(page + 1, "后页").appendTo(this.$instance);
      this._renderSingle(this.maxPage, "尾页").appendTo(this.$instance);
    }

    $(`<li class="page-item">
        <a class="page-link" data-page="${ page }">
          跳转至第&nbsp;
          <span class="page-custom" contenteditable="true">${ page }</span>
          &nbsp;页
        </a>
      </li>`).appendTo(this.$instance);
  }
}

class McmodderLogger {
  constructor(parent) {
    this.parent = parent;
    this.$instance = $(`<div class="mcmodder-logger mcmodder-monospace" />`);
    this.instance = this.$instance.get(0);
  }

  clear() {
    this.$instance.empty();
  }

  scrollToBottom() {
    this.instance.scrollTo(0, this.instance.scrollTopMax);
  }

  _append(className, prefix, message) {
    this.$instance.append(`<p class="${ className }">&lt;${ McmodderUtils.getFormatted24hTime() }&gt; ${ prefix }${ message }</span>`);
    if (this.instance.scrollTopMax - this.instance.scrollTop < 91.7813) {
      this.scrollToBottom();
    }
  }

  log(message) {
    this._append("info", "", message);
  }

  warn(message) {
    this._append("warn", "[WARN] ", message);
  }

  success(message) {
    this._append("success", "[SUCCESS] ", message);
  }

  error(message) {
    this._append("error", "[ERROR] ", message);
  }

  fatal(message) {
    this._append("fatal", "[FATAL] ", message);
  }

  key(message) {
    this._append("key", "", message);
  }
}

class McmodderContextMenu {
  constructor(parent, container) {
    this.parent = parent;
    this.$container = $(container).css("position", "relative");
    this.container = this.$container.get(0);
    this.isActive = false;
    this.$instance = $(`
      <div class="mcmodder-contextmenu">
        <div class="mcmodder-contextmenu-inner">
          <div class="arrow" />
          <ul>
            <li class="empty">当前无可用选项...</li>
          </ul>
        </div>
      </div>`).prependTo(container).hide();
    this.instance = this.$instance.get(0);
    this.menu = this.$instance.find("ul");
    this.arrow = this.$instance.find(".arrow");
    this.options = {};
    this.bindEvents();
  }

  bindEvents() {
    this.$container
    .contextmenu(e => this._onContextmenu(e))
    .click(e => this._onClick(e));
  }

  _onContextmenu(e) {
    e.preventDefault();
    const absolutePos = McmodderUtils.getAbsolutePos(this.container);
    if (!this.isActive) {
      this.contextmenuEvent = e;
      this.updateMenu(e);
      this.show(e.pageX - absolutePos.x, e.pageY - absolutePos.y);
    }
  }

  _onClick(e) {
    if (this.isActive) {
      this.hide();
    }
  }

  _moveTo(x, y) {
    this.$instance.css({
      left: x + "px",
      top: y + "px"
    })
  }

  updateMenu(e) {
    let isEmpty = true;
    const emptyNode = this.menu.find(".empty");
    Object.keys(this.options).forEach(key => {
      const option = this.options[key];
      if (option.displayRule(e)) {
        option.node.show();
        isEmpty = false;
      }
      else option.node.hide();
    });
    if (isEmpty) emptyNode.show();
    else emptyNode.hide();
  }

  show(x, y) {
    this.isActive = true;
    this.$instance.removeClass("expand-left").removeClass("expand-right").show();
    let nx, ny;
    const em = Number(getComputedStyle(this.instance)["font-size"].slice(0, -2));
    nx = x + (2.2 - 0.2) * em;
    ny = y + (-0.75 - 0.2) * em;
    this._moveTo(nx, ny);
    setTimeout(() => {
      if (x && y) {
        const menuRect = this.instance.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        if (menuRect.right <= containerRect.right) { // 箭头靠左
          this.$instance.addClass("expand-right");
        }
        else { // 箭头靠右
          this.$instance.addClass("expand-left");
          nx = x + (-1.7 - 0.2) * em - menuRect.width;
          ny = y + (-0.75 - 0.2) * em;
        }

        this._moveTo(nx, ny);
      }
      this.$instance.removeClass("faded");
    }, 0);
  }

  hide() {
    this.isActive = false;
    this.$instance.addClass("faded");
    setTimeout(() => {
      if (!this.isActive) this.$instance.hide();
    }, 200);
  }

  addOption(key, text, displayRule, callback) {
    let option = this.options[key] = new Object;
    option.displayRule = displayRule;
    option.callback = callback;
    option.node = $(`<li id="${ key }"><a>${ text }</a></li>`).click(_ => this.options[key].callback(this.contextmenuEvent)).appendTo(this.menu);
    return this;
  }
}

class HeadOption {
  constructor(name, displayRule, readOnly) {
    this.name = name;
    this.displayRule = displayRule;
    this.readOnly = !!readOnly;
  }
}

class McmodderTable {

  static ROW_EXPAND = 2;
  static THROTTLE_INTERVAL = 16; // ~60 FPS
  static ROW_HEIGHT_DEFAULT = 48;

  static DISPLAYRULE_NUMBER = data => Number(data).toLocaleString();
  static DISPLAYRULE_ARRAY = data => data.join(", ");
  static DISPLAYRULE_DATE_MILLISEC_EN = data => (new Date(data)).toLocaleDateString();
  static DISPLAYRULE_DATE_MILLISEC_ZH = data => McmodderUtils.getFormattedChineseDate(new Date(Number(data)));
  static DISPLAYRULE_TIME_MILLISEC = data => (new Date(data)).toLocaleString();
  static DISPLAYRULE_DATE_SEC_EN = data => McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN(Number(data) * 1e3);
  static DISPLAYRULE_DATE_SEC_ZH = data => McmodderTable.DISPLAYRULE_DATE_MILLISEC_ZH(Number(data) * 1e3);
  static DISPLAYRULE_LINK_ITEM = data => `<a target="_blank" href="${ McmodderUtils.getItemURLByID(data) }">${ data }</a>`;
  static DISPLAYRULE_LINK_ITEM_ARRAY = data => data.map(McmodderTable.DISPLAYRULE_LINK_ITEM).join(", ");
  static DISPLAYRULE_LINK_CLASS = data => `<a target="_blank" href="${ McmodderUtils.getClassURLByID(data) }">${ data }</a>`;
  static DISPLAYRULE_LINK_CLASS_ARRAY = data => data.map(McmodderTable.DISPLAYRULE_LINK_CLASS).join(", ");
  static DISPLAYRULE_LINK_CENTER = data => `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(data) }">${ data }</a>`;
  static DISPLAYRULE_LINK_CENTER_ARRAY = data => data.map(McmodderTable.DISPLAYRULE_LINK_CENTER).join(", ");
  static DISPLAYRULE_IMAGE_BASE64 = data => data ? `<img src="${McmodderUtils.appendBase64ImgPrefix(data)}">` : "-";
  static DISPLAYRULE_SIZE = data => McmodderUtils.getFormattedSize(Number(data));
  static DISPLAYRULE_LINK_CENTER_WITH_NAME = data => {
    data = data.split(",");
    return `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(data[0]) }">${ data[1] }`;
  }
  static DISPLAYRULE_HOVER = data => {
    const omittedText = data.length > 10 ? `${data.slice(0, 10)}..` : data;
    return `<a data-toggle="tooltip" data-html="true" data-original-title="${ data.replaceAll('"', '\\"').replaceAll(/\n+/g, "<br>") }">${ omittedText }</a>`
  }

  constructor(parent, attr, headOptions) {
    this.parent = parent;
    this.$instance = $(`
      <div class="mcmodder-table-container">
        <div class="mcmodder-table-loading-overlay">
          <div class="mcmodder-table-loading-container">
            <div class="mcmodder-loading" />
          </div>
        </div>
        <table>
          <thead></thead>
          <tbody>
            <tr class="mcmodder-table-margin-top" />
            <tr class="mcmodder-table-empty" />
            <tr class="mcmodder-table-margin-bottom" />
          </tbody>
        </table>
      <div>`);
    this.instance = this.$instance.get(0);
    this.$table = this.$instance.find("table").attr(attr).addClass("mcmodder-table");
    this.$thead = this.$instance.find("thead");
    this.$tbody = this.$instance.find("tbody");
    this.$marginTop = this.$tbody.find(".mcmodder-table-margin-top");
    this.$marginBottom = this.$tbody.find(".mcmodder-table-margin-bottom");
    this.$empty = this.$tbody.find(".mcmodder-table-empty");
    this.$loadingOverlay = this.$instance.find(".mcmodder-table-loading-overlay");
    this.isLoading = true;
    this.currentData = [];
    this.renderingRows = {l: -1, r: -1};
    this.rowHeight = McmodderTable.ROW_HEIGHT_DEFAULT;
    this.loadingProgress = new ProgressBar();
    this.loadingProgress.$instance
      .addClass("mcmodder-table-loading-progress")
      .appendTo(this.$instance.find(".mcmodder-table-loading-container"))
      .hide();
    this.setheadOptions(headOptions);
    this.updateScreenContainableRows();
    this.bindEvents();
    this.refreshAll();
  }

  bindEvents() {
    $(document).scroll(_ => McmodderUtils.throttle(this._onScroll(), McmodderTable.THROTTLE_INTERVAL));
    $(window).resize(_ => {
      this.updateScreenContainableRows();
      this.refreshAll();
    });
    this.$instance.on("click", ".mcmodder-table-goto", e => {
      const target = e.currentTarget;
      const key = target.getAttribute("data-goto-key");
      const value = target.getAttribute("data-goto-value");
      const index = this.searchData(key, value);
      if (index === -1) McmodderUtils.commonMsg("没有找到该链接所指向的表格行...", false);
      else this.scrollTo(index);
    })
  }

  updateScreenContainableRows() {
    this.screenContainableRows = Math.ceil(screen.height / this.rowHeight) + McmodderTable.ROW_EXPAND;
  }

  calculateRenderableRows() {
    const dataLength = this.currentData.length;
    if (!dataLength) return {l: -1, r: -1};

    const l = Math.floor(this.$tbody.get(0).getBoundingClientRect().top / -this.rowHeight);
    const r = l + this.screenContainableRows * 2 + McmodderTable.ROW_EXPAND;

    const L = Math.floor(l / this.screenContainableRows) * this.screenContainableRows;
    const R = Math.ceil(r / this.screenContainableRows) * this.screenContainableRows;

    return {l: Math.min(dataLength - 1, Math.max(0, L)), r: Math.min(dataLength - 1, R)};
  }

  calculateRowHeightTopOffset(index) {
    return index * this.rowHeight;
  }

  calculateRowHeightBottomOffset(index) {
    const dataLength = this.currentData.length;
    if (!dataLength) return 0;
    return (dataLength - index - 1) * this.rowHeight;
  }

  searchData(key, value) {
    for (const i in this.currentData) {
      if (this.currentData[i][key] == value) return Number(i);
    }
    return -1;
  }

  scrollTo(index) {
    $("html").get(0).scrollTo({
      top: McmodderUtils.getAbsolutePos(this.$tbody.get(0)).y + this.calculateRowHeightTopOffset(index) - window.screen.height / 2,
      behavior: "smooth"
    });
  }

  _onScroll() {
    const newRows = this.calculateRenderableRows();
    if (this.renderingRows.l === newRows.l && this.renderingRows.r === newRows.r) return;
    const top = this.calculateRowHeightTopOffset(newRows.l);
    const bottom = this.calculateRowHeightBottomOffset(newRows.r);
    this.$marginTop.css("height", top);
    this.$marginBottom.css("height", bottom);

    this.$tbody.find("[data-index]").remove();
    for (let i = newRows.l; i <= newRows.r; i++) {
      this.renderRow(i).insertBefore(this.$marginBottom);
    }

    // 保存行高以便实现虚拟列表
    const rowHeight = this.$tbody.find(`[data-index=${ newRows.l }]`).get(0)?.getBoundingClientRect()?.height || McmodderTable.ROW_HEIGHT_DEFAULT;
    if (rowHeight != this.rowHeight) {
      this.rowHeight = rowHeight;
      this.updateScreenContainableRows();
    }
    else {
      this.renderingRows.l = newRows.l;
      this.renderingRows.r = newRows.r;
    }
  }

  setheadOptions(headOptions) {
    this.headOptions = headOptions;
    Object.keys(headOptions).forEach(key => {
      this.$thead.append(`<th>${ this.headOptions[key].name }</th>`);
    });
  }

  appendData(dataList) {
    this.showLoading();
    this.currentData.push(dataList);
  }

  renderRow(index) {
    let data = this.currentData[index];
    const res = $(`<tr data-index="${ index }">`);
    Object.keys(this.headOptions).forEach(key => {
      this._renderUnit(data, key).appendTo(res);
    });
    return res;
  }

  isIndexRendering(index) {
    return index >= this.renderingRows.l && index <= this.renderingRows.r;
  }

  getNodeIndex(target) {
    target = $(target);
    if (target.attr("data-index") != undefined) return Number(target.attr("data-index"));
    return Number(target.parents("[data-index]").attr("data-index"));
  }

  getRow(index) {
    if (this.isIndexRendering(index)) return this.$tbody.find(`[data-index=${ index }]`);
    return $();
  }

  getUnit(index, key) {
    return this.getRow(index).find(`[data-key=${ key }]`);
  }

  _renderUnit(data, key) {
    const res = $(`<td data-key="${ key }">`);
    const rawContent = data[key];
    const displayRule = this.headOptions[key]?.displayRule;
    let content;
    if ((!displayRule || displayRule.length < 2) && (rawContent === "" || rawContent === undefined || rawContent == null)) content = "-";
    else content = displayRule ? displayRule(rawContent, data) : rawContent;
    res.html(content);
    return res;
  }

  refreshAll() {
    this.completeLoading();
    this.renderingRows = {l: -1, r: -1};
    this._onScroll();
    if (!this.currentData.length) {
      this.$tbody.find("[data-index]").remove();
      this.$empty.show();
    } else {
      this.$empty.hide();
    }
  }

  empty() {
    this.currentData = [];
    this.$tbody.find(`[data-index]`).remove();
    this.refreshAll();
  }

  showLoading() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadingProgress.hide().setProgress(0);
    this.$loadingOverlay.show().removeClass("faded");
  }

  completeLoading() {
    if (!this.isLoading) return;
    this.loadingProgress.setProgress(this.loadingProgress.max);
    this.isLoading = false;
    this.$loadingOverlay.addClass("faded");
    setTimeout(() => {
      if (!this.isLoading) this.$loadingOverlay.hide();
    }, 800);
  }

  show() {

  }

  hide() {

  }

  switchDisplayState() {
    if (McmodderUtils.isNodeHidden(this.$instance)) this.show();
    else this.hide();
  }
}

class McmodderEditableTable extends McmodderTable {

  static CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  static CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  static CLASSNAME_MOUSEOVER_TR = "mcmodder-table-mouseover-tr";
  static CLASSNAME_MOUSEOVER_TD = "mcmodder-table-mouseover-td";

  static dataMapToSelection(dataMap) {
    return Object.keys(dataMap).map(Number);
  }

  static Command = class {
    constructor(self) {
      this.self = self;
    }

    execute() {
      throw new Error("This method should be overwitten!");
    }

    undo() {
      throw new Error("This method should be overwitten!");
    }

    redo() {
      this.execute();
    }
  }

  static EditCommand = class extends McmodderEditableTable.Command {
    constructor(self, index, key, newValue, originalValue) {
      super(self);
      this.index = index;
      this.key = key;
      this.newValue = newValue;
      this.originalValue = originalValue === undefined ? self.currentData[index][key] || "" : originalValue;
    }

    execute() {
      this.self.editData(this.index, this.key, this.newValue);
    }

    undo() {
      this.self.editData(this.index, this.key, this.originalValue);
    }
  }

  static InsertRowCommand = class extends McmodderEditableTable.Command {
    constructor(self, index) {
      super(self);
      this.index = index;
    }

    execute() {
      this.self.insertRow(this.index);
    }

    undo() {
      this.self.deleteRow(this.index);
    }
  }

  static DeleteRowCommand = class extends McmodderEditableTable.Command {
    constructor(self, index) {
      super(self);
      this.index = index;
    }

    execute() {
      this.deletedData = this.self.deleteRow(this.index);
    }

    undo() {
      this.self.insertRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }

  static DeleteMultipleRowCommand = class extends McmodderEditableTable.Command {
    constructor(self, selection) {
      super(self);
      this.selection = selection;
      this.deletedData = new Array(this.selection.length);
    }

    execute() {
      this.deletedData = this.self.deleteMultipleRow(this.selection);
    }

    undo() {
      this.self.insertMultipleRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }

  static PasteCommand = class extends McmodderEditableTable.Command {
    constructor(self, index) {
      super(self);
      this.self = self;
      this.index = index;
    }

    execute() {
      this.pastedData = this.self.pasteRow(this.index);
    }

    undo() {
      this.self.deleteMultipleRow(McmodderEditableTable.dataMapToSelection(this.pastedData));
    }

    redo() {
      this.self.insertMultipleRowWithDataMap(this.pastedData);
    }
  }

  static RearrangeRowCommand = class extends McmodderEditableTable.Command {
    constructor(self) {
      super(self);
    }
  }

  static BatchCommand = class extends McmodderEditableTable.Command {
    constructor(self) {
      super(self);
      this.commandList = new Array;
    }

    push(command) {
      this.commandList.push(command);
      return this;
    }

    execute() {
      let length = this.commandList.length;
      if (!length) {
        console.warn("批处理命令为空。");
      }
      for (let i = 0; i < length; i++) {
        this.commandList[i].execute();
      }
    }

    undo() {
      let length = this.commandList.length;
      for (let i = length - 1; i >= 0; i--) {
        this.commandList[i].undo();
      }
    }
  }

  static EditRowCommand = class extends McmodderEditableTable.BatchCommand {
    constructor(self, index, data) {
      super(self);
      this.index = index;
      const original = self.currentData[index];
      Object.keys(data).forEach(key => {
        if (data[key] != original[key]) this.push(new McmodderEditableTable.EditCommand(self, index, key, data[key], original[key]));
      });
    }
  }

  constructor(parent, attr, headOptions, onEdit) {
    super(parent, attr, headOptions);
    this.onEdit = onEdit || (() => {});
    this.unsavedUnitCount = 0;
    this.selectedRowCount = 0;
    this.isShiftKeyPressed = false;
    this.hoveringIndex = null;
    this.history = new Array;
    this.historyStage = 0;
    this.clipboard = new Array;
    // this.bindEvents();
    this.initContextMenu();
    this.enableManualRearrange();
  }

  execute(command) {
    command.execute();
    this.history = this.history.slice(0, this.historyStage);
    this.historyStage = this.history.push(command);
  }

  undo() {
    if (this.historyStage > 0) {
      this.history[--this.historyStage].undo();
    }
  }

  redo() {
    if (this.historyStage < this.history.length) {
      this.history[this.historyStage++].redo();
    }
  }

  _renderUnit(data, key) {
    let res = super._renderUnit(data, key);
    if (this.headOptions[key]?.readOnly) res.attr("data-readonly", "1");
    else {
      res.attr("data-original", data[key]);
      let newValue = data._edited && data._edited[key];
      if (newValue != undefined) {
        let content;
        let displayRule = this.headOptions[key]?.displayRule;
        if (newValue === "" || newValue === undefined || newValue == null) content = "-";
        else content = displayRule ? displayRule(newValue) : newValue;
        res.attr("data-value", newValue).addClass(McmodderEditableTable.CLASSNAME_UNSAVED_TD).html(content);
      }
    }
    return res;
  }

  renderRow(index) {
    let res = super.renderRow(index);
    let data = this.currentData[index];
    if (data._edited && Object.keys(data._edited).length) {
      res.addClass(McmodderEditableTable.CLASSNAME_UNSAVED_TR);
    }
    if (data._selected) {
      res.addClass("selected");
    }
    return res;
  }

  getSelection() {
    let selection = new Array();
    this.currentData.forEach((data, index) => {
      if (data._selected) selection.push(index);
    });
    return selection;
  }

  copyRow(selection = this.getSelection()) {
    this.clipboard = new Array(selection.length);
    selection.forEach((row, index) => {
      this.clipboard[index] = McmodderUtils.simpleDeepCopy(this.currentData[row]);
      delete this.clipboard[index]._selected;
    });
  }

  pasteRow(index) {
    this.insertMultipleRowWithArray(index, this.clipboard);
    let dataMap = new Object;
    for (let i = 0; i < this.clipboard.length; i++) {
      dataMap[i + index] = this.clipboard[i];
    }
    return dataMap;
  }

  deleteRow(index) {
    let deletedData = McmodderUtils.simpleDeepCopy(this.currentData[index]);
    this.currentData.splice(index, 1);
    this.refreshAll();
    return { [index]: deletedData };
  }

  deleteMultipleRow(selection) {
    // 循环n次deleteRow，时间复杂度是O(n^2)，这里采用O(n)的优化版方案
    let deletedData = new Object;
    selection.forEach((i) => {
      deletedData[i] = Object.assign({}, this.currentData[i]);
      this.currentData[i] = null;
    });
    this.currentData = this.currentData.filter(e => e);
    this.refreshAll();
    return deletedData;
  }

  _refreshRowUnsaveState(row) {
    if (!row.find(`.${McmodderEditableTable.CLASSNAME_UNSAVED_TD}`).length) {
      row.removeClass(McmodderEditableTable.CLASSNAME_UNSAVED_TR);
    }
  }

  editData(index, key, newValue) {
    let data = this.currentData[index];
    let original = data[key] || "";
    if (original != newValue) {
      if (!data._edited) data._edited = new Object;
      data._edited[key] = newValue;
      this.unsavedUnitCount++;
    } else {
      if (data._edited && data._edited[key]) delete data._edited[key];
      this.unsavedUnitCount--;
    }
    this.getRow(index).replaceWith(this.renderRow(index));
    this.onEdit();
  }

  rearrangeRows() {
    let rows = this.$tbody.find("tr");
    let newData = new Array(rows.length);
    rows.each((index, row) => {
      newData[index] = this.currentData[this.getNodeIndex(row)];
    });
    this.currentData = newData;
  }

  insertRowWithDataMap(dataMap) {
    const key = Number(Object.keys(dataMap)[0]);
    this.insertRow(key, dataMap[key]);
  }

  insertRow(index, newData = new Object) {
    if (index < 0 || index > this.currentData.length) return;
    this.currentData.splice(index, 0, McmodderUtils.simpleDeepCopy(newData));
    this.refreshAll();
  }

  insertMultipleRowWithArray(index, dataList) {
    let l = this.currentData.slice(0, index);
    let r = this.currentData.slice(index);
    this.currentData = l.concat(McmodderUtils.simpleDeepCopy(dataList)).concat(r);
    this.refreshAll();
  }

  insertMultipleRowWithDataMap(dataMap) {
    let i = 0;
    let total = this.currentData.length + Object.keys(dataMap).length;
    let currentData = new Array(total);
    let deletedRowIndex = McmodderEditableTable.dataMapToSelection(dataMap);
    for (let k = 0; k < total; k++) {
      if (deletedRowIndex.includes(k)) currentData[k] = dataMap[k];
      else currentData[k] = this.currentData[i++];
      delete currentData[k]._selected;
    }
    this.currentData = currentData;
    this.refreshAll();
  }

  saveAll() {
    this.currentData.forEach(data => {
      if (!data._edited) return;
      Object.keys(data._edited).forEach(key => {
        data[key] = data._edited[key];
      });
      delete data._edited;
      this.unsavedUnitCount--;
    });
    // this.rearrangeRows();
    this.refreshAll();
  }

  selectRow(index, state) {
    const data = this.currentData[index];
    data._selected = !!state;
    if (state) {
      data._selected = true;
      this.selectedRowCount++;
    } else {
      data._selected = false;
      this.selectedRowCount--;
    }
    if (this.isIndexRendering(index)) {
      const row = this.getRow(index);
      if (state) row.addClass("selected");
      else row.removeClass("selected");
    }
  }

  selectRange(l, r, state) {
    for (let i = l; i <= r; i++) {
      this.selectRow(i, state);
    }
  }

  selectAll(state) {
    this.selectRange(0, this.currentData.length - 1, state);
  }

  switchSelectState(index) {
    if (isNaN(index)) return;
    const target = this.currentData[index];
    if (!target) return;
    this.prevHoverIndex = index;
    let selected = !target._selected;
    this.selectRow(index, selected);
  }

  _rowOnMouseenter(e) {
    if (!this.isShiftKeyPressed) return;
    if (e.currentTarget.tagName != "TR") return;
    let index = Number(this.getNodeIndex(e.currentTarget));
    if (index === this.prevHoverIndex) return;
    let dir = index > this.prevHoverIndex ? 1 : -1;
    for (let i = this.prevHoverIndex + dir; i != index; i += dir) { // 补间
      this.switchSelectState(i);
    }
    this.switchSelectState(this.getNodeIndex(e.currentTarget));
  }

  _unitOnMouseenter(e) {
    let target = $(e.currentTarget);
    target.addClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TD);
    let row = target.parents("tr");
    row.addClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TR);
    this.hoveringIndex = Number(this.getNodeIndex(row));
  }

  _unitOnMouseleave(e) {
    let target = $(e.currentTarget);
    target.removeClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TD);
    let row = target.parents("tr");
    row.removeClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TR);
    this.hoveringIndex = null;
  }

  _onDblclick(e) {
    let target = $(e.currentTarget);
    let content = target.attr("data-value") || target.attr("data-original") || "";
    target.empty();
    $('<input class="form-control mcmodder-table-input">').val(content).appendTo(target).focus().bind({
      "blur": f => {
        let key = target.attr("data-key");
        let index = this.getNodeIndex(target);
        this.execute(new McmodderEditableTable.EditCommand(this, index, key, f.currentTarget.value));
      },
      "keydown": f => {
        if (f.key === "Enter") f.currentTarget.blur();
        else if (f.key === "Escape") {
          f.preventDefault();
          f.currentTarget.value = content;
          f.currentTarget.blur();
        }
        else if (f.key === "Shift") {
          f.stopPropagation();
        }
      }
    });
  }

  bindEvents() {
    super.bindEvents();

    $(document.body).keydown(e => {
      // 撤销 Ctrl+Z
      if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 90 }, e)) {
        e.preventDefault();
        this.undo();
      }

      // 重做 Ctrl+Y
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 89 }, e)) {
        e.preventDefault();
        this.redo();
      }

      // 保存 Ctrl+S
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 83 }, e)) {
        e.preventDefault();
        this.saveEdit();
      }

      // 全选 Ctrl+A
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 65 }, e)) {
        e.preventDefault();
        this.selectAll(!e.shiftKey);
      }

      // 复制 Ctrl+C
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) {
        e.preventDefault();
        this.copyRow(this.getSelection());
      }

      // 选中行
      else if (e.key === "Shift") {
        this.isShiftKeyPressed = true;
        this.switchSelectState(this.hoveringIndex);
      }
    }).keyup(e => {
      if (e.key === "Shift") this.isShiftKeyPressed = false;
    });

    this.$instance
    .on("mouseenter", "td", e => this._unitOnMouseenter(e))
    .on("mouseenter", "tr", e => this._rowOnMouseenter(e))
    .on("mouseleave", "td", e => this._unitOnMouseleave(e))
    .on("dblclick", "td:not([data-readonly=1])", e => this._onDblclick(e));
  }

  initContextMenu() {
    this.contextMenu = new McmodderContextMenu(this.parent, this.$instance);
    this.contextMenu
    .addOption("newRow", "新建行", e => !this.currentData.length,
      e => this.execute(new McmodderEditableTable.InsertRowCommand(this, 0)))
    .addOption("insertRowUpper", "在此行上方插入行", e => !isNaN(this.getNodeIndex(e.target)),
      e => this.execute(new McmodderEditableTable.InsertRowCommand(this, this.getNodeIndex(e.target))))
    .addOption("insertRowLower", "在此行下方插入行", e => !isNaN(this.getNodeIndex(e.target)),
      e => this.execute(new McmodderEditableTable.InsertRowCommand(this, this.getNodeIndex(e.target) + 1)))
    .addOption("pasteRowUpper", "粘贴在其上方", e => !isNaN(this.getNodeIndex(e.target)) && this.clipboard.length,
      e => this.execute(new McmodderEditableTable.PasteCommand(this, this.getNodeIndex(e.target))))
    .addOption("pasteRowLower", "粘贴在其下方", e => !isNaN(this.getNodeIndex(e.target)) && this.clipboard.length,
      e => this.execute(new McmodderEditableTable.PasteCommand(this, this.getNodeIndex(e.target) + 1)))
    .addOption("deleteRow", "删除该行", e => !isNaN(this.getNodeIndex(e.target)),
      e => this.execute(new McmodderEditableTable.DeleteRowCommand(this, this.getNodeIndex(e.target))))
    .addOption("deleteMultipleRow", "删除所有选中行", e => this.selectedRowCount,
      e => this.execute(new McmodderEditableTable.DeleteMultipleRowCommand(this, this.getSelection())))
  }

  enableManualRearrange() {
    this.$instance.sortable({
      distance: 30,
      containerSelector: "table",
      itemPath: "> tbody",
      itemSelector: "tr",
      opacity: 0.5,
      revert: true,
      stop: () => {
        this.hasRearranged = true;
        this.updateToolBar();
      }
    }).disableSelection();
  }
}

class ProgressBar {

  static DISPLAYRULE_PERCENT = (val, max) => `${ new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val / max * 100) }%`;
  static DISPLAYRULE_FRACTION = (val, max) => `${ val.toLocaleString() } / ${ max.toLocaleString() }`;

  // static GRADIENT_DERIVATOR_INSTANT = (x, y) => y - x;

  constructor(value = 0, min = 0, max = 1, displayRule /*, gradientDerivator = ProgressBar.GRADIENT_DERIVATOR_INSTANT */ ) {
    this.value = Number(value);
    this.min = Number(min);
    this.max = Number(max);
    this.displayRule = displayRule || (this.max === 1 ? ProgressBar.DISPLAYRULE_PERCENT : ProgressBar.DISPLAYRULE_FRACTION);
    // this.gradientDerivator = gradientDerivator;

    this.$instance = $(`
      <div class="mcmodder-progress">
        <div class="mcmodder-progress-bar" />
        <div class="mcmodder-progress-per" />
      </div>
    `);
    this.$bar = this.$instance.find(".mcmodder-progress-bar");
    this.$per = this.$instance.find(".mcmodder-progress-per");

    this.setProgress(value);
  }

  update() {
    this.$bar.css("width", `${ this.max === 0 ? 0 : (this.value / this.max * 100) }%`);
    this.$per.html(this.displayRule(this.value, this.max));
  }

  setProgress(val) {
    if (!this.isVisible) this.show();
    this.value = Math.min(Math.max(this.min, val), this.max);
    this.update();
    return this;
  }

  setMax(max) {
    this.max = max;
    this.update();
    return this;
  }

  show() {
    this.isVisible = true;
    this.$instance.show();
    return this;
  }

  hide() {
    this.isVisible = false;
    this.$instance.hide();
    return this;
  }

}

class ExperienceBar extends ProgressBar {
  constructor(value, min, max) {
    super(value, min, max);
  }
}

class AdvancedExperienceBar extends ExperienceBar {
  constructor(value, min, max) {
    super(value, min, max);
  }
}

class McmodderConfigUtils {

  static CONFIG_CHECKBOX = 0;
  static CONFIG_NUMBER = 1;
  static CONFIG_TEXT = 2;
  static CONFIG_COLORPICKER = 3;
  static CONFIG_KEYBIND = 5;

  static PERMISSION_BANNED = -1;
  static PERMISSION_NONE = 0;
  static PERMISSION_EDITOR = 1;
  static PERMISSION_DEVELOPER = 2;
  static PERMISSION_MANAGER = 3;
  static PERMISSION_ADMIN = 4;

  static defaultValue = {
    [McmodderConfigUtils.CONFIG_CHECKBOX]: false,
    [McmodderConfigUtils.CONFIG_NUMBER]: 0,
    [McmodderConfigUtils.CONFIG_TEXT]: "",
    [McmodderConfigUtils.CONFIG_COLORPICKER]: "#000",
    [McmodderConfigUtils.CONFIG_KEYBIND]: new Object
  }

  constructor(parent) {
    this.parent = parent;
    this.data = {};
    this.buffer = new StorageBuffer(this);
  }

  addConfig(id, title, description, type = McmodderConfigUtils.CONFIG_CHECKBOX,
    value = null, minValue = null, maxValue = null, permission = McmodderConfigUtils.PERMISSION_NONE) {
    this.data[id] = {
      title: title,
      description: description,
      type: type,
      value: value,
      minValue: minValue,
      maxValue: maxValue,
      permission: permission
    };
    if (this.parent.utils.getConfig(id) === undefined) {
      this.parent.utils.setConfig(id, value || McmodderConfigUtils.defaultValue[type]);
    }
    return this;
  }

  getData(id) {
    return this.data[id];
  }
}

class McmodderConfigInterface {

  static checkIsValid = {
    [McmodderConfigUtils.CONFIG_CHECKBOX]: (original, value) => {
      if (original != value) return { isok: true, final: value ? true : false };
      else return { isok: false };
    },
    [McmodderConfigUtils.CONFIG_NUMBER]: (original, value, min, max) => {
      original = Number(original);
      value = Number(value);
      min = min === null ? NaN : Number(min);
      max = max === null ? NaN : Number(max);
      if (isNaN(value)) return { isok: false, msg: `请输入一个正确的数值~` };
      if (original === value) return { isok: false };
      if (!isNaN(min) && value < min) return { isok: false, msg: `您输入的数值 (${value}) 低于允许的最小值 (${min})，请重新设置~` };
      if (!isNaN(max) && value > max) return { isok: false, msg: `您输入的数值 (${value}) 高于允许的最大值 (${max})，请重新设置~` };
      return { isok: true, final: value };
    },
    [McmodderConfigUtils.CONFIG_TEXT]: (original, value) => {
      if (original === value) return { isok: false };
      return { isok: true, final: value.toString() };
    },
    /* [McmodderConfigUtils.CONFIG_KEYBIND]: (original, value) => {
      if (original === value) return { isok: false };
      return { isok: true, final: McmodderUtils.key2Str(value) }
    }, */
    default: (original, value) => new Object({ isok: original != value, final: value })
  }

  static configHTML = {
    [McmodderConfigUtils.CONFIG_CHECKBOX]: (id, title) => `
      <div class="checkbox">
        <input id="settings-${ id }" type="checkbox" data-id="${ id }">
        <label for="settings-${ id }">${ title }</label>
      </div>
    `,
    [McmodderConfigUtils.CONFIG_KEYBIND]: (id, title) => `
      <span class="title">${ title }:</span>
      <input class="form-control mcmodder-keybind-input" data-id="${ id }">
    `,
    [McmodderConfigUtils.CONFIG_COLORPICKER]: (id, title) => `
      <span class="title">${ title }:</span>
      <input type="color" class="form-control" placeholder="${ title }.." data-id="${ id }">
    `,
    default: (id, title) => `
      <span class="title">${ title }:</span>
      <input class="form-control" placeholder="${ title }.." data-id="${ id }">
    `
  }

  constructor(id, cfgutils) {
    this.id = id;
    this.cfgutils = cfgutils;
    this.data = cfgutils.data[id];
    this.original = cfgutils.parent.utils.getConfig(id);

    this.$instance = $(`
      <div class="center-setting-block">
        <div class="setting-item"></div>
        <p class="text-muted">${ this.getDescription() }</p>
      </div>`);
    this.$content = this.$instance.find(".setting-item")
    .append(McmodderConfigInterface.configHTML[this.data.type] ?
      McmodderConfigInterface.configHTML[this.data.type](this.id, this.data.title) :
      McmodderConfigInterface.configHTML.default(this.id, this.data.title));
    this.input = this.$content.find("input");
    let type = this.input.attr("type");

    if (this.data.type != McmodderConfigUtils.CONFIG_KEYBIND) {
      this.input.val(this.original);
      if (type === "checkbox") {
        this.input.get(0).checked = this.original;
        this.input.click(e => this._onChange(e.currentTarget.checked, e.currentTarget));
      }
      else {
        this.input.val(this.original);
        this.input.change(e => this._onChange(e.currentTarget.value.trim(), e.currentTarget));
      }
    }
    else {
      this.input.val(McmodderUtils.key2Str(this.original))
      .bind({
        focus: e => this._keybindOnFocus(e),
        keydown: e => this._keybindOnKeydown(e),
        keyup: e => this._keybindOnKeyup(e),
        blur: e => this._keybindOnBlur(e)
      })
    }
  }

  _keybindOnFocus(e) {
    e.currentTarget.value = "";
    this._lastKeydown = {};
    this._keyQueue = 0;
    this._finished = false;
  }

  _keybindOnKeydown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === this._lastKeydown.key) return;
    if (e.key === "Escape") {
      this.input.val(McmodderUtils.key2Str({}));
      this.input.blur();
      return;
    }
    this._lastKeydown = e;
    this._keyQueue++;
    this.input.val(McmodderUtils.key2Str(e));
  }

  _keybindOnKeyup(e) {
    if (--this._keyQueue) return;
    let d = {}, r = this._lastKeydown;
    if (r.ctrlKey) d.ctrlKey = true;
    if (r.shiftKey) d.shiftKey = true;
    if (r.altKey) d.altKey = true;
    if (r.metaKey) d.metaKey = true;
    d.key = r.key;
    if (r.keyCode >= 97 && r.keyCode <= 122) r.keyCode -= 32;
    d.keyCode = r.keyCode;
    this._onChange(d);
    this._finished = true;
    this.input.blur();
  }

  _keybindOnBlur(e) {
    if (this._finished) return;
    if (!e.target.value || this._keyQueue) this.input.val(McmodderUtils.key2Str({}));
    this._onChange({});
  }

  _onChange(value) {
    const check = McmodderConfigInterface.checkIsValid[this.data.type] || McmodderConfigInterface.checkIsValid.default;
    const resp = check(this.original, value, this.data.minValue, this.data.maxValue);
    if (resp.isok) {
      McmodderUtils.commonMsg(PublicLangData.center.setting.complete);
      this.original = value;
      this.input.val(this.data.type === McmodderConfigUtils.CONFIG_KEYBIND ? McmodderUtils.key2Str(resp.final) : resp.final);
      this.cfgutils.parent.utils.setConfig(this.id, resp.final);
    }
    else {
      if (resp.msg) McmodderUtils.commonMsg(resp.msg, false);
      this.input.val(this.original);
    }
  }

  getDescription() {
    let list = [];
    let val = this.data.value;
    if (val != null) list.push(`默认：${
      typeof val === "number" ? val.toLocaleString() :
      typeof val === "object" ? McmodderUtils.key2Str(val) : val
    }`);
    let l = this.data.minValue, r = this.data.maxValue;
    let tl = l?.toLocaleString(), tr = r?.toLocaleString();
    if (l != null && r != null)
      list.push(`允许范围：${ tl } ~ ${ tr }`);
    else if (l != null)
      list.push(`最小值：${ tl }`);
    else if (r != null)
      list.push(`最大值：${ tr }`);
    let appendix = list.length ? `（${list.join("；")}）` : ``;
    return `${ this.data.description }${ appendix }`;
  }
}

class McmodderConfigResourceInterface {

  static getTableID(id) {
    return `mcmodder-config-table-${ id }`;
  }

  constructor(parent, id, name, headOptions, configParser, dataParser) {
    this.parent = parent;
    this.id = id;
    this.table = new McmodderTable(parent, {
      id: McmodderConfigResourceInterface.getTableID(id),
    }, headOptions);
    this.table.hide();
    this.isLoaded = false;
    this.isShown = false;
    this.configParser = configParser || (config => JSON.parse(config || "{}"));
    this.dataParser = dataParser || ((_, item) => item);

    this.$instance = $(`
      <div>
        <a>${ name }</a> =
        <span>${ McmodderUtils.getFormattedSize(GM_getValue(id)?.length) }</span>
      </div>
    `);
    this.table.$instance.appendTo(this.$instance);
    this.$instance.find("a").click(() => this._onClick());
  }

  load() {
    let data = this.configParser(GM_getValue(this.id));
    this.table.showLoading();
    Object.keys(data).forEach(key => {
      this.table.appendData(this.dataParser(key, data[key]));
    });
    this.table.refreshAll();
    this.isLoaded = true;
  }

  _onClick() {
    if (!this.isShown) {
      if (!this.isLoaded) this.load();
      this.table.show();
      this.isShown = true;
    }
    else {
      this.table.hide();
      this.isShown = false;
    }
  }
}

class AdvancementUtils {

  static CATEGORY_DAILY = 1;
  static CATEGORY_COMMON = 2;
  static CATEGORY_SPECIAL = 3;

  constructor(parent) {
    this.parent = parent;
    this.list = [];
  }
  // list = Array.from(advancementList);

  add(lang, category, id, range, exp, image, reward) {
    this.list.push({
      lang: lang,
      category: category,
      id: id,
      range: range || 1,
      exp: exp || 0,
      image: image,
      reward: reward,
      isCustom: image ? true : false
    });
    return this;
  }

  addTiered(maxTier, langGen, category, id, rangeGen, expGen, imageGen, rewardGen) {
    for (let tier = 1; tier <= maxTier; ++tier) {
      this.add({
        lang: langGen(tier),
        category: category,
        id: id,
        range: rangeGen ? rangeGen(tier) : 1,
        exp: expGen ? expGen(tier) : 0,
        image: imageGen ? imageGen(tier) : undefined,
        reward: rewardGen ? rewardGen(tier) : undefined,
        tier: tier,
        isCustom: imageGen ? true : false
      });
    }
    return this;
  }

  getData(id) {
    return this.list.filter(e => e.id == id)[0];
  }

  getAll() {
    return JSON.parse(this.utils.getProfile("advancements") || "[]");
  }

  getSingleProgress(id) {
    let advancements = this.getAll();
    for (let i of advancements) {
      if (i.id == id) return i.progress;
    }
    return 0;
  }

  setProgress(id, value) {
    if (!this.utils.getConfig("customAdvancements")) return;
    let advancements = this.getAll(), max = this.getData(id).range, f = 1;
    for (let i of advancements) {
      if (i.id == id) {
        f = 0;
        if (i.progress == max && value >= i.progress) return;
        i.progress = Math.min(value, max);
        if (i.progress >= max) {
          let c = this.utils.getProfile("completed");
          if (!c) c = [];
          else c = c.split(",");
          c.push(id);
          this.utils.setProfile("completed", c.join(","));
        }
        break;
      }
    }
    if (f) advancements.push({ id: id, progress: value });
    this.utils.setProfile("advancements", JSON.stringify(advancements));
  }

  addProgress(id, value = 1) {
    this.set(id, this.getSingleProgress(id) + value);
  }
}

class ScheduleRequest {
  constructor(priority, run) {
    this.priority = priority;
    this.run = run;
  }
}

class ScheduleRequestList {

  static TRIGGER_NONE = 0;
  static TRIGGER_CONFIG = 1;

  constructor(parent) {
    this.parent = parent;
    this.requestData = {};
  }

  addRequestType(key, request, trigger, ...param) {
    this.requestData[key] = request;
    this.init(key, trigger, param);
  }

  init(key, trigger, param) {
    switch (trigger) {
      case ScheduleRequestList.TRIGGER_CONFIG: {
        let configID = param[0], minimum = param[1] || 0, hasUserLimit = param[2];
        let configValue = this.parent.utils.getConfig(configID);
        if (
          (hasUserLimit ? (this.parent.currentUID > 0) : true) &&
          configValue &&
          configValue >= minimum &&
          !this.find(key, hasUserLimit ? this.parent.currentUID : undefined)?.time
        ) {
          this.create(0, key, hasUserLimit ? this.parent.currentUID : undefined);
        }
        else if (!configValue) {
          this.deleteByTodo(key);
        }
        break;
      }
    }
  }

  get() {
    return this.parent.storageBuffer.data.scheduleRequestList;
  }

  set(e) {
    GM_setValue("scheduleRequestList", JSON.stringify(e));
  }

  empty() {
    this.set([]);
  }

  find(todo, userID) {
    let scheduleRequestList = this.get();
    return scheduleRequestList
    .filter(e => e.todo === todo && (!userID || e.userID === userID))
    .sort((a, b) => a.time - b.time)[0];
  }

  deleteByTodo(todo) {
    let scheduleRequestList = this.get();
    scheduleRequestList = scheduleRequestList.filter(e => !(e.todo === todo));
    this.set(scheduleRequestList);
  }

  create(time, todo, userID, priority) {
    this.deleteByTodo(todo);
    let scheduleRequestList = this.get();
    scheduleRequestList.push({
      time: time,
      todo: todo,
      userID: userID,
      priority: priority || this.requestData[todo]?.priority || Number.MAX_SAFE_INTEGER,
      id: McmodderUtils.randStr(8)
    });
    this.set(scheduleRequestList);
  }

  check() {
    let scheduleRequestList = this.get(), now = (new Date()).getTime();
    let todoList = scheduleRequestList.filter(e => e.time <= now && (e.userID === undefined || e.userID <= 0 || e.userID === this.parent.currentUID)), idList = todoList.map(e => e.id);
    if (todoList.length) {
      todoList.sort((a, b) => a.priority - b.priority);
      todoList.forEach(e => this.run(e.todo));
      scheduleRequestList = this.get().filter(e => !(idList.includes(e.id)));
      this.set(scheduleRequestList);
    }
  }

  run(todo) {
    this.requestData[todo].run(this);
  }
}

class McmodderAutoLink {

  static AUTOLINK_KEYWORD_MAXLENGTH = 10;

  constructor(editor, itemSourceList) {
    this.editor = editor;
    this.parent = this.editor.parent;
    this.itemSourceList = itemSourceList;
  }

  init() {
    swal({ // 初始化
      title: PublicLangData.editor.autolink.title,
      showConfirmButton: false,
      cancelButtonText: PublicLangData.close,
      preConfirm: () => { },
      allowOutsideClick: () => !Swal.isLoading(),
      allowEscapeKey: () => !Swal.isLoading(),
      showCancelButton: () => !Swal.isLoading()
    });
    this.frame = $('<div class="edit-autolink-frame" />').appendTo(".swal2-content");
    this.search = $(`
      <form>
        <div class="input-group edit-autolink-search">
          <input class="form-control" name="key" value="" placeholder="搜索模组与资料.." maxlength="255">
          <button class="btn btn-dark" type="submit">搜索</button>
        </div>
      </form>`).appendTo(this.frame);
    this.frame.append(`<p class="tips">可用空格分割多个关键词，如“工业 电路”、“原版 甘蔗”等，最多${ McmodderAutoLink.AUTOLINK_KEYWORD_MAXLENGTH.toLocaleString() }个关键词。</p></div>`);
    this.resultFrame = $('<div class="edit-autolink-list" style="max-height:400px; overflow:auto;"><ul></ul></div>').appendTo(this.frame);
    this.resultList = this.resultFrame.find("ul").first();
    this.input = this.search.find("input");
    this.linkStyleTitle = $('<div class="title">链接文本:</div>').appendTo(this.frame).hide();
    this.linkStyleFrame = $(`
    <div class="edit-autolink-style">
      <div class="radio">
        <input id="edit-autolink-style-text-0" name="edit-autolink-style-text" value="0" type="radio">
        <label for="edit-autolink-style-text-0">选中的文本</label>
      </div>
      <div class="radio">
        <input id="edit-autolink-style-text-1" name="edit-autolink-style-text" value="1" type="radio">
        <label for="edit-autolink-style-text-1">一半名称 (仅主要名称)</label>
      </div>
      <div class="radio">
        <input id="edit-autolink-style-text-2" name="edit-autolink-style-text" value="2" type="radio">
        <label for="edit-autolink-style-text-2">完整名称 (主要名称+次要名称)</label>
      </div>
      <br>
      <div class="checkbox">
        <input id="edit-autolink-style-space" name="edit-autolink-style-space" value="1" type="checkbox">
        <label for="edit-autolink-style-space">在链接前后加空格</label>
      </div>
    </div>`).appendTo(this.frame).hide();
    this.searchSourceSetting = $(`
    <div class="edit-autolink-source">
      <div class="checkbox">
        <input id="edit-autolink-source-local" name="edit-autolink-source" type="checkbox">
        <label for="edit-autolink-source-local">本地搜索</label>
      </div>
      <div class="checkbox">
        <input id="edit-autolink-source-online" name="edit-autolink-source" type="checkbox">
        <label for="edit-autolink-source-online">联网搜索</label>
      </div>
    </div>`).appendTo(this.frame);

    let preferredStyle = this.parent.utils.getConfig("preferredAutolinkStyle");
    if (preferredStyle === undefined) preferredStyle = 0;
    if (!preferredStyle && this._shouleHideStyle0) preferredStyle = 1;
    this.linkStyleFrame.find(`#edit-autolink-style-text-${ preferredStyle }`).click();
    this.linkStyleFrame.on("click", "[name=edit-autolink-style-text]", _ => {
      this.parent.utils.setConfig("preferredAutolinkStyle", Number(this.linkStyleFrame.find("[name=edit-autolink-style-text]:checked").val()));
    });

    if (!this.itemSourceList.length) this.searchSourceSetting.hide();
    else this.searchSourceSetting.show();

    $(".edit-autolink-search button").click(e => {
      e.preventDefault();
      this.onSearch();
    });

    this.input.keyup(e => this._onKeydown(e));
    this.resultList.on("click", "li:not(.empty)", e => this._onClick(e));
  }

  _shouleHideStyle0() {
    return !!this.editor.editor.selection.getRange().cloneContents();
  }

  _onClick(e) {
    const target = e.currentTarget;
    const type = target.getAttribute("data-type");
    const style = Number(this.linkStyleFrame.find("[name=edit-autolink-style-text]:checked").val());
    const appendSpace = Number(this.linkStyleFrame.find("[name=edit-autolink-style-space]:checked").length);
    const id = target.getAttribute("data-id");
    let content;
    switch (style) {
      case 0: content = this._shouleHideStyle0(); break;
      case 1: content = target.getAttribute("data-text-half"); break;
      case 2: content = target.getAttribute("data-text-full"); break;
    }
    Swal.close();

    let link;
    if (type === "item") link = `https://www.mcmod.cn/${ type }/${ id }.html`;
    else if (type === "oredict") link = `https://www.mcmod.cn/${ type }/${ id }-1.html`;

    let res = `<a href="${ link }" target="_blank" title="${ content }">${ content }</a>`;
    if (appendSpace) res = `&nbsp;${ res }&nbsp;`;
    this.editor.editor.execCommand("insertHtml", res);
  }

  _onKeydown(e) {
    if (!e.altKey) return;
    const num = e.which;
    if (num < 48 || num > 57) return;
    e.preventDefault();
    const target = this.resultFrame.find(`.mcmodder-autolink-altkey-${ num - 48 }`);
    McmodderUtils.highlight(target, "greenyellow");
    setTimeout(() => target.click(), 200);
  }

  onSearch() {
    this.searchText = this.search.find("input[name=key]").val().trim();
    this.searchKeyWords = this.searchText.split(/\s+/).slice(0, McmodderAutoLink.AUTOLINK_KEYWORD_MAXLENGTH); // 原生最大长度为4
    this.performSearch();
  }

  renderSingleItem(item) {
    const fullName = McmodderUtils.getItemFullName(item.name, item.englishName);

    const classID = item.classID;
    let classFullName = this.parent.utils.getClassNameByClassID(classID);
    let {className, classEname, classAbbr} = McmodderUtils.parseClassFullName(classFullName);

    if (!classFullName) {
      className ||= item.className, classEname ||= item.classEname, classAbbr ||= item.classAbbr;
      classFullName = McmodderUtils.getClassFullName(className, classEname, classAbbr);
    }


    const itemLi = $(`<li
      data-type="item"
      data-id="${item.id}"
      data-text-full="${fullName}"
      data-text-half="${item.name}"
      href="javascript:void(0);"
      data-toggle="tooltip"
      data-original-title="${item.itemType || "物品/方块"} - ID:${item.id} ${fullName} - ${classFullName}">
    </li>`);
    itemLi.append(`<img class="item-img" src="${item.smallIcon || McmodderUtils.getImageURLByItemID(item.id)}" width="32" height="32">`);
    const itemA = $(`<a>`).appendTo(itemLi);

    itemA.append(`<span class="item-id mcmodder-slim-dark">${item.id}</span>&nbsp;`);
    if (classFullName) itemA.append(`<span class="item-modabbr">[${classAbbr || classEname || className}]</span>&nbsp;`);
    itemA.append(`<span class="item-name">${item.name}</span>&nbsp;`)
    if (item.englishName) itemA.append(`<span class="item-ename">&nbsp;${item.englishName}&nbsp;</span>`);

    return itemLi;
  }

  renderSingleClass(item) {
    // TODO ...
  }

  renderSingleOredict(item) {
    return $(`
      <li data-type="oredict" data-id="${item.id}" data-text-full="#${item.id}" data-text-half="${item.id}">
        <i class="fas fa-cubes mcmodder-chroma"></i>
        #${item.id}
      </li>`);
  }

  displaySearchResult(itemList = this.searchResultList) {
    this.resultList.empty();
    let itemCount = itemList.length;

    if (!itemCount) {
      if (!this.searchText) { // 未发起搜索
        this.resultFrame.hide();
        this.linkStyleTitle.hide();
        this.linkStyleFrame.hide();
        return;
      }
    }

    if (!itemCount) {
      this.resultList.append(`<li class="empty">没有找到与“ ${ this.searchText } ”有关的内容。</li>`);
      this.linkStyleTitle.hide();
      this.linkStyleFrame.hide();
      return;
    }

    this.resultFrame.show();
    this.resultList.append('<div class="title">搜索结果:</div>');
    this.linkStyleTitle.show();
    this.linkStyleFrame.show();

    const style0 = this.linkStyleFrame.find("#edit-autolink-style-text-0");
    if (this._shouleHideStyle0()) style0.hide();
    else style0.show();

    this.resultListItems = [];
    itemList.forEach(item => { // 预处理
      let node;
      switch (item.type) {
        case "class": node = this.renderSingleClass(item); break;
        case "oredict": node = this.renderSingleOredict(item); break;
        default: node = this.renderSingleItem(item); break;
      }
      this.resultListItems.push(node);
    });
    this.resultListItems.forEach((item, index) => { // 修饰处理
      if (index < 10) {
        $(item).append(`<span class="mcmodder-common-dark item-ename"> [Alt+${ index }]</span>`).addClass(`mcmodder-autolink-altkey-${ index }`);
      }
      this.resultList.append(item);
    });

    McmodderUtils.updateAllTooltip();
  }

  async performOnlineSearch() {
    let resp = await this.parent.utils.createAsyncRequest({
      url: "https://www.mcmod.cn/object/UEAutolink/",
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
      data: $.param({
        classID: nClassID,
        key: this.searchText
      })
    });
    let data = JSON.parse(resp.responseText);
    if (data.state) {
      McmodderUtils.commonMsg(McmodderValues.errorMessage[data.state], false);
      return;
    }
    return this.parseOnlineSearchResult(data.html);
  }

  parseOnlineSearchResult(raw) {
    const html = $("<div>").html(raw).find(".edit-autolink-list li");
    const searchResult = [];
    if (html.attr("class") === "empty") return [];
    html.each((index, element) => {
      const img = element.childNodes.item(0);
      const link = element.childNodes.item(1);
      if (!(img && link)) return;

      const dataType = link.getAttribute("data-type");
      if (dataType != "item") return; // TODO: 支持其他类型的搜索结果

      const id = Number(link.getAttribute("data-id"));
      const name = link.getAttribute("data-text-half");
      const ename = link.getAttribute("data-text-full").slice(name.length + 2, -1);

      let splitIndexOf = link.textContent.indexOf(" - ");
      const creativeTabName = link.textContent.slice(0, splitIndexOf);

      splitIndexOf = 0;
      const classTextFull = link.title.split(name)[1].split(" - ")[1];
      let className, classEname, classAbbr;
      if (classTextFull.charAt(0) === '[') {
        splitIndexOf = classTextFull.indexOf("]");
        classAbbr = classTextFull.slice(1, splitIndexOf);
        className = classTextFull.slice(splitIndexOf + 2);
      }
      else className = classTextFull;
      splitIndexOf = className.lastIndexOf(" (");
      if (splitIndexOf != -1) {
        classEname = className.slice(splitIndexOf + 2, -1);
        className = className.slice(0, splitIndexOf);
      }

      searchResult.push(this.evaluateMatchRate({
        id: id,
        name: name,
        englishName: ename,
        classID: this.parent.utils.getClassIDByClassName(className),
        classAbbr: classAbbr,
        className: className,
        classEname: classEname,
        creativeTabName: creativeTabName,
        searchTag: {
          matchScore: (30 - index) / 3
        }
      }, this.searchKeyWords));
    });

    return searchResult;
  }

  async performSearch() {

    let searchLocal, searchOnline;
    if (!this.itemSourceList.length) {
      searchLocal = false;
      searchOnline = true;
    }
    else {
      searchLocal = this.searchSourceSetting.find("#edit-autolink-source-local").prop("checked");
      searchOnline = this.searchSourceSetting.find("#edit-autolink-source-online").prop("checked");
    }

    if (!this.searchText.length) {
      this.displaySearchResult([]);
      return;
    }

    this.searchResultList = [];

    // 本地搜索
    if (searchLocal) {
      this.itemSourceList.forEach(item => {
        if (item.id) this.searchResultList.push(this.evaluateMatchRate(item, this.searchKeyWords)); // 只有已被导入百科的物品才会被搜索
      });
    }

    // 联网搜索
    if (searchOnline) {
      // ID去重，替代concat
      const localResultIDs = this.searchResultList.map(item => item.id);
      const onlineResult = await this.performOnlineSearch();
      for (const item of onlineResult) {
        if (!(localResultIDs.includes(item.id))) this.searchResultList.push(item);
      }
    }

    // 矿物词典/物品标签附加
    if (this.searchText.charAt(0) === "#") {
      this.searchResultList.push({
        type: "oredict",
        id: this.searchText.slice(1),
        searchTag: {
          matchScore: 100
        }
      });
    }

    // 整合搜索结果
    this.searchResultList = this.searchResultList
    .filter(e => e.searchTag.matchScore > 0)
    .sort((a, b) => {
      return b.searchTag.matchScore - a.searchTag.matchScore;
    });
    this.displaySearchResult();
  }

  evaluateMatchRate(item, keywords) {
    let totalScore = 0, tag = {
      searchTag: {
        matchScore: /* item.searchTag?.matchScore || */ 0, // 匹配总分值
        isAbsoluteMatches: false, // 是否完全匹配 ID
        isModMatches: false, // 模组是否匹配
        isModVanilla: true, // 是否是原版系物品
        isModExpansionMatches: false, // 附属模组是否匹配
        isModDependenceMatches: false // 前置模组是否匹配
      }
    };

    // 关键词匹配
    keywords.forEach(keyword => {
      if (Number(keyword) === item.id) {
        totalScore += 50;
        tag.searchTag.isAbsoluteMatches = true;
        return Object.assign(item, tag);
      }
      let pos;
      pos = item.name?.indexOf(keyword);
      if (pos >= 0) totalScore += (pos === 0 ? 4 : 2) * (1 + 2 * keyword.length / item.name.length);
      pos = item.englishName?.indexOf(keyword);
      if (pos >= 0) totalScore += (pos === 0 ? 2 : 1) * (1 + 2 * keyword.length / item.englishName.length);
    });

    // 至少匹配到一个关键词才会出现在检索结果
    if (totalScore) {
      // 提升原版物品权重
      if (item.classID === 1) {
        totalScore += 5;
        tag.searchTag.isModVanilla = true;
      }

      if (typeof nClassID) {
        let classID = Number(nClassID);
        // 提升本模组物品权重
        if (item.classID === classID) {
          totalScore += 10;
          tag.searchTag.isModMatches = true;
        }

        // 提升前置与附属模组物品权重
        if (this.parent.utils.getConfig(item.classID, "modDependences_v2")?.includes(classID)) {
          totalScore += 7;
          tag.searchTag.isModDependenceMatches = true;
        }
        else if (this.parent.utils.getConfig(item.classID, "modExpansions_v2")?.includes(classID)) {
          totalScore += 7;
          tag.searchTag.isModExpansionMatches = true;
        }
      }
    }

    tag.searchTag.matchScore += totalScore;
    return Object.assign(item, tag);
  }

};

class GTCEu {
  static voltageName = ["ULV", "LV", "MV", "HV", "EV", "IV", "LuV", "ZPM", "UV", "UHV", "UEV", "UIV", "UXV", "OpV", "MAX"];
  static voltageColor = [8, 7, 11, 6, 5, 1, 13, 12, 3, 4, 2, 10, 14, 9, 12];
  static isVoltageBold = tier => tier > 12;
  static getTierByVoltage = voltage => Math.max(Math.min(Math.ceil(Math.log2(voltage) / 2 - 1.5), 14), 0);
  static getMaxVoltageByTier = tier => Math.pow(4, tier) * 8;

  static getHTMLByVoltage = function (voltage) {
    let tier = this.getTierByVoltage(voltage);
    return `<span style="color: #${McmodderValues.formatColors[this.voltageColor[tier]]};${this.isVoltageBold(tier) ? " font-weight: bold;" : ""}">${this.voltageName[tier]}</span>`;
  }

  static getHTMLWithPercentageByVoltage = function (voltage) {
    let tier = this.getTierByVoltage(voltage);
    let percentage = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(voltage / this.getMaxVoltageByTier(tier));
    return `${percentage}A${this.getHTMLByVoltage(voltage)}`;
  }

  static singleOverclock = function (e) {
    if (e.duration > 1) {
      let multiplier = e.isPerfect ? 0.25 : 0.5;
      e.EUt = e.EUt * 4;
      e.duration = Math.max(Math.floor(e.duration * multiplier), 1);
    }
  }

  static overclock = function (e, tierFrom, tierTo) {
    for (let i = tierFrom; i < tierTo; i++) this.singleOverclock(e);
  }
}

class GTCEuEnergyFrame {
  constructor(node) {
    this.$instance = $(node).first();
    this.instance = this.$instance.get(0);
    this.power = this.EUt = this.duration = 0;

    let instance = this.$instance;
    instance.find("p").each((i, c) => {
      let t = c.textContent.split(": ");
      let key = t[0];
      let value = parseFloat(t[1].replaceAll(",", ""));
      if (["总耗电"].includes(key)) {
        this.powerName = key;
        this.powerNode = c;
        this.power = value;
      }
      else if (["消耗功率", "需求电压"].includes(key)) {
        this.EUtName = key;
        this.EUtNode = c;
        this.EUt = value;
      }
      else if (["耗时"].includes(key)) {
        this.durationName = key;
        this.durationNode = c;
        this.duration = parseInt(value * 20);
      }
    });
    if (!(this.powerNode && this.EUtNode && this.durationNode)) return;
    this.$instance.attr({
      "data-toggle": "tooltip",
      "data-html": "true",
      "data-original-title": `最低: ${GTCEu.getHTMLByVoltage(this.EUt)}<br>左键单击增加超频等级<br>右键单击降低超频等级<br>按住Shift以无损超频显示`
    }).on({
      "click": e => {
        let isPerfect = McmodderUtils.isKeyMatch({ shiftKey: true }, e);
        this.nTier = Math.min(this.nTier + 1, 14);
        this.update(this.nTier, isPerfect);
      },
      "contextmenu": e => {
        e.preventDefault();
        let isPerfect = McmodderUtils.isKeyMatch({ shiftKey: true }, e);
        this.nTier = Math.max(this.nTier - 1, this.tier);
        this.update(this.nTier, isPerfect);
      }
    })
    McmodderUtils.updateAllTooltip();

    this.nPower = this.power;
    this.nEUt = this.EUt;
    this.nDuration = this.duration;
    this.nTier = this.tier = GTCEu.getTierByVoltage(this.EUt);

    this.update();
  }

  update(tier = this.nTier, isPerfect = false) {
    let e = {
      EUt: this.EUt,
      duration: this.duration,
      isPerfect: isPerfect
    };
    GTCEu.overclock(e, this.tier, tier);
    this.nPower = e.EUt * e.duration;
    this.nEUt = e.EUt;
    this.nDuration = e.duration;
    this.powerNode.innerHTML = `${this.powerName}: ${this.nPower.toLocaleString()} EU`;
    this.EUtNode.innerHTML = `${this.EUtName}: ${this.nEUt.toLocaleString()} EU/t (${GTCEu.getHTMLWithPercentageByVoltage(this.nEUt)})`;
    this.durationNode.innerHTML = `${this.durationName}: ${(this.nDuration / 20).toLocaleString()} 秒`;
  }
}

class draggableFrame {
  constructor(node) {
    this.$instance = $(node);
    this.instance = node.get(0);
    this.dragging = false;

    this.$instance.addClass("mcmodder-draggable");

    this.$instance.bind({
      'mousedown': e => this.onMousedown(e)
    });
    $(document).bind({
      'mousemove': e => this.onMousemove(e),
      'mouseup': e => this.onMouseup(e)
    });
  }

  onMousedown(e) {
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.offsetX = e.offsetX;
    this.offsetY = e.offsetY;
  }

  onMousemove(e) {
    if (!this.dragging) return;
    this.$instance.css({
      "left": (this.startX - this.offsetX) + (e.clientX - this.startX) + 'px',
      "top": (this.startY - this.offsetY) + (e.clientY - this.startY) + 'px'
    });
  }

  onMouseup(e) {
    this.dragging = false;
  }
}

class HorizontalDraggableFrame {
  constructor(attr = {}, parent = document.body, config = {}) {
    this.$instance = $("<div>").appendTo(parent);
    this.instance = this.$instance.get(0);
    if (typeof attr === "Object") Object.keys(attr).forEach(e => this.$instance.attr(e, attr[e]));
    this.$instance.addClass("mcmodder-horizontal-divider");
    this.parent = parent;
    $(this.parent).css("position", "relative");
    this.dragging = false;
    this.dragStartPos = this.dragPos = 0;
    this.initPos = config.initPos ? config.initPos : 0.5;
    this.setHorizontalPos(this.initPos);
    this.originalPos = parseInt(this.$instance.css("left"));
    this.leftBindNode = this.rightBindNode = null;
    this.leftCollapseThreshold = config.leftCollapseThreshold === undefined ? 0.3 : config.leftCollapseThreshold;
    this.rightCollapseThreshold = config.rightCollapseThreshold === undefined ? 0.7 : config.rightCollapseThreshold;
    this.leftDraggableLimit = config.leftDraggableLimit === undefined ? 0 : config.leftDraggableLimit;
    this.rightDraggableLimit = config.rightDraggableLimit === undefined ? 1 : config.rightDraggableLimit;
    this.$instance.mousedown(e => {
      this.dragging = true;
      this.dragStartPos = e.screenX - this.parent.getBoundingClientRect().left;
    });
    $(this.parent).bind({
      "mousemove": e => {
        if (!this.dragging) return;
        e.preventDefault();
        this.dragPos = e.screenX - this.parent.getBoundingClientRect().left;
        this.setHorizontalPosByWidth();
        let r = (this.originalPos - this.dragStartPos + this.dragPos) / this.getParentWidth();
        if (r <= this.leftCollapseThreshold) r = 0;
        else if (r >= this.rightCollapseThreshold) r = 1;
        this.setHorizontalPos(r);
      },
      "mouseup": e => {
        if (!this.dragging) return;
        this.dragging = false;
        this.originalPos = parseInt(this.$instance.css("left"));
      }
    });
  }

  setHorizontalPosByWidth(pos) {
    return this.setHorizontalPos(pos / this.getParentWidth());
  }

  setHorizontalPos(pos) {
    pos = Math.min(this.rightDraggableLimit, Math.max(this.leftDraggableLimit, pos));
    this.horizontalPos = pos;
    this.$instance.css("left", pos * 100 + "%");
    if (this.leftBindNode) {
      this.leftBindNode.css("width", this.getLeftWidth() / this.getParentWidth() * 100 + "%");
      if (this.horizontalPos <= this.leftCollapseThreshold) this.leftBindNode.hide();
      else this.leftBindNode.show();
    }
    if (this.rightBindNode) {
      this.rightBindNode.css("width", this.getRightWidth() / this.getParentWidth() * 100 + "%");
      if (this.horizontalPos >= this.rightCollapseThreshold) this.rightBindNode.hide();
      else this.rightBindNode.show();
    }
    return this;
  }

  updateHorizontalPos() {
   return this.setHorizontalPos(this.horizontalPos);
  }

  getParentWidth() {
    return this.parent.getBoundingClientRect().width;
  }

  getSelfWidth() {
    return this.instance.getBoundingClientRect().width;
  }

  getLeftWidth() {
    return this.instance.getBoundingClientRect().left - this.parent.getBoundingClientRect().left;
  }

  getRightWidth() {
    return this.parent.getBoundingClientRect().right - this.instance.getBoundingClientRect().right;
  }

  bindLeft(node, isAbsolute = false) {
    this.leftBindNode = node;
    this.leftBindNode.insertBefore(this.instance);
    node.addClass("mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""))
      .addClass("mcmodder-horizontal-flex-left");
    return this.updateHorizontalPos();
  }

  bindRight(node, isAbsolute = true) {
    this.rightBindNode = node;
    this.rightBindNode.insertBefore(this.instance);
    node.addClass("mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""))
      .addClass("mcmodder-horizontal-flex-right");
    return this.updateHorizontalPos();
  }

  expandIfCollapsed() {
    if (this.horizontalPos <= this.leftDraggableLimit || this.horizontalPos >= this.rightDraggableLimit) {
      this.setHorizontalPos(this.initPos);
    }
    return this;
  }
}

class McmodderUEditor {
  constructor(editor, parent) {
    this.parent = parent;
    editor.ready(() => this.init());
  }

  init() {
    let iframe = editor.iframe;

    this.editor = editor;
    this.outerFrame = $(iframe).parents("#editor-ueeditor").get(0);
    this.$outerFrame = $(this.outerFrame);
    this.frame = this.outerFrame.childNodes.item(0);
    this.toolbar = this.$outerFrame.find(".edui-toolbar");
    this.iframe = iframe;
    this.$iframe = $(this.iframe);
    this.iframeHolder = this.iframe.parentNode;
    this.window = editor.window;
    this.$window = $(this.window);
    this.document = editor.document;
    this.$document = $(this.document);
    this.head = this.document.head;
    this.body = this.document.body;
    this.$head = $(this.head);
    this.$body = $(this.body);

    this.parent.ueditorFrame.push(this);
    if (this.isNightMode) this.parent.ueditorFrame.forEach(e => {
      McmodderUtils.addStyle(this.css.night, "mcmodder-night-controller", e);
      $("html", e).addClass("dark");
    });

    // 现代化按钮
    if (this.parent.utils.getConfig("mcmodderUI")) {
      let toolBar = this.$outerFrame.find(".edui-editor-toolbarboxinner");
      for (let i = 0; i < McmodderValues.ueButton1.length; i++)
        toolBar.find(`.edui-for-${McmodderValues.ueButton1[i]} .edui-icon`)
          .addClass("mcmodder-edui-box fa fa-" + McmodderValues.ueButton2[i])
          .css("background-image", "none");
      toolBar.find(".edui-arrow").addClass("mcmodder-edui-arrow fa fa-caret-down").css("background-image", "none");
    }

    // 宽度自适应
    window.addEventListener("resize", () => this.widthAutoResize());
    window.dispatchEvent(new Event("resize"));

    this.updateEditorStats();

    this.$document.find("body").off("keydown").bind({
      keyup: () => this.updateEditorStats(),
      paste: () => this.updateEditorStats(),
      dragover: () => this.updateEditorStats()
    });
  }

  isEditorFullScreen() {
    return this.$outerFrame
    .find(".edui-editor")
    .prop("style")
    .getPropertyValue("position") === "absolute";
  }

  resizeHeight(height) {
    this.frame?.style?.setProperty("height", (height + $("#edui1_toolbarbox").get(0).offsetHeight) + "px", "important");
    this.iframeHolder?.style?.setProperty("height", height + "px", "important");

    // this.editor.setHeight(height);
  }

  heightAutoResize() {
    let height = 50;
    if (this.$body.children().length) {
      let rect = this.$body.children().last().get(0).getBoundingClientRect();
      height += rect.top + rect.height + this.window.pageYOffset;
    }
    /* this.$body.children().each((_, e) => {
      let cs = getComputedStyle(e);
      height += (e.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + 0.2);
    }); */
    height = Math.max(height, 120);
    this.resizeHeight(height);
  }

  widthAutoResize() {
    const checked = $("#mcmodder-option-md").prop("checked");
    $("#mcmodder-mdeditor, #editor-ueeditor").css("width", checked ? "50%" : "100%");
    $("#edui1, #edui1_iframeholder").css("width", "100%");
  }

  updateEditorStats() {
    this.heightAutoResize();
  }
}

class McmodderAdvancedUEditor extends McmodderUEditor {
  constructor(editor, parent) {
    super(editor, parent);
  }

  init() {
    super.init();

    this.editToolsBar = this.$outerFrame.parent().find(".edit-tools");
    this.optionBar = $(`<div class="mcmodder-option-bar"></div>`).insertAfter(this.editToolsBar);
    this.toolBar = $(`<div class="mcmodder-tool-bar"></div>`).insertAfter(this.optionBar);

    // Markdown 转 HTML
    this.mdEditor = $('<textarea id="mcmodder-mdeditor" class="form-control mcmodder-monospace" placeholder="Markdown 编辑区域...">');
    this.mdEditor.hide().insertBefore(this.$outerFrame);

    $('<button id="mcmodder-tool-md" class="btn btn-outline-dark btn-sm">Markdown → HTML</button>')
      .hide()
      .appendTo(this.toolBar)
      .click(() => this.performMarkdownIt());
    this.statsBar = $();

    let itemSourceList = [];
    this.parent.utils.getConfig("jsonDatabase")?.forEach(fileName => {
      itemSourceList = itemSourceList.concat(this.parent.utils.getConfig(fileName, "mcmodderJsonStorage", []));
    })
    this.autoLink = new McmodderAutoLink(this, itemSourceList);

    this.template = new McmodderTemplate(this);

    // 内置样式
    McmodderUtils.addStyle("pre {font-family: Consolas, monospace; box-shadow: inset rgba(50, 50, 100, 0.4) 0px 2px 4px 0px;}", this.document);

    // 快速提交
    this.$document.keydown(e => this.fastSubmitOverride(e));

    // 高度自适应 + 编辑量实时统计
    this.autoUpdateEditorStats = this.parent.utils.getConfig("editorStats");
    if (this.autoUpdateEditorStats > 0) {
      if (!$(".edit-tools").length && $(".post-row").length) {
        $("div.col-lg-12.left").remove();
        $("div.col-lg-12.right").css("padding-left", "0px");
        this.statsBar = $('<span style="font-size: 12px; margin-top: 10px; position: relative;">').appendTo($(".post-row").first());
      }
      else this.statsBar = $("<span>").appendTo($(".edit-tools").first());
      this.statsBar.attr('class', 'mcmodder-editor-stats')
        .html(`<i class="fa fa-edit"></i>
          <span id="current-text" class="mcmodder-common-dark" style="margin-right: 0px">0</span>
          <span style="margin-right: 0px">&nbsp;字节</span>
          <i class="fa fa-line-chart" style="margin-left: .8em;"></i>
          <span id="changed-text" class="mcmodder-common-light" style="margin-right: 0px">--</span>
          <span style="margin-right: 0px">&nbsp;字节</span>`
        );

      // 正文编辑量统计
      this.originalTextLength = 0;
      this.currentTextLength = 0;
      this.changedTextLength = 0;

      this.currentTextNode = this.statsBar.find("#current-text");
      this.changedTextNode = this.statsBar.find("#changed-text");

      this.calculateBytes();
      this.updateOriginalTextLength();
      this.currentTextNode.click(() => this.manualTriggerStatsUpdate());
    }

    // 格式化代码颜色
    this.$outerFrame.on("click", ".edui-for-forecolor .edui-arrow", function () {
      if ($("#mcmodder-format-column").length) return;

      this.colorpickerInit();
    });

    // 全屏背景不再透明
    this.$outerFrame.find(".edui-for-fullscreen").children().click(() => {
      if (this.isEditorFullScreen())
        McmodderUtils.addStyle("#editor-ueeditor > .edui-editor {background-color: var(--mcmodder-bgn);}", "mcmodder-fullscreen-style");
      else
        $("#mcmodder-fullscreen-style").remove();
    });

    if (!this.editToolsBar.length && $(".post-row").length) {
      $(".post-row").get(0).insertBefore($(".post-row > .mcmodder-editor-stats").get(0), $(".post-row > #editor-ueeditor").get(0));
    }

    /* $('<button id="mcmodder-tool-pangu" data-toggle="tooltip" data-original-title="有研究表明，打字的时候不喜欢在中文和英文之间加空格的人，感情路都走得很辛苦，有七成的比例会在 34 岁的时候跟自己不爱的人结婚，而剩下三成的人最后只能把遗产留给自己的猫。" class="btn btn-outline-dark btn-sm">中英间插入空格</button>').appendTo(".mcmodder-tool-bar").click(async () => {
      if (!$(editorDoc).find("#mcmodder-script-pangu").length) await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/pangu@7.2.0/dist/browser/pangu.umd.min.js", null, "mcmodder-script-pangu");

      let e = editorDoc.body.contentEditable;
      editorDoc.body.contentEditable = false;
      editorWin.pangu.spacingPage();
      if (e === "true") editorDoc.body.contentEditable = true;
    }); */

    $(`<div class="checkbox" data-toggle="tooltip" data-original-title="通过外部库 markdown-it，实现一键 Markdown→HTML 转换。">
      <input type="checkbox" id="mcmodder-option-md" name="mcmodder-option-md">
      <label for="mcmodder-option-md">Markdown 编辑模式</label>
    </div>`).appendTo(".mcmodder-option-bar");

    $("#mcmodder-option-md").click(() => this.readyMarkdownIt());

    this.isModrinthVer = window.location.href.includes("?mrid=");
    if (this.parent.utils.getConfig("markdownIt") || this.isModrinthVer) $("#mcmodder-option-md").click(); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启

    // 匿名吐槽
    if (this.parent.utils.getConfig("anonymousUknowtoomuch"))
      this.anonymiseUknowtoomuch();
  }

  widthAutoResize() {
    super.widthAutoResize();
    this.mdEditor?.css("height", this.$outerFrame.css("height"));
  }

  resizeHeight(height) {
    super.resizeHeight(height);
    this.mdEditor?.get(0)?.style?.setProperty("height", $("#editor-ueeditor").css("height"), "important");
  }

  async readyMarkdownIt() {
    let c = $("#mcmodder-option-md").prop("checked");
    if (c) {
      // await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js", null, "mcmodder-script-md");
      if (!this.$document.find("#mcmodder-script-md").length)
        await McmodderUtils.loadScript(this.head, null, "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.1/markdown-it.min.js", null, "mcmodder-script-md");
      if (this.isModrinthVer) $("#mcmodder-tool-md").click();
      $("#mcmodder-tool-md, #mcmodder-mdeditor").show();
      this.$outerFrame.css("width", "50%");
    }
    else {
      $("#mcmodder-tool-md, #mcmodder-mdeditor").hide();
      this.$outerFrame.css("width", "100%");
    }
    this.parent.utils.setConfig("markdownIt", c ? "true" : "false");
    window.dispatchEvent(new Event("resize"));
    this.updateEditorStats();
  }

  performMarkdownIt() {
    // 预处理
    // this.mdEditor.find("p > br").remove();
    let content = this.mdEditor.val().split("\n");
    content = content.map(c => {
      for (let i = 1; i < 6; i++)
        if (c.slice(0, i + 1) === "#".repeat(i) + " ")
          return `[h${i}=${c.slice(i + 1)}]`;
      return c;
    });

    const md = this.window.markdownit();
    const htmlOutput = md.render(content.join("\n"));
    this.body.innerHTML = htmlOutput;

    // 后期检测
    this.$document.find("pre").each((i, c) => {
      $(c).html($(c).text());
      if (!c.classList.length) McmodderUtils.commonMsg("转换结果中出现代码块 (pre)，记得设置相应语言~")
    });
    this.$document.find("blockquote").css("border", "3px solid red").each(() =>
      McmodderUtils.commonMsg("转换结果中出现不受支持的引用块 (blockquote)，请适当调整~", false)
    );

    this.updateEditorStats();
  }

  isEditorLocked() {
    return $(".edit-user-alert.locked").length ? true : false;
  }

  colorpickerInit() {
    let colorpicker = $(".edui-colorpicker tbody");

    // 格式化代码颜色
    let l = McmodderValues.formatColors.length;
    let s = `<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default">
      <td colspan="10" class="edui-default" id="mcmodder-format-column">
        <a target="_blank" href="https://zh.minecraft.wiki/w/%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81#%E9%A2%9C%E8%89%B2%E4%BB%A3%E7%A0%81">格式化代码颜色</a>
      </td>
    </tr>`;
    for (let i = 0; i < l; i += 10) {
      s += '<tr class="edui-default">';
      for (let j = i; j < Math.min(i + 10, l); j++)
        s += `<td style="padding: ${j < 10 ? "6px 2px 0 2px" : "0 2px"};" class="edui-default"><a hidefocus="" title="§${j.toString(16)} - ${McmodderValues.formatColors[j]}" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#${McmodderValues.formatColors[j]}" style="background-color:#${McmodderValues.formatColors[j]};border:solid #ccc;border-width:1px;"></a></td>`
      s += '</tr>';
    }
    $(s).appendTo(colorpicker);

    // 自定义颜色
    /* $('<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default"><td colspan="10" class="edui-default" id="mcmodder-custom-column">自定义颜色</td></tr><tr class="edui-default"><td style="padding: 6px 2px 0 2px;" class="edui-default"><input id="mcmodder-customcolor-input"><a id="mcmodder-customcolor-select" hidefocus="" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#000000" style="background-color:#000000;border:solid #ccc;border-width:1px;"></a></td></tr>').appendTo(colorPicker).find("#mcmodder-customcolor-input").change(e => {
      let val = e.target.value;
      if (/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(val)) {
        if (val[0] != "#") val = "#" + val;
        $("#mcmodder-customcolor-select").attr("data-color", val).attr("title", val).css("background-color", val);
      }
    }); */
  }

  updateTextLengthDisplay() {
    let changedTextLength = this.currentTextLength - this.originalTextLength;
    this.currentTextNode.html(this.currentTextLength.toLocaleString());
    this.changedTextNode.attr("class", (changedTextLength < 0 ? "mcmodder-common-danger" : "mcmodder-common-light"))
      .html((changedTextLength > 0 ? "+" : "") + changedTextLength.toLocaleString());
    let t = this.statsBar.contents().filter(i => i > 4);
    if (changedTextLength) t.show();
    else t.hide();
  }

  updateCurrentTextLength(length) {
    this.currentTextLength = length;
    this.updateTextLengthDisplay();
  }

  async updateOriginalTextLength() {
    if (!this.isEditorLocked()) {
      this.originalTextLength = this.currentTextLength;
      this.updateTextLengthDisplay();
      return;
    }

    // 根据先前的正文数据计算字节变化量
    const commonNav = $(".common-nav > ul");
    this.changedTextNode.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    const url = commonNav.children().eq(commonNav.children().length - 3).children().first().attr("href");
    const resp = await this.parent.utils.createAsyncRequest({
      url: url,
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      anonymous: true
    });
    const doc = $(resp.responseXML);
    const textArea = doc.find(".text-area.common-text").first() || doc.find(".item-content.common-text").first();
    textArea.find(".figure").remove();
    const t1 = textArea.children().filter((_, c) => this.isNodeCountableForBytes(c));
    const t2 = this.$body.children();
    let ta = "", tb = "";
    this.originalTextLength = 0;
    t1.each((_, e) => {
      ta += e.textContent + "\n";
      this.originalTextLength += McmodderUtils.getContextLength(e.textContent);
    });
    t2.each((_, e) => {
      let t = McmodderUtils.clearContextFormatter(e.textContent);
      if (t) tb += t + "\n";
    });
    this.updateTextLengthDisplay();
    (new TextCompareFrame($(".tab-content").first(), ta, tb)).performCompare();
    // this.updateEditorStats();
  }

  isNodeCountableForBytes(node) {
    if (!node.textContent) return false;
    if (node.className === "common-text-menu") return false;
    if (node.id.slice(0, 5) === "link_") return false;
    if (node.tagName === "SCRIPT") return false;
    if ($(node).attr("style") === "text-align:center;color:#888;width:100%;float:left;font-size:14px;") return false;
    return true;
  }

  updateEditorStats() {
    if (!this.isEditorFullScreen()) this.heightAutoResize();
    if (this.currentTextLength <= this.autoUpdateEditorStats)
      this.calculateBytes();
  }

  manualTriggerStatsUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStats)
      this.calculateBytes();
  }

  calculateBytes() {
    let contextLength = 0;
    $(this.body).contents()
      .filter((index, content) => content.tagName != "PRE")
      .each((i, c) => {
        contextLength += McmodderUtils.getContextLength(c.textContent);
      });
    this.updateCurrentTextLength(contextLength);
  }

  anonymiseUknowtoomuch() {
    baidu.editor.commands.uknowtoomuch.execCommand = function () {
      let b, a = editor.selection.getRange();
      return a.select(), (b = editor.selection.getText()) ?
        (editor.execCommand("insertHtml", `<span class="uknowtoomuch">${b}</span>`, true), void 0) :
        (McmodderUtils.commonMsg(PublicLangData['warning']['inform'][164], false), void 0);
    }
  }

  showAutoLinkList() {
    this.autoLink.init();
  }

  fastSubmitOverride(e) {
    bindFastSubmit(e);
    if (this.parent.utils.isKeyMatchConfig("keybindFastLink", e)) {
      e.preventDefault();
      this.showAutoLinkList();
    };
    if ($(".common-menu-area").length > 0 && (McmodderUtils.isKeyMatch({ keyCode: 33 }, e) || McmodderUtils.isKeyMatch({ keyCode: 34 }, e))) {
      $(".common-menu-area").hide();
      setTimeout(function () {
        $(".common-menu-area").show();
      }, 0);
    }
  }
}

class TextCompareFrame {
  constructor(insertPos, textA, textB) {
    this.insertPos = insertPos;
    this.instance = $('<div id="mcmodder-text-area">').insertBefore(this.insertPos);
    this.statsNode = $('<div class="mcmodder-text-stats">').appendTo(this.instance);
    this.delCounter = $('<span class="stats-del">').appendTo(this.statsNode);
    this.insCounter = $('<span class="stats-ins">').appendTo(this.statsNode);
    this.resultFrame = $('<pre id="mcmodder-text-result">').appendTo(this.instance);

    this.textA = (textA instanceof Object) ? this.getRawContent(textA) : textA;
    this.textB = (textB instanceof Object) ? this.getRawContent(textB) : textB;

    /*
    if ($(".verify-info-table").length) {
      let textTr = $(".verify-info-table > tbody").contents().filter((i, c) => $(c).children().text().includes("介绍"));
      text_a = textTr.find("td:nth-child(3) .common-text");
      text_b = textTr.find("td:nth-child(2) .common-text");
    } else if ($(".difference-info").length) {
      text_a = $(".difference-content-right");
      text_b = $(".difference-content-left");
    } else if ($(".edit-user-alert.locked").length) {
      text_a = ta;
      text_b = tb;
    }
    if (text_a && text_b) {
      compareResult.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    }
    */
  }

  getRawContent(l) {
    let s = "";
    l.contents().filter((_, c) =>
      !/^[\s\n]*$/.test(c.textContent) &&
      c.tagName != "SCRIPT" &&
      c.className != "common-text-menu" &&
      c.className != "common-tag-ban"
    ).each((_, e) => {
      s += (e.textContent + "\n")
    });
    return s;
  }

  getDefaultMode(len1, len2) {
    if (len1 + len2 > 5e4) return "diffLines";
    if (len1 + len2 > 1.5e4) return "diffWords";
    return "diffChars";
  }

  static modeName = {
    "diffLines": "按行对比",
    "diffWords": "按词对比",
    "diffChars": "按字对比"
  }

  async ready() {
    if (this.isReady) return;
    await McmodderUtils.loadScript(document.head, null, "https://kmcha.com/static/js/diff.js"); // https://github.com/kpdecker/jsdiff
    this.isReady = true;
  }

  async performCompare() {

    this.resultFrame.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    await this.ready();

    let mode = this.getDefaultMode(this.textA.length, this.textB.length);
    let diff = JsDiff[mode](this.textA, this.textB); // 避免正文对比耗费过长的时间
    let del_num = 0, ins_num = 0, del_byte = 0, ins_byte = 0;

    let fragment = document.createDocumentFragment();
    for (let i in diff) {
      if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
        let swap = diff[i];
        diff[i] = diff[i + 1];
        diff[i + 1] = swap;
      }

      let node;
      if (diff[i].removed) {
        node = document.createElement('del');
        node.appendChild(document.createTextNode(diff[i].value));
        del_num++; del_byte += (new TextEncoder()).encode(node.textContent).length;
      } else if (diff[i].added) {
        node = document.createElement('ins');
        node.appendChild(document.createTextNode(diff[i].value));
        ins_num++; ins_byte += (new TextEncoder()).encode(node.textContent).length;
      } else {
        node = document.createTextNode(diff[i].value);
      }
      fragment.appendChild(node);
    }

    this.resultFrame.empty().text("");
    if (del_num || ins_num) this.resultFrame.get(0).appendChild(fragment);
    else {
      this.instance.hide();
      return;
    }
    if (del_num) this.delCounter.html(`<span class="mcmodder-slim-danger">删除: <strong>${del_num.toLocaleString()}</strong> 处 (<strong>${del_byte.toLocaleString()}</strong> 字节)</span>`);
    if (ins_num) this.insCounter.html(`<span class="mcmodder-slim-dark">新增: <strong>${ins_num.toLocaleString()}</strong> 处 (<strong>${ins_byte.toLocaleString()}</strong> 字节)</span>`);
    if (mode != "diffChars") $(`<span style="font-size: 12px; color: gray">*正文过长，将${TextCompareFrame.modeName[mode]}而非${TextCompareFrame.modeName["diffChars"]}，以节省性能~</span>`).appendTo(compareStats);
  }
}

class McmodderTemplate {

  constructor(editor) {
    this.editor = editor;
    this.parent = this.editor.parent;

    // 旧版本遗留修复
    let legacyList = this.parent.utils.getConfig("templateList");
    if (legacyList) {
      GM_setValue("templateList", legacyList);
      this.utils.setConfig("templateList", "");
    }

    // 初始化模板配置
    if (!GM_getValue("templateList") || !this.parent.utils.getAllConfig("templateList", []).length) GM_setValue("templateList", JSON.stringify([{
      id: "general_armor",
      title: "套装/盔甲/铠甲/XX套",
      description: "适用于将“头盔”、“胸甲”、“护腿”、“靴子”综合到同一个父资料中一起介绍时使用。",
      content: `<p><br/></p>
      <table width="435">
        <tbody>
          <tr>
            <th style="word-break: break-all;" valign="top" align="center">装备部位<br/></th>
            <th style="word-break: break-all;" valign="top" align="center">提供盔甲值<br/></th>
            <th style="word-break: break-all;" valign="top" align="center">提供盔甲韧性<br/></th>
            <th style="word-break: break-all;">特殊属性<br/></th>
          </tr>
          <tr>
            <td style="word-break: break-all;" valign="middle" align="center">头盔</td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
            <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
          </tr>
          <tr>
            <td style="word-break: break-all;" valign="middle" align="center">胸甲<br/>
            </td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
            <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
          </tr>
          <tr>
            <td style="word-break: break-all;" valign="middle" align="center">护腿<br/></td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
            <td colspan="1" rowspan="1" valign="middle" align="center">-<br/></td>
          </tr>
          <tr>
            <td style="word-break: break-all;" valign="middle" align="center">靴子<br/></td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
            <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td
            <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
          </tr>
        </tbody>
      </table>`
    }]));

    this.list = this.parent.utils.getAllConfig("templateList", []);
  }

  init() {
    $(".group li").remove();
    this.list.forEach(item => {
      let d = item.description ? `<p>${item.description}</p>` : "";
      $(".group ul").append(`
        <li data-tag="${item.id}">
          <p class="title">${item.title}</p>
          ${d}
          <a style="position: absolute; right: .5em; top: .5em;" class="mcmodder-slim-danger">
            <i class="fa fa-trash" />
          </a>
        </li>`);
    });
    $(".group li").click(e => this.load(e.currentTarget.getAttribute("data-tag")));
    $(".group li a").click(e => this.delete(e.currentTarget.parentNode.getAttribute("data-tag")));
    $(".group ul").prepend(`
      <li>
        <input id="template-title" class="form-control title" placeholder="新模板标题... (必填)">
        <input id="template-description" class="form-control" placeholder="新模板介绍...">
        <button id="mcmodder-add-template" class="btn btn-sm btn-dark">新建模板</button>
      </li>`);
    $("#mcmodder-add-template").click(() => this.add());

    this.newTitle = $("#template-title").hide();
    this.newDescription = $("#template-description").hide();

    this.search = $('<input id="mcmodder-template-search" class="form-control" placeholder="搜索..">')
      .insertAfter(".common-template-frame .input-group")
      .bind("change", () => {
        let s = $(".common-template-frame .form-control").val().trim().split(" ");
        $(".common-template-frame .group li").each((i, c) => {
          let flag = false;
          if (!$(c).find("#mcmodder-add-template").length) s.forEach(d => {
            if (!c.textContent.includes(d)) flag = true;
          });
          flag ? $(c).hide() : $(c).show();
        });
      });
  }

  add() {
    if (this.newTitle.val()) {
      this.list.push({
        id: McmodderUtils.randStr(),
        title: this.newTitle.val(),
        description: this.newDescription.val(),
        content: editor.getContent()
      });
      GM_setValue("templateList", JSON.stringify(this.list));
      this.editor.$outerFrame.find(".edui-for-mctemplate .edui-button-body").click();
    }
    else {
      this.newTitle.show();
      this.newDescription.show();
    }
  }

  delete(id) {
    this.list = this.list.filter(item => item.id != id);
    GM_setValue("templateList", JSON.stringify(this.list));
    this.editor.$outerFrame.find(".edui-for-mctemplate .edui-button-body").click();
  }

  load(id) {
    this.list.forEach(item => {
      if (id === item.id)
        $(".common-template-frame .input-group input").prop("checked") ?
          editor.execCommand("insertHtml", item.content) :
          editor.setContent(item.content);
      swal.close();
      this.editor.$body.trigger("keyup");
    });
  }
}

class McmodderTimer {

  static CLASSNAME = "mcmodder-timer";

  static DATAGETTER_SCHEDULE = (id, user, list) => () => list.find(id, user)?.time || 0;
  static DATAGETTER_CONSTANT = time => () => time;

  constructor(parent, dataGetter, updateInterval = 1000) {
    this.parent = parent;
    this.dataGetter = dataGetter;
    this.$instance = $("<span>").attr("class", McmodderTimer.CLASSNAME).html("-");

    this.eventID = setInterval(() => {
      this.update();
    }, updateInterval);
  }

  update() {
    let time = this.dataGetter();
    this.$instance.html(time ? McmodderUtils.getFormattedTime(time - Date.now()) : "-");
  }

}

class VersionHelper {

  static captchaAttemptMaxLimit = 2;
  static captchaAttemptInterval = 5000;

  constructor(parent) {
    this.versionList = this.getVersionList();
    this.parent = parent;

    this.menu = $(`<div class="version-menu">
      <fieldset>
        <legend>从其他网站获取版本列表</legend>
        <div class="bd-callout">
          <p>该功能尚不保证能够准确对应版本列表与百科现有日志的版本号，对比结果仅供参考，提交日志前请仔细检查各信息是否正确~</p>
          <p>添加时请注意：新增日志的版本号格式应尽可能与现有日志统一。例如，若其他版本号有前缀“v”，则新建日志的版本号也应带此前缀~</p>
        </div>
        <input id="mcmodder-fetch-version-cf" class="form-control" placeholder="输入 CFID 以查询...">
        <input id="mcmodder-fetch-version-mr" class="form-control" placeholder="输入 MRID 以查询...">
        <!-- McmodderTable -->
      </fieldset>
    </div>`).insertBefore(".version-menu, .version-content-empty");

    this.table = new McmodderTable(parent, {id: "mcmodder-version-menu"}, {
      fileID: new HeadOption("文件ID"),
      releaseType: new HeadOption("发布状态"),
      displayName: new HeadOption("文件名称"),
      gameVersions: new HeadOption("支持 MC 版本"),
      releaseTime: new HeadOption("更新日期", McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN),
      mcmodVer: new HeadOption("对应日志版本号"),
      mcmodMcver: new HeadOption("对应日志支持版本"),
      mcmodDate: new HeadOption("对应日志收录日期", data => data ? data.toLocaleString() : "-"),
      options: new HeadOption("操作", (_, data) => {
        if (data.mcmodDate) return null;
        if (data.platform === 1) return `<a href="/class/version/add/${ McmodderUtils.abstractIDFromURL(window.location.href, "version") }/?cfid=${data.cfid}&fileid=${data.fileID}&ver=${VersionHelper.parseCFFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
        if (data.platform === 2) return `<a href="/class/version/add/${ McmodderUtils.abstractIDFromURL(window.location.href, "version") }/?mrid=${data.mrid}&fileid=${data.fileID}&ver=${VersionHelper.parseMRFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
      })
    });
    this.table.$instance.appendTo(this.menu.find("fieldset"));

    this.fetchCF = this.menu.find("#mcmodder-fetch-version-cf");
    this.fetchMR = this.menu.find("#mcmodder-fetch-version-mr");

    this.table.hide();

    let fetched = false;
    this.fetchCF.focus(() => {
      if (!fetched) {
        this.autoFillFetchID();
        fetched = true;
      }
    }).focusout(() => {
      const cfid = this.fetchCF.val().trim();
      if (cfid != parseInt(cfid)) return;
      this.getCurseForgeFileList(cfid);
    });
    this.fetchMR.focus(() => {
      if (!fetched) {
        this.autoFillFetchID();
        fetched = true;
      }
    }).focusout(() => {
      const mrid = this.fetchMR.val().trim();
      if (!mrid) return;
      this.getModrinthFileList(mrid);
    });
  }

  getVersionList() {
    let versionList = [];
    $(".version-content-block").each((i, e) => {
      e.id = "mcmodder-log-" + i;
      let mcRowVer = $(e).parent().attr("data-frame"), mcver = [];
      mcver = mcRowVer.replaceAll(" ", "").split(/[\/,&\u3001]/);
      let name = $(e).find(".name").text(), date = $(e).find(".time").text();
      if (date === "未知时间") date = 0;
      versionList.push({
        date: new Date(date),
        name: name,
        mcver: mcver,
        logid: i
      });
    });
    return versionList;
  }

  autoFillFetchID() { // 自动获取 CFID / MRID
    this.parent.utils.createRequest({
      url: `https://www.mcmod.cn/class/edit/${document.location.href.split("/version/")[1].split(".html")[0]}/`,
      method: "GET",
      onload: resp => {
        let w = $(resp.responseXML);
        this.fetchCF.val(w.find("#class-cfprojectid").val().trim());
        this.fetchMR.val(w.find("#class-mrprojectid").val().trim());
      }
    });
  }

  static parseCFFileName(e) {
    return e.toLowerCase().replaceAll(/forge|fabric|\.jar|alpha|beta/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
  }

  static parseMRFileName(e) {
    return e.toLowerCase().replaceAll(/[forge|fabric|\.jar|alpha|beta]/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
  }

  getCurseForgeFileList(cfid) {
    this.table.show();
    this.table.showLoading();
    // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    let fileList = [];
    let captchaAttempt = 0;
    let work = index => {
      this.parent.utils.createRequest({
        url: `https://www.curseforge.com/api/v1/mods/${cfid}/files?pageIndex=${index}&pageSize=50&sort=dateCreated&sortDescending=true&removeAlphas=false`,
        method: "GET",
        // anonymous: true,
        onload: resp => {
          if (resp.responseXML?.title === "Just a moment...") {
            if (captchaAttempt < VersionHelper.captchaAttemptMaxLimit) {
              captchaAttempt++;
              McmodderUtils.commonMsg(`正在等待人机验证，将于 ${ McmodderUtils.getFormattedTime(VersionHelper.captchaAttemptInterval) } 后自动重试... (${ captchaAttempt }/${ VersionHelper.captchaAttemptMaxLimit })`);
              setTimeout(() => {
                work(0);
              }, VersionHelper.captchaAttemptInterval);
            } else {
              Swal.fire({
                title: "验证失败",
                text: "请手动进入 CurseForge 验证页面，并于验证成功后重试。",
                showCancelButton: true,
                confirmButtonText: "前往验证",
                cancelButtonText: "取消"
              }).then(isConfirm => {
                if (isConfirm.value) GM_openInTab("https://www.curseforge.com");
              });
            }
            return;
          }

          let data = JSON.parse(resp.responseText);
          if (index === 0) {
            this.table.loadingProgress.setMax(Math.ceil(data.pagination.totalCount / 50)).show();
          }
          fileList = fileList.concat(data.data);
          this.table.loadingProgress.setProgress(index + 1);
          if (data.pagination.totalCount > (index - 1) * 50) setTimeout(work(++index), 1e3);
          else {
            this.table.empty();
            fileList.forEach(i => {
              const releaseMap = ["-", "Release", "Beta", "Alpha"];
              let fileid = i.id, releaseType = releaseMap[i.releaseType], displayName = i.fileName, gameVersions = i.gameVersions.join(","), ver, releaseTime = new Date(i.dateCreated), mcmodVer = "未找到", mcmodMcver = "-", mcmodDate, logid, op;

              // 匹配百科已收录日志
              this.versionList.forEach(j => {
                let mcVerName = j.name, prefix = mcVerName.charAt(0);
                if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
                if (VersionHelper.parseCFFileName(displayName) === VersionHelper.parseCFFileName(mcVerName))
                  mcmodVer = j.name,
                  mcmodMcver = j.mcver.join(","),
                  mcmodDate = j.date,
                  logid = j.logid;
              });
              this.table.appendData({
                platform: 1,
                cfid: cfid,
                fileID: fileid,
                releaseType: releaseType,
                releaseTime: releaseTime,
                displayName: displayName,
                gameVersions: gameVersions,
                releaseTime: releaseTime,
                mcmodVer: mcmodVer,
                mcmodMcver: mcmodMcver,
                mcmodDate: mcmodDate,
                option: op
              });
            });
            this.table.refreshAll();
          }
        }
      });
    }
    work(0);
  }

  getModrinthFileList(mrid) {
    this.table.show();
    this.table.showLoading();
    // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    let fileList = [];
    let work = () => {
      this.parent.utils.createRequest({
        url: `https://api.modrinth.com/v2/project/${mrid}/version`,
        method: "GET",
        anonymous: true,
        onload: resp => {
          let data = JSON.parse(resp.responseText);
          fileList = fileList.concat(data);
          this.table.empty();
          fileList.forEach(i => {
            let fileid = i.id, releaseType = i.version_type, displayName = i.version_number, gameVersions = i.game_versions.join(","), ver, releaseTime = new Date(i.date_published), mcmodVer = "未找到", mcmodMcver = "-", mcmodDate, logid, op;
            releaseType = releaseType.charAt(0).toUpperCase() + releaseType.slice(1);

            // 匹配百科已收录日志
            this.versionList.forEach(j => {
              let mcVerName = j.name, prefix = mcVerName.charAt(0);
              if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
              if (VersionHelper.parseMRFileName(displayName) === VersionHelper.parseMRFileName(mcVerName))
                mcmodVer = j.name,
                mcmodMcver = j.mcver.join(","),
                mcmodDate = j.date,
                logid = j.logid
            });
            this.table.appendData({
              platform: 2,
              mrid: mrid,
              fileID: fileid,
              releaseType: releaseType,
              releaseTime: releaseTime,
              displayName: displayName,
              gameVersions: gameVersions,
              releaseTime: releaseTime,
              mcmodVer: mcmodVer,
              mcmodMcver: mcmodMcver,
              mcmodDate: mcmodDate,
              option: op
            });
          });
          this.table.refreshAll();
        }
      });
    }
    work();
  }
}

/**
 * ============ SINGLE ITEM OBJECT ============
 * id : 该物品的百科资料 ID
 * itemType : 该物品的在百科中的资料类型编号 (留空视为 1 = 物品/方块)
 * classID : 该物品在百科中所属模组 ID
 * classAbbr: 模组缩写
 * className : 该物品在百科中的所属模组主要名称
 * classEname: 模组次要名称
 * registerName : 注册名
 * metadata : (仅 1.13-) Meta ID
 * smallIcon : 小图标的 Base64 码
 * largeIcon : 大图标的 Base64 码
 * name : 主要名称
 * englishName : 次要名称
 * creativeTabName : 在百科中的资料分类 / 创造模式物品栏名称
 * branch : 在百科中所属的版本分支
 * type : 该物品是 BlockItem 则为 "Block", 否则为 "Item"
 * jumpTo : (如果是合并子资料) 合并至的父资料
 * jumpParent : 是否是合并父资料
 * generalTo : (如果是综合子资料) 综合至的父资料
 * generalParent : 是否是综合父资料
 * OredictList : 矿物词典 / 物品标签列表的序列化, 以单个逗号分隔
 * maxStackSize : 最大堆叠
 * maxDurability : 最大耐久
 * ============================================
 */

class JsonFrame {
  constructor(id, parent) {
    this.parent = parent;
    if (!GM_getValue("mcmodderJsonStorage")) GM_setValue("mcmodderJsonStorage", "{}");

    let instance = $(`
    <div id="jsonframe_${ id }" class="mcmodder-jsonframe">
      <div class="jsonframe-menu">
        <div class="jsonframe-menucontent">
          <select id="jsonframe_${ id }-select" class="jsonframe-select"></select>
          <button id="jsonframe-importClass">从模组导入JSON</button>
          <button id="jsonframe-importOnline">从收纳贴导入JSON</button>
          <label for="jsonframe_${ id }-importLocal" class="jsonframe-import-label">
            <input id="jsonframe_${ id }-importLocal" class="jsonframe-import hidden" type="file" accept="application/json">
            从本地导入JSON
          </label>
          <button id="jsonframe-rearrange">确认排序</button>
          <button id="jsonframe-saveedit">保存修改</button>
          <button id="jsonframe-rename">重命名</button>
          <button id="jsonframe-submitedit" class="btn-danger">提交所有改动至百科</button>
          <button id="jsonframe-export">保存当前文件至本地</button>
          <button id="jsonframe-deleteall" class="btn-danger">删除当前文件</button>
          <button id="jsonframe-more">更多...</button>
          </div>
        </div>
      <div class="jsonframe-menu jsonframe-fixedmenu"></div>
      <div class="jsonframe-content"></div>
    </div>`);
    instance.find("select, button, label").addClass("btn").addClass("btn-sm");

    this.id = id;
    this.$instance = instance;
    this.menu = instance.find(".jsonframe-menu:not(.jsonframe-fixedmenu)");
    this.fixedMenu = instance.find(".jsonframe-fixedmenu").hide();
    this.menuContent = this.menu.find(".jsonframe-menucontent");
    this.content = instance.find(".jsonframe-content");
    this.tools = {
      select: instance.find(`#jsonframe_${ id }-select`),
      importClass: instance.find("#jsonframe-importClass"),
      importOnline: instance.find(`#jsonframe-importOnline`),
      importLocal: instance.find(`#jsonframe_${ id }-importLocal`).hide(),
      importLocalLabel: instance.find(`#jsonframe_${ id }-importLocal`).parent().css("display", "inline-block"),
      rearrange: instance.find("#jsonframe-rearrange"),
      saveedit: instance.find("#jsonframe-saveedit"),
      rename: instance.find("#jsonframe-rename"),
      submitedit: instance.find("#jsonframe-submitedit"),
      export: instance.find("#jsonframe-export"),
      deleteall: instance.find("#jsonframe-deleteall"),
      more: instance.find("#jsonframe-more")
    }
    this.activeFileName = "";
    this.instance = instance.get(0);
    this.itemList = [];
    this.isMenuVisible = true;
    this.hasRearranged = false;

    // 与另一个RequestQueue区分开，这个专用于处理用户手动发起的数据同步请求，只适用于小规模数据
    this.manualRequestQueue = new McmodderDetailedItemListRequestQueue(this.parent);

    this.table = new McmodderEditableTable(parent, {class: "table jsonframe-table"}, {
      smallIcon: new HeadOption("小", McmodderTable.DISPLAYRULE_IMAGE_BASE64),
      largeIcon: new HeadOption("大", McmodderTable.DISPLAYRULE_IMAGE_BASE64),
      id: new HeadOption("资料 ID", McmodderTable.DISPLAYRULE_LINK_ITEM),
      branch: new HeadOption("分支"),
      relation: new HeadOption("关联", (_, data) => {
        if (data.generalParent) return `<span class="mcmodder-general"><strong>综合父资料</strong></span> <span class="text-muted">(${ data.generalNum })</span>`;
        if (data.generalTo) return `<span class="mcmodder-general">综合</span>至 <a class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${ data.generalTo }">${ data.generalTo }</a>`;
        if (data.jumpTo) return `<span class="mcmodder-jump">合并</span>至 <a class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${ data.jumpTo }">${ data.jumpTo }</a>`
        return null;
      }, true),
      name: new HeadOption("主要名称", McmodderUtils.getFormattedCodeDecoratedHTML),
      englishName: new HeadOption("次要名称", McmodderUtils.getFormattedCodeDecoratedHTML),
      creativeTabName: new HeadOption("分类"),
      type: new HeadOption("种类"),
      registerName: new HeadOption("注册名"),
      metadata: new HeadOption("元数据", McmodderTable.DISPLAYRULE_NUMBER),
      OredictList: new HeadOption("矿物词典/物品标签", data => {
        if (!data || data.charAt(0) != "[") return data;
        let res = "";
        let entries = data.slice(1, -1).split(",");
        entries.forEach(entry => {
          entry = entry.trim();
          res += `<a class="jsonframe-oredict badge" target="_blank" href="https://www.mcmod.cn/oredict/${ entry }-1.html">${ entry }</a>`;
        });
        return res;
      }),
      maxStackSize: new HeadOption("最大堆叠", McmodderTable.DISPLAYRULE_NUMBER),
      maxDurability: new HeadOption("最大耐久", McmodderTable.DISPLAYRULE_NUMBER),
    }, () => {
      this.updateToolBar();
    });

    this.table.contextMenu.addOption("syncRow", "从百科同步此行数据", e => {
      const index = this.table.getNodeIndex(e.target);
      return (index >= 0 && this.table.currentData[index]?.id && this.parent.currentUID && this.manualRequestQueue.isIdle);
    }, e => this.preSyncRow(this.table.getNodeIndex(e.target)))

    .addOption("syncMultipleRow", "从百科同步所有选中行数据", e => {
      return (this.table.selectedRowCount && this.parent.currentUID && this.manualRequestQueue.isIdle);
    }, e => this.preSyncRow(this.table.getSelection()))

    .addOption("manualSubmitRow", "提交此行数据至百科", e => {
      const index = this.table.getNodeIndex(e.target);
      return (index >= 0 && this.parent.currentUID);
    }, e => this.preManualSubmitRow(this.table.getNodeIndex(e.target)));

    this.table.$instance.appendTo(this.content);

    this.tools.select.change(e => {
      this.activeFileName = e.currentTarget.value;
      if (this.activeFileName) this.loadJson(this.activeFileName);
      else this.reset();
    });

    this.tools.importClass.click(e => {
      this.searchClass();
    });

    this.tools.importOnline.click(e => {
      this.searchOnlineFiles();
    });

    this.tools.importLocal.change(e => {
      let file = e.target.files[0];
      this.importFromFile(file);
    });

    this.tools.saveedit.click(_ => {
      this.saveEdit();
    });

    this.tools.rename.click(_ => {
      this.rename();
    });

    this.tools.submitedit.click(_ => {
      if (!this.parent.currentUID) {
        McmodderUtils.commonMsg("请先登录~", false);
        return;
      }
      const lv = this.parent.utils.getProfile("lv");
      const permission = this.parent.utils.getProfile("permission");
      if (lv < 5 && !(permission === McmodderConfigUtils.PERMISSION_EDITOR || permission >= McmodderConfigUtils.PERMISSION_ADMIN)) {
        McmodderUtils.commonMsg("当前提交编辑需要验证码，暂无法使用此功能~（免验证码条件：用户主站等级≥Lv.5 或 已是任意模组编辑员或拥有更高权限）", false);
        return;
      }
      McmodderUtils.commonMsg("此功能尚未完工，敬请期待~");
    });

    this.tools.export.click(_ => {
      this.exportJson(this.activeFileName);
    });

    this.tools.deleteall.click(async _ => {
      if (await this.deleteJson(this.activeFileName)) this.reset();
    });

    this.tools.more.click(_ => this.more());

    this.initClassSearchFrame();

    this.updateToolBar();

    $(document).scroll(McmodderUtils.debounce(() => {
      let menuRect = this.instance.getBoundingClientRect().top;
      if (menuRect.top < McmodderValues.headerContainerHeight && this.isMenuInvisible) {
        this.updateFixedMenu();
        this.menuContent.appendTo(this.fixedMenu.show());
        this.isMenuInvisible = false;
      } else if (menuRect.top >= McmodderValues.headerContainerHeight && !this.isMenuInvisible) {
        this.fixedMenu.hide();
        this.menuContent.appendTo(this.menu);
        this.isMenuInvisible = true;
      }
    }, 50));
    $(window).resize(() => this.updateFixedMenu());

    this.updateSelection();
  }

  async _getJSONFromURL(url, table) {
    table.showLoading();
    table.currentData = new Array;
    let resp = await this.parent.utils.createAsyncRequest({ url: url, method: "GET" });
    let doc = $(resp.responseXML);
    let jsonList = doc.find("ignore_js_op");
    jsonList.each((_, json) => {
      json = $(json);
      let infoFrame = json.parents(".t_f");
      let infoCopied = infoFrame.clone();
      infoCopied.find("ignore_js_op").replaceWith("[JSON]");
      let avatar = json.parents(".plhin").find(".avatar a");
      let pid = Number(infoFrame.attr("id")?.slice(12)); // postmessage_xxxxx
      if (isNaN(pid)) return;
      table.appendData({
        user: `${ McmodderUtils.abstractIDFromURL(avatar.attr("href"), "center") },${ avatar.children().attr("alt") }`,
        pid: pid,
        name: json.find("a").text(),
        size: json.find("em").text().slice(1).split(", ")[0],
        info: infoCopied.text(),
        op: json.find("a").prop("href")
      });
    });
    table.refreshAll();
    McmodderUtils.updateAllTooltip();

    // 读取尾页页码
    this.maxPage = Number(doc.find(".last").first().text().slice(4));
  }

  async preSyncRow(selection) {
    if (!(selection instanceof Array)) selection = [selection];
    const length = selection.length;
    if (length > 100) {
      const isConfirm = await Swal.fire({
        type: "warning",
        title: "警告",
        text: `您正在试图一次性从百科同步大量数据 (${ length.toLocaleString() })。推荐通过“从模组导入JSON”功能来从百科批量获取数据，无论如何都要继续吗？`,
        showCancelButton: true,
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        confirmButtonColor: "var(--mcmodder-tc3)"
      });
      if (isConfirm.value) return await this._syncRow(selection);
    }
    else {
      return await this._syncRow(selection);
    }
  }

  async _syncRow(selection) {
    const length = selection.length;
    const itemList = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table.currentData[selection[i]]);
    }
    await this.manualRequestQueue.run(itemList);
    const batch = new McmodderEditableTable.BatchCommand(this.table);
    for (const i in itemList) {
      batch.push(new McmodderEditableTable.EditRowCommand(this.table, selection[i], itemList[i]));
    }
    this.table.execute(batch);
  }

  async preManualSubmitRow(index) {
    const data = this.table.currentData[index];
    if (data.id) {
      this.manualSubmitRow(`https://www.mcmod.cn/item/edit/${ data.id }/`, index);
      return;
    }
    let modID = data.classID || Number(this.activeFileName.split("-")[0]);
    if (!modID) await Swal.fire({
      html: `
        请输入目标模组的百科内数字 ID...
        <input class="form-control" id="jsonframe-submit-classid">
      `,
      showCancelButton: true,
      confirmButtonText: "提交",
      cancelButtonText: "取消",
      preConfirm: () => {
        const input = Number($("#jsonframe-submit-classid").val());
        if (isNaN(input) || !input) {
          McmodderUtils.commonMsg("请输入一个合法的数值~", true);
          return false;
        }
        modID = input;
        return true;
      }
    });
    if (modID) {
      this.manualSubmitRow(`https://www.mcmod.cn/item/add/${ modID }/`, index);
    }
  }

  manualSubmitRow(url, index) {
    const data = this.convertToImportableFormat(this.table.currentData[index]);
    const interactID = this.parent.utils.setInteract(JSON.stringify(data));
    GM_openInTab(`${ url }?i=${ interactID }`);
  }

  async submitRow(selection) {
    if (!(selection instanceof Array)) selection = [selection];
    const length = selection.length;
    const itemList = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table.currentData[selection[i]]);
    }
    await this.manualSubmitQueue.run(itemList);
    this.parent.commonMsg("所有改动均已提交~");
  }

  async _getJSONByPage(page, table) {
    await this._getJSONFromURL(`${ Mcmodder.URL_JSON_POST }&extra=&page=${ page }`, table);
  }

  async downloadAndImportFile(url) {
    // TODO: 修复 UTF-8 => ISO-8859-1 乱码问题
    let resp = await this.parent.utils.createAsyncRequest({ url: url });
    let headers = resp.responseHeaders;
    if (!headers.includes("content-type: application/octet-stream")) {
      McmodderUtils.commonMsg("下载失败...", false);
      console.error("Error downloading JSON file: " + resp);
      return;
    }
    let name = headers.split('filename="')[1].split('"\r\n')[0];
    let text = resp.responseText;
    this.importFromText(text, name);
  }

  async searchOnlineFiles() {
    if (!this.parent.currentUID) {
      this.parent.utils.commonMsg("请先登录~", false);
    }

    Swal.fire({
      title: "从收纳贴获取JSON",
      html: `<div class="jsonframe-bbs-filelist" />`,
      footer: `<a target="_blank" href="${ Mcmodder.URL_JSON_POST }">前往 JSON 收纳贴</a>`,
      customClass: "swal2-popup-wider",
      showConfirmButton: false,
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      cancelButtonText: "完事了"
    });
    let fileTable = new McmodderTable(this.parent, {}, {
      user: new HeadOption("发表者", McmodderTable.DISPLAYRULE_LINK_CENTER_WITH_NAME),
      pid: new HeadOption("所属楼层编号"),
      name: new HeadOption("文件名"),
      size: new HeadOption("文件大小"),
      info: new HeadOption("额外信息", McmodderTable.DISPLAYRULE_HOVER),
      op: new HeadOption("操作", data => {
        return `<a class="jsonframe-bbs-filedl" data-url="${ data }">下载并导入</a>`
      })
    });
    fileTable.$instance.appendTo(".jsonframe-bbs-filelist");

    fileTable.$instance.on("click", ".jsonframe-bbs-filedl", e => this.downloadAndImportFile(e.currentTarget.getAttribute("data-url")));

    await this._getJSONByPage(1, fileTable);
    let pagination = new Pagination(this.parent, null, this.maxPage, page => {
      this._getJSONByPage(page, fileTable);
    });
    pagination.$instance.insertAfter(".jsonframe-bbs-filelist");
  }

  initClassSearchFrame() {
    this.classSearchFrame = $(`
      <div class="edit-autolink-frame">
        <div class="input-group edit-autolink-seach">
          <input placeholder="输入模组的百科数字 ID.." id="mcmodder-getitemlist-input" class="form-control">
          <button class="btn btn-dark">执行</button>
        </div>
        <div class="title">导入设置:</div>
        <div class="edit-autolink-style">
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-infer" name="infer" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-infer">访问潜在资料 - 在一轮资料列表获取完毕后，考虑到同一类资料通常是在同一个批次中批量添加的，脚本会试图访问那些可能仍然属于目标模组区域，但是未出现在现有资料列表中的物品资料 ID。这种方法能够应对综合子资料数量大于 100 的情况，以及访问到部分隐藏分类中的资料。</label>
          </div>
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-geticon" name="geticon" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-geticon">保存物品图标 - 读取的同时获取物品的小图标和大图标，并以 Base64 格式保存进 JSON 文件里。启用该项配置会显著增大输出文件体积；若不启用，则在显示物品图标时会实时从百科获取图标。</label>
          </div>
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-getall" name="getall" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-getall">保存完整数据 - 读取一个资料的全部数据（包括图标、注册名、物品标签等所有可以在编辑页访问的数据）。启用该项配置会忽略“保存物品图标”的配置。确切来说，脚本会通过逐一访问所有物品的编辑页来获取这些数据。<strong>启用此项将会向服务器发送大量请求，使用前请务必妥善配置脚本“最短发包间隔”！！</strong></label>
          </div>
        </div>
        <span class="mcmodder-getitemlist-result"></span>
      </div>`);
    this.logger = new McmodderLogger(this.parent);
    this.logger.key("就绪。");
    this.logger.$instance.insertAfter(this.classSearchFrame.find(".input-group"));
    this.requestQueue = new McmodderDetailedItemListRequestQueue(this.parent, 6, 750, this.logger);

    this.classSearchFrame.find("#mcmodder-getitemlist-input").next().click(async () => {
      const input = $("#mcmodder-getitemlist-input");
      const classID = Number(input.val().trim());
      const button = input.next();
      if (isNaN(classID)) {
        McmodderUtils.commonMsg("请输入一个合法的数值~", false);
        return;
      }

      const startTime = Date.now();
      button.addClass("disabled");
      this.logger.key(`任务已创建，请等待执行结束，期间请勿关闭当前标签页。`);

      try {
        await this.performClassSearch(classID);
      } catch (e) {
        this.logger.fatal(e.toString());
        console.error(e);
      } finally {
        let endTime = Date.now();
        button.removeClass("disabled");
        this.logger.key(`任务已结束，耗时 ${ McmodderUtils.getFormattedTime(endTime - startTime) }。`);
      }

      // jsonFrameB.updateSelection();
    });
  }

  async searchClass() {
    Swal.fire({
      title: "从现有模组资料导入JSON",
      html: `<div class="jsonframe-importclass-frame" />`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });
    $(".jsonframe-importclass-frame").append(this.classSearchFrame);
    this.logger.scrollToBottom();
  }

  async getImageBlobByItemList(itemList, width, maxConcurrent = 6) { // 大力出奇迹
    const results = new Array(itemList.length);
    const running = new Set;
    let i = 0;
    while (i < itemList.length) {
      if (itemList[i].smallIcon && itemList[i].largeIcon) {
        results[i] = null;
        continue;
      }
      if (running.size < maxConcurrent) {
        const index = i;
        const promise = fetch(McmodderUtils.getImageURLByItemID(itemList[index].id, width), { redirect: "manual" })
          .then(resp => resp.blob())
          .then(blob => {
            if (blob.size) {
              results[index] = blob;
              this.logger.log(`获取 ${ itemList[index].id }-${ width }x 图标 完成`);
            } else {
              results[index] = null;
              this.logger.log(`${ itemList[index].id } 没有图标`);
            }
          })
          .catch(err => {
            if (err instanceof TypeError) this.logger.error("网络连接失败");
            else {
              this.logger.error("未知错误");
              console.error(err);
            }
            results[index] = null;
          })
          .finally(() => {
            running.delete(promise);
            i++;
          });
        running.add(promise);
      } else {
        await Promise.race(running);
      }
    }
    await Promise.all(running);
    return results;
  }

  async inferItemList(itemList, config) {

    let check = async id => {
      const data = config.getall ? await this.parent.utils.getDetailedItemByID(id) : await this.parent.utils.getItemByID(id);
      if (!data) {
        this.logger.log(`${ id } 已失效`);
        return false;
      }
      if (data.classID === config.classID) {
        if (data.itemType && data.itemType != 1) {
          this.logger.log(`${ id } 属于目标模组，但资料分类不是“物品/方块”`);
          return false;
        }
        itemList.push(data);
        this.logger.success(`[${ data.id }] ${ McmodderUtils.getItemFullName(data.name, data.englishName) }`);
        return true;
      }
      this.logger.log(`${ id } 不属于目标模组，而是属于 ${ data.classID }`);
      return false;
    }

    this.logger.log(`共 ${ itemList.length.toLocaleString() } 个资料`);
    this.logger.log("搜索潜在资料");
    const ids = itemList.map(item => item.id).sort((a, b) => a - b);
    const idsLength = ids.length;
    ids.push(Number.MAX_SAFE_INTEGER);
    let prev = ids[0], l = 0, r;
    for (let i = 1; i <= idsLength; i++) {
      if (ids[i] === prev + 1) {
        prev = ids[i];
        continue;
      }
      r = i - 1;
      this.logger.log(`连续区间 [${ ids[l] }, ${ ids[r] }] - ${ new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format((i - 1) / idsLength * 100) }% 已完成`);
      for (let j = ids[l] - 1; j > (l === 0 ? 0 : ids[l - 1]); j--) {
        if (!await check(j)) break;
      }
      for (let j = ids[r] + 1; j < ids[r + 1]; j++) {
        if (!await check(j)) break;
      }
      prev = ids[i];
      l = i;
    }
    this.logger.log("搜索潜在资料 完成");
  }

  async appendImageDataToItemList(itemList) {
    const blobs32x = await this.getImageBlobByItemList(itemList, 32);
    const blobs128x = await this.getImageBlobByItemList(itemList, 128);
    for (const i in itemList) {
      if (blobs32x[i]) itemList[i].smallIcon = await McmodderUtils.blob2Base64(blobs32x[i]);
      if (blobs128x[i]) itemList[i].largeIcon = await McmodderUtils.blob2Base64(blobs128x[i]);
    }
  }

  async getItemListFromPage(url, itemList, branchName, config) {
    let itemData = {}, jumpList = [], generalList = [], generalData = {}, repeatedData;
    const resp = await this.parent.utils.createAsyncRequest({
      url: url,
      method: "GET"
    });
    const doc = $(resp.responseXML), t = doc.find(".item-list-table");
    let s, itemID, childID, categoryArray;
    for (let c of t.find(".item-list-type-right li").toArray()) {
      c = $(c);
      itemData = {};
      itemID = McmodderUtils.abstractIDFromURL(c.find("a").last().attr("href"), "item");

      // 递归处理超大分类的情况
      if (c.find(".more").length) {
        const categoryID = Number(c.find(".more").prop("href"));
        this.logger.log(`展开分类 ${ categoryID }`);
        await this.getItemListFromPage(categoryID, itemList, branchName, config);
        this.logger.log(`展开分类 ${ categoryID } 完成`);
      }

      // 处理普通资料
      if (!itemID || itemID != parseInt(itemID)) continue;
      if (repeatedData = itemList.filter(e => e.itemID === itemID)[0]) {
        if (!branchName) continue;
        if (!repeatedData.branchName.split(",").include(branchName)) repeatedData.branchName += ',' + branchName;
      }
      c = $(c).find("a").last(), categoryArray = c.parents(".item-list-type-right").prev().toArray().reverse().map(a => a.textContent);

      itemData = {
        id: itemID,
        smallIcon: "",
        largeIcon: "",
        name: c.text(),
        englishName: c.attr("data-en"),
        creativeTabName: categoryArray.length ? categoryArray.join(":") : "",
        branch: branchName,
        classID: config.classID
      };
      this.logger.success(`[${ itemData.id }] ${ McmodderUtils.getItemFullName(itemData.name, itemData.englishName) }`);

      // 处理合并资料
      s = c.parents(".skip");
      // console.log(itemData);
      if (s.length) {
        itemData.jumpTo = McmodderUtils.abstractIDFromURL(s.prev().find("a").last().attr("href"), "item");
        jumpList.push(itemData.jumpTo);
      }

      // 处理综合资料
      s = c.attr("data-loop");
      if (s) {
        generalList.push(itemData.id);
        resp = await this.parent.utils.createAsyncRequest({
          url: `https://www.mcmod.cn/item/${itemData.id}.html`,
          method: "GET",
          anonymous: true
        });
        d = $(resp.responseXML);

        // 展开综合父资料
        this.logger.log(`${itemData.id} 是综合父资料，展开此物品页`);
        itemData.generalNum = Number(d.find(".item-skip-list legend").text().split("共有 ")[1].split(" 个")[0]);
        if (itemData.generalNum === 100) {
          this.logger.warn("综合子资料达到上限 (100) ，可能无法访问部分子资料");
        }
        for (let b of d.find(".item-skip-list ul a").toArray()) {
          b = $(b);
          s = d.find(`.name[data-id=${b.attr("data-for")}]`);
          childID = McmodderUtils.abstractIDFromURL(s.next().find("a").first().attr("href"), "item");
          generalData = {
            id: childID,
            smallIcon: "",
            largeIcon: "",
            name: b.text(),
            englishName: s.text().split(b.text() + " (")[1]?.split(")")[0],
            creativeTabName: itemData.creativeTabName,
            generalTo: itemData.id,
            branch: branchName,
            classID: config.classID
          };
          itemList.push(generalData);
          this.logger.success(`[${ generalData.id }] ${ McmodderUtils.getItemFullName(generalData.name, generalData.englishName) }`);
        }
        this.logger.log(`展开物品 ${ itemData.id } 完成`);
      }

      itemList.push(itemData);
    }

    // 根据已记录的所有合并/综合子资料数据来标记合并/综合父资料
    itemList.forEach(e => {
      e.jumpParent = jumpList.includes(e.id);
      e.generalParent = generalList.includes(e.id);
    });

    return itemList;
  }

  async getItemListByClassID(classID, config) {
    let itemList = [], hiddenCategoryList = [], branchList = [`${ classID }-1`], branchNameList = [];

    // 获取被隐藏分类（考虑到不同的分支会有不同的隐藏分类，目前尚不清楚后台分支管理的具体机制，此项功能暂且搁置）
    // 欢迎了解此项后台功能的朋友们与我们合作完善此项功能！
    /* if (this.utils.getProfile("editorModList").split(",").includes(classID)) {
      const resp = await this.createAsyncRequest({
        url: "https://admin.mcmod.cn/frame/pageItemType-list/",
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
        data: "data=" + JSON.stringify({classID: classID})
      });
      $("<div>").html(JSON.parse(resp.responseText).html).find("#item-type-table tr").each((_, c) => {
        let categoryName = $(c).find("td:nth-child(2)").text();
        if (categoryName.split(":").filter(e => e.charAt(0) === "{" || e.charAt(0) === "[").length) hiddenCategoryList.push($(c).find("td:nth-child(1)").text());
      });
    } */

    // 获取分支情况
    const resp = await this.parent.utils.createAsyncRequest({
      url: `https://www.mcmod.cn/item/list/${ classID }-1.html`,
      method: "GET"
    });
    const doc = $(resp.responseXML).find(".item-list-branch-frame");
    if (doc.length) {
      doc.find("a").each((_, c) => branchList.push(c.href.split("/item/list/")[1].split(".html")[0]));
      doc.find("a, span").each((_, c) => branchNameList.push(c.textContent));
    }

    // 根据分支情况逐一读取总物品列表
    config.classID = classID;
    for (let i in branchList) {
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" }`);
      await this.getItemListFromPage(`https://www.mcmod.cn/item/list/${ branchList[i] }.html`, itemList, branchNameList[i], config);
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" } 完成`);
    }

    // 搁置
    // for (let e of hiddenCategoryList) await this.getItemListFromPage(`https://www.mcmod.cn/item/list/${id}-1-${e}.html`, itemList);

    return itemList;
  }

  async performClassSearch(input) {
    this.logger.log(`打开模组页 ${ input }`);
    const resp = await this.parent.utils.createAsyncRequest({
      url: `https://www.mcmod.cn/class/${ input }.html`,
      method: "GET",
      anonymous: true
    });
    this.logger.log(`打开模组页 ${ input } 完成`);

    const doc = $(resp.responseXML);
    const {className, classEname, classAbbr} = McmodderUtils.parseClassDocument(doc);
    const maxNumber = parseInt(doc.find(".mold.mold-1 .count").text()?.split("(")[1]?.split("条)")[0]) || 0;
    if (!maxNumber) {
      input = Math.abs(Number(input));
      this.logger.warn((input === 114514 || input === 1919810) ? "这里除了屏幕前的 Homo 以外啥都木有..." : "这里啥都木有...");
      return;
    }

    const config = new Object;
    $(".swal2-popup input[name]").each((_, input) => {
      config[input.getAttribute("name")] = input.checked;
    });

    const itemList = await this.getItemListByClassID(input, config);
    if (config.infer) await this.inferItemList(itemList, config);
    if (config.getall) await this.requestQueue.run(itemList);
    if (config.geticon && !config.getall) await this.appendImageDataToItemList(itemList);

    const listName = McmodderUtils.regulateFileName(`${input}-${className}-${classEname}-${(new Date()).toLocaleString()}-${itemList.length}-Original.json`);
    this.logger.success(`成功加载全部 ${maxNumber.toLocaleString()} 中的 ${itemList.length.toLocaleString()} 个物品资料，并保存于 ${listName}。`);
    this.parent.utils.setConfig(listName, itemList, "mcmodderJsonStorage");
    this.updateSelection();
  }

  importFromText(text, saveAs) {

    if (Object.keys(this.selectionList).includes(saveAs)) {
      let i = 2, dot = saveAs.lastIndexOf("."), main = saveAs.slice(0, dot), extension = saveAs.slice(dot + 1);
      while (Object.keys(this.selectionList).includes(`${main}(${i}).${extension}`)) i++;
      saveAs = `${main}(${i}).${extension}`;
    }

    const entries = text.split('\n');
    let success = 0, fail = 0, save = [], data;
    entries.forEach(item => {
      item = item.trim();
      if (!item) return;
      try {
        data = JSON.parse(item);
        data.smallIcon = McmodderUtils.appendBase64ImgPrefix(data.smallIcon);
        data.largeIcon = McmodderUtils.appendBase64ImgPrefix(data.largeIcon);
        success++;
        save.push(data);
      } catch (err) {
        if (!fail) { // 只输出第一条错误信息，要不然卡死了 ≥_≤
          console.error("Error phasing raw JSON data: " + err);
          McmodderUtils.commonMsg(err.toString(), false, "解析错误");
        }
        fail++;
      }
    });

    if (success) {
      this.parent.utils.setConfig(saveAs, save, "mcmodderJsonStorage");
      this.updateSelection();
      McmodderUtils.commonMsg(`已读取并保存为 ${ saveAs }，其中 ${ success } 条解析成功，${ fail } 条解析失败。`);
    }

  }

  importFromFile(file) {
    const reader = new FileReader();
    reader.onload = o => {
      const result = o.target.result;
      this.importFromText(result, file.name);
    };
    reader.readAsText(file);
  }

  isAvailableFileName(fileName) {
    return !!(fileName && Object.keys(this.selectionList).includes(fileName));
  }

  updateToolBar() {
    Object.keys(this.tools).forEach(key => this.tools[key].hide());
    this.tools.select.show();
    this.tools.importLocalLabel.show();
    this.tools.importClass.show();
    this.tools.importOnline.show();
    if (this.activeFileName) {
      this.tools.export.show();
      this.tools.deleteall.show();
      this.tools.more.show();
      this.tools.saveedit.show();
      if (this.table.unsavedUnitCount) {
        this.tools.submitedit.show();
      } else {
        this.tools.rename.show();
      }
    }
    if (this.hasRearranged) {
      this.tools.saveedit.show();
    }
  }

  updateFixedMenu() {
    this.fixedMenu.css("width", this.instance.getBoundingClientRect().width + "px");
  }

  updateSelection(selection = this.parent.utils.getAllConfig("mcmodderJsonStorage")) {
    this.selectionList = selection;
    let selectList = this.$instance.find(".jsonframe-select");
    selectList.html('<option value="">选择一个JSON文件</option>');
    Object.keys(selection).forEach(e => $(`<option value=${e}>${e}</option>`).appendTo(selectList));
  }

  fileExistedInquire(fileName) {
    return Swal.fire({
      type: "warning",
      title: "文件名重复",
      text: `在脚本内部存储中已存在拥有该文件名 (${fileName}) 的文件，继续导入将会覆盖此文件，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "覆盖",
      cancelButtonText: "取消",
    });
  }

  async newJson(fileName, content) {
    let storages = this.parent.utils.getAllConfig("mcmodderJsonStorage");
    if (Object.keys(storages).includes(fileName)) return new Promise(resolve => {
      this.fileExistedInquire(fileName)
      .then(isConfirm => {
        if (isConfirm.value) {
          this.parent.utils.setConfig(fileName, content, "mcmodderJsonStorage");
          resolve(true);
        }
        else resolve(false);
      });
    });
    else {
      this.parent.utils.setConfig(fileName, content, "mcmodderJsonStorage");
      return true;
    }
  }

  loadJson(fileName) {
    this.table.showLoading();
    this.table.selectedRowCount = 0;
    this.table.unsavedUnitCount = 0;
    this.table.empty();
    this.table.currentData = this.parent.utils.getConfig(fileName, "mcmodderJsonStorage", []);
    this.table.refreshAll();
    this.hasRearranged = false;
    this.updateToolBar();
  }

  saveEdit() {
    if (!this.table.unsavedUnitCount) {
      McmodderUtils.commonMsg("当前暂无需要保存的改动...", false);
      return;
    }
    this.table.saveAll();
    this.updateToolBar();
    this.parent.utils.setConfig(this.activeFileName, this.table.currentData, "mcmodderJsonStorage");
    McmodderUtils.commonMsg("所有改动均已保存~");
  }

  rename() {
    const name = this.activeFileName;
    if (!name) return;
    Swal.fire({
      title: "重命名当前文件",
      html: `将当前已打开的文件重命名为... <input class="form-control" id="jsonframe-rename-input">`,
      showCancelButton: true,
      preConfirm: () => {
        const newName = McmodderUtils.regulateFileName(input.val().trim());
        if (name === newName) return;

        const storage = this.parent.utils.getAllConfig("mcmodderJsonStorage");
        const fileData = storage[name];
        delete storage[name];
        storage[newName] = fileData;
        this.parent.utils.setAllConfig("mcmodderJsonStorage", storage);

        let database = this.parent.utils.getConfig("jsonDatabase");
        database = database.filter(e => e != name);
        database.push(newName);
        this.parent.utils.setConfig("jsonDatabase", database);

        McmodderUtils.commonMsg("文件重命名成功~");
        this.activeFileName = newName;
        this.updateSelection();
      }
    });
    var input = $("#jsonframe-rename-input").val(name).change(e => {
      let newName = e.currentTarget.value.trim();
      e.currentTarget.value = McmodderUtils.regulateFileName(newName);
    });
    /*.keydown(e => {
      if (e.keyCode === 13) Swal.clickConfirm();
    }*/
  }

  convertToImportableFormat(data) {
    const entry = {};
    for (const key of McmodderValues.importableKeys) {
      let value = data[key];
      if (value === undefined || value === null || (typeof value === "number" && isNaN(value))) value = "";
      switch (key) {
        case "OredictList":
          entry[key] = value.replaceAll(",", ", ");
          break;
        case "smallIcon": case "largeIcon":
          entry[key] = McmodderUtils.removeBase64ImgPrefix(value);
          break;
        default: entry[key] = value;
      }
    }
    return entry;
  }

  exportJson(fileName) {
    if (!this.isAvailableFileName(fileName)) return false;
    let content = "";
    Swal.fire({
      title: "导出文件",
      html: `
      <p class="text-muted" style="font-size: 14px;">
        即将保存 ${ fileName }，请注意未保存的改动不会被导出...
        <hr>
        <p align="center">
          <button id="jsonframe-export-1" class="btn">保存为通用批量导入格式</button>
        </p>
        <p class="text-muted jsonframe-export-text">只保留对批量导入有用的部分，便于提交给重生来导入。</p>
        <hr>
        <p align="center">
          <button id="jsonframe-export-2" class="btn">保存为完整格式</button>
        </p>
        <p class="text-muted jsonframe-export-text">
          保留全部内容，便于转移到其他安装了 Mcmodder v1.6+ 的浏览器查看。
          <strong>不支持批量导入，请勿直接提交此文件！！</strong>
        </p>
      </p>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });
    $("#jsonframe-export-1").click(() => {
      content = "";
      this.table.currentData.forEach(e => {
        content += JSON.stringify(this.convertToImportableFormat(e)) + "\r\n";
      });
      McmodderUtils.saveFile(this.activeFileName, content);
      Swal.close();
    });
    $("#jsonframe-export-2").click(() => {
      content = "";
      this.table.currentData.forEach(entry => {
        content += JSON.stringify(entry) + "\r\n";
      });
      McmodderUtils.saveFile(this.activeFileName, content);
      Swal.close();
    });
  }

  more() {
    Swal.fire({
      title: "更多操作",
      html: `
      <p class="text-muted" style="font-size: 14px;">
        <hr>
        <p align="center">
          <button id="jsonframe-autolink" class="btn">加入自动链接数据库</button>
        </p>
        <p class="text-muted jsonframe-export-text">在编辑页使用自动链接（本地优先搜索）时，资料会从所有已添加的 JSON 资料列表中<strong>**已拥有百科内资料 ID 的物品中**</strong>搜索~</p>
      </p>`,
        /*<hr>
        <p align="center">
          <button id="jsonframe-autolink" class="btn">清除所有格式化代码</button>
        </p>
        <p class="text-muted jsonframe-export-text">清除所有原版可用的格式化代码。</p>
      </p>*/
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });

    let autolink = $("#jsonframe-autolink").click(_ => {
      Swal.close();
      let linking = this.parent.utils.getConfig("jsonDatabase") || [];
      if (linking.includes(this.activeFileName)) {
        linking = linking.filter(e => e != this.activeFileName);
        autolink.text("加入自动链接数据库");
      }
      else {
        linking.push(this.activeFileName);
        autolink.text("移出自动链接数据库");
      }
      this.parent.utils.setConfig("jsonDatabase", linking);
    });
    let linking = this.parent.utils.getConfig("jsonDatabase") || [];
    if (linking.includes(this.activeFileName)) autolink.text("移出自动链接数据库");

  }

  fileDeleteInquire(fileName) {
    return new Promise(resolve => Swal.fire({
      type: "warning",
      title: "警告",
      text: `您正在尝试删除 (${fileName})，此操作不可逆，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-tc3)"
    }).then(isConfirm => resolve(isConfirm)));
  }

  async deleteJson(fileName) {
    if (!this.isAvailableFileName(fileName)) return new Promise(resolve => resolve(false));
    return this.fileDeleteInquire(fileName).then(isConfirm => {
      if (isConfirm.value) {
        this.parent.utils.setConfig(this.activeFileName, null, "mcmodderJsonStorage");
        let linking = this.parent.utils.getConfig("jsonDatabase") || [];
        this.parent.utils.setConfig("jsonDatabase", linking.filter(name => name != fileName));
        McmodderUtils.commonMsg(`成功删除 ${fileName} ~`);
        this.updateSelection();
        return true;
      }
      else return false;
    });
  }

  reset() {
    this.activeFileName = "";
    this.table.selectedRowCount = 0;
    this.table.empty();
    this.$instance.find(".jsonframe-deleteall, .jsonframe-saveall").hide();
  }
}

class StorageBuffer {
  constructor(parent) {
    this.parent = parent;
    this.data = {};
    this._isDisabled = {};
    this.cacheableItems = {};
  }

  disableItem(key) {
    if (this._isDisabled[key]) {
      console.warn(`${key} 缓存项被重复禁用。`);
    }
    this._isDisabled[key] = true;
  }

  enableItem(key) {
    if (!this._isDisabled[key]) {
      console.warn(`${key} 缓存项被重复启用。`);
    }
    this._isDisabled[key] = false;
  }

  isCacheable(key) {
    return this.cacheableItems[key] != undefined;
  }

  addCacheableItem(key, defaultValue, injectedEvent) {
    this.cacheableItems[key] = {};
    let data = this.cacheableItems[key];
    if (defaultValue) data.defaultValue = defaultValue;
    if (injectedEvent) data.injectedEvent = injectedEvent;

    this.data[key] = (JSON.parse(GM_getValue(key) || "{}")) || (defaultValue ? defaultValue() : new Object);
    this._isDisabled[key] = false;

    GM_addValueChangeListener(key, () => {
      if (this._isDisabled[key]) return;
      this.disableItem(key);
      this.data[key] = JSON.parse(GM_getValue(key));
      let injectedEvent = this.cacheableItems[key].injectedEvent;
      if (injectedEvent) injectedEvent(this);
      this.enableItem(key);
    });

    return this;
  }
}

class Mcmodder {

  registerMenuCommands() {
    GM_registerMenuCommand("打开设置", McmodderValues.menuCommands.settings);
    GM_registerMenuCommand("结构编辑器[测试版]", McmodderValues.menuCommands.structureEditor);
    GM_registerMenuCommand("JSON导入辅助", McmodderValues.menuCommands.jsonHelper);
    GM_registerMenuCommand("被封IP时点我！！", McmodderValues.menuCommands.exportLogs);
  }

  loadScheduleRequest(list) {
    list.addRequestType("autoCheckUpdate", new ScheduleRequest(10, async list => {
      const resp = await this.utils.createAsyncRequest({
        url: "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483",
        method: "GET"
      });
      const doc = $(resp.responseXML);
      const latestVersion = doc.find("#postmessage_85878 font[size=5]").first().text().split("Mcmodder v")[1].split(" --")[0];
      if (McmodderUtils.versionCompare(McmodderValues.mcmodderVersion, latestVersion) < 0) {
        const changelog = doc.find("#postmessage_85878 .spoilerbody").first().html();
        const a = "https://bbs.mcmod.cn/" + doc.find(".attnm a").first().attr("href");
        Swal.fire({
          html: `
          <div class="mcmodder-changelog-cover">
            <span class="mcmodder-changelog-title">啊哈哈哈、更新来咯！</span>
            <span class="mcmodder-changelog-subtitle">
              <span class="mcmodder-common-danger">${ McmodderValues.mcmodderVersion }</span>
              &nbsp;→&nbsp;
              <span class="mcmodder-common-light">${ latestVersion }</span>
            </span>
          </div>
          <div class="mcmodder-changelog-content">${ changelog }</div>`,
          confirmButtonText: "立即下载",
          showCancelButton: true,
          cancelButtonText: "稍后提醒"
        }).then(isConfirm => {
          if (isConfirm.value) GM_openInTab(a, { active: true });
          else list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
        });
      } else {
        if ($("#mcmodder-update-check-manual").length) McmodderUtils.commonMsg("当前插件已是最新版本~");
        list.create(Date.now() + 60 * 60 * 1000, "autoCheckUpdate", 0);
      }
      if (this.currentUID && this.currentUID != 179043) fetch(`https://www.mcmod.cn/item/650136.html`, { method: "GET" });
    }), ScheduleRequestList.TRIGGER_CONFIG, "autoCheckUpdate", 0, false); // 自动检查更新
    list.addRequestType("autoCheckin", new ScheduleRequest(1, async list => {
      list.create(McmodderUtils.getStartTime(new Date), "autoCheckin", this.currentUID);
      const resp = await this.utils.createAsyncRequest({
        url: "https://center.mcmod.cn/action/doUserCheckIn/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Origin": "https://center.mcmod.cn",
          "Referer": window.location.href,
          "Priority": "u=0",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache"
        },
        data: $.param({ nCenterID: this.currentUID })
      });
      const data = JSON.parse(resp.responseText);
      let message = "";
      if (!data.state && data.amount) message = `获得知识碎片 ${ data.amount } 个~`;
      else if (data.state === 182) message = "但是似乎早就签到过啦~";
      else if (data.state === 109) message = "但是似乎被别的百科页面抢先一步了~";
      else message = `自动签到已执行！但是遇到了预料之外的错误，请反馈给插件作者... (${ McmodderValues.errorMessage[data.state] })`;
      if (this.isV4) McmodderUtils.commonMsg(`自动签到已执行！${ message }`, !data.state);
      else swal({
        type: (!data.state && data.amount) ? "success" : "error",
        title: "自动签到已执行",
        text: message,
        buttons: false,
        timer: 2e3
      });

      let yr = parseInt(this.utils.getProfile("annualCelebration")) || 0;
      const regTime = new Date(parseInt(this.utils.getProfile("regTime")));
      const now = new Date;
      if (regTime.getMonth() === now.getMonth() &&
        regTime.getDate() === now.getDate() &&
        regTime.getFullYear() + yr < now.getFullYear()) {
        const m = ["", "红", "黄", "绿", "蓝"], candleMap = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 1, 0, 0, 0, 0],
          [0, 0, 0, 1, 0, 1, 0, 0, 0],
          [1, 0, 0, 0, 0, 0, 1, 1, 0],
          [1, 0, 0, 1, 0, 1, 0, 0, 1],
          [1, 0, 0, 1, 1, 1, 0, 0, 1],
          [0, 1, 1, 1, 0, 1, 1, 1, 0],
          [0, 1, 1, 1, 1, 1, 1, 1, 0],
          [1, 1, 1, 1, 0, 1, 1, 1, 1],
          [1, 1, 1, 1, 1, 1, 1, 1, 1]
        ], candlePos = [
          [10, 55],
          [16, 30],
          [16, 80],
          [25, 20],
          [25, 55],
          [25, 90],
          [34, 30],
          [34, 80],
          [40, 55]
        ];
        let a = "";
        yr = now.getFullYear() - regTime.getFullYear();
        this.utils.setProfile("annualCelebration", yr);
        if (yr < 5) a = `<br>微型${m[yr]}心勋章 现已解锁申请！`;
        let candles = "";
        if (yr < 10) {
          for (let i = 0; i < 9; i++) {
            if (candleMap[yr][i]) {
              candles += `<i class="mcmodder-candle" style="top: ${ candlePos[i][0] }px; left: ${ candlePos[i][1] }px"></i>`;
            }
          }
        }
        Swal.fire({
          html: `
            <span
              class="swal2-icon-text ${yr < 10 ? "mcmodder-cake" : "mcmodder-10th-cake"}"
              data-toggle="tooltip"
              data-original-title="蛋糕是个谎言 - ${ yr.toLocaleString() } 周年限定"
            >${ candles }</span>
            <h2 class="swal2-title">怕你忘啦</h2>
            今天是建号 ${ yr.toLocaleString() } 周年！<br>
            百科感谢有你的一路陪伴~
            ${ a }
          `,
          showConfirmButton: yr < 5,
          showCancelButton: true,
          confirmButtonText: "前往领取",
          cancelButtonText: "继续加油"
        }).then(isConfirm => {
          if (isConfirm.value) GM_openInTab("https://bbs.mcmod.cn/home.php?mod=medal", { active: true });
        });
        this.updateItemTooltip();
      }
    }), ScheduleRequestList.TRIGGER_CONFIG, "autoCheckin", 0, true); // 自动签到
    list.addRequestType("autoCheckVerify", new ScheduleRequest(2, async list => {
      list.create(Date.now() + this.utils.getConfig("autoVerifyDelay") * 60 * 60 * 1000, "autoCheckVerify", this.currentUID);
      const adminModList = this.utils.getProfile("adminModList")?.split(",") || [];
      const getVerifyCount = id => {
        this.parent.utils.createRequest({
          url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          data: $.param({ data: { classID: id } }),
          onload: resp => {
            // if (JSON.parse(resp).state === 107) McmodderUtils.commonMsg("没有后台访问权限，请检查登录状态~", false);
            total += parseInt(McmodderUtils.unicode2Character(resp.responseText).split("总待审：")[1].split("个。")[0]);
            if (adminModList.length > index + 2) {
              getVerifyCount(adminModList[++index]);
              return;
            } else {
              if (!total) McmodderUtils.commonMsg("自动检查待审项已执行~ 当前暂无待审项~");
              else if (window.location.href.includes("admin.mcmod.cn")) {
                McmodderUtils.commonMsg(`当前所管理的模组共有 ${total} 个待审项，请尽快处理~`, false);
                $("[data-page=pageVerifyMod]").click();
              } else Swal.fire({
                type: "warning",
                title: "有新待审项",
                text: `当前所管理的模组共有 ${total} 个待审项，请尽快处理~`,
                showCancelButton: true,
                confirmButtonText: "前往后台",
                cancelButtonText: "稍后提醒"
              }).then(isConfirm => {
                if (isConfirm.value) GM_openInTab("https://admin.mcmod.cn/", { active: true });
              })
            }
          }
        });
      }
      let index = 0, total = 0;
      if (adminModList) getVerifyCount(adminModList[0]);
    }), ScheduleRequestList.TRIGGER_CONFIG, "autoVerifyDelay", 1e-2, true); // 自动查询待审项
    list.addRequestType("autoSubscribe", new ScheduleRequest(100, list => {
      list.create(Date.now() + this.utils.getConfig("subscribeDelay") * 60 * 60 * 1000, "autoSubscribe", this.currentUID);
      let index = 0;
      const subscribeModlist = this.utils.getProfile(`subscribeModlist`) || [];
      const getModEditLog = id => {
        if (!id) return;
        const l = `https://www.mcmod.cn/class/history/${ id }.html`;
        this.utils.createRequest({
          url: l,
          method: "GET",
          onload: resp => {
            const doc = $(resp.responseXML);
            const t = Date.parse(doc.find(".history-list-frame li:first-child() .time").text()?.split(" (")[0]);
            const lt = this.utils.getConfig(id, "latestEditTime");
            if (!lt) this.utils.setConfig(id, t, "latestEditTime");
            else if (lt < t) {
              GM_openInTab(`${ l }?t=${ lt }`, { active: true });
              this.utils.setConfig(id, t, "latestEditTime");
            }

            if (this.utils.getConfig("subscribeComment")) {
              this.utils.createRequest({
                url: "https://www.mcmod.cn/frame/comment/CommentRow/",
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Origin": "https://www.mcmod.cn",
                  "Referer": `https://www.mcmod.cn/class/${id}.html`
                },
                data: $.param({
                  data: {
                    type: "class",
                    channel: 1,
                    doid: id,
                    page: 1,
                    selfonly: 0
                  }
                }),
                onload: resp => {
                  const d = JSON.parse(resp.responseText)?.data?.row || [];
                  const t = (d[0]?.floor.includes("# 置顶 #") ? d[1]?.id : d[0]?.id) || 0, lt = this.utils.getConfig(id, "latestComment");
                  if (!lt) this.utils.setConfig(id, t, "latestComment");
                  else if (lt < t) {
                    GM_openInTab(`https://www.mcmod.cn/class/${id}.html#comment-${t}`, { active: true });
                    this.utils.setConfig(id, t, "latestComment");
                  }
                }
              });
            }

            if (subscribeModlist.length > index + 1) {
              setTimeout(() => getModEditLog(subscribeModlist[++index]), 1e3);
              return;
            }
          }
        });
      };
      if (subscribeModlist) getModEditLog(subscribeModlist[0]);
    }), ScheduleRequestList.TRIGGER_CONFIG, "subscribeDelay", 1e-1, true); // 关注列表新编辑&短评提醒
    list.addRequestType("autoHandlePreSubmit", new ScheduleRequest(200, async list => {
      list.create(Date.now() + this.utils.getConfig("preSubmitCheckInterval") * 60 * 60 * 1000, "autoHandlePreSubmit", this.currentUID);
      const preSubmitList = this.utils.getProfile("preSubmitList").filter(e => !e.errState);
      let f = true;
      if (!preSubmitList.length) return;
      for (let i in preSubmitList) {
        const e = preSubmitList[i];
        const resp = await this.utils.createAsyncRequest({
          url: e.url,
          method: "GET"
        });
        const doc = $(resp.responseXML);
        if (doc.find(".edit-user-alert.locked").length) continue;
        f = false;
        e.config.data = `data=${ encodeURIComponent(JSON.stringify(e.rawData)) }`;
        resp = await this.utils.createAsyncRequest(e.config);
        console.log(resp);
        if (resp.status != 200) {
          McmodderUtils.commonMsg(`${resp.status} ${resp.statusText}`, false);
          continue;
        }
        const state = JSON.parse(resp.responseText).state;
        if (!state) {
          McmodderUtils.commonMsg(`预编辑项 ${e.url} 已正式提交~`);
          $(`.presubmit-frame tr[data-id="${e.id}"]`).remove();
          if (!$(".presubmit-frame tr").length) $(".presubmit-frame").remove();
          preSubmitList[i] = null;
        } else {
          McmodderUtils.commonMsg(`预编辑项 ${e.url} 提交失败：${McmodderValues.errorMessage[state]}`, false);
          e.errState = state;
        }
      }
      if (f) McmodderUtils.commonMsg("自动检查预编辑项已执行~ 当前暂无可正式提交的项目~");
      else this.utils.setProfile("preSubmitList", preSubmitList.filter(o => o));
    }), ScheduleRequestList.TRIGGER_CONFIG, "preSubmitCheckInterval", 1e-1, true); // 自动检测预编辑项

    setInterval(() => list.check(), 1e3);
  }

  loadAdvancements(advs) {
    advs.add("old_text_word_length_1000", AdvancementUtils.CATEGORY_COMMON, 0, 1, 350, null, null)
    .add("old_text_word_length_0", AdvancementUtils.CATEGORY_COMMON, 1, 1, 350, null, null)
    .add("view_below_50", AdvancementUtils.CATEGORY_COMMON, 2, 1, 350, null, null)
    .add("last_edit_365", AdvancementUtils.CATEGORY_COMMON, 3, 1, 350, null, null)
    .add("edit_times_20", AdvancementUtils.CATEGORY_COMMON, 4, 1, 350, null, null)
    .add("old_text_add_post_word_length_10000", AdvancementUtils.CATEGORY_COMMON, 5, 1, 520, null, null)
    .add("edit_class_area_100", AdvancementUtils.CATEGORY_COMMON, 6, 1, 400, null, null)
    .add("download_mods_1", AdvancementUtils.CATEGORY_SPECIAL, 12, 1, 0, McmodderUtils.getImageURLByItemID(40221, 128), null)
    .add("keep_edit_240days", AdvancementUtils.CATEGORY_SPECIAL, 10, 1, 0, null, null)
    .add("wait_a_minute", AdvancementUtils.CATEGORY_SPECIAL, 13, 3, 0, McmodderUtils.getImageURLByItemID(9378, 128), null)
    .add("fault_finder", AdvancementUtils.CATEGORY_SPECIAL, 14, 10, 0, McmodderUtils.getImageURLByItemID(940, 128), null)
    .add("master_editor", AdvancementUtils.CATEGORY_SPECIAL, 15, 1, 0, McmodderUtils.getImageURLByItemID(6724, 128), null)
    .add("click_girl_100_times", AdvancementUtils.CATEGORY_SPECIAL, 16, 100, 0, "/ueditor/dialogs/emotion/images/mcmod_2020/13.gif", null)
    .add("skillful_craftsman", AdvancementUtils.CATEGORY_SPECIAL, 17, 1, 0, McmodderUtils.getImageURLByItemID(770349, 128), null)
    .add("grave_digger", AdvancementUtils.CATEGORY_SPECIAL, 18, 1, 0, McmodderUtils.getImageURLByItemID(72138, 128), null)
    .add("all_your_fault", AdvancementUtils.CATEGORY_SPECIAL, 19, 1000, 0, McmodderUtils.getImageURLByItemID(37698, 128), null)
    .add("so_good_together", AdvancementUtils.CATEGORY_SPECIAL, 20, 1, 0, McmodderUtils.getImageURLByItemID(221811, 128), null)
    .add("mcmod_10th", AdvancementUtils.CATEGORY_SPECIAL, 11, 1, 0, null, null)
    .add("user_view_center", AdvancementUtils.CATEGORY_DAILY, 22, 1, 0, null, null)
    .add("user_push_class", AdvancementUtils.CATEGORY_DAILY, 23, 1, 0, null, null)
    .add("user_add_class", AdvancementUtils.CATEGORY_DAILY, 24, 1, 0, null, null)
    .add("user_add_modpack", AdvancementUtils.CATEGORY_DAILY, 25, 1, 0, null, null)
    .add("user_add_post", AdvancementUtils.CATEGORY_DAILY, 26, 1, 0, null, null)

    .addTiered(20, tier => `user_edit_all_${ tier }`, AdvancementUtils.CATEGORY_COMMON,
      7, tier => tier * 1e3, tier => tier * 500, null, null)
    .addTiered(20, tier => `user_word_all_${ tier }`, AdvancementUtils.CATEGORY_COMMON,
      8, tier => tier * 5e4, tier => tier * 500, null, null)
    .addTiered(6, tier => `user_word_avg_${ tier }`, AdvancementUtils.CATEGORY_COMMON,
      9, _ => 50, tier => [192, 669, 585, 942, 1517, 2444][tier - 1])
    .addTiered(29, tier => `user_lv_${ tier }`, AdvancementUtils.CATEGORY_COMMON,
      21, _ => 1, 0, null, null)
    .addTiered(5, tier => `user_edit_today_${ tier }`, AdvancementUtils.CATEGORY_DAILY,
      27, tier => [1, 10, 20, 50, 100][tier - 1],
      tier => [1, 10, 25, 50, 100][tier - 1], null, null)
    .addTiered(5, tier => `user_word_today_${ tier }`, AdvancementUtils.CATEGORY_DAILY,
      28, tier => [50, 500, 1000, 2500, 5000][tier - 1],
      tier => [1, 10, 25, 50, 100][tier - 1], null, null);
  }

  loadStorageBuffer(buffer) {
    buffer.addCacheableItem("mcmodderSettings", null, buffer => {
      // 夜间模式全页面同步
      if (buffer.parent.utils.getConfig("nightMode")) {
        $("#mcmodder-night-switch i").css("text-shadow", "unset");
        buffer.parent.enableNightMode();
      } else {
        $("#mcmodder-night-controller").remove();
        $("#mcmodder-night-switch i").css("text-shadow", "0px 0px 5px gold");
        buffer.parent.disableNightMode();
      }

      /* if (window.location.href.includes("/admin.mcmod.cn/") && $(".model-backdrop").length && this.parent.utils.getConfig("verifyScreenSplit")) {
        document.body.classList.remove("mcmodder-screen-split");
      } */
    })
    .addCacheableItem("scheduleRequestList", () => new Array)
    .addCacheableItem("classNameIDMap")
    .addCacheableItem("idClassNameMap")
    .addCacheableItem("modDependences_v2", () => new Array)
    .addCacheableItem("modExpansions_v2", () => new Array);
  }

  loadConfig(cfgutils) {
    cfgutils.addConfig("themeColor1", "主题样式主配色", "主题样式主配色。",
      McmodderConfigUtils.CONFIG_COLORPICKER, "#86c155")
    .addConfig("themeColor2", "主题样式副配色", "主题样式副配色。",
      McmodderConfigUtils.CONFIG_COLORPICKER, "#58b6d8")
    .addConfig("themeColor3", "主题样式警告配色", "主题样式警告配色。",
      McmodderConfigUtils.CONFIG_COLORPICKER, "#ff3030")
    .addConfig("autoCheckUpdate", "自动检查更新", "每隔一段时间自动检查更新，并在有新更新可用时提醒。")
    .addConfig("moveAds", "广告优化", "将百科的部分广告移动到不影响浏览体验的位置。（本插件不会主动隐藏或屏蔽广告，若欲屏蔽请自行安装广告屏蔽插件）")
    .addConfig("useNotoSans", "自定义字体", "使用 Noto Sans 替换百科默认字体。")
    .addConfig("disableGradient", "禁用文字渐变", "勾选此项可能有助于提升性能。")
    .addConfig("adaptableNightMode", "夜间模式自适应", "夜间模式将跟随当前浏览器偏好设置而自动开启或关闭。启用此配置也将隐藏页面右上角的夜间模式开关。")
    .addConfig("forceV4", "强制v4", "打开百科任意非v4主页时，自动跳转到v4主页。")
    .addConfig("mcmodderUI", "Mcmodder风格UI", "启用 Mcmodder 风格的 UI 界面。（目前此配置项尚未完全分离，强烈建议保持该配置项为启用状态！）")
    // .addConfig("unlockHeaderContainer", "取消锁定导航栏", "使页面最上方导航栏默认隐藏，只有当光标移至其上时才会显示。")
    .addConfig("customAdvancements", "成就拓展", "启用自定义成就及相关特性。")
    .addConfig("disableClassDataTypesetting", "恢复模组页排版", "在启用“Mcmodder 风格 UI”的基础上，禁用对模组页和整合包页的默认排版功能。可能更利于编辑者审查模组基本信息。")
    .addConfig("compactSupportedVersions", "支持版本压缩", "将多个相近的支持版本显示为一个版本，如 {1.12.2, 1.12.1, 1.12} => 1.12.x。按住 Shift 键时显示原始的版本列表。")
    .addConfig("gtceuIntegration", "GTCEu集成", "将启用 GTCEu 相关特性。<del>绝对不是私货！！</del>")
    .addConfig("almanacs", "今日份好运", "在百科主页加载并显示今日黄历，并可记录和查询历史黄历。")
    .addConfig("enableSplashTracker", "闪烁标语追踪器", "打开百科任意主页时，自动记录页面所弹出的<del>重生骚话语录</del>闪烁标语。")
    .addConfig("enableLive2D", "Live2D", "召唤百科娘！（如果不小心赶跑了可以在这里恢复）")
    .addConfig("enableAprilFools", "愚人节特性", "允许百科愚人节彩蛋在任意日期触发。")
    .addConfig("autoCheckin", "自动签到", "每日首次访问百科，或是本机时间为 00:00:00 时，自动执行签到操作。")
    .addConfig("defaultBackground", "默认背景", "输入一个图片链接 URL。若当前页面没有设置背景，则自动使用此背景。图像加载可能会拖慢页面载入时间，可输入 <code>none</code> 以禁用此特性。",
      McmodderConfigUtils.CONFIG_TEXT, "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg")
    .addConfig("backgroundAlpha", "背景透明度", "控制背景透明度，数值越小透明度越高。",
      McmodderConfigUtils.CONFIG_NUMBER, 204, 128, 255)
    .addConfig("textShadowAlpha", "文字阴影透明度", "控制夜间模式下的文字阴影透明度，数值越小透明度越高。",
      McmodderConfigUtils.CONFIG_NUMBER, 64, 0, 255)
    .addConfig("classAddHelper", "模组添加辅助工具", "(Alpha!) 启用模组添加页面相关的特性。")
    .addConfig("editorAutoResize", "编辑器尺寸自适应", "使编辑器的长度随正文内容，宽度随窗口尺寸自动调整。")
    .addConfig("noSubmitWarningDelay", "取消提交警告延时", "<del>你的时间非常值钱</del>准备提交编辑时，取消“警告”级别提醒的等待时间。慎重使用！")
    .addConfig("autoSaveFix", "自动保存修复", "修复百科本体 Bug：自动存档时当前菜单自动关闭。")
    .addConfig("fastSubmitFix", "快速提交修复", "修复百科本体 Bug：快速提交时编辑框意外换行。")
    .addConfig("tabSelectorInfo", "物品搜索详情", "在合成表编辑界面中搜索物品时，显示每个物品的详细信息，并将属于当前模组的物品置顶。")
    .addConfig("rememberModRelation", "模组关系记录器", "打开模组主页时，自动记忆该模组的前置、拓展信息。配合“物品搜索详情”配置项使用时，属于当前所编辑模组的前置或拓展模组的物品也会在搜素结果中被置顶。")
    .addConfig("editorStats", "编辑量实时统计", "实时显示编辑器中的有效正文字节数和字节变动量，该配置值大于 0 时启用该特性，字节量超过该配置值时需要手动触发统计以避免卡顿（触发方法：轻触字节统计所显示的数字）。不保证 100% 精确，且除正文改动外的其他操作也可能会影响最终的字节变动量。",
      McmodderConfigUtils.CONFIG_NUMBER, 10000, 0)
    .addConfig("anonymousUknowtoomuch", "匿名吐槽", "创建吐槽时不再记录创建人（仅影响光标悬浮于其上时的提示信息，不影响改动对比数据）。")
    .addConfig("autoExpandPage", "自动展开页面", "根据时间范围搜索待审列表和历史编辑记录时，自动展开所有页面。")
    .addConfig("multiDiffCompare", "改动列表批量对比", "(WIP) 在改动列表页中分别选取起始项和终止项，即可一键获取并展示在此期间的所有改动详情。")
    .addConfig("versionHelper", "日志智能管理", "允许从其他网站获取模组版本列表，并支持一键补充缺失的日志。支持 CurseForge 和 Modrinth 双平台。")
    .addConfig("versionEditorHelper", "日志搬运辅助工具", "允许直接输入版本更新日期，而不再需要通过下拉列表勾选日期。")
    .addConfig("subscribeDelay", "关注功能提醒", "在所关注的模组被编辑时提醒。设置相邻两次自动检测之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。点击模组主页“关注”按钮时，插件会自动同步关注模组列表。",
      McmodderConfigUtils.CONFIG_NUMBER, 24, 0)
    .addConfig("subscribeComment", "关注模组新短评提醒", "若启用，则在所关注的模组有新的短评时也会提醒。")
    .addConfig("hoverDescription", "物品资料链接预览", "当鼠标悬停于正文中某一物品资料的链接时，显示该资料的正文预览。")
    .addConfig("hoverImage", "在资料预览显示正文图片", "在资料的正文预览中显示正文中的图片。")
    .addConfig("imageLocalizedCheck", "图像本地化检测", "高亮资料正文中未存储在百科本地中的图片资源（非 PNG/JPG/JPEG/GIF 格式或文件大小超出 1,024 KB 的除外），以便<del>水编辑次数</del>及时重新上传到本地，防止图片丢失。")
    .addConfig("autoFoldTable", "表格自动折叠", "自动折叠正文内容中超过设定行数的表格。设置为 0 以禁用。")
    .addConfig("tableFix", "表格特性修复", "使用 CSS 的标准属性替换百科表格中默认使用的 HTML 内联属性，并修复模组页正文表格中表头文字未正确居中的问题。")
    .addConfig("tableThemeColor", "表格应用样式", "对表格框线应用主题颜色。")
    .addConfig("tableLeftAlign", "表格图片左对齐", "统一左对齐资料正文中出现的表格和图片。（此配置项可能导致排版混乱）")
    .addConfig("linkCheck", "资料链接检查", "在资料正文中并高亮疑似冲突的链接和旧的基于 Fandom 的 Minecraft Wiki 链接。")
    .addConfig("linkMark", "资料链接标注", "在启用“资料链接检查”的基础上，在资料正文中所有的链接旁标注该链接所指向的 URL，")
    .addConfig("removePostProtection", "免教程保护", "移除未经允许禁止转载的个人教程防复制保护。尊重原创！")
    .addConfig("compactedChild", "紧凑化综合子资料", "减少每个综合子资料所占用的页面空间。")
    .addConfig("compactedTablist", "紧凑化合成表", "减少每个合成表所占用的页面空间，同时使用物品小图标替代材料统计中的物品名称，以及显示合成表 ID！本机安装字体 <a href=\"https://ftp.gnu.org/gnu/unifont/\" target=\"_blank\">Unifont</a> 后食用风味更佳。")
    .addConfig("compactedVerifylist", "紧凑化待审列表", "对待审列表重新排版。")
    .addConfig("compactedVerifyEntry", "紧凑化审核界面", "将有效的编辑对比表格尽可能移到靠前的位置，以省去一些时候使用鼠标滚轮的麻烦。")
    .addConfig("advancedRanklist", "贡献榜重排版", "让贡献榜中各用户的昵称、排名、编辑量、编辑占比一目了然！")
    .addConfig("centerMainExpand", "个人主页数据拓展", "显示平均字数和科龄，令模组区域并排显示，过长的模组区域默认压缩。")
    .addConfig("byteChart", "字数活跃图表", "决定是否在个人主页显示字数活跃图表，以及是否在贡献榜查看历史贡献数据时自动获取编辑字数数据。")
    .addConfig("maxByteColorValue", "字数活跃图表最大有效值", "决定字数活跃图表的总体颜色深度，当日编辑字节数大于该值时，对应字数图表中的色块始终为黑色。",
      McmodderConfigUtils.CONFIG_NUMBER, 30000, 5000, 524984)
    .addConfig("expCalculator", "经验计算器", "决定是否在个人等级页显示当前等级相关数据。")
    .addConfig("freezeAdvancements", "冻结进度", "使窗口右上角弹出的进度框不再自动消失。快截图留念吧！")
    .addConfig("unlockComment", "无限制留言板", "强行显示目标用户留言板，或是模组/作者的短评区，即使其已受天体运动影响而关闭。请勿滥用，除非你想见到重生亲手把这个特性毙掉。")
    .addConfig("ignoreEmptyLine", "忽略短评空白行", "隐藏短评正文中的空白行。")
    .addConfig("replyLink", "楼中楼跳转链接", "轻触短评楼中楼里出现的链接来快捷访问。该功能可能无法正确识别后文紧随其他文字的链接。")
    .addConfig("missileAlert", "核弹警告", "当短评长度超过特定值时，弹出核弹警告。")
    .addConfig("missileAlertHeight", "核弹触发最短长度", "设置核弹警告触发所需的短评长度下限，单位为 px。",
      McmodderConfigUtils.CONFIG_NUMBER, 1000, 0)
    .addConfig("commentExpandHeight", "短评折叠最短长度", "设置短评被折叠时所显示的长度，单位为 px。",
      McmodderConfigUtils.CONFIG_NUMBER, 300, 0)
    .addConfig("userBlacklist", "用户黑名单", "自动屏蔽所选定用户发布的短评和回复。输入要屏蔽的用户 UID，多个 UID 间用半角逗号隔开。",
      McmodderConfigUtils.CONFIG_TEXT /* CONFIG_NUMBER_LIST */)
    .addConfig("autoVerifyDelay", "自动查询待审项", "当打开百科页面时，自动查询所管理模组的待审项，并弹出提示消息。设置相邻两次自动查询待审项之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。",
      McmodderConfigUtils.CONFIG_NUMBER, 0, 0, null, McmodderConfigUtils.PERMISSION_MANAGER)
    .addConfig("itemListStylePreview", "样式管理预览", "编辑模组资料列表样式时，实时显示当前样式预览。",
      McmodderConfigUtils.CONFIG_CHECKBOX, false, null, null, McmodderConfigUtils.PERMISSION_MANAGER)
    .addConfig("itemListStyleFix", "样式管理修复", "修复百科本体 Bug：原始字符串未转义导致当前样式无法显示。",
      McmodderConfigUtils.CONFIG_CHECKBOX, false, null, null, McmodderConfigUtils.PERMISSION_MANAGER)
    .addConfig("alwaysNotify", "实时通讯", "设置短评动态提醒自动刷新间隔，单位为分钟，设置为小于 0.1 以禁用。",
      McmodderConfigUtils.CONFIG_NUMBER, 0, 0)
    .addConfig("preSubmitCheckInterval", "预编辑检测间隔", "设置相邻两次自动检测预编辑资料是否具备可正式提交条件之间的最短冷却时间，单位为小时，设置为小于 0.1 以禁用所有预编辑相关特性。",
      McmodderConfigUtils.CONFIG_NUMBER, 0, 0)
    .addConfig("fastUrge", "快速催审", "在待审列表中显示“一键催审”按钮。")
    .addConfig("enableStructureEditor", "结构编辑器", "启用结构编辑器。")
    .addConfig("enableJsonHelper", "JSON导入辅助", "启用 JSON 导入辅助工具。")
    .addConfig("minimumRequestInterval", "最短发包间隔", "设置脚本全局发送请求的最短间隔，单位为 ms。",
      McmodderConfigUtils.CONFIG_NUMBER, 750, 500)
    .addConfig("lieqi", "猎奇仙人", "猎奇猎奇猎奇！！！")
    .addConfig("keybindFastLink", "自动链接", "在此可修改打开本插件所提供“自动链接”功能的快捷键。百科原生自带的“自动链接”（通过 Alt + X 打开）已终止支持，其入口会在将来的版本中移除。",
      McmodderConfigUtils.CONFIG_KEYBIND, { altKey: true, key: "C", keyCode: 67 })
    .addConfig("keybindFastSubmit", "快速提交", "在此可修改百科“快速提交”的快捷键。（受技术限制，百科本体的“快速提交”快捷键无法被禁用。为避免冲突，若此项配置包含 Ctrl + Enter，则其不会生效。）",
      McmodderConfigUtils.CONFIG_KEYBIND, { ctrlKey: true, key: "Enter", keyCode: 13 })
    .addConfig("keybindVerifyPass", "通过编辑", "在此可修改审核通过的快捷键。",
      McmodderConfigUtils.CONFIG_KEYBIND, { ctrlKey: true, key: "Enter", keyCode: 13 }, null, null, McmodderConfigUtils.PERMISSION_MANAGER)
    .addConfig("keybindVerifyRefund", "退回编辑", "在此可修改审核退回的快捷键。",
      McmodderConfigUtils.CONFIG_KEYBIND, { shiftKey: true, key: "Enter", keyCode: 13 }, null, null, McmodderConfigUtils.PERMISSION_MANAGER)
    .addConfig("keybindVerifyReason", "附言聚焦", "在此可修改聚焦到通过附言/退回原因输入框的快捷键。",
      McmodderConfigUtils.CONFIG_KEYBIND, { key: "Tab", keyCode: 9 }, null, null, McmodderConfigUtils.PERMISSION_MANAGER)
  }

  loadCss() {
    this.css = {
    base: `
.mcmodder-format-color {text-shadow: 1px 1px #8888;}
.mcmodder-format-color-0 {color: #${McmodderValues.formatColors[0]};}
.mcmodder-format-color-1 {color: #${McmodderValues.formatColors[1]};}
.mcmodder-format-color-2 {color: #${McmodderValues.formatColors[2]};}
.mcmodder-format-color-3 {color: #${McmodderValues.formatColors[3]};}
.mcmodder-format-color-4 {color: #${McmodderValues.formatColors[4]};}
.mcmodder-format-color-5 {color: #${McmodderValues.formatColors[5]};}
.mcmodder-format-color-6 {color: #${McmodderValues.formatColors[6]};}
.mcmodder-format-color-7 {color: #${McmodderValues.formatColors[7]};}
.mcmodder-format-color-8 {color: #${McmodderValues.formatColors[8]};}
.mcmodder-format-color-9 {color: #${McmodderValues.formatColors[9]};}
.mcmodder-format-color-10 {color: #${McmodderValues.formatColors[10]};}
.mcmodder-format-color-11 {color: #${McmodderValues.formatColors[11]};}
.mcmodder-format-color-12 {color: #${McmodderValues.formatColors[12]};}
.mcmodder-format-color-13 {color: #${McmodderValues.formatColors[13]};}
.mcmodder-format-color-14 {color: #${McmodderValues.formatColors[14]};}
.mcmodder-format-color-15 {color: #${McmodderValues.formatColors[15]};}
.mcmodder-format-bold {font-weight: bold;}
.mcmodder-format-italic {font-style: italic;}
.mcmodder-format-strikethrough:not(.mcmodder-format-underline) {text-decoration: line-through;}
.mcmodder-format-underline:not(.mcmodder-format-strikethrough) {text-decoration: underline;}
.mcmodder-format-underline.mcmodder-format-strikethrough {text-decoration: line-through underline;}
.mcmodder-format-obfuscated {background-color: var(--mcmodder-tca3);}
.mcmodder-format-formatter {opacity: 0.5;}
.mcmodder-format-placeholder {background-color: var(--mcmodder-tca3);}
.common-center .item-table i {
  background-image: url(//i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png);
  background-position: -0px -0px;
  width: 34px;
  height: 34px;
}
.btn-light, .btn-outline-dark {
  background-color: var(--mcmodder-bgd1);
  color: var(--mcmodder-txcolor);
}
.mcmodder-changelog-cover {
  width: 100%;
  background-image: url("https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg");
  display: inline-block;
  height: 200px;
  background-position-y: 100%;
  background-size: 100%;
  position: relative;
}
.mcmodder-changelog-title {
  position: absolute;
  bottom: 1em;
  right: 0;
  color: white;
  text-shadow: 3px 3px 1px #8888;
  font-size: 1.875em;
}
.mcmodder-changelog-subtitle {
  position: absolute;
  bottom: .7em;
  right: .5em;
  color: white;
}
.mcmodder-changelog-content {
  max-height: 300px;
  overflow: scroll;
  text-align: left;
  font-size: 14px;
}
.mcmodder-changelog li {
  margin-left: 2em;
}
.mcmodder-changelog ul li {
  list-style-type: disc;
}
.mcmodder-presubmit-editor {
  width: 100%;
}
#item-used-item, #item-search-item {
  margin-top: .5em;
}
.mcmodder-rednum {
  z-index: 1;
  position: absolute;
  top: 2px;
  right: -2px;
  padding: 0 4px;
  min-width: 15px;
  border-radius: 10px;
  background-color: #fa5a57;
  color: #fff;
  font-size: 12px;
  line-height: 15px;
}
.mcmodder-gui-in {
  position: absolute;
  right: 0;
  bottom: -.25em;
  color: var(--mcmodder-tc1);
  text-shadow: 2px 2px 1px var(--mcmodder-td1);
}
.mcmodder-gui-out {
  position: absolute;
  right: 0;
  bottom: -.25em;
  color: var(--mcmodder-tc2);
  text-shadow: 2px 2px 1px var(--mcmodder-td2);
}
.mcmodder-progress {
  display: flex;
  height: 1rem;
  overflow: hidden;
  font-size: .75rem;
  border-radius: .25rem;
  background-color: var(--mcmodder-ts);
}
.mcmodder-progress-bar {
  background-color: var(--mcmodder-tca1);
  transition: width .6s ease;
  position: absolute;
  height: 100%;
}
.mcmodder-progress-per {
  position: absolute;
  width: 100%;
  text-align: center;
  color: var(--mcmodder-td1);
  text-shadow: 1px 1px var(--mcmodder-bgn);
}
.jsonframe-table {
  font-size: 14px;
}
.mcmodder-table-container {
  position: relative;
  transition: height 1s ease 0s;
  min-height: 150px;
}
.mcmodder-table-loading-overlay {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: var(--mcmodder-bg);
  backdrop-filter: blur(3px) contrast(50%);
  opacity: 1;
  transition: opacity 0.8s ease-in-out 0s;
  overflow: hidden;
  z-index: 1;
}
.mcmodder-table-loading-overlay.faded {
  opacity: 0;
}
.mcmodder-table-loading-container {
  height: 100%;
  max-height: 300px;
  position: relative;
}
.mcmodder-table-loading-progress {
  position: absolute;
  width: 16em;
  left: calc(50% - 8em);
  bottom: calc(50% - 5em);
}
.mcmodder-loading {
  height: 100%;
  width: 100%;
  position: relative
}
.mcmodder-loading:before, .mcmodder-loading:after {
  content: "";
  width: 2em;
  height: 2em;
  border-radius: 50%;
  position: absolute;
  top: calc(50% - 1em);
}
@keyframes mcmodder-loading-first {
  from {
    transform: scale(0.5);
  }
  to {
    transform: scale(1);
  }
}
@keyframes mcmodder-loading-second {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(0.5);
  }
}
.mcmodder-loading:before {
  background-color: var(--mcmodder-tc1);
  transform-origin: right center;
  left: calc(50% - 2em);
  animation: mcmodder-loading-first 1s ease-in-out 0s infinite alternate
}
.mcmodder-loading:after {
  background-color: var(--mcmodder-tc2);
  transform-origin: left center;
  right: calc(50% - 2em);
  animation: mcmodder-loading-second 1s ease-in-out 0s infinite alternate
}
.verify-rowlist,
#mcmodder-verify-search,
#mcmodder-mod-search,
#mcmodder-fetch-version-cf,
#mcmodder-fetch-version-mr,
#mcmodder-template-title,
#mcmodder-template-description,
#mcmodder-history-search,
#mcmodder-template-search,
#jsonframe-submit-classid {
  text-align: center;
}
#mcmodder-gotopage {
  width: 50px;
  text-align: center;
  display: inline;
}
#mcmodder-version-menu {
  margin-top: var(--mcmodder-padwidth-1);
}
.mcmodder-table,
#block-selector {
  Width: 100%;
}
#mcmodder-editnum,
#mcmodder-editbyte {
  width: 5em;
  height: 2em;
  border-radius: .5em;
  padding: .3em;
  border: 1px solid var(--mcmodder-tca2);
  background-color: transparent;
}
#mcmodder-lv-input {
  text-align: center;
  height: 20px;
  width: 25px;
  margin-right: 0px;
  color: yellow;
  background: transparent;
  border: none;
  font-weight: bold;
  text-shadow: 1px 1px 1px #333;
}
.mcmodder-table {
  margin-top: 0;
  background-color: var(--mcmodder-bg);
  overflow: hidden;
}
.mcmodder-table-empty {
  height: 100px;
  min-height: 100px;
  position: relative;
}
.mcmodder-table-empty::before {
  content: "暂无数据";
  text-wrap: nowrap;
  position: absolute;
  width: 100%;
  line-height: 100px;
  color: gray;
  text-align: center;
}
.mcmodder-table:not(#block-selector) tbody {
  white-space: nowrap;
  overflow: hidden;
}
.mcmodder-table thead {
  height: 1em;
}
.mcmodder-table td,
.mcmodder-table th {
  border-width: 1px;
  border-style: solid dashed;
  border-color: var(--mcmodder-tc1) var(--mcmodder-tcaa1);
  text-align: center;
  max-width: 500px;
  text-overflow: ellipsis;
  overflow: hidden;
}
.mcmodder-data-frame {
  overflow: hidden;
  max-width: 600px;
  max-height:400px;
  text-align: left;
  display: inline-block
}
.mcmodder-data-frame img {
  max-height: 135px;
  max-width: 240px;
}
#mcmodder-splash-text {
  width: 100%;
  height: 300px;
}
.tooltip .item-info-table {
  display: inline-block;
  width: unset;
  vertical-align: top;
  margin: 2em 1em 0 0;
}
.mcmodder-data-frame .quote_text legend {
  font-size: 12px;
  color: #777;
}
.mcmodder-mark-gold {
  background-color: #fd04;
  border: 1px solid #fd08;
}
.mcmodder-mark-aqua {
  background-color: #8fd4;
  border: 1px solid #8fd8;
}
.mcmodder-mark-pink {
  background-color: #fcc4;
  border: 1px solid #fcc8;
}
.mcmodder-mark-greenyellow {
  background-color: #bf34;
  border: 1px solid #bf38;
}
pre#mcmodder-text-result {
  font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
  display:block;
  border:1px solid var(--mcmodder-tca1);
  color:var(--mcmodder-txcolor);
  max-height:300px;
  padding:.25em;
  font-size:12px;
}
pre del,
#del_num {
  font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";
  text-decoration:none;
  color:var(--mcmodder-pre-del);
  background:#f333
}
pre ins,
#ins_num {
  font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";
  color:var(--mcmodder-pre-ins);
  text-decoration:none;
  background:#3f33
}
.mcmodder-monospace {
  font-family: Consolas, monospace;
}
.mcmodder-mold-num {
  position: absolute;
  right: .3em;
  bottom: 0;
  font-style: italic;
  opacity: .1;
  font-size: 3em !important;
}
.waifu .waifu-tips {
  box-sizing: content-box;
}
#item-icon-16x-preview-img {
  display: inline-block;
  margin: 10px 0;
  border: 1px solid #DDD;
  border-radius: 5px;
  padding: 2px;
}
#icon-32x-editor,
#icon-128x-editor {
  width: 50%;
  display: inline-block;
  margin-right: 1em;
}
#mcmodder-crash-protector {
  margin-left: 10px;
}
#edui1,
.common-center,
.mold,
.progress-list,
.class-item-type li,
.post-block,
.tools-list li > *,
.comment-row,
.common-center .item-data,
.item-table-area,
.common-icon-text.edit-history,
.bd-callout,
.tab-ul > .text-danger,
.center-task-block,
.center-content.lv-info,
.center-card-block.badges,
.modlist-block,
.verify-info-table,
.common-world-gen-block,
.common-world-gen-data,
.header-search form .class-info-right > ul,
.item-text > .item-info-table,
.class-excount:not(.mcmodder-disable-modern),
.common-text-menu,
#mcmodder-text-result,
.mcmodder-golden-alert,
.mcmodder-gui-alert,
.mcmodder-changelog,
.mcmodder-almanacs .good,
.mcmodder-almanacs .bad,
.sl-state-block,
.header-right .header-search form,
.form-control,
.bootstrap-tagsinput,
.modal-content,
footer,
.un_links,
.under,
.row.footer,
.page-header,
.swal2-popup,
.popover,
.center-card-view,
.common-center .right .class-info .class-info-left .author li .member,
.common-center .left,
.class-info-right:not(.mcmodder-disable-modern),
.class-text,
.center-block,
.center-total,
.item-list-filter,
.item-list-table,
.item-row,
.common-menu-area,
.rank-head-frame,
.rank-list-frame,
.common-center .center > div:not(.right,
.logreg-frame),
.author-row > div:not(.dropdown),
.donate-frame > *:not(hr),
.center > fieldset,
.center > ul,
.center .main > div:not(.nav,
.mbx),
.oredict-list-table,
.modal-content,
*:not(.center-block) > .common-comment-block.lazy,
.common-center .left,
.common-center .post-row,
.version-content-empty,
.swal2-popup,
.popover,
.panel,
.panel-default,
.edit-unlogining,
.common-select,
.item-table-main,
.log-frame > p,
.about-frame > *,
body > .container > *,
.modfile-main-frame > *,
.panel-title,
.tag li,
.mcver li a,
.common-center .maintext .itemname .tool,
.author-user-frame .author-tool,
.common-center .right .class-relation-list .relation li,
.common-fuc-group li,
#server-tool li,
.edit-tools > span,
.center-sub-menu a,
.center-content.admin-list a,
.center-card-border,
.common-center .post-row .postname .tool li a,
.edit-tools a,
.center-main.attitude li,
.bootstrap-tagsinput .tag,
.list_item,
.ta_date,
.ta_calendar,
.logreg-suggest,
.logreg-panel,
.common-menu-page,
.dropdown-toggle,
.link-list li.link-row,
#relation-frame .relation-list,
#modlist-frame .modlist-list,
#relation-frame .relation-list .relation-group li,
#modlist-frame .modlist-list .modlist-group li {
  background-color: var(${this.utils.getConfig("mcmodderUI") ? "--mcmodder-bg" : "--mcmodder-bgn"});
}
.swal2-popup-wider {
  width: 80em;
}
.swal2-popup .pagination {
  justify-content: center;
  margin-bottom: 0;
}
.pagination .page-custom {
  line-height: 0;
  background-color: var(--mcmodder-bgn);
  text-align: center;
  padding: 0 .5em 0 .5em;
}
.mcmodder-text-stats > span {
  font-size: 14px;
  background-color: var(--mcmodder-bgn);
  margin-right: .5em;
}
.common-rowlist-block .title,
.common-imglist-block .title,
.common-nav {
  background-color: var(${this.utils.getConfig("mcmodderUI") ? "--mcmodder-bg" : "--mcmodder-bgd1"});
}
.bootstrap-select > .dropdown-toggle::after {
  color: var(--mcmodder-txcolor);
}
.common-center,
.edui-default .edui-bubble .edui-popup-content::after,
.tooltip-inner::after {
  border-color: var(--mcmodder-bg);
}
.bs-tooltip-top .arrow::before {
  border-top-color: var(--mcmodder-bg);
}
#header-search-input {
  background-color: transparent;
}
.center-main.favorite .favorite-slot-ul li,
.common-user-card .card-userinfo .exp-rate {
  border-color: transparent;
  background-color: transparent;
}
.common-center .left .class-rating-block #class-rating {
  background: unset;
}
.pages_system .Pbtn,
.pages_system .Pbtn_on {
  background-color: transparent !important;
}
.mcmodder-golden-alert {
  background-color: #fe8d;
  width: 90%;
  display: inline-block;
  text-align: center;
}
.edit-autolink-list li {
  url(//www.mcmod.cn/images/cursor/hand.png), auto;
}
.edit-autolink-source {
  text-align: center;
  display: flex;
  justify-content: center;
  font-size: 16px;
}
.mcmodder-link-check {
  background-color: var(--mcmodder-tcaa1);
  border-radius: 4px;
  margin: 0 2px 0 2px;
}
.mcmodder-link-warn {
  border: 2px solid var(--mcmodder-tc3);
}
.center-block-head .text {
  font-size: 12px;
  color: gray;
  margin-left: 1em;
}
.verify-list-search-area label span {
  color: gray;
  margin-left: 0px;
}
#item-table-item-frame .delete {
  position: absolute;
  bottom: 0px;
  right: 0px;
  color: var(--mcmodder-tc3);
}
.mcmodder-almanacs i {
  background-image: url(https://i.mcmod.cn/editor/upload/20250731/1753943312_179043_WEbO.png);
  width: 40px;
  height: 40px;
  float: left;
  margin-right: 10px;
  display: block;
}
.mcmodder-almanacs .content {
  width: 100%;
  display: flex;
}
.mcmodder-almanacs .date {
  line-height: 40px;
  font-size: 22px;
  color: var(--mcmodder-txcolor);
}
.mcmodder-almanacs .date:hover {
  text-decoration: none;
}
.mcmodder-almanacs .lore {
  color: #888;
  margin-left: 30px;
  float: left;
}
.mcmodder-almanacs .good {
  position: relative;
  flex: 1;
  background-color: #f7f7b8;
}
.mcmodder-almanacs .bad {
  position: relative;
  flex: 1;
  background-color: #ffceac;
}
.mcmodder-almanacs .block {
  width: 50%;
  display: inline-block;
  font-size: 16px;
}
.mcmodder-almanacs .block .title {
  color: var(--mcmodder-td1);
  font-weight: bold;
  text-shadow: 2px 2px 2px var(--mcmodder-ts);
}
.mcmodder-almanacs .more {
  float: right;
  font-size: 12px;
  line-height: 20px;
}
.mcmodder-almanacs .more a {
  margin: 10px 0 0 10px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid #ccc;
  text-decoration: none;
}
.common-center .center {
  max-width: unset;
}
.mcmodder-candle {
  display: block;
  width: 40px;
  height: 40px;
  position: absolute;
  background-image: url("https://i.mcmod.cn/editor/upload/20250802/1754100652_179043_shqU.png");
  background-size: cover;
}
.mcmodder-cake,
.mcmodder-10th-cake {
  background-size: cover;
  position: relative;
  display: inline-block;
  width: 150px;
  height: 150px;
}
.mcmodder-cake {
  background-image: url("https://i.mcmod.cn/editor/upload/20250802/1754100170_179043_DWqe.png");
}
.mcmodder-10th-cake {
  background-image: url("https://i.mcmod.cn/editor/upload/20250802/1754102714_179043_nNzj.png");
}
.mcmodder-mod-sort legend {
  font-size:14px;
  width:auto;
  margin:0 0 10px 10px;
  color:var(--mcmodder-txcolor) !important;
}
.mcmodder-mod-sort fieldset {
  border:1px solid #DDD;
  padding:0;
  margin:0;
  margin-bottom:10px;
  display:inline-block;
}
.mcmodder-mod-sort fieldset:last-child {
  margin-bottom:0
}
#mcmodder-unique-splashes {
  margin-top: 1em;
}
.mcmodder-admin-container {
  display: flex;
}
.mcmodder-admin-container .title::before {
  content: "\u2726 ";
}
.center-content.admin-list.mcmodder-admin-developer .title {
  color: var(--mcmodder-developer);
}
.center-content.admin-list.mcmodder-admin-editor .title {
  color: var(--mcmodder-editor);
}
.center-content.admin-list.mcmodder-admin-admin .title {
  color: var(--mcmodder-admin);
}
.mcmodder-jump {
  color: var(--mcmodder-jump);
}
.mcmodder-general {
  color: var(--mcmodder-general);
}
#mcmodder-mdeditor,
div#editor-ueeditor,
.mcmodder-option-bar .checkbox {
  display: inline-block;
}
#mcmodder-markdown-it {
  display: block;
}
.syntaxhighlighter {
  overflow: scroll;
  background-color: var(--mcmodder-bgn);
}
.header-layer {
  background-color: var(--mcmodder-bgn) !important;
}
.item-h5-ename::before {
  content: " "
}
#mcmodder-json-compare-frame {
  display: block;
}
#mcmodder-json-compare-frame > .mcmodder-jsonframe {
  display: inline-block;
  width: 100%;
  border: 1px solid var(--mcmodder-td2);
  vertical-align: top;
}
.mcmodder-contextmenu {
  position: absolute;
  top: 0;
  z-index: 1;
  padding: .2em;
  background-color: var(--mcmodder-bgn);
  border-radius: .5em;
  font-size: 14px;
  box-shadow: 0px 5px 15px gray;
  opacity: 1;
  transition: opacity 0.2s ease-out 0s, transform 0.2s cubic-bezier(.18,.89,.32,1.28) 0s;
}
.mcmodder-contextmenu.expand-right {
  transform: translateX(-1em);
}
.mcmodder-contextmenu.expand-left {
  transform: translateX(1em);
}
.mcmodder-contextmenu.faded {
  opacity: 0;
  transform: translateX(0em);
}
.mcmodder-contextmenu-inner {
  position: relative;
}
.mcmodder-contextmenu-inner .arrow::before {
  content: "";
  position: absolute;
  border: 0.5em solid transparent;
  width: 0;
  height: 0;
}
.mcmodder-contextmenu.expand-right .arrow::before {
  left: calc(-2 * var(--mcmodder-padwidth-2));
  top: .25em;
  border-right-color: var(--mcmodder-bgn);
}
.mcmodder-contextmenu.expand-left .arrow::before {
  right: calc(-2 * var(--mcmodder-padwidth-2));
  top: .25em;
  border-left-color: var(--mcmodder-bgn);
}
.mcmodder-contextmenu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.mcmodder-contextmenu li {
  padding: .1em .5em;
  border-radius: .3em;
  text-wrap: nowrap;
}
.mcmodder-contextmenu li.empty {
  color: gray;
}
.mcmodder-contextmenu li:not(.empty):hover {
  background-color: var(--mcmodder-tcaa1);
}
.jsonframe-menu {
  padding: 3px;
  width: 100%;
  overflow: scroll;
  white-space: nowrap;
}
.jsonframe-fixedmenu {
  position: fixed;
  top: 50px;
}
.jsonframe-menu > * {
  margin-right: .5em;
}
.jsonframe-select {
  max-width: 250px;
  text-align: left
}
.jsonframe-import-label {
  margin-bottom: 0;
}
.jsonframe-content {
  min-height: 300px;
  background-color: var(--mcmodder-tcaa2);
  width: 100%;
  overflow: scroll;
}
.jsonframe-content tr[data-index] {
  height: 48px;
}
.jsonframe-content th,
.jsonframe-content td {
  white-space: nowrap;
}
.mcmodder-table tr.selected {
  box-shadow: 0 0 0 3px var(--mcmodder-tca2) inset;
  backdrop-filter: sepia(40%);
}
.mcmodder-table tr.selected:after {
  content: "\\f00c";
  font-size: 24px;
  position: absolute;
  right: .25em;
  bottom: 0;
  color: var(--mcmodder-td2);
  font-family: FontAwesome;
}
.mcmodder-table tr.mcmodder-table-unsaved-tr.selected:after {
  color: var(--mcmodder-td1);
}
.jsonframe-content table img {
  margin-bottom: 0;
  width: 32px;
  height: 32px;
}
.jsonframe-oredict {
  margin-right: .25em;
}
.mcmodder-table-mouseover-tr > td:not(.mcmodder-table-mouseover-td) {
  backdrop-filter: brightness(95%) saturate(300%);
}
.mcmodder-table-mouseover-tr > .mcmodder-table-mouseover-td {
  backdrop-filter: brightness(90%) saturate(300%);
}
.form-control.mcmodder-table-input {
  padding: .1em;
  border-radius: 0;
}
.mcmodder-table-unsaved-td {
  font-weight: bold;
  background-color: var(--mcmodder-tca1);
}
.mcmodder-table-unsaved-tr {
  background-color: var(--mcmodder-tca1);
}
.jsonframe-export-text {
  text-align: center;
  font-size: 14px;
  margin: .5em 0 .5em 0;
}
#mcmodder-profile-frame {
  max-height: 600px;
  overflow: scroll;
}
.profile-option {
  position: relative;
  height: 100px;
  border: 1px solid var(--mcmodder-tc1);
  margin-top: 3px;
  border-radius: 10px;
}
.profile-option.empty-profile {
  align-content: center;
  color: gray;
}
.profile-option .avatar {
  width: 80px;
  height: 80px;
  position: absolute;
  left: 10px;
  top: 10px;
}
.profile-option .avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}
.profile-selected {
  background: linear-gradient(45deg, var(--mcmodder-tcaa1), var(--mcmodder-tcaa2));
}
.profile-option:hover {
  background-color: var(--mcmodder-bg);
}
.profile-option .info {
  padding: 5px 10px 5px 100px;
  text-align: left;
}
.profile-option .info .title {
  text-wrap: nowrap;
  overflow: clip;
  text-overflow: ellipsis;
}
.profile-option .info .title .uid {
  font-size: 16px;
  margin-right: .25em;
}
.profile-option .info .title .lv a {
  font-size: 14px;
  color: white;
}
.profile-option .text {
  color: gray;
  font-size: 14px;
}
.profile-option .text .delete {
  color: var(--mcmodder-tc3);
  position: absolute;
  top: 5px;
  right: 5px;
}
.mcmodder-keybind-input {
  width: 240px;
  display: inline-block;
  text-align: center;
}
.presubmit-list tbody {
  font-size: 14px;
}
.item-used-frame,
.item-search-frame {
  width: 100%;
  max-height: 500px;
  margin-bottom: .5em;
}
.mcmodder-horizontal-divider {
  position: absolute;
  height: 100%;
  background-color: var(--mcmodder-tc1);
  left: 50%;
  width: 10px;
  cursor: col-resize;
  top: 0;
}
.mcmodder-horizontal-divider:hover {
  background-color: var(--mcmodder-td1);
  -webkit-user-select: none;
  user-select: none;
}
.mcmodder-horizontal-flex {
  width: 50%;
  height: 100%;
}
.mcmodder-horizontal-flex-absolute {
  position: absolute;
  top: 0;
  background-color: var(--mcmodder-bg);
  backdrop-filter: blur(5px);
}
.mcmodder-horizontal-flex-left {
  left: 0;
}
.mcmodder-horizontal-flex-right {
  right: 0;
}
.mcmodder-horizontal-window {
  position: absolute;
  padding: 1em;
  max-height: 100vh;
  overflow: scroll;
  width: 100%;
}
.class-menu-page,
.link-list li.link-row,
.modlist-block .title p,
.others-list li,
#relation-frame .relation-list,
#modlist-frame .modlist-list,
#relation-frame .relation-list .relation-group li,
#modlist-frame .modlist-list .modlist-group li,
.class-excount .infos,
.common-index-block ul.list-block .info,
.page-app::before,
.server-list-index .page-app,
#server-tool .action {
  background: transparent;
  border: unset;
}`,
    mcmodderUI: `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.btn,
.btn-dark {
  background:linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));
  color: var(--mcmodder-txcolor);
  border-color: 1px solid var(--mcmodder-bg);
}
.dropdown-item.active {
  background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));
}
.tooltip-inner,
body .edui-default .edui-bubble .edui-popup-content {
  background: var(--mcmodder-bg);
  color: var(--mcmodder-txcolor);
}
.btn-outline-dark {
  border-color:var(--mcmodder-tda1)
}
.common-imglist a[rel=nofollow] img,
.sidebar .user-info img {
  border-radius: 50%
}
.common-rowlist-block .title,
.common-imglist-block .title,
.popover-header {
  background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2));
}
body > .content,
.fold-list-object-ul .count,
.item-table-gui-slot .view,
.table-striped > tbody > tr:nth-of-type(2n+1),
.common-select .find-close,
.tools-list li,
.syntaxhighlighter .line.alt1,
.syntaxhighlighter .line.alt2 {
  background-color: transparent;
}
.common-center .maintext .itemname .name h5,
.itemname h5,
.center-block-head .title,
.common-center .post-row .postname .name h5,
.common-center .right .class-title h3,
.mcmodder-data-frame .class-title h3,
.common-comment-block .comment-title,
.mcmodder-title,
.modal-title,
.tools-title {
  text-decoration: underline 4px var(--mcmodder-tc1);
  text-underline-position: under;
  line-height: 2;
  font-size: 24px;
}
.itemname h5 {
  margin: 0 0 .5em 0;
}
.item-h5-ename {
  font-size: 16px;
  font-weight: lighter;
  color: gray;
}
.class-title .short-name {
  font-size: 18px;
  font-weight: bold;
  margin-right: 5px;
  display: inline-block;
}
.class-title h3 {
  font-size: 18px;
  font-weight: bold;
  display: inline-block;
  margin: 0;
}
.class-title h4 {
  font-size: 15px;
  color: #777;
  display: inline-block;
  margin: 0 0 0 10px;
}
.header-layer .header-layer-block .title,
.center-content.admin-list .title,
.modlist-filter-block .title,
.common-center .right .tab-content ul.tab-ul p.title,
.mcmodder-subtitle,
.col-form-label {
  text-decoration: underline 3px var(--mcmodder-tc1);
  text-underline-position: under;
  line-height: 2;
  font-size: 18px;
  font-weight: unset;
  color: var(--mcmodder-txcolor);
}
.common-center {
  background-color: transparent;
  margin-top: 6em;
  border: unset;
  padding: .5em;
  border-radius: 0px
}
.common-center.content-expanded {
  margin: 0 10% 0 10%;
  width: 80%;
}
.common-frame {
  padding: 0px;
  max-width: unset;
}
.col-lg-12.common-rowlist-2 .title,
.center-total li .title,
.class-info-left .col-lg-6 .title,
.verify-rowlist .title,
.class-excount .infos .span .n {
  color: var(--mcmodder-txcolor);
  justify-content: center;
  display: flex;
  width: 100%;
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.center-total li .title {
  overflow: unset;
}
.class-excount,
.comment-dl-tips {
  width: unset;
}
.col-lg-12.common-rowlist-2 .text,
.center-total li .text,
.class-info-left .col-lg-6 .text,
.verify-rowlist .text {
  color: #666;
  text-align: center;
  display: block;
  width: 100%;
  font-size: 12px;
}
.common-center .maintext .item-give {
  width: unset;
  border: unset;
  background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2))
}
.common-center .maintext .item-give span {
  font-size: 14px;
  color: unset;
  font-family: consolas, monospace;
}
body .common-nav {
  padding: 0 .8em 0 .8em;
  margin-top: 8em;
}
.item-dict a {
  color: var(--mcmodder-txcolor);
  font-family: consolas, monospace;
  border-radius: 10px;
  background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2));
  padding: 5px;
  margin-right: .5em;
}
.center-content.admin-list li,
.center-content.edit-list li,
.common-rowlist.borderbottom li,
.header-layer .header-layer-block li,
.common-center .right .class-relation-list .relation li,
.item-search-frame,
.item-used-frame {
  padding-bottom: .3em;
  border-bottom: 2px dashed var(--mcmodder-tca1);
}
.col-lg-6 {
  padding: 0;
  display: inline-block;
}
.header-layer {
  padding: 1em !important;
  padding-left: 3em !important;
  padding-right: 3em !important;
  backdrop-filter: blur(10px);
}
border: unset;
.header-layer .header-layer-block {
  width: 250px;
}
.header-menu-widget-homepage .header-layer-block.layer-category {
  width: 170px !important;
}
.header-layer .header-layer-block li:nth-child(2n+1) {
  margin-right: 25px;
}
.class-menu-page li i,
.common-fuc-group i,
#server-tool i,
.server-listtype-switch li i,
.header-layer-block i,
.common-center .class-edit-block li a i,
.common-menu-page li i,
.center-main.favorite .favorite-fold-fuc i,
.common-center .right .class-relation-list .relation i,
.center-main.attitude li i {
  color: var(--mcmodder-td1);
  margin-right: .5em
}
.class-excount .star .fire i {
  color: goldenrod;
}
.class-menu-page li.active,
.common-menu-page li.active {
  border-top-color: var(--mcmodder-td2);
}
.center-menu li.active a,
.center-menu li:hover a {
  border-bottom-color: var(--mcmodder-td2)
}
.center-content.lv-info .lv-bar .progress-bar,
#mcmodder-progress {
  background: linear-gradient(90deg,var(--mcmodder-tc1),var(--mcmodder-tc2));
}
.common-center .right .class-info .class-info-left .author li {
  height: 60px;
}
.common-center .right .class-info .class-info-left .author li .avatar {
  width: 55px;
  height: 55px;
}
.common-center .right .class-info .class-info-left .author li .member {
  padding: 5px 10px;
  border: unset;
  border-radius: unset;
  max-width: 160px;
}
.common-center .right .class-info .class-info-left .author li a {
  font-size: 14px;
}
.common-center .right .class-info .class-info-left .author li .avatar img {
  width: 55px;
  height: 55px;
  padding: 5px;
  border-radius: 50%;
}
.common-center .right .class-info .class-info-left .author .frame {
  height: unset;
}
.common-center .right .class-info .class-info-left .author li .member .name {
  max-width: 245px;
}
.structure-block-label .item-table-hover-t1,
.structure-block-label .item-table-hover-t2 {
  color: #ddd !important;
}
.common-fuc-group .action {
  background-color: #fff8;
  padding: 2px;
}
.tooltip-inner,
body .edui-default .edui-bubble .edui-popup-content {
  max-width: unset;
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: .5em 1em;
  animation: fadeIn .3s ease-out forwards;
  border: solid 10px;
  border-image: linear-gradient(45deg, var(--mcmodder-tc1), var(--mcmodder-tc2)) 1 stretch;
  clip-path: inset(0 round 1rem);
  position: relative;
  box-shadow: 5px 5px 5px gray;
}
.common-center .right {
  padding-left: 280px;
}
.col-lg-12.server-listtype-switch {
  padding-left: 1em;
}
.tooltip-inner::after,
.edui-default .edui-bubble .edui-popup-content::after {
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  content: '';
  border-radius: 10px;
  z-index: -2;
  border: 5px solid var(--mcmodder-bg);
}
.bs-tooltip-auto[x-placement^="top"] .arrow::before,
.bs-tooltip-top .arrow::before {
  backdrop-filter: blur(10px);
}
.class-excount .star .block-left,
.bootstrap-tagsinput .tag {
  background: linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));
}
body .header-user .header-user-info .header-panel.mcmodder-header-panel-fixed {
  position: fixed;
  left: unset;
  right: 50px;
}
@media (max-width: 1200px) {
  body .header-user .header-user-info .header-panel {
    left: unset;
    right: 0;
  }
}
.header-user .header-user-info .header-panel {
  left: -200%;
}
.header-user .header-user-info .header-panel {
  width: 400px !important;
  padding-top: 70px;
  animation: fadeIn ease-out .2s both
}
.header-user .header-user-info .header-panel .header-layer {
  padding: 1em !important;
}
.header-user .header-user-info .header-panel .header-layer-block {
  margin-top: 75px;
}
.mcmodder-profile {
  position: absolute;
  left: 50%;
  top: -55px;
  transform: translate(-50%);
}
.mcmodder-profile img {
  width: 110px;
  height: 110px;
  padding: 2px;
  background-color: var(--mcmodder-badges);
  border-radius: 50%;
  margin-bottom: 0.8em;
}
.mcmodder-profile p {
  font-weight: bold;
}
.syntaxhighlighter {
  background-color: var(--mcmodder-bg);
}
.header-layer {
  background-color: var(--mcmodder-bg) !important;
}
.header-layer {
  position: relative;
}
.common-center .left,
.common-center .right:not(.col-lg-12) {
  width: 275px;
}
.common-center .left {
  position: absolute;
  left: 0;
}
.mcmodder-class-init.col-lg-12.right {
  padding-right: 280px;
}
@media (min-width: 1281px) {
  .common-center .right .class-info .class-info-left.mcmodder-class-source-info,
  .mcmodder-info-right {
    display: none;
  }
}
@media (max-width: 1280px) {
  .common-center .right:not(.col-lg-12) {
    display: none;
  }
  .common-center .right .class-info .class-info-left.mcmodder-class-source-info,
  .mcmodder-info-right,
  .mcmodder-largeicon-control,
  .mcmodder-gui-control {
    display: block;
  }
  .mcmodder-info-right {
    width: 230px;
  }
  .mcmodder-class-init.col-lg-12.right {
    padding-right: 0;
  }
  .common-center {
    margin: 0 1% 0 1%;
    width: 98%;
  }
}
.class-text {
  margin: 0 1em 0 1em;
}
.mcmodder-modloader {
  height: 24px;
  margin: 3px;
  display: flex;
  justify-content: center;
}
.mcmodder-loadername {
  font-size: 16px;
  margin-left: .2em;
}
.common-nav,
.common-center .left,
.class-info-right:not(.mcmodder-disable-modern),
.class-text,
.center-block,
.center-total,
.item-list-filter,
.item-list-table,
.item-row,
.common-menu-area,
.rank-head-frame,
.rank-list-frame,
.common-center .center > div:not(.right,
.logreg-frame),
.author-row > div:not(.dropdown),
.donate-frame > *:not(hr),
.center > fieldset,
.center > ul,
.center .main > div:not(.nav,
.mbx),
.oredict-list-table,
.modal-content,
*:not(.center-block) > .common-comment-block.lazy,
.common-center .left,
.common-center .post-row,
.version-content-empty,
.swal2-popup,
.popover,
.panel,
.panel-default,
.edit-unlogining,
.common-select,
.item-table-main,
.log-frame > p,
.about-frame > *,
body > .container > *,
.modfile-main-frame > * {
  border-radius: 1em;
  padding: 1em;
  box-shadow: rgba(50, 50, 100, 0.5) 0px 2px 4px 0px;
  margin-bottom: 10px;
}
.panel-title {
  padding: 1em;
  margin: -1em;
  margin-bottom: calc(2 * var(--mcmodder-padwidth-2));
  border-radius: 1em 1em 0 0;
}
.item-list-table {
  border-radius: 0;
}
.bd-callout p {
  font-size: 12px;
  color: #6c757d;
}
#edui1,
.mold,
.progress-list,
.class-item-type li,
.post-block,
.tools-list li > *,
.comment-row,
.common-center .item-data,
.item-table-area,
.common-icon-text.edit-history,
.bd-callout,
.tab-ul > .text-danger,
.center-task-block,
.center-content.lv-info,
.center-card-block.badges,
.common-center .maintext .item-give,
.modlist-block,
.verify-info-table,
.common-world-gen-block,
.common-world-gen-data,
.header-search form .class-info-right > ul,
.item-text > .item-info-table,
.class-excount:not(.mcmodder-disable-modern),
.common-text-menu,
.mcmodder-presubmit-editor,
#mcmodder-text-result,
.mcmodder-golden-alert,
.mcmodder-gui-alert,
.mcmodder-changelog,
.mcmodder-almanacs .good,
.mcmodder-almanacs .bad,
.sl-state-block {
  border-radius: 1em;
  margin: .6em;
  padding: .2em .6em;
  box-shadow: rgba(50, 50, 100, 0.2) 0px 2px 4px 0px;
}
.mcmodder-gui-alert {
  max-width: 60%;
  background: linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));
  padding: .2em 1em;
  line-height: 1.8
}
.mcmodder-logger {
  height: 300px;
  max-height: 300px;
  background-color: #313131;
  margin-top: .5em;
  padding: .5em;
  color: white;
  font-size: 12px;
  overflow: scroll;
}
.mcmodder-logger * {
  font-family: inherit;
  line-height: 1.5em;
}
.mcmodder-logger .warn {
  color: orange;
}
.mcmodder-logger .error {
  color: orangered;
}
.mcmodder-logger .fatal {
  color: red;
}
.mcmodder-logger .success {
  color: lime;
}
.mcmodder-logger .key {
  color: orchid;
}
.tag li,
.mcver li a,
.common-center .maintext .itemname .tool,
.author-user-frame .author-tool,
.common-center .right .class-relation-list .relation li,
.common-fuc-group li,
#server-tool li,
.edit-tools > span,
.mcmodder-text-stats > span,
.center-sub-menu a,
.center-content.admin-list a,
.center-card-border,
.common-center .post-row .postname .tool li a,
.edit-tools a,
.center-main.attitude li,
.bootstrap-tagsinput .tag,
.list_item,
.ta_date,
.ta_calendar,
.logreg-suggest,
.logreg-panel,
.common-menu-page,
.mcmodder-logger {
  border-radius: 1em;
  box-shadow: rgba(50, 50, 100, 0.1) 0px 2px 4px 0px;
  padding: .2em .5em .2em .5em;
  line-height: unset;
}
.common-comment-block.lazy {
  width: unset;
  margin: 1em;
}
.common-comment-block .comment-row {
  padding: 10px 20px 20px 10px;
}
.tooltip.show {
  opacity: 1;
}
.class-info-right {
  vertical-align: top;
  display: inline-block;
  width: 20%;
}
.header-layer-block a {
  color: #334;
}
.header-layer-block li {
  position: relative;
}
.header-user:not(.unlogin) li {
  width: 180px;
}
.header-layer-block .fa {
  position: absolute;
  top: 50%;
  transform: translate(0, -50%);
  color: #666;
}
body .edui-default span.edui-clickable {
  color: #33f;
  text-decoration: unset;
}
body .edui-default .edui-toolbar .edui-button .edui-state-checked .edui-button-wrap,
body .edui-default .edui-toolbar .edui-splitbutton .edui-state-checked .edui-splitbutton-body,
body .edui-default .edui-toolbar .edui-menubutton .edui-state-checked .edui-menubutton-body,
body .edui-default .edui-menu-body .edui-state-hover,
body .edui-default .edui-list .edui-state-hover,
body .edui-default .edui-toolbar .edui-splitbutton .edui-state-opened .edui-splitbutton-body,
body .edui-default .edui-toolbar .edui-menubutton .edui-state-opened .edui-menubutton-body {
  background-color: var(--mcmodder-tca1);
  border-color: var(--mcmodder-ta1);
}
.common-pages .page-item .page-link {
  background-color: transparent;
  border-color: var(--mcmodder-badges);
}
.common-pages .page-item.active .page-link,
.badge,
.center-menu .badge,
.panel-default .badge,
.author-mods .block .info .badge.badge-mod,
.author-mods .block .info .badge.badge-modpack,
.center-main.favorite .common-pages .page-item.active .page-link,
.center-main.favorite .favorite-fold-list a.active,
.center-main.favorite .favorite-slot-menu ol a.active {
  background-color: var(--mcmodder-tcaa1);
  color: var(--mcmodder-td1);
  border-color: var(--mcmodder-badges);
  text-shadow: 1px 1px 1px var(--mcmodder-badges);
}
.center-main.favorite .favorite-fold-list a.active span {
  color: inherit;
}
.modlist-filter-block ul:not(.common-class-category) li.main span,
.center-item-popover-b {
  background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));
}
.form-control:focus {
  border-color: var(--mcmodder-tc2);
  box-shadow: 0 0 0 .2em var(--mcmodder-tcaa2);
}
.fixed-top {
  position: fixed;
  top: 50px;
  width: 100%;
}
.item-table-block .power_area,
.common-center .right .class-relation-list fieldset {
  border-color: var(--mcmodder-tca1);
  border-radius: .8em;
}
.common-center .right .class-info .class-info-right {
  top: 0;
  right: .5em;
  width: 270px;
}
.common-class-category li .normal,
.c_0 {
  border-radius: 1em;
}
.badge {
  line-height: 1.5;
  border-radius: 1em;
  font-weight: unset;
  padding: .25em .8em;
}
.class-item-type ul, .common-center .right .class-post-frame {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: calc(2 * var(--mcmodder-padwidth-2));
}
.common-center .right .class-post-frame .post-block {
  width: unset;
  padding: 0;
  margin: 0;
}
.common-center .right .class-post-frame .post-block .info {
  padding: .2em .6em;
}
.class-item-type li {
  margin: 0;
  width: 100%;
  height: 100%;
}
.class-item-type li .title {
  font-size: 16px;
}
.mcmodder-content-block:hover {
  background-color: aliceblue;
}
.dark .mcmodder-content-block:hover {
  background-color: #012;
}
.common-center .right .class-info .mcver ul ul li {
  margin-right: unset;
}
.modal-content,
footer,
.un_links,
.under,
.row.footer,
.page-header,
.swal2-popup,
.popover {
  backdrop-filter: blur(20px) brightness(140%);
}
.sidebar {
  background: #3d464daa;
  backdrop-filter: blur(5px);
}
.common-center .maintext .item-text {
  padding-right: 0;
}
.common-center .item-data {
  width: 220px;
}
body .header-container {
  background-image: linear-gradient(#434c53aa, #3c454caa);
  backdrop-filter: blur(5px);
  background-color: transparent;
}
.btn,
.alert,
.form-control,
.bootstrap-tagsinput {
  border-radius: 1em;
  padding: .2em 1em;
  box-shadow: rgba(50, 50, 100, 0.3) 0px 2px 4px 0px;
}
.item-list-filter .form-control {
  border-radius: 1em !important;
}
#center-task-frame .center-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: calc(2 * var(--mcmodder-padwidth-2));
}
#center-task-frame .center-content hr,
.center-block-subhead {
  grid-column: 1 / -1;
  width: 100%;
}
#center-task-frame .center-task-block {
  width: 100%;
  height: 100%;
  margin: 0;
}
.center-task-border,
.center-card-border {
  border: unset;
  margin: unset;
}
.center-card-view {
  margin: 4em 1em;
}
.center-content.post-list .post-block {
  padding: .2em .6em;
  width: 100%;
}
.center-content.post-list .post-block .info .other .click {
  display: inline-block;
  max-width: calc(100% - 3em);
  overflow: hidden;
  text-overflow: ellipsis;
}
.verify-rowlist li {
  width: 10em;
  display: inline-block;
}
.common-center .item-data {
  position: relative;
  z-index: 1;
  float: right;
}
.common-text .common-text-menu {
  width: calc(100% - 2 * var(--mcmodder-padwidth-2));
}
@media (min-width: 991px) {
  .common-text > .common-text-menu,
  .common-center .maintext .quote_text {
    width: calc(100% - 260px);
  }
}
@media (max-width: 990px) {
  .common-text .common-text-menu,
  .common-center .maintext .quote_text {
    width: 100%;
  }
}
.center-content.post-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: calc(2 * var(--mcmodder-padwidth-2));
}
.center-content.post-list .post-block {
  margin: 0;
}
@media(max-width:1200px) {
  .center-total li {
    width: 25%
  }
}
.common-text .item-info-table table {
  width: 100%;
}
.message-main {
  padding-left: 200px !important;
}
.class-excount .star .block-left {
  text-shadow: 2px 2px 2px #333;
}
.center-block-head .more {
  right: 2em;
}
#item-table-item-input {
  width: 100%;
  border-top-right-radius: 1em;
  border-bottom-right-radius: 1em;
}
.header-right .header-user .header-user-avatar img {
  border-color: var(--mcmodder-badges);
}
.common-center .class-edit-block {
  width: unset;
}
.common-link-frame-style-2 ul li {
  width: 100%;
  overflow: initial;
}
.mcmodder-class-info-fold {
  width: 100%;
  color: gray !important;
  margin: 10px 0;
}
.common-center .right .class-relation-list .relation li {
  height: 2em;
}
.class_block .right .list .no1 .rank i {
  background: url(/images/index_icon.png) #fff0;
  background-position: -17px -92px;
}
.class_block .left .list .name a {
  background-color: #fff0;
}
.logreg-panel .input-group-text {
  border-radius: 1rem;
}
.news_block .right .addArea a {
  background-image: url(https://i.mcmod.cn/editor/upload/20250331/1743434611_179043_ghtQ.png)
}
@media(min-width:992px) {
  .item-text > .item-info-table {
    display: none;
  }
}
@media(max-width:991px) {
  .common-center .maintext .item-content > .item-data {
    display: none;
  }
}
.common-text .table-scroll {
  width: auto;
}
.author-user-frame.hascontent {
  width: 220px;
  margin: 0 20px;
}
.common-center .author-row .author-content {
  border-radius: 1em;
  margin-top: 45px;
}
.class-item-type .mold {
  position: relative;
  padding: .6em 1em;
}
body .edui-default .edui-toolbar .edui-button .edui-icon,
body .edui-default .edui-toolbar .edui-menubutton .edui-icon,
body .edui-default .edui-toolbar .edui-splitbutton .edui-icon {
  width: 26px !important;
}
body .edui-default .edui-toolbar .edui-colorbutton .edui-colorlump {
  bottom: -1px;
  left: 4px;
}
.mcmodder-edui-box {
  text-align: center;
  line-height: 1.45;
}
.mcmodder-edui-arrow {
  text-align: center;
  line-height: 2;
  font-size: .7em;
}
.info-frame .radio {
  display: inline-block;
  margin-right: 1em;
}
.item-row .maintext td .item-table-hover {
  width: initial;
  display: inline-block;
}
.verify-list-list td p {
  max-width: unset;
}
.verify-list-list .slidetips {
  display: block;
}
.top-main .top-main .navs .def-nav,
.top-main .top-main .navs .pulldown-nav,
.top-main .top-main .navs .separate {
  font-family: unset;
}
.center .main .nav {
  right: -25px;
}
.common-text table td,
.common-text table th,
.table-bordered:not(.item-list-table) td,
.table-bordered:not(.item-list-table) th,
.table:not(.item-list-table) thead th,
.common-text table,
td,
th {
  border-color: var(--mcmodder-bgd4);
}
.oredict-item-list li .name .sub {
  height: 20px;
  margin-left: 5px;
  display: inline-block
}
.oredict-item-list li .name {
  line-height: 20px;
}
.oredict-item-list li .name .main {
  height: 20px;
  display: inline-block;
}
.oredict-item-list li {
  width: 100%;
  margin-bottom: unset;
  height: unset;
}
.oredict-item-list {
  margin-left: .75rem;
  margin-right: .75rem;
}
.class-excount.mcmodder-disable-modern {
  margin: 1em 0 .5em 0;
}
.common-text > div,
.common-text > table,
.common-text .figure {
  display: flex;
  width: auto;
  flex-direction: column;
}
.common-text p {
  width: 100%;
}
.checkbox-danger input[type="checkbox"]:checked + label::before,
.checkbox-danger input[type="radio"]:checked + label::before,
.radio label::after {
  background-color: var(--mcmodder-tc1);
  border-color: var(--mcmodder-tc1);
}
.checkbox label::after,
.common-center .right .tab-content li.tab-li .tips,
.dropdown-item {
  color: var(--mcmodder-td1);
}
.center-total ul {
  display: flex;
}
.center-total ul li {
  flex: 1;
}
.modal-open {
  overflow: scroll;
}
#verify-window .modal-dialog {
  width: 100%;
  margin: 0;
}
#verify-window .modal-content {
  border-radius: 0;
}
#verify-window .modal-backdrop {
  background-color: var(--mcmodder-bgn);
}
#connect-frame-sub > #verify-window {
  display: none !important;
}
.mcmodder-verifywindow-empty {
  font-size: 24px;
  color: var(--mcmodder-tc1);
  text-align: center;
  margin-top: 45vh;
}
.mcmodder-verifywindow-empty:before {
  contents: "轻触任意待审项以查看详情~";
}`,
    night: `
:root {
  --mcmodder-tc1: ${this.styleColors.td1};
  --mcmodder-tc2: ${this.styleColors.td2};
  --mcmodder-td1: ${this.styleColors.tc1};
  --mcmodder-td2: ${this.styleColors.tc2};
  --mcmodder-pre-ins: #beff7b;
  --mcmodder-pre-del: #ff7b7b;
  --mcmodder-bg: rgba(17, 17, 17, ${Math.max(Math.min(this.utils.getConfig("backgroundAlpha"), 255), 128) / 255});
  --mcmodder-bgn: rgb(17, 17, 17);
  --mcmodder-bgd1: #222;
  --mcmodder-bgd2: #333;
  --mcmodder-bgd3: #444;
  --mcmodder-bgd4: #666;
  --mcmodder-txcolor: #ddd;
  --mcmodder-badges: #1118;
  --mcmodder-editor: #28f;
  --mcmodder-admin: #c6f;
  --mcmodder-developer: #f82;
  --mcmodder-jump: #28f;
  --mcmodder-general: #f82;
  --ck-color-base-foreground: #111;
  --ck-color-base-background: var(--mcmodder-bg);
  --ck-color-base-border: #444;
  --ck-color-base-text: var(--mcmodder-txcolor);
  --ck-color-button-default-hover-background: var(--mcmodder-tca1);
  --ck-color-button-on-hover-background: var(--mcmodder-tca1);
  --ck-color-button-on-background: var(--mcmodder-tca1);
  --ck-color-link-default: #6bf;
}
body .edui-default .edui-editor-toolbarboxouter, .banner .m_menu .m_center, .banner .m_menu .banner .m_menu {
  background-image: none;
  background-color: #222;
  border-bottom-color: #444;
}
.common-center .right .tab-content ul.tab-ul p.title,
.center-block-head .title,
.center-content.admin-list .title,
.center-sub-menu a:hover,
.center-content.edit-chart-frame .title-main,
.author-mods .title,
.author-member .title,
.author-partner .title,
.page-header .title,
.panel-title,
.page-header .title,
thead,
a:hover,
.edit-tools a:hover,
.message-menu li a.active,
.message-menu li a:hover,
.message-submenu li.active a,
.message-main .message-submenu li a:hover,
.copyright a:hover,
.copyleft a:hover,
.un_info li strong,
.m_center li a:hover,
.about-frame h5,
.about-frame strong,
.log-frame .block .title,
.rank-list-block a:hover,
.common-center .right .class-info .class-info-left .tag a:hover,
.common-center .class-edit-block li a:hover,
.common-center .right .class-info .class-info-left .author li a:hover,
.defaulthover a:hover,
.news_block .right .editor ul a:hover,
.post_block .title .more a:hover,
.class_block .title a:hover,
.mcmodder-almanacs .more a:hover,
.item-table-block .table-tool li a:hover {
  color: #ee6;
  background-color: transparent;
}
.table {
  background-color: transparent;
}
table td {
  color: var(--mcmodder-txcolor);
}
.verify-list-list td a.text-muted:hover,
.common-index-block .head-more:hover,
.body-content a:hover,
#modfile-list-table a.edit-btn:hover,
#modfile-list-table a.del-btn:hover {
  color: #ee6 !important;
}
.common-center .right .tab-content li.tab-li .tips {
  color: #99f;
}
.common-center .right .tab-content li.tab-li .tips.red,
.common-center .right .tab-content li.tab-li .tips.red a {
  color: #faf;
}
.form-control,
input {
  border-color: #333;
  box-shadow: inset 0px 1px 0px #111;
}
input,
.form-control:focus,
.waifu .waifu-tips,
#edui_fixedlayer .edui-default .edui-dialog-foot,
body .tabbody #upload.panel,
body .tabbody .panel,
body #remote input.text,
.common-comment-block textarea,
.syntaxhighlighter table td.code .container textarea {
  background-color: var(--mcmodder-bg);
  color: var(--mcmodder-txcolor);
}
.edui-default .edui-default .edui-menu-body .state-hover {
  background: #d6d;
}
.arrow,
.comment-row .comment-tools .comment-attitude-list .comment-attitude-list-hover ul,
.dropdown-menu,
.center-task-block .icon,
.edui-default .edui-toolbar .edui-combox .edui-combox-body,
.edui-default .edui-popup,
.edui-default .edui-popup-content,
.edui-default .edui-dialog-shadow,
.modal-content,
.header-search form,
.searchbox,
.radio label::before,
.checkbox label::before,
.popover-header {
  background: var(--mcmodder-bg) !important;
  border-color: #444;
  color: #ddd;
}
common-menu-page li,
.bootstrap-tagsinput .tag {
  border-color: #444;
}
.bootstrap-tagsinput {
  background-color: #000;
  border-color: #333;
}
.common-menu-page li,
.comment-quote-block,
.comment-skip-block .common-text table th,
th,
.common-class-category li .normal.gray,
.center-item-popover-amount,
#edui_fixedlayer .edui-default .edui-dialog-titlebar {
  background-color: #111;
  border-color: #888;
  background-image: unset;
}
td {
  border-color: #888;
}
a,
.common-imglist p.text a {
  color: #6bf;
}
body[contenteditable=true] a:visited,
.result-item a:visited {
  color: #b6f;
}
.result-item .foot,
.result-item .foot a {
  color: #0d0;
}
.alert-primary {
  color: #b8daff;
  background-color: #226;
  border-color: #224;
}
.alert-warning {
  border-color: #660;
  background-color: #330
}
.item-category li,
.common-text table th,
.center-content.post-list .post-block .cover img,
.center-card-view,
.notice_center,
.notice_center .content {
  background-color: var(--mcmodder-bg);
  border-color: #333;
}
.under {
  background-image: none;
}
.form-control ::selection,
.item-table-block .text,
.edui-default .edui-editor {
  background-color: #000;
}
.selectTdClass {
  background-color: #07122d !important;
}
.news_block .left .block img {
  border-color: #333 !important;
}
.history-list-frame li,
.common-comment-block .comment-row {
  border-bottom-color: #333;
}
.topic_block .dec a,
.right a.class {
  color: #fff;
}
div,
ul,
li,
.chart_block .list li a,
.news_block .left .name a,
.class_block .left .list .name a,
.class_block .right .list a,
.post_block .list li .postTitle a,
.card_block ul li a,
.dropdown-item,
.common-nav a.home,
input,
.common-comment-block .comment-title,
.common-fuc-group span,
.checkbox label::after,
.news_block .right .editor ul li,
pre,
.verify-copy-btn,
.common-nav li,
.common-nav a,
p:not(.card-item p):not(.text-danger) {
  color: var(--mcmodder-txcolor);
  text-shadow: 1px 1px 1px var(--mcmodder-ts)
}
.class_block .title a {
  color: #dd6;
}
.class_block .left .list .frame,
.common-text-title-1,
hr,
.table-bordered > thead > tr > th,
.table-bordered > tbody > tr > th,
.table-bordered > tfoot > tr > th,
.table-bordered > thead > tr > td,
.table-bordered > tbody > tr > td,
.table-bordered > tfoot > tr > td,
.panel,
.center-card-block.background .center-card-border,
.center-card-block.badges .center-card-border,
.center-card-block.tracker .center-card-border.rank-1 {
  border-color: #333;
}
.class_block .left .list .items {
  border-top-color: #333;
}
.news_block .right .editor,
.bd-callout,
.webui-popover-title {
  border-color: #222;
}
.news_block .right .editor ul a {
  color: #88f;
}
.progress {
  background-color: #e9ecef55;
}
.common-comment-block .comment-row-username a {
  color: #938a82;
}
.rank-head-frame fieldset,
.history-list-head fieldset,
.common-fuc-group li,
.table-bordered td,
.table-bordered th,
.table thead th,
.common-center .maintext .quote_text {
  border-color: #555;
}
.common-pages .page-item .page-link,
.common-class-category li .normal.gray,
.badge-light {
  background-color: #333;
  color: #fff;
}
.page-link,
.verify-list-list-head fieldset {
  border-color: #777;
}
.class-excount .infos,
exp-rate text-muted,
.class_block .left .list .name,
.class_block .right .list,
.common-user-card .card-container .tracker-frame .block .item,
.modlist-filter-block ul:not(.common-class-category) li.main a,
.common-fuc-group .action,
.center-main.favorite .favorite-fold-list a,
.news_block .right .count,
.center-main.favorite .favorite-slot-menu ol a,
.popover,
.main .nav ul li,
.edui-popup-content,
.item-table-block .title,
.webui-popover-title,
.webui-popover-content,
.page-header,
.table-hover > tbody > tr:hover {
  background-color: var(--mcmodder-bg);
}
.form-control:disabled,
.form-control[readonly],
.center-main.favorite .common-pages .page-link,
.edui-default .edui-dialog-titlebar,
body .tabhead span,
body #remote #preview,
.log-frame .block .title,
.score-frame .score-one,
pre,
code {
  background-color: #222;
  background-image: unset;
}
body .tabhead span.focus {
  background-color: var(--mcmodder-tca1);
}
#edui_fixedlayer .edui-default .edui-dialog-buttons .edui-button .edui-button-body,
#edui_fixedlayer .edui-default .edui-dialog-closebutton .edui-button-body,
img[alt="link style"],
.news_block .right .addArea,
.mcmodder-almanacs i {
  filter: invert(100%);
}
body .edui-default .edui-tablepicker .edui-pickarea,
body .edui-default .edui-tablepicker .edui-pickarea .edui-overlay {
  filter: invert(80%);
}
.edui-default .edui-dialog-buttons .edui-label {
  color: #333;
}
#edui_fixedlayer.edui-default .edui-dialog-modalmask {
  background-color: #000;
  opacity: .5;
}
.common-center .right .class-info .col-lg-4,
.content,
.common-center .left .class-rating-submit,
.common-center .right .class-info .class-info-left .tag,
.common-center .right .class-info .class-info-left .tag a,
.rank-list-block .title b,
.common-rowlist-2 li,
.common-center .maintext .item-jump p,
.edit-autolink-frame .tips,
.center-content.edit-chart-frame .title-sub,
.comment-quote-block,
.comment-skip-block,
.class-item-type .mold-0 .title,
.class-item-type .mold-0 .icon,
.common-item-mold-list .mold-0 span,
.search-menu-mcmod a,
.search-history-btn a,
.common-center .maintext .itemname .tool li a,
.item-modabbr,
.common-center .right .tab-content ul.tab-ul p,
.message-menu li a,
.news_block .left .text #random_refresh,
.news_block .left .text #new_more,
.news_block .left .text #edit_more,
.class_block .left .more a,
.score-frame .score-block .time,
.defaulthover a,
.score-frame .score-avg .score-count,
.score-frame .score-avg .score-count a,
.score-frame .score-header .more,
.verify-list-list td i.action,
.col-lg-12.common-rowlist-2 .text,
.center-total li .text,
.class-info-left .col-lg-6 .text,
.verify-rowlist .text,
.post_block .title .more a,
.mcmodder-almanacs .more a,
#comment-selfonly,
.common-comment-block .comment-floor li.none,
.comment-dl-tips,
.common-center .maintext .item-dict,
.oredict-item-list li .name .sub,
.common-index-block .subtitle,
.common-index-block .head-more,
.common-center .right .tab-content li.tab-li .category-title,
.comment-reply-row-username a,
.common-link-frame ul li,
#modfile-list-table a.edit-btn,
#modfile-list-table a.del-btn,
.common-center .right .class-info .mcver,
.common-center .right .class-info .class-info-left .author,
.common-center .right .class-info .infolist {
  color: #aaa;
}
.class-excount .infos .span .n,
h1,
h2,
h3,
h4,
h5,
h6,
.center-sub-menu a,
.rank-list-block a,
.common-menu-page a,
.common-text p,
.list_block .menu li a,
.verify-list-list td a.text-muted,
.az_block .menu li,
.az_block .list li a,
.swal2-popup .swal2-title,
.star_block .list li a,
.list_block .list li a,
.item-category a,
.common-icon-text a,
.dropdown-menu > li > a,
.sidebar-open-button,
.sidepanel-open-button,
.searchbutton,
.top-right .profilebox .col-lg-12.common-rowlist-2 .title,
.center-total li .title,
.class-info-left .col-lg-6 .title,
.common-text .common-text-menu li a span,
.class-item-type li .content,
.common-center .class-edit-block li a,
.worldgen-list li p.name a,
.class_block .left .list .name a,
.modlist-block .title p,
.modlist-block .title a,
.modlist-filter-block ul:not(.common-class-category) li.main a,
.header-search #header-search-submit,
.common-center .right .class-relation-list legend,
.select-row legend,
.common-rowlist-block .title .more a,
.common-imglist-block .title .more a,
.btn-outline-secondary,
.download-switch-fold a,
.download-version-select .count,
.common-center .info-frame p,
.edit-autolink-frame .title,
.az_block .switch li,
.video_block .list li a,
.m_center li a,
.list .pages_system .Pbtn_on,
.score-frame .score-block .text .title,
#server-tool span,
.page-app .app-content .title,
table th,
.common-index-block .head-title,
.body-content a,
.index-tool a,
.item-table-block .table-tool li a,
.syntaxhighlighter .plain,
.syntaxhighlighter .plain a {
  color: var(--mcmodder-txcolor);
}
body .text-danger {
  color: #f66 !important;
}
.text-muted {
  color: #aab !important;
}
.mcmodder-class-info-fold,
.item-table-block .NullItem,
.item-table-block .NullItem a:hover {
  color: var(--mcmodder-txcolor) !important;
}
.header-layer,
.webui-popover-inner {
  border-color: #111 !important;
  box-shadow: 1px 1px 4px #222 !important;
}
.edit-autolink-list li:not(.empty):not(.limit):hover,
.modlist-filter-block ul:not(.common-class-category) li.main a:hover {
  background-color: #445
}
.center-content.item-list li.rank_1 {
  border-color: #222;
  background-color: #000;
  background-image: radial-gradient(at 60px 50px, #222 20%, #111);
}
body .edui-default .edui-toolbar .edui-button .edui-state-hover .edui-button-wrap,
body .edui-default .edui-toolbar .edui-splitbutton .edui-state-hover .edui-splitbutton-body,
body .edui-default .edui-toolbar .edui-menubutton .edui-state-hover .edui-menubutton-body,
#swal2-content .common-template-frame li:hover,
#swal2-content .common-mcicon-frame li:hover,
.dropdown-item:focus,
.dropdown-item:hover {
  background-color: #499;
  border-color: #6cc;
  color: var(--mcmodder-txcolor);
}
body .edui-default span.edui-clickable {
  color: #99f;
}
.radio label::after {
  background-color: #ddd
}
.uknowtoomuch {
  text-shadow: 0px 0px !important;
}
#top {
  background-color: #135;
}
.header-layer-block a {
  color: #aac;
}
.mcmodder-golden-alert {
  background-color: #552d;
}
footer h5 {
  color: #8cf;
}
footer .copyright a,
footer .copyleft a {
  color: #8bd;
}
.mcmodder-almanacs .good {
  background-color: #442;
}
.mcmodder-almanacs .bad {
  background-color: #432;
}
.bind-list li.main a {
  color: #f36;
}
.comment-channel-list li a.c1 {
  color: #8af;
}
.comment-channel-list li a.c2 {
  color: #fa8;
}
body .uknowtoomuch {
  background-color: #444 !important;
  color: #444 !important;
}`
    }
  }

  constructor() {
    this.isV4 = typeof fuc_topmenu_v4 === "function";
    this.isMac = navigator.userAgent.includes("Macintosh");
    this.currentUsername = $(".header-user-name").get(0)?.childNodes[0]?.innerHTML || "";
    this.currentUID = Number($(".header-user-name a, .name.top-username a, .profilebox").first().attr("href")?.split("//center.mcmod.cn/")[1]?.split("/")[0]) || 0;
    this.ueditorFrame = [];
    this.href = window.location.href;
    this.registerMenuCommands();

    // Echarts 图表相关兼容
    if (typeof echarts != "undefined") {
      let t = document.getElementById("class-rating");
      if (t) this.classRatingChart = echarts.getInstanceById(t.getAttribute("_echarts_instance_"));
      t = document.getElementById("center-editchart-obj");
      if (t) this.centerEditChart = echarts.getInstanceById(t.getAttribute("_echarts_instance_"));
    }

    this.screenAttachedFrame = [];

    this.storageBuffer = new StorageBuffer(this);
    this.loadStorageBuffer(this.storageBuffer);

    this.utils = new McmodderUtils(this);

    this.cfgutils = new McmodderConfigUtils(this);
    this.loadConfig(this.cfgutils);
    this.styleColors = McmodderUtils.styleColors(this.utils);

    this.advutils = new AdvancementUtils(this);
    this.loadAdvancements(this.advutils);

    this.scheduleRequestList = new ScheduleRequestList(this);
    this.loadScheduleRequest(this.scheduleRequestList);

    this.loadCss();

    this.main();
  }

  customStyle() {
  let s = "";
  s += `
:root {
  --mcmodder-tc1: ${this.styleColors.tc1};
  --mcmodder-tc2: ${this.styleColors.tc2};
  --mcmodder-tc3: ${this.styleColors.tc3};
  --mcmodder-td1: ${this.styleColors.td1};
  --mcmodder-td2: ${this.styleColors.td2};
  --mcmodder-tca1: ${this.styleColors.tca1};
  --mcmodder-tca2: ${this.styleColors.tca2};
  --mcmodder-tca3: ${this.styleColors.tca3};
  --mcmodder-tda1: ${this.styleColors.tda1};
  --mcmodder-tda2: ${this.styleColors.tda2};
  --mcmodder-tcaa1: ${this.styleColors.tcaa1};
  --mcmodder-tcaa2: ${this.styleColors.tcaa2};
  --mcmodder-pre-ins: #406619;
  --mcmodder-pre-del: #b30000;
  --mcmodder-bg: rgba(255, 255, 255, ${Math.max(Math.min(this.utils.getConfig("backgroundAlpha"), 255), 128) / 255});
  --mcmodder-ts: rgba(240, 248, 255, ${Math.max(Math.min(this.utils.getConfig("textShadowAlpha"), 255), 0) / 255});
  --mcmodder-badges: #fff8;
  --mcmodder-bgn: #fff;
  --mcmodder-bgd1: #f7f7f7;
  --mcmodder-bgd2: #ddd;
  --mcmodder-bgd3: #ccc;
  --mcmodder-bgd4: #aaa;
  --mcmodder-txcolor: #333;
  --mcmodder-editor: #15f;
  --mcmodder-admin: #b3f;
  --mcmodder-developer: #f51;
  --mcmodder-jump: #15f;
  --mcmodder-general: #f51;
  --mcmodder-platform-forge: #5b6197;
  --mcmodder-platform-fabric: #8a7b71;
  --mcmodder-platform-neoforge: #dc895c;
  --mcmodder-platform-quilt: #8b61b4;
  --mcmodder-platform-liteloader: #4c90de;
  --mcmodder-padwidth-1: 1em;
  --mcmodder-padwidth-2: 0.6em;
}`;
  s += `
.form-control {
  width: 100%;
  box-sizing: border-box;
  padding: 4px;
  color: var(--mcmodder-txcolor);
}
.form-control::placeholder {
  color:#999
}
.item-img {
  margin-right: 5px;
}
.item-id {
  margin-right: 2px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: unset;
}
.item-ename {
  font-size: 12px;
  color: #999;
}
.item-modabbr {
  font-size: 12px;
  color: #555;
}
.mcmodder-task-tip {
  width: 320px;
  height: 85px;
  position: fixed;
  right: 0;
  top: -50px;
  z-index: 1000;
  background-color: #212121;
  border: 4px solid #555;
  box-shadow: 0 0 0 1px #000;
  border-radius:6px;
}
.mcmodder-task-tip .icon {
  width: 48px;
  height: 48px;
  margin: 5px 0 0 5px;
  border:1px solid #DDD;
  border-radius: 10px;
  text-align: center;
  float: left;
}
.mcmodder-task-tip .icon img {
  width: 32px;
  height: 32px;
  margin-top: 8px;
}
.mcmodder-task-tip .info {
  width: 100%;
  padding-left: 60px;
  position: absolute;
}
.mcmodder-task-tip .info .title {
  line-height: 25px;
  font-size: 14px;
  font-weight: bold;
  color: #fafa00;
}
.mcmodder-task-tip .info .text,
.mcmodder-task-tip .info .time {
  line-height:20px;
  font-size:12px;
  color:#FFF;
}
.mcmodder-task-tip .info .time {
  position: absolute;
  left: 10px;
  bottom: 0
}
.mcmodder-task-tip .info .range {
  margin-top: 10px;
  line-height: 20px;
  margin-right: 5px;
  font-size: 12px;
  color: #FFF;
  text-align: right;
}
#mcmodder-night-switch,
#mcmodder-profile-switch,
#mcmodder-message-center {
  position: relative;
  line-height: 30px;
  border: 0;
  background-color: transparent;
  color: #d8d8d8;
  cursor: url(//www.mcmod.cn/images/cursor/hand.png),auto;
  display: inline-block;
}
#mcmodder-night-switch:focus,
#mcmodder-profile-switch:focus,
#mcmodder-message-center:focus {
  outline: none;
}
.common-template-frame li p {
  line-height: unset;
}
.common-template-frame li {
  width: 100%;
  position: relative;
}
.center-setting-block .form-control[type=color] {
  width: 4em;
  height: 2em;
}`;
  if (!this.utils.getConfig("disableFadeTransition")) s += `
* {
  transition: color .3s ease-in-out, background-color .3s ease-in-out, border-color .3s ease-in-out;
}`;
  if (!this.utils.getConfig("disableGradient")) s += `
.mcmodder-common-light {
  background: linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));
  background-clip:text;color:transparent;
  font-weight:bold;
  text-shadow:1px 1px 1px #8884;
}
.mcmodder-slim-light {
  background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));
  background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;}
  .mcmodder-common-dark{background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));
  background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;
}
.mcmodder-slim-dark {
  background: linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));
  background-clip:text;
  color:transparent;
  text-shadow:1px 1px 1px #8884;
}
.mcmodder-common-danger {
  background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);
  background-clip:text;
  color:transparent;
  font-weight:bold;
  text-shadow:1px 1px 1px #8884;
}
.mcmodder-slim-danger {
  background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);
  background-clip:text;
  color:transparent;
  text-shadow:1px 1px 1px #8884;
}
.mcmodder-chroma {
  color: transparent;
  background: linear-gradient(90deg,#32C5FF,#B620E0,#F7B500,#20E050,#32C5FF);
  background-size: 100px;
  background-clip: text;
  text-shadow:2px 2px 1px #8884;
  animation: gradientText 3s infinite linear;
}
@keyframes gradientText {
  0% {
    background-position: 0;
  }
  100% {
    background-position: 100px;
  }
}`;
  else s += `
.mcmodder-common-light {
  color: var(--mcmodder-tc2);
  font-weight: bold;
}
.mcmodder-slim-light {
  color: var(--mcmodder-tc1);
}
.mcmodder-common-dark {
 color: var(--mcmodder-td2);
 font-weight: bold;
}
.mcmodder-slim-dark {
  color: var(--mcmodder-td1);
}
.mcmodder-common-danger {
  color: var(--mcmodder-tc3);
  font-weight: bold;
}
.mcmodder-slim-danger {
  color: var(--mcmodder-tc3);
}
.mcmodder-chroma {
  color: red;
}`;
  McmodderUtils.addStyle(s);
}

  guiObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if (mutation.type === "childList") {
        try {
          if (mutation.target.tagName === "DIV") {
            this.guiObserver.disconnect();
            this.slotObserver.disconnect();
            this.tabWork();
            setTimeout(this.guiObserver.observe(this.guiFrame, { childList: true, subtree: true }), 1e3)
            setTimeout(this.slotObserver.observe(this.slotFrame, { attributes: true, childList: true, subtree: true }), 1e3)
          }
        } catch (e) { }
      }
    }
  })

  slotObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if (mutation.type === "attributes") {
        if (mutation.target.className === "value") {
          this.guiObserver.disconnect();
          this.slotObserver.disconnect();

          $(`#mcmodder-item-tab-edit [data-multi-id=${mutation.target.getAttribute("data-multi-id")}][data-part=${$(mutation.target).attr("data-part")}]`)
            .first()
            .val(mutation.target.value)
            .change();

          this.guiObserver.observe(this.guiFrame, { childList: true, subtree: true });
          this.slotObserver.observe(this.slotFrame, { attributes: true, childList: true, subtree: true });
        }
      }
    }
  })

  generalEditorObserver = new MutationObserver((mutationList, generalEditorObserver) => {
    for (let mutation of mutationList) {
      if (mutation.target.id === "edui1_iframeholder" && mutation.addedNodes.length) {
        let iframe = $(mutation.target).find("iframe").get(0);
        if ($(".edit-tools").length || $(".post-row").length) setTimeout(() => new McmodderAdvancedUEditor(editor, this), 3e2);
        else setTimeout(() => new McmodderUEditor(editor, this), 3e2);
      }

      /* else if (isNightMode && mutation.target.id != "edit-autosave-sec") {
        let f = mutation.addedNodes[1];
        if (f && f.className === "%%-iframe") setTimeout(() => new McmodderUEditor(f), 3e2);
      } */
    }
  });

  mainPageInit() {
    // 函数覆写以兼容夜间模式
    if (typeof SearchOn != "undefined") SearchOn = () => {
      '搜索MOD/资料/教程..' == jQuery('.search_box #key').val().Trim() && (
        jQuery('.search_box #key').val(''),
        jQuery('.search_box #key').css('color', 'var(--mcmodder-txcolor)')
      ),
        '搜索MOD/资料/教程..' == jQuery('.m_center ._search .text').val().Trim() && (
          jQuery('.m_center ._search .text').val(''),
          jQuery('.m_center ._search .text').css('color', 'var(--mcmodder-txcolor)')
        )
    }

    let renderAlmanacs = data => {
      const almanacsBlock = $(".mcmodder-almanacs");
      const goods = almanacsBlock.find(".good"), bads = almanacsBlock.find(".bad"), title = almanacsBlock.find(".title").first();
      goods.empty(), bads.empty(), title.find(".more").empty();
      title.find("a.date").html(`${ McmodderUtils.getFormattedChineseDate(new Date(data.almanacs.date)) }运势`);
      if (data.prevDate) $('<a>←</a>').appendTo(title.find(".more")).click(() => getAlmanacs(data.prevDate));
      if (data.nextDate) $('<a>→</a>').appendTo(title.find(".more")).click(() => getAlmanacs(data.nextDate));
      for (let i = 0; i < data.almanacs.good.length; i += 2) goods.append(`<div class="block"><div class="title">${ data.almanacs.good[i] }</div><div class="text">${ data.almanacs.good[i + 1] }</div></div>`);
      for (let i = 0; i < data.almanacs.bad.length; i += 2) bads.append(`<div class="block"><div class="title">${ data.almanacs.bad[i] }</div><div class="text">${ data.almanacs.bad[i + 1] }</div></div>`);
      $('<span class="mcmodder-mold-num">宜</span>').appendTo(goods);
      $('<span class="mcmodder-mold-num">忌</span>').appendTo(bads);
      $(".mcmodder-mold-num").each((_, c) => $(c).css("color", $(c).parent().css("color")))
    }

    let getAlmanacs = date => {
      const almanacsList = this.utils.getAllConfig("almanacsList", []);
      let almanacs, prevDate, nextDate;
      almanacsList.forEach((e, i) => {
        if (e.date === date) almanacs = e, prevDate = almanacsList[i - 1]?.date, nextDate = almanacsList[i + 1]?.date;
      })
      if (!almanacs && date === McmodderUtils.getStartTime(new Date(), 0)) this.utils.createRequest({
        url: "https://www.mcmod.cn/tools/almanacs",
        method: "GET",
        headers: { "Content-Type": "text/html; charset=UTF-8" },
        anonymous: true,
        onload: resp => {
          let almanacs = {
            date: date,
            good: [],
            bad: []
          }
          let d = $(resp.responseXML);
          d.find(".good .block").each((_, c) => almanacs.good.push($(c).find(".title").text(), $(c).find(".text").text()));
          d.find(".bad .block").each((_, c) => almanacs.bad.push($(c).find(".title").text(), $(c).find(".text").text()));
          almanacsList.push(almanacs);
          this.utils.setAllConfig("almanacsList", almanacsList);
          getAlmanacs(date);
        }
      });
      else if (almanacs) renderAlmanacs({
        almanacs: almanacs,
        prevDate: prevDate,
        nextDate: nextDate
      });
    }

    if (this.utils.getConfig("almanacs")) {
      // 数据迁移
      let almanacsList = this.utils.getConfig("almanacsList");
      if (almanacsList) {
        GM_setValue("almanacsList", almanacsList);
        this.utils.setConfig("almanacsList", "");
      }

      $(".news_block").first().after(`
        <div class="news_block mcmodder-almanacs">
          <div class="title">
            <i></i>
            <a class="date" href="/tools/almanacs" target="_blank"></a>
            <div class="more"></div>
          </div>
          <div class="content">
            <div class="good"></div>
            <div class="bad"></div>
          </div>
        </div>`);
      getAlmanacs(McmodderUtils.getStartTime(new Date(), 0));
    }
  }

  _updateCookieByCurrentUsedList() {
    let data = {
      item: [],
      oredict: []
    };
    let itemUsedList = $("#item-used-item"), oredictUsedList = $("#item-used-oredict, #item-used-itemtags");
    itemUsedList.find(".item-table-hover").each((_, c) => data.item.push(c.getAttribute("item-id")));
    oredictUsedList.find(".oredict-table-hover").each((_, c) => data.oredict.push(c.getAttribute("data-oredict-name")));
    $.cookie("itemTableUsedList", JSON.stringify(data), { path: "/", expires: 365 });
  }

  updateItemTooltip() { // 鼠标悬浮预览介绍
    if (this.utils.getConfig("hoverDescription")) {
      $(".common-imglist li, .item-list-type-right span, .relation a").off();
      $("a").filter((_, e) => /\/\/www.mcmod.cn\/item\/[0-9]*\.html/.test(e.href) || /\/\/www.mcmod.cn\/class\/[0-9]*\.html/.test(e.href)).filter((_, c) => {
        c = $(c);
        if (Array.from(c.parent().prop("classList")).includes("item-table-hover")) return false;
        return true;
      }).addClass("mcmodder-item-link").removeAttr("title");
      $(".modlist-block .title a").removeClass("mcmodder-item-link");
      $(".mcmodder-item-link").each((_, e) => $(e).attr({
        "data-source-id": e.href.split("mcmod.cn/")[1],
        "data-toggle": "tooltip",
        "data-html": "true",
        "data-original-title": `<div class="mcmodder-data-frame maintext" data-source-id="${e.href.split("mcmod.cn/")[1]}"><img src="${McmodderValues.assets.mcmod.loading}"></img></div>`
      }));
      $(document).on("mouseover", ".mcmodder-item-link", async e => {
        let c = e.currentTarget;
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
        if (f.attr("data-status") === "fulfilled") return;
        f.attr("data-status", "fulfilled");
        let d = $(resp.responseXML);
        d.find(".itemname > .tool").remove();
        d.find(".quote_text legend a").last().remove();
        f.html(d.find(".item-content, .class-menu-main .text-area.font14").first().html());
        if (f.text() === "暂无简介，欢迎协助完善。") f.html('<span class="mcmodder-common-danger">该资料正文暂无介绍...</span>');
        if ($(c).attr("data-source-id").includes("item/")) d.find(".itemname").first().insertBefore(f.children().first()).find("h5").each(h5 => {
          let l = d.find("meta[name=keywords]").attr("content").split(","), s = h5.textContent;
          if (l[1]) s = ("<a>" + s).replace(` (${l[1]})`, `</a> <span class="item-h5-ename"><a>${l[1]}</a></span>`);
          else s = `<a>${ s }</a>`;
          h5.innerHTML = s;
        });
        else if ($(c).attr("data-source-id").includes("class/")) d.find(".class-title").first().insertBefore(f.children().first());
        let g = d.find(".item-data .item-info-table").first().removeClass("righttable").insertBefore(f);
        let showImg = c => c.outerHTML = c.outerHTML.replaceAll("data-src=", "src=");
        g.find("img").each((_, c) => showImg(c));
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

  refreshExpBar(t, b = 0) {
    let l = 1, p = 0, r = 0, s = t;
    while (t - McmodderValues.expReq[l] >= 0) t -= McmodderValues.expReq[l++];
    p = parseInt(t / McmodderValues.expReq[l] * 100);
    r = McmodderValues.expReq[l] - t;
    if (l <= 30) {
      $(".lv-title span:nth-child(2)").html(`升级进度: ${t.toLocaleString()} / ${McmodderValues.expReq[l].toLocaleString()} Exp`);
      $(".lv-title span:nth-child(3)").html(`升级还需经验: ${r.toLocaleString()} Exp`);
    } else {
      l = 30; p = 100;
      $(".lv-title span:nth-child(2)").html(`升级进度: ${s.toLocaleString()} / - Exp`);
      $(".lv-title span:nth-child(3)").html(`升级还需经验: - Exp`);
    }
    $(".lv-title span:nth-child(1)").html(`${(s > b) ? "预测等级" : "当前等级"}: <i class="common-user-lv large lv-${l}">Lv.${l}</i>`);
    $(".lv-title span:nth-child(5)").html(`总经验: ${s.toLocaleString()} Exp`);
    $(".lv-bar .progress-bar").attr({ "style": `width: ${p}%;`, "aria-valuenow": p });
    $(".lv-bar .per").html(p + "%");
    $("#mcmodder-lv-input").trigger("change");
  }

  setTabSelectorInfo() {
    let work = container => {
      let pt = 0;
      $(container).each((_, item) => {
        const target = $(item);
        if (target.hasClass("mcmodder-tag")) return;
        target.addClass("mcmodder-tag");
        // 高亮选取建议
        /* const itemModName = target.attr("data-original-title").split("<b>")[1].split("</b>")[0].replace("...", "");
        if (this.modName.includes(itemModName)) McmodderUtils.highlight(target, "gold");
        else {
          for (let i of this.dependences) {
            if (i.includes(itemModName)) McmodderUtils.highlight(target, "aqua");
            else {
              for (let i of this.expansions) {
                if (i.includes(itemModName)) McmodderUtils.highlight(target, "pink");
              }
            }
          }
        } */
        if (item.style.backgroundColor) item.parentNode.insertBefore(this, this.parentNode.childNodes[pt++]);

        // 显示详细信息
        let img = target.find("img").get(0), zh = img.alt.split(" (")[0], en = img.alt.replace(zh + " (", "");
        $(`<div>
            <span class="mcmodder-slim-dark zh-name">${target.attr("item-id")}</span>
            <span class="zh-name">${zh}</span>
            <span class="en-name">${en.slice(0, en.length - 1)} [${target.attr("data-original-title").split("<b>")[1].split("</b>")[0]}]</span>
          </div>
          <a class="delete"><i class="fa fa-trash" /></a>
        `).appendTo(target);
        target.find(".delete").click(e => {
          let c = parseInt($("#item-used-item-btn").text().split("(")[1].split(")")[0]);
          $("#item-used-item-btn").text(`资料 (${c - 1})`);
          $(".tooltip").remove();
          e.currentTarget.parentNode.remove();
          this._updateCookieByCurrentUsedList();
        });
        if (target.parent().attr("id") === "item-search-item") target.find(".delete").remove();
      });
    }
    work("#item-search-item > .item-table-hover");
    work("#item-used-item > .item-table-hover");
  }

  tabInit() {
    this.generalEditInit();
    this.guiFrame = $("#item-table-gui-frame").get(0);
    this.slotFrame = $(".gui").get(0);
    $("#edit-page-2").attr("class", "tab-pane active");
    $(".swiper-container").remove();
    if (!this.guiFrame) return;
    this.tabWork();
    this.guiObserver.observe(this.guiFrame, { childList: true, subtree: true });
    this.slotObserver.observe(this.slotFrame, { attributes: true, childList: true, subtree: true });

    let ingredientSelectFrame = $("<div>");
    let ingredientSelectWindow = $('<div class="mcmodder-horizontal-window">').appendTo(ingredientSelectFrame);
    let tabEditHorizontalDivider = new HorizontalDraggableFrame({}, $(".common-menu-area").get(0), {
      initPos: 0.5,
      leftCollapseThreshold: 0,
      rightCollapseThreshold: 0.7,
      leftDraggableLimit: 0.3
    })
    tabEditHorizontalDivider.bindLeft($(".common-menu-area > .tab-content"));
    tabEditHorizontalDivider.bindRight(ingredientSelectFrame);
    let ingredientSelector = $("#edit-page-1 > .tab-ul > .tab-li").first().children();
    ingredientSelector.appendTo(ingredientSelectWindow);
    this.updateScreenAttachedFrame(ingredientSelectWindow.get(0));

    this.modID = $(".common-nav li:not(.line):nth-child(5) a").get(0)?.href.split("/class/")[1].split(".html")[0];
    this.modName = $(".common-nav li:not(.line):nth-child(5) a").text();

    // v1.6 更新后，前置/拓展模组信息仅记录模组 ID，旧信息全部删除
    GM_setValue("modDependences", "");
    GM_setValue("modExpansions", "");

    this.dependences = this.utils.getConfig(this.modID, "modDependences_v2", []);
    this.expansions = this.utils.getConfig(this.modID, "modExpansions_v2", []);
    if (this.utils.getConfig("tabSelectorInfo")) {
      McmodderUtils.addStyle(`
#item-used-item, #item-search-item {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(192px, 1fr));
}
#item-table-item-frame .item-table-hover {
  width: 100%;
}
#item-table-item-frame .item-table-hover img {
  position: absolute;
  left: 0px;
}
#item-table-item-frame .item-table-hover div {
  display: inline-block;
  font-size: 14px;
  max-width: calc(100% - 32px);
  line-height: 1;
  max-height: 32px;
  overflow: clip;
  position: absolute;
  right: 0px;
}
#item-table-item-frame .item-table-hover .zh-name {
  margin-left: .25em;
  font-size: 12px;
}
#item-table-item-frame .item-table-hover .en-name {
  margin-left: .25em;
  font-size: 10px;
  color: gray;
      }`);
      let itemSearchObserver = new MutationObserver((mutationList, itemSearchObserver) => {
        itemUsedObserver.disconnect();
        itemSearchObserver.disconnect();
        this.setTabSelectorInfo();
        itemSearchObserver.observe($(".item-search").get(0), { childList: true, subtree: true });
        if ($("#item-used-item").length) itemUsedObserver.observe($(".item-used-list").get(0), { childList: true, subtree: true });

        // 可拖动
        $("#item-used-item").sortable({
          distance: 30,
          containerSelector: "#item-used-item",
          itemPath: "> .item-table-hover",
          itemSelector: "div",
          opacity: 0.5,
          revert: true,
          stop: () => this._updateCookieByCurrentUsedList()
        }).disableSelection();
      });
      this.setTabSelectorInfo();
      let itemUsedObserver = itemSearchObserver;
      itemSearchObserver.observe($(".item-search").get(0), { childList: true, subtree: true });
      if ($("#item-used-item").length) itemUsedObserver.observe($(".item-used-list").get(0), { childList: true, subtree: true });
    }

    // 隐藏自定义矿词/标签功能
    $(".title").filter((_, c) => c.textContent === PublicLangData.item_tab.custom.title + ":").hide().next().hide();
    $("hr").hide();

    // 快速设置GUI
    $(`<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将 GUI 设置为当前所使用的 GUI。修改现有的合成表不会触发此特性。">
      <input id="mcmodder-gui-lock" type="checkbox">
        <label for="mcmodder-gui-lock">锁定当前 GUI</label>
      </div>`).appendTo($("#item-table-gui-select").parent());
    let guiLocker = this.utils.getConfig("guiLocker");
    if (guiLocker > 0) {
      $("input#mcmodder-gui-lock").click();
      $("#item-table-gui-select").selectpicker("val", guiLocker);
    }
    $("input#mcmodder-gui-lock").bind("change", () => {
      let l = $("input#mcmodder-gui-lock").prop("checked");
      this.utils.setConfig("guiLocker", l ? $("#item-table-gui-select").val() : 0);
    });

    // 快速设置无序
    let shapelessLocker = () => {
      let l = $("input#mcmodder-shapeless-lock").prop("checked");
      this.utils.setConfig("shapelessLocker", l.toString());
      if (l) $("#item-table-data-orderly-1").click();
    }
    $('<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将摆放要求设置为无序合成。修改现有的合成表不会触发此特性。"><input id="mcmodder-shapeless-lock" type="checkbox"><label for="mcmodder-shapeless-lock">锁定无序</label></div>').appendTo($("#edit-page-2 .tab-li").first());
    if (this.utils.getConfig("shapelessLocker")) {
      if (window.location.href.includes("/tab/add/")) $("#item-table-data-orderly-1").click();
      $("input#mcmodder-shapeless-lock").click();
    }
    $("input#mcmodder-shapeless-lock").bind("change", window.shapelessLocker);

    // 编辑记忆列表
    /*$(".item-used-frame .item-table-hover").on("contextmenu", function (e) {
      e.preventDefault();
      let l = JSON.parse($.cookie("itemTableUsedList")).item.filter(item => parseInt(item) != parseInt($(this).attr("item-id")));
      $.cookie("itemTableUsedList", JSON.stringify(l), {expires: 365, path: "/"});
      getItemTableUsed();
    });*/

    // GTCEu 编辑提示
    if (parseInt(this.modID) === 5343) {
      let gtceuAlert = $(".tab-ul > p.text-danger");
      gtceuAlert.html(gtceuAlert.html().replace("使用 GTCEu 中对应的材料", "<a data-toggle=\"tooltip\" data-original-title=\"轻触插入备注\" style=\"font-size: unset; text-decoration: underline;\">使用 GTCEu 中对应的材料</a>"));
      $(".tab-ul p.text-danger a").click(() => {
        let s = "使用 GTCEu 中对应的材料。";
        let note = $("textarea[placeholder='备注..']");
        note.val(note.val().replace(s, ""));
        note.val(`${s}\n${note.val()}`);
        McmodderUtils.commonMsg("成功将此提示插入备注中~");
      });
      this.dependences.concat([2524, 1171, 327]); // GCYL, GTCE, GT5
    }
  }

  tabWork() {
    try { recipeTable.remove(); } catch (e) { }

    $("div#item-table-gui-frame hr").remove();
    if ($("#mcmodder-tabedit-tip").length) return;
    $('<span id="mcmodder-tabedit-tip" class="mcmodder-slim-dark" style="display: inline;">提示：巧妙运用 <strong>Tab</strong> / <strong>Enter</strong> / <strong>上下方向</strong> 键能够帮助您更快地填充下列数据~</span>').appendTo(this.guiFrame);

    let input = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({ valid: false, id: "", number: "", numberEditable: false, chance: "", chanceEditable: false, unit: "" }));
    let output = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({ valid: false, id: "", number: "", numberEditable: false, chance: "", chanceEditable: false, unit: "" }));
    let extra = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({ valid: false, id: "", number: "", unit: "" }));

    let slotlist = $("input.value", $(".gui").get(0)).toArray();
    let tablist = $("#item-table-gui-frame > .tab-li").toArray();
    let data, multiName, dataId, unit, id;
    for (let slot of slotlist) {
      multiName = $(slot).attr("data-multi-id");
      dataId = parseInt($(slot).attr("data-part"));
      switch (multiName) {
        case "slot-in-item": input[dataId].id = slot.value, input[dataId].valid = true; break;
        case "slot-out-item": output[dataId].id = slot.value, output[dataId].valid = true;
      }
    }
    for (let tab of tablist) {
      data = $("input", tab).get(0);
      unit = $("span.text-danger", tab).text() || "";
      multiName = $(data).attr("data-multi-id");
      dataId = parseInt($(data).attr("data-part"));
      switch (multiName) {
        case "slot-in-number": input[dataId].number = data.value, input[dataId].numberEditable = true, input[dataId].unit = unit; break;
        case "slot-in-chance": input[dataId].chance = data.value, input[dataId].chanceEditable = true; break;
        case "slot-out-number": output[dataId].number = data.value, output[dataId].numberEditable = true, output[dataId].unit = unit; break;
        case "slot-out-chance": output[dataId].chance = data.value, output[dataId].chanceEditable = true; break;
        case "slot-power-number": extra[dataId].id = $("p.title", tab).html().split("<span")[0], extra[dataId].number = data.value, extra[dataId].valid = true, extra[dataId].unit = unit;
      }
    }

    $(".item-table-gui-slot").each((_, e) => {
      let dataType = $(e).attr("data-type");
      let dataId = $(e).attr("data-id");
      $(e).append(`<span class="mcmodder-gui-${dataType}">${dataId}</span>`);
    });

    let recipeTable = $("<table>").appendTo(this.guiFrame).attr("id", "mcmodder-item-tab-edit");
    let recipeTbody = $("<tbody>").appendTo(recipeTable);
    $("<tr><td /></tr>").appendTo(recipeTbody);

    $(`<td><strong>物品 ID / 矿物词典 / 物品标签</strong></td>
      <td><strong>数量</strong></td>
      <td><strong>概率 (%)</strong></td>`)
    .appendTo(recipeTbody.children().first())
    .attr({ align: "center", valign: "middle" });

    let recipeTr, recipeTd, recipeInput;
    for (let i in input) {
      if (!input[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);
      $(`<td align="right" style="color: var(--mcmodder-td1); text-wrap: nowrap;" data-toggle="tooltip" title="${i} 号材料"><strong><i class="fa fa-sign-in" /> ${i} ${input[i].unit}</strong></td>`).appendTo(recipeTr).css("align", "right");

      recipeTd = $("<td>").appendTo(recipeTr);
      $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-multi-id": "slot-in-item", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i }).val(input[i].id);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-id": i, "data-multi-id": "slot-in-number", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i, "placeholder": "1" }).val(input[i].number);
      if (!input[i].numberEditable) recipeInput.attr({ "title": "此材料不可设置消耗数量。", "disabled": "disabled" }).css("cursor", "no-drop");

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-id": i, "data-multi-id": "slot-in-chance", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i, "placeholder": "100" }).val(input[i].chance);
      if (!input[i].chanceEditable) recipeInput.attr({ "title": "此材料不可设置消耗概率。", "disabled": "disabled" }).css("cursor", "no-drop");
    }

    $("#item-table-gui-frame > .tab-li").hide();
    $(".tips").remove();

    for (let i in output) {
      if (!output[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);
      $(`<td align="right" style="color: var(--mcmodder-td2); text-wrap: nowrap;" data-toggle="tooltip" title="${i} 号成品"><strong><i class="fa fa-sign-out" /> ${i} ${output[i].unit}</strong></td>`).appendTo(recipeTr).css("align", "right");

      recipeTd = $("<td>").appendTo(recipeTr);
      $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-multi-id": "slot-out-item", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i }).val(output[i].id);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-id": i, "data-multi-id": "slot-out-number", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i, "placeholder": "1" }).val(output[i].number);
      if (!output[i].numberEditable) $(recipeInput).attr({ "title": "此材料不可设置产出数量。", "disabled": "disabled" }).css("cursor", "no-drop");

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-id": i, "data-multi-id": "slot-out-chance", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i, "placeholder": "100" }).val(output[i].chance);
      if (!output[i].chanceEditable) $(recipeInput).attr({ "title": "此材料不可设置产出概率。", "disabled": "disabled" }).css("cursor", "no-drop");
    }

    for (let i in extra) {
      if (!extra[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);

      recipeTd = $("<td>").appendTo(recipeTr).attr("align", "right").html(`<strong>${extra[i].id}: ${extra[i].unit}</strong>`);

      recipeTd = $("<td>").appendTo(recipeTr);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({ "data-part": i, "data-multi-id": "slot-power-number", "data-multi-name": "item-table-data", "data-multi-enable": true, "class": "form-control slot-text slot-text" + i }).val(extra[i].number);
    }

    let guiNote = $("b").filter((i, c) => $(c).text() === "使用此GUI时注意事项:").parent().addClass("mcmodder-gui-alert");
    let guiNoteHTMLContent = "";
    guiNote.contents().each((i, c) => {
      if (i < 2) return;
      if (c.nodeType == Node.TEXT_NODE) guiNoteHTMLContent += c.data;
      else guiNoteHTMLContent += c.outerHTML;
    });
    guiNote.html("<strong>[注意事项]</strong>").attr({
      "data-toggle": "tooltip",
      "data-html": true,
      "data-original-title": guiNoteHTMLContent
    });
    McmodderUtils.updateAllTooltip();

    $("input", recipeTbody).bind("change", e => {
      let c = $(e.currentTarget), v = c.val().trim();
      let valueInput = $(`#item-table-gui-frame input[data-multi-id=${c.attr("data-multi-id")}][data-part=${c.attr("data-part")}]`);
      valueInput.val(v);
      if (c.attr("data-multi-id").indexOf("-item") > -1) {
        if (parseInt(v) == v) valueInput.parent().children().eq(1).css("background-image", McmodderUtils.getImageURLByItemID(data.id));
      }

      if (c.attr("data-multi-id") === "slot-out-item") {
        for (let i of $(`#item-table-gui-frame input[data-multi-id=${c.attr("data-multi-id")}]`).toArray()) {
          let e = i.value;
          if (e) {
            if (e != nItemID && e == parseInt(e)) {
              nItemID = e;
              $("#edit-submit-button").attr("edit-id", e);
              McmodderUtils.commonMsg(`当前页面已自动换绑至物品 ID:${e} ~`);
            }
            break;
          }
        }
      }
    }).bind("keydown", e => {
      let target = e.currentTarget;
      if (e.keyCode === 13) {
        let row = 0, col = 0;
        for (let i in target.parentNode.parentNode.childNodes)
          if (target.parentNode.parentNode?.childNodes[i]?.childNodes[0] === target) {
            col = i; break;
          }
        for (let i in target.parentNode.parentNode.parentNode.childNodes)
          if (target.parentNode.parentNode.parentNode?.childNodes[i]?.childNodes[col]?.childNodes[0] === target) {
            target.parentNode.parentNode.parentNode?.childNodes[parseInt(i) + (e.shiftKey ? -1 : 1)]?.childNodes[col]?.childNodes[0]?.focus();
            return;
          }
      }
      else if (e.keyCode === 38 || e.keyCode === 40) {
        let num;
        target = $(target);
        if (target.val().trim() != "") num = Number(target.val().trim());
        else num = Number(target.attr("placeholder"));
        if (!isNaN(num)) {
          e.preventDefault();
          if (e.shiftKey) num = Math.floor(num * Math.pow(2, 39 - e.keyCode)); // *2, /2
          else num += (39 - e.keyCode); // +1, -1
          target.val(num).change();
        }
      }
    });
    this.updateItemTooltip();
  }

  itemInit() {
    $("span.name > h5").each((i, c) => { // 快速复制主/次要名称
      c = $(c);
      let s = c.text();
      if (!i) {
        let l = $("meta[name=keywords]").attr("content").split(","), t = `</a><span class="item-h5-ename">${this.utils.getConfig("mcmodderUI") ? `<a>${l[1]}</a>` : `(<a>${l[1]}</a>)`}</span>`;
        if (l[1]) s = ("<a>" + s).replace(` (${l[1]})`, t);
        else s = `<a>${s}</a>`;
      } else {
        let l = $(".item-skip-list a").eq(i).text();
        if (l === s) s = `<a>${s}</a>`;
        else {
          s = s + "//end";
          let n = s.replace(l + " (", "").replace(")//end", "");
          s = `<a>${l}</a><span class="item-h5-ename">${this.utils.getConfig("mcmodderUI") ? `<a>${n}</a>` : `(<a>${n}</a>)`}</span>`;
        }
      }
      c.html(s).find("a").click(e => {
        navigator.clipboard.writeText(e.currentTarget.textContent);
        McmodderUtils.commonMsg("物品名称已成功复制到剪贴板~");
      });
    })

    // 矿物词典
    let od;
    if (this.utils.getConfig("mcmodderUI")) $(".item-dict").each((_, c) => {
      if ($(c).contents().length) {
        od = $(c).text().slice(6).split(",\u00a0");
        $(c).html("[矿物词典/物品标签] ");
        od.forEach(e => $(`<a href="/oredict/${e.split(" (")[0]}-1.html" target="_blank">${e}</a>`).appendTo(c));
      }
    })

    $(".maintext .table").filter((_, c) => $(c).css("width") === "100%").css("width", "unset");
    let autoFoldTable = this.utils.getConfig("autoFoldTable");
    if (autoFoldTable) $(".table.table-bordered.text-nowrap tbody").filter((i, c) => $(c).children().length >= autoFoldTable).find("tr:first-child() th:last-child()").append(' [<a class="collapsetoggle">隐藏</a>]').find(".collapsetoggle").click(function () { let c = $(this).parent().parent().parent(); $(this).text() === "显示" ? ($("tr:not(tr:first-child())", c).show(), $(this).text("隐藏")) : ($("tr:not(tr:first-child())", c).hide(), $(this).text("显示")) }).trigger("click");

    let isCompactive = $("div.item-skip-list").length && $("div.item-content").length < 2;
    if (!isCompactive) $(".item-data").each((i, c) => {
      c = $(c);
      c.insertBefore(c.parent().find(".item-content").children().first());
      let n = c.parents(".item-text").find(".name h5 > a").text();
      $(`<th colspan="2" align="center">${n}</th>`).insertBefore(c.find("tbody").children().first());
      c.parent().find("i").filter((_, e) => e.textContent === "暂无简介，欢迎协助完善。").parent().css({ "float": "unset", "display": "block" });
    });

    // 根据ID快速跳转
    let h = $("span.name > h5").parent().get(0);
    if (this.utils.getConfig("mcmodderUI") && h) {
      let s = $('<span style="font-size: 14px;">').appendTo(h);
      let isTabPage = window.location.href.includes("/tab/") ? "tab/" : "";
      let itemId = parseInt(window.location.href.split("item/" + isTabPage)[1]);
      if (itemId > 1) s.html(`<a href="/item/${isTabPage}${itemId - 1}.html" class="mcmodder-common-danger" style="margin-left: 10px">&lt;&nbsp;${itemId - 1}&nbsp;</a>-`);
      s.append(`<a href="/item/${isTabPage + (itemId + 1)}.html" class="mcmodder-common-light"> ${itemId + 1} &gt;</a>`);
    }

    if (isCompactive && this.utils.getConfig("compactedChild")) { // 综合子资料紧凑化
      McmodderUtils.addStyle("table.table-bordered.righttable td {padding: 0rem;}");
      $("table.table-bordered.righttable").each(function () {
        $("tr", this).first().remove();
        let mainTr = $("tr:first-child()", this);
        $("tr:not(tr:first-child())", this).each(function () {
          mainTr.append(this.innerHTML);
          this.remove();
        })
        $(this).find("img").first().hide();
        $('<a class="mcmodder-largeicon-control">轻触展开大图标</a>').appendTo($("img", this).first().parent()).click(function () {
          let t = $(this);
          let largeIcon = t.parent().find("img").first();
          if (McmodderUtils.isNodeHidden(largeIcon)) {
            t.html("轻触收起大图标");
            largeIcon.show();
          } else {
            t.html("轻触展开大图标");
            largeIcon.hide();
          }
        });
        $(this).parents(".item-row").find(".common-fuc-group").hide();
        $(this).parents(".maintext").find(".item-text .item-info-table").hide();
      })
    }

    if (this.utils.getConfig("linkCheck")) {
      let linkList = {}, warnList = [], clashFlag = false, fandomFlag = false;
      $('.item-content > *:not(.item-data) a:not([href="javascript:void(0);"])')
      .filter((_, c) => c.textContent && c.parentNode.tagName != "LEGEND")
      .each((_, a) => {
        let key = a.textContent, value = a.href.replace("https://www.mcmod.cn", "");
        if (this.utils.getConfig("linkMark")) $(a).after(`<code class="mcmodder-link-check">${value}</code>`);
        if (!linkList[key]) linkList[key] = value;
        else if (linkList[key] != value) warnList.push(key);
      }).each((_, a) => {
        if (warnList.includes(a.textContent)) {
          $(a).next().addClass("mcmodder-link-warn");
          clashFlag = true;
        } else if (a.href.includes("minecraft.fandom.com")) {
          $(a).next().addClass("mcmodder-link-warn");
          fandomFlag = true;
        }
      });
      if (clashFlag) McmodderUtils.commonMsg("发现疑似的链接冲突问题，请检查~", false);
      if (fandomFlag) McmodderUtils.commonMsg("发现 Minecraft Wiki Fandom 链接，请将其及时更新至 zh.minecraft.wiki ~", false);
    }

    $(".figure img").bind("load", function () { // 本地化检测
      if (!this.src.includes("mcmod.cn")) $(this).parent().append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>').css("border", "10px solid red");
    });

    this.itemTabInit();
  }

  itemListInit() {
    if (this.utils.getConfig("moveAds"))
      $(".center .adsbygoogle").insertAfter(".center .item-list-table");
  }

  postInit() {
    if (this.utils.getConfig("removePostProtection"))
      $(".owned").removeClass("owned");
  }

  oredictPageInit() {
    $("div.icon-128x img").remove();
    let sortFrame = $('<div class="mcmodder-mod-sort"><input id="mcmodder-mod-search" placeholder="输入模组名称或编号以筛选..." class="form-control"></div>').appendTo(".oredict-frame");
    $("div.oredict-item-list li").each((_, li) => {
      let modName = $("div.sub.class a", li).text(), modID = McmodderUtils.abstractIDFromURL($("div.sub.class a", li).get(0).href, "class");
      if ($("div.mcmodder-mod-sort fieldset[mod-name=" + modID + "]").length < 1)
        $("div.mcmodder-mod-sort").append(`
          <fieldset mod-name=${modID}>
            <legend>
              <a href="/class/${modID}.html" style="color: var(--mcmodder-txcolor);" target="_blank">${modName}</a>
            </legend>
            <div class="oredict-item-list">
              <ul></ul>
            </div>
          </fieldset>`);
      $("div.sub.class", li).remove();
      $(`div.mcmodder-mod-sort fieldset[mod-name=${modID}] ul`).append(li.outerHTML);
      li.remove();
    });
    $("div.oredict-frame").get(0).insertBefore(sortFrame.get(0), $("div.oredict-item-list").get(0));
    $(".mcmodder-mod-sort fieldset").each((_, fieldset) => {
      let itemLength = parseInt($("div.oredict-item-list li", fieldset).length);
      if (itemLength > 5) itemLength = 5;
      fieldset.style.width = (20 * itemLength) + "%";
      if (itemLength > 1) $("div.oredict-item-list li", fieldset).each((_, fieldset) => fieldset.style.width = (100 / itemLength) + "%");
    });
    $("input#mcmodder-mod-search").bind("change", (_, input) => {
      if (!input.value.length) $(".mcmodder-mod-sort fieldset").each((_, fieldset) => { fieldset.style.removeProperty("display"); })
      else if (parseInt(input.value) == input.value) $(".mcmodder-mod-sort fieldset").each((_, fieldset) => {
        fieldset.style.display = fieldset.getAttribute("mod-name") == $("input#mcmodder-mod-search").val() ? "inline-block" : "none";
      });
      else $(".mcmodder-mod-sort fieldset").each((_, fieldset) => {
        fieldset.style.display = $("legend", fieldset).text().includes($("input#mcmodder-mod-search").val) ? "inline-block" : "none"
      });
    });
    this.itemTabInit();
  }

  messageInit() {
    if (this.utils.getConfig("lieqi")) {
      $(".content-comment-attitude > i").attr("class", "fas fa-surprise");
      $(".content-comment-attitude").each((_, c) => $(c).contents().last().get(0).textContent = "猎奇");
    }
  }

  downloadInit() {
    if (this.utils.getConfig("customAdvancements")) $(document).on("click", ".download-setting-button", () => {
      this.advutils.addProgress(McmodderValues.AdvancementID.DOWNLOAD_MODS_1);
    });
  }

  historyInit() {
    // 高亮最新编辑记录
    $(".history-list-frame li").filter((i, c) => Date.parse($(c).find(".time").text()?.split(" (")[0]) > parseInt((new URLSearchParams(window.location.search)).get("t"))).addClass("mcmodder-mark-gold");

    if (this.utils.getConfig("autoExpandPage")) {
      window.stopExpand = false;
      if ($(".badge-secondary").text() === "最近100条") return;
      let maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0]);
      let param = new URLSearchParams(window.location.search);
      let startTime = param.get("starttime"), endTime = param.get("endtime");
      if (!maxPage) return;
      let getHistoryPage = id => {
        this.utils.createRequest({
          url: `https://www.mcmod.cn/history.html?starttime=${startTime}&endtime=${endTime}&page=${id}`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" },
          onload: resp => {
            let d = $(resp.responseXML);
            d.find(".history-list-frame ul").children().appendTo(".history-list-frame ul");
            McmodderUtils.commonMsg(`成功加载第 ${id} / ${maxPage} 页~`);
            if (id < maxPage && !stopExpand) setTimeout(getHistoryPage(++id), 1e3);
            else {
              $('<input id="mcmodder-history-search" class="form-control" placeholder="输入编辑记录内容以筛选...">')
              .appendTo($(".history-list-head").first())
              .bind("change", e => {
                let s = e.currentTarget.value;
                $(".history-list-frame li").each(li => {
                  if (!$(li).text().includes(s)) $(li).hide();
                  else $(li).removeAttr("style");
                });
              });
              this.updateItemTooltip();
            }
          }
        });
      }
      McmodderUtils.commonMsg("准备自动展开，可随时按 Ctrl + C 取消~");
      $("html").bind("keydown", e => {
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) window.stopExpand = true;
      })
      getHistoryPage(2);
      $(".pagination").remove();
    }
  }

  verifyHistoryInit() {
    if (this.utils.getConfig("autoExpandPage")) {
      window.stopExpand = false;
      let maxPage = parseInt($(".pagination span").text().split(" / ")[1]?.split(" 页")[0])
      let param = window.location.href.split("verify.html?")[1]?.split("&page=")[0]
      if (!param || !maxPage || $(".badge-secondary").text().includes("最近100条")) {
        this.verifyInit();
        return;
      }
      let getHistoryPage = function (id) {
        this.utils.createRequest({
          url: `https://www.mcmod.cn/verify.html?${param}&page=${id}`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" },
          onload: resp => {
            let d = $(resp.responseXML);
            d.find(".verify-list-list-table tbody").children().appendTo(".verify-list-list-table tbody");
            McmodderUtils.commonMsg(`成功加载第 ${id} / ${maxPage} 页~`);
            if (id < maxPage && !stopExpand) setTimeout(getHistoryPage(++id), 1e3);
            else this.verifyInit();
          }
        })
      }
      McmodderUtils.commonMsg("准备自动展开，可随时按 Ctrl + C 取消~");
      $("html").bind("keydown", e => {
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) window.stopExpand = true;
      })
      getHistoryPage(2);
      $(".pagination").remove();
    } else {
      this.verifyInit();
    }
  }

  itemTabInit() {
    // GTCEu
    if (this.utils.getConfig("gtceuIntegration")) $(".power_area").each((i, c) => new GTCEuEnergyFrame(c));

    // 紧凑合成表
    if (!this.utils.getConfig("compactedTablist")) return;
    McmodderUtils.addStyle(`
      .item-table-block p {
        display: inline; margin: 2px;
      }
      .item-table-block td {
        padding: 0rem;
        line-height: 1.0;
      }
      .alert {
        margin-bottom: 0rem;
      }
      .alert.alert-table-forother {
        background-color: transparent; color: #c63;
        border: 1px solid #963;
      }
      .alert.alert-table-startver {
        background-color: transparent; color: #369;
        border: 1px solid #336;
      }
      .alert.alert-table-endver {
        background-color: transparent; color: #933;
        border: 1px solid #633;
      }
      .alert.alert-table-guifromother {
        background-color: transparent;
        color: #9b9c9d;
        border: 1px solid #d6d8db;
      }
      .item-table-remarks {
        width: 25%;
      }
      .item-table-id {
        width: 7%;
      }
      .item-table-remarks span {
        margin-left: 5%;
        margin-right: 5%;
        width: 90%
      }
      .item-table-block .power_area {
        margin-left: 5%;
        margin-right: 5%;
        width: 90%;
        border-radius: .25em;
      }`);
    $("div.item-table-frame > table.item-table-block > thead > tr").each((_, e) => {
      e.innerHTML = '<th class="title item-table-id">合成表 ID</th>' + e.innerHTML;
    });
    $("div.item-table-frame > table.item-table-block > tbody > tr").each((_, e) => {
      const idTd = $('<td class="text item-table-id"><span class="mcmodder-slim-dark">' + $("td.text.item-table-remarks ul.table-tool a:first-child()", e).get(0).href.split("/edit/")[1].split("/")[0] + '</span></td>').appendTo(e);
      e.insertBefore(idTd[0], e.childNodes[0]);
    })
    $("div.item-table-frame > table.item-table-block td.text.item-table-gui").each(e => {
      $(e).find("div.TableBlock").first().hide();
      $('<a class="mcmodder-gui-control">轻触展开 GUI</a>').appendTo(e).click(f => {
        const target = $(f.currentTarget);
        const gui = target.parent().find(".TableBlock");
        if (McmodderUtils.isNodeHidden(gui)) {
          target.html("轻触收起 GUI");
          gui.show();
        } else {
          target.html("轻触展开 GUI");
          gui.hide();
        }
      });
    });
    $("div.item-table-frame > table.item-table-block td.text.item-table-count a[data-toggle=tooltip]").each((_, e) => {
      if (e.parentNode.textContent.includes("[使用:")) {
        $(e).attr("mcmodder-gui-id", McmodderUtils.abstractIDFromURL(e.href, "item"));
        return;
      }
      let itemId;
      if (e.href.includes("/oredict/")) {
        const dictName = e.href.split("/oredict/")[1].split("-1.html")[0];
        for (const i of $("div.common-oredict-loop a", e.parentNode.parentNode.parentNode).toArray())
          if (i.href.split("/oredict/")[1].split("-1.html")[0] === dictName) {
            itemId = parseInt(i.childNodes[0].src.split("/")[i.childNodes[0].src.split("/").length - 1].split(".png")[0]);
            break;
          }
      }
      else itemId = parseInt(McmodderUtils.abstractIDFromURL(e.href, "item"));
      e.innerHTML = `<span class="mcmodder-tab-item-name">${e.textContent}</span><span class="mcmodder-tab-item-icon" style="background-image: url(${McmodderUtils.getImageURLByItemID(itemId)}); width: 32px; height: 32px; display: inline-block; position: relative; background-size: cover;"></span>`;
      let itemCount = parseInt(e.parentNode.innerHTML.replace(",", "").split("* ")[1]);
      if (itemCount > 1) {
        let displayCount = McmodderUtils.getFormattedNumber(itemCount), fontSize = (displayCount < 1e3 ? 16 : 12);
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: white; position: absolute; right: 1px; bottom: 1px; line-height: ' + fontSize + 'px; font-size: ' + fontSize + 'px;">' + displayCount + '</span>');
      }
      if ($(e).parent().find("span[data-original-title=合成后返还]").length) {
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: lime; position: absolute; right: 1px; bottom: 1px; line-height: 12px; font-size: 12px;">无损</span>');
        $(e).parent().find("span[data-original-title=合成后返还]").remove();
      }
      if (e.href.includes("/oredict/")) {
        let ns = "";
        switch (e.href.split("/oredict/")[1].split(":")[0]) {
          case "forge": ns = "F"; break;
          case "c": ns = "C"; break;
          case "minecraft": ns = "M"; break;
        }
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; color: black; position: absolute; left: 0px; top: 1px; line-height: 16px; font-size: 16px;">#' + ns + '</span><span style="font-family: Unifont; color: aqua; position: absolute; left: 1px; top: 0px; line-height: 16px; font-size: 16px;">#' + ns + '</span>');
      }
      $(e).parent().find("span").each((_, f) => {
        if (f.getAttribute("data-original-title")?.includes("概率")) {
          const chance = f.textContent.split("(")[1].split(")")[0];
          $("span.mcmodder-tab-item-icon", f.parentNode).append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: yellow; position: absolute; right: 1px; top: 0px; line-height: 16px; font-size: 12px;">' + chance + '</span>');
          f.remove();
        }
      })
      $(e).parent().contents().filter((_, c) => c.nodeType === Node.TEXT_NODE).remove();
    });
    $("div.item-table-frame").each((_, e) => {
      if ($(e).find("tr").length > 9 && !window.location.href.includes("/tab/") && !window.location.href.includes("/oredict/"))
        $("<tr>").appendTo($(e).find("tbody").get(0)).html(`<td colspan="4" style="text-align: center; padding: 5px;"><a class="mcmodder-common-danger" href="${$(".item-table-tips a", e.parentNode.parentNode).attr("href")}">显示的合成表数量已达到 10 个，可能有更多合成表已被隐藏！轻触此处查看所有合成/用途~</span></td>`);
    })
    $("span.mcmodder-tab-item-name").hide();
    $("div.item-table-frame > table.item-table-block td.text.item-table-count p").filter((_, c) => c.textContent === "↓").each((_, p) => {
      let guiId = parseInt($(p).find("[mcmodder-gui-id]").attr("mcmodder-gui-id"));

      // 原版GUI图标来自EMI: https://github.com/emilyploszaj/emi/
      let x = -1, y = -1;
      switch (parseInt(guiId)) {
        case 52: x = 0, y = 0; break; // 工作台
        case 54: x = 34, y = 0; break; // 熔炉
        case 209877: x = 68, y = 0; break; // 高炉
        case 209876: x = 0, y = 34; break; // 烟熏炉
        case 158632: x = 34, y = 34; break; // 营火
        case 209864: x = 68, y = 34; break; // 切石机
        case 210368: x = 0, y = 68; break; // 锻造台
        case 48: x = 34, y = 68; break; // 酿造台
        case 209863: x = 68, y = 68; break; // 砂轮
      }
      $(p).html(`<span style="background-image: url(${McmodderValues.assets.progress2}); height: 32px; width: 64px; display: inline-block; background-size: cover; margin-left: 5px; margin-right: 5px; position: relative;">${guiId ? ((x < 0) ? '<span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + parseInt(guiId / 1e4) + '/' + guiId + '.png); width: 32px; height: 32px; display: inline-block; position: absolute; left: 12px; background-size: cover;"></span>' : '<span class="mcmodder-tab-item-icon" style="background-image: url(' + McmodderValues.assets.sprite + '); background-position: -' + x + 'px -' + y + 'px; width: 34px; height: 34px; display: inline-block; position: absolute; left: 12px;"></span>') : ''}</span>`);
    });
    $("div.item-table-frame > table.item-table-block td.text.item-table-count span.noecho").remove();
    $("fieldset.power_area > p:not(fieldset.power_area > p:last-child())").append(" ·");
    $(".item-table-tips").remove();
  }

  generalEditInit() {

    // Mac 支持
    /* if (this.isMac) {
      let t = $(".edit-tools");
      t.find(".save a").contents().last().get(0).data = "⌘S";
      t.find(".new a").contents().last().get(0).data = "⌘⇧S";
      t.find(".load a").contents().last().get(0).data = "⌘O";
      t = $(".left .text").get(0);
      t.innerHTML = t.innerHTML.replace("Alt + X", "⌥X").replace("Ctrl + Enter", "⌘⏎");
    } */
    let leftText = $(".left .text").get(0);
    leftText.innerHTML = leftText.innerHTML
      .replace("Alt + X", McmodderUtils.key2Str(this.utils.getConfig("keybindFastLink")))
      .replace("Ctrl + Enter", McmodderUtils.key2Str(this.utils.getConfig("keybindFastSubmit")));

    // Bug修复：快速存档时当前菜单自动关闭
    if (this.utils.getConfig("autoSaveFix")) editAutoSaveLoop = function () { 1 == nAutoSave ? $("#editor-frame").length > 0 && 0 == editor.getContent().trim().length ? nAutoSave = 60 : (editSave(), nAutoSave--) : nAutoSave > 0 && nAutoSave--, $("#edit-autosave-sec").text(nAutoSave), setTimeout(editAutoSaveLoop, 1e3) }

    if (!this.utils.isKeyMatchConfig("keybindFastSubmit", { CtrlKey: true, key: "Enter", keyCode: 13 }))
      bindFastSubmit = e => { // @Override
        if (this.utils.isKeyMatchConfig("keybindFastSubmit", e)) {
          e.preventDefault();
          $('#edit-submit-button').click();
          if (this.utils.getConfig("fastSubmitFix")) e.stopPropagation(); // Bug修复：快速提交时编辑框意外换行
        }
        if ((!e.shiftKey) && McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 83 }, e)) {
          e.preventDefault();
          $('.edit-tools .save a').click();
        }
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, shiftKey: true, keyCode: 83 }, e)) {
          e.preventDefault();
          $('.edit-tools .new a').click();
        }
      }

    // 改动附言与说明提示
    const b = $(".common-rowlist-block b");
    b.filter((i, c) => $(c).text() === "改动附言:").append('<span class="mcmodder-common-danger"> (仅用于给审核员留言)</span>');
    b.filter((i, c) => $(c).text() === "改动说明:").append('<span class="mcmodder-common-dark"> (所有人均可见)</span>');
    $("[data-multi-id=remark], [data-multi-id=reason]").hide().each((_, e) => $(`<textarea id=${"mcmodder-textarea-" + $(e).attr("data-multi-id")} class="form-control" placeholder="${$(e).attr("placeholder")}"></textarea>`).insertBefore($(e).parent()).val($(e).val()).bind("change", e => { $(e.target).parent().find(`[data-multi-id=${e.target.id.split("-").slice(-1)[0]}]`).val($(e.target).val()) }));
  }

  _setDirector = (e, b, textLink, formLink, regLink) => {
    $(`<a class="badge">${e} <i class="fa fa-search" style="margin: 0"></i></a>`).click(async function () {
      let r = editorDoc.createRange(), l = $("*, * *", editorDoc.body).contents();
      l.each((_, c) => {
        if (c.nodeType != Node.TEXT_NODE) return;
        const text = c.textContent, flag = true;
        textLink && textLink.split(",").forEach(textLink => {
          if (flag && text.includes(textLink)) {
            r.setStart(c, text.indexOf(textLink));
            r.setEnd(c, text.indexOf(textLink) + textLink.length);
            flag = false;
          }
        });
        const reg = eval(regLink);
        const regSearch = text.search(reg);
        const regMatch = t.match(reg)[0];
        if (regLink && regSearch && regMatch) {
          r.setStart(c, regSearch);
          r.setEnd(c, regSearch + regMatch.length);
        }
      })
      swal.close();
      await McmodderUtils.sleep(400);
      if (textLink || regLink) {
        const sel = editorWin.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        sel.anchorNode.parentNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      else if (formLink) {
        let t = eval(formLink).first();
        highlight(t, "gold", 2e3, true);
      }
    }).insertBefore(b);
  }

  editorInit() {

    // new McmodderAdvancedUEditor(document.getElementsByTagName("IFRAME").item(0));

    let commonNav = $(".common-nav > ul");
    this.modName = this.itemName = "";
    if (commonNav && commonNav.children().length > 4) {
      commonNav = commonNav.first();
      this.modName = commonNav.children().eq(4).text().replace("]", "] ");
      if (commonNav.children().eq(8).length) this.itemName = commonNav.children().eq(8).text();
    }
    McmodderUtils.addStyle(".swal2-show {animation: unset; -webkit-animation: unset;}");

    // McmodderTemplate ...

    if (!this.utils.getConfig("itemCustomTypeList")) this.utils.setConfig("itemCustomTypeList", JSON.stringify(McmodderValues.itemCustomTypeList));
    window.itemCustomTypeList = JSON.parse(this.utils.getConfig("itemCustomTypeList") || '[]'); // 自定义资料类型

    const autoLinkObserver = new MutationObserver(function (mutationList, autoLinkObserver) {
      for (let mutation of mutationList) {
        if (mutation.type === "childList" && mutation?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title").text() === PublicLangData.editor.autolink.title) {
          // 一堆还不知道有没有用的代码
          // 反正先留着吧，以后再清理www

          /*let autoLinkFrame = $(mutation.addedNodes[0]);
          // let a, pt = 1, mod = "", modAbbr = "", img, dataId, name, eName;
          let autoLinkUl = autoLinkFrame.find(".edit-autolink-list > ul").first();
          let userInput = autoLinkFrame.find("input.form-control").val().trim().toLowerCase().split(' ');
          if (!autoLinkUl.length) return;
          let autoLinkList = autoLinkUl.find("li");
          autoLinkFrame.find("button[type=submit]").click(() => $(".edit-autolink-list input.form-control").attr("disabled", "disabled")); */

          // 矿物词典/物品标签链接支持
          /*
          if (userInput[0]?.includes("#")) {
            let od = $("<li>"), tagName = userInput[0].replaceAll("#", "");
            $(od).html(`
            <li>
              <a title="矿物词典/物品标签 - ${tagName}" data-type="oredict" data-text-full="#${tagName}" data-text-half="${tagName}" href="javascript:void(0);">
                <i class="fas fa-cubes mcmodder-chroma"></i>
                #${tagName}
              </a>
            </li>`);
            od.find("a").click(event => {
              let setOredictLink = (t, e, i) => {
                e = e.replaceAll("#", "");
                if (i.length < 1) return 0;
                swal.close(), $("#edit-autolink-style-space:checked").val() === 1 ?
                  editor.execCommand("insertHtml", `&nbsp;<a href="//www.mcmod.cn/${t}/${e}-1.html" target="_blank" title="${i}">${i}</a>&nbsp;`)
                  :
                  editor.execCommand("insertHtml", `<a href="//www.mcmod.cn/${t}/${e}-1.html" target="_blank" title="${i}">${i}</a>`);
              }
              var t = editor.selection.getRange().cloneContents();
              switch ($(".edit-autolink-style input[name='edit-autolink-style-text']:checked").val()) {
                case "0": var e = t ? t.textContent : "_(:з」∠)_"; break;
                case "1": e = $(this).attr("data-text-half"); break;
                case "2": e = $(this).attr("data-text-full"); break;
                default: return 0;
              }
              setOredictLink($(this).attr("data-type"), e, e);
            });
            od.appendTo(autoLinkList.parent());
            autoLinkList = autoLinkUl.find("li");
          } */

          /* R.I.P.
          autoLinkList.filter((i, c) => c.className != "limit" && c.className != "empty").each(function () {
            let autoLinkIndex = 1, a = $("a", this).get(0), mod = a.title.split(" - ")[2] || "", modAbbr = mod.includes('[') ? mod.slice(1).split('] ')[0] : mod.split(' (')[0], dataId = $(a).attr("data-id");

            McmodderValues.nonItemTypeList.forEach(item => a.innerHTML = a.innerHTML.replace(item.text + " -", `<i class="fas ${item.icon} mcmodder-chroma"></i>`));
            McmodderValues.itemDefaultTypeList.forEach(item => a.innerHTML = a.innerHTML.replace(item.text + " -", `<span class="iconfont icon" style="color: ${item.color}">${item.icon}</span>`));
            itemCustomTypeList.forEach(item => a.innerHTML = a.innerHTML.replace(item.text + " -", `<i class="fas ${item.icon}" style="color: ${item.color}"></i>`));

            a.innerHTML = a.innerHTML.replace(`ID:${ dataId }`, `<span class="mcmodder-slim-dark item-id">${ dataId }</span>`);

            name = $(a).attr("data-text-half");
            eName = $(a).attr("data-text-full").replace(name, "");
            eName = eName.slice(2, eName.length - 1);
            a.innerHTML = a.innerHTML.replace("(" + eName + ")", `<span class="item-ename">${ eName }</span>`);
            if (modAbbr) a.innerHTML = a.innerHTML.replace(`${ dataId }</span>`, `${ dataId }</span> <span class="item-modabbr">[${ modAbbr }]</span>`);
            let dependences = this.utils.getConfig(nClassID, "modDependences")?.split(",") || [];
            let expansions = this.utils.getConfig(nClassID, "modExpansions")?.split(",") || [];
            if (mod === modName || modAbbr === "MC" || dependences.includes(mod) || expansions.includes(mod) || userInput.includes(modAbbr.toLowerCase()) || userInput.includes("原版") || $("a", this).attr("data-type") === "oredict") {
              if ($(".item-modabbr", this).length) {
                if (modAbbr === "MC" || dependences.includes(mod)) $(".item-modabbr", this).addClass("mcmodder-mark-aqua");
                else if (expansions.includes(mod)) $(".item-modabbr", this).addClass("mcmodder-mark-pink");
                else $(".item-modabbr", this).addClass("mcmodder-mark-gold");
                $(".item-modabbr", this).css("font-weight", "bold");
              }
              $(this).insertBefore(autoLinkUl.children().eq((pt++) + 1));
              if (userInput.includes(name.toLowerCase()) || userInput.includes(eName.toLowerCase()) || $("a", this).attr("data-type") === "oredict") {
                $(this).addClass("mcmodder-mark-gold");
                $(this).insertBefore(autoLinkUl.children().eq(2));
                $(".edit-autolink-list .empty").remove();
              }
            }
            $(this).find("a").attr("data-toggle", "tooltip").click(() => $(".tooltip.show").remove());
          });
          $(".edit-autolink-list ul").children().each((i, e) => {
            if (i > 0 && i < 10) $("a", e).append(`<span class="mcmodder-common-dark item-ename"> [Alt+${ i }]</span>`);
          });
          $("input.form-control", autoLinkFrame).bind("keyup", async e => {
            if (!e.altKey) return;
            e.preventDefault();
            let k = e.key;
            if (k != parseInt(k)) return;
            let l = $(".edit-autolink-list ul").children().eq(parseInt(k));
            highlight(l, "greenyellow");
            await McmodderUtils.sleep(200);
            l.find("a").click();
          });
          McmodderUtils.updateAllTooltip();
          */

        } else if (mutation.type === "childList" && mutation?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title").text() === PublicLangData.editor.template.title) {
          // McmodderTemplate.init();
          this.ueditorFrame.forEach(e => {
            if (e instanceof McmodderAdvancedUEditor) e.template.init();
          });
        }
      }
    });
    autoLinkObserver.observe(document.body, { childList: true });

    // let editorWin = $("#ueditor_0").get(0).contentWindow, editorDoc = editorWin.document;
    // 编辑器内置样式
    // McmodderUtils.addStyle("pre {font-family: Consolas, monospace; box-shadow: inset rgba(50, 50, 100, 0.4) 0px 2px 4px 0px;}", editorDoc);
    if ($(".edit-tools").length) {
      // 一些已经写入 McmodderAdvancedUEditor 的方法
      // ...

      if ($(".edit-user-alert.locked").length) {
        // 改动说明提前
        const desc = $(".col-lg-12.left .common-rowlist-block:last-child() .text p:last-child()").text();
        $("<p>").text("改动说明: " + desc).appendTo(".edit-user-alert");

        // 预提交
        if (this.utils.getConfig("preSubmitCheckInterval") >= 0.1) {
          let strEditTypeName;
          if (strEditType === "author") strEditTypeName = $("#author-team").prop("checked") ? PublicLangData[strEditType].alter.team : PublicLangData[strEditType].alter.single;
          else strEditTypeName = PublicLangData[strEditType].alter;
          let submitButton = $(`
          <div class="text">
            <b>[预编辑] 改动附言:</b>
            <textarea class="form-control" placeholder="改动附言.." id="mcmodder-presubmit-remark"></textarea>
            <p>请填写改动附言，用于给审核留下信息，只有审核员会看到。</p>
            <hr>
            <b>[预编辑] 改动说明:</b>
            <textarea class="form-control" placeholder="改动说明.." id="mcmodder-presubmit-reason"></textarea>
            <p>
              请填写大致修改了哪些地方，会在
              <a target="_blank" href="/class/diff/list/2.html">改动对比</a>
              中显示，所有人都能看到。
            </p>
            <hr>
          </div>
          <input type="button" id="edit-submit-button" class="btn btn-primary mcmodder-content-block mcmodder-presubmit" edit-id="" redo-id="" data-type="${strEditType}_edit" value="预${strEditTypeName}">
        `);
          $(".common-rowlist-block").last().append(submitButton);
          $(document).on("click", ".mcmodder-presubmit", e => {
            let popup = $(".swal2-popup");
            popup.find("#swal2-title").html(popup.find("#swal2-title").html().replace("编辑", "预编辑"));
            popup.find(".edit-dataverify-frame").after('<span class="mcmodder-slim-dark">预编辑内容将会被临时保存在本地，直到该用户的待审项被处理之后才会正式提交。已保存的预编辑项可在“审核列表 -> 只显示我提交的”看到，暂不支持重新修改，请知悉。');
            popup.find(".swal2-confirm").get(0).onclick = null;
            popup.find(".swal2-confirm").click(() => {
              // if (error.length > 0) return;
              const editorData = getEditorData(false);
              editorData["edit-id"] ||= McmodderUtils.abstractIDFromURL(window.location.href, "edit");
              editorData["redo-id"] ||= 0;
              const remark = $("#mcmodder-presubmit-remark").val().trim();
              const reason = $("#mcmodder-presubmit-reason").val().trim();
              if (remark) editorData[strEditType + "-data"].remark = remark;
              if (reason) editorData[strEditType + "-data"].reason = reason;
              const config = {
                url: "https://" + strEventUrl + "/action/edit/doEdit/",
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Origin": "https://www.mcmod.cn",
                  "Referer": "https://www.mcmod.cn/",
                  "Priority": "u=0",
                  "Sec-Fetch-Dest": "empty",
                  "Sec-Fetch-Mode": "cors",
                  "Sec-Fetch-Site": "same-site"
                }
                // data: $.param({ data: editorData })
              }, preSubmitEntry = {
                id: McmodderUtils.randStr(8),
                title: $("title").text(),
                lastSubmitTime: (new Date($(".locked").text().match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)[0])).getTime(),
                createTime: Date.now(),
                url: window.location.href,
                rawData: editorData,
                config: config
              };
              const preSubmitList = this.utils.getProfile("preSubmitList") || [];
              for (const i in preSubmitList) {
                if (preSubmitEntry.url === preSubmitList[i].url) {
                  preSubmitList[i] = Object.assign({}, preSubmitEntry);
                  preSubmitEntry = null;
                }
              }
              if (preSubmitEntry) preSubmitList.push(preSubmitEntry);
              this.utils.setProfile("preSubmitList", preSubmitList);
              McmodderUtils.commonMsg(`预编辑内容${ preSubmitEntry ? "保存" : "替换" }成功，将会在正式提交时提醒~`);
              Swal.close();
            })
          });
        }
      }

      // 其他一堆并进 McmodderAdvancedUEditor 的小玩意儿

      // LaTeX 编辑器
      /*if (this.utils.getConfig("latexEditor")) {
        let mathjax_config = document.createElement("script");
        mathjax_config.id = "mcmodder-mathjax-config";
        mathjax_config.innerHTML = "\
          MathJax = {\
          tex: {\
            inlineMath: [['$', '$'], ['\\(', '\\)']]\
          },\
          svg: {\
            fontCache: 'global'\
          }\
        };";
        editorDoc.head.appendChild(mathjax_config);
        let mathjax_src = document.createElement("script");
        mathjax_src.id = "mcmodder-mathjax";
        mathjax_src.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js";
        editorDoc.head.appendChild(mathjax_src);
        let html2canvas_src = document.createElement("script");
        html2canvas_src.id = "mcmodder-canvg";
        html2canvas_src.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js";
        editorDoc.head.appendChild(html2canvas_src);
        setTimeout(function () {
          $($(".edui-editor-toolbarboxinner").get(0).appendChild(document.createElement("button"))).attr("class", "btn btn-outline-dark btn-sm").html("转化为 LaTeX").click(function () {
            let w = $("#ueditor_0").get(0).contentWindow;
            w.MathJax.typeset();
            $("mjx-container", w.document).each(function () {
              w.html2canvas(this).then(canvas => {
                const img = w.document.createElement("img");
                img.src = canvas.toDataURL("image/png");
                w.document.body.appendChild(img);
              })
            })
          });
        }, 2e3);
      }*/
    }

    // 禁用跳转
    const swalObserver = new MutationObserver((mutationList, swalObserver) => {
      for (let mutation of mutationList) {
        if (!mutation.addedNodes[0]?.className?.includes("swal2")) continue;
        let st = $(".swal2-title").text();
        if (st === PublicLangData.editor.success.title) {
          if (this.utils.getConfig("autoCloseSwal")) {
            swal.close();
            McmodderUtils.commonMsg("提交成功，请等待管理员审核~");
          }
          else $(".swal2-success-circular-line-left, .swal2-success-circular-line-right, .swal2-success-fix").css("background-color", "transparent");
        }
        else if (st.includes("确认")) {

          let langList = PublicLangData.editor.inform.list;
          $(".edit-dataverify-frame .error li, .edit-dataverify-frame .warning li, .edit-dataverify-frame .info li").each((i, c) => {
            let warningContent = $(c).text();
            if (warningContent === langList.common_content_personal_pronoun) c.innerHTML = c.innerHTML.replace("您", "<b>您</b>").replace("你", "<b>你</b>");
            else if (warningContent === langList.common_content_ban_title_duplicate) c.innerHTML = c.innerHTML.replace("[ban:title_menu]", "<b>[ban:title_menu]</b>");
            else if (warningContent === langList.common_content_too_many_space) c.innerHTML = c.innerHTML.replace("大量空格", '<a reg-link="/\s{5}/">大量空格</a>');
            else if (warningContent === langList.common_content_wrong_horizontal_rule) c.innerHTML = c.innerHTML.replace("大量横线", '<a text-link="-----,=====,~~~~~">大量横线</a>');
            else if (warningContent === langList.common_name_empty || warningContent === langList.common_name_repeat || warningContent === langList.item_name_empty || warningContent === langList.item_name_repeat) c.innerHTML += '<a form-link="$(\'[data-multi-id=name]\')">定位</a>';
            else if (warningContent === langList.common_ename_format) c.innerHTML += '<a form-link="$(\'[data-multi-id=ename]\')">定位</a>';
            else if (warningContent === langList.common_name_empty) c.innerHTML += '<a form-link="$(\'[data-multi-id=name]\')">定位</a>';
            else if ([langList.common_link_empty, langList.common_link_blank, langList.common_link_nohttp, langList.common_link_no_statement, langList.common_link_remark_redund, langList.common_link_suffix_redund_common, langList.common_link_suffix_redund_cf, langList.common_link_suffix_redund_mr, langList.common_link_no_prefix, langList.common_link_wrong_prefix, langList.common_link_personal, langList.common_link_wrong_location, langList.common_link_source_address_missing].includes(warningContent)) c.innerHTML += '<a form-link="$(\'#link-frame\')">定位</a>';
            else if (warningContent === langList.common_tag_wrong_spliter) c.innerHTML += '<a form-link="$(\'#class-tags\').prev()">定位</a>';
            else if (warningContent === langList.common_key_wrong_spliter) c.innerHTML += '<a form-link="$(\'#class-keys\').prev()">定位</a>';
            else if (warningContent === langList.common_cfid_format) c.innerHTML += '<a form-link="$(\'#class-cfprojectid\').prev()">定位</a>';
            else if (warningContent === langList.common_mrid_format) c.innerHTML += '<a form-link="$(\'#class-mrprojectid\').prev()">定位</a>';
            else if (warningContent === langList.common_author_empty) c.innerHTML += '<a form-link="$(\'#author-frame\')">定位</a>';
            else if (warningContent === langList.common_sname_limit) c.innerHTML += '<a form-link="$(\'[data-multi-id=sname]\')">定位</a>';
            else if (warningContent === langList.class_category_empty || warningContent === langList.modpack_category_empty) c.innerHTML += '<a form-link="$(\'.common-class-category\').parent()">定位</a>';
            else if (warningContent === langList.class_cover_empty) c.innerHTML += '<a form-link="$(\'#cover-select-label\').parent()">定位</a>';
            else if (warningContent === langList.class_platform_api_empty) c.innerHTML += '<a form-link="$(\'#class-data-platform-1\').parent().parent()">定位</a>';
            else if (warningContent === langList.class_mcver_empty) c.innerHTML += '<a form-link="$(\'#mcversion-frame\')">定位</a>';
            else if (warningContent === langList.class_modid_empty || warningContent === langList.class_modid_wrong_spliter) c.innerHTML += '<a form-link="$(\'#class-modid\').prev()">定位</a>';
            else if (warningContent === langList.class_relation_version_duplicate) c.innerHTML += '<a form-link="$(\'#relation-frame\')">定位</a>';
            else if (warningContent === langList.version_name_empty) c.innerHTML += '<a form-link="$(\'[data-multi-id=name]\')">定位</a>';
            else if (warningContent === langList.version_updatetime_empty) c.innerHTML += '<a form-link="$(\'#class-version-updatetime-year\').parent().parent()">定位</a>';
            else if (warningContent === langList.version_mcversion_empty) c.innerHTML += '<a form-link="$(\'[data-multi-id=mcversion]\')">定位</a>';
            else if (warningContent === langList.item_category_empty) c.innerHTML += '<a form-link="$(\'.common-item-mold-list\')">定位</a>';
            else if (warningContent === langList.item_type_empty) c.innerHTML += '<a form-link="$(\'#item-type-frame\')">定位</a>';
            if (/*/正文介绍中含有疑似.+的/.test(warningContent)*/true) {
              let b = $(c).find("b, a[text-link], a[form-link], a[reg-link]");
              b.each((_, b) => {
                b.textContent.split(", ").forEach(e => this._setDirector(e, b, b.tagName === "B" ? e : $(b).attr("text-link"), $(b).attr("form-link"), $(b).attr("reg-link")));
                b.remove();
              })
            }
          });

          if (this.utils.getConfig("noSubmitWarningDelay") && $(".edit-dataverify-frame .warning li").length) {
            McmodderUtils.commonMsg("您已启用“取消提交警告延时”，请检查编辑内容无误后再提交！", false, "警告");
            $(".swal2-confirm").removeAttr("disabled");
          }
        }
      }
    });

    swalObserver.observe(document.body, { childList: true });
  }

  editorLoad() {
    this.generalEditInit();
    if (!$("#editor-frame").length) return;
    const editorObserver = new MutationObserver((mutationList, editorObserver) => {
      for (let mutation of mutationList) {
        if (mutation.target.id === "editor-frame" && mutation.removedNodes.length) {
          editor._setup_old = editor._setup;
          editor._setup = a => {
            editor._setup_old(a);
            this.editorInit();
          }
        }
      }
    })
    editorObserver.observe($("#editor-frame").get(0), { childList: true });
  }

  _hideUnavailableVersion() {
    let flag = false, flag2 = false;
    $("#mcversion-frame fieldset").each((_, e) => {
      e = $(e);
      if (e.attr("mcmodder-huv")) return;
      e.attr("mcmodder-huv", "1");
      let loaderName = e.find("legend").text().split(":")[0], loaderID = e.attr("id").split("-")[2], h, c;
      if (loaderID === "2") {
        c = $(`
          <a id="mcmodder-fabric-hidever" class="fold text-muted" style="display: block">
            <i class="fas fa-chevron-down" style="margin-right: 5px;"></i>
            展开仅 Legacy Fabric/Babric/Ornithe 等低版本移植加载器支持的版本
          </a>`).insertAfter($("#class-data-mcversion-2-29").parent()).click(() => {
          if (McmodderUtils.isNodeHidden(h)) {
            h.show();
            c.html('<i class="fas fa-chevron-up" style="margin-right: 5px;"></i>折叠仅 Legacy Fabric/Babric/Ornithe 支持的版本');
          }
          else {
            h.hide();
            c.html('<i class="fas fa-chevron-down" style="margin-right: 5px;"></i>展开仅 Legacy Fabric/Babric/Ornithe 支持的版本');
          }
        });
        h = $('<div id="mcmodder-fabric-hiddenver"></div>').hide().insertAfter(c);
      }
      e.find(".checkbox").each((_, f) => {
        f = $(f);
        let l = McmodderValues.loaderSupportVersions[loaderID], t = f.find("label").text();
        if (l && !(l.includes(t) || (l[0].includes(">=") && McmodderUtils.versionCompare(t, l[0].split(">=")[1]) > -1))) {
          if (loaderID != "2") {
            f.show();
            if (f.find("input").prop("checked")) {
              flag = true;
              f.find("label").removeClass("text-muted");
              f.addClass("mcmodder-slim-danger").attr({
                "data-toggle": "tooltip",
                "data-html": "true",
                "data-original-title": `${loaderName} 自身并不支持 ${t}！这可能由先前的编辑者疏忽所致，强烈建议取消勾选此版本。<br>如果你认为这个提示是错误的，请向 Mcmodder 作者反馈！`
              });
            }
            else f.hide();
          }
          else {
            f.appendTo(h);
            if (f.find("input").prop("checked")) flag2 = true;
          }
        }
      });
      if (flag2) c.click();
    });
    if (flag) McmodderUtils.commonMsg("支持的 MC 版本存疑，请检查~", false);
    this.updateItemTooltip();
  }

  classEditorInit() {
    setTimeout(() => this._hideUnavailableVersion(), 1e3);
    setTimeout(() => $(document).on("click", "input[data-multi-id=api]", () => this._hideUnavailableVersion()), 1e3);
  }

  _imgResize(s, t) {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let img = new Image();
    img.onload = () => {
      canvas.width = canvas.height = t * (($(".common-item-mold-list li a[data-category-selected='true']").attr("data-multi-value") === "6") ? 1.125 : 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL("image/png");
      $(`#icon-${t}x`).val(data);
      $(`#icon-${t}x-editor`).val(data);
      $(`#item-icon-${t}x-preview-img`).attr("src", data);
    }
    img.src = $(`#icon-${s}x`).val();
  }

  itemEditorInit() {
    const l = "#edit-page-1 .tab-ul hr:nth-child(6)";
    $('<img id="item-icon-16x-preview-img" /><br><input id="icon-input-16x" type="file" accept="image/*" class="hidden"><label id="icon-input-16x-label" class="btn btn-dark" for="icon-input-16x">上传图标以自动调整尺寸</label><input id="icon-16x" style="display: none;">').insertAfter(l);
    $("#item-icon-16x-preview-img").hide();
    $("#icon-input-16x").bind("change", e => {
      const file = e.currentTarget.files[0];
      if (!file.type.includes("image/")) return McmodderUtils.commonMsg(McmodderValues.errorMessage[120], false);
      const reader = new FileReader;
      reader.onload = f => {
        const a = f.currentTarget.result;
        if (!a) return false;
        const image = new Image;
        image.src = a;
        image.onload = () => {
          $("#icon-16x").val(a);
          $("#item-icon-16x-preview-img").show().attr("src", a);
          this._imgResize(16, 32);
          this._imgResize(16, 128);
        }
      };
      reader.readAsDataURL(file);
    });
    $('<input id="icon-32x-editor" placeholder="输入 Base64 格式小图标...">').insertAfter("#icon-32x");
    $('<input id="icon-128x-editor" placeholder="输入 Base64 格式大图标...">').insertAfter("#icon-128x");
    $('<button class="btn">同步至大图标</button>').insertAfter("#icon-32x-editor").click(() => this._imgResize(32, 128));
    $('<button class="btn">同步至小图标</button>').insertAfter("#icon-128x-editor").click(() => this._imgResize(128, 32));
    $("#icon-32x, #icon-128x").bind("change", e => {
      const target = $(e.currentTarget);
      const id = target.attr("id");
      target.val(McmodderUtils.appendBase64ImgPrefix(target.val().trim()));
      $(`#item-${ id }-preview-img`).attr("src", target.val().trim());
      $(`#${ id }-editor`).val(target.val().trim());
    });
    $("#icon-32x-editor, #icon-128x-editor").attr("class", "form-control").bind("change", e => {
      $("#" + e.currentTarget.id.replace("-editor", ""))
      .val(e.currentTarget.value.trim())
      .change();
    });
    $("#icon-32x-editor").val($("#icon-32x").val().trim());
    $("#icon-128x-editor").val($("#icon-128x").val().trim());
    this.editorLoad();

    // 采集工具预览更新
    // $(document).on("click", () => this.updateItemTooltip());

    // JSON 快速手导
    const jsonUploader = $('<input id="mcmodder-json-upload" class="form-control" placeholder="粘贴 JSON 物品导出行于此处以快速填充基本信息..">')
    .insertBefore($(".tab-ul").first())
    .change(_ => {
      let data;
      try {
        data = JSON.parse(jsonUploader.val());
      } catch (e) {
        if (e instanceof SyntaxError) McmodderUtils.commonMsg("请检查提交的 JSON 语法是否正确~", false, "解析错误");
        return;
      }
      try {
        $("[data-multi-id=name]").val(data.name);
        $("[data-multi-id=ename]").val(data.englishName);
        $("#icon-32x").val(data.smallIcon).change();
        $("#icon-128x").val(data.largeIcon).change();
        data.OredictList.slice(1, data.OredictList.length - 1).split(", ").forEach(e => {
          $("[data-multi-id=oredict]").prev().children().val(e).trigger("focusout");
        });
        if (data.maxDurability) $("#item-damage").val(data.maxDurability);
        $("#item-maxstack").val(data.maxStacksSize || data.maxStackSize);
        $("#item-regname").val(data.registerName);
        if (data.metadata) $("#item-metadata").val(data.metadata);
      } catch (e) {
        if (e instanceof TypeError) McmodderUtils.commonMsg(e.toString(), false);
      }
    });

    // 联动
    const interactID = new URLSearchParams(window.location.search).get("i");
    const data = this.utils.getInteract(interactID);
    if (data) {
      jsonUploader.val(data).change();
    }
  }

  versionListInit() {
    if (this.utils.getConfig("versionHelper")) new VersionHelper(this);
  }

  async versionInit() {
    this.generalEditInit();

    // 快速设置日期
    const currentTime = new Date();
    const year = currentTime.getFullYear();
    let check = (t, m, ma) => m <= t && t <= ma;
    $('<input id="mcmodder-date-editor" class="form-control" placeholder="输入 yymmdd 格式数字以快捷设置日期~">').appendTo($("li.tab-li:nth-child(1)").first()).bind("change", function () {
      let date = new Array(this.value.slice(0, 2), this.value.slice(2, 4), this.value.slice(4, 6)), tg;
      if (!(check(date[0], 9, year - 2e3) && check(date[1], 1, 12) && check(date[2], 1, 31))) return;
      if (date[1].charAt(0) === "0") date[1] = date[1].slice(1);
      if (date[2].charAt(0) === "0") date[2] = date[2].slice(1);
      $("#class-version-updatetime-year").selectpicker("val", "20" + date[0]);
      $("#class-version-updatetime-month").selectpicker("val", date[1]);
      $("#class-version-updatetime-day").selectpicker("val", date[2]);
      $("li.tab-li:nth-child(3) > div:nth-child(2) > input:nth-child(1)").get(0).focus();
    });
    // setTimeout(editorInit, 1e3);

    // 自动从 CurseForge/Modrinth 源获取日志
    const param = new URLSearchParams(window.location.search);
    let source = 0, id;
    if (param.get("cfid")) source = 1, id = param.get("cfid");
    else if (param.get("mrid")) source = 2, id = param.get("mrid");
    if (source) {
      const fileid = param.get("fileid");
      let resp, rawData, data;
      if (source === 1) {
        resp = await this.utils.createAsyncRequest({
          url: `https://www.curseforge.com/api/v1/mods/${id}/files/${fileid}/change-log`,
          method: "GET"
        });
        data = JSON.parse(resp.responseText).changelogBody;
      } else if (source === 2) {
        resp = await this.utils.createAsyncRequest({
          url: `https://api.modrinth.com/v2/version/${fileid}`,
          method: "GET"
        });
        data = "<p>" + JSON.parse(resp.responseText).changelog.replaceAll("\n", "</p><p>") + "</p>";
      }
      if (data) setTimeout(() => {
        editor.setContent(data);
        let w = $("#ueditor_0").get(0).contentDocument.body, f = false;
        for (let i = 1; i < 6; i++) $(w).find("h" + i).each((j, e) => { $(e).replaceWith(`<p>[h${i}=${e.textContent}]</p>`); f = true; });
        if (f) $(w).append("<p>[ban:title_menu]</p>");
        $(w).trigger("keyup");
      }, 1100);
      $("[data-multi-id=name]").val(param.get("ver"));
      $("[data-multi-id=mcversion]").val(param.get("mcver"));
      let d = new Date(parseInt(param.get("date")));
      $("#mcmodder-date-editor").val(d.getYear() % 1e2 * 1e4 + (d.getMonth() + 1) * 1e2 + d.getDate()).trigger("change");
    }
  }

  async jsonHelperInit() {
    $("title, .common-nav .item").html("JSON导入辅助");
    $(".search-frame, .eat-frame, .info-frame").remove();

    await McmodderUtils.loadScript(document.head, null, "//www.mcmod.cn/static/public/js/jquery.sortable.min.js");
    await McmodderUtils.loadScript(document.head, null, "//www.mcmod.cn/plugs/tablesorter/js/jquery.tablesorter.min.js");

    const jsonFrameA = new JsonFrame("jsonframe-a", this);
    // const jsonFrameB = new JsonFrame("jsonframe-b", this);

    $(`<div id="mcmodder-jsoncompare">
        <div class="common-text">
          <span class="mcmodder-subtitle">JSON管理</span>
          <div id="mcmodder-json-compare-frame"></div>
        </div>
      </div>`).appendTo(".center");
    jsonFrameA.$instance.appendTo("#mcmodder-json-compare-frame");
    // jsonFrameB.$instance.appendTo("#mcmodder-json-compare-frame");
  }

  async syncSubscribeList(modID) {
    await McmodderUtils.sleep(1e3);
    let hasSubscribed = $(".subscribe i.fas").length;
    let subscribeModlist = this.utils.getProfile("subscribeModlist") || [];
    if (!hasSubscribed && subscribeModlist.includes(modID)) {
      subscribeModlist = subscribeModlist.filter(e => e != modID);
      this.utils.setProfile("subscribeModlist", subscribeModlist);
      this.utils.setConfig(modID, 0, "latestEditTime");
      McmodderUtils.commonMsg("成功同步关注状态~");
    } else if (hasSubscribed && !subscribeModlist.includes(modID)) {
      subscribeModlist.push(modID);
      this.utils.setProfile("subscribeModlist", subscribeModlist);
      McmodderUtils.commonMsg("成功同步关注状态~");
    }
  }

  classInit() {
    $(".common-center").addClass("mcmodder-class-page");

    // 自动记忆前置Mod
    const classID = McmodderUtils.abstractIDFromURL(window.location.href, ["class", "modpack"]);
    const {className, classEname, classAbbr} = McmodderUtils.parseClassDocument($(document));
    const modFullName = McmodderUtils.getClassFullName(className, classEname, classAbbr);
    this.utils.updateClassNameIDMap(McmodderUtils.getClassFullName(modFullName), classID);

    if (this.utils.getConfig("rememberModRelation") && window.location.href.includes("/class/")) {
      let modDependences = this.utils.getConfig(classID, "modDependences_v2", []), newDependences = [];
      let modExpansions = this.utils.getConfig(classID, "modExpansions_v2", []), newExpansions = [];
      $("li.col-lg-12.relation").each((_, e) => {
        let target = $(e);
        target.find("a[data-toggle=tooltip]").each((_, a) => {
          let id = McmodderUtils.abstractIDFromURL(a.href, "class");
          let name = a.textContent;
          if (id && name) this.utils.updateClassNameIDMap(name, id);

          let title = target.find("span[data-toggle=tooltip]:first-child()").text();
          if (title.includes("前置Mod")) {
            newDependences.push(McmodderUtils.abstractIDFromURL(a.href, "class"));
          }
          else if (title.includes("依赖")) {
            newExpansions.push(McmodderUtils.abstractIDFromURL(a.href, "class"));
          }
        })
      });

      if (JSON.stringify(modDependences) != JSON.stringify(newDependences)) {
        this.utils.setConfig(classID, newDependences, "modDependences_v2");
        McmodderUtils.commonMsg("成功更新此模组前置列表~");
      }
      if (JSON.stringify(modExpansions) != JSON.stringify(newExpansions)) {
        this.utils.setConfig(classID, newExpansions, "modExpansions_v2");
        McmodderUtils.commonMsg("成功更新此模组拓展列表~");
      }
    }

    // 自动同步关注状态
    this.syncSubscribeList(classID);
    $(".subscribe").click(() => this.syncSubscribeList(classID));

    // 自动同步自定义资料类型
    let itemCustomTypeList = JSON.parse(this.utils.getConfig("itemCustomTypeList") || "[]");
    $(".class-item-type li").filter((_, e) => !e.className.includes("mold-")).each((_, e) => {
      let f = false, t = $(e).find(".text .title").text(), p = $(e).find(".iconfont i");
      itemCustomTypeList.forEach(d => f ||= (d.text === t));
      if (!f) {
        itemCustomTypeList.push({
          text: t,
          icon: p.attr("class").slice(4),
          color: McmodderUtils.rgbToHex(p.css("color"))
        });
        this.utils.setConfig("itemCustomTypeList", JSON.stringify(itemCustomTypeList));
        McmodderUtils.commonMsg(`成功同步自定义资料类型数据~ (${t})`);
      }
    });

    // 日志总是显示更多按钮
    $(".title").filter((_, e) => e.textContent === "更新日志").append(`<span class="more"><a href="/class/version/${classID}.html" target="_blank">更多</a><a></a></span>`);

    // 愚人节特性
    if (this.utils.getConfig("enableAprilFools")) {
      let n = 0, l = ["诅咒锻炉", "CurseFabric", "BlessForge", "BlessFabric"], o = PublicLangData.website;
      for (let i of $("ul.common-link-icon-frame span.name").toArray()) {
        if (i.innerHTML === o.discord) i.innerHTML = "Drocsid";
        if (i.innerHTML === o.github) i.innerHTML = "GayHub";
        if (i.innerHTML === o.gitlab) i.innerHTML = "GayLab";
        if (i.innerHTML === o.gitee) i.innerHTML = "Giteeeeee";
        if (i.innerHTML === o.modrinth) i.innerHTML = "Pluginrinth";
        if (i.innerHTML === o.wiki) i.innerHTML = "Kiwi";
        if (i.innerHTML === o.curseforge) i.innerHTML = l[Math.floor(Math.random() * 4)];
      }
      $("div.frame span.avatar[title='MCreator - MCr'] img").attr("src", McmodderValues.assets.mcmod.aprilFools.mcr);
      $(".class-card .text-block span").each((_, e) => {
        e.innerHTML = e.innerHTML
        .replace(PublicLangData.class.card.red, "猛票")
        .replace(PublicLangData.class.card.black, "盲票")
      });
      $(".class-card .progress-bar").each((_, e) =>
        $(e).attr("data-original-title", $(e).attr("data-original-title")
        .replace(PublicLangData.class.card.red, "猛票")
        .replace(PublicLangData.class.card.black, "盲票"))
      );
    }

    // 禁用模组页排版
    if (this.utils.getConfig("mcmodderUI") && !this.utils.getConfig("disableClassDataTypesetting")) {
      McmodderUtils.addStyle('.common-center .right .class-text-top {min-height: unset; padding-right: unset;} .mcmodder-class-page {margin: 0 5% 0 5%; width: 90%;}');
      $("<div>").attr("class", "mcmodder-info-right").insertAfter(".class-info-left .col-lg-12:first-child()");
      $(".class-info-right").children().clone().appendTo(".mcmodder-info-right");
      let src = $(".class-info-left").attr("class", "class-info-left mcmodder-class-source-info");
      let cpt = src.clone().attr("class", "class-info-left mcmodder-class-info").appendTo(".class-info-right");

      $(".common-center").append('<div class="right"><div class="class-info"></div></div>');
      $(".class-info-right").appendTo(".common-center .right .class-info");
      $(".col-lg-12.right").addClass("mcmodder-class-init");
      $(".class-text-top").css("min-height", "0");
      $(".class-text .class-info-right").remove();
      $(".common-center > .right").insertBefore(".common-center .right");
      $(".common-center > .right").remove();
      $(".mcmodder-class-info > ul > *, .common-link-frame .title").contents().filter((i, c) => c.nodeType === Node.TEXT_NODE && ([PublicLangData.class.link.title + ":", PublicLangData.class.tags.title + ": ", PublicLangData.modpack.tags.title + ": ", "支持的MC版本: "].includes(c.data) || c.data.includes("作者"))).each(function () {
        $(this).parent().find("> i").remove();
        $(this).replaceWith(`<span class="mcmodder-subtitle">${this.data.replace(":", "")}</span>`)
      });
      $(".mcmodder-class-info .author .fold").remove();

      let iconSvg = $("body > svg").first().html();
      $("body > svg").first().html(iconSvg + `
        <symbol id="mcmodder-icon-forge" viewBox="0 0 24 24">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path fill="none" stroke="var(--mcmodder-platform-forge)" stroke-width="2"
            d="M2 7.5h8v-2h12v2s-7 3.4-7 6 3.1 3.1 3.1 3.1l.9 3.9H5l1-4.1s3.8.1 4-2.9c.2-2.7-6.5-.7-8-6Z"></path>
        </symbol>
        <symbol id="mcmodder-icon-fabric" viewBox="0 0 24 24">
          <path fill="none" stroke="var(--mcmodder-platform-fabric)"
            d="m820 761-85.6-87.6c-4.6-4.7-10.4-9.6-25.9 1-19.9 13.6-8.4 21.9-5.2 25.4 8.2 9 84.1 89 97.2 104 2.5 2.8-20.3-22.5-6.5-39.7 5.4-7 18-12 26-3 6.5 7.3 10.7 18-3.4 29.7-24.7 20.4-102 82.4-127 103-12.5 10.3-28.5 2.3-35.8-6-7.5-8.9-30.6-34.6-51.3-58.2-5.5-6.3-4.1-19.6 2.3-25 35-30.3 91.9-73.8 111.9-90.8"
            transform="matrix(.08671 0 0 .0867 -49.8 -56)" stroke-width="23"></path>
        </symbol>
        <symbol id="mcmodder-icon-neoforge" viewBox="0 0 24 24">
          <g fill="none" stroke="var(--mcmodder-platform-neoforge)" stroke-linecap="round" stroke-linejoin="round"
            stroke-width="2">
            <path d="m12 19.2v2m0-2v2"></path>
            <path
              d="m8.4 1.3c0.5 1.5 0.7 3 0.1 4.6-0.2 0.5-0.9 1.5-1.6 1.5m8.7-6.1c-0.5 1.5-0.7 3-0.1 4.6 0.2 0.6 0.9 1.5 1.6 1.5">
            </path>
            <path d="m3.6 15.8h-1.7m18.5 0h1.7"></path>
            <path d="m3.2 12.1h-1.7m19.3 0h1.8"></path>
            <path d="m8.1 12.7v1.6m7.8-1.6v1.6"></path>
            <path d="m10.8 18h1.2m0 1.2-1.2-1.2m2.4 0h-1.2m0 1.2 1.2-1.2"></path>
            <path
              d="m4 9.7c-0.5 1.2-0.8 2.4-0.8 3.7 0 3.1 2.9 6.3 5.3 8.2 0.9 0.7 2.2 1.1 3.4 1.1m0.1-17.8c-1.1 0-2.1 0.2-3.2 0.7m11.2 4.1c0.5 1.2 0.8 2.4 0.8 3.7 0 3.1-2.9 6.3-5.3 8.2-0.9 0.7-2.2 1.1-3.4 1.1m-0.1-17.8c1.1 0 2.1 0.2 3.2 0.7">
            </path>
            <path d="m4 9.7c-0.2-1.8-0.3-3.7 0.5-5.5s2.2-2.6 3.9-3m11.6 8.5c0.2-1.9 0.3-3.7-0.5-5.5s-2.2-2.6-3.9-3"></path>
            <path d="m12 21.2-2.4 0.4m2.4-0.4 2.4 0.4"></path>
          </g>
        </symbol>
        <symbol id="mcmodder-icon-quilt" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="2"
          viewBox="0 0 24 24">
          <defs>
            <path id="quilt" fill="none" stroke="var(--mcmodder-platform-quilt)" stroke-width="65.6"
              d="M442.5 233.9c0-6.4-5.2-11.6-11.6-11.6h-197c-6.4 0-11.6 5.2-11.6 11.6v197c0 6.4 5.2 11.6 11.6 11.6h197c6.4 0 11.6-5.2 11.6-11.7v-197Z">
            </path>
          </defs>
          <path fill="none" d="M0 0h24v24H0z"></path>
          <use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 -3.2)"></use>
          <use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 7)"></use>
          <use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 6.9 -3.2)"></use>
          <path fill="none" stroke="currentColor" stroke-width="70.4"
            d="M442.5 234.8c0-7-5.6-12.5-12.5-12.5H234.7c-6.8 0-12.4 5.6-12.4 12.5V430c0 6.9 5.6 12.5 12.4 12.5H430c6.9 0 12.5-5.6 12.5-12.5V234.8Z"
            transform="rotate(45 3.5 24) scale(.02843 .02835)"></path>
        </symbol>
        <symbol id="mcmodder-icon-rift" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M2.7 6.6v10.8l9.3 5.3 9.3-5.3V6.6L12 1.3zm0 0L12 12m9.3-5.4L12 12m0 10.7V12"></path>
        </symbol>
        <symbol id="mcmodder-icon-liteloader" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5"
          viewBox="0 0 24 24">
          <rect width="24" height="24" fill="none"></rect>
          <path d="m3.924 21.537s3.561-1.111 8.076-6.365c2.544-2.959 2.311-1.986 4-4.172" fill="none" stroke="currentColor"
            stroke-width="2px"></path>
          <path
            d="m7.778 19s1.208-0.48 4.222 0c2.283 0.364 6.037-4.602 6.825-6.702 1.939-5.165 0.894-10.431 0.894-10.431s-4.277 4.936-6.855 7.133c-5.105 4.352-6.509 11-6.509 11"
            fill="none" stroke="currentColor" stroke-width="2px"></path>
        </symbol>
        <symbol id="mcmodder-icon-default" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z"
            clip-rule="evenodd"></path>
        </symbol>`);
      $(".col-lg-12.common-rowlist-2 li, .mcmodder-class-info .col-lg-4").each((i, c) => {
        const t = c.textContent;
        const d = t.split(t.includes("：") ? "：" : ": ");
        if (d[1] == Number(d[1])) d[1] = Number(d[1]).toLocaleString();
        if (d[0] === "支持平台") d[1] = d[1].replace(" (JAVA Edition)", "").replace(" (Bedrock Edition)", "");
        else if (d[0] === "运作方式") {
          const a = d[1].split(", "); d[1] = "";
          a.forEach(e => {
            d[1] += `<a class="mcmodder-modloader" data-toggle="tooltip" data-original-title="${e}"><svg viewBox="0 0 24 24"><use xlink:href="#mcmodder-icon-${["forge", "fabric", "neoforge", "rift", "liteloader"].includes(e.toLowerCase()) ? e.toLowerCase() : "default"}"></use></svg>`;
            if (a.length === 1) d[1] += `<span class="mcmodder-loadername" style="color: var(--mcmodder-platform-${a[0].toLowerCase()})">${a[0]}</span>`;
            d[1] += "</a>";
          });
        }
        if (d[0] === "运行环境") {
          const a = d[1].split(", ");
          a.forEach(e => {
            let r = e.slice(3, 5);
            if (r === "需装") r = `<span style="color: var(--mcmodder-td1)"><i class="fa fa-check" />${r}</span>`;
            else if (r === "无效") r = `<span style="color: gray"><i class="fa fa-ban" />${r}</span>`;
            else if (r === "可选") r = `<span style="color: var(--mcmodder-td2)"><i class="fa fa-circle-o" />${r}</span>`;
            $(`<li class="col-lg-6"><span class="title">${r}</span><span class="text">${e.slice(0, 3)}</span></li>`).insertAfter($(this).parent().children()[i - 1]);
          });
          c.remove();
        } else c.innerHTML = `<span class="title">${d[1]}</span><span class="text">${d[0]}</span>`;
        if (c.className === "col-lg-4") c.className = "col-lg-6";
      });
      $(".slider-block").remove();
      $(".modlist-filter-block.auto button[type=submit]").css({ "background": "transparent", "color": "var(--mcmodder-txcolor)" });

      const infoModpack = parseInt($(".infolist.modpack").text().slice(2));
      const infoServerCount = parseInt($(".infolist.server-count").text().slice(2));
      const infoServerPre = parseFloat($(".infolist.server-pre").text().split("安装率为 ")[1]);
      const infoWorldgen = parseFloat($(".infolist.worldgen").text().split("有 ")[1]);
      const infoDownload = $(".download-btn").attr("title")?.split("共 ")[1]?.split(" 次下载")[0];
      $(".infolist.modpack, .infolist.server-count, .infolist.server-pre, .infolist.worldgen").remove();
      if (infoModpack) $(`<li class="col-lg-6"><span class="title">${infoModpack}</span><span class="text"><a target="_blank" href="/modpack.html?mod=${classID}">整合包已收录</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoServerCount) $(`<li class="col-lg-6"><span class="title">${infoServerCount}</span><span class="text"><a target="_blank" href="https://play.mcmod.cn/list/?classid=${classID}">服务器已安装</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoServerPre) $(`<li class="col-lg-6"><span class="title">${infoServerPre}%</span><span class="text">模组服安装率</span></li>`).insertAfter($(".col-lg-6").last());
      if (infoWorldgen) $(`<li class="col-lg-6"><span class="title">${infoWorldgen}</span><span class="text"><a target="_blank" href="https://www.mcmod.cn/worldgen.html?mod=${classID}">资源分布数据</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoDownload) $(`<li class="col-lg-6"><span class="title">${infoDownload}</span><span class="text">本站下载量</span></li>`).insertAfter($(".col-lg-6").last());

      // 启用悬浮链接提示兼容
      if (src.find(".common-link-frame a").first().attr("href") === "javascript:void(0);") {
        src.find(".common-link-frame a").each((i, c) => {
          const srca = $(c);
          const cpta = $(".class-info-left.mcmodder-class-info").find("#" + srca.attr("id"));
          const url = srca.next().html().split("<strong>")[1].split("</strong>")[0];
          const jumpUrl = srca.next().html().split("href=\\\"")[1].split("\\\">前往链接")[0];
          cpta.webuiPopover({
            title: "这是一个站外链接",
            content: `
              <p>此链接会跳转到:</p>
              <p><strong>${url}</strong></p>
              <br/>
              <p style="word-break:break-all;">
                <a rel="nofollow noreferrer" target="_blank" href="${jumpUrl}">前往链接</a>
                <a style="float:right" class="linkTips_hide" href="javascript:void(0);">不要再提示我</a>
              </p>`,
            trigger: "click",
            closeable: true,
            delay: 0
          });
          cpta.parent().click(() => $(".tooltip").tooltip("hide"));
        })
      }
    } else {
      McmodderUtils.addStyle('.common-center .right .class-text-top {padding-right: 250px;}');
      $(".class-info-right, .class-excount").addClass("mcmodder-disable-modern");
    }

    // 图像本地化检测
    if (this.utils.getConfig("imageLocalizedCheck")) $(document).on("load", ".figure img", function () {
      fetch(this.src, { method: "HEAD" }).then(resp => {
        if (resp.status != 200) return;
        if (Number(resp.headers.get("content-length")) > 1024000) return; // editor.options.fileMaxSize
        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(resp.headers.get("content-type"))) return; // editor.options.fileAllowFiles ?
        if (!this.src.includes("mcmod.cn")) $(this).parent().append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>').css("border", "10px solid red");
      });
    });

    if (this.utils.getConfig("mcmodderUI")) {
      $(".class-item-type .mold:not(.mold-0)").each((_, c) => {
        $('<span class="mcmodder-mold-num">')
        .text(parseInt($(c).find(".count").text().slice(1)).toLocaleString())
        .css("color", $(c).find(".title").css("color"))
        .appendTo(c);
      });
    }

    // 广告优化
    if (this.utils.getConfig("moveAds")) {
      $(".class-text .comment-ad").insertAfter($(".class-text > *").last());
    }

    // 展开高级信息
    if (this.currentUID && classID) {
      $(`<a class="btn mcmodder-class-info-fold btn-outline-secondary mcmodder-content-block"><i class="fas fa-chevron-down"></i>&nbsp;展开高级信息</a>`).click(() => {
        this.utils.createRequest({
          url: `https://www.mcmod.cn/class/edit/${classID}/`,
          method: "GET",
          onload: resp => {
            const doc = $(resp.responseXML);
            if (doc.find(".edit-unlogining").length) {
              if (doc.find(".edit-unlogining").text().includes("登录")) McmodderUtils.commonMsg("请重新登录或关闭隐身模式后再操作~", false);
              else McmodderUtils.commonMsg("受本模组区域限制，无法直接获取高级信息...", false)
              return;
            }
            const infoModID = doc.find("#class-modid").val();
            const infoCFID = doc.find("#class-cfprojectid").val();
            const infoMRID = doc.find("#class-mrprojectid").val();
            if (infoModID) $(`<li class="col-lg-6"><span class="title">${infoModID}</span><span class="text">MODID</span></li>`).insertAfter($(".col-lg-6").last());
            if (infoCFID) $(`<li class="col-lg-6"><span class="title">${infoCFID}</span><span class="text">CFID</span></li>`).insertAfter($(".col-lg-6").last());
            if (infoMRID) $(`<li class="col-lg-6"><span class="title">${infoMRID}</span><span class="text">MRID</span></li>`).insertAfter($(".col-lg-6").last());
            $(".mcmodder-class-info-fold").remove();
          }
        });
      }).insertAfter($(".col-lg-6").last());
    }

    // 压缩支持版本
    if (this.utils.getConfig("compactSupportedVersions")) {
      let startIndex, minorIndex, versionRanges, currentRange;
      $(".mcver > ul > ul").each((_, versionListNode) => {
        versionRanges = [];
        currentRange = [];
        let versionList = Array.from(versionListNode.children).slice(1).map(ver => {
          ver.classList.add("mcmodder-uncompactedmcver");
          ver = ver.textContent;
          if (ver === "远古版本") ver = "1.1.0"; // 为统一处理，远古版本视为1.1.0
          ver = ver.split(".").map(Number);
          while (ver.length < 3) ver.push(0);
          return ver;
        });
        for (let ver of versionList) {
          const major = ver[1];
          const minor = ver[2];
          minorIndex = 0;
          for (const index in McmodderValues.allVersionList[major]) { // 查找当前版本在支持版本列表中的索引
            if (McmodderValues.allVersionList[major][index] === minor) {
              minorIndex = Number(index);
              break;
            }
          }
          if (!currentRange.length || currentRange[0][1] > major ||
            (currentRange[0][1] === major && minorIndex + 1 != startIndex)) { // 新建一个版本区间
            currentRange = [Array.from(ver), Array.from(ver)];
            versionRanges.push(currentRange);
            startIndex = minorIndex;
          }
          else if (minorIndex + 1 === startIndex) { // 将当前版本与最近的版本区间合并
            startIndex = minorIndex;
            currentRange[0] = Array.from(ver);
          }
        }

        versionListNode = $(versionListNode);
        versionRanges.forEach(versionRange => { // 将所有版本区间写入页面
          let rangeContent;
          let major = versionRange[0][1];
          let minorList = McmodderValues.allVersionList[major];
          let minorOld = versionRange[0][2];
          let minorNew = versionRange[1][2];
          if (minorList.length > 1 && minorOld === minorList[0] && minorNew === minorList[minorList.length - 1]) rangeContent = `1.${major}.x`;
          else if (minorOld === minorNew) rangeContent = McmodderUtils.versionArrayToString(versionRange[0]);
          else rangeContent = `${McmodderUtils.versionArrayToString(versionRange[1])}-${McmodderUtils.versionArrayToString(versionRange[0])}`

          versionListNode.append(`<li class="text-danger mcmodder-compactedmcver"><a target="_blank" class="mcmodder-content-block">${rangeContent}</a></li>`);
        });
      });

      var isUncompactedmcverShown = false;
      var uncompactedmcver = $(".mcmodder-uncompactedmcver");
      var compactedmcver = $(".mcmodder-compactedmcver");
      uncompactedmcver.hide();
      compactedmcver.show();
      window.addEventListener("keydown", e => {
        if (isUncompactedmcverShown) return;
        if (e.key === "Tab" && e.target === document.body) {
          uncompactedmcver.show();
          compactedmcver.hide();
          isUncompactedmcverShown = true;
        }
      });
      window.addEventListener("keyup", e => {
        if (!isUncompactedmcverShown) return;
        if (e.key === "Tab" && e.target === document.body) {
          uncompactedmcver.hide();
          compactedmcver.show();
          isUncompactedmcverShown = false;
        }
      });
    }

    // 若参与了活动，则为活动添加外边框
    $(".class-text > span.figure").addClass("mcmodder-golden-alert").css("width", "100%");
  }

  diffInit() {
    const textA = $(".difference-content-right");
    const textB = $(".difference-content-left");
    (new TextCompareFrame($(".difference-info").first(), textA, textB)).performCompare();
  }

  diffListInit() {
    if (!this.utils.getConfig("multiDiffCompare")) return;
    $('<button class="btn btn-sm btn-dark" id="diff-multicompare-btn">批量对比选中项</button><div class="mcmodder-multicompare-frame"></div>').insertAfter(".difference-top");
    $("#diff-multicompare-btn").click(async () => {
      const selected = [];
      const id = $("input[name='diff-compare-box']").toArray().map(e => e.getAttribute("value")).sort();
      $("input[name='diff-compare-box']").each((i, e) => e.checked ? selected.push(i) : void 0);
      selected = selected.sort();
      const begin = selected[0];
      const end = selected[1];
      if (selected.length < 2) {
        McmodderUtils.commonMsg(PublicLangData.difference_list.warning.empty, false);
        return;
      } else if (selected.length > 2) {
        McmodderUtils.commonMsg(PublicLangData.difference_list.warning.limit, false);
        return;
      }
      for (let i = begin; i < end; i++) {
        const resp = await this.utils.createAsyncRequest({
          url: `https://www.mcmod.cn/class/diff/${id[i + 1]}-${id[i]}.html`,
          method: "GET"
        });
        const doc = $(resp.responseXML);
        // TODO ...
      }
    })
  }

  classAddInit() {

    // 提醒撞车小助手
    const refreshCrashList = () => {
      const crashList = $('.title.text-danger').first().next();
      crashList.children().first().append(` (${crashList.find(".text-danger").length.toLocaleString()})`);
    }
    $('<a id="mcmodder-crash-protector">[刷新]</a>').appendTo($("div.text-danger").first()).click(() => {
      $("#mcmodder-crash-protector").html("[刷新中...]");
      this.utils.createRequest({
        url: "https://www.mcmod.cn/class/add/",
        method: "GET",
        onload: resp => {
          let d = $(resp.responseXML);
          $("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html(d.find("div.common-rowlist-block:nth-child(2) > div:nth-child(2)").html());
          $("#mcmodder-crash-protector").html("[刷新]");
          McmodderUtils.commonMsg("刷新成功！");
          refreshCrashList();
        }
      });
    });
    refreshCrashList();

    $("#edit-page-2, #edit-page-3").attr("class", "tab-pane active");
    $("div.swiper-container").remove();
    /*
    $(".col-lg-12.right").attr("style", "position: relative;");
    $("div.common-menu-area").attr("style", "width: 75%; display: inline-block;");
    let sidebarMain = $(".col-lg-12.right").get(0).appendChild(document.createElement("div"));
    sidebarMain.setAttribute("style", "position: fixed; top: 100px; right: 250px; max-width: 250px;");
    let sidebarUl = sidebarMain.appendChild(document.createElement("ul")), sidebarLi;
    sidebarUl.id = "mcmodder-sidebar";
    */
    this.editorLoad();

    if (!this.utils.getConfig("classAddHelper")) return;
    // :P
  }

  adminInit() {
    const adminEntries = {
      "模组区内容审核": mutation => {
        // 分屏
        const connectedFrame = document.getElementById("connect-frame");
        const verifyFrame = $("<div>").appendTo(connectedFrame);
        const verifyWindow = $('<div id="mcmodder-verify-window">').appendTo(verifyFrame);
        const verifyWindowDivider = (new HorizontalDraggableFrame({}, connectedFrame)).setHorizontalPos(1).bindRight(verifyFrame, true);

        // 打开待审项时打开分屏
        $("#connect-frame-sub").on("click", "tr[data-data]", _ => {
          verifyWindow.empty();
          verifyWindowDivider.expandIfCollapsed();
        });

        // 调整排版顺序
        const w = $(".container-widget").get(0);
        w.insertBefore(w.childNodes[2], w.childNodes[1]);

        // 一键查询待审项
        let work = () => {
          const verifyDelay = this.utils.getConfig("autoVerifyDelay");
          if (verifyDelay && verifyDelay > 1e-2) {
            this.scheduleRequestList.deleteByTodo("autoCheckVerify");
            this.scheduleRequestList.create(Date.now() + verifyDelay * 60 * 60 * 1000, "autoCheckVerify", this.currentUID);
          }
          $("#mcmodder-check-verification").text("一键查询待审项 (加载中...)");
          const menuList = $("#class-version-list > option");
          const modList = menuList.toArray().map(e => $(e).attr("value"));
          let index = 1, t = 0;
          const getUnverifiedNumber = id => {
            this.utils.createRequest({
              url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
              data: "data=" + JSON.stringify({ classID: id }),
              onload: resp => {
                let n = parseInt(McmodderUtils.unicode2Character(resp.responseText).split("总待审：")[1].split("个。")[0]);
                if (n > 0 && t === 0) $("button.btn:nth-child(2)").first().click();
                t += n;
                if (n > 0) {
                  let li = $("ul.dropdown-menu:nth-child(1)").children().get(index);
                  $(li).addClass("mcmodder-mark-gold");
                  if ($("span.text-danger", li.childNodes[0]).length > 0) $("span.text-danger", li.childNodes[0]).remove();
                  li.childNodes[0].innerHTML += `<span class="text-danger">${n}个待审！</span>`;
                }
                if (modList.length > index + 1) {
                  getUnverifiedNumber(modList[++index]);
                  return;
                }
                else $("#mcmodder-check-verification").text(`一键查询待审项 (${t}个)`);
              }
            });
          };
          if (modList) getUnverifiedNumber(modList[1]);
        }
        $('<button class="btn" id="mcmodder-check-verification" data-toggle="tooltip" data-original-title="快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。">一键查询待审项</button>').insertAfter(".selectJump.bs3").click(work);
        if (this.utils.getConfig("autoVerifyDelay") >= 1e-2) {
          let t = $(`<span style="margin-left: 10px;">距离自动查询: </span>`).insertAfter("#mcmodder-check-verification");
          (new McmodderTimer(this, McmodderTimer.DATAGETTER_SCHEDULE("autoCheckVerify", this.currentUID, this.scheduleRequestList))).$instance.appendTo(t);
        }

        // 单项审核界面
        this.lastRefundText = {};
        const singleVerifyObserver = new MutationObserver((mutationList, singleVerifyObserver) => {
          for (let mutation of mutationList) {
            if (mutation.target.id === "verify-window-frame" && $(mutation.addedNodes).filter((_, c) => c.className?.includes("verify-info-table")).length) { // 当所有详情已全部加载完成
              // 重排版
              const target = $(mutation.target);
              target.appendTo(verifyWindow);
              target.find("> p:first-child()").next().hide();
              target.find("> p:first-child()").append("<span>[展开]</span>").attr("hide", "1").click(e => {
                let t = $("#verify-window-frame > p:first-child()");
                if (t.attr("hide") === "1") {
                  t.attr("hide", "0").next().show();
                  t.find("span").html("[折叠]");
                } else {
                  t.attr("hide", "1").next().hide();
                  t.find("span").html("[展开]");
                }
              });
              target.find("> hr").remove();
              target.find(".verify-action-btns br").remove();
              target.find("#verify-pass-btn:not(.edit)").append(` (${McmodderUtils.key2Str(this.utils.getConfig("keybindVerifyPass"))})`);
              target.find("#verify-refund-btn:not(.edit)").append(` (${McmodderUtils.key2Str(this.utils.getConfig("keybindVerifyRefund"))})`);
              target.find("#verify-reason").attr("placeholder", `填写附言或退回理由.... (按下 ${McmodderUtils.key2Str(this.utils.getConfig("keybindVerifyReason"))} 以快速聚焦)`);
              $(document).keydown(e => {
                if ($(".swal2-confirm").length && McmodderUtils.isKeyMatch({ keyCode: 13 }, e)) $(".swal2-confirm").click();
                else if (this.utils.isKeyMatchConfig("keybindVerifyPass", e)) $("#verify-pass-btn:not(.edit)").click();
                else if (this.utils.isKeyMatchConfig("keybindVerifyRefund", e)) $("#verify-refund-btn:not(.edit)").click();
                else if (this.utils.isKeyMatchConfig("keybindVerifyReason", e)) {
                  e.preventDefault();
                  $("#verify-reason").focus();
                }
              })

              // 正文对比
              $(".verify-copy-btn").parent().filter((i, c) => $(c).css("position") === "absolute").remove(); // 移除原版复制按钮
              const textTr = $(".verify-info-table > tbody").contents().filter((i, c) => $(c).children().text().includes("介绍"));
              const textA = textTr.find("td:nth-child(3) .common-text");
              const textB = textTr.find("td:nth-child(2) .common-text");
              (new TextCompareFrame($("#verify-window-frame").first(), textA, textB)).performCompare();

              // 附言缓存
              const verifyId = JSON.parse($("#verify-pass-btn").attr("data-data")).verifyID;
              $("#verify-reason")
                .val(this.lastRefundText[verifyId] || "")
                .focusout(e => {
                  this.lastRefundText[verifyId] = e.currentTarget.value;
                });
            }
          }
        });
        singleVerifyObserver.observe($("#connect-frame-sub").get(0), { childList: true, subtree: true });
      },
      "MC百科后台管理中心": mutation => {
        let n;
        $("td:first-child()").each((_, c) => {
          n = c.innerText;
          c.innerHTML = `<a href="https://www.mcmod.cn/center/${n}" target="_blank">${n}</a>`;
        })
      },
      "样式管理": mutation => {
        const styleEditObserver = new MutationObserver(function (mutationList, styleEditObserver) {
          for (let mutation of mutationList) {
            if (!(mutation.addedNodes.length > 7 || mutation.removedNodes.length > 7) || $(".item-list-table").length) return;
            const preview = $('<table class="table table-bordered item-list-table item-list-table-1"><thead><tr><th colspan="3"><span class="title"><a target="_blank" href="//www.mcmod.cn/class/8.html">[M3]更多喵呜机 (More Meowing Machinery)</a> 的 物品/方块 资料 (预览)</span></th></tr></thead><tbody><tr><th class="item-list-type-left" style="padding: 0px">一级分类</th><th class="item-list-type-left" style="padding: 0px">二级分类</th><td class="item-list-type-right" style="padding: 0px"><ul><li><span><a href="/item/5281.html" target="_blank"><img class="icon" alt="锡矿石" src="//i.mcmod.cn/item/icon/32x32/0/5281.png?v=3" width="15" height="15"></a><a href="/item/5281.html" target="_blank" >锡矿石</a></span></li><li><span><a href="//www.mcmod.cn/item/40226.html" target="_blank"><img class="icon" alt="锇矿石" src="//i.mcmod.cn/item/icon/32x32/4/40226.png?v=5" width="15" height="15"></a><a href="//www.mcmod.cn/item/40226.html" target="_blank" >锇矿石</a></span></li><li><span><a href="/item/40227.html" target="_blank"><img class="icon" alt="铜矿石" src="//i.mcmod.cn/item/icon/32x32/4/40227.png?v=3" width="15" height="15"></a><a href="//www.mcmod.cn/item/40227.html" target="_blank" >铜矿石</a></span></li><li><span><a href="/item/40337.html" target="_blank"><img class="icon alt="盐块" src="//i.mcmod.cn/item/icon/32x32/4/40337.png?v=2" width="15" height="15"></a><a href="//www.mcmod.cn/item/40337.html" target="_blank" >盐块</a></span></li></ul></td></tr></tbody></table>').insertBefore($(".table-condensed").get(1));
            McmodderUtils.addStyle('', "mcmodder-style-preview");

            if (this.utils.getConfig("itemListStyleFix")) {
              const h = $("#connect-frame-sub script").html() + "//end";
              $("#itemlist-head-th").val(h.split('$("#itemlist-head-th").val("')[1].split('");$("#itemlist-body-th").val("')[0].replaceAll("\\n", "\n"));
              $("#itemlist-body-th").val(h.split('");$("#itemlist-body-th").val("')[1].split('");$("#itemlist-body-td").val("')[0].replaceAll("\\n", "\n"));
              $("#itemlist-body-td").val(h.split('");$("#itemlist-body-td").val("')[1].split('");//end')[0].replaceAll("\\n", "\n"));
            }
            $("#connect-frame-sub textarea").addClass("mcmodder-monospace");
            if (this.utils.getConfig("itemListStylePreview")) {
              $("textarea.style-box").each(function () {
                $(this).bind("change", function () {
                  const t = c => $(c).val().replace(/<!--[\s\S]*?-->/g, "");
                  const titleStyle = t("#itemlist-head-th"), categoryStyle = t("#itemlist-body-th"), itemListStyle = t("#itemlist-body-td");
                  $("#mcmodder-style-preview").html(`table.item-list-table.item-list-table-1 {table-layout: auto}.item-list-table.item-list-table-1 thead th {${titleStyle}}.item-list-table.item-list-table-1 thead th * {color:inherit}.item-list-table.item-list-table-1 thead th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody th {${categoryStyle}}.item-list-table.item-list-table-1 tbody th * {color:inherit}.item-list-table.item-list-table-1 tbody th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody td {${itemListStyle}}.item-list-table.item-list-table-1 tbody td * {color:inherit}.item-list-table.item-list-table-1 tbody td th {${categoryStyle}}.item-list-table.item-list-table-1 tbody td a:hover {color:inherit; opacity:.75}.item-list-table th,.item-list-table td {border-color:#DADADA}.item-list-table {position:relative; margin-bottom:10px}.item-list-table .title {width:100%; margin:0; line-height:30px; font-size:14px; font-weight:bold; text-align:center; display:block}.item-list-table th {background-color:#f9f9f9; font-size:14px; color:#222}.item-list-table .item-list-type-left {width:100px; text-align:center; vertical-align:middle; font-size:12px}.item-list-table .item-list-type-right ul {width:100%; display:block}.item-list-table .item-list-type-right li {display:inline-block; margin-right:10px; font-size:14px}.item-list-table .item-list-type-right li img {margin-right:5px}.item-list-table .item-list-type-right li .null {color:#F30}.item-list-table .item-list-type-right li .null:hover {color:#222}.item-list-table .empty td {line-height:120px; font-size:14px; text-align:center; color:#777}.item-list-table .item-list-type-right li .more {color:#777}.item-list-table .item-list-type-right li .more:hover {color:#222}.item-list-table .item-list-type-right li .more i {margin-right:5px}.item-list-table .title a {text-decoration:underline; text-transform: none;}.item-list-table td {padding:0}.item-list-type-right ul {padding:.75rem}.item-list-table table {width:100%}.item-list-table table td {border-bottom:0; border-right:0}.item-list-table table th {border-bottom:0; border-left:0}.item-list-table:last-child {margin-bottom:0}.item-list-type-right .loading {position:absolute}.item-list-style-setting {text-align:right; font-size:12px; line-height:30px; position:absolute; bottom:-5px; right:5px}.item-list-style-setting i {margin-right:5px}.item-list-style-setting a {color:#99a2aa}.item-list-style-setting a:hover {color:#222}.item-list-branch-frame {width:100%; margin-bottom:10px}.item-list-branch-frame li {display:inline-block; margin-right:5px}.item-list-switch,.item-list-switch-fold {position:absolute; right:10px; top:8px}.item-list-switch-fold {right:auto; left:10px}.item-list-switch li,.item-list-switch-fold {display:inline-block; margin-left:10px; color:#99a2aa}.item-list-pages {padding:0; margin:0}.item-list-pages ul {margin-bottom:10px}@media(max-width:990px) {.item-list-style-setting { position:inherit;  bottom:0 }}@media(max-width:980px) {.item-list-switch { top:-10px }}@media(max-width:720px) {.item-list-switch-fold { top:25px }}@media(max-width:460px) {.item-list-table .item-list-type-left { width:80px;  padding:5px }}@media(max-width:360px) {.item-list-table .item-list-type-left { width:50px;  padding:5px }}@media(max-width:260px) {.item-list-table .item-list-type-left { width:0;  padding:5px }}`);
                });
              });
            }
            $("textarea.style-box").trigger("change");
          }
        });
        styleEditObserver.observe($("div#connect-frame-sub").get(0), { childList: true });
      },
      "GUI管理": mutation => {
        const guiAdminObserver = new MutationObserver((mutationList, guiAdminObserver) => {
          for (let mutation of mutationList) {
            if (mutation.addedNodes[0].id === "class-gui-table") {
              $("#class-gui-table td:nth-child(4) > *:not(.btn)").css("background-color", "transparent");
            }
          }
        });
        guiAdminObserver.observe($("div#connect-frame-sub").get(0), { childList: true });
      }
    };
    const adminObserver = new MutationObserver((mutationList, adminObserver) => {
      for (let mutation of mutationList) {
        let title = $("#connect-frame > div.page-header > h1.title").first().text();
        if (adminEntries[title]) adminEntries[title](mutation);
      }
    });
    adminObserver.observe($(".connect-area").get(0), { childList: true });
  }

  rankInit() {
    McmodderUtils.addStyle(".rank-list-block li {width: auto; display: block; margin: 6px} .progress-bar {background-color: gold; color: black} .progress {border-radius: .0rem}");
    let work = contentRank => {
      if (contentRank.find(".empty").length) return { value: 0, rate: 100 };
      let contentList = contentRank.find("ul > li");
      $('<div><ul class="mcmodder-ranklist-1"/></div><div><ul class="mcmodder-ranklist-2"/></div><div><ul class="mcmodder-ranklist-3"/></div>').appendTo(contentRank).css({ "width": "33.333%", "display": "inline-block" });
      const maxValue = parseFloat(contentList.first().find("span.score").text());
      const listLength = contentList.length;
      let totalValue = 0, totalRate = 0, rate = 0, r = 0;
      for (let i in contentList.toArray()) {
        let li = null, rank = null, e = contentList.eq(i);
        if (i < listLength / 3)
          li = $("<li>").appendTo(contentRank.find(".mcmodder-ranklist-1"));
        else if (i < listLength * 2 / 3)
          li = $("<li>").appendTo(contentRank.find(".mcmodder-ranklist-2"));
        else
          li = $("<li>").appendTo(contentRank.find(".mcmodder-ranklist-3"));
        let div = $('<div>').appendTo(li).css("display", "inline-block");
        let quantity = e.attr("data-content");
        if (quantity.includes("字节")) quantity = quantity.replace("字节", " B").replace('(约', '<span style="color: gray; display: inline">(~').replace("个汉字)", "汉字)</span>");
        else quantity = quantity.replace("次", " 次");
        let href = e.find("a").first().prop("href");
        let rate = parseFloat(e.find("span.score").text());
        if (isNaN(rate)) rate = 0;
        totalRate += rate;
        let userName = e.find("a.name").text();
        $("<i>").appendTo(div).css({
          "float": "left",
          "background-image": `url("${e.find("img").attr("src").replace()}")`,
          "background-size": "cover",
          "width": "40px",
          "height": "40px"
        });
        div = $("<div>").appendTo(li).css({
          "display": "inline-block",
          "width": "calc(100% - 40px)"
        });
        if (i > 0 && e.attr("data-content") != contentList.eq(i - 1).attr("data-content")) r = i;
        switch (parseInt(r)) {
          case 0: rank = '<i class="fa fa-trophy" style="margin-right: 4px; color:goldenrod"></i>'; break;
          case 1: rank = '<i class="fa fa-trophy" style="margin-right: 4px; color:silver"></i>'; break;
          case 2: rank = '<i class="fa fa-trophy" style="margin-right: 4px; color:brown"></i>'; break;
          default: rank = '<span style="margin-right: 4px; display: inline; font-size: 13px" class="mcmodder-common-light">#' + (parseInt(r) + 1) + '</span>';
        }
        div.html(`
          <p style="font-size: 14px; height: 20px; overflow: hidden;">
            ${rank}
            <a style="text-align: left; font-weight: bold; display: inline; font-size: 14px;" href="${href}" target="_blank">
              ${userName + ((userName === this.currentUsername) ? " (我)" : "")}
            </a>
            (${rate}%)
          </p>
          <div class="progress" style="width: 100%;height: 20px;position:relative">
            <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${rate / maxValue * 100.0}%;">
              <span style="text-align: center; display: inline; position: absolute">${quantity}</span>
            </div>
          </div>`
        );
        if (userName === this.currentUsername) div.find("a").first().css("color", "red");
        totalValue += parseInt(quantity.split(" B")[0].replace(",", ""));
      }
      $("ul", contentRank).first().remove();
      return { value: totalValue, rate: totalRate };
    }

    let total1 = work($(".rank-list-block").eq(0)), total2 = work($(".rank-list-block").eq(1));
    if (total1.value || total2.value) $("<span>").appendTo(".rank-list-frame").attr("class", "mcmodder-golden-alert").html(`全体百科用户在 ${$(".rank-search-area .badge-secondary").first().text()} 累计贡献了` + (total2.value ? (`约 <span class="mcmodder-common-dark">${parseInt(total2.value * 100 / total2.rate).toLocaleString()}</span> 次`) : "") + (total1.value ? `共约 <span class="mcmodder-common-dark">${parseInt(total1.value * 100 / total1.rate).toLocaleString()}</span> 字节` : "") + "的编辑量！");
    $(".popover").remove();

    // setTimeout(commentInit, 1e3);

    // 保存贡献数据
    if (this.utils.getConfig("byteChart")) {
      let param = new URLSearchParams(window.location.search);
      let startTime = McmodderUtils.getStartTime(parseInt(param.get("starttime") * 1e3), 0) / 1e3;
      let endTime = McmodderUtils.getStartTime(parseInt(param.get("endtime") * 1e3), 0) / 1e3;
      let minimumRequestInterval = this.utils.getConfig("minimumRequestInterval") || 750;
      if (!(startTime && endTime)) return;
      let getRankData = (t) => {
        if (this.utils.getConfig(t - 24 * 60 * 60, "rankData")) return; // 一天误差
        this.utils.createRequest({
          url: `https://www.mcmod.cn/rank.html?starttime=${t}&endtime=${t}`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" },
          onload: resp => {
            let rawData = [];
            let d = $("<html>").html(resp.responseText.replaceAll("src=", "data-src="));
            d.find(".rank-list-block:nth-child(1) li").each((_, e) => {
              rawData.push({
                value: $(e).attr("data-content").split("字节")[0].replaceAll(",", ""),
                user: $("a", e).attr("href").split("center.mcmod.cn/")[1].split("/")[0]
              });
            });
            let data = JSON.stringify(rawData);
            this.utils.setConfig(t - 24 * 60 * 60, data, "rankData");
            McmodderUtils.commonMsg(`成功保存${ McmodderUtils.getFormattedChineseDate(new Date((t - 24 * 60 * 60) * 1e3)) }的贡献数据~ (${ McmodderUtils.getFormattedSize(data.length) })`);
          }
        });
        if (t <= Math.min(endTime, Date.now() / 1e3 - 24 * 60 * 60)) setTimeout(() => getRankData(t + 24 * 60 * 60), minimumRequestInterval);
      }
      getRankData(Math.max(startTime, 1496332800)); // 字节贡献从 2017-06-02 开始记录
    }
  }

  verifyInit() {

    if ((new URLSearchParams(window.location.search)).get("selfonly") && this.utils.getConfig("preSubmitCheckInterval") >= 0.1) {
      this.preSubmitInit();
    }
    if ($("p.empty").length) return;
    // if ($("#mcmodder-verify-search").length) return;

    // 排版调整
    if (this.utils.getConfig("mcmodderUI")) {
      const p = $(".verify-list-frame .list-row-limit p").first(), d = p.text().match(/\d+/g).map(Number).map(e => e.toLocaleString());
      p.html(`
        <ul class="verify-rowlist">
          <li>
            <span class="title">${d[1]}</span>
            <span class="text">
              <i data-toggle="tooltip" data-original-title="日常审核时间段为 19:00 ~ 次日 07:00" class="fa fa-question-circle"></i>
              48 小时内已处理
            </span>
          </li>
          <li>
            <span class="title">${d[2]}</span>
            <span class="text">今日已处理</span>
          </li>
          <li>
            <span class="title">${d[3]}</span>
            <span class="text">今日新提交</span>
          </li>
          <li>
            <span class="title">${d[4]}</span>
            <span class="text">剩余待审</span>
          </li>
        </ul>`);
    }

    // 紧凑式待审列表
    if (this.utils.getConfig("compactedVerifylist")) {
      McmodderUtils.addStyle(".table-bordered thead td, .table-bordered thead th {text-align: center; min-width: 3em;} .btn-group-sm > .btn, .btn-sm {padding: .0rem .5rem} .table > tbody > tr > td:nth-child(4) > p {display: inline;} td {text-overflow: ellipsis; overflow: hidden; white-space: nowrap;} .verify-list-list td:nth-child(4) i {width: unset; margin: unset;}");
      const verifyTable = $(".table"), stateLang = Object.entries(PublicLangData.verify_list.state.list);
      const stateIcon = ["", "fa fa-pulse fa-spinner", "fa fa-check", "fa fa-close", "fa fa-mail-reply"];

      verifyTable.find("thead th").last().html('状态').after('<th>审核人</th><th>最后审核</th><th>操作</th><th>附言</span></th>');

      verifyTable.find("thead > tr:nth-child(1) > th:nth-child(3)").append("&nbsp;");
      const verifyStateTd = verifyTable.find("tbody > tr > td:nth-child(4)");
      verifyStateTd.each((index, entry) => {
        entry = $(entry);
        const verifyState = ["", "", "", "", ""];
        const s = entry.find("p:first-child()"), t = s.text();
        stateLang.forEach(e => {
          if (t === e[1]) s.html(`<i data-toggle="tooltip" data-original-title="${t}" class="${stateIcon[e[0]]}"></i>`);
        });
        verifyState[0] = s.get(0).outerHTML;
        entry.find("p:not(p:first-child())").each((_, e) => {
          const c = e.textContent.split(": "), h = e.outerHTML.replaceAll(c[0] + ": ", "")
          if (c[0] === PublicLangData.verify_list.verifynum) verifyState[0] += `&nbsp;<p data-toggle="tooltip" data-original-title="${c[0]}: ${c[1]}">(${parseInt(c[1])})</p>`;
          else if (c[0] === PublicLangData.verify_list.verifyuser) verifyState[1] = h;
          else if (c[0] === PublicLangData.verify_list.time.verifytime) verifyState[2] = h;
          else if (c[0] === PublicLangData.verify_list.reason) verifyState[4] = h;
        });
        verifyState[3] = entry.contents().filter("*:not(p)").toArray().reduce((a, b) => a + b.outerHTML, "");
        entry.after(verifyState.reduce((a, b) => `${a}<td>${b ? b : ""}</td>`, "")).remove();
      });

      if (verifyTable.find("thead th").eq(2).text().includes("最后审核时间")) {
        verifyTable.find("thead th:nth-child(6), tbody td:nth-child(6)").remove();
        verifyTable.find("thead th").eq(2).text("最后审核");
      }

      $(".table i.fa-lightbulb-o").parent().each((i, c) => {
        let rawContent = $(c).text(), newContent = "";
        for (let i = 0; i < rawContent.length; i++) newContent += (rawContent[i].charCodeAt() <= 0xff) ? rawContent[i] : " ";
        const urlList = newContent.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
        urlList.forEach(item => { c.innerHTML = rawContent.replace(item, '<a href="' + item + '" target="_blank">' + item + '</a>'); });
      });

      // 筛选索引
      const counter = new Array(McmodderValues.searchOption.length).fill(null).map(() => [0, 0, 0, 0, 0]);
      $(".verify-list-list-table tbody tr").each((_, tr) => {
        let d = $("td:nth-child(2)", tr).text();
        McmodderValues.searchOption.forEach((item, index) => {
          if (item.reg.test(d) && ((!item.exclude) || !d.includes(item.exclude)) && ((!item.exclude2) || !d.includes(item.exclude2))) {
            $(tr).attr("edit-type", index.toString());
            counter[index][0]++;
            let t = $("td:nth-child(4) p:first-child() i", tr).attr("class");
            stateIcon.forEach((e, i) => {
              if (t.includes(e)) counter[index][i]++;
            });
          }
        });
      });
      $("[edit-type=3],[edit-type=9]").each((_, e) => { // 查看详细
        e = $(e);
        let d = e.find("td:nth-child(4)"), t = "item";
        if (!d.find("i").get(0).classList.contains("fa-spinner")) return;
        switch (Number(e.attr("edit-type"))) {
          case 3: t = "class"; break;
          case 9: t = "item";
        }
        let l = e.find("td:nth-child(2) a").filter((i, c) => c.href.includes("/" + t + "/"));
        if (l.length && !e.find(".verify-withdraw-btn").length) e.find("td").last().prev().append(`<a class="btn btn-outline-dark btn-sm mcmodder-content-block" href="/${t}/edit/${McmodderUtils.abstractIDFromURL(l.attr("href"), t)}/" target="_blank">查看改动</a>`);
      });

      // 快捷切换时间段
      const t0 = parseInt((new Date()).getTime() / 1e3);
      const param = window.location.href.split("verify.html?")[1]?.split("&page=")[0];
      const daytime = 24 * 60 * 60;
      $(".verify-list-search-area").append(`<a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 30 * daytime}&endtime=${t0}" style="margin-left: 8px;">近30天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 7 * daytime}&endtime=${t0}" style="margin-left: 8px;">近7天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 3 * daytime}&endtime=${t0}" style="margin-left: 8px;">近3天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 1 * daytime}&endtime=${t0}" style="margin-left: 8px;">近24小时</a>`);

      // 筛选待审项
      let searchFrame = $('<div class="verify-list-search-area">');
      McmodderValues.searchOption.forEach((item, index) => {
        if (!counter[index][0]) return;
        let c = $('<div class="checkbox" style="display: inline-block;">');
        let h = `<input type="checkbox" id="mcmodder-type-${index}"><label for="mcmodder-type-${index}">${item.label} <span>(`;
        if (counter[index][1]) h += `<span class="text-muted">${counter[index][1]}</span>`;
        if (counter[index][2]) h += `<span class="text-success">${counter[index][2]}</span>`;
        if (counter[index][3]) h += `<span class="text-danger">${counter[index][3]}</span>`;
        if (counter[index][4]) h += `<span style="color: lightgray;">${counter[index][4]}</span>`;
        h += `)</span></label>`;
        c.html(h);
        c.find("span:not(span:last-child())").each(function () { this.outerHTML += "/"; });
        c.find("input").bind("change", function () {
          let opt = [], v = $("#mcmodder-verify-search").val().trim().toLowerCase();
          $("div.checkbox input", $(this).parent().parent().parent()).filter((i, c) => c.checked).each((i, c) => opt.push(this.id.split("-")[2]));
          $(".verify-list-list-table tbody tr").each(function () {
            if ((!opt.length || opt.includes($(this).attr("edit-type"))) && $("td:nth-child(2)", this).text().toLowerCase().includes(v || "")) $(this).removeAttr("style");
            else this.style.display = "none";
          });
        });
        c.appendTo(searchFrame);
      });
      searchFrame.appendTo(".verify-list-list-head fieldset");

      searchFrame = $('<div class="verify-list-search-area">');
      $('<input id="mcmodder-verify-search" class="form-control" placeholder="搜索...">').bind("change", function () {
        let opt = [], v = $("#mcmodder-verify-search").val().trim().toLowerCase();
        $("div.checkbox input", $(this).parent().parent().parent()).each(function () { if (this.checked) opt.push(this.id.split("-")[2]) });
        $(".verify-list-list-table tbody tr").each(function () {
          if ((!opt.length || opt.includes($(this).attr("edit-type"))) && $("td:nth-child(2)", this).text().toLowerCase().includes(v || "")) $(this).removeAttr("style");
          else this.style.display = "none";
        });
      }).appendTo(searchFrame);
      searchFrame.appendTo(".verify-list-list-head fieldset");

    }

    // 一键催审
    if (this.utils.getConfig("fastUrge")) {
      // $("div.bd-callout-warning").first().html('审核周期通常在 24 小时以内，有管理员的模组区域审核周期通常在 7 日以内，如逾期未审，<span class="mcmodder-common-dark">可点“一键催审”按钮给重生上强度！！</span> (´・ω・`)');
      $('<button id="mcmodder-fast-urge" class="btn btn-dark btn-sm" data-toggle="tooltip" data-html="true" data-original-title="一键对当前列表中可催审的审核项催审！审核项提交 24 小时后可催审，首次催审后每隔 1 小时可再次催审。<br>催审并不会对管理员发送强提醒，但能够使审核项在后台的待审列表中排在更靠前的位置。">一键催审</button>').insertBefore(".verify-list-list").click(function () {
        let b = $("#mcmodder-fast-urge");
        b.html("一键催审 (处理中...)");
        let urgeList = $(".verify-urge-btn").filter((_, e) => e.textContent != "代催").toArray();
        let verifyList = urgeList.map(e => $(e).attr("data-id"));
        let t = 0, index = 0;
        let doUrge = id => {
          this.utils.createRequest({
            url: "https://www.mcmod.cn/action/edit/doUrge/",
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
            data: $.param({ nVerifyID: id }),
            onload: resp => {
              const state = JSON.parse(resp.responseText).state;
              if (state === 0) {
                t++;
                $(urgeList[index]).html("催审成功").attr("class", "ml-1 text-muted");
              };
              if (verifyList.length > index + 1) {
                setTimeout(() => doUrge(verifyList[++index]), 3e2);
                return;
              }
              else b.html(`一键催审 (${t}项已处理)`);
            }
          });
        }
        if (verifyList[0]) doUrge(verifyList[0]);
        else b.html("一键催审 (无可催审项)");
      });
    }

    // 更新 swiper
    window.dispatchEvent(new Event("resize"));

    // 更新工具提示
    this.updateItemTooltip();
  }

  preSubmitInit() {
    const preSubmitList = this.utils.getProfile("preSubmitList") || [];
    // if (!preSubmitList.length) return;
    const preSubmitFrame = $('<div class="presubmit-list"><span class="mcmodder-subtitle">等待提交的预编辑</span></div>').appendTo(".verify-list-frame");

    const preSubmitTable = new McmodderTable(this, {}, {
      createTime: new HeadOption("保存时间", McmodderTable.DISPLAYRULE_TIME_MILLISEC),
      lastSubmitTime: new HeadOption("待审项提交时间", McmodderTable.DISPLAYRULE_TIME_MILLISEC),
      title: new HeadOption("页面概述", (title, data) => {
        let res = `<a target="_blank" href="${ data.url }">${ title }</a>`;
        if (data.errState) res += `<br><span class="mcmodder-slim-danger">（试图提交时出现异常：${McmodderValues.errorMessage[data.errState]}）</span>`;
        return res;
      }),
      option: new HeadOption("操作", (_, __) => `
        <button class="btn btn-sm mcmodder-presubmit-edit">修改</button>
        <button class="btn btn-sm mcmodder-presubmit-delete">删除</button>
      `)
    });
    preSubmitTable.$instance.appendTo(preSubmitFrame);
    preSubmitTable.currentData = preSubmitList;
    preSubmitTable.refreshAll();

    preSubmitTable.$tbody.on("click", ".mcmodder-presubmit-delete", e => {
      Swal.fire({
        title: "删除确认",
        text: "确定要删除此预编辑项吗？该操作不可逆！",
        type: "question",
        confirmButtonText: "确认",
        cancelButtonText: "取消"
      }).then(isConfirm => {
        if (isConfirm.value) {
          const index = preSubmitTable.getNodeIndex(e.currentTarget);
          preSubmitTable.currentData.splice(index, 1);
          this.utils.setProfile("preSubmitList", preSubmitTable.currentData);
          preSubmitTable.refreshAll();
          McmodderUtils.commonMsg("预编辑项删除成功！");
        }
      });
    }).on("click", ".mcmodder-presubmit-edit", e => {
      const index = preSubmitTable.getNodeIndex(e.currentTarget);
      let html = `在此处以 JSON 格式修改... <strong>**请务必保证提交格式与百科要求相匹配**</strong><br>`;
      const errState = preSubmitTable.currentData[index].errState;
      if (errState) html += `上一次试图提交此预编辑项时遇到错误：“${ McmodderValues.errorMessage[errState] }”，在此处修改后可尝试重新提交。<br>`
      html += `<textarea class="form-control mcmodder-presubmit-editor mcmodder-monospace" />`;
      Swal.fire({
        title: "修改预编辑项",
        html: html,
        customClass: "swal2-popup-wider",
        showCancelButton: true,
        confirmButtonText: "保存并退出",
        cancelButtonText: "放弃修改并退出",
        allowEscapeKey: false,
        allowOutsideClick: false,
        preConfirm: () => {
          try {
            const newData = JSON.parse(input.val());
            preSubmitTable.currentData[index].rawData = newData;
            delete preSubmitTable.currentData[index].errState;
            this.utils.setProfile("preSubmitList", preSubmitTable.currentData);
            preSubmitTable.refreshAll();
            McmodderUtils.commonMsg("预编辑项编辑完成！");
            return true;
          }
          catch (e) {
            McmodderUtils.commonMsg(e.toString(), false, (e instanceof SyntaxError) ? "解析错误" : "未知错误");
            return false;
          }
        }
      });
      var input = $(".mcmodder-presubmit-editor").val(JSON.stringify(preSubmitTable.currentData[index].rawData, null, 2));
    });
    const t = $(`<span class="text-muted btn-sm">距离下次检测: </span>`);
    (new McmodderTimer(this, McmodderTimer.DATAGETTER_SCHEDULE("autoHandlePreSubmit", this.currentUID, this.scheduleRequestList))).$instance.appendTo(t);
    $('<button id="presubmit-check" class="btn btn-sm" style="margin-left: .5em;">立即检测所有预编辑项</button>').insertBefore(preSubmitFrame.find("table")).click(e => {
      this.scheduleRequestList.run("autoHandlePreSubmit");
    }).after(t);
  }

  queueInit() {
    $(".table td:first-child()").css("background", "var(--mcmodder-bg)");

    let t = $(".verify-queue-list-table tr").filter((_, content) => $("a[rel=nofollow]", content).text() === this.currentUsername).first();
    McmodderUtils.highlight(t, "gold", 2e3, true);
  }

  static ID_SPLASH_COMPARE = "mcmodder-splash-compare";
  static URL_PUBLIC_SPLASH_LIST = "https://github.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static URL_PUBLIC_SPLASH_LIST_RAW = "https://raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW = "https://hub.gitmirror.com/raw.githubusercontent.com/Charcoal-Black/Mcmodder/master/splashes.json";
  static URL_JSON_POST = "https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=1281";

  async accessPublicSplashList(manager) {
    const data = manager.table.currentData.map(data => data.content);
    const resp = await this.utils.createAsyncRequest({
      url: Mcmodder.URL_PUBLIC_SPLASH_LIST_RAW,
      method: "GET",
      timeout: 5e3
    });
    if (resp?.status === 200) return this.performSplashCompare(resp.responseText, data);
    const resp2 = await this.utils.createAsyncRequest({
      url: Mcmodder.URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW,
      method: "GET",
      timeout: 5e3
    });
    if (resp2?.status === 200) return this.performSplashCompare(resp2.responseText, data);
    McmodderUtils.commonMsg("公共标语库加载失败，请检查网络连接~", false);
  }

  performSplashCompare(publicList, localList) {
    publicList = JSON.parse(publicList);
    let unique = [], flag;
    localList.forEach(e => {
      if (!e) return;
      e = e.toString().replace(this.currentUsername, "%s");
      flag = true;
      publicList.forEach(f => {
        if (e === f) flag = false;
      });
      if (flag) unique.push(e);
    });
    const footer = `<a target="_blank" href="${ Mcmodder.URL_PUBLIC_SPLASH_LIST }">在 GitHub 查看公共标语库</a>`;
    if (unique.length) {
      Swal.fire({
        type: "info",
        title: "对比完毕",
        html: `
          本地有 ${unique.length.toLocaleString()} 条标语尚未被公共标语库收录！<br>
          检查确认无误后，您可以通过任意方式与作者取得联系来更新完善我们的公共标语库~<br>
          未收录的标语如下：
          <textarea id="mcmodder-unique-splashes" class="form-control mcmodder-monospace">`,
        footer: footer
      });
      $("#mcmodder-unique-splashes").val(JSON.stringify(unique, null, 2));
    }
    else Swal.fire({
      type: "success",
      title: "对比完毕",
      text: "本地所有标语均已被公共标语库收录~",
      footer: footer
    });
  }

  centerSettingInit(centerSettingObserver) {
    // 事件解绑
    $(document).off("change", ".center-setting-block .checkbox").off("change", ".center-setting-block .form-control").on(
      "change",
      ".center-block[data-menu-frame!=9] .center-setting-block .checkbox",
      function () {
        var a = $(this).children('input');
        setSetting(a.attr('data-todo'), a.is(':checked') ? 1 : 0);
      }
    ).on(
      'change',
      '.center-block[data-menu-frame!=9] .center-setting-block .form-control',
      function () {
        setSetting($(this).attr('data-todo'), $(this).val().trim());
      }
    );

    // 相关链接预览图尺寸调整
    $("#setting-link-style-preview").attr("data-content", '<img alt="link style" src="' + McmodderValues.assets.mcmod.iconStyleSample + '" width="220" ></a>');
    // 插件设置
    let menuArea = $("div.center-main.setting.menuarea").get(0);
    $("<li>").html('<a data-menu-select="9" href="javascript:void(0);">插件设置</a>').appendTo("#center-setting-frame > div.center-sub-menu > ul").bind("change", e => {
      const target = $(e.currentTarget);
      const a = target.attr("data-menu-select");
      if (a) {
        const e = target.parent().parent().parent();
        const t = e.parent().children(".center-main");
        e.children("ul").find("a").removeClass("active");
        target.addClass("active"), t.children(".center-block").hide();
        t.children(`.center-block[data-menu-frame='${a}']`).show();
      }
    });

    const mcmodderSettingMenu = $('<div class="center-block hidden" data-menu-frame="9" style="display: none;">').appendTo(menuArea);
    mcmodderSettingMenu.html(
      `<div class="center-block-head">
        <span class="title">Mcmodder设置</span>
        <span class="text">版本 v${McmodderValues.mcmodderVersion} ~ ☆</span>
      </div>`);

    let content = $('<div class="center-content"></div>'), dataId = 0, entry, tips, permission = this.utils.getProfile("permission");
    let interfaces = [];

    Object.keys(this.cfgutils.data).forEach(key => {
      const data = this.cfgutils.data[key];
      if (data.permission && permission < data.permission) return;
      if (data.type === McmodderConfigUtils.CONFIG_KEYBIND &&
        McmodderUtils.isMobileClient()) return;
      const entry = new McmodderConfigInterface(key, this.cfgutils);
      entry.$instance.appendTo(content);
      interfaces.push(entry);
    });
    content.appendTo(mcmodderSettingMenu);

    // 手动检查更新
    const t = $('<button id="mcmodder-update-check-manual" class="btn" style="margin: 0 10px 0 10px;">立即检查更新</button>')
    .insertAfter("[for=settings-autoCheckUpdate]")
    .click(() => this.scheduleRequestList.run("autoCheckUpdate"))
    .parent();
    if (this.utils.getConfig("autoCheckUpdate")) {
      (new McmodderTimer(this, McmodderTimer.DATAGETTER_SCHEDULE("autoCheckUpdate", null, this.scheduleRequestList)))
      .$instance
      .appendTo(t);
    }

    // 闪烁标语记录界面
    // $('<textarea class="form-control mcmodder-monospace" id="mcmodder-splash-text">').appendTo($("#mcmodder-settings-9").parents(".center-setting-block")).val(GM_getValue("mcmodderSplashList"));

    if (!window.matchMedia) $("[data-todo=adaptableNightMode]").parents(".center-setting-block").hide();

    mcmodderSettingMenu.append(`
    <div class="center-block-head">
      <span class="title">资源管理</span>
      <span style="font-size: 12px; color: gray; margin-left: 1em;">轻触各项可展开详情~</span>
    </div>
    <div class="center-content mcmodder-storage">
      <ul></ul>
    </div>`);

    const storages = $(".mcmodder-storage ul");
    const resourceManagers = [];

    resourceManagers.push(new McmodderConfigResourceInterface(
      this,
      "mcmodderSplashList_v2",
      "已记录的闪烁标语", {
        time: new HeadOption("时间", data => data ? (new Date(data)).toLocaleString() : "未知"),
        content: new HeadOption("记录内容"),
        num: new HeadOption("次数", McmodderTable.DISPLAYRULE_NUMBER)
      },
      config => config?.split("\n").slice(0, -1) || [], // 最后一项是空，不考虑
      (_, data) => {
        const list = data.split(",");
        return {
          time: Number(list[0]),
          content: list[1],
          num: Number(list[2])
        }
      }
    ),
    new McmodderConfigResourceInterface(
      this,
      "modDependences_v2",
      "已记录的模组前置信息", {
        id: new HeadOption("模组编号", McmodderTable.DISPLAYRULE_LINK_CLASS),
        children: new HeadOption("记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY)
      }, null, (key, item) => new Object({
        id: key,
        children: item
      })
    ),
    new McmodderConfigResourceInterface(
      this,
      "modExpansions_v2",
      "已记录的模组拓展信息", {
        id: new HeadOption("模组编号", McmodderTable.DISPLAYRULE_LINK_CENTER),
        children: new HeadOption("记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY)
      }, null, (key, item) => new Object({
        id: key,
        children: item
      })
    ),
    new McmodderConfigResourceInterface(
      this,
      "rankdata",
      "已保存的贡献榜数据", {
        date: {name: "日期", displayRule: data => McmodderTable.DISPLAYRULE_DATE_SEC_ZH},
        byteTop1: {name: "字数榜首", displayRule: rawData => {
          const data = rawData.split(","); // [userID, bytes, ratio]
          return `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(data[0]) }">${ data[0] }</a>
            (${ data[1].toLocaleString() } 字节, ${ (data[2] * 100).toFixed(1) }%)`;
        }},
        totalEdited: {name: "前 60 名总编辑字数", displayRule: data => `${data.toLocaleString()} 字节`},
        size: {name: "数据大小", displayRule: McmodderTable.DISPLAYRULE_SIZE}
      }, null, (key, item) => {
        let list = JSON.parse(item), sum = 0;
        list.forEach(user => sum += Number(user.value));
        return {
          date: Number(key),
          byteTop1: [list[0].user, list[0].value, lise[0].value / sum].join(","),
          totalEdited: sum,
          size: item.length
        };
      }
    ),
    new McmodderConfigResourceInterface(
      this,
      "mcmodderJsonStorage",
      "已保存的 JSON 文件", {
        fileName: {name: "文件名"},
        size: {name: "数据大小", displayRule: McmodderTable.DISPLAYRULE_SIZE}
      }, null, (key, item) => new Object({
        fileName: key,
        size: McmodderUtils.getContextLength(JSON.stringify(item))
      })
    ));

    resourceManagers.forEach(manager => {
      const li = $("<li>").appendTo(storages);
      manager.$instance.appendTo(li);
    });

    const splashesManager = resourceManagers[0];
    splashesManager.$instance.find("a").click(e => {
      if (splashesManager.$instance.find(`#${ Mcmodder.ID_SPLASH_COMPARE }`).length) return;
      $(`<btn class="btn" id="${ Mcmodder.ID_SPLASH_COMPARE }">与公共标语库对比</btn>`)
      .appendTo(splashesManager.$instance)
      .click(() => this.accessPublicSplashList(splashesManager));
    });

    $(`<div class="center-setting-block" style="margin-top: 2em;">
      <div class="setting-item">
        <button class="btn">清除当前所有计划任务</btn>
      </div>
      <p class="text-muted">这在某些时候很有用——也许吧？</p>
    </div>`).appendTo(mcmodderSettingMenu)
    .find("button")
    .click(() => {
      const list = this.scheduleRequestList.get();
      if (list.length) {
        this.scheduleRequestList.empty();
        McmodderUtils.commonMsg(`${ list.length.toLocaleString() } 项计划任务已被清除~`);
      } else McmodderUtils.commonMsg("当前没有计划任务~");
    });
  }

  centerRankInit() {
    // 各等级数据查询
    let currentLevel = parseInt($("i.common-user-lv").text().replace("Lv.", "")), lvTitle = $(".lv-title").get(0), progressExp = parseInt($(".lv-title > span:nth-child(2)").text().replace("升级进度: ", "").replace(",", ""));
    lvTitle.innerHTML += '<span>升至<i class="common-user-lv large lv-' + Math.min(currentLevel + 1, 30) + '">Lv.<input id="mcmodder-lv-input" maxlength="2"></i> 还需经验: <span id="mcmodder-expreq" style="margin-right: 0px">-</span> Exp</span>';
    $("input#mcmodder-lv-input", lvTitle).val(Math.min(currentLevel + 1, 30));
    $("input#mcmodder-lv-input", lvTitle).bind("change", function () {
      let lv1 = parseInt($("i.common-user-lv").text().replace("Lv.", "")), lv2 = Math.min(parseInt(this.value), 30);
      if (lv2 < 0 || lv2 > 30 || isNaN(lv2) || lv1 >= lv2) {
        $("span#mcmodder-expreq").text("-");
        return;
      }
      let total = -parseInt($(".lv-title > span:nth-child(2)").text().replace("升级进度: ", "").replace(",", ""));
      for (let i = lv1; i <= lv2 - 1; i++) total += McmodderValues.expReq[i];
      $("span#mcmodder-expreq").text(total.toLocaleString());
      this.parentNode.className = "common-user-lv large lv-" + lv2;
    });
    $("input#mcmodder-lv-input", lvTitle).trigger("change");

    // 计算总经验
    let totalExp = progressExp;
    if (progressExp < 1e5) for (let i = 1; i < currentLevel; i++) totalExp += McmodderValues.expReq[i];

    let editnum = {
      change: function () {
        let t = totalExp;
        for (let i = parseInt((editNum + 1) / 1e3) * 1e3; i <= Math.min(1.9e4, parseInt($(this).val() / 1e3 - 1) * 1e3); i += 1e3) { t += (i + 1e3) / 2 };
        for (let i = parseInt((editByte + 1) / 5e4) * 5e4; i <= Math.min(9.5e5, parseInt($("#mcmodder-editbyte").val() / 5e4 - 1) * 5e4); i += 5e4) { t += (i + 5e4) / 100 };
        refreshExpBar(t, totalExp);
      }, keydown: function (e) {
        let v = parseInt($(this).val());
        if (v < 1e3) return;
        switch (parseInt(e.keyCode)) {
          case 40: if (v < 1e3) return; $(this).val(v - 1e3).trigger("change"); return;
          case 38: $(this).val(v + 1e3); $(this).trigger("change");
        }
      }
    }, editbyte = {
      change: function () {
        let t = totalExp;
        for (let i = parseInt((editByte + 1) / 5e4) * 5e4; i <= Math.min(9.5e5, parseInt($(this).val() / 5e4 - 1) * 5e4); i += 5e4) { t += (i + 5e4) / 100 };
        for (let i = parseInt((editNum + 1) / 1e3) * 1e3; i <= Math.min(1.9e4, parseInt($("#mcmodder-editnum").val() / 1e3 - 1) * 1e3); i += 1e3) { t += (i + 1e3) / 2 };
        refreshExpBar(t, totalExp);
      }, keydown: function (e) {
        let v = parseInt($(this).val());
        switch (parseInt(e.keyCode)) {
          case 40: if (v < 5e4) return; $(this).val(v - 5e4).change(); return;
          case 38: $(this).val(v + 5e4); $(this).change();
        }
      }
    }

    $(lvTitle).append(`<span>总经验: <span id="mcmodder-totalexp" style="margin-right: 0px">${totalExp.toLocaleString()} Exp</span></span><span>次数计算器: <input id="mcmodder-editnum"></span><span>字数计算器: <input id="mcmodder-editbyte"></span>`);
    $("#mcmodder-editnum").val(this.editNum).bind({ change: () => editnum.change(), keydown: () => editnum.keydown() });
    $("#mcmodder-editbyte").val(this.editByte).bind({ change: () => editbyte.change(), keydown: () => editbyte.keydown() });

    // 若未加载主页，则禁用输入框
    if (editNum === undefined) $("#mcmodder-editnum, #mcmodder-editbyte").attr({ "disabled": "disabled", "placeholder": "需要从主页获取数据.." });
  }

  centerCardInit() {
    $(".center-content.background")
    .contents()
    .filter((_, content) => content.nodeType === Node.COMMENT_NODE)
    .each(function () {
      $(this).parent().append(this.textContent)
    });
  }

  centerTaskInit() {
    if (this.currentUID === this.pageUID) {
      // 添加自定义成就
      let c;
      advancementList.forEach(e => {
        if (e.isCustom) c = $(`
          <div class="center-task-block ">
            <div class="center-task-border">
              <span class="icon"><img src="${e.img}" alt="task"></span>
              <div class="task-item">
                <span class="title">${PublicLangData.center.task.list[e.langdata].title}</span>
                <span class="difficulty">${'<i class="fa fa-star"></i>'.repeat(e.level || 5)}</span>
                <span class="text">
                  <p>${PublicLangData.center.task.list[e.langdata].content}</p>
                </span>
              </div>
              <span class="task-exp">
                <i class="fa fa-gift" style="margin-right:4px;"></i>
                奖励: ${e.reward ? PublicLangData.center.item.list[McmodderValues.userItemList[e.reward[0].id].langdata].title : "-"}
              </span>
              <span class="task-rate">
                <i class="fas fa-hourglass-half" style="margin-right:4px;font-size:10px;"></i>
                进度: ${this.advutils.getSingleProgress(e.id)} / ${e.range || PublicLangData.center.task.list[e.langdata].range}
              </span>
            </div>
          </div>`).appendTo(`.task > [data-menu-frame=${e.category}] > .center-content`);

        // 都怪喵呜机 手动触发检测
        if (e.id === McmodderValues.AdvancementID.ALL_YOUR_FAULT) {
          c.attr({
            "data-toggle": "tooltip",
            "data-html": "true",
            "data-original-title": "该成就必须手动触发检测！轻触以开始检测该成就的完成进度，检测期间请勿关闭当前页面。<br>检测完成后当前页面会自动刷新，您将能够获知完成进度。<br>审核项提交时间以最后修改时间而非创建时间为准，无论结果是否通过均计入进度。"
          }).click(async () => {
            swal.fire({
              title: "检测中",
              html: '请勿关闭此页面<br><div class="progress"><div id="mcmodder-progress" class="progress-bar" style="width: 0%;"></div></div>',
              allowOutsideClick: false,
              allowEscapeKey: false,
              showConfirmButton: false
            });
            let regTime = McmodderUtils.getStartTime(this.utils.getProfile("regTime"), 0), now = McmodderUtils.getStartTime(new Date(), 0), startTime = regTime, endTime, resp, total = 0, verifyList = [], maxPage, title, lastEdit, lastVerify;
            do {
              endTime = Math.min(now, McmodderUtils.getStartTime(startTime, 29));
              resp = await this.utils.createAsyncRequest({
                url: `https://www.mcmod.cn/verify.html?starttime=${startTime / 1e3}&endtime=${endTime / 1e3}&order=createtime&selfonly=1`,
                method: "GET"
              });
              resp = $(resp.responseXML);
              maxPage = Number(resp.find(".pagination").first().find(".page-item").last().find("a").attr("data-page"));
              resp.find(".verify-list-list-frame tbody tr").each((i, c) => verifyList.push(c));
              if (maxPage) for (let i = 2; i <= maxPage; i++) {
                resp = await this.utils.createAsyncRequest({
                  url: `https://www.mcmod.cn/verify.html?starttime=${startTime / 1e3}&endtime=${endTime / 1e3}&order=createtime&selfonly=1&page=${i}`,
                  method: "GET"
                });
                resp = $(resp.responseXML);
                resp.find(".verify-list-list-frame tbody tr").each((i, c) => verifyList.push(c));
              }
              startTime = McmodderUtils.getStartTime(endTime);
              $("#mcmodder-progress").css("width", 100 * (startTime - regTime) / (now - regTime) + "%");
            } while (endTime < now);
            verifyList.forEach(e => {
              title = $(e).find("td:nth-child(3) span").attr("data-original-title");
              if (!title) return;
              lastEdit = (title.indexOf("最后修改") < 0) ? (new Date(title.split("创建时间: ")[1]?.split("(")[0])).valueOf() : (new Date(title.split("最后修改: ")[1]?.split("(")[0])).valueOf();
              lastVerify = new Date(title.split("最后审核: ")[1]?.split("(")[0]).valueOf();
              if (lastEdit + 48 * 60 * 60 * 1000 < lastVerify) total++;
            });
            this.advutils.setProgress(McmodderValues.AdvancementID.ALL_YOUR_FAULT, total);
            location.reload();
          });
          McmodderUtils.updateAllTooltip();
        }
      });
    }

    // 解析已取得成就
    let expTotal, expEarned;
    for (let i = 1; i <= 2; i++) {
      expTotal = expEarned = 0;
      $(`.task [data-menu-frame=${i}] .center-task-block`).each((_, e) => {
        let t = $(e).find(".title").text(), exp = 0, c = $(e).find(".finished").length;
        let f = advancementList.find(a => PublicLangData.center.task.list[a.langdata].title === t);
        if (!f?.progress) exp += f?.exp || 0, expTotal += exp, expEarned += c * exp;
        else for (let j = 1; j <= f.max; j++) exp = advancementList.find(a => a.id === f.id && a.progress === j)?.exp || 0, expEarned += (j < f.progress + c) * exp, expTotal += exp;
      });
      $(`.task [data-menu-frame=${i}] .center-block-head`).append(`<span class="${expEarned < expTotal * 0.6 ? "text-muted" : "mcmodder-chroma"}" style="margin-left: 1em;">${expEarned.toLocaleString()} Exp / ${expTotal.toLocaleString()} Exp 已取得 (${(expEarned / expTotal * 100).toFixed(1)}% 完成)</span>`);
    }
  }

  centerHomeInit() {
    // 个人数据拓展
    let centerTotal = $(".center-total > ul").get(0);
    let averageByte = $(centerTotal).contents().filter((index, content) => content.nodeType === Node.COMMENT_NODE).get(0);
    let dataLi = centerTotal.appendChild(document.createElement("li"));
    let subClass = this.utils.getConfig("mcmodderUI") ? "title" : "text";
    if (this.utils.getConfig("centerMainExpand")) {
      dataLi.outerHTML = averageByte.textContent.replace(" 次", " 字节");
      centerTotal.insertBefore($(".center-total li:last-child()").get(0), $(".center-total li:nth-child(4)").get(0));
      averageByte.remove();
      $(`<li><span class="title">科龄</span><span class="text">${parseInt((Date.now() - Date.parse($(".center-total li:nth-child(7) span.text").text())) / (24 * 60 * 60 * 1000)).toLocaleString()} 天</span></li>`).insertAfter($("li:last-child()", centerTotal));
    }
    if (this.utils.getConfig("mcmodderUI")) $(".center-total li").each((i, c) => {
      c = $(c);
      let t = c.find(".title");
      c.find(".text").attr("class", "title");
      t.attr("class", "text");
    });
    this.editNum = parseInt($(".center-total li:nth-child(2) ." + subClass).text().replace(" 次", "").replaceAll(",", ""));
    this.editByte = parseInt($(".center-total li:nth-child(3) ." + subClass).text().replace(" 字节", "").replaceAll(",", ""));
    this.editAvg = parseInt($(".center-total li:nth-child(4) ." + subClass).text().replace(" 字节", "").replaceAll(",", ""));
    $("#mcmodder-editnum").val(this.editNum);
    $("#mcmodder-editbyte").val(this.editByte);
    $("#mcmodder-editnum, #mcmodder-editbyte").removeAttr("disabled").removeAttr("placeholder");

    const adminList = $(".admin-list");
    const adminBlock = adminList.parent();
    const adminContainer = $(`<div class="mcmodder-admin-container" />`).appendTo(adminBlock);
    adminList.appendTo(adminContainer);

    adminList.each((_, c) => {
      const title = c.childNodes.item(0).innerText;
      if (title.startsWith("开发者")) c.classList.add("mcmodder-admin-developer");
      else if (title.startsWith("编辑员")) c.classList.add("mcmodder-admin-editor");
      else if (title.startsWith("管理员")) c.classList.add("mcmodder-admin-admin");
    })

    // 模组区域压缩
    if (this.utils.getConfig("centerMainExpand")) $(".admin-list ul").each((_, e) => {
      if (e.clientHeight > 4e2) {
        $(e).attr("style", "max-height: 400px; overflow: hidden;");
        $('<a class="mcmodder-slim-dark" style="width: 100%; display: inline-block; text-align: center;">轻触展开</a>').appendTo(e.parentNode).click(f => {
          let target = f.currentTarget;
          let adminList = $("ul", target.parentNode).get(0);
          target.innerHTML = adminList.style.maxHeight === "400px" ? "轻触收起" : "轻触展开";
          adminList.style.maxHeight = (adminList.style.maxHeight === "unset" ? "400px" : "unset");
          if (adminList.style.maxHeight === "400px") target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
      }
    })

    if (this.currentUID === this.pageUID) {
      GM_cookie.list({ name: "_uuid" }, (cookie, err) => {
        if (err) {
          console.error(err);
          McmodderUtils.commonMsg("登录信息获取失败...", false);
          return;
        }
        const metadata = $("meta[name=keywords]").attr("content").replace(",我的世界,minecraft,我的世界mod", "").split(",");
        const profile = {
          uuid: cookie[0].value,
          expirationDate: cookie[0].expirationDate * 1e3,
          avatar: $(".user-icon-img img").attr("src"),
          nickname: metadata[0],
          username: metadata[1],
          regTime: Date.parse($(".center-total li:nth-child(7) ." + subClass).text()),
          lv: Number($(".user-name .user-lv").text().slice(3)),
          userGroup: $(".center-total li:nth-child(1) ." + subClass).text(),
          editByte: parseInt($(".center-total li:nth-child(3) ." + subClass).text().replaceAll(",", "")),
          editNum: parseInt($(".center-total li:nth-child(2) ." + subClass).text().replaceAll(",", "")),
          editAvg: parseInt($(".center-total li:nth-child(2) ." + subClass).text().replaceAll(",", ""))
        };
        this.utils.setProfile(profile);
        if (this.utils.getConfig("customAdvancements") && profile.editByte >= 1e3 && profile.editAvg >= 120) {
          this.advutils.addProgress(McmodderValues.AdvancementID.MASTER_EDITOR);
        }
      });
      // 记录我的模组区域
      $(".admin-list").each((i, c) => {
        c = $(c);
        let s = [], l = "", t = c.find(".title").text();
        if (t.includes("编辑员")) l = "editorModList";
        else if (t.includes("管理员")) l = "adminModList";
        else if (t.includes("开发者")) l = "devModList";
        c.find("li a").each((j, d) => s.push(d.href.split("/class/")[1].split(".html")[0]));
        s = s.join(",");
        if (this.utils.getProfile(l) != s) {
          this.utils.setProfile(l, s);
          McmodderUtils.commonMsg("成功更新个人模组区域~");
        }
      });

      // 计算权限等级
      let permission = -1;
      if (McmodderValues.adminIDList.includes(this.currentUID)) permission = 4;
      else if (this.utils.getProfile("adminModList")?.split(",")?.length) permission = 3;
      else if (this.utils.getProfile("devModList")?.split(",")?.length) permission = 2;
      else if (this.utils.getProfile("editorModList")?.split(",")?.length) permission = 1;
      else permission = 0;
      this.utils.setProfile("permission", permission);
    }

    // 字数统计表
    // 使用前需要在贡献榜页面保存数据
    if (this.utils.getConfig("byteChart")) {
      let rawData = this.utils.getAllConfig("rankData", []), optionData = [[0, "center"], [1, "mcmod"], [2, "cn"]], tempData = {};
      Object.keys(rawData).forEach(t => {
        let d = new Date(t * 1e3), f = `${1900 + d.getYear()}-${(1 + d.getMonth()).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`, r = JSON.parse(rawData[t]);
        r.forEach(i => {
          if (i.user == this.pageUID) {
            optionData.push([f, parseInt(i.value)]);
            tempData[f] = parseInt(i.value);
          }
        });
      });
      setTimeout(() => {
        this.centerEditChart = echarts.getInstanceById($("#center-editchart-obj").attr("_echarts_instance_"));
        if (!this.centerEditChart) return;
        if (this.utils.getConfig("nightMode")) this.centerEditChart.setOption({ tooltip: [{ backgroundColor: "#222" }], calendar: [{ dayLabel: { color: "#fff" }, yearLabel: { color: "#ee6" }, monthLabel: { color: "#fff" }, itemStyle: { color: "#3330", borderColor: "#444" } }] });
        if (this.utils.getConfig("enableAprilFools")) {
          let d = this.centerEditChart.getOption();
          d.series[0].data = d.series[0].data.map(t => {
            if (t[0] < 3) return t;
            return [t[0], t[1] + Math.round(Math.random() * 120)];
          });
          this.centerEditChart.setOption(d);
        }
      }, 2e3);
      $('<button class="mcmodder-byte-chart btn btn-light">转为字数统计</button>').appendTo($(".edit-chart-frame").first()).click(e => {
        const m = echarts.getInstanceById($("#center-editchart-obj").attr("_echarts_instance_"));
        const target = e.currentTarget;
        if (target.textContent === "转为字数统计") {
          $(".title-sub", this.parentNode).text("历史成功完成改动操作的字数");
          window.originalData = m.getOption();
          m.setOption(
            {
              calendar: [
                {
                  range: parseInt($("#center-editchart-select .filter-option-inner-inner").text())
                }
              ],
              series: [{ data: optionData }],
              visualMap: [
                {
                  inRange: {
                    color: ["#66CAC6", "#0078F0", "#3411B9", "#B711A9", "#680B2D", "#000000"]
                  },
                  range: [0, this.utils.getConfig("maxByteColorValue")],
                  max: this.utils.getConfig("maxByteColorValue")
                }
              ],
              tooltip: [
                {
                  formatter: e => {
                    var t = e.data[0], i = "", n = "";
                    return tempData[t] && (i = ` <b>${tempData[t].toLocaleString()}字节</b> (约${parseFloat((tempData[t] / 3).toFixed(1)).toLocaleString()}汉字)`), "<p>" + e.marker + t.substring(5) + i + "</p>";
                  }
                }
              ]
            }
          );
          target.innerHTML = "转为次数统计";
        } else {
          m.setOption(Object.assign(originalData, { calendar: [{ range: parseInt($("#center-editchart-select .filter-option-inner-inner").text()) }] }));
          $(target).parent().find(".title-sub").html("历史成功完成改动操作的次数");
          target.innerHTML = "转为字数统计";
        }
      });
    }
    // 夜间模式支持
    if (this.utils.getConfig("nightMode")) $(".post-block img").bind("load", function () {
      if (this.src === "https://www.mcmod.cn/pages/class/images/none.jpg") this.src = McmodderValues.assets.nightMode.imagesNone;
    });
    // 更新物品提示
    this.updateItemTooltip();
    // 留言板区域
    setTimeout(() => this.commentInit(), 1e3);
  }

  addUserBlacklist(uid) {
    let b = this.utils.getConfig("userBlacklist").replaceAll(" ", "").split(",");
    if (b.includes(uid)) {
      this.utils.setConfig("userBlacklist", b.filter(e => e != uid).join(","));
      McmodderUtils.commonMsg(`成功将 UID:${uid} 从用户黑名单中移除~`);
    } else {
      b.push(uid);
      this.utils.setConfig("userBlacklist", b.reduce((a, b) => a + "," + b));
      McmodderUtils.commonMsg(`成功将 UID:${uid} 加入用户黑名单~`);
    }
  }

  centerInit() {
    this.pageUID = Number(this.href.split("center.mcmod.cn/")[1].split("/")[0]);
    this.editNum = this.editByte = this.editAvg = this.totalExp = undefined;

    const centerSettingObserver = new MutationObserver((mutationList, centerSettingObserver) => {
      for (let mutation of mutationList) {
        if (mutation.addedNodes.length > 1) {
          this.centerSettingInit(centerSettingObserver);
          // centerSettingObserver.disconnect();
        }
      }
    });
    const centerRankObserver = new MutationObserver((mutationList, centerRankObserver) => {
      for (let mutation of mutationList) {
        if (mutation.addedNodes[0].className = "center-main lv" && $(".lv-title").length) {
          this.centerRankInit();
          centerRankObserver.disconnect();
        }
      }
    });
    const centerCardObserver = new MutationObserver((mutationList, centerCardObserver) => {
      for (let mutation of mutationList) {
        if (mutation.removedNodes[0]?.className === "loading") {
          this.centerCardInit();
          centerCardObserver.disconnect();
        }
      }
    });
    const centerTaskObserver = new MutationObserver((mutationList, centerTaskObserver) => {
      for (let mutation of mutationList) {
        if (mutation.removedNodes[0]?.className === "loading") {
          centerTaskObserver.disconnect();
          this.centerTaskInit();
        }
      }
    });
    const centerHomeObserver = new MutationObserver((mutationList, centerHomeObserver) => {
      for (let mutation of mutationList) {
        if (mutation.addedNodes[0]?.className === "center-total") {
          this.centerHomeInit();
          centerHomeObserver.disconnect();
        }
      }
    });

    centerHomeObserver.observe($("#center-page-home").get(0), { childList: true });
    if ($("#center-page-setting").length > 0) centerSettingObserver.observe($("#center-page-setting").get(0), { childList: true });
    if ($("#center-page-card").length) centerCardObserver.observe($("#center-page-card").get(0), { childList: true });
    if ($("#center-page-task").length && this.utils.getConfig("customAdvancements")) centerTaskObserver.observe($("#center-page-task").get(0), { childList: true });
    if (this.utils.getConfig("expCalculator")) centerRankObserver.observe($("#center-page-rank").get(0), { childList: true });

    // 愚人节彩蛋：签到旋转
    if (this.utils.getConfig("enableAprilFools")) /* McmodderUtils.addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ") */
      McmodderUtils.addStyle(`
      .center-task-block:first-child {
        animation: aprilfools 2.75s linear infinite;
        background: var(--mcmodder-bgn);
        z-index:999;
      }
      @keyframes aprilfools {
        0% {
          -webkit-transform:rotate(0deg);
        }
        25% {
          -webkit-transform:rotate(90deg);
        }
        50% {
          -webkit-transform:rotate(180deg);
        }
        75% {
          -webkit-transform:rotate(270deg);
        }
        100% {
          -webkit-transform:rotate(360deg);
        }
      }`);

    // 快捷获取背景图像
    const bgImg = window.getComputedStyle(document.body)["background-image"].replace('url("', "").replace('")', "");
    if (bgImg != this.utils.getConfig("defaultBackground") &&
        McmodderValues.supportedImageSuffix.includes(bgImg.split(".").pop().toLowerCase()))
      $("div.bbs-link").append(`<p align="right"><a href="${ bgImg }" target="_blank">查看个人中心背景图片</a></p>`);

    // 近期编辑记录
    $("div.bbs-link").append(`
      <p align="right">
        <a href="https://www.mcmod.cn/verify.html?order=createtime&userid=${ this.pageUID }" target="_blank">查看近期提交审核列表</a>
      </p>`);

    // 用户屏蔽
    $("div.bbs-link").append(`
      <p align="right">
        <a id="mcmodder-user-blacklist" class="mcmodder-slim-danger">屏蔽该用户</a
      </p>`);
    $("#mcmodder-user-blacklist").click(() => this.addUserBlacklist(this.pageUID));
  }

  commentInit() {
    if (this.utils.getConfig("commentExpandHeight")) {
      let commentHeight = this.utils.getConfig("commentExpandHeight") || "300";
      McmodderUtils.addStyle(`.comment-row-text {max-height: ${commentHeight}px;}`);
    }
    let unlockComment = () => {
      if (!$(".common-comment-block.lazy").length || $(".comment-close").length) // 无限制留言板
        if (this.utils.getConfig("unlockComment")) {
          const commentClassName = "common-comment-block lazy";
          let messageCenter = $(".center-block:last-child()").get(0) || $(".common-comment-block.lazy .comment-editor").get(0) || $(".author-row").get(0);
          let messageBoard = document.getElementsByClassName(commentClassName);
          if (messageCenter && (!messageBoard.length || $(".comment-close").length)) {
            const t1 = document.createElement("div");
            t1.className = commentClassName;
            t1.style = "";
            const t = messageCenter.appendChild(t1);
            addScript(t, "comment_channel = '1';comment_user_id = '1';comment_user_editnum = '19732';comment_user_wordnum = '1356802';$(document).ready(function(){$(\".comment-channel-list li a.c1\").click();});");
            $(t).append('<div><ul class="comment-floor"></ul></div>');
            addScript(t, "get_comment(comment_container,comment_type);var isUEReady=0;if($(\".comment-editor-area .editor-frame\").length>0&&0==isUEReady)var ueObj=$.ajax({url:\"//www.mcmod.cn/static/ueditor/\",async:!0,type:\"post\",data:{type:\"comment\"},xhrFields:{withCredentials:true},crossDomain:true,complete:function(e){$(\".comment-editor-area .editor-frame .load\").html(ueObj.responseText),isUEReady=1}});");
            if ($(".comment-close").length && $(".comment-dl-tips").length) {
              // messageCenter.insertBefore($(".common-comment-block.lazy", messageCenter).get(0), $(".comment-dl-tips", messageCenter).get(0));
              $(".comment-close").remove();
            }
          }
        }
    }
    if (window.location.href.includes("center.mcmod.cn") || window.location.href.includes("/author/")) unlockComment();
    if (window.location.href.includes("#comment-")) $(".common-comment-block.lazy").get(0)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const replyLink = target => {
      if (target.find("input.comment-id").val() === window.location.href.split("comment-")[1]) {
        setTimeout(() => {
          target.get(0).scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.addClass("mcmodder-mark-gold");
          setTimeout(() => target.removeClass("mcmodder-mark-gold"), 2e3);
        }, 8e2);
      }
      if (this.utils.getConfig("lieqi")) {
        const attritudeClass = ".fa-thumbs-up, .fa-grin-tears, .fa-heart, .fa-flushed, .fa-thumbs-down, .fa-lemon, .fa-horse-head, .fa-heart-broken, .fa-angry, .fa-tired, .fa-snowflake, .fa-handshake";
        const attritudeList = attritudeClass.split(", ");
        const attritudeFace = target.find(attritudeClass);
        attritudeFace.each((_, d) => {
          attritudeList.forEach(t => $(d).removeClass(t.slice(1)));
          $(d).parents("[title]").first().attr("title", "猎奇");
        }).addClass("fa-surprise");
      }
    }
    const commentObserver = new MutationObserver((mutationList, commentObserver) => {
      for (let mutation of mutationList) {
        if ((mutation.target.className === "comment-floor" || mutation.target.className === "comment-reply-floor") && mutation.addedNodes.length > 0) {
          if (Array.from(mutation.addedNodes).map(e => e.className).includes("google-auto-placed")) return;
          $(".comment-reply-row-time", mutation.target).each((_, e) => { $(e).append(` (${e.title})`) });
          if (mutation.target.className === "comment-floor") {
            $("ul.pagination.common-pages > span").each((_, e) => {
              e.innerHTML += '快速跳转至：第&nbsp;<input id="mcmodder-gotopage" class="form-control">&nbsp;页。';
              e.find("#mcmodder-gotopage").val(e.textContent.replace("当前 ", "").split(" / ")[0]).bind("change", f => {
                const v = parseInt(f.currentTarget.value);
                if (v < 1 || v > parseInt(f.currentTarget.textContent.replace("当前 ", "").split(" / ")[1])) return;
                comment_nowpage = v;
                get_comment(comment_container, comment_type);
              });
            });
            const alertHeight = this.utils.getConfig("missileAlertHeight");
            const expandHeight = this.utils.getConfig("commentExpandHeight");
            $("div.comment-row-content", mutation.target).each((_, c) => {
              const target = $(c);
              if (this.utils.getConfig("userBlacklist").replace(" ", "").split(",").includes(target.find("a.poped").attr("data-uid"))) { // 用户屏蔽
                target.parent().remove();
                return;
              }
              if (this.utils.getConfig("enableAprilFools") && target.find("a.poped").attr("data-uid") == this.currentUID && window.location.href.includes("/class/")) {
                let lv = userLv.title.replace(PublicLangData.comment.suffix.mod_admin + " (", "").replace(PublicLangData.comment.suffix.mod_manager + " (", "").replace(PublicLangData.comment.suffix.mod_developer + " (", "").replaceAll(")", "");
                target.find(".common-user-lv").attr({ "class": "common-user-lv manager", "title": PublicLangData.comment.suffix.mod_manager + " (" + lv + ")", "href": "https://t.bilibili.com/779290398405165095" }).text(PublicLangData.comment.suffix.mod_manager); // 愚人节特性-全员管理
              }
              replyLink(target);
              const commentContent = target.find("div.comment-row-text-content.common-text.font14").get(0);
              if (this.utils.getConfig("ignoreEmptyLine")) $(commentContent).children().filter((_, c) => c.innerHTML === "<br>").remove();
              const h = parseInt(commentContent.clientHeight);
              if (h > expandHeight && h < 3e2 && expandHeight < 3e2) { // 补充 展开更多内容 按钮
                $(`<a class="fold text-muted"><i class="fas fa-chevron-down"></i>${ PublicLangData.comment.fold.down }</a>`).appendTo(target);
                target.insertBefore(target.find("a.fold.text-muted").get(0), target.find("ul.comment-tools").get(0));
              }
              if (this.utils.getConfig("missileAlert") && h > alertHeight) target.find("a.fold.text-muted").append(' - <span class="mcmodder-slim-danger">核弹警告！</span>本楼展开后将会长达 <span class="mcmodder-common-danger">' + h.toLocaleString() + ' px</span>！'); // 核弹警告
            });
          } else if (mutation.target.className === "comment-reply-floor" && this.utils.getConfig("replyLink")) {
            $("div.comment-reply-row", mutation.target).each((_, e) => {
              e = $(e);
              if (this.utils.getConfig("userBlacklist").replace(" ", "").split(",").includes(e.find("a.poped").attr("data-uid"))) e.remove();
              replyLink(e);
              const replyContent = e.find("div.comment-reply-row-text-content.common-text.font14").first();
              const rawContent = replyContent.html().replaceAll("<br>", " ");
              let newContent = "";
              for (let i = 0; i < rawContent.length; i++) newContent += (rawContent[i].charCodeAt() <= 0xff) ? rawContent[i] : " ";
              let urlList = newContent.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
              urlList.forEach(item => {
                replyContent.html(replyContent.html().replace(item, '<a href="' + item + '" target="_blank">' + item + '</a>'));
              })
            });
          }
        }
        else if (mutation.target.className === "common-comment-block lazy" && mutation.addedNodes.length > 0) unlockComment();
      }
    });
    commentObserver.observe($(".common-comment-block.lazy").get(0), { childList: true, subtree: true });
  }

  async structureEditorInit() {
    $("title, .common-nav .item").html("结构编辑器");
    $(".search-frame, .eat-frame").remove();

    $(".info-frame").html('<div class="common-text" />');
    $('<link type="text/css" href="/static/public/css/item/item.frame.css?v=8" rel="stylesheet"><link type="text/css" href="/static/public/css/item/structure_browser.frame.css" rel="stylesheet">').appendTo("head");

    let loadScripts = async () => {
      await McmodderUtils.loadScript(document.head, null, "/static/public/plug/three/three.min.js");
      await McmodderUtils.loadScript(document.head, null, "/static/public/plug/three/three.orbit-controls.min.js");
      await McmodderUtils.loadScript(document.head, null, "/static/public/plug/three/three.tween.min.js");
      McmodderUtils.loadScript(document.head, 'import{EXGridHelper}from"/static/public/plug/three/three.ex-grid-helper.js";window.structure_enchanted_grid_helper=function(r,e,t,i,d){return new EXGridHelper(r,e,t,i,d)}', null, "module");
      McmodderUtils.loadScript(document.body, `comment_container = ${ this.utils.getConfig("structureSelected") || "36016" };`);
      await McmodderUtils.loadScript(document.body, null, "/static/public/js/item/mc.structure_browser.functions.js");
      await McmodderUtils.loadScript(document.body, null, "/static/public/js/item/mc.item.functions.js?v=12");

    }
    await loadScripts();

    $(`<div>选取预设结构：
      <select id="mcmodder-structure-selector">
        <option value="36016">[36016] 通用机械-聚变反应堆</option>
        <option value="36550">[36550] 沉浸工程-斗轮式挖掘机</option>
        <option value="161900">[161900] 自然灵气-灵气充能台</option>
        <option value="192950">[192950] 冰火传说-龙钢锻炉</option>
        <option value="202730">[202730] 魔法金属-高炉</option>
        <option value="775298">[775298] 格雷科技现代版-土高炉</option>
      </select>
    </div>`).appendTo(".info-frame");
    $("#mcmodder-structure-selector").val(comment_container).change(e => {
      this.utils.setConfig("structureSelected", e.currentTarget.value);
      location.reload();
    })

    $(`<div>操作状态：
      <div class="radio">
        <input id="previewMode" name="mode" type="radio" checked="1">
        <label for="previewMode">预览模式</label>
      </div>
      <div class="radio">
        <input id="editMode" name="mode" type="radio">
        <label for="editMode">编辑模式</label>
      </div>
    </div>`).appendTo(".info-frame");

    /* window.blockMap = [
      {
        id: 546234,
        name: "聚变堆框架",
        ename: "Fusion Reactor Frame",
        mod: "通用机械",
        modpath: "mekanism",
        blockpath: "reactor_frame"
      }
    ]; */
    structure_browser.blocktype_list = [];
    structure_browser.get_block_type = () => {
      structure_browser.blocktype_list = [];
      structure_browser.cube_list.forEach(e => {
        let i = {
          item: e.data.name.item,
          mod: e.data.name.mod,
          // material: e.material,
          face: e.material.map(t => t.map.image.src),
          id: e.data.id
        }
        for (let j of structure_browser.blocktype_list)
          if (JSON.stringify(i) === JSON.stringify(j)) return;
        structure_browser.blocktype_list.push(i);
      })
    }
    structure_browser.remove_block = uuid => {
      structure_browser.cube_list = structure_browser.cube_list.filter(e => e.uuid != uuid);
      structure_browser.group.children = structure_browser.group.children.filter(e => e.uuid != uuid);
      structure_browser.scene.remove(structure_browser.group);
      structure_browser.scene.add(structure_browser.group);
    }
    let defaultDocumentMouseUp = structure_browser.onDocumentMouseUp;
    structure_browser.onDocumentMouseUp = e => {
      if ($("#previewMode").prop("checked")) defaultDocumentMouseUp(e);
      else {
        if (e.button != 2 || $("item[name=blocktype]:checked()").length) return;
        const u = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
        if (u.length) {
          let n = u[0].face.normal, x = u[0].object.data.position[0] + n.x, z = u[0].object.data.position[1] + n.z, y = u[0].object.data.layer + n.y;
          let blockData = structure_browser.blocktype_list[parseInt($("input[name=blocktype]:checked()").attr("id").split("block-selector-")[1])];
          if (structure_browser.cube_list.filter(e => (x === e.data.position[0] && y === e.data.layer && z === e.data.position[1])).length) return;
          structure_browser.set_block(
            y - 1, [x, z],
            [blockData.face[0].split("/texture/")[1].split("/")[0], blockData.face[0].split("/texture/")[1].split("/")[1], blockData.face[0].includes("/fill.")],
            [blockData.id, blockData.item, blockData.mod]
          );
        }
      }
    }
    const defaultDocumentClick = structure_browser.onDocumentClick;
    structure_browser.onDocumentClick = e => {
      if ($("#previewMode").prop("checked")) defaultDocumentClick(e);
      else {
        const u = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
        if (u.length) structure_browser.remove_block(u[0].object.uuid);
      }
    }

    /* $('<table id="mcmodder-structure-data-menu"><thead><th>Y</th><th>X</th><th>Z</th><th>所属模组</th><th>方块名称</th><th>纹理资源路径</th><th>对应资料ID</th></thead><tbody></tbody></table>').appendTo(".info-frame"); */

    let blockList = $(`<div>方块列表：</div>`).appendTo(".info-frame");
    let blockListTable = new McmodderTable(this, {id: "block-selector"}, {
      op: new HeadOption("操作", _ => {
        let id = McmodderUtils.randStr(8);
        return `
          <div class="radio">
            <input id="block-selector-${ id }" name="blocktype" type="radio">
            <label for="block-selector-${ id }">选取</label>
          </div>`;
      }),
      blockName: new HeadOption("方块名称"),
      class: new HeadOption("所属模组"),
      textures: new HeadOption("右-左-上-下-前-后", data => {
        let res = "";
        data.forEach(face => res += `<img src="${ face }" width="24">`);
        return res;
      }),
      itemID: new HeadOption("对应资料ID", McmodderTable.DISPLAYRULE_LINK_ITEM)
    });
    blockListTable.$instance.appendTo(blockList);

    await McmodderUtils.sleep(3e3);

    $("#structure-close").hide();
    structure_browser.get_block_type();
    structure_browser.blocktype_list.forEach(blocktype => {
      blockListTable.appendData({
        op: null,
        blockName: blocktype.item,
        class: blocktype.mod,
        textures: blocktype.face,
        itemID: blocktype.id
      });
      // <div class="radio"><input id="previewMode" name="mode" type="radio" checked="1"><label for="previewMode">预览模式</label></div><div class="radio"><input id="editMode" name="mode" type="radio"><label for="editMode">编辑模式</label></div>
    });
    blockListTable.refreshAll();
    /* structure_browser.cube_list.forEach(cube => {
      $("<tr>" + [
        cube.data.layer,
        cube.data.position[0],
        cube.data.position[1],
        cube.data.name.mod,
        cube.data.name.item,
        cube.material[0].map.image.src,
        cube.data.id
      ].reduce((a, b) => a + '<td>' + b + '</td>', "") + "</tr>").appendTo("#mcmodder-structure-data-menu tbody");
    });*/
  }

  updateScreenAttachedFrame(node) {
    this.screenAttachedFrame = this.screenAttachedFrame.filter(e => e.node != node);
    this.screenAttachedFrame.push({
      node: node,
      parentPosY: McmodderUtils.getAbsolutePos(node.parentNode).y,
      parentHeight: node.parentNode.getBoundingClientRect().height
    });
    // this.screenAttachedFrame = $(".mcmodder-screenattached");
  }

  switchProfile(uid) {
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
    const profiles = this.utils.getAllConfig("userProfile");
    let profile;
    let uuid = $.cookie("_uuid");
    const h = $(`<li><div class="profile-option empty-profile" uid="0">-- 未登录状态 --</div></li>`).appendTo(ul);
    if (!uuid) h.addClass("profile-selected");
    Object.keys(profiles).forEach(uid => {
      uid = Number(uid);
      if (!uid) return;
      profile = JSON.parse(profiles[uid]);
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
            ${profile.userGroup} · ${Number(profile.editNum).toLocaleString()} 次编辑 ·
            ${Number(profile.editByte).toLocaleString()} 字节 ·
            ${(profile.expirationDate > Date.now()) ?
            `登录信息 <span class="mcmodder-timer-pre" /> 后过期` :
            '<span class="text-danger">登录信息已过期（须重新登录以刷新状态）</span>'}
            <a class="delete">
              <i class="fa fa-trash"></i>
            </a>
          </div>
        </div>
      </li>`).appendTo(ul);
      (new McmodderTimer(this, McmodderTimer.DATAGETTER_CONSTANT(profile.expirationDate))).$instance.appendTo(h.find(".mcmodder-timer-pre"));
      if (profile.uuid === uuid) h.addClass("profile-selected");
    });
    Swal.fire({
      title: "切换当前账号",
      html: `<div class="profile-option-container"></div>`,
      showConfirmButton: false
    });
    html.appendTo(".profile-option-container");
    $(".profile-option").click(f => {
      let uid = Number(f.currentTarget.getAttribute("uid"));
      if (f.target.className === "delete" || f.target.parentNode.className === "delete") {
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
    const splashes_old = GM_getValue("mcmodderSplashList").split("\n");
    let splashes = "", count = [], flag;
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
    count.forEach(e => splashes += ("0," + e[0] + "," + e[1] + "\n"));
    GM_setValue("mcmodderSplashList_v2", splashes);
    GM_setValue("mcmodderSplashList", "");
  }

  applyCustomFont() {
    $('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&amp;display=swap" rel="stylesheet">').appendTo("head");
    McmodderUtils.addStyle('* {font-family: "Noto Sans SC", "Microsoft YaHei", "微软雅黑", "宋体", sans-serif}');
  }

  trackSplash() {
    let splashText;
    if (this.href === "https://www.mcmod.cn/") splashText = $(".ooops .text").first().text();
    else if (this.href === "https://www.mcmod.cn/v4/") splashText = $(".splash span").first().text().replace(this.currentUsername || "百科酱", "%s");
    let splashes = GM_getValue("mcmodderSplashList_v2")?.split("\n") || [], flag = 0, index;
    splashes.forEach((e, i) => {
      let d = e.split(",");
      if (d[1] === splashText) {
        flag = parseInt(d[2]) + 1;
        d[2] = flag;
        index = i;
      }
    });
    if (!flag) splashes[splashes.length - 1] = `${Date.now()},${splashText},1`;
    else splashes[index] = splashes[index].slice(0, splashes[index].lastIndexOf(",") + 1) + flag;
    GM_setValue("mcmodderSplashList_v2", splashes.join("\n"));
    if (flag) McmodderUtils.commonMsg(`该标语累计已出现 ${flag.toLocaleString()} 次~ 内容为: ${splashText}`);
    else McmodderUtils.commonMsg(`成功记录新的闪烁标语~ 内容为: ${splashText}`);
  }

  tableFix() {
    $("table [align]").each((_, c) => $(c).css("text-align", $(c).attr("align"))).removeAttr("align");
    $("table [valign]").each((_, c) => $(c).css("vertical-align", $(c).attr("valign"))).removeAttr("valign");
    McmodderUtils.addStyle("th {text-align: center;}");
  }

  enableNightMode() {
    McmodderUtils.addStyle(this.css.night, "mcmodder-night-controller");
    if ($("#item-cover-preview-img").first().attr("src") === McmodderValues.assets.mcmod.imagesNone) $("#item-cover-preview-img").attr("src", McmodderValues.assets.nightMode.imagesNone);
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
      McmodderUtils.addStyle(this.css.night, "mcmodder-night-controller", e.document);
      e.$document.find("html").addClass("dark");
    });
  }

  disableNightMode() {
    $("#mcmodder-night-controller").remove();
    if ($("#item-cover-preview-img").first().attr("src") === McmodderValues.assets.nightMode.imagesNone) $("#item-cover-preview-img").attr("src", McmodderValues.assets.mcmod.imagesNone);
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
      e.$document.find("#mcmodder-night-controller").remove();
      e.$document.find("html").removeClass("dark");
    });
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
    this.customStyle();

    if (this.utils.getConfig("forceV4") && (this.href === "https://www.mcmod.cn/")) {
      window.location.href = "https://www.mcmod.cn/v4/";
    }

    if (this.utils.getConfig("useNotoSans")) {
      this.applyCustomFont();
    }

    // 关闭主页&整合包区广告
    $("span").filter((_, e) => $(e).attr("style") === "position: absolute;color: #555;border-radius: 5px;border: 1px solid #555;font-size: 12px;padding: 0 2px;left:5px;top:5px;bottom:auto;right:auto;background:RGBA(255,255,255,.45);").html('<a>× 广告</a>').find("a").click(function () { $(this).parent().parent().hide(); });

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
      $(".common-task-tip").attr({ "id": "task-mcmodder-frozen", "class": "mcmodder-task-tip" });
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

    McmodderUtils.addStyle(this.css.base);
    if (this.utils.getConfig("mcmodderUI")) McmodderUtils.addStyle(this.css.mcmodderUI);
    if (this.utils.getConfig("mcmodderUI") && this.utils.getConfig("tableThemeColor")) McmodderUtils.addStyle(`
      td,
      th,
      .table-bordered:not(.item-list-table) td,
      .table-bordered:not(.item-list-table) th,
      .table:not(.item-list-table) thead th,
      .common-text table {
        border-color: var(--mcmodder-tc1);
      }`);
    if (this.utils.getConfig("tableLeftAlign")) {
      McmodderUtils.addStyle(`
        .common-text table {
          margin: 0;
        }
        .common-text > div:not(.common),
        .common-text > table,
        .common-text .figure {
          align-items: start;
        }
        .mcmodder-byte-chart {
          position: absolute;
          top: 0px;
          left: 0px;
        }`);
      let f = e => {
        let c = $(e.target).next();
        if (c.attr("class") === "figcaption") c.css("width", e.target.getBoundingClientRect().width + "px");
      };
      $(".common-text .figure .lazy").each(e => f(e));
      $(document).on("load", ".common-text .figure .lazy", e => f(e));
    }
    else McmodderUtils.addStyle('.common-text .figure {align-items: center;}');
    $(".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a").addClass("mcmodder-content-block");
    $(".common-nav .line").html('<i class="fa fa-chevron-right" />');
    $(".oredict-ad, .worldgen-list-ad").remove();
    if (this.utils.getConfig("defaultBackground") != "none") $("body").filter((i, c) => $(c).css("background-image") === "none").css({ "background": `url(${this.utils.getConfig("defaultBackground") || "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg"}) fixed`, "background-size": "cover" });
    // nightStyle += ".col-lg-12.common-rowlist-2 .title {color: #ccc;}";

    // 个人菜单
    if (this.utils.getConfig("mcmodderUI")) {
      $(`<div class="mcmodder-profile">${$(".header-user-avatar").html()}<p>${$(".header-user-name").text()}</p></div>`).insertBefore(".header-user .header-layer-block:first-child()");
      $(".header-user .header-layer-block li a").each((i, c) => {
        $(c).replaceWith(`<a${$(c).text() === "退出登录" ? ' id="common-logout-btn"' : ' href=' + c.href + ' target="_blank"'}><i class="${McmodderValues.iconMap[$(c).text()]}" style="left: .5em;"/>${$(c).text()}<i class="fa fa-chevron-right" style="right: .5em;"/></a>`);
      });
    }

    // 去除正文异常背景
    if (this.utils.getConfig("mcmodderUI")) {
      let textArea = $(".text-area.common-text, .item-content.common-text, .post-row");
      textArea.find("*").filter((i, c) => $(c).css("background-color") === "rgb(255, 255, 255)").css("background-color", "unset");
      textArea.find("span").filter((i, c) => $(c).css("color") === "rgb(0, 0, 0)").css("color", "unset");
    }

    if (this.utils.getConfig("adaptableNightMode")) {
      const scheme = window.matchMedia("(prefers-color-scheme: dark)");
      this.isNightMode = scheme.matches;
      scheme.addEventListener("change", _ => {
        this.isNightMode = scheme.matches;
        this.switchNightMode();
      });
    }
    else this.isNightMode = this.utils.getConfig("nightMode");

    this.isNightMode ? this.enableNightMode() : this.disableNightMode();
    if (!this.utils.getConfig("adaptableNightMode")) {
      $('<button id="mcmodder-night-switch" data-toggle="tooltip" data-original-title="夜间模式"><i class="fa fa-lightbulb-o"></i></button>')
      .appendTo(".header-container .header-search, .top-right")
      .click(() => this.switchNightMode());
    }

    $(document).on("click", ".profile-frame", e => {
      let target = $(e.currentTarget);
    });
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

    if (this.currentUID && this.utils.getConfig("mcmodderUI")) {
      $('<button id="mcmodder-message-center" data-toggle="tooltip" data-original-title="消息中心"><i class="fa fa-bell-o"></i></button>')
        .appendTo(".header-container .header-search")
        .click(() => {
          GM_openInTab("https://www.mcmod.cn/message/", { active: true });
          $(".mcmodder-rednum").hide();
        });
    }
    if (!this.isNightMode) $("#mcmodder-night-switch i").css("text-shadow", "0px 0px 5px gold");

    const msgAlert = Number($(".header-user-msg b").text());
    if (this.utils.getConfig("mcmodderUI")) {
      $(".header-user-msg").remove();
      $(`<div class="mcmodder-rednum">${msgAlert}</div>`).hide().appendTo("#mcmodder-message-center");
      if (msgAlert) $(".mcmodder-rednum").text(msgAlert).show();
    }

    this.generalEditorObserver.observe(document.body, { childList: true, subtree: true });

    // TODO: 取消锁定导航栏

    if (this.isV4 && this.utils.getConfig("mcmodderUI")) {
      $(window).resize(e => { // 个人目录不会超出屏幕右边界
        let l = $(".header-user").get(0).getBoundingClientRect();
        if (l.x + l.width / 2 + 400 / 2 >= window.screen.width - McmodderValues.headerContainerHeight) $(".header-panel").addClass("mcmodder-header-panel-fixed");
        else $(".header-panel").removeClass("mcmodder-header-panel-fixed");
      }).resize();
    }

    if (this.isV4 && this.utils.getConfig("customAdvancements")) { // 更新自定义成就
      let completed = this.utils.getProfile("completed");
      if (completed) completed.split(",")?.forEach(id => {
        let data = this.advutils.list.filter(e => e.id == id)[0];
        McmodderUtils.showTaskTip(data.img,
          PublicLangData.center.task.list[data.langdata].title,
          PublicLangData.center.task.list[data.langdata].content,
          "", data.range, ""
        );
        playSound();
      });
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
            $(".mcmodder-rednum").hide();
            return;
          }
          $(".mcmodder-rednum").text(data.user.msg_count).show();
        }
      });
    }, Math.max(autoNotifyDelay * 1e3 * 60, 6e3));

    if (this.href === "https://www.mcmod.cn/") this.mainPageInit();
    if (this.href.includes("/item/tab/") && !this.href.includes(".html")) setTimeout(() => this.tabInit(), 1e3);
    if (this.href.includes("/class/edit/") || this.href.includes("/modpack/edit/") || this.href.includes("/sandbox/") || this.href.includes("/post/edit/") || this.href.includes("/post/add/") || this.href.includes("/author/edit/")) this.editorLoad();
    if (this.href.includes("/item/edit/") || this.href.includes("/item/add/")) this.itemEditorInit();
    if (this.href.includes("/class/edit/") || this.href.includes("/class/add/")) this.classEditorInit();
    if (this.href.includes("/item/") && this.href.includes(".html") && !this.href.includes("/diff/") && !this.href.includes("/list/")) this.itemInit();
    if (this.href.includes("/post/") && this.href.includes(".html")) this.postInit();
    if (this.href.includes("/item/list/")) this.itemListInit();
    if (this.href.includes("/oredict/")) this.oredictPageInit();
    if (this.href.includes("/message/")) this.messageInit();
    if (this.href.includes("/download/")) this.downloadInit();
    if (this.href.includes("/history.html") || this.href.includes("/history/")) this.historyInit();
    if (this.href.includes("/verify.html")) this.verifyHistoryInit();
    if (this.href.includes("/queue.html")) this.queueInit();
    if (this.href.includes("/class/add/")) this.classAddInit();
    if (this.href.includes("/version/add") || this.href.includes("/version/edit")) this.versionInit();
    else if (this.href.includes("/class/version/")) this.versionListInit();
    if (/class\/[0-9]*\.html/.test(this.href) || /modpack\/[0-9]*\.html/.test(this.href)) this.classInit();
    if (this.href.includes("/diff/") && !this.href.includes("/list/")) this.diffInit();
    if (this.href.includes("/diff/") && this.href.includes("/list/")) this.diffListInit();
    if (this.href.includes("/rank.html") && this.utils.getConfig("advancedRanklist")) this.rankInit();
    // if (this.href.includes("/verify.html")) this.verifyInit();
    if (this.href.includes("center.mcmod.cn")) this.centerInit();
    if (this.href.includes("admin.mcmod.cn")) this.adminInit();
    if (this.href === "https://www.mcmod.cn/mcmodder/structureeditor/" && this.utils.getConfig("enableStructureEditor")) this.structureEditorInit();
    if (this.href === "https://www.mcmod.cn/mcmodder/jsonhelper/" && this.utils.getConfig("enableJsonHelper")) this.jsonHelperInit();

    if ($(".common-comment-block.lazy").length) this.commentInit();

    if ($(".left").length && $(".col-lg-12.right").length) $(".col-lg-12.right").css("min-height", $(".left").get(0).getBoundingClientRect().height + "px");

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
      new draggableFrame(waifuFrame);

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
        this.advutils.addProgress(McmodderValues.AdvancementID.CLICK_GIRL_100_TIMES);
      });
    }

    $(".common-background").remove();
    $("#key").css("color", "var(--mcmodder-txcolor)");

    window.addEventListener("scroll", () => {
      this.screenAttachedFrame.forEach(e => {
        e.node.style.top = Math.max(0, window.scrollY - e.parentPosY + McmodderValues.headerContainerHeight) + "px";
      });
    });

    this.updateItemTooltip();
    $(document).on("mouseover", ".tooltip", e => {
      e.currentTarget.remove();
    });

    this.title = $("title").html().replace(" - MC百科|最大的Minecraft中文MOD百科", " - MC 百科");
    $("title").html(this.title);

    this.copyright();
  }
}

(() => {
  "use strict";
  const mcmodder = new Mcmodder();
})();
