import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test, waitForUserscriptBoot } from "./support/fixtures";
import { ADMIN_ORIGIN, installAdminEnvironment } from "./support/admin/environment";
import type { Edition } from "./support/admin/verify/schema";
import { mockVerifyFrame, renderVerifyEntry } from "./support/admin/verify/mock";
import {
  baselineCases,
  baselineEditions,
  editCases,
  expectedResult,
  itemBaseline,
  ruleCases,
  ruleEditions,
  ruleEntry,
  verifyEditions,
} from "./support/admin/verify/cases";
import { RULE_ENTRIES } from "./support/admin/verify/cases/ledger";
import { USER_TESTIFICATE } from "./support/users";

/**
 * 审核页自动查错（`src/editrule/*`）的离线用例。
 *
 * 做法很直接：用 Vue fixture 渲染出站点本来会返回的详情 HTML，塞进 `#verify-window-frame`，
 * 让 `AdminVerifyInit.singleVerifyObserver` 像处理真实响应一样解析它，再断言
 * `.mcmodder-verify-simplecheck` 里的提示。
 *
 * 与 `admin-verify.spec.ts` 的分工：
 * - `admin-verify` 关心「请求被正确 mock、列表能筛选、详情骨架能打开」；
 * - 这里关心「解析出来的字段是否让 `editrule` 产生了正确的提示」，因此不碰待审列表。
 *
 * 断言必须是**精确相等**：`error` / `warning` / `info` 三个数组都要与期望一致。
 * 只断言「包含某条消息」会让基线里的杂音（链接解析串味、`mcversion` 映射错误、
 * 空内容占位 `-` 被当成字段……）永远藏在水下。
 *
 * 期望消息全部来自 `cases/ledger.ts`（规则台账），因此提示文案只维护一份；
 * 首个用例负责台账与实现的一致性，包括「已移植且审核页可达的规则必须都有反例」。
 */

/** 没有任何提示时 `displayCheckResult` 不会插入 `<p>`，三个数组都应为空 */
const EMPTY_RESULT: VerifyCheckResult = { error: [], warning: [], info: [] };

/** 规则源码；台账里的消息要能在这里逐字找到 */
const RULE_SOURCE = {
  class: new URL("../src/editrule/ClassEditRules.ts", import.meta.url),
  item: new URL("../src/editrule/ItemEditRules.ts", import.meta.url),
  tab: new URL("../src/editrule/TabEditRules.ts", import.meta.url),
  shared: new URL("../src/editrule/ContentBadWords.ts", import.meta.url),
} as const;

test.beforeEach(async ({ context, browser }) => {
  await installAdminEnvironment(context, browser, USER_TESTIFICATE);
  // 详情页的审核窗由审核主页提供 `#connect-frame-sub`，与站点点击菜单后的状态一致
  await mockVerifyFrame(context, { user: USER_TESTIFICATE });
});

// ---------------------------------------------------------------------------
// 台账
// ---------------------------------------------------------------------------

test("规则台账：已移植规则都有反例，提示文案与实现一致", () => {
  const ids = ruleCases.map((ruleCase) => ruleCase.id);

  // 用例 ID 不重复，且必须指向台账里已移植的规则
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    expect(ruleEntry(id).status, `用例 ${id} 指向了未移植的规则`).not.toBe("unported");
  }

  // 已移植 + 审核页可达 → 必须有反例；不可达 / 未移植 → 必须写清原因
  for (const entry of RULE_ENTRIES) {
    if (entry.status === "unported") {
      expect(entry.note, `未移植规则 ${entry.id} 必须说明原因`).toBeTruthy();
    } else if (entry.unreachable) {
      expect(entry.unreachable.length, `不可达规则 ${entry.id} 必须说明原因`).toBeGreaterThan(0);
    } else {
      expect(ids, `已移植规则 ${entry.id} 缺少反例`).toContain(entry.id);
    }
  }

  // 台账里的静态文案必须能在对应的规则源码里逐字找到；动态片段用 `${...}` 隔开
  for (const entry of RULE_ENTRIES) {
    if (entry.status === "unported") continue;
    const source = readFileSync(RULE_SOURCE[entry.scope], "utf8");
    entry.message
      .split(/\$\{[^}]*\}/)
      .filter((part) => part.length > 0)
      .forEach((part) =>
        expect(source, `${entry.id} 的提示与规则源码不一致：${part}`).toContain(part),
      );
  }
});

// 未移植 / 审核页不可达的规则各留一条 skipped 用例：报告里能看到缺口，但不会变红
for (const entry of RULE_ENTRIES) {
  if (entry.status === "unported") {
    test.fixme(`未移植：${entry.id}（${entry.trigger}）`, async () => {});
  } else if (entry.unreachable) {
    test.fixme(`审核页不可达：${entry.id}（${entry.unreachable}）`, async () => {});
  }
}

// ---------------------------------------------------------------------------
// 待审项集合
// ---------------------------------------------------------------------------

test("待审项集合：ID 唯一，基线与反例都在列表里且元数据齐全", () => {
  const ids = verifyEditions.map((edition) => edition.id);

  // 列表 / 详情 mock 以 `id` 为键，重复会让某一条永远打不开
  expect(new Set(ids).size).toBe(ids.length);
  // 列表按 ID 升序，手动体验时顺序稳定且与站点一致
  expect(ids).toEqual([...ids].sort((a, b) => a - b));

  // 基线 / 反例不是「临时渲染」的：它们必须都作为真正的待审项进入列表
  for (const edition of [...baselineEditions, ...ruleEditions]) {
    expect(ids, `待审项 ${edition.id} 不在 verifyEditions 里`).toContain(edition.id);
  }
  expect(verifyEditions).toHaveLength(editCases.length + 3 + ruleCases.length);

  // 列表行与详情都依赖这些字段，缺任何一项都不是一条「真正意义上的待审项」
  for (const edition of verifyEditions) {
    const where = `待审项 ${edition.id}`;
    expect(Number.isInteger(edition.id), `${where}：id 不是整数`).toBe(true);
    expect(edition.id, where).toBeGreaterThan(0);
    expect(edition.owner, `${where}：缺少提交者`).toBeGreaterThan(0);
    expect(edition.classID, `${where}：缺少所属模组`).toBeGreaterThan(0);
    expect(edition.editID, `${where}：editID 不合法`).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(edition.createdAt), `${where}：createdAt 不合法`).toBe(true);
    expect(Number.isFinite(edition.lastSubmittedAt), `${where}：lastSubmittedAt 不合法`).toBe(true);
    expect(edition.lastSubmittedAt, `${where}：提交时间倒挂`).toBeGreaterThanOrEqual(
      edition.createdAt,
    );
  }
});

// ---------------------------------------------------------------------------
// 页面操作
// ---------------------------------------------------------------------------

/** 打开「模组区内容审核」并挂一个空的详情窗，模拟站点点击待审项后的容器 */
async function openVerifyPage(page: Page) {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));

  await page.goto(`${ADMIN_ORIGIN}/`);
  await waitForUserscriptBoot(page);
  await page.click('a[data-page="pageVerifyMod"]');
  await expect(page.locator("#connect-frame h1.title")).toHaveText("模组区内容审核");

  await page.evaluate(() => {
    const sub = document.querySelector("#connect-frame-sub");
    if (!sub) throw new Error("找不到 #connect-frame-sub");
    const frame = document.createElement("div");
    frame.id = "verify-window-frame";
    sub.appendChild(frame);
  });

  return errors;
}

/** 把一份详情 HTML 写进审核窗，等脚本完成解析与查错 */
async function injectVerifyEntry(page: Page, html: string) {
  await page.evaluate((content) => {
    const frame = document.querySelector("#verify-window-frame");
    if (!frame) throw new Error("找不到 #verify-window-frame");
    frame.innerHTML = content;
  }, html);

  await expect(page.locator("#verify-window-frame .verify-info-table")).toHaveCount(1);
  await expect(page.locator(".mcmodder-verify-simplecheck")).toHaveCount(1);
}

/** 读取查错结果；容器里只有 `displayCheckResult` 写入的提示 */
async function readCheckResult(page: Page): Promise<VerifyCheckResult> {
  return page.evaluate(() => {
    const root = document.querySelector(".mcmodder-verify-simplecheck");
    if (!root) throw new Error("查错结果容器尚未生成");
    const texts = (selector: string) =>
      Array.from(root.querySelectorAll(selector)).map((p) => p.textContent?.trim() ?? "");
    return {
      error: texts("p.text-danger"),
      warning: texts("p.text-warning"),
      info: texts("p.text-info"),
    };
  });
}

/** 渲染并断言一份待审项的完整查错结果 */
async function expectCheckResult(
  page: Page,
  context: Parameters<typeof renderVerifyEntry>[0],
  edition: Edition,
  expected: VerifyCheckResult,
) {
  const html = await renderVerifyEntry(context, { user: USER_TESTIFICATE, edition });
  await injectVerifyEntry(page, html);
  await expect.poll(() => readCheckResult(page)).toEqual(expected);
}

// ---------------------------------------------------------------------------
// 用例
// ---------------------------------------------------------------------------

for (const baseline of baselineCases) {
  test(`基线：${baseline.key} 添加不产生任何查错提示`, async ({ context, page }) => {
    const errors = await openVerifyPage(page);
    await expectCheckResult(page, context, baseline.edition, EMPTY_RESULT);
    expect(errors).toEqual([]);
  });
}

for (const ruleCase of ruleCases) {
  test(`规则：${ruleCase.id}`, async ({ context, page }) => {
    const errors = await openVerifyPage(page);
    await expectCheckResult(
      page,
      context,
      ruleCase.edition,
      ruleCase.expect ?? expectedResult(ruleCase.id),
    );
    expect(errors).toEqual([]);
  });
}

// 词库是模组与资料正文共用的，单独用资料基线验证 `ItemEditRules` 也接上了这条链路
test("规则：common_content_machine（资料正文）", async ({ context, page }) => {
  const errors = await openVerifyPage(page);
  await expectCheckResult(
    page,
    context,
    {
      ...itemBaseline,
      id: 311,
      edit: { ...itemBaseline.edit, content: "<p>香草是一种常见的香料。</p>" },
    },
    {
      error: [],
      warning: [
        "正文介绍中含有疑似机翻的词汇: (香草)，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
      ],
      info: [],
    },
  );
  expect(errors).toEqual([]);
});
