import { GM_addValueChangeListener, GM_getValue } from "$";
import { shallowRef, type ShallowRef } from "vue";
import { Mcmodder } from "./Mcmodder";

type DefaultProvider<T extends keyof AppStorage> = () => AppStorage[T];

/**
 * 存储缓冲：把指定 GM 存储键包装成 Vue `shallowRef`，供配置仓库做响应式读取，并实现跨标签页同步。
 *
 * # 实现思路
 * - 每个可缓存键在 `storageRef` 中对应一个 `ShallowRef<AppStorage[T]>`；`isDisabled` 记录该键是否
 *   已被 `addCacheableItem` 登记（存在即视为可缓存）。
 * - `addCacheableItem(key)` 注册键时：读一次 GM 现值 → 建 ref 包裹（现值缺失时回退到
 *   `defaultProvider`）→ 监听 `GM_addValueChangeListener`，当**其他标签页**（`remote === true`）
 *   写入时把新值解析回 ref（远端删键时写入 undefined）。
 * - 本标签页自身的写入由 `ConfigRepository.set`/`setAll` 直接更新 ref，不经过该监听器。
 */
export class StorageBuffer {
  readonly parent: Mcmodder;
  /** 可缓存键 → `shallowRef` 的映射（已登记的键必有 ref，但其值可能为 undefined） */
  readonly storageRef: /* {
    [T in keyof AppStorage as AppStorage[T] extends Record<string, any> ? T : never]: { [K in keyof AppStorage[T]]: ShallowRef<AppStorage[T][K]> }
  } & */ {
    [
      T in keyof AppStorage /* as AppStorage[T] extends Record<string, any> ? never : T */
    ]?: ShallowRef<AppStorage[T]>;
  } = {};
  private readonly isDisabled: Partial<Record<keyof AppStorage, boolean>> = {};
  // private readonly synchorizedStorages = new Set<string>();

  /** @param parent 全局上下文 `Mcmodder` 实例 */
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }

  /**
   * 禁用某个键的缓存同步（登记为不可缓存；重复禁用会告警）。
   *
   * @param key 存储键名
   */
  disableItem(key: keyof AppStorage) {
    if (this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复禁用。`);
    }
    this.isDisabled[key] = true;
  }

  /**
   * 启用某个键的缓存同步（登记为可缓存；重复启用会告警）。
   *
   * @param key 存储键名
   */
  enableItem(key: keyof AppStorage) {
    if (!this.isDisabled[key]) {
      console.warn(`${key} 缓存项被重复启用。`);
    }
    this.isDisabled[key] = false;
  }

  /**
   * 判断某键是否已登记（`isDisabled` 中有记录即视为可缓存）。
   *
   * @param key 存储键名（可为 undefined，返回 false）
   */
  isCacheable(key: keyof AppStorage | undefined) {
    if (key === undefined) {
      return false;
    }
    return this.isDisabled[key] !== undefined;
  }

  /**
   * 注册一个可缓存键：读取 GM 现值并建 `shallowRef`，同时监听跨标签页写入。
   *
   * 注册后该键的 ref 必定存在；现值与 `defaultProvider` 都缺省时 ref 的值为 undefined，
   * 因此为非对象类型的键（如数组）应显式传入 `defaultProvider`。
   *
   * @param key 要缓存的存储键名。
   * @param defaultProvider 可选的默认值工厂。
   * @returns this，便于链式调用注册多个键。
   */
  addCacheableItem<
    T extends /*Exclude<*/ keyof AppStorage /*, KeysOfType<AppStorage, Record<string, any>>>*/,
  >(key: T, defaultProvider?: DefaultProvider<T>) {
    let data;
    try {
      const raw = GM_getValue(key);
      if (raw === undefined) {
        data = undefined;
      } else {
        data = JSON.parse(raw) as AppStorage[T] | undefined;
      }
    } catch (e) {
      console.error("缓存项初始化失败: " + e);
    }

    (this.storageRef[key] as ShallowRef<AppStorage[T]>) = shallowRef(
      data ?? defaultProvider?.(),
    ) as ShallowRef<AppStorage[T]>;

    this.isDisabled[key] = false;

    GM_addValueChangeListener(key, (_key, _oldValue, newValue, remote) => {
      if (this.isDisabled[key] || !remote) return;
      // this.disableItem(key);
      this.storageRef[key]!.value = newValue !== undefined ? JSON.parse(newValue) : newValue;
      // this.enableItem(key);
    });

    return this;
  }
}
