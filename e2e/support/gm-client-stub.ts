/**
 * 渲染 fixture 时顶替 `vite-plugin-monkey/client`（也就是源码里的 `$`）。
 *
 * 组件为了复用真实逻辑会顺带把 `src/Utils.ts`、`src/Values.ts` 拉进依赖图，而它们从
 * `$` 取 GM API。渲染过程只需要模块能求值、静态方法能算，不需要真的读写油猴存储，
 * 所以这里给一套「取默认值」的空实现 —— 真实 GM 行为由 `e2e/support/userscript.ts`
 * 注入的 shim 负责，两者互不干扰。
 *
 * 注意：这是**构建期**的别名目标（见 `admin/verify/render/index.ts`），不是运行时 shim。
 */

export function GM_getValue<T>(_key: string, defaultValue?: T): T | undefined {
  return defaultValue;
}

export function GM_setValue(_key: string, _value: unknown): void {}

export function GM_deleteValue(_key: string): void {}

export function GM_addValueChangeListener(
  _key: string,
  _callback: (key: string, previous: unknown, current: unknown, remote: boolean) => void,
): () => void {
  return () => {};
}

export function GM_registerMenuCommand(_name: string, _callback: () => void): void {}

export function GM_openInTab(_url: string, _options?: unknown): void {}

/** 渲染阶段不会有真实请求；一旦命中说明有组件在 setup 里偷偷发起了网络调用 */
export function GM_xmlhttpRequest(_options: unknown): { abort(): void } {
  throw new Error("[e2e] fixture 渲染阶段不应发起 GM_xmlhttpRequest");
}

export const GM_cookie = {
  list: (_details: unknown, callback: (cookies: unknown[], error?: unknown) => void) =>
    callback([], null),
  set: (_details: unknown, callback?: (error?: unknown) => void) => callback?.(null),
  delete: (_details: unknown, callback?: (error?: unknown) => void) => callback?.(null),
};

export const GM_info = {
  script: { name: "mcmodder-fixture", version: "0.0.0", namespace: "", matches: [], grants: [] },
  scriptHandler: "e2e",
  version: "e2e",
};

/**
 * 渲染页里没有油猴沙箱，页面 window 本身就是「所有 window」。
 *
 * 这两者由 `src/supabase/SupabaseUtils.ts` 在运行期读取，模块求值时用不到，
 * 但 Rollup 要求别名模块必须真的有这个导出，否则打包直接失败。
 */
export const monkeyWindow = globalThis;
export const unsafeWindow = globalThis;

export function GM_log(...args: unknown[]): void {
  console.log(...args);
}
