<template>
  <input
    ref="inputRef"
    class="form-control mcmodder-keybind-input"
    :value="content"
    @focus="onFocus"
    @keydown="onKeydown"
    @keyup="onKeyup"
    @blur="onBlur"
  >
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef } from 'vue';
import { InputControlRef, InputProps, McmodderKeyData } from '../../../types';
import { useInputBase } from '../../composables/useInputBase';
import { McmodderUtils } from '../../../Utils';

const props = defineProps<InputProps<McmodderKeyData>>();

const inputRef = useTemplateRef("inputRef");
const valueRef = shallowRef(props.value);

const {
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
} = useInputBase({
  inputRef,
  value: props.value,
  validate,
  onSuccessfulChange: props.onSuccessfulChange
});

const keyFinished = ref(true);
const keyQueue = ref(0);

function onFocus() {
  valueRef.value = {};
  keyQueue.value = 0;
  keyFinished.value = false;
}

function onKeydown(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (e.key === valueRef.value?.key) return;
  if (e.key === "Escape") {
    inputRef.value!.blur();
    return;
  }
  valueRef.value = e;
  keyQueue.value++;
  if (e.metaKey && !["Control", "Alt", "Meta", "Shift"].includes(e.key)) {
    onKeyup(e);
  }
}

function onKeyup(e: KeyboardEvent) {
  e.preventDefault();
  if (--keyQueue.value) return;
  const d: McmodderKeyData = {}, r = valueRef.value;
  if (!r) return;
  if (r.ctrlKey) d.ctrlKey = true;
  if (r.shiftKey) d.shiftKey = true;
  if (r.altKey) d.altKey = true;
  if (r.metaKey) d.metaKey = true;
  d.key = r.key;
  if (r.keyCode && r.keyCode >= 97 && r.keyCode <= 122) r.keyCode -= 32;
  d.keyCode = r.keyCode;
  setCurrentValue(d);
  keyFinished.value = true;
  inputRef.value!.blur();
}

function onBlur(e: Event) {
  e.preventDefault();
  if (!keyFinished.value) {
    setCurrentValue({});
    keyFinished.value = true;
  }
}

const content = computed(() => {
  if (!keyFinished.value && keyQueue.value === 0) {
    return "";
  }
  return McmodderUtils.keyToString(valueRef.value);
})

function validate(newValue: McmodderKeyData) {
  return {
    isok: true,
    final: newValue
  };
}

defineExpose<InputControlRef<McmodderKeyData>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
})

</script>