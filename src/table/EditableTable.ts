import { Utils } from "../Utils";
import { TableUtils } from "./Table";
import { ConfigUtils, InputType } from "../config/ConfigUtils";

export class McmodderEditableTable extends TableUtils {

  static readonly CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  static readonly CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  static readonly CLASSNAME_POINTEROVER_TR = "mcmodder-table-pointerover-tr";
  static readonly CLASSNAME_POINTEROVER_TD = "mcmodder-table-pointerover-td";

  static readonly undoKey = Utils.getXplatCtrlCombinationKey('Z');
  static readonly redoKey = Utils.getXplatCtrlCombinationKey('Y');
  static readonly redoKey2 = Utils.getXplatCtrlCombinationKey({ shiftKey: true, keyCode: 90 });
  static readonly saveKey = Utils.getXplatCtrlCombinationKey('S');
  static readonly selectAllKey = Utils.getXplatCtrlCombinationKey('A');
  static readonly copyKey = Utils.getXplatCtrlCombinationKey('C');
  static readonly pasteKey = Utils.getXplatCtrlCombinationKey('V');

  static parseEditConfigInitializer(config: EditOptionInitializer): TableInputOption {
    let result;
    if (config === undefined || config === null) {
      config = {
        readonly: true
      };
    }
    if (typeof config === "number") {
      result = {
        type: config,
        value: ConfigUtils.defaultValue[config as InputType]
      }
    }
    else {
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