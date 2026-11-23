import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE, isAuthEnabled } from "./e2e/support/auth";

/**
 * 用户脚本（`dist/mcmodder.user.js`）的端到端测试。
 *
 * 注入方式见 `e2e/support/userscript.ts`：产物被当作 document-start 脚本注入页面 main world，
 * GM API 由 `e2e/support/` 里的 shim 提供，网络经 Node 侧 bridge 转发。
 *
 * ```bash
 * npm run build                       # 注入的是构建产物，改完 src 必须重建
 * npm run e2e                         # 离线用例（默认，不联网）
 * npm run e2e:manual                  # 手动体验后台（有头浏览器 + Inspector，不跑断言）
 * E2E_ONLINE=1 npm run e2e            # 额外跑真实 mcmod.cn（需要登录态时见下）
 *
 * # 登录态：`_uuid`（HttpOnly）就是站点的唯一登录凭据；快照 30 天内自动复用
 * E2E_ONLINE=1 MCMOD_UUID=xxx npx playwright test --project=auth
 * ```
 *
 * 项目划分（`E2E_ONLINE=1` 才会注册 `online` 之外的登录相关项目）：
 * - `offline`：本地 HTML 顶替站点，纯离线
 * - `manual`：仅 `E2E_MANUAL=1` 时注册，有头浏览器 + `page.pause()`，用于手动体验
 * - `online`：真实站点，匿名
 * - `auth`：登录并保存 `storageState`（依赖 `E2E_ONLINE=1` + 快照或账号）
 * - `logged-in`：带登录态跑真实站点（依赖 `auth`）
 */
const desktop = { ...devices["Desktop Chrome"] };
const authEnabled = isAuthEnabled();
const manualEnabled = process.env.E2E_MANUAL === "1";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  /* 每个用例都会起一个全新 context（GM 存储镜像在 localStorage 里，天然隔离） */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  /* 联网用例要等真实站点，留足余量 */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    trace: "on-first-retry",
    video: "off",
    /* 脚本是 Chrome 用户脚本，按桌面视口跑；WebGL 部件（Splash3D）需要 swiftshader */
    viewport: { width: 1440, height: 900 },
  },

  projects: [
    {
      name: "offline",
      testMatch: /(injection|match-rules|admin-verify|admin-home|editrules)\.spec\.ts/,
      use: desktop,
    },
    {
      name: "online",
      testMatch: /online\.spec\.ts/,
      use: desktop,
    },
    /* 手动体验项目：只有显式设置 E2E_MANUAL=1 才注册，避免默认用例集挂起在 page.pause() */
    ...(manualEnabled
      ? [
          {
            name: "manual",
            testMatch: /admin-playground\.spec\.ts/,
            /* page.pause() 必须跑在有头模式；这里写死，省得每次加 --headed */
            use: { ...desktop, headless: false },
          },
        ]
      : []),
    /* 登录相关项目只在有快照或账号时才注册，避免「缺文件」式的伪失败 */
    ...(authEnabled
      ? [
          {
            name: "auth",
            testMatch: /auth\.setup\.ts/,
            use: desktop,
          },
          {
            name: "logged-in",
            testMatch: /logged-in\.spec\.ts/,
            dependencies: ["auth"],
            use: { ...desktop, storageState: AUTH_FILE },
          },
        ]
      : []),
  ],
});
