<template>
  <div ref="rootRef" class="mcmodder-bg-pool">
    <div class="mcmodder-bg-pool-toolbar">
      <button type="button" class="btn btn-default btn-sm" @click="pickFiles">添加图片</button>
      <span class="mcmodder-bg-pool-count">
        {{ images.length }} / {{ BackgroundRepository.MAX_COUNT }}
      </span>
      <span v-if="images.length > 0" class="mcmodder-bg-pool-actions">
        <a href="#" @click.prevent="clearAll">全部清除</a>
      </span>
    </div>
    <input
      ref="fileRef"
      type="file"
      accept="image/*"
      multiple
      class="mcmodder-bg-pool-file"
      @change="onFilesChosen"
    />
    <p v-if="images.length === 0" class="text-muted mcmodder-bg-pool-empty">
      还没有本地背景图。添加后，这一栏的图片会参与轮换，优先于上面填写的
      URL。每张图下方的「出现频率」决定它被抽中的机会（1 = 正常，越大越常见）。
    </p>
    <div v-else class="mcmodder-bg-pool-grid">
      <div v-for="image in images" :key="image.id" class="mcmodder-bg-pool-card">
        <div class="mcmodder-bg-pool-thumb">
          <img :src="image.dataUrl" :alt="image.name" :title="image.name" />
          <button
            type="button"
            class="mcmodder-bg-pool-remove"
            title="移除这张"
            @click="removeImage(image.id)"
          >
            ×
          </button>
        </div>
        <label
          class="mcmodder-bg-pool-meta"
          :title="`数字越大，这张越常被抽到。当前：${image.weight ?? 1}`"
        >
          <span class="mcmodder-bg-pool-meta-label">出现频率</span>
          <input
            type="number"
            min="1"
            max="10"
            :value="image.weight ?? 1"
            @change="onWeightChange(image, $event)"
          />
          <span class="mcmodder-bg-pool-meta-unit">倍</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { BackgroundRepository } from "../../../background/BackgroundRepository";
import type { BackgroundImageRow } from "../../../background/BackgroundRepository";
import { BackgroundPool } from "../../../background/BackgroundPool";
import { Utils } from "../../../Utils";
import type { InputProps } from "../../../types/props";

/**
 * 本地背景图池的配置控件。
 *
 * 与其它 `input/*` 组件不同，本控件持久的不是「配置值」本身（图片体积远超 GM storage 的配额），
 * 而是 GM storage 中的图片集合；配置里的值只是占位（记录数量），用于让设置面板识别到变化。
 * 具体归属白天还是夜间由配置 id 决定（`backgroundPoolDay` / `backgroundPoolNight`）。
 */
const props = defineProps<InputProps<number> & { id: string }>();

const rootRef = useTemplateRef("rootRef");
const fileRef = useTemplateRef("fileRef");
const images = ref<BackgroundImageRow[]>([]);
const repository = new BackgroundRepository();

/** 由配置 id 推断 slot */
const slot: "day" | "night" = props.id === "backgroundPoolNight" ? "night" : "day";
const slotLabel = slot === "day" ? "白天" : "夜间";

function refresh() {
  BackgroundPool.reload(slot);
  images.value = [...BackgroundPool.getImages(slot)];
  BackgroundPool.resetPicked();
}

onMounted(refresh);

function pickFiles() {
  fileRef.value?.click();
}

async function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (files.length === 0) return;

  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      rejected.push(`${file.name}（不是图片）`);
    } else if (file.size > BackgroundRepository.MAX_BYTES) {
      rejected.push(`${file.name}（超过 ${BackgroundRepository.MAX_BYTES / 1024 / 1024}MB）`);
    } else {
      accepted.push(file);
    }
  }

  let added = 0;
  const failed: string[] = [];
  for (const file of accepted) {
    try {
      await repository.add(slot, file.name, file);
      added += 1;
    } catch (error) {
      console.error("[mcmodder][bg] 写入失败", { slot, name: file.name, error });
      failed.push(`${file.name}（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  refresh();

  const messages: string[] = [];
  if (added > 0) messages.push(`已添加 ${added} 张${slotLabel}背景`);
  if (failed.length > 0)
    messages.push(`写入失败 ${failed.length} 张：${failed.slice(0, 2).join("、")}`);
  if (rejected.length > 0) messages.push(`已跳过：${rejected.slice(0, 3).join("、")}`);
  if (messages.length === 0) messages.push("没有可添加的图片");
  Utils.commonMsg(messages.join("；"));

  if (added > 0) {
    props.onSuccessfulChange?.({ isok: true, final: images.value.length });
  }
}

function removeImage(id: number | undefined) {
  if (id === undefined) return;
  repository.remove(id);
  refresh();
  props.onSuccessfulChange?.({ isok: true, final: images.value.length });
}

function onWeightChange(image: BackgroundImageRow, event: Event) {
  const input = event.target as HTMLInputElement;
  const weight = Number(input.value);
  const current = image.weight ?? 1;
  if (image.id === undefined || !Number.isFinite(weight) || weight < 1) {
    // 非法输入回填原值，避免输入框停在空值或乱码
    input.value = String(current);
    return;
  }
  repository.setWeight(image.id, weight);
  refresh();
}

function clearAll() {
  repository.clear(slot);
  refresh();
  props.onSuccessfulChange?.({ isok: true, final: 0 });
}

defineExpose<InputControlRef<number>>({
  getInstance: () => rootRef.value!,
  getValue: () => images.value.length,
  setCurrentValue: () => {
    // 图片集合由 GM storage 决定，配置值不参与回填
  },
  setDisplayValue: () => {
    // 同上
  },
});
</script>

<style scoped>
.mcmodder-bg-pool {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mcmodder-bg-pool-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mcmodder-bg-pool-count {
  color: #888;
  font-size: 12px;
}

.mcmodder-bg-pool-actions a {
  font-size: 12px;
}

.mcmodder-bg-pool-file {
  display: none;
}

.mcmodder-bg-pool-empty {
  margin: 0;
  font-size: 12px;
}

.mcmodder-bg-pool-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.mcmodder-bg-pool-card {
  display: flex;
  flex-direction: column;
  width: 148px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.mcmodder-bg-pool-thumb {
  position: relative;
  width: 100%;
  height: 84px;
  overflow: hidden;
  background: #f2f2f2;
}

.mcmodder-bg-pool-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mcmodder-bg-pool-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
  font-size: 15px;
  line-height: 22px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.mcmodder-bg-pool-card:hover .mcmodder-bg-pool-remove {
  opacity: 1;
}

.mcmodder-bg-pool-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: 5px 4px;
  border-top: 1px solid #e5e5e5;
  background: #fafafa;
  font-weight: normal;
  font-size: 12px;
  cursor: help;
}

.mcmodder-bg-pool-meta-label {
  color: #666;
}

.mcmodder-bg-pool-meta input {
  width: 42px;
  height: 22px;
  padding: 0 4px;
  border: 1px solid #bbb;
  border-radius: 3px;
  font-size: 12px;
  text-align: center;
}

.mcmodder-bg-pool-meta-unit {
  color: #888;
}
</style>
