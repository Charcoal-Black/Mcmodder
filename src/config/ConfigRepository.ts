import {
  computed,
  triggerRef,
  watch,
  type ComputedRef,
  type ShallowRef,
  type WatchCallback,
} from "vue";
import type { Mcmodder } from "../Mcmodder";
import type { StorageBuffer } from "../StorageBuffer";
import { GM_getValue, GM_setValue } from "$";

/**
 * 配置仓库：对 GM Storage 的类型化读写门面。
 *
 * # 实现思路
 * 用户脚本没有自己的后端，所有持久化数据都放在油猴的 GM Storage（`GM_setValue`/`GM_getValue`，
 * 键名见 `AppStorage`）。本类对外提供两条读取/写入路径：
 *
 * 1. **缓存路径（响应式）**：一部分高频键由 `StorageBuffer.addCacheableItem` 注册（键名登记在
 *    `src/loader/StorageBufferLoader.ts`），被包裹为 Vue 的 `shallowRef`，并监听
 *    `GM_addValueChangeListener` 做跨标签页同步。对这类键，`getStorageRef`/`getAll`/`get`
 *    直接读 `storageRef.value`（无 JSON 解析开销），`get*Ref` 系列则在上面派生 `computed`。
 * 2. **直通路径（一次性）**：未缓存的键每次读写都直接与 GM Storage 交互（`GM_getValue` + JSON 解析）。
 *    `Profile`/`Class` 记录型数据（`userProfile`/`classData`）也走这条路径。
 *
 * # 写入约定
 * `set`/`setAll` 始终先写 GM Storage 做持久化；若目标键是缓存键，再同步本地 `shallowRef`：
 * - `set` 是**就地修改** `ref.value` 的某个字段 —— shallowRef 不跟踪深层字段，因此随后必须
 *   `triggerRefByItem` 手动触发，派生的 computed 才会重算；
 * - `setAll` 是整体替换 `ref.value` —— shallowRef 自身会触发，无需手动 trigger。
 *
 * # 注意事项
 * - 响应式读取（`getStorageRef`/`get*Ref`/`get*WritableRef`）只对已注册的缓存键有效，否则抛错。
 * - `delete` 目前只删 GM 中的数据，不同步缓存 ref，见该方法说明。
 */
export class ConfigRepository {
  private readonly parent: Mcmodder;
  private readonly buffer: StorageBuffer;

  /** 取某个配置项在 `ConfigUtils` 中登记的元数据（标题/描述/类型/默认值等），供可写 ref 读取默认值 */
  private getConfigData(id: keyof Settings) {
    return this.parent.cfgutils.data[id];
  }

  /** @param parent 全局上下文 `Mcmodder` 实例，由此取得 `storageBuffer` 与 `ConfigUtils` */
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.buffer = parent.storageBuffer;
  }

  /**
   * 取某个缓存键对应的 `shallowRef`，是响应式读取的底层依赖。
   *
   * 仅对 `StorageBuffer.addCacheableItem` 注册过的键有效，否则抛错。
   * 注册后该键的 `shallowRef` 必定存在，但其初始值可能为 undefined（`AppStorage` 中多数键是可选的，
   * 键从未落盘时即如此），使用时请通过 `getRef` 等方法并配合 `defaultValue` 兜底。
   *
   * @param item 缓存键名（`AppStorage` 的键，如 `"mcmodderSettings"`）。
   * @returns 该键对应的 `ShallowRef<Required<AppStorage>[T]>`。
   * @throws 若该键未注册为可缓存键，抛出「尚未缓存」错误。
   */
  getStorageRef<T extends keyof AppStorage>(item: T) {
    const isCacheable = this.parent.storageBuffer.isCacheable(item);
    if (!isCacheable) {
      throw new Error(`配置 ${item} 尚未缓存...`);
    }
    return this.parent.storageBuffer.storageRef[item] as ShallowRef<AppStorage[T]>;
  }

  /**
   * 手动触发某个缓存键的 `shallowRef`，令依赖它的 `computed` 重算。
   *
   * 在就地修改了缓存 `ref.value` 的内层字段后（`set` 内部即如此）必须调用本方法，
   * 因为 shallowRef 只跟踪 `.value` 整体替换，不跟踪深层字段。
   *
   * @param item 缓存键名。
   */
  triggerRefByItem<T extends keyof AppStorage>(item: T) {
    triggerRef(this.getStorageRef(item));
  }

  /**
   * 整体读取某个存储键的值。
   *
   * 缓存键走 `storageRef.value`（响应式、无解析开销）；未缓存的键直接 `GM_getValue` + JSON 解析。
   * 键不存在返回 undefined。
   *
   * @param item 存储键名。
   * @returns 解析后的对象；键不存在时为 undefined。
   */
  getAll<T extends keyof AppStorage>(item: T) {
    // item ??= "mcmodderSettings" as T;
    const isCacheable = this.buffer.isCacheable(item);
    let data: AppStorage[T] | undefined;
    if (isCacheable) data = this.buffer.storageRef[item]!.value;
    else {
      const raw = GM_getValue(item) as string | undefined;
      if (raw === undefined) return undefined;
      data = JSON.parse(raw) as AppStorage[T];
    }
    if (data === undefined) return undefined;
    return data as Required<AppStorage>[T];
  }

  /** 整体读取 `mcmodderSettings`（等价于 `getAll("mcmodderSettings")`） */
  getAllSettings() {
    return this.getAll("mcmodderSettings");
  }

  /**
   * 读取某个存储键下指定的一个字段。
   *
   * @param item 存储键名。
   * @param key 字段名。
   * @returns 字段值；键或字段不存在时为 undefined。
   */
  get<T extends keyof AppStorage, K extends keyof Required<AppStorage>[T]>(item: T, key: K) {
    // mcmodderUI 被修复后请移除下一行
    // if (key === "mcmodderUI" && item === "mcmodderSettings") return true;

    const data = this.getAll(item);
    if (data === undefined) return undefined;
    const entry = data[key];
    return entry as Required<AppStorage>[T][K];
  }

  /** 读取 `mcmodderSettings` 下的一个配置项（等价于 `get("mcmodderSettings", key)`） */
  getSettings<K extends keyof Settings>(key: K) {
    return this.get("mcmodderSettings", key);
  }

  /**
   * 以 `computed` 的形式读取某个缓存键下的一个字段（响应式，只读）。
   *
   * 仅适用于缓存键（内部走 `getStorageRef`，未缓存键会抛错）。
   *
   * @param item 缓存键名。
   * @param key 字段名。
   * @param defaultValue 字段缺失时的回退值。
   */
  getRef<T extends keyof AppStorage, K extends keyof Required<AppStorage>[T], V = undefined>(
    item: T,
    key: K,
    defaultValue: V = undefined as V,
  ) {
    const ref = this.getStorageRef(item);
    return computed(() => {
      const value = ref.value;
      if (value === undefined) {
        return defaultValue;
      }
      return (value as Required<AppStorage>[T])[key];
    });
  }

  /** 以 `computed` 读取一个设置项（等价于 `getRef("mcmodderSettings", key, defaultValue)`） */
  getSettingsRef<K extends keyof Settings, V = undefined>(
    key: K,
    defaultValue: V = undefined as V,
  ) {
    return this.getRef("mcmodderSettings", key, defaultValue);
  }

  /**
   * 以数字数组的形式读取某个字段（一次性，非响应式）。
   *
   * 兼容两种存储格式：字符串按逗号（忽略空格）分隔后逐项转数字，或已是 `(number|string)[]`
   * 的数组逐项转数字。用于 `userFavList`、`userBlacklist` 这类「逗号分隔 ID」配置。
   *
   * @param item 存储键名。
   * @param key 字段名。
   * @returns 数字数组；字段不存在时为 undefined。
   */
  getAsNumberList<T extends keyof AppStorage, K extends keyof Required<AppStorage>[T]>(
    item: T,
    key: K,
  ) {
    const config = this.get(item, key);
    if (config === undefined) return undefined;
    if (typeof config === "string") {
      return config.replaceAll(" ", "").split(",").map(Number);
    }
    return (config as (number | string)[] | undefined)?.map(Number);
  }

  /** 以数字数组读取一个设置项（等价于 `getAsNumberList("mcmodderSettings", key)`） */
  getSettingsAsNumberList<K extends keyof Settings>(key: K) {
    return this.getAsNumberList("mcmodderSettings", key);
  }

  /**
   * 以 `computed` 数字数组读取某个缓存键下的字段（响应式）。
   *
   * @param item 缓存键名。
   * @param key 字段名。
   * @returns computed 数字数组；字段缺失时回退为空数组。
   */
  getRefAsNumberList<T extends keyof AppStorage, K extends keyof Required<AppStorage>[T]>(
    item: T,
    key: K,
  ) {
    const ref = this.getStorageRef(item);
    return computed(() => {
      const value = (ref.value as Required<AppStorage>[T] | undefined)?.[key];
      if (typeof value === "string") {
        return value.replaceAll(" ", "").split(",").map(Number);
      }
      return (value as (number | string)[] | undefined)?.map(Number) ?? [];
    });
  }

  /** 以 computed 数字数组读取一个设置项（等价于 `getRefAsNumberList("mcmodderSettings", key)`） */
  getSettingsRefAsNumberList<K extends keyof Settings>(key: K) {
    return this.getRefAsNumberList("mcmodderSettings", key) ?? [];
  }

  /**
   * 写入某个存储键下的一个字段。
   *
   * 始终先写 GM Storage 持久化；若目标是缓存键，再就地更新本地 `ref.value` 并 `triggerRef`
   * 通知响应式消费者重算。
   *
   * @param item 存储键名。类型上被约束为 `AppStorage` 中值为对象（Record）的键。
   * @param key 字段名。
   * @param value 新值。
   */
  set<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T],
  >(item: T, key: K, value: /* Required<AppStorage>[T][K] */ unknown) {
    const obj = JSON.parse(GM_getValue(item) ?? "{}"); // as Required<AppStorage>[T];
    obj[key] = value;
    GM_setValue(item, JSON.stringify(obj));
    if (this.parent.storageBuffer.isCacheable(item)) {
      (this.getStorageRef(item).value as Required<AppStorage>[T])[key] =
        value as Required<AppStorage>[T][K];
      this.triggerRefByItem(item);
    }
  }

  /** 写入一个设置项（等价于 `set("mcmodderSettings", key, value)`） */
  setSettings<K extends keyof Settings>(key: K, value: /* Required<AppStorage>[T][K] */ unknown) {
    this.set("mcmodderSettings", key, value);
  }

  /** 以数字数组写入一个设置项（内部 join 为逗号分隔字符串后存储） */
  setSettingsAsNumberList<K extends KeysOfType<Settings, string>>(key: K, value: number[]) {
    return this.setAsNumberList("mcmodderSettings", key, value);
  }

  /**
   * 以可读写 `computed` 的形式绑定某个缓存键下的字段。
   *
   * @param item 缓存键名。
   * @param key 字段名。
   * @param defaultValue 读阶段的回退值；写阶段若赋值为 null/undefined 也会回退到该值。
   */
  getWritableRef<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T],
    V = undefined,
  >(item: T, key: K, defaultValue: V = undefined as V) {
    const ref = this.getRef(item, key as /* 这是一场豪赌 */ any) as ComputedRef<
      Required<AppStorage>[T][K] | undefined
    >;
    return computed<Required<AppStorage>[T][K] | V>({
      get: () => ref.value ?? defaultValue,
      set: (value) => this.set(item, key, value ?? defaultValue),
    });
  }

  /**
   * 以可读写 `computed` 的形式绑定一个设置项。
   *
   * 读：字段存在时返回其值，否则回退到 `ConfigUtils` 中登记的默认值。
   * 写：等价于 `setSettings`。
   *
   * @param key 设置项字段名（`Settings` 的键）。
   */
  getSettingsWritableRef<K extends keyof Settings>(key: K) {
    const ref = this.getRef("mcmodderSettings", key) as ComputedRef<Settings[K] | undefined>;
    return computed<Settings[K]>({
      get: () => ref.value ?? (this.getConfigData(key).value as Settings[K]),
      set: (value) => this.set("mcmodderSettings", key, value),
    });
  }

  /**
   * 以可读写 `computed` 数字数组绑定某个缓存键下的字段。
   *
   * @param item 缓存键名。
   * @param key 字段名（须为字符串值字段，以符合「逗号分隔」的列表语义）。
   * @param defaultValue 读阶段的回退数组（默认 `[]`）。
   */
  getWritableRefAsNumberList<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T],
  >(item: T, key: K, defaultValue: number[] = []) {
    const ref = this.getRefAsNumberList(item, key as /* 这是一场豪赌 */ any);
    return computed({
      get: () => ref.value ?? defaultValue,
      set: (value) =>
        this.setAsNumberList(item, key as /* 这是一场豪赌 */ any, value ?? defaultValue),
    });
  }

  /**
   * 以可读写 `computed` 数字数组绑定一个设置项。
   *
   * @param key 设置项字段名。
   * @param onGetValue 读阶段对解析结果做二次加工（默认原样返回）。
   */
  getSettingsWritableRefAsNumberList<K extends keyof Settings>(
    key: K,
    onGetValue: (value: number[]) => number[] = (value) => value,
  ) {
    const ref = this.getRefAsNumberList("mcmodderSettings", key);
    return computed({
      get: () => onGetValue(ref.value ?? []),
      set: (value) =>
        this.setAsNumberList("mcmodderSettings", key as /* 这是一场豪赌 */ any, value),
    });
  }

  /**
   * 以数字数组写入某个字段，内部 join 为逗号分隔字符串后走 `set`。
   *
   * @param item 存储键名。
   * @param key 字段名（类型上约束为字符串值字段）。
   * @param value 待写入的数字数组。
   */
  setAsNumberList<
    T extends KeysOfType<Required<AppStorage>, object>,
    K extends KeysOfType<Required<AppStorage>[T], string>,
  >(item: T, key: K, value: number[]) {
    return this.set(item, key, value.join(","));
  }

  /**
   * 删除某个存储键下的一个字段。
   *
   * @warning 仅删除 GM Storage 中的持久化数据；若该键是缓存键，不会同步更新本地 `ref.value`，
   * 也不会 `triggerRef`，响应式消费者可能继续持有旧值，需自行处理同步。
   *
   * @param item 存储键名。
   * @param key 要删除的字段名。
   */
  delete<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T],
  >(item: T, key: K) {
    const obj = JSON.parse(GM_getValue(item) ?? "{}"); // as Required<AppStorage>[T];
    delete obj[key];
    GM_setValue(item, JSON.stringify(obj));
  }

  /** 删除一个设置项（等价于 `delete("mcmodderSettings", key)`） */
  deleteSettings<K extends keyof Settings>(key: K) {
    this.delete("mcmodderSettings", key);
  }

  /**
   * 整体覆写某个存储键的值。
   *
   * 先写 GM Storage；若为缓存键，再整体替换 `ref.value`（shallowRef 自动触发，无需手动 trigger）。
   *
   * @param item 存储键名。
   * @param value 完整的新对象。
   */
  setAll<T extends keyof AppStorage = "mcmodderSettings">(item: T, value: Required<AppStorage>[T]) {
    if (!item) return;
    GM_setValue(item, JSON.stringify(value));
    if (this.parent.storageBuffer.isCacheable(item)) {
      this.getStorageRef(item).value = value;
    }
  }

  /**
   * 监听某个缓存键下某个字段的变化（响应式）。
   *
   * 内部走 `getRef` 派生的 `computed`，故仅适用于缓存键（未缓存键会在 `getStorageRef` 抛错）。
   * 监听为惰性求值：注册时不会立即触发，`callback` 仅在该字段后续发生变化时调用。
   *
   * @param item 缓存键名。
   * @param key 字段名。
   * @param callback Vue `watch` 的回调，签名为 `(newValue, oldValue, onCleanup) => void`；
   *                 字段不存在时 `newValue` 为 undefined。
   * @returns `watch` 的停止句柄，调用其 `stop()` 即可取消监听。
   */
  watchRef<T extends keyof AppStorage, K extends keyof Required<AppStorage>[T]>(
    item: T,
    key: K,
    callback: WatchCallback<Required<AppStorage>[T][K] | undefined>,
  ) {
    const ref = this.getRef(item, key);
    return watch(() => ref.value, callback);
  }

  /** 监听一个设置项的变化（等价于 `watchRef("mcmodderSettings", key, callback)`） */
  watchSettingsRef<K extends keyof Settings>(
    key: K,
    callback: WatchCallback<Settings[K] | undefined>,
  ) {
    return this.watchRef("mcmodderSettings", key, callback);
  }

  /**
   * 判断某个 UID 是否已缓存该用户的资料（`userProfile` 中是否存在该 id 的记录，不校验内容完整性）。
   *
   * @param uid 用户 UID，默认当前登录用户。
   */
  doesProfileDataExist(uid = this.parent.currentUID) {
    const rawData = GM_getValue("userProfile");
    if (!rawData) return false;
    const profiles: Record<string, string> = JSON.parse(rawData);
    return Object.prototype.hasOwnProperty.call(profiles, uid);
  }

  /**
   * 读取「id → JSON 字符串」型记录存储中某个 id 的完整记录并解析为对象。
   *
   * 存储格式：GM 键的值是 `Record<string, string>`，key 为记录 id（UID 或 classID），
   * value 为该记录 JSON 序列化后的字符串。键不存在时会在 GM 中写入 `{}` 兜底并返回空对象。
   *
   * @param storageKey 记录型存储键（`userProfile` 或 `classData`）。
   * @param id 记录 id。
   * @template T 记录对象类型（`Profile` 或 `Class`）。
   */
  private getAllRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
  >(storageKey: K, id: number) {
    let raw = GM_getValue(storageKey) as string | undefined;
    if (!raw) {
      GM_setValue(storageKey, "{}");
      raw = "{}";
    }
    const record = JSON.parse(raw) as Record<string, string>;
    const result = JSON.parse(record[id] ?? "{}") as T;
    return result;
  }

  /**
   * 读取某个记录对象中的一个字段。
   *
   * @param storageKey 记录型存储键（`userProfile` 或 `classData`）。
   * @param key 字段名。
   * @param id 记录 id。
   */
  private getRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
    P extends keyof T,
  >(storageKey: K, key: P, id: number) {
    const data = this.getAllRecord<T, K>(storageKey, id);
    return data[key];
  }

  /**
   * 覆盖写入某个记录对象中的一个字段。
   *
   * @param storageKey 记录型存储键（`userProfile` 或 `classData`）。
   * @param key 字段名。
   * @param value 字段新值。
   * @param id 记录 id。
   */
  private setRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
    P extends keyof T,
  >(storageKey: K, key: P, value: T[P], id: number) {
    const profiles = JSON.parse(GM_getValue(storageKey) || "{}");
    const profile = JSON.parse(profiles[id] || "{}");
    profile[key] = value;
    profiles[id] = JSON.stringify(profile);
    GM_setValue(storageKey, JSON.stringify(profiles));
  }

  /**
   * 合并写入某个 id 的完整记录：将 `content` 并入原记录，并把 `lastUpdated` 置为当前时间戳。
   *
   * @param storageKey 记录型存储键（`userProfile` 或 `classData`）。
   * @param content 待合并的字段（可部分）。
   * @param id 记录 id。
   */
  private setAllRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
  >(storageKey: K, content: T, id: number) {
    const profiles = JSON.parse(GM_getValue(storageKey) || "{}");
    let profile = JSON.parse(profiles[id] || "{}");
    profile = Object.assign(profile, content);
    profile.lastUpdated = Date.now();
    profiles[id] = JSON.stringify(profile);
    GM_setValue(storageKey, JSON.stringify(profiles));
  }

  /**
   * 删除某个 id 的整条记录。
   *
   * @param storageKey 记录型存储键（`userProfile` 或 `classData`）。
   * @param id 记录 id。
   */
  private deleteAllRecord<K extends KeysOfType<Required<AppStorage>, Record<string, string>>>(
    storageKey: K,
    id: number,
  ) {
    const profiles = JSON.parse(GM_getValue(storageKey) || "{}") as Record<string, string>;
    delete profiles[id];
    GM_setValue(storageKey, JSON.stringify(profiles));
  }

  /**
   * 读取当前（或指定）用户的资料中的一个字段。
   *
   * @param key 字段名。
   * @param uid 用户 UID，默认当前用户。
   */
  getProfile<P extends keyof Profile>(key: P, uid = this.parent.currentUID) {
    return this.getRecord<Profile, "userProfile", P>("userProfile", key, uid);
  }
  /** 读取当前（或指定）用户的完整资料对象。
   *
   * @param uid 用户 UID，默认当前用户。
   */
  getAllProfile(uid = this.parent.currentUID) {
    return this.getAllRecord<Profile, "userProfile">("userProfile", uid);
  }
  /**
   * 写入当前（或指定）用户资料中的一个字段。
   *
   * @param key 字段名。
   * @param value 新值。
   * @param uid 用户 UID，默认当前用户。
   */
  setProfile<P extends keyof Profile>(key: P, value: Profile[P], uid = this.parent.currentUID) {
    this.setRecord<Profile, "userProfile", P>("userProfile", key, value, uid);
  }
  // setProfiles(obj: Partial<McmodderProfileData>, uid = this.parent.currentUID) {
  //   Object.entries(obj).forEach(([key, value]) => (this.setProfile as any)(key, value, uid));
  // }
  /**
   * 合并写入当前（或指定）用户的完整资料（自动更新 lastUpdated）。
   *
   * @param content 待合并字段。
   * @param uid 用户 UID，默认当前用户。
   */
  setAllProfile(content: Profile, uid = this.parent.currentUID) {
    this.setAllRecord("userProfile", content, uid);
  }
  /**
   * 删除当前（或指定）用户的整条资料记录。
   *
   * @param uid 用户 UID，默认当前用户
   */
  deleteAllProfile(uid = this.parent.currentUID) {
    this.deleteAllRecord("userProfile", uid);
  }

  /**
   * 读取某个模组记录中的一个字段。
   *
   * @param key 字段名。
   * @param classID 模组 ID。
   */
  getClass<P extends keyof Class>(key: P, classID: number) {
    return this.getRecord<Class, "classData", P>("classData", key, classID);
  }
  /**
   * 读取某个模组的完整记录对象。
   *
   * @param classID 模组 ID。
   */
  getAllClass(classID: number) {
    return this.getAllRecord<Class, "classData">("classData", classID);
  }
  /**
   * 写入某个模组记录中的一个字段。
   *
   * @param key 字段名。
   * @param value 新值。
   * @param classID 模组 ID。
   */
  setClass<P extends keyof Class>(key: P, value: Class[P], classID: number) {
    this.setRecord<Class, "classData", P>("classData", key, value, classID);
  }
  /**
   * 合并写入某个模组的完整记录（自动更新 lastUpdated）。
   *
   * @param content 待合并字段。
   * @param classID 模组 ID。
   */
  setAllClass(content: Class, classID: number) {
    this.setAllRecord("classData", content, classID);
  }
  /**
   * 删除某个模组的整条记录。
   *
   * @param classID 模组 ID。
   */
  deleteAllClass(classID: number) {
    this.deleteAllRecord("classData", classID);
  }
}
