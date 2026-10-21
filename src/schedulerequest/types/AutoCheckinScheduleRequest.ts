import { Utils } from "../../Utils";
import { Values } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

/**
 * 自动签到：每天零点后向 `center.mcmod.cn` 的签到接口发一次 POST，弹窗告知结果。
 */
export class AutoCheckinScheduleRequest extends ScheduleRequestType {
  override readonly priority = 10;

  /**
   * 执行签到。
   *
   * 排期用 `Utils.getStartTime(new Date())`（默认 `num = 1`，即**次日零点**），
   * 从而实现「每天一次」。
   * 签到结果以 v4 的普通提示或 v3 的 swal 弹窗两种形式告知。
   */
  async run(list: ScheduleRequestUtils) {
    list.create(Utils.getStartTime(new Date()), "autoCheckin", this.parent.currentUID);
    const resp = await this.parent.utils.createRequest(
      {
        url: "https://center.mcmod.cn/action/doUserCheckIn/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://center.mcmod.cn",
          Referer: window.location.href,
          Priority: "u=0",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
        data: $.param({
          nCenterID: this.parent.currentUID,
        }),
      },
      "签到",
    );
    const data = JSON.parse(resp.responseText);
    let message;
    if (!data.state && data.amount) message = `获得知识碎片 ${data.amount} 个~`;
    else if (data.state === 182) message = "但是似乎早就签到过啦~";
    else if (data.state === 109) message = "但是似乎被别的百科页面抢先一步了~";
    else
      message = `自动签到已执行！但是遇到了预料之外的错误，请反馈给脚本作者... (${Values.errorMessage[data.state]})`;
    if (this.parent.isV4) Utils.commonMsg(`自动签到已执行！${message}`, !data.state);
    else
      // 使用了 v3 的特殊 swal
      // eslint-disable-next-line
      (swal as any)({
        type: !data.state && data.amount ? "success" : "error",
        title: "自动签到已执行",
        text: message,
        buttons: false,
        timer: 3e3,
      });
  }
}
