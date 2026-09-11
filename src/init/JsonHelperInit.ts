import { createApp } from "vue";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import JsonHelper from "../vue/components/JsonHelper.vue";
import { McmodderInit } from "./Init";

export class JsonHelperInit extends McmodderInit {
  canRun() {
    return this.parent.href === `${ this.parent.hostname }/mcmodder/jsonhelper/` && 
      this.parent.utils.getConfig("enableJsonHelper");
  }
  async run() {
    const pageName = "JSON导入辅助";
    this.parent.title = pageName;
    $(".common-nav .item").html(pageName);
    $(".search-frame, .eat-frame, .info-frame").remove();

    // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrap);
    // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrapSelect);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.sortable);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.tableSorter);
    // $(`<link type="text/css" href="${ McmodderValues.assets.mcmod.css.bootstrapSelect }" rel="stylesheet">`).appendTo("head");

    const container = $("<div>").appendTo(".center");
    createApp(JsonHelper, {
      parent: this.parent
    }).mount(container.get(0));
  }
}