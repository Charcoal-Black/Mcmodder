import { GM_openInTab } from "$";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoCheckinScheduleRequest extends ScheduleRequestType {
  protected priority = 10;
  async run(list: ScheduleRequestUtils) {
    list.create(McmodderUtils.getStartTime(new Date), "autoCheckin", this.parent.currentUID);
    const resp = await this.parent.utils.createAsyncRequest({
      url: "https://center.mcmod.cn/action/doUserCheckIn/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://center.mcmod.cn",
        "Referer": window.location.href,
        "Priority": "u=0",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
      },
      data: $.param({
        nCenterID: this.parent.currentUID
      })
    });
    const data = JSON.parse(resp.responseText);
    let message = "";
    if (!data.state && data.amount) message = `获得知识碎片 ${ data.amount } 个~`;
    else if (data.state === 182) message = "但是似乎早就签到过啦~";
    else if (data.state === 109) message = "但是似乎被别的百科页面抢先一步了~";
    else message = `自动签到已执行！但是遇到了预料之外的错误，请反馈给脚本作者... (${ McmodderValues.errorMessage[data.state] })`;
    if (this.parent.isV4) McmodderUtils.commonMsg(`自动签到已执行！${ message }`, !data.state);
    else swal.fire({
      type: (!data.state && data.amount) ? "success" : "error",
      title: "自动签到已执行",
      text: message,
      buttons: false,
      timer: 2e3
    });

    let yr = parseInt(this.parent.utils.getProfile("annualCelebration")) || 0;
    const regTime = new Date(parseInt(this.parent.utils.getProfile("regTime")));
    const now = new Date;
    if (regTime.getMonth() === now.getMonth() &&
      regTime.getDate() === now.getDate() &&
      regTime.getFullYear() + yr < now.getFullYear()) {
      const m = ["", "红", "黄", "绿", "蓝"], candleMap = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 1, 1, 0],
        [1, 0, 0, 1, 0, 1, 0, 0, 1],
        [1, 0, 0, 1, 1, 1, 0, 0, 1],
        [0, 1, 1, 1, 0, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1]
      ], candlePos = [
        [10, 55],
        [16, 30],
        [16, 80],
        [25, 20],
        [25, 55],
        [25, 90],
        [34, 30],
        [34, 80],
        [40, 55]
      ];
      let a = "";
      yr = now.getFullYear() - regTime.getFullYear();
      this.parent.utils.setProfile("annualCelebration", yr);
      if (yr < 5) a = `<br>微型${m[yr]}心勋章 现已解锁申请！`;
      let candles = "";
      if (yr < 10) {
        for (let i = 0; i < 9; i++) {
          if (candleMap[yr][i]) {
            candles += `<i class="mcmodder-candle" style="top: ${ candlePos[i][0] }px; left: ${ candlePos[i][1] }px"></i>`;
          }
        }
      }
      swal.fire({
        html: `
          <span 
            class="swal2-icon-text ${yr < 10 ? "mcmodder-cake" : "mcmodder-10th-cake"}"
            data-toggle="tooltip"
            data-original-title="蛋糕是个谎言 - ${ yr.toLocaleString() } 周年限定"
          >${ candles }</span>
          <h2 class="swal2-title">怕你忘啦</h2>
          今天是建号 ${ yr.toLocaleString() } 周年！<br>
          百科感谢有你的一路陪伴~
          ${ a }
        `,
        showConfirmButton: yr < 5,
        showCancelButton: true,
        confirmButtonText: "前往领取",
        cancelButtonText: "继续加油"
      }).then(isConfirm => {
        if (isConfirm.value) GM_openInTab("https://bbs.mcmod.cn/home.php?mod=medal", { active: true });
      });
      this.parent.updateItemTooltip();
    }
  }
}