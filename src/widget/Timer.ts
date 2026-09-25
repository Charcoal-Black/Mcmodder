import { ScheduleRequestUtils } from "../schedulerequest/ScheduleRequestUtils";
import { Utils } from "../Utils";

export class TimerUtils {
  static CLASSNAME = "mcmodder-timer";

  static DATAGETTER_SCHEDULE =
    (id: keyof ScheduleRequestTypes, user: number | null, list: ScheduleRequestUtils) => () =>
      list.find(id, user)?.time || 0;
  static DATAGETTER_CONSTANT = (time: number) => () => time;

  static DATAFORMATTER_EN = Utils.getFormattedTime;
  static DATAFORMATTER_ZH = Utils.getFormattedChineseTime;
}
