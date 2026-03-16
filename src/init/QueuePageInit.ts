import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class QueuePageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/queue.html");
  }
  run() {
    $(".table td:first-child()").css("background", "var(--mcmodder-color-background-transparent)");

    let t = $(".verify-queue-list-table tr")
    .filter((_, content) => $("a[rel=nofollow]", content).text() === this.parent.currentUsername).first();
    McmodderUtils.highlight(t, "gold", 2e3, true);
  }
}