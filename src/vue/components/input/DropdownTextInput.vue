<template>
  <div class="mcmodder-input-container">
    <input
      class="form-control"
      :value="value"
      @focus="openSuggestions"
      @blur="closeSuggestions"
    >
    <div v-if="suggestionOpen" class="mcmodder-input-list">
      <a
        v-for="(rec, i) in (recommendation || []).map(normalizeRecommendation)"
        :key="i"
        href="javascript:void(0)"
        @mousedown.prevent="commitSuggestion(rec.value)"
      >
        <span v-if="rec.html" v-html="rec.html" />
        <span v-else>{{ rec.value }}{{ rec.value === defaultValue ? " (默认)" : "" }}</span>
      </a>
      <span v-if="!(recommendation || []).length" class="empty">没有匹配的推荐项...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { InputSimplifiedRecommendation } from "../../../types";

defineProps<{
  value?: string;
  recommendation?: (InputSimplifiedRecommendation | string)[];
  defaultValue?: string;
}>();

const emit = defineEmits<{
  commit: [value: string];
}>();

const suggestionOpen = ref(false);

function normalizeRecommendation(rec: InputSimplifiedRecommendation | string): { html?: string; value: string } {
  if (typeof rec === "string") return { value: rec };
  return { html: rec.html, value: rec.value };
}

function openSuggestions() {
  suggestionOpen.value = true;
}

function closeSuggestions() {
  window.setTimeout(() => {
    suggestionOpen.value = false;
  }, 150);
}

function commitSuggestion(value: string) {
  suggestionOpen.value = false;
  emit("commit", value);
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
.mcmodder-input-container {
  position: relative;
  display: inline-block;
}
.mcmodder-input-container .form-control {
  width: 260px;
}
.mcmodder-input-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
  background-color: var(--mcmodder-color-background-dark1);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .25);
}
.mcmodder-input-list a {
  display: block;
  padding: 8px 12px;
  color: var(--mcmodder-color-text);
  text-decoration: none;
}
.mcmodder-input-list a:hover {
  background-color: var(--mcmodder-color-accent-transparent2);
}
.mcmodder-input-list .empty {
  display: block;
  padding: 8px 12px;
  color: var(--mcmodder-color-text-dark3);
}
</style>
