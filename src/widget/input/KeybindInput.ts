import { InputSuccessfulChangeCallBack, McmodderKeyData } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderInput } from "./Input";

export class McmodderKeybindInput extends McmodderInput<McmodderKeyData> {

  private keyLastData?: McmodderKeyData;
  private keyQueue = 0;
  private keyFinished = false;

  constructor(title: string, value: McmodderKeyData, onSuccessfulChange: InputSuccessfulChangeCallBack<McmodderKeyData>) {
    super(title, value, onSuccessfulChange);
  }

  protected getInstanceHTML() {
    return $(`
      <input class="form-control mcmodder-keybind-input">
    `);
  }

  protected getCurrentValue() {
    return this.keyLastData || {};
  }

  protected setDisplayValue(value: McmodderKeyData) {
    this.instance.val(McmodderUtils.keyToString(value));
  }

  protected keybindOnFocus(_e: JQueryEventObject) {
    this.instance.val("");
    this.keyLastData = {};
    this.keyQueue = 0;
    this.keyFinished = false;
  }

  protected keybindOnKeydown(e: JQueryKeyEventObject) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === this.keyLastData?.key) return;
    if (e.key === "Escape") {
      this.instance.val(McmodderUtils.keyToString({}));
      this.instance.blur();
      return;
    }
    this.keyLastData = e;
    this.keyQueue++;
    this.instance.val(McmodderUtils.keyToString(e));
  }

  protected keybindOnKeyup(e: JQueryKeyEventObject) {
    e.preventDefault();
    if (--this.keyQueue) return;
    const d: McmodderKeyData = {}, r = this.keyLastData;
    if (!r) return;
    if (r.ctrlKey) d.ctrlKey = true;
    if (r.shiftKey) d.shiftKey = true;
    if (r.altKey) d.altKey = true;
    if (r.metaKey) d.metaKey = true;
    d.key = r.key;
    if (r.keyCode && r.keyCode >= 97 && r.keyCode <= 122) r.keyCode -= 32;
    d.keyCode = r.keyCode;
    this.onChange(d);
    this.keyFinished = true;
    this.instance.blur();
  }

  protected keybindOnBlur(e: JQueryEventObject) {
    e.preventDefault();
    if (this.keyFinished) return;
    if (!this.instance.val() || this.keyQueue) {
      this.instance.val(McmodderUtils.keyToString({}));
    }
    this.onChange({});
  }
}