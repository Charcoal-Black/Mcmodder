import { VersionHelper } from "../VersionHelper";
import { McmodderInit } from "./Init";

export class VersionListInit extends McmodderInit {
  canRun() {
    return !(this.parent.href.includes("/version/add") || 
      this.parent.href.includes("/version/edit")) && 
      this.parent.href.includes("/class/version/")
  }
  run() {
    if (this.parent.utils.getConfig("versionHelper")) {
      new VersionHelper(this.parent);
    }
  }
}