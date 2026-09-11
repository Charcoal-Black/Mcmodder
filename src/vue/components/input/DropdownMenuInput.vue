<template>
  <span
    ref="container"
    class="mcmodder-dropdown-container"
    :class="{ expanded: selected }"
  >
    <input
      ref="valueInput"
      readonly
      class="hidden"
      @change="onChange"
    />
    <input
      ref="input"
      readonly
      class="btn mcmodder-dropdown-button"
      :value="content"
      @click="onClick"
      @focus="onFocus"
      @blur="onBlur"
    >
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { InputControlRef, InputProps, InputValueSet } from '../../../types';
import { InputListController } from '../../../widget/InputListController.ts';
import { useInputBase } from '../../composables/useInputBase.ts';

interface Props extends InputProps<number> {
  range: InputValueSet
}

const props = defineProps<Props>();
const containerRef = useTemplateRef("container");
const inputRef = useTemplateRef("input");
const valueInputRef = useTemplateRef("valueInput");

let eventSender: ReturnType<typeof InputListController.instance.add>;
const selected = ref(false);
let focusLock = false;

const content = computed(() => {
  return props.range[valueRef.value];
})

const {
  valueRef,
  getValue,
  onChange
} = useInputBase({
  inputRef: valueInputRef,
  value: props.value,
  getDOMValue,
  validate,
  onSuccessfulChange: props.onSuccessfulChange
});

function getDOMValue() {
  return Number(valueInputRef.value!.value);
}

function onClick() {
  if (selected.value && !focusLock) {
    inputRef.value!.blur();
  }
}

function onFocus() {
  selected.value = true;
  focusLock = true;
  setTimeout(() => {
    focusLock = false;
  }, 100);
}

function onBlur() {
  selected.value = false;
}

onMounted(() => {
  eventSender = InputListController.instance.add(inputRef.value!, {
    inputListBindElement: valueInputRef.value!,
    anchorElement: inputRef.value!,
    alwaysShowAllSuggestions: true,
    suggestionManager: {
      onInitSuggestion: () => Object.entries(props.range).map(([value, html]) => ({ html, value }))
    }
  });
})

function validate(newValue: number) {
  if (Object.keys(props.range).map(Number).includes(newValue)) return {
    isok: true,
    final: newValue
  };
  return {
    isok: false,
    msg: "你干~~嘛~~~哈哈哎~哟。"
  };
}

function getInstance() {
  return containerRef.value!;
}

function setCurrentValue(val: number) {
  valueRef.value = val;
  setDisplayValue(val);
}

function setDisplayValue(val: number) {
  inputRef.value!.value = val.toString();
  eventSender("input");
}

defineExpose<InputControlRef<number>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
})

</script>