<template>
  <pre>{{ raw }}</pre>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { GUI } from "../schema";
import { McmodRepository } from "../../../../data/McmodRepository";
import { Utils } from "../../../../../../src/Utils";

const { tab, gui } = defineProps<{ tab: McmodTabEditorInnerData; gui: GUI }>();

/**
 * @warning 如果在输入和/或输出中出现了矿词/标签，那么 `in_iid` 的每个键值会带上
 * `i` 前缀（如 `i123456`）；`out_iid` 的每个键值会带上 `o` 前缀（如 `o123456`）。
 *
 * 似乎纯数字 ID 配方也会出现 `i` / `o` 前缀，触发条件依旧存疑...
 */
const raw = computed(() => {
  const input = { ...tab["slot-in-item"] };
  const output = { ...tab["slot-out-item"] };
  const hasTag = [input, output]
    .map((ids) => Object.values(ids))
    .some((ids) => ids.some((id) => !/\d+/.test(id.trim())));
  if (hasTag) {
    [input, output].forEach((ids) => {
      Utils.getKeys(ids).forEach((key) => (ids[key] = `i${ids[key]}`));
    });
  }
  const power = { ...tab["slot-power-number"] };
  Utils.getKeys(power).forEach((id) => {
    const template = gui.power[id];
    power[id] = template.replace("%s", power[id]); // 这里不需要考虑千位分隔符的问题
  });
  const result = {
    in_iid: input,
    in_num: tab["slot-in-number"],
    in_chance: tab["slot-in-chance"],
    out_iid: output,
    out_num: tab["slot-out-number"],
    out_chance: tab["slot-out-chance"],
    fuel_num: tab["slot-fuel-number"],
    power_num: tab["slot-power-number"],
    gui: `(ID:${gui.guiID}) ${gui.name} - 来自 (ID:${gui.classID}) ${McmodRepository.getClass(gui.classID).name}`,
  };
  Utils.deleteEmptyProperties(result);
  Utils.getEntries(result).forEach(([key, value]) => {
    if (typeof value === "object" && Object.keys(value).length === 0) {
      delete result[key];
    }
  });
  return JSON.stringify(result, null, 2);
});
</script>
