import type { RepositoryData } from "../types";

/**
 * 合成表。
 *
 * 槽位里的数字是**资料 ID**，字符串是矿物词典/物品标签（见 `seed/oredict.ts`）——
 * 编辑载荷里两者都是字符串，这里按后端存储把可解析为正整数的值还原成数字。
 */
export const tabs = {
  1: {
    id: 1,
    itemID: 1,
    gui: 1,
    orderly: true,
    "slot-in-item": [3, "ingotSteel"],
    "slot-in-number": [1, 2],
    "slot-out-item": [1],
    "slot-out-number": [1],
  },
} satisfies RepositoryData["tabs"];
