import { InputSuccessfulChangeCallBack, InputValueNumericRange } from "../../types";
import { McmodderInput } from "./Input";

export class McmodderNumberInput extends McmodderInput<number> {
  private static readonly emptyRange: InputValueNumericRange = [null, null];
  protected readonly range: InputValueNumericRange;

  constructor(title: string, value: number, range: InputValueNumericRange | undefined, onSuccessfulChange: InputSuccessfulChangeCallBack<number>) {
    super(title, value, onSuccessfulChange);
    this.range = range || McmodderNumberInput.emptyRange;
    if (this.range[0] != null && this.range[1] != null && this.range[1] <= this.range[0]) {
      throw new Error("范围右端点须大于左端点。");
    }
  }

  protected getInstanceHTML() {
    return $(`
      <div class="mcmodder-numberinput-container">
        <input class="form-control" placeholder="${ this.title }..">
      </div>
    `);
  }

  override getInputNode() {
    return this.instance.find("input");
  }

  override getCurrentValue() {
    return Number(this.getInputNode().val());
  }

  override setDisplayValue(value: number) {
    this.getInputNode().val(Number(Number(value).toFixed(10)));
  }

  protected override checkIsValid(newValue: number) {
    const min = this.range[0] === null ? NaN : this.range[0];
    const max = this.range[1] === null ? NaN : this.range[1];
    if (isNaN(newValue)) return { isok: false, msg: `请输入一个正确的数值~` }; 
    if (newValue === this.value) return { isok: false };
    if (!isNaN(min) && newValue < min) return { isok: false, msg: `您输入的数值 (${ newValue }) 低于允许的最小值 (${ min })，请重新设置~` };
    if (!isNaN(max) && newValue > max) return { isok: false, msg: `您输入的数值 (${ newValue }) 高于允许的最大值 (${ max })，请重新设置~` };
    return { isok: true, final: newValue };
  }
}