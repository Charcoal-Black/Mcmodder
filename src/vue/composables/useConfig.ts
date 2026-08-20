import { reactive, readonly, watch } from "vue";
import { GM_addValueChangeListener, GM_getValue, GM_setValue } from "$";

export type SettingsObject = Record<string, any>;

function parseSettings(raw?: string): SettingsObject {
  if (raw === undefined || raw === null || raw === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("useConfig: 配置解析失败", e);
    return {};
  }
}

export function useConfig(storageKey = "mcmodderSettings") {
  const config = reactive<SettingsObject>(parseSettings(GM_getValue(storageKey)));

  // 最近一次写入/应用的 JSON 快照，用于跳过自身写回造成的监听回环
  let lastWritten = "";
  let lastApplied = "";

  watch(
    config,
    () => {
      const json = JSON.stringify(config);
      if (json === lastApplied) return;
      if (json === lastWritten) return;
      lastWritten = json;
      GM_setValue(storageKey, json);
    },
    { deep: true }
  );

  GM_addValueChangeListener(storageKey, (_key: string, _oldValue?: string, newValue?: string) => {
    const remote = parseSettings(newValue);
    const currentJson = JSON.stringify(config);
    const remoteJson = JSON.stringify(remote);
    if (remoteJson === currentJson) return;

    for (const key of Object.keys(config)) {
      if (!(key in remote)) {
        delete config[key];
      }
    }
    Object.assign(config, remote);
    lastApplied = JSON.stringify(config);
  });

  function get(key: string, defaultValue: any = undefined) {
    const entry = config[key];
    return entry === undefined ? defaultValue : entry;
  }

  function set(key: string, value: any) {
    if (value === null || value === undefined) {
      delete config[key];
    } else {
      config[key] = value;
    }
  }

  return { config: readonly(config), get, set };
}
