/**
 * 合成表编辑数据（`tab_add` / `tab_edit` / `tab_delete`）的快速查错规则。
 *
 * 规则移植自百科原生编辑页的校验脚本，但**不再读取 DOM**：
 * 所有检查都基于已解析好的 {@link McmodClassEditorInnerData}，
 * 因此同样适用于审核待审项的场景（见 `AdminVerifyInit.simpleCheck`）。
 *
 * - 每条检查末尾注释中的 `xxx_yyy` 是原生语言包
 *   （`PublicLangData.editor.inform.list`）里的键名，便于与百科编辑页的提示逐条对照；
 *   提示文案为硬编码中文。
 * - 审核页面无法直接获取 GUI 的配置信息，因此无法在空合成表警告时排除 GUI 本身就没有提供槽位的情形。
 * - 同样也无法直接获知这项编辑是在哪一物品资料下操作的，因此也无法检测出 tab_inout_notmatch
 *   （合成表成品第一格的物品，与当前所在页面绑定的物品不一致。虽然提交后可以正常在填入的物品中显示，
 *     但会造成在历史记录中错误记录了编辑当前绑定的物品，因此不建议这么做）。
 *
 * 提示级别（error / warning / info）与原生实现可能存在少量差异。
 */
export class TabEditRules {
  /**
   * 对一份资料编辑数据执行全部检查。
   *
   * @param data 已解析好的合成表编辑数据
   */
  static check(data: McmodTabEditorInnerData) {
    const result: VerifyCheckResult = {
      error: [],
      warning: [],
      info: [],
    };

    if (Object.values(data["slot-in-item"] ?? {}).every((id) => id.trim().length === 0)) {
      result.warning.push(
        "合成表至少需要选择一项输入材料，不能添加空的合成表。（若 GUI 无原料格则请忽略）",
      );
    }

    if (Object.values(data["slot-out-item"] ?? {}).every((id) => id.trim().length === 0)) {
      result.warning.push(
        "合成表至少需要选择一项输出材料，不能添加空的合成表。（若 GUI 无产物格则请忽略）",
      );
    }

    return result;
  }
}
