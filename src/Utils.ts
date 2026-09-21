import { GM_cookie, GM_getValue, GM_setValue, GM_xmlhttpRequest, type GmResponseEvent, type GmXmlhttpRequestOption } from "$";
import { ConfigRepository } from "./config/ConfigRepository";
import { Mcmodder } from "./Mcmodder";
import { Values } from "./Values";

export interface ThemeColorSet {
  tc1: string,
  tc2: string
}

export class Utils {
  private readonly parent: Mcmodder;
  readonly configs: ConfigRepository;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = new ConfigRepository(parent);
  }

  private static m_isMac: boolean | undefined;
  static isMac() {
    return this.m_isMac ??= navigator.userAgent.includes("Macintosh");
  }

  private static m_isMobileClient: boolean | undefined;
  static isMobileClient() {
    return this.m_isMobileClient ??=
      !!(navigator.userAgent.match(/Mobi/i) ||
      navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/iPhone/i));
  }

  static toQzoneLogin() {
    window.open(
      `${ Values.hostname }/plugs/loginConnect/qqConnect/oauth/index.php`,
      'TencentLogin',
      'width=755,height=515,menubar=0,scrollbars=0,resizable=0,status=1,titlebar=0,toolbar=0,location=1'
    );
  }

  static commonMsg(message: string, isok: boolean = true, title: string = "") {
    const defaultTitle = isok ? "提示" : "错误";
    if (typeof common_msg === "function") {
      common_msg(title || defaultTitle, message, isok ? "ok" : "err");
    }
    else if (typeof swal === "function") {
      (swal as any)({
        type: isok ? "success" : "error",
        title: defaultTitle,
        text: message,
        button: false,
        timer: 3e3
      });
    }
  }

  static createModal(option: SweetAlertOption, interceptEvents: Record<string, (ev: Event) => any> = {}) {
    swal.fire(option).then(() => {
      Object.entries(events).forEach(([eventName, callback]) => {
        window.removeEventListener(eventName, callback);
      })
    });
    const modal = $(".swal2-modal").get(0);
    const events: Record<string, (this: Window, ev: any) => any> = {};
    Object.entries(interceptEvents).forEach(([eventName, callback]) => {
      events[eventName] = (ev: Event) => {
        const target = ev.target;
        if (target instanceof Node && !(target instanceof Document) && modal.contains(target)) {
          ev.stopPropagation();
          callback(ev);
        }
      }
    })
    Object.entries(events).forEach(([eventName, callback]) => {
      window.addEventListener(eventName, callback, true);
    })
  }

  // static rawMap(mods: Record<string, { default: string }>) {
  //   const out: Record<string, string> = {};
  //   for (const [p, m] of Object.entries(mods)) {
  //     out[p.match(/([^/]+)\.\w+$/)![1]] = m.default;
  //   }
  //   return out;
  // }

  /**
   * 针对 HttpOnly cookie 编写的读写接口
   *
   * HttpOnly cookie 无法通过 document.cookie 读取或覆写，只能经由油猴的 `GM_cookie` 接口访问；
   * 该接口访问 `httpOnly` cookie 需要 Tampermonkey 测试版 (beta)，且需在油猴设置中允许，
   * 故读取接口保留 `document.cookie` 作为降级回退。
   *
   * @see https://www.tampermonkey.net/documentation.php#api:GM_cookie.list
   */
  private static supportCookieAPI() {
    return typeof GM_cookie !== "undefined";
  }

  /** 读取 `_uuid` cookie 的值，未登录或无权访问时返回空字符串 */
  static getUuidCookie(): Promise<string> {
    if (!Utils.supportCookieAPI()) return Promise.resolve($.cookie("_uuid") || "");
    return new Promise(resolve => {
      GM_cookie.list({ name: "_uuid" }, (cookies, err) => {
        if (err) console.warn("读取 `_uuid` cookie 失败，回退至 document.cookie：", err);
        resolve(cookies?.length ? cookies[0].value : ($.cookie("_uuid") || ""));
      });
    });
  }

  /** 写入 `_uuid` cookie（切换账号），返回是否写入成功 */
  static setUuidCookie(uuid: string | undefined, expirationDate?: number): Promise<boolean> {
    if (!uuid) {
      console.warn("待写入的 `_uuid` cookie 为空，请先访问一次该账号的个人主页以记录登录信息。");
      return Promise.resolve(false);
    }
    if (!Utils.supportCookieAPI()) {
      console.warn("当前脚本管理器不支持 `GM_cookie`，无法写入 HttpOnly cookie `_uuid`。");
      return Promise.resolve(false);
    }
    return new Promise(resolve => {
      GM_cookie.set({
        name: "_uuid",
        value: uuid,
        domain: ".mcmod.cn",
        path: "/",
        // 妥协mcmod的httponly以及保证XSS不能偷取用户cookie
        httpOnly: true,
        secure: true,
        expirationDate: expirationDate && expirationDate > 0 ? Math.floor(expirationDate / 1e3) : undefined
      }, err => {
        if (err) {
          console.warn("写入 `_uuid` cookie 失败：", err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  /** 删除 `_uuid` cookie（退出登录），返回是否删除成功 */
  static deleteUuidCookie(): Promise<boolean> {
    if (!Utils.supportCookieAPI()) {
      console.warn("当前脚本管理器不支持 `GM_cookie`，无法删除 HttpOnly cookie `_uuid`。");
      return Promise.resolve(false);
    }
    return new Promise(resolve => {
      GM_cookie.delete({ name: "_uuid" }, err => {
        if (err) {
          console.warn("删除 `_uuid` cookie 失败：", err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  static showTaskTip(imageUrl: string, title: string, text: string, achieveTime: string, progress: number, rewardExp: number | string) {
    showTaskTip(imageUrl, title, text, achieveTime, progress, rewardExp);
  }

  static getThemeColors = (configs: ConfigRepository): ThemeColorSet => {
    return {
      tc1: configs.getSettings("themeColor1")!,
      tc2: configs.getSettings("themeColor2")!
    }
  }

  static clamp(value: number, min = 0, max = 1) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

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

  static validateVersionForLoaderID(version: string, loaderID: string) {
    const list = (Values.loaderSupportVersions as any)[loaderID] as string[];
    return !list || (
      list.includes(version) || (
        list[0].includes(">=") && 
        this.versionCompare(version, list[0].split(">=")[1]) > -1
      )
    );
  }

  static validateVersionForLoaderName(version: string, loaderName: string) {
    return this.validateVersionForLoaderID(version, (Values.loaderID as any)[loaderName]);
  }

  static simpleDeepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static complexDeepCopy<T>(obj: T) {
    // TODO ...
    return Utils.simpleDeepCopy(obj);
  }

  static deleteEmptyProperties(obj: any) {
    let val;
    Object.keys(obj).forEach(key => {
      val = obj[key];
      if (val === undefined || val === null || (typeof val === "number" && isNaN(val))) delete obj[key];
    });
  }

  static createRange(l: number, r: number, step = 1) {
    if (!Number.isInteger(l) || !Number.isInteger(r)) {
      throw new Error("端点必须是整数。");
    }
    if (l > r) {
      throw new Error("左端点必须不大于右端点。");
    }
    if (!Number.isInteger(step) || step < 1) {
      throw new Error("步长必须是正整数。");
    }
    return Array.from({ length: (r - l) / step }, (_, i) => i * step + l);
  }

  getProfileAbstract(target: number | Profile, showLv = false, plainText = false) {
    const profile = typeof target === "number" ? this.configs.getAllProfile(target) : target;
    if (!Object.keys(profile).length) {
      const text = "用户信息获取失败...";
      return plainText ? text : `<span class="text-danger">${ text }</span>`;
    }
    
    let userGroup = profile.userGroup;
    if (!plainText) {
      switch (userGroup) {
        case "百科编辑员": userGroup = `<span class="mcmodder-admin-editor">${ userGroup }</span>`; break;
        case "资深编辑员": userGroup = `<span class="mcmodder-admin-admin">${ userGroup }</span>`;
      }
    }
    
    const content = [profile.userGroup];
    if (showLv) content.push(`Lv.${ profile.lv }`);
    if (profile.editNum) content.push(`${ profile.editNum.toLocaleString() } 次编辑`);
    if (profile.editByte) content.push(`${ profile.editByte.toLocaleString() } 字节`)
    if (profile.expirationDate && !plainText) {
      if (profile.expirationDate > Date.now()) content.push(`登录信息 <span class="mcmodder-timer-pre" /> 后过期`);
      else content.push(`<span class="text-danger">登录信息已过期（须重新登录以刷新状态）</span>`);
    }
    return content.join(" · ");
  }

  getInteract(id: string | null) {
    if (id === null || id === undefined) return undefined;
    const result = this.configs.get("mcmodderInteracts", id);
    this.configs.set("mcmodderInteracts", id, null);
    return result;
  }

  setInteract(value: any) {
    const id = Utils.randStr(8);
    this.configs.set("mcmodderInteracts", id, value);
    return id;
  }

  static playsound(url = Values.assets.mcmod.level.levelup) {
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

  static getFormattedChineseTime(t: number) {
    let a, b = t < 0 ? "前" : "后";
    t = t < 0 ? -t : t;
    if (t < 1e3) return `刚刚`;
    else if (t < 6e4) a = `${Math.floor(t / 1e3)}秒`;
    else if (t < 3.6e6) a = `${Math.floor(t / 6e4)}分`;
    else if (t < 8.64e7) a = `${Math.floor(t / 3.6e6)}时`;
    else if (t < 2.592e9) a = `${Math.floor(t / 8.64e7)}天`;
    else if (t < 3.1536e10) a = `${Math.floor(t / 2.592e9)}月`;
    else a = `${Math.floor(t / 3.1536e10)}年`;
    return a + b;
  }

  static getFormattedNumber(n: number) {
    if (n >= 1e12) return (n / 1e12).toFixed(Number(n % 1e12 !== 0)) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(Number(n % 1e9 !== 0)) + "G";
    if (n >= 1e6) return (n / 1e6).toFixed(Number(n % 1e6 !== 0)) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(Number(n % 1e3 !== 0)) + "k";
    return n.toString();
  }

  static getClassFullName(name: string, ename: string, abbr: string): string;
  static getClassFullName(data: Class): string | undefined;
  static getClassFullName(...args: [name: string, ename: string, abbr: string] | [data: Class]) {
    const name = (args.length === 1 ? args[0].name : args[0]).trim();
    const ename = (args.length === 1 ? args[0].englishName : args[1]).trim();
    const abbr = (args.length === 1 ? args[0].abbr : args[2]).trim();
    if (!name) return undefined;
    let res = "";
    if (abbr) res += `[${ abbr }] `;
    res += name;
    if (ename) res += ` (${ ename })`;
    return res;
  }

  static parseClassFullName(fullName: string): ClassName {
    let abbr = "", name = "", ename = "", indexOf: number;
    if (fullName) {
      fullName = fullName.trim();
      if (fullName.charAt(0) === "[") {
        indexOf = fullName.indexOf("]");
        abbr = fullName.slice(1, indexOf);
        fullName = fullName.slice(indexOf + 1).trim();
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
      className: name.trim(),
      classEname: ename.trim(),
      classAbbr: abbr.trim()
    };
  }

  static getItemFullName(name: string, ename?: string | null) {
    let res = name.trim();
    let trimedEname = ename?.trim();
    if (trimedEname) res += ` (${ trimedEname })`;
    return res;
  }

  static parseItemFullName(fullName: string) {
    const pos = fullName.lastIndexOf(" (");
    const name = pos >= 0 ? fullName.slice(0, pos) : fullName;
    const englishName = pos >= 0 ? fullName.slice(pos + 2, -1) : "";
    return { name, englishName };
  }

  static async imageURL2base64(url: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return Utils.blob2Base64(blob);
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
    if (v && v.slice(0, 11) !== "data:image/") return "data:image/png;base64," + v;
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
    return Number(Utils.abstractLastFromURL(url, typeList));
  }

  static getImageURLByItemID(id: number, width = 32, ver = 0) {
    const validSize = [32, 36, 128, 144];
    if (!validSize.includes(width)) {
      console.error(`Image size parameter must be within: [${ validSize.join(", ") }]`);
      return "";
    }
    if (!id) return `https://i.mcmod.cn/item/icon/${ width }x${ width }/0.png?v=${ ver }`;
    return `https://i.mcmod.cn/item/icon/${ width }x${ width }/${ Math.floor(id / 1e4) }/${ id }.png?v=${ ver }`;
  }

  static getItemURL(id: number) {
    return `${ Values.hostname }/item/${ id }.html`;
  }

  static getItemTypeURL(classID: number, typeID: number) {
    return `${ Values.hostname }/item/list/${ classID }-${ typeID }.html`;
  }

  static getClassURL(id: number) {
    return `${ Values.hostname }/class/${ id }.html`;
  }

  static getOredictURL(oredict: string) {
    return `${ Values.hostname }/oredict/${ oredict }-1.html`;
  }

  static getCenterURL(id: number) {
    return `https://center.mcmod.cn/${ id }/`;
  }

  static URLToAnchor(url: string, text?: string) {
    return $("<a>").attr({
      target: "_blank",
      href: url
    }).text(text ?? url);
  }

  static versionArrayToString(arr: number[]) {
    if (arr[0] === 1 && arr[1] === 1) return "远古版本"; // 远古版本统一视为 1.1.0
    if (!arr[2]) arr = arr.slice(0, 2);
    return arr.join(".");
  }

  static colorToRGB(color: string): RGB | RGBA {
    const colorFormatError = new Error("颜色代码的格式不正确。");
    const colorParseError = new Error("颜色代码解析失败。");
    if (color.charAt(0) != "#") {
      throw colorFormatError;
    }
    const dec = parseInt(color.slice(1), 16);
    if (isNaN(dec) || dec < 0) {
      throw colorParseError;
    }
    switch (color.length) {
      case 7: return {
        r: dec >> 16,
        g: (dec & 0x00FF00) >> 8,
        b: dec & 0x0000FF
      };
      case 9: return {
        r: dec >>> 24,
        g: (dec & 0x00FF0000) >> 16,
        b: (dec & 0x0000FF00) >> 8,
        a: dec & 0x000000FF / 0xFF
      }
      case 4: case 5: {
        const t = ["#"];
        for (let i = 1; i < color.length; i++) {
          t.push(color.charAt(i).repeat(2));
        }
        return this.colorToRGB(t.join(""));
      }
      default: throw colorFormatError;
    }
  }

  static parseRGB(str: string): RGB | RGBA | null {
    if (/rgb\([0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3}\)/.test(str)) {
      const numList = str.match(/[0-9]{1,3}/g)!.map(Number);
      return {
        r: numList[0],
        g: numList[1],
        b: numList[2]
      };
    }
    else if (/rgba\([0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3}\)/.test(str)) {
      const numList = str.match(/[0-9]{1,3}/g)!.map(Number);
      return {
        r: numList[0],
        g: numList[1],
        b: numList[2],
        a: numList[3]
      };
    }
    else {
      return null;
    }
  }

  static RGBToColor(rgb: RGB) {
    const a = (rgb as RGBA).a;
    let dec = (rgb.r << 16) + (rgb.g << 8) + rgb.b;
    if (a != undefined) dec = dec * 256 + Math.round(a * 0xFF);
    return "#" + dec.toString(16).padStart(a != undefined ? 8 : 6, "0");
  }

  static RGBToHSL(rgb: RGB): HSL | HSLA {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h: number, s: number, l = (max + min) / 2;

    if (delta === 0) {
      h = s = 0;
    } else {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case r: h = ((g - b) / delta) % 6; break;
        case g: h = (b - r) / delta + 2; break;
        case b: h = (r - g) / delta + 4; break;
        default: h = -1;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      s = Math.round(s * 100);
    }

    l = Math.round(l * 100);
    const a = (rgb as RGBA).a;
    if (a != undefined) {
      return { h, s, l, a };
    }
    return { h, s, l };
  }

  static HSLToRGB(hsl: HSL): RGB | RGBA {
    const h = hsl.h;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    const a = (hsl as HSLA).a;

    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0,
        g = 0,
        b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    if (a != undefined) {
      return { r: r, g: g, b: b, a: a };
    }
    return { r: r, g: g, b: b };
  }

  static colorToHSL(color: string | RGB) {
    const rgb = typeof color === "string" ? this.colorToRGB(color) : color;
    return this.RGBToHSL(rgb);
  }

  static HSLToColor(hsl: HSL) {
    return this.RGBToColor(this.HSLToRGB(hsl));
  }

  static adjustColorBrightness = (color: string | RGB, ratio: number) => {
    const hsl = Utils.colorToHSL(color);
    let lightness = hsl.l;
    if (ratio < 1) lightness *= ratio;
    else lightness += (100 - lightness) * (ratio - 1);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: this.clamp(lightness, 0, 100)
    });
  }

  static reverseColorBrightness = (color: string | RGB) => {
    const hsl = Utils.colorToHSL(color);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: 100 - hsl.l
    });
  }

  static setColorBrightness = (color: string | RGB, lightness: number) => {
    const hsl = Utils.colorToHSL(color);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: this.clamp(lightness, 0, 100)
    });
  }

  static setColorAlpha(color: string, alpha: number) {
    const rgb = this.colorToRGB(color);
    return this.RGBToColor({
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: this.clamp(alpha)
    } as RGBA);
  }

  static getXplatCtrlCombinationKey(keyCode: number | string | Key): Key {
    if (typeof keyCode === "string") {
      keyCode = keyCode.toUpperCase().charCodeAt(0);
    }
    if (typeof keyCode === "number") {
      keyCode = { keyCode };
    }
    if (this.isMac()) {
      keyCode.metaKey = true;
    } else {
      keyCode.ctrlKey = true;
    }
    return keyCode;
  }

  static keyToRawList(e: Key) {
    // if (!(e instanceof Object)) e = JSON.parse(e);
    if (!e.key && !e.keyCode) return [];
    let k = [], c;
    if (e.ctrlKey) k.push(Utils.isMac() ? "Control" : "Ctrl");
    if (e.shiftKey) k.push("Shift");
    if (e.altKey) k.push(Utils.isMac() ? "Option" : "Alt");
    if (e.metaKey) k.push(Utils.isMac() ? "Command" : "Meta");
    if (!e.key || !["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
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

  static keyToString(e: Key) {
    const list = Utils.keyToRawList(e);
    if (!list.length) return "未指定";
    return list.join(" + ");
  }

  static keyToHTML(e: Key) {
    const list = Utils.keyToRawList(e);
    const isMac = Utils.isMac();
    const HTMLList = list.map(data => {
      if (isMac) {
        switch (data) {
          case "Ctrl": case "Control": data = "⌃‌"; break;
          case "Shift": data = "⇧"; break;
          case "Alt": case "Option": data = "⌥"; break;
          case "Meta": case "Command": data = "⌘";
        }
      }
      return `<kbd>${ data }</kbd>`;
    })
    return HTMLList.join("");
  }

  static isKeyMatch(a: Key, b: Key) { // b需要匹配a
    if (!Object.keys(a).length) return false;
    if ((a.ctrlKey && !b.ctrlKey)) return false;
    if (a.shiftKey && !b.shiftKey) return false;
    if (a.altKey && !b.altKey) return false;
    if (a.metaKey && !b.metaKey) return false;
    if (a.keyCode && b.keyCode) {
      let keyCodeA = a.keyCode;
      let keyCodeB = b.keyCode;
      if (keyCodeA >= 98 && keyCodeA <= 123) keyCodeA -= 32;
      if (keyCodeB >= 98 && keyCodeB <= 123) keyCodeB -= 32;
      if (keyCodeA !== keyCodeB) return false;
    }
    return true;
  }

  isKeyMatchConfig(a: KeysOfType<Settings, Key>, b: Key) {
    const config = this.configs.getSettings(a);
    if (config === undefined) {
      return false;
    }
    return Utils.isKeyMatch(config, b);
  }

  static randStr(l = 32) {
    const t = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';
    let n = t.length, r = '';
    for (let i = 0; i < l; i++)
      r += t.charAt(Math.floor(Math.random() * n));
    return r;
  }

  private static readonly escapeHTMLMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  static escapeHTML(str: string | number) {
    return str.toString().replace(/[&<>"']/g, char => (Utils.escapeHTMLMap as any)[char]);
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

  static animationThrottle = (func: Function) => {
    let isTicking = false;
    return function (this: any, ...args: any[]) {
      const context = this;
      if (!isTicking) {
        requestAnimationFrame(() => {
          func.apply(context, args);
          isTicking = false;
        })
        isTicking = true;
      }
    }
  }

  static addStyle(value: string, id = "", doc = document) {
    if (id && doc.getElementById(id)) return;
    let style = $('<style type="text/css">').appendTo($("head", doc)).html(value);
    if (id) style.attr("id", id);
  }

  static loadStyle(loc: Element, content?: string | null, href?: string | null, type?: string | null, id?: string) {
    if (id && loc.ownerDocument.getElementById(id)) {
      return new Promise<void>(resolve => {
        resolve();
      })
    }
    return new Promise<void>((resolve, reject) => {
      let link = document.createElement("link");
      link.type = type ? type : "text/css";
      link.rel = "stylesheet";
      if (id) link.id = id;
      if (href) link.href = href;
      if (content) link.innerHTML = content;
      link.onload = () => resolve();
      link.onerror = () => reject();
      loc.appendChild(link);
    });
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
    if (id && loc.ownerDocument.getElementById(id)) {
      return new Promise<void>(resolve => {
        resolve();
      })
    }
    return new Promise<void>((resolve, reject) => {
      let script = document.createElement("script");
      script.type = type ? type : "text/JavaScript";
      if (id) script.id = id;
      if (src) script.src = src;
      if (content) script.innerHTML = content;
      script.onload = () => resolve();
      script.onerror = () => reject();
      loc.appendChild(script);
    });
  }

  static getStartTime(d: number | Date, num = 1) {
    if (typeof d === "number") d = new Date(d);
    return new Date(d.setHours(0, 0, 0, 0)).getTime() + 24 * 60 * 60 * 1000 * num;
  }

  static getFormattedDate(date = new Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  static getFormattedChineseDate(date = new Date) {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  static getFormatted24hTime(date = new Date) {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }

  static getFormattedDateTime(date = new Date) {
    return `${ this.getFormattedDate(date) } ${ this.getFormatted24hTime(date) }`;
  }

  static getFormattedSize = (size: number | string) => {
    size = Number(size) || 0;
    const f = (e: number) => Utils.getPrecisionFormatter().format(e);
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
    let minimumRequestInterval = Math.max(this.configs.getSettings("minimumRequestInterval")!, 500);
    let now = (new Date()).getTime();
    let lastRequestTime = this.configs.getSettings("lastRequestTime") || now;
    if (lastRequestTime > now + minimumRequestInterval * Values.MAX_REQUEST_COUNT) {
      console.warn("Scheduled requests have exceeded the maximum limit. New request is ignored.");
      return -1;
    }
    if (now > lastRequestTime) lastRequestTime = now;
    this.configs.setSettings("lastRequestTime", lastRequestTime + minimumRequestInterval);
    return lastRequestTime;
  }

  createRequest(config: GmXmlhttpRequestOption<"text", any>): Promise<GmResponseEvent<"text", any>> {
    const lastRequestTime = this.updateRequestTime(), now = (new Date()).getTime();
    return new Promise(resolve => {
      setTimeout(() => {
        config.onload = resp => {
          const str = resp.responseText?.trim() ?? "";
          if (str.startsWith("<script>") && str.endsWith("</script>")) {
            const yxdTokenList = str.match(/'yxd_token=[0-9a-f]+'/);
            if (yxdTokenList) {
              const url = new URL(resp.finalUrl);
              const hostname = url.hostname;
              const pathname = url.pathname;
              const index = pathname.lastIndexOf("/");
              const path = "/" + pathname.slice(1, index);
              const yxdToken = yxdTokenList[0].slice(11, -1);
              GM_cookie.set({
                name: "yxd_token",
                value: yxdToken,
                domain: hostname,
                path: path
              }, err => {
                if (err) {
                  console.warn("Failed to set `yxd_token!`");
                } else {
                  this.createRequest(config).then(resp => resolve(resp));
                }
              });
            }
          } else {
            resolve(resp);
          }
        }
        const logs = GM_getValue("mcmodderLogger")?.split(";") || [];
        if (logs.length >= Values.MAX_REQUEST_COUNT / 10) logs.shift();
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
    const r = Values.ignoredContextFormatters;
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
    let r = Utils.clearContextFormatter(e);
    return encoder.encode(r).length;
  }

  static isNodeHidden(node: Element | JQuery) {
    if ($(node).css("display") === "none") return true;
    return false;
  }

  static setButtonLoadingState(node: Element | JQuery) {
    $(node).addClass("disabled").attr("disabled", "true").append(`<i class="fa fa-pulse fa-spinner">`);
  }

  static cancelButtonLoadingState(node: Element | JQuery) {
    $(node).removeClass("disabled").removeAttr("disabled").find("i:last-child").remove();
  }

  static regulateFileName(name: string) {
    return name.replace(/[\\\/:*?"<>|]/g, '_').replace(/ /g, '_').substring(0, 255);
  }

  static addClickCopyEvent(node: JQuery, typeName: string, copyData?: string | number | (() => (string | number))) {
    node.addClass("mcmodder-copyable").click(e => {
      const text = typeof copyData === "function" ? copyData() : (copyData || e.currentTarget.textContent);
      navigator.clipboard.writeText(text.toString());
      Utils.commonMsg(`${ typeName }已成功复制到剪贴板~ (${ text })`);
    });
  }

  updateClassNameIDMap(className: string, classID: string) {
    let classNameIDMap = this.configs.getAll("classNameIDMap") ?? {};
    let idClassNameMap = this.configs.getAll("idClassNameMap") ?? {};
    classNameIDMap[className] = classID;
    idClassNameMap[classID] = className;
    GM_setValue("classNameIDMap", JSON.stringify(classNameIDMap));
    GM_setValue("idClassNameMap", JSON.stringify(idClassNameMap));
  }

  getClassNameByClassID(classID: string | number) {
    let idClassNameMap = this.configs.getAll("idClassNameMap") ?? {};
    return idClassNameMap[classID.toString()];
  }

  getClassIDByClassName(className: string) {
    let classNameIDMap = this.configs.getAll("classNameIDMap") ?? {};
    return classNameIDMap[className];
  }

  getItemTypeData(classID: number | undefined, itemType: number | string | undefined) {
    const matchedTypeList = this.parent.itemTypeList?.filter(entry => 
      (entry.classID === classID || entry.classID === 0) &&
      ((entry.typeID || 1) === (itemType || 1) || (entry.text === itemType))
    );
    return matchedTypeList?.length ? matchedTypeList[0] : undefined;
  }

  getItemTypeHTML(...args: [classID: number | undefined, itemType: number | undefined] | [itemType: ItemType | undefined]) {
    let itemType;
    if (args.length === 1) {
      itemType = args[0];
    } else {
      itemType = this.getItemTypeData(args[0], args[1]);
    }
    if (!itemType) return $(`<i class="fa fa-question-circle-o text-danger"></i>`);
    const iconFont = $(`<span class="iconfont icon">`).css("color", itemType.color);
    if (itemType.classID === 0) iconFont.html(itemType.icon);
    else iconFont.html(`<i class="fa ${itemType.icon}"></i>`);
    return iconFont;
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
    const resp = await this.createRequest({
      url: `${ this.parent.hostname }/item/${ id }.html`,
      method: "GET",
      redirect: "manual",
      anonymous: true
    });
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return Utils.parseItemDocument(doc);
  }

  async getDetailedItemByID(id: string | number) {
    if (!this.parent.currentUID) return;
    id = Number(id);
    const resp = await this.createRequest({
      url: `${ this.parent.hostname }/item/edit/${ id }/`,
      method: "GET",
      redirect: "manual"
    });
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return Utils.parseItemEditorDocument(doc);
  }

  static parseItemDocument($doc: JQuery = $(document)) {
    const keywords = $doc.find("meta[name=keywords]").attr("content").split(",");
    const itemRow = $doc.find(".item-row").first();
    const command = itemRow.find(".item-give")?.attr("data-command")?.slice(9)?.split(" ");
    const righttable = itemRow.find(".righttable tbody > tr");
    const nav = $doc.find(".common-nav li");
    const classID = Utils.abstractIDFromURL(nav.eq(4).find("a").attr("href"), "class");
    const itemType = Number(nav.eq(6).find("a").attr("href").split(`/item/list/${ classID }-`)[1].slice(0, -5));
    const res: Item = {
      id: Utils.abstractIDFromURL(itemRow.find(".tool a").first().prop("href"), "item/edit"),
      classID: classID,
      name: keywords[0],
      englishName: keywords[1],
      itemType: itemType,
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
    Utils.deleteEmptyProperties(res);
    return res;
  }

  static parseClassDocument($doc: JQuery = $(document)) {
    const name = $doc.find(".class-title h3");
    const ename = $doc.find(".class-title h4");
    const abbr = $doc.find(".class-title .short-name");
    return {
      nameNode: name,
      enameNode: ename,
      abbrNode: abbr,
      classData: {
        name: name.text(),
        englishName: ename.text(),
        abbr: abbr.text().slice(1, -1),
        cover: $doc.find(".class-cover-image img").attr("src")
      } as Class
    }
  }

  static async itemToEditorData(item: Item): Promise<McmodItemEditorData> {
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
    data["icon-32x-data"] = item.smallIcon || Utils.appendBase64ImgPrefix(Utils.getImageURLByItemID(item.id, 32)) || "";
    data["icon-128x-data"] = item.largeIcon || Utils.appendBase64ImgPrefix(Utils.getImageURLByItemID(item.id, 128)) || "";
    data["is-general-node"] = "0";
    data["is-general-parents"] = "0";
    if (item.OredictList && item.OredictList.length <= 2) data["oredict"] = item.OredictList.slice(1, -1).replaceAll(", ", ",");
    if (item.maxStackSize != undefined) data["maxstack"] = item.maxStackSize.toString();
    // if (item.tools) data["tools"] = item.tools;

    return res;
  }

  static parseItemEditorDocument($doc: JQuery = $(document)) {
    const headScript = $doc.find("head > script").last().html().split(";");
    const bodyScript = $doc.find("body > script").last().html();
    const inputs = $doc.find(".input-group");
    const nav = $doc.find(".common-nav li");
    const res: Item = {
      id: Utils.abstractIDFromURL(nav.eq(8).find("a").attr("href"), "item"),
      classID: Number(headScript[2].slice(16, -1)), // var nClassID = '1'
      creativeTabName: headScript[3].slice(23, -1), // var strItemTypeName = 'foo'
      smallIcon: Utils.appendBase64ImgPrefix(headScript[5]?.slice(7, -1)),
      largeIcon: Utils.appendBase64ImgPrefix(headScript[7]?.slice(7, -1)),
      name: inputs.find("[data-multi-id=name]").val(),
      englishName: inputs.find("[data-multi-id=ename]").val(),
      harvestTools: `[${ bodyScript.split(");addItemTools(").slice(1).map(parseInt).join(",") }]`,
      OredictList: `[${ inputs.find("[data-multi-id=oredict]").val() }]`,
      maxDurability: Number(inputs.find("[data-multi-id=damage]").val()),
      maxStackSize: Number(inputs.find("[data-multi-id=maxstack]").val()),
      registerName: inputs.find("[data-multi-id=regname]").val(),
      metadata: inputs.find("[data-multi-id=metadata]").val()
    }
    Utils.deleteEmptyProperties(res);
    const generalAlert = $(".edit-user-alert.isgeneral");
    if (generalAlert.length) res.generalTo = Utils.abstractIDFromURL(generalAlert.find("a").attr("href"), "item");
    return res;
  }

  static parseClassEditorDocument(_$doc: JQuery = $(document)) {
    // TODO ...
  }
}