/**
 * 资料编辑数据（`item_add` / `item_edit`）的快速查错规则。
 *
 * 规则移植自百科原生编辑页的校验脚本，但**不再读取 DOM**：
 * 所有检查都基于已解析好的 {@link McmodClassEditorInnerData}，
 * 因此同样适用于审核待审项的场景（见 `AdminVerifyInit.simpleCheck`）。
 *
 * - 每条检查末尾注释中的 `xxx_yyy` 是原生语言包
 *   （`PublicLangData.editor.inform.list`）里的键名，便于与百科编辑页的提示逐条对照；
 *   提示文案为硬编码中文。
 * - 正文中的机翻 / 第一人称 / 不确定 / 不规范词库，以及「未修改任何项」的检查尚未移植。
 * -
 *
 * 提示级别（error / warning / info）与原生实现可能存在少量差异。
 */
export class ItemEditRules {
  /**
   * 对一份资料编辑数据执行全部检查。
   *
   * @param data 已解析好的资料编辑数据
   */
  static check(data: McmodItemEditorInnerData) {
    const result: VerifyCheckResult = {
      error: [],
      warning: [],
      info: [],
    };

    if (!data.name) {
      result.error.push("资料缺少“主要名称”，命名规范请参考“编辑帮助”中的《主站通用命名规则》。");
    } // item_name_empty

    if (data.name && data.ename === data.name) {
      result.warning.push(
        "资料“主要名称”与“次要名称”不能相同，具体请参考“编辑帮助”中的《主站通用命名规则》。",
      );
    } // item_name_repeat

    if (!data.category) {
      result.error.push("请选择一项“资料类型”，没有类型的资料不会显示在列表中，只能通过地址访问。");
    } // item_category_empty

    if (!data.type) {
      result.warning.push("请选择一项“资料分类”，没有分类的资料会被挤在资料列表的最前面。");
    } // item_type_empty

    if (data.category?.[0] === "1" && data.type !== "{文本}") {
      if (!(
        data["icon-32x-data"] &&
        !data["icon-32x-data"].endsWith("i.mcmod.cn/item/icon/32x32/0.png") &&
        data["icon-32x-delete"]?.[0] !== "1" &&
        data["icon-128x-data"] &&
        !data["icon-128x-data"].endsWith("i.mcmod.cn/item/icon/128x128/0.png") &&
        data["icon-128x-delete"]?.[0] !== "1"
      )) {
        result.warning.push(
          "除用于综合的主物品/方块外，其余物品/方块必须包含完整的“小图标”与“大图标”，推荐用 IRR 批量导出的方式添加物品。",
        );
      } // item_c1_icon_empty
      else if (
        (!data["icon-32x-data"].startsWith("data:image/gif;base64,") &&
          data["icon-32x-lock"]?.[0] === "1") ||
        (!data["icon-128x-data"].startsWith("data:image/gif;base64,") &&
          data["icon-128x-lock"]?.[0] === "1")
      ) {
        result.warning.push("非动态图标等特殊情况不用勾选锁定。");
      }

      if (!data.regname) {
        result.warning.push("缺少注册名。");
      }

      if (!data.maxstack) {
        result.warning.push("缺少最大堆叠。");
      }

      if (!data.damage) {
        result.info.push("缺少最大耐久。");
      }

      if (!data.oredict) {
        result.info.push("缺少矿物词典/物品标签。");
      }
    }

    return result;
  }
}
