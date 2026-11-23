import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "@playwright/test";
import vue from "@vitejs/plugin-vue";
import { createRequire } from "node:module";
import { build } from "vite";
import type { RenderEntryName, RenderEntryPropsMap } from "./entry";

/**
 * 把 {@link ./entry.ts} 打包成 IIFE，再在一个**干净的页面**里求值，得到组件渲染出的静态 HTML。
 *
 * 之所以要打包、要单独开一个 context：
 *
 * - `@vue/compiler-sfc` 只处理 `.vue`，浏览器不认，必须先过 Vite；
 * - 打包用 Rollup，源码里 `Utils` / `ConfigLoader` 之间的循环 import 才能像站点真实产物
 *   那样被正确提升（浏览器原生 ESM 或 Node 的模块求值器都会在这里翻车）；
 * - 渲染页不能带用户脚本：`addInitScript` 对 context 内所有页面生效，所以这里新开一个
 *   context，用完即关。
 */

/** `e2e/support/admin/verify/render` */
const RENDER_DIR = dirname(fileURLToPath(import.meta.url));
/** `e2e/support` —— 用例渲染时会读到 `data/`（模拟后端）与 `users.ts` 的权限常量 */
const SUPPORT_DIR = resolve(RENDER_DIR, "../../..");
/** 仓库根目录 */
const REPO_ROOT = resolve(RENDER_DIR, "../../../../..");

const BUNDLE_PATH = resolve(REPO_ROOT, "playwright/.cache/verify-render/render.iife.js");

/** 顶替 `$`，渲染时不需要真的油猴 API */
const GM_CLIENT_STUB = resolve(REPO_ROOT, "e2e/support/gm-client-stub.ts");

/** 递归取目录下最新的修改时间 */
function newestMtime(directory: string): number {
  if (!existsSync(directory)) return 0;
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(path) : statSync(path).mtimeMs);
  }
  return newest;
}

/**
 * 产物是否比源码旧。
 *
 * 除了 `src/`、`admin/` 下的 Vue fixture，`e2e/support/data/`（模拟后端数据库）同样会影响
 * 渲染结果 —— 漏掉它们就会出现「改了种子数据、用例却还读着旧 HTML」的假绿。
 */
function isStale(): boolean {
  if (!existsSync(BUNDLE_PATH)) return true;
  const bundleTime = statSync(BUNDLE_PATH).mtimeMs;
  const sourceTime = Math.max(
    newestMtime(resolve(SUPPORT_DIR, "admin")),
    newestMtime(resolve(SUPPORT_DIR, "data")),
    statSync(resolve(SUPPORT_DIR, "users.ts")).mtimeMs,
    newestMtime(resolve(REPO_ROOT, "src")),
  );
  return sourceTime > bundleTime;
}

async function buildBundle(): Promise<string> {
  await build({
    configFile: false,
    root: REPO_ROOT,
    publicDir: false,
    logLevel: "warn",
    plugins: [vue({ compiler: createRequire(import.meta.url)("vue/compiler-sfc") })],
    resolve: { alias: { $: GM_CLIENT_STUB } },
    define: {
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
      // lib 模式不会替换 `process.env.NODE_ENV`，浏览器里没有 `process`
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      outDir: dirname(BUNDLE_PATH),
      emptyOutDir: true,
      minify: false,
      copyPublicDir: false,
      lib: {
        entry: resolve(RENDER_DIR, "entry.ts"),
        name: "McmodderE2ERender",
        formats: ["iife"],
        fileName: () => "render.iife.js",
      },
    },
  });
  return BUNDLE_PATH;
}

let bundlePromise: Promise<string> | undefined;

/**
 * 确保渲染产物存在且不比源码旧。
 *
 * 由 `e2e/support/global-setup.ts` 调用一次即可；`renderEntry` 也会兜底调用，
 * 所以单独跑某个用例时不会因为没走 globalSetup 而失败。
 */
export function ensureRenderBundle(force = false): Promise<string> {
  bundlePromise ??= (async () => {
    if (force || isStale()) return buildBundle();
    return BUNDLE_PATH;
  })();
  return bundlePromise;
}

/**
 * 页面里用到「按前缀匹配 `<p>` 文本」的解析（`AdminVerifyInit.parseVerifyInfo` 就靠
 * `textContent.startsWith("操作类型")` 定位基本信息行），而 Vue 模板里的换行缩进会给文本两端
 * 留下空白。线上响应是服务端一次拼出来的紧凑 HTML，所以这里把每个 `<p>` 首尾的空白抹掉，
 * 让 fixture 与真实响应一致 —— 否则用例会因为「模板排版」而不是「脚本逻辑」失败。
 */
function trimParagraphWhitespace(html: string): string {
  return html.replace(/(<p\b[^>]*>)\s+/g, "$1").replace(/\s+(<\/p>)/g, "$1");
}

/** SSR 会留下 `<!--[-->`、`<!--v-if-->` 之类的片段标记，真实响应里没有，去掉以免干扰断言 */
function stripFragmentMarkers(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

/** 把任何奇怪形态的异常整理成带栈的文本，避免只打印 `[object Object]` */
function formatThrown(error: unknown): string {
  return error instanceof Error
    ? (error.stack ?? `${error.name}: ${error.message}`)
    : String(error);
}

/**
 * 把渲染期间从页面里收集到的错误附在异常后面。
 *
 * 入口缺失时真正的报错通常发生在**模块求值**阶段（`pageerror`），如果只抛
 * 「入口未注入」，用户就看不到那条原始错误了。
 */
function withPageErrors(message: string, errors: string[]): Error {
  return new Error(
    errors.length > 0 ? `${message}\n\n渲染期间页面的错误：\n${errors.join("\n")}` : message,
  );
}

/**
 * 渲染某个 SSR fixture，返回与站点响应里 `html` 等价的一段静态 HTML。
 *
 * 入口名与 props 的对应关系见 {@link ./entry.ts} 的 {@link RenderEntryPropsMap}：
 * 名字写错或 props 不匹配都会在类型检查阶段报错。
 *
 * @param entryName 挂到 `window.__mcmodderRenderEntries` 上的入口名（见 {@link ./entry.ts}）
 * @param browser 必须来自 `@playwright/test` 的 `browser` fixture —— 会新开一个
 *   不带用户脚本的 context 来求值
 */
export async function renderEntry<K extends RenderEntryName>(
  browser: Browser,
  entryName: K,
  props: RenderEntryPropsMap[K],
): Promise<string> {
  const bundle = await ensureRenderBundle();
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // Vue SSR 的渲染错误**不会**让 evaluate 失败：它经 `handleError` 打到 console，页面继续产出
    // 空/残缺 HTML，于是「组件写错了」会伪装成「html 是空串」。这里把页面错误收集起来，宁可失败也不要静默。
    // 入口缺失则是另一回事：通常是打包产物在模块求值阶段就抛错了，`pageerror` 里才有真正原因。
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(`[pageerror] ${formatThrown(error)}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const { url, lineNumber, columnNumber } = message.location();
      const where = url ? `（${url}:${lineNumber}:${columnNumber}）` : "";
      errors.push(`[console.error] ${message.text()}${where}`);
    });

    await page.setContent("<!doctype html><html><head></head><body></body></html>");
    await page.addScriptTag({ path: bundle });

    let result: { html: string } | { failure: string };
    try {
      // 在页面内捕获入口异常，而不是让 evaluate 直接 reject —— 这样 `errors` 里收集到的
      // console/pageerror 才能和真正的异常一起报出来。
      result = await page.evaluate(
        async ({ name, entryProps }) => {
          const entries = window.__mcmodderRenderEntries;
          if (entries === undefined) {
            return {
              failure:
                "窗口上没有 __mcmodderRenderEntries，说明打包产物没有执行完（模块顶层抛错，或产物过期未重建）。",
            };
          }
          const render = entries[name] as ((props: unknown) => Promise<string>) | undefined;
          if (typeof render !== "function") {
            return { failure: `渲染入口表里没有 ${name}，请检查 entry.ts 的 RENDER_ENTRIES。` };
          }
          try {
            return { html: await render(entryProps) };
          } catch (error) {
            return {
              failure: error instanceof Error ? (error.stack ?? error.message) : String(error),
            };
          }
        },
        { name: entryName, entryProps: props },
      );
    } catch (error) {
      throw withPageErrors(`[e2e] 渲染入口 ${entryName} 执行失败：${formatThrown(error)}`, errors);
    }

    if ("failure" in result) {
      throw withPageErrors(`[e2e] 渲染入口 ${entryName} 调用失败：${result.failure}`, errors);
    }
    if (errors.length > 0) {
      throw new Error(`[e2e] 渲染 fixture 时页面报错：\n${errors.join("\n")}`);
    }
    return trimParagraphWhitespace(stripFragmentMarkers(result.html));
  } finally {
    await context.close();
  }
}
