import { test, waitForUserscriptBoot } from "./support/fixtures";
import { ADMIN_ORIGIN, installAdminEnvironment } from "./support/admin/environment";
import { mockVerifyFrame, mockVerifyList } from "./support/admin/verify/mock";
import { verifyEditions } from "./support/admin/verify/cases";
import { USER_TESTIFICATE } from "./support/users";

/**
 * 手动体验后台的「游乐场」用例。
 *
 * 只在 `E2E_MANUAL=1` 时由 `manual` project 运行（见 `playwright.config.ts`），
 * 不进入默认用例集，也不会在 CI 里挂起。
 *
 * ```bash
 * npm run e2e:manual
 * ```
 *
 * 启动后会自动打开「模组区内容审核」，随后停在 `page.pause()`：
 * 浏览器窗口可以自由点击（筛选、待审行、详情弹窗）。点 Inspector 的 Resume 开始操作，
 * **关闭浏览器窗口**才会结束用例 —— 误点 Resume 不会把页面一起关掉。
 *
 * 当前离线环境只接了 `pageVerifyMod` / `pageVerifyMod-list` / `pageVerify-info`
 * 三条接口，左栏其它菜单没有内容。
 */
test("手动体验「模组区内容审核」", async ({ context, browser, page }) => {
  // 手动操作没有固定时长，直接关掉用例超时
  test.setTimeout(0);

  await installAdminEnvironment(context, browser, USER_TESTIFICATE);
  await mockVerifyFrame(context, { user: USER_TESTIFICATE });
  await mockVerifyList(context);

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);

  // 直接进审核主页，省去每次手动点左栏
  await page.click('a[data-page="pageVerifyMod"]');
  await page.waitForSelector("#connect-frame h1.title");

  console.log(
    [
      "",
      "=== 后台手动体验 ===",
      "已打开「模组区内容审核」，可以自由点击：",
      `  - 待审列表里有 ${verifyEditions.length} 条待审项（网络用例 + 干净基线 + 规则反例），全部可以打开`,
      "  - 模组类：select「8 喵呜机」→ 类型选「模组」",
      "  - 资料 / 合成表：select「1 我的世界原版」→ 类型选「资料」或「合成表」",
      "  - 快捷键筛选：显示所有催审过的人 / 72 小时内提交过的人 等（仍需再选模组与类型）",
      "  - 点待审行的「名称」列 → 详情写入 #verify-window-frame（任意一行都能打开）",
      "左栏其它菜单没有离线 fixture，点了不会出现内容。",
      "点 Inspector 的 Resume 开始操作；关掉浏览器窗口才会结束。",
      "",
    ].join("\n"),
  );

  // 暂停只是为了打开 Inspector；用户点 Resume 后不要立刻收尾，
  // 否则「点一下 Resume 想开始操作」会直接把浏览器关掉。这里一直等到窗口被关闭。
  await page.pause();
  await new Promise<void>((resolve) => page.once("close", () => resolve()));
});
