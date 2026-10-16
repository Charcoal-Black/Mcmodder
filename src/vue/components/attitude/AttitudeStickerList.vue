<template>
  <div class="mcmodder-attitude-sticker-panel">
    <div class="mcmodder-attitude-sticker-bar">
      <label v-if="onUpload" class="mcmodder-attitude-sticker-upload btn btn-light">
        <input type="file" :accept="accept" :disabled="uploading" @change="onFileChange" />
        <span>{{ uploading ? "上传中…" : "上传图片" }}</span>
      </label>
      <span v-if="quotaText" class="mcmodder-attitude-sticker-quota">{{ quotaText }}</span>
    </div>

    <p v-if="loading" class="mcmodder-attitude-empty-hint">正在加载我上传的表态贴纸…</p>
    <p v-else-if="stickers!.length === 0" class="mcmodder-attitude-empty-hint">
      还没有上传过表态贴纸，上传一张吧~
    </p>
    <div v-else class="mcmodder-attitude-sticker-content">
      <div class="mcmodder-attitude-sticker-grid">
        <button
          v-for="sticker in stickers"
          :key="sticker.id"
          type="button"
          class="mcmodder-attitude-sticker-item"
          :class="{
            'mcmodder-attitude-choice-selected': sticker === selected,
            'mcmodder-attitude-choice-active': isActive(sticker),
          }"
          :title="sticker.name || '自定义贴纸'"
          @click="selected = selected === sticker ? null : sticker"
        >
          <img :src="sticker.image_url" :alt="sticker.name || '自定义贴纸'" />
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
          <div class="mcmodder-attitude-sticker-preview-desc">
            <template v-if="!renaming">
              <div class="mcmodder-attitude-sticker-preview-desc-text" v-text="selected.name" />
              <a class="mcmodder-attitude-sticker-preview-rename" tabindex="0" @click="onRename">
                <i v-if="!renamePending" class="fa fa-pencil"></i>
                <i v-else class="fa fa-pulse spinner"></i>
              </a>
            </template>
            <TextInput
              v-else
              title="重命名"
              :value="selected.name ?? ''"
              :on-successful-change="onCompleteRename"
            />
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
        <button class="btn btn-danger" @click="onDelete(selected)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { Values } from "../../../Values";
import { buildStickerType } from "../../../attitude/attitudeIcon";
import type { AttitudeStickerListProps } from "../../../types/props";
import TextInput from "../input/TextInput.vue";
import { Utils } from "../../../Utils.ts";

const props = defineProps<AttitudeStickerListProps>();

const loading = computed(() => {
  return props.parent === undefined || props.stickers === undefined;
});

const accept = Values.attitude.sticker.uploadAccept;
const uploading = ref(false);
const selected = shallowRef<SupabaseAttitudeSticker | null>(null);
watch(
  () => selected.value,
  () => (imagePending.value = true),
);

const renaming = ref(false);
const renamePending = ref(false);
const imagePending = ref(true);

const quotaText = computed(() => {
  const quota = props.quota;
  if (!quota || quota.limit === undefined) return "";
  const remaining = quota.remaining ?? Math.max(quota.limit - (quota.used ?? 0), 0);
  return `今日还可上传 ${remaining}/${quota.limit} 张`;
});

function isActive(sticker: SupabaseAttitudeSticker) {
  return props.active?.includes(buildStickerType(sticker.id));
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
      // 重新赋值以触发渲染，并就地更新父组件传入的列表数组
      if (selected.value) {
        selected.value = { ...selected.value, name: finalName };
      }
      const propSticker = props.stickers?.find((item) => item.id === stickerId);
      if (propSticker) {
        propSticker.name = finalName;
      }
      // 本地重命名成功后立即同步 AttitudeSystem 缓存
      props.parent?.attitudeSystem?.renameSticker(stickerId, finalName, resp.sticker);
      Utils.commonMsg("贴纸重命名成功~");
    }
    renamePending.value = false;
  }
}

function onDelete(sticker: SupabaseAttitudeSticker) {
  swal.fire({
    type: "warning",
    title: "警告",
    text: `您正在尝试删除 (${sticker.name})，此操作不可逆，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonColor: "var(--mcmodder-color-danger)",
    preConfirm: async () => {
      const resp = await props.parent?.supabaseUtils?.deleteAttitudeSticker({
        authKey: props.parent.configRepository.getProfile("auth_key")!,
        id: selected.value!.id,
      });
      if (resp && !("error" in resp)) {
        Utils.commonMsg("贴纸删除成功~");
      }
    },
  });
}
</script>
