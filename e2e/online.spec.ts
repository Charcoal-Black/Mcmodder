import { expect, test, waitForUserscriptBoot } from "./support/fixtures";

/**
 * 真实站点用例：需要网络与 mcmod.cn 可达，默认不跑。
 *
 * ```
 * E2E_ONLINE=1 npx playwright test e2e/online.spec.ts --headed
 * ```
 *
 * 这组用例的价值在于「宿主环境完整时脚本真能跑起来」（jQuery 就位、`Init` 全部执行、
 * 菜单命令注册完成），这些恰恰是离线替身页覆盖不到的部分。
 */
test.skip(
  process.env.E2E_ONLINE !== "1",
  "需要设置 E2E_ONLINE=1 才会访问真实 mcmod.cn（离线用例见 injection.spec.ts）",
);

test("首页：脚本启动、遮罩移除、菜单命令注册完成", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto("https://www.mcmod.cn/", { waitUntil: "domcontentloaded" });
  await waitForUserscriptBoot(page, 30_000);

  // 菜单命令由 `MenuCommandLoader` 在 `Mcmodder` 构造流程里注册，
  // 能读到它说明「宿主 jQuery → Mcmodder → loader」整条链都跑通了
  await page.waitForFunction(
    () => Object.keys(window.__mcmodderE2E?.menuCommands ?? {}).length > 0,
    {
      timeout: 30_000,
    },
  );

  expect(await page.evaluate(() => Object.keys(window.__mcmodderE2E!.menuCommands))).toContain(
    "打开设置",
  );
  expect(errors).toEqual([]);
});
