import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "./ScheduleRequestUtils";

export abstract class ScheduleRequestType {
  protected parent: Mcmodder;
  protected abstract priority: number;
  abstract run(list: ScheduleRequestUtils): void;
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }
  getPriority() {
    return this.priority;
  }
}