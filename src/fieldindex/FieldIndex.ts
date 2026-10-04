/**
 * 手写的倒排索引：以对象某个字段的值为键，把对象列表分组存进 `Map<K, T[]>`。
 *
 * # 实现思路
 * - 构造时指定 `key`（要索引的字段名，如 `Item` 的 `id`），以及可选的 `keyHandler`
 *   （把字段原始值转换为实际索引键 `K`，如统一转小写/拼音）。
 * - `add` 把一批对象逐个压入 map；每个对象**可挂在多个键下**：若 handler 返回数组，
 *   则该对象会分别归到数组中的每一个键。
 * - `get(key)` 直接查 map，返回该键下的对象数组（同一键下按插入顺序）。
 *
 * # 使用约定
 * - 一个对象可能同时出现在多个键的列表里（多值索引）；同一键下允许重复对象吗？——
 *   允许：`pushSingle` 只追加、不去重，调用方需自行保证键值唯一性。
 * - 类型参量：`T` 为被索引对象，`P` 为用于索引的字段名，`K` 默认为该字段值类型
 *   （可经 handler 转换成另一类型，如 `string` → `string[]` 多键，或数字 → 字符串）。
 */
export class FieldIndex<T extends object, P extends keyof T, K = T[P]> {
  /** 底层倒排表：索引键 → 匹配对象数组（未命中时 Map 中不存在该键） */
  private readonly map = new Map<K, T[]>();
  /** 被索引的字段名 */
  private readonly key: P;
  /** 字段值 → 索引键（单键）或索引键数组（多键）的转换器；缺省时直接用字段原始值做单键 */
  private readonly keyHandler?: MapKeyHandler<T[P], K>;

  /**
   * @param key 用于索引的字段名（`T` 的键）。
   * @param keyHandler 可选的键转换器；返回数组表示把一个对象分流到多个键下。
   */
  constructor(key: P, keyHandler?: MapKeyHandler<T[P], K>) {
    this.key = key;
    this.keyHandler = keyHandler;
  }

  /** 批量索引一列对象（逐个 `push`，不重建索引）。@param list 要加入索引的对象列表 */
  add(list: T[]) {
    list.forEach((data) => {
      this.push(data);
    });
  }

  /**
   * 索引单个对象：取其 `key` 字段值，经 handler 得到（单个或数组形式的）索引键后归入对应列表。
   * handler 返回数组时对象会在每个键下各存一份。
   */
  private push(data: T) {
    const mapKey = data[this.key];
    const handledKey = this.keyHandler?.(mapKey) ?? mapKey;
    if (handledKey instanceof Array) {
      (handledKey as K[]).forEach((key) => {
        this.pushSingle(key, data);
      });
    } else {
      this.pushSingle(handledKey as K, data);
    }
  }

  /**
   * 把对象追加到某个索引键的列表尾部；键首次出现时先新建空列表。
   * 只追加不去重。
   */
  private pushSingle(key: K, data: T) {
    let res = this.map.get(key);
    if (res === undefined) {
      res = [];
      this.map.set(key, res);
    }
    res.push(data);
    return data;
  }

  /**
   * 按索引键查询全部匹配对象。
   *
   * @param mapKey 索引键（经过 handler 转换后的值）。
   * @returns 该键下的对象数组；未命中时返回 undefined。
   */
  get(mapKey: K) {
    return this.map.get(mapKey);
  }

  /**
   * 按索引键查询首个匹配对象的某个字段值，未命中则返回默认值。
   *
   * @param mapKey 索引键。
   * @param targetKey 期望取出的字段名。
   * @param defaultValue 未命中时返回的回退值。
   */
  getKeyOrDefault<K2 extends keyof T>(mapKey: K, targetKey: K2, defaultValue: T[K2]) {
    const result = this.get(mapKey);
    if (result !== undefined) return result[0][targetKey];
    return defaultValue;
  }

  /** 清空全部索引 */
  clear() {
    this.map.clear();
  }
}
