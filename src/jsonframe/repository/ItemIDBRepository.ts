import { type EntityTable } from "dexie";
import { IDBRepository } from "./IDBRepository";
import { Utils } from "../../Utils";
import type { ItemRepository } from "./ItemRepository";

export class ItemIDBRepository extends IDBRepository<Item> implements ItemRepository<number> {
  private static readonly tableName = "mcmodderJsonStorage";
  private static readonly indexedKeys = /* ["id", "registerName", "metadata", "name",
    "englishName", "creativeTabName", "branch", "OredictList"] */ [];

  private static readonly iconTableName = "mcmodderIconStorage";

  protected iconTable?: EntityTable<IndexedType<ItemIcon>, "_primaryKey", ItemIcon>;

  constructor() {
    super(ItemIDBRepository.tableName, ItemIDBRepository.indexedKeys);
  }

  protected override getSchema() {
    return {
      [ItemIDBRepository.iconTableName]: "++_primaryKey, itemPrimaryKey",
      ...super.getSchema()
    }
  }

  override async init() {
    super.init();
    this.iconTable = this.db.table(ItemIDBRepository.iconTableName);
  }

  override async write(filename: string, data: Item[]) {
    await this.db.transaction("rw", this.table!, this.iconTable!, async () => {
      const items = await this.table!.where("_filename").equals(filename).toArray();
      const itemPrimaryKeys = items.map(item => item._primaryKey);
      await this.iconTable!.where("itemPrimaryKey").anyOf(itemPrimaryKeys).delete();

      await super.write(filename, data);
      const written = await super.read(filename);
      const length = written.length;
      const icons = new Array<ItemIcon>(length);
      written.forEach((item, index) => {
        icons[index] = {
          itemPrimaryKey: item._primaryKey,
          smallIcon: item.smallIcon ? Utils.base642Blob(item.smallIcon, "image/png") : undefined,
          largeIcon: item.largeIcon ? Utils.base642Blob(item.largeIcon, "image/png") : undefined
        }
        delete item.smallIcon;
        delete item.largeIcon;
      });
      await this.iconTable!.bulkAdd(icons);
      await this.table!.bulkPut(written);
    });
  }

  override async read(filename: string) {
    const { items, icons } = await this.db.transaction("r", this.table!, this.iconTable!, async () => {
      const items = await super.read(filename);
      const icons = await this.getItemIconsByItems(items);
      return { items, icons };
    });
    return await this.combineItemAndIcons(items, icons);
  }

  async readSearchText(filename: string) {
    return await super.read(filename);
  }

  async readByPrimaryKeys(itemPrimaryKeys: number[]) {
    const { items, icons } = await this.getItemIconsByPrimaryKeys(itemPrimaryKeys);
    return await this.combineItemAndIcons(items, icons);
  }

  async getItemIconsByPrimaryKeys(itemPrimaryKeys: number[]) {
    const rawItems = await this.table!.bulkGet(itemPrimaryKeys);
    const rawKeys = [...itemPrimaryKeys] as (number | null)[];
    rawItems.forEach((item, index) => {
      if (item === undefined) {
        rawKeys[index] = null;
      }
    });
    const items = rawItems.filter(item => item !== undefined);
    const keys = rawKeys.filter(key => key !== null);
    const icons = await this.readIcons(keys);
    return { items, icons };
  }

  async readByItems<T extends IndexedType<Item>[]>(items: T) {
    const icons = await this.getItemIconsByItems(items);
    return await this.combineItemAndIcons(items, icons);
  }

  async getItemIconsByItems<T extends IndexedType<Item>[]>(items: T) {
    const keys = items.map(item => item._primaryKey);
    return await this.readIcons(keys);
  }
  
  private async readIcons(itemPrimaryKeys: number[]) {
    return await this.iconTable!.where("itemPrimaryKey").anyOf(itemPrimaryKeys).toArray();
  }

  private unwrapSettled<T>(results: PromiseSettledResult<PromiseSettledResult<T>[]>) {
    if (!("value" in results)) return undefined;
    return results.value.map(result => "value" in result ? result.value : undefined);
  }

  private async combineItemAndIcons<T extends IndexedType<Item>[]>(items: T, icons: IndexedType<ItemIcon>[]) {
    const iconMap = new Map<number, ItemIcon>();
    icons.forEach(icon => {
      iconMap.set(icon.itemPrimaryKey, icon);
    });
    const alignedIcons = items.map(item => iconMap.get(item._primaryKey));
    const [smallIcons, largeIcons] = await Promise.allSettled([
      Promise.allSettled(alignedIcons.map(icon => icon?.smallIcon ? Utils.blob2Base64(icon.smallIcon) : undefined)),
      Promise.allSettled(alignedIcons.map(icon => icon?.largeIcon ? Utils.blob2Base64(icon.largeIcon) : undefined))
    ]);
    const unwrapSmallIcons = this.unwrapSettled(smallIcons);
    const unwrapLargeIcons = this.unwrapSettled(largeIcons);
    const length = items.length;
    for (let i = 0; i < length; i++) {
      const item = items[i];
      item.smallIcon ??= unwrapSmallIcons?.[i];
      item.largeIcon ??= unwrapLargeIcons?.[i];
    }
    return items;
  }
}