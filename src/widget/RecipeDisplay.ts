import { TabEditInit } from "../init/TabEditInit";
import { McmodderMap } from "../map/Map";
import { McmodderSimpleRecipeData, McmodderItemData, RecipeJsonFrameGuiBound } from "../types";
import { ItemDisplay } from "./ItemDisplay";

export class RecipeDisplay {
  protected readonly tab: TabEditInit;
  protected readonly recipe: McmodderSimpleRecipeData;
  protected readonly instance: JQuery;
  protected readonly itemMap: McmodderMap<McmodderItemData>;
  protected readonly tagMap: McmodderMap<McmodderItemData>;
  protected readonly guiBoundMap: McmodderMap<RecipeJsonFrameGuiBound>;
  protected readonly guiID: number;

  protected readonly inputs: Record<string, ItemDisplay> = {};
  protected readonly outputs: Record<string, ItemDisplay> = {};
  protected arrow?: JQuery;

  constructor(tab: TabEditInit, recipe: McmodderSimpleRecipeData) {
    this.tab = tab;
    this.recipe = recipe;
    this.itemMap = this.tab.itemMap;
    this.tagMap = this.tab.tagMap;
    this.guiBoundMap = this.tab.guiBoundMap;
    this.instance = $(`<div class="mcmodder-recipe-display"></div>`);
    this.guiID = this.guiBoundMap.getKeyOrDefault(this.recipe.gui_id, "mcmodID", -1);

    if (recipe.in_id) {
      Object.keys(recipe.in_id).forEach(key => {
        const id = recipe.in_id![key];
        const count = recipe.in_num ? recipe.in_num[key] : undefined;
        const chance = recipe.in_chance ? recipe.in_chance[key] : undefined;
        const itemDisplay = new ItemDisplay(this.itemMap, this.tagMap, id, count, chance)
        itemDisplay.instance.appendTo(this.instance);
        this.inputs[key] = itemDisplay;
      });
    } else {
      this.appendEmptyItem();
    }

    this.appendArrow();

    if (recipe.out_id) {
      Object.keys(recipe.out_id).forEach(key => {
        const id = recipe.out_id![key];
        const count = recipe.out_num ? recipe.out_num[key] : undefined;
        const chance = recipe.out_chance ? recipe.out_chance[key] : undefined;
        const itemDisplay = new ItemDisplay(this.itemMap, this.tagMap, id, count, chance);
        itemDisplay.instance.appendTo(this.instance);
        this.outputs[key] = itemDisplay;
      });
    } else {
      this.appendEmptyItem();
    }
  }

  getInstance() {
    return this.instance;
  }

  private appendEmptyItem() {
    const emptyItem = new ItemDisplay();
    emptyItem.instance.appendTo(this.instance);
  }

  private appendArrow() {
    this.arrow = $(`<span class="mcmodder-recipe-arrow">`);
    const spritePosition = this.getSpritePosition();
    if (spritePosition) {
      $(`<span class="mcmodder-tab-item-icon">`)
      .css({
        "background-position-x": -spritePosition[0] + "px",
        "background-position-y": -spritePosition[1] + "px"
      })
      .appendTo(this.arrow);
    }
    this.arrow.appendTo(this.instance);
  }

  private getSpritePosition(): [number, number] | null {
    switch (this.recipe.gui_id) {
      case "minecraft:crafting": return [0, 0]; // 工作台
      case "minecraft:smelting": return [34, 0]; // 熔炉
      case "minecraft:blasting": return [68, 0]; // 高炉
      case "minecraft:smoking": return [0, 34]; // 烟熏炉
      case "minecraft:campfire_cooking": return [34, 34]; // 营火
      case "minecraft:stonecutting": return [68, 34]; // 切石机
      case "minecraft:smithing": return [0, 68]; // 锻造台
      case "minecraft:brewing": return [34, 68]; // 酿造台
      case "emi:grinding": return [68, 68]; // 砂轮
    }
    return null;
  }
}