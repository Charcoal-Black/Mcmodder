<template>
  <div ref="rootRef" class="mcmodder-bg-pool">
    <ImageList
      ref="imageListRef"
      class="mcmodder-bg-pool-imagelist"
      unit="张"
      item="图片"
      :editable="true"
      :allow-link="true"
      :compress-import="true"
      :fill-color="slot === 'day' ? '#fff' : '#111'"
      :load-error="images.length === 0 ? '暂无图片...' : null"
      :frames="frames"
      :subtexts="subtexts"
      :fetch-image="fetchImage"
      :show-blank-insert="false"
      :show-replace="false"
      :show-apply="false"
      @move="onMove"
      @delete-frames="onDeleteFrames"
      @delete-all="onDeleteAll"
      @image-import-compressed="onImageImportCompressed"
      @image-link-convert-compressed="onImageLinkConvertCompressed"
      @image-link-import-selected="onImageLinkImportSelected"
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
        <p v-if="currentImage?.type === 'link'">
          图片地址:
          <abbr class="mcmodder-bg-pool-link" :title="currentImage.dataUrl">{{
            currentImage.dataUrl
          }}</abbr>
        </p>
        <p v-else-if="currentImage">
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
          添加背景图片...
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
import type { ConfigRepository } from "../../../config/ConfigRepository";
import type { Mcmodder } from "../../../Mcmodder";

/** 单张外链图片的下载超时（毫秒） */
const LINK_DOWNLOAD_TIMEOUT = 30_000;

/**
 * 背景图池的配置控件。
 *
 * 与其它 `input/*` 组件不同，本控件持久的不是「配置值」本身（本地图片体积远超 GM storage
 * 的配额，外链则只保存 URL），而是 GM storage 中的图片集合；配置里的值只是占位（记录数量），
 * 用于让设置面板识别到变化。具体归属白天还是夜间由配置 id 决定
 * （`backgroundPoolDay` / `backgroundPoolNight`）。
 *
 * 浏览、插入、删除、排序全部交给 `ImageList`，这里只负责把它的交互翻译成对
 * `BackgroundRepository` 的读写；本地图片在 `ImageList` 的压缩面板里确认质量后，
 * 与「导入图片」面板里的外链 URL 走同一条落库路径。
 */
const props = defineProps<
  InputProps<number> & {
    id: string;
    configs: ConfigRepository;
    parent: Mcmodder;
  }
>();

const rootRef = useTemplateRef("rootRef");
const imageListRef = useTemplateRef("imageListRef");
const filenameInputRef = useTemplateRef("filenameInputRef");
const images = ref<BackgroundImageRow[]>([]);
const repository = new BackgroundRepository(props.configs);

/** 由配置 id 推断 slot */
const slot = props.id.lastIndexOf("backgroundPoolNight") > -1 ? "night" : "day";
const slotLabel = slot === "day" ? "白天" : "夜间";

const frames = computed(() =>
  images.value.map((image) => ({ type: image.type, url: image.dataUrl })),
);
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
  BackgroundPool.reload(props.configs, slot);
  images.value = [...BackgroundPool.getImages(slot)];
  BackgroundPool.resetPicked();
}

/**
 * 下载外链图片。
 *
 * 外链可能跨域，直接 `fetch` 会被 CORS 拦下，故统一交给 `Mcmodder.web.createRequest`
 * （GM 请求不受页面同源策略限制，也顺带进入限速队列）。
 */
async function fetchImage(url: string): Promise<Blob> {
  // `createRequest` 只在 onload 时 resolve，网络层错误不会回调；超时兜底避免下载面板卡死
  const { promise: timeout, reject: rejectTimeout } = Promise.withResolvers<never>();
  const timer = setTimeout(() => rejectTimeout(new Error("下载超时")), LINK_DOWNLOAD_TIMEOUT);
  try {
    const resp = await Promise.race([
      props.parent.web.createRequest(
        { url, method: "GET", responseType: "blob" },
        "下载外链背景图片",
        true,
      ),
      timeout,
    ]);
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`.trim());
    }
    if (resp.response.size === 0) {
      throw new Error("下载到的图片为空");
    }
    return resp.response;
  } finally {
    clearTimeout(timer);
  }
}

// 同步读取 GM storage，首帧就能拿到真实列表，不会先闪一下空白页
refresh();

function pickFilesForEmpty() {
  imageListRef.value?.openImageImportPanel();
}

/** 从「导入图片」面板接收外链 URL，按打开面板时的位置插入 */
async function onImageLinkImportSelected(urls: string[], index: number) {
  let insertAt = Math.max(0, Math.min(index, images.value.length));
  let added = 0;
  const failed: string[] = [];
  for (const url of urls) {
    try {
      await repository.add(slot, "", "link", url, insertAt);
      insertAt += 1;
      added += 1;
    } catch (error) {
      console.error("[Mcmodder] 图片外链写入失败", { slot, url, error });
      failed.push(`${url}（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  refresh();

  if (added > 0) {
    // 等列表把新图片渲染出来再定位，否则 ImageList 会拿旧长度把光标夹回旧的末尾
    await nextTick();
    imageListRef.value?.setSelection(Math.min(insertAt - 1, images.value.length - 1));
    props.onSuccessfulChange?.({ isok: true, final: images.value.length });
    Utils.commonMsg(`已添加 ${added.toLocaleString()} 张${slotLabel}外链背景~`);
  }

  if (failed.length > 0) {
    Utils.commonMsg(
      `${failed.length.toLocaleString()} 个外链保存失败：${failed.slice(0, 2).join("、")}${failed.length > 2 ? "..." : ""}`,
      false,
    );
  } else if (added === 0) {
    Utils.commonMsg("没有可添加的外链...", false);
  }
}

/** 从压缩面板接收本地图片（已经是 data URL），按打开面板时的位置插入 */
async function onImageImportCompressed(items: { name: string; dataUrl: string }[], index: number) {
  let insertAt = Math.max(0, Math.min(index, images.value.length));
  let added = 0;
  const failed: string[] = [];
  for (const item of items) {
    try {
      await repository.add(slot, item.name, "local", item.dataUrl, insertAt);
      insertAt += 1;
      added += 1;
    } catch (error) {
      console.error("[Mcmodder] 本地图片写入失败: ", { slot, name: item.name, error });
      failed.push(`${item.name}（${error instanceof Error ? error.message : "未知错误"}）`);
    }
  }

  refresh();

  if (added > 0) {
    // 等列表把新图片渲染出来再定位，否则 ImageList 会拿旧长度把光标夹回旧的末尾
    await nextTick();
    imageListRef.value?.setSelection(Math.min(insertAt - 1, images.value.length - 1));
    props.onSuccessfulChange?.({ isok: true, final: images.value.length });
    Utils.commonMsg(`已添加 ${added.toLocaleString()} 张${slotLabel}背景~`);
  }

  const messages: string[] = [];
  if (added > 0) messages.push();
  if (failed.length > 0) {
    Utils.commonMsg(
      `${failed.length.toLocaleString()} 张图片保存失败：${failed.slice(0, 2).join("、")}${failed.length > 2 ? "..." : ""}`,
      false,
    );
  } else {
    Utils.commonMsg("没有可添加的图片...", false);
  }
}

/** 把选中的外链图片原地替换为压缩后的本地图片（保留名称、权重与顺序） */
function onImageLinkConvertCompressed(items: { index: number; dataUrl: string }[]) {
  const replacements: { id: number; dataUrl: string }[] = [];
  for (const item of items) {
    const id = images.value[item.index]?.id;
    if (id !== undefined) replacements.push({ id, dataUrl: item.dataUrl });
  }
  if (replacements.length === 0) return;

  const replaced = repository.replaceWithLocal(replacements);
  refresh();
  if (replaced > 0) props.onSuccessfulChange?.({ isok: true, final: images.value.length });
  Utils.commonMsg(
    replaced > 0
      ? `已将 ${replaced.toLocaleString()} 张${slotLabel}外链图片转换为本地图片~`
      : "没有可转换的外链图片...",
    replaced > 0,
  );
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
      // 同步刷新图池缓存，否则下次从这里读到的还是旧名字
      refresh();
      currentImage.value = result;
    }
  }
  editingFilename.value = false;
}

async function onDeleteAll() {
  await repository.clear(slot);
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

/* 外链地址可能很长，信息面板里只显示一行，完整地址放在 title 上 */
.mcmodder-bg-pool-link {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.mcmodder-bg-pool-editfilename {
  margin: 0 4px;
}

.mcmodder-bg-pool-editfilename:hover {
  color: var(--mcmodder-color-accent-dark2) !important;
}
</style>
