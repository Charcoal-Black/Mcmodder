import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { ScheduleRequestType } from "./ScheduleRequestType";

export const enum ScheduleRequestTriggerType {
  NONE,
  CONFIG
}

export class ScheduleRequestUtils {
  readonly parent: Mcmodder;
  private readonly configs: ConfigRepository;
  private readonly requestData: ScheduleRequestOption;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
    this.requestData = {};
  }

  addRequestType(key: keyof ScheduleRequestTypes, request: ScheduleRequestType, trigger: ScheduleRequestTriggerType, ...param: [KeysOfType<Settings, number | boolean>, number, boolean]) {
    this.requestData[key] = request;
    this.init(key, trigger, param);
  }

  init(key: keyof ScheduleRequestTypes, trigger: ScheduleRequestTriggerType, param: [KeysOfType<Settings, number | boolean>, number, boolean]) {
    switch (trigger) {
      case ScheduleRequestTriggerType.CONFIG: {
        const configID = param[0], minimum = param[1] ?? 0, hasUserLimit = param[2];
        const configValue = this.configs.getSettings(configID);
        if (
          (hasUserLimit ? (this.parent.currentUID > 0) : true) && 
          configValue && 
          Number(configValue) >= minimum && 
          !this.find(key, hasUserLimit ? this.parent.currentUID : undefined)?.time
        ) {
          this.create(0, key, hasUserLimit ? this.parent.currentUID : undefined);
        }
        else if (!configValue) {
          this.deleteByTodo(key);
        }
        break;
      }
    }
  }

  get(): ScheduleRequestList {
    return this.configs.getAll("scheduleRequestList") ?? [];
  }

  set(e: ScheduleRequestList) {
    this.configs.setAll("scheduleRequestList", e);
  }

  empty() {
    this.set([]);
  }

  find(todo: keyof ScheduleRequestTypes, userID?: number | null) {
    const scheduleRequestList = this.get();
    return scheduleRequestList
    .filter(e => e.todo === todo && (!userID || e.userID === userID))
    .sort((a, b) => a.time - b.time)[0];
  }

  deleteByTodo(todo: keyof ScheduleRequestTypes) {
    let scheduleRequestList = this.get();
    scheduleRequestList = scheduleRequestList.filter(e => !(e.todo === todo));
    this.set(scheduleRequestList);
  }

  create(time: number, todo: keyof ScheduleRequestTypes, userID?: number, priority?: number) {
    this.deleteByTodo(todo);
    const scheduleRequestList = this.get();
    scheduleRequestList.push({
      time: time,
      todo: todo,
      userID: userID,
      priority: priority ?? this.requestData[todo]?.priority ?? Number.MAX_SAFE_INTEGER,
      id: Utils.randStr(8)
    });
    this.set(scheduleRequestList);
  }

  check() {
    let scheduleRequestList = this.get();
    const now = (new Date()).getTime();
    const todoList = scheduleRequestList.filter(e => e.time <= now && (e.userID === undefined || e.userID <= 0 || e.userID === this.parent.currentUID));
    const idList = todoList.map(e => e.id);
    if (todoList.length) {
      todoList.sort((a, b) => a.priority - b.priority);
      todoList.forEach(e => this.run(e.todo));
      scheduleRequestList = this.get().filter(e => !(idList.includes(e.id)));
      this.set(scheduleRequestList);
    }
  }

  run(todo: keyof ScheduleRequestTypes) {
    this.requestData[todo]!.run(this);
  }
}