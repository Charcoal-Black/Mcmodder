import { verifyEditions } from "../../admin/verify/cases/collection";
import type { RepositoryData } from "../types";
import { authors } from "./authors";
import { classes } from "./classes";
import { guis } from "./guis";
import { items } from "./items";
import { oredictIndex } from "./oredict";
import { tabs } from "./tabs";
import { users } from "./users";
// import { verifications } from "./verifications";

/**
 * 默认种子数据。
 *
 * 各表分开成独立文件，是为了让「加一条测试数据」只需要动一张表，`satisfies`
 * 还能保证每条记录都符合站点类型。这里的引用关系（物品→模组、合成表→资料/GUI、
 * 矿辞→资料）由 `validate.ts` 在模块加载时校验。
 */
const raw = {
  authors,
  classes,
  versions: {},
  items,
  tabs,
  posts: {},
  guis,
  users,
  // 待审项来自与列表 / 详情 mock 同一份集合：统计、筛选、详情不会各说各话
  verifications: Object.fromEntries(verifyEditions.map((edition) => [edition.id, edition])),
  oredictIndex,
} satisfies RepositoryData;

/** 递归冻结，防止某个组件顺手 `.sort()` / `.splice()` 把种子改坏，导致用例顺序相关 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }
  return value;
}

/**
 * 未经修改的基线数据。`McmodRepository.reset()` 会回到这里，
 * 所以它必须保持只读 —— 需要可变数据时用 `hydrate()` 注入一份副本。
 */
export const seed = deepFreeze(raw);
