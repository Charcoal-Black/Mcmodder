import {
  ScheduleRequestTriggerType,
  ScheduleRequestUtils,
} from "../schedulerequest/ScheduleRequestUtils";
import { AutoCheckinScheduleRequest } from "../schedulerequest/types/AutoCheckinScheduleRequest";
import { AutoCheckUpdateScheduleRequest } from "../schedulerequest/types/AutoCheckUpdateScheduleRequest";
import { AutoCheckVerifyScheduleRequest } from "../schedulerequest/types/AutoCheckVerifyScheduleRequest";
import { AutoHandlePreSubmitScheduleRequest } from "../schedulerequest/types/AutoHandlePreSubmitScheduleRequest";
import { AutoSubscribeScheduleRequest } from "../schedulerequest/types/AutoSubscribeScheduleRequest";

/**
 * 计划任务加载器：注册全部计划任务，并挂上每秒一次的轮询。
 *
 * 各任务的「关联配置项 / 最小阈值 / 是否要求登录」三元组见下面每个 `addRequestType` 的参数，
 * 间隔的具体数值则由各任务自己的 `run` 决定。
 */
export class ScheduleRequestLoader {
  /**
   * 注册任务并启动轮询。
   *
   * @param list 调度器。
   */
  static run(list: ScheduleRequestUtils) {
    list.addRequestType(
      "autoCheckUpdate",
      new AutoCheckUpdateScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG,
      "autoCheckUpdate",
      0,
      false,
    ); // 自动检查更新
    list.addRequestType(
      "autoCheckin",
      new AutoCheckinScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG,
      "autoCheckin",
      0,
      true,
    ); // 自动签到
    list.addRequestType(
      "autoCheckVerify",
      new AutoCheckVerifyScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG,
      "autoVerifyDelay",
      1e-2,
      true,
    ); // 自动查询待审项
    list.addRequestType(
      "autoSubscribe",
      new AutoSubscribeScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG,
      "subscribeDelay",
      1e-1,
      true,
    ); // 关注列表新编辑&短评提醒
    list.addRequestType(
      "autoHandlePreSubmit",
      new AutoHandlePreSubmitScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG,
      "preSubmitCheckInterval",
      1e-1,
      true,
    ); // 自动检测预编辑项
    // 调度器本身不含定时器，轮询由这里驱动
    setInterval(() => list.check(), 1e3);
  }
}
