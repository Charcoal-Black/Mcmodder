import { GM_registerMenuCommand } from "$";
import { McmodderValues } from "../Values";

export class MemuCommandLoader {
  static run() {
    GM_registerMenuCommand("打开设置", McmodderValues.menuCommands.settings);
    GM_registerMenuCommand("结构编辑器[测试版]", McmodderValues.menuCommands.structureEditor);
    GM_registerMenuCommand("JSON导入辅助", McmodderValues.menuCommands.jsonHelper);
    GM_registerMenuCommand("被封IP时点我！！", McmodderValues.menuCommands.exportLogs);
  }
}