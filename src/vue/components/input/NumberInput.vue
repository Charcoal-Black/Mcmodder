<template>
  <div class="mcmodder-numberinput-container">
    <input
      class="form-control"
      :placeholder="placeholder || (title ? title + '..' : undefined)"
      :value="formatNumber(value)"
      @change="commitNumber($event)"
    >
  </div>
</template>

<script setup lang="ts">
import { McmodderUtils } from "../../../Utils";
import type { InputValueNumericRange } from "../../../types";

const props = defineProps<{
  placeholder?: string;
  title?: string;
  value?: number | string;
  range?: InputValueNumericRange;
}>();

const emit = defineEmits<{
  commit: [value: number];
}>();

function formatNumber(val: any) {
  if (val === undefined || val === null || val === "") return "";
  const num = Number(val);
  return isNaN(num) ? "" : String(Number(num.toFixed(10)));
}

function getRange(): InputValueNumericRange {
  return props.range || [null, null];
}

function commitNumber(e: Event) {
  const input = e.target as HTMLInputElement;
  const newValue = Number(input.value);
  const current = props.value;
  const [min, max] = getRange();
  const showError = (msg: string) => {
    McmodderUtils.commonMsg(msg, false);
    input.value = formatNumber(current);
  };
  if (isNaN(newValue)) {
    showError("请输入一个正确的数值~");
    return;
  }
  if (newValue === Number(current)) return;
  if (min != null && newValue < min) {
    showError(`您输入的数值 (${ newValue.toLocaleString() }) 低于允许的最小值 (${ min.toLocaleString() })，请重新设置~`);
    return;
  }
  if (max != null && newValue > max) {
    showError(`您输入的数值 (${ newValue.toLocaleString() }) 高于允许的最大值 (${ max.toLocaleString() })，请重新设置~`);
    return;
  }
  emit("commit", newValue);
}
</script>

<style scoped>
.mcmodder-numberinput-container {
  display: inline-block;
}
.form-control {
  display: inline-block;
  width: 180px;
  max-width: 100%;
  height: 34px;
  padding: 6px 12px;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  color: var(--mcmodder-color-text);
  font-size: 14px;
  line-height: 1.428;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.form-control:focus {
  border-color: var(--mcmodder-color-accent);
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
  outline: none;
}
</style>
