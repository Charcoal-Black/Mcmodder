import { Init } from "./Init";

export class SandboxInit extends Init {
  canRun() {
    return this.parent.href.includes("/sandbox/");
  }
  run() {
    $(".left").remove();
    $(".right").css("padding-left", 0);
  }
}