import { Mcmodder } from "../Mcmodder";
import { ConfigValueRange, McmodderConfigData } from "../types";
import { StorageBuffer } from "../StorageBuffer";

export const enum McmodderConfigType {
  DEFAULT = -1,
  CHECKBOX,
  NUMBER,
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

  static defaultValue = {
    [McmodderConfigType.DEFAULT]: "",
    [McmodderConfigType.CHECKBOX]: false,
    [McmodderConfigType.NUMBER]: 0,
    [McmodderConfigType.TEXT]: "",
    [McmodderConfigType.COLORPICKER]: "#000",
    [McmodderConfigType.KEYBIND]: new Object,
    [McmodderConfigType.DROPDOWN_MENU]: 0
  }

  parent: Mcmodder;
  data: Record<string, McmodderConfigData>;
  buffer: StorageBuffer;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.data = {};
    this.buffer = new StorageBuffer(this.parent);
  }

  addConfig(id: string, title: string, description: string, type = McmodderConfigType.CHECKBOX, 
    value: any = null, range?: ConfigValueRange, permission = McmodderPermission.NONE) {
    this.data[id] = {
      title: title,
      description: description,
      type: type,
      value: value,
      range: range || [null, null],
      permission: permission
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