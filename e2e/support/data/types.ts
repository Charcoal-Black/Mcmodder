/**
 * 「百科后端数据库」的实体类型与表结构。
 *
 * 这里模拟的是**后端真正存下来的数据**，而不是编辑页 Bootstrap 控件导出的表单载荷
 * （{@link McmodClassEditorInnerData}, {@link McmodItemEditorInnerData} 等}）。
 * 两者形状刻意不同：编辑载荷是给 `/action/edit/doEdit` 提交用的，字段里会出现
 * `{ "0": "1" }`、以逗号分隔的字符串、`"25"` 这类数字字符串；后端则应当把它拆成
 * 数组、布尔值、数字。只有在 `admin/verify/**\/cases.ts` 里复刻待审项时才继续使用编辑载荷。
 *
 * 同时，这里也涵盖了一系列无法直接通过编辑操作来修改的属性，例如访问量、推荐/关注/收藏数、
 * 模组属性评比、指数走势、编辑贡献量、资料引用/综合关系等（{@link McmodItemEditorInnerData}
 * 虽有相关属性，但实际上已弃用，似乎是历史遗留，该操作已被迁移至后台）。
 *
 * 两条约定：
 *
 * 1. 所有字段必须可被 `JSON.stringify` —— 数据要能被当作 props 传进渲染页，
 *    也要能被 LowDB 之类的存储原样读写。
 * 2. 实体之间的引用一律用**百科内数字 ID**，由 `validate.ts` 在启动时做外键校验。
 */
import type { Values } from "../../../src/Values";
import type { Edition } from "../admin/verify/schema";
import type { GUI } from "../admin/verify/tab/schema";
import type { User } from "../users";

/** 后端存储的链接：站点标识 + URL，不再出现 `Record<number, { title, href }>` 这种表单索引 */
export interface McmodLink<S extends PropertyKey> {
  /** 链接所指向的站点标识 */
  site: S;
  /** 链接 URL */
  url: string;
  /** 链接备注 */
  text?: string;
  /** 站点标识为 `other` 时的自定义名称 */
  custom?: string;
}

/** 作者/开发团队在作者列表中的职位也按数组存储，不再有数字索引对象 */
export interface McmodAuthorRef {
  /** 作者在百科内的数字 ID */
  id: number;
  /** 职位列表 */
  select?: string[];
  /** 职位为 `other` 时的自定义名称 */
  custom?: string;
}

/** 作者/开发团队，对应后台的作者详情 */
export interface McmodAuthor {
  /** 百科内作者 ID，从 21424 起逐一递增编号 */
  id: number;
  /**
   * 作者名称列表。**第 0 项为主要名称**，其余为昵称/别名。
   *
   * 编辑载荷里的 `name.main` + `name.list` 是「主要名称也必须在列表中重复一次」的表单形状，
   * 后端只需保留一个有序列表。
   */
  names: string[];
  /** 正文 */
  content?: string;
  /** 作者主页链接 */
  link?: McmodLink<keyof typeof Values.authorSiteMap>[];
  /** 是否为开发团队 */
  team?: boolean;
  /** 团队成员（仅开发团队） */
  members?: McmodAuthorRef[];
  /** 头像类型：0 = 不显示，1 = 百科头像，2 = GitHub 头像，3 = 手动上传 */
  avatarType?: 0 | 1 | 2 | 3;
  /** 头像值，含义由 {@link avatarType} 决定 */
  avatarValue?: string;
}

/** 模组（类），对应后台的模组详情 */
export interface McmodClass {
  /** 百科内模组 ID */
  id: number;
  /**
   * 收录时间。真实后台并不提供此字段，仅用于让 {@link McmodRepository.getNewestClass}
   * 的排序规则显式化；缺省时按 ID 递减兜底（百科 ID 递增分配）。
   */
  createdAt?: number;
  /** 主要名称 */
  name: string;
  /** 次要名称 */
  ename?: string;
  /** 缩写名称 */
  sname?: string;
  /** 简介 */
  intro?: string;
  /** 正文 */
  content?: string;
  /**
   * 封面 URL。
   *
   * 封面由上传生成，路径里的文件名无法由模组 ID 推导，必须随实体一起记录。
   */
  cover?: string;
  /** 全部 MODID（编辑载荷里以 `,` 分隔） */
  modid?: string[];
  /** CurseForge 项目 ID（编辑载荷里以 `,` 分隔，且是数字字符串） */
  cfprojectid?: number[];
  /** Modrinth 项目 ID（编辑载荷里以 `,` 分隔） */
  mrprojectid?: string[];
  /** 追加关键词（编辑载荷里以 `,` 分隔） */
  keys?: string[];
  /** 模组标签（编辑载荷里以 `,` 分隔） */
  tag?: string[];
  /** 参与活动（编辑载荷里是 `{ "0": "A,B" }`） */
  activity?: string[];
  /**
   * 模组元素。编辑载荷里的每个值是 `"1,1"` 这样的两位分类标识，
   * 后端按 `[大类 ID, 元素 ID]` 存储。
   */
  category?: [number, number][];
  /** 加载器 ID → 支持的 MC 版本 ID 列表（编辑载荷里是 `{ 加载器: { 0: "版本" } }`） */
  mcversion?: Record<number, number[]>;
  /** 客户端运行需求（`Values.modEnvironmentModeMap` 的键） */
  "mode-1"?: number;
  /** 服务端运行需求（`Values.modEnvironmentModeMap` 的键） */
  "mode-2"?: number;
  /** 支持平台（1 = Java 版，2 = 基岩版） */
  platform?: number[];
  /** 运作方式/加载器 ID 列表 */
  api?: number[];
  /** 官方状态（`Values.modStatusMap` 的键） */
  status?: number;
  /** 开源状态（`Values.modSourceMap` 的键） */
  source?: number;
  /** 相关链接 */
  link?: McmodLink<keyof typeof Values.siteMap>[];
  /**
   * 模组关系。条件组本身在后台仍是一层分组，组内关系压平成数组。
   */
  relation?: {
    /** 条件组名称，空串显示为「通用」 */
    title?: string;
    /** 组内关系列表 */
    list: {
      /** 1 = 前置；2 = 拓展；3 = 联动 */
      type: number;
      /** 关联模组的百科内 ID */
      id: number;
    }[];
  }[];
  /**
   * 已收录的作者。编辑载荷里的 `add` 是「随本次编辑新建、尚未入库」的作者，
   * 后端不会存在这些记录，因此这里只对应 `link`。
   */
  author?: McmodAuthorRef[];
  /** 开源许可，条件组内协议压平成数组 */
  license?: {
    /** 条件组名称，空串显示为「通用」 */
    title?: string;
    list: {
      /** 适用范围：源码/资产/构建，可多选；字符串表示自定义类型 */
      types: (keyof typeof Values.licenseTypeMap | string)[];
      /** 协议英文 ID */
      name: string;
      /** 开源信息链接 */
      link?: string;
      /** 开源信息备注 */
      text?: string;
    }[];
  }[];
  /**
   * **模组属性评比**，统计各个指标分别选择（好评 `yes`、中评 `normal`、差评 `no`）
   * 的用户数量。
   *
   * 每个用户都可以对每个模组参与一次评分。模组属性分为 8 个指标，分别对应此数组的
   * 8 个元素，从前到后依次代表：
   * - **趣味**（是否带来了乐趣）：好玩（+3），一般（+1），没意思（+0）；
   * - **难度**（接受难度如何）：有挑战（+3），一般（+1），太简单（+0）；
   * - **稳定**（是否容易卡顿或崩溃）：很稳定（+3），一般（+1），不稳定（+0）；
   * - **实用**（加入的元素是否实用）：很实用（+3），一般（+1），没啥用（+0）；
   * - **美观**（加入的元素是否华丽）：很漂亮（+3），一般（+1），太丑了（+0）；
   * - **平衡**（各项数值是否平衡合理）：合理（+3），一般（+1），变态（+0）；
   * - **兼容**（与其他模组的兼容性）：兼容好（+3），一般（+1），兼容差（+0）；
   * - **持久**（加入的元素是否耐玩）：很耐玩（+3），一般（+1），容易腻（+0）。
   *
   * 各指标的总分值都可以通过用户数量乘以权值累加来方便地统计出来。
   * 在前端展示图表时，最大刻度取 `max(指标分) * 1.2`。
   *
   * 参与评比的用户数量不少于 5 人才会展示。
   */
  rating?: [n3: number, n1: number, n0: number][];
  /** 红票数量~/猛票数量~ */
  red?: number;
  /** 黑票数量~/盲票数量~ */
  black?: number;
  /** 贡献统计 */
  contribution?: {
    /** 各个用户的贡献字数（字节数）统计 */
    edit: Record<number, number>;
    /** 各个用户的贡献次数统计 */
    word: Record<number, number>;
  };
  /** 昨日指数 */
  index?: number;
  /** 历史指数走势，记录近 60 天中每日的指数走势 */
  indexHistory?: Record<number, number>;
  /** 最近一次推荐的时间 */
  lastPushedAt?: number;
  /**
   * **推荐数**，每个用户不限次推荐（但是有约 2 小时全局冷却，未仔细测试
   * ~，而且似乎是按 IP 计而不是按用户计？~），每次推荐都会将模组顶上主页一次。
   */
  pushCount?: number;
  /**
   * **收藏数**，每个用户对每个模组最多贡献一次收藏，
   * 用户可以选择将该模组保存在自己的一个或多个收藏夹里。
   */
  likeCount?: number;
  /**
   * **关注数**，每个用户对每个模组最多贡献一次关注。
   * 原设计为关注的模组在被编辑时会收到提醒，目前此功能在百科原生已弃用。
   * 脚本复刻了这一功能，见 `AutoSubscribeScheduleRequest`。
   */
  subscribeCount?: number;
}

/** 更新日志。字段与编辑载荷同形，日期以 ISO 字符串存储 */
export type McmodVersion = McmodVersionEditorInnerData;

/** 物品资料，对应后台的资料详情 */
export interface McmodItem {
  /** 百科内资料 ID */
  id: number;
  /** 所属模组在百科内的数字 ID */
  classID: number;
  /** 主要名称 */
  name: string;
  /** 次要名称 */
  ename?: string;
  /** 正文 */
  content?: string;
  /**
   * 封面 URL。
   *
   * 封面由上传生成，路径里的文件名无法由资料 ID 推导，必须随实体一起记录。
   */
  cover?: string;
  /**
   * 物品标签/矿物词典。编辑载荷里是 `,` 分隔的字符串，后端按数组存储。
   *
   * 注意：这只是物品自身的标签；按标签**反查资料**走的是独立的
   * {@link RepositoryData.oredictIndex}，两者不会自动同步。
   */
  oredict?: string[];
  /** 注册名 */
  regname?: string;
  /** 最大耐久 */
  damage?: number;
  /** 最大堆叠 */
  maxstack?: number;
  /** 元数据 */
  metadata?: number;
  /** 采集工具的资料 ID 列表 */
  tool?: number[];
  /** 资料所含的引用项列表，只能通过编辑员后台修改 */
  quote?: number[];
  /** 合并至的父资料 ID，非合并子资料为空值 */
  jumpTo?: number;
  /** 综合至的父资料 ID，非综合子资料为空值 */
  generalTo?: number;
}

/** 合成表。编辑载荷里所有槽位都是「数字索引 → 字符串」，后端按数组存储 */
export interface McmodTab {
  /** 百科内合成表 ID */
  id: number;
  /** 合成表所属资料的百科内 ID */
  itemID: number;
  /** 使用的 GUI ID */
  gui?: number;
  /**
   * 是否为有序合成。
   *
   * 编辑载荷的 `orderly` 用 `"0"` 表示有序、`"1"` 表示无序，这里翻成布尔值，
   * 避免读的时候再记一次反直觉的映射。
   */
  orderly?: boolean;
  /** 模组要求（模组百科内 ID） */
  others?: number[];
  /**
   * 原料：数字是资料 ID，字符串是矿物词典/物品标签，`null` 表示该槽位为空。
   *
   * 用数组而不是数字索引对象，是为了让槽位顺序显式化；稀疏槽位用 `null` 占位，
   * 这样 `JSON.stringify` 之后也不会变成空洞。
   */
  "slot-in-item"?: (number | string | null)[];
  /** 原料数量；`null` 表示该槽位为空 */
  "slot-in-number"?: (number | null)[];
  /** 原料消耗概率；`null` 表示该槽位为空 */
  "slot-in-chance"?: (number | null)[];
  /** 产物资料 ID；`null` 表示该槽位为空 */
  "slot-out-item"?: (number | null)[];
  /** 产物数量；`null` 表示该槽位为空 */
  "slot-out-number"?: (number | null)[];
  /** 产物出产概率；`null` 表示该槽位为空 */
  "slot-out-chance"?: (number | null)[];
  /** 燃料数量；`null` 表示该槽位为空 */
  "slot-fuel-number"?: (number | null)[];
  /** 能量数据；`null` 表示该槽位为空 */
  "slot-power-number"?: (string | null)[];
  /** 开始版本 ID */
  startver?: number;
  /** 结束版本 ID */
  endver?: number;
  /** 备注 */
  text?: string;
}

export type McmodPost = Pick<McmodPostEditorInnerData, "copyright" | "name"> & {
  /** 正文 */
  content?: string;
  /** 封面 URL；和模组、资料一样，文件名无法由教程 ID 推导 */
  cover?: string;
  /**
   * 关联分区。第 0 项为主要关联，其余为附加分区。
   *
   * 编辑载荷里的 `relation.main` + `relation.list` 是「主要分区也要在列表中重复一次」
   * 的表单形状，后端只需保留一个有序数组。
   */
  relation: McmodPostEditorInnerData["relation"]["main"][];
  /** 是否为个人教程（编辑载荷里是 `owned` 的第一个值） */
  personal: boolean;
};

/** 编辑动作 ID（`Values.editActionIDMap` 的键，如 `class-edit`） */
export type EditActionID = (typeof Values.editActionTypes)[number]["id"];

/** 编辑类型 ID（`Values.editTypes` 的键） */
export type EditTypeID = keyof typeof Values.editTypes;

/** 审核助理意见类型 ID（`Values.suggestionTypes` 的键） */
export type SuggestionTypeID = (typeof Values.suggestionTypes)[number]["id"];

/** 审核助理留下的一条意见 */
export interface McmodSuggestion {
  /** 意见类型 */
  type: SuggestionTypeID;
  /** 留下意见的审核助理 UID */
  assistant: number;
  /** 意见时间 */
  createdAt: number;
  /** 意见正文 */
  text?: string;
}

/**
 * 一条待审的编辑。
 *
 * 只记录「这条编辑还在队列里」所需的聚合信息；编辑的具体字段差异属于另一个 SSR App
 * 的详情页，不在 `verifications` 表里。所有时间均为毫秒时间戳。
 */
export interface McmodVerification {
  /** 待审项 ID */
  id: number;
  /** 提交者 UID */
  owner: number;
  /** 待审项所属模组的百科内 ID */
  classID: number;
  /** 当前正在编辑的内容的所属非模组（资料/日志/作者/教程等）ID，无明确归属则为 0 */
  editID: number;
  /** 修改编辑时，为当前正在修改的编辑的 ID，否则为 0 */
  redoID: number;
  /** 首次提交时间 */
  createdAt: number;
  /** 最近一次提交时间 */
  lastSubmittedAt: number;
  /** 累计催审次数 */
  urgeCount: number;
  /** 最近一次催审时间；`urgeCount` 为 0 时不存在 */
  urgeAt?: number;
  /** 累计退回次数 */
  refundCount: number;
  /** 最近一次退回附言；`refundCount` 为 0 时不存在 */
  refundReason?: string;
  /** 最近一次退回的操作者 UID；`refundCount` 为 0 时不存在 */
  refunder?: number;
  /** 最近一次退回的时间；`refundCount` 为 0 时不存在 */
  refundAt?: number;
  /** 审核助理意见列表 */
  suggestions?: McmodSuggestion[];
}

/**
 * 「标签 → 资料」索引表的一行。
 *
 * 这是**独立于资料本身**的索引系统：资料上登记了标签，索引表才会在下一次重建时收录它；
 * 如果站长没有更新索引，新资料即使写了标签也搜不到。因此 {@link McmodItem.oredict}
 * 与这张表可以暂时不一致，`validate.ts` 只校验「索引指向的资料确实存在」。
 */
export interface OredictIndexRow {
  /** 标签原文（查询时会统一规范化） */
  tag: string;
  /** 该标签命中的资料 ID */
  itemIDs: number[];
}

/**
 * 整个模拟数据库的内容。
 *
 * 一律用 `Record<number, T>` 而不是数组：所有查询都是「按 ID 取」或「按索引反查」，
 * 数组会逼着每个调用点自己做 `find`，也更容易出现重复 ID。
 */
export interface RepositoryData {
  authors: Record<number, McmodAuthor>;
  versions: Record<number, McmodVersion>;
  classes: Record<number, McmodClass>;
  items: Record<number, McmodItem>;
  tabs: Record<number, McmodTab>;
  posts: Record<number, McmodPost>;
  guis: Record<number, GUI>;
  users: Record<number, User>;
  /** 待审项。表里只存仍在队列中的编辑。 */
  verifications: Record<number, Edition>;
  /**
   * 矿物词典/物品标签 → 资料 ID 的**独立索引表**。
   *
   * 以数组而不是对象存储，是为了能直接交给 `arrayToMap` 按 `tag` 建索引；
   * 同时索引行有顺序，将来要模拟「站长手动重建索引」时也能保持后台的插入顺序。
   */
  oredictIndex: OredictIndexRow[];
}
