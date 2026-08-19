import { Mcmodder } from "../../Mcmodder";
import { ItemRepository } from "./ItemRepository";

export class GMStorageRepository<T extends object> implements ItemRepository<T> {
  private readonly parent: Mcmodder;
  private readonly configName: string;

  constructor(parent: Mcmodder, configName: string) {
    this.parent = parent;
    this.configName = configName;
  }

  async init() {
    if (this.parent.utils.getAllConfig(this.configName) === undefined) {
      this.parent.utils.setAllConfig(this.configName, {});
    }
  }

  async listFilename() {
    const selection = this.parent.utils.getAllConfig(this.configName);
    return Object.keys(selection);
  }

  async createFile(filename: string) {
    this.parent.utils.setConfig(filename, [], this.configName);
  }

  async deleteFile(filename: string) {
    this.parent.utils.deleteConfig(filename, this.configName);
  }

  async read(filename: string) {
    return this.parent.utils.getConfig(filename, this.configName);
  }

  async write(filename: string, data: T[]) {
    this.parent.utils.setConfig(filename, data, this.configName);
  }
}