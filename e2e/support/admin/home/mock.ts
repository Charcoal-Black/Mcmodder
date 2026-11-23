import type { BrowserContext } from "@playwright/test";
import { contextBrowser, frameResponse, mockAdminFrame, type AdminFrameMock } from "../frame-mock";
import { renderEntry } from "../verify/render";
import { USER_TESTIFICATE, type User } from "../../users";

/**
 * **POST** `https://admin.mcmod.cn/frame/pageHome/`
 *
 * 后台首页。登录后默认就停在这一页；点击左栏「首页」或页面上的「战术刷新」也会重新请求。
 */
export interface AdminHomeMockOptions {
  /** 按谁的身份渲染「我的信息」与联系方式表；默认全域管理员 */
  user?: User;
}

export interface AdminHomeMock extends AdminFrameMock<Record<string, never>> {
  /** 渲染出来并作为 `html` 返回的内容 */
  html: string;
  /** 完整响应体（`{ state: 0, html }`） */
  body: string;
}

/**
 * 拦截后台首页请求，用 {@link ./AdminHomePage.vue} 渲染出来的 HTML 顶替真实响应。
 *
 * 首页不读取请求载荷：无论来自登录后的首屏还是左栏「首页」，返回的都是同一份内容。
 *
 * **注册顺序**与 `verify/mock.ts` 里的 mock 相同：Playwright 后注册先匹配，
 * 整站兜底路由要先注册。
 */
export async function mockAdminHome(
  context: BrowserContext,
  options: AdminHomeMockOptions = {},
): Promise<AdminHomeMock> {
  const user = options.user ?? USER_TESTIFICATE;
  const html = await renderEntry(contextBrowser(context), "adminHomePage", { user });
  const mock = await mockAdminFrame(context, {
    path: "/frame/pageHome",
    render: () => html,
  });

  return { ...mock, html, body: frameResponse(html) };
}
