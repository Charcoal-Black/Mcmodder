import { createApp } from "vue";
import { Utils } from "../Utils";
import { Values } from "../Values";
import JsonHelper from "../vue/components/JsonHelper.vue";
import { Init } from "./Init";

export class JsonHelperInit extends Init {
  canRun() {
    return !!(
      this.parent.href === `${this.parent.hostname}/mcmodder/jsonhelper/` &&
      this.configs.getSettings("enableJsonHelper")
    );
  }
  async run() {
    const pageName = "JSON导入辅助";
    this.parent.title = pageName;
    $(".common-nav .item").html(pageName);
    $(".search-frame, .eat-frame, .info-frame").remove();

    // await Utils.loadScript(document.head, null, Values.assets.mcmod.js.bootstrap);
    // await Utils.loadScript(document.head, null, Values.assets.mcmod.js.bootstrapSelect);
    await Utils.loadScript(document.head, null, Values.assets.mcmod.js.sortable);
    await Utils.loadScript(document.head, null, Values.assets.mcmod.js.tableSorter);
    // $(`<link type="text/css" href="${ Values.assets.mcmod.css.bootstrapSelect }" rel="stylesheet">`).appendTo("head");

    const container = $("<div>").appendTo(".center");
    createApp(JsonHelper, {
      parent: this.parent,
    }).mount(container.get(0));
  }
}
