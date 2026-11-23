import type { RepositoryData } from "../types";
// 正文以 `item/<资料 ID>.html` 为准：正文 HTML 与数据分开放，改文案时不必再碰这份 TS。
import content52 from "./item/52.html?raw";
import content54 from "./item/54.html?raw";

/**
 * 物品资料。
 *
 * `oredict` 是资料**自身**登记的标签，数组形式对应编辑载荷里以逗号分隔的字符串。
 * 按标签反查资料走的是 `seed/oredict.ts` 里那张独立索引表，两者不会自动同步。
 *
 * `generalTo` 用来演示「已被综合」的分支：3 号资料综合到了 2 号，
 * 于是 `getItemsByGeneral(2)` 会返回它，而 3 号自己的页面上会标注综合去向。
 *
 * `content` 有对应 `item/<资料 ID>.html` 时一律引用文件；1~3 号是合成出来的占位资料，
 * 没有真实页面，才继续内联。
 */
export const items = {
  1: {
    id: 1,
    classID: 8,
    name: "钢锭",
    content: "<p>喵呜机添加的钢锭。</p>",
    oredict: ["ingotSteel"],
  },
  2: {
    id: 2,
    classID: 8,
    name: "铁矿石",
    content: "<p>喵呜机处理的铁矿石。</p>",
    oredict: ["oreIron"],
  },
  3: {
    id: 3,
    classID: 8,
    name: "深层铁矿石",
    content: "<p>深层铁矿石，已综合至铁矿石。</p>",
    oredict: ["oreIron"],
    generalTo: 2,
  },
  52: {
    id: 52,
    classID: 1,
    name: "工作台",
    ename: "Crafting Table",
    content: content52,
    oredict: ["workbench"],
    maxstack: 64,
    regname: "minecraft:crafting_table",
  },
  54: {
    id: 54,
    classID: 1,
    name: "熔炉",
    ename: "Furnace",
    content: content54,
    maxstack: 64,
    regname: "minecraft:furnace",
  },

  // 木板
  222732: {
    id: 222732,
    classID: 1,
    name: "木板",
    ename: "Planks",
  },
  40: {
    id: 40,
    classID: 1,
    name: "橡木木板",
    ename: "Oak Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 0,
  },
  10967: {
    id: 10967,
    classID: 1,
    name: "云杉木板",
    ename: "Spruce Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 1,
  },
  10968: {
    id: 10968,
    classID: 1,
    name: "白桦木板",
    ename: "Birch Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 2,
  },
  10969: {
    id: 10969,
    classID: 1,
    name: "丛林木板",
    ename: "Jungle Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 3,
  },
  10970: {
    id: 10970,
    classID: 1,
    name: "金合欢木板",
    ename: "Acacia Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 4,
  },
  10971: {
    id: 10971,
    classID: 1,
    name: "深色橡木木板",
    ename: "Dark Oak Wood Planks",
    generalTo: 222732,
    oredict: ["plankWood", "minecraft:planks"],
    maxstack: 64,
    regname: "minecraft:planks",
    metadata: 5,
  },
} satisfies RepositoryData["items"];
