import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ensureRenderBundle } from "./admin/verify/render";
import { BUNDLE_PATH } from "../support/userscript";

/** 允许环境变量临时跳过新鲜度校验 */
const ALLOW_STALE = process.env.E2E_ALLOW_STALE === "1";

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
 * 全局前置检查：注入的是 `dist/mcmodder.user.js`，测过期产物比不测更糟。
 *
 * 产物缺失或落后于 `src/` 时直接失败，并给出确切的重建命令。
 *
 * 顺带把后台 fixture 的渲染产物（Vue → 静态 HTML）准备好，让用例里只剩纯渲染调用；
 * 产物比源码新时会直接跳过，热路径上不产生开销。
 */
export default async function globalSetup() {
  if (!existsSync(BUNDLE_PATH)) {
    throw new Error(`找不到 ${BUNDLE_PATH}\n请先执行 \`npm run build\`。`);
  }
  if (!ALLOW_STALE) {
    const bundleTime = statSync(BUNDLE_PATH).mtimeMs;
    const sourceTime = newestMtime(resolve(dirname(BUNDLE_PATH), "../src"));
    if (sourceTime > bundleTime) {
      throw new Error(
        `dist/mcmodder.user.js 落后于 src/ 的改动（${new Date(sourceTime).toLocaleString()} > ${new Date(
          bundleTime,
        ).toLocaleString()}）\n请先执行 \`npm run build\`，或设置 E2E_ALLOW_STALE=1 跳过本检查。`,
      );
    }
  }
  await ensureRenderBundle();
}
