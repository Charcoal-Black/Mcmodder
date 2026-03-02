import { McmodderInit } from "./Init";

export class SandboxInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/sandbox/");
  }
  run() {
    $(".left").remove();
    $(".right").css("padding-left", 0);
  }
}