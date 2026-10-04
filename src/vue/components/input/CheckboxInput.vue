<template>
  <span
    :id="id"
    class="checkbox"
    :data-id="id"
    :data-toggle="withTooltip ? 'tooltip' : undefined"
    :data-original-title="withTooltip"
  >
    <input :id="fullID" ref="checkbox" type="checkbox" :checked="value" @change="onChange" />
    <!-- 标签内容可能带 <code> 等排版标签 -->
    <!-- eslint-disable-next-line vue/no-v-html -- 入参为 useSanitizedHTML 清洗后的结果 -->
    <label :for="fullID" v-html="safeTitle" />
  </span>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { Utils } from "../../../Utils.ts";
import { useInputBase } from "../../composables/useInputBase.ts";
import type { InputProps } from "../../../types/props";
import { useSanitizedHTML } from "../../composables/useSanitizedHTML";

interface Props extends InputProps<boolean> {
  id?: string;
  withLabel?: boolean;
  withTooltip?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: Utils.randStr(8),
  withLabel: false,
  withTooltip: undefined,
});

const checkboxRef = useTemplateRef("checkbox");

const fullID = computed(() => {
  return "settings-" + props.id;
});

/** `title` 作为 `<label>` 内容渲染，可能含排版标签，绑定 `v-html` 前统一过一遍 sanitizeHTML */
const safeTitle = useSanitizedHTML(() => props.title ?? "");

const { valueRef, onChange, getValue, setCurrentValue, setDisplayValue } = useInputBase({
  inputRef: checkboxRef,
  value: props.value,
  validate,
  getDOMValue,
  setDOMValue,
  onSuccessfulChange: props.onSuccessfulChange,
});

function validate(newValue: boolean): InputValidInfo<boolean> {
  if (newValue !== valueRef.value) return { isok: true, final: !!newValue };
  return { isok: false };
}

function getDOMValue() {
  return checkboxRef.value!.checked;
}

function setDOMValue(value: boolean) {
  checkboxRef.value!.checked = value;
}

function getInstance() {
  return checkboxRef.value!;
}

defineExpose<InputControlRef<boolean>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue,
});
</script>
