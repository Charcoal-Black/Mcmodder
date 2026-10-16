<template>
  <Popover ref="popoverRef" :anchor-element="option?.anchorElement">
    <div v-if="sticker" class="mcmodder-attitude-sticker-viewer-container">
      <div class="mcmodder-attitude-sticker-viewer">
        <img
          v-show="!imagePending"
          :key="sticker.id"
          class="mcmodder-attitude-sticker-viewer-img"
          :src="sticker.image_url"
          @load="imagePending = false"
        />
        <div v-show="imagePending" class="cmodder-attitude-sticker-viewer-img mcmodder-loading" />
      </div>
      <div class="mcmodder-attitude-sticker-viewer-desc">
        <div class="mcmodder-attitude-sticker-viewer-name" v-text="sticker.name" />
      </div>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, useTemplateRef, watch } from "vue";
import Popover from "./Popover.vue";
import type { PopoverExpose, StickerViewerOption } from "../../types/props";

const popoverRef = useTemplateRef("popoverRef");

const option = shallowRef<StickerViewerOption>();
const sticker = computed(() => option.value?.sticker);
const visible = ref(false);
const imagePending = ref(true);

function setOption(newOption: StickerViewerOption) {
  if (newOption.sticker !== option.value?.sticker) {
    imagePending.value = true;
  }
  option.value = newOption;
  visible.value = true;
}

watch(
  () => visible.value,
  (newValue) => {
    popoverRef.value?.onPopoverVisibilityChange(newValue ?? false);
    if (newValue) {
      popoverRef.value?.onPopoverHeightChange();
    }
  },
);

function onClose() {
  visible.value = false;
}

defineExpose<PopoverExpose<StickerViewerOption, Record<string, never>>>({
  setOption,
  inputEvents: {},
  updatePos: () => popoverRef.value?.updatePos(),
  close: onClose,
});
</script>
