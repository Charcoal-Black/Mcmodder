<template>
  <select
    class="mcmodder-select"
    :value="value"
    @change="emit('commit', Number(($event.target as HTMLSelectElement).value))"
  >
    <option
      v-for="(label, num) in range"
      :key="num"
      :value="num"
    >{{ label }}{{ Number(num) === defaultValue ? " (默认)" : "" }}</option>
  </select>
</template>

<script setup lang="ts">
import type { InputValueSet } from "../../../types";

defineProps<{
  value?: number | string;
  range?: InputValueSet;
  defaultValue?: any;
}>();

const emit = defineEmits<{
  commit: [value: number];
}>();
</script>

<style scoped>
.mcmodder-select {
  height: 34px;
  padding: 4px 10px;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  color: var(--mcmodder-color-text);
  font-size: 14px;
  max-width: 100%;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.mcmodder-select:focus {
  border-color: var(--mcmodder-color-accent);
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
  outline: none;
}
</style>
