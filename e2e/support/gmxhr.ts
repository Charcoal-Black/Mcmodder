import type { BrowserContext } from "@playwright/test";

/**
 * `GM_xmlhttpRequest` 的 Node 侧代理。
 *
 * 脚本里所有网络请求都经由 `Utils.createRequest` 走 `GM_xmlhttpRequest`，而油猴的这个接口是
 * **无视同源策略**的。页面里用 `fetch` 顶替会让跨域请求（curseforge / modrinth / supabase 代理域）
 * 直接死在 CORS 预检上，所以这里把请求整体搬到 Node 侧：
 *
 * - 非匿名请求走 `context.request`：与浏览器上下文共享 cookie 容器（含 HttpOnly），跨域无限制；
 * - 匿名请求走 Node 的全局 `fetch`：天然不带 cookie 容器，对应 GM 的 `anonymous: true`；
 * - 外加一层 `handlers`，让用例可以按需 mock，不必真的联网。
 */

/** 页面侧发来的请求描述（可 JSON 序列化，不含回调） */
export interface GmXhrRequest {
  id: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: string;
  timeout?: number;
  anonymous: boolean;
}

/** 回给页面侧的响应描述；`status === 0` 表示网络层失败 */
export interface GmXhrResponse {
  status: number;
  statusText: string;
  responseHeaders: string;
  responseText: string;
  finalUrl: string;
  error?: "timeout" | "network";
}

/** 返回非空响应即视为已 mock；返回 `undefined` 则放行到真实网络 */
export type GmXhrHandler = (
  request: GmXhrRequest,
) => GmXhrResponse | undefined | void | Promise<GmXhrResponse | undefined | void>;

export interface GmCookieOperation {
  action: "list" | "set" | "delete";
  details?: Record<string, unknown>;
}

/** `GM_xmlhttpRequest` 在页面侧收到的选项（只声明脚本实际用到的字段） */
export interface GmXhrOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  anonymous?: boolean;
  context?: unknown;
  onload?: (event: GmXhrEvent) => void;
  onerror?: (event: GmXhrEvent & { error: string }) => void;
  ontimeout?: (event: GmXhrEvent) => void;
}

/** shim 回给页面的响应事件 */
export interface GmXhrEvent {
  readyState: 4;
  status: number;
  statusText: string;
  responseHeaders: string;
  responseText: string;
  response: string;
  responseXML: null;
  finalUrl: string;
  context?: unknown;
}

/** 用例可读取的观测记录 */
export interface GmRecorder {
  /** 按发生顺序记录的请求（含被 handler 拦下的） */
  requests: GmXhrRequest[];
  /** 按发生顺序记录的 cookie 操作 */
  cookieOperations: GmCookieOperation[];
}

const DEFAULT_TIMEOUT = 30_000;

/** 把响应头拼成 GM 的 `responseHeaders` 原始文本格式 */
function rawHeaders(headers: Headers | Array<{ name: string; value: string }>): string {
  const lines: string[] = [];
  if (headers instanceof Headers) headers.forEach((value, name) => lines.push(`${name}: ${value}`));
  else for (const header of headers) lines.push(`${header.name}: ${header.value}`);
  return lines.join("\r\n");
}

/** 真正发一个请求，永不抛错：失败统一折算成 `status: 0` */
async function performRequest(
  context: BrowserContext,
  request: GmXhrRequest,
): Promise<GmXhrResponse> {
  const method = request.method.toUpperCase();
  // 带 body 的 GET/HEAD 会被 fetch 拒绝，这里与 GM 的行为对齐（GM 也忽略 body）
  const hasBody = request.data !== undefined && method !== "GET" && method !== "HEAD";
  const timeout = request.timeout ?? DEFAULT_TIMEOUT;

  try {
    if (request.anonymous) {
      const response = await fetch(request.url, {
        method,
        headers: request.headers,
        body: hasBody ? request.data : undefined,
        redirect: "follow",
        signal: AbortSignal.timeout(timeout),
      });
      return {
        status: response.status,
        statusText: response.statusText,
        responseHeaders: rawHeaders(response.headers),
        responseText: await response.text(),
        finalUrl: response.url,
      };
    }

    const response = await context.request.fetch(request.url, {
      method,
      headers: request.headers,
      data: hasBody ? request.data : undefined,
      timeout,
      // 4xx/5xx 是「服务器答了」，GM 会照样触发 onload，不能当异常
      failOnStatusCode: false,
      maxRedirects: 20,
    });
    return {
      status: response.status(),
      statusText: response.statusText(),
      responseHeaders: rawHeaders(await response.headersArray()),
      responseText: await response.text(),
      finalUrl: response.url(),
    };
  } catch (error) {
    const name = (error as Error)?.name;
    const message = String((error as Error)?.message ?? error);
    const isTimeout =
      name === "TimeoutError" || name === "AbortError" || /timeout|timed out/i.test(message);
    return {
      status: 0,
      statusText: message,
      responseHeaders: "",
      responseText: "",
      finalUrl: request.url,
      error: isTimeout ? "timeout" : "network",
    };
  }
}

/** 转发 `GM_cookie` 到 Playwright 的 cookie 容器 */
async function performCookieOperation(
  context: BrowserContext,
  operation: GmCookieOperation,
): Promise<{ cookies?: unknown[]; error?: string }> {
  const details = (operation.details ?? {}) as {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    url?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  };

  switch (operation.action) {
    case "list": {
      const cookies = await context.cookies();
      return {
        cookies: cookies.filter(
          (cookie) =>
            (!details.name || cookie.name === details.name) &&
            (!details.domain || cookie.domain.includes(details.domain)) &&
            (!details.path || cookie.path === details.path),
        ),
      };
    }
    case "set": {
      if (!details.name || details.value === undefined) return { error: "缺少 name / value" };
      const target = details.url
        ? { url: details.url }
        : { domain: details.domain ?? "www.mcmod.cn", path: details.path ?? "/" };
      await context.addCookies([
        {
          name: details.name,
          value: details.value,
          ...target,
          httpOnly: details.httpOnly ?? false,
          secure: details.secure ?? false,
          sameSite: details.sameSite ?? "Lax",
        },
      ]);
      return {};
    }
    case "delete": {
      await context.clearCookies({
        name: details.name,
        domain: details.domain,
        path: details.path,
      });
      return {};
    }
  }
  return { error: `未知的 cookie 操作：${operation.action}` };
}

/**
 * 在 context 上挂 `__mcmodderE2E_xhr` / `__mcmodderE2E_cookie` 两个 binding。
 *
 * 必须在任何导航之前完成，否则 document-start 的脚本体取不到它们。
 */
export async function installGmBridge(
  context: BrowserContext,
  handlers: GmXhrHandler[] = [],
): Promise<GmRecorder> {
  const recorder: GmRecorder = { requests: [], cookieOperations: [] };
  let sequence = 0;

  await context.exposeBinding(
    "__mcmodderE2E_xhr",
    async (_source, request: Omit<GmXhrRequest, "id">): Promise<GmXhrResponse> => {
      const full: GmXhrRequest = { ...request, id: ++sequence };
      recorder.requests.push(full);

      for (const handler of handlers) {
        const mocked = await handler(full);
        if (mocked) return mocked;
      }
      return performRequest(context, full);
    },
  );

  await context.exposeBinding(
    "__mcmodderE2E_cookie",
    async (_source, operation: GmCookieOperation) => {
      recorder.cookieOperations.push(operation);
      try {
        return await performCookieOperation(context, operation);
      } catch (error) {
        return { error: String(error) };
      }
    },
  );

  return recorder;
}

declare global {
  interface Window {
    /** GM 存储（shim 实现，见 `userscript.ts`） */
    GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
    GM_setValue(key: string, value: unknown): void;
    GM_deleteValue(key: string): void;
    GM_addValueChangeListener(
      key: string,
      callback: (key: string, previous: unknown, current: unknown, remote: boolean) => void,
    ): () => void;
    GM_registerMenuCommand(name: string, callback: () => void): void;
    GM_openInTab(url: string): void;
    GM_xmlhttpRequest(options: GmXhrOptions): { abort(): void };
    GM_cookie: {
      list(details: unknown, callback: (cookies: unknown[], error?: unknown) => void): void;
      set(details: unknown, callback?: (error?: unknown) => void): void;
      delete(details: unknown, callback?: (error?: unknown) => void): void;
    };
    GM_info: { script: { name: string; version: string }; scriptHandler: string };
    unsafeWindow: Window;
    /** shim 状态：`menuCommands` / `openedTabs` 供用例断言 */
    __mcmodderE2E?: { menuCommands: Record<string, () => void>; openedTabs: string[] };
    __mcmodderE2E_xhr?: (request: Omit<GmXhrRequest, "id">) => Promise<GmXhrResponse>;
    __mcmodderE2E_cookie?: (operation: GmCookieOperation) => Promise<{
      cookies?: unknown[];
      error?: string;
    }>;
  }
}
