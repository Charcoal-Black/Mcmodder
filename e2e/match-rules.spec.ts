import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "./support/fixtures";
import {
  BUNDLE_PATH,
  isUserscriptUrl,
  matchPatternToRegExpSource,
  parseUserscriptMeta,
} from "./support/userscript";

/**
 * 注入范围判定的纯逻辑用例。
 *
 * `@match` / `@exclude` 直接解析自构建产物头部，所以这组用例同时充当「产物元数据是否
 * 与 `vite.config.ts` 一致」的守卫。
 */

const meta = existsSync(BUNDLE_PATH)
  ? parseUserscriptMeta(readFileSync(BUNDLE_PATH, "utf8"))
  : null;

test.skip(meta === null, "缺少构建产物 dist/mcmodder.user.js，请先 npm run build");

test("产物元数据可解析", () => {
  expect(meta!.name).toContain("Mcmodder");
  expect(meta!.version).toMatch(/^\d+\.\d+/);
  expect(meta!.matches).toContain("https://*.mcmod.cn/*");
  expect(meta!.excludes.length).toBeGreaterThan(0);
});

test("通配模式按油猴语义展开", () => {
  const pattern = new RegExp(matchPatternToRegExpSource("https://*.mcmod.cn/*"));
  expect(pattern.test("https://www.mcmod.cn/")).toBe(true);
  expect(pattern.test("https://admin.mcmod.cn/item/1.html")).toBe(true);
  expect(pattern.test("https://mcmod.cn/")).toBe(true);
  expect(pattern.test("https://evil.example.com/")).toBe(false);
  // 不能把 `*.mcmod.cn` 放宽成「任意以 mcmod.cn 结尾的主机」
  expect(pattern.test("https://notmcmod.cn/")).toBe(false);
});

test("注入范围与油猴一致", () => {
  const matched = (url: string) => isUserscriptUrl(url, meta!);
  expect(matched("https://www.mcmod.cn/")).toBe(true);
  expect(matched("https://www.mcmod.cn/item/123.html")).toBe(true);
  expect(matched("https://bbs.mcmod.cn/thread-1-1-1.html")).toBe(true);

  expect(matched("https://api.mcmod.cn/")).toBe(false);
  expect(matched("https://www.mcmod.cn/v2/anything")).toBe(false);
  expect(matched("https://www.mcmod.cn/ueditor/server.php")).toBe(false);
  expect(matched("https://example.com/")).toBe(false);
});
