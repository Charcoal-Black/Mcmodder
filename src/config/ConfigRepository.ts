import { computed, triggerRef, type ComputedRef } from "vue";
import type { Mcmodder } from "../Mcmodder";
import type { StorageBuffer } from "../StorageBuffer";
import { GM_getValue, GM_setValue } from "$";

export class ConfigRepository {
  private readonly parent: Mcmodder;
  private readonly buffer: StorageBuffer;

  private getConfigData(id: keyof Settings) {
    return this.parent.cfgutils.data[id];
  }

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.buffer = parent.storageBuffer;
  }

  getStorageRef<
    T extends keyof AppStorage
  >(item: T) {
    const isCacheable = this.parent.storageBuffer.isCacheable(item);
    if (!isCacheable) {
      throw new Error(`配置 ${ item } 尚未缓存...`);
    }
    return this.parent.storageBuffer.storageRef[item]!;
  }

  triggerRefByItem<
    T extends keyof AppStorage
  >(item: T) {
    triggerRef(this.getStorageRef(item));
  }

  getAll<
    T extends keyof AppStorage
  >(item: T) {
    // item ??= "mcmodderSettings" as T;
    const isCacheable = this.buffer.isCacheable(item);
    let data: AppStorage[T] | undefined;
    if (isCacheable) data = this.buffer.storageRef[item]!.value;
    else {
      let raw = GM_getValue(item) as string | undefined;
      if (raw === undefined) return undefined;
      data = JSON.parse(raw) as AppStorage[T];
    }
    if (data === undefined) return undefined;
    return data as Required<AppStorage>[T]; 
  }

  getAllSettings() {
    return this.getAll("mcmodderSettings");
  }

  get<
    T extends keyof AppStorage,
    K extends keyof Required<AppStorage>[T]
  >(item: T, key: K) {
    // mcmodderUI 被修复后请移除下一行
    // if (key === "mcmodderUI" && item === "mcmodderSettings") return true;

    const data = this.getAll(item);
    if (data === undefined) return undefined;
    let entry = data[key];
    return entry as Required<AppStorage>[T][K];
  }

  getSettings<
    K extends keyof Settings
  >(key: K) {
    return this.get("mcmodderSettings", key);
  }

  getRef<
    T extends keyof AppStorage,
    K extends keyof AppStorage[T],
    V = undefined
  >(item: T, key: K, defaultValue: V = undefined as V) {
    const ref = this.getStorageRef(item);
    return computed(() => (ref.value)?.[key] ?? defaultValue);
  }

  getSettingsRef<
    K extends keyof Settings,
    V = undefined
  >(key: K, defaultValue: V = undefined as V) {
    return this.getRef("mcmodderSettings", key, defaultValue);
  }

  getAsNumberList<
    T extends keyof AppStorage,
    K extends keyof Required<AppStorage>[T]
  >(item: T, key: K) {
    let config = this.get(item, key);
    if (config === undefined) return undefined;
    if (typeof config === "string") {
      return config.replaceAll(" ", "").split(",").map(Number);
    }
    return (config as (number | string)[] | undefined)?.map(Number);
  }

  getSettingsAsNumberList<
    K extends keyof Settings
  >(key: K) {
    return this.getAsNumberList("mcmodderSettings", key);
  }

  getRefAsNumberList<
    T extends keyof AppStorage,
    K extends keyof NonNullable<AppStorage[T]>
  >(item: T, key: K) {
    const ref = this.getStorageRef(item);
    return computed(() => {
      const value = (ref.value)?.[key];
      if (typeof value === "string") {
        return value.replaceAll(" ", "").split(",").map(Number);
      }
      return (value as (number | string)[] | undefined)?.map(Number) ?? [];
    });
  }

  getSettingsRefAsNumberList<
    K extends keyof Settings
  >(key: K) {
    return this.getRefAsNumberList("mcmodderSettings", key) ?? [];
  }

  set<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T]
  >(item: T, key: K, value: /* Required<AppStorage>[T][K] */ unknown) {
    let obj = JSON.parse(GM_getValue(item) ?? "{}"); // as Required<AppStorage>[T];
    obj[key] = value;
    GM_setValue(item, JSON.stringify(obj));
    if (this.parent.storageBuffer.isCacheable(item)) {
      (this.getStorageRef(item).value as Required<AppStorage>[T])[key] = value as Required<AppStorage>[T][K];
      this.triggerRefByItem(item);
    }
  }

  setSettings<
    K extends keyof Settings
  >(key: K, value: /* Required<AppStorage>[T][K] */ unknown) {
    this.set("mcmodderSettings", key, value);
  }

  setSettingsAsNumberList<
    K extends KeysOfType<Settings, string>
  >(key: K, value: number[]) {
    return this.setAsNumberList("mcmodderSettings", key, value);
  }

  getWritableRef<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T], V = undefined
  >(item: T, key: K, defaultValue: V = undefined as V) {
    const ref = this.getRef(key as any, item) as ComputedRef<Required<AppStorage>[T][K] | undefined>;
    return computed<Required<AppStorage>[T][K] | V>({
      get: () => ref.value ?? defaultValue,
      set: value => this.set(item, key, value ?? defaultValue)
    })
  }

  getSettingsWritableRef<
    K extends keyof Settings
  >(key: K) {
    const ref = this.getRef("mcmodderSettings", key) as ComputedRef<Settings[K] | undefined>;
    return computed<Settings[K]>({
      get: () => ref.value ?? this.getConfigData(key).value,
      set: value => this.set("mcmodderSettings", key, value)
    })
  }

  getWritableRefAsNumberList<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof Required<AppStorage>[T],
  >(item: T, key: K, defaultValue: number[] = []) {
    const ref = this.getRefAsNumberList(item, key as /* 这是一场豪赌 */ any);
    return computed({
      get: () => ref.value ?? defaultValue,
      set: value => this.setAsNumberList(item, key as /* 这是一场豪赌 */ any, value ?? defaultValue)
    })
  }

  getSettingsWritableRefAsNumberList<
    K extends keyof Settings
  >(key: K, onGetValue: (value: number[]) => number[] = value => value) {
    const ref = this.getRefAsNumberList("mcmodderSettings", key);
    return computed({
      get: () => onGetValue(ref.value ?? []),
      set: value => this.setAsNumberList("mcmodderSettings", key as /* 这是一场豪赌 */ any, value)
    })
  }

  setAsNumberList<
    T extends KeysOfType<Required<AppStorage>, object>,
    K extends KeysOfType<Required<AppStorage>[T], string>
  >(item: T, key: K, value: number[]) {
    return this.set(item, key, value.join(","));
  }

  delete<
    T extends KeysOfType<Required<AppStorage>, Record<string, any>>,
    K extends keyof NonNullable<AppStorage[T]>
  >(item: T, key: K) {
    let obj = JSON.parse(GM_getValue(item) ?? "{}") // as NonNullable<AppStorage[T]>;
    delete obj[key];
    GM_setValue(item, JSON.stringify(obj));
  }

  deleteSettings<
    K extends keyof Settings
  >(key: K) {
    this.delete("mcmodderSettings", key);
  }

  setAll<
    T extends keyof AppStorage = "mcmodderSettings",
  >(item: T, value: AppStorage[T]) {
    if (!item) return;
    GM_setValue(item, JSON.stringify(value));
    if (this.parent.storageBuffer.isCacheable(item)) {
      this.getStorageRef(item).value = value;
    }
  }

  doesProfileDataExist(uid = this.parent.currentUID) {
    const rawData = GM_getValue("userProfile");
    if (!rawData) return false;
    const profiles: Record<string, Profile> = JSON.parse(rawData);
    return profiles.hasOwnProperty(uid);
  }

  private getAllRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>
  >(storageKey: K, id: number) {
    let raw = GM_getValue(storageKey) as string | undefined;
    if (!raw) {
      GM_setValue(storageKey, "{}");
      raw = "{}";
    }
    const record = JSON.parse(raw) as Record<string, string>;
    let result = JSON.parse(record[id] ?? "{}") as T;
    return result;
  }

  private getRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
    P extends keyof T
  >(storageKey: K, key: P, id: number) {
    const data = this.getAllRecord<T, K>(storageKey, id);
    return data[key];
  }

  private setRecord<
    T extends Profile | Class,
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
    P extends keyof T
  >(storageKey: K, key: P, value: T[P], id: number) {
    const profiles = JSON.parse(GM_getValue(storageKey) || "{}");
    let profile = JSON.parse(profiles[id] || "{}");
    profile[key] = value;
    profiles[id] = JSON.stringify(profile);
    GM_setValue(storageKey, JSON.stringify(profiles));
  }

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

  private deleteAllRecord<
    K extends KeysOfType<Required<AppStorage>, Record<string, string>>,
  >(storageKey: K, id: number) {
    const profiles = JSON.parse(GM_getValue(storageKey) || "{}") as Record<string, string>;
    delete profiles[id];
    GM_setValue(storageKey, JSON.stringify(profiles));
  }

  getProfile<P extends keyof Profile>(key: P, uid = this.parent.currentUID) {
    return this.getRecord<Profile, "userProfile", P>("userProfile", key, uid);
  }
  getAllProfile(uid = this.parent.currentUID) {
    return this.getAllRecord<Profile, "userProfile">("userProfile", uid);
  }
  setProfile<P extends keyof Profile>(key: P, value: Profile[P], uid = this.parent.currentUID) {
    this.setRecord<Profile, "userProfile", P>("userProfile", key, value, uid);
  }
  // setProfiles(obj: Partial<McmodderProfileData>, uid = this.parent.currentUID) {
  //   Object.entries(obj).forEach(([key, value]) => (this.setProfile as any)(key, value, uid));
  // }
  setAllProfile(content: Profile, uid = this.parent.currentUID) {
    this.setAllRecord("userProfile", content, uid);
  }
  deleteAllProfile(uid = this.parent.currentUID) {
    this.deleteAllRecord("userProfile", uid);
  }

  getClass<P extends keyof Class>(key: P, classID: number) {
    return this.getRecord<Class, "classData", P>("classData", key, classID);
  }
  getAllClass(classID: number) {
    return this.getAllRecord<Class, "classData">("classData", classID);
  }
  setClass<P extends keyof Class>(key: P, value: Class[P], classID: number) {
    this.setRecord<Class, "classData", P>("classData", key, value, classID);
  }
  setAllClass(content: Class, classID: number) {
    this.setAllRecord("classData", content, classID);
  }
  deleteAllClass(classID: number) {
    this.deleteAllRecord("classData", classID);
  }
}