import { createSSRApp, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
// 与 `src/main.ts` 的入口顺序保持一致：`ConfigLoader` 在模块顶层就用到了 `Utils.keyToString`，
// 若先导入 `Utils`，循环 import 会让 `ConfigLoader` 先求值，浏览器报「Cannot access 'Utils' before initialization」。
// 这里先经过 `Mcmodder`（正是产物里的真实入口链），Rollup 就会把 `Utils` 排在 `ConfigLoader` 前面。
import "../../../../../src/Mcmodder";
import AdminApp from "../../AdminApp.vue";
import VerifyEntry from "../VerifyEntry.vue";
import VerifyFrame from "../VerifyFrame.vue";
import VerifyList from "../VerifyList.vue";
import type { VerifyListPayload } from "../mock";
import type { Edition } from "../schema";
import type { User } from "../../../users.ts";
import AdminHomePage from "../../home/AdminHomePage.vue";

/**
 * 「Vue 组件 → 静态 HTML」的浏览器侧入口。
 *
 * 为什么不在 Node 里直接 `renderToString`：
 *
 * 1. `VerifyEntry.vue` 复用了 `src/Utils.ts` / `src/Values.ts`，而它们的模块顶层会读
 *    `window.location.href`、`ConfigLoader` 里还有依赖求值顺序的循环 import —— 在 Node
 *    的 ESM 里会直接抛错，在 Rollup/浏览器里才是站点真实的行为。
 * 2. 这个文件会被 {@link ./index.ts} 打包成 IIFE，在**一个干净的 Chromium 页面**里执行，
 *    所以 `window` / `document` 天然都在，不需要任何 DOM shim。
 *
 * 之所以仍然用 `vue/server-renderer`（而不是 `createApp().mount()` + `innerHTML`），
 * 是因为 SSR 只执行 setup/render，不会触发 `onMounted`，也不会把组件里的内联脚本、
 * 事件处理器带成「活」的 DOM，产出的就是一段可直接塞进 JSON 的字符串。
 */

export interface VerifyEntryProps extends AuthProps {
  /** 待审项内容 */
  edition: Edition;
}

export interface AuthProps {
  /** 当前登录的用户 */
  user: User;
}

export interface VerifyListProps {
  /**
   * 待审列表接口的请求载荷，决定渲染出的筛选条件与行。
   *
   * 与站点一致，筛选发生在「服务端」：同一份 {@link allEditions} 配上不同载荷，
   * 产出的行就是筛选后的结果。
   */
  payload: VerifyListPayload;
  /** 模拟后端里「仍在队列中」的全部待审项 */
  allEditions: Edition[];
}

/** 入口名 → 该入口接受的 props */
export interface RenderEntryPropsMap {
  adminHomePage: AuthProps;
  verifyEntry: VerifyEntryProps;
  verifyFrame: AuthProps;
  verifyList: VerifyListProps;
  adminApp: AuthProps;
}

export type RenderEntryName = keyof RenderEntryPropsMap;

/**
 * 可渲染 fixture 的注册表。
 *
 * 新增一个 SSR App 时只需要：
 * 1. 定义它的 props 类型，并补进 {@link RenderEntryPropsMap}；
 * 2. 在下面加一行「入口名 → 组件」。
 *
 * 打包产物会自动把这张表挂到 `window.__mcmodderRenderEntries`，
 * Playwright 侧通过 {@link ./index.ts} 的 `renderEntry` 按名字调用。
 */
const RENDER_ENTRIES = {
  adminHomePage: AdminHomePage,
  verifyEntry: VerifyEntry,
  verifyFrame: VerifyFrame,
  verifyList: VerifyList,
  adminApp: AdminApp,
} satisfies Record<RenderEntryName, Component>;

/** 组件 → 「props JSON → SSR HTML」的渲染函数 */
function createSsrRender(component: Component) {
  return (props: unknown) =>
    renderToString(createSSRApp(component, props as Record<string, unknown>));
}

declare global {
  interface Window {
    /** 由打包产物挂载的 SSR 入口表；Playwright 侧通过 `page.evaluate` 按名字调用 */
    __mcmodderRenderEntries?: {
      [K in RenderEntryName]: (props: RenderEntryPropsMap[K]) => Promise<string>;
    };
  }
}

// `Object.entries` 会丢掉「键 → 具体 props 类型」的关联，这里的断言只用于把动态生成的表
// 还原成上面的映射类型；新增入口仍然只需改 `RENDER_ENTRIES`。
window.__mcmodderRenderEntries = Object.fromEntries(
  Object.entries(RENDER_ENTRIES).map(([name, component]) => [name, createSsrRender(component)]),
) as NonNullable<Window["__mcmodderRenderEntries"]>;
