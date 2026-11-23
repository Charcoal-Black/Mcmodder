import { expect, test, waitForUserscriptBoot } from "./support/fixtures";
import { ADMIN_ORIGIN, installAdminEnvironment } from "./support/admin/environment";
import { USER_TESTIFICATE } from "./support/users";

/**
 * 后台首页的离线用例。
 *
 * 登录后默认停在首页，点击左栏「首页」或页面上的「战术刷新」会重新 `POST /frame/pageHome/`。
 * 这里验证 `installAdminEnvironment` 自带的首页 mock，避免请求落到整站兜底、把整个后台框架
 * 又塞进 `#connect-frame`。
 */
test("点击左侧「首页」时按 setPage 协议渲染后台首页", async ({ context, browser, page }) => {
  const environment = await installAdminEnvironment(context, browser, USER_TESTIFICATE);
  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);

  await page.click('a[data-page="pageHome"]');

  await expect(page.locator("#connect-frame h1.title")).toHaveText("MC百科后台管理中心");
  await expect(page.locator("#connect-frame")).toContainText("常用链接");
  await expect(page.locator("#from-change-user-info")).toBeVisible();
  // 全域管理员的编辑员 / 管理员区域都显示为「全域」
  await expect(page.locator("#connect-frame")).toContainText("全域");
  expect(environment.home.hits()).toBe(1);
});
