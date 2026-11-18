<template>
  <span ref="rootRef" class="mcmodder-radio-group" role="radiogroup" :aria-label="title">
    <label v-for="item in items" :key="item.value" class="mcmodder-radio-item">
      <input
        type="radio"
        :name="groupName"
        :value="item.value"
        :checked="item.value === valueRef"
        @change="onChange"
      />
      <!-- eslint-disable-next-line vue/no-v-html -- 选项文案取自 ConfigLoader 的静态配置（仅含 <b> 等排版标签），非用户输入 -->
      <span v-html="item.label" />
    </label>
  </span>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useInputBase } from "../../composables/useInputBase";
import type { InputProps } from "../../../types/props";

/**
 * 单选按钮组（`"radioGroup"` 的实现）。
 *
 * 与 `DropdownMenuInput` 的区别：选项全部平铺可见，不依赖全局候选列表
 * （`InputListPopoverController` 用 `createApp().mount()` 挂载，在设置面板这类
 * 动态渲染的场景里不可靠）。选项较少、且希望用户一眼看到全部取值时用这个。
 */
interface Props extends InputProps<number> {
  range: InputValueSet;
}

const props = defineProps<Props>();

const rootRef = useTemplateRef("rootRef");

/** 每个控件实例需要独立的 `name`，否则同页多个单选组会互相干扰 */
const groupName = `mcmodder-radio-${Math.random().toString(36).slice(2, 9)}`;

/** `range` 是「值 → 展示 HTML」的映射，转成有序数组供 `v-for` 使用 */
const items = computed(() =>
  Object.entries(props.range).map(([value, label]) => ({
    value: Number(value),
    label: String(label),
  })),
);

const { valueRef, onChange, getInstance } = useInputBase({
  inputRef: rootRef,
  value: props.value,
  getDOMValue,
  onSuccessfulChange: props.onSuccessfulChange,
});

/** 从选中的 radio 读取值（不引用 `valueRef`，避免与 `useInputBase` 形成循环推断） */
function getDOMValue(): number {
  const checked = rootRef.value?.querySelector<HTMLInputElement>("input:checked");
  return checked == null ? props.value : Number(checked.value);
}

defineExpose<InputControlRef<number>>({
  getInstance,
  getValue: () => valueRef.value,
  setCurrentValue: (newValue: number) => {
    valueRef.value = newValue;
  },
  setDisplayValue: () => {
    // 受控于 `:checked`，无需额外回填
  },
});
</script>

<style scoped>
.mcmodder-radio-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 14px;
}

.mcmodder-radio-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.mcmodder-radio-item input {
  margin: 0;
  cursor: pointer;
}
</style>
