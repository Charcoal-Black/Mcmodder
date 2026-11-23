import { expect, test, waitForUserscriptBoot } from "./support/fixtures";
import { CENTER_URL, checkLogin } from "./support/auth";

/**
 * 已登录场景（`logged-in` 项目）。
 *
 * 只有 `E2E_ONLINE=1` **且**存在有效登录态快照（或提供了 `MCMOD_UUID` / 账号）时，
 * `playwright.config.ts` 才会注册这个项目；否则本文件不会被任何项目收集。
 *
 * 登录判定走站点自己的 `/frame/CommonHeader/` 接口（脚本「实时通讯」用的同一个），
 * 一次 POST 拿到 uid / 昵称，不加载整页、也不依赖任何 v3 / v4 的页头 DOM。
 */
test("登录态可复用，脚本在 v4 页面正常启动", async ({ context, page, gm }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  // `_uuid` 是 HttpOnly，页面里（连脚本的 `document.cookie` 降级路径）都读不到，
  // 这里从 context 层确认它确实被带进了本次会话
  const uuid = (await context.cookies()).find((cookie) => cookie.name === "_uuid");
  expect(uuid?.httpOnly).toBe(true);

  const { uid, nickname } = await checkLogin(context);
  expect(uid).toBeGreaterThan(0);
  expect(nickname.trim().length).toBeGreaterThan(0);

  // 再确认「已登录的 v4 页面 + 用户脚本」这套组合本身没问题：
  // 个人中心是脚本里 `CenterInit` 那套 SPA 逻辑的主战场
  await page.goto(CENTER_URL, { waitUntil: "domcontentloaded" });
  await waitForUserscriptBoot(page, 30_000);

  expect(errors).toEqual([]);
  expect(gm.meta.version).toMatch(/^\d+\.\d+/);
});
