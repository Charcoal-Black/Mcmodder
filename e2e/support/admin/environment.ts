import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, BrowserContext } from "@playwright/test";
import { installAdminHost, installLegacyHelpers, SITE_PLUGINS_URL, type AdminHost } from "./host";
import { renderAdminShell } from "./shell";
import { mockVerifyInfo, type VerifyInfoMock } from "./verify/mock";
import { mockAdminHome, type AdminHomeMock } from "./home/mock";
import {
  assetsCacheEnabled,
  cachePathFor,
  hasCachedAsset,
  isStaticAssetUrl,
  recordPendingAsset,
} from "../external-assets";
import { USER_TESTIFICATE, type User } from "../users";

/**
 * 离线后台的**公共环境**：整站兜底 + 宿主 shim + 原生后台框架页。
 *
 * 交互用例与手动体验都从这里进入，避免各自复制一份路由顺序 ——
 * Playwright 的路由是「后注册先匹配」，顺序错了就会把 jQuery / 接口 mock 一起吃掉。
 */

/** 后台站点源；所有离线用例都从这里进入 */
export const ADMIN_ORIGIN = "https://admin.mcmod.cn";

/** 百科站点源；`/static`、`/pages` 下的资源按同路径映射到本地 */
export const SITE_ORIGIN = "https://www.mcmod.cn";

/** 图片 CDN 源；离线时按同路径映射到 {@link SEED_IMAGE_DIR} */
export const IMAGE_ORIGIN = "https://i.mcmod.cn";

/** `e2e/support`，站点的静态资源目录都挂在它下面 */
const SUPPORT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** 种子图片根目录：`https://i.mcmod.cn/a/b.png` -> `<这里>/a/b.png` */
const SEED_IMAGE_DIR = resolve(SUPPORT_DIR, "data/seed/image");

/** 站点 `/static` 的本地副本：`https://www.mcmod.cn/static/a/b.css` -> `<这里>/a/b.css` */
const STATIC_DIR = resolve(SUPPORT_DIR, "static");

/** 站点 `/pages` 的本地副本：`https://www.mcmod.cn/pages/a/b.gif` -> `<这里>/a/b.gif` */
const PAGES_DIR = resolve(SUPPORT_DIR, "pages");

/** 需要重定向的特殊 URL-本地文件 映射 */
const EXTERNAL_ASSETS = {
  // 脚本默认背景图
  "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg": resolve(SUPPORT_DIR, "assets/bg.jpg"),
  // 测试用户使用的头像
  [USER_TESTIFICATE.avatar]: resolve(SUPPORT_DIR, "assets/avatar.png"),
};

/** 所有 `admin.mcmod.cn` 下的未开放接口 */
const ADMIN_NOT_OPENED_PATTERNS = [
  /^https:\/\/admin\.mcmod\.cn\/action\/(?:doAssistant|doVerify)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ModVersion|Item|ItemType|ModGUI)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ModGUI-add|ItemTable)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ItemCategory|ItemCategory-add)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ModCache|ClassGlobal)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ItemListMount|ItemListMount-add)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(Style|ClassEditBlacklist)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(CommentBlacklist|Blacklist-add)\/?(?:\?.*)?$/,
  /^https:\/\/admin\.mcmod\.cn\/frame\/page(ModfileMount|ModfileMount-add)\/?(?:\?.*)?$/,
];

/** 所有 `www.mcmod.cn` 下的未开放接口 */
const COMMON_NOT_OPENED_PATTERNS = [/^https:\/\/www\.mcmod\.cn\/object\/CommonSelect\/?(?:\?.*)?$/];

/**
 * 把 URL 路径映射到 `directory` 内的文件。
 *
 * 越出目录（如 `/../xxx`）的路径返回 `null`，避免把仓库里的任意文件当成资源发出去。
 */
function resolveLocalFile(directory: string, pathname: string): string | null {
  const file = resolve(directory, `.${decodeURIComponent(pathname)}`);
  return file.startsWith(`${directory}/`) ? file : null;
}

/**
 * 注册「站点前缀 -> 本地目录」的资源路由：URL 路径去掉前缀后原样对应到 `directory`，
 * 例如 `https://i.mcmod.cn/a/b.png` -> `<directory>/a/b.png`。
 *
 * 目录里没有的文件交给下一层（外链缓存 / 整站兜底），这样缓存能补上这里缺的资源。
 */
async function routeLocalDirectory(
  context: BrowserContext,
  urlBase: string,
  directory: string,
): Promise<void> {
  // 裸源（`https://i.mcmod.cn`）的 pathname 是 `/`，去掉尾部斜杠后才与前缀拼接一致
  const { pathname: prefix } = new URL(urlBase);
  const base = prefix.replace(/\/$/, "");
  await context.route(`${urlBase}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    const file = resolveLocalFile(directory, pathname.slice(base.length));
    if (!file || !existsSync(file)) return route.fallback();
    return route.fulfill({ path: file });
  });
}

export interface AdminEnvironment {
  /** 宿主 shim 句柄；`inject()` 已用于生成下面这份整页 HTML */
  host: AdminHost;
  /** 可以直接作为站点文档返回的整页 HTML */
  shell: string;
  /** 首页接口 mock：登录后的默认页面，也供左栏「首页」/「战术刷新」使用 */
  home: AdminHomeMock;
  /**
   * 详情接口 mock：持有整份待审项集合，按请求里的 `verifyID` 返回对应内容。
   *
   * 因此列表里每一行都能点开，而不是只有一个固定 ID 有效。
   */
  verifyInfo: VerifyInfoMock;
}

/**
 * 安装离线后台环境。
 *
 * **注册顺序**（由本函数保证）：
 *
 * 1. `**\/*` 空响应 —— 保证所有 CDN 请求不出网；
 * 2. `jquery.cookie.js` / `functions.js` 的最小实现 —— 优先级低于外链缓存，
 *    手动体验时缓存里有真站脚本就直接用真站的；
 * 3. 外链缓存（仅 `E2E_ASSETS=1` / 录制模式）：命中 `playwright/.cache/assets/` 即用，
 *    未命中则交给下一层，并在录制模式下记入待抓清单；
 * 4. 仓库里的语义化资源 —— `i.mcmod.cn` 种子图片、站点 `/static` `/pages`、背景图外链，
 *    按同路径回本地文件；本地缺文件时继续往下走（让缓存有机会补上）；
 * 5. 真实 jQuery（npm 同版本构建）——缓存里已有真站 `plugins.js` 时也不再注入宿主 shim，
 *    避免 `setPage` / 事件委托与站点实现重复生效；
 * 6. 后台域名下：静态资源（含 `xhr` 拉取的静态 JSON，如语言包）回落到缓存层，
 *    缺文件时仍是空响应；文档与接口返回后台框架页；
 * 7. 首页接口（`pageHome`）—— 按当前用户渲染「我的信息」与联系方式表；
 * 8. 详情接口（`pageVerify-info`）—— 按 `verifyID` 返回集合里对应的待审项；
 * 9. 审核写操作（`doAssistant` / `doVerify`）—— 离线不落库，永远返回 `{ state: 157 }`（功能未开放）。
 *
 * 调用方在此之后注册的接口 mock 会优先命中；若要换一份详情数据（例如换视角），
 * 在本函数之后调用 {@link mockVerifyInfo} 覆盖即可。
 */
export async function installAdminEnvironment(
  context: BrowserContext,
  browser: Browser,
  user: User,
): Promise<AdminEnvironment> {
  await context.route("**/*", (route) => route.fulfill({ status: 200, body: "" }));

  // 最小实现先注册：手动模式下缓存里的真站脚本会盖过它，CI 上缓存不存在则照旧生效
  await installLegacyHelpers(context);

  // 爬取缓存：只给手动体验 / 录制用，CI 与默认用例集不启用，保证输入可复现
  if (assetsCacheEnabled()) {
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      const file = cachePathFor(url);
      if (file && existsSync(file)) return route.fulfill({ path: file });
      recordPendingAsset(url, route.request().resourceType());
      return route.fallback();
    });
  }

  await routeLocalDirectory(context, IMAGE_ORIGIN, SEED_IMAGE_DIR);
  await routeLocalDirectory(context, `${SITE_ORIGIN}/static`, STATIC_DIR);
  await routeLocalDirectory(context, `${SITE_ORIGIN}/pages`, PAGES_DIR);
  for (const [link, path] of Object.entries(EXTERNAL_ASSETS)) {
    await context.route(link, async (route) => {
      if (!existsSync(path)) return route.fallback();
      return route.fulfill({ path: path });
    });
  }

  const realSiteScripts = assetsCacheEnabled() && hasCachedAsset(SITE_PLUGINS_URL);
  if (realSiteScripts) {
    console.log("[e2e] 缓存里已有真站 plugins.js：跳过宿主 shim，使用站点自己的 setPage");
  }
  const host = await installAdminHost(context, { injectShim: !realSiteScripts });
  const shell = host.inject(await renderAdminShell(browser, { user }));

  await context.route(`${ADMIN_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const type = request.resourceType();
    // 后台自己的静态资源（`/static/admin/...`、语言包 JSON 等）交给外链缓存；
    // 文档与真正的接口仍返回离线壳页
    const isAsset =
      type !== "document" &&
      (type === "script" ||
        type === "stylesheet" ||
        type === "image" ||
        type === "font" ||
        type === "media" ||
        type === "texttrack" ||
        isStaticAssetUrl(request.url()));
    if (isAsset) return route.fallback();
    return route.fulfill({ body: shell, contentType: "text/html; charset=utf-8" });
  });

  const home = await mockAdminHome(context, { user });
  const verifyInfo = await mockVerifyInfo(context, { user });

  // 离线环境未实现或不可用的功能，统一返回预设好的错误码：
  // - `admin` -> `state: 157`（功能未开放）；
  // - `common` -> `state: 119`（未定义的操作）。
  // 让脚本走失败提示分支，而不是以空响应或整页壳子冒充成功。
  for (const { type, pattern } of [
    ...ADMIN_NOT_OPENED_PATTERNS.map((pattern) => ({ type: "admin", pattern })),
    ...COMMON_NOT_OPENED_PATTERNS.map((pattern) => ({ type: "common", pattern })),
  ]) {
    await context.route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ state: type === "admin" ? 157 : 119 }),
      }),
    );
  }

  return { host, shell, home, verifyInfo };
}
