/**
 * `src/editrule/*` 的规则台账。
 *
 * 这里回答四个问题：**有哪些规则**、**提示原文是什么**、**什么条件触发**、
 * **审核页上能不能触发**。`rules.ts` 的反例只引用台账里的 `id`，期望消息也从台账推导，
 * 因此提示文案在 e2e 侧只有一份，不会出现「台账改了、断言没改」。
 *
 * 键名（{@link RuleEntry.key}）沿用源码里每条检查末尾的 `// xxx_yyy` 注释，也就是百科原生
 * 语言包 `PublicLangData.editor.inform.list` 的键；源码没有标注键名的规则用
 * `scope:规则` 形式的自造 ID，避免凭空发明原生键名。
 *
 * 三种状态：
 * - 已移植且可触发：`status: "ported"`，必须有一条 `rules.ts` 反例（由 spec 的台账用例强制）；
 * - 已移植但审核页拿不到触发条件：额外带 {@link RuleEntry.unreachable}，不要求反例；
 * - 未移植：`status: "unported"`，只记录「原生校验有、`editrule` 还没有」。
 */

export type RuleScope = "class" | "item" | "tab" | "shared";
export type RuleLevel = keyof VerifyCheckResult;

interface RuleEntryBase {
  scope: RuleScope;
  /** 原生语言包中的键名；源码未标注时为 `undefined` */
  key?: string;
  /** 触发条件（面向人阅读） */
  trigger: string;
  /** 补充说明；未移植/不可达时必须填写原因 */
  note?: string;
}

export interface PortedRule extends RuleEntryBase {
  /** 已移植；台账里绝大多数条目都是这一类，因此把它作为默认值省略 */
  status?: "ported";
  level: RuleLevel;
  /**
   * 提示原文。
   *
   * 动态拼接的部分写成 `${...}`；spec 会把每一段静态文本与 `src/editrule/*.ts` 对照，
   * 改文案却没改台账时会直接失败。动态消息的反例需要自己提供 `expect`。
   */
  message: string;
  /** 审核页上无法触发的原因 */
  unreachable?: string;
}

export interface UnportedRule extends RuleEntryBase {
  status: "unported";
  message?: never;
  level?: never;
}

export type RuleEntry = PortedRule | UnportedRule;

/** 审核页渲染的是 `ContentPreview` 的输出，伪标签在到达 `editrule` 之前就已经消失了 */
const PSEUDO_TAG_UNREACHABLE =
  "审核详情渲染的是 `ContentPreview.generate()` 的结果，`[hN=]` / `[ban:...]` 已被替换成 `<span>`，" +
  "`stripHtmlTag` 之后拿不到原始标记。真实审核页同样如此，只能在编辑页覆盖。";

export const RULES = {
  // ---------------------------------------------------------------------------
  // 模组：名称
  // ---------------------------------------------------------------------------
  common_name_empty: {
    scope: "class",
    level: "error",
    key: "common_name_empty",
    message: "缺少“主要名称”，具体请参考“编辑帮助”中的《主站通用命名规则》。",
    trigger: "添加类编辑且「主要名称」为空。",
  },
  common_name_repeat: {
    scope: "class",
    level: "warning",
    key: "common_name_repeat",
    message: "“主要名称”与“次要名称”不能相同，具体请参考“编辑帮助”中的《主站通用命名规则》。",
    trigger: "主要名称与次要名称相同，且都不是空串。",
  },
  common_ename_format: {
    scope: "class",
    level: "warning",
    key: "common_ename_format",
    message: "次要名称不能为中文，具体请参考“编辑帮助”中的《主站通用命名规则》。",
    trigger: "次要名称中含汉字。",
  },
  common_sname_limit: {
    scope: "class",
    level: "warning",
    key: "common_sname_limit",
    message: "“简写名称”过长，建议在5个字符以内。",
    trigger: "简写名称去掉首尾空白后超过 5 个字符。",
  },

  // ---------------------------------------------------------------------------
  // 模组：分类、封面、平台
  // ---------------------------------------------------------------------------
  class_category_empty: {
    scope: "class",
    level: "error",
    key: "class_category_empty",
    message: "模组缺少一项“核心元素”，具体请参考“编辑帮助”中的《模组元素定义与优先级》。",
    trigger: "添加时没有模组元素，或已有元素里没有 `type === 0` 的核心元素。",
  },
  class_cover_empty: {
    scope: "class",
    level: "warning",
    key: "class_cover_empty",
    message: "模组必须包含封面。",
    trigger: "添加时没有封面，或本次编辑勾选了「删除封面」。",
  },
  class_platform_api_empty: {
    scope: "class",
    level: "error",
    key: "class_platform_api_empty",
    message: "缺少“支持平台”或“运作方式”，通过指定条件将无法查到本模组。",
    trigger: "添加时「支持平台」或「运作方式」为空。",
  },
  class_mcver_empty: {
    scope: "class",
    level: "error",
    key: "class_mcver_empty",
    message: "以下运作方式还未勾选版本：${names}。",
    trigger: "「运作方式」里勾选的加载器在「支持MC版本」中没有对应版本。",
    note: "审核页只列出填了版本的加载器，未出现的加载器即为漏勾；消息里的加载器名取自 `Values.reversedLoaderID`。",
  },

  // ---------------------------------------------------------------------------
  // 模组：MODID、标签、关键词
  // ---------------------------------------------------------------------------
  class_modid_empty: {
    scope: "class",
    level: "warning",
    key: "class_modid_empty",
    message: "缺少 MODID。",
    trigger:
      "MODID 为空，且运作方式里没有「不需要 MODID」的加载器（JavaAgent、内容包、命令方块、数据包、文件覆盖、行为包）。",
  },
  class_modid_wrong_spliter: {
    scope: "class",
    level: "warning",
    key: "class_modid_wrong_spliter",
    message: "MODID 中含有异常符号，请检查是否准确。",
    trigger: "MODID 中出现全角逗号或空格；多个 MODID 只接受半角逗号分隔。",
  },
  "class:modid_generated": {
    scope: "class",
    level: "warning",
    trigger:
      "MODID 命中 `example*mod` / `generated*mod*` / `template*mod` / `minecraft` 等生成器缺省值。",
    message:
      "含有使用生成器等程序的缺省值，如默认 Mod 名称、使用默认 MODID 或恶意占用已存在的 MODID 的行为。",
    note: "源码没有标注原生键名。",
  },
  common_tag_wrong_spliter: {
    scope: "class",
    level: "warning",
    key: "common_tag_wrong_spliter",
    message: "标签中含有异常符号，请检查是否正确分隔。",
    trigger: "「模组标签」里出现全角逗号。",
  },
  common_key_wrong_spliter: {
    scope: "class",
    level: "warning",
    key: "common_key_wrong_spliter",
    message: "搜索辅助关键词中含有异常符号，请检查是否正确分隔。",
    trigger: "「追加关键词」里出现全角逗号。",
  },

  // ---------------------------------------------------------------------------
  // 模组：作者、关系
  // ---------------------------------------------------------------------------
  common_author_empty: {
    scope: "class",
    level: "error",
    key: "common_author_empty",
    message: "缺少作者/团队信息。",
    trigger: "添加时作者/团队里既没有新增作者，也没有链接已有作者。",
  },
  "class:relation_version_duplicate": {
    scope: "class",
    level: "error",
    trigger: "两个模组关系条件组使用同一个名称。",
    message: "模组关系组出现了多个同名条件。",
    note: "源码没有标注原生键名。",
    unreachable:
      "审核页的 `RelationCompareFrame` 以条件组名称为键合并，同名条件组在到达 `editrule` 之前就被折叠成一组；" +
      "该规则只在编辑页生效。",
  },

  // ---------------------------------------------------------------------------
  // 模组：项目 ID
  // ---------------------------------------------------------------------------
  "class:cfid_empty": {
    scope: "class",
    level: "warning",
    trigger: "添加时填了 CurseForge 链接，但没有填 CFID。",
    message: "缺少 CFID。",
    note: "源码没有标注原生键名。",
  },
  common_cfid_format: {
    scope: "class",
    level: "warning",
    key: "common_cfid_format",
    message: "CFID 有误，应为数字。",
    trigger: "CFID 以逗号分隔后，存在不是纯数字的一项。",
  },
  "class:mrid_empty": {
    scope: "class",
    level: "warning",
    trigger: "添加时填了 Modrinth 链接，但没有填 MRID。",
    message: "缺少 MRID。",
    note: "源码没有标注原生键名。",
  },
  common_mrid_format: {
    scope: "class",
    level: "warning",
    key: "common_mrid_format",
    message: "MRID 有误，应为 8 位字符串。",
    trigger: "MRID 以逗号分隔后，存在不是 8 位字母数字的一项。",
  },

  // ---------------------------------------------------------------------------
  // 模组：相关链接
  // ---------------------------------------------------------------------------
  common_link_empty: {
    scope: "class",
    level: "warning",
    key: "common_link_empty",
    message:
      "需要提供来源用于考证，请完善“相关链接”一栏，通常为官网或原帖，如为本站首发，请提供网盘下载链接以供测评。",
    trigger: "「相关链接」一行里没有任何非空地址（全部为空串或整行为空）。",
  },
  common_link_nohttp: {
    scope: "class",
    level: "error",
    key: "common_link_nohttp",
    message: "“相关链接”中的网址错误，必须能正常访问，且以 https:// 或 http:// 或 // 开头。",
    trigger: "某个链接地址不以 `https://`、`http://`、`//` 开头。",
  },
  common_link_no_statement: {
    scope: "class",
    level: "warning",
    key: "common_link_no_statement",
    message:
      "（【重要】）网盘地址缺少作者声明，不允许添加非作者提供的第三方网盘下载，作者提供的网盘下载需要按要求在链接备注中填写“由作者提供的下载地址”。",
    trigger: "前缀是网盘站点（百度网盘、阿里云盘、夸克……），但链接备注里没有「作者」。",
  },
  common_link_wrong_location: {
    scope: "class",
    level: "warning",
    key: "common_link_wrong_location",
    message: "请检查相关链接中是否含有应写到备注中的非链接内容，例如提取码、说明等。",
    trigger: "链接地址里出现空白/中文标点，或出现「提取码」「密码」。",
  },
  common_link_remark_redund: {
    scope: "class",
    level: "warning",
    key: "common_link_remark_redund",
    message:
      "出现与链接前缀相同的链接备注（例如：当地址前缀为“GitHub”时，不必在备注中填写“GitHub”。没有特殊信息时链接备注可留空）。",
    trigger: "链接备注与站点名称（或自定义前缀）相同，忽略大小写。",
  },
  common_link_suffix_redund_cf: {
    scope: "class",
    level: "warning",
    key: "common_link_suffix_redund_cf",
    message:
      "CurseForge 地址出现冗余后缀，请检查结尾是否含有多余的 /comments、/files、/gallery 等内容。",
    trigger:
      "CurseForge 链接里含有 /comments、/files、/version、/gallery、/relations、/changelog。",
  },
  common_link_suffix_redund_mr: {
    scope: "class",
    level: "warning",
    key: "common_link_suffix_redund_mr",
    message:
      "Modrinth 地址出现冗余后缀，请检查结尾是否含有多余的 /gallery、/changelog、/versions 等内容。",
    trigger: "Modrinth 链接里含有 /gallery、/changelog、/versions。",
  },
  common_link_suffix_redund_common: {
    scope: "class",
    level: "warning",
    key: "common_link_suffix_redund_common",
    message:
      "相关链接中出现冗余参数，请检查结尾是否含有多余的 __cf_chl_tk、spm_id_from、/#/home/ 等内容。",
    trigger:
      "任意链接里含有分享、跳转或验证码参数（如 `?spm_id_from`、`?share_source`、`/#/home/`）。",
  },
  common_link_no_prefix: {
    scope: "class",
    level: "info",
    key: "common_link_no_prefix",
    message:
      "请检查设为“官方”的地址是否存在预设前缀（例如：CurseForge 地址需要选择“CurseForge”前缀，而非“官方”）。",
    trigger: "某个链接的前缀被设为「官方」。",
  },
  common_link_personal: {
    scope: "class",
    level: "warning",
    key: "common_link_personal",
    message:
      "与模组没有直接关联的作者个人地址只能放到作者个人页面，请确保新增的地址为本模组直属链接。",
    trigger:
      "链接命中个人主页片段：`center.mcmod.cn`、CF/Modrinth 用户页、B站空间、爱发电、Ko-fi、Patreon、Buy Me a Coffee。",
  },
  common_link_blank: {
    scope: "class",
    level: "info",
    key: "common_link_blank",
    message: "相关链接中添加了一个空地址（虽然提交会自动过滤，但请检查否为漏填）。",
    trigger: "存在空地址，但不是所有地址都为空（否则触发 {@link common_link_empty}）。",
  },
  common_link_source_address_missing: {
    scope: "class",
    level: "warning",
    key: "common_link_source_address_missing",
    message: "选择开源必须提供含有开源协议的源码地址。",
    trigger:
      "「开源状态」为开源，但没有任何链接命中 GitHub / GitLab / Gitee / Maven / Crowdin 等源码站。",
  },
  common_link_nested: {
    scope: "class",
    level: "warning",
    key: "common_link_nested",
    message: "出现套娃链接（${links}），需要替换为这些链接最后重定向的地址。",
    trigger: "链接里含有 `modrinth.com/project/` 或 `b23.tv` 这类跳转地址；消息里列出命中项。",
  },

  // ---------------------------------------------------------------------------
  // 模组：正文
  // ---------------------------------------------------------------------------
  common_content_empty: {
    scope: "class",
    level: "error",
    key: "common_content_empty",
    message: "正文介绍中需要有文字介绍。",
    trigger: "去掉 HTML 标签后正文为空；命中后不再执行后续正文检查。",
  },
  common_content_ending: {
    scope: "class",
    level: "warning",
    key: "common_content_ending",
    message: "请正确使用标点符号，汉字中使用全角标点，段落结尾需加句号，列表除最后一项外请用分号。",
    trigger: "正文最后一个字符不是 `。！？…`。",
  },
  common_content_title_broken: {
    scope: "class",
    level: "warning",
    key: "common_content_title_broken",
    message: "正文介绍中含有跨级使用的标题，请检查标题结构完整性。",
    trigger: "正文里的标题级别数量与最大级别不一致（例如只用了 h1、h2、h4）。",
    unreachable: PSEUDO_TAG_UNREACHABLE,
  },
  common_content_title_less: {
    scope: "class",
    level: "warning",
    key: "common_content_title_less",
    message: "正文介绍中的标题较少，请根据“正文预览”的结果判断是否需要添加“标题目录禁用标记”。",
    trigger: "使用了标题但级别少于 4 种，且没有 `[ban:title_menu]`。",
    unreachable: PSEUDO_TAG_UNREACHABLE,
  },
  common_content_personal_pronoun: {
    scope: "class",
    level: "warning",
    key: "common_content_personal_pronoun",
    message: "“您”与“你”不统一，建议将第二人称代词替换为“玩家”或省略。",
    trigger: "正文里同时出现「你」和「您」。",
  },
  common_content_too_many_space: {
    scope: "class",
    level: "warning",
    key: "common_content_too_many_space",
    message: "不要使用大量空格制作排版或实现居中，如有需要请使用列表或通过修改对齐方式处理。",
    trigger: "正文里出现连续 5 个及以上空白字符。",
  },
  common_content_wrong_horizontal_rule: {
    scope: "class",
    level: "warning",
    key: "common_content_wrong_horizontal_rule",
    message: "不要使用大量横线来实现水平分隔线，编辑器中有水平分割线工具，且 h1 标题自带。",
    trigger: "正文里出现 `-----`、`=====` 或 `~~~~~`。",
  },
  common_content_no_chinese_character: {
    scope: "class",
    level: "warning",
    key: "common_content_no_chinese_character",
    message: "必须用汉语介绍，同时不接受机翻 / AIGC，不用带原文。",
    trigger: "正文里没有任何汉字。",
  },
  common_content_ban_title_duplicate: {
    scope: "class",
    level: "warning",
    key: "common_content_ban_title_duplicate",
    message: "出现了重复的 [ban:title_menu]，标题禁用标记是全局的，只需要加一个。",
    trigger: "正文里出现两次以上 `[ban:title_menu]`。",
    unreachable: PSEUDO_TAG_UNREACHABLE,
  },
  bug_note: {
    scope: "class",
    level: "info",
    key: "bug_note",
    message: "BUG和Mod特性请发到社群的“特性反馈”板块。",
    trigger: "正文里出现 `bug`（忽略大小写）。",
  },

  // ---------------------------------------------------------------------------
  // 模组：开源许可
  // ---------------------------------------------------------------------------
  "class:license_duplicate": {
    scope: "class",
    level: "error",
    trigger: "两个许可协议条件组使用同一个名称。",
    message: "许可协议出现了多个同名条件。",
    note: "源码没有标注原生键名。",
  },
  "class:license_missing_address": {
    scope: "class",
    level: "error",
    trigger: "许可协议条目既没有链接地址，也没有备注。",
    message: "缺少能够定位许可声明的地址。",
    note: "源码没有标注原生键名。",
  },

  // ---------------------------------------------------------------------------
  // 资料
  // ---------------------------------------------------------------------------
  item_name_empty: {
    scope: "item",
    level: "error",
    key: "item_name_empty",
    message: "资料缺少“主要名称”，命名规范请参考“编辑帮助”中的《主站通用命名规则》。",
    trigger: "添加类编辑且资料「主要名称」为空。",
  },
  item_name_repeat: {
    scope: "item",
    level: "warning",
    key: "item_name_repeat",
    message: "资料“主要名称”与“次要名称”不能相同，具体请参考“编辑帮助”中的《主站通用命名规则》。",
    trigger: "主要名称与次要名称相同。",
  },
  item_category_empty: {
    scope: "item",
    level: "error",
    key: "item_category_empty",
    message: "请选择一项“资料类型”，没有类型的资料不会显示在列表中，只能通过地址访问。",
    trigger: "资料「类型」字段缺失。",
    note: '审核页会把无法解析的类型记为 `{ 0: "-1" }`，因此只有整行缺失才会触发，而不是显示「-」。',
  },
  item_type_empty: {
    scope: "item",
    level: "warning",
    key: "item_type_empty",
    message: "请选择一项“资料分类”，没有分类的资料会被挤在资料列表的最前面。",
    trigger: "资料「分类」为空。",
  },
  item_c1_icon_empty: {
    scope: "item",
    level: "warning",
    key: "item_c1_icon_empty",
    message:
      "除用于综合的主物品/方块外，其余物品/方块必须包含完整的“小图标”与“大图标”，推荐用 IRR 批量导出的方式添加物品。",
    trigger:
      "资料类型为「物品/方块」且分类不是 `{文本}`，同时小/大图标缺失、使用 0.png 占位或被勾选删除。",
  },
  "item:icon_lock": {
    scope: "item",
    level: "warning",
    trigger: "非 GIF 图标被勾选了「锁定小图标」或「锁定大图标」。",
    message: "非动态图标等特殊情况不用勾选锁定。",
    note: "源码没有标注原生键名。",
  },
  "item:regname_empty": {
    scope: "item",
    level: "warning",
    trigger: "物品/方块类资料缺注册名。",
    message: "缺少注册名。",
    note: "源码没有标注原生键名。",
  },
  "item:maxstack_empty": {
    scope: "item",
    level: "warning",
    trigger: "物品/方块类资料缺最大堆叠。",
    message: "缺少最大堆叠。",
    note: "源码没有标注原生键名。",
  },
  "item:damage_empty": {
    scope: "item",
    level: "info",
    trigger: "物品/方块类资料缺最大耐久。",
    message: "缺少最大耐久。",
    note: "源码没有标注原生键名。",
  },
  "item:oredict_empty": {
    scope: "item",
    level: "info",
    trigger: "物品/方块类资料缺矿物词典/物品标签。",
    message: "缺少矿物词典/物品标签。",
    note: "源码没有标注原生键名。",
  },

  // ---------------------------------------------------------------------------
  // 合成表
  // ---------------------------------------------------------------------------
  tab_in_empty: {
    scope: "tab",
    level: "warning",
    trigger: "添加类编辑且所有输入格都是空串。",
    message: "合成表至少需要选择一项输入材料，不能添加空的合成表。（若 GUI 无原料格则请忽略）",
    note: "审核页拿不到 GUI 配置，无法排除「GUI 本身没有原料格」的情形。",
  },
  tab_out_empty: {
    scope: "tab",
    level: "warning",
    trigger: "添加类编辑且所有输出格都是空串。",
    message: "合成表至少需要选择一项输出材料，不能添加空的合成表。（若 GUI 无产物格则请忽略）",
    note: "审核页拿不到 GUI 配置，无法排除「GUI 本身没有产物格」的情形。",
  },

  // ---------------------------------------------------------------------------
  // 正文词库（模组 / 资料共用）
  // ---------------------------------------------------------------------------
  common_content_machine: {
    scope: "shared",
    level: "warning",
    key: "common_content_machine",
    message:
      "正文介绍中含有疑似机翻的词汇: (${matches})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    trigger: "正文命中 `badwords.json` 的 `machine` 词库（如「香草」）。",
  },
  common_content_self: {
    scope: "shared",
    level: "warning",
    key: "common_content_self",
    message:
      "（【重要】）正文介绍中含有疑似第一人称/主观的介绍: (${matches})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    trigger: "正文命中 `self` 词库（如「我们」）。",
  },
  common_content_notsure: {
    scope: "shared",
    level: "warning",
    key: "common_content_notsure",
    message:
      "正文介绍中含有疑似不确定的介绍: (${matches})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    trigger: "正文命中 `notsure` 词库（如「似乎」）。",
  },
  common_content_rule: {
    scope: "shared",
    level: "warning",
    key: "common_content_rule",
    message:
      "正文介绍中含有疑似不规范/错字的词汇: (${matches})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    trigger: "正文命中 `rule` 词库（如「神器」）。",
  },
  common_content_version: {
    scope: "shared",
    level: "info",
    key: "common_content_version",
    message:
      "正文介绍中含有疑似对版本模糊的描述: (${matches})，虽描述并无大碍，但必须同时附上具体的版本号，不能只用“新版”、“旧版”等模糊描述，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。",
    trigger: "正文命中 `version` 词库（如「新版」）。",
  },

  // ---------------------------------------------------------------------------
  // 未移植
  // ---------------------------------------------------------------------------
  "class:content_no_change": {
    scope: "class",
    status: "unported",
    trigger: "修改类编辑没有改动任何字段。",
    note:
      "尚未移植。审核页只渲染改动过的行，`AdminVerifyInit` 拿不到「提交内容与线上完全一致」这个信号，" +
      "即便移植也只能在编辑页触发。",
  },
  "tab:inout_notmatch": {
    scope: "tab",
    status: "unported",
    trigger: "成品第一格的资料，与当前所在页面绑定的资料不一致。",
    note: "尚未移植；审核页无法得知这条合成表是在哪个资料下提交的，因此也无法检测。",
  },
} as const satisfies Record<string, RuleEntry>;

/** 台账里可以作为反例来源的条目（带 `id`，方便遍历） */
export const RULE_ENTRIES: ReadonlyArray<RuleEntry & { id: string }> = Object.entries(RULES).map(
  ([id, entry]) => ({ id, ...entry }),
);
