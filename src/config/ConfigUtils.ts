import { Mcmodder } from "../Mcmodder";
import { StorageBuffer } from "../StorageBuffer";
import type { ConfigRepository } from "./ConfigRepository";

export const enum InputType {
  CHECKBOX,
  NUMBER,
  SLIDER,
  TEXT,
  COLORPICKER,
  KEYBIND,
  DROPDOWN_MENU,
  DROPDOWN_TEXT_MENU
}

export const enum Permission {
  BANNED = -1,
  NONE,
  EDITOR,
  DEVELOPER,
  MANAGER,
  ADMIN
}

export class ConfigUtils {

  static readonly defaultValue = {
    [InputType.CHECKBOX]: false,
    [InputType.NUMBER]: 0,
    [InputType.SLIDER]: 0,
    [InputType.TEXT]: "",
    [InputType.COLORPICKER]: "#000",
    [InputType.KEYBIND]: new Object,
    [InputType.DROPDOWN_MENU]: 0,
    [InputType.DROPDOWN_TEXT_MENU]: ""
  } as const;

  private readonly configs: ConfigRepository;
  data: Record<keyof Settings, ConfigOption>;
  buffer: StorageBuffer;

  constructor(parent: Mcmodder) {
    this.configs = parent.configRepository;
    this.data = {} as Record<keyof Settings, ConfigOption>;
    this.buffer = new StorageBuffer(parent);
  }

  addCheckboxConfig<T extends KeysOfType<Required<Settings>, boolean>>(id: T, title: string, description: string, value?: Settings[T] | null, permission?: Permission) {
    return this.addConfig(id, title, description, InputType.CHECKBOX, value, undefined, permission);
  }
  addTextConfig<T extends KeysOfType<Required<Settings>, string>>(id: T, title: string, description: string, value?: Settings[T] | null, permission?: Permission) {
    return this.addConfig(id, title, description, InputType.TEXT, value, undefined, permission);
  }
  addColorpickerConfig<T extends KeysOfType<Required<Settings>, string>>(id: T, title: string, description: string, value?: Settings[T] | null, permission?: Permission) {
    return this.addConfig(id, title, description, InputType.COLORPICKER, value, undefined, permission);
  }
  addNumberConfig<T extends KeysOfType<Required<Settings>, number>>(id: T, title: string, description: string, value?: Settings[T] | null, rangeOrPermission?: InputValueNumericRange | Permission, permission?: Permission) {
    if (rangeOrPermission instanceof Array) {
      return this.addConfig(id, title, description, InputType.NUMBER, value, rangeOrPermission, permission);
    } else {
      return this.addConfig(id, title, description, InputType.NUMBER, value, [null, null], rangeOrPermission);
    }
  }
  addSliderConfig<T extends KeysOfType<Required<Settings>, number>>(id: T, title: string, description: string, value: Settings[T], range: [number, number], permission?: Permission) {
    return this.addConfig(id, title, description, InputType.SLIDER, value, range, permission);
  }
  addKeybindConfig<T extends KeysOfType<Required<Settings>, Key>>(id: T, title: string, description: string, value?: Settings[T] | null, permission?: Permission) {
    return this.addConfig(id, title, description, InputType.KEYBIND, value, undefined, permission);
  }
  addDropdownConfig<T extends KeysOfType<Required<Settings>, number>>(id: T, title: string, description: string, value?: Settings[T], range?: InputValueSet, permission?: Permission) {
    return this.addConfig(id, title, description, InputType.DROPDOWN_MENU, value, range, permission);
  }
  addDropdownTextConfig<T extends KeysOfType<Required<Settings>, string>>(id: T, title: string, description: string, value?: Settings[T], Suggestion?: InputSimplifiedSuggestion[], permission?: Permission) {
    return this.addConfig(id, title, description, InputType.DROPDOWN_TEXT_MENU, value, undefined, permission, Suggestion);
  }

  private addConfig<T extends keyof Settings>(id: T, title: string, description: string, type = InputType.CHECKBOX, 
    value: Settings[T] | null = null, range: InputValueRange | undefined, permission = Permission.NONE, Suggestion?: InputSimplifiedSuggestion[]) {
    this.data[id] = {
      title: title,
      description: description,
      type: type,
      value: value,
      permission: permission,
      ...(range != undefined && { range }),
      ...(Suggestion != undefined && { Suggestion })
    };
    if (this.configs.getSettings(id) === undefined) {
      this.configs.setSettings(id, value || ConfigUtils.defaultValue[type]);
    }
    return this;
  }

  getData<T extends keyof Settings>(id: T) {
    return this.data[id];
  }
}