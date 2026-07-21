import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "../schedulerequest/ScheduleRequestUtils";
import { McmodderUtils } from "../Utils";

type DataGetter = () => number;
type DataFormatter = (t: number) => string;

export class McmodderTimer {

  static CLASSNAME = "mcmodder-timer";

  static DATAGETTER_SCHEDULE = (id: string, user: number | null, list: ScheduleRequestUtils) => () => list.find(id, user)?.time || 0;
  static DATAGETTER_CONSTANT = (time: number) => () => time;

  static DATAFORMATTER_EN = McmodderUtils.getFormattedTime;
  static DATAFORMATTER_ZH = McmodderUtils.getFormattedChineseTime;

  parent: Mcmodder;
  dataGetter: DataGetter;
  dataFormatter: DataFormatter;
  instance: HTMLSpanElement;
  $instance: JQuery;
  eventID: number;

  constructor(parent: Mcmodder, dataGetter: DataGetter | number, updateInterval = 1000, dataFormatter?: DataFormatter) {
    this.parent = parent;
    this.dataGetter = typeof dataGetter === "number" ? McmodderTimer.DATAGETTER_CONSTANT(dataGetter) : dataGetter;
    this.dataFormatter = dataFormatter ?? McmodderTimer.DATAFORMATTER_EN;
    this.$instance = $("<span>").attr("class", McmodderTimer.CLASSNAME).html("-");
    this.instance = this.$instance.get(0) as HTMLSpanElement;

    this.update();
    this.eventID = setInterval(() => {
      if (!document.body.contains(this.instance)) {
        clearInterval(this.eventID);
      } else {
        this.update();
      }
    }, updateInterval);
  }

  update() {
    let time = this.dataGetter();
    this.$instance.html(time ? this.dataFormatter(time - Date.now()) : "-");
  }
}