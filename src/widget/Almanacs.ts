import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";

type AlmanacsData = {
  date: number,
  good: string[],
  bad: string[]
}
type AlmanacsPage = {
  almanacs: AlmanacsData,
  prevDate: number,
  nextDate: number
}

export class McmodderAlmanacs {
  parent: Mcmodder;
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  get(date: number) {
    const almanacsList: AlmanacsData[] = this.parent.utils.getAllConfig("almanacsList", []);
    let almanacs: AlmanacsData | undefined, prevDate: number | undefined, nextDate: number | undefined;
    almanacsList.forEach((e, i) => {
      if (e.date === date) almanacs = e, prevDate = almanacsList[i - 1]?.date, nextDate = almanacsList[i + 1]?.date;
    })
    if (!almanacs && date === McmodderUtils.getStartTime(new Date(), 0)) this.parent.utils.createRequest({
      url: "https://www.mcmod.cn/tools/almanacs",
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      anonymous: true,
      onload: resp => {
        let almanacs: AlmanacsData = {
          date: date,
          good: [],
          bad: []
        }
        if (!resp.responseXML) {
          console.error("Error loading almanac data for today...");
          return;
        };
        let d = $(resp.responseXML);
        d.find(".good .block").each((_, c) => {almanacs.good.push($(c).find(".title").text(), $(c).find(".text").text())});
        d.find(".bad .block").each((_, c) => {almanacs.bad.push($(c).find(".title").text(), $(c).find(".text").text())});
        almanacsList.push(almanacs);
        this.parent.utils.setAllConfig("almanacsList", almanacsList);
        this.get(date);
      }
    });
    else if (almanacs) this.render({
      almanacs: almanacs,
      prevDate: prevDate || 0,
      nextDate: nextDate || 0
    });
  }

  render(data: AlmanacsPage) {
    const almanacsBlock = $(".mcmodder-almanacs");
    const goods = almanacsBlock.find(".good"), bads = almanacsBlock.find(".bad"), title = almanacsBlock.find(".title").first();
    goods.empty(), bads.empty(), title.find(".more").empty();
    title.find("a.date").html(`${ McmodderUtils.getFormattedChineseDate(new Date(data.almanacs.date)) }运势`);
    if (data.prevDate) $('<a>←</a>').appendTo(title.find(".more")).click(() => this.get(data.prevDate));
    if (data.nextDate) $('<a>→</a>').appendTo(title.find(".more")).click(() => this.get(data.nextDate));
    for (let i = 0; i < data.almanacs.good.length; i += 2) goods.append(`<div class="block"><div class="title">${ data.almanacs.good[i] }</div><div class="text">${ data.almanacs.good[i + 1] }</div></div>`);
    for (let i = 0; i < data.almanacs.bad.length; i += 2) bads.append(`<div class="block"><div class="title">${ data.almanacs.bad[i] }</div><div class="text">${ data.almanacs.bad[i + 1] }</div></div>`);
    $('<span class="mcmodder-mold-num">宜</span>').appendTo(goods);
    $('<span class="mcmodder-mold-num">忌</span>').appendTo(bads);
    $(".mcmodder-mold-num").each((_, c) => {$(c).css("color", $(c).parent().css("color"))})
  }
}