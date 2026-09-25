import Dexie from "dexie";
import type { EntityTable } from "dexie";
import type { AppRepository } from "./AppRepository";

export class IDBRepository<T extends object> implements AppRepository<T> {
  protected readonly db;
  protected readonly version;
  protected table?: EntityTable<IndexedType<IDBInsertType<T>>, "_primaryKey", IDBInsertType<T>>;
  private readonly columns;
  private readonly tableName: string;
  private tempFiles: string[] = [];

  protected static readonly databaseName = "Mcmodder";
  private static readonly versionNumber = 1;

  constructor(tableName: string, indexedKeys: string[]) {
    this.db = new Dexie(IDBRepository.databaseName);
    this.columns = ["_primaryKey", "_filename", ...indexedKeys].join(", ");
    this.version = this.db.version(IDBRepository.versionNumber);
    this.tableName = tableName;
  }

  protected getSchema() {
    return {
      [this.tableName]: this.columns
    };
  }

  async init() {
    this.version.stores(this.getSchema());
    this.table = this.db.table(this.tableName);
  }

  async listFilename() {
    const existFiles = await this.table!.orderBy("_filename").uniqueKeys();
    return existFiles.concat(this.tempFiles) as string[];
  }

  async createFile(filename: string) {
    this.tempFiles.push(filename);
  }

  async deleteFile(filename: string) {
    await this.table!.where("_filename").equals(filename).delete();
    this.tempFiles = this.tempFiles.filter(e => e !== filename);
  }

  async read(filename: string) {
    return await this.table!.where("_filename").equals(filename).toArray();
  }

  async write(filename: string, data: T[]) {
    if ((await this.listFilename()).includes(filename)) {
      this.tempFiles.push(filename);
    }
    const dataWithFile = data.map(e => Object.assign(e, { _filename: filename }));
    await this.table!.where("_filename").equals(filename).delete();
    await this.table!.bulkPut(dataWithFile);
  }
}