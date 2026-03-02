import { TextCompareFrame } from "../TextCompareFrame";
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
  }
}