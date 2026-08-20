<template>
  <input
    class="form-control mcmodder-keybind-input"
    :value="keybindDisplay()"
    @focus="keybindOnFocus"
    @keydown="keybindOnKeydown($event)"
    @keyup="keybindOnKeyup($event)"
    @blur="keybindOnBlur"
  >
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { McmodderUtils } from "../../../Utils";
import type { McmodderKeyData } from "../../../types";

const props = defineProps<{
  value?: McmodderKeyData;
}>();

const emit = defineEmits<{
  commit: [value: McmodderKeyData];
}>();

const keybindState = reactive<{ lastData?: McmodderKeyData; queue: number; finished: boolean }>({
  queue: 0,
  finished: false
});

function keybindDisplay() {
  return McmodderUtils.keyToString(props.value || {});
}

function keybindOnFocus() {
  keybindState.lastData = undefined;
  keybindState.queue = 0;
  keybindState.finished = false;
}

function keybindOnKeydown(e: KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
  if (e.key === keybindState.lastData?.key) return;
  if (e.key === "Escape") {
    keybindState.lastData = undefined;
    keybindState.queue = 0;
    keybindState.finished = false;
    (e.target as HTMLInputElement).blur();
    return;
  }
  keybindState.lastData = e as unknown as McmodderKeyData;
  keybindState.queue++;
  (e.target as HTMLInputElement).value = McmodderUtils.keyToString(e as unknown as McmodderKeyData);
  if (e.metaKey && !["Control", "Alt", "Meta", "Shift"].includes(e.key)) {
    keybindOnKeyup(e);
  }
}

function keybindOnKeyup(e: KeyboardEvent) {
  e.preventDefault();
  if (--keybindState.queue) return;
  const r = keybindState.lastData;
  if (!r) return;
  const d: McmodderKeyData = {};
  if (r.ctrlKey) d.ctrlKey = true;
  if (r.shiftKey) d.shiftKey = true;
  if (r.altKey) d.altKey = true;
  if (r.metaKey) d.metaKey = true;
  d.key = r.key;
  if (r.keyCode && r.keyCode >= 97 && r.keyCode <= 122) r.keyCode -= 32;
  d.keyCode = r.keyCode;
  keybindState.finished = true;
  emit("commit", d);
  (e.target as HTMLInputElement).blur();
}

function keybindOnBlur() {
  if (keybindState.finished) return;
  emit("commit", {});
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
.mcmodder-keybind-input {
  font-family: Consolas, "Courier New", monospace !important;
}
</style>
