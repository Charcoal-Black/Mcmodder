import type { ConfigRepository } from "./config/ConfigRepository";
import { Mcmodder } from "./Mcmodder";

export class BackupManager<BackupData> {
  configs: ConfigRepository;
  id: string;
  constructor(parent: Mcmodder, id: string) {
    this.configs = parent.configRepository;
    this.id = id;
  }

  backup(data: BackupData) {
    this.configs.set("mcmodderBackup", this.id, data);
  }

  hasBackup() {
    return this.restore() != null;
  }

  restore(): BackupData | null {
    return (this.configs.get("mcmodderBackup", this.id) as BackupData) ?? null;
  }

  clear() {
    this.configs.set("mcmodderBackup", this.id, null);
  }
}
