import { GM_cookie } from "$";
import { AnimationFrameScheduler } from "./AnimationFrameScheduler";
import { Values } from "./Values";

export interface ThemeColorSet {
  tc1: string;
  tc2: string;
}

/**
 * 全局工具类：只承载不依赖 `Mcmodder` 上下文的静态工具函数。
 *
 * 需要读写配置/持久化状态的逻辑放在 `ConfigRepository`，需要组合根、请求日志与限速的逻辑放在
 * `WebFetchUtils`（`Mcmodder.web`）。本类没有实例，也不应再被实例化。
 */
export class Utils {
  private static m_isMac: boolean | undefined;
  /** 判断当前是否为 macOS（结果缓存，避免重复读取 UA） */
  static isMac() {
    return (this.m_isMac ??= navigator.userAgent.includes("Macintosh"));
  }

  private static m_isMobileClient: boolean | undefined;
  /** 判断当前是否为移动端客户端（匹配 Mobi/Android/iPhone，结果缓存） */
  static isMobileClient() {
    return (this.m_isMobileClient ??= !!(
      navigator.userAgent.match(/Mobi/i) ||
      navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/iPhone/i)
    ));
  }

  /** 打开 QQ 互联的 OAuth 登录窗口 */
  static toQzoneLogin() {
    window.open(
      `${Values.hostname}/plugs/loginConnect/qqConnect/oauth/index.php`,
      "TencentLogin",
      "width=755,height=515,menubar=0,scrollbars=0,resizable=0,status=1,titlebar=0,toolbar=0,location=1",
    );
  }

  /** 弹出统一样式的消息提示（优先使用百科的 `common_msg`，否则回退到 `swal`） */
  static commonMsg(message: string, isok: boolean = true, title: string = "") {
    const defaultTitle = isok ? "提示" : "错误";
    if (typeof common_msg === "function") {
      common_msg(title || defaultTitle, message, isok ? "ok" : "err");
    } else if (typeof swal === "function") {
      // 使用了 v3 的特殊 swal
      // eslint-disable-next-line
      (swal as any)({
        type: isok ? "success" : "error",
        title: defaultTitle,
        text: message,
        button: false,
        timer: 3e3,
      });
    }
  }

  /**
   * 基于 SweetAlert2 创建模态框，并支持事件拦截：
   * 当捕获阶段的事件发生在模态框内部时，阻止其继续向外冒泡并交由对应的回调处理。
   */
  static createModal(
    option: SweetAlertOption,
    interceptEvents: Record<string, (ev: Event) => unknown> = {},
  ) {
    swal.fire(option).then(() => {
      Object.entries(events).forEach(([eventName, callback]) => {
        window.removeEventListener(eventName, callback);
      });
    });
    const modal = $(".swal2-modal").get(0);
    const events: Record<string, (this: Window, ev: Event) => unknown> = {};
    Object.entries(interceptEvents).forEach(([eventName, callback]) => {
      events[eventName] = (ev: Event) => {
        const target = ev.target;
        if (target instanceof Node && !(target instanceof Document) && modal.contains(target)) {
          ev.stopPropagation();
          callback(ev);
        }
      };
    });
    Object.entries(events).forEach(([eventName, callback]) => {
      window.addEventListener(eventName, callback, true);
    });
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
    return new Promise((resolve) => {
      GM_cookie.list({ name: "_uuid" }, (cookies, err) => {
        if (err) console.warn("读取 `_uuid` cookie 失败，回退至 document.cookie：", err);
        resolve(cookies?.length ? cookies[0].value : $.cookie("_uuid") || "");
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
    return new Promise((resolve) => {
      GM_cookie.set(
        {
          name: "_uuid",
          value: uuid,
          domain: ".mcmod.cn",
          path: "/",
          // 妥协mcmod的httponly以及保证XSS不能偷取用户cookie
          httpOnly: true,
          secure: true,
          expirationDate:
            expirationDate && expirationDate > 0 ? Math.floor(expirationDate / 1e3) : undefined,
        },
        (err) => {
          if (err) {
            console.warn("写入 `_uuid` cookie 失败：", err);
            resolve(false);
            return;
          }
          resolve(true);
        },
      );
    });
  }

  /** 删除 `_uuid` cookie（退出登录），返回是否删除成功 */
  static deleteUuidCookie(): Promise<boolean> {
    if (!Utils.supportCookieAPI()) {
      console.warn("当前脚本管理器不支持 `GM_cookie`，无法删除 HttpOnly cookie `_uuid`。");
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      GM_cookie.delete({ name: "_uuid" }, (err) => {
        if (err) {
          console.warn("删除 `_uuid` cookie 失败：", err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  /** 转发到百科原生的 `showTaskTip`，弹出任务/成就提示 */
  static showTaskTip(
    imageUrl: string,
    title: string,
    text: string,
    achieveTime: string,
    progress: number,
    rewardExp: number | string,
  ) {
    showTaskTip(imageUrl, title, text, achieveTime, progress, rewardExp);
  }

  /** 将 `value` 限制在 `[min, max]` 区间内 */
  static clamp(value: number, min = 0, max = 1) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  /** 判断 `value` 是否落在 `[min, max]` 区间内 */
  static isClamp(value: number, min = 0, max = 1) {
    return value >= min && value <= max;
  }

  /** 比较两个点分版本号：`v1>v2` 返回 1，`v1<v2` 返回 -1，相等返回 0 */
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

  /** 校验 `version` 是否受指定 `loaderID` 支持（支持列表为空视为全支持，`>=` 前缀表示最低版本） */
  static validateVersionForLoaderID(version: string, loaderID: string) {
    const list = Values.loaderSupportVersions[
      loaderID as keyof typeof Values.loaderSupportVersions
    ] as Readonly<string[]> | undefined;
    return (
      !list ||
      list.includes(version) ||
      (list[0].includes(">=") && this.versionCompare(version, list[0].split(">=")[1]) > -1)
    );
  }

  /** 将 `loaderName` 映射为 loaderID 后，校验 `version` 是否受支持 */
  static validateVersionForLoaderName(version: string, loaderName: string) {
    return this.validateVersionForLoaderID(
      version,
      Values.loaderID[loaderName as keyof typeof Values.loaderID],
    );
  }

  /** 比较两个简单**可序列化**对象是否值相等 */
  static isEqual(a: unknown, b: unknown, vis = new WeakSet<WeakKey>()) {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;

    const keysA = Reflect.ownKeys(a);
    const keysB = Reflect.ownKeys(b);
    if (keysA.length !== keysB.length) return false;
    if (vis.has(a) || vis.has(b)) return false;
    vis.add(a);
    vis.add(b);

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (
        !Utils.isEqual(
          (a as Record<PropertyKey, unknown>)[key],
          (b as Record<PropertyKey, unknown>)[key],
          vis,
        )
      )
        return false;
    }
    return true;
  }

  /** 检查一个对象是否只是空数组或者空对象的嵌套，而不含有效的值 */
  static isEmpty(obj: unknown, vis = new WeakSet<WeakKey>()) {
    if (obj === undefined || obj === null || obj === "") return true;

    if (Array.isArray(obj) && obj.some((el) => !Utils.isEmpty(el, vis))) return false;

    if (typeof obj !== "object") return false;

    const keys = Reflect.ownKeys(obj);
    if (vis.has(obj)) return true;
    vis.add(obj);
    if (keys.some((key) => !Utils.isEmpty((obj as Record<PropertyKey, unknown>)[key], vis)))
      return false;
    return true;
  }

  /** 简易深拷贝（JSON 序列化实现，不保留函数/原型等） */
  static simpleDeepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /** 复杂深拷贝（当前实现同 `simpleDeepCopy`，TODO 待完善） */
  static complexDeepCopy<T>(obj: T) {
    // TODO ...
    return Utils.simpleDeepCopy(obj);
  }

  /** 就地删除对象中值为 `undefined`/`null`/`NaN` 的属性 */
  static deleteEmptyProperties(obj: object) {
    let val;
    (Object.keys(obj) as (keyof typeof obj)[]).forEach((key) => {
      val = obj[key];
      if (val === undefined || val === null || (typeof val === "number" && isNaN(val)))
        delete obj[key];
    });
  }

  static isKeyOfObject<T extends object>(obj: T, key: PropertyKey): key is keyof T {
    return Object.hasOwn(obj, key);
  }

  static getKeyValueOfObject<
    T extends Readonly<Record<PropertyKey, unknown>>,
    K extends PropertyKey,
  >(obj: T, key: K) {
    return obj[key] as ValueOf<T> | undefined;
  }

  static getKeys<T extends object>(obj: T) {
    return Object.keys(obj) as (keyof T)[];
  }

  static getEntries<T extends object>(obj: T) {
    return Object.entries(obj) as [keyof T, ValueOf<T>][];
  }

  static isHTMLElement(node: Node): node is HTMLElement {
    return node.nodeType === Node.ELEMENT_NODE;
  }

  static isTextNode(node: Node): node is Text {
    return node.nodeType === Node.TEXT_NODE;
  }

  /** 生成 `[l, r)` 内步长为 `step` 的整数序列（`l`/`r` 须为整数，`step` 为正整数） */
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

  /**
   * 生成用户资料摘要（用户组/等级/编辑数与字节数/登录到期状态），以 ` · ` 连接，可返回纯文本或 HTML。
   *
   * @param profile 已取到的 `Profile` 对象。
   * @param showLv 是否在摘要中追加等级（`Lv.X`）。
   * @param plainText 为 true 时返回纯文本；为 false 时返回 HTML（登录到期状态会渲染为带样式的提示）。
   */
  static getProfileAbstract(profile: Profile, showLv = false, plainText = false) {
    if (!Object.keys(profile).length) {
      const text = "用户信息获取失败...";
      return plainText ? text : `<span class="text-danger">${text}</span>`;
    }
    const content = [profile.userGroup];
    if (showLv) content.push(`Lv.${profile.lv}`);
    if (profile.editNum) content.push(`${profile.editNum.toLocaleString()} 次编辑`);
    if (profile.editByte) content.push(`${profile.editByte.toLocaleString()} 字节`);
    if (profile.expirationDate && !plainText) {
      if (profile.expirationDate > Date.now())
        content.push(`登录信息 <span class="mcmodder-timer-pre" /> 后过期`);
      else content.push(`<span class="text-danger">登录信息已过期（须重新登录以刷新状态）</span>`);
    }
    return content.join(" · ");
  }

  /** 当前用户组是否可以进入通用后台 */
  static hasAdminAccess(permission: Permission) {
    return permission === "editor" || permission === "manager" || permission === "admin";
  }

  /** 当前用户组是否可以进入模组区审核，且可以通过/退回编辑（即并非只是审核助理） */
  static hasVerifyOperateAccess(permission: Permission) {
    return permission === "manager" || permission === "admin";
  }

  /** 当前用户组是否可以进入模组区审核（包括审核助理） */
  static hasVerifyAccess(permission: Permission) {
    return this.hasAdminAccess(permission);
  }

  /** 当前用户组是否可以进入文件管理后台 */
  static hasModfileDLAccess(permission: Permission) {
    return permission === "developer" || permission === "manager" || permission === "admin";
  }

  /** 播放提示音（默认升级音效） */
  static playsound(url = Values.assets.mcmod.level.levelup) {
    const task_audio = document.createElement("audio");
    task_audio.setAttribute("muted", "muted");
    task_audio.setAttribute("src", url);
    task_audio.play();
  }

  /** 将形如 `rgb(r,g,b)` 的字符串转换为 `#rrggbb` */
  static rgbToHex(s: string) {
    return (
      "#" +
      s
        .replace(/(?:\(|\)|RGB|rgb)*/g, "")
        .split(",")
        .map((e) => parseInt(e))
        .reduce((p, q) => (p << 8) + q)
        .toString(16)
        .padStart(6, "0")
    );
  }

  /** 获取指定小数位精度的数字格式化器（`Intl.NumberFormat`） */
  static getPrecisionFormatter(minDigit = 0, maxDigit = 2) {
    return Intl.NumberFormat("en-US", {
      minimumFractionDigits: minDigit,
      maximumFractionDigits: maxDigit,
    });
  }

  /** 将毫秒时长格式化为易读字符串（如 `1m 23s`），负值返回 `-` */
  static getFormattedTime(t: number) {
    if (t < 0) return `-`;
    if (t < 1e3) return `${t}ms`;
    if (t < 5e3) return `${Math.floor(t / 1e3)}s ${t % 1e3}ms`;
    if (t < 6e4) return `${Math.floor(t / 1e3)}s`;
    if (t < 3.6e6) return `${Math.floor(t / 6e4)}m ${Math.floor((t % 6e4) / 1e3)}s`;
    if (t < 8.64e7) return `${Math.floor(t / 3.6e6)}h ${Math.floor((t % 3.6e6) / 6e4)}m`;
    return `${Math.floor(t / 8.64e7)}d`;
  }

  /** 将时长格式化为中文相对时间（如 `3天前`/`5分后`），差值小于 1s 返回 `刚刚` */
  static getFormattedChineseTime(t: number) {
    let a;
    const b = t < 0 ? "前" : "后";
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

  /** 将数字缩写为带 k/M/G/T 单位的字符串 */
  static getFormattedNumber(n: number) {
    if (n >= 1e12) return (n / 1e12).toFixed(Number(n % 1e12 !== 0)) + "T";
    if (n >= 1e9) return (n / 1e9).toFixed(Number(n % 1e9 !== 0)) + "G";
    if (n >= 1e6) return (n / 1e6).toFixed(Number(n % 1e6 !== 0)) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(Number(n % 1e3 !== 0)) + "k";
    return n.toString();
  }

  /**
   * 拼接模组完整名称：`[abbr] name (ename)`。
   *
   * 若传入的参数类型是 {@link McmodClassEditorInnerData}，且 `isClassAdd = true`，
   * 则返回串中的 `abbr` 将被替换为 {@link McmodClassEditorInnerData.category}
   * 中的首个**核心元素**的名称；若 `isClassAdd = false`，则 `abbr` 总是会被置空，
   * 以同步后台待审列表中模组类编辑项的单元格内容的行为。
   */
  static getClassFullName(name: string, ename: string, abbr: string): string;
  static getClassFullName(data: Class): string | undefined;
  static getClassFullName(data: McmodClassEditorInnerData, isClassAdd: boolean): string | undefined;
  static getClassFullName(
    ...args:
      | [name: string, ename: string, abbr: string]
      | [data: Class]
      | [data: McmodClassEditorInnerData, isClassAdd: boolean]
  ) {
    const { name, ename, abbr } = (() => {
      if (args.length === 3)
        return {
          name: args[0],
          ename: args[1],
          abbr: args[2],
        };
      const data = args[0];
      if ("englishName" in data)
        return {
          name: data.name,
          ename: data.englishName,
          abbr: data.abbr,
        };
      const isClassAdd = args[1];
      // 用户可能只勾了杂项元素（甚至一个都没勾）；这时没有核心分类可选，
      // 列表仍要能显示名称，不能因为分类缺失就抛错
      const categories = Object.values(data.category ?? {})
        .map((value) => Values.classCategoryValueMap[value])
        .filter((category) => category?.type === 0);
      return {
        name: data.name,
        ename: data.ename,
        abbr: isClassAdd ? (categories[0]?.name ?? "") : "",
      };
    })();
    if (!name) return undefined;
    let res = "";
    if (abbr) res += `[${abbr}] `;
    res += name;
    if (ename) res += ` (${ename})`;
    return res;
  }

  /** 解析模组完整名称，拆分为 `{ className, classEname, classAbbr }` */
  static parseClassFullName(fullName: string): ClassName {
    let abbr = "",
      name = "",
      ename = "",
      indexOf: number;
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
      classAbbr: abbr.trim(),
    };
  }

  /** 拼接物品完整名称：`name (ename)`，无英文名时仅返回名称 */
  static getItemFullName(name: string, ename?: string): string;
  static getItemFullName(data: Item): string | undefined;
  static getItemFullName(data: McmodItemEditorInnerData): string | undefined;
  static getItemFullName(
    ...args: [name: string, ename?: string | null] | [data: Item] | [data: McmodItemEditorInnerData]
  ) {
    const { name, ename } = (() => {
      if (typeof args[0] === "string")
        return {
          name: args[0],
          ename: args[1],
        };
      const name = args[0].name ?? "";
      if ("ename" in args[0])
        return {
          name,
          ename: args[0].ename,
        };
      if ("englishName" in args[0])
        return {
          name,
          ename: args[0].englishName,
        };
      return { name };
    })();
    let res = name.trim();
    const trimedEname = ename?.trim();
    if (trimedEname) res += ` (${trimedEname})`;
    return res;
  }

  /** 解析物品完整名称，拆分为 `{ name, englishName }` */
  static parseItemFullName(fullName: string) {
    const pos = fullName.lastIndexOf(" (");
    const name = pos >= 0 ? fullName.slice(0, pos) : fullName;
    const englishName = pos >= 0 ? fullName.slice(pos + 2, -1) : "";
    return { name, englishName };
  }

  /** 下载图片 URL 并转为 Base64 DataURL，失败返回 null */
  static async imageURL2base64(url: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return Utils.blob2Base64(blob);
    } catch (error) {
      console.error("Error converting image to Base64: ", error);
      return null;
    }
  }

  /** 将 Blob 读取为 Base64 DataURL 字符串 */
  static async blob2Base64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") resolve(result);
        else resolve("");
      };
      reader.onerror = () => reject;
      reader.readAsDataURL(blob);
    });
  }

  /** 将 Base64 DataURL 转换为 Blob，优先按前缀识别 MIME 类型 */
  static base642Blob(base64: string, defaultMimeType = "application/octet-stream") {
    const mimeType = Utils.getBase64MimeType(base64) ?? defaultMimeType;
    const base64Data = Utils.removeBase64ImgPrefix(base64)!;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }

  /** 将 Blob 读取为文本 */
  static blobToText(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(blob);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  }

  /** 若字符串缺少 DataURL 前缀，则补上 `data:<mime>;base64,`（默认 image/png） */
  static appendBase64ImgPrefix(v?: string, defaultMimeType?: string) {
    const mimeType = defaultMimeType ?? "image/png";
    if (v && v.slice(0, 11) !== "data:image/") return `data:${mimeType};base64,${v}`;
    return v;
  }

  /** 去除 DataURL 前缀，仅保留 Base64 内容 */
  static removeBase64ImgPrefix(v?: string) {
    if (v && v.slice(0, 11) === "data:image/") return v.split(";base64,")[1];
    return v;
  }

  /** 从 DataURL 中提取 MIME 类型，非 DataURL 返回 undefined */
  static getBase64MimeType(v?: string) {
    if (v === undefined) return undefined;
    if (!v.startsWith("data:")) return undefined;
    const pos = v?.indexOf(";base64,");
    if (pos < 0) return undefined;
    return v.slice(5, pos);
  }

  /** 触发浏览器下载，保存文本内容或 Blob 为文件 */
  static saveFile(fileName: string, content: string | Blob) {
    const blob = content instanceof Blob ? content : new Blob([content]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    // 立刻 revoke 会让部分浏览器拿不到内容，等一拍再释放
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  /** 延迟 `ms` 毫秒的异步等待 */
  static sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
  }

  /**
   * 高亮指定 jQuery 节点：添加 `mcmodder-mark-<color>` 类，可滚动到视口并在超时后移除高亮。
   *
   * @param jQueryNode 要高亮的目标节点。
   * @param color 高亮颜色，限 `gold`/`pink`/`aqua`/`greenyellow` 之一。
   * @param timeout 高亮持续毫秒数；`0`（默认）表示不自动移除。
   * @param scrollIntoView 是否先将节点平滑滚动到视口中央。
   */
  static highlight(jQueryNode: JQuery, color = "gold", timeout = 0, scrollIntoView = false) {
    const validColor = ["gold", "pink", "aqua", "greenyellow"];
    if (!validColor.includes(color)) {
      console.error(`Highlight color parameter must be within: [${validColor.join(", ")}]`);
      return;
    }
    const className = `mcmodder-mark-${color}`;
    jQueryNode.addClass(className);
    if (scrollIntoView)
      jQueryNode.get(0).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    if (timeout > 0) setTimeout(() => jQueryNode.removeClass(className), timeout);
  }

  /** 从 URL 中提取指定类型路径下的标识（字符串，如 `item/123.html` → `123`） */
  static abstractLastFromURL(url: string, typeList: string | string[]) {
    if (!url || !typeList) return "";
    if (!(typeList instanceof Array)) typeList = [typeList];
    let res;
    for (const type of typeList) {
      if (url.includes(type)) {
        res = url.split(`/${type}/`)?.[1]?.split(".html")?.[0]?.split("/")?.[0];
        break;
      }
    }
    return res ?? "";
  }

  /** 从 URL 中提取指定类型路径下的数字 ID（如 `item/123.html` → 123） */
  static abstractIDFromURL(url: string, typeList: string | string[]) {
    return Number(Utils.abstractLastFromURL(url, typeList));
  }

  /**
   * 按物品 ID 生成图标 URL。
   *
   * @param id 物品 ID，`0` 用于无图标或图标加载失败时的展示
   * @param width 物品宽度，限 32/36/128/144
   * @param ver 缓存版本号
   */
  static getImageURLByItemID(id: number, width = 32, ver = 0) {
    const validSize = [32, 36, 128, 144];
    if (!validSize.includes(width)) {
      console.error(`Image size parameter must be within: [${validSize.join(", ")}]`);
      return "";
    }
    if (!id) return `https://i.mcmod.cn/item/icon/${width}x${width}/0.png?v=${ver}`;
    return `https://i.mcmod.cn/item/icon/${width}x${width}/${Math.floor(id / 1e4)}/${id}.png?v=${ver}`;
  }

  /** 生成物品资料页 URL */
  static getItemURL(id: number) {
    return `${Values.hostname}/item/${id}.html`;
  }

  /** 生成物品资料编辑页 URL */
  static getItemEditURL(id: number) {
    return `${Values.hostname}/item/edit/${id}/`;
  }

  /** 生成物品类型列表页 URL */
  static getItemTypeURL(classID: number, typeID: number) {
    return `${Values.hostname}/item/list/${classID}-${typeID}.html`;
  }

  /** 生成模组页 URL */
  static getClassURL(id: number) {
    return `${Values.hostname}/class/${id}.html`;
  }

  /** 生成整合包页 URL */
  static getModpackURL(id: number) {
    return `${Values.hostname}/modpack/${id}.html`;
  }

  /** 生成作者页 URL */
  static getAuthorURL(id: number) {
    return `${Values.hostname}/author/${id}.html`;
  }

  /** 生成矿物词典/物品标签页 URL */
  static getOredictURL(oredict: string) {
    return `${Values.hostname}/oredict/${oredict}-1.html`;
  }

  /**
   * 解析矿物词典/物品标签的序列化字符串（如 `[minecraft:planks,forge:ingots/gold]`）。
   *
   * 兼容各导出器的差异：允许逗号后带空格（IRR、IconR 的 Forge 移植）、首尾多余空白，
   * 缺少方括号时也能解析；空串与 `[]` 都返回空数组。
   */
  static parseOredictList(serialized?: string) {
    if (!serialized) return [];
    const inner =
      serialized.startsWith("[") && serialized.endsWith("]") ? serialized.slice(1, -1) : serialized;
    return inner
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  /** 生成用户个人中心页 URL */
  static getCenterURL(id: number) {
    return `https://center.mcmod.cn/${id}/`;
  }

  /** 生成新窗口打开的目标 `<a>` 元素，文本缺省为 URL 本身 */
  static URLToAnchor(url: string, text?: string) {
    return $("<a>")
      .attr({
        target: "_blank",
        href: url,
      })
      .text(text ?? url);
  }

  /**
   * 将文本节点**替换**为 `<a>` 元素，同时根据原始的内容来设置该元素的内嵌文本与 `href`。
   * 如果原始内容不符合链接格式，则直接跳过以避免 XSS。
   *
   * @param data 如果额外传入该参数，则原始内容将以该参数为准
   */
  static textToAnchor(text: Text, data?: string) {
    const link = data ?? text.data;
    try {
      new URL(link);
    } catch {
      return;
    }
    const anchor = document.createElement("a");
    anchor.target = "_blank";
    anchor.href = link;
    anchor.innerText = link;
    text.replaceWith(anchor);
    return anchor;
  }

  /** 将版本号数组转为字符串（`[1,1,x]` 统一显示为「远古版本」） */
  static versionArrayToString(arr: number[]) {
    if (arr[0] === 1 && arr[1] === 1) return "远古版本"; // 远古版本统一视为 1.1.0
    if (!arr[2]) arr = arr.slice(0, 2);
    return arr.join(".");
  }

  /** 将 `#rrggbb`/`#rrggbbaa`/`#rgb`/`#rgba` 颜色字符串解析为 RGB/RGBA 对象，格式错误抛出异常 */
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
      case 7:
        return {
          r: dec >> 16,
          g: (dec & 0x00ff00) >> 8,
          b: dec & 0x0000ff,
        };
      case 9:
        return {
          r: dec >>> 24,
          g: (dec & 0x00ff0000) >> 16,
          b: (dec & 0x0000ff00) >> 8,
          a: dec & (0x000000ff / 0xff),
        };
      case 4:
      case 5: {
        const t = ["#"];
        for (let i = 1; i < color.length; i++) {
          t.push(color.charAt(i).repeat(2));
        }
        return this.colorToRGB(t.join(""));
      }
      default:
        throw colorFormatError;
    }
  }

  /** 解析 `rgb(...)`/`rgba(...)` 字符串为 RGB/RGBA 对象，无法匹配时返回 null */
  static parseRGB(str: string): RGB | RGBA | null {
    if (/rgb\([0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3}\)/.test(str)) {
      const numList = str.match(/[0-9]{1,3}/g)!.map(Number);
      return {
        r: numList[0],
        g: numList[1],
        b: numList[2],
      };
    } else if (/rgba\([0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3},\s[0-9]{1,3}\)/.test(str)) {
      const numList = str.match(/[0-9]{1,3}/g)!.map(Number);
      return {
        r: numList[0],
        g: numList[1],
        b: numList[2],
        a: numList[3],
      };
    } else {
      return null;
    }
  }

  /** 将 RGB/RGBA 对象转为 `#rrggbb`/`#rrggbbaa` 字符串 */
  static RGBToColor(rgb: RGB) {
    const a = (rgb as RGBA).a;
    let dec = (rgb.r << 16) + (rgb.g << 8) + rgb.b;
    if (a != undefined) dec = dec * 256 + Math.round(a * 0xff);
    return "#" + dec.toString(16).padStart(a != undefined ? 8 : 6, "0");
  }

  /** 将 RGB/RGBA 对象转为 HSL/HSLA 对象（h 为 0-360 度，s/l 为 0-100） */
  static RGBToHSL(rgb: RGB): HSL | HSLA {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h: number,
      s: number,
      l = (max + min) / 2;

    if (delta === 0) {
      h = s = 0;
    } else {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / delta) % 6;
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        case b:
          h = (r - g) / delta + 4;
          break;
        default:
          h = -1;
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

  /** 将 HSL/HSLA 对象转为 RGB/RGBA 对象 */
  static HSLToRGB(hsl: HSL): RGB | RGBA {
    const h = hsl.h;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    const a = (hsl as HSLA).a;

    const c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    if (a != undefined) {
      return { r: r, g: g, b: b, a: a };
    }
    return { r: r, g: g, b: b };
  }

  /** 将颜色字符串或 RGB 对象转为 HSL 对象 */
  static colorToHSL(color: string | RGB) {
    const rgb = typeof color === "string" ? this.colorToRGB(color) : color;
    return this.RGBToHSL(rgb);
  }

  /** 将 HSL 对象转为 `#rrggbb` 字符串 */
  static HSLToColor(hsl: HSL) {
    return this.RGBToColor(this.HSLToRGB(hsl));
  }

  /** 按比例调整颜色明度：`ratio<1` 变暗，`ratio>1` 向纯色方向提亮 */
  static adjustColorBrightness = (color: string | RGB, ratio: number) => {
    const hsl = Utils.colorToHSL(color);
    let lightness = hsl.l;
    if (ratio < 1) lightness *= ratio;
    else lightness += (100 - lightness) * (ratio - 1);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: this.clamp(lightness, 0, 100),
    });
  };

  /** 反转颜色明度（lightness 取 100-l） */
  static reverseColorBrightness = (color: string | RGB) => {
    const hsl = Utils.colorToHSL(color);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: 100 - hsl.l,
    });
  };

  /** 设置颜色的明度为指定 lightness 值（自动限制在 0-100） */
  static setColorBrightness = (color: string | RGB, lightness: number) => {
    const hsl = Utils.colorToHSL(color);
    return this.HSLToColor({
      h: hsl.h,
      s: hsl.s,
      l: this.clamp(lightness, 0, 100),
    });
  };

  /** 设置颜色的透明度（alpha 自动限制在 0-1），返回 `#rrggbbaa` */
  static setColorAlpha(color: string, alpha: number) {
    const rgb = this.colorToRGB(color);
    return this.RGBToColor({
      r: rgb.r,
      g: rgb.g,
      b: rgb.b,
      a: this.clamp(alpha),
    } as RGBA);
  }

  /** 生成跨平台 Ctrl 组合键：macOS 用 metaKey，其余用 ctrlKey */
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

  /** 将 Key 对象拆解为修饰键+主键的字符串序列（如 `["Ctrl","Shift","C"]`） */
  static keyToRawList(e: Key) {
    // if (!(e instanceof Object)) e = JSON.parse(e);
    if (!e.key && !e.keyCode) return [];
    const k = [];
    let c;
    if (e.ctrlKey) k.push(Utils.isMac() ? "Control" : "Ctrl");
    if (e.shiftKey) k.push("Shift");
    if (e.altKey) k.push(Utils.isMac() ? "Option" : "Alt");
    if (e.metaKey) k.push(Utils.isMac() ? "Command" : "Meta");
    if (!e.key || !["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      if (e.keyCode) {
        if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 98 && e.keyCode <= 123))
          c = String.fromCharCode(e.keyCode).toUpperCase();
        else if (e.keyCode >= 48 && e.keyCode <= 57) c = String.fromCharCode(e.keyCode);
        else c = e.key;
      } else c = e.key;
      k.push(c);
    }
    return k;
  }

  /** 将 Key 对象渲染为 `Ctrl + C` 形式的文本，空键返回「未指定」 */
  static keyToString(e: Key) {
    const list = Utils.keyToRawList(e);
    if (!list.length) return "未指定";
    return list.join(" + ");
  }

  /**
   * 在 Vue 组件中，请优先使用 `KeyDisplay` 子组件
   */
  static keyToHTML(e: Key) {
    const list = Utils.keyToRawList(e);
    const isMac = Utils.isMac();
    const HTMLList = list.map((data) => {
      if (isMac) {
        switch (data) {
          case "Ctrl":
          case "Control":
            data = "⌃‌";
            break;
          case "Shift":
            data = "⇧";
            break;
          case "Alt":
          case "Option":
            data = "⌥";
            break;
          case "Meta":
          case "Command":
            data = "⌘";
        }
      }
      return `<kbd>${data}</kbd>`;
    });
    return HTMLList.join("");
  }

  /** 判断按键 `b` 是否与 `a` 匹配（修饰键必须全满足，keyCode 忽略大小写差异） */
  static isKeyMatch(a: Key, b: Key) {
    // b需要匹配a
    if (!Object.keys(a).length) return false;
    if (a.ctrlKey && !b.ctrlKey) return false;
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

  /** 生成指定长度的随机字符串（字母数字+下划线） */
  static randStr(l = 32) {
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
    const n = t.length;
    let r = "";
    for (let i = 0; i < l; i++) r += t.charAt(Math.floor(Math.random() * n));
    return r;
  }

  private static readonly escapeHTMLMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  /** 转义 HTML 特殊字符，防止注入 */
  static escapeHTML(str: string | number) {
    return str
      .toString()
      .replace(/[&<>"']/g, (char) => Utils.escapeHTMLMap[char as keyof typeof Utils.escapeHTMLMap]);
  }

  /** 获取元素相对文档的绝对坐标（含滚动偏移） */
  static getAbsolutePos(node: Element) {
    const rect = node.getBoundingClientRect();
    return {
      x: window.scrollX + rect.left,
      y: window.scrollY + rect.top,
    };
  }

  // private static readonly segmenter = typeof Intl.Segmenter === "function" ?
  //   new Intl.Segmenter("zh-Hans", {
  //     granularity: "word"
  //   }) : undefined;

  // static tokenize(text: string, withRange?: false): string[];
  // static tokenize(text: string, withRange: true): [string, [number, number]][];
  // static tokenize<V extends boolean | undefined = false>(text: string, withRange: V = undefined as V) {
  //   type VT = [string, [number, number]];
  //   type VF = string;
  //   const lowerCase = text.toLowerCase();
  //   const cnTokens: (VT | VF)[] = [];

  //   // 分词
  //   if (Utils.segmenter !== undefined) {
  //     for (const { index, segment, isWordLike } of Utils.segmenter.segment(lowerCase)) {
  //       if (!isWordLike || segment.length === 2) { // 二元组已被下文操作覆盖
  //         continue;
  //       }
  //       if (withRange) {
  //         cnTokens.push([segment, [index, index + segment.length]] );
  //       } else {
  //         cnTokens.push(segment);
  //       }
  //     }
  //   }

  //   // 二元组
  //   const reg = /[\p{Script=Han}]+/gu;
  //   if (withRange) {
  //     for (const run of lowerCase.matchAll(reg)) {
  //       const index = run.index;
  //       const substr = run[0];
  //       for (let i = 0; i < substr.length - 1; i++) {
  //         cnTokens.push([substr.slice(i, i + 2), [index + i, index + i + 2]]);
  //       }
  //     }
  //   } else {
  //     for (const substr of lowerCase.match(reg) ?? []) {
  //       for (let i = 0; i < substr.length - 1; i++) {
  //         cnTokens.push(substr.slice(i, i + 2));
  //       }
  //     }
  //   }

  //   // 拼音转换
  //   const transform = (token: VT | VF, style: IPinyinStyle) => {
  //     const text = withRange ? token[0] : token as string;
  //     const py = pinyin(text, { style }).join("");
  //     return withRange ? [py, token[1]] : py;
  //   }
  //   const pinyinFull = cnTokens.map(token => transform(token, "normal"));
  //   const pinyinInit = cnTokens.map(token => transform(token, "first_letter"));

  //   return [...cnTokens, ...pinyinFull, ...pinyinInit] as V extends true ? VT[] : VF[];
  // }

  /** 防抖包装：`wait` 毫秒内重复调用只执行最后一次 */
  static debounce = <T extends (...args: never[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
  };

  /** 节流包装：`wait` 毫秒内最多执行一次 */
  static throttle = <T extends (...args: never[]) => void>(func: T, wait: number) => {
    let lastTime = 0;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      const now = Date.now();
      if (now - lastTime >= wait) {
        func.apply(this, args);
        lastTime = now;
      }
    };
  };

  /** 基于 `requestAnimationFrame` 的节流：每帧最多执行一次 */
  static animationThrottle = <T extends (...args: never[]) => void>(func: T, priority = 0) => {
    let isTicking = false;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      if (!isTicking) {
        AnimationFrameScheduler.add(() => {
          func.apply(this, args);
          isTicking = false;
        }, priority);
        isTicking = true;
      }
    };
  };

  /**
   * 向指定文档的 head 注入 `<style>`，可用 `id` 去重。
   *
   * @param value 要注入的 CSS 文本。
   * @param id 样式标签的 id；若该 id 已存在则跳过注入。
   * @param doc 目标文档（默认当前 document，如编辑器 iframe 可传其 `document`）。
   */
  static addStyle(value: string, id = "", doc = document) {
    if (id && doc.getElementById(id)) return;
    const style = $('<style type="text/css">').appendTo($("head", doc)).html(value);
    if (id) style.attr("id", id);
  }

  /**
   * 按 `href` 或内联 `content` 加载样式表，返回加载完成/失败的 Promise，可用 `id` 去重。
   *
   * @param loc 挂载 `<link>` 的宿主元素。
   * @param content 内联 CSS 内容（与 `href` 二选一）。
   * @param href 外部样式表地址（与 `content` 二选一）。
   * @param type 样式类型（默认 `"text/css"`）。
   * @param id 标签 id；若目标文档中已存在该 id 则直接 resolve。
   */
  static loadStyle(
    loc: HTMLElement,
    content?: string | null,
    href?: string | null,
    type?: string | null,
    id?: string,
  ) {
    if (id && loc.ownerDocument.getElementById(id)) {
      return new Promise<void>((resolve) => {
        resolve();
      });
    }
    return new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
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

  /**
   * 向指定位置注入 `<script>`（内联 `content` 或外部 `src`），不等待加载结果。
   *
   * @param loc 挂载 `<script>` 的宿主元素。
   * @param content 内联脚本内容（与 `src` 二选一）。
   * @param src 外部脚本地址（与 `content` 二选一，以 async 方式加载）。
   * @param type 脚本类型（默认 `"text/JavaScript"`）。
   */
  static addScript(loc: HTMLElement, content: string | null, src?: string, type?: string) {
    const script = document.createElement("script");
    script.type = type ? type : "text/JavaScript";
    if (content) script.innerHTML = content;
    else if (src) {
      script.src = src;
      script.async = true;
    }
    loc.appendChild(script);
  }

  /**
   * 按 `src` 或内联 `content` 加载脚本，返回加载完成/失败的 Promise，可用 `id` 去重。
   *
   * @param loc 挂载 `<script>` 的宿主元素。
   * @param content 内联脚本内容（与 `src` 二选一）。
   * @param src 外部脚本地址（与 `content` 二选一）。
   * @param type 脚本类型（默认 `"text/JavaScript"`）。
   * @param id 标签 id；若目标文档中已存在该 id 则直接 resolve。
   * @param timeout 超时毫秒数；默认不限制，失败或超时会移除脚本标签。
   */
  static loadScript(
    loc: HTMLElement,
    content?: string | null,
    src?: string | null,
    type?: string | null,
    id?: string,
    timeout = 0,
  ) {
    if (id && loc.ownerDocument.getElementById(id)) {
      return new Promise<void>((resolve) => {
        resolve();
      });
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = type ? type : "text/JavaScript";
      if (id) script.id = id;
      if (src) script.src = src;
      if (content) script.innerHTML = content;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (error?: Error) => {
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) {
          script.remove();
          reject(error);
        } else {
          resolve();
        }
      };
      script.onload = () => finish();
      script.onerror = () => finish(new Error(`脚本加载失败：${src ?? id ?? "内联脚本"}`));
      if (timeout > 0) {
        timer = setTimeout(() => finish(new Error(`脚本加载超时：${src}`)), timeout);
      }
      loc.appendChild(script);
    });
  }

  /**
   * 并行加载多个外部脚本，全部完成后 resolve。
   *
   * @param loc 挂载 `<script>` 的宿主元素。
   * @param srcList 待加载的外部脚本地址列表。
   * @param type 脚本类型（默认 `"text/JavaScript"`）。
   * @param id 标签 id（多个脚本共享同一 id，先到先得）。
   */
  static loadScripts(loc: HTMLElement, srcList: string[], type?: string | null, id?: string) {
    return Promise.all(srcList.map((src) => this.loadScript(loc, null, src, type, id)));
  }

  /** 获取 UTC-8 时区下 0 点的毫秒时间戳，`num` 为相对天数偏移（正数向后，负数向前） */
  static getStartTime(d: number | Date, num = 1) {
    const time = typeof d === "number" ? d : d.getTime();
    // UTC-8 为固定偏移（无夏令时），先将时间平移到 UTC-8 的本地坐标再按整天取整
    const offset = 8 * 60 * 60 * 1000;
    const day = 24 * 60 * 60 * 1000;
    return Math.floor((time + offset) / day) * day - offset + day * num;
  }

  /** 格式化为 `YYYY-M-D` 日期字符串 */
  static getFormattedDate(date: Date | number = new Date()) {
    if (typeof date === "number") date = new Date(date);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
  }

  /** 格式化为 `YYYY年M月D日` 中文日期字符串 */
  static getFormattedChineseDate(date: Date | number = new Date()) {
    if (typeof date === "number") date = new Date(date);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  /** 格式化为 `HH:MM:SS` 24 小时制时间字符串 */
  static getFormatted24hTime(date: Date | number = new Date()) {
    if (typeof date === "number") date = new Date(date);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
  }

  /** 格式化为 `YYYY-M-D HH:MM:SS` 日期时间字符串 */
  static getFormattedDateTime(date: Date | number = new Date()) {
    if (typeof date === "number") date = new Date(date);
    return `${this.getFormattedDate(date)} ${this.getFormatted24hTime(date)}`;
  }

  /** 将字节数格式化为 B/KiB/MiB/GiB，保留两位小数 */
  static getFormattedSize = (size: number | string) => {
    size = Number(size) || 0;
    const f = (e: number) => Utils.getPrecisionFormatter().format(e);
    if (size < 1024) return f(size) + " B";
    else if (size < 1048576) return f(size / 1024) + " KiB";
    else if (size < 1073741824) return f(size / 1048576) + " MiB";
    else return f(size / 1073741824) + " GiB";
  };

  /** 将含 Minecraft 格式化代码（`§`）的字符串渲染为带样式的 HTML，并把 `%s` 占位符标为 `<code>` */
  static getFormattedCodeDecoratedHTML = (str: string) => {
    const res = $("<span>");
    if (str.indexOf("\u00a7") >= 0) {
      let i = 0,
        color = -1,
        bold = false,
        italic = false,
        obfuscated = false,
        underline = false,
        strikethrough = false;
      const length = str.length;
      while (i < length) {
        const span = $("<span>");
        while (str.charAt(i) === "\u00a7") {
          const char2 = str.charAt(i + 1);
          const char2Code = str.charCodeAt(i + 1);
          let isCodeValid = false;
          if ((char2Code >= 48 && char2Code <= 57) || (char2Code >= 97 && char2Code <= 102)) {
            color = char2Code <= 57 ? char2Code - 48 : char2Code - 87;
            bold = italic = obfuscated = underline = strikethrough = false;
            isCodeValid = true;
          } else if (char2 === "k") isCodeValid = obfuscated = true;
          else if (char2 === "l") isCodeValid = bold = true;
          else if (char2 === "m") isCodeValid = strikethrough = true;
          else if (char2 === "n") isCodeValid = underline = true;
          else if (char2 === "o") isCodeValid = italic = true;
          else if (char2 === "r") {
            isCodeValid = true;
            color = -1;
            bold = italic = obfuscated = underline = strikethrough = false;
          }

          span.removeAttr("class");
          if (color >= 0)
            span.addClass(`mcmodder-format-color`).addClass(`mcmodder-format-color-${color}`);
          if (obfuscated) span.addClass(`mcmodder-format-obfuscated`);
          if (bold) span.addClass(`mcmodder-format-bold`);
          if (strikethrough) span.addClass(`mcmodder-format-strikethrough`);
          if (underline) span.addClass(`mcmodder-format-underline`);
          if (italic) span.addClass(`mcmodder-format-italic`);

          if (isCodeValid) {
            $(`<span>`)
              .attr("class", span.attr("class"))
              .addClass("mcmodder-format-formatter")
              .text(str.slice(i, i + 2))
              .appendTo(res);
            i += 2;
          } else {
            break;
          }
        }

        let substr = "";
        do {
          substr += str.charAt(i++);
        } while (str.charAt(i) != "\u00a7" && i < length);
        span.text(substr).appendTo(res);
      }
    } else $("<span>").text(str).appendTo(res);

    res.find("span").each((_, c) => {
      const content = c.innerHTML;
      const matched = content.match(/%\d*\.{0,1}\d*s/g);
      let result = content;
      if (matched) {
        matched.forEach((e) => (result = result.replaceAll(e, `<code>${e}</code>`)));
        c.innerHTML = result;
      }
    });

    return res.prop("outerHTML");
  };

  /** 将字符串中的 `\uXXXX` 转义序列还原为对应字符 */
  static unicode2Character(s: string) {
    let chineseStr = "";
    const l = s.length;
    for (let i = 0; i < l;) {
      const unicode = s.slice(i, 6);
      if (unicode.slice(0, 2) === "\\u") {
        chineseStr += String.fromCharCode(parseInt(unicode.slice(2), 16));
        i += 6;
      } else {
        chineseStr += unicode.charAt(0);
        i += 1;
      }
    }
    return chineseStr;
  }

  /** 将 `YYYY-MM-DD HH:MM:SS` 格式字符串解析为本地时间戳 */
  static customDateStringToTimestamp(str: string) {
    const [year, month, day, hour, minute, second] = str.split(/[- :]/).map(Number);
    return new Date(year, month - 1, day, hour, minute, second).getTime();
  }

  /** 站点显示的时间不带时区，固定按 UTC+8 解析，避免脚本在其它时区运行时倒计时整体偏移 */
  static parseUTC8Time(text: string | null) {
    const match = text?.matchAll(/\d+/g);
    if (!match) return Date.parse(text ?? "");
    const [year, month, day, hour, minute, second] = match;
    return Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) - 8 * 60 * 60 * 1000;
  }

  /** 清除正文中的百科格式化占位符（如 `[h1=]`） */
  static clearContextFormatter(e: string) {
    e = " " + e;
    const r = Values.ignoredContextFormatters;
    let m = true;
    while (m) {
      m = false;
      r.forEach(function (i) {
        const p = e.indexOf("[" + i);
        if (p > -1) {
          if (e.slice(p).indexOf("]") < 0) return;
          m = true;
          const s = e
            .slice(p)
            .split("]")[0]
            .replace("[" + i, "");
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

  /** 计算清除格式化占位符后正文的 UTF-8 字节长度 */
  static getContextLength(e: string) {
    const encoder = new TextEncoder();
    const r = Utils.clearContextFormatter(e);
    return encoder.encode(r).length;
  }

  /** 判断元素是否通过 `display: none` 隐藏 */
  static isNodeHidden(node: Element | JQuery) {
    if ($(node).css("display") === "none") return true;
    return false;
  }

  /** 将按钮置为加载中状态（禁用并追加 spinner 图标） */
  static setButtonLoadingState(node: Element | JQuery) {
    $(node)
      .addClass("disabled")
      .attr("disabled", "true")
      .append(`<i class="fa fa-pulse fa-spinner">`);
  }

  /** 取消按钮的加载中状态（恢复可用并移除 spinner 图标） */
  static cancelButtonLoadingState(node: Element | JQuery) {
    $(node).removeClass("disabled").removeAttr("disabled").find("i:last-child").remove();
  }

  /** 净化文件名：将非法字符与空格替换为下划线，并截断到 255 字符 */
  static regulateFileName(name: string) {
    return name
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/ /g, "_")
      .substring(0, 255);
  }

  /**
   * 为节点绑定点击复制到剪贴板的事件，复制成功后弹出提示。
   *
   * @param node 要绑定复制事件的节点（同时会加上 `mcmodder-copyable` 类）。
   * @param typeName 被复制内容的类型名，用于提示文案（如「物品名称」）。
   * @param copyData 要复制的内容；若不传则复制节点的 `textContent`。可传函数以在点击时惰性取值。
   */
  static addClickCopyEvent(
    node: JQuery,
    typeName: string,
    copyData?: string | number | (() => string | number),
  ) {
    node.addClass("mcmodder-copyable").click((e) => {
      const text =
        typeof copyData === "function" ? copyData() : copyData || e.currentTarget.textContent;
      navigator.clipboard.writeText(text.toString());
      Utils.commonMsg(`${typeName}已成功复制到剪贴板~ (${text})`);
    });
  }

  /** 刷新页面上所有 `data-toggle="tooltip"` 元素的 tooltip */
  static updateAllTooltip() {
    return $().tooltip
      ? $('[data-toggle="tooltip"]').tooltip({
          // animation: false,
          // delay: { show: 200 }
        })
      : null;
  }

  /** 从物品资料页 DOM 中解析物品信息为 `Item` */
  static parseItemDocument($doc: JQuery = $(document)) {
    const keywords = $doc.find("meta[name=keywords]").attr("content").split(",");
    const itemRow = $doc.find(".item-row").first();
    const command = itemRow.find(".item-give")?.attr("data-command")?.slice(9)?.split(" ");
    const righttable = itemRow.find(".righttable tbody > tr");
    const nav = $doc.find(".common-nav li");
    const classID = Utils.abstractIDFromURL(nav.eq(4).find("a").attr("href"), "class");
    const itemType = Number(
      nav.eq(6).find("a").attr("href").split(`/item/list/${classID}-`)[1].slice(0, -5),
    );
    const res: Item = {
      id: Utils.abstractIDFromURL(itemRow.find(".tool a").first().prop("href"), "item/edit"),
      classID: classID,
      name: keywords[0],
      englishName: keywords[1],
      itemType: itemType,
      smallIcon: "",
      largeIcon: "",
      creativeTabName: righttable.eq(3).find("a")?.text(),
      harvestTools: `[${Array.from(righttable.eq(5).find(".item-table-hover"))
        ?.map((e) => e.getAttribute("item-id"))
        .join(",")}]`,
    };
    if (command) {
      res.registerName = command[0];
      res.maxStackSize = Number(command[1]) || 1;
      if (command.length > 2) res.metadata = Number(command[2]) || 0;
    }
    Utils.deleteEmptyProperties(res);
    return res;
  }

  /**
   * 从物品资料页中解析正文 HTML。
   *
   * 引用资料时站点会在正文前插入 `legend`，其中最后一个链接是编辑入口；
   * 预览里不需要它，故在克隆节点上移除后返回。
   */
  static parseItemContent($doc: JQuery = $(document)) {
    const $content = $doc.find(".item-content.common-text.font14").first();
    if (!$content.length) return "";
    const $clone = $content.clone();
    $clone.find(".quote_text legend a").last().remove();
    return $clone.html() ?? "";
  }

  /**
   * 从物品资料页右侧信息表中解析出结构化行。
   *
   * 图标行与「查看合成/用途」行都是 `colspan=2`，分别跳过、单独取链接；
   * 其余两列行按「字段名 / 字段值」解析，值里的图片用 `alt` 兜底。
   */
  static parseItemInfoTable($doc: JQuery = $(document)) {
    const $table = $doc.find(".item-data .item-info-table .righttable").first();
    const infoRows: LinkPreviewInfoRow[] = [];
    let tabUrl: string | undefined;
    if (!$table.length) return { infoRows, tabUrl };

    const absoluteURL = (url: string | undefined) => {
      if (!url) return undefined;
      try {
        return new URL(url, Values.hostname).href;
      } catch {
        return undefined;
      }
    };

    $table.find("tr").each((_, tr) => {
      const $tr = $(tr);
      const $tabLink = $tr.find('a[href*="/item/tab/"]').first();
      if ($tabLink.length) tabUrl = absoluteURL($tabLink.attr("href"));

      const $cells = $tr.children("td");
      if ($cells.length < 2) return;

      const label = $cells
        .eq(0)
        .text()
        .trim()
        .replace(/[：:]$/, "");
      if (!label) return;

      const $valueCell = $cells.eq(1);
      const value =
        $valueCell.text().trim() ||
        $valueCell
          .find("img[alt]")
          .map((_, img) => $(img).attr("alt")?.trim() ?? "")
          .get()
          .filter(Boolean)
          .join("、");
      if (!value) return;

      infoRows.push({
        label,
        value,
        href: absoluteURL($valueCell.find("a[href]").first().attr("href")),
      });
    });

    return { infoRows, tabUrl };
  }

  /** 从物品资料页中解析预览所需的完整结构化数据 */
  static parseItemPreview($doc: JQuery = $(document)): ItemPreview {
    const { infoRows, tabUrl } = Utils.parseItemInfoTable($doc);
    return {
      ...Utils.parseItemDocument($doc),
      content: Utils.parseItemContent($doc),
      infoRows,
      tabUrl,
    };
  }

  /** 从模组页 DOM 中解析模组信息，返回节点与 `classData` */
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
        cover: $doc.find(".class-cover-image img").attr("src"),
      } as Class,
    };
  }

  /** 从模组页中解析正文 HTML */
  static parseClassContent($doc: JQuery = $(document)) {
    return $doc.find(".class-menu-main .text-area.common-text.font14").first().html() ?? "";
  }

  /** 从模组页中解析状态 / 开源标签（含站点配色编号与悬浮说明） */
  static parseClassTag($doc: JQuery, type: "status" | "source"): ClassPreviewTag | undefined {
    const $tag = $doc.find(`.class-title .class-${type}`).first();
    if (!$tag.length) return;
    const text = $tag.text().trim();
    if (!text) return;
    const level = ($tag.attr("class") ?? "").match(new RegExp(`${type}-(\\d+)`))?.[1];
    return {
      text,
      level: level === undefined ? undefined : Number(level),
      description: $tag.attr("data-original-title") ?? $tag.attr("title") ?? undefined,
    };
  }

  /** 从模组页中解析预览所需的完整结构化数据 */
  static parseClassPreview($doc: JQuery = $(document)): ClassPreview {
    const { classData } = Utils.parseClassDocument($doc);
    return {
      ...classData,
      id: 0,
      content: Utils.parseClassContent($doc),
      status: Utils.parseClassTag($doc, "status"),
      source: Utils.parseClassTag($doc, "source"),
    };
  }

  /** 将 `Item` 转换为物品编辑页提交所需的数据结构 */
  static async itemToEditorData(item: Item): Promise<McmodItemEditorData> {
    const res = { "item-data": {} } as DeepPartial<McmodItemEditorData>;
    const data = res["item-data"]! as Partial<McmodItemEditorInnerData>;
    if (item.id) {
      res["action"] = "item-edit";
      res["edit-id"] = item.id.toString();
    } else {
      res["action"] = "item-add";
    }
    res["class-id"] = item.classID.toString();

    data["content"] = item.content || "";
    data["name"] = item.name;
    if (item.englishName) data["ename"] = item.englishName;
    data["category"] = { 0: "1" };
    data["type"] = item.creativeTabName;
    data["icon-32x-data"] =
      item.smallIcon || Utils.appendBase64ImgPrefix(Utils.getImageURLByItemID(item.id, 32)) || "";
    data["icon-128x-data"] =
      item.largeIcon || Utils.appendBase64ImgPrefix(Utils.getImageURLByItemID(item.id, 128)) || "";
    data["is-general-node"] = "0";
    data["is-general-parents"] = "0";
    if (item.OredictList) data["oredict"] = Utils.parseOredictList(item.OredictList).join(",");
    if (item.maxStackSize != undefined) data["maxstack"] = item.maxStackSize.toString();
    // if (item.tools) data["tools"] = item.tools;

    return res as McmodItemEditorData;
  }

  /** 从物品编辑页 DOM 中解析完整物品信息为 `Item` */
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
      harvestTools: `[${bodyScript.split(");addItemTools(").slice(1).map(parseInt).join(",")}]`,
      OredictList: `[${inputs.find("[data-multi-id=oredict]").val()}]`,
      maxDurability: Number(inputs.find("[data-multi-id=damage]").val()),
      maxStackSize: Number(inputs.find("[data-multi-id=maxstack]").val()),
      registerName: inputs.find("[data-multi-id=regname]").val(),
      metadata: inputs.find("[data-multi-id=metadata]").val(),
    };
    Utils.deleteEmptyProperties(res);
    const generalAlert = $(".edit-user-alert.isgeneral");
    if (generalAlert.length)
      res.generalTo = Utils.abstractIDFromURL(generalAlert.find("a").attr("href"), "item");
    return res;
  }

  // static parseClassEditorDocument(_$doc: JQuery = $(document)) {
  // TODO ...
  // }
}
