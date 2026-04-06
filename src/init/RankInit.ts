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
    const ranklist = $(`<div class="mcmodder-ranklist-container">`).appendTo(contentRank);
    const maxValue = parseFloat(contentList.first().find("span.score").text());
    let totalValue = 0, totalRate = 0, r = 0;
    for (const _i in contentList.toArray()) {
      const i = Number(_i);
      const e = contentList.eq(i);
      const href = e.find("a").first().prop("href");
      const uid = McmodderUtils.abstractIDFromURL(href, "center.mcmod.cn");
      let li = $(`<li data-uid="${ uid }">`).appendTo(ranklist), rank = null;

      let quantity = e.attr("data-content");
      if (quantity.includes("字节")) {
        quantity = quantity.replace("字节", " B")
        .replace('(约', '<span class="muted">(~')
        .replace("个汉字)", "汉字)</span>");
      } else {
        quantity = quantity.replace("次", " 次");
      }

      const rate = parseFloat(e.find("span.score").text());
      totalRate += isNaN(rate) ? 0 : rate;
      let userName = e.find("a.name").text();

      let div = $('<a class="avatar" target="_blank">').attr("href", href).appendTo(li);
      $(`<i>`).appendTo(div).css({
        "background-image": `url("${e.find("img").attr("src")}")`
      });
      div = $(`<div class="content">`).appendTo(li);
      if (i > 0 && e.attr("data-content") != contentList.eq(i - 1).attr("data-content")) r = i;
      switch (Number(r)) {
        case 0: rank = '<i class="fa fa-trophy trophy gold" />'; break;
        case 1: rank = '<i class="fa fa-trophy trophy silver" />'; break;
        case 2: rank = '<i class="fa fa-trophy trophy bronze" />'; break;
        default: rank = `<span class="rank-num mcmodder-common-dark">#${ Number(r) + 1 }</span>`;
      }
      div.html(`
        <p class="name">
          ${ rank }
          <a class="me" href="${ href }" target="_blank" data-toggle="tooltip" data-original-title="${ userName }">
            ${ userName + ((userName === this.parent.currentUsername) ? " (我)" : "") }
          </a>
          (${ isNaN(rate) ? 0 : rate }%) 
        </p>
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${ rate / maxValue * 100.0 }%;">
            <span class="quantity">${ quantity }</span>
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
    const ranklists = $(".rank-list-block");
    const total1 = this.work(ranklists.eq(0).addClass("edit-byte"));
    const total2 = this.work(ranklists.eq(1).addClass("edit-num"));
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

    ranklists.on("mouseenter", "li", e => {
      const uid = $(e.currentTarget).attr("data-uid");
      const result = ranklists.find(`[data-uid=${ uid }]`);
      if (result.length > 1) result.addClass("hover");
    })
    .on("mouseleave", "li", _e => {
      ranklists.find(".hover").removeClass("hover");
    })
  }
}