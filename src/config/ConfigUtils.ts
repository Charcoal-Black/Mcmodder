import { Mcmodder } from "../Mcmodder";
import { StorageBuffer } from "../StorageBuffer";
import type { ConfigRepository } from "./ConfigRepository";

export const enum McmodderInputType {
  CHECKBOX,
  NUMBER,
  SLIDER,
  TEXT,
  COLORPICKER,
  KEYBIND,
  DROPDOWN_MENU,
  DROPDOWN_TEXT_MENU
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

  static readonly defaultValue = {
    [McmodderInputType.CHECKBOX]: false,
    [McmodderInputType.NUMBER]: 0,
    [McmodderInputType.SLIDER]: 0,
    [McmodderInputType.TEXT]: "",
    [McmodderInputType.COLORPICKER]: "#000",
    [McmodderInputType.KEYBIND]: new Object,
    [McmodderInputType.DROPDOWN_MENU]: 0,
    [McmodderInputType.DROPDOWN_TEXT_MENU]: ""
  } as const;

  private readonly configs: ConfigRepository;
  data: Record<keyof McmodderSettings, McmodderConfigData>;
  buffer: StorageBuffer;

  constructor(parent: Mcmodder) {
    this.configs = parent.configRepository;
    this.data = {} as any;
    this.buffer = new StorageBuffer(parent);
  }

  addCheckboxConfig<T extends KeysOfType<Required<McmodderSettings>, boolean>>(id: T, title: string, description: string, value?: McmodderSettings[T] | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.CHECKBOX, value, undefined, permission);
  }
  addTextConfig<T extends KeysOfType<Required<McmodderSettings>, string>>(id: T, title: string, description: string, value?: McmodderSettings[T] | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.TEXT, value, undefined, permission);
  }
  addColorpickerConfig<T extends KeysOfType<Required<McmodderSettings>, string>>(id: T, title: string, description: string, value?: McmodderSettings[T] | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.COLORPICKER, value, undefined, permission);
  }
  addNumberConfig<T extends KeysOfType<Required<McmodderSettings>, number>>(id: T, title: string, description: string, value?: McmodderSettings[T] | null, rangeOrPermission?: InputValueNumericRange | McmodderPermission, permission?: McmodderPermission) {
    if (rangeOrPermission instanceof Array) {
      return this.addConfig(id, title, description, McmodderInputType.NUMBER, value, rangeOrPermission, permission);
    } else {
      return this.addConfig(id, title, description, McmodderInputType.NUMBER, value, [null, null], rangeOrPermission);
    }
  }
  addSliderConfig<T extends KeysOfType<Required<McmodderSettings>, number>>(id: T, title: string, description: string, value: McmodderSettings[T], range: [number, number], permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.SLIDER, value, range, permission);
  }
  addKeybindConfig<T extends KeysOfType<Required<McmodderSettings>, McmodderKeyData>>(id: T, title: string, description: string, value?: McmodderSettings[T] | null, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.KEYBIND, value, undefined, permission);
  }
  addDropdownConfig<T extends KeysOfType<Required<McmodderSettings>, number>>(id: T, title: string, description: string, value?: McmodderSettings[T], range?: InputValueSet, permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.DROPDOWN_MENU, value, range, permission);
  }
  addDropdownTextConfig<T extends KeysOfType<Required<McmodderSettings>, string>>(id: T, title: string, description: string, value?: McmodderSettings[T], Suggestion?: InputSimplifiedSuggestion[], permission?: McmodderPermission) {
    return this.addConfig(id, title, description, McmodderInputType.DROPDOWN_TEXT_MENU, value, undefined, permission, Suggestion);
  }

  private addConfig<T extends keyof McmodderSettings>(id: T, title: string, description: string, type = McmodderInputType.CHECKBOX, 
    value: McmodderSettings[T] | null = null, range: InputValueRange | undefined, permission = McmodderPermission.NONE, Suggestion?: InputSimplifiedSuggestion[]) {
    (this.data as any)[id] = {
      title: title,
      description: description,
      type: type,
      value: value,
      permission: permission,
      ...(range != undefined && { range }),
      ...(Suggestion != undefined && { Suggestion })
    };
    if (this.configs.getSettings(id) === undefined) {
      this.configs.setSettings(id, value || McmodderConfigUtils.defaultValue[type]);
    }
    return this;
  }

  getData<T extends keyof McmodderSettings>(id: T) {
    return this.data[id];
  }
}