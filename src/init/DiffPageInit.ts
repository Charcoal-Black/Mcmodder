import { OredictCompareFrame } from "../widget/compare/OredictCompareFrame";
import { PlatformCompareFrame } from "../widget/compare/PlatformCompareFrame";
import { RelationCompareFrame } from "../widget/compare/RelationCompareFrame";
import { TextCompareFrame } from "../widget/compare/TextCompareFrame";
import { McmodderInit } from "./Init";

export class DiffPageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/diff/") &&
      !this.parent.href.includes("/list/");
  }
  run() {
    const textA = $(".difference-content-right");
    const textB = $(".difference-content-left");
    (new TextCompareFrame($(".difference-info").first(), textA, textB)).performCompare();

    $(".difference-table > tbody").contents().each((_, e) => {
      const row = $(e);
      const rowText = e.firstChild?.textContent;
      if (!rowText) return;
      else if (rowText === "模组关系") {
        const prev = row.find("td:nth-child(3) span");
        const next = row.find("td:nth-child(2) span");
        RelationCompareFrame.performCompare(prev, next);
      }
      else if (rowText === "支持MC版本") {
        const prev = row.find("td:nth-child(3) span");
        const next = row.find("td:nth-child(2) span");
        PlatformCompareFrame.performCompare(prev, next);
      }
      else if (rowText === "矿物词典") {
        const prev = row.find("td:nth-child(3) span");
        const next = row.find("td:nth-child(2) span");
        OredictCompareFrame.performCompare(prev, next);
      }
    });
  }
}