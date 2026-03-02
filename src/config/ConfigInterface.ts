import { ConfigValueNumericRange, ConfigValueSet, McmodderConfigData, McmodderKeyData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderConfigType, McmodderConfigUtils } from "./ConfigUtils";

type InputValidInfo = {
  isok: boolean;
  msg?: string;
  final?: string | number | boolean;
}
type InputChecker = (original: string, value: string | boolean | McmodderKeyData, min?: number | null, max?: number | null) => InputValidInfo;
type ConfigHTMLGenerator = (id: string, title: string, utils: McmodderConfigUtils) => string;

export class McmodderConfigInteractor {

  static checkIsValid: Record<number, InputChecker> = {
    [McmodderConfigType.CHECKBOX]: (original, value) => {
      if (original != value) return { isok: true, final: value ? true : false };
      else return { isok: false };
    },
    [McmodderConfigType.NUMBER]: (original_, value_, min_, max_) => {
      let original = Number(original_);
      let value = Number(value_);
      let min = min_ === null ? NaN : Number(min_);
      let max = max_ === null ? NaN : Number(max_);
      if (isNaN(value)) return { isok: false, msg: `请输入一个正确的数值~` }; 
      if (original === value) return { isok: false };
      if (!isNaN(min) && value < min) return { isok: false, msg: `您输入的数值 (${value}) 低于允许的最小值 (${min})，请重新设置~` };
      if (!isNaN(max) && value > max) return { isok: false, msg: `您输入的数值 (${value}) 高于允许的最大值 (${max})，请重新设置~` };
      return { isok: true, final: value };
    },
    [McmodderConfigType.TEXT]: (original, value) => {
      if (original === value) return { isok: false };
      return { isok: true, final: value.toString() };
    },
    /* [McmodderConfigType.KEYBIND]: (original, value) => {
      if (original === value) return { isok: false };
      return { isok: true, final: McmodderUtils.key2Str(value) }
    }, */
    [McmodderConfigType.DEFAULT]: (original, value) => new Object({ isok: original != value, final: value }) as InputValidInfo
  }

  static configHTML: Record<number, ConfigHTMLGenerator> = {
    [McmodderConfigType.CHECKBOX]: (id, title) => `
      <div class="checkbox">
        <input id="settings-${ id }" type="checkbox" data-id="${ id }">
        <label for="settings-${ id }">${ title }</label>
      </div>
    `,
    [McmodderConfigType.KEYBIND]: (id, title) => `
      <span class="title">${ title }:</span>
      <input class="form-control mcmodder-keybind-input" data-id="${ id }">
    `,
    [McmodderConfigType.COLORPICKER]: (id, title) => `
      <span class="title">${ title }:</span>
      <input type="color" class="form-control" placeholder="${ title }.." data-id="${ id }">
    `,
    [McmodderConfigType.DROPDOWN_MENU]: (id, title, utils) => {
      const select = $(`<select class="selectpicker" data-id="${ id }"></select>`);
      const data = utils.getData(id);
      const range = data.range as ConfigValueSet;
      Object.keys(range).forEach(key => {
        const num = Number(key);
        const option = $(`<option>`).attr("value", key);
        let content = range[num];
        if (data.value === num) content += " (默认)";
        option.html(content).appendTo(select);
      });
      return `<span class="title">${ title }:</span>` + select.prop("outerHTML");
    },
    [McmodderConfigType.DEFAULT]: (id, title) => `
      <span class="title">${ title }:</span>
      <input class="form-control" placeholder="${ title }.." data-id="${ id }">
    `
  }

  id: string;
  cfgutils: McmodderConfigUtils;
  data: McmodderConfigData;
  original: any;
  $instance: JQuery;
  $content: JQuery;
  input: JQuery;
  
  protected keyLastData?: McmodderKeyData;
  protected keyQueue = 0;
  protected keyFinished = false;

  constructor(id: string, cfgutils: McmodderConfigUtils) {
    this.id = id;
    this.cfgutils = cfgutils;
    this.data = cfgutils.data[id];
    this.original = cfgutils.parent.utils.getConfig(id);
    
    this.$instance = $(`
      <div class="center-setting-block">
        <div class="setting-item"></div>
        <p class="text-muted">${ this.getDescription() }</p>
      </div>`);
    this.$content = this.$instance.find(".setting-item")
    .append(McmodderConfigInteractor.configHTML[this.data.type] ? 
      McmodderConfigInteractor.configHTML[this.data.type](this.id, this.data.title, this.cfgutils) :
      McmodderConfigInteractor.configHTML[McmodderConfigType.DEFAULT](this.id, this.data.title, this.cfgutils));
    this.input = this.$content.find("input, select");
    let type = this.input.attr("type");

    if (this.data.type != McmodderConfigType.KEYBIND) {
      if (type === "checkbox") {
        (this.input.get(0) as HTMLInputElement).checked = this.original;
        this.input.click(e => this.onChange((e.currentTarget as HTMLInputElement).checked));
      }
      else {
        if (this.data.type === McmodderConfigType.DROPDOWN_MENU) {
          console.log(this.original);
          this.input.selectpicker("render").selectpicker("val", this.original);
        } else {
          this.input.val(this.original);
        }
        this.input.change(e => this.onChange((e.currentTarget as HTMLInputElement).value.trim()));
      }
    }
    else {
      this.input.val(McmodderUtils.key2Str(this.original))
      .focus(e => this.keybindOnFocus(e))
      .keydown(e => this.keybindOnKeydown(e))
      .keyup(e => this.keybindOnKeyup(e))
      .blur(e => this.keybindOnBlur(e));
    }
  }

  protected keybindOnFocus(e: JQueryEventObject) {
    (e.currentTarget as HTMLInputElement).value = "";
    this.keyLastData = {};
    this.keyQueue = 0;
    this.keyFinished = false;
  }

  protected keybindOnKeydown(e: JQueryKeyEventObject) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === this.keyLastData?.key) return;
    if (e.key === "Escape") {
      this.input.val(McmodderUtils.key2Str({}));
      this.input.blur();
      return;
    }
    this.keyLastData = e;
    this.keyQueue++;
    this.input.val(McmodderUtils.key2Str(e));
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
    this.input.blur();
  }

  protected keybindOnBlur(e: JQueryEventObject) {
    e.preventDefault();
    if (this.keyFinished) return;
    if (!(e.target as HTMLInputElement).value || this.keyQueue) this.input.val(McmodderUtils.key2Str({}));
    this.onChange({});
  }

  protected onChange(value: string | boolean | McmodderKeyData) {
    const check = McmodderConfigInteractor.checkIsValid[this.data.type] || McmodderConfigInteractor.checkIsValid[McmodderConfigType.DEFAULT];
    let resp: InputValidInfo;
    if (this.data.type != McmodderConfigType.DROPDOWN_MENU) {
      const range = this.data.range as ConfigValueNumericRange;
      resp = check(this.original, value, range[0], range[1]);
    } else {
      const nvalue = Number(value);
      const range = this.data.range as ConfigValueSet;
      if (Object.keys(range).map(Number).includes(nvalue)) resp = { isok: true, final: nvalue };
      else resp = { isok: false, msg: "你干~~嘛~~~哈哈哎~哟。" };
    }
    if (resp.isok) {
      this.onSuccessfulChange(resp, value);
    }
    else {
      if (resp.msg) McmodderUtils.commonMsg(resp.msg, false);
      this.input.val(this.original);
    }
  }

  protected onSuccessfulChange(resp: InputValidInfo, value: string | boolean | McmodderKeyData) {
    McmodderUtils.commonMsg(PublicLangData.center.setting.complete);
    this.original = value;
    if (resp.final) {
      if (this.data.type === McmodderConfigType.KEYBIND) this.input.val(McmodderUtils.key2Str(resp.final as McmodderKeyData))
      else this.input.val(resp.final as string);
    }
    this.cfgutils.parent.utils.setConfig(this.id, resp.final);
  }

  getDescription() {
    if (this.data.type === McmodderConfigType.DROPDOWN_MENU) return this.data.description;
    let list = [];
    let val = this.data.value;
    if (val != null) list.push(`默认：${ 
      typeof val === "number" ? val.toLocaleString() :
      typeof val === "object" ? McmodderUtils.key2Str(val) : val
    }`);
    const range = this.data.range as ConfigValueNumericRange;
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