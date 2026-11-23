import type { Edition } from "../schema";
import { classBaseline, itemBaseline, tabBaseline } from "./baseline";
import { editCases } from "./network";
import { ruleCases } from "./rules";

/**
 * 离线后台「待审列表」里能看到的全部待审项。
 *
 * 这里的每一条都是**真正进入列表**的数据：列表 mock 按它筛选 / 渲染行，详情 mock 按 ID
 * 返回对应 HTML，种子数据也把它写进 `verifications` 表 —— 于是「手动打开某条待审项」
 * 与「自动用例断言某条待审项」走的是同一条路径，不存在只为断言临时渲染的 fixture。
 *
 * 三类来源：
 * - {@link editCases}：列表筛选 / 详情骨架 / 退回记录等网络用例的数据；
 * - {@link baselineEditions}：三类编辑的干净基线；
 * - {@link ruleCases}：规则台账的反例，每个 `id` 对应一条台账规则。
 *
 * ID 必须全局唯一（1–3 / 101–103 / 201–245 / 301–310 / 401–402），
 * `editrules.spec.ts` 的「待审项集合」用例会检查这一点。
 */

/** 三类编辑的干净基线，单独导出一份便于用例断言 */
export const baselineEditions: Edition[] = [classBaseline, itemBaseline, tabBaseline];

/** 规则反例本身；与 {@link ruleCases} 一一对应 */
export const ruleEditions: Edition[] = ruleCases.map((ruleCase) => ruleCase.edition);

/** 所有待审项，按 ID 升序排列（与站点列表的排序一致，手动体验时顺序稳定） */
export const verifyEditions: Edition[] = [...editCases, ...baselineEditions, ...ruleEditions].sort(
  (a, b) => a.id - b.id,
);
