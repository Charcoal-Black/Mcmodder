import { ScheduleRequestUtils } from "../schedulerequest/ScheduleRequestUtils";
import { McmodderUtils } from "../Utils";

export class McmodderTimer {
  static CLASSNAME = "mcmodder-timer";

  static DATAGETTER_SCHEDULE = (id: string, user: number | null, list: ScheduleRequestUtils) => () => list.find(id, user)?.time || 0;
  static DATAGETTER_CONSTANT = (time: number) => () => time;

  static DATAFORMATTER_EN = McmodderUtils.getFormattedTime;
  static DATAFORMATTER_ZH = McmodderUtils.getFormattedChineseTime;
}