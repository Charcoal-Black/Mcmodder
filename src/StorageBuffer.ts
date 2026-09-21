import { GM_addValueChangeListener, GM_getValue } from "$";
import { shallowRef, type ShallowRef } from "vue";
import { Mcmodder } from "./Mcmodder";

type DefaultProvider<T extends keyof AppStorage> = () => AppStorage[T];

export class StorageBuffer {

  readonly parent: Mcmodder;
  readonly storageRef: /* {
    [T in keyof AppStorage as AppStorage[T] extends Record<string, any> ? T : never]: { [K in keyof AppStorage[T]]: ShallowRef<AppStorage[T][K]> }
  } & */ {
    [T in keyof AppStorage /* as AppStorage[T] extends Record<string, any> ? never : T */]?: ShallowRef<AppStorage[T]>
  } = {};
  private readonly isDisabled: Partial<Record<keyof AppStorage, boolean>> = {};
  // private readonly synchorizedStorages = new Set<string>();

  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  disableItem(key: keyof AppStorage) {
    if (this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复禁用。`);
    }
    this.isDisabled[key] = true;
  }

  enableItem(key: keyof AppStorage) {
    if (!this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复启用。`);
    }
    this.isDisabled[key] = false;
  }

  isCacheable(key: keyof AppStorage | undefined) {
    if (key === undefined) {
      return false;
    }
    return this.isDisabled[key] !== undefined;
  }

  addCacheableItem<T extends /*Exclude<*/keyof AppStorage/*, KeysOfType<AppStorage, Record<string, any>>>*/>(key: T, defaultProvider?: DefaultProvider<T>) {
    let data;
    try {
      data = JSON.parse(GM_getValue(key)) as AppStorage[T] | undefined;
    } catch (e) {
      console.error("缓存项初始化失败: " + e);
    }

    if (data !== undefined) {
      (this.storageRef[key] as ShallowRef<AppStorage[T]>) = shallowRef(data ?? defaultProvider?.() ?? {}) as ShallowRef<AppStorage[T]>;
    }

    this.isDisabled[key] = false;

    GM_addValueChangeListener(key, (_key, _oldValue, newValue, remote) => {
      if (this.isDisabled[key] || !remote) return;
      // this.disableItem(key);
      this.storageRef[key]!.value = JSON.parse(newValue);
      // this.enableItem(key);
    });

    return this;
  }
}