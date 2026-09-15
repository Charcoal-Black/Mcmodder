<template>
  <label class="switch">
    <input
      type="checkbox"
      :id="id"
      :checked="!!value"
      :disabled="disabled"
      @change="emit('commit', ($event.target as HTMLInputElement).checked)"
    >
    <span class="switch-slider" />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  id?: string;
  value?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  commit: [value: boolean];
}>();
</script>

<style scoped>
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex: none;
  cursor: var(--mcmodder-cursor-hand);
}
.switch input[type="checkbox"] {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}
.switch .switch-slider {
  position: absolute;
  inset: 0;
  background-color: var(--mcmodder-color-background-dark3);
  border-radius: 12px;
  transition: background-color .25s ease;
}
.switch .switch-slider::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .35);
  transition: transform .25s cubic-bezier(.4, 1.2, .6, 1);
}
.switch input[type="checkbox"]:checked + .switch-slider {
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent));
}
.switch input[type="checkbox"]:checked + .switch-slider::before {
  transform: translateX(20px);
}
.switch input[type="checkbox"]:focus-visible + .switch-slider {
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
}
.switch input[type="checkbox"]:disabled + .switch-slider {
  opacity: .6;
  cursor: not-allowed;
}
</style>
