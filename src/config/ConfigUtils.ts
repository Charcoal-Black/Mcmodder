import { Mcmodder } from "../Mcmodder";
import { InputValueRange, McmodderConfigData } from "../types";
import { StorageBuffer } from "../StorageBuffer";

export const enum McmodderInputType {
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
    [McmodderInputType.CHECKBOX]: false,
    [McmodderInputType.NUMBER]: 0,
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

  addConfig(id: string, title: string, description: string, type = McmodderInputType.CHECKBOX, 
    value: any = null, range?: InputValueRange, permission = McmodderPermission.NONE) {
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