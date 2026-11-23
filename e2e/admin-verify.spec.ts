import { expect, test, waitForUserscriptBoot } from "./support/fixtures";
import {
  ADMIN_ORIGIN,
  installAdminEnvironment,
  type AdminEnvironment,
} from "./support/admin/environment";
import { mockVerifyFrame, mockVerifyInfo, mockVerifyList } from "./support/admin/verify/mock";
import { editCases, verifyEditions } from "./support/admin/verify/cases";
import { USER_ASSISTANT, USER_ASSISTANT_MANAGER, USER_TESTIFICATE } from "./support/users";

/**
 * 后台「模组区内容审核」的离线用例。
 *
 * 站点打开某个待审项时会 `POST /frame/pageVerify-info/`，把响应里的 `html` 插进页面；
 * 脚本随后读取这段 DOM 做自动审查。这里先用 Vue 组件把那段 HTML 复刻出来，再由
 * `installAdminEnvironment` 统一顶替响应 —— 于是「一份待审项长什么样」变成了可版本化的代码，
 * 且整份待审项集合都能打开，不必等真实用户提交一份带错误的编辑。
 *
 * 整站兜底用的是 `support/admin/index.html`（原生后台框架）嵌入 `AdminApp.vue` 渲染结果
 * 后的整页 HTML，顶栏、左栏与 `#connect-frame` 都来自站点自己的结构。
 */

/** 在后台页面里按站点的格式发一次详情请求（表单字段 `data` 是 JSON 字符串） */
async function requestVerifyInfo(page: import("@playwright/test").Page, payload: object) {
  return page.evaluate(async (data) => {
    const response = await fetch("/frame/pageVerify-info/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: `data=${encodeURIComponent(JSON.stringify(data))}`,
    });
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      text: await response.text(),
    };
  }, payload);
}

/** 请求「模组区内容审核」主页 */
async function requestVerifyFrame(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const response = await fetch("/frame/pageVerifyMod/", { method: "POST" });
    return {
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      text: await response.text(),
    };
  });
}

/** 每个用例新建的离线环境；详情接口默认持有整份待审项集合 */
let environment: AdminEnvironment;

test.beforeEach(async ({ context, browser }) => {
  environment = await installAdminEnvironment(context, browser, USER_TESTIFICATE);
});

test("拦截 pageVerify-info，返回 Vue 组件渲染出的 HTML", async ({ page }) => {
  const expected = await environment.verifyInfo.htmlFor("1");
  expect(expected).toBeDefined();
  await page.goto(`${ADMIN_ORIGIN}/`);

  const response = await requestVerifyInfo(page, { typeID: "1", verifyID: "1" });
  expect(response.status).toBe(200);
  expect(response.contentType).toContain("application/json");

  const payload = JSON.parse(response.text) as { state: number; html: string };
  // 站点的响应形状必须保持 `{ state, html }`，脚本侧才能照常解析
  expect(Object.keys(payload).sort()).toEqual(["html", "state"]);
  expect(payload.state).toBe(0);
  expect(payload.html).toBe(expected);
  expect(environment.verifyInfo.hits()).toBe(1);

  // 顶部信息：来自 `Values.editActionTypes` 与用例数据。
  // 前缀必须是 `<p>操作类型：` —— 脚本用 `textContent.startsWith("操作类型")` 定位这一段
  expect(payload.html).toContain("<p>操作类型：模组编辑");
  expect(payload.html).toContain("，编辑者：花海，");
  // 退回记录的 `<p>` 带内联样式，这里只校验「紧跟标签就是正文」——模板换行残留的空白会被渲染器抹掉
  expect(payload.html).toMatch(/<p [^>]*>此项被退回了1次，/);
  // 审核人视角的按钮与对比表
  expect(payload.html).toContain('id="verify-pass-btn"');
  expect(payload.html).toContain('id="verify-refund-btn"');
  expect(payload.html).toContain("verify-info-table");
  expect(payload.html).toContain("_verifyinfo_left_val_");
  expect(payload.html).not.toContain("assistant-pass-btn");
});

test("助理视角只出助理按钮", async ({ context, page }) => {
  // 后注册的详情 mock 先匹配：同一份待审项换成助理视角渲染
  await mockVerifyInfo(context, { user: USER_ASSISTANT });
  await page.goto(`${ADMIN_ORIGIN}/`);

  const payload = JSON.parse(
    (await requestVerifyInfo(page, { typeID: "1", verifyID: "1" })).text,
  ) as { html: string };

  expect(payload.html).toContain('class="assistant-action-btns"');
  expect(payload.html).toContain('id="assistant-pass-btn"');
  expect(payload.html).toContain('id="assistant-refund-btn"');
  expect(payload.html).not.toContain('id="verify-pass-btn"');
});

test("不匹配的 verifyID 不会被吞掉", async ({ page }) => {
  await page.goto(`${ADMIN_ORIGIN}/`);

  const response = await requestVerifyInfo(page, { typeID: "1", verifyID: "999" });

  expect(environment.verifyInfo.hits()).toBe(0);
  // 落到兜底路由（整页后台框架），而不是被 mock 顶替
  expect(response.contentType).toContain("text/html");
  expect(response.text).toContain("Mcmodder E2E 离线测试后台");
  expect(response.text).toContain('id="connect-frame"');
});

test("拦截 pageVerifyMod，返回由 McmodRepository 驱动的审核主页", async ({ context, page }) => {
  const mock = await mockVerifyFrame(context, { user: USER_ASSISTANT_MANAGER });
  await page.goto(`${ADMIN_ORIGIN}/`);

  const response = await requestVerifyFrame(page);
  expect(response.status).toBe(200);
  expect(response.contentType).toContain("application/json");

  const payload = JSON.parse(response.text) as { state: number; html: string };
  expect(Object.keys(payload).sort()).toEqual(["html", "state"]);
  expect(payload.state).toBe(0);
  expect(payload.html).toBe(mock.html);
  expect(mock.hits()).toBe(1);

  // 页面骨架与站点脚本依赖的 DOM 节点
  expect(payload.html).toContain('id="refresh-btn"');
  expect(payload.html).toContain('id="class-version-list"');
  expect(payload.html).toContain('id="connect-frame-sub"');

  // 快速审核列表来自 `verifications` 表的聚合结果；种子与列表 / 详情 mock 共用同一份集合
  expect(payload.html).toContain(`花海 (${verifyEditions.length})`);
  expect(payload.html).toContain('data-uid="179043"');
  expect(payload.html).toContain("显示所有催审过的人");

  // 助理自己的管理员区域排在最前面，随后才是全部模组
  const managedIndex = payload.html.indexOf("ID:12850 格雷科技现代版");
  const allIndex = payload.html.indexOf("ID:1 我的世界原版");
  expect(managedIndex).toBeGreaterThan(-1);
  expect(allIndex).toBeGreaterThan(managedIndex);
  expect(payload.html).toContain("ID:2 工业时代2");
});

test("点击左侧菜单后，脚本在审核主页挂上快捷按钮", async ({ context, page }) => {
  const mock = await mockVerifyFrame(context, { user: USER_ASSISTANT_MANAGER });
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);

  // 站点自己的 `setPage()` 由 `support/admin/host.ts` 复刻：POST 后把 html 写进 #connect-frame，
  // `AdminInit` 据此识别出「模组区内容审核」并交给 `AdminVerifyInit`
  await page.click('a[data-page="pageVerifyMod"]');
  await expect(page.locator("#connect-frame h1.title")).toHaveText("模组区内容审核");
  await expect(page.locator("#mcmodder-check-verification")).toBeVisible();
  expect(mock.hits()).toBe(1);
  expect(errors).toEqual([]);
});

test("筛选待审列表并打开详情时，脚本按站点的 setPage 协议切换内容", async ({ context, page }) => {
  const frame = await mockVerifyFrame(context, { user: USER_ASSISTANT_MANAGER });
  // 这个用例只验证筛选协议，用 3 条网络待审项让行数固定；完整集合由下面的用例覆盖
  const list = await mockVerifyList(context, { allEditions: editCases });

  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);
  await page.click('a[data-page="pageVerifyMod"]');
  await expect(page.locator("#connect-frame h1.title")).toHaveText("模组区内容审核");

  // 快捷筛选链接（`verify-user-filter`）会把 UID 列表塞进载荷，与站点行为一致。
  // 当前种子数据只有一位提交者，所以这里点「花海 (N)」验证单 UID 的筛选载荷。
  await page
    .locator(`a.verify-user-filter:has-text("花海 (${verifyEditions.length})")`)
    .first()
    .click();
  await expect.poll(() => list.payloads()).toHaveLength(1);
  expect(list.payloads()[0]).toMatchObject({ classID: "-1", typeID: "0", userID: "179043" });
  expect(list.payloads()[0]!.userID?.split(",")).toEqual(["179043"]);
  // typeID = 0 时站点只提示「请选择一个审核类型」
  await expect(page.locator("#verify-list-table tbody tr")).toHaveCount(1);
  await expect(page.locator("#verify-list-table tbody")).toContainText("请选择一个审核类型");

  // 选择模组后按服务端逻辑筛出该模组下的待审项（此时还没有选类型）
  await page.selectOption("#class-version-list", "8");
  await expect.poll(() => list.payloads()).toHaveLength(2);
  expect(list.payloads()[1]).toMatchObject({ classID: "8" });
  await expect(page.locator("#verify-list-table tbody")).toContainText("请选择一个审核类型");

  // 选择类型后渲染出两行模组类待审项
  await page.selectOption("#verify-type-list", "1");
  await expect.poll(() => list.payloads()).toHaveLength(3);
  expect(list.payloads()[2]).toMatchObject({ classID: "8", typeID: "1" });
  await expect(page.locator("#verify-list-table tbody tr")).toHaveCount(2);
  await expect(page.locator("#verify-row-1-tr")).toContainText("喵呜机");
  await expect(page.locator("#verify-row-2-tr")).toContainText("喵呜机");

  // 类型菜单只列出当前筛选结果里存在的类型：8 下只有模组类待审项
  await expect(page.locator("#verify-type-list option")).toHaveText(["请选择", "模组"]);

  // 点开第一行 —— 站点把详情写进列表自带的 `#verify-window-frame`
  await page.click("#verify-row-1-tr td:nth-child(2)");
  await expect.poll(() => environment.verifyInfo.hits()).toBe(1);
  await expect(page.locator("#verify-window-frame .verify-info-table")).toBeVisible();
  await expect(page.locator("#verify-window")).toContainText("操作类型：模组编辑");

  expect(list.hits()).toBe(3);
  expect(frame.hits()).toBe(1);
  expect(errors).toEqual([]);
});

test("完整待审列表里的反例能直接打开详情", async ({ context, page }) => {
  const frame = await mockVerifyFrame(context, { user: USER_ASSISTANT_MANAGER });
  // 不传 allEditions：走默认的完整集合，验证反例确实作为待审项存在
  const list = await mockVerifyList(context);

  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);
  await page.click('a[data-page="pageVerifyMod"]');
  await expect(page.locator("#connect-frame h1.title")).toHaveText("模组区内容审核");

  // 模组类：网络用例、基线 101 与反例 201–245 都在「8 喵呜机 → 模组」下
  await page.selectOption("#class-version-list", "8");
  await expect.poll(() => list.payloads()).toHaveLength(1);
  await page.selectOption("#verify-type-list", "1");
  await expect.poll(() => list.payloads()).toHaveLength(2);
  const classRows = verifyEditions.filter(
    (edition) => edition.classID === 8 && edition.type === "1",
  ).length;
  await expect(page.locator("#verify-list-table tbody tr")).toHaveCount(classRows);

  // 反例 201（class_category_empty）只勾了杂项元素：列表仍要显示名称，详情也要能打开
  await page.click("#verify-row-201-tr td:nth-child(2)");
  await expect.poll(() => environment.verifyInfo.hits()).toBe(1);
  await expect(page.locator("#verify-window-frame .verify-info-table")).toBeVisible();
  await expect(page.locator("#verify-window")).toContainText("操作类型：模组添加");
  await expect(page.locator("#verify-window-frame .mcmodder-verify-simplecheck")).toBeVisible();

  // 资料类：基线 102 与反例 301–310 都在「1 我的世界原版 → 资料」下
  await page.selectOption("#class-version-list", "1");
  await expect.poll(() => list.payloads()).toHaveLength(3);
  await page.selectOption("#verify-type-list", "3");
  await expect.poll(() => list.payloads()).toHaveLength(4);
  await expect(page.locator("#verify-row-102-tr")).toContainText("工作台");
  await expect(page.locator("#verify-row-302-tr")).toContainText("工作台");

  // 反例 302（item_name_repeat）同样能像普通待审项一样点开
  await page.click("#verify-row-302-tr td:nth-child(2)");
  await expect.poll(() => environment.verifyInfo.hits()).toBe(2);
  await expect(page.locator("#verify-window-frame .verify-info-table")).toBeVisible();
  await expect(page.locator("#verify-window")).toContainText("操作类型：资料添加");

  expect(list.hits()).toBe(4);
  expect(frame.hits()).toBe(1);
  expect(errors).toEqual([]);
});

test("合成表待审项点开后渲染详情", async ({ context, page }) => {
  const frame = await mockVerifyFrame(context, { user: USER_ASSISTANT_MANAGER });
  // 同样只取网络用例，保证 `verify-row-3-tr` 就是那条合成表添加
  const list = await mockVerifyList(context, { allEditions: editCases });

  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);
  await page.click('a[data-page="pageVerifyMod"]');
  await expect(page.locator("#connect-frame h1.title")).toHaveText("模组区内容审核");

  await page.selectOption("#class-version-list", "1");
  await page.selectOption("#verify-type-list", "4");
  await expect(page.locator("#verify-row-3-tr")).toBeVisible();

  await page.click("#verify-row-3-tr td:nth-child(2)");
  await expect.poll(() => environment.verifyInfo.hits()).toBe(1);
  await expect(page.locator("#verify-window-frame .verify-info-table")).toBeVisible();

  // 添加类编辑没有「当前的内容」，但「提交的内容」必须完整渲染，不能只剩表头
  const detail = page.locator("#verify-window-frame");
  await expect(detail).toContainText("操作类型：合成表添加");
  await expect(detail).toContainText("合成表可视化");
  await expect(detail).toContainText("合成表源数据");
  await expect(detail.locator("tbody tr")).toHaveCount(2);
  await expect(detail).toContainText("工作台");

  expect(frame.hits()).toBe(1);
  expect(list.hits()).toBe(2);
  expect(errors).toEqual([]);
});
