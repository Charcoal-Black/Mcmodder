import type { Edition } from "../schema";
import type { TabEdition } from "../tab/schema";
import type { ClassEdition } from "../class/schema";
import { USER_ASSISTANT } from "../../../users";

/**
 * 只服务于**网络 mock / 列表筛选 / 详情骨架**的待审项。
 *
 * 这里的三条数据只保证：
 * - 待审列表能按模组、类型、提交者筛选出预期行数；
 * - 点开详情后能渲染出模组 / 合成表两类完整骨架；
 * - 退回记录与助理意见等「非规则」状态有地方展示。
 *
 * 自动查错的断言在 {@link ./rules.ts}。两边的数据最终都会进入 {@link ./collection.ts}
 * 的 {@link verifyEditions}，被列表 mock、详情 mock 与种子数据共用；因此这里仍应保持精简，
 * 不要把规则反例塞进来 —— 只关心筛选协议的用例会显式传入 `editCases` 这个子集。
 */

/** 提交内容的类型 */
type ClassData = McmodClassEditorInnerData;

/**
 * 站点侧的 `mcversion` 是「每个加载器都要有键」的完整映射，而用例通常只关心其中几个加载器，
 * 所以只对这一个字段放宽：写错加载器或版本仍然会被类型检查拦下。
 */
function mcversions(value: Partial<NonNullable<ClassData["mcversion"]>>) {
  return value as ClassData["mcversion"];
}

/** 待审项 ID；列表与详情 fixture 共用，必须与种子数据里的 `verifications` 对得上 */
export const CLASS_VERIFY_ID = 1;

/** 提交时间固定下来，避免每次渲染的「最后提交时间」都变 */
const SUBMIT_TIME = Date.UTC(2026, 9, 28, 12, 0, 0);
const REFUND_TIME = Date.UTC(2026, 9, 27, 9, 30, 0);
const SUGGEST_TIME = Date.UTC(2026, 9, 28, 13, 0, 0);

const baseEditExample = {
  redoID: 0,
  owner: 179043,
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

/** 一次「模组编辑」：改动了几处字段，并带有一条助理意见 与 一次退回记录 */
export const classEditExample: ClassEdition = {
  ...baseEditExample,
  id: CLASS_VERIFY_ID,
  refundCount: 1,
  refundReason: "相关链接的 Modrinth 地址指向了作者个人主页，请改为模组页面。",
  refunder: 1,
  refundAt: REFUND_TIME,
  type: "1",
  action: "class-edit",
  editID: 0,
  classID: 8,
  edit: {
    remark: "补充了 1.21.1 的版本支持。",
    reason: "同步官方更新日志中的版本支持范围。",
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
    "mode-1": { 0: "0" }, // 测试分组
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
  suggestions: [
    {
      assistant: USER_ASSISTANT.uid,
      type: "check",
      text: "Modrinth 链接请再核对一下，当前指向的是用户主页。",
      createdAt: SUGGEST_TIME,
    },
  ],
};

/** 一次「模组添加」：没有原内容，因此只会渲染一列 */
export const classAddExample: ClassEdition = {
  ...classEditExample,
  action: "class-add",
  id: CLASS_VERIFY_ID + 1,
  refundCount: 0,
  refundReason: "",
  refunder: 0,
  refundAt: 0,
  edit: {
    ...classEditExample.edit,
    remark: undefined,
    reason: undefined,
  },
  suggestions: [],
};

/** 一次「合成表添加」*/
export const tabAddExample: TabEdition = {
  ...baseEditExample,
  classID: 1,
  editID: 52,
  redoID: 0,
  type: "4",
  action: "tab-add",
  id: CLASS_VERIFY_ID + 2,
  edit: {
    gui: "1",
    "slot-in-item": {
      1: "plankWood",
      2: "plankWood",
      4: "plankWood",
      5: "plankWood",
    },
    "slot-out-item": {
      1: "52",
    },
  },
};

/** 所有网络用例；`id` 会被 {@link ../mock.ts} 当作 `verifyID` */
export const editCases: Edition[] = [classEditExample, classAddExample, tabAddExample];
