import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 离线环境用的**外链资源缓存**（仅手动体验 / 显式开启）。
 *
 * 测试依赖的资源（种子图片、`/pages` 里的 gif、`/static` 里为断言准备的最小 CSS）提交在
 * `e2e/support/` 下，永远可离线复现；真站那套「长得像」的资源（完整 CSS、字体、图标、背景图）
 * 体积大、随站点改版还会变，不提交进仓库，而是由 `npm run e2e:assets` 抓到这里：
 *
 * ```
 * playwright/.cache/assets/<host>/<pathname>
 * ```
 *
 * 该目录已由 `.gitignore` 的 `/playwright/.cache/` 覆盖，与 `verify-render/` 共用同一个本地缓存根。
 * 按 host 分桶，所以后台域名（`admin.mcmod.cn`）自己的静态资源也走这里 —— 后台壳页路由只在
 * 静态资源分支上回落到缓存层，文档与接口仍然由离线环境伪造。
 *
 * 缓存**只在 `E2E_ASSETS=1` 或录制模式（`E2E_ASSETS_RECORD=1`）时参与路由**，
 * 默认的 `npm run e2e` / CI 完全不看它 —— 保证离线用例在本地和 CI 上是同一套输入。
 */

/** `e2e/support` */
const SUPPORT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), ".");

/** 缓存根目录；布局与 `scripts/e2e-assets.mjs` 完全一致（改这里记得同步那个脚本） */
export const ASSETS_CACHE_DIR = resolve(SUPPORT_DIR, "../../playwright/.cache/assets");

/** 待抓清单：录制模式下把「落到空响应」的外链记进来，脚本抓完会清掉成功的条目 */
export const PENDING_ASSETS_PATH = resolve(ASSETS_CACHE_DIR, "pending.json");

/**
 * 值得抓的资源类型。
 *
 * 文档与接口（`document` / `xhr` / `fetch`）不算：前者由离线的整站兜底路由负责，
 * 后者是脚本自己的业务请求，抓下来既没用也会污染清单 —— 例外是 {@link isStaticAssetUrl}
 * 认可的静态文件（例如后台同步加载的 `/static/public/lang/zh_cn.json`），它们确实是资源。
 */
const ASSET_RESOURCE_TYPES = new Set([
  "script",
  "stylesheet",
  "image",
  "font",
  "media",
  "texttrack",
  "manifest",
  "other",
]);

/** 走数据接口通道、但可能是静态文件的请求类型；只有路径像静态资源时才记录 */
const DATA_RESOURCE_TYPES = new Set(["xhr", "fetch", "other"]);

/** 站点上放静态文件的目录 */
const STATIC_ASSET_DIRS = ["/static/", "/pages/", "/plugs/", "/js/", "/images/", "/assets/"];

/** 一眼能看出是资源的扩展名 */
const STATIC_ASSET_EXTENSION =
  /\.(?:css|js|mjs|json|map|png|jpe?g|gif|webp|svg|ico|bmp|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg|wav)$/i;

/**
 * URL 是否像一个静态资源。
 *
 * 用于两类判断：缓存命中后按资源应答，以及决定 `xhr` / `fetch` 请求要不要记进待抓清单
 * （后台用 `$.getJSON` 同步拉语言包，走的是 xhr 通道，但内容确实是静态文件）。
 */
export function isStaticAssetUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const { pathname } = parsed;
  if (STATIC_ASSET_DIRS.some((dir) => pathname.startsWith(dir))) return true;
  return STATIC_ASSET_EXTENSION.test(pathname);
}

/** 缓存层是否启用：手动体验（`E2E_ASSETS=1`）或录制模式 */
export function assetsCacheEnabled(): boolean {
  return process.env.E2E_ASSETS === "1" || assetsRecording();
}

/** 是否处于录制模式：把未命中的外链写进 {@link PENDING_ASSETS_PATH} */
function assetsRecording(): boolean {
  return process.env.E2E_ASSETS_RECORD === "1";
}

/** 外链 URL -> 缓存文件路径；不是可缓存的外部资源时返回 `null` */
export function cachePathFor(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // host 里可能带端口，去掉 `:` 之类不能出现在文件名里的字符
  const host = parsed.host.replace(/[^\w.-]/g, "_");
  let pathname: string;
  try {
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }
  const file = resolve(ASSETS_CACHE_DIR, host, `.${pathname}`);
  // 越出缓存目录（`/../` 之类）的路径一律不认
  return file.startsWith(`${ASSETS_CACHE_DIR}/`) ? file : null;
}

/** 缓存里是否已有该 URL 对应的文件 */
export function hasCachedAsset(url: string): boolean {
  const file = cachePathFor(url);
  return file !== null && existsSync(file);
}

/** 读取待抓清单（文件不存在或损坏时当作空清单） */
function readPendingAssets(): string[] {
  try {
    const data: unknown = JSON.parse(readFileSync(PENDING_ASSETS_PATH, "utf8"));
    return Array.isArray(data)
      ? data.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** 覆盖写入待抓清单 */
function writePendingAssets(urls: Iterable<string>): void {
  mkdirSync(dirname(PENDING_ASSETS_PATH), { recursive: true });
  writeFileSync(PENDING_ASSETS_PATH, `${JSON.stringify([...urls].sort(), null, 2)}\n`);
}

/** 本次进程内已经记过的 URL；避免每个请求都读一遍清单 */
let recorded: Set<string> | null = null;

/**
 * 记录一条「缓存里没有」的外链，供 `npm run e2e:assets` 抓取。
 *
 * 只在录制模式下生效；重复 URL 直接忽略。
 */
export function recordPendingAsset(url: string, resourceType: string): void {
  if (!assetsRecording()) return;
  const recordable =
    ASSET_RESOURCE_TYPES.has(resourceType) ||
    (DATA_RESOURCE_TYPES.has(resourceType) && isStaticAssetUrl(url));
  if (!recordable) return;
  if (!cachePathFor(url)) return;

  recorded ??= new Set(readPendingAssets());
  if (recorded.has(url)) return;
  recorded.add(url);
  writePendingAssets(recorded);
}
