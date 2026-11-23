import type { Edition } from "../schema";
import type { ClassEdition } from "../class/schema";
import type { ItemEdition } from "../item/schema";
import type { TabEdition } from "../tab/schema";

/**
 * 三类编辑的「干净基线」。
 *
 * 基线只有一条规则：**自动查错必须一条提示都不产生**。因此这里的每个字段都按
 * 编辑帮助与审核消息的正面口径填写（名称不重复、图标齐全、链接可访问、正文以句号结尾……），
 * 反例只在副本上改动一处，断言才能精确等于「那一条消息」。
 *
 * 与 {@link ./network.ts} 的区别：
 * - `network.ts` 服务于「列表筛选 / 详情骨架」这类网络 mock 用例，允许保留退回记录、助理意见；
 * - 这里的基线只服务 `src/editrule/*`，尽量不引入无关状态。
 *
 * 两者都会进入 {@link ./collection.ts} 的 {@link verifyEditions}，因此基线同样可以在
 * 手动体验的待审列表里打开。
 */

/** 提交时间固定下来，避免每次渲染的「最后提交时间」都变 */
const SUBMIT_TIME = Date.UTC(2026, 9, 28, 12, 0, 0);

/** 三类基线共用的待审项元信息 */
function baseEdition(id: number, classID: number, editID: number) {
  return {
    id,
    owner: 179043,
    classID,
    editID,
    redoID: 0,
    createdAt: SUBMIT_TIME,
    lastSubmittedAt: SUBMIT_TIME,
    urgeCount: 0,
    urgeAt: 0,
    refunder: 0,
    refundCount: 0,
    refundAt: 0,
    refundReason: "",
    suggestions: [],
  } satisfies Partial<Edition>;
}

/**
 * 站点侧的 `mcversion` 是「每个加载器都要有键」的完整映射，而用例通常只关心其中几个加载器，
 * 所以只对这一个字段放宽：写错加载器或版本仍然会被类型检查拦下。
 */
function mcversions(value: Partial<NonNullable<McmodClassEditorInnerData["mcversion"]>>) {
  return value as McmodClassEditorInnerData["mcversion"];
}

/** 1×1 透明 PNG；审核页的图标解析会直接 `atob` 这个字符串，不能换成种子图片 URL */
const ICON_32 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const ICON_128 = ICON_32;

/** 模组添加：所有字段都应是「不会触发任何提示」的正面示例 */
export const classBaseline: ClassEdition = {
  ...baseEdition(101, 8, 0),
  type: "1",
  action: "class-add",
  edit: {
    name: "喵呜机",
    ename: "Meow Machine",
    sname: "M2",
    intro: "内容审核模拟器：投稿、审核、梗图反馈。",
    content:
      "<p>一个关于「把条目送进百科的编辑审核」的 Minecraft 二创模组——<b>一半教学，一半游戏。</b></p>",
    tag: "科技,物流,能源",
    keys: "M2,喵呜机,重生是希望,MC百科,MCMOD",
    modid: "meowmachine",
    cfprojectid: "123456",
    mrprojectid: "qwertyui",
    "cover-data": "https://i.mcmod.cn/class/cover/20261121/1234567890_123456_abcd.jpg",
    "cover-delete": { 0: "0" },
    link: {
      0: {
        title: "curseforge",
        href: "https://www.curseforge.com/minecraft/mc-mods/meowmachine",
        text: "",
        custom: "",
      },
      1: {
        title: "modrinth",
        href: "https://modrinth.com/mod/meowmachine/",
        text: "",
        custom: "",
      },
      2: {
        title: "github",
        href: "https://github.com/zgxhzhr/MeowMachine",
        text: "源码",
        custom: "",
      },
    },
    category: { 0: "1,1" },
    mcversion: mcversions({
      "1": { 0: "25", 1: "65" },
      "13": { 0: "65" },
    }),
    platform: { 0: "1" },
    api: { 0: "1", 1: "13" },
    "mode-1": { 0: "0" },
    "mode-2": { 0: "1" },
    relation: {
      0: {
        title: "",
        list: {
          0: { type: "1", id: "8" },
          1: { type: "3", id: "2524" },
        },
      },
    },
    status: { 0: "1" },
    source: { 0: "1" },
    license: {
      0: {
        title: "源码",
        list: {
          0: {
            type: ["source"],
            name: "MIT",
            link: "https://github.com/zgxhzhr/MeowMachine/blob/main/LICENSE",
            text: "",
          },
        },
      },
    },
    author: {
      add: {
        0: { name: "重生是希望", select: ["mascot"] },
      },
      link: {
        0: { id: "42025", select: ["programmer"] },
      },
    },
    activity: { 0: "Teacon2026" },
  },
};

/** 资料添加：物品/方块，图标与注册名等字段齐全 */
export const itemBaseline: ItemEdition = {
  ...baseEdition(102, 1, 52),
  type: "3",
  action: "item-add",
  edit: {
    name: "工作台",
    ename: "Crafting Table",
    /** 资料分类（自由文本） */
    type: "工作台",
    /** 资料类型（数字 ID），`1` 为物品/方块 */
    category: { 0: "1" },
    regname: "minecraft:crafting_table",
    damage: "0",
    maxstack: "64",
    metadata: "0",
    oredict: "craftingTableWood",
    "icon-32x-data": ICON_32,
    "icon-128x-data": ICON_128,
    content: "<p>用于合成物品的基础方块。</p>",
  },
};

/** 合成表添加：3×3 工作台的样板配方，输入输出都非空 */
export const tabBaseline: TabEdition = {
  ...baseEdition(103, 1, 52),
  type: "4",
  action: "tab-add",
  edit: {
    gui: "1",
    orderly: { 0: "0" },
    "slot-in-item": {
      1: "52",
      2: "52",
      4: "52",
      5: "52",
    },
    "slot-out-item": {
      1: "52",
    },
  },
};
