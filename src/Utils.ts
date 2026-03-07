import { GM_getValue, GM_setValue, GM_xmlhttpRequest, GmResponseEvent, GmXmlhttpRequestOption } from "$";
import { McmodItemEditorData, McmodItemEditorInnerData } from "./jsonframe/ItemJsonFrame";
import { Mcmodder } from "./Mcmodder";
import { ClassNameData, McmodderItemData, McmodderKeyData, McmodderProfileData } from "./types";
import { McmodderValues } from "./Values";

export interface ThemeColorData {
  tc1: string,
  tc2: string,
  tc3: string,
  td1: string,
  td2: string,
  tca1: string,
  tca2: string,
  tca3: string,
  tda1: string,
  tda2: string,
  tcaa1: string,
  tcaa2: string
}

export class McmodderUtils {

  parent: Mcmodder;

  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  static isMac() {
    return navigator.userAgent.includes("Macintosh");
  }

  static isMobileClient() {
    return !!(navigator.userAgent.match(/Mobi/i) ||
      navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/iPhone/i));
  }

  static commonMsg(message: string, isok: boolean = true, title: string = "") {
    if (typeof common_msg != "function") return;
    common_msg(title || (isok ? "提示" : "错误"), message, isok ? "ok" : "err");
  }

  static showTaskTip(imageUrl: string, title: string, text: string, achieveTime: string, progress: number, rewardExp: number | string) {
    showTaskTip(imageUrl, title, text, achieveTime, progress, rewardExp);
  }

  static styleColors = (utils: McmodderUtils): ThemeColorData => ({
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

  static versionCompare(v1: string, v2: string) {
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

  static simpleDeepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  static complexDeepCopy(obj: any) {
    // TODO ...
    return McmodderUtils.simpleDeepCopy(obj);
  }

  static deleteEmptyProperties(obj: any) {
    let val;
    Object.keys(obj).forEach(key => {
      val = obj[key];
      if (val === undefined || val === null || (typeof val === "number" && isNaN(val))) delete obj[key];
    });
  }

  getConfig(key?: string | number | null, item = "mcmodderSettings", defaultValue: any = undefined) {
    // mcmodderUI 被修复后请移除下一行
    if (key === "mcmodderUI" && item === "mcmodderSettings") return true;

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

  getConfigAsNumberList(key?: string | number | null, item = "mcmodderSettings", defaultValue: any = undefined) {
    return (this.getConfig(key, item, defaultValue) || "").replaceAll(" ", "").split(",").map(Number) as number[];
  }

  getAllConfig(item = "mcmodderSettings", defaultValue?: any) {
    let res = this.getConfig(null, item, defaultValue);
    if (res != undefined) return res;
    return defaultValue;
  }

  setConfig(key: number | string | null | undefined, value: any, item = "mcmodderSettings") {
    if (!key) return;
    let obj = JSON.parse(GM_getValue(item) || "{}");
    if (value === null) delete obj[key];
    else obj[key] = value;
    GM_setValue(item, JSON.stringify(obj));
  }

  deleteConfig(key: number | string | null | undefined, item = "mcmodderSettings") {
    this.setConfig(key, null, item);
  }

  setAllConfig(item: string | null | undefined, value: any) {
    if (!item) return;
    GM_setValue(item, JSON.stringify(value));
  }

  doesProfileDataExist(uid = this.parent.currentUID) {
    const rawData = GM_getValue("userProfile");
    if (!rawData) return false;
    const profiles: Record<string, string> = JSON.parse(rawData);
    return profiles.hasOwnProperty(uid);
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

  getAllProfile(uid = this.parent.currentUID): McmodderProfileData {
    return this.getProfile("*", uid);
  }

  setProfile(key: string, value: any, uid = this.parent.currentUID) {
    const profiles = JSON.parse(GM_getValue("userProfile") || "{}");
    let profile = JSON.parse(profiles[uid] || "{}");
    profile[key] = value;
    profiles[uid] = JSON.stringify(profile);
    GM_setValue("userProfile", JSON.stringify(profiles));
  }

  setAllProfile(content: McmodderProfileData, uid = this.parent.currentUID) {
    const profiles = JSON.parse(GM_getValue("userProfile") || "{}");
    let profile = JSON.parse(profiles[uid] || "{}");
    profile = Object.assign(profile, content);
    profile.lastUpdated = Date.now();
    profiles[uid] = JSON.stringify(profile);
    GM_setValue("userProfile", JSON.stringify(profiles));
  }

  deleteAllProfile(uid = this.parent.currentUID) {
    const profiles = JSON.parse(GM_getValue("userProfile") || "{}");
    delete profiles[uid];
    GM_setValue("userProfile", JSON.stringify(profiles));
  }

  getProfileAbstract(target: number | McmodderProfileData, plainText = false) {
    const profile = typeof target === "number" ? this.getAllProfile(target) : target;
    if (!Object.keys(profile).length) {
      const text = "用户信息获取失败...";
      return plainText ? text : `<span class="text-danger">${ text }</span>`;
    }
    const content = [profile.userGroup];
    if (profile.editNum) content.push(`${ profile.editNum.toLocaleString() } 次编辑`);
    if (profile.editByte) content.push(`${ profile.editByte.toLocaleString() } 字节`)
    if (profile.expirationDate && !plainText) {
      if (profile.expirationDate > Date.now()) content.push(`登录信息 <span class="mcmodder-timer-pre" /> 后过期`);
      else content.push(`<span class="text-danger">登录信息已过期（须重新登录以刷新状态）</span>`);
    }
    return content.join(" · ");
  }

  getInteract(id?: string | null) {
    const result = this.getConfig(id, "mcmodderInteracts");
    this.setConfig(id, null, "mcmodderInteracts");
    return result;
  }

  setInteract(value: any) {
    const id = McmodderUtils.randStr(8);
    this.setConfig(id, value, "mcmodderInteracts");
    return id;
  }

  static playsound(url = McmodderValues.assets.mcmod.level.levelup) {
    let task_audio = document.createElement("audio");
    task_audio.setAttribute("muted", "muted");
    task_audio.setAttribute("src", url);
    task_audio.play();
  }

  static rgbToHex(s: string) {
    return "#" + s.replace(/(?:\(|\)|RGB|rgb)*/g, "")
      .split(",")
      .map(e => parseInt(e))
      .reduce((p, q) => (p << 8) + q)
      .toString(16)
      .padStart(6, "0");
  }

  static getPrecisionFormatter(minDigit = 0, maxDigit = 2) {
    return Intl.NumberFormat("en-US", {
      minimumFractionDigits: minDigit,
      maximumFractionDigits: maxDigit
    });
  }

  static getFormattedTime(t: number) {
    if (t < 0) return `-`;
    if (t < 1e3) return `${t}ms`;
    if (t < 5e3) return `${Math.floor(t / 1e3)}s ${t % 1e3}ms`;
    if (t < 6e4) return `${Math.floor(t / 1e3)}s`;
    if (t < 3.6e6) return `${Math.floor(t / 6e4)}m ${Math.floor(t % 6e4 / 1e3)}s`;
    if (t < 8.64e7) return `${Math.floor(t / 3.6e6)}h ${Math.floor(t % 3.6e6 / 6e4)}m`;
    return `${Math.floor(t / 8.64e7)}d`;
  }

  static getFormattedNumber(n: number) {
    if (n >= 1e12) return (n / 1e12).toFixed(Number(n % 1e12 != 0)) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(Number(n % 1e9 != 0)) + "G";
    if (n >= 1e6) return (n / 1e6).toFixed(Number(n % 1e6 != 0)) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(Number(n % 1e3 != 0)) + "k";
    return n.toString();
  }

  static getClassFullName(name: string, ename: string, abbr: string) {
    if (!name) return undefined;
    let res = "";
    if (abbr) res += `[${abbr}] `;
    res += name;
    if (ename) res += ` (${ename})`;
    return res;
  }

  static parseClassFullName(fullName: string): ClassNameData {
    let abbr = "", name = "", ename = "", indexOf: number;
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

  static getItemFullName(name: string, ename?: string | null) {
    let res = name;
    if (ename) res += ` (${ ename })`;
    return res;
  }

  static async imageURL2base64(url: string) {
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

  static async blob2Base64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") resolve(result);
        else resolve("");
      }
      reader.onerror = () => reject;
      reader.readAsDataURL(blob);
    });
  }

  static blobToText(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(blob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }

  static appendBase64ImgPrefix(v?: string) {
    if (v && v.slice(0, 11) != "data:image/") return "data:image/png;base64," + v;
    return v;
  }

  static removeBase64ImgPrefix(v?: string) {
    if (v && v.slice(0, 11) === "data:image/") return v.split(";base64,")[1];
    return v;
  }

  static saveFile(fileName: string, content: string) {
    const blob = new Blob([content]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  static sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
  }

  static highlight(jQueryNode: JQuery, color = "gold", timeout = 0, scrollIntoView = false) {
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

  static abstractLastFromURL(url: string, typeList: string | string[]) {
    if (!url || !typeList) return "";
    if (!(typeList instanceof Array)) typeList = [typeList];
    let res = "";
    try {
      for (let type of typeList) {
        if (url.includes(type)) {
          res = url.split(`/${type}/`)[1].split(".html")[0].split("/")[0];
          break;
        }
      }
    } finally {
      return res || "";
    }
  }

  static abstractIDFromURL(url: string, typeList: string | string[]) {
    return Number(McmodderUtils.abstractLastFromURL(url, typeList));
  }

  static getImageURLByItemID(id: number, width = 32, ver = 0) {
    const validSize = [32, 36, 128, 144];
    if (!validSize.includes(width)) {
      console.error(`Highlight color parameter must be within: [${ validSize.join(", ") }]`);
      return "";
    }
    if (!id) return `https://i.mcmod.cn/item/icon/${ width }x${ width }/0.png?v=${ ver }`;
    return `https://i.mcmod.cn/item/icon/${ width }x${ width }/${ Math.floor(id / 1e4) }/${ id }.png?v=${ ver }`;
  }

  static getItemURLByID(id: number) {
    return `https://www.mcmod.cn/item/${ id }.html`;
  }

  static getClassURLByID(id: number) {
    return `https://www.mcmod.cn/class/${ id }.html`;
  }

  static getCenterURLByID(id: number) {
    return `https://center.mcmod.cn/${ id }`;
  }

  static versionArrayToString(arr: number[]) {
    if (arr[1] === 1) return "远古版本"; // 远古版本统一视为 1.1.0
    if (!arr[2]) arr = arr.slice(0, 2);
    return arr.join(".");
  }

  static darkenColor = (color: string, percent: number) => {
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

  static keyToRawList(e: McmodderKeyData) {
    // if (!(e instanceof Object)) e = JSON.parse(e);
    if (!e.key) return [];
    let k = [], c;
    if (e.ctrlKey) k.push("Ctrl");
    if (e.shiftKey) k.push("Shift");
    if (e.altKey) k.push("Alt");
    if (e.metaKey) k.push("Meta");
    if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      if (e.keyCode) {
        if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 98 && e.keyCode <= 123)) c = String.fromCharCode(e.keyCode).toUpperCase();
        else if (e.keyCode >= 48 && e.keyCode <= 57) c = String.fromCharCode(e.keyCode);
        else c = e.key;
      }
      else c = e.key;
      k.push(c);
    }
    return k;
  }

  static keyToString(e: McmodderKeyData) {
    const list = McmodderUtils.keyToRawList(e);
    if (!list.length) return "未指定";
    return list.join(" + ");
  }

  static keyToHTML(e: McmodderKeyData) {
    const list = McmodderUtils.keyToRawList(e);
    const isMac = McmodderUtils.isMac();
    const HTMLList = list.map(data => {
      if (isMac) {
        switch (data) {
          case "Ctrl": data = "⌃‌"; break;
          case "Shift": data = "⇧"; break;
          case "Alt": data = "⌥"; break;
          case "Meta": data = "⌘";
        }
      }
      return `<kbd>${ data }</kbd>`;
    })
    return HTMLList.join("");
  }

  static isKeyMatch(a: McmodderKeyData, b: McmodderKeyData) { // b需要匹配a
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

  isKeyMatchConfig(a: string, b: McmodderKeyData) {
    return McmodderUtils.isKeyMatch(this.getConfig(a), b);
  }

  static randStr(l = 32) {
    const t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    let n = t.length, r = '';
    for (let i = 0; i < l; i++)
      r += t.charAt(Math.floor(Math.random() * n));
    return r;
  }

  static getAbsolutePos(node: Element) {
    const rect = node.getBoundingClientRect();
    return {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.top
    }
  }

  static debounce = (func: Function, wait: number) => {
    let timeout: number;
    return function (this: any, ...args: any[]) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    }
  }

  static throttle = (func: Function, wait: number) => {
    let lastTime = 0;
    return function (this: any, ...args: any[]) {
      const context = this;
      const now = Date.now();
      if (now - lastTime >= wait) {
        func.apply(context, args);
        lastTime = now;
      }
    };
  }

  static addStyle(value: string, id = "", doc = document) {
    if (doc.getElementById(id)) return;
    let style = $('<style type="text/css">').appendTo($("head", doc)).html(value);
    if (id) style.attr("id", id);
  }

  static addScript(loc: Element, content: string | null, src?: string, type?: string) {
    let script = document.createElement("script");
    script.type = type ? type : "text/JavaScript";
    if (content) script.innerHTML = content;
    else if (src) {
      script.src = src;
      script.async = true;
    }
    loc.appendChild(script);
  }

  static loadScript(loc: Element, content?: string | null, src?: string | null, type?: string | null, id?: string) {
    return new Promise<void>(resolve => {
      let script = document.createElement("script");
      script.type = type ? type : "text/JavaScript";
      if (id) script.id = id;
      if (src) script.src = src;
      if (content) script.innerHTML = content;
      script.onload = () => resolve();
      loc.appendChild(script);
    });
  }

  static getStartTime(d: number | Date, num = 1) {
    if (typeof d === "number") d = new Date(d);
    return new Date(d.setHours(0, 0, 0, 0)).getTime() + 24 * 60 * 60 * 1000 * num;
  }

  static getFormattedChineseDate(date = new Date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  static getFormatted24hTime(date = new Date) {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }

  static getFormattedSize = (size: number | string) => {
    size = Number(size) || 0;
    const f = (e: number) => McmodderUtils.getPrecisionFormatter().format(e);
    if (size < 1024) return f(size) + " B";
    else if (size < 1048576) return f(size / 1024) + " KiB";
    else if (size < 1073741824) return f(size / 1048576) + " MiB";
    else return f(size / 1073741824) + " GiB";
  }

  static getFormattedCodeDecoratedHTML = (str: string) => {
    
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
    let lastRequestTime: number = this.getConfig("lastRequestTime") || now;
    if (lastRequestTime > now + minimumRequestInterval * McmodderValues.MAX_REQUEST_COUNT) {
      console.warn("Scheduled requests have exceeded the maximum limit. New request is ignored.");
      return -1;
    }
    if (now > lastRequestTime) lastRequestTime = now;
    this.setConfig("lastRequestTime", lastRequestTime + minimumRequestInterval);
    return lastRequestTime;
  }

  createRequest(config: GmXmlhttpRequestOption<"text", any>) {
    const lastRequestTime = this.updateRequestTime(), now = (new Date()).getTime();
    setTimeout(() => {
      const logs = GM_getValue("mcmodderLogger")?.split(";") || [];
      if (logs.length >= McmodderValues.MAX_REQUEST_COUNT / 10) logs.shift();
      let content = `${lastRequestTime}:${config.url}`;
      if (config.data) content += `(${config.data})`;
      logs.push(content);
      GM_setValue("mcmodderLogger", logs.join(";"));
      // console.debug("Send request: ", config);
      GM_xmlhttpRequest(config);
      // let response = await fetch(url, config);
      // response.text().then(promise => onload(promise));
    }, (lastRequestTime - now));
  }

  async createAsyncRequest(config: GmXmlhttpRequestOption<"text", any>): Promise<GmResponseEvent<"text", any>> {
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
        // console.debug("Send Async request: ", config);
        GM_xmlhttpRequest(config);
      }, (lastRequestTime - now));
    });
  }

  static unicode2Character(s: string) {
    let chineseStr = "", l = s.length;
    for (let i = 0; i < l;) {
      const unicode = s.slice(i, 6);
      if (unicode.slice(0, 2) === "\\u") {
        chineseStr += String.fromCharCode(parseInt(unicode.slice(2), 16));
        i += 6;
      }
      else {
        chineseStr += unicode.charAt(0);
        i += 1;
      }
    }
    return chineseStr;
  }

  static customDateStringToTimestamp(str: string) {
    const [year, month, day, hour, minute, second] = str.split(/[- :]/).map(Number);
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }

  static clearContextFormatter(e: string) {
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

  static getContextLength(e: string) {
    const encoder = new TextEncoder();
    let r = McmodderUtils.clearContextFormatter(e);
    return encoder.encode(r).length;
  }

  static isNodeHidden(node: Element | JQuery) {
    if ($(node).css("display") === "none") return true;
    return false;
  }

  static regulateFileName(name: string) {
    return name.replace(/[\\\/:*?"<>|]/g, '_').replace(/ /g, '_').substring(0, 255);
  }

  static addClickCopyEvent(node: JQuery, typeName: string, copyData?: string) {
    node.click(e => {
      const text = copyData || e.currentTarget.textContent;
      navigator.clipboard.writeText(text);
      McmodderUtils.commonMsg(`${ typeName }名称已成功复制到剪贴板~ (${ text })`);
    });
  }

  updateClassNameIDMap(className: string, classID: string) {
    let classNameIDMap = this.getAllConfig("classNameIDMap", {});
    let idClassNameMap = this.getAllConfig("idClassNameMap", {});
    classNameIDMap[className] = classID;
    idClassNameMap[classID] = className;
    GM_setValue("classNameIDMap", JSON.stringify(classNameIDMap));
    GM_setValue("idClassNameMap", JSON.stringify(idClassNameMap));
  }

  getClassNameByClassID(classID: number) {
    let idClassNameMap = this.getAllConfig("idClassNameMap", {});
    return idClassNameMap[classID];
  }

  getClassIDByClassName(className: string) {
    let classNameIDMap = this.getAllConfig("classNameIDMap", {});
    return classNameIDMap[className];
  }

  static updateAllTooltip() {
    return $().tooltip ?
      $('[data-toggle="tooltip"]').tooltip({
        // animation: false,
        // delay: { show: 200 }
      }) :
      null;
  }

  async getItemByID(id: string | number) {
    id = Number(id);
    const resp = await this.createAsyncRequest({
      url: `https://www.mcmod.cn/item/${ id }.html`,
      method: "GET",
      redirect: "manual",
      anonymous: true
    });
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return McmodderUtils.parseItemDocument(doc);
  }

  async getDetailedItemByID(id: string | number) {
    if (!this.parent.currentUID) return;
    id = Number(id);
    const resp = await this.createAsyncRequest({
      url: `https://www.mcmod.cn/item/edit/${ id }/`,
      method: "GET",
      redirect: "manual"
    });
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return McmodderUtils.parseItemEditorDocument(doc);
  }

  static parseItemDocument($doc: JQuery) {
    const keywords = $doc.find("meta[name=keywords]").attr("content").split(",");
    const itemRow = $doc.find(".item-row").first();
    const command = itemRow.find(".item-give")?.attr("data-command")?.slice(9)?.split(" ");
    const righttable = itemRow.find(".righttable tbody > tr");
    const nav = $doc.find(".common-nav li");
    const res: McmodderItemData = {
      id: McmodderUtils.abstractIDFromURL(itemRow.find(".tool a").first().prop("href"), "item/edit"),
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
    const itemType = Number(nav.eq(6).find("a").attr("href").split(`/item/list/${ res.classID }-`)[1].slice(0, -5));
    if (itemType != 1) res.itemType = itemType; 
    McmodderUtils.deleteEmptyProperties(res);
    return res;
  }

  static parseClassDocument($doc: JQuery) {
    const name = $doc.find(".class-title h3");
    const ename = $doc.find(".class-title h4");
    const abbr = $doc.find(".class-title .short-name");
    return {
      nameNode: name,
      enameNode: ename,
      abbrNode: abbr,
      className: name.text(),
      classEname: ename.text(),
      classAbbr: abbr.text().slice(1, -1)
    }
  }

  static async itemDataToEditorData(item: McmodderItemData): Promise<McmodItemEditorData> {
    let res: any = {"item-data": {} };
    let data: McmodItemEditorInnerData = res["item-data"];
    if (item.id) {
      res["action"] = "item_edit";
      res["edit-id"] = item.id.toString();
    } else {
      res["action"] = "item_add";
    }
    res["class-id"] = item.classID.toString();

    data["content"] = item.content || "";
    data["name"] = item.name;
    if (item.englishName) data["ename"] = item.englishName;
    data["category"] = { 0: 1 };
    data["type"] = item.creativeTabName;
    data["icon-32x-data"] = item.smallIcon || McmodderUtils.appendBase64ImgPrefix(McmodderUtils.getImageURLByItemID(item.id, 32)) || "";
    data["icon-128x-data"] = item.largeIcon || McmodderUtils.appendBase64ImgPrefix(McmodderUtils.getImageURLByItemID(item.id, 128)) || "";
    data["is-general-node"] = "0";
    data["is-general-parents"] = "0";
    if (item.OredictList && item.OredictList.length <= 2) data["oredict"] = item.OredictList.slice(1, -1).replaceAll(", ", ",");
    if (item.maxStackSize != undefined) data["maxstack"] = item.maxStackSize.toString();
    // if (item.tools) data["tools"] = item.tools;

    return res;
  }

  static parseItemEditorDocument($doc: JQuery) {
    const headScript = $doc.find("head > script").last().html().split(";");
    const bodyScript = $doc.find("body > script").last().html();
    const inputs = $doc.find(".input-group");
    const nav = $doc.find(".common-nav li");
    const res: McmodderItemData = {
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

  static parseClassEditorDocument(_$doc: JQuery) {
    // TODO ...
  }
}