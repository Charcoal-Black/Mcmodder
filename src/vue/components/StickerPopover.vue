<template>
  <Popover ref="popoverRef" v-bind="popoverProps">
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
import { computed, ref, shallowRef, watch } from "vue";
import Popover from "./Popover.vue";
import { usePopoverHost } from "../composables/usePopoverHost.ts";
import type { PopoverExpose, StickerViewerOption } from "../../types/props";

/**
 * 弹出框宿主的接线：显隐、定位、`updatePos` / `close` 都在 `usePopoverHost` 里，
 * 这里只管贴纸本身的内容与操作。
 */
const { visible, popoverProps, applyOption, updatePos, close } = usePopoverHost();

const option = shallowRef<StickerViewerOption>();
const sticker = computed(() => option.value?.sticker);
const imagePending = ref(true);
const likePending = ref(false);
/** 这张贴纸是否已在「我的贴纸库」里；开窗时取值，之后跟着 `AttitudeSystem` 的集合缓存走 */
const liked = ref(false);
const isMine = computed(() => sticker.value?.uid === option.value?.parent.currentUID);

function setOption(newOption: StickerViewerOption) {
  if (newOption.sticker !== option.value?.sticker) {
    imagePending.value = true;
  }
  option.value = newOption;
  applyOption(newOption);
  liked.value = isLiked(newOption);
  visible.value = true;
}

function isLiked(target: StickerViewerOption) {
  const stickers = target.parent.attitudeSystem.myStickers.value?.stickers;
  return !!stickers?.some((item) => item.id === target.sticker.id);
}

/**
 * 「我的贴纸库」集合变化时重算：面板里收藏 / 取消收藏后，这个开着的小窗不必重开才更新按钮文案。
 *
 * 集合本身不在时（从未打开过贴纸页签）读不出结果，此时仍以本窗的操作结果为准 —— 缓存没变化，
 * 也就不会触发这里。
 */
watch(
  () => option.value?.parent.attitudeSystem.myStickers.value,
  () => {
    if (option.value) liked.value = isLiked(option.value);
  },
);

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
  updatePos,
  close,
});
</script>
