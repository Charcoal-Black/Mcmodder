import { GM_openInTab } from "$";
import { Utils } from "../../Utils";
import { Values } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

/**
 * 自动签到：每天零点后向 `center.mcmod.cn` 的签到接口发一次 POST，弹窗告知结果；
 * 顺带检查「建号周年纪念」。
 */
export class AutoCheckinScheduleRequest extends ScheduleRequestType {
  override readonly priority = 10;

  /** 周年勋章颜色索引，0~4 对应微型红/黄/绿/蓝心勋章 */
  private static readonly badgeNameMap = ["", "红", "黄", "绿", "蓝"] as const;

  /**
   * 周年蛋糕的蜡烛点阵：`candleMap[周年数][第 i 个位置]`，1 表示该位置点蜡烛。
   * 取 `0~9` 的行，`0` 行是 1 周年的单根蜡烛。
   */
  private static readonly candleMap = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 0, 0, 1],
    [0, 1, 1, 1, 0, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
  ] as const;

  /** 与 {@link candleMap} 各点位对应的 CSS 偏移（`top`, `left`，px） */
  private static readonly candlePos = [
    [10, 55],
    [16, 30],
    [16, 80],
    [25, 20],
    [25, 55],
    [25, 90],
    [34, 30],
    [34, 80],
    [40, 55],
  ] as const;

  /**
   * 执行签到。
   *
   * 排期用 `Utils.getStartTime(new Date())`（默认 `num = 1`，即**次日零点**），
   * 从而实现「每天一次」。
   * 签到结果以 v4 的普通提示或 v3 的 swal 弹窗两种形式告知。
   */
  async run(list: ScheduleRequestUtils) {
    list.create(Utils.getStartTime(new Date()), "autoCheckin", this.parent.currentUID);
    const resp = await this.parent.utils.createRequest({
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
    });
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
    this.checkAnnualCelebration();
  }

  /**
   * 建号周年检查：若「今天」正好是注册当天的月/日，且已记录的周年数小于当前年份差，
   * 则记录周年数并弹出纪念蛋糕（附蜡烛点阵、5 周年内的勋章提示与领取入口）。
   *
   * 用「月/日相等 + 记录过的周年数」双重判定，是为了保证每年只提示一次。
   */
  private checkAnnualCelebration() {
    let yr = this.configs.getProfile("annualCelebration") ?? 0;
    const regTime = new Date(this.configs.getProfile("regTime"));
    const now = new Date();
    if (
      regTime.getMonth() === now.getMonth() &&
      regTime.getDate() === now.getDate() &&
      regTime.getFullYear() + yr < now.getFullYear()
    ) {
      let badgeHint = "";
      yr = now.getFullYear() - regTime.getFullYear();
      this.configs.setProfile("annualCelebration", yr);
      if (yr < 5)
        badgeHint = `<br>微型${AutoCheckinScheduleRequest.badgeNameMap[yr]}心勋章 现已解锁申请！`;
      let candles = "";
      if (yr < 10) {
        for (let i = 0; i < 9; i++) {
          if (AutoCheckinScheduleRequest.candleMap[yr][i]) {
            candles += `<i class="mcmodder-candle" style="top: ${
              AutoCheckinScheduleRequest.candlePos[i][0]
            }px; left: ${AutoCheckinScheduleRequest.candlePos[i][1]}px"></i>`;
          }
        }
      }
      swal
        .fire({
          html: `
          <span 
            class="swal2-icon-text ${yr < 10 ? "mcmodder-cake" : "mcmodder-10th-cake"}"
            data-toggle="tooltip"
            data-original-title="蛋糕是个谎言 - ${yr.toLocaleString()} 周年限定"
          >${candles}</span>
          <h2 class="swal2-title">怕你忘啦</h2>
          今天是建号 ${yr.toLocaleString()} 周年！<br>
          百科感谢有你的一路陪伴~
          ${badgeHint}
        `,
          showConfirmButton: yr < 5,
          showCancelButton: true,
          confirmButtonText: "前往领取",
          cancelButtonText: "继续加油",
        })
        .then((isConfirm) => {
          if (isConfirm.value)
            GM_openInTab("https://bbs.mcmod.cn/home.php?mod=medal", {
              active: true,
            });
        });
      this.parent.updateItemTooltip();
    }
  }
}
