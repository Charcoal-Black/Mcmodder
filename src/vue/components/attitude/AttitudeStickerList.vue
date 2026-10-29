<template>
  <div class="mcmodder-attitude-sticker-panel mcmodder-attitude-my-stickers">
    <div class="mcmodder-attitude-sticker-bar">
      <label
        v-if="onUpload && authenticated"
        class="mcmodder-attitude-sticker-upload btn btn-light"
      >
        <input type="file" :accept="accept" :disabled="uploading" @change="onFileChange" />
        <span>{{ uploading ? "上传中…" : "上传图片" }}</span>
      </label>
      <span v-if="quotaText" class="mcmodder-attitude-sticker-quota">{{ quotaText }}</span>
    </div>

    <p v-if="!loading && stickers!.length === 0" class="mcmodder-attitude-empty-hint">
      {{
        authenticated
          ? "还没有上传或收藏过表态贴纸，上传一张吧~"
          : "完成云端认证后，即可上传与收藏表态贴纸。"
      }}
    </p>
    <AttitudeStickerBrowser
      v-else
      v-model:selected="selected"
      :stickers="stickers ?? []"
      :loading="loading"
      :active="active"
      :on-pick="onPick"
      :on-share="onShare"
      :on-favorite="onFavorite"
      :on-delete="onDelete"
      @sticker-removed="onStickerRemoved"
    >
      <template #item="{ sticker }">
        <span v-if="sticker.is_favorite" class="mcmodder-attitude-sticker-favorite-badge">
          收藏
        </span>
      </template>
      <template #desc="{ sticker }">
        <template v-if="!renaming">
          <div class="mcmodder-attitude-sticker-preview-desc-text" v-text="sticker.name" />
          <a
            v-if="isMine(sticker)"
            class="mcmodder-attitude-sticker-preview-rename"
            tabindex="0"
            @click="onRename"
          >
            <i v-if="!renamePending" class="fa fa-pencil"></i>
            <i v-else class="fa fa-pulse spinner"></i>
          </a>
        </template>
        <TextInput
          v-else
          title="重命名"
          :value="sticker.name ?? ''"
          :on-successful-change="onCompleteRename"
        />
      </template>
    </AttitudeStickerBrowser>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { Values } from "../../../Values";
import type { AttitudeStickerListProps } from "../../../types/props";
import type { AttitudeStickerListEmitPayload } from "../../../types/emits";
import AttitudeStickerBrowser from "./AttitudeStickerBrowser.vue";
import { useStickerSelectionGuard } from "../../composables/useStickerSelectionGuard";
import TextInput from "../input/TextInput.vue";
import { Utils } from "../../../Utils.ts";

const props = defineProps<AttitudeStickerListProps>();
const emit = defineEmits<AttitudeStickerListEmitPayload>();

const loading = computed(() => {
  return props.parent === undefined || props.stickers === undefined;
});
/** 上传、收藏与重命名都写云端，未认证时只展示空状态 */
const authenticated = computed(() => !!props.parent?.attitudeSystem.getAuthKey());

const accept = Values.attitude.sticker.uploadAccept;
const uploading = ref(false);
const selected = shallowRef<SupabaseAttitudeSticker | null>(null);
/** 预览的贴纸由浏览区持有；换一张时收起重命名输入框 */
watch(
  () => selected.value?.id,
  () => {
    renaming.value = false;
  },
);

const renaming = ref(false);
const renamePending = ref(false);

const quotaText = computed(() => {
  const quota = props.quota;
  if (!quota || quota.limit === undefined) return "";
  const remaining = quota.remaining ?? Math.max(quota.limit - (quota.used ?? 0), 0);
  return `今日还可上传 ${remaining}/${quota.limit} 张`;
});

/** 兼容旧版服务端：没有 `is_mine` 字段时按“我上传的”处理 */
function isMine(sticker: SupabaseAttitudeSticker) {
  return sticker.is_mine !== false;
}

useStickerSelectionGuard(selected, () => props.stickers);

/** 浏览区里的删除 / 取消收藏会让该行离开「我的贴纸库」，转告父组件从列表里剔除 */
function onStickerRemoved(sticker: SupabaseAttitudeSticker) {
  emit("stickerRemoved", sticker);
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 清空 value，同一张图片连续选两次也能触发 change
  input.value = "";
  if (!file) return;
  uploading.value = true;
  try {
    await props.onUpload?.(file);
  } finally {
    uploading.value = false;
  }
}

function onRename() {
  if (!renamePending.value) {
    renaming.value = true;
  }
}

async function onCompleteRename(info: InputValidInfo<string>) {
  renaming.value = false;
  if (info.isok) {
    renamePending.value = true;
    const stickerId = selected.value!.id;
    const resp = await props.parent?.supabaseUtils?.renameAttitudeSticker({
      authKey: props.parent!.configRepository.getProfile("auth_key")!,
      id: stickerId,
      name: info.final!,
    });
    if (resp && !("error" in resp)) {
      const finalName = resp.sticker?.name ?? info.final!;
      // 重新赋值以触发渲染，父组件传入的列表由事件通知更新
      const renamed = { ...selected.value!, name: finalName };
      selected.value = renamed;
      emit("stickerRenamed", renamed);
      // 本地重命名成功后立即同步 AttitudeSystem 缓存
      props.parent?.attitudeSystem?.patchSticker(stickerId, { name: finalName }, resp.sticker);
      Utils.commonMsg("贴纸重命名成功~");
    }
    renamePending.value = false;
  }
}
</script>
