/**
 * 对象/数组 ↔ 映射表之间的纯函数工具。
 *
 * 这些函数原先藏在 `Values` 的私有方法里，但 `e2e/support/data` 构建模拟后端索引时
 * 也需要同一套规则；复制一份实现会让「反转映射」在两边悄悄分叉，所以提取成独立模块。
 *
 * 这里只做纯数据变换，不读取 `window` / 油猴 API，因此 Node 侧与浏览器侧都能直接使用。
 */

/**
 * 反转「键 → 值」映射：`{ a: "1", b: "2" }` → `{ "1": "a", "2": "b" }`。
 *
 * 值必须唯一，否则后写入的键会覆盖先写入的键 —— 这与站点数据里「反向查找」的假设一致
 * （例如加载器 ID、版本 ID 都是唯一分配的）。
 */
export function reverseMap<T extends Readonly<Record<PropertyKey, PropertyKey>>>(
  obj: T,
): Readonly<ReverseMap<T>> {
  const reversed: Record<PropertyKey, PropertyKey> = {};
  (Object.entries(obj) as [PropertyKey, PropertyKey][]).forEach(([a, b]) => {
    reversed[b] = a;
  });
  return reversed as Readonly<ReverseMap<T>>;
}

/**
 * 把「记录数组」按键字段建成「键 → 记录」映射。
 *
 * 后一项同键时会覆盖前一项，因此调用方应保证键唯一（种子数据的唯一性由
 * `e2e/support/data/validate.ts` 负责校验）。
 */
export function arrayToMap<
  T extends ReadonlyArray<Record<PropertyKey, unknown>>,
  K extends keyof ElementOf<T>,
>(arr: T, key: K): ArrayToMap<T, K> {
  return arr.reduce(
    (acc, item) => {
      acc[item[key] as PropertyKey] = item;
      return acc;
    },
    {} as Record<PropertyKey, Record<PropertyKey, unknown>>,
  ) as ArrayToMap<T, K>;
}

/**
 * 返回删除了指定键的新对象（不修改入参），与 {@link pickKey} 相对。
 *
 * 原实现直接 `delete obj[key]`，只有调用方先自行展开时才安全；提取成公共工具后
 * 改为不可变实现，避免某个调用点忘了复制而把常量表改坏。
 */
export function omitKey<T extends object, K extends Arrayable<keyof T>>(
  obj: T,
  key: K,
): Omit<T, K extends (keyof T)[] ? ElementOf<K> : K> {
  const result = { ...obj };
  const keys = (!Array.isArray(key) ? [key] : key) as (keyof T)[];
  keys.forEach((key) => delete result[key]);
  return result as Omit<T, K extends (keyof T)[] ? ElementOf<K> : K>;
}

/**
 * 返回只保留指定键的新对象（不修改入参），与 {@link omitKey} 相对。
 *
 * 指定键在入参上不存在时会被忽略（值为 `undefined` 的键仍会保留），
 * 因此不会把缺失的键凭空补成 `undefined`。
 */
export function pickKey<T extends object, K extends Arrayable<keyof T>>(
  obj: T,
  key: K,
): Pick<T, K extends (keyof T)[] ? ElementOf<K> : K> {
  const result: Partial<T> = {};
  const keys = (!Array.isArray(key) ? [key] : key) as (keyof T)[];
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result as Pick<T, K extends (keyof T)[] ? ElementOf<K> : K>;
}
