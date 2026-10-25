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
          <template v-if="liked"><i class="fa fa-star" /> 取消收藏</template>
          <template v-else><i class="fa fa-star-o" /> 收藏</template>
        </button>
      </div>
      <div v-if="reactorOption" class="mcmodder-attitude-sticker-viewer-reactors">
        <AttitudeReactorList
          :key="`${reactorOption.commentId}:${reactorOption.attitudeType}:${reactorGeneration}`"
          :parent="reactorOption.parent"
          :comment-id="reactorOption.commentId"
          :attitude-type="reactorOption.attitudeType"
          @height-change="onHeightChange"
        />
      </div>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import Popover from "./Popover.vue";
import AttitudeReactorList from "./attitude/AttitudeReactorList.vue";
import { usePopoverHost } from "../composables/usePopoverHost.ts";
import type { PopoverExpose, StickerViewerOption } from "../../types/props";

/**
 * 弹出框宿主的接线：显隐、定位、`updatePos` / `close` 都在 `usePopoverHost` 里，
 * 这里只管贴纸本身的内容与操作。
 */
const { popoverRef, visible, popoverProps, applyOption, updatePos, close } = usePopoverHost({
  maxHeight: 480,
});

const option = shallowRef<StickerViewerOption>();
const sticker = computed(() => option.value?.sticker);
const imagePending = ref(true);
const likePending = ref(false);
/** 这张贴纸是否已在「我的贴纸库」里；开窗时取值，之后跟着 `AttitudeSystem` 的集合缓存走 */
const liked = ref(false);
const isMine = computed(() => sticker.value?.uid === option.value?.parent.currentUID);
/** 结果条里的贴纸卡片才带短评上下文；贴纸库 / 消息中心里的预览没有 */
const reactorOption = computed(() => {
  const current = option.value;
  if (!current?.commentId || !current.attitudeType) return undefined;
  return {
    parent: current.parent,
    commentId: current.commentId,
    attitudeType: current.attitudeType,
  };
});
const reactorGeneration = ref(0);
/** 「我的贴纸」集合正在补拉：避免连续悬停不同贴纸时重复发起同一请求 */
let favoriteStateLoading = false;

function setOption(newOption: StickerViewerOption) {
  if (newOption.sticker !== option.value?.sticker) {
    imagePending.value = true;
  }
  option.value = newOption;
  reactorGeneration.value += 1;
  applyOption(newOption);
  liked.value = isLiked(newOption);
  ensureFavoriteState(newOption);
  visible.value = true;
}

/**
 * 收藏状态依赖「我的贴纸」集合；用户没打开过贴纸页签时集合尚未加载，此时补拉一次。
 * 结果到达后由下面的 watch 更新按钮文案；未认证 / 请求失败时保持「收藏」。
 */
function ensureFavoriteState(target: StickerViewerOption) {
  const system = target.parent.attitudeSystem;
  if (system.myStickers.value || favoriteStateLoading) return;
  favoriteStateLoading = true;
  void system
    .listMyStickers()
    .catch(() => undefined)
    .finally(() => {
      favoriteStateLoading = false;
    });
}

function isLiked(target: StickerViewerOption) {
  const stickers = target.parent.attitudeSystem.myStickers.value?.stickers;
  return !!stickers?.some((item) => item.id === target.sticker.id);
}

/**
 * 「我的贴纸库」集合变化时重算：面板里收藏 / 取消收藏后，这个开着的小窗不必重开才更新按钮文案。
 *
 * 集合尚未加载时由 `ensureFavoriteState` 补拉一次；未认证或请求失败时读不出结果，
 * 此时仍以本窗最近一次操作的结果为准。
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
      liked.value = ok.is_favorite;
    }
  } finally {
    likePending.value = false;
  }
}

function onHeightChange() {
  popoverRef.value?.onPopoverHeightChange();
}

defineExpose<PopoverExpose<StickerViewerOption, Record<string, never>>>({
  setOption,
  inputEvents: {},
  updatePos,
  close,
});
</script>
