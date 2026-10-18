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
      <div class="mcmodder-attitude-sticker-viewer-addfav">
        <button
          v-if="!isMine"
          class="btn btn-light"
          :disabled="likePending"
          @click="onFavoriteClick"
        >
          <template v-if="liked"><i class="fa fa-star" /> 已收藏</template>
          <template v-else><i class="fa fa-star-o" /> 收藏</template>
        </button>
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
const likePending = ref(false);
/** 这张贴纸是否已在「我的贴纸库」里（`myStickers` 不是响应式的，故每次开窗时自行取值） */
const liked = ref(false);
const isMine = computed(() => sticker.value?.uid === option.value?.parent.currentUID);

function setOption(newOption: StickerViewerOption) {
  if (newOption.sticker !== option.value?.sticker) {
    imagePending.value = true;
  }
  option.value = newOption;
  liked.value = isLiked(newOption);
  visible.value = true;
}

function isLiked(target: StickerViewerOption) {
  const stickers = target.parent.attitudeSystem.myStickers?.stickers;
  return !!stickers?.some((item) => item.id === target.sticker.id);
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

/** 收藏 / 取消收藏，与广场共用 `AttitudeSystem.favoriteSticker`（提示与缓存同步都在其中） */
async function onFavoriteClick() {
  if (likePending.value) return;
  const current = option.value;
  if (!current) return;
  const nextFavorite = !liked.value;
  likePending.value = true;
  try {
    const ok = await current.parent.attitudeSystem.favoriteSticker(
      current.sticker.id,
      nextFavorite,
    );
    if (ok && option.value?.sticker.id === current.sticker.id) {
      liked.value = nextFavorite;
    }
  } finally {
    likePending.value = false;
  }
}

defineExpose<PopoverExpose<StickerViewerOption, Record<string, never>>>({
  setOption,
  inputEvents: {},
  updatePos: () => popoverRef.value?.updatePos(),
  close: onClose,
});
</script>
