import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "../schedulerequest/ScheduleRequestUtils";
import { McmodderUtils } from "../Utils";

type DataGetter = () => number;

export class McmodderTimer {

  static CLASSNAME = "mcmodder-timer";

  static DATAGETTER_SCHEDULE = (id: string, user: number | null, list: ScheduleRequestUtils) => () => list.find(id, user)?.time || 0;
  static DATAGETTER_CONSTANT = (time: number) => () => time;

  parent: Mcmodder;
  dataGetter: DataGetter;
  $instance: JQuery;
  eventID: number;

  constructor(parent: Mcmodder, dataGetter: DataGetter, updateInterval = 1000) {
    this.parent = parent;
    this.dataGetter = dataGetter;
    this.$instance = $("<span>").attr("class", McmodderTimer.CLASSNAME).html("-");

    this.eventID = setInterval(() => {
      this.update();
    }, updateInterval);
  }

  update() {
    let time = this.dataGetter();
    this.$instance.html(time ? McmodderUtils.getFormattedTime(time - Date.now()) : "-");
  }
}