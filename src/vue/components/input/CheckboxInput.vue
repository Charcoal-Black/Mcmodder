<template>
  <span
    class="checkbox"
    :id="id"
    :data-id="id"
    :data-toggle="withTooltip ? 'tooltip' : undefined"
    :data-original-title="withTooltip"
  >
    <input :id="fullID" ref="checkbox" type="checkbox" :checked="value" @change="onChange">
    <label :for="fullID" v-html="title" />
  </span>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { InputControlRef, InputProps, InputValidInfo } from '../../../types';
import { McmodderUtils } from '../../../Utils.ts';
import { useInputBase } from '../../composables/useInputBase.ts';

interface Props extends InputProps<boolean> {
  id?: string,
  withLabel?: boolean,
  withTooltip?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: McmodderUtils.randStr(8),
  withLabel: false
});

const checkboxRef = useTemplateRef("checkbox");

const fullID = computed(() => {
  return "settings-" + props.id;
})

const {
  valueRef,
  onChange,
  getValue,
  setCurrentValue,
  setDisplayValue
} = useInputBase({
  inputRef: checkboxRef,
  value: props.value,
  validate,
  getDOMValue,
  setDOMValue,
  onSuccessfulChange: props.onSuccessfulChange
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
  setDisplayValue
})

</script>