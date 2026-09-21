import type { ConfigRepository } from "../../config/ConfigRepository";
import { Mcmodder } from "../../Mcmodder";
import type { ItemRepository } from "./ItemRepository";

export class GMStorageRepository<T extends object> implements ItemRepository<T> {
  private readonly configs: ConfigRepository;
  private readonly configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>;

  constructor(parent: Mcmodder, configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>) {
    this.configs = parent.configRepository;
    this.configName = configName;
  }

  async init() {
    if (this.configs.getAll(this.configName) === undefined) {
      this.configs.setAll(this.configName, {});
    }
  }

  async listFilename() {
    const selection = this.configs.getAll(this.configName)!;
    return Object.keys(selection);
  }

  async createFile(filename: string) {
    this.configs.set(this.configName, filename, []);
  }

  async deleteFile(filename: string) {
    this.configs.delete(this.configName, filename);
  }

  async read(filename: string) {
    return this.configs.get(this.configName, filename)! as T[];
  }

  async write(filename: string, data: T[]) {
    this.configs.set(this.configName, filename, data);
  }
}