import type { Browser, BrowserContext, Route } from "@playwright/test";

/**
 * 后台 `setPage()` 接口的通用 mock 骨架。
 *
 * 站点每个 `POST /frame/<page>/` 都遵守同一套协议：表单字段 `data` 是 JSON 字符串，
 * 响应是 `{ state: 0, html }`。各页面的 mock 只需要提供「请求载荷 → HTML」的映射，
 * 路径匹配、方法校验、响应包装与命中计数都在这里完成。
 */

/** 把 HTML 包成站点约定的响应体 */
export function frameResponse(html: string): string {
  return JSON.stringify({ state: 0, html });
}

/** 转义正则里的路径字符 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 生成接口路径的匹配规则。
 *
 * 允许结尾斜杠与查询串，例如 `/frame/pageHome/`、`/frame/pageHome/?x=1` 都算命中。
 *
 * @param path 接口路径，需以 `/` 开头，如 `/frame/pageHome`
 */
export function framePattern(path: string): RegExp {
  return new RegExp(`${escapeRegExp(path)}/?(?:\\?.*)?$`);
}

/**
 * 从 `setPage()` 的请求体里取出 JSON。
 *
 * 站点的表单字段 `data` 是 JSON 字符串；这里也兼容直接发裸 JSON 的请求，方便用例手写。
 */
export function parseFramePayload<P = Record<string, never>>(postData: string | null): P {
  if (!postData) return {} as P;
  const raw = new URLSearchParams(postData).get("data") ?? postData;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as P) : ({} as P);
  } catch {
    return {} as P;
  }
}

/**
 * 取 context 所属的浏览器。
 *
 * fixture 渲染需要新开一个干净的 context，因此 mock 只能在 `browser.newContext()`
 * 创建的 context 上使用；拿不到浏览器时给出统一报错，避免每个调用方各写一遍。
 */
export function contextBrowser(context: BrowserContext): Browser {
  const browser = context.browser();
  if (!browser)
    throw new Error("[e2e] context 不是由 browser.newContext() 创建的，无法渲染 fixture");
  return browser;
}

/** 通用 mock 暴露给用例的观察接口 */
export interface AdminFrameMock<P> {
  /** 命中并返回 HTML 的请求次数 */
  hits: () => number;
  /** 命中请求的载荷（按到达顺序） */
  payloads: () => P[];
  /** 移除路由（同一用例里换一份 mock 时用） */
  dispose: () => Promise<void>;
}

export interface AdminFrameMockOptions<P> {
  /** 接口路径，如 `/frame/pageHome` */
  path: string;
  /** 只处理该 HTTP 方法，默认 `POST` */
  method?: string;
  /** 解析请求体，默认 {@link parseFramePayload} */
  parse?: (postData: string | null) => P;
  /**
   * 根据请求载荷生成要放进 `html` 的内容。
   *
   * 返回 `undefined` 表示这条请求不归本 mock 管，交还给下一条路由 / 真实网络。
   */
  render: (payload: P) => string | undefined | Promise<string | undefined>;
}

/**
 * 注册一个后台 frame 接口 mock。
 *
 * **注册顺序**：Playwright 的路由是「后注册先匹配」。如果同时还有一个兜底的整站 stub，
 * 要先注册它、再调用本函数，否则兜底路由会把 POST 一起吃掉。
 */
export async function mockAdminFrame<P = Record<string, never>>(
  context: BrowserContext,
  options: AdminFrameMockOptions<P>,
): Promise<AdminFrameMock<P>> {
  const pattern = framePattern(options.path);
  const method = options.method ?? "POST";
  const parse = options.parse ?? parseFramePayload<P>;
  const payloads: P[] = [];

  const handler = async (route: Route) => {
    if (route.request().method() !== method) {
      // 同路径的其它请求不属于这个接口，交还给下一条路由 / 真实网络
      return route.fallback();
    }

    const payload = parse(route.request().postData());
    const html = await options.render(payload);
    if (html === undefined) {
      // 这次请求不归本 mock 处理，不要计为命中
      return route.fallback();
    }

    payloads.push(payload);
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: frameResponse(html),
    });
  };

  await context.route(pattern, handler);

  return {
    hits: () => payloads.length,
    payloads: () => payloads,
    dispose: () => context.unroute(pattern, handler),
  };
}
