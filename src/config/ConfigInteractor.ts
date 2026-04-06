import { InputValidInfo, InputValueNumericRange, InputValueSet, McmodderConfigData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderCheckboxInput } from "../widget/input/CheckboxInput";
import { McmodderColorpickerInput } from "../widget/input/ColorpickerInput";
import { McmodderDropdownInput } from "../widget/input/DropdownMenuInput";
import { McmodderBaseInput } from "../widget/input/Input";
import { McmodderKeybindInput } from "../widget/input/KeybindInput";
import { McmodderNumberInput } from "../widget/input/NumberInput";
import { McmodderTextInput } from "../widget/input/TextInput";
import { McmodderInputType, McmodderConfigUtils } from "./ConfigUtils";

export class McmodderConfigInteractor {

  protected getInstanceHTML() {
    const container = $(`<div>`);
    const instance = $(`<div class="mcmodder-placeholder-input">`).appendTo(container);
    if (this.data.type !== McmodderInputType.CHECKBOX) {
      $(`<span class="title">`).text(`${ this.data.title }:`).insertBefore(instance);
    }
    return container.contents();
  }

  id: string;
  data: McmodderConfigData;
  cfgutils: McmodderConfigUtils;
  $instance: JQuery;
  $content: JQuery;
  input: McmodderBaseInput;

  constructor(id: string, cfgutils: McmodderConfigUtils) {
    this.id = id;
    this.cfgutils = cfgutils;
    this.data = cfgutils.data[id];
    this.input = this.getInputClass();
    
    this.$instance = $(`
      <div class="center-setting-block">
        <div class="setting-item"></div>
        <p class="text-muted">${ this.getDescription() }</p>
      </div>`
    );
    this.$content = this.$instance.find(".setting-item");
    this.getInstanceHTML().appendTo(this.$content);
    this.$content.find(".mcmodder-placeholder-input").replaceWith(this.input.getInstance());
  }

  private onSuccessfulChange = (resp: InputValidInfo<any>) => {
    McmodderUtils.commonMsg(PublicLangData.center.setting.complete);
    this.cfgutils.parent.utils.setConfig(this.id, resp.final);
  }

  private getInputClass(): McmodderBaseInput {
    const config = this.cfgutils.parent.utils.getConfig(this.id);
    const title = this.data.title;
    const value = config === undefined ? this.data.value : config;
    switch (this.data.type) {
      case McmodderInputType.CHECKBOX: return new McmodderCheckboxInput(title, value, this.onSuccessfulChange, this.id, true);
      case McmodderInputType.TEXT: return new McmodderTextInput(title, value, this.onSuccessfulChange);
      case McmodderInputType.COLORPICKER: return new McmodderColorpickerInput(title, value, this.onSuccessfulChange);
      case McmodderInputType.NUMBER: return new McmodderNumberInput(title, value, this.data.range as InputValueNumericRange, this.onSuccessfulChange);
      case McmodderInputType.DROPDOWN_MENU: return new McmodderDropdownInput(title, value, this.data.range as InputValueSet, this.onSuccessfulChange);
      case McmodderInputType.KEYBIND: return new McmodderKeybindInput(title, value, this.onSuccessfulChange);
    }
    throw new Error("这 InputType 有力气");
  }

  private getDescription() {
    if (this.data.type === McmodderInputType.DROPDOWN_MENU) return this.data.description;
    let list = [];
    let val = this.data.value;
    if (val != null) list.push(`默认：${ 
      typeof val === "number" ? val.toLocaleString() :
      typeof val === "object" ? McmodderUtils.keyToString(val) : val
    }`);
    const range = (this.data.range || [null, null]) as InputValueNumericRange;
    let l = range[0], r = range[1];
    let tl = l?.toLocaleString(), tr = r?.toLocaleString();
    if (l != null && r != null) 
      list.push(`允许范围：${ tl } ~ ${ tr }`);
    else if (l != null)
      list.push(`最小值：${ tl }`);
    else if (r != null)
      list.push(`最大值：${ tr }`);
    let appendix = list.length ? `（${list.join("；")}）` : ``;
    return `${ this.data.description }${ appendix }`;
  }
}