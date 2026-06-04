import { InputSuccessfulChangeCallBack } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderInput } from "./Input";

export class McmodderCheckboxInput extends McmodderInput<boolean> {
  private readonly id: string;
  private readonly withLabel: boolean;
  private readonly withTooltip: string | undefined;

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

  override getInputNode() {
    return this.instance.children().first();
  }

  protected override getEventType() {
    return "click";
  }

  override getCurrentValue() {
    return !!this.getInputNode().prop("checked");
  }

  override setDisplayValue(value: boolean) {
    this.getInputNode().prop("checked", value);
  }

  protected override checkIsValid(newValue: boolean) {
    if (newValue !== this.value) return { isok: true, final: !!newValue };
    return { isok: false };
  }

  click() {
    this.getInputNode().click();
  }

  constructor(title: string, value: boolean, onSuccessfulChange: InputSuccessfulChangeCallBack<boolean>, id?: string, withLabel?: boolean, withTooltip?: string) {
    super(title, value, onSuccessfulChange);
    this.id = id || McmodderUtils.randStr(8);
    this.withLabel = !!withLabel;
    this.withTooltip = withTooltip;
    this.getInputNode().attr({
      "id": `settings-${ this.id }`,
      "data-id": this.id
    });
    if (this.withLabel) {
      this.instance.append(`<label for="settings-${ this.id }">${ this.title }</label>`);
    }
    if (this.withTooltip) {
      this.instance.attr({
        "data-toggle": "tooltip",
        "data-original-title": withTooltip
      });
      this.instance.tooltip();
    }
  }
}