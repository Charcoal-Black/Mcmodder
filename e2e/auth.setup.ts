import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { test as setup } from "@playwright/test";
import { AUTH_FILE, checkLogin, getCredentials, getUuid, hasFreshAuthState } from "./support/auth";

/**
 * 登录态准备（`auth` 项目，仅 `E2E_ONLINE=1` 且存在有效快照或登录凭据时才会被启用）。
 *
 * ```bash
 * # 推荐：直接给 `_uuid`（HttpOnly，站点的唯一登录凭据；与脚本「账号快捷切换」用的是同一个值）
 * E2E_ONLINE=1 MCMOD_UUID=xxx npx playwright test --project=auth
 *
 * # 兜底：给账号密码，走登录表单
 * E2E_ONLINE=1 MCMOD_USERNAME=xxx MCMOD_PASSWORD=yyy npx playwright test --project=auth
 *
 * # 之后 30 天内直接复用快照
 * E2E_ONLINE=1 npx playwright test --project=logged-in
 * ```
 *
 * 凭据只从环境变量读，不落盘；快照写到 `playwright/.auth/`（已被 `.gitignore` 忽略）。
 */
setup("准备登录态快照", async ({ context, page }) => {
  if (hasFreshAuthState()) {
    console.log(`[e2e] 复用登录态快照：${AUTH_FILE}`);
    return;
  }

  const uuid = getUuid();
  const credentials = getCredentials();
  if (!uuid && !credentials) {
    throw new Error(
      "没有可用的登录态快照，也没有提供登录凭据。\n" +
        "请设置 MCMOD_UUID（推荐）或 MCMOD_USERNAME + MCMOD_PASSWORD 后重试。",
    );
  }

  if (uuid) {
    // 与 `Utils.setUuidCookie` 的属性保持一致：站点靠这个 HttpOnly cookie 认人
    await context.addCookies([
      { name: "_uuid", value: uuid, domain: ".mcmod.cn", path: "/", httpOnly: true, secure: true },
    ]);
  } else {
    await page.goto("https://www.mcmod.cn/login/", { waitUntil: "domcontentloaded" });
    await page.locator("#login-username").fill(credentials!.username);
    await page.locator("#login-password").fill(credentials!.password);
    await page.locator("#login-remember").check();
    await page.locator("#login-action-btn").click();
    // 登录是 AJAX；具体是否成功交给下面的个人中心跳转来判定
    await page.waitForLoadState("networkidle");
  }

  const { uid, nickname } = await checkLogin(context);
  console.log(`[e2e] 已登录：uid = ${uid}，昵称 = ${nickname}`);

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  console.log(`[e2e] 登录态已保存：${AUTH_FILE}`);
});
