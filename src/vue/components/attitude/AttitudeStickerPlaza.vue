<template>
  <div class="mcmodder-attitude-sticker-panel mcmodder-attitude-plaza">
    <div class="mcmodder-attitude-sticker-bar">
      <span class="mcmodder-attitude-sticker-quota"
        >大家共享出来的表态贴纸，点选后可直接使用或收藏~</span
      >
      <span v-if="total" class="mcmodder-attitude-sticker-quota">共 {{ total }} 张</span>
    </div>

    <p v-if="stickers === undefined" class="mcmodder-attitude-empty-hint">正在加载贴纸广场…</p>
    <p v-else-if="stickers.length === 0" class="mcmodder-attitude-empty-hint">
      广场里还没有贴纸，去「我的贴纸」共享一张吧~
    </p>
    <div v-else class="mcmodder-attitude-sticker-content mcmodder-attitude-plaza-content">
      <div class="mcmodder-attitude-sticker-grid mcmodder-attitude-plaza-grid">
        <button
          v-for="sticker in stickers"
          :key="sticker.id"
          type="button"
          class="mcmodder-attitude-sticker-item mcmodder-attitude-plaza-item"
          :class="{
            'mcmodder-attitude-choice-selected': sticker === selected,
            'mcmodder-attitude-choice-active': isActive(sticker),
          }"
          :title="sticker.name || '自定义贴纸'"
          @click="selected = selected === sticker ? null : sticker"
        >
          <img :src="sticker.image_url" :alt="sticker.name || '自定义贴纸'" />
          <span class="mcmodder-attitude-plaza-name" v-text="sticker.name || '自定义贴纸'" />
          <span v-if="sticker.is_mine" class="mcmodder-attitude-plaza-badge">我</span>
          <span v-else-if="sticker.is_favorite" class="mcmodder-attitude-plaza-badge">收藏</span>
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
          <div class="mcmodder-attitude-sticker-preview-desc mcmodder-attitude-plaza-desc">
            <div
              class="mcmodder-attitude-sticker-preview-desc-text"
              v-text="selected.name || '自定义贴纸'"
            />
            <div class="mcmodder-attitude-plaza-uploader-line">
              <a
                class="mcmodder-attitude-plaza-uploader-link"
                :href="`https://center.mcmod.cn/${selected.uid}/`"
                target="_blank"
                title="前往上传者主页"
              >
                <img
                  v-if="uploader?.avatar"
                  class="mcmodder-attitude-plaza-avatar"
                  :src="uploader.avatar"
                  alt=""
                />
                <i v-else class="fa fa-user" />
                <span v-text="uploaderLabel" />
              </a>
              <span v-if="selected.is_mine">（我）</span>
            </div>
          </div>
        </template>
        <span v-else class="mcmodder-attitude-sticker-preview-empty">轻触一张贴纸来预览~</span>
      </div>
      <div v-if="selected" class="mcmodder-attitude-sticker-opt">
        <button
          v-if="onPick"
          class="btn btn-success"
          @click="onPick(buildStickerType(selected.id))"
        >
          <template v-if="!isActive(selected)"><i class="fa fa-paper-plane" /> 发送</template>
          <template v-else><i class="fa fa-reply" /> 撤销</template>
        </button>
        <button
          v-if="onFavorite && !selected.is_mine"
          class="btn btn-light"
          :disabled="favoritePending"
          @click="onFavoriteClick"
        >
          <template v-if="selected.is_favorite"><i class="fa fa-star" /> 已收藏</template>
          <template v-else><i class="fa fa-star-o" /> 收藏</template>
        </button>
      </div>
    </div>

    <div v-if="hasMore" class="mcmodder-attitude-plaza-more">
      <button class="btn btn-light" :disabled="loading" @click="onLoadMore">
        {{ loading ? "加载中…" : "加载更多" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { buildStickerType } from "../../../attitude/attitudeIcon";
import { getStickerUploader, type StickerUploaderProfile } from "../../../attitude/stickerUploader";
import type { AttitudeStickerPlazaProps } from "../../../types/props";

const props = defineProps<AttitudeStickerPlazaProps>();

const selected = shallowRef<SupabaseAttitudeSticker | null>(null);
const favoritePending = ref(false);
const imagePending = ref(true);
const uploader = shallowRef<StickerUploaderProfile>();
const uploaderPending = ref(false);
let uploaderGeneration = 0;

const hasMore = computed(() => (props.total ?? 0) > (props.stickers?.length ?? 0));

const uploaderLabel = computed(() => {
  if (uploader.value?.nickname) return uploader.value.nickname;
  return uploaderPending.value ? "加载中…" : `UID:${selected.value?.uid ?? ""}`;
});

watch(
  () => selected.value?.id,
  () => (imagePending.value = true),
);

watch(
  () => selected.value?.uid,
  async (uid) => {
    const generation = ++uploaderGeneration;
    uploader.value = undefined;
    uploaderPending.value = false;
    if (!uid || !props.parent) return;
    uploaderPending.value = true;
    try {
      const profile = await getStickerUploader(props.parent, uid);
      if (generation === uploaderGeneration) uploader.value = profile;
    } finally {
      if (generation === uploaderGeneration) uploaderPending.value = false;
    }
  },
);

function isActive(sticker: SupabaseAttitudeSticker) {
  return props.active?.includes(buildStickerType(sticker.id));
}

async function onFavoriteClick() {
  if (!selected.value || favoritePending.value) return;
  const target = selected.value;
  const nextFavorite = !target.is_favorite;
  favoritePending.value = true;
  try {
    const ok = await props.onFavorite?.(target);
    if (ok === false) return;
    if (selected.value?.id === target.id) {
      selected.value = { ...selected.value, is_favorite: nextFavorite };
    }
  } finally {
    favoritePending.value = false;
  }
}
</script>
