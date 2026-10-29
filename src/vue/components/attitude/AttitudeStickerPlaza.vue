<template>
  <div class="mcmodder-attitude-sticker-panel mcmodder-attitude-plaza">
    <div class="mcmodder-attitude-sticker-bar">
      <span class="mcmodder-attitude-sticker-quota"
        >由所有用户共享出来的表态贴纸，轻触即可预览并直接使用或收藏~</span
      >
      <span class="mcmodder-attitude-plaza-tools">
        <template v-if="onSortChange">
          <span class="mcmodder-attitude-sort-title">排序方式: </span>
          <DropdownMenuInput
            title="排序方式"
            :value="sort === 'latest' ? 0 : 1"
            :range="{
              0: '最新共享',
              1: '最多收藏',
            }"
            :on-successful-change="handleSortChange"
          />
        </template>
        <span v-if="total" class="mcmodder-attitude-sticker-quota">共 {{ total }} 张</span>
      </span>
    </div>

    <p v-if="stickers !== undefined && stickers.length === 0" class="mcmodder-attitude-empty-hint">
      广场里还没有贴纸，去「我的贴纸」共享一张吧~
    </p>
    <AttitudeStickerBrowser
      v-else
      v-model:selected="selected"
      variant="plaza"
      :stickers="stickers ?? []"
      :loading="stickers === undefined"
      :active="active"
      :on-pick="onPick"
      :on-share="onShare"
      :on-favorite="onFavorite"
      :on-delete="onDelete"
      @sticker-removed="onBrowserRemoved"
    >
      <template #item="{ sticker }">
        <span class="mcmodder-attitude-plaza-name" v-text="sticker.name || '自定义贴纸'" />
        <span v-if="sticker.is_mine" class="mcmodder-attitude-plaza-badge">我</span>
        <span v-else-if="sticker.is_favorite" class="mcmodder-attitude-plaza-badge">收藏</span>
      </template>
      <template #desc-extra="{ sticker }">
        <div class="mcmodder-attitude-plaza-uploader-line">
          <a
            class="mcmodder-attitude-plaza-uploader-link"
            :href="Utils.getCenterURL(sticker.uid)"
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
          <span v-if="sticker.is_mine">（我）</span>
        </div>
        <!-- <div v-if="sticker.favorite_count" class="mcmodder-attitude-plaza-favorite-line">
          <i class="fa" :class="sticker.is_favorite ? 'fa-star' : 'fa-star-o'" />
          {{ sticker.favorite_count }}
        </div> -->
      </template>
    </AttitudeStickerBrowser>

    <div v-if="hasMore" class="mcmodder-attitude-plaza-more">
      <button class="btn btn-light" :disabled="loading" @click="onLoadMore">
        {{ loading ? "加载中…" : "加载更多" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import AttitudeStickerBrowser from "./AttitudeStickerBrowser.vue";
import { useStickerSelectionGuard } from "../../composables/useStickerSelectionGuard";
import { getStickerUploader, type StickerUploaderProfile } from "../../../attitude/stickerUploader";
import type { AttitudeStickerPlazaProps } from "../../../types/props";
import type { AttitudeStickerPlazaEmitPayload, StickerRemovedReason } from "../../../types/emits";
import { Utils } from "../../../Utils.ts";
import DropdownMenuInput from "../input/DropdownMenuInput.vue";

const props = withDefaults(defineProps<AttitudeStickerPlazaProps>(), {
  sort: "latest",
});
const emit = defineEmits<AttitudeStickerPlazaEmitPayload>();

const selected = shallowRef<SupabaseAttitudeSticker | null>(null);
const uploader = shallowRef<StickerUploaderProfile>();
const uploaderPending = ref(false);
let uploaderGeneration = 0;

const hasMore = computed(() => (props.total ?? 0) > (props.stickers?.length ?? 0));

const uploaderLabel = computed(() => {
  if (uploader.value?.nickname) return uploader.value.nickname;
  return uploaderPending.value ? "加载中…" : `UID:${selected.value?.uid ?? ""}`;
});

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

/**
 * 广场列表刷新后（取消共享、删除、重新拉取）复查预览的那张是否还在其中，不在就收起预览区。
 */
useStickerSelectionGuard(selected, () => props.stickers);

/** 删除 / 取消共享后该行离开广场，通知父组件刷新；取消收藏不影响广场，转告父组件即可 */
function onBrowserRemoved(sticker: SupabaseAttitudeSticker, reason: StickerRemovedReason) {
  if (reason === "unfavorited") return;
  emit("stickerRemoved", sticker);
}

/** 排序下拉框：值即服务端 `p_sort` 的取值 */
function handleSortChange(info: InputValidInfo<number>) {
  if (info.isok) {
    const value = info.final! as 0 | 1;
    props.onSortChange?.((["latest", "favorites"] as const)[value]);
    props.parent?.configRepository.setSettings("preferredStickerPlazaSort", value);
  }
}
</script>
