import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext } from "@playwright/test";

/**
 * 把构建产物 `dist/mcmodder.user.js` 注入浏览器上下文，模拟 Tampermonkey 的 document-start 注入。
 *
 * 做法与取舍：
 *
 * 1. **不模拟油猴沙箱**。产物是自包含的 IIFE，GM API 全部写成
 *    `typeof GM_getValue != "undefined" ? GM_getValue : void 0` 的鸭子探测，
 *    因此在页面 main world 里把同名全局挂到 `window` 上，产物自己就会认；
 *    `unsafeWindow` 在 main world 中就是 `window` 本身。
 * 2. **用 `addInitScript` 而不是 `addScriptTag`**。前者走 CDP 的
 *    `Page.addScriptToEvaluateOnNewDocument`，对每次导航在页面脚本之前求值，等价于
 *    `@run-at document-start`；后者只能在 `goto` 之后执行，且受页面 CSP 约束。
 * 3. **shim 与脚本体拼成一次注入**。多次 `addInitScript` 的执行顺序是浏览器的实现细节，
 *    拼成一个字符串最稳。
 */

/** 仓库根目录（`e2e/support` 往上两级） */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** 构建产物路径 */
export const BUNDLE_PATH = resolve(REPO_ROOT, "dist/mcmodder.user.js");

/** 从产物头部解析出来的用户脚本元数据 */
export interface UserscriptMeta {
  name: string;
  version: string;
  /** 原始 `@match` 模式 */
  matches: string[];
  /** 原始 `@exclude` 模式 */
  excludes: string[];
  /** 原始 `@require` 地址 */
  requires: string[];
}

/**
 * `@require` 里的 CDN 库 → `node_modules` 内的本地副本。
 *
 * 产物只在 `})(TurndownService, supabase);` 这一处把两个库当实参传入，且分别在
 * 「HTML 转 Markdown」「云端请求」时才真正被调用，所以默认可以用占位函数顶替；
 * 需要测到这些路径时再内联真库（离线、确定性都比拉 CDN 好）。
 *
 * `three` 在产物里没有裸引用（0.184 已不再提供 UMD 全局构建），故不列在这里。
 */
const LOCAL_LIBRARIES: Array<{ pattern: RegExp; path: string }> = [
  { pattern: /\/turndown\//, path: "node_modules/turndown/dist/turndown.js" },
  {
    pattern: /@supabase\/supabase-js/,
    path: "node_modules/@supabase/supabase-js/dist/umd/supabase.js",
  },
  { pattern: /\/opentype\.js\//, path: "node_modules/opentype.js/dist/opentype.min.js" },
];

/** 默认关闭的联网 / 云端开关，避免用例在无关页面上真发请求 */
const DEFAULT_SETTINGS: Record<string, unknown> = {
  useSupabase: false,
  fetchCustomSplashes: false,
};

let cachedSource: string | undefined;

/** 读取并缓存构建产物 */
function bundleSource(): string {
  if (cachedSource === undefined) {
    if (!existsSync(BUNDLE_PATH)) {
      throw new Error(`找不到构建产物 ${BUNDLE_PATH}，请先执行 \`npm run build\``);
    }
    cachedSource = readFileSync(BUNDLE_PATH, "utf8");
  }
  return cachedSource;
}

/** 解析产物头部的 `// ==UserScript==` 块，避免与 `vite.config.ts` 里的定义漂移 */
export function parseUserscriptMeta(source: string): UserscriptMeta {
  const meta: UserscriptMeta = { name: "", version: "", matches: [], excludes: [], requires: [] };
  for (const line of source.split("\n")) {
    const matched = /^\/\/\s*@(\S+)\s+(.*)$/.exec(line);
    if (!matched) continue;
    const [, key, value] = matched;
    if (key === "name") meta.name = value.trim();
    else if (key === "version") meta.version = value.trim();
    else if (key === "match") meta.matches.push(value.trim());
    else if (key === "exclude") meta.excludes.push(value.trim());
    else if (key === "require") meta.requires.push(value.trim());
  }
  if (!meta.name || !meta.version) {
    throw new Error("产物头部缺少用户脚本元数据，可能不是 vite-plugin-monkey 的构建结果");
  }
  return meta;
}

/** 转义正则元字符（`*` 留给通配逻辑处理） */
const escapeRegExp = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/** 通配模式片段 → 正则源码 */
const wildcardSource = (text: string) => escapeRegExp(text).replace(/\*/g, ".*");

/**
 * 把油猴的 `@match` / `@exclude` 模式编译成正则源码。
 *
 * 语法见 Chrome 的 match pattern：`<scheme>://<host><path>`，其中 scheme 的 `*` / host 的 `*`
 * 与 `*.` 前缀、以及 path 中的 `*` 都是通配。
 */
export function matchPatternToRegExpSource(pattern: string): string {
  const matched = /^(\*|https?):\/\/([^/]+)(\/.*)$/.exec(pattern);
  if (!matched) throw new Error(`无法解析的用户脚本匹配模式：${pattern}`);
  const [, scheme, host, path] = matched;
  const schemeSource = scheme === "*" ? "https?" : scheme;
  const hostSource =
    host === "*"
      ? "[^/]+"
      : host.startsWith("*.")
        ? `(?:[^/]+\\.)?${escapeRegExp(host.slice(2))}`
        : escapeRegExp(host);
  return `^${schemeSource}://${hostSource}${wildcardSource(path)}$`;
}

/** `@match` / `@exclude` 判定（与油猴一致：命中任一 @match 且不命中任何 @exclude） */
export function isUserscriptUrl(url: string, meta: UserscriptMeta): boolean {
  const matches = meta.matches.some((pattern) =>
    new RegExp(matchPatternToRegExpSource(pattern)).test(url),
  );
  if (!matches) return false;
  return !meta.excludes.some((pattern) =>
    new RegExp(matchPatternToRegExpSource(pattern)).test(url),
  );
}

export interface UserscriptOptions {
  /** 预置 GM 存储（值按原样存，脚本里的 `GM_getValue` 会原样拿到） */
  seed?: Record<string, unknown>;
  /** 便捷入口：合并进 `mcmodderSettings` 的字段 */
  settings?: Record<string, unknown>;
  /** 内联 `node_modules` 里的真库（turndown / supabase），默认用会抛错的占位 */
  realLibs?: boolean;
  /** 忽略 `@match` / `@exclude` 判定，强制在所有页面注入（默认遵循真实规则） */
  ignoreMatch?: boolean;
}

/** 组装 GM 存储的初始内容 */
function buildSeed(options: UserscriptOptions): Record<string, unknown> {
  const seed: Record<string, unknown> = { ...options.seed };
  let parsed: Record<string, unknown> = {};
  const preset = seed.mcmodderSettings;
  if (typeof preset === "string") {
    try {
      parsed = JSON.parse(preset) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`seed.mcmodderSettings 不是合法 JSON：${String(error)}`, { cause: error });
    }
  }
  seed.mcmodderSettings = JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed, ...options.settings });
  return seed;
}

/**
 * 页面侧的 GM API shim + 脚本体。
 *
 * 外层用模板字符串做变量插值，内层刻意避免嵌套模板字符串（改用手写拼接），
 * 免得转义层数失控。
 *
 * 结构与时机：
 * ```
 * (() => {
 *   if (!命中 @match) return;      // 早期返回，整个注入会被跳过
 *   ...GM shim 挂到 window...
 *   const boot = function () { ...脚本体... };
 *   <等待 <html> 出现> boot();
 * })();
 * ```
 */
function buildInjectedScript(
  meta: UserscriptMeta,
  options: UserscriptOptions & { seed: Record<string, unknown> },
  bundle: string,
): string {
  const matchSources = JSON.stringify(meta.matches.map(matchPatternToRegExpSource));
  const excludeSources = JSON.stringify(meta.excludes.map(matchPatternToRegExpSource));
  const gmInfo = JSON.stringify({
    script: {
      name: meta.name,
      version: meta.version,
      namespace: "http://www.mcmod.cn/",
      matches: meta.matches,
      grants: [],
    },
    scriptHandler: "e2e",
    version: "5.3.0",
  });

  return `(() => {
  "use strict";

  /*
   * 复刻油猴的注入范围判定：只有命中 @match 且未命中 @exclude 的文档才会被注入，
   * 跨域 iframe、被 @exclude 的子目录都不例外（addInitScript 本身是无差别注入的）。
   */
  const MATCH = ${matchSources}.map((source) => new RegExp(source));
  const EXCLUDE = ${excludeSources}.map((source) => new RegExp(source));
  const IGNORE_MATCH = ${options.ignoreMatch === true};
  if (
    !IGNORE_MATCH &&
    (!MATCH.some((pattern) => pattern.test(location.href)) ||
      EXCLUDE.some((pattern) => pattern.test(location.href)))
  ) {
    return;
  }

  if (window.__mcmodderE2E) return;
  const e2e = (window.__mcmodderE2E = { menuCommands: Object.create(null), openedTabs: [] });

  /* ---------------- GM 存储 ---------------- */
  /*
   * 内存 Map 为准，JSON 镜像进 localStorage：同 context 的多标签页天然共享，
   * 且 localStorage 会被 Playwright 的 storageState 一并保存，登录态 + 脚本数据可复用。
   */
  const MIRROR = "__mcmodder_e2e_gm_storage__";
  const store = new Map();
  const adopt = (raw) => {
    store.clear();
    for (const pair of Object.entries(JSON.parse(raw))) store.set(pair[0], pair[1]);
  };
  try {
    const raw = localStorage.getItem(MIRROR);
    if (raw) adopt(raw);
  } catch (error) {
    /* 沙箱化 iframe / 无痕模式下 localStorage 不可用，退化为纯内存 */
  }
  for (const pair of Object.entries(${JSON.stringify(options.seed)})) {
    if (!store.has(pair[0])) store.set(pair[0], pair[1]);
  }
  const persist = () => {
    try {
      localStorage.setItem(MIRROR, JSON.stringify(Object.fromEntries(store)));
    } catch (error) {}
  };
  persist();

  window.GM_getValue = (key, defaultValue) => (store.has(key) ? store.get(key) : defaultValue);
  window.GM_setValue = (key, value) => {
    store.set(key, value);
    persist();
  };
  window.GM_deleteValue = (key) => {
    store.delete(key);
    persist();
  };
  window.GM_addValueChangeListener = (key, callback) => {
    /* storage 事件只在「其它」文档触发，语义恰好与 GM 的 remote 通知一致 */
    const listener = (event) => {
      if (event.key !== MIRROR || !event.newValue) return;
      const previous = store.get(key);
      try {
        adopt(event.newValue);
      } catch (error) {
        return;
      }
      const current = store.get(key);
      if (previous === current) return;
      callback(key, previous, current, true);
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  };

  /* ---------------- 其余 GM API ---------------- */
  window.GM_info = ${gmInfo};
  window.GM_registerMenuCommand = (name, callback) => {
    e2e.menuCommands[name] = callback;
  };
  window.GM_openInTab = (url) => {
    e2e.openedTabs.push(url);
  };

  /* main world 里 unsafeWindow 就是 window 本身 */
  window.unsafeWindow = window;

  /*
   * 产物末尾是 \`})(TurndownService, supabase);\` —— 这两个是**裸标识符**，
   * 未定义会让整段脚本在入口处 ReferenceError、静默不启动。
   * 先占位；realLibs 打开时由内联的 UMD 覆盖掉。
   */
  window.TurndownService =
    window.TurndownService ||
    function TurndownService() {
      throw new Error("[e2e] turndown 未内联，请设置 realLibs: true");
    };
  window.supabase = window.supabase || {
    createClient() {
      throw new Error("[e2e] supabase 未内联，请设置 realLibs: true");
    },
  };

  /* ---------------- GM_xmlhttpRequest ---------------- */
  const aborted = new Set();
  let sequence = 0;
  const toEvent = (options, payload) => ({
    readyState: 4,
    status: payload.status,
    statusText: payload.statusText,
    responseHeaders: payload.responseHeaders,
    responseText: payload.responseText,
    response: payload.responseText,
    responseXML: null,
    finalUrl: payload.finalUrl,
    context: options.context,
  });
  window.GM_xmlhttpRequest = (options) => {
    const id = ++sequence;
    const method = (options.method || "GET").toUpperCase();
    const data = typeof options.data === "string" ? options.data : undefined;

    const finish = (payload) => {
      if (aborted.has(id)) return;
      aborted.delete(id);
      const event = toEvent(options, payload);
      /* status 0 是网络层失败：GM 只触发 onerror / ontimeout，不触发 onload */
      if (payload.status === 0) {
        if (payload.error === "timeout") {
          if (options.ontimeout) options.ontimeout(event);
        } else if (options.onerror) {
          options.onerror(Object.assign(event, { error: payload.statusText || "network error" }));
        }
        return;
      }
      if (options.onload) options.onload(event);
    };

    const request = {
      url: options.url,
      method: method,
      headers: options.headers || {},
      data: data,
      timeout: options.timeout,
      anonymous: !!options.anonymous,
    };

    if (typeof window.__mcmodderE2E_xhr === "function") {
      window.__mcmodderE2E_xhr(request).then(finish, (error) =>
        finish({
          status: 0,
          statusText: String(error),
          responseHeaders: "",
          responseText: "",
          finalUrl: options.url,
          error: "network",
        }),
      );
    } else {
      /* 没有 binding 时退化到页面 fetch：同源可用，跨域会被 CORS 拦下 */
      fetch(options.url, {
        method: method,
        headers: request.headers,
        body: data,
        credentials: options.anonymous ? "omit" : "include",
      })
        .then(async (response) =>
          finish({
            status: response.status,
            statusText: response.statusText,
            responseHeaders: Array.from(response.headers)
              .map((pair) => pair[0] + ": " + pair[1])
              .join("\\r\\n"),
            responseText: await response.text(),
            finalUrl: response.url,
          }),
        )
        .catch((error) =>
          finish({
            status: 0,
            statusText: String(error),
            responseHeaders: "",
            responseText: "",
            finalUrl: options.url,
            error: "network",
          }),
        );
    }

    return {
      abort() {
        aborted.add(id);
      },
    };
  };

  /* ---------------- GM_cookie ---------------- */
  const cookieCall = (action, details, callback) => {
    const done = typeof callback === "function" ? callback : () => {};
    if (typeof window.__mcmodderE2E_cookie !== "function") {
      done(action === "list" ? [] : null);
      return;
    }
    window.__mcmodderE2E_cookie({ action: action, details: details }).then(
      (result) => done(result.cookies || null, result.error ? { error: result.error } : null),
      (error) => done(action === "list" ? [] : null, { error: String(error) }),
    );
  };
  window.GM_cookie = {
    list: (details, callback) => cookieCall("list", details, callback),
    set: (details, callback) => cookieCall("set", details, callback),
    delete: (details, callback) => cookieCall("delete", details, callback),
  };

  /* ---------------- 脚本体 ---------------- */
  /*
   * 时机问题：\`addInitScript\` 的求值时刻早于 Tampermonkey 的 document-start —— 此时
   * \`document.documentElement\` 还是 null，产物顶部的 importCSS 会因
   * \`(document.head || document.documentElement).appendChild\` 直接抛 TypeError、整段脚本夭折。
   * 所以盯住 <html> 出现后再求值：实测回调仍早于 <head> 里的内联脚本，与 document-start 等价。
   */
  const boot = function () {
${bundle}
  };

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    boot();
  };
  if (document.documentElement) {
    start();
  } else {
    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      observer.disconnect();
      start();
    });
    observer.observe(document, { childList: true });
    /* 兜底：万一 mutation 在解析完成前没被派发 */
    document.addEventListener("DOMContentLoaded", () => {
      observer.disconnect();
      start();
    });
  }
})();`;
}

/** 读出需要内联的本地库源码（缺哪个跳哪个） */
function localLibrarySources(meta: UserscriptMeta): string[] {
  const sources: string[] = [];
  for (const required of meta.requires) {
    const library = LOCAL_LIBRARIES.find((entry) => entry.pattern.test(required));
    if (!library) continue;
    const path = resolve(REPO_ROOT, library.path);
    if (!existsSync(path)) {
      console.warn(`[e2e] 找不到 ${library.path}，跳过内联 ${required}`);
      continue;
    }
    sources.push(readFileSync(path, "utf8"));
  }
  return sources;
}

/**
 * 在 context 上注册用户脚本注入。
 *
 * 必须在任何 `goto` 之前调用（fixture 已保证这一点）。
 *
 * @returns 产物的用户脚本元数据，便于用例断言版本号等
 */
export async function installUserscript(
  context: BrowserContext,
  options: UserscriptOptions = {},
): Promise<UserscriptMeta> {
  const source = bundleSource();
  const meta = parseUserscriptMeta(source);
  const parts: string[] = [];

  if (options.realLibs) parts.push(...localLibrarySources(meta));
  parts.push(buildInjectedScript(meta, { ...options, seed: buildSeed(options) }, source));

  await context.addInitScript({ content: parts.join("\n;\n") });
  return meta;
}
