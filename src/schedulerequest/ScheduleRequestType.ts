import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "./ScheduleRequestUtils";

export abstract class ScheduleRequestType {
  protected readonly parent: Mcmodder;
  protected readonly configs: ConfigRepository;
  abstract readonly priority: number;
  abstract run(list: ScheduleRequestUtils): void;
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
  }
  getPriority() {
    return this.priority;
  }
}
