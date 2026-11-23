import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "@playwright/test";
import { renderEntry } from "./verify/render";
import type { AuthProps } from "./verify/render/entry";

/**
 * 把后台框架的 SSR 结果嵌进原生框架页 `index.html`，得到一块可以直接顶替整站响应的 HTML。
 *
 * 原生后台只返回一个文档：顶栏、左栏和 `#connect-frame` 都在框架里，点左侧菜单时站点再把
 * `POST /frame/pageVerifyMod/` 的 `html` 塞进 `#connect-frame`。离线用例拦截整站时，
 * 直接拿这里产出的整页 HTML 即可，不必再手写一份壳子。
 */

/** 百科原生后台框架页 */
const INDEX_HTML_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "index.html");

/** `<body>` 起始标签，允许带属性 */
const BODY_OPEN_TAG = /<body(?:\s[^>]*)?>/i;

/**
 * 渲染后台框架，并嵌入 {@link AdminApp.vue} 到原生框架页 `<body>` 的第一个子元素之前。
 *
 * 嵌入位置要与站点一致：`<body>` 里的 `<script>` 等资源标签排在框架后面，
 * 页面打开时框架已经就位，脚本随后才执行。
 *
 * @param browser 必须来自 `@playwright/test` 的 `browser` fixture —— 会新开一个
 *   不带用户脚本的 context 来求值
 */
export async function renderAdminShell(browser: Browser, props: AuthProps): Promise<string> {
  const app = await renderEntry(browser, "adminApp", props);
  const framework = readFileSync(INDEX_HTML_PATH, "utf8");
  const body = BODY_OPEN_TAG.exec(framework);
  if (!body) throw new Error(`[e2e] ${INDEX_HTML_PATH} 里找不到 <body> 标签`);

  const insertAt = body.index + body[0].length;
  return `${framework.slice(0, insertAt)}\n${app}\n${framework.slice(insertAt)}`;
}
