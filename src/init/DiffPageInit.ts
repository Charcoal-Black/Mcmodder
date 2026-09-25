import { createApp } from "vue";
import { OredictCompareFrame } from "../widget/compare/OredictCompareFrame";
import { PlatformCompareFrame } from "../widget/compare/PlatformCompareFrame";
import { RelationCompareFrame } from "../widget/compare/RelationCompareFrame";
import { Init } from "./Init";
import TextComparator from "../vue/components/TextComparator.vue";

export class DiffPageInit extends Init {
  canRun() {
    return this.parent.href.includes("/diff/") && !this.parent.href.includes("/list/");
  }
  run() {
    const textA = $(".difference-content-right");
    const textB = $(".difference-content-left");
    const comparatorFrame = $("<div>").insertBefore($(".difference-info").first());
    createApp(TextComparator, { textA, textB }).mount(comparatorFrame.get(0));

    $(".difference-table > tbody")
      .contents()
      .each((_, e) => {
        const row = $(e);
        const rowText = e.firstChild?.textContent;
        if (!rowText) return;
        else if (rowText === "模组关系") {
          const prev = row.find("td:nth-child(3) span");
          const next = row.find("td:nth-child(2) span");
          RelationCompareFrame.performCompare(prev, next);
        } else if (rowText === "支持MC版本") {
          const prev = row.find("td:nth-child(3) span");
          const next = row.find("td:nth-child(2) span");
          PlatformCompareFrame.performCompare(prev, next);
        } else if (rowText === "矿物词典") {
          const prev = row.find("td:nth-child(3) span");
          const next = row.find("td:nth-child(2) span");
          OredictCompareFrame.performCompare(prev, next);
        }
      });
  }
}
