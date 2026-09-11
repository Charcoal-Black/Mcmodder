<template>
  <span class="mcmodder-timer" v-html="html" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { TimerDataFormatter, TimerDataGetter } from '../../types';
import { McmodderTimer } from '../../widget/Timer';

interface Props {
  parent: Mcmodder,
  dataGetter: TimerDataGetter | number,
  updateInterval?: number,
  dataFormatter?: TimerDataFormatter
}

const props = withDefaults(defineProps<Props>(), {
  updateInterval: 1000,
  dataFormatter: McmodderTimer.DATAFORMATTER_EN
});

const dataGetter = typeof props.dataGetter === "number" ?
  McmodderTimer.DATAGETTER_CONSTANT(props.dataGetter) :
  props.dataGetter;
const html = ref("");
let intervalID: number | undefined;

onMounted(() => {
  update();
  intervalID = setInterval(() => {
    update();
  }, props.updateInterval);
})

onUnmounted(() => {
  clearInterval(intervalID);
})

function update() {
  let time = dataGetter();
  html.value = time ?
    props.dataFormatter(time - Date.now()) :
    "-";
}

</script>