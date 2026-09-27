declare const unsafeWindow: unknown;

type KeysOfType<T, P> = {
  [K in keyof T]-?: T[K] extends P ? K : never;
}[keyof T];

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type IndexedType<T extends object, K extends number | string | symbol = number> = T & {
  _primaryKey: K;
};

type IDBInsertType<T extends object> = T & { _filename: string };

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

/**
 * 调色盘：一组「颜色名 → 颜色值」的映射。
 * 颜色名是最终 CSS 变量的组成部分（如 `background` ⇒ `--mcmodder-color-background`），
 * 颜色值一般为 `#rrggbb` 等字符串，由 `StyleLoader.applyPaletteModifier` 负责展开。
 */
type Palette = Record<string, string>;

/** 颜色转换器：接收当前颜色与（可选）档号，返回处理后的新颜色。档号供多档修饰区分不同层级（如 `dark1~dark4`） */
type PaletteConverter = (color: string, tier?: number) => string;

/** 一种修饰：`converter` 为颜色转换函数；`maxTier` 表示要展开几档（设了才传入档号 `tier`） */
interface PaletteModifier {
  maxTier?: number;
  converter: PaletteConverter;
}

/** 一个修饰步骤：修饰名 → 修饰定义。修饰名会作为前缀追加进变量名（如 `dark`/`transparent`） */
type PaletteModifierStep = Record<string, PaletteModifier>;

/** 修饰表：按序排列的修饰步骤数组，驱动 `applyPaletteModifier` 的递归展开 */
type PaletteModifierSchedule = PaletteModifierStep[];

type Template = {
  id: string;
  title: string;
  description: string;
  content: string;
};

interface AppStorage {
  mcmodderSettings: Settings;
  userProfile?: Record<string, string>;
  mcmodderSplashList_v2?: string;
  templateList?: Template[];
  almanacsList?: Almanacs[];
  mcmodderLogger?: string;
  mcmodderJsonStorage?: Record<string, ItemList>;
  mcmodderRecipeJsonStorage?: Record<string, RecipeList>;
  latestEditTime?: Record<string, number>;
  latestComment?: Record<string, number>;
  classNameIDMap?: Record<string, string>;
  idClassNameMap?: Record<string, string>;
  modExpansions_v2?: Record<string, number[]>;
  modDependences_v2?: Record<string, number[]>;
  scheduleRequestList?: ScheduleRequestList;
  mcmodderInteracts?: Record<string, unknown>;
  mcmodderBackup?: Record<string, unknown>;
  rankData?: Record<string, /* { user: number, value: number }[] */ string>;
  guiBound?: RecipeJsonFrameGuiBound[];
  classData?: Record<string, string>;
  inputList?: Record<string, InputSimplifiedSuggestion[]>;
  assistantViewed?: Record<string, number[]>;
}

interface Settings {
  themeColor1: string;
  themeColor2: string;
  autoCheckUpdate: boolean;
  useSupabase: boolean;
  fetchCustomSplashes: boolean;
  customSplashRate: number;
  supabaseSplash: boolean;
  supabaseByteChart: boolean;
  moveAds: boolean;
  customFont: 0 | 1 | 2 | 3;
  disableGradient: boolean;
  adaptableNightMode: boolean;
  bbsNightMode: boolean;
  forceV4: boolean;
  // mcmodderUI: boolean,
  disableAutoStyleFix: boolean;
  // unlockHeaderContainer: boolean,
  customAdvancements: boolean;
  disableClassDataTypesetting: boolean;
  fastCopyName: boolean;
  compactSupportedVersions: boolean;
  gtceuIntegration: boolean;
  almanacs: boolean;
  enableSplashTracker: boolean;
  splashStyle: 0 | 1;
  splashFontUrl: string;
  enableLive2D: boolean;
  enableAprilFools: boolean;
  autoCheckin: boolean;
  defaultBackground: string;
  defaultNightBackground: string;
  backgroundAlpha: number;
  textShadowAlpha: number;
  radiusRatio: number;
  classAddHelper: boolean;
  editorAutoResize: boolean;
  noSubmitWarningDelay: boolean;
  autoSaveFix: boolean;
  fastSubmitFix: boolean;
  tabSelectorInfo: boolean;
  rememberModRelation: boolean;
  editorStats: number;
  anonymousUknowtoomuch: boolean;
  autoExpandPage: boolean;
  autoCloseSwal: boolean;
  multiDiffCompare: boolean;
  versionHelper: boolean;
  versionEditorHelper: boolean;
  subscribeDelay: number;
  subscribeComment: boolean;
  hoverDescription: boolean;
  hoverImage: boolean;
  imageLocalizedCheck: boolean;
  autoFoldTable: number;
  tableFix: boolean;
  tableThemeColor: boolean;
  tableLeftAlign: boolean;
  linkCheck: boolean;
  linkMark: boolean;
  removePostProtection: boolean;
  compactedChild: boolean;
  // compactedTablist: boolean,
  compactedVerifylist: boolean;
  compactedVerifyEntry: boolean;
  advancedRanklist: boolean;
  advancedOredictPage: boolean;
  rememberVisited: boolean;
  favUserDisplayStyle: 0 | 1 | 2;
  rememberVisitedMods: boolean;
  centerMainExpand: boolean;
  byteChart: boolean;
  maxByteColorValue: number;
  expCalculator: boolean;
  freezeAdvancements: boolean;
  unlockComment: boolean;
  ignoreEmptyLine: boolean;
  replyLink: boolean;
  missileAlert: boolean;
  missileAlertHeight: number;
  commentExpandHeight: number;
  userBlacklist: string;
  autoVerifyDelay: number;
  splitScreenOnVerify: boolean;
  itemListStylePreview: boolean;
  itemListStyleFix: boolean;
  alwaysNotify: number;
  alwaysNotifyVerification: number;
  preSubmitCheckInterval: number;
  fastUrge: boolean;
  enableStructureEditor: boolean;
  enableJsonHelper: boolean;
  itemRepository: 0 | 1;
  minimumRequestInterval: number;
  lieqi: boolean;
  keybindFastLink: Key;
  keybindFastSubmit: Key;
  keybindVerifyPass: Key;
  keybindVerifyRefund: Key;
  keybindVerifyCheck: Key;
  keybindVerifyReason: Key;

  // 以下不显示在设置界面
  nightMode: boolean;
  preferredWiderScreen: boolean;
  lastUid: number;
  lastRequestTime: number;
  itemCustomTypeList: ItemType[];
  userFavList: string;
  recentlyVisited: string;
  recentlyVisitedMods: RecentlyVisited[];
  myProfiles: string;
  guiLocker: number;
  shapelessLocker: boolean;
  jsonDatabase_v2: Record<0 | 1, string[]>;
  markdownIt: boolean;
  htmlEditor: boolean;
  editorVertical: boolean;
  editorToolkit: boolean;
  autolinkSourceLocal: boolean;
  autolinkSourceOnline: boolean;
  autolinkStyleSpace: boolean;
  preferredAutolinkStyle: 1 | 2;
  structureSelected: number;
  preferredDragPos: Record<string, number>;

  // 以下为旧版遗留
  templateList?: Template[];
  useNotoSans?: boolean;
  almanacsList?: Almanacs[];
  jsonDatabase?: string[];
}

interface Item {
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
type ItemList = Item[];

interface UnpurifiedItem extends Item {
  /** 对应原 maxStackSize */
  maxStacksSize?: number;
  /** 对应原 creativeTabName */
  CreativeTabName?: string;
}

interface ItemIcon {
  itemPrimaryKey: number;
  smallIcon?: Blob;
  largeIcon?: Blob;
}

interface Class {
  id: number;
  name: string;
  englishName: string;
  abbr: string;
  cover?: string;
}

interface Author {
  id: number;
  name: string;
  alias: string;
  isTeam: boolean;
}

interface Oredict {
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
  /** 成功匹配的字段与匹配范围 */
  ranges?: Partial<Record<keyof Item, [number, number][]>>;
}
type AutoLinkEntryType = "item" | "class" | "modpack" | "author" | "oredict";
interface AutoLinkBaseEntry {
  searchTag: AutoLinkSearchTag;
  type: AutoLinkEntryType;
}
interface AutoLinkItemEntry extends AutoLinkBaseEntry {
  data: Item;
  type: "item";
}
interface AutoLinkClassEntry extends AutoLinkBaseEntry {
  data: Class;
  type: "class" | "modpack";
}
interface AutoLinkAuthorEntry extends AutoLinkBaseEntry {
  data: Author;
  type: "author";
}
interface AutoLinkOredictEntry extends AutoLinkBaseEntry {
  data: Oredict;
  type: "oredict";
}
type AutoLinkEntry =
  AutoLinkItemEntry | AutoLinkClassEntry | AutoLinkAuthorEntry | AutoLinkOredictEntry;
type AutoLinkEntries = AutoLinkEntry[];

type Almanacs = {
  date: number;
  good: string[];
  bad: string[];
};
type AlmanacsPage = {
  almanacs: Almanacs;
  prevDate: number;
  nextDate: number;
};

interface ChangedStorage {
  id: string;
  timestamp: number;
  item: string;
  key: string;
}

type RecipeIngredient = string | string[];
interface Recipe {
  in_id?: Record<string, RecipeIngredient>;
  out_id?: Record<string, RecipeIngredient>;
  in_num?: Record<string, number>;
  out_num?: Record<string, number>;
  in_chance?: Record<string, number>;
  out_chance?: Record<string, number>;
  power_num?: Record<string, string>;
  gui_id: string;
}
interface SimpleRecipe extends Recipe {
  in_id?: Record<string, string>;
  out_id?: Record<string, string>;
}
type RecipeList = Recipe[];

/** 一个表达自定义资料类型的数据 */
interface ItemType {
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

interface Profile {
  /**
   * 存储在浏览器 Cookie 中的验证用户身份的 UUID
   *
   * 只有用户拥有的账号信息才存在此属性
   */
  uuid?: string;

  /**
   * 已认证账户的认证 UID
   */
  auth_uid?: number;

  /**
   * 已认证账户的认证用户名
   */
  auth_username?: string;

  /**
   * 已认证账户的认证密钥
   */
  auth_key?: string;

  /**
   * 该账户的登录信息会于该时间戳 (毫秒单位) 过期，届时必须重新登录以刷新登录信息
   *
   * 百科账号登录一般 30 天过期，QQ 登录 7 天过期
   *
   * 只有用户拥有的账号信息才存在此属性
   */
  expirationDate?: number;

  /** 用户头像的图片 URL */
  avatar: string;

  /**
   * 用户*当前使用*的昵称，可以在百科个人主页设置里修改
   *
   * 注意不要和 `username` 混淆，默认二者相同
   */
  nickname: string;

  /**
   * 用户*注册使用*的昵称，已被使用的昵称无法重复使用，
   * 一经设置无法更改，QQ 登录则为 “QQ酱<百科用户ID>”
   *
   * 注意不要和 `nickname` 混淆，默认二者相同
   */
  username: string;

  /** 用户的注册时间戳 (毫秒单位)，用于科龄计算和周年提醒 */
  regTime: number;
  /** 主站用户等级，注意不要和社群用户等级混淆 */
  lv: number;

  /**
   * 主站用户组，通常表示为下列字符串之一：
   * - 百科用户
   * - 百科编辑员
   * - 资深编辑员
   * - 禁止发言
   * - 禁止编辑
   * - 禁止访问
   */
  userGroup: string;

  /** 总编辑字节数 */
  editByte: number;
  /** 总编辑次数 */
  editNum: number;
  /** 平均字节数，只计正文有字节数增加的编辑 */
  editAvg: number;
  /** 编辑员区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  editorModList?: string;
  /** 管理员区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  adminModList?: string;
  /** 开发者区域的模组 ID 列表，以单个逗号 `,` 分隔 */
  devModList?: string;
  /** 权限等级 */
  permission: import("../config/ConfigUtils").Permission;
  /** 该数据上次更新的时间戳 */
  lastUpdated?: number;

  /**
   * 用户已完成但尚未弹出过提示的成就 ID 列表，以单个 `,` 分隔
   */
  completed?: string;

  /**
   * 用户所有成就的完成情况的序列化
   */
  advancements?: string;

  /**
   * 关注模组列表
   */
  subscribeModlist?: number[];

  /**
   * 预编辑列表
   */
  preSubmitList?: PreSubmission[];

  /**
   * 最近一次周年庆祝时，账号自注册至今所过去的年份数
   */
  annualCelebration?: number;
}

interface Advancement {
  lang: string;
  category: import("../advancement/AdvancementUtils").AdvancementType;
  id: import("../advancement/AdvancementUtils").AdvancementID;
  range: number;
  exp: number;
  image?: string | null;
  reward?: number | null;
  tier?: number;
  isCustom: boolean;
  prev?: Advancement;
  next?: Advancement;
  level?: number;
}

interface AdvancementProgression {
  id: import("../advancement/AdvancementUtils").AdvancementID;
  progress: number;
}

/** 表格行的数据形状：一行即一个普通对象（键 = 数据字段，值任意）。泛型 T 是字段名到字段类型的映射 */
// 以后会考虑给 Table 加另外一个泛型参数来限定各列数据类型
// eslint-disable-next-line
type TableAcceptable = Record<string, any>;
/** 单列配置：`name` 是表头文案；`displayRule` 决定该展示列如何把（可能多个）字段渲染成 HTML/文本 */
interface ColumnOption<T> {
  readonly name: string;
  readonly displayRule?: TableDisplayRule<T>;
}
/** 所有列的配置表：键 = 展示列名（通常与数据字段同名），值 = 该列配置 */
type ColumnOptions<T> = Record<string, ColumnOption<T>>;
/** 单列初始化器：只给表头名的字符串，或「表头名 + 展示规则」的二元组 */
type ColumnOptionInitializer<T> = string | [string, TableDisplayRule<T>];
/** 列配置初始化表：交给组件后由 `TableUtils.parseColumnOptionsInitializer` 逐一归一化 */
type ColumnOptionsInitializer<T> = Record<string, ColumnOptionInitializer<T>>;

/**
 * 归一化后的编辑配置：键 = 数据字段。
 * 两个映射部分的交叉类型表达「该字段是否允许缺省」——
 * 值为 `undefined` 的字段被划入带 `optional: true` 的一边，其余字段走另一边。
 */
type EditConfigs<T> = {
  [P in keyof T as T[P] extends undefined ? P : never]: TableInputOption & {
    optional: true;
  };
} & {
  [P in keyof T as T[P] extends undefined ? never : P]: TableInputOption;
}; // Record<keyof T, InputOption>;
/**
 * 单个字段的编辑配置初始化器（归一化前的各种简写形态）：
 * 空值（只读）、`InputType` 数值、`InputLimit`/`InputOption`/`TableInputOption` 对象、`{ readonly: true }`。
 */
type EditOptionInitializer =
  | null
  | undefined
  | import("../config/ConfigUtils").InputType
  | InputLimit
  | InputOption
  | TableInputOption
  | { readonly: true };
/** 全部字段的编辑配置初始化表 */
type EditOptionsInitializer<T> = Record<keyof T, EditOptionInitializer>;

/**
 * 组件内部的一行数据包装：
 * - `content` —— 原始数据对象（只读展示以它为准）；
 * - `selected` —— 是否被选中；
 * - `edited` —— 尚未保存的字段改动（双击编辑后暂存于此，`saveAll` 时写回 `content`）。
 */
interface TableRowData<T> {
  content: T;
  selected?: boolean;
  edited?: Partial<T>;
}

/** 「行索引 → 行数据」映射，是各编辑命令 execute 的返回值 / undo 的入参，用于成批记录改动 */
type TableDataMap<T extends TableAcceptable> = Record<number, T>;
/** 被选中行的行索引集合（升序） */
type TableRowSelection = number[];
/** 行数据列表（一整个表格的数据体） */
type TableDataList<T extends TableAcceptable> = T[];

/** 虚拟滚动当前渲染区间的左右闭区间边界（数据行索引） */
interface TableRowRange {
  l: number;
  r: number;
}

/**
 * 展示规则：把某展示列的原始值与（可选的）整行数据渲染成可展示内容。
 * 输入 `unit` 即列值的原始数据，`row` 为该字段所在整行（便于一个展示列综合多个字段）；
 * 返回 HTML/文本/数字，返回 `null`/`undefined` 时组件显示「∅」。
 */
// 以后会考虑给 Table 加另外一个泛型参数来限定各列数据类型
type TableDisplayRule<T> = (
  unit: any, // eslint-disable-line
  row: Partial<T>,
) => JQuery | string | number | null | undefined;

/**
 * 表格的「命令执行上下文」：`GenericTable` 暴露给各 `Command` 的操作面。
 * 命令只调用这些方法、不直接接触组件内部状态，从而让 execute/undo/redo 可回放。
 */
interface TableContext<T extends TableAcceptable> {
  empty: () => void;
  showLoading: () => void;
  refreshAll: () => void;
  getData: (index: number) => T;
  getRowData: (index: number) => TableRowData<T>;
  editData: (index: number, key: keyof T, value: unknown) => void;
  appendData: (data: T) => void;
  appendDataList: (dataList: TableDataList<T>) => void;
  insertRow: (index: number, newData?: T) => void;
  insertRowWithDataMap: (dataMap: TableDataMap<T>) => void;
  insertMultipleRowWithDataMap: (dataMap: TableDataMap<T>) => void;
  deleteRow: (index: number) => TableDataMap<T>;
  deleteMultipleRow: (selection: TableRowSelection) => TableDataMap<T>;
  copyRow: (selection: TableRowSelection) => void;
  pasteRow: (index: number) => TableDataMap<T>;
  dataMapToSelection: (dataMap: TableDataMap<T>) => number[];
}

type ConfigParser<TConfig extends object> = (config: string) => TConfig;
type DataParser<TData extends TableAcceptable> = (key: string, value: unknown) => TData;

type TimerDataGetter = () => number;
type TimerDataFormatter = (t: number) => string;

/**
 * 候选列表的「输入元素」：候选列表真正**读写文本**的那个 input / textarea。
 * 与「交互元素」区分开是为了复用——同一个按钮/容器可以只是被点击才弹出列表，
 * 而文本的读写、选区维护、补全替换都发生在另一个隐藏的 input 上
 * （典型用例见 `DropdownMenuInput.vue`：`ref="input"` 负责交互、`ref="valueInput"` 负责输入逻辑）。
 */
type InputListBindElement = HTMLInputElement | HTMLTextAreaElement;
/** 初始化候选列表：在输入框获得焦点时调用，返回本次要使用的候选（可含简写形式） */
type InputListOnInitSuggestion = () => InputSimplifiedSuggestion[];
/** 修改候选列表（新增/删除/改名后回调）：接收变更后的完整列表，返回是否保存成功（失败时列表会回滚提示） */
type InputListOnModifySuggestion = (list: InputSuggestion[]) => boolean;

/** 候选数据提供方式之一：手动指定初始化与修改时的回调函数（只读场景不需 `onModifySuggestion`） */
interface SuggestionCallbackManager {
  // 手动指定初始化与修改时的回调函数
  onInitSuggestion: InputListOnInitSuggestion;
  onModifySuggestion?: InputListOnModifySuggestion;
}
/** 候选数据提供方式之二：给出配置读写器与配置键名，候选列表自动从配置中加载与保存 */
interface SuggestionConfigManager {
  // 或是：设定好配置提供器和配置键名，组件自动从配置中获取推荐列表
  configs: import("../config/ConfigRepository").ConfigRepository;
  configKey: string;
}

type InputListOption = import("./props").InputListOption;

interface McmodItemEditorInnerData {
  content: string;
  name: string;
  ename?: string;
  type?: string;
  category: Record<number, number>;
  "icon-32x-data": string;
  "icon-128x-data": string;
  "is-general-node": string;
  "is-general-parents": string;
  oredict?: string;
  maxstack?: string;
}

interface McmodItemEditorData {
  action: "item_add" | "item_edit";
  "edit-id": string;
  "class-id": string;
  "item-data": McmodItemEditorInnerData;
}

interface ClassName {
  className: string;
  classEname: string;
  classAbbr: string;
}

interface Key {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  keyCode?: number;
  key?: string;
}

/** 菜单项显示规则：接收右键事件，返回该项在本次右键下是否应显示 */
type ContextMenuDisplayRule = (e: PointerEvent) => boolean;
/** 菜单项回调：接收**打开菜单的那次右键事件**（非点击菜单项的 click），供宿主定位被右键的对象 */
type ContextMenuCallback = (e: PointerEvent) => void;

/** 右键菜单项：key 标识、text 为 HTML 文案、shortcut 为可选快捷键、displayRule 决定显隐、callback 为点击回调 */
type ContextMenuItem = {
  key: string;
  text: string;
  shortcut?: Key;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
};
/** 全部已注册菜单项（`ContextMenu.items`） */
type ContextMenuItems = ContextMenuItem[];

/** 宿主传给 `ContextMenu.addItem` 的注册项（与 `ContextMenuItem` 形状一致，此处单列一份表示「注册」语义） */
type ContextMenuItemOption = {
  key: string;
  text: string;
  shortcut?: Key;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
};

type ProgressBarDisplayRule = (val: number, min: number, max: number) => string;

type ItemCustomTypeList = ItemType[];

/** 数值输入的范围 `[min, max]`，两端可为 null 表示不设上限/下限（供 `NumberInput` 校验） */
type InputValueNumericRange = [number | null, number | null];
/** 数值输入的范围 `[min, max]`（两端必有值） */
type InputValueFiniteNumericRange = [number, number];
/** 枚举值集合：值 → 显示文案（用于下拉类输入） */
type InputValueSet = Record<number, string>;
/** 输入范围：数值区间或枚举值集合 */
type InputValueRange = InputValueNumericRange | InputValueSet;

/** 单条候选：`value` 为真正被匹配与写回的文本；`html` 为自定义展示（存在时以 `v-html`/`v-text` 渲染，不做匹配高亮） */
interface InputSuggestion {
  html?: string;
  value: string;
  showValue?: boolean;
  alias?: string[];
  noEscape?: boolean;
}
/** 候选的简写形式：允许直接写字符串（等价于 `{ value }`），`onInitSuggestion` 返回时会统一规范化 */
type InputSimplifiedSuggestion = InputSuggestion | string;
/** 候选的匹配评分与命中范围：`ranges` 记录各字段被命中的 `[start, end)` 区间（下标以小写后的文本为准） */
interface InputSuggestionRate {
  score?: number;
  ranges?: {
    value?: [number, number];
    alias: Record<number, [number, number]>;
  };
}
/** 参与展示的候选 = 原始候选 + 本次匹配算出的评分与命中范围（`suggestedList` 中的元素） */
interface InputRatedSuggestion extends InputSuggestion, InputSuggestionRate {}

/** 输入成功变更的回调：收到校验结果 `InputValidInfo<T>`（其中 `final` 是规范后的最终值） */
type InputSuccessfulChangeCallBack<T> = (info: InputValidInfo<T>) => void;

/** 所有 `input/*` 组件通过 `defineExpose` 暴露给宿主的统一操作面 */
interface InputControlRef<T> {
  getInstance(): HTMLElement;
  getValue(): T;
  setCurrentValue(newValue: T): void;
  setDisplayValue(newValue: T): void;
}

interface InputLimit {
  readonly type: import("../config/ConfigUtils").InputType;
  readonly range?: InputValueRange;
}

interface InputOption extends InputLimit {
  readonly value: unknown;
}

/** 表格字段的编辑选项：在 `InputOption` 之上增加自定义显示名、只读与可选标记 */
interface TableInputOption extends InputOption {
  readonly customName?: string;
  readonly readonly?: boolean;
  readonly optional?: boolean;
}

/** 输入校验结果：`isok` 是否通过；`final` 为通过后规范化的最终值，`msg` 为失败原因（如越界） */
interface InputValidInfo<T> {
  readonly msg?: string;
  readonly isok: boolean;
  readonly final?: T;
}

interface ConfigOption extends InputOption {
  readonly title: string;
  readonly description: string;
  readonly permission: import("../config/ConfigUtils").Permission;
  readonly suggestion?: InputSimplifiedSuggestion[];
}

interface PreSubmission {
  id: string;
  createTime: number;
  lastSubmitTime: number;
  title: string;
  url: string;
  rawData: string;
  config: import("$").GmXmlhttpRequestOption<"text", unknown>;
  errState?: number;
}

interface GameVersion {
  date: Date;
  name: string;
  mcver: string[];
  logid: number;
}
interface CFGameVersion {
  id: number;
  releaseType: number;
  fileName: string;
  gameVersions: string[];
  dateCreated: number;
}
interface MRGameVersion {
  id: number;
  version_type: string;
  version_number: string;
  game_versions: string[];
  date_published: number;
}
interface GameVersionCompareEntry {
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

interface RecentlyVisited {
  id: number;
  time: number;
}

type EditorAlertHTMLModifier = (e: HTMLElement) => void;
type EditorAlertForm = () => JQuery;

interface ScheduleRequestTypes {
  autoCheckin: import("../schedulerequest/types/AutoCheckinScheduleRequest").AutoCheckinScheduleRequest;
  autoCheckUpdate: import("../schedulerequest/types/AutoCheckUpdateScheduleRequest").AutoCheckUpdateScheduleRequest;
  autoCheckVerify: import("../schedulerequest/types/AutoCheckVerifyScheduleRequest").AutoCheckVerifyScheduleRequest;
  autoHandlePreSubmit: import("../schedulerequest/types/AutoHandlePreSubmitScheduleRequest").AutoHandlePreSubmitScheduleRequest;
  autoSubscribe: import("../schedulerequest/types/AutoSubscribeScheduleRequest").AutoSubscribeScheduleRequest;
}

interface ScheduleRequest {
  time: number;
  todo: keyof ScheduleRequestTypes;
  userID?: number;
  priority: number;
  id: string;
}

type ScheduleRequestOption = Partial<
  Record<
    keyof ScheduleRequestTypes,
    import("../schedulerequest/ScheduleRequestType").ScheduleRequestType
  >
>;
type ScheduleRequestList = ScheduleRequest[];

type TextCompareMode = "diffLines" | "diffWords" | "diffChars";

type JsDiffResult = {
  added: boolean;
  removed: boolean;
  value: string;
};

type JsDiffResultList = JsDiffResult[];

interface Splash {
  time: number;
  content: string;
  num: number;
}

interface ClassRelation {
  id: number;
  children: number[];
}

interface RankUserStorage {
  user: number;
  value: number;
}
type RankStorage = RankUserStorage[];

interface RankDisplay {
  date: number;
  byteTop1: string;
  totalEdited: number;
  size: number;
}

interface FileDisplay {
  fileName: string;
  size: number;
}

type JsonFrameToolOnClickCallback = (ev: Event) => unknown;
type JsonFrameToolDisplayCondition = () => boolean;

interface JsonFrameTool {
  id: string;
  text: string;
  displayCondition: import("vue").ComputedRef<boolean>;
  onClick: JsonFrameToolOnClickCallback;
  dangerMode: boolean;
  labelAttr?: object;
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

type JsonStorage<T extends TableAcceptable> = Record<string, T[]>;

interface AppRequest {
  config: import("$").GmXmlhttpRequestOption<"text", unknown>;
}
type RequestList = AppRequest[];

interface RequestResult {
  index?: number;
  success?: boolean;
  // 网络通信牛逼
  // eslint-disable-next-line
  value?: any;
}

interface RequestQueueExecution {
  // 网络通信牛逼
  // eslint-disable-next-line
  [key: string]: any;
  runningIndex: Set<number>;
  queue: RequestList;
  results: RequestResult[];
  progress: number;
}

type RequestQueuePreExecution = Partial<RequestQueueExecution>;

type RequestQueueBackup = Omit<RequestQueueExecution, "runningIndex"> & {
  runningIndex: number[];
};

type MapKeyHandler<V, K> = (data: V) => K | K[];

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
  user_id: number;
  user_name: string;
  auth_key: string;
}

interface SupabaseSyncSettingsResponse {
  last_modified: string;
  mcmodder_settings?: string;
  user_profile?: string;
  template_list?: string;
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
  data?: unknown;
}

interface SupabaseGetCustomSplashesResponse {
  splashes?: SupabaseCustomSplash[];
  error?: string;
}
