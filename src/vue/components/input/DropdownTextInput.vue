<template>
  <TextInput ref="textInput" :title="title" :value="value" :on-successful-change="onSuccessfulChange" />
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { InputControlRef, InputListBindElement, InputListOption, InputProps } from '../../../types';
import TextInput from './TextInput.vue';
import { InputListController } from '../../../widget/InputListController.ts';

interface Props extends InputProps<string>, InputListOption {}

const props = defineProps<Props>();
const inputRef = useTemplateRef("textInput");

onMounted(() => {
  const target = inputRef.value!.getInstance();
  InputListController.instance?.add(target as InputListBindElement, props);
})

defineExpose<InputControlRef<string>>({
  getInstance: () => inputRef.value!.getInstance(),
  getValue: () => inputRef.value!.getValue(),
  setCurrentValue: val => inputRef.value!.setCurrentValue(val),
  setDisplayValue: val => inputRef.value!.setDisplayValue(val)
})

</script>