import type { BrowserContext } from "@playwright/test";
import { verifyEditions } from "./cases/collection";
import type { Edition } from "./schema";
import { renderEntry } from "./render";
import type { Values } from "../../../../src/Values";
import { USER_ASSISTANT_MANAGER, USER_ASSISTANT, type User } from "../../users";
import { contextBrowser, frameResponse, mockAdminFrame, type AdminFrameMock } from "../frame-mock";

/**
 * 编辑动作 → 审核类型。
 *
 * 与 `Values.editActionTypes` 的 `type` 字段一致，但这里必须**在 Node 侧可用**：
 * `src/Values.ts` 顶层会从 `$`（`vite-plugin-monkey/client`）读油猴 API，而 Playwright
 * 加载用例时没有这个别名，运行期 import 会直接报「Cannot find package '$'」。
 * `satisfies` 会在 `Values.editActionTypes` 增删动作时让类型检查失败，因此不必担心漏同步。
 */
const EDIT_ACTION_TYPE = {
  "class-add": "1",
  "class-edit": "1",
  "version-add": "2",
  "version-edit": "2",
  "item-add": "3",
  "item-edit": "3",
  "tab-add": "4",
  "tab-edit": "4",
  "tab-delete": "4",
  "post-add": "5",
  "post-edit": "5",
  "author-add": "8",
  "author-edit": "8",
} as const satisfies Record<
  ElementOf<typeof Values.editActionTypes>["id"],
  keyof typeof Values.editTypes
>;

/**
 * **POST** `https://admin.mcmod.cn/frame/pageVerifyMod-list/`
 *
 * 请求待审列表。
 *
 * @param `body` JSON 载荷
 */
export interface VerifyListPayload {
  /** 要查询的模组 ID，`"-1"` 为全域 */
  classID?: string;
  /** 要查询的编辑类型。空串或 `"0"` 视为未选择 */
  typeID?: keyof typeof Values.editTypes | "0";
  /** 根据提交者 UID 筛选编辑，空串或 `"0"` 视为未指定，将显示所有用户；可用 `,` 分隔多个 UID */
  userID?: string;
  /** 为 `1` 时，隐藏有管理员的模组区域内，且提交时间在 7 天内的编辑 */
  ignoreManager?: "0" | "1";
  /** 筛选出仅模组添加的编辑。必须配合 {@link typeID} = `"1"` 使用，否则将不返回任何结果 */
  classAddOnly?: "0" | "1";
}

/**
 * **POST** `https://admin.mcmod.cn/frame/pageVerify-info/`
 *
 * 请求待审项的详细信息。
 *
 * @param `body` JSON 载荷
 */
export interface VerifyInfoPayload {
  /** 编辑类型；缺省、空串或 `"0"` 时不限定 */
  typeID?: keyof typeof Values.editTypes | "0" | "";
  /** 待审项 ID */
  verifyID?: string;
}

/**
 * 拦截站点的「查看审核项详情」请求，用 {@link ../VerifyEntry.vue} 渲染出来的 HTML 顶替真实响应。
 *
 * 与真实后端一致，本 mock **不是一个请求只对应一个待审项**：它持有整份待审项集合，
 * 按请求载荷里的 `verifyID` 查找并渲染对应内容，因此列表里每一行都能打开。
 *
 * 真实站点向百科后端请求审核项信息，并将响应里的 `html` 插进页面 —— 所以这里用 `context.route`
 * 就能拦到；脚本自己发的请求走的是 `GM_xmlhttpRequest`（Node 侧 bridge），不会经过这里。
 *
 * **注册顺序**：Playwright 的路由是「后注册先匹配」。如果同时还有一个兜底的整站 stub，
 * 要先注册它、再调用本函数，否则兜底路由会把 POST 一起吃掉。
 */

export interface VerifyInfoMockOptions {
  /** 详情页按谁的身份渲染；默认审核助理视角 */
  user?: User;
  /** 模拟后端里的待审项集合；默认 {@link verifyEditions}（列表里能看到的全部待审项） */
  editions?: Edition[];
}

export interface VerifyInfoMock extends AdminFrameMock<VerifyInfoPayload> {
  /**
   * 按 ID 取渲染后的 HTML；集合里没有该 ID 时返回 `undefined`。
   *
   * 渲染结果会缓存，用例可以先取一份基准 HTML，再发请求做逐字比较。
   */
  htmlFor: (verifyID: number | string) => Promise<string | undefined>;
}

/**
 * 注册详情 mock 路由。
 *
 * 命中规则与真实后端对齐：`verifyID` 必须存在于待审项集合里，且请求带了有效 `typeID` 时
 * 必须与该待审项的操作类型一致；否则交还给下一条路由，避免把无关请求也吞掉。
 *
 * @returns 命中计数、请求载荷与按 ID 取 HTML 的方法；路由随 context 一起销毁，不必手动清理
 */
export async function mockVerifyInfo(
  context: BrowserContext,
  options: VerifyInfoMockOptions = {},
): Promise<VerifyInfoMock> {
  const browser = contextBrowser(context);
  const user = options.user ?? USER_ASSISTANT;
  const editions = new Map<number, Edition>();
  for (const edition of options.editions ?? verifyEditions) {
    if (editions.has(edition.id))
      throw new Error(`[e2e] 待审项 ID 重复：${edition.id}，请检查 admin/verify/cases/*.ts`);
    editions.set(edition.id, edition);
  }

  /** 按待审项 ID 缓存渲染结果；同一个详情被反复打开时只渲染一次 */
  const rendered = new Map<number, Promise<string>>();
  const render = (edition: Edition) => {
    let html = rendered.get(edition.id);
    if (html === undefined) {
      html = renderEntry(browser, "verifyEntry", { user, edition });
      rendered.set(edition.id, html);
    }
    return html;
  };

  const mock = await mockAdminFrame<VerifyInfoPayload>(context, {
    path: "/frame/pageVerify-info",
    render: (payload) => {
      const verifyID = Number(payload.verifyID);
      const edition = Number.isInteger(verifyID) ? editions.get(verifyID) : undefined;
      if (edition === undefined) return undefined;

      const typeID = payload.typeID;
      if (typeID && typeID !== "0" && typeID !== EDIT_ACTION_TYPE[edition.action]) {
        // 类型与待审项对不上，同样不是这个接口该返回的内容
        return undefined;
      }
      return render(edition);
    },
  });

  return {
    ...mock,
    htmlFor: async (verifyID) => {
      const edition = editions.get(Number(verifyID));
      return edition === undefined ? undefined : render(edition);
    },
  };
}

/**
 * 单独渲染一份待审项详情。
 *
 * 与 {@link mockVerifyInfo} 不同，它不注册路由、也不要求待审项存在于某个集合里，
 * 适合「只想要 HTML」的规则用例：每条反例自己渲染、自己塞进审核窗。
 */
export async function renderVerifyEntry(
  context: BrowserContext,
  options: { user: User; edition: Edition },
): Promise<string> {
  return renderEntry(contextBrowser(context), "verifyEntry", {
    user: options.user,
    edition: options.edition,
  });
}

/**
 * **POST** `https://admin.mcmod.cn/frame/pageVerifyMod/`
 *
 * 后台「模组区内容审核」主页。用户点击左侧菜单后，站点把响应里的 `html` 嵌进 `#connect-frame`。
 */
export interface VerifyFrameMockOptions {
  /** 当前登录用户，默认取有自己管理员区域的审核助理 */
  user?: User;
}

export interface VerifyFrameMock extends AdminFrameMock<Record<string, never>> {
  /** 渲染出来并作为 `html` 返回的内容 */
  html: string;
  /** 完整响应体（`{ state: 0, html }`） */
  body: string;
}

/**
 * 拦截「模组区内容审核」主页请求，用 {@link ../VerifyFrame.vue} 渲染出来的 HTML 顶替真实响应。
 *
 * **注册顺序**与 {@link mockVerifyInfo} 相同：Playwright 后注册先匹配，整站兜底路由要先注册。
 */
export async function mockVerifyFrame(
  context: BrowserContext,
  options: VerifyFrameMockOptions = {},
): Promise<VerifyFrameMock> {
  const user = options.user ?? USER_ASSISTANT_MANAGER;
  const html = await renderEntry(contextBrowser(context), "verifyFrame", { user });
  const mock = await mockAdminFrame(context, {
    path: "/frame/pageVerifyMod",
    render: () => html,
  });

  return { ...mock, html, body: frameResponse(html) };
}

/**
 * **POST** `https://admin.mcmod.cn/frame/pageVerifyMod-list/`
 *
 * 待审列表。点击「按模组查找」的下拉框、类型下拉框、编辑者昵称或快捷筛选链接时，
 * 站点把响应里的 `html` 嵌进 `#connect-frame-sub`（详情行嵌进 `#verify-window-frame`）。
 */
export interface VerifyListMockOptions {
  /**
   * 模拟后端里「仍在队列中」的待审项。
   *
   * 默认使用 {@link verifyEditions}：让手动体验（`npm run e2e:manual`）能在列表里
   * 浏览到全部基线 / 反例。只关心筛选协议的用例可以传入更小的子集（例如 `editCases`）。
   */
  allEditions?: Edition[];
}

export interface VerifyListMock extends AdminFrameMock<VerifyListPayload> {
  /** 每份载荷对应的响应体（`{ state: 0, html }`） */
  bodies: () => Map<string, string>;
}

/**
 * 拦截待审列表请求，用 {@link ../VerifyList.vue} 渲染出来的 HTML 顶替真实响应。
 *
 * 与站点一致，筛选在「服务端」完成 —— 同一份待审项配上不同载荷会渲染出不同的行，
 * 因此这里按载荷缓存 SSR 结果，避免每次筛选都重新打包/起页面。
 *
 * **注册顺序**与 {@link mockVerifyInfo} 相同：Playwright 后注册先匹配，整站兜底路由要先注册。
 */
export async function mockVerifyList(
  context: BrowserContext,
  options: VerifyListMockOptions = {},
): Promise<VerifyListMock> {
  const browser = contextBrowser(context);
  const allEditions = options.allEditions ?? verifyEditions;
  const bodies = new Map<string, string>();
  const pending = new Map<string, Promise<string>>();

  const mock = await mockAdminFrame<VerifyListPayload>(context, {
    path: "/frame/pageVerifyMod-list",
    render: async (payload) => {
      const key = JSON.stringify(payload);
      let htmlPromise = pending.get(key);
      if (htmlPromise === undefined) {
        htmlPromise = renderEntry(browser, "verifyList", { payload, allEditions });
        pending.set(key, htmlPromise);
      }
      const html = await htmlPromise;
      bodies.set(key, frameResponse(html));
      return html;
    },
  });

  return { ...mock, bodies: () => bodies };
}
