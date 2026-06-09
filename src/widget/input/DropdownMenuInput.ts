import { InputSuccessfulChangeCallBack, InputValueSet } from "../../types";
import { McmodderInput } from "./Input";

export class McmodderDropdownInput extends McmodderInput<number> {

  protected readonly range: InputValueSet;

  protected getInstanceHTML() {
    return $(`<select class="selectpicker">`);
  }

  override getCurrentValue() {
    return Number(this.instance.val());
  }

  override setDisplayValue(value: number) {
    this.instance.selectpicker("val", value.toString());
  }

  protected override checkIsValid(newValue: number) {
    if (Object.keys(this.range).map(Number).includes(newValue)) return {
      isok: true,
      final: newValue
    };
    return {
      isok: false,
      msg: "你干~~嘛~~~哈哈哎~哟。"
    };
  }

  override getInstance() {
    return super.getInstance().parent();
  }

  constructor(title: string, value: number, range: InputValueSet, onSuccessfulChange: InputSuccessfulChangeCallBack<number>) {
    super(title, value, onSuccessfulChange);
    this.range = range;
    Object.keys(this.range).forEach(key => {
      const num = Number(key);
      const option = $(`<option>`).attr("value", key);
      let content = this.range[num];
      // if (this.value === num) content += " (默认)";
      option.html(content).appendTo(this.instance);
    });
    this.setDisplayValue(this.value);
  }
}