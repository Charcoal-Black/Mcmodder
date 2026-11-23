/**
 * 用例与 fixture 页面之间约定的临时全局标记（纯编辑器提示，不参与构建）。
 */

interface Window {
  /** `page.evaluate` 里登记监听器后置位，供 Node 侧确定性地等待 */
  __e2eListening?: boolean;
  /** 见 `e2e/fixtures/pages/head-script.html`：页面第一个脚本看到的注入状态 */
  __headScriptState?: {
    readyState: string;
    shimReady: boolean;
    bundleRan: boolean;
  };
  /** 离线后台宿主 shim 的观测数据，见 `e2e/support/admin/host.ts` */
  __mcmodderE2EAdminHost?: {
    pages: Array<{ page: string; frame: string; data: Record<string, unknown> }>;
    messages: Array<{ title?: string; message?: string; type?: string }>;
  };
}
