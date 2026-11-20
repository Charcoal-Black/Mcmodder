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
            使用图片替换...
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
            <img :src="frame" :alt="`#${index + 1}`" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { Utils } from "../../Utils";

const imageFramesRef = useTemplateRef("imageFramesRef");

interface Props {
  /** 文案中出现的量词 */
  unit: string;
  /** 文案中每个对象的名称 */
  item: string;
  editable: boolean;
  /** 有值时整个列表换成空白页，并把值交给 `empty` 插槽显示（无内容 / 解析失败共用） */
  loadError: string | null;
  frames: string[];
  subtexts: string[];
  allowControl?: boolean;
  allowApply?: boolean;
  /** 是否显示「插入新空白」按钮（只有 GIF 帧这类存在空白概念的列表才需要） */
  showBlankInsert?: boolean;
  /** 是否显示「使用图片替换」按钮 */
  showReplace?: boolean;
  /** 是否显示「应用更改」按钮 */
  showApply?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowControl: true,
  allowApply: true,
  showBlankInsert: true,
  showReplace: true,
  showApply: true,
});
const unit = computed(() => props.unit);
const item = computed(() => props.item);
const frames = computed(() => props.frames);
const editable = computed(() => props.editable);

const currentIndex = ref(0);
const selected = ref(new Set<number>());
const previousSelected = ref(0);
const previousSelectedWithShiftKey = ref(0);

/**
 * 预览区当前显示的画面。
 *
 * 故意不用 `computed`：持有 `shallowRef` 的父组件（如 `GIFViewer`）会原地修改数组
 * 再 `triggerRef`，数组引用不变，`props.frames` 就不会失效；缓存过的预览图会停在旧画面上
 * （例如「向前插入新空白帧」后光标序号没变）。这里每次渲染都重新取一次。
 */
function previewFrame(): string | null {
  return frames.value[currentIndex.value] ?? null;
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

/** 打开文件选择框，选中的图片会插到当前对象后面 */
function onImportImage() {
  if (frames.value.length === 0) return;
  openImageImport(currentIndex.value + 1);
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
  emit("imageImportSelected", files, imageImportAt);
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

defineExpose({
  imageFramesRef,
  getEditTargets,
  currentIndex,
  resetSelection,
  setSelection,
  shiftIndexedState,
  swapIndexedState,
  openImageImport,
  openImageReplace,
});

const emit = defineEmits<{
  move: [index: number, offset: 1 | -1];
  insert: [index: number];
  deleteFrames: [target: number[]];
  deleteAll: [];
  applyModify: [];
  imageImportSelected: [files: File[], index: number];
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
</style>
