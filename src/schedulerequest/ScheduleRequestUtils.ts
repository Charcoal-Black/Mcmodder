import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestData, ScheduleRequestList } from "../types";
import { McmodderUtils } from "../Utils";
import { ScheduleRequestType } from "./ScheduleRequestType";

export const enum ScheduleRequestTriggerType {
  NONE,
  CONFIG
}

export class ScheduleRequestUtils {

  parent: Mcmodder;
  requestData: ScheduleRequestData;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.requestData = {};
  }

  addRequestType(key: string, request: ScheduleRequestType, trigger: ScheduleRequestTriggerType, ...param: any[]) {
    this.requestData[key] = request;
    this.init(key, trigger, param);
  }

  init(key: string, trigger: ScheduleRequestTriggerType, param: any[]) {
    switch (trigger) {
      case ScheduleRequestTriggerType.CONFIG: {
        let configID = param[0], minimum = param[1] || 0, hasUserLimit = param[2];
        let configValue = this.parent.utils.getConfig(configID);
        if (
          (hasUserLimit ? (this.parent.currentUID > 0) : true) && 
          configValue && 
          configValue >= minimum && 
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
    return this.parent.utils.getAllConfig("scheduleRequestList", new Array);
  }

  set(e: ScheduleRequestList) {
    this.parent.utils.setAllConfig("scheduleRequestList", e);
  }

  empty() {
    this.set([]);
  }

  find(todo: string, userID?: number | null) {
    let scheduleRequestList = this.get();
    return scheduleRequestList
    .filter(e => e.todo === todo && (!userID || e.userID === userID))
    .sort((a, b) => a.time - b.time)[0];
  }

  deleteByTodo(todo: string) {
    let scheduleRequestList = this.get();
    scheduleRequestList = scheduleRequestList.filter(e => !(e.todo === todo));
    this.set(scheduleRequestList);
  }

  create(time: number, todo: string, userID?: number, priority?: number) {
    this.deleteByTodo(todo);
    let scheduleRequestList = this.get();
    scheduleRequestList.push({
      time: time,
      todo: todo,
      userID: userID,
      priority: priority || this.requestData[todo]?.priority || Number.MAX_SAFE_INTEGER,
      id: McmodderUtils.randStr(8)
    });
    this.set(scheduleRequestList);
  }

  check() {
    let scheduleRequestList = this.get(), now = (new Date()).getTime();
    let todoList = scheduleRequestList.filter(e => e.time <= now && (e.userID === undefined || e.userID <= 0 || e.userID === this.parent.currentUID)), idList = todoList.map(e => e.id);
    if (todoList.length) {
      todoList.sort((a, b) => a.priority - b.priority);
      todoList.forEach(e => this.run(e.todo));
      scheduleRequestList = this.get().filter(e => !(idList.includes(e.id)));
      this.set(scheduleRequestList);
    }
  }

  run(todo: string) {
    this.requestData[todo].run(this);
  }
}