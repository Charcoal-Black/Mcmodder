import { GM_addValueChangeListener, GM_getValue } from "$";
import { shallowRef, type ShallowRef } from "vue";
import { Mcmodder } from "./Mcmodder";

type DefaultProvider<T extends keyof McmodderStorage> = () => McmodderStorage[T];

export class StorageBuffer {

  readonly parent: Mcmodder;
  readonly storageRef: /* {
    [T in keyof McmodderStorage as McmodderStorage[T] extends Record<string, any> ? T : never]: { [K in keyof McmodderStorage[T]]: ShallowRef<McmodderStorage[T][K]> }
  } & */ {
    [T in keyof McmodderStorage /* as McmodderStorage[T] extends Record<string, any> ? never : T */]?: ShallowRef<McmodderStorage[T]>
  } = {};
  private readonly isDisabled: Partial<Record<keyof McmodderStorage, boolean>> = {};
  // private readonly synchorizedStorages = new Set<string>();

  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  disableItem(key: keyof McmodderStorage) {
    if (this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复禁用。`);
    }
    this.isDisabled[key] = true;
  }

  enableItem(key: keyof McmodderStorage) {
    if (!this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复启用。`);
    }
    this.isDisabled[key] = false;
  }

  isCacheable(key: keyof McmodderStorage | undefined) {
    if (key === undefined) {
      return false;
    }
    return this.isDisabled[key] !== undefined;
  }

  addCacheableItem<T extends /*Exclude<*/keyof McmodderStorage/*, KeysOfType<McmodderStorage, Record<string, any>>>*/>(key: T, defaultProvider?: DefaultProvider<T>) {
    let data;
    try {
      data = JSON.parse(GM_getValue(key)) as McmodderStorage[T] | undefined;
    } catch (e) {
      console.error("缓存项初始化失败: " + e);
    }

    if (data !== undefined) {
      (this.storageRef[key] as ShallowRef<McmodderStorage[T]>) = shallowRef(data ?? defaultProvider?.() ?? {}) as ShallowRef<McmodderStorage[T]>;
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