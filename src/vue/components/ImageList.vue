<template>
  <div class="mcmodder-imagelist-container" :class="editable ? 'editable' : ''">
    <div v-if="!loadError" class="mcmodder-imagelist-grid">
      <div class="mcmodder-imagelist-preview">
        <div class="mcmodder-imagelist-preview-info">
          <slot name="info" />
        </div>
        <div class="mcmodder-imagelist-preview-imgcontainer mcmodder-iconbg">
          <img v-if="previewFrame()" :src="previewFrame()!" alt="预览" />
        </div>
        <div class="mcmodder-imagelist-preview-controls">
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="currentIndex <= 0 || !allowControl"
            @click="emit('move', currentIndex, -1)"
          >
            前移
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="currentIndex >= frames.length - 1 || !allowControl"
            @click="emit('move', currentIndex, 1)"
          >
            后移
          </button>
          <template v-if="editable && showBlankInsert">
            <button
              class="btn btn-sm"
              :disabled="!allowControl"
              @click="emit('insert', currentIndex)"
            >
              向前插入新空白{{ item }}
            </button>
            <button
              class="btn btn-sm"
              :disabled="!allowControl"
              @click="emit('insert', currentIndex + 1)"
            >
              向后插入新空白{{ item }}
            </button>
          </template>
          <slot name="control" />
          <button
            v-if="editable"
            class="btn btn-sm btn-dark"
            :disabled="frames.length === 0 || !allowControl"
            :title="`选择一张本地图片，在当前${item}后面插入此${item}`"
            @click="onImportImage"
          >
            插入{{ item }}...
          </button>
          <button
            v-if="editable && showReplace"
            class="btn btn-sm btn-dark"
            :disabled="frames.length === 0 || !allowControl"
            :title="`用图片替换选中的${item}`"
            @click="onReplaceImage"
          >
            使用本地图片替换...
          </button>
          <button
            v-if="editable && fetchImage && allowLink"
            class="btn btn-sm btn-dark"
            :disabled="
              selectedLinkTargets.length === 0 || !allowControl || converting || compressOpen
            "
            :title="
              converting
                ? '努力转换中，请耐心等待...'
                : `将选中的${
                    (selectedLinkTargets.length || '') &&
                    ` ${selectedLinkTargets.length.toLocaleString()} 张`
                  }外链${item}下载并压缩后替换为本地${item}`
            "
            @click="onConvertLinkImages"
          >
            转换为本地{{ item }}
          </button>
          <button
            v-if="editable"
            class="btn btn-sm btn-danger"
            :disabled="frames.length === 0 || !allowControl"
            :title="`删除选中的${item}`"
            @click="onDeleteFrame"
          >
            删除选中{{ item }}
          </button>
          <button
            v-if="editable && showApply"
            class="btn btn-sm btn-success"
            :disabled="!allowApply"
            @click="emit('applyModify')"
          >
            应用更改
          </button>
        </div>
      </div>
      <div ref="imageFramesRef" class="mcmodder-imagelist-imageframes">
        <button
          v-for="(frame, index) in frames"
          :key="index"
          :data-index="index"
          class="mcmodder-imagelist-imageframe"
          :class="{
            current: index === currentIndex,
            selected: selected.has(index),
          }"
          @pointerdown="onFramePointerdown(index, $event)"
          @keydown="onFrameKeydown($event)"
        >
          <span class="mcmodder-imagelist-imageframe-gutter">{{ index }}</span>
          <div class="mcmodder-imagelist-imagecontainer mcmodder-iconbg">
            <img :src="frame.url" :alt="`#${index + 1}`" />
          </div>
          <span class="mcmodder-imagelist-imagetime">{{ subtexts[index] }}</span>
        </button>
      </div>
    </div>
    <div v-else class="mcmodder-imagelist-empty">
      <slot name="empty">{{ loadError }}</slot>
    </div>
    <!-- 文件输入放在条件渲染之外：空列表时父组件也能借用它来添加图片 -->
    <input
      ref="imageImportInputRef"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="onImageImportChange"
    />
    <input
      ref="imageReplaceInputRef"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="onImageReplaceChange"
    />
    <Teleport :to="imageImportContainer">
      <p>从磁盘中选取本地图片，本地图片将会在保存时持久化存储在本机。</p>
      <button class="btn" @click="onImportImageLocal">选择本地图片...</button>
      <hr />
      <p class="title">
        在下方输入一个图片 URL，本机将只保存此图片的引用，不会完整保存图片信息，
        但是每次访问时都可能会联网获取，且图片较大或网络状态不佳时会拖慢网页加载速度。
        同时导入多张图片时，每行填入一个 URL。
      </p>
      <textarea
        ref="importImageOnlineInputRef"
        class="form-control"
        placeholder="https://example.com/background.jpg"
      />
      <button class="btn btn-success" @click="onImportImageOnline">导入外链</button>
    </Teleport>
    <Teleport :to="imageCompressContainer">
      <div v-if="compressOpen" class="mcmodder-imagelist-compress">
        <p class="mcmodder-imagelist-compress-title">
          正在{{ compressModeName }}第 {{ (compressIndex + 1).toLocaleString() }} /
          {{ compressQueue.length.toLocaleString() }} 张：
          <span class="mcmodder-imagelist-compress-name">{{
            compressQueue[compressIndex]?.name
          }}</span>
        </p>
        <div
          v-if="compressedImage === null"
          class="mcmodder-imagelist-compresspreview mcmodder-skeleton"
        />
        <img v-else class="mcmodder-imagelist-compresspreview" :src="compressedImage" />
        <p>
          压缩质量:
          <SliderInput
            title="压缩质量"
            :value="quality"
            :range="[0.5, 1]"
            :precision="0.01"
            :on-successful-change="onSuccessfulChange"
          />
        </p>
        <p>
          压缩后体积:
          <abbr :title="`${compressedSize.toLocaleString()} 字节（含 Base64 开销）`">{{
            Utils.getFormattedSize(compressedSize)
          }}</abbr>
          <template v-if="compressedImage !== null && originalSize > 0">
            ({{ compressRatio }}%)
          </template>
        </p>
        <p>
          原始体积:
          <abbr :title="`${originalSize.toLocaleString()} 字节`">{{
            Utils.getFormattedSize(originalSize)
          }}</abbr>
        </p>
        <div class="mcmodder-imagelist-compress-actions">
          <button
            class="btn btn-success"
            :disabled="compressedImage === null || compressBusy"
            @click="applyCurrentCompression"
          >
            应用
          </button>
          <button
            v-if="compressQueue.length - compressIndex > 1"
            class="btn"
            :disabled="compressedImage === null || compressBusy"
            @click="applyCompressionToRest"
          >
            对当前及剩余 {{ compressQueue.length - compressIndex - 1 }} 张图片以当前质量压缩
          </button>
          <button
            class="btn"
            title="此图片将不会被导入"
            :disabled="compressBusy"
            @click="skipCurrentCompression"
          >
            跳过此图片
          </button>
          <button
            class="btn btn-danger"
            title="将本轮改动的所有内容（包括已压缩的内容）全部作废"
            :disabled="compressBusy"
            @click="cancelCompression"
          >
            放弃本轮{{ compressModeName }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch, type Ref } from "vue";
import { Utils } from "../../Utils";
import SliderInput from "./input/SliderInput.vue";
import { BackgroundRepository } from "../../background/BackgroundRepository";

const imageFramesRef = useTemplateRef("imageFramesRef");
const importImageOnlineInputRef = useTemplateRef("importImageOnlineInputRef");

interface Props {
  /** 文案中出现的量词 */
  unit: string;
  /** 文案中每个对象的名称 */
  item: string;
  editable: boolean;
  /** 有值时整个列表换成空白页，并把值交给 `empty` 插槽显示（无内容 / 解析失败共用） */
  loadError: string | null;
  frames: {
    type: "link" | "local";
    url: string;
  }[];
  /** 显示在图片选择栏中每张图片下方的附加文本 */
  subtexts: string[];
  /** 是否允许上传非本地的图片 */
  allowLink?: boolean;
  /** 导入本地图片前是否先让用户选择压缩质量（默认否，直接把原文件交给父组件） */
  compressImport?: boolean;
  /**
   * 下载外链图片。提供后操作栏会出现「将外链图片转换为本地图片」按钮，
   * 由父组件负责走统一的网络请求入口（组件本身不直接发包）。
   */
  fetchImage?: (url: string) => Promise<Blob>;
  /** 当前状态下允许编辑 */
  allowControl?: boolean;
  /** 当前状态下允许保存/应用编辑 */
  allowApply?: boolean;
  /** 是否显示「插入新空白」按钮（只有 GIF 帧这类存在空白概念的列表才需要） */
  showBlankInsert?: boolean;
  /** 是否显示「使用图片替换」按钮 */
  showReplace?: boolean;
  /** 是否显示「应用更改」按钮 */
  showApply?: boolean;
  /** 压缩时用于填充透明部分的底色（JPEG 不支持透明） */
  fillColor?: string;
}

const imageImportContainer = document.createElement("div");
imageImportContainer.classList.add("mcmodder-imagelist-swal");

const imageCompressContainer = document.createElement("div");
imageCompressContainer.classList.add("mcmodder-imagelist-swal");

/** 外链转换时下载阶段的进度提示（直接改 textContent，避免为一次性弹窗引入额外状态） */
const convertProgress = document.createElement("p");
convertProgress.classList.add("mcmodder-imagelist-convert-progress");

const props = withDefaults(defineProps<Props>(), {
  allowControl: true,
  allowApply: true,
  showBlankInsert: true,
  showReplace: true,
  showApply: true,
  fillColor: "#fff",
  compressImport: false,
  fetchImage: undefined,
});
const unit = computed(() => props.unit);
const item = computed(() => props.item);
const frames = computed(() => props.frames);
const editable = computed(() => props.editable);

const currentIndex = ref(0);
const selected = ref(new Set<number>());
const previousSelected = ref(0);
const previousSelectedWithShiftKey = ref(0);

/** 待压缩的一张本地图片 */
interface CompressTask {
  file: File;
  name: string;
  /** 转换外链时对应的原图序号；普通导入为 undefined */
  targetIndex?: number;
}

/** 压缩面板当前服务的流程 */
type CompressMode = "import" | "convert";

/** 压缩导入面板是否打开 */
const compressOpen = ref(false);
/** 当前压缩流程：导入新图片，或把选中的外链图片原地替换为本地图片 */
const compressMode = ref<CompressMode>("import");
const compressModeName = computed(() => (compressMode.value === "convert" ? "转换" : "导入"));
/** 正在下载外链图片（压缩面板尚未打开） */
const converting = ref(false);
/** 待压缩队列（当前及之后的图片） */
const compressQueue = shallowRef<CompressTask[]>([]);
const compressIndex = ref(0);
/** 已确认的压缩结果，队列走完后一次性交给父组件 */
const compressResults = shallowRef<{ name: string; dataUrl: string; targetIndex?: number }[]>([]);
/** 打开文件选择框时记下的插入位置 */
const compressInsertAt = ref(0);
const compressBusy = ref(false);
/** 每次预览压缩的令牌：快速拖动质量滑块时只认最后一次的结果 */
let compressToken = 0;
/** 每次外链转换的令牌：组件卸载后丢弃仍在进行的下载结果 */
let convertToken = 0;

const quality = ref(1);
const compressedImage: Ref<string | null> = ref(null);
const originalSize = computed(() => compressQueue.value[compressIndex.value]?.file.size ?? 0);
const compressedSize = computed(() => compressedImage.value?.length ?? 0);
const compressRatio = computed(() => {
  if (originalSize.value === 0) return "0";
  return Utils.getPrecisionFormatter().format((compressedSize.value / originalSize.value) * 100);
});

watch(
  () => quality.value,
  () => {
    if (compressOpen.value && !compressBusy.value) void refreshCompressedPreview();
  },
);

// 组件在弹窗打开时被卸载（例如切换设置页）就把弹窗一并关掉，
// 否则自定义按钮随组件消失，弹窗会卡住无法关闭。
onBeforeUnmount(() => {
  convertToken += 1;
  if (converting.value) {
    converting.value = false;
    swal.close();
  }
  if (!compressOpen.value) return;
  compressOpen.value = false;
  resetCompression();
  swal.close();
});

/**
 * 预览区当前显示的画面。
 *
 * 故意不用 `computed`：持有 `shallowRef` 的父组件（如 `GIFViewer`）会原地修改数组
 * 再 `triggerRef`，数组引用不变，`props.frames` 就不会失效；缓存过的预览图会停在旧画面上
 * （例如「向前插入新空白帧」后光标序号没变）。这里每次渲染都重新取一次。
 */
function previewFrame(): string | null {
  return frames.value[currentIndex.value]?.url ?? null;
}

function resetSelection() {
  selected.value = new Set();
  currentIndex.value = 0;
  previousSelected.value = 0;
  previousSelectedWithShiftKey.value = 0;
}

function setSelection(index: number) {
  selected.value = new Set();
  const clamped =
    frames.value.length === 0 ? 0 : Math.max(0, Math.min(index, frames.value.length - 1));
  currentIndex.value = clamped;
  previousSelected.value = clamped;
  previousSelectedWithShiftKey.value = clamped;
}

/** 要修改的对象：有多选就用多选，否则只用当前项 */
function getEditTargets(): number[] {
  return selected.value.size > 0 ? Array.from(selected.value) : [currentIndex.value];
}

/** 选中的外链图片序号（转换按钮只作用于这些项，不套用「无选中即当前项」的兜底） */
const selectedLinkTargets = computed(() => {
  const indexes = [...selected.value];
  if (!selected.value.has(currentIndex.value)) {
    indexes.push(currentIndex.value);
  }
  return indexes.filter((index) => frames.value[index]?.type === "link").sort((a, b) => a - b);
});

/** 从外链地址里取一个用于压缩面板展示的名称 */
function linkFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "");
    return name || parsed.hostname || "外链图片";
  } catch {
    return "外链图片";
  }
}

// 列表变短（删除、换源）后，光标和选中集合都可能落在界外，交给组件自己收尾
watch(
  () => frames.value.length,
  (length) => {
    if (length === 0) {
      resetSelection();
      return;
    }
    if (currentIndex.value >= length) currentIndex.value = length - 1;
    if (selected.value.size > 0) {
      const pruned = new Set([...selected.value].filter((index) => index < length));
      if (pruned.size !== selected.value.size) selected.value = pruned;
    }
    previousSelected.value = Math.min(previousSelected.value, length - 1);
    previousSelectedWithShiftKey.value = Math.min(previousSelectedWithShiftKey.value, length - 1);
  },
);

watch(
  () => currentIndex.value,
  (newValue) => {
    const target = $(imageFramesRef!).find(`[data-index=${newValue}]`).get(0);
    target?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  },
);

function onFrameKeydown(ev: KeyboardEvent) {
  emit("frameKeydown", ev);
  let switched = false;
  let index = currentIndex.value;
  if (ev.key === "ArrowLeft" || (ev.key === "Tab" && ev.shiftKey)) {
    ev.preventDefault();
    index--;
    switched = true;
  } else if (ev.key === "ArrowRight" || (ev.key === "Tab" && !ev.shiftKey)) {
    ev.preventDefault();
    index++;
    switched = true;
  } else if (Utils.isKeyMatch(Utils.getXplatCtrlCombinationKey({ keyCode: 65 }), ev)) {
    ev.preventDefault();
    selected.value.clear();
    for (let i = 0; i < frames.value.length; i++) {
      selected.value.add(i);
    }
  }
  if (index >= frames.value.length) {
    index = 0;
  } else if (index < 0) {
    index = frames.value.length - 1;
  }
  if (switched) {
    onFramePointerdown(index);
  }
}

function onFramePointerdown(index: number, ev?: PointerEvent) {
  currentIndex.value = index;
  if (ev?.shiftKey) {
    for (
      let i = previousSelected.value;
      i !== previousSelectedWithShiftKey.value;
      i += Math.sign(previousSelectedWithShiftKey.value - previousSelected.value)
    ) {
      selected.value.delete(i);
    }
    selected.value.delete(previousSelectedWithShiftKey.value);
    for (
      let i = previousSelected.value;
      i !== index;
      i += Math.sign(index - previousSelected.value)
    ) {
      selected.value.add(i);
    }
    selected.value.add(index);
    previousSelectedWithShiftKey.value = index;
  } else if (Utils.isMac() ? ev?.metaKey : ev?.ctrlKey) {
    if (selected.value.has(index)) {
      selected.value.delete(index);
    } else {
      selected.value.add(index);
    }
  } else {
    selected.value.clear();
    previousSelected.value = index;
    previousSelectedWithShiftKey.value = index;
  }
  emit("framePointerdown", index);
}

/**
 * 删除选中的对象；选中的是全部对象时，就相当于把整个列表清空。
 *
 * 全删之后没有必要硬留一个空壳，直接回到空白页，用户想继续的话可以从空白页重新添加。
 */
function onDeleteFrame() {
  if (!editable.value || frames.value.length === 0) return;
  const targets = getEditTargets();
  const total = frames.value.length;
  if (targets.length >= total) {
    swal.fire({
      type: "warning",
      title: "警告",
      text: `您选中了全部 ${total.toLocaleString()} ${unit.value}${item.value}，继续将删除所有内容，此操作不可逆，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-color-danger)",
      preConfirm: () => {
        emit("deleteAll");
        return true;
      },
    });
    return;
  }
  swal.fire({
    type: "warning",
    title: "警告",
    text: `您正在尝试删除 ${targets.length.toLocaleString()} ${unit.value}${item.value}，此操作不可逆，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonColor: "var(--mcmodder-color-danger)",
    preConfirm: () => {
      emit("deleteFrames", targets);
      return true;
    },
  });
}

const imageImportRef = useTemplateRef<HTMLInputElement>("imageImportInputRef");
const imageReplaceRef = useTemplateRef<HTMLInputElement>("imageReplaceInputRef");
/** 打开文件选择框时记下的插入位置；空列表时父组件也可以显式指定 */
let imageImportAt = 0;

/**
 * 打开图片选择框。
 *
 * 不要求列表非空：空白页的「添加图片」按钮需要通过这里借用同一个文件输入框。
 *
 * @param index 选中的图片要插入的位置
 */
function openImageImport(index = currentIndex.value + 1) {
  imageImportAt = index;
  imageImportRef.value?.click();
}

/**
 * 打开图片选择框，选中的图片会替换当前选中的对象。
 *
 * 同样不要求列表非空，是否可用由父组件决定。
 */
function openImageReplace() {
  imageReplaceRef.value?.click();
}

/**
 * 打开「本地 / 外链」选择面板；不支持外链时直接打开文件选择框。
 *
 * 面板里的两个入口共用打开面板时记下的插入位置，避免中途切换光标后插错地方。
 */
function onImportImage() {
  imageImportAt = frames.value.length === 0 ? 0 : currentIndex.value + 1;
  if (!props.allowLink) {
    openImageImport(imageImportAt);
    return;
  }
  swal.fire({
    title: "导入图片",
    html: `<div class="jsonframe-import-container" />`,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "取消",
  });
  $(".jsonframe-import-container").append(imageImportContainer);
}

function onImportImageLocal() {
  swal.close();
  openImageImport(imageImportAt);
}

function onImportImageOnline() {
  const urls = (importImageOnlineInputRef.value?.value ?? "")
    .split("\n")
    .map((e) => e.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    Utils.commonMsg("请至少输入一个图片 URL...", false);
    return;
  }
  emit("imageLinkImportSelected", urls, imageImportAt);
  if (importImageOnlineInputRef.value !== null) {
    importImageOnlineInputRef.value.value = "";
  }
  swal.close();
}

/** 打开文件选择框，选中的图片会替换当前选中的对象 */
function onReplaceImage() {
  if (frames.value.length === 0) return;
  openImageReplace();
}

/**
 * 读取文件选择框的内容并交给父组件。
 *
 * 这里直接交付 `File[]` 而不是 DOM 事件：父组件不需要再碰输入框，
 * 组件也能顺手把输入框清空，保证连续选择同一个文件仍会触发 `change`。
 */
function onImageImportChange(ev: Event) {
  const input = ev.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (files.length === 0) return;
  if (props.compressImport) {
    startCompressImport(files, imageImportAt);
    return;
  }
  emit("imageImportSelected", files, imageImportAt);
}

/**
 * 开始「先压缩、再导入」流程。
 *
 * 每张图都先做一份预览，用户拖动质量滑块时实时看到压缩后的画面与体积；
 * 点「应用」只确认当前这张，点「对当前及剩余...」则用同一质量一次处理到底。
 * 队列走完后统一 emit 压缩结果，中途取消则整批放弃。
 */
function startCompressImport(files: File[], index: number) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  if (images.length === 0) {
    Utils.commonMsg("需要选择至少一张图片哦...", false);
    return;
  }
  if (images.length < files.length) {
    Utils.commonMsg(`${files.length - images.length} 个文件不是图片，已跳过...`, false);
  }

  startCompression(
    images.map((file) => ({ file, name: file.name })),
    "import",
    Math.max(0, index),
  );
}

/**
 * 下载选中的外链图片，再走与本地导入完全相同的压缩预览流程。
 *
 * 下载交给父组件提供的 `fetchImage`（内部经 `Mcmodder.web.createRequest` 发出），
 * 组件本身不直接联网；下载完成后按原图序号进入压缩队列，确认后由父组件原地替换。
 */
async function onConvertLinkImages() {
  const fetchImage = props.fetchImage;
  if (fetchImage === undefined || converting.value || compressOpen.value) return;
  const targets = selectedLinkTargets.value;
  if (targets.length === 0) return;

  converting.value = true;
  const token = ++convertToken;
  const tasks: CompressTask[] = [];
  const failed: string[] = [];
  try {
    swal.fire({
      title: "下载外链图片",
      html: `<div class="mcmodder-imagelist-convert-dialog" />`,
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });
    $(".mcmodder-imagelist-convert-dialog").append(convertProgress);
    for (const [done, index] of targets.entries()) {
      if (token !== convertToken) return;
      const frame = frames.value[index];
      if (frame === undefined) continue;
      const name = linkFileName(frame.url);
      convertProgress.textContent = `正在下载第 ${(
        done + 1
      ).toLocaleString()} / ${targets.length.toLocaleString()} 张图片... (${name})`;
      try {
        const blob = await fetchImage(frame.url);
        if (token !== convertToken) return;
        // 有些图床不给 Content-Type，交给浏览器按内容解码即可
        const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        tasks.push({
          file: new File([blob], name, { type }),
          name,
          targetIndex: index,
        });
      } catch (error) {
        console.error("[Mcmodder] 图片外链下载失败: ", { url: frame.url, error });
        failed.push(`${name}（${error instanceof Error ? error.message : "未知错误"}）`);
      }
    }
  } finally {
    if (token === convertToken) {
      converting.value = false;
      swal.close();
    }
  }
  if (token !== convertToken) return;

  if (failed.length > 0) {
    Utils.commonMsg(
      `${failed.length.toLocaleString()} 张外链图片下载失败：${failed.slice(0, 2).join("、")}`,
      false,
    );
  }
  if (tasks.length === 0) {
    if (failed.length === 0) Utils.commonMsg("没有可转换的外链图片...", false);
    return;
  }
  startCompression(tasks, "convert");
}

/** 打开压缩面板并初始化队列（导入与转换共用） */
function startCompression(tasks: CompressTask[], mode: CompressMode, insertAt = 0) {
  compressMode.value = mode;
  compressQueue.value = tasks;
  compressIndex.value = 0;
  compressResults.value = [];
  compressInsertAt.value = Math.max(0, insertAt);
  compressedImage.value = null;
  compressBusy.value = false;
  compressOpen.value = true;

  void swal
    .fire({
      title: mode === "convert" ? "转换外链图片" : "压缩图片",
      html: `<div class="mcmodder-imagelist-compress-dialog" />`,
      showConfirmButton: false,
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    })
    .then(() => {
      // 被外部关掉时也要清干净，避免下次打开还残留上一次的队列
      if (!compressOpen.value) return;
      compressOpen.value = false;
      resetCompression();
    });
  $(".mcmodder-imagelist-compress-dialog").append(imageCompressContainer);
  void refreshCompressedPreview();
}

/** 重新生成当前图片的压缩预览（质量变化或切到下一张时调用） */
async function refreshCompressedPreview() {
  const task = compressQueue.value[compressIndex.value];
  const token = ++compressToken;
  compressedImage.value = null;
  if (task === undefined) return;
  try {
    const dataUrl = await BackgroundRepository.compress(task.file, props.fillColor, quality.value);
    if (token === compressToken) compressedImage.value = dataUrl;
  } catch (error) {
    if (token !== compressToken) return;
    console.error("[Mcmodder] 图片压缩预览创建失败: ", { name: task.name, error });
    Utils.commonMsg(
      `无法压缩 ${task.name}...（${error instanceof Error ? error.message : "未知错误"}）`,
      false,
    );
  }
}

/** 关闭压缩面板并清掉队列状态（不负责 emit） */
function resetCompression() {
  compressToken += 1;
  compressMode.value = "import";
  compressQueue.value = [];
  compressIndex.value = 0;
  compressResults.value = [];
  compressedImage.value = null;
  compressBusy.value = false;
}

function closeCompressDialog() {
  compressOpen.value = false;
  swal.close();
}

/** 队列走完：关闭面板，把压缩结果一次性交给父组件 */
function finishCompression(failed: string[]) {
  const mode = compressMode.value;
  const results = compressResults.value;
  const insertAt = compressInsertAt.value;
  closeCompressDialog();
  resetCompression();

  if (failed.length > 0) {
    Utils.commonMsg(
      `${failed.length.toLocaleString()} 张图片压缩失败：${failed.slice(0, 2).join("、")}`,
      false,
    );
  }
  if (results.length === 0) {
    if (failed.length === 0)
      Utils.commonMsg(mode === "convert" ? "没有可转换的图片..." : "没有可添加的图片...", false);
    return;
  }
  if (mode === "convert") {
    emit(
      "imageLinkConvertCompressed",
      results
        .filter(
          (item): item is { name: string; dataUrl: string; targetIndex: number } =>
            item.targetIndex !== undefined,
        )
        .map((item) => ({ index: item.targetIndex, dataUrl: item.dataUrl })),
    );
    return;
  }
  emit("imageImportCompressed", results, insertAt);
}

/** 用指定质量压缩一张图（失败时抛出，由调用方决定怎么提示） */
function compressTask(task: CompressTask, q: number): Promise<string> {
  return BackgroundRepository.compress(task.file, props.fillColor, q);
}

/** 应用当前这张图，然后自动切到下一张 */
async function applyCurrentCompression() {
  const task = compressQueue.value[compressIndex.value];
  if (task === undefined || compressBusy.value) return;
  compressBusy.value = true;
  try {
    const dataUrl = await compressTask(task, quality.value);
    compressResults.value.push({ name: task.name, dataUrl, targetIndex: task.targetIndex });
    if (compressIndex.value >= compressQueue.value.length - 1) {
      finishCompression([]);
      return;
    }
    compressIndex.value += 1;
    void refreshCompressedPreview();
  } catch (error) {
    console.error("[Mcmodder][imagelist] 图片压缩失败: ", { name: task.name, error });
    Utils.commonMsg(
      `无法压缩 ${task.name}...（${error instanceof Error ? error.message : "未知错误"}）`,
      false,
    );
  } finally {
    compressBusy.value = false;
  }
}

/** 用当前质量一次处理当前及剩余的所有图片 */
async function applyCompressionToRest() {
  if (compressBusy.value) return;
  const start = compressIndex.value;
  if (compressQueue.value[start] === undefined) return;
  const q = quality.value;
  compressBusy.value = true;
  const failed: string[] = [];
  try {
    for (let i = start; i < compressQueue.value.length; i += 1) {
      compressIndex.value = i;
      compressedImage.value = null;
      const task = compressQueue.value[i];
      try {
        const dataUrl = await compressTask(task, q);
        compressResults.value.push({ name: task.name, dataUrl, targetIndex: task.targetIndex });
        compressedImage.value = dataUrl;
      } catch (error) {
        console.error("[mcmodder] 图片批量压缩失败: ", { name: task.name, error });
        failed.push(task.name);
      }
    }
  } finally {
    compressBusy.value = false;
  }
  finishCompression(failed);
}

/** 跳过当前这张（例如格式无法解码），继续处理下一张 */
function skipCurrentCompression() {
  if (compressBusy.value) return;
  if (compressIndex.value >= compressQueue.value.length - 1) {
    finishCompression([]);
    return;
  }
  compressIndex.value += 1;
  void refreshCompressedPreview();
}

function cancelCompression() {
  if (compressBusy.value || !compressOpen.value) return;
  closeCompressDialog();
  resetCompression();
}

function onImageReplaceChange(ev: Event) {
  const input = ev.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (files.length === 0) return;
  emit("imageReplaceSelected", files);
}

/** 插入对象后，按序号记的选中集合与多选锚点整体后移 */
function shiftIndexedState(index: number, delta: number) {
  const shifted = new Set<number>();
  for (const value of selected.value) {
    shifted.add(value >= index ? value + delta : value);
  }
  selected.value = shifted;
  if (previousSelected.value >= index) previousSelected.value += delta;
  if (previousSelectedWithShiftKey.value >= index) previousSelectedWithShiftKey.value += delta;
}

/** 选中集合、多选锚点都是按序号记的，对象一换位它们也要跟着换 */
function swapIndexedState(index: number, target: number) {
  const selectedIndex = selected.value.has(index);
  const selectedTarget = selected.value.has(target);
  if (selectedIndex !== selectedTarget) {
    if (selectedIndex) {
      selected.value.delete(index);
      selected.value.add(target);
    } else {
      selected.value.delete(target);
      selected.value.add(index);
    }
  }
  const swapValue = (value: number) =>
    value === index ? target : value === target ? index : value;
  previousSelected.value = swapValue(previousSelected.value);
  previousSelectedWithShiftKey.value = swapValue(previousSelectedWithShiftKey.value);
}

function onSuccessfulChange(info: InputValidInfo<number>) {
  if (info.isok) {
    quality.value = info.final!;
  }
}

defineExpose({
  imageFramesRef,
  getEditTargets,
  currentIndex,
  resetSelection,
  setSelection,
  shiftIndexedState,
  swapIndexedState,
  openImageImport,
  openImageImportPanel: onImportImage,
  openImageReplace,
});

const emit = defineEmits<{
  move: [index: number, offset: 1 | -1];
  insert: [index: number];
  deleteFrames: [target: number[]];
  deleteAll: [];
  applyModify: [];
  imageImportSelected: [files: File[], index: number];
  /** 用户在压缩面板里确认后的本地图片（data URL） */
  imageImportCompressed: [images: { name: string; dataUrl: string }[], index: number];
  /** 选中的外链图片转换完成：按原图序号原地替换为本地图片 */
  imageLinkConvertCompressed: [images: { index: number; dataUrl: string }[]];
  imageLinkImportSelected: [urls: string[], index: number];
  imageReplaceSelected: [files: File[]];
  frameKeydown: [ev: KeyboardEvent];
  framePointerdown: [index: number];
}>();
</script>

<style lang="css">
.mcmodder-imagelist-empty {
  padding: 8px 12px;
  border-radius: var(--mcmodder-width-radius);
  background-color: var(--mcmodder-color-background-transparent);
  box-shadow: 0 3px 5px var(--mcmodder-color-box-shadow);
  color: var(--mcmodder-color-text-dark2);
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
}

.mcmodder-imagelist-grid {
  display: grid;
  grid-template-rows: 2;
  gap: var(--mcmodder-width-padding-3);
}

.mcmodder-imagelist-imageframes {
  display: flex;
  flex-direction: row;
  gap: var(--mcmodder-width-padding-3);
  overflow-x: auto;
  padding: 6px 0;
}

.mcmodder-imagelist-imageframe {
  display: flex;
  position: relative;
  flex-direction: column;
  align-items: center;
  padding: 8px 25px;
  gap: 4px;
  background-color: var(--mcmodder-color-background-transparent);
  border-radius: var(--mcmodder-width-radius);
  box-shadow: 0 3px 5px var(--mcmodder-color-box-shadow);
  cursor: var(--mcmodder-cursor-hand);
  border: 2px solid var(--mcmodder-color-background);
  box-sizing: border-box;
  transform: translateY(0);
  transition:
    background-color 0.3s ease,
    transform 0.3s ease;
}

.mcmodder-imagelist-imageframe:focus {
  outline: none;
}

.mcmodder-imagelist-imageframe:hover {
  background-color: var(--mcmodder-color-accent-background);
  transform: translateY(-3px);
}

.mcmodder-imagelist-imageframe.current {
  border: 2px solid var(--mcmodder-color-primary);
  background-color: var(--mcmodder-color-primary-background);
}

.mcmodder-imagelist-imageframe.selected {
  border: 2px solid var(--mcmodder-color-primary);
}

.mcmodder-imagelist-imageframe-gutter {
  position: absolute;
  top: 0;
  left: 0.15em;
  line-height: 1em;
  color: var(--mcmodder-color-text-dark3);
}

.mcmodder-imagelist-imageframe.current .mcmodder-imagelist-imageframe-gutter {
  color: var(--mcmodder-color-primary-dark1);
}

.mcmodder-imagelist-imagecontainer {
  width: var(--mcmodder-imagelist-thumb-size, 32px);
  height: var(--mcmodder-imagelist-thumb-size, 32px);
  border-radius: 4px;
}

.mcmodder-imagelist-imagecontainer img {
  image-rendering: var(--mcmodder-imagelist-image-rendering, pixelated);
  width: 100%;
  height: 100%;
  margin: auto;
  object-fit: contain;
}

.mcmodder-imagelist-imagetime {
  font-size: 14px;
  font-style: italic;
  color: var(--mcmodder-color-text-dark2);
  text-wrap: nowrap;
}

.mcmodder-imagelist-preview {
  min-height: 80px;
  display: flex;
  background-color: var(--mcmodder-color-background-transparent);
  box-shadow: 0 3px 5px var(--mcmodder-color-box-shadow);
  border-radius: var(--mcmodder-width-radius);
  position: relative;
}

.mcmodder-imagelist-preview-imgcontainer {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  min-width: 0;
  margin: 30px auto;
  line-height: 0;
}

.mcmodder-imagelist-container.editable .mcmodder-imagelist-preview-imgcontainer {
  margin-bottom: 50px;
}

.mcmodder-imagelist-preview-controls {
  position: absolute;
  right: 0.3em;
  bottom: 0;
  padding: 0.3em;
  display: flex;
  gap: 0.3em;
  width: calc(100% - 0.6em);
  overflow-x: auto;
  text-wrap: nowrap;
}

.mcmodder-imagelist-preview-controls > button.btn {
  margin: 0;
}

.mcmodder-imagelist-preview-controls > button.btn:first-child {
  margin-left: auto;
}

.mcmodder-imagelist-preview-imgcontainer img {
  image-rendering: var(--mcmodder-imagelist-image-rendering, pixelated);
  margin: 0;
  max-width: 100%;
  max-height: var(--mcmodder-imagelist-preview-max-height, 240px);
  object-fit: contain;
}

.mcmodder-imagelist-preview-info {
  position: absolute;
  left: 0.3em;
  top: 0.3em;
  max-width: 40%;
  max-height: calc(100% - 35px);
  overflow: auto;
  direction: rtl;
}

.mcmodder-imagelist-preview-info p {
  font-size: inherit !important;
  line-height: inherit !important;
  color: var(--mcmodder-color-text-dark2) !important;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  text-wrap: nowrap;
  direction: ltr;
}

.mcmodder-imagelist-preview-info .form-control {
  display: inline-block;
  width: 4em;
}

.mcmodder-imagelist-preview-info label {
  margin-bottom: 0;
}

.mcmodder-imagelist-swal p {
  color: var(--mcmodder-color-text-dark2);
  font-size: 14px;
  line-height: 1.25rem;
}

.mcmodder-imagelist-compress .form-control {
  display: inline-block;
  text-align: center;
  width: 100px;
}

.mcmodder-imagelist-compress-title {
  margin-bottom: 8px;
  text-align: center;
}

.mcmodder-imagelist-compress-name {
  font-weight: bold;
  word-break: break-all;
}

.mcmodder-imagelist-compresspreview {
  display: block;
  max-width: 100%;
  max-height: 240px;
  margin: 0 auto 8px;
  object-fit: contain;
}

.mcmodder-imagelist-compresspreview.mcmodder-skeleton {
  height: 180px;
}

.mcmodder-imagelist-compress-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.mcmodder-imagelist-compress-actions > .btn {
  margin: 0;
}

.mcmodder-imagelist-convert-progress {
  text-align: center;
  word-break: break-all;
}
</style>
