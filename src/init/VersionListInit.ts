import { createApp } from "vue";
import { McmodderInit } from "./Init";
import VersionHelper from "../vue/components/VersionHelper.vue";

export class VersionListInit extends McmodderInit {
  canRun() {
    return !(this.parent.href.includes("/version/add") || 
      this.parent.href.includes("/version/edit")) && 
      this.parent.href.includes("/class/version/")
  }
  run() {
    if (this.parent.utils.getConfig("versionHelper")) {
      const container = $("<div>").insertBefore(".version-menu, .version-content-empty").get(0);
      createApp(VersionHelper, {
        parent: this.parent
      }).mount(container);
    }
  }
}