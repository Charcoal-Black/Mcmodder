import { test as base, expect, type Page } from "@playwright/test";
import {
  installGmBridge,
  type GmRecorder,
  type GmXhrHandler,
  type GmXhrRequest,
  type GmXhrResponse,
} from "./gmxhr";
import { installUserscript, type UserscriptMeta, type UserscriptOptions } from "./userscript";

/** 产物（bundle）已在文档中求值的标志：`importCSS` 在 IIFE 顶部同步写入的样式表 */
const BUNDLE_MARKER = "style[data-mcmodder-vue-css]";

export interface McmodderFixtures {
  /** 注入选项；用 `test.use({ userscript: { ... } })` 覆盖 */
  userscript: UserscriptOptions;
  /** 请求拦截链；用例内直接 `gmHandlers.push(...)` 即可临时 mock */
  gmHandlers: GmXhrHandler[];
  /** 观测 + 控制句柄（自动生效，无需在用例里引用） */
  gm: GmRecorder & { handlers: GmXhrHandler[]; meta: UserscriptMeta };
}

/**
 * 扩展后的 `test`：在 context 上装好 GM bridge 与用户脚本，再交回用例。
 *
 * 两者都注册为 document-start 级别的注入，所以必须在任何 `goto` 之前完成 —— 这正是
 * `gm` 用 `auto: true` 的原因：不依赖用例主动引用。
 */
export const test = base.extend<McmodderFixtures>({
  userscript: [{}, { option: true }],
  // 默认值必须是**每次用例新建的数组**：用例会直接 `gmHandlers.push(...)`，
  // 若多个用例共享同一个默认数组，前一个用例的 mock 会漏进后一个用例。
  // eslint-disable-next-line no-empty-pattern
  gmHandlers: [async ({}, use) => await use([]), { option: true }],
  gm: [
    async ({ context, userscript, gmHandlers }, use) => {
      const recorder = await installGmBridge(context, gmHandlers);
      const meta = await installUserscript(context, userscript);
      await use({ ...recorder, handlers: gmHandlers, meta });
    },
    { auto: true },
  ],
});

export { expect };

/**
 * 等待产物真正跑起来（`data-mcmodder-vue-css` 样式已注入、启动遮罩已移除）。
 *
 * 真实站点上的 v4 内页（个人中心）体积大、`Mcmodder` 启动链路长，用时给它更宽的余量。
 */
export async function waitForUserscriptBoot(page: Page, timeout = 15_000) {
  await page.waitForFunction(
    (selector) => document.querySelector(selector) !== null,
    BUNDLE_MARKER,
    { timeout },
  );
  await page.waitForFunction(() => document.getElementById("mcmodder-splash-screen") === null, {
    timeout,
  });
}

/** 构造一个被 mock 的 GM 响应 */
export function mockResponse(body: string, init: Partial<GmXhrResponse> = {}): GmXhrResponse {
  return {
    status: 200,
    statusText: "OK",
    responseHeaders: "content-type: text/plain\r\n",
    responseText: body,
    finalUrl: "https://mock.invalid/",
    ...init,
  };
}

/** 断言工具：只保留匹配 URL 的请求 */
export function requestsTo(requests: GmXhrRequest[], pattern: string | RegExp) {
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  return requests.filter((request) => regex.test(request.url));
}
