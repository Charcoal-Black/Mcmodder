import { GM_addValueChangeListener, GM_getValue } from "$";
import { Mcmodder } from "./Mcmodder";

type DefaultProvider = (() => any) | null;
type InjectedEvent = ((buffer: StorageBuffer) => any) | null;

type CacheableConfig = {
  defaultProvider?: DefaultProvider;
  injectedEvent?: InjectedEvent;
}

export class StorageBuffer {

  parent: Mcmodder;
  data: Record<string, object>;
  cacheableItems: Record<string, CacheableConfig>;
  private isDisabled: Record<string, boolean>;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.data = {};
    this.isDisabled = {};
    this.cacheableItems = {};
  }

  disableItem(key: string) {
    if (this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复禁用。`);
    }
    this.isDisabled[key] = true;
  }

  enableItem(key: string) {
    if (!this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复启用。`);
    }
    this.isDisabled[key] = false;
  }

  isCacheable(key: string) {
    return this.cacheableItems[key] != undefined;
  }

  addCacheableItem(key: string, defaultProvider?: DefaultProvider, injectedEvent?: InjectedEvent) {
    this.cacheableItems[key] = {};
    let data = this.cacheableItems[key];
    if (defaultProvider) data.defaultProvider = defaultProvider;
    if (injectedEvent) data.injectedEvent = injectedEvent;

    try {
      this.data[key] = JSON.parse(GM_getValue(key));
    } catch (e) {} finally {
      this.data[key] ||= (defaultProvider ? defaultProvider() : new Object);
    }

    this.isDisabled[key] = false;

    GM_addValueChangeListener(key, () => {
      if (this.isDisabled[key]) return;
      this.disableItem(key);
      this.data[key] = JSON.parse(GM_getValue(key));
      let injectedEvent = this.cacheableItems[key].injectedEvent;
      if (injectedEvent) injectedEvent(this);
      this.enableItem(key);
    });

    return this;
  }
}