import { type EntityTable } from "dexie";
import { IDBRepository } from "./IDBRepository";
import { Utils } from "../../Utils";
import type { ItemRepository } from "./ItemRepository";

/**
 * `ItemRepository` 的 IndexedDB 形态。
 *
 * # 痛点与拆表设计
 * 物品数据最重的部分是 `smallIcon`/`largeIcon`（Base64 图标），而检索、编辑列表等场景
 * 往往只需要文字字段。IndexedDB 又无法只读取某几列、必须整行取回，图标混在主表会让每次
 * 查询都拖回大量无用字节。因此把图标**拆到独立的 `mcmodderIconStorage` 表**：
 *
 * - 主表 `mcmodderJsonStorage`：存物品的文字字段（不含图标）；
 * - 图标表 `mcmodderIconStorage`：以自增主键为行 id，`itemPrimaryKey` 指向主表行，
 *   图标以 Blob 形式保存；
 * - 主表行与图标行之间通过主表行的 `_primaryKey` 一一对应（写入时用同一索引生成）。
 *
 * # 写入路径（write）
 * 在同一 Dexie 事务里：删除该文件旧的图标行 → 覆写主表数据 → 把每个条目的图标转 Blob
 * 写入图标表（并从主表数据里 `delete` 掉 Base64 字段）→ 主表再落盘。
 *
 * # 读取路径（read / readByPrimaryKeys / readByItems）
 * 分别「按文件 / 按主键 / 按已带主键的条目」取主表行，再批量取对应图标，最后把 Base64
 * 图标合并回条目再返回。
 */
export class ItemIDBRepository extends IDBRepository<Item> implements ItemRepository<number> {
  private static readonly tableName = "mcmodderJsonStorage";
  private static readonly indexedKeys = /* ["id", "registerName", "metadata", "name",
    "englishName", "creativeTabName", "branch", "OredictList"] */ [];

  private static readonly iconTableName = "mcmodderIconStorage";

  /** 图标表句柄：`_primaryKey` 自增，`itemPrimaryKey` 索引指向主表行 */
  protected iconTable?: EntityTable<IndexedType<ItemIcon>, "_primaryKey", ItemIcon>;

  constructor() {
    super(ItemIDBRepository.tableName, ItemIDBRepository.indexedKeys);
  }

  /** 覆写 schema：在父类主表之外，额外登记图标表 `++_primaryKey, itemPrimaryKey` */
  protected override getSchema() {
    return {
      [ItemIDBRepository.iconTableName]: "++_primaryKey, itemPrimaryKey",
      ...super.getSchema(),
    };
  }

  /** 初始化：完成父类建表后，再取得图标表句柄 */
  override async init() {
    super.init();
    this.iconTable = this.db.table(ItemIDBRepository.iconTableName);
  }

  /**
   * 覆写文件的全部条目（拆表写入，见类注释「写入路径」）。
   *
   * @param filename 目标文件名。
   * @param data 待写入的 `Item[]`（含 `smallIcon`/`largeIcon` Base64）。
   */
  override async write(filename: string, data: Item[]) {
    await this.db.transaction("rw", this.table!, this.iconTable!, async () => {
      const items = await this.table!.where("_filename").equals(filename).toArray();
      const itemPrimaryKeys = items.map((item) => item._primaryKey);
      await this.iconTable!.where("itemPrimaryKey").anyOf(itemPrimaryKeys).delete();

      await super.write(filename, data);
      const written = await super.read(filename);
      const length = written.length;
      const icons = new Array<ItemIcon>(length);
      written.forEach((item, index) => {
        icons[index] = {
          itemPrimaryKey: item._primaryKey,
          smallIcon: item.smallIcon ? Utils.base642Blob(item.smallIcon, "image/png") : undefined,
          largeIcon: item.largeIcon ? Utils.base642Blob(item.largeIcon, "image/png") : undefined,
        };
        delete item.smallIcon;
        delete item.largeIcon;
      });
      await this.iconTable!.bulkAdd(icons);
      await this.table!.bulkPut(written);
    });
  }

  /**
   * 读回某文件的全部条目，并把图标从图标表合并回每条数据后返回。
   *
   * @param filename 目标文件名。
   */
  override async read(filename: string) {
    const { items, icons } = await this.db.transaction(
      "r",
      this.table!,
      this.iconTable!,
      async () => {
        const items = await super.read(filename);
        const icons = await this.getItemIconsByItems(items);
        return { items, icons };
      },
    );
    return await this.combineItemAndIcons(items, icons);
  }

  /** 读取某文件的「检索面」：仅返回主表文字字段（不带图标），供搜索/列表快速读取 */
  async readSearchText(filename: string) {
    return await super.read(filename);
  }

  /**
   * 按主键批量读取并补回图标。
   *
   * @param itemPrimaryKeys 主表行 `_primaryKey` 数组；不存在的行对应位置返回 undefined。
   */
  async readByPrimaryKeys(itemPrimaryKeys: number[]) {
    const { items, icons } = await this.getItemIconsByPrimaryKeys(itemPrimaryKeys);
    return await this.combineItemAndIcons(items, icons);
  }

  /**
   * 按主键批量取「主表行 + 对应图标」。
   * 用 `rawKeys` 逐个标记哪些主键在库中不存在（置 null），以便结果与入参对齐。
   */
  async getItemIconsByPrimaryKeys(itemPrimaryKeys: number[]) {
    const rawItems = await this.table!.bulkGet(itemPrimaryKeys);
    const rawKeys = [...itemPrimaryKeys] as (number | null)[];
    rawItems.forEach((item, index) => {
      if (item === undefined) {
        rawKeys[index] = null;
      }
    });
    const items = rawItems.filter((item) => item !== undefined);
    const keys = rawKeys.filter((key) => key !== null);
    const icons = await this.readIcons(keys);
    return { items, icons };
  }

  /**
   * 按已带主键的条目批量补回图标。
   *
   * @param items 形如 `IndexedType<Item>[]` 的条目数组（须带 `_primaryKey`）。
   */
  async readByItems<T extends IndexedType<Item>[]>(items: T) {
    const icons = await this.getItemIconsByItems(items);
    return await this.combineItemAndIcons(items, icons);
  }

  /** 按条目列表的主键，从图标表批量取出对应图标 */
  async getItemIconsByItems<T extends IndexedType<Item>[]>(items: T) {
    const keys = items.map((item) => item._primaryKey);
    return await this.readIcons(keys);
  }

  /** 底层：按主键数组批量读图标行 */
  private async readIcons(itemPrimaryKeys: number[]) {
    return await this.iconTable!.where("itemPrimaryKey").anyOf(itemPrimaryKeys).toArray();
  }

  /**
   * 解开两层 `PromiseSettledResult`：
   * 外层为 `Promise.allSettled([小图标组, 大图标组])` 的整体结果，
   * 内层为其中一组（每个条目一个转换任务）的 settled 结果。
   * 任一层失败均返回 undefined，交由调用方按「图标缺失」处理。
   */
  private unwrapSettled<T>(results: PromiseSettledResult<PromiseSettledResult<T>[]>) {
    if (!("value" in results)) return undefined;
    return results.value.map((result) => ("value" in result ? result.value : undefined));
  }

  /**
   * 把图标合并回条目：按 `itemPrimaryKey` 建图标映射，与条目逐一对齐，
   * 将 Blob 图标批量转回 Base64 后写回各条目（不会覆盖条目上已有的图标字段）。
   *
   * @param items 主表条目数组。
   * @param icons 对应的图标行数组。
   */
  private async combineItemAndIcons<T extends IndexedType<Item>[]>(
    items: T,
    icons: IndexedType<ItemIcon>[],
  ) {
    const iconMap = new Map<number, ItemIcon>();
    icons.forEach((icon) => {
      iconMap.set(icon.itemPrimaryKey, icon);
    });
    const alignedIcons = items.map((item) => iconMap.get(item._primaryKey));
    const [smallIcons, largeIcons] = await Promise.allSettled([
      Promise.allSettled(
        alignedIcons.map((icon) =>
          icon?.smallIcon ? Utils.blob2Base64(icon.smallIcon) : undefined,
        ),
      ),
      Promise.allSettled(
        alignedIcons.map((icon) =>
          icon?.largeIcon ? Utils.blob2Base64(icon.largeIcon) : undefined,
        ),
      ),
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
