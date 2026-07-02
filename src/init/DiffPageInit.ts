import { RelationCompareFrame } from "../widget/RelationCompareFrame";
import { TextCompareFrame } from "../widget/TextCompareFrame";
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
    });
  }
}