<template>
  <NumberInput
    ref="input"
    :title="title"
    :value="value"
    :range="range"
    :on-successful-change="onSuccessfulChange"
    @input="onInput"
  />
  <div class="mcmodder-slider-container">
    <div
      ref="bar"
      class="mcmodder-slider-bar"
      @pointerdown="onBarPointerdown"
      @pointermove="onBarPointermove"
      @pointerup="onBarPointerup"
      @pointercancel="onBarPointercancel"
    >
      <div
        ref="tap"
        class="mcmodder-slider-tap"
        :class="{ focus: classTapFocus }"
        :style="{ left: cssRate }"
        @pointerdown="onTapPointerdown"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { InputControlRef, InputProps, InputValueFiniteNumericRange } from '../../../types';
import NumberInput from './NumberInput.vue';
import { McmodderUtils } from '../../../Utils.ts';

interface Props extends InputProps<number> {
  range: InputValueFiniteNumericRange,
  precision?: number
}

const props = defineProps<Props>();

watch(
  () => [props.range[0], props.range[1]] as const,
  ([min, max]) => {
    if (min === null && max === null) {
      throw new Error("范围两端点必须存在。");
    }
  }
)

const inputRef = useTemplateRef("input");
const barRef = useTemplateRef("bar");
const tapRef = useTemplateRef("tap");
const valueRef = ref(props.value);

const precision = props.precision ?? getDefaultPrecision(props.range);
let dragOffset = -1;
let dragging = false;
let oldValue: number | undefined;

const classTapFocus = ref(false);

function getDefaultPrecision(range: InputValueFiniteNumericRange) {
  if (range[1] - range[0] == 1) return 0.01;
  return 1;
}

function getBarLeftPos() {
  return barRef.value!.getBoundingClientRect().left;
}

function getTapCenterPos() {
  return tapRef.value!.getBoundingClientRect().left - getBarLeftPos() + getTapWidth() / 2;
}

function getBarWidth() {
  return barRef.value!.getBoundingClientRect().width;
}

function getTapWidth() {
  return tapRef.value!.getBoundingClientRect().width;
}

function onTapPointerdown(e: PointerEvent) {
  dragging = true;
  dragOffset = e.clientX - getTapCenterPos() - getBarLeftPos();
  classTapFocus.value = true;
  oldValue = valueRef.value;
  e.stopPropagation();
  const target = barRef.value;
  if (target && !target.hasPointerCapture(e.pointerId)) {
    target.setPointerCapture(e.pointerId);
  }
}

function onBarPointerdown(e: PointerEvent) {
  dragging = true;
  dragOffset = 0;
  classTapFocus.value = true;
  oldValue = valueRef.value;
  onBarPointermove(e);
  const target = barRef.value;
  if (target && !target.hasPointerCapture(e.pointerId)) {
    target.setPointerCapture(e.pointerId);
  }
}

function onBarPointermove(e: PointerEvent) {
  if (!dragging) return;
  e.preventDefault();
  const dragPos = e.clientX + dragOffset - getBarLeftPos();
  const rate = McmodderUtils.clamp(dragPos / getBarWidth());
  const rawValue = props.range[0] + (props.range[1] - props.range[0]) * rate;
  const value = Math.round(rawValue / precision) * precision;
  setDisplayValue(value);
}

function onBarPointerup(e: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  if (oldValue !== valueRef.value) {
    setCurrentValue(valueRef.value);
  }
  classTapFocus.value = false;
  const target = barRef.value;
  if (target && target.hasPointerCapture(e.pointerId)) {
    target.releasePointerCapture(e.pointerId);
  }
}

function onBarPointercancel(e: PointerEvent) {
  onBarPointerup(e);
}

const cssRate = computed(() => {
  return McmodderUtils.clamp((
    valueRef.value - props.range[0]
  ) / (
    props.range[1] - props.range[0]
  )) * 100 + "%";
})

function onInput(value: number) {
  if (isFinite(value)) {
    valueRef.value = value;
  }
}

function getValue() {
  return inputRef.value!.getValue();
}

function setCurrentValue(value: number) {
  setDisplayValue(value);
  inputRef.value!.setCurrentValue(value);
}

function setDisplayValue(value: number) {
  valueRef.value = value;
  inputRef.value!.setDisplayValue(value);
}

function getInstance() {
  return inputRef.value!.getInstance();
}

defineExpose<InputControlRef<number>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue
})

</script>