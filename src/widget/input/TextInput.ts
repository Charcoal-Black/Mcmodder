import { InputSuccessfulChangeCallBack } from "../../types";
import { McmodderInput } from "./Input";

export class McmodderTextInput extends McmodderInput<string> {
  constructor(title: string, value: string, onSuccessfulChange: InputSuccessfulChangeCallBack<string>) {
    super(title, value, onSuccessfulChange);
  }

  protected getInstanceHTML() {
    return $(`
      <input class="form-control" placeholder="${ this.title }">
    `);
  }

  protected override checkIsValid(newValue: string) {
    if (this.value === newValue) return { isok: false };
    return { isok: true, final: newValue };
  }

  protected getCurrentValue() {
    return this.instance.val();
  }

  protected setDisplayValue(value: string) {
    this.instance.val(value);
  }
}