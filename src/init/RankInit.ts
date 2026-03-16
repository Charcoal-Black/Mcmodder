import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

interface UserRankData {
  value: number,
  rate: number
}

export interface UserRankRecordData {
  value: number,
  user: number
}

export class RankInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/rank.html") && 
      this.parent.utils.getConfig("advancedRanklist");
  }

  private work(contentRank: JQuery): UserRankData {
    if (contentRank.find(".empty").length) return { value: 0, rate: 100 };
    let contentList = contentRank.find("ul > li");
    $(`
      <div class="mcmodder-ranklist-container"><ul class="mcmodder-ranklist-1" /></div>
      <div class="mcmodder-ranklist-container"><ul class="mcmodder-ranklist-2" /></div>
      <div class="mcmodder-ranklist-container"><ul class="mcmodder-ranklist-3" /></div>
    `).appendTo(contentRank);
    const maxValue = parseFloat(contentList.first().find("span.score").text());
    const listLength = contentList.length;
    let totalValue = 0, totalRate = 0, r = 0;
    for (const _i in contentList.toArray()) {
      const i = Number(_i);
      let li = $("<li>"), rank = null, e = contentList.eq(i);

      if (i < listLength / 3)
        li.appendTo(contentRank.find(".mcmodder-ranklist-1"));
      else if (i < listLength * 2 / 3)
        li.appendTo(contentRank.find(".mcmodder-ranklist-2"));
      else
        li.appendTo(contentRank.find(".mcmodder-ranklist-3"));

      let div = $('<div>').appendTo(li).css("display", "inline-block");
      let quantity = e.attr("data-content");
      if (quantity.includes("字节")) {
        quantity = quantity.replace("字节", " B")
        .replace('(约', '<span style="color: var(--mcmodder-color-text-dark3); display: inline">(~')
        .replace("个汉字)", "汉字)</span>");
      } else {
        quantity = quantity.replace("次", " 次");
      }
      let href = e.find("a").first().prop("href");
      let rate = parseFloat(e.find("span.score").text());
      if (isNaN(rate)) rate = 0;
      totalRate += rate;
      let userName = e.find("a.name").text();

      $(`<i class="avatar">`).appendTo(div).css({
        "background-image": `url("${e.find("img").attr("src")}")`
      });
      div = $(`<div class="content">`).appendTo(li);
      if (i > 0 && e.attr("data-content") != contentList.eq(i - 1).attr("data-content")) r = i;
      switch (Number(r)) {
        case 0: rank = '<i class="fa fa-trophy trophy gold'; break;
        case 1: rank = '<i class="fa fa-trophy trophy silver'; break;
        case 2: rank = '<i class="fa fa-trophy trophy bronze'; break;
        default: rank = '<span style="rank-num" class="mcmodder-common-light">#' + (Number(r) + 1) + '</span>';
      }
      div.html(`
        <p class="name">
          ${rank}
          <a class="me" href="${href}" target="_blank">
            ${userName + ((userName === this.parent.currentUsername) ? " (我)" : "")}
          </a>
          (${rate}%) 
        </p>
        <div class="progress" style="width: 100%; height: 20px; position:relative">
          <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${rate / maxValue * 100.0}%;">
            <span class="quantity">${quantity}</span>
          </div>
        </div>`
      );
      if (userName === this.parent.currentUsername) div.find("a").first().css("color", "red");
      totalValue += parseInt(quantity.split(" B")[0].replace(",", ""));
    }
    $("ul", contentRank).first().remove();
    return { value: totalValue, rate: totalRate };
  }

  run() {
    McmodderUtils.addStyle(".rank-list-block li {width: auto; display: block; margin: 6px} .progress-bar {background-color: gold; color: black} .progress {border-radius: .0rem}");

    const total1 = this.work($(".rank-list-block").eq(0));
    const total2 = this.work($(".rank-list-block").eq(1));
    if (total1.value || total2.value) {
      $("<span>")
      .appendTo(".rank-list-frame")
      .attr("class", "mcmodder-golden-alert")
      .html(`全体百科用户在 ${$(".rank-search-area .badge-secondary").first().text()} 累计贡献了` +
        (total2.value ? `约 <span class="mcmodder-common-dark">${Math.round(total2.value * 100 / total2.rate).toLocaleString()}</span> 次` : "") + 
        (total1.value ? `共约 <span class="mcmodder-common-dark">${Math.round(total1.value * 100 / total1.rate).toLocaleString()}</span> 字节` : "") + 
        "的编辑量！");
    }
    $(".popover").remove();

    // setTimeout(commentInit, 1e3);

    // 保存贡献数据
    if (this.parent.utils.getConfig("byteChart")) {
      let param = new URLSearchParams(window.location.search);
      let startTime = McmodderUtils.getStartTime(Math.floor(Number(param.get("starttime")) * 1e3), 0) / 1e3;
      let endTime = McmodderUtils.getStartTime(Math.floor(Number(param.get("endtime")) * 1e3), 0) / 1e3;
      let minimumRequestInterval = this.parent.utils.getConfig("minimumRequestInterval") || 750;
      if (!(startTime && endTime)) return;
      let getRankData = (t: number) => {
        if (this.parent.utils.getConfig((t - 24 * 60 * 60).toString(), "rankData")) return; // 一天误差
        this.parent.utils.createRequest({
          url: `https://www.mcmod.cn/rank.html?starttime=${t}&endtime=${t}`,
          method: "GET",
          headers: { "Content-Type": "text/html; charset=UTF-8" },
          onload: resp => {
            let rawData: UserRankRecordData[] = [];
            let d = $("<html>").html(resp.responseText.replaceAll("src=", "data-src="));
            d.find(".rank-list-block:nth-child(1) li").each((_, e) => {
              rawData.push({
                value: Number($(e).attr("data-content").split("字节")[0].replaceAll(",", "")),
                user: Number($("a", e).attr("href").split("center.mcmod.cn/")[1].split("/")[0])
              });
            });
            let data = JSON.stringify(rawData);
            this.parent.utils.setConfig(t - 24 * 60 * 60, data, "rankData");
            McmodderUtils.commonMsg(`成功保存${ McmodderUtils.getFormattedChineseDate(new Date((t - 24 * 60 * 60) * 1e3)) }的贡献数据~ (${ McmodderUtils.getFormattedSize(data.length) })`);
          }
        });
        if (t <= Math.min(endTime, Date.now() / 1e3 - 24 * 60 * 60)) setTimeout(() => getRankData(t + 24 * 60 * 60), minimumRequestInterval);
      }
      getRankData(Math.max(startTime, 1496332800)); // 字节贡献从 2017-06-02 开始记录
    }
  }
}