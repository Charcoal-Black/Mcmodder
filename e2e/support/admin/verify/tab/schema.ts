/**
 * 合成表类编辑的审核数据类型与字段重组。
 */
import type { Values } from "../../../../../src/Values";
import { type BaseEdition } from "../schema";

export type TabEdition = BaseEdition<McmodTabEditorData["item-table-data"], "4">;

/**
 * 模拟合成表 GUI 在后端的存储逻辑。这里我们选择直接参考后台管理中
 * **POST** `/action/doModGUI/` 的请求载荷来设计接口（只是参考，不是完全一致）。
 *
 * > 格子用途介绍：
 * > - **材料格**（`in`）：普通的输入格，允许放入任何物品/方块或矿物词典；
 * > - **成品格**（`out`）：普通的输出格；
 * > - **燃料格**（`fuel`）：固定的输入格，始终显示指定的物品/方块，且不会参与材料统计；
 * > - **能量格**（`power`）：自定义字符格，允许放入非物品/方块的数据信息。
 *
 * ## 字段解释
 * - `X`, `Y`: 格子**左上角**的坐标；
 * - `NSet`: 是否允许设置数量；
 * - `CSet`: 是否允许设置概率；
 * - `Unit`: 单位，例如流体格的常用单位 `mB`；
 * - `Use128x`: 是否使用大图标展示（默认使用小图标）。通常用于生物的展示，
 * 因为生物的小图标通常是头像缩略图，大图标才是完整三维正交渲染图。
 * 只影响图标造型，格子的尺寸永远是 32x32，即使是 BUFF/DEBUFF 也是如此。
 *
 * ## 注意
 * 1. 材料格和成品格均需要至少存在 1 个（据说最多可存在 100 个，二者分别计数，未测试）；
 * 2. 格子坐标如果为 (0, 0) 则不会被添加，但是依然会占位。基于这一特性可以绕过第 1 条限制，
 * 创建无输入格、无输出格的 GUI。
 * 3. 能量格文本中必须有且仅有一个 `%s` 子串。在合成表编辑页使用此 GUI 时，`%s` 会被
 * 替换成文本输入框，供用户输入内容。如果输入的内容为纯数值，那么展示时自动加上千位分隔符；
 * 4. 试图删除已被使用的 GUI 的某个格时，该格的索引编号会被保留，原来摆放在此格的物品数据
 * 也不会被同步删除，方便以后重新加回来；
 * 5. 一个 GUI 可以不绑定任何模组（{@link GUI.classID} 非正整数），此时会被视为属于所有模组，
 * 可以在后台的原版（classID=1）分类中看到这类 GUI。但是必须要绑定一个物品资料。
 */
export interface GUI {
  /**
   * GUI 图片 URL = `//i.mcmod.cn/gui/bg/${guiID}.gif`，体积不大于 1,400,000 B
   * （`gen_gui_base64` 硬编码限制）。
   */
  guiID: number;
  /** GUI 图像宽度，必须在 320 ~ 520 之间 */
  width: number;
  /** GUI 图像高度，必须在 160 ~ 600 之间 */
  height: number;
  /** GUI 名称 */
  name: string;
  /** 绑定模组 ID */
  classID: number;
  /** 绑定资料 ID */
  itemID: number;
  /** 编辑注意事项，即在编辑时给用户的提示 */
  notice: string;
  /**
   * **锁定摆放要求**，设置此 GUI 中的合成表是否始终为有序或无序。
   * - `0`: 不锁定；
   * - `1`: 锁定为有序；
   * - `2`: 锁定为无序。
   */
  orderly_lock: 0 | 1 | 2;
  inX: Record<number, number>;
  outX: Record<number, number>;
  fuelX: Record<number, number>;
  inY: Record<number, number>;
  outY: Record<number, number>;
  fuelY: Record<number, number>;
  inNSet: Record<number, boolean>;
  outNSet: Record<number, boolean>;
  fuelNSet: Record<number, boolean>;
  inCSet: Record<number, boolean>;
  outCSet: Record<number, boolean>;
  inUnit: Record<number, string>;
  outUnit: Record<number, string>;
  fuelUnit: Record<number, string>;
  inUse128x: Record<number, boolean>;
  outUse128x: Record<number, boolean>;
  fuelUse128x: Record<number, boolean>;
  fuelID: Record<number, number>;
  power: Record<number, string>;
}

export interface GUISlot {
  x: ValueOf<GUI["inX"] & GUI["outX"] & GUI["fuelX"]>;
  y: ValueOf<GUI["inY"] & GUI["outY"] & GUI["fuelY"]>;
  n: ValueOf<GUI["inNSet"] & GUI["outNSet"] & GUI["fuelNSet"]>;
  c: ValueOf<GUI["inCSet"] & GUI["outCSet"]>;
  unit: ValueOf<GUI["inUnit"] & GUI["outUnit"] & GUI["fuelUnit"]>;
  size: number;
  /** 该槽位的原始 ID 字符串 */
  id: string;
  /** {@link id} 表示的是否是一个矿词/标签，而不是百科内资料数字 ID */
  isTag: boolean;
  /** 若 {@link isTag}，返回矿词/标签是否解析成功，否则返回 `false` */
  matched: boolean;
  /** 若 {@link matched}，返回解析结果，重复并截断为前 5 项。否则返回 `[]` */
  parsed: number[];
  count: number;
}

export const TabVerifyFieldGroups = {
  gui: ["visualization", "source"],
  "slot-in-item": ["visualization", "source"],
  "slot-in-number": ["visualization", "source"],
  "slot-in-chance": ["visualization", "source"], // 概率不会直接体现在可视化中，尚未测试，目前先全部放在一起
  "slot-out-item": ["visualization", "source"],
  "slot-out-number": ["visualization", "source"],
  "slot-out-chance": ["visualization", "source"], // 同上
  "slot-fuel-number": ["visualization", "source"],
} as const satisfies Partial<
  Record<keyof McmodTabEditorInnerData, Arrayable<keyof typeof Values.tabEditVerifyTableFields>>
>;

/** 指定总是显示的行，无论这些行下的字段是否发生了更改。 */
export const TabVerifyAlwaysShowFieldGroups = [
  "visualization",
  "source",
] as (keyof typeof Values.tabEditVerifyTableFields)[];
