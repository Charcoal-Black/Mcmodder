import Dexie from "dexie";
import type { EntityTable } from "dexie";
import type { AppRepository } from "./AppRepository";

/**
 * `AppRepository` 的 IndexedDB 形态实现（基于 Dexie）。
 *
 * # 存储结构
 * 同一数据库（`Mcmodder`）下按 `tableName` 分表。每行 = 一条数据 + 两个内部字段：
 * - `_filename`：该行所在文件的文件名（Dexie 索引，用于按文件筛选）；
 * - `_primaryKey`：Dexie 建表字符串的第一项（外层的 `primary key`，自增）。
 * 构造时传入的 `indexedKeys` 会作为额外索引加入建表 schema。
 *
 * # 文件语义（重要）
 * 文件名本身不在 IndexedDB 中登记 —— `createFile` 只把文件名记入内存数组 `tempFiles`，
 * 直到 `write` 真正写入数据后，文件名才会体现在 `listFilename` 的结果里；空文件被删除或
 * 从未写入时不会出现在列表中。`listFilename` 返回「库中出现的文件名」与 `tempFiles` 的并集。
 *
 * # 性能取舍
 * 相比 `GMStorageRepository` 的整存整取，本实现可按 `_filename` 精准删读，且借助
 * `_primaryKey` 支持逐行增删，适合数据量大、需要频繁单条读写的场景。
 */
export class IDBRepository<T extends object> implements AppRepository<T> {
  protected readonly db;
  protected readonly version;
  /** Dexie 表句柄：行类型为 `IndexedType<IDBInsertType<T>>`（叠加 `_primaryKey` 与 `_filename`） */
  protected table?: EntityTable<IndexedType<IDBInsertType<T>>, "_primaryKey", IDBInsertType<T>>;
  /** 建表用列定义串，形如 `"_primaryKey, _filename, <indexedKeys 逗号连接>"` */
  private readonly columns;
  private readonly tableName: string;
  /** 已登记但尚未落盘的文件名（`createFile` 写入、`write` 落盘后仍保留） */
  private tempFiles: string[] = [];

  protected static readonly databaseName = "Mcmodder";
  private static readonly versionNumber = 1;

  /**
   * @param tableName 本仓储对应的表名。
   * @param indexedKeys 除 `_filename` 外需要建立的额外索引字段名。
   */
  constructor(tableName: string, indexedKeys: string[]) {
    this.db = new Dexie(IDBRepository.databaseName);
    this.columns = ["_primaryKey", "_filename", ...indexedKeys].join(", ");
    this.version = this.db.version(IDBRepository.versionNumber);
    this.tableName = tableName;
  }

  /** 子类可覆写以登记额外表（默认仅当前表），返回 `表名 → schema` 映射 */
  protected getSchema() {
    return {
      [this.tableName]: this.columns,
    };
  }

  /** 初始化：按 schema 建表并取得表句柄 */
  async init() {
    this.version.stores(this.getSchema());
    this.table = this.db.table(this.tableName);
  }

  /** 列出全部文件名：库中实际出现过的 `_filename` 与内存 `tempFiles` 的并集 */
  async listFilename() {
    const existFiles = await this.table!.orderBy("_filename").uniqueKeys();
    return existFiles.concat(this.tempFiles) as string[];
  }

  /** 新建空文件：仅登记文件名到内存，不落盘（见类注释「文件语义」） */
  async createFile(filename: string) {
    this.tempFiles.push(filename);
  }

  /** 删除指定文件的所有行，并从内存登记表中移除该文件名 */
  async deleteFile(filename: string) {
    await this.table!.where("_filename").equals(filename).delete();
    this.tempFiles = this.tempFiles.filter((e) => e !== filename);
  }

  /** 读回指定文件的全部行（保持插入/主键顺序） */
  async read(filename: string) {
    return await this.table!.where("_filename").equals(filename).toArray();
  }

  /**
   * 覆写指定文件的全部数据：先删除该文件旧行，再为每条数据带上 `_filename` 后批量写入。
   *
   * 注意：若该文件名已存在（含仅登记于 `tempFiles` 的情况），会再次登记，
   * 与 `createFile` 的语义保持一致。
   */
  async write(filename: string, data: T[]) {
    if ((await this.listFilename()).includes(filename)) {
      this.tempFiles.push(filename);
    }
    const dataWithFile = data.map((e) => Object.assign(e, { _filename: filename }));
    await this.table!.where("_filename").equals(filename).delete();
    await this.table!.bulkPut(dataWithFile);
  }
}
