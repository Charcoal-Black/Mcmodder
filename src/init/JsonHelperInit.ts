import { ItemJsonFrame } from "../jsonframe/ItemJsonFrame";
import { RecipeJsonFrame } from "../jsonframe/RecipeJsonFrame";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";

export class JsonHelperInit extends McmodderInit {
  canRun() {
    return this.parent.href === "https://www.mcmod.cn/mcmodder/jsonhelper/" && 
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

    $(`<div id="mcmodder-itemjson-container">
        <div class="common-text">
          <span class="mcmodder-subtitle">物品JSON管理</span>
          <div id="mcmodder-json-compare-frame"></div>
        </div>
      </div>`).appendTo(".center");
    const itemJsonFrame = new ItemJsonFrame("itemjsonframe", this.parent);
    itemJsonFrame.$instance.appendTo("#mcmodder-itemjson-container");

    $(`<div id="mcmodder-recipejson-container">
        <div class="common-text">
          <span class="mcmodder-subtitle">合成表JSON管理</span>
          <div id="mcmodder-json-compare-frame"></div>
        </div>
      </div>`).appendTo(".center");
    const recipeJsonFrame = new RecipeJsonFrame("recipejsonframe", this.parent);
    recipeJsonFrame.$instance.appendTo("#mcmodder-recipejson-container");
  }
}