import { TextCompareMode } from "./types";
import { McmodderUtils } from "./Utils";
import { McmodderValues } from "./Values";

export class TextCompareFrame {
  insertPos: Element | JQuery;
  instance: JQuery;
  statsNode: JQuery;
  delCounter: JQuery;
  insCounter: JQuery;
  resultFrame: JQuery;
  textA: string;
  textB: string;
  isReady?: boolean;

  constructor(insertPos: Element | JQuery, textA: JQuery | string, textB: JQuery | string) {
    this.insertPos = insertPos;
    this.instance = $('<div id="mcmodder-text-area">').insertBefore(this.insertPos);
    this.statsNode = $('<div class="mcmodder-text-stats">').appendTo(this.instance);
    this.delCounter = $('<span class="stats-del">').hide().appendTo(this.statsNode);
    this.insCounter = $('<span class="stats-ins">').hide().appendTo(this.statsNode);
    this.resultFrame = $('<pre id="mcmodder-text-result">').appendTo(this.instance);

    this.textA = (textA instanceof Object) ? this.getRawContent(textA as JQuery) : textA;
    this.textB = (textB instanceof Object) ? this.getRawContent(textB as JQuery) : textB;

    /*
    if ($(".verify-info-table").length) {
      let textTr = $(".verify-info-table > tbody").contents().filter((i, c) => $(c).children().text().includes("介绍"));
      text_a = textTr.find("td:nth-child(3) .common-text");
      text_b = textTr.find("td:nth-child(2) .common-text");
    } else if ($(".difference-info").length) {
      text_a = $(".difference-content-right");
      text_b = $(".difference-content-left");
    } else if ($(".edit-user-alert.locked").length) {
      text_a = ta;
      text_b = tb;
    }
    if (text_a && text_b) {
      compareResult.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    }
    */
  }

  getRawContent(l: JQuery) {
    let s = "";
    l.contents().filter((_, c) =>
      !/^[\s\n]*$/.test(c.textContent) &&
      c.tagName != "SCRIPT" &&
      c.className != "common-text-menu" &&
      c.className != "common-tag-ban"
    ).each((_, e) => {
      s += (e.textContent + "\n")
    });
    return s;
  }

  getDefaultMode(len1: number, len2: number): TextCompareMode {
    if (len1 + len2 > 5e4) return "diffLines";
    if (len1 + len2 > 1.5e4) return "diffWords";
    return "diffChars";
  }

  static modeName: Record<TextCompareMode, string> = {
    "diffLines": "按行对比",
    "diffWords": "按词对比",
    "diffChars": "按字对比"
  }

  async ready() {
    if (this.isReady) return;
    await McmodderUtils.loadScript(document.head, undefined, McmodderValues.assets.js.jsdiff);
    this.isReady = true;
  }

  async performCompare() {

    this.resultFrame.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    await this.ready();

    let mode = this.getDefaultMode(this.textA.length, this.textB.length);
    let diff = JsDiff[mode](this.textA, this.textB); // 避免正文对比耗费过长的时间
    let del_num = 0, ins_num = 0, del_byte = 0, ins_byte = 0;

    let fragment = document.createDocumentFragment();
    for (let _i in diff) {
      const i = Number(_i);
      if (diff[i].added && diff[i + 1] && diff[i + 1].removed) {
        let swap = diff[i];
        diff[i] = diff[i + 1];
        diff[i + 1] = swap;
      }

      let node;
      if (diff[i].removed) {
        node = document.createElement('del');
        node.appendChild(document.createTextNode(diff[i].value));
        del_num++; del_byte += (new TextEncoder()).encode(node.textContent).length;
      } else if (diff[i].added) {
        node = document.createElement('ins');
        node.appendChild(document.createTextNode(diff[i].value));
        ins_num++; ins_byte += (new TextEncoder()).encode(node.textContent).length;
      } else {
        node = document.createTextNode(diff[i].value);
      }
      fragment.appendChild(node);
    }

    this.resultFrame.empty().text("");
    if (del_num || ins_num) this.resultFrame.get(0).appendChild(fragment);
    else {
      this.instance.hide();
      return;
    }
    if (del_num) this.delCounter.html(`<span class="mcmodder-slim-danger">删除: <strong>${ del_num.toLocaleString() }</strong> 处 (<strong>${ del_byte.toLocaleString() }</strong> 字节)</span>`).show();
    if (ins_num) this.insCounter.html(`<span class="mcmodder-slim-dark">新增: <strong>${ ins_num.toLocaleString() }</strong> 处 (<strong>${ ins_byte.toLocaleString() }</strong> 字节)</span>`).show();
    if (mode != "diffChars") $(`<span class="mcmodder-jsdiff-nodiffbytes">*正文过长，将${TextCompareFrame.modeName[mode]}而非${TextCompareFrame.modeName["diffChars"]}，以节省性能~</span>`).appendTo(this.statsNode);
  }
}