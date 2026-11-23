/**
 * 模组类编辑的审核数据类型与字段重组。
 *
 * 与 `src/types/types.d.ts` 里的 `McmodClassEditorData` 共用同一份全局声明 ——
 * 真实站点改动字段时，这里的模拟数据会立刻报错，不必手工同步。
 */
import { Values } from "../../../../../src/Values";
import { replaceKey, type BaseEdition } from "../schema";

export type ClassEdition = BaseEdition<McmodClassEditorData["class-data"], "1">;

export const ClassVerifyFieldGroups = {
  "mode-1": "mode",
  "mode-2": "mode",
} as const satisfies Partial<
  Record<keyof McmodClassEditorInnerData, Arrayable<keyof typeof Values.classEditVerifyTableFields>>
>;

export const GroupedClassEditFields = replaceKey(Values.classEditFields, ClassVerifyFieldGroups);
