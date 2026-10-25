<template>
  <Popover ref="popoverRef" v-bind="popoverProps">
    <div v-if="option" class="mcmodder-attitude-reactors-popover">
      <AttitudeReactorList
        :key="`${option.commentId}:${option.attitudeType}:${openGeneration}`"
        :parent="option.parent"
        :comment-id="option.commentId"
        :attitude-type="option.attitudeType"
        @height-change="onHeightChange"
      />
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { ref, shallowRef } from "vue";
import Popover from "../Popover.vue";
import AttitudeReactorList from "./AttitudeReactorList.vue";
import { usePopoverHost } from "../../composables/usePopoverHost";
import type { AttitudeReactorsOption, PopoverExpose } from "../../../types/props";

const { popoverRef, visible, popoverProps, applyOption, updatePos, close } = usePopoverHost({
  maxHeight: 320,
});
const option = shallowRef<AttitudeReactorsOption>();
const openGeneration = ref(0);

function setOption(newOption: AttitudeReactorsOption) {
  option.value = newOption;
  openGeneration.value += 1;
  applyOption(newOption);
  visible.value = true;
}

function onHeightChange() {
  popoverRef.value?.onPopoverHeightChange();
}

defineExpose<PopoverExpose<AttitudeReactorsOption, Record<string, never>>>({
  setOption,
  inputEvents: {},
  updatePos,
  close,
});
</script>
