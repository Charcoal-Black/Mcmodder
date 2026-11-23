import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "@playwright/test";
import { expect, mockResponse, requestsTo, test, waitForUserscriptBoot } from "./support/fixtures";

/**
 * 注入链路的离线用例。
 *
 * 页面内容由本地 HTML 顶替，不访问真实站点 —— 这样「脚本体是否被正确注入」这件事
 * 与 mcmod.cn 的可用性、网络状况、账号状态完全解耦，失败原因永远是脚本本身。
 */

const FIXTURE_PAGE = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/pages/blank.html");
const fixtureHtml = () => readFileSync(FIXTURE_PAGE, "utf8");

/** 用本地 HTML 顶替指定站点，再导航过去 */
async function gotoStub(context: BrowserContext, page: Page, origin = "https://www.mcmod.cn") {
  await context.route(`${origin}/**`, (route) =>
    route.fulfill({ body: fixtureHtml(), contentType: "text/html; charset=utf-8" }),
  );
  await page.goto(`${origin}/`);
}

test("脚本体在 document-start 注入并正常启动", async ({ context, page, gm }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await gotoStub(context, page);
  await waitForUserscriptBoot(page);

  // 入口处的裸标识符（`})(TurndownService, supabase)`）一旦缺失就会整段脚本静默不启动，
  // 唯一的现场就是 pageerror，所以这里必须断言为空
  expect(errors).toEqual([]);
  expect(gm.meta.name).toContain("Mcmodder");
  expect(await page.evaluate(() => typeof window.GM_getValue)).toBe("function");
  expect(await page.evaluate(() => window.unsafeWindow === window)).toBe(true);
});

test("求值时机早于页面自己的第一个脚本", async ({ context, page }) => {
  const pageWithHeadScript = resolve(dirname(FIXTURE_PAGE), "head-script.html");
  await context.route("https://www.mcmod.cn/**", (route) =>
    route.fulfill({
      body: readFileSync(pageWithHeadScript, "utf8"),
      contentType: "text/html; charset=utf-8",
    }),
  );
  await page.goto("https://www.mcmod.cn/");

  // `addInitScript` 早于 `<html>` 存在，脚本体实际是在 MutationObserver 回调里才求值的；
  // 这条用例守住「仍然早于页面脚本」这个关键承诺
  expect(await page.evaluate(() => window.__headScriptState)).toEqual({
    readyState: "loading",
    shimReady: true,
    bundleRan: true,
  });
});

test("遵循 @exclude：被排除的页面不注入", async ({ context, page }) => {
  await gotoStub(context, page, "https://api.mcmod.cn");
  expect(await page.evaluate(() => "__mcmodderE2E" in window)).toBe(false);
});

test("遵循 @match：@exclude 之外的子域照常注入", async ({ context, page }) => {
  await gotoStub(context, page, "https://admin.mcmod.cn");
  expect(await page.evaluate(() => "__mcmodderE2E" in window)).toBe(true);
});

test("GM 存储可读写，并通过 storage 事件跨标签页同步", async ({ context, page }) => {
  await gotoStub(context, page);
  await waitForUserscriptBoot(page);

  await page.evaluate(() => window.GM_setValue("e2e-probe", "v1"));
  expect(await page.evaluate(() => window.GM_getValue("e2e-probe"))).toBe("v1");
  // 未设置的键走默认值，与 GM_getValue 的语义一致
  expect(await page.evaluate(() => window.GM_getValue("e2e-missing", "fallback"))).toBe("fallback");

  const second = await context.newPage();
  await gotoStub(context, second);
  await waitForUserscriptBoot(second);

  const received = second.evaluate(
    () =>
      new Promise<{ previous: unknown; current: unknown; remote: boolean }>((resolve) => {
        window.__e2eListening = true;
        window.GM_addValueChangeListener("e2e-probe", (_key, previous, current, remote) =>
          resolve({ previous, current, remote }),
        );
      }),
  );
  await second.waitForFunction(() => window.__e2eListening === true);

  await page.evaluate(() => window.GM_setValue("e2e-probe", "v2"));
  expect(await received).toEqual({ previous: "v1", current: "v2", remote: true });
});

test("GM_xmlhttpRequest 走 Node 侧 bridge，可被 handler 拦截", async ({
  context,
  page,
  gm,
  gmHandlers,
}) => {
  await gotoStub(context, page);
  await waitForUserscriptBoot(page);

  gmHandlers.push((request) =>
    request.url.includes("mock.invalid")
      ? mockResponse("hello", { finalUrl: request.url })
      : undefined,
  );

  const result = await page.evaluate(
    () =>
      new Promise<{ status: number; text: string; finalUrl: string }>((resolve) => {
        window.GM_xmlhttpRequest({
          url: "https://mock.invalid/api",
          onload: (event) =>
            resolve({ status: event.status, text: event.responseText, finalUrl: event.finalUrl }),
        });
      }),
  );

  expect(result).toEqual({ status: 200, text: "hello", finalUrl: "https://mock.invalid/api" });
  expect(requestsTo(gm.requests, "mock\\.invalid")).toHaveLength(1);
});

test("GM_xmlhttpRequest 的网络失败走 onerror，不触发 onload", async ({
  context,
  page,
  gmHandlers,
}) => {
  await gotoStub(context, page);
  await waitForUserscriptBoot(page);

  // 127.0.0.1:1 一定连不上；走匿名分支（Node 全局 fetch），避免拖上 context 的 cookie 与超时策略
  gmHandlers.push(() => ({
    status: 0,
    statusText: "connect ECONNREFUSED",
    responseHeaders: "",
    responseText: "",
    finalUrl: "https://mock.invalid/",
    error: "network",
  }));

  const outcome = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        window.GM_xmlhttpRequest({
          url: "https://mock.invalid/down",
          onload: () => resolve("onload"),
          onerror: () => resolve("onerror"),
        });
      }),
  );

  expect(outcome).toBe("onerror");
});

test("GM_cookie 转发到 Playwright 的 cookie 容器", async ({ context, page, gm }) => {
  await gotoStub(context, page);
  await waitForUserscriptBoot(page);

  await page.evaluate(
    () =>
      new Promise((resolve) =>
        window.GM_cookie.set(
          { name: "_uuid", value: "e2e-uuid", domain: "www.mcmod.cn", path: "/" },
          () => resolve(null),
        ),
      ),
  );

  const cookies = await context.cookies("https://www.mcmod.cn/");
  expect(cookies.find((cookie) => cookie.name === "_uuid")?.value).toBe("e2e-uuid");
  expect(gm.cookieOperations.map((operation) => operation.action)).toContain("set");
});
