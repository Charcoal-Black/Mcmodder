<template>
  <div
    class="mcmodder-progress"
    :class="{ hidden: isVisible }"
  >
    <div
      class="mcmodder-progress-bar"
      :style="{ width: cssBarWidth }"
    />
    <div
      class="mcmodder-progress-per"
      v-html="htmlPerContent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ProgressBarDisplayRule } from '../../types';
import { McmodderUtils } from '../../Utils';

interface Props {
  value?: number,
  min?: number,
  max?: number,
  displayRule?: ProgressBarDisplayRule
}

const props = withDefaults(
  defineProps<Props>(), {
    value: 0,
    min: 0,
    max: 1
  }
)

const DISPLAYRULE_PERCENT: ProgressBarDisplayRule = (val, min, max) => `${ McmodderUtils.getPrecisionFormatter(0, 0).format((val - min) / (max - min) * 100) }%`;
const DISPLAYRULE_FRACTION: ProgressBarDisplayRule = (val, _min, max) => `${ val.toLocaleString() } / ${ max.toLocaleString() }`;

const displayRule = computed(() => 
  props.displayRule ??
  ((props.max ?? 1) === 1 ?
    DISPLAYRULE_PERCENT :
    DISPLAYRULE_FRACTION)
)

const value = ref(props.value);
const min = ref(props.min);
const max = ref(props.max);
const isVisible = ref(true);
const cssBarWidth = computed(() => {
  return `${ max.value === 0 ? 0 : ((value.value - min.value) / (max.value - min.value) * 100) }%`;
});
const htmlPerContent = computed(() => {
  return displayRule.value(value.value, min.value, max.value);
});

function setProgress(val: number) {
  if (!isVisible.value) {
    isVisible.value = true;
  }
  value.value = Math.min(Math.max(min.value, val), max.value);
}

function setProgressToMax() {
  setProgress(max.value);
}

function setMax(val: number) {
  max.value = val;
}

function show() {
  isVisible.value = true;
}

function hide() {
  isVisible.value = false;
}

defineExpose({
  setProgress,
  setProgressToMax,
  setMax,
  show,
  hide
})

</script>