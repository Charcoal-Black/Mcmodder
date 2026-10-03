import { Utils } from "../Utils";
import { Values } from "../Values";

/**
 * 模组编辑数据（`class_add` / `class_edit`）的快速查错规则。
 *
 * 规则移植自百科原生编辑页的校验脚本，但**不再读取 DOM**：
 * 所有检查都基于已解析好的 {@link McmodClassEditorInnerData}，
 * 因此同样适用于审核待审项的场景（见 `AdminVerifyInit.simpleCheck`）。
 *
 * - 每条检查末尾注释中的 `xxx_yyy` 是原生语言包
 *   （`PublicLangData.editor.inform.list`）里的键名，便于与百科编辑页的提示逐条对照；
 *   提示文案为硬编码中文。
 * - 正文中的机翻 / 第一人称 / 不确定 / 不规范词库，以及「未修改任何项」的检查尚未移植。
 *
 * 提示级别（error / warning / info）与原生实现可能存在少量差异。
 */
export class ClassEditRules {
  /** 会引发「网盘地址缺少作者声明」提示的网盘站点，元素为 {@link Values.siteMap} 的键名。 */
  private static readonly netdiskSites = [
    "baidupan",
    "aliyundrive",
    "weiyun",
    "lanzouyun",
    "hecaiyun",
    "ctyun",
    "cowtransfer",
    "google_drive",
    "onedrive",
    "dropbox",
    "mediafire",
    "quark",
  ];

  /** 可视为「含开源协议的源码地址」的域名片段。 */
  private static readonly sourceAddressPatterns = [
    "github",
    "gitlab",
    "gitee",
    "gitea",
    "gitpod",
    "bitbucket",
    "maven",
    "crowdin",
    "mastodon",
  ];

  /**
   * 指向「某个人」而非模组本身的地址片段。
   */
  private static readonly personalPatterns = [
    "center.mcmod.cn",
    "curseforge.com/members/",
    "modrinth.com/user/",
    "space.bilibili.com",
    "afdian.com",
    "ko-fi.com",
    "patreon.com",
    "buymeacoffee.com",
  ];

  /** 各链接均不应出现的冗余参数（分享、跳转与验证码相关）。 */
  private static readonly redundantLinkParams = [
    "?__cf_chl_captcha_tk__",
    "?__cf_chl_tk",
    "?spm_id_from",
    "?share_source",
    "?vd_source",
    "?xsec_token",
    "?xsec_source",
    "?share_id",
    "/#/comment/",
    "/#/home/",
  ];

  /** CurseForge 链接中不应该出现的冗余参数。 */
  private static readonly redundantCFLinkSuffixes = [
    "/comments",
    "/files",
    "/version",
    "/gallery",
    "/relations",
    "/changelog",
  ];

  /** Modrinth 链接中不应该出现的冗余参数。 */
  private static readonly redundantMRLinkSuffixes = ["/gallery", "/changelog", "/versions"];

  /** 不应保留在链接地址末尾的提取码、密码等内容。 */
  private static readonly locationHints = ["提取码", "密码"];

  /**
   * 对一份模组编辑数据执行全部检查。
   *
   * @param data 已解析好的模组编辑数据
   */
  static check(data: McmodClassEditorInnerData) {
    const result: VerifyCheckResult = {
      error: [],
      warning: [],
      info: [],
    };

    ClassEditRules.checkName(data, result);
    ClassEditRules.checkCategory(data, result);
    ClassEditRules.checkCover(data, result);
    ClassEditRules.checkPlatform(data, result);
    ClassEditRules.checkModid(data, result);
    ClassEditRules.checkSpliter(data, result);
    ClassEditRules.checkAuthor(data, result);
    ClassEditRules.checkRelation(data, result);
    ClassEditRules.checkProjectID(data, result);
    ClassEditRules.checkLink(data, result);
    ClassEditRules.checkContent(data, result);

    return result;
  }

  /** 主要名称、次要名称与简写名称。 */
  private static checkName(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const name = data.name?.trim() ?? "";
    const ename = data.ename?.trim() ?? "";

    if (name.length === 0) {
      result.error.push("缺少“主要名称”，具体请参考“编辑帮助”中的《主站通用命名规则》。"); // common_name_empty
    }
    if (name === ename && name.length > 0) {
      result.warning.push(
        "“主要名称”与“次要名称”不能相同，具体请参考“编辑帮助”中的《主站通用命名规则》。",
      ); // common_name_repeat
    }
    if (/[\u4e00-\u9fa5]/.test(ename)) {
      result.warning.push("次要名称不能为中文，具体请参考“编辑帮助”中的《主站通用命名规则》。"); // common_ename_format
    }
    if ((data.sname?.trim().length ?? 0) > 5) {
      result.warning.push("“简写名称”过长，建议在5个字符以内。"); // common_sname_limit
    }
  }

  /** 模组元素：核心元素有且仅有一种。 */
  private static checkCategory(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const hasCore = Object.values(data.category ?? {}).some(
      (value) =>
        value !== undefined &&
        Utils.getKeyValueOfObject(Values.classCategoryValueMap, value)?.type === 0,
    );
    if (!hasCore) {
      result.error.push(
        "模组缺少一项“核心元素”，具体请参考“编辑帮助”中的《模组元素定义与优先级》。",
      ); // class_category_empty
    }
  }

  /** 模组封面。 */
  private static checkCover(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    if (data["cover-delete"]?.[0] === "1" || (data["cover-data"]?.trim().length ?? 0) === 0) {
      result.warning.push("模组必须包含封面。"); // class_cover_empty
    }
  }

  /** 支持平台、运作方式与 MC 版本。 */
  private static checkPlatform(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    if (Object.keys(data.platform ?? {}).length === 0 || Object.keys(data.api ?? {}).length === 0) {
      result.error.push("缺少“支持平台”或“运作方式”，通过指定条件将无法查到本模组。"); // class_platform_api_empty
    }
    if (data.mcversion === undefined) {
      return;
    }
    // 数据中 mcversion 仅记录已勾选的版本，故未出现的运作方式即为漏勾
    const empty = Object.keys(data.api ?? {}).filter((api) => {
      return (
        Object.keys(data.mcversion![api as ValueOf<typeof Values.loaderID>] ?? {}).length === 0
      );
    });
    if (empty.length > 0) {
      const names = empty
        .map((api) => Utils.getKeyValueOfObject(Values.reversedLoaderID, api) ?? api)
        .join("、");
      result.error.push(`以下运作方式还未勾选版本：${names}。`); // class_mcver_empty
    }
  }

  /** MODID。 */
  private static checkModid(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const modid = data.modid?.trim() ?? "";
    if (modid.length === 0) {
      result.warning.push("缺少 MODID。"); // class_modid_empty
    } else if (modid.includes("，") || modid.includes(" ")) {
      result.warning.push("MODID 中含有异常符号，请检查是否准确。"); // class_modid_wrong_spliter
    }
  }

  /** 模组标签与搜索辅助关键词的分隔符。 */
  private static checkSpliter(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    if (data.tag?.includes("，")) {
      result.warning.push("标签中含有异常符号，请检查是否正确分隔。"); // common_tag_wrong_spliter
    }
    if (data.keys?.includes("，")) {
      result.warning.push("搜索辅助关键词中含有异常符号，请检查是否正确分隔。"); // common_key_wrong_spliter
    }
  }

  /** 作者/团队。 */
  private static checkAuthor(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const authors = [
      ...Object.values(data.author?.add ?? {}),
      ...Object.values(data.author?.link ?? {}),
    ];
    if (authors.length === 0) {
      result.error.push("缺少作者/团队信息。"); // common_author_empty
    }
  }

  /** 模组关系的条件组名称。 */
  private static checkRelation(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const titles = Object.values(data.relation ?? {}).map((group) => group.title.trim());
    if (new Set(titles).size !== titles.length) {
      result.error.push("模组关系组出现了多个同名条件。"); // class_relation_version_duplicate
    }
  }

  /** CurseForge / Modrinth 项目 ID：填写了对应链接就必须提供 ID。 */
  private static checkProjectID(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const links = Object.values(data.link ?? {});
    const hasCF = links.some((link) => link.title === "curseforge");
    const hasMR = links.some((link) => link.title === "modrinth");

    if (hasCF) {
      const cfids = data.cfprojectid?.trim();
      if (!cfids) {
        result.warning.push("缺少 CFID。");
      } else if (!ClassEditRules.splitIDs(cfids).every((cfid) => /^\d+$/.test(cfid))) {
        result.warning.push("CFID 有误，应为数字。"); // common_cfid_format
      }
    }
    if (hasMR) {
      const mrids = data.mrprojectid?.trim();
      if (!mrids) {
        result.warning.push("缺少 MRID。");
      } else if (!ClassEditRules.splitIDs(mrids).every((mrid) => /^[a-zA-Z0-9]{8}$/.test(mrid))) {
        result.warning.push("MRID 有误，应为 8 位字符串。"); // common_mrid_format
      }
    }
  }

  /** 相关链接。 */
  private static checkLink(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    const links = Object.values(data.link ?? {});
    const counter = {
      nohttp: 0,
      noStatement: 0,
      wrongLocation: 0,
      remarkRedund: 0,
      suffixRedundCF: 0,
      suffixRedundMR: 0,
      suffixRedundCommon: 0,
      noPrefix: 0,
      personal: 0,
      blank: 0,
      sourceAddress: 0,
      nested: [] as string[],
    };

    links.forEach((link) => {
      const href = link.href.trim();
      // 空地址除计数外不再做其余检查：原生实现会把它算进「冗余参数」
      if (href.length === 0) {
        counter.blank++;
        return;
      }

      if (!href.startsWith("https://") && !href.startsWith("http://") && !href.startsWith("//")) {
        counter.nohttp++;
      }
      if (ClassEditRules.netdiskSites.includes(link.title) && !link.text.includes("作者")) {
        counter.noStatement++;
      }
      // 提取码、密码等内容应写进链接备注而非地址
      if (
        /[\s，。：？！；]/.test(href) ||
        ClassEditRules.locationHints.some((hint) => href.includes(hint))
      ) {
        counter.wrongLocation++;
      }
      const remark = ClassEditRules.getRemark(link);
      const siteName =
        link.title === "other"
          ? link.custom
          : Utils.getKeyValueOfObject(Values.siteMap, link.title);
      if (
        remark.length > 0 &&
        (remark.toLowerCase() === siteName?.toLowerCase() ||
          remark.toLowerCase() === link.title.toLowerCase())
      ) {
        counter.remarkRedund++;
      }
      if (
        link.title === "curseforge" &&
        ClassEditRules.redundantCFLinkSuffixes.some((suffix) => href.includes(suffix))
      ) {
        counter.suffixRedundCF++;
      }
      if (
        link.title === "modrinth" &&
        ClassEditRules.redundantMRLinkSuffixes.some((suffix) => href.includes(suffix))
      ) {
        counter.suffixRedundMR++;
      }
      if (ClassEditRules.redundantLinkParams.some((param) => href.includes(param))) {
        counter.suffixRedundCommon++;
      }
      if (link.title === "official") {
        counter.noPrefix++;
      }
      if (ClassEditRules.personalPatterns.some((pattern) => href.includes(pattern))) {
        counter.personal++;
      }
      if (ClassEditRules.sourceAddressPatterns.some((pattern) => href.includes(pattern))) {
        counter.sourceAddress++;
      }
      if (href.includes("modrinth.com/project/") || href.includes("b23.tv")) {
        counter.nested.push(href);
      }
    });

    if (links.length === counter.blank) {
      result.warning.push(
        "需要提供来源用于考证，请完善“相关链接”一栏，通常为官网或原帖，如为本站首发，请提供网盘下载链接以供测评。",
      ); // common_link_empty
    }
    if (counter.nohttp > 0) {
      result.error.push(
        "“相关链接”中的网址错误，必须能正常访问，且以 https:// 或 http:// 或 // 开头。",
      ); // common_link_nohttp
    }
    if (counter.noStatement > 0) {
      result.warning.push(
        "（【重要】）网盘地址缺少作者声明，不允许添加非作者提供的第三方网盘下载，作者提供的网盘下载需要按要求在链接备注中填写“由作者提供的下载地址”。",
      ); // common_link_no_statement
    }
    if (counter.wrongLocation > 0) {
      result.warning.push("请检查相关链接中是否含有应写到备注中的非链接内容，例如提取码、说明等。"); // common_link_wrong_location
    }
    if (counter.remarkRedund > 0) {
      result.warning.push(
        "出现与链接前缀相同的链接备注（例如：当地址前缀为“GitHub”时，不必在备注中填写“GitHub”。没有特殊信息时链接备注可留空）。",
      ); // common_link_remark_redund
    }
    if (counter.suffixRedundCF > 0) {
      result.warning.push(
        "CurseForge 地址出现冗余后缀，请检查结尾是否含有多余的 /comments、/files、/gallery 等内容。",
      ); // common_link_suffix_redund_cf
    }
    if (counter.suffixRedundMR > 0) {
      result.warning.push(
        "Modrinth 地址出现冗余后缀，请检查结尾是否含有多余的 /gallery、/changelog、/versions 等内容。",
      ); // common_link_suffix_redund_mr
    }
    if (counter.suffixRedundCommon > 0) {
      result.warning.push(
        "相关链接中出现冗余参数，请检查结尾是否含有多余的 __cf_chl_tk、spm_id_from、/#/home/ 等内容。",
      ); // common_link_suffix_redund_common
    }
    if (counter.noPrefix > 0) {
      result.info.push(
        "请检查设为“官方”的地址是否存在预设前缀（例如：CurseForge 地址需要选择“CurseForge”前缀，而非“官方”）。",
      ); // common_link_no_prefix
    }
    if (counter.personal > 0) {
      result.warning.push(
        "与模组没有直接关联的作者个人地址只能放到作者个人页面，请确保新增的地址为本模组直属链接。",
      ); // common_link_personal
    }
    if (counter.blank > 0) {
      result.info.push("相关链接中添加了一个空地址（虽然提交会自动过滤，但请检查否为漏填）。"); // common_link_blank
    }
    if (data.source?.[0] === "1" && counter.sourceAddress === 0) {
      result.warning.push("选择开源必须提供含有开源协议的源码地址。"); // common_link_source_address_missing
    }
    if (counter.nested.length > 0) {
      result.warning.push(
        `出现套娃链接（${counter.nested.join("、")}），需要替换为这些链接最后重定向的地址。`,
      ); // common_link_nested
    }
  }

  /** 模组介绍正文。 */
  private static checkContent(data: McmodClassEditorInnerData, result: VerifyCheckResult) {
    // 保留空白字符：原生实现会把空格全部删掉，导致「大量空格」检查永远不会触发
    const text = ClassEditRules.stripHtmlTag(data.content ?? "").trim();
    if (text.length === 0) {
      result.error.push("正文介绍中需要有文字介绍。"); // common_content_empty
      return;
    }

    if (!/[。！？…]$/.test(text)) {
      result.warning.push(
        "请正确使用标点符号，汉字中使用全角标点，段落结尾需加句号，列表除最后一项外请用分号。",
      ); // common_content_ending
    }
    const levels = ClassEditRules.getHeadingLevels(text);
    if (levels.length > 0 && levels.length !== Math.max(...levels)) {
      result.warning.push("正文介绍中含有跨级使用的标题，请检查标题结构完整性。"); // common_content_title_broken
    }
    if (levels.length > 0 && levels.length < 4 && !text.includes("[ban:title_menu]")) {
      result.warning.push(
        "正文介绍中的标题较少，请根据“正文预览”的结果判断是否需要添加“标题目录禁用标记”。",
      ); // common_content_title_less
    }
    if (text.includes("你") && text.includes("您")) {
      result.warning.push("“您”与“你”不统一，建议将第二人称代词替换为“玩家”或省略。"); // common_content_personal_pronoun
    }
    if (/\s{5}/.test(text)) {
      result.warning.push(
        "不要使用大量空格制作排版或实现居中，如有需要请使用列表或通过修改对齐方式处理。",
      ); // common_content_too_many_space
    }
    if (["-----", "=====", "~~~~~"].some((rule) => text.includes(rule))) {
      result.warning.push(
        "不要使用大量横线来实现水平分隔线，编辑器中有水平分割线工具，且 h1 标题自带。",
      ); // common_content_wrong_horizontal_rule
    }
    if (!/[\u4e00-\u9fa5]/.test(text)) {
      result.warning.push("必须用汉语介绍，同时不接受机翻 / AIGC，不用带原文。"); // common_content_no_chinese_character
    }
    if (text.split("[ban:title_menu]").length > 2) {
      result.warning.push("出现了重复的 [ban:title_menu]，标题禁用标记是全局的，只需要加一个。"); // common_content_ban_title_duplicate
    }
    if (/bug/i.test(text)) {
      result.info.push("BUG和Mod特性请发到社群的“特性反馈”板块。"); // bug_note
    }
  }

  /** 去掉 HTML 标签，仅保留文本。 */
  private static stripHtmlTag(html: string) {
    return html.replace(/<\/?.+?>/g, "");
  }

  /** 提取正文里使用过的标题级别，如 `[h2=xxx]` 记为 2。 */
  private static getHeadingLevels(text: string) {
    return [...text.matchAll(/\[h(\d)=/gi)].map((matched) => Number(matched[1]));
  }

  /** 链接备注：待审表格中展示为 ` (备注)`，需还原为纯备注内容。 */
  private static getRemark(link: NonNullable<McmodClassEditorInnerData["link"]>[number]) {
    return link.text
      .trim()
      .replace(/^[(（]/, "")
      .replace(/[)）]$/, "")
      .trim();
  }

  /** 多个项目 ID 以单个半角逗号分隔。 */
  private static splitIDs(ids: string) {
    return ids.split(",").map((id) => id.trim());
  }
}
