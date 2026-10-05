<template>
  <div class="mcmodder-attitude-sticker-panel">
    <div class="mcmodder-attitude-sticker-bar">
      <label v-if="onUpload" class="mcmodder-attitude-sticker-upload">
        <input type="file" :accept="accept" :disabled="uploading" @change="onFileChange" />
        <span>{{ uploading ? "上传中…" : "上传图片" }}</span>
      </label>
      <span v-if="quotaText" class="mcmodder-attitude-sticker-quota">{{ quotaText }}</span>
    </div>

    <p v-if="loading" class="mcmodder-attitude-empty-hint">正在加载我上传的表态贴纸…</p>
    <p v-else-if="stickers.length === 0" class="mcmodder-attitude-empty-hint">
      还没有上传过表态贴纸：点上方「上传图片」，把本地图片存到百科图床后即可用作表态。
    </p>
    <div v-else class="mcmodder-attitude-sticker-grid">
      <button
        v-for="sticker in stickers"
        :key="sticker.id"
        type="button"
        class="mcmodder-attitude-sticker-item"
        :class="{
          'mcmodder-attitude-choice-active': active.includes(buildStickerType(sticker.id)),
        }"
        :title="sticker.name || '自定义贴纸'"
        :disabled="!onPick"
        @click="onPick?.(buildStickerType(sticker.id))"
      >
        <img :src="sticker.image_url" :alt="sticker.name || '自定义贴纸'" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Values } from "../../../Values";
import { buildStickerType } from "../../../attitude/attitudeIcon";

interface Props {
  /** 我上传的贴纸（按上传时间倒序） */
  stickers: SupabaseAttitudeSticker[];
  /** 今日上传额度；未知时传 null（不展示额度文案） */
  quota: SupabaseAttitudeStickerQuota | null;
  /** 是否正在加载列表 */
  loading?: boolean;
  /** 我在当前短评已表态的类型（用于高亮）；只查看的场景传空数组 */
  active?: string[];
  /** 点击一张贴纸；不传表示只查看（此时贴纸不可点） */
  onPick?: (attitudeType: string) => void;
  /** 上传本地图片；不传则不显示上传入口 */
  onUpload?: (file: File) => Promise<void> | void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  active: () => [],
  onPick: undefined,
  onUpload: undefined,
});

const accept = Values.attitude.sticker.uploadAccept;
const uploading = ref(false);

const quotaText = computed(() => {
  const quota = props.quota;
  if (!quota || quota.limit === undefined) return "";
  const remaining = quota.remaining ?? Math.max(quota.limit - (quota.used ?? 0), 0);
  return `今日还可上传 ${remaining}/${quota.limit} 张`;
});

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 清空 value：同一张图片连续二次选择时也要触发 change
  input.value = "";
  if (!file || !props.onUpload) return;
  uploading.value = true;
  try {
    await props.onUpload(file);
  } finally {
    uploading.value = false;
  }
}
</script>
