import type { RepositoryData } from "../types";

/** 3×3 工作台的九个槽位 */
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** 按槽位号生成一张记录表；GUI 的字段都是「槽位 → 值」，用工厂写比手抄九遍清楚 */
function grid<T>(value: (slot: number) => T): Record<number, T> {
  return Object.fromEntries(SLOTS.map((slot) => [slot, value(slot)]));
}

const baseGUI = {
  inX: {},
  inY: {},
  outX: {},
  outY: {},
  fuelX: {},
  fuelY: {},
  inNSet: {},
  outNSet: {},
  fuelNSet: {},
  inCSet: {},
  outCSet: {},
  inUnit: {},
  outUnit: {},
  fuelUnit: {},
  inUse128x: {},
  outUse128x: {},
  fuelUse128x: {},
  fuelID: {},
  power: {},
  notice: "",
  orderly_lock: 0,
} as const satisfies Partial<ValueOf<RepositoryData["guis"]>>;

/**
 * 合成表 GUI。
 *
 * 字段参照后台 **POST** `/action/doModGUI/` 的载荷（见 `admin/verify/tab/schema.ts`），
 * 这里给一个标准 3×3 工作台，槽位坐标按 36px 栅格排布。
 */
export const guis = {
  1: {
    ...baseGUI,
    guiID: 1,
    width: 320,
    height: 160,
    name: "工作台",
    classID: 1,
    itemID: 52,
    notice: `“扩展信息-摆放要求”默认是“有序合成”，若该合成表在 JEI/REI/NEI 界面有交叉箭头标志，则需设为“无序合成”，不正确设置摆放要求很可能不予通过。
材料需求数量填入“-1”为不消耗。`,
    inX: grid((slot) => 46 + ((slot - 1) % 3) * 36),
    inY: grid((slot) => 34 + Math.floor((slot - 1) / 3) * 36),
    outX: { 1: 234 },
    outY: { 1: 70 },
    inNSet: grid(() => true),
    outNSet: { 1: true },
    inCSet: grid(() => false),
    outCSet: { 1: false },
    inUse128x: grid(() => false),
    outUse128x: { 1: false },
  },
  2: {
    ...baseGUI,
    guiID: 2,
    width: 320,
    height: 180,
    name: "熔炉",
    classID: 1,
    itemID: 54,
    notice: "若时间为200刻（10秒）可不填耗时信息",
    inX: { 1: 96 },
    inY: { 1: 46 },
    outX: { 1: 215 },
    outY: { 1: 82 },
    fuelX: { 1: 96 },
    fuelY: { 1: 118 },
    inNSet: { 1: true },
    outNSet: { 1: true },
    inCSet: { 1: false },
    outCSet: { 1: false },
    inUse128x: { 1: false },
    outUse128x: { 1: false },
    fuelID: { 1: 957 },
    power: {
      1: "获得经验: %s 点",
      2: "耗时: %s 秒",
    },
  },
} satisfies RepositoryData["guis"];
