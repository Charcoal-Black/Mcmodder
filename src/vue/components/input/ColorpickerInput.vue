<template>
  <label :id="id" class="form-control mcmodder-input-color" style="">
    <input
      :id="id"
      ref="inputRef"
      type="color"
      class="mcmodder-input-color-input"
      :placeholder="title + '..'"
      :aria-label="title"
      @change="onChange"
    />
    <div
      class="mcmodder-input-color-inner"
      :style="{
        'background-color': value,
      }"
    />
  </label>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useInputBase } from "../../composables/useInputBase";
import type { InputProps } from "../../../types/props";
import { Utils } from "../../../Utils";

const props = defineProps<InputProps<string>>();

const inputRef = useTemplateRef("inputRef");

const id = Utils.randStr(8);

const { onChange, getValue, setCurrentValue, setDisplayValue } = useInputBase({
  inputRef,
  value: props.value,
  getDOMValue,
  setDOMValue,
  onSuccessfulChange: props.onSuccessfulChange,
});

function getDOMValue() {
  return inputRef.value!.value;
}

function setDOMValue(value: string) {
  inputRef.value!.value = value;
}

function getInstance() {
  return inputRef.value!;
}

defineExpose<InputControlRef<string>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue,
});
</script>

<style lang="css">
.mcmodder-input-color.form-control {
  padding: 0.25em 0.875em;
  margin: 0;
  cursor: var(--mcmodder-cursor-hand);
}

.mcmodder-input-color-inner {
  width: 2em;
  height: 1.5em;
  border-radius: var(--mcmodder-width-radius);
}

.mcmodder-input-color-input {
  display: none;
}
</style>
