<template>
  <div class="mcmodder-attitude-sticker-panel mcmodder-attitude-my-stickers">
    <div class="mcmodder-attitude-sticker-bar">
      <label v-if="onUpload" class="mcmodder-attitude-sticker-upload btn btn-light">
        <input type="file" :accept="accept" :disabled="uploading" @change="onFileChange" />
        <span>{{ uploading ? "上传中…" : "上传图片" }}</span>
      </label>
      <span v-if="quotaText" class="mcmodder-attitude-sticker-quota">{{ quotaText }}</span>
    </div>

    <p v-if="loading" class="mcmodder-attitude-empty-hint">正在加载我的表态贴纸…</p>
    <p v-else-if="stickers!.length === 0" class="mcmodder-attitude-empty-hint">
      还没有上传或收藏过表态贴纸，上传一张吧~
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
          <span v-if="sticker.is_favorite" class="mcmodder-attitude-sticker-favorite-badge">
            收藏
          </span>
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
              <a
                v-if="isMine(selected)"
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
        <button
          v-if="onShare && isMine(selected)"
          class="btn btn-light"
          :disabled="sharePending"
          @click="onShareClick"
        >
          <template v-if="selected.shared_at"> <i class="fa fa-ban" /> 取消共享 </template>
          <template v-else><i class="fa fa-share-alt" /> 共享贴纸</template>
        </button>
        <button
          v-if="onFavorite && selected.is_favorite"
          class="btn btn-light"
          :disabled="favoritePending"
          @click="onFavoriteClick"
        >
          <i class="fa fa-star" /> 取消收藏
        </button>
        <button v-if="isMine(selected)" class="btn btn-danger" @click="onDelete(selected)">
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { Values } from "../../../Values";
import { buildStickerType } from "../../../attitude/attitudeIcon";
import type { AttitudeStickerListProps } from "../../../types/props";
import type { AttitudeStickerListEmitPayload } from "../../../types/emits";
import TextInput from "../input/TextInput.vue";
import { Utils } from "../../../Utils.ts";

const props = defineProps<AttitudeStickerListProps>();
const emit = defineEmits<AttitudeStickerListEmitPayload>();

const loading = computed(() => {
  return props.parent === undefined || props.stickers === undefined;
});

const accept = Values.attitude.sticker.uploadAccept;
const uploading = ref(false);
const selected = shallowRef<SupabaseAttitudeSticker | null>(null);
watch(
  () => selected.value?.id,
  () => {
    renaming.value = false;
    imagePending.value = true;
  },
);

const renaming = ref(false);
const renamePending = ref(false);
const deletePending = ref(false);
const sharePending = ref(false);
const favoritePending = ref(false);
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

/** 兼容旧版服务端：没有 `is_mine` 字段时按“我上传的”处理 */
function isMine(sticker: SupabaseAttitudeSticker) {
  return sticker.is_mine !== false;
}

async function onShareClick() {
  if (!selected.value || sharePending.value) return;
  const target = selected.value;
  const nextShared = !target.shared_at;
  sharePending.value = true;
  try {
    const ok = await props.onShare?.(target);
    if (ok === false) return;
    if (selected.value?.id === target.id) {
      selected.value = {
        ...selected.value,
        shared_at: nextShared ? new Date().toISOString() : null,
      };
    }
  } finally {
    sharePending.value = false;
  }
}

async function onFavoriteClick() {
  if (!selected.value || favoritePending.value) return;
  const target = selected.value;
  favoritePending.value = true;
  try {
    const ok = await props.onFavorite?.(target);
    if (ok === false) return;
    // 「取消收藏」后该项会从父组件的集合列表中移除，预览区一并收起
    if (selected.value?.id === target.id) selected.value = null;
  } finally {
    favoritePending.value = false;
  }
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
      deletePending.value = true;
      const resp = await props.parent?.supabaseUtils?.deleteAttitudeSticker({
        authKey: props.parent.configRepository.getProfile("auth_key")!,
        id: sticker.id,
      });
      if (resp && !("error" in resp)) {
        // 删除成功后立即同步 AttitudeSystem 缓存，避免面板继续显示已删除的贴纸
        props.parent?.attitudeSystem?.removeSticker(sticker.id, true);
        dropFromList(sticker);
        Utils.commonMsg("贴纸删除成功~");
      }
      deletePending.value = false;
    },
  });
}

/** 把贴纸移出父组件的列表（交由父组件更新传入的数组），正在预览的则清空 */
function dropFromList(sticker: SupabaseAttitudeSticker) {
  emit("stickerRemoved", sticker);
  if (selected.value?.id === sticker.id) selected.value = null;
}
</script>
