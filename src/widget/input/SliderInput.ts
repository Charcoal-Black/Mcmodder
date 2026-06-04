import { InputSuccessfulChangeCallBack, InputValueNumericRange } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderNumberInput } from "./NumberInput";

export class McmodderSliderInput extends McmodderNumberInput {
  private readonly sliderContainer: JQuery;
  private readonly sliderBar: JQuery;
  private readonly sliderBarElement: HTMLElement;
  private readonly sliderTap: JQuery;
  private readonly sliderTapElement: HTMLElement;
  private readonly precision;
  private dragOffset = -1;
  private dragging = false;
  declare protected readonly range: [number, number];

  private getDefaultPrecision() {
    if (this.range[1] - this.range[0] == 1) return 0.01;
    return 1;
  }

  private getBarLeftPos() {
    return this.sliderBarElement.getBoundingClientRect().left;
  }

  private getTapCenterPos() {
    return this.sliderTapElement.getBoundingClientRect().left - this.getBarLeftPos() + this.getTapWidth() / 2;
  }

  private getBarWidth() {
    return this.sliderBarElement.getBoundingClientRect().width;
  }

  private getTapWidth() {
    return this.sliderTapElement.getBoundingClientRect().width;
  }

  constructor(title: string, value: number, range: InputValueNumericRange | undefined, onSuccessfulChange: InputSuccessfulChangeCallBack<number>) {
    super(title, value, range, onSuccessfulChange);
    if (this.range[0] == null || this.range[1] == null) {
      throw new Error("范围两端点必须存在。");
    }
    // if (precision == 0 || !isFinite(precision)) {
    //   throw new Error("精度过大或过小。");
    // }
    this.sliderContainer = $(`<div class="mcmodder-slider-container">`).appendTo(this.instance);
    this.sliderBar = $(`<div class="mcmodder-slider-bar">`).appendTo(this.sliderContainer);
    this.sliderBarElement = this.sliderBar.get(0) as HTMLElement;
    this.sliderTap = $(`<div class="mcmodder-slider-tap">`).appendTo(this.sliderBar);
    this.sliderTapElement = this.sliderTap.get(0) as HTMLElement;
    this.precision = this.getDefaultPrecision();

    this.sliderTap.mousedown(e => {
      this.dragging = true;
      this.dragOffset = e.screenX - this.getTapCenterPos() - this.getBarLeftPos();
      this.sliderTap.addClass("focus");
      e.stopPropagation();
    });
    this.sliderBar.mousedown(e => {
      this.dragging = true;
      this.dragOffset = 0;
      this.sliderTap.addClass("focus");
      this.onBarMousemove(e);
    })
    .mousemove(e => {
      this.onBarMousemove(e);
    })
    .mouseup(_e => {
      this.onBarMouseup();
    });
  }

  private onBarMousemove(e: JQueryMouseEventObject) {
    if (!this.dragging) return;
    e.preventDefault();
    const dragPos = e.screenX + this.dragOffset - this.getBarLeftPos();
    const rate = McmodderUtils.clamp(dragPos / this.getBarWidth());
    const rawValue = this.range[0] + (this.range[1] - this.range[0]) * rate;
    const value = Math.round(rawValue / this.precision) * this.precision;
    this.setDisplayValue(value);
  }

  private onBarMouseup() {
    if (!this.dragging) return;
    this.dragging = false;
    const currentValue = this.getCurrentValue();
    if (currentValue != this.value) {
      this.onChange(currentValue);
    }
    this.sliderTap.removeClass("focus");
  }

  override setDisplayValue(value: number) {
    super.setDisplayValue(value);
    if (this.range == null) {
      setTimeout(() => this.setDisplayValue(value), 0);
    }
    else {
      const rate = McmodderUtils.clamp((value - this.range[0]) / (this.range[1] - this.range[0]));
      this.sliderTap.css("left", `${ rate * 100 }%`);
    }
  }
}