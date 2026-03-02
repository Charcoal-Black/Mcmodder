import { McmodderUtils } from "../../Utils";

type DisplayRule = (val: number, min: number, max: number) => string;

export class ProgressBar {

  static DISPLAYRULE_PERCENT: DisplayRule = (val, min, max) => `${ McmodderUtils.getPrecisionFormatter(0, 0).format((val - min) / (max - min) * 100) }%`;
  static DISPLAYRULE_FRACTION: DisplayRule = (val, _min, max) => `${ val.toLocaleString() } / ${ max.toLocaleString() }`;

  // static GRADIENT_DERIVATOR_INSTANT = (x, y) => y - x;

  min: number;
  max: number;
  value: number;
  $bar: JQuery;
  $per: JQuery;
  $instance: JQuery;
  displayRule: DisplayRule;
  isVisible: boolean;

  constructor(value = 0, min = 0, max = 1, displayRule?: DisplayRule /*, gradientDerivator = ProgressBar.GRADIENT_DERIVATOR_INSTANT */ ) {
    this.value = Number(value);
    this.min = Number(min);
    this.max = Number(max);
    this.displayRule = displayRule || (this.max === 1 ? ProgressBar.DISPLAYRULE_PERCENT : ProgressBar.DISPLAYRULE_FRACTION);
    // this.gradientDerivator = gradientDerivator;
    this.isVisible = true;

    this.$instance = $(`
      <div class="mcmodder-progress">
        <div class="mcmodder-progress-bar" />
        <div class="mcmodder-progress-per" />
      </div>  
    `);
    this.$bar = this.$instance.find(".mcmodder-progress-bar");
    this.$per = this.$instance.find(".mcmodder-progress-per");

    this.setProgress(value);
  }

  update() {
    this.$bar.css("width", `${ this.max === 0 ? 0 : ((this.value - this.min) / (this.max - this.min) * 100) }%`);
    this.$per.html(this.displayRule(this.value, this.min, this.max));
  }

  setProgress(val: number) {
    if (!this.isVisible) this.show();
    this.value = Math.min(Math.max(this.min, val), this.max);
    this.update();
    return this;
  }

  setMax(max: number) {
    this.max = max;
    this.update();
    return this;
  }

  show() {
    this.isVisible = true;
    this.$instance.show();
    return this;
  }

  hide() {
    this.isVisible = false;
    this.$instance.hide();
    return this;
  }

}