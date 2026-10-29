import type { Mcmodder } from "../Mcmodder";

export interface AutoLinkOptionProps<T extends AutoLinkBaseEntry> {
  parent: import("../Mcmodder").Mcmodder;
  entry: T;
  index: number;
}

/**
 * 通用可编辑表格组件（`GenericTable`）的 props。
 *
 * @param attr 透传到根 DOM 节点的附加属性（如 class/style）。
 * @param columnOptions 列初始化表：键 = 展示列名，值为表头文案或 `[表头文案, 展示规则]`。
 * @param editConfigs 编辑初始化表：声明每个展示列是否可编辑及编辑控件形态；缺省时整表只读。
 */
export interface TableProps<T extends TableAcceptable> {
  parent: import("../Mcmodder").Mcmodder;
  attr?: object;
  columnOptions: ColumnOptionsInitializer<T>;
  editConfigs?: EditOptionsInitializer<T>;
}

export interface ConfigResourceFileListInteractorProps<K extends keyof AppStorage> {
  parent: import("../Mcmodder").Mcmodder;
  id: K;
  name: string;
}

export interface ConfigResourceInteractorProps<
  K extends keyof AppStorage,
  TConfig extends object = Extract<AppStorage[K], object>,
  TData extends TableAcceptable = Extract<TConfig, TableAcceptable>,
> extends ConfigResourceFileListInteractorProps<K> {
  columnOptions: ColumnOptionsInitializer<TData>;
  configParser?: ConfigParser<TConfig>;
  dataParser?: DataParser<TData>;
}

export interface JsonFrameProps {
  id: string;
  parent: import("../Mcmodder").Mcmodder;
}

export interface GenericJsonFrameProps<T extends TableAcceptable>
  extends JsonFrameProps, TableProps<T> {
  configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>;
  allowedKeys: string[];
  opts?: {
    gmStorageRepo?: () => GMStorageRepository<T>;
    idbRepo?: () => import("../jsonframe/repository/IDBRepository").IDBRepository<T>;
    parseText?: (text: string) => {
      success: number;
      fail: number;
      result: T[];
    };
    more?: () => void;
  };
}

export interface InputProps<T> {
  title: string;
  value: T;
  onSuccessfulChange?: InputSuccessfulChangeCallBack<T>;
}

export interface PopoverBaseOption {
  /** 列表定位的锚点（以此元素的矩形计算位置与宽度）；缺省时用 `inputListBindElement` */
  anchorElement?: HTMLElement;
  /** 若在弹出框已打开时再次触发，则关闭弹出框 */
  closeWhenClickAgain?: boolean;
  /**
   * 决定弹出框样式中的 z-index 值，在诸如需要区分是否会被 swal 弹出框（z-index=1000）
   * 覆盖的场景下很有用 @default 500
   */
  zIndex?: number;
}

// types.d.ts 迁移
/**
 * 候选列表（`InputList`）的绑定选项。传给 `InputListPopoverController.add` 的**第一个参数**是
 * 「交互元素」（被注册、被监听 focus/keydown 的那个真实 DOM 节点），本接口描述它的行为。
 *
 * # 交互元素 ≠ 输入元素
 * 多数场景下两者是同一个元素（`InputListPopoverController` 省略 `inputListBindElement` 即按 `add`
 * 的第一个参数处理）；但也允许**分开指定**——此时交互元素只负责「什么时候弹列表」，
 * 文本的读写、选区维护、补全替换全部发生在 `inputListBindElement` 上。
 * `DropdownMenuInput.vue` 就靠这种方式把「显示成按钮的下拉菜单」复用了普通候选列表的逻辑。
 */
export interface InputListOption extends PopoverBaseOption {
  type: "inputList";
  /** 真正承载输入的元素；缺省时复用 `add` 的第一个参数（交互元素） */
  inputListBindElement?: InputListBindElement;
  /** 忽略输入内容，直接展示全部候选（不做匹配过滤，`DropdownMenuInput` 用此模式） */
  alwaysShowAllSuggestions?: boolean;
  /** 当 {@link alwaysShowAllSuggestions} 启用时，提供默认候选序号的回调 */
  defaultSelectionProvider?: () => number;
  /** 多段输入的分隔符（如审核理由用的「；」）：补全只替换光标所在的那一段，其余段落保持不变 */
  delimiter?: string;
  /** 输入为空时不弹出列表 */
  hideBeforeInput?: boolean;
  /** 候选数据的来源与持久化方式（手动回调 / 从配置读写） */
  suggestionManager: SuggestionCallbackManager | SuggestionConfigManager;
}

/**
 * `setOption` 的入参：在 {@link InputListOption} 之外必须显式给出**当前绑定的是哪个输入元素**。
 * */
export interface InputListProps extends InputListOption {
  inputNode: HTMLInputElement | HTMLTextAreaElement;
}

/**
 * 自定义表态选择面板的共享状态：`AttitudeSystem` 负责打开、定位与挂载，`AttitudePicker.vue` 负责渲染与关闭。
 */
export interface AttitudePickerState extends PopoverBaseOption {
  type: "attitudePicker";
  parent: import("../Mcmodder").Mcmodder;
  target: AttitudeTarget;
  /** 面板当前对应的短评 id（再次点击同一条短评即关闭） */
  commentId: string;
  active: string[];
}

export interface AttitudeStickerListProps {
  parent?: import("../Mcmodder").Mcmodder;
  /** 我上传的贴纸（按上传时间倒序） */
  stickers?: SupabaseAttitudeSticker[];
  /** 今日上传额度（null = 未知） */
  quota?: SupabaseAttitudeStickerQuota | null;
  /** 已表态的类型（高亮用）；只查看时传空数组 */
  active?: string[];
  /** 点击贴纸；不传 = 只查看 */
  onPick?: (attitudeType: string) => void;
  /** 上传本地图片；不传则不显示上传入口；用户上传本地图片作为贴纸（`AttitudeSystem` 接管；成功后直接用它表态） */
  onUpload?: (file: File) => Promise<void> | void;
  /** 共享 / 取消共享自己上传的贴纸；不传则不显示共享按钮 */
  onShare?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 取消收藏他人上传的贴纸；不传则不显示取消收藏按钮 */
  onFavorite?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 删除自己上传的贴纸；不传则不显示删除按钮 */
  onDelete?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
}

/**
 * 贴纸浏览区（网格 + 预览 + 操作栏），「我的贴纸」与「贴纸广场」共用。
 *
 * 操作栏里的发送 / 共享 / 收藏 / 删除都在这里：各自是否显示由传入的回调与贴纸归属决定
 * （共享、删除仅限自己上传的；收藏对他人贴纸可切换，自己的贴纸只能取消收藏）。
 * 差异部分由插槽补齐：`item`（网格项附加内容）、`desc`（预览描述区，整体替换）、
 * `desc-extra`（描述区默认内容之后追加）。
 */
export interface AttitudeStickerBrowserProps {
  /** 展示的贴纸列表（`loading` 时忽略） */
  stickers: SupabaseAttitudeSticker[];
  /** 正在拉取列表：列表区铺骨架块占位，预览区照常渲染，操作区暂不显示 */
  loading?: boolean;
  /** 已表态的类型（高亮用）；只查看时传空数组 */
  active?: string[];
  /** 点击贴纸发送表态；不传 = 只预览 */
  onPick?: (attitudeType: string) => void;
  /** 共享 / 取消共享自己上传的贴纸；不传则不显示共享按钮 */
  onShare?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 收藏 / 取消收藏；不传则不显示收藏按钮 */
  onFavorite?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 删除自己上传的贴纸；不传则不显示删除按钮 */
  onDelete?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 外观变体：`plaza` 启用广场专用的网格 / 网格项 / 描述区样式 */
  variant?: "default" | "plaza";
}

export interface AttitudeStickerPlazaProps {
  parent?: import("../Mcmodder").Mcmodder;
  /** 广场贴纸（按 `sort` 指定的方式排序） */
  stickers?: SupabaseAttitudeSticker[];
  /** 广场总条数（用于「加载更多」） */
  total?: number;
  /** 正在加载下一页 */
  loading?: boolean;
  /** 当前排序方式（缺省按最新共享） */
  sort?: StickerPlazaSort;
  /** 已表态的类型（高亮用） */
  active?: string[];
  /** 点击贴纸发送表态；不传 = 只预览 */
  onPick?: (attitudeType: string) => void;
  /** 收藏 / 取消收藏 */
  onFavorite?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 共享 / 取消共享自己上传的贴纸；不传则不显示共享按钮 */
  onShare?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 删除自己上传的贴纸；不传则不显示删除按钮 */
  onDelete?: (sticker: SupabaseAttitudeSticker) => Promise<boolean> | boolean;
  /** 加载下一页 */
  onLoadMore?: () => Promise<void> | void;
  /** 切换排序方式；不传则不显示排序控件 */
  onSortChange?: (sort: StickerPlazaSort) => void;
}

export interface AttitudeReactorListProps {
  parent: Mcmodder;
  commentId: string;
  attitudeType: string;
  /** 每页条数，默认 30 */
  pageSize?: number;
  /** 预填充的骨架行数量，默认 1 */
  stickerCount?: number;
}

/** 表态结果条悬浮卡片的选项：展示某短评下某类型的表态者 */
export interface AttitudeReactorsOption extends PopoverBaseOption {
  type: "attitudeReactors";
  parent: Mcmodder;
  commentId: string;
  attitudeType: string;
}

export interface StickerViewerOption extends PopoverBaseOption {
  type: "stickerViewer";
  parent: import("../Mcmodder").Mcmodder;
  sticker: SupabaseAttitudeSticker;
  /** 短评上下文：提供时在贴纸卡片下方展示表态用户列表 */
  commentId?: string;
  /** 贴纸数量上下文，供用户列表组件预渲染相应数量的骨架行 */
  stickerCount?: number;
  attitudeType?: string;
}

export interface PopoverExpose<
  TOption extends PopoverOption,
  TInputEvents extends Record<string, (e: Event) => void>,
> {
  /** 切换当前服务的输入元素与选项（由 `InputListPopoverController` 在聚焦时调用） */
  setOption: (option: TOption) => void;
  /** 转发给输入框的事件表（控制器据此在 `window` 上挂监听，也可被宿主直接调用） */
  inputEvents: TInputEvents;
  /** 转发给弹出框的坐标更新触发器 */
  updatePos: () => void | undefined;
  /** 关闭弹出框 */
  close: () => void;
  /** 弹出框的根节点（尚未挂载时为 `undefined`），用于区分「本组件的」与「其它组件的」弹出框 */
  getPopoverElement: () => HTMLElement | undefined;
}

/** 带候选列表的文本输入：props 同时充当 `InputListOption`，直接交给 `InputListPopoverController` */
export interface DropdownTextInputProps extends InputProps<string>, InputListOption {}

/** 一段文本的命中区间集合；区间均为左闭右开，彼此可能相交或相邻（`MatchedText` 会自行合并） */
export type MatchedRanges = ([number, number] | undefined)[];

/** 配置项的检索命中区间（设置中心搜索用），区间均相对于对应字段的纯文本 */
export interface ConfigMatchRanges {
  /** 标题的命中区间 */
  title?: [number, number][];
  /** 介绍的命中区间（介绍中的排版标签不占位，故偏移以剔除标签后的纯文本为准） */
  description?: [number, number][];
}
