import { GmXmlhttpRequestOption, GmXmlhttpRequestType } from "$";
import { McmodderPermission } from "./config/ConfigUtils";

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface HSL {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export interface RGBA extends RGB {
  readonly a: number;
}

export interface HSLA extends HSL {
  readonly a: number;
}

export type McmodderPalette = Record<string, string>;

export type PaletteConverter = (color: string, tier?: number) => string;

export interface PaletteModifier {
  maxTier?: number;
  converter: PaletteConverter;
}

export type PaletteModifierStep = Record<string, PaletteModifier>;

export type PaletteModifierSchedule = PaletteModifierStep[];

export interface McmodderItemData {
  /** 该物品的百科资料 ID */
  id: number;
  /**
   * 该物品的在百科中的资料类型编号，
   * 留空视为 `1` = 物品/方块
   */
  itemType?: number;
  /**
   * 该物品在百科中所属模组 ID
   */
  classID: number;
  /** 模组缩写 */
  classAbbr?: string;
  /** 该物品在百科中的所属模组主要名称 */
  className?: string;
  /** 模组次要名称 */
  classEname?: string;
  /** 注册名 */
  registerName?: string;
  /**
   * Meta ID
   * 仅用于 Minecraft 1.13-
   */
  metadata?: number;
  /** 小图标的 Base64 码 */
  smallIcon?: string;
  /** 大图标的 Base64 码 */
  largeIcon?: string;
  /** 物品的主要名称 */
  name: string;
  /** 物品的次要名称 */
  englishName?: string;
  /**
   * 具体意义视 JSON 来源/用途决定
   * - 百科内资料导出 -> 在百科中的资料分类
   * - 游戏内物品导出 -> 创造模式物品栏名称
   */
  creativeTabName?: string;
  /** 物品在百科中所属的版本分支 */
  branch?: string;
  /**
   * 该物品是 `BlockItem` 则为 `Block`
   * 否则为 `Item`
   */
  type?: "Block" | "Item";
  /**
   * 如果是合并子资料，则代表合并至的父资料百科内 ID
   * 否则此项留空
   */
  jumpTo?: number;
  /** 是否是合并父资料 */
  jumpParent?: boolean;
  /**
   * 如果是综合子资料，则代表综合至的父资料百科内 ID
   * 否则此项留空
   */
  generalTo?: number;
  /** 是否是综合父资料 */
  generalParent?: boolean;
  /** 若是综合父资料，则统计其子资料的数量 */
  generalNum?: number;
  /**
   * 矿物词典 / 物品标签列表的序列化
   * 
   * 以单个逗号 `,` 不带空格分隔
   * 
   * 每项无引号 `""` 包裹，无前缀 `#`；
   * 最外层*无*方括号 `[]`
   * 
   * 合法的例子: `minecraft:piglin_loved,forge:ingots/gold`
   */
  OredictList?: string;
  /**
   * 可用挖掘工具的序列化
   * 
   * 每一项都是一个物品的百科资料 ID 而非注册名
   * 以单个逗号 `,` 不带空格分隔
   * 
   * 每项无引号 `""` 包裹，无前缀 `#`；
   * 最外层*有*方括号 `[]`
   * 
   * 合法的例子: `[1,2]`
   */
  harvestTools?: string;
  /** 最大堆叠（百科旧版也称“最大叠加”，今已更正） */
  maxStackSize?: number;
  /** 最大耐久 */
  maxDurability?: number;
  /** 正文内容 */
  content?: string;
}
export type McmodderItemList = McmodderItemData[];
export type McmodderJsonStorage = Record<string, McmodderItemList>;

export interface McmodderClassData {
  id: number;
  name: string;
  englishName: string;
  abbr: string;
}

export interface McmodderAuthorData {
  id: number;
  name: string;
  alias: string;
  isTeam: boolean;
}

export interface McmodderOredictData {
  id: string;
}

export interface AutoLinkSearchTag {
  /** 匹配总分值 */
  matchScore: number;
  /** 是否完全匹配 ID */
  isAbsoluteMatches?: boolean;
  /** 所属模组是否匹配 */
  isModMatches?: boolean;
  /** 是否是原版系物品 */
  isModVanilla?: boolean;
  /** 附属模组是否匹配 */
  isModExpansionMatches?: boolean;
  /** 前置模组是否匹配 */
  isModDependenceMatches?: boolean;
}
export type AutoLinkEntryType = "item" | "class" | "modpack" | "author" | "oredict";
export interface AutoLinkBaseEntry {
  searchTag: AutoLinkSearchTag;
  type: AutoLinkEntryType;
}
export interface AutoLinkItemEntry extends AutoLinkBaseEntry {
  data: McmodderItemData;
  type: "item";
}
export interface AutoLinkClassEntry extends AutoLinkBaseEntry {
  data: McmodderClassData;
  type: "class" | "modpack";
}
export interface AutoLinkAuthorEntry extends AutoLinkBaseEntry {
  data: McmodderAuthorData;
  type: "author";
}
export interface AutoLinkOredictEntry extends AutoLinkBaseEntry {
  data: McmodderOredictData;
  type: "oredict";
}
export type AutoLinkEntries = AutoLinkBaseEntry[];

export interface McmodderRecipeData {
  in_id?: Record<string, string>;
  out_id?: Record<string, string>;
  in_num?: Record<string, number>;
  out_num?: Record<string, number>;
  in_chance?: Record<string, number>;
  out_chance?: Record<string, number>;
  gui_id: string;
}
export type McmodderRecipeList = McmodderRecipeData[];

/** 一个表达自定义资料类型的数据 */
export interface ItemTypeData {
  /** 所属模组 ID */
  classID: number;
  /** 资料类型的数字 ID */
  typeID: number;
  /** 资料类型 FontAwesome 图标代码，不要忽略前缀 `fa-` 或 `fas-` 等，若是百科原生类型（`classID` = 0）则为单字符 */
  icon: string;
  /** 资料类型名称 */
  text: string;
  /** 资料类型的十六进制格式颜色，带有前缀 `#` */
  color: string;
}

export interface McmodderProfileData {
  /**
   * 存储在浏览器 Cookie 中的验证用户身份的 UUID
   * 
   * 只有用户拥有的账号信息才存在此属性
   */
  uuid?: string,

  /**
   * 该账户的登录信息会于该时间戳 (毫秒单位) 过期，届时必须重新登录以刷新登录信息
   * 
   * 百科账号登录一般 30 天过期，QQ 登录 7 天过期
   * 
   * 只有用户拥有的账号信息才存在此属性
   */
  expirationDate?: number,

  /** 用户头像的图片 URL */
  avatar: string,

  /**
   * 用户*当前使用*的昵称，可以在百科个人主页设置里修改
   * 
   * 注意不要和 `username` 混淆，默认二者相同
   */
  nickname: string,

  /**
   * 用户*注册使用*的昵称，已被使用的昵称无法重复使用，
   * 一经设置无法更改，QQ 登录则为 “QQ酱<百科用户ID>”
   * 
   * 注意不要和 `nickname` 混淆，默认二者相同
   */
  username: string,

  /** 用户的注册时间戳 (毫秒单位)，用于科龄计算和周年提醒 */
  regTime: number,
  /** 主站用户等级，注意不要和社群用户等级混淆 */
  lv: number,

  /**
   * 主站用户组，通常表示为下列字符串之一：
   * - 百科用户
   * - 百科编辑员
   * - 资深编辑员
   * - 禁止发言
   * - 禁止编辑
   * - 禁止访问
   */
  userGroup: string,

  /** 总编辑字节数 */
  editByte: number,
  /** 总编辑次数 */
  editNum: number,
  /** 平均字节数，只计正文有字节数增加的编辑 */
  editAvg: number,
  /** 编辑员区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  editorModList?: string,
  /** 管理员区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  adminModList?: string,
  /** 开发者区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  devModList?: string,
  /** 权限等级 */
  permission: McmodderPermission
  /** 该数据上次更新的时间戳 */
  lastUpdated?: number;
}

export interface AdvancementData {
  lang: string,
  category: AdvancementType,
  id: AdvancementID,
  range: number,
  exp: number,
  image?: string | null,
  reward?: number | null,
  tier?: number,
  isCustom: boolean,
  prev?: AdvancementData,
  next?: AdvancementData,
  level?: number
}

export interface McmodderTableRowRange {
  l: number;
  r: number;
}

export type McmodderTableDisplayRule<McmodderTableData> = (unit: any, row: McmodderTableData) =>
  string | number | null | undefined;

export interface ClassNameData {
  className: string,
  classEname: string,
  classAbbr: string
}

export interface McmodderKeyData {
  ctrlKey?: boolean,
  shiftKey?: boolean,
  altKey?: boolean,
  metaKey?: boolean,
  keyCode?: number,
  key?: string
}

export type ItemCustomTypeList = ItemTypeData[];

export type ConfigValueNumericRange = [number | null, number | null];
export type ConfigValueSet = Record<number, string>;
export type ConfigValueRange = ConfigValueNumericRange | ConfigValueSet;

export type McmodderConfigData = {
  title: string;
  description: string;
  type: McmodderConfigType;
  value: any | null;
  range: ConfigValueRange;
  permission: McmodderPermission;
}

export interface PreSubmitData {
  id: string;
  createTime: number;
  lastSubmitTime: number;
  title: string;
  url: string;
  rawData: string;
  config: GmXmlhttpRequestOption<"text", any>;
  errState?: number;
}

export interface VersionData {
  date: Date,
  name: string,
  mcver: string[],
  logid: number
}
export interface CFVersionData {
  id: number,
  releaseType: number,
  fileName: string,
  gameVersions: string[],
  dateCreated: number
}
export interface MRVersionData {
  id: number,
  version_type: string,
  version_number: string,
  game_versions: string[],
  date_published: number
}
export interface VersionCompareData {
  platform: 1 | 2;
  cfid?: string;
  mrid?: string;
  fileID: number;
  releaseType: string;
  displayName: string;
  gameVersions: string;
  releaseTime: Date;
  mcmodVer?: string;
  mcmodMcver?: string;
  mcmodDate?: Date;
  options: string;
}

export type EditorAlertHTMLModifier = (e: HTMLElement) => void;
export type EditorAlertForm = () => JQuery;

export type ScheduleRequestData = Record<string, ScheduleRequestType>;
export type ScheduleRequestList = ScheduleRequest[];

export type TextCompareMode = "diffLines" | "diffWords" | "diffChars";

export type JsDiffResult = {
  added: boolean;
  removed: boolean;
  value: string;
}

export type JsDiffResultList = JsDiffResult[];

export interface McmodderSplashData {
  time: number;
  content: string;
  num: number;
}

export interface McmodderClassRelationData {
  id: number;
  children: number[];
}

export interface McmodderRankUserStorageData {
  user: number;
  value: number;
}
export type McmodderRankStorageData = McmodderRankUserStorageData[];

export interface McmodderRankDisplayData {
  date: number;
  byteTop1: string;
  totalEdited: number;
  size: number;
}

export interface McmodderFileDisplayData {
  fileName: string;
  size: number;
}

export interface ItemJsonFrameConfig {
  classID: number;
  typeID: number;
  infer: boolean;
  getall: boolean;
  geticon: boolean;
}

export interface ItemJsonFrameApplication {
  user: string;
  pid: number;
  name: string;
  size: string;
  info: string;
  op: string;
}

export interface RequestData {
  config: GmXmlhttpRequestOption<"text", any>;
}
export type RequestQueue = RequestData[];

export interface RequestResult {
  index?: number,
  success?: boolean,
  value?: any
}

export interface RequestQueueExecution {
  [key: string]: any;
  runningIndex: Set<number>;
  queue: RequestQueue;
  results: RequestResult[];
  progress: number;
}

export type RequestQueuePreExecution = Partial<RequestQueueExecution>;

export type RequestQueueBackupData = Omit<RequestQueueExecution, "runningIndex"> & {
  runningIndex: number[];
}

export interface StructureEditorBlocktype {
  itemID: number;
  blockName: string;
  class: string;
  textures: string[];
  op: string | null;
}

declare global {
  const JsDiff: Record<TextCompareMode, (textA: string, textB: string) => JsDiffResultList>;
}