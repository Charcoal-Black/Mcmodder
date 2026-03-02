import { AdvancementID } from "../../advancement/AdvancementUtils";
import { McmodderUtils } from "../../Utils";
import { ProgressBar } from "../../widget/progress/ProgressBar";
import { CenterBaseInit } from "./CenterBaseInit";

export class CenterTaskInit extends CenterBaseInit {
  private appendCustomAdvancements() {
    // 添加自定义成就
    this.getParent().advutils.list.forEach(e => {
      let c = $();
      if (e.isCustom) c = $(`
        <div class="center-task-block ">
          <div class="center-task-border">
            <span class="icon"><img src="${e.image}" alt="task"></span>
            <div class="task-item">
              <span class="title">${PublicLangData.center.task.list[e.lang].title}</span>
              <span class="difficulty">${'<i class="fa fa-star"></i>'.repeat(e.level || 5)}</span>
              <span class="text">
                <p>${PublicLangData.center.task.list[e.lang].content}</p>
              </span>
            </div>
            <span class="task-exp">
              <i class="fa fa-gift" style="margin-right:4px;"></i>
              奖励: ${e.reward ? /* PublicLangData.center.item.list[McmodderValues.userItemList[e.reward[0].id].lang].title */ "-" : "-"}
            </span>
            <span class="task-rate">
              <i class="fas fa-hourglass-half" style="margin-right:4px;font-size:10px;"></i>
              进度: ${
                this.getParent().advutils.getSingleProgress(e.id)
              } / ${
                e.range || PublicLangData.center.task.list[e.lang].range
              }
            </span>
          </div>
        </div>`).appendTo(`.task > [data-menu-frame=${e.category}] > .center-content`);

      // 都怪喵呜机 手动触发检测
      if (e.id === AdvancementID.ALL_YOUR_FAULT) {
        c.attr({
          "data-toggle": "tooltip",
          "data-html": "true",
          "data-original-title": "该成就必须手动触发检测！轻触以开始检测该成就的完成进度，检测期间请勿关闭当前页面。<br>检测完成后当前页面会自动刷新，您将能够获知完成进度。<br>审核项提交时间以最后修改时间而非创建时间为准，无论结果是否通过均计入进度。"
        })
        .click(() => this.checkIfAllYourFault());
        McmodderUtils.updateAllTooltip();
      }
    });
  }

  private async checkIfAllYourFault() {
    const regTime = this.getUtils().getProfile("regTime");
    if (!regTime) {
      McmodderUtils.commonMsg("尚未获取到我的账号注册时间，触发失败... 请访问一次自己的个人中心主页再试试~", false);
      return;
    }
    swal.fire({
      title: "检测中",
      html: '请勿关闭此页面<br><div class="progress-container"></div>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false
    });
    const now = McmodderUtils.getStartTime(new Date(), 0);
    let startTime = McmodderUtils.getStartTime(regTime, 0), endTime, resp, total = 0, verifyList: Element[] = [], maxPage, title, lastEdit, lastVerify;
    const progressBar = new ProgressBar(regTime, regTime, now, ProgressBar.DISPLAYRULE_PERCENT);
    progressBar.$instance.appendTo(".progress-container");
    do {
      endTime = Math.min(now, McmodderUtils.getStartTime(startTime, 29));
      resp = await this.getUtils().createAsyncRequest({
        url: `https://www.mcmod.cn/verify.html?starttime=${startTime / 1e3}&endtime=${endTime / 1e3}&order=createtime&selfonly=1`,
        method: "GET"
      });
      if (!resp.responseXML) return;
      resp = $(resp.responseXML);
      maxPage = Number(resp.find(".pagination").first().find(".page-item").last().find("a").attr("data-page"));
      resp.find(".verify-list-list-frame tbody tr").each((_, c) => {
        verifyList.push(c);
      });
      if (maxPage) for (let i = 2; i <= maxPage; i++) {
        resp = await this.getUtils().createAsyncRequest({
          url: `https://www.mcmod.cn/verify.html?starttime=${startTime / 1e3}&endtime=${endTime / 1e3}&order=createtime&selfonly=1&page=${i}`,
          method: "GET"
        });
        if (!resp.responseXML) return;
        resp = $(resp.responseXML);
        resp.find(".verify-list-list-frame tbody tr").each((_, c) => {
          verifyList.push(c);
        });
      }
      startTime = McmodderUtils.getStartTime(endTime);
      progressBar.setProgress(startTime);
    } while (endTime < now);
    verifyList.forEach(e => {
      title = $(e).find("td:nth-child(3) span").attr("data-original-title");
      if (!title) return;
      lastEdit = (title.indexOf("最后修改") < 0) ? (new Date(title.split("创建时间: ")[1]?.split("(")[0])).valueOf() : (new Date(title.split("最后修改: ")[1]?.split("(")[0])).valueOf();
      lastVerify = new Date(title.split("最后审核: ")[1]?.split("(")[0]).valueOf();
      if (lastEdit + 48 * 60 * 60 * 1000 < lastVerify) total++;
    });
    this.getParent().advutils.setProgress(AdvancementID.ALL_YOUR_FAULT, total);
    location.reload();
  }

  private parseUnlockedAchievements(frameID: number) {
    let expTotal = 0, expEarned = 0;
    $(`.task [data-menu-frame=${ frameID }] .center-task-block`).each((_, e) => {
      let t = $(e).find(".title").text(), exp = 0, c = $(e).find(".finished").length;
      let f = this.getParent().advutils.list.find(a => PublicLangData.center.task.list[a.lang].title === t);
      if (!f?.tier) exp += f?.exp || 0, expTotal += exp, expEarned += c * exp;
      else {
        let cur = f, prev, next, sum = 0;
        while (prev = cur.prev) { // 前向遍历
          sum += prev.exp;
          cur = prev;
        }
        expEarned += sum;
        cur = f;
        if (c) { // 全部已完成
          expEarned += cur.exp;
          expTotal += (sum + cur.exp);
        }
        else { // 后向遍历
          while (next = cur.next) {
            sum += cur.exp;
            cur = next;
          }
          expTotal += sum;
        }
      }
    });
    $(`.task [data-menu-frame=${ frameID }] .center-block-head`).append(`<span class="${
      expEarned < expTotal * 0.6 ? "text-muted" : "mcmodder-chroma"
    }" style="margin-left: 1em;">${
      expEarned.toLocaleString()
    } Exp / ${
      expTotal.toLocaleString()
    } Exp 已取得 (${
      (expEarned / expTotal * 100).toFixed(1)
    }% 完成)</span>`);
  }

  run() {
    if (this.center.isMyPage()) {
      this.appendCustomAdvancements();
    }

    // 解析已取得成就
    for (let i = 1; i <= 2; i++) {
      this.parseUnlockedAchievements(i);
    }
  }
}