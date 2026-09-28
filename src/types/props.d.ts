import type { IDBRepository } from "../jsonframe/repository/IDBRepository";

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
    idbRepo?: () => IDBRepository<T>;
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

// types.d.ts 迁移
/**
 * 候选列表（`InputList`）的绑定选项。传给 `InputListController.add` 的**第一个参数**是
 * 「交互元素」（被注册、被监听 focus/keydown 的那个真实 DOM 节点），本接口描述它的行为。
 *
 * # 交互元素 ≠ 输入元素
 * 多数场景下两者是同一个元素（`InputListController` 省略 `inputListBindElement` 即按 `add`
 * 的第一个参数处理）；但也允许**分开指定**——此时交互元素只负责「什么时候弹列表」，
 * 文本的读写、选区维护、补全替换全部发生在 `inputListBindElement` 上。
 * `DropdownMenuInput.vue` 就靠这种方式把「显示成按钮的下拉菜单」复用了普通候选列表的逻辑。
 */
export interface InputListOption {
  /** 真正承载输入的元素；缺省时复用 `add` 的第一个参数（交互元素） */
  inputListBindElement?: InputListBindElement;
  /** 列表定位的锚点（以此元素的矩形计算位置与宽度）；缺省时用 `inputListBindElement` */
  anchorElement?: HTMLElement;
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

/** 带候选列表的文本输入：props 同时充当 `InputListOption`，直接交给 `InputListController` */
export interface DropdownTextInputProps extends InputProps<string>, InputListOption {}
