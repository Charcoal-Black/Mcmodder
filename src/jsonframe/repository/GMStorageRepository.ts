import type { ConfigRepository } from "../../config/ConfigRepository";
import type { AppRepository } from "./AppRepository";

export class GMStorageRepository<T extends object> implements AppRepository<T> {
  private readonly configs: ConfigRepository;
  private readonly configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>;

  constructor(
    configs: ConfigRepository,
    configName: KeysOfType<Required<AppStorage>, Record<string, object[]>>,
  ) {
    this.configs = configs;
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
