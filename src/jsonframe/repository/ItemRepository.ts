import type { AppRepository } from "./AppRepository";

export interface ItemRepository<
  K extends number | string | symbol = number,
> extends AppRepository<Item> {
  readSearchText(filename: string): Promise<IndexedType<Item, K>[]>;
  readByPrimaryKeys(itemPrimaryKeys: K[]): Promise<Item[]>;
  readByItems(items: Item[]): Promise<Item[]>;
}
