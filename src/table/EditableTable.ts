import { Utils } from "../Utils";
import { TableUtils } from "./Table";
import { ConfigUtils, InputType } from "../config/ConfigUtils";

/**
 * 可编辑表格的静态工具类：从旧版「EditableTable 类」迁移后保留的静态部分。
 *
 * # 与 `TableUtils` 的分工
 * - `TableUtils`：通用渲染常量与列配置解析；
 * - `McmodderEditableTable`：可编辑相关常量（CSS 类名、快捷键）+ 编辑配置解析。
 *
 * 实例运行时的全部状态（数据、选择、历史栈、编辑中的单元格）都由 `GenericTable.vue` 自己持有。
 */
export class McmodderEditableTable extends TableUtils {
  /** 行未保存（存在未提交编辑）时打在 `<tr>` 上的样式类 */
  static readonly CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  /** 单元格未保存时打在 `<td>` 上的样式类 */
  static readonly CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  /** 行悬停时打在 `<tr>` 上的样式类 */
  static readonly CLASSNAME_POINTEROVER_TR = "mcmodder-table-pointerover-tr";
  /** 单元格悬停时打在 `<td>` 上的样式类 */
  static readonly CLASSNAME_POINTEROVER_TD = "mcmodder-table-pointerover-td";

  /** 撤销快捷键（Ctrl/Cmd+Z），供 `GenericTable` 全局监听 */
  static readonly undoKey = Utils.getXplatCtrlCombinationKey("Z");
  /** 重做快捷键（Ctrl/Cmd+Y） */
  static readonly redoKey = Utils.getXplatCtrlCombinationKey("Y");
  /** 重做快捷键二（Ctrl/Cmd+Shift+Z） */
  static readonly redoKey2 = Utils.getXplatCtrlCombinationKey({
    shiftKey: true,
    keyCode: 90,
  });
  /** 保存快捷键（Ctrl/Cmd+S） */
  static readonly saveKey = Utils.getXplatCtrlCombinationKey("S");
  /** 全选快捷键（Ctrl/Cmd+A） */
  static readonly selectAllKey = Utils.getXplatCtrlCombinationKey("A");
  /** 复制快捷键（Ctrl/Cmd+C） */
  static readonly copyKey = Utils.getXplatCtrlCombinationKey("C");
  /** 粘贴快捷键（Ctrl/Cmd+V，当前仅声明未在组件中直接使用） */
  static readonly pasteKey = Utils.getXplatCtrlCombinationKey("V");

  /**
   * 把单个字段的 `EditOptionInitializer` 归一化为 `TableInputOption`（补齐 type/value 等默认值）。
   *
   * 各初始化形态的处理：
   * - `null`/`undefined` —— 视为「只读」列（`readonly: true`）；
   * - 数字（`InputType`）—— 直接作为输入类型，默认值取 `ConfigUtils.defaultValue` 中该类型的默认值；
   * - 其余对象 —— 深拷贝原样返回，再补漏：只读时类型按 TEXT、value 取 TEXT 默认值；
   *   value 缺失时按输入类型补默认值。
   *
   * @param config 编辑配置初始化器。
   * @returns 经过归一化、可读的 `TableInputOption`。
   */
  static parseEditConfigInitializer(config: EditOptionInitializer): TableInputOption {
    let result;
    if (config === undefined || config === null) {
      config = {
        readonly: true,
      };
    }
    if (typeof config === "number") {
      result = {
        type: config,
        value: ConfigUtils.defaultValue[config as InputType],
      };
    } else {
      // 已经忘了这一块是什么逻辑了，能跑就行，而且确实能跑（
      // eslint-disable-next-line
      result = Utils.simpleDeepCopy(config) as any;
      if (result.readonly) {
        if (result) result.type = InputType.TEXT;
        result.value = ConfigUtils.defaultValue[InputType.TEXT];
      }
      if (result.value === undefined) {
        result.value = ConfigUtils.defaultValue[result.type as InputType];
      }
    }
    return result;
  }
}
