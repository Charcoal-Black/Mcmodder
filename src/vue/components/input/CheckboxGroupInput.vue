<template>
  <div ref="rootRef" class="mcmodder-checkbox-group" role="group" :aria-label="title">
    <label v-for="item in items" :key="item.value" class="mcmodder-checkbox-item">
      <input
        type="checkbox"
        :value="item.value"
        :checked="checked.has(item.value)"
        @change="onToggle(item.value, ($event.target as HTMLInputElement).checked)"
      />
      <!-- eslint-disable-next-line vue/no-v-html -- 选项文案取自 ConfigLoader 的静态配置，非用户输入 -->
      <span v-html="item.label" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, useTemplateRef } from "vue";
import { useInputBase } from "../../composables/useInputBase";
import type { InputProps } from "../../../types/props";

/**
 * 多选复选框组（`"checkboxGroup"` 的实现）。
 *
 * 值以**半角逗号分隔的字符串**在配置里存取（与 `userBlacklist` 等方法一致），
 * 便于复用既有的文本型配置读写与解析逻辑。`range` 提供「值 → 展示文案」的映射。
 */
interface Props extends InputProps<string> {
  range: InputValueTextSet;
}

const props = defineProps<Props>();

const rootRef = useTemplateRef("rootRef");

const items = computed(() =>
  Object.entries(props.range).map(([value, label]) => ({
    value,
    label: String(label),
  })),
);

/** 由配置字符串解析出的选中集合 */
const checked = reactive(new Set<string>(splitValues(props.value)));

function splitValues(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const { onChange, getInstance } = useInputBase({
  inputRef: rootRef,
  value: props.value,
  getDOMValue,
  onSuccessfulChange: props.onSuccessfulChange,
});

/** 把选中集合序列化回配置字符串（保持 `range` 的声明顺序，输出稳定） */
function getDOMValue(): string {
  return items.value
    .map((item) => item.value)
    .filter((value) => checked.has(value))
    .join(",");
}

function onToggle(value: string, isChecked: boolean) {
  if (isChecked) {
    checked.add(value);
  } else {
    checked.delete(value);
  }
  onChange();
}

defineExpose<InputControlRef<string>>({
  getInstance,
  getValue: () => getDOMValue(),
  setCurrentValue: (newValue: string) => {
    checked.clear();
    splitValues(newValue).forEach((item) => checked.add(item));
  },
  setDisplayValue: () => {
    // 受控于 `:checked`，无需额外回填
  },
});
</script>

<style scoped>
.mcmodder-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.mcmodder-checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-weight: normal;
  cursor: pointer;
  white-space: nowrap;
}

.mcmodder-checkbox-item input {
  margin: 0;
  cursor: pointer;
}
</style>
