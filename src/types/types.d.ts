declare const unsafeWindow: any;

type KeysOfType<T, P> = {
  [K in keyof T]-?: T[K] extends P ? K : never
}[keyof T];

interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface HSL {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

interface RGBA extends RGB {
  readonly a: number;
}

interface HSLA extends HSL {
  readonly a: number;
}

type McmodderPalette = Record<string, string>;

type PaletteConverter = (color: string, tier?: number) => string;

interface PaletteModifier {
  maxTier?: number;
  converter: PaletteConverter;
}

type PaletteModifierStep = Record<string, PaletteModifier>;

type PaletteModifierSchedule = PaletteModifierStep[];

type McmodderTemplateData = {
  id: string;
  title: string;
  description: string;
  content: string;
}

interface McmodderStorage {
  mcmodderSettings: McmodderSettings,
  userProfile?: Record<string, string>,
  mcmodderSplashList_v2?: string,
  templateList?: McmodderTemplateData[],
  almanacsList?: AlmanacsData[],
  mcmodderLogger?: string,
  mcmodderJsonStorage?: Record<string, McmodderItemList>,
  mcmodderRecipeJsonStorage?: Record<string, McmodderRecipeList>,
  latestEditTime?: Record<string, number>,
  latestComment?: Record<string, number>,
  classNameIDMap?: Record<string, string>,
  idClassNameMap?: Record<string, string>,
  modExpansions_v2?: Record<string, number[]>,
  modDependences_v2?: Record<string, number[]>,
  scheduleRequestList?: ScheduleRequestList,
  mcmodderInteracts?: Record<string, unknown>,
  mcmodderBackup?: Record<string, unknown>,
  rankData?: Record<string, /* { user: number, value: number }[] */ string>,
  guiBound?: RecipeJsonFrameGuiBound[],
  classData?: Record<string, string>,
  inputList?: Record<string, InputSimplifiedSuggestion[]>,
  assistantViewed?: Record<string, number[]>,
}

interface McmodderSettings {
  themeColor1: string,
  themeColor2: string,
  autoCheckUpdate: boolean,
  useSupabase: boolean,
  fetchCustomSplashes: boolean,
  customSplashRate: number,
  supabaseSplash: boolean,
  supabaseByteChart: boolean,
  moveAds: boolean,
  customFont: 0 | 1 | 2 | 3,
  disableGradient: boolean,
  adaptableNightMode: boolean,
  bbsNightMode: boolean,
  forceV4: boolean,
  // mcmodderUI: boolean,
  disableAutoStyleFix: boolean,
  // unlockHeaderContainer: boolean,
  customAdvancements: boolean,
  disableClassDataTypesetting: boolean,
  fastCopyName: boolean,
  compactSupportedVersions: boolean,
  gtceuIntegration: boolean,
  almanacs: boolean,
  enableSplashTracker: boolean,
  splashStyle: 0 | 1,
  splashFontUrl: string,
  enableLive2D: boolean,
  enableAprilFools: boolean,
  autoCheckin: boolean,
  defaultBackground: string,
  defaultNightBackground: string,
  backgroundAlpha: number,
  textShadowAlpha: number,
  radiusRatio: number,
  classAddHelper: boolean,
  editorAutoResize: boolean,
  noSubmitWarningDelay: boolean,
  autoSaveFix: boolean,
  fastSubmitFix: boolean,
  tabSelectorInfo: boolean,
  rememberModRelation: boolean,
  editorStats: number,
  anonymousUknowtoomuch: boolean,
  autoExpandPage: boolean,
  autoCloseSwal: boolean,
  multiDiffCompare: boolean,
  versionHelper: boolean,
  versionEditorHelper: boolean,
  subscribeDelay: number,
  subscribeComment: boolean,
  hoverDescription: boolean,
  hoverImage: boolean,
  imageLocalizedCheck: boolean,
  autoFoldTable: number,
  tableFix: boolean,
  tableThemeColor: boolean,
  tableLeftAlign: boolean,
  linkCheck: boolean,
  linkMark: boolean,
  removePostProtection: boolean,
  compactedChild: boolean,
  // compactedTablist: boolean,
  compactedVerifylist: boolean,
  compactedVerifyEntry: boolean,
  advancedRanklist: boolean,
  advancedOredictPage: boolean,
  rememberVisited: boolean,
  favUserDisplayStyle: 0 | 1 | 2,
  rememberVisitedMods: boolean,
  centerMainExpand: boolean,
  byteChart: boolean,
  maxByteColorValue: number,
  expCalculator: boolean,
  freezeAdvancements: boolean,
  unlockComment: boolean,
  ignoreEmptyLine: boolean,
  replyLink: boolean,
  missileAlert: boolean,
  missileAlertHeight: number,
  commentExpandHeight: number,
  userBlacklist: string,
  autoVerifyDelay: number,
  splitScreenOnVerify: boolean,
  itemListStylePreview: boolean,
  itemListStyleFix: boolean,
  alwaysNotify: number,
  alwaysNotifyVerification: number,
  preSubmitCheckInterval: number,
  fastUrge: boolean,
  enableStructureEditor: boolean,
  enableJsonHelper: boolean,
  itemRepository: 0 | 1,
  minimumRequestInterval: number,
  lieqi: boolean,
  keybindFastLink: McmodderKeyData,
  keybindFastSubmit: McmodderKeyData,
  keybindVerifyPass: McmodderKeyData,
  keybindVerifyRefund: McmodderKeyData,
  keybindVerifyCheck: McmodderKeyData,
  keybindVerifyReason: McmodderKeyData,

  // 以下不显示在设置界面
  nightMode: boolean,
  preferredWiderScreen: boolean,
  lastUid: number,
  lastRequestTime: number,
  itemCustomTypeList: ItemTypeData[],
  userFavList: string,
  recentlyVisited: string,
  recentlyVisitedMods: RecentlyVisitedData[],
  myProfiles: string,
  guiLocker: number,
  shapelessLocker: boolean,
  jsonDatabase: string[],
  markdownIt: boolean,
  htmlEditor: boolean,
  editorVertical: boolean,
  editorToolkit: boolean,
  autolinkSourceLocal: boolean,
  autolinkSourceOnline: boolean,
  autolinkStyleSpace: boolean,
  preferredAutolinkStyle: 1 | 2,
  structureSelected: number,
  preferredDragPos: Record<string, number>,

  // 以下为旧版遗留
  templateList?: McmodderTemplateData[],
  useNotoSans?: boolean,
  almanacsList?: AlmanacsData[]
}

interface McmodderItemData {
  /**
   * 该物品的百科资料 ID，
   * 未绑定百科资料时为 `0`
   */
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
   * 若属于物品，则：若是 `BlockItem` 则为 `Block`，否则为 `Item`；
   * 若属于实体，则为 `Entity`
   */
  type?: "Block" | "Item" | "Entity";
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
  /**
   * 最大堆叠（百科旧版也称“最大叠加”，今已更正）
   * 一些环境下使用别名 `maxStacksSize`，脚本统一使用 `maxStackSize`
   */
  maxStackSize?: number;
  /** 最大耐久 */
  maxDurability?: number;
  /** 正文内容 */
  content?: string;
}
type McmodderItemList = McmodderItemData[];

interface McmodderUnpurifiedItemData extends McmodderItemData {
  /** 对应原 maxStackSize */
  maxStacksSize?: number;
  /** 对应原 creativeTabName */
  CreativeTabName?: string;
}

interface McmodderClassData {
  id: number;
  name: string;
  englishName: string;
  abbr: string;
  cover?: string;
}

interface McmodderAuthorData {
  id: number;
  name: string;
  alias: string;
  isTeam: boolean;
}

interface McmodderOredictData {
  id: string;
}

interface AutoLinkSearchTag {
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
type AutoLinkEntryType = "item" | "class" | "modpack" | "author" | "oredict";
interface AutoLinkBaseEntry {
  searchTag: AutoLinkSearchTag;
  type: AutoLinkEntryType;
}
interface AutoLinkItemEntry extends AutoLinkBaseEntry {
  data: McmodderItemData;
  type: "item";
}
interface AutoLinkClassEntry extends AutoLinkBaseEntry {
  data: McmodderClassData;
  type: "class" | "modpack";
}
interface AutoLinkAuthorEntry extends AutoLinkBaseEntry {
  data: McmodderAuthorData;
  type: "author";
}
interface AutoLinkOredictEntry extends AutoLinkBaseEntry {
  data: McmodderOredictData;
  type: "oredict";
}
type AutoLinkEntry =
  AutoLinkItemEntry |
  AutoLinkClassEntry |
  AutoLinkAuthorEntry |
  AutoLinkOredictEntry;
type AutoLinkEntries = AutoLinkEntry[];

type AlmanacsData = {
  date: number,
  good: string[],
  bad: string[]
}
type AlmanacsPage = {
  almanacs: AlmanacsData,
  prevDate: number,
  nextDate: number
}

interface ChangedStorage {
  id: string,
  timestamp: number,
  item: string,
  key: string
}

type McmodderRecipeIngredient = string | string[];
interface McmodderRecipeData {
  in_id?: Record<string, McmodderRecipeIngredient>;
  out_id?: Record<string, McmodderRecipeIngredient>;
  in_num?: Record<string, number>;
  out_num?: Record<string, number>;
  in_chance?: Record<string, number>;
  out_chance?: Record<string, number>;
  power_num?: Record<string, string>;
  gui_id: string;
}
interface McmodderSimpleRecipeData extends McmodderRecipeData {
  in_id?: Record<string, string>;
  out_id?: Record<string, string>;
}
type McmodderRecipeList = McmodderRecipeData[];

/** 一个表达自定义资料类型的数据 */
interface ItemTypeData {
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

interface McmodderProfileData {
  /**
   * 存储在浏览器 Cookie 中的验证用户身份的 UUID
   * 
   * 只有用户拥有的账号信息才存在此属性
   */
  uuid?: string,

  /**
   * 已认证账户的认证 UID
   */
  auth_uid?: number,

  /**
   * 已认证账户的认证用户名
   */
  auth_username?: string,

  /**
   * 已认证账户的认证密钥
   */
  auth_key?: string

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
  permission: import("../config/ConfigUtils").McmodderPermission,
  /** 该数据上次更新的时间戳 */
  lastUpdated?: number,

  /**
   * 用户已完成但尚未弹出过提示的成就 ID 列表，以单个 `,` 分隔
   */
  completed?: string,

  /**
   * 用户所有成就的完成情况的序列化
   */
  advancements?: string,

  /**
   * 关注模组列表
   */
  subscribeModlist?: number[],

  /**
   * 预编辑列表
   */
  preSubmitList?: PreSubmitData[],

  /**
   * 最近一次周年庆祝时，账号自注册至今所过去的年份数
   */
  annualCelebration?: number
}

interface AdvancementData {
  lang: string,
  category: import("../advancement/AdvancementUtils").AdvancementType,
  id: import("../advancement/AdvancementUtils").AdvancementID,
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

interface AdvancementProgressionData {
  id: import("../advancement/AdvancementUtils").AdvancementID,
  progress: number
}

type McmodderTableAcceptable = Record<string, any>;
interface HeadConfig<T> {
  readonly name: string;
  readonly displayRule?: McmodderTableDisplayRule<T>;
}
type HeadConfigs<T> = Record<string, HeadConfig<T>>;
type HeadConfigInitializer<T> = string | [string, McmodderTableDisplayRule<T>];
type HeadConfigsInitializer<T> = Record<string, HeadConfigInitializer<T>>;

type EditConfigs<T> = {
  [P in keyof T as T[P] extends undefined ? P : never]: McmodderTableInputData & { optional: true };
} & {
  [P in keyof T as T[P] extends undefined ? never : P]: McmodderTableInputData;
};  // Record<keyof T, McmodderInputData>;
type EditConfigInitializer = null | undefined | import("../config/ConfigUtils").McmodderInputType | McmodderInputLimit | McmodderInputData | McmodderTableInputData | {readonly: true};
type EditConfigsInitializer<T> = Record<keyof T, EditConfigInitializer>;

interface McmodderTableRowData<T> {
  content: T;
  selected?: boolean;
  edited?: Partial<T>;
}

type McmodderTableDataMap<T extends McmodderTableAcceptable> = Record<number, T>;
type McmodderTableRowSelection = number[];
type McmodderTableDataList<T extends McmodderTableAcceptable> = T[];

interface McmodderTableRowRange {
  l: number;
  r: number;
}

type McmodderTableDisplayRule<T> = (unit: any, row: Partial<T>) =>
  JQuery | string | number | null | undefined;

interface McmodderTableContext<T extends McmodderTableAcceptable> {
  empty: () => void,
  showLoading: () => void,
  refreshAll: () => void,
  getData: (index: number) => T,
  getRowData: (index: number) => McmodderTableRowData<T>,
  editData: (index: number, key: keyof T, value: any) => void,
  appendData: (data: T) => void,
  appendDataList: (dataList: McmodderTableDataList<T>) => void,
  insertRow: (index: number, newData?: T) => void,
  insertRowWithDataMap: (dataMap: McmodderTableDataMap<T>) => void,
  insertMultipleRowWithDataMap: (dataMap: McmodderTableDataMap<T>) => void,
  deleteRow: (index: number) => McmodderTableDataMap<T>,
  deleteMultipleRow: (selection: McmodderTableRowSelection) => McmodderTableDataMap<T>,
  copyRow: (selection: McmodderTableRowSelection) => void,
  pasteRow: (index: number) => McmodderTableDataMap<T>,
  dataMapToSelection: (dataMap: McmodderTableDataMap<T>) => number[]
}

type ConfigParser<TConfig extends object> = (config: string) => TConfig;
type DataParser<TData extends McmodderTableAcceptable> = (key: string, value: unknown) => TData;

type TimerDataGetter = () => number;
type TimerDataFormatter = (t: number) => string;

type InputListBindElement = HTMLInputElement | HTMLTextAreaElement;
type InputListOnInitSuggestion = () => InputSimplifiedSuggestion[];
type InputListOnModifySuggestion = (list: InputSuggestion[]) => boolean;

interface SuggestionCallbackManager {
  // 手动指定初始化与修改时的回调函数
  onInitSuggestion: InputListOnInitSuggestion,
  onModifySuggestion?: InputListOnModifySuggestion
}
interface SuggestionConfigManager {
  // 或是：设定好配置提供器和配置键名，组件自动从配置中获取推荐列表
  configs: import("../config/ConfigRepository").ConfigRepository,
  configKey: string
}

type InputListOption = import("./props").InputListOption;

interface McmodItemEditorInnerData {
  content: string,
  name: string,
  ename?: string,
  type?: string,
  category: Record<number, number>,
  "icon-32x-data": string,
  "icon-128x-data": string,
  "is-general-node": string,
  "is-general-parents": string,
  oredict?: string,
  maxstack?: string
}

interface McmodItemEditorData {
  action: "item_add" | "item_edit",
  "edit-id": string,
  "class-id": string,
  "item-data": McmodItemEditorInnerData
}

interface ClassNameData {
  className: string,
  classEname: string,
  classAbbr: string
}

interface McmodderKeyData {
  ctrlKey?: boolean,
  shiftKey?: boolean,
  altKey?: boolean,
  metaKey?: boolean,
  keyCode?: number,
  key?: string
}

type ContextMenuDisplayRule = (e: PointerEvent) => boolean;
type ContextMenuCallback = (e: PointerEvent) => void;

type ContextMenuItem = {
  key: string;
  text: string;
  shortcut?: McmodderKeyData;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
}
type ContextMenuItems = ContextMenuItem[];

type ContextMenuItemOption = {
  key: string,
  text: string,
  shortcut?: McmodderKeyData,
  displayRule: ContextMenuDisplayRule,
  callback: ContextMenuCallback
}

type ProgressBarDisplayRule = (val: number, min: number, max: number) => string;

type ItemCustomTypeList = ItemTypeData[];

type InputValueNumericRange = [number | null, number | null];
type InputValueFiniteNumericRange = [number, number];
type InputValueSet = Record<number, string>;
type InputValueRange = InputValueNumericRange | InputValueSet;

interface InputSuggestion {
  html?: string;
  value: string;
  showValue?: boolean;
  alias?: string[];
  noEscape?: boolean;
}
type InputSimplifiedSuggestion = InputSuggestion | string;
interface InputRatedSuggestion extends InputSuggestion {
  matchScore: number;
}

type InputSuccessfulChangeCallBack<T> = (info: InputValidInfo<T>) => void;

interface InputControlRef<T> {
  getInstance(): HTMLElement,
  getValue(): T,
  setCurrentValue(newValue: T): void,
  setDisplayValue(newValue: T): void
}

interface McmodderInputLimit {
  readonly type: import("../config/ConfigUtils").McmodderInputType;
  readonly range?: InputValueRange;
}

interface McmodderInputData extends McmodderInputLimit {
  readonly value: any;
}

interface McmodderTableInputData extends McmodderInputData {
  readonly customName?: string;
  readonly readonly?: boolean;
  readonly optional?: boolean;
}

interface InputValidInfo<T> {
  readonly msg?: string;
  readonly isok: boolean;
  readonly final?: T;
}

interface McmodderConfigData extends McmodderInputData {
  readonly title: string;
  readonly description: string;
  readonly permission: import("../config/ConfigUtils").McmodderPermission;
  readonly suggestion?: InputSimplifiedSuggestion[];
}

interface PreSubmitData {
  id: string;
  createTime: number;
  lastSubmitTime: number;
  title: string;
  url: string;
  rawData: string;
  config: import("$").GmXmlhttpRequestOption<"text", any>;
  errState?: number;
}

interface VersionData {
  date: Date,
  name: string,
  mcver: string[],
  logid: number
}
interface CFVersionData {
  id: number,
  releaseType: number,
  fileName: string,
  gameVersions: string[],
  dateCreated: number
}
interface MRVersionData {
  id: number,
  version_type: string,
  version_number: string,
  game_versions: string[],
  date_published: number
}
interface VersionCompareData {
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

interface RecentlyVisitedData {
  id: number;
  time: number;
}

type EditorAlertHTMLModifier = (e: HTMLElement) => void;
type EditorAlertForm = () => JQuery;

interface ScheduleRequestTypes {
  autoCheckin: import("../schedulerequest/types/AutoCheckinScheduleRequest").AutoCheckinScheduleRequest,
  autoCheckUpdate: import("../schedulerequest/types/AutoCheckUpdateScheduleRequest").AutoCheckUpdateScheduleRequest,
  autoCheckVerify: import("../schedulerequest/types/AutoCheckVerifyScheduleRequest").AutoCheckVerifyScheduleRequest,
  autoHandlePreSubmit: import("../schedulerequest/types/AutoHandlePreSubmitScheduleRequest").AutoHandlePreSubmitScheduleRequest,
  autoSubscribe: import("../schedulerequest/types/AutoSubscribeScheduleRequest").AutoSubscribeScheduleRequest
}

interface ScheduleRequest {
  time: number,
  todo: keyof ScheduleRequestTypes,
  userID?: number,
  priority: number,
  id: string
}

type ScheduleRequestData = Partial<Record<keyof ScheduleRequestTypes, import("../schedulerequest/ScheduleRequestType").ScheduleRequestType>>;
type ScheduleRequestList = ScheduleRequest[];

type TextCompareMode = "diffLines" | "diffWords" | "diffChars";

type JsDiffResult = {
  added: boolean;
  removed: boolean;
  value: string;
}

type JsDiffResultList = JsDiffResult[];

interface McmodderSplashData {
  time: number;
  content: string;
  num: number;
}

interface McmodderClassRelationData {
  id: number;
  children: number[];
}

interface McmodderRankUserStorageData {
  user: number;
  value: number;
}
type McmodderRankStorageData = McmodderRankUserStorageData[];

interface McmodderRankDisplayData {
  date: number;
  byteTop1: string;
  totalEdited: number;
  size: number;
}

interface McmodderFileDisplayData {
  fileName: string;
  size: number;
}

type JsonFrameToolOnClickCallback = (ev: Event) => any;
type JsonFrameToolDisplayCondition = () => boolean;

interface JsonFrameToolData {
  id: string,
  text: string,
  displayCondition: import("vue").ComputedRef<boolean>,
  onClick: JsonFrameToolOnClickCallback,
  dangerMode: boolean,
  labelAttr?: object
}

interface ItemJsonFrameConfig {
  classID: number;
  typeID: number;
  infer: boolean;
  getall: boolean;
  geticon: boolean;
}

interface ItemJsonFrameApplication {
  user: string;
  pid: number;
  name: string;
  size: string;
  info: string;
  op: string;
}

interface RecipeJsonFrameGuiBound {
  guiID: string;
  mcmodID: number;
}

type McmodderJsonStorage<T extends McmodderTableAcceptable> = Record<string, T[]>; 

interface RequestData {
  config: import("$").GmXmlhttpRequestOption<"text", any>;
}
type RequestQueue = RequestData[];

interface RequestResult {
  index?: number,
  success?: boolean,
  value?: any
}

interface RequestQueueExecution {
  [key: string]: any;
  runningIndex: Set<number>;
  queue: RequestQueue;
  results: RequestResult[];
  progress: number;
}

type RequestQueuePreExecution = Partial<RequestQueueExecution>;

type RequestQueueBackupData = Omit<RequestQueueExecution, "runningIndex"> & {
  runningIndex: number[];
}

type McmodderMapKeyHandler = (data: any) => any;

interface StructureEditorBlocktype {
  id: number;
  itemID: number;
  blockName: string;
  class: string;
  textures: string[];
  op: string | null;
}

interface SupabaseErrorResponse {
  error?: string;
}

interface SupabaseTrackSplashResponse {
  count: number;
  last_visited_user_id: number;
  last_visited_user_name: string;
  last_visited_at: string;
}

interface SupabaseByteChartResponse {
  data: [string, number][];
}

interface SupabaseAuthenticatorResponse {
  user_id: number,
  user_name: string,
  auth_key: string
}

interface SupabaseSyncSettingsResponse {
  last_modified: string,
  mcmodder_settings?: string,
  user_profile?: string,
  template_list?: string
}

interface SupabaseCustomSplash {
  id?: number;
  content: string;
  author_id?: number;
  author_name?: string;
}

interface SupabaseUploadSplashResponse {
  message?: string;
  error?: string;
  data?: any;
}

interface SupabaseGetCustomSplashesResponse {
  splashes?: SupabaseCustomSplash[];
  error?: string;
}