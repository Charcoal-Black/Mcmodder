import { Mcmodder } from "../Mcmodder";
import { InputValueNumericRange, InputValueRange, InputValueSet, McmodderConfigData, McmodderKeyData } from "../types";
import { StorageBuffer } from "../StorageBuffer";

export const enum McmodderInputType {
  CHECKBOX,
  NUMBER,
  SLIDER,
  TEXT,
  COLORPICKER,
  KEYBIND,
  DROPDOWN_MENU
}

export const enum McmodderPermission {
  BANNED = -1,
  NONE,
  EDITOR,
  DEVELOPER,
  MANAGER,
  ADMIN
}

export class McmodderConfigUtils {

  static defaultValue: Record<McmodderInputType, any> = {
    [McmodderInputType.CHECKBOX]: false,
    [McmodderInputType.NUMBER]: 0,
    [McmodderInputType.SLIDER]: 0,
    [McmodderInputType.TEXT]: "",
    [McmodderInputType.COLORPICKER]: "#000",
    [McmodderInputType.KEYBIND]: new Object,
    [McmodderInputType.DROPDOWN_MENU]: 0
  }

  parent: Mcmodder;
  data: Record<string, McmodderConfigData>;
  buffer: StorageBuffer;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.data = {};
    this.buffer = new StorageBuffer(this.parent);
  }

  addCheckboxConfig(id: string, title: string, description: string, value?: boolean | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.CHECKBOX, value, undefined, permission);
  }
  addTextConfig(id: string, title: string, description: string, value?: string | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.TEXT, value, undefined, permission);
  }
  addColorpickerConfig(id: string, title: string, description: string, value?: string | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.COLORPICKER, value, undefined, permission);
  }
  addNumberConfig(id: string, title: string, description: string, value?: number | null, rangeOrPermission?: InputValueNumericRange | McmodderPermission, permission?: McmodderPermission) {
    if (rangeOrPermission instanceof Array) {
      return this.addConfig(id, title, description, McmodderInputType.NUMBER, value, rangeOrPermission, permission);
    } else {
      return this.addConfig(id, title, description, McmodderInputType.NUMBER, value, [null, null], rangeOrPermission);
    }
  }
  addSliderConfig(id: string, title: string, description: string, value: number, range: [number, number], permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.SLIDER, value, range, permission);
  }
  addKeybindConfig(id: string, title: string, description: string, value?: McmodderKeyData | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.KEYBIND, value, undefined, permission);
  }
  addDropdownConfig(id: string, title: string, description: string, value?: number, range?: InputValueSet, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.DROPDOWN_MENU, value, range, permission);
  }

  private addConfig(id: string, title: string, description: string, type = McmodderInputType.CHECKBOX, 
    value: any = null, range: InputValueRange | undefined, permission = McmodderPermission.NONE) {
    this.data[id] = {
      title: title,
      description: description,
      type: type,
      value: value,
      permission: permission,
      ...(range != undefined && { range })
    };
    if (this.parent.utils.getConfig(id) === undefined) {
      this.parent.utils.setConfig(id, value || McmodderConfigUtils.defaultValue[type]);
    }
    return this;
  }

  getData(id: string) {
    return this.data[id];
  }
}