import { ScheduleRequestTriggerType, ScheduleRequestUtils } from "../schedulerequest/ScheduleRequestUtils";
import { AutoCheckinScheduleRequest } from "../schedulerequest/types/AutoCheckinScheduleRequest";
import { AutoCheckUpdateScheduleRequest } from "../schedulerequest/types/AutoCheckUpdateScheduleRequest";
import { AutoCheckVerifyScheduleRequest } from "../schedulerequest/types/AutoCheckVerifyScheduleRequest";
import { AutoHandlePreSubmitScheduleRequest } from "../schedulerequest/types/AutoHandlePreSubmitScheduleRequest";
import { AutoSubscribeScheduleRequest } from "../schedulerequest/types/AutoSubscribeScheduleRequest";

export class ScheduleRequestLoader {
  static run(list: ScheduleRequestUtils) {
    list.addRequestType("autoCheckUpdate", new AutoCheckUpdateScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG, "autoCheckUpdate", 0, false); // 自动检查更新
    list.addRequestType("autoCheckin", new AutoCheckinScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG, "autoCheckin", 0, true); // 自动签到
    list.addRequestType("autoCheckVerify", new AutoCheckVerifyScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG, "autoVerifyDelay", 1e-2, true); // 自动查询待审项
    list.addRequestType("autoSubscribe", new AutoSubscribeScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG, "subscribeDelay", 1e-1, true); // 关注列表新编辑&短评提醒
    list.addRequestType("autoHandlePreSubmit", new AutoHandlePreSubmitScheduleRequest(list.parent),
      ScheduleRequestTriggerType.CONFIG, "preSubmitCheckInterval", 1e-1, true); // 自动检测预编辑项
    setInterval(() => list.check(), 1e3);
  }
}
