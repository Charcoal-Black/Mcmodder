<template>
  <input ref="inputRef" class="form-control" :placeholder="title + '..'" @change="onChange">
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { InputControlRef, InputProps } from '../../../types';
import { useInputBase } from '../../composables/useInputBase';

const props = defineProps<InputProps<string>>();

const inputRef = useTemplateRef("inputRef");

const {
  onChange,
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
} = useInputBase({
  inputRef,
  value: props.value,
  getDOMValue,
  setDOMValue,
  onSuccessfulChange: props.onSuccessfulChange
});

function getDOMValue() {
  return inputRef.value!.value;
}

function setDOMValue(value: string) {
  inputRef.value!.value = value
}

defineExpose<InputControlRef<string>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
})

</script>