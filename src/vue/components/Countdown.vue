<template>
  <span class="mcmodder-timer" v-text="text" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Mcmodder } from "../../Mcmodder";
import { TimerUtils } from "../../widget/TimerUtils";

interface Props {
  parent: Mcmodder;
  dataGetter: TimerDataGetter | number;
  updateInterval?: number;
  dataFormatter?: TimerDataFormatter;
}

const props = withDefaults(defineProps<Props>(), {
  updateInterval: 1000,
  dataFormatter: () => TimerUtils.DATAFORMATTER_EN,
});

const dataGetter =
  typeof props.dataGetter === "number"
    ? TimerUtils.DATAGETTER_CONSTANT(props.dataGetter)
    : props.dataGetter;
const text = ref("");
let intervalID: number | undefined;

onMounted(() => {
  update();
  intervalID = setInterval(() => {
    update();
  }, props.updateInterval);
});

onUnmounted(() => {
  clearInterval(intervalID);
});

function update() {
  let time = dataGetter();
  text.value = time ? props.dataFormatter(time - Date.now()) : "-";
}
</script>
