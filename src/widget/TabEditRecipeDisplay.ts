import { TabEditInit } from "../init/TabEditInit";
import { McmodderSimpleRecipeData } from "../types";
import { McmodderUtils } from "../Utils";
import { RecipeDisplay } from "./RecipeDisplay";

export class TabEditRecipeDisplay extends RecipeDisplay {
  protected readonly parsedRecipe: McmodderSimpleRecipeData;
  // protected readonly warningMessages: string[] = [];
  protected warningNode?: JQuery;

  constructor(tab: TabEditInit, recipe: McmodderSimpleRecipeData, parsedRecipe: McmodderSimpleRecipeData) {
    super(tab, recipe);
    this.parsedRecipe = parsedRecipe;

    const outputs = this.parsedRecipe.out_id || {};
    Object.keys(outputs).forEach(key => {
      if (tab.isOutputMatches(outputs[key])) {
        McmodderUtils.highlight(this.outputs[key].instance);
      }
    });

    let title = "";
    if (this.guiID < 1) {
      title = `<span class="mcmodder-slim-danger">该配方所使用的 GUI 尚未绑定到相应的 MC 百科 GUI...</span>`;
      this.arrow?.append(`<div class="mcmodder-recipe-error fa fa-warning">`)
    } else {
      title = `已绑定至 ID = <span class="mcmodder-slim-dark">${ this.guiID }</span>`
    }
    title += `<br><span class="mcmodder-item-regname mcmodder-monospace">${ this.recipe.gui_id }</span>`;
    this.arrow?.attr({
      "data-original-title": title,
      "data-html": true
    }).tooltip();
    
    this.instance.click(_e => {
      const t = strTableSlotFocus;
      strTableSlotFocus = ""; // 屏蔽原生点击事件
      this.write();
      setTimeout(() => {
        strTableSlotFocus = t;
      }, 100);
    });
  }

  private async write() {
    const writeSingle = (data: Record<string, string | number> | undefined, id: string) => {
      const all = this.tab.getTableInputElement(id).val("");
      if (!data) return;
      Object.keys(data).forEach(num => {
        all.filter(`[data-part=${ num }]`).val(data[num]);
      });
      all.change();
    }
    await this.tab.setGui(this.guiID === -1 ? 1 : this.guiID);
    writeSingle(this.parsedRecipe.in_id, "slot-in-item");
    writeSingle(this.parsedRecipe.in_num, "slot-in-number");
    writeSingle(this.parsedRecipe.in_chance, "slot-in-chance");
    writeSingle(this.parsedRecipe.out_id, "slot-out-item");
    writeSingle(this.parsedRecipe.out_num, "slot-out-number");
    writeSingle(this.parsedRecipe.out_chance, "slot-out-chance");
    writeSingle(this.parsedRecipe.power_num, "slot-power-number");
  }
}