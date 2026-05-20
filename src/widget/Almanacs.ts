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
  private readonly parent: Mcmodder;
  private readonly instance: JQuery;
  private readonly goods: JQuery;
  private readonly bads: JQuery;
  private readonly title: JQuery;
  private readonly date: JQuery;
  private readonly more: JQuery;
  private readonly prevButton: JQuery;
  private readonly nextButton: JQuery;
  private prevDate = -1;
  private nextDate = -1;

  constructor(parent: Mcmodder) {
    this.parent = parent;

    this.instance = $(`
      <div class="news_block mcmodder-almanacs">
        <div class="title-container">
          <i class="icon"></i>
          <span class="title">今日运势</span>
          <a href="/tools/almanacs" target="_blank"></a>
          <span class="date badge"></span>
          <div class="more">
            <a>←</a>
            <a>→</a>
          </div>
        </div>
        <div class="content">
          <div class="good"></div>
          <div class="bad"></div>
        </div>
      </div>
    `);

    this.goods = this.instance.find(".good");
    this.bads = this.instance.find(".bad");
    this.title = this.instance.find(".title-container").first();
    this.date = this.title.find(".date");
    this.more = this.title.find(".more");
    this.prevButton = this.more.children().first();
    this.nextButton = this.more.children().last();

    this.prevButton.click(() => this.get(this.prevDate));
    this.nextButton.click(() => this.get(this.nextDate));
  }

  getInstance() {
    return this.instance;
  }

  async get(date: number) {
    const almanacsList: AlmanacsData[] = this.parent.utils.getAllConfig("almanacsList", []);
    let almanacs: AlmanacsData | undefined, prevDate: number | undefined, nextDate: number | undefined;
    almanacsList.forEach((e, i) => {
      if (e.date === date) {
        almanacs = e;
        prevDate = almanacsList[i - 1]?.date;
        nextDate = almanacsList[i + 1]?.date;
      }
    })
    if (!almanacs && date === McmodderUtils.getStartTime(new Date(), 0)) {
      const resp = await this.parent.utils.createRequest({
        url: `${ this.parent.hostname }/tools/almanacs`,
        method: "GET",
        headers: { "Content-Type": "text/html; charset=UTF-8" },
        anonymous: true
      });
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
      d.find(".good .block").each((_, c) => {
        almanacs.good.push($(c).find(".title").text(), $(c).find(".text").text());
      });
      d.find(".bad .block").each((_, c) => {
        almanacs.bad.push($(c).find(".title").text(), $(c).find(".text").text());
      });
      almanacsList.push(almanacs);
      this.parent.utils.setAllConfig("almanacsList", almanacsList);
      this.get(date);
    }
    else if (almanacs) this.render({
      almanacs: almanacs,
      prevDate: prevDate || 0,
      nextDate: nextDate || 0
    });
  }

  render(data: AlmanacsPage) {
    this.goods.empty();
    this.bads.empty();
    this.date.text(McmodderUtils.getFormattedChineseDate(new Date(data.almanacs.date)));
    this.prevDate = data.prevDate;
    this.nextDate = data.nextDate;
    if (data.prevDate) this.prevButton.show();
    else this.prevButton.hide();
    if (data.nextDate) this.nextButton.show();
    else this.nextButton.hide();
    if (!data.almanacs.good.length) {
      this.goods.append(`<div class="empty"></div>`);
    }
    else for (let i = 0; i < data.almanacs.good.length; i += 2) {
      this.goods.append(`<div class="block"><div class="title">${
        data.almanacs.good[i]
      }</div><div class="text">${
        data.almanacs.good[i + 1]
      }</div></div>`);
    }
    if (!data.almanacs.bad.length) {
      this.bads.append(`<div class="empty"></div>`);
    }
    else for (let i = 0; i < data.almanacs.bad.length; i += 2) {
      this.bads.append(`<div class="block"><div class="title">${
        data.almanacs.bad[i]
      }</div><div class="text">${
        data.almanacs.bad[i + 1]
      }</div></div>`);
    }
    $('<span class="mcmodder-mold-num">宜</span>').appendTo(this.goods);
    $('<span class="mcmodder-mold-num">忌</span>').appendTo(this.bads);
    $(".mcmodder-mold-num").each((_, c) => {
      $(c).css("color", $(c).parent().css("color"));
    });
  }
}