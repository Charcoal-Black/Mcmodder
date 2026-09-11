<template>
  <input ref="inputRef" class="form-control" :placeholder="title + '..'" @input="onInput" @change="onChange">
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import { InputControlRef, InputProps, InputValidInfo, InputValueNumericRange } from '../../../types';
import { useInputBase } from '../../composables/useInputBase';

interface Props extends InputProps<number> {
  range?: InputValueNumericRange
}

const props = withDefaults(defineProps<Props>(), {
  range: () => [null, null]
})

watch(
  () => [props?.range[0], props?.range[1]] as const,
  ([min, max]) => {
    if (min !== undefined && max !== undefined && min !== null && max !== null && min > max) {
      throw new Error("范围右端点须不小于左端点。");
    }
  }
)

const inputRef = useTemplateRef("inputRef");

const {
  valueRef,
  onChange,
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
} = useInputBase({
  inputRef,
  value: props.value,
  validate,
  getDOMValue,
  setDOMValue,
  onSuccessfulChange: props.onSuccessfulChange
});

function onInput() {
  emit("input", getDOMValue());
}

function validate(newValue: number): InputValidInfo<number> {
  const range = props.range;
  const min = range[0] ?? NaN;
  const max = range[1] ?? NaN;
  if (isNaN(newValue)) return { isok: false, msg: `请输入一个正确的数值~` }; 
  if (newValue === valueRef.value) return { isok: false };
  if (!isNaN(min) && newValue < min) return { isok: false, msg: `您输入的数值 (${ newValue.toLocaleString() }) 低于允许的最小值 (${ min.toLocaleString() })，请重新设置~` };
  if (!isNaN(max) && newValue > max) return { isok: false, msg: `您输入的数值 (${ newValue.toLocaleString() }) 高于允许的最大值 (${ max.toLocaleString() })，请重新设置~` };
  return { isok: true, final: newValue };
}

function getDOMValue() {
  return Number(inputRef.value!.value);
}

function setDOMValue(value: number) {
  inputRef.value!.value = Number(value.toFixed(10)).toString();
  emit("input", value);
}

const emit = defineEmits<{
  input: [ value: number ],
}>();

defineExpose<InputControlRef<number>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
})

</script>