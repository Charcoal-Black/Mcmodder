import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "./ScheduleRequestUtils";

export abstract class ScheduleRequestType {
  protected readonly parent: Mcmodder;
  protected abstract readonly priority: number;
  abstract run(list: ScheduleRequestUtils): void;
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }
  getPriority() {
    return this.priority;
  }
}