import { Utils } from "../Utils";
import { Values } from "../Values";

/**
 * 表格静态工具类：可编辑表格（`GenericTable.vue` / `McmodderEditableTable`）的公共常量与
 * 纯函数都收在这里。
 *
 * # 与旧版的区别
 * 本类是从旧版「Table 类」迁移后保留的静态工具部分，与 `McmodderEditableTable` 一起作为
 * `GenericTable.vue` 的底层支撑，不再自行持有任何表格实例状态。
 *
 * # 展示列 vs 逻辑列
 * 表格的「展示列」是 `columnOptions` 里的键，它与数据对象 `T` 的字段（逻辑列）通常同名，
 * 但并非一一对应：一行展示的内容由 `columnOptions[key].displayRule` 决定，一个展示列可以
 * 综合、加工多个数据字段后渲染。正因如此，**只有能与某个数据字段直接对应的列才可双击编辑**
 * （见 `GenericTable.vue` 的 `onDblclick`）——下有多个预置的 `DISPLAYRULE_*` 展示规则，
 * 它们返回的是纯 HTML 字符串，只用于展示，无法反解回数据。
 */
export class TableUtils {
  /** 虚拟滚动在可视行数之外多渲染的冗余行数（当前被 `calculateRenderableRows` 用作额外缓冲） */
  static readonly ROW_EXPAND = 2;
  /** 行高默认值（px）。实际行高由虚拟滚动在渲染后测得并更新到 `GenericTable.rowHeight` */
  static readonly ROW_HEIGHT_DEFAULT = 48;

  // 预置展示规则：每个都是一个 TableDisplayRule（unit, row) => HTML/文本/null），
  // 输入为列的原始值、输出为可直接 `v-html` 的字符串；输入为空时返回 null 表示「无可展示」。

  /** 千分位格式化数字 */
  static readonly DISPLAYRULE_NUMBER = (data: string | number) =>
    data ? Number(data).toLocaleString() : null;
  /** 数组元素以「, 」连接成一行文本 */
  static readonly DISPLAYRULE_ARRAY = (data: (string | number)[]) => data.join(", ");
  /** 等宽字体包裹文本（`mcmodder-monospace`） */
  static readonly DISPLAYRULE_MONOSPACE = (data: string) =>
    data ? `<span class="mcmodder-monospace">${data}</span>` : null;
  /** 毫秒时间戳 → 英文日期（`toLocaleDateString`） */
  static readonly DISPLAYRULE_DATE_MILLISEC_EN = (data: string | number) =>
    new Date(data).toLocaleDateString();
  /** 毫秒时间戳 → 中文日期（`Utils.getFormattedChineseDate`） */
  static readonly DISPLAYRULE_DATE_MILLISEC_ZH = (data: string | number) =>
    Utils.getFormattedChineseDate(new Date(Number(data)));
  /** 毫秒时间戳 → 完整本地时间（日期+时分秒） */
  static readonly DISPLAYRULE_TIME_MILLISEC = (data: string | number) =>
    new Date(data).toLocaleString();
  /** 秒时间戳 → 英文日期（先 ×1000 转毫秒） */
  static readonly DISPLAYRULE_DATE_SEC_EN = (data: string | number) =>
    TableUtils.DISPLAYRULE_DATE_MILLISEC_EN(Number(data) * 1e3);
  /** 秒时间戳 → 中文日期（先 ×1000 转毫秒） */
  static readonly DISPLAYRULE_DATE_SEC_ZH = (data: string | number) =>
    TableUtils.DISPLAYRULE_DATE_MILLISEC_ZH(Number(data) * 1e3);
  /** 物品 id → 指向物品页的外链 */
  static readonly DISPLAYRULE_LINK_ITEM = (data: number) =>
    `<a target="_blank" href="${Utils.getItemURL(data)}">${data}</a>`;
  /** 物品 id 数组 → 多个物品外链逗号连接 */
  static readonly DISPLAYRULE_LINK_ITEM_ARRAY = (data: number[]) =>
    data.map(TableUtils.DISPLAYRULE_LINK_ITEM).join(", ");
  /** 资料（模组）id → 指向资料页的外链 */
  static readonly DISPLAYRULE_LINK_CLASS = (data: number) =>
    `<a target="_blank" href="${Utils.getClassURL(data)}">${data}</a>`;
  /** 资料 id 数组 → 多个资料外链逗号连接 */
  static readonly DISPLAYRULE_LINK_CLASS_ARRAY = (data: number[]) =>
    data.map(TableUtils.DISPLAYRULE_LINK_CLASS).join(", ");
  /** 个人中心 id → 指向个人中心页的外链 */
  static readonly DISPLAYRULE_LINK_CENTER = (data: number) =>
    `<a target="_blank" href="${Utils.getCenterURL(data)}">${data}</a>`;
  /** 个人中心 id 数组 → 多个个人中心外链逗号连接 */
  static readonly DISPLAYRULE_LINK_CENTER_ARRAY = (data: number[]) =>
    data.map(TableUtils.DISPLAYRULE_LINK_CENTER).join(", ");
  /** Base64 图片 → `<img>` 标签（加载失败时回退到百科默认的「空物品」32px 图标） */
  static readonly DISPLAYRULE_IMAGE_BASE64 = (data: string) =>
    data
      ? `<img src="${Utils.appendBase64ImgPrefix(data)}" onerror="this.src='${Values.assets.mcmod.emptyItemIcon32x}'; this.onerror=null;">`
      : null;
  /** 字节数 → 人类可读的体积文本（`Utils.getFormattedSize`） */
  static readonly DISPLAYRULE_SIZE = (data: string | number) =>
    Utils.getFormattedSize(Number(data));
  /** `"id,名称"` 字符串 → 带名称的个人中心外链（展示列综合了 id + 名称两个来源） */
  static readonly DISPLAYRULE_LINK_CENTER_WITH_NAME = (data: string) => {
    const row = data.split(",");
    return `<a target="_blank" href="${Utils.getCenterURL(Number(row[0]))}">${row[1]}`;
  };
  /** 长文本悬停展示全文：超 10 字符截断加「..」，悬停 tooltip 里放原文（换行转 `<br>`） */
  static readonly DISPLAYRULE_HOVER = (data: string) => {
    const omittedText = data.length > 10 ? `${data.slice(0, 10)}..` : data;
    return `<a data-toggle="tooltip" data-html="true" data-original-title="${data.replaceAll('"', '\\"').replaceAll(/\n+/g, "<br>")}">${omittedText}</a>`;
  };

  /**
   * 把单列的 `ColumnOptionInitializer` 归一化为 `ColumnOption`。
   *
   * 初始化器有两种简写形态：
   * - 字符串 —— 只给表头名，不配展示规则（`name`）；
   * - 二元数组 `[表头名, 展示规则]` —— 依次映射到 `name` / `displayRule`。
   *
   * @param config 列初始化器。
   * @returns 含 `name`（及可选 `displayRule`）的列配置。
   */
  static parseColumnOptionsInitializer<T>(config: ColumnOptionInitializer<T>): ColumnOption<T> {
    if (typeof config === "string")
      return {
        name: config,
      };
    return {
      name: config[0],
      displayRule: config[1],
    };
  }
}
