import { createApp } from "vue";
import { Init } from "./Init";
import VersionHelper from "../vue/components/VersionHelper.vue";

export class VersionListInit extends Init {
  canRun() {
    return !(this.parent.href.includes("/version/add") || 
      this.parent.href.includes("/version/edit")) && 
      this.parent.href.includes("/class/version/")
  }
  run() {
    if (this.configs.getSettings("versionHelper")) {
      const container = $("<div>").insertBefore(".version-menu, .version-content-empty").get(0);
      createApp(VersionHelper, {
        parent: this.parent
      }).mount(container);
    }
  }
}