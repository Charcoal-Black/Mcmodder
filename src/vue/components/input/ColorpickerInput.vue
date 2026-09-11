<template>
  <input
    class="form-control mcmodder-colorpicker"
    type="color"
    :value="value"
    @change="emit('commit', ($event.target as HTMLInputElement).value)"
  >
</template>

<script setup lang="ts">
defineProps<{
  value?: string;
}>();

const emit = defineEmits<{
  commit: [value: string];
}>();
</script>

<style scoped>
.form-control.mcmodder-colorpicker {
  display: inline-block;
  width: 4.5em;
  height: 2.4em;
  padding: 2px;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  cursor: var(--mcmodder-cursor-hand);
  transition: border-color .2s ease, box-shadow .2s ease;
}
.form-control.mcmodder-colorpicker:focus {
  border-color: var(--mcmodder-color-accent);
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
  outline: none;
}
</style>
