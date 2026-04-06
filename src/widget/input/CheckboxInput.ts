import { InputSuccessfulChangeCallBack } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderInput } from "./Input";

export class McmodderCheckboxInput extends McmodderInput<boolean> {
  private readonly id: string;
  private readonly withLabel: boolean;

  getID() {
    return this.id;
  }
  
  protected override getInstanceHTML() {
    return $(
      `<div class="checkbox">
        <input type="checkbox">
      </div>`
    );
  }

  protected override getEventType() {
    return "click";
  }

  protected getCurrentValue() {
    return !!this.instance.children().first().prop("checked");
  }

  protected setDisplayValue(value: boolean) {
    this.instance.children().first().prop("checked", value);
  }

  protected override checkIsValid(newValue: boolean) {
    if (newValue !== this.value) return { isok: true, final: !!newValue };
    return { isok: false };
  }

  constructor(title: string, value: boolean, onSuccessfulChange: InputSuccessfulChangeCallBack<boolean>, id?: string, withLabel?: boolean) {
    super(title, value, onSuccessfulChange);
    this.id = id || McmodderUtils.randStr(8);
    this.withLabel = !!withLabel;
    this.instance.find("input").attr({
      "id": `settings-${ this.id }`,
      "data-id": this.id
    });
    if (this.withLabel) {
      this.instance.append(`<label for="settings-${ this.id }">${ this.title }</label>`);
    }
  }
}