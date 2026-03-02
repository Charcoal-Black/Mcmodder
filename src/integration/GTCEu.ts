import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class GTCEuEnergyRecipe {
  EUt: number;
  duration: number;
  tier: GTVTier;

  constructor(EUt = 0, duration = 0) {
    this.EUt = EUt;
    this.duration = duration;
    this.tier = GTCEu.getTierByVoltage(this.EUt);
  }

  copy() {
    return new GTCEuEnergyRecipe(this.EUt, this.duration);
  }
}

export const enum GTVTier {
  ULV,
  LV,
  MV,
  HV,
  EV,
  IV,
  LuV,
  ZPM,
  UV,
  UHV,
  UEV,
  UIV,
  UXV,
  OpV,
  MAX
}

export class GTCEu {
  static readonly voltageName = ["ULV", "LV", "MV", "HV", "EV", "IV", "LuV", "ZPM", "UV", "UHV", "UEV", "UIV", "UXV", "OpV", "MAX"];
  static readonly voltageColor = [8, 7, 11, 6, 5, 1, 13, 12, 3, 4, 2, 10, 14, 9, 12];

  static isVoltageBold(tier: GTVTier) {
    return tier >= GTVTier.OpV;
  }

  static getTierByVoltage(voltage: number): GTVTier {
    return Math.max(Math.min(Math.ceil(Math.log2(voltage) / 2 - 1.5), GTVTier.MAX), 0);
  }

  static getMaxVoltageByTier(tier: GTVTier) {
    return Math.pow(4, tier) * 8;
  }

  static getHTMLByVoltage(voltage: GTVTier) {
    let tier = this.getTierByVoltage(voltage);
    return `<span style="color: #${McmodderValues.formatColors[this.voltageColor[tier]]};${this.isVoltageBold(tier) ? " font-weight: bold;" : ""}">${this.voltageName[tier]}</span>`;
  }

  static getHTMLWithPercentageByVoltage(voltage: number) {
    let tier = this.getTierByVoltage(voltage);
    let percentage = McmodderUtils.getPrecisionFormatter().format(voltage / this.getMaxVoltageByTier(tier));
    return `${percentage}A${this.getHTMLByVoltage(voltage)}`;
  }

  static singleOverclock(recipe: GTCEuEnergyRecipe, isPerfect: boolean) {
    if (recipe.duration > 1) {
      let multiplier = isPerfect ? 0.25 : 0.5;
      recipe.EUt = recipe.EUt * 4;
      recipe.duration = Math.max(Math.floor(recipe.duration * multiplier), 1);
      recipe.tier++;
    }
  }

  static overclock(recipe: GTCEuEnergyRecipe, tierFrom: GTVTier, tierTo: GTVTier, isPerfect: boolean) {
    const usage = recipe.copy();
    for (let i = tierFrom; i < tierTo; i++) GTCEu.singleOverclock(usage, isPerfect);
    return usage;
  }
}