import type { AppRepository } from "./AppRepository";

/**
 * 物品仓储接口：在 `AppRepository` 文件级读写之上，额外支持「按主键/按条目」检索。
 *
 * # 泛型 `K`
 * 表示单条物品的「主键」类型，由底层实现决定：
 * - GM Storage 形态用字符串主键 `filename/index`（见 `ItemGMStorageRepository`，`K = string`）；
 * - IndexedDB 形态用自增数字主键 `_primaryKey`（见 `ItemIDBRepository`，`K = number`）。
 */
export interface ItemRepository<
  K extends number | string | symbol = number,
> extends AppRepository<Item> {
  /** 读取指定文件中全部条目的「检索面」：以 `IndexedType<Item, K>` 形式返回，携带主键供后续定位 */
  readSearchText(filename: string): Promise<IndexedType<Item, K>[]>;
  /** 按主键批量读取条目；主键不存在时对应位置返回 undefined */
  readByPrimaryKeys(itemPrimaryKeys: K[]): Promise<Item[]>;
  /** 按条目对象读取（GM 形态直接原样返回；IDB 形态据 `_primaryKey` 补回图标），返回与入参对齐的结果 */
  readByItems(items: Item[]): Promise<Item[]>;
}
