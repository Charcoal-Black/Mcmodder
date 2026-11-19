<template>
  <div class="mcmodder-gifviewer-container" :class="editable ? 'editable' : ''">
    <div v-if="!loadError" class="mcmodder-gifviewer-grid">
      <div class="mcmodder-gifviewer-preview">
        <div class="mcmodder-gifviewer-preview-info">
          <slot name="info" />
        </div>
        <div class="mcmodder-gifviewer-preview-imgcontainer mcmodder-iconbg">
          <img v-if="previewFrame" :src="previewFrame" alt="预览" />
        </div>
        <div class="mcmodder-gifviewer-preview-controls">
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
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="!allowControl"
            @click="emit('insert', currentIndex)"
          >
            向前插入新空白{{ item }}
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="!allowControl"
            @click="emit('insert', currentIndex + 1)"
          >
            向后插入新空白{{ item }}
          </button>
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
            v-if="editable"
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
            v-if="editable"
            class="btn btn-sm btn-success"
            :disabled="!allowApply"
            @click="emit('applyModify')"
          >
            应用更改
          </button>
        </div>
        <input
          ref="imageImportInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="emit('imageImportSelected')"
        />
        <input
          ref="imageReplaceInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="emit('imageReplaceSelected')"
        />
      </div>
      <div ref="imageFramesRef" class="mcmodder-gifviewer-imageframes">
        <button
          v-for="(frame, index) in frames"
          :key="index"
          :data-index="index"
          class="mcmodder-gifviewer-imageframe"
          :class="{
            current: index === currentIndex,
            selected: selected.has(index),
          }"
          @pointerdown="onFramePointerdown(index, $event)"
          @keydown="onFrameKeydown($event)"
        >
          <span class="mcmodder-gifviewer-imageframe-gutter">{{ index }}</span>
          <div class="mcmodder-gifviewer-imagecontainer mcmodder-iconbg">
            <img :src="frame" :alt="`#${index + 1}`" />
          </div>
          <span class="mcmodder-gifviewer-imagetime">{{ subtexts[index] }}</span>
        </button>
      </div>
    </div>
    <div v-else class="mcmodder-gifviewer-empty">
      <slot name="empty"></slot>
    </div>
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
  loadError: string | null;
  frames: string[];
  subtexts: string[];
  allowControl?: boolean;
  allowApply?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  allowControl: true,
  allowApply: true,
});
const unit = computed(() => props.unit);
const item = computed(() => props.item);
const frames = computed(() => props.frames);
const editable = computed(() => props.editable);

const currentIndex = ref(0);
const selected = ref(new Set<number>());
const previousSelected = ref(0);
const previousSelectedWithShiftKey = ref(0);

const previewFrame = computed(() => {
  return frames.value[currentIndex.value] ?? null;
});

function resetSelection() {
  currentIndex.value = 0;
  previousSelected.value = 0;
  previousSelectedWithShiftKey.value = 0;
}

function setSelection(index: number) {
  selected.value = new Set();
  currentIndex.value = index;
  previousSelected.value = index;
  previousSelectedWithShiftKey.value = index;
}

/** 要修改的帧：有多选就用多选，否则只改当前帧 */
function getEditTargets(): number[] {
  return selected.value.size > 0 ? Array.from(selected.value) : [currentIndex.value];
}

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
 * 删除选中的帧；选中的是全部帧时，就相当于把整个动图删掉。
 *
 * 全删之后没有必要硬留一帧空壳，直接回到空白页，用户想继续的话可以重新新建。
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

/** 打开文件选择框，选中的图片会插到当前帧后面 */
function onImportImage() {
  if (frames.value.length === 0) return;
  imageImportRef.value?.click();
}

/** 打开文件选择框，选中的图片会替换当前选中的帧 */
function onReplaceImage() {
  if (frames.value.length === 0) return;
  imageReplaceRef.value?.click();
}

/** 插入帧后，按序号记的选中集合与多选锚点整体后移 */
function shiftIndexedState(index: number, delta: number) {
  const shifted = new Set<number>();
  for (const value of selected.value) {
    shifted.add(value >= index ? value + delta : value);
  }
  selected.value = shifted;
  if (previousSelected.value >= index) previousSelected.value += delta;
  if (previousSelectedWithShiftKey.value >= index) previousSelectedWithShiftKey.value += delta;
}

/** 选中集合、多选锚点都是按序号记的，帧一换位它们也要跟着换 */
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
});

const emit = defineEmits<{
  move: [index: number, offset: 1 | -1];
  insert: [index: number];
  deleteFrames: [target: number[]];
  deleteAll: [];
  applyModify: [];
  imageImportSelected: [];
  imageReplaceSelected: [];
  frameKeydown: [ev: KeyboardEvent];
  framePointerdown: [index: number];
}>();
</script>
