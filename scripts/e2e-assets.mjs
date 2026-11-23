#!/usr/bin/env node
/**
 * 把离线环境里「落到空响应」的外链抓进本地缓存，供手动体验时获得接近真站的视觉效果。
 *
 * ```bash
 * npm run e2e:assets            # 补齐 pending.json 里缺的文件
 * npm run e2e:assets -- --refresh   # 全部重抓（真站改版后想刷新缓存时用）
 * npm run e2e:assets -- https://example.com/a.css   # 临时补抓指定 URL
 * npm run e2e:assets -- --dry-run   # 只打印将要做什么
 * ```
 *
 * **清单从哪来**：手动跑一遍 `npm run e2e:assets:record`（即 `E2E_ASSETS_RECORD=1 npm run e2e:manual`），
 * 环境会把页面请求到、但缓存/仓库里都没有的外链记进 `playwright/.cache/assets/pending.json`。
 * 抓取成功的条目会被清掉，失败的留下一次继续。
 *
 * 目录布局与 `e2e/support/external-assets.ts` 的 `cachePathFor()` 完全一致：
 *
 * ```
 * playwright/.cache/assets/<host>/<pathname>
 * ```
 *
 * 该目录在 `.gitignore` 里，不会进版本库；CI 也不启用缓存，所以离线用例不依赖它。
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = resolve(ROOT, "playwright/.cache/assets");
const PENDING_PATH = resolve(CACHE_DIR, "pending.json");

/** 伪装成桌面 Chrome：部分 CDN 会对陌生 UA 直接 403 */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** 图片 CDN 有防盗链，带上站点 Referer 才拿得到 */
const REFERER = "https://www.mcmod.cn/";

/** 对真站客气一点 */
const CONCURRENCY = 3;
const DELAY_MS = 150;

/** CSS 里继续跟进的层数上限，避免 `@import` 环 */
const MAX_REFERENCE_DEPTH = 3;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
const extraUrls = argv.filter((arg) => !arg.startsWith("--"));
const refresh = flags.has("--refresh");
const dryRun = flags.has("--dry-run");

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/**
 * 外链 URL -> 缓存文件路径。**必须**与 `e2e/support/external-assets.ts` 的 `cachePathFor()` 保持一致。
 */
function cachePathFor(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.host.replace(/[^\w.-]/g, "_");
  const pathname = decodeURIComponent(parsed.pathname);
  const file = resolve(CACHE_DIR, host, `.${pathname}`);
  return file.startsWith(`${CACHE_DIR}/`) ? file : null;
}

async function readPending() {
  try {
    const data = JSON.parse(await readFile(PENDING_PATH, "utf8"));
    return Array.isArray(data) ? data.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** CSS 里的 `url(...)` 与 `@import` 引用 */
function cssReferences(css, baseUrl) {
  const references = [];
  const pattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(?:url\()?\s*(['"]?)([^'")]+)\3/g;
  for (const match of css.matchAll(pattern)) {
    const raw = (match[2] ?? match[4] ?? "").trim();
    if (!raw || raw.startsWith("data:") || raw.startsWith("#") || raw.startsWith("about:"))
      continue;
    try {
      references.push(new URL(raw, baseUrl).href);
    } catch {
      // 解析不了就跳过
    }
  }
  return references;
}

/** 是否是需要继续跟进引用的样式表 */
function isStylesheet(contentType, url) {
  return contentType.includes("text/css") || new URL(url).pathname.endsWith(".css");
}

async function main() {
  const pending = await readPending();
  const seeds = [...new Set([...pending, ...extraUrls])];

  const queue = seeds.map((url) => ({ url, depth: 0 }));
  const visited = new Set();
  const failed = [];
  let fetched = 0;
  let skipped = 0;

  console.log(`[e2e:assets] 清单 ${pending.length} 条，额外 ${extraUrls.length} 条`);
  if (seeds.length === 0) {
    console.log("[e2e:assets] 没有待抓资源。先跑一遍 `npm run e2e:assets:record` 录制清单。");
    return;
  }
  if (dryRun) {
    for (const url of seeds) console.log(`  ${url} -> ${cachePathFor(url) ?? "(跳过)"}`);
    return;
  }

  const cache = async (url, depth) => {
    if (visited.has(url)) return;
    visited.add(url);

    const file = cachePathFor(url);
    if (!file) return;

    const cached = existsSync(file);
    if (cached && !refresh) {
      skipped += 1;
      await followStylesheet(file, url, depth);
      return;
    }

    await sleep(DELAY_MS);
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT, referer: REFERER },
        redirect: "follow",
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || contentType.includes("text/html")) {
        failed.push(url);
        console.warn(`[e2e:assets] 跳过 ${response.status} ${url}`);
        return;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, buffer);
      fetched += 1;
      console.log(`[e2e:assets] ✓ ${url} (${buffer.length} B)`);

      if (isStylesheet(contentType, url)) {
        const css = buffer.toString("utf8");
        enqueueReferences(cssReferences(css, url), depth + 1);
      }
    } catch (error) {
      failed.push(url);
      console.warn(`[e2e:assets] ✗ ${url} —— ${error instanceof Error ? error.message : error}`);
    }
  };

  const followStylesheet = async (file, url, depth) => {
    if (!isStylesheet("", url) || depth >= MAX_REFERENCE_DEPTH) return;
    try {
      const css = await readFile(file, "utf8");
      enqueueReferences(cssReferences(css, url), depth + 1);
    } catch {
      // 读不出来就算了，下次 refresh 再说
    }
  };

  const enqueueReferences = (references, depth) => {
    if (depth > MAX_REFERENCE_DEPTH) return;
    for (const reference of references) {
      if (visited.has(reference)) continue;
      queue.push({ url: reference, depth });
    }
  };

  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;
      if (item) await cache(item.url, item.depth);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 只保留失败条目；成功的条目下次不再重复请求
  await mkdir(dirname(PENDING_PATH), { recursive: true });
  await writeFile(PENDING_PATH, `${JSON.stringify([...new Set(failed)].sort(), null, 2)}\n`);

  console.log(
    `[e2e:assets] 完成：新抓 ${fetched}，已缓存 ${skipped}，失败 ${new Set(failed).size}`,
  );
  console.log(`[e2e:assets] 缓存目录 ${CACHE_DIR}`);
  if (failed.length > 0) {
    console.log(
      "[e2e:assets] 失败条目已留在 pending.json，稍后可重试；缺文件时环境会回落到空响应。",
    );
  }
}

await main();
