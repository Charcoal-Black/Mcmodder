<template>
  <div class="mcmodder-numberinput-container">
    <input
      class="form-control"
      :placeholder="placeholder || (title ? title + '..' : undefined)"
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

<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { McmodderUtils } from "../../../Utils";
import type { InputValueNumericRange } from "../../../types";

const props = defineProps<{
  placeholder?: string;
  title?: string;
  value?: number | string;
  range?: InputValueNumericRange;
}>();

const emit = defineEmits<{
  commit: [value: number];
}>();

function formatNumber(val: any) {
  if (val === undefined || val === null || val === "") return "";
  const num = Number(val);
  return isNaN(num) ? "" : String(Number(num.toFixed(10)));
}

function getRange(): InputValueNumericRange {
  return props.range || [null, null];
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
</script>

<style scoped>
.mcmodder-numberinput-container {
  display: inline-block;
}
.form-control {
  display: inline-block;
  width: 180px;
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
</style>
