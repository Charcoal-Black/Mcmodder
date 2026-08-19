import Dexie from "dexie";
import type { EntityTable, Version } from "dexie";
import { ItemRepository } from "./ItemRepository";

export class IndexedDBRepository<T extends object> implements ItemRepository<T> {
  private readonly db: Dexie;
  private readonly version: Version;
  private readonly table: EntityTable<T & { _filename: string, _primaryKey: number }, "_primaryKey", T & { _filename: string }>;
  private readonly columns: string;
  private tempFiles: string[] = [];

  private static readonly databaseName = "Mcmodder";
  private static readonly versionNumber = 1;
  
  constructor(tableName: string, columns: string[]) {
    this.db = new Dexie(IndexedDBRepository.databaseName);
    this.columns = "++_primaryKey, _filename, " + columns.join(", ");
    this.version = this.db.version(IndexedDBRepository.versionNumber);
    this.version.stores({
      [tableName]: this.columns
    })
    this.table = this.db.table(tableName);
  }

  async init() {}
  
  async listFilename() {
    const existFiles = await this.table.orderBy("_filename").uniqueKeys();
    return existFiles.concat(this.tempFiles) as string[];
  }

  async createFile(filename: string) {
    this.tempFiles.push(filename);
  }

  async deleteFile(filename: string) {
    await this.table.where("_filename").equals(filename).delete();
    this.tempFiles = this.tempFiles.filter(e => e != filename);
  }

  async read(filename: string) {
    return await this.table.where("_filename").equals(filename).toArray();
  }

  async write(filename: string, data: T[]) {
    const dataWithFile = data.map(e => Object.assign(e, { _filename: filename }));
    await this.table.where("_filename").equals(filename).delete();
    await this.table.bulkPut(dataWithFile);
  }
}