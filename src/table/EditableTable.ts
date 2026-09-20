import { McmodderUtils } from "../Utils";
import { McmodderTable } from "./Table";
import { McmodderConfigUtils, McmodderInputType } from "../config/ConfigUtils";

export class McmodderEditableTable extends McmodderTable {

  static readonly CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  static readonly CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  static readonly CLASSNAME_POINTEROVER_TR = "mcmodder-table-pointerover-tr";
  static readonly CLASSNAME_POINTEROVER_TD = "mcmodder-table-pointerover-td";

  static readonly undoKey = McmodderUtils.getXplatCtrlCombinationKey('Z');
  static readonly redoKey = McmodderUtils.getXplatCtrlCombinationKey('Y');
  static readonly redoKey2 = McmodderUtils.getXplatCtrlCombinationKey({ shiftKey: true, keyCode: 90 });
  static readonly saveKey = McmodderUtils.getXplatCtrlCombinationKey('S');
  static readonly selectAllKey = McmodderUtils.getXplatCtrlCombinationKey('A');
  static readonly copyKey = McmodderUtils.getXplatCtrlCombinationKey('C');
  static readonly pasteKey = McmodderUtils.getXplatCtrlCombinationKey('V');

  static parseEditConfigInitializer(config: EditConfigInitializer): McmodderTableInputData {
    let result;
    if (config === undefined || config === null) {
      config = {
        readonly: true
      };
    }
    if (typeof config === "number") {
      result = {
        type: config,
        value: McmodderConfigUtils.defaultValue[config as McmodderInputType]
      }
    }
    else {
      result = McmodderUtils.simpleDeepCopy(config) as any;
      if (result.readonly) {
        if (result) result.type = McmodderInputType.TEXT;
        result.value = McmodderConfigUtils.defaultValue[McmodderInputType.TEXT];
      }
      if (result.value === undefined) {
        result.value = McmodderConfigUtils.defaultValue[result.type as McmodderInputType];
      }
    }
    return result;
  }
}