import Dexie from "dexie";

export class DexieUtils {
  private static readonly map = new Map<string, Dexie>();
  static getOrCreate(databaseName: string, versionNumber: number, schema: { [tableName: string]: string | null }) {
    let dexie = this.map.get(databaseName);
    if (dexie === undefined) {
      dexie = new Dexie(databaseName);
      const version = dexie.version(versionNumber);
      version.stores(schema);
      this.map.set(databaseName, dexie);
    }
    return dexie;
  }
}