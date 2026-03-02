import { Mcmodder } from "./Mcmodder";

export class McmodderBackupManager<BackupData> {
  parent: Mcmodder;
  id: string;
  constructor(parent: Mcmodder, id: string) {
    this.parent = parent;
    this.id = id;
  }

  backup(data: BackupData) {
    this.parent.utils.setConfig(this.id, data, "mcmodderBackup");
  }

  hasBackup() {
    return this.restore() != null;
  }

  restore(): BackupData {
    return this.parent.utils.getConfig(this.id, "mcmodderBackup", null);
  }

  clear() {
    this.parent.utils.setConfig(this.id, null, "mcmodderBackup");
  }
}