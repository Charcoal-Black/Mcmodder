<template>
  <div
    class="mcmodder-attitude-sticker-content"
    :class="{ 'mcmodder-attitude-plaza-content': variant === 'plaza' }"
  >
    <div
      class="mcmodder-attitude-sticker-grid"
      :class="{ 'mcmodder-attitude-plaza-grid': variant === 'plaza' }"
    >
      <button
        v-for="sticker in stickers"
        :key="sticker.id"
        type="button"
        class="mcmodder-attitude-sticker-item"
        :class="{
          'mcmodder-attitude-plaza-item': variant === 'plaza',
          'mcmodder-attitude-choice-selected': sticker === selected,
          'mcmodder-attitude-choice-active': isActive(sticker),
        }"
        :title="sticker.name || '自定义贴纸'"
        @click="selected = selected === sticker ? null : sticker"
      >
        <img :src="sticker.image_url" :alt="sticker.name || '自定义贴纸'" />
        <slot name="item" :sticker="sticker" />
      </button>
    </div>
    <div class="mcmodder-attitude-sticker-preview">
      <template v-if="selected">
        <div class="mcmodder-attitude-sticker-preview-img-container">
          <img
            v-show="!imagePending"
            :key="selected.id"
            class="mcmodder-attitude-sticker-preview-img"
            :src="selected.image_url"
            @load="imagePending = false"
          />
          <div
            v-show="imagePending"
            class="cmodder-attitude-sticker-preview-img mcmodder-loading"
          />
        </div>
        <div
          class="mcmodder-attitude-sticker-preview-desc"
          :class="{ 'mcmodder-attitude-plaza-desc': variant === 'plaza' }"
        >
          <slot name="desc" :sticker="selected">
            <div
              class="mcmodder-attitude-sticker-preview-desc-text"
              v-text="selected.name || '自定义贴纸'"
            />
          </slot>
          <slot name="desc-extra" :sticker="selected" />
        </div>
      </template>
      <span v-else class="mcmodder-attitude-sticker-preview-empty">轻触一张贴纸来预览~</span>
    </div>
    <div v-if="selected" class="mcmodder-attitude-sticker-opt">
      <button v-if="onPick" class="btn btn-success" @click="onPick(buildStickerType(selected.id))">
        <template v-if="!isActive(selected)"><i class="fa fa-paper-plane" /> 发送</template>
        <template v-else><i class="fa fa-reply" /> 撤销</template>
      </button>
      <button
        v-if="onShare && isMine(selected)"
        class="btn btn-dark"
        :disabled="sharePending"
        @click="onShareClick"
      >
        <template v-if="selected.shared_at"> <i class="fa fa-ban" /> 取消共享 </template>
        <template v-else><i class="fa fa-share-alt" /> 共享贴纸</template>
      </button>
      <button
        v-if="onFavorite && showFavorite(selected)"
        class="btn btn-dark"
        :disabled="favoritePending"
        @click="onFavoriteClick"
      >
        <template v-if="isMine(selected)"><i class="fa fa-star" /> 取消收藏</template>
        <template v-else-if="selected.is_favorite"><i class="fa fa-star" /> 已收藏</template>
        <template v-else><i class="fa fa-star-o" /> 收藏</template>
      </button>
      <button
        v-if="onDelete && isMine(selected)"
        class="btn btn-danger"
        :disabled="deletePending"
        @click="onDeleteClick"
      >
        删除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { buildStickerType } from "../../../attitude/attitudeIcon";
import type { AttitudeStickerBrowserProps } from "../../../types/props";
import type { AttitudeStickerBrowserEmitPayload } from "../../../types/emits";

const props = withDefaults(defineProps<AttitudeStickerBrowserProps>(), {
  variant: "default",
});
const emit = defineEmits<AttitudeStickerBrowserEmitPayload>();

/** 正在预览的贴纸（`null` = 未选中）；使用方通过 `v-model:selected` 读写，重命名 / 移除后由它收起预览 */
const selected = defineModel<SupabaseAttitudeSticker | null>("selected", { default: null });
const imagePending = ref(true);
const sharePending = ref(false);
const favoritePending = ref(false);
const deletePending = ref(false);

watch(
  () => selected.value?.id,
  () => (imagePending.value = true),
);

function isActive(sticker: SupabaseAttitudeSticker) {
  return props.active?.includes(buildStickerType(sticker.id));
}

/** 我上传的？缺 `is_mine` 的旧记录按「我上传的」处理 */
function isMine(sticker: SupabaseAttitudeSticker) {
  return sticker.is_mine !== false;
}

/** 自己上传的贴纸已在贴纸库里，只能取消收藏；他人贴纸则可收藏 / 取消收藏 */
function showFavorite(sticker: SupabaseAttitudeSticker) {
  return isMine(sticker) ? !!sticker.is_favorite : true;
}

/** 共享 / 取消共享自己上传的贴纸；下架后它不再属于广场 */
async function onShareClick() {
  const target = selected.value;
  if (!target || sharePending.value) return;
  const nextShared = !target.shared_at;
  sharePending.value = true;
  try {
    const ok = await props.onShare?.(target);
    if (ok === false || selected.value?.id !== target.id) return;
    if (nextShared) {
      selected.value = { ...selected.value, shared_at: new Date().toISOString() };
    } else {
      selected.value = null;
      emit("stickerRemoved", target, "unshared");
    }
  } finally {
    sharePending.value = false;
  }
}

/** 收藏 / 取消收藏；取消收藏自己收藏来的贴纸会让它离开「我的贴纸库」 */
async function onFavoriteClick() {
  const target = selected.value;
  if (!target || favoritePending.value) return;
  const nextFavorite = !target.is_favorite;
  favoritePending.value = true;
  try {
    const ok = await props.onFavorite?.(target);
    if (ok === false || selected.value?.id !== target.id) return;
    if (nextFavorite || !isMine(target)) {
      selected.value = { ...selected.value, is_favorite: nextFavorite };
    } else {
      selected.value = null;
      emit("stickerRemoved", target, "unfavorited");
    }
  } finally {
    favoritePending.value = false;
  }
}

/** 删除自己上传的贴纸（不可逆，先确认） */
function onDeleteClick() {
  const target = selected.value;
  if (!target || deletePending.value) return;
  swal.fire({
    type: "warning",
    title: "警告",
    text: `您正在尝试删除 (${target.name})，此操作不可逆，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonColor: "var(--mcmodder-color-danger)",
    preConfirm: async () => {
      deletePending.value = true;
      try {
        const ok = await props.onDelete?.(target);
        if (ok === false) return;
        if (selected.value?.id === target.id) selected.value = null;
        emit("stickerRemoved", target, "deleted");
      } finally {
        deletePending.value = false;
      }
    },
  });
}
</script>
