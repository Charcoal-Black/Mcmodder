import { McmodderUtils } from "../Utils";
import { GTCEu, GTCEuEnergyRecipe, GTVTier } from "./GTCEu";

export class GTCEuEnergyFrame {

  $instance: JQuery;
  instance: Element;
  powerNode?: Element;
  EUtNode?: Element;
  durationNode?: Element;
  powerName?: string;
  EUtName?: string;
  durationName?: string;
  recipe: GTCEuEnergyRecipe;
  usage: GTCEuEnergyRecipe;

  static readonly powerText = ["总耗电", "总能耗"];
  static readonly EUtText = ["消耗功率", "需求电压"];
  static readonly durationText = ["耗时"];

  constructor(node: Element) {
    this.$instance = $(node).first();
    this.instance = this.$instance.get(0);
    this.recipe = new GTCEuEnergyRecipe;

    let instance = this.$instance;
    instance.find("p").each((_, c) => {
      let t = c.textContent.split(/:|\uff1a/);
      let key = t[0];
      let value = parseFloat(t[1].replaceAll(",", ""));
      if (GTCEuEnergyFrame.powerText.includes(key)) {
         this.powerName = key;
         this.powerNode = c;
      }
      else if (GTCEuEnergyFrame.EUtText.includes(key)) {
        this.EUtName = key;
        this.EUtNode = c;
        this.recipe.EUt = value;
      }
      else if (GTCEuEnergyFrame.durationText.includes(key)) {
        this.durationName = key;
        this.durationNode = c;
        this.recipe.duration = Math.floor(value * 20);
      }
    });
    this.usage = this.recipe.copy();
    if (!(this.powerNode && this.EUtNode && this.durationNode)) return;
    this.$instance.attr({
      "data-toggle": "tooltip",
      "data-html": "true",
      "data-original-title": `
        最低: ${GTCEu.getHTMLByVoltage(this.recipe.EUt)}<br>
        左键单击增加超频等级<br>
        右键单击降低超频等级<br>
        按住Shift以无损超频显示`
    }).on({
      "click": e => {
        const isPerfect = McmodderUtils.isKeyMatch({ shiftKey: true }, e);
        const tier = Math.min(this.usage.tier + 1, GTVTier.MAX);
        this.update(tier, isPerfect);
      },
      "contextmenu": e => {
        e.preventDefault();
        const isPerfect = McmodderUtils.isKeyMatch({ shiftKey: true }, e);
        const tier = Math.max(this.usage.tier - 1, this.recipe.tier);
        this.update(tier, isPerfect);
      }
    })
    McmodderUtils.updateAllTooltip();

    this.update();
  }

  update(tier = GTCEu.getTierByVoltage(this.recipe.EUt), isPerfect = false) {
    this.usage = GTCEu.overclock(this.recipe, GTCEu.getTierByVoltage(this.recipe.EUt), tier, isPerfect);
    this.powerNode!.innerHTML = `${this.powerName}: ${(this.usage.EUt * this.usage.duration * 0.05).toLocaleString()} EU`;
    this.EUtNode!.innerHTML = `${this.EUtName}: ${this.usage.EUt.toLocaleString()} EU/t (${GTCEu.getHTMLWithPercentageByVoltage(this.usage.EUt)})`;
    this.durationNode!.innerHTML = `${this.durationName}: ${(this.usage.duration * 0.05).toLocaleString()} 秒`;
  }
}