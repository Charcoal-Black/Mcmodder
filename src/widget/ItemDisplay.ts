import { McmodderMap } from "../Map";
import { McmodderItemData, McmodderItemList } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class ItemDisplay {
  private itemMap: McmodderMap<McmodderItemData>;
  private tagMap: McmodderMap<McmodderItemData>;
  private count = 1;
  private chance = 100;
  private id: string | string[];
  private matchList: Record<string, McmodderItemList | undefined> = {};
  private flattenedList: McmodderItemList = [];
  private HTMLSuffix = "";
  private displaying = 0;
  readonly instance = $(`<div class="mcmodder-item-display">`);
  readonly countNode = $(`<span class="count">`).appendTo(this.instance);
  readonly tagNode = $(`<span class="tag">`).appendTo(this.instance);
  readonly chanceNode = $(`<span class="chance">`).appendTo(this.instance);

  private setTooltip(data: McmodderItemData | undefined) {
    let title;
    if (data) {
      title = `<span class="mcmodder-slim-dark">${ data.id }</span> <span>${ data.name }</span>`;
      if (data.englishName) title += ` <span class="mcmodder-item-ename">(${ data.englishName })</span>`;
      if (data.registerName) title += `<br><span class="mcmodder-item-regname mcmodder-monospace">${ data.registerName }</span>`;
      if (data.className) title += `<br><span class="mcmodder-item-classname">${ data.className }</span>`;
    } else {
      title = `<span class="mcmodder-slim-danger">未知物品</span>`;
    }
    if (this.count >= 1e4) title += `<br><span class="mcmodder-item-localecount">数量: ${ this.count.toLocaleString() }</span>`
    else if (this.count === -1) title += `<br><span class="mcmodder-item-localecount">该原料在合成时不会损耗</span>`
    this.instance.attr({
      "data-toggle": "tooltip",
      "data-html": "true",
      "data-original-title": `${ title }<br>${ this.HTMLSuffix }`
    });
  }

  getHTML() {
    return this.instance.prop("outerHTML") as string;
  }

  private refreshItem() {
    const item = this.flattenedList[this.displaying];
    this.instance.css("background-image", `url(${ item ? item.smallIcon : McmodderValues.assets.mcmod.emptyItemIcon32x })`);
    this.setTooltip(item);
  }

  next() {
    if (!this.flattenedList.length) return;
    this.displaying++;
    if (this.displaying >= this.flattenedList.length) {
      this.displaying = 0;
    }
    this.refreshItem();
  }

  private getSingleIDMatchList(id: string) {
    const singleMatchList = id.charAt(0) === "#" ?
      this.tagMap.get(id.slice(1)) :
      this.itemMap.get(id);
    this.matchList[id] = singleMatchList;
    if (singleMatchList) {
      this.flattenedList = this.flattenedList.concat(singleMatchList);
    }
  }

  private generateHTMLSuffix() {
    const ids = Object.keys(this.matchList);
    if (this.flattenedList.length === 1) {
      this.HTMLSuffix = "";
      return;
    }
    this.HTMLSuffix = "支持下列任意物品：<br>";
    ids.forEach(id => {
      let str = `<span class="mcmodder-item-regname mcmodder-monospace">${ id }</span> - `;
      const matchList = this.matchList[id];
      if (!matchList || !matchList.length) {
        str += `<span class="mcmodder-slim-danger">匹配失败!</span>`;
      } else {
        matchList.forEach(data => {
          str += `<span class="mcmodder-slim-dark">${ data.id }</span> <span>${ data.name }</span>`;
          if (data.englishName) str += ` <span class="mcmodder-item-ename">(${ data.englishName })</span>; `;
        });
      }
      this.HTMLSuffix += `${ str }<br>`;
    });
  }

  refreshID() {
    this.matchList = {};
    this.flattenedList = [];
    this.displaying = 0;
    if (!(this.id instanceof Array)) {
      this.getSingleIDMatchList(this.id);
    }
    else this.id.forEach(id => {
      this.getSingleIDMatchList(id);
    });
    this.generateHTMLSuffix();
    this.refreshItem();
  }

  refreshCount() {
    let res = "";
    if (this.count < 0) {
      res = "无损";
      this.countNode.addClass("no-consumption");
    }
    else {
      this.countNode.removeClass("no-consumption");
      if (this.count != 1) res = McmodderUtils.getFormattedNumber(this.count);
      if (this.count >= 1e3) this.countNode.addClass("small");
      else this.countNode.removeClass("small");
    }
    this.countNode.text(res);
  }

  private refreshTag() {
    if (!this.id) return;
    let res = "";
    if (this.id instanceof Array) {
      res = "*";
    } else {
      const id = this.id;
      if (id.startsWith("#minecraft:")) res = "#M";
      else if (id.startsWith("#forge:")) res = "#F";
      else if (id.startsWith("#c:")) res = "#C";
      else if (id.charAt(0) === "#") res = "#";
    }
    this.tagNode.text(res);
  }

  refreshChance() {
    let res = "";
    if (this.chance < 100) {
      this.chanceNode.addClass("small");
      res = McmodderUtils.getPrecisionFormatter().format(this.chance) + "%";
    }
    this.chanceNode.text(res);
  }

  refresh() {
    this.refreshID();
    this.refreshCount();
    this.refreshTag();
    this.refreshChance();
  }

  constructor(itemMap: McmodderMap<McmodderItemData>, tagMap: McmodderMap<McmodderItemData>, id: string | string[], count = 1, chance = 100) {
    this.itemMap = itemMap;
    this.tagMap = tagMap;
    this.id = id;
    this.count = count;
    this.chance = chance;
    this.refresh();
  }
}