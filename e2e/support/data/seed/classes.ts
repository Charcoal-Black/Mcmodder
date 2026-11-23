import type { RepositoryData } from "../types";

import classContent8 from "./class/8.html?raw";

/**
 * 模组。
 *
 * 这里放的是「后端当前状态」，待审的原始编辑内容也以这里为准。
 */
export const classes = {
  1: {
    id: 1,
    createdAt: Date.UTC(2013, 0, 1),
    name: "我的世界原版",
    ename: "Minecraft",
    sname: "MC",
    intro: "Minecraft 原版内容。",
  },
  2: {
    id: 2,
    createdAt: Date.UTC(2013, 1, 1),
    name: "工业时代2",
    ename: "Industrial Craft 2",
    sname: "IC2",
    intro: "经典的科技向模组。",
    modid: ["ic2"],
  },
  8: {
    id: 8,
    createdAt: Date.UTC(2026, 10, 2),
    name: "喵呜机",
    ename: "Meow Machine",
    sname: "M2",
    intro: "内容审核模拟器：投稿、审核、梗图反馈。",
    content: classContent8,
    modid: ["meowmachine"],
    category: [[1, 1]],
    platform: [1],
    api: [1],
    "mode-1": 1,
    "mode-2": 1,
    status: 1,
    source: 1,
    link: [
      {
        site: "github",
        url: "https://github.com/zgxhzhr/MeowMachine",
      },
    ],
    relation: [
      {
        title: "",
        list: [{ type: 2, id: 2524 }],
      },
    ],
    author: [{ id: 42025, select: ["owner"] }],
  },
  2524: {
    id: 2524,
    createdAt: Date.UTC(2017, 11, 24),
    name: "更多喵呜机",
    ename: "More Meowing Machinery",
    sname: "M3",
    modid: ["moremeowingmachinery"],
  },
  12850: {
    id: 12850,
    createdAt: Date.UTC(2019, 5, 1),
    name: "格雷科技现代版",
    ename: "GregTechCEu Modern",
    sname: "GTCEu",
    intro: "格雷科技在 1.19+ 的重制版本。",
    modid: ["gtceu"],
    category: [[1, 1]],
    platform: [1],
    api: [1],
  },
} satisfies RepositoryData["classes"];
