<template>
  <div class="setting-input">
    <label v-if="data?.type === McmodderInputType.CHECKBOX" class="switch">
      <input
        type="checkbox"
        :id="`settings-${ entry }`"
        :checked="!!value"
        @change="emit('commit', ($event.target as HTMLInputElement).checked)"
      >
      <span class="switch-slider" />
    </label>

    <template v-else-if="data?.type === McmodderInputType.NUMBER">
      <div class="mcmodder-numberinput-container">
        <input
          class="form-control"
          :placeholder="data?.title + '..'"
          :value="formatNumber(value)"
          @change="commitNumber($event)"
        >
      </div>
    </template>

    <template v-else-if="data?.type === McmodderInputType.SLIDER">
      <div class="mcmodder-numberinput-container">
        <input
          class="form-control"
          :placeholder="data?.title + '..'"
          :value="formatNumber(sliderLive ?? value)"
          @change="commitNumber($event)"
        >
        <div ref="sliderBar" class="mcmodder-slider-container">
          <div
            class="mcmodder-slider-bar"
            @mousedown="onSliderBarMousedown($event)"
            @mousemove="onSliderMousemove($event)"
            @mouseup="onSliderMouseup"
          >
            <div
              class="mcmodder-slider-tap"
              :class="{ focus: sliderDragging }"
              :style="{ left: getSliderRate() * 100 + '%' }"
              @mousedown="onSliderTapMousedown($event)"
            />
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="data?.type === McmodderInputType.TEXT">
      <input
        class="form-control"
        :value="value"
        @change="commitText($event)"
      >
    </template>

    <template v-else-if="data?.type === McmodderInputType.COLORPICKER">
      <input
        class="form-control mcmodder-colorpicker"
        type="color"
        :value="value"
        @change="emit('commit', ($event.target as HTMLInputElement).value)"
      >
    </template>

    <template v-else-if="data?.type === McmodderInputType.KEYBIND">
      <input
        class="form-control mcmodder-keybind-input"
        :value="keybindDisplay()"
        @focus="keybindOnFocus"
        @keydown="keybindOnKeydown($event)"
        @keyup="keybindOnKeyup($event)"
        @blur="keybindOnBlur"
      >
    </template>

    <template v-else-if="data?.type === McmodderInputType.DROPDOWN_MENU">
      <select
        class="mcmodder-select"
        :value="value"
        @change="emit('commit', Number(($event.target as HTMLSelectElement).value))"
      >
        <option
          v-for="(label, num) in data?.range"
          :key="num"
          :value="num"
        >{{ label }}{{ Number(num) === data?.value ? " (默认)" : "" }}</option>
      </select>
    </template>

    <template v-else-if="data?.type === McmodderInputType.DROPDOWN_TEXT_MENU">
      <div class="mcmodder-input-container">
        <input
          class="form-control"
          :value="value"
          @focus="openSuggestions"
          @blur="closeSuggestions"
        >
        <div v-if="suggestionOpen" class="mcmodder-input-list">
          <a
            v-for="(rec, i) in (data?.recommendation || []).map(normalizeRecommendation)"
            :key="i"
            href="javascript:void(0)"
            @mousedown.prevent="commitSuggestion(rec.value)"
          >
            <span v-if="rec.html" v-html="rec.html" />
            <span v-else>{{ rec.value }}{{ isDefaultRecommendation(rec.value) ? " (默认)" : "" }}</span>
          </a>
          <span v-if="!(data?.recommendation || []).length" class="empty">没有匹配的推荐项...</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, useTemplateRef } from "vue";
import { McmodderInputType } from "../../config/ConfigUtils";
import { McmodderUtils } from "../../Utils";
import type { InputSimplifiedRecommendation, InputValueNumericRange, McmodderConfigData, McmodderKeyData } from "../../types";

const props = defineProps<{
  entry: string;
  data: McmodderConfigData | undefined;
  value: any;
}>();

const emit = defineEmits<{
  commit: [value: any];
}>();

function formatNumber(value: any) {
  if (value === undefined || value === null || value === "") return "";
  const num = Number(value);
  return isNaN(num) ? "" : String(Number(num.toFixed(10)));
}

function getRange(): InputValueNumericRange {
  const range = props.data?.range as InputValueNumericRange | undefined;
  return range || [null, null];
}

function commitNumber(e: Event) {
  const input = e.target as HTMLInputElement;
  const newValue = Number(input.value);
  const current = props.value;
  const [min, max] = getRange();
  const showError = (msg: string) => {
    McmodderUtils.commonMsg(msg, false);
    input.value = formatNumber(current);
  };
  if (isNaN(newValue)) {
    showError("请输入一个正确的数值~");
    return;
  }
  if (newValue === Number(current)) return;
  if (min != null && newValue < min) {
    showError(`您输入的数值 (${ newValue.toLocaleString() }) 低于允许的最小值 (${ min.toLocaleString() })，请重新设置~`);
    return;
  }
  if (max != null && newValue > max) {
    showError(`您输入的数值 (${ newValue.toLocaleString() }) 高于允许的最大值 (${ max.toLocaleString() })，请重新设置~`);
    return;
  }
  emit("commit", newValue);
}

function commitText(e: Event) {
  const input = e.target as HTMLInputElement;
  const newValue = input.value.trim();
  if (newValue === props.value) {
    input.value = props.value;
    return;
  }
  emit("commit", newValue);
}

const sliderBar = useTemplateRef<HTMLElement>("sliderBar");
const sliderLive = ref<number | undefined>(undefined);
const sliderDragging = ref(false);
let sliderDragOffset = 0;

function getSliderRange(): [number, number] {
  const [min, max] = getRange();
  return [min ?? 0, max ?? 1];
}

function getSliderRate() {
  const [min, max] = getRange();
  if (min == null || max == null || max <= min) return 0;
  const current = sliderLive.value ?? props.value;
  return McmodderUtils.clamp((Number(current) - min) / (max - min));
}

function onSliderTapMousedown(e: MouseEvent) {
  const bar = sliderBar.value;
  if (!bar) return;
  sliderDragging.value = true;
  const tap = e.currentTarget as HTMLElement;
  const tapCenter = tap.getBoundingClientRect().left - bar.getBoundingClientRect().left + tap.getBoundingClientRect().width / 2;
  sliderDragOffset = e.screenX - tapCenter - bar.getBoundingClientRect().left;
  e.stopPropagation();
  e.preventDefault();
}

function onSliderBarMousedown(e: MouseEvent) {
  sliderDragging.value = true;
  sliderDragOffset = 0;
  e.preventDefault();
  updateSliderFromMouse(e);
}

function onSliderMousemove(e: MouseEvent) {
  if (!sliderDragging.value) return;
  updateSliderFromMouse(e);
}

function onSliderMouseup() {
  if (!sliderDragging.value) return;
  sliderDragging.value = false;
  const live = sliderLive.value;
  if (live !== undefined && live !== Number(props.value)) {
    emit("commit", live);
  }
}

function updateSliderFromMouse(e: MouseEvent) {
  const bar = sliderBar.value;
  if (!bar) return;
  const [min, max] = getSliderRange();
  const barLeft = bar.getBoundingClientRect().left;
  const barWidth = bar.getBoundingClientRect().width;
  const dragPos = e.screenX + sliderDragOffset - barLeft;
  const rate = McmodderUtils.clamp(dragPos / barWidth);
  const precision = max - min === 1 ? 0.01 : 1;
  const rawValue = min + (max - min) * rate;
  sliderLive.value = Math.round(rawValue / precision) * precision;
}

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

const suggestionOpen = ref(false);

function normalizeRecommendation(rec: InputSimplifiedRecommendation): { html?: string; value: string } {
  if (typeof rec === "string") return { value: rec };
  return { html: rec.html, value: rec.value };
}

function isDefaultRecommendation(value: string) {
  return props.data?.value === value;
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
.setting-input {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .5em .8em;
  flex: 0 1 auto;
  min-width: 260px;
}
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
.form-control.mcmodder-colorpicker {
  width: 4.5em;
  height: 2.4em;
  padding: 2px;
}
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
.mcmodder-numberinput-container {
  display: inline-block;
}
.mcmodder-numberinput-container .form-control {
  width: 180px;
}
.mcmodder-slider-container {
  display: inline-block;
  width: 240px;
  vertical-align: middle;
  margin-left: .5em;
}
.mcmodder-slider-bar {
  position: relative;
  height: 6px;
  background-color: var(--mcmodder-color-background-dark3);
  border-radius: 3px;
  cursor: var(--mcmodder-cursor-hand);
}
.mcmodder-slider-tap {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent));
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .35);
  margin-left: -8px;
}
.mcmodder-slider-tap.focus {
  box-shadow: 0 0 0 .25em var(--mcmodder-color-accent-transparent2);
}
.mcmodder-keybind-input {
  font-family: Consolas, "Courier New", monospace !important;
}
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
