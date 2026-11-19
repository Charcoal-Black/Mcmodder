<template>
  <div ref="rootRef" class="mcmodder-bg-pool">
    <ImageList
      ref="imageListRef"
      class="mcmodder-bg-pool-imagelist"
      unit="张"
      item="图片"
      :editable="true"
      :load-error="images.length === 0 ? '暂无图片...' : null"
      :frames="frames"
      :subtexts="subtexts"
      :show-blank-insert="false"
      :show-replace="false"
      :show-apply="false"
      @move="onMove"
      @delete-frames="onDeleteFrames"
      @delete-all="onDeleteAll"
      @image-import-selected="onImageImportSelected"
    >
      <template #info>
        <p>
          当前共有 {{ images.length.toLocaleString() }} /
          {{ BackgroundRepository.MAX_COUNT.toLocaleString() }} 张
        </p>
        <p v-if="currentImage" :title="currentImage.name">
          文件名:
          <span v-if="!editingFilename" class="mcmodder-bg-pool-name">{{ currentImage.name }}</span>
          <input
            v-else
            ref="filenameInputRef"
            class="form-control mcmodder-bg-pool-inputfilename"
            :value="currentImage.name"
          />
          <a
            v-if="!editingFilename"
            class="mcmodder-bg-pool-editfilename"
            title="修改尺寸"
            @click="onModifyFilename"
            ><i class="fa fa-pencil"
          /></a>
          <template v-else>
            <a class="mcmodder-bg-pool-editfilename" title="确认修改" @click="rename"
              ><i class="fa fa-check"
            /></a>
            <a class="mcmodder-bg-pool-editfilename" title="放弃修改" @click="onDiscardFilenameEdit"
              ><i class="fa fa-close"
            /></a>
          </template>
        </p>
        <p v-if="currentImage">
          文件体积:
          <abbr :title="currentImage.dataUrl.length.toLocaleString() + ' 字节'">{{
            Utils.getFormattedSize(currentImage.dataUrl.length)
          }}</abbr>
        </p>
        <p v-if="currentImage">
          <abbr title="数字越大，这张图越常被抽到；选中多张时，修改会一并应用。">出现频率:</abbr>
          <input
            type="number"
            min="1"
            max="10"
            class="form-control"
            :value="currentImage.weight ?? 1"
            @focus="onWeightFocus"
            @change="onWeightChange"
          />
          倍
        </p>
      </template>
      <template #empty>
        <button type="button" class="btn btn-success" @click="pickFilesForEmpty">
          添加本地图片...
        </button>
      </template>
    </ImageList>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { BackgroundRepository } from "../../../background/BackgroundRepository";
import type { BackgroundImageRow } from "../../../background/BackgroundRepository";
import { BackgroundPool } from "../../../background/BackgroundPool";
import { Utils } from "../../../Utils";
import type { InputProps } from "../../../types/props";
import ImageList from "../ImageList.vue";

/**
 * 本地背景图池的配置控件。
 *
 * 与其它 `input/*` 组件不同，本控件持久的不是「配置值」本身（图片体积远超 GM storage 的配额），
 * 而是 GM storage 中的图片集合；配置里的值只是占位（记录数量），用于让设置面板识别到变化。
 * 具体归属白天还是夜间由配置 id 决定（`backgroundPoolDay` / `backgroundPoolNight`）。
 *
 * 浏览、插入、删除、排序全部交给 `ImageList`，这里只负责把它的交互翻译成对
 * `BackgroundRepository` 的读写。
 */
const props = defineProps<InputProps<number> & { id: string }>();

const rootRef = useTemplateRef("rootRef");
const imageListRef = useTemplateRef("imageListRef");
const filenameInputRef = useTemplateRef("filenameInputRef");
const images = ref<BackgroundImageRow[]>([]);
const repository = new BackgroundRepository();

/** 由配置 id 推断 slot */
const slot: "day" | "night" = props.id === "backgroundPoolNight" ? "night" : "day";
const slotLabel = slot === "day" ? "白天" : "夜间";

const frames = computed(() => images.value.map((image) => image.dataUrl));
const subtexts = computed(() => images.value.map((image) => `×${image.weight ?? 1}`));

const editingFilename = ref(false);

/** `ImageList` 内部的光标；用它把当前图片映射回持久化的记录 */
const currentIndex = computed<number>({
  get: () => imageListRef.value?.currentIndex ?? 0,
  set: (value) => {
    if (imageListRef.value !== null) {
      imageListRef.value.currentIndex = value;
    }
  },
});
const currentImage = computed({
  get: () => images.value[currentIndex.value],
  set: (newValue) => (images.value[currentIndex.value] = newValue),
});

watch(
  () => imageListRef.value?.currentIndex,
  () => onDiscardFilenameEdit(),
);

function refresh() {
  BackgroundPool.reload(slot);
  images.value = [...BackgroundPool.getImages(slot)];
  BackgroundPool.resetPicked();
}

// 同步读取 GM storage，首帧就能拿到真实列表，不会先闪一下空白页
refresh();

/** 从文件选择框接收图片，插到 `index` 位置 */
async function onImageImportSelected(files: File[], index: number) {
  await addFiles(files, index);
}

function pickFilesForEmpty() {
  imageListRef.value?.openImageImport(0);
}

async function addFiles(files: File[], index: number) {
  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      rejected.push(`${file.name}（不是图片）`);
    } else if (file.size > BackgroundRepository.MAX_FILE_BYTES) {
      rejected.push(
        `${file.name}（超过 ${Utils.getFormattedSize(BackgroundRepository.MAX_FILE_BYTES)}）`,
      );
    } else {
      accepted.push(file);
    }
  }

  let added = 0;
  const failed: string[] = [];
  let insertAt = Math.max(0, Math.min(index, images.value.length));
  for (const file of accepted) {
    try {
      await repository.add(slot, file.name, file, insertAt);
      insertAt += 1;
      added += 1;
    } catch (error) {
      console.error("[mcmodder][bg] 写入失败", { slot, name: file.name, error });
      failed.push(`${file.name}（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  refresh();

  if (added > 0) {
    // 等列表把新图片渲染出来再定位，否则 ImageList 会拿旧长度把光标夹回旧的末尾
    await nextTick();
    imageListRef.value?.setSelection(Math.min(insertAt - 1, images.value.length - 1));
    props.onSuccessfulChange?.({ isok: true, final: images.value.length });
  }

  const messages: string[] = [];
  if (added > 0) messages.push(`已添加 ${added.toLocaleString()} 张${slotLabel}背景~`);
  if (failed.length > 0)
    messages.push(
      `${failed.length.toLocaleString()} 张图片保存失败：${failed.slice(0, 2).join("、")}`,
    );
  if (rejected.length > 0)
    messages.push(
      `${rejected.length.toLocaleString()} 张图片被跳过：${rejected.slice(0, 3).join("、")}`,
    );
  if (messages.length === 0) messages.push("没有可添加的图片...");
  Utils.commonMsg(messages.join("；"));
}

function onMove(index: number, offset: 1 | -1) {
  const image = images.value[index];
  const target = index + offset;
  if (image?.id === undefined || target < 0 || target >= images.value.length) return;
  repository.move(slot, image.id, target);
  // 选中集合和多选锚点都按序号记，换位后要跟着换
  imageListRef.value?.swapIndexedState(index, target);
  refresh();
  currentIndex.value = target;
}

function onDeleteFrames(targets: number[]) {
  const indices = [...new Set(targets)]
    .filter((index) => index >= 0 && index < images.value.length)
    .sort((a, b) => a - b);
  if (indices.length === 0) return;

  const ids = indices
    .map((index) => images.value[index].id)
    .filter((id): id is number => id !== undefined);
  if (ids.length === 0) return;

  const nextIndex = Math.max(0, Math.min(indices[0], images.value.length - ids.length - 1));
  repository.remove(ids);
  refresh();
  imageListRef.value?.setSelection(nextIndex);
  props.onSuccessfulChange?.({ isok: true, final: images.value.length });
}

function onModifyFilename() {
  editingFilename.value = true;
}

function onDiscardFilenameEdit() {
  editingFilename.value = false;
}

function rename() {
  const newName = filenameInputRef.value?.value;
  const id = currentImage.value.id;
  if (newName !== undefined && id !== undefined) {
    const result = repository.rename(id, newName);
    if (result !== null) {
      currentImage.value = result;
    }
  }
  editingFilename.value = false;
}

function onDeleteAll() {
  repository.clear(slot);
  refresh();
  imageListRef.value?.resetSelection();
  props.onSuccessfulChange?.({ isok: true, final: 0 });
}

/**
 * 聚焦时记住这次要改哪些图片。
 *
 * `change` 要等输入框失焦才触发，而点击缩略图会先改变光标和选中集合；
 * 若等到 `change` 再从 `ImageList` 取目标，权重就会落到刚点中的那张图上。
 */
let weightTargets: number[] = [];

function onWeightFocus() {
  weightTargets = imageListRef.value?.getEditTargets() ?? [currentIndex.value];
}

function onWeightChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const weight = Number(input.value);
  const current = currentImage.value?.weight ?? 1;
  if (!Number.isFinite(weight) || weight < 1) {
    // 非法输入回填原值，避免输入框停在空值或乱码
    input.value = String(current);
    return;
  }

  const targets = (
    weightTargets.length > 0
      ? weightTargets
      : (imageListRef.value?.getEditTargets() ?? [currentIndex.value])
  )
    .map((index) => images.value[index]?.id)
    .filter((id): id is number => id !== undefined);
  if (targets.length === 0) {
    input.value = String(current);
    return;
  }

  repository.setWeight(targets, weight);
  refresh();
  // 权重会被仓储夹到 1-10；输入框回显最终值，而不是用户刚敲的原始数字
  input.value = String(currentImage.value?.weight ?? 1);
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

.mcmodder-bg-pool-imagelist {
  --mcmodder-imagelist-thumb-size: 56px;
  --mcmodder-imagelist-preview-max-height: 200px;
  --mcmodder-imagelist-image-rendering: auto;
}

/* 背景图会铺满预览区，给左上角的信息加一层底，避免文字直接压在图上 */
.mcmodder-bg-pool-imagelist :deep(.mcmodder-imagelist-preview-info) {
  padding: 2px 6px;
  border-radius: var(--mcmodder-width-radius);
  background-color: var(--mcmodder-color-background-transparent);
  box-shadow: 0 0 4px var(--mcmodder-color-box-shadow);
}

.mcmodder-bg-pool-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcmodder-bg-pool-inputfilename {
  width: 220px;
}

.mcmodder-bg-pool-editfilename {
  margin: 0 4px;
}

.mcmodder-bg-pool-editfilename:hover {
  color: var(--mcmodder-color-accent-dark2) !important;
}
</style>
