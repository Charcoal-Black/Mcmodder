<template>
  <input
    class="form-control"
    :placeholder="placeholder"
    :value="value"
    @change="commitText($event)"
  >
</template>

<script setup lang="ts">
const props = defineProps<{
  placeholder?: string;
  value?: string;
}>();

const emit = defineEmits<{
  commit: [value: string];
}>();

function commitText(e: Event) {
  const input = e.target as HTMLInputElement;
  const newValue = input.value.trim();
  if (newValue === props.value) {
    input.value = props.value || "";
    return;
  }
  emit("commit", newValue);
}
</script>

<style scoped>
.form-control {
  display: inline-block;
  width: 260px;
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
