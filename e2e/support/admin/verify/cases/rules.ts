import type { Edition } from "../schema";
import { classBaseline, itemBaseline, tabBaseline } from "./baseline";
import { RULE_ENTRIES, type RuleEntry, type RuleLevel } from "./ledger";

/**
 * `src/editrule/*` 的表驱动反例。
 *
 * 每条用例都是基线的一份副本，**只改一处**触发条件，`id` 指向 {@link ./ledger.ts} 里的台账条目：
 * 期望消息直接从台账推导（`error` / `warning` / `info` 三个数组精确相等），因此文案只维护一份。
 * 只有消息里带动态片段（如「以下运作方式还未勾选版本：NeoForge。」）时，用例才自己提供
 * {@link RuleCase.expect}；台账完整性用例会检查这一点。
 */

export interface RuleCase {
  /** 台账条目 ID */
  id: string;
  /** 相对基线只改一处的待审项 */
  edition: Edition;
  /** 动态消息（含 `${...}`）的完整期望 */
  expect?: VerifyCheckResult;
}

const ENTRY_BY_ID = new Map<string, RuleEntry>(RULE_ENTRIES.map((entry) => [entry.id, entry]));

export function ruleEntry(id: string): RuleEntry {
  const entry = ENTRY_BY_ID.get(id);
  if (entry === undefined) throw new Error(`[e2e] 规则台账里没有 ${id}`);
  return entry;
}

/** 台账里的静态消息 → 精确的查错结果 */
export function expectedResult(id: string): VerifyCheckResult {
  const entry = ruleEntry(id);
  if (entry.status === "unported") throw new Error(`[e2e] 未移植的规则不能当反例：${id}`);
  if (entry.message.includes("${")) throw new Error(`[e2e] 动态消息需要用例自己提供 expect：${id}`);
  const result: VerifyCheckResult = { error: [], warning: [], info: [] };
  result[entry.level] = [entry.message];
  return result;
}

/** 动态消息：只给需要的那个级别，其余为空 */
function only(level: RuleLevel, message: string): VerifyCheckResult {
  const result: VerifyCheckResult = { error: [], warning: [], info: [] };
  result[level] = [message];
  return result;
}

// ---------------------------------------------------------------------------
// 构造基线的副本
// ---------------------------------------------------------------------------

/** 去掉若干字段（用于「整行缺失」，与字段值为空串不同） */
function without<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...value } as Partial<T>;
  keys.forEach((key) => delete copy[key]);
  return copy as Omit<T, K>;
}

/**
 * 站点侧的 `mcversion` 是「每个加载器都要有键」的完整映射，而用例通常只关心其中几个加载器，
 * 所以只对这一个字段放宽：写错加载器或版本仍然会被类型检查拦下。
 */
function mcversions(value: Partial<NonNullable<McmodClassEditorInnerData["mcversion"]>>) {
  return value as McmodClassEditorInnerData["mcversion"];
}

type Link = NonNullable<McmodClassEditorInnerData["link"]>[number];

/** 相关链接的单元格只显示「[前缀] 地址 (备注)」，构造一条即可 */
function link(title: Link["title"], href: string, text = "", custom = ""): Link {
  return { title, custom, href, text };
}

const CLASS_EDIT = classBaseline.edit;
const ITEM_EDIT = itemBaseline.edit;
const TAB_EDIT = tabBaseline.edit;
const LINKS = CLASS_EDIT.link!;

function classCase(id: number, edit: McmodClassEditorInnerData): Edition {
  return { ...classBaseline, id, edit };
}

function itemCase(id: number, edit: McmodItemEditorInnerData): Edition {
  return { ...itemBaseline, id, edit };
}

function tabCase(id: number, edit: McmodTabEditorInnerData): Edition {
  return { ...tabBaseline, id, edit };
}

// ---------------------------------------------------------------------------
// 用例
// ---------------------------------------------------------------------------

export const ruleCases: RuleCase[] = [
  // 模组：名称
  { id: "common_name_empty", edition: classCase(201, { ...CLASS_EDIT, name: "" }) },
  {
    // 用拉丁名称而不是基线里的中文名：中文名相同会连带触发「次要名称不能为中文」
    id: "common_name_repeat",
    edition: classCase(202, { ...CLASS_EDIT, name: "meowmachine", ename: "meowmachine" }),
  },
  {
    id: "common_ename_format",
    edition: classCase(203, { ...CLASS_EDIT, ename: "呜喵机" }),
  },
  {
    id: "common_sname_limit",
    edition: classCase(239, { ...CLASS_EDIT, sname: "MEOW-Machinery" }),
  },

  // 模组：分类、封面、平台
  {
    id: "class_category_empty",
    // 「资源」属于杂项元素（type 1），不是核心元素
    edition: classCase(204, { ...CLASS_EDIT, category: { 0: "0,8" } }),
  },
  {
    id: "class_cover_empty",
    edition: classCase(205, { ...CLASS_EDIT, "cover-delete": { 0: "1" } }),
  },
  {
    id: "class_platform_api_empty",
    edition: classCase(206, without(CLASS_EDIT, "api")),
  },
  {
    id: "class_mcver_empty",
    // 运作方式勾了 Forge 与 NeoForge，但只给 Forge 填了版本
    edition: classCase(207, {
      ...CLASS_EDIT,
      mcversion: mcversions({ "1": { 0: "25", 1: "65" } }),
    }),
    expect: only("error", "以下运作方式还未勾选版本：NeoForge。"),
  },

  // 模组：MODID、标签、关键词
  { id: "class_modid_empty", edition: classCase(208, { ...CLASS_EDIT, modid: "" }) },
  {
    id: "class_modid_wrong_spliter",
    edition: classCase(209, { ...CLASS_EDIT, modid: "greg tech" }),
  },
  {
    id: "class:modid_generated",
    edition: classCase(210, { ...CLASS_EDIT, modid: "examplemod" }),
  },
  {
    id: "common_tag_wrong_spliter",
    edition: classCase(211, { ...CLASS_EDIT, tag: "科技，物流" }),
  },
  {
    id: "common_key_wrong_spliter",
    edition: classCase(212, { ...CLASS_EDIT, keys: "M2，重生是希望" }),
  },

  // 模组：作者
  {
    id: "common_author_empty",
    edition: classCase(213, { ...CLASS_EDIT, author: { add: {}, link: {} } }),
  },

  // 模组：项目 ID
  { id: "class:cfid_empty", edition: classCase(214, without(CLASS_EDIT, "cfprojectid")) },
  {
    id: "common_cfid_format",
    edition: classCase(215, { ...CLASS_EDIT, cfprojectid: "abc" }),
  },
  { id: "class:mrid_empty", edition: classCase(216, without(CLASS_EDIT, "mrprojectid")) },
  {
    id: "common_mrid_format",
    edition: classCase(217, { ...CLASS_EDIT, mrprojectid: "meow" }),
  },

  // 模组：相关链接
  {
    id: "common_link_empty",
    // 同时关掉「开源」：没有源码地址时它本来也会跟着报，会掩盖链接为空的信号
    edition: classCase(218, { ...CLASS_EDIT, source: { 0: "0" }, link: {} }),
  },
  {
    id: "common_link_nohttp",
    edition: classCase(219, {
      ...CLASS_EDIT,
      link: { ...LINKS, 0: link("other", "www.example.com", "", "示例站") },
    }),
  },
  {
    id: "common_link_no_statement",
    edition: classCase(220, {
      ...CLASS_EDIT,
      link: { ...LINKS, 3: link("baidupan", "https://pan.baidu.com/s/1abcdef") },
    }),
  },
  {
    id: "common_link_wrong_location",
    edition: classCase(221, {
      ...CLASS_EDIT,
      link: {
        ...LINKS,
        3: link("other", "https://pan.baidu.com/s/1abcdef提取码1234", "", "网盘"),
      },
    }),
  },
  {
    id: "common_link_remark_redund",
    edition: classCase(222, {
      ...CLASS_EDIT,
      link: {
        ...LINKS,
        2: link("github", "https://github.com/zgxhzhr/MeowMachine", "GitHub"),
      },
    }),
  },
  {
    id: "common_link_suffix_redund_cf",
    edition: classCase(223, {
      ...CLASS_EDIT,
      link: {
        ...LINKS,
        0: link("curseforge", "https://www.curseforge.com/minecraft/mc-mods/meowingmachine/files"),
      },
    }),
  },
  {
    id: "common_link_suffix_redund_mr",
    edition: classCase(224, {
      ...CLASS_EDIT,
      link: { ...LINKS, 1: link("modrinth", "https://modrinth.com/mod/meowingmachine/versions") },
    }),
  },
  {
    id: "common_link_suffix_redund_common",
    edition: classCase(225, {
      ...CLASS_EDIT,
      link: {
        ...LINKS,
        2: link("github", "https://github.com/zgxhzhr/MeowMachine?spm_id_from=333.1007.0.0"),
      },
    }),
  },
  {
    id: "common_link_no_prefix",
    edition: classCase(226, {
      ...CLASS_EDIT,
      link: { ...LINKS, 3: link("official", "https://www.meowingmachine.com/") },
    }),
  },
  {
    id: "common_link_personal",
    edition: classCase(227, {
      ...CLASS_EDIT,
      link: {
        ...LINKS,
        3: link("other", "https://space.bilibili.com/123456", "", "作者主页"),
      },
    }),
  },
  {
    id: "common_link_blank",
    edition: classCase(228, {
      ...CLASS_EDIT,
      link: { ...LINKS, 3: link("other", "", "", "备用") },
    }),
  },
  {
    id: "common_link_source_address_missing",
    edition: classCase(229, {
      ...CLASS_EDIT,
      source: { 0: "1" },
      link: {
        0: link("curseforge", "https://www.curseforge.com/minecraft/mc-mods/meowingmachine"),
        1: link("modrinth", "https://modrinth.com/mod/meowingmachine/"),
      },
    }),
  },
  {
    id: "common_link_nested",
    edition: classCase(230, {
      ...CLASS_EDIT,
      link: { ...LINKS, 3: link("other", "https://b23.tv/abc123", "", "短链") },
    }),
    expect: only(
      "warning",
      "出现套娃链接（https://b23.tv/abc123），需要替换为这些链接最后重定向的地址。",
    ),
  },

  // 模组：正文
  { id: "common_content_empty", edition: classCase(231, { ...CLASS_EDIT, content: "" }) },
  {
    id: "common_content_ending",
    edition: classCase(240, {
      ...CLASS_EDIT,
      content: "<p>格雷科技社区版（GTCE）是格雷科技 5 的社区维护分支</p>",
    }),
  },
  {
    id: "common_content_personal_pronoun",
    edition: classCase(232, {
      ...CLASS_EDIT,
      content: "<p>你可以先合成工作台，您也可以直接使用指令。</p>",
    }),
  },
  {
    id: "common_content_too_many_space",
    edition: classCase(233, {
      ...CLASS_EDIT,
      content: "<p>工作台     可以合成物品。</p>",
    }),
  },
  {
    id: "common_content_wrong_horizontal_rule",
    edition: classCase(234, { ...CLASS_EDIT, content: "<p>工作台-----可以合成物品。</p>" }),
  },
  {
    id: "common_content_no_chinese_character",
    edition: classCase(235, { ...CLASS_EDIT, content: "<p>This is a crafting table。</p>" }),
  },
  {
    id: "common_content_machine",
    edition: classCase(241, {
      ...CLASS_EDIT,
      content: "<p>香草是一种常见的香料。</p>",
    }),
    expect: only(
      "warning",
      "正文介绍中含有疑似机翻的词汇: (香草)，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    ),
  },
  {
    id: "common_content_self",
    edition: classCase(242, {
      ...CLASS_EDIT,
      content: "<p>我们重新设计了矿石处理与机器体系。</p>",
    }),
    expect: only(
      "warning",
      "（【重要】）正文介绍中含有疑似第一人称/主观的介绍: (我们)，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    ),
  },
  {
    id: "common_content_notsure",
    edition: classCase(243, {
      ...CLASS_EDIT,
      content: "<p>这个方块似乎可以合成物品。</p>",
    }),
    expect: only(
      "warning",
      "正文介绍中含有疑似不确定的介绍: (似乎)，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    ),
  },
  {
    id: "common_content_rule",
    edition: classCase(244, {
      ...CLASS_EDIT,
      content: "<p>这个方块是个神器。</p>",
    }),
    expect: only(
      "warning",
      "正文介绍中含有疑似不规范/错字的词汇: (神器)，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    ),
  },
  {
    id: "common_content_version",
    edition: classCase(245, {
      ...CLASS_EDIT,
      content: "<p>新版中加入了矿石处理与机器体系。</p>",
    }),
    expect: only(
      "info",
      "正文介绍中含有疑似对版本模糊的描述: (新版)，虽描述并无大碍，但必须同时附上具体的版本号，不能只用“新版”、“旧版”等模糊描述，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    ),
  },
  {
    id: "bug_note",
    edition: classCase(236, { ...CLASS_EDIT, content: "<p>本次更新修复了一个 bug。</p>" }),
  },

  // 模组：开源许可
  {
    id: "class:license_duplicate",
    edition: classCase(237, {
      ...CLASS_EDIT,
      license: {
        0: {
          title: "源码",
          list: {
            0: {
              type: ["source"],
              name: "LGPL-3.0",
              link: "https://github.com/zgxhzhr/MeowMachine/blob/main/LICENSE",
              text: "",
            },
          },
        },
        1: {
          title: "源码",
          list: {
            0: {
              type: ["source"],
              name: "LGPL-3.0",
              link: "https://github.com/zgxhzhr/MeowMachine/blob/main/LICENSE",
              text: "",
            },
          },
        },
      },
    }),
  },
  {
    id: "class:license_missing_address",
    edition: classCase(238, {
      ...CLASS_EDIT,
      license: {
        0: {
          title: "源码",
          list: { 0: { type: ["source"], name: "LGPL-3.0", link: "", text: "" } },
        },
      },
    }),
  },

  // 资料
  { id: "item_name_empty", edition: itemCase(301, { ...ITEM_EDIT, name: "" }) },
  {
    id: "item_name_repeat",
    edition: itemCase(302, { ...ITEM_EDIT, ename: ITEM_EDIT.name }),
  },
  { id: "item_category_empty", edition: itemCase(303, without(ITEM_EDIT, "category")) },
  { id: "item_type_empty", edition: itemCase(304, { ...ITEM_EDIT, type: "" }) },
  {
    id: "item_c1_icon_empty",
    edition: itemCase(305, without(ITEM_EDIT, "icon-32x-data", "icon-128x-data")),
  },
  {
    id: "item:icon_lock",
    edition: itemCase(306, { ...ITEM_EDIT, "icon-32x-lock": { 0: "1" } }),
  },
  { id: "item:regname_empty", edition: itemCase(307, without(ITEM_EDIT, "regname")) },
  { id: "item:maxstack_empty", edition: itemCase(308, without(ITEM_EDIT, "maxstack")) },
  { id: "item:damage_empty", edition: itemCase(309, without(ITEM_EDIT, "damage")) },
  { id: "item:oredict_empty", edition: itemCase(310, without(ITEM_EDIT, "oredict")) },

  // 合成表
  {
    id: "tab_in_empty",
    edition: tabCase(401, { ...TAB_EDIT, "slot-in-item": {} }),
  },
  {
    id: "tab_out_empty",
    edition: tabCase(402, { ...TAB_EDIT, "slot-out-item": {} }),
  },
];

/** 三类基线；spec 会先验证它们一条提示都不产生 */
export const baselineCases = [
  { key: "class", edition: classBaseline },
  { key: "item", edition: itemBaseline },
  { key: "tab", edition: tabBaseline },
] as const;
