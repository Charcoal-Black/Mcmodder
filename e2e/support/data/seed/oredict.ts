import type { RepositoryData } from "../types";

/**
 * 「标签 → 资料」索引表。
 *
 * 这张表**不会**从 `items[].oredict` 自动生成：真实站点上它由站长的重建流程维护，
 * 新资料即使写了标签，也要等索引更新后才能被搜到。这里保持同样的独立性：
 * 想模拟「索引滞后」，只需让本表与资料上的 `oredict` 不一致即可。
 *
 * 标签原文按站点的书写习惯（驼峰）保留，查询时会统一规范化成小写。
 */
export const oredictIndex = [
  { tag: "ingotSteel", itemIDs: [1] },
  { tag: "oreIron", itemIDs: [2, 3] },
  { tag: "workbench", itemIDs: [52] },
  { tag: "plankWood", itemIDs: [40, 10967, 10968, 10969, 10970, 10971] },
] satisfies RepositoryData["oredictIndex"];
