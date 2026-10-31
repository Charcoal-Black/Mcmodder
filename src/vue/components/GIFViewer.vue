<template>
  <div class="mcmodder-gifviewer-container" :class="editable ? 'editable' : ''">
    <div v-if="!loadError" class="mcmodder-gifviewer-grid">
      <div class="mcmodder-gifviewer-preview">
        <div class="mcmodder-gifviewer-preview-info">
          <p>
            文件体积:
            <abbr
              :class="fileSize > Values.iconFileMaxSize ? 'text-danger' : ''"
              :title="fileSize.toLocaleString() + ' 字节'"
              >{{ Utils.getFormattedSize(fileSize) }}</abbr
            >
          </p>
          <p>
            尺寸:
            <span v-if="!editingSize" v-text="gifSize.width.toLocaleString()" />
            <input
              v-else
              ref="gifSizeWidthInputRef"
              v-model.number="newWidth"
              class="form-control"
              @beforeinput="onSizeBeforeInput"
              @input="updateSizeInput('width')"
            />
            ×
            <span v-if="!editingSize" v-text="gifSize.height.toLocaleString()" />
            <input
              v-else
              ref="gifSizeHeightInputRef"
              v-model.number="newHeight"
              class="form-control"
              @beforeinput="onSizeBeforeInput"
              @input="updateSizeInput('height')"
            />
            <template v-if="editable">
              <a
                v-if="!editingSize"
                class="mcmodder-gifviewer-preview-editsize"
                title="修改尺寸"
                @click="onModifySize"
                ><i class="fa fa-pencil"
              /></a>
              <template v-else>
                <CheckboxInput
                  ref="gifSizeLockRatioInputRef"
                  title="锁定宽高比"
                  :value="
                    props.parent.configRepository.getSettings('preferredGIFViewerRatioLock') ??
                    false
                  "
                  :with-label="true"
                  :on-successful-change="onToggleRatioLock"
                />
                <a
                  class="mcmodder-gifviewer-preview-editsize"
                  title="确认修改"
                  @click="resize(true)"
                  ><i class="fa fa-check"
                /></a>
                <a
                  class="mcmodder-gifviewer-preview-editsize"
                  title="放弃修改"
                  @click="onDiscardSizeEdit"
                  ><i class="fa fa-close"
                /></a>
              </template>
            </template>
          </p>
          <p>
            循环次数:
            {{
              hasLoopExtension ? (loopCount === 0 ? "∞" : loopCount?.toLocaleString()) : "不循环"
            }}
            <a
              v-if="editable"
              class="mcmodder-gifviewer-preview-editloop"
              title="编辑循环次数"
              @click="onModifyLoopCount"
              ><i class="fa fa-pencil"
            /></a>
          </p>
          <p v-if="editable">
            <abbr
              v-if="paletteLossy || sizeLossy || opaqueLossy"
              class="text-warning"
              :title="
                [
                  ...(paletteLossy
                    ? [
                        '- 这个动图的某些帧拥有的颜色超过了 256 种，受 GIF 格式自身限制，这些帧被迫有损压缩... 但是其他帧并没有受到影响~',
                      ]
                    : []),
                  ...(sizeLossy ? ['- 这个动图在缩放时丢失了一些细节...'] : []),
                  ...(opaqueLossy
                    ? [
                        '- 渐变插值时，相邻两帧同一坐标位置的像素透明度发生了变化，GIF 格式无法储存半透明的像素，故插值帧中这些像素均被处理为完全透明了...',
                      ]
                    : []),
                ].join('\n')
              "
              ><i class="mcmodder-gifviewer-preview-quality fa fa-warning" />出现有损量化</abbr
            >
            <abbr v-else class="text-success" title="这个动图在编辑前后没有任何像素发生改变，完美！"
              ><i class="mcmodder-gifviewer-preview-quality fa fa-check" />完全无损</abbr
            >
          </p>
          <p>
            #<span class="mcmodder-gifviewer-preview-gutter">{{ currentIndex }}</span> /
            {{ frames.length - 1 }}
          </p>
        </div>
        <div class="mcmodder-gifviewer-preview-imgcontainer mcmodder-iconbg">
          <img v-if="previewFrame" :src="previewFrame" alt="预览" />
        </div>
        <div class="mcmodder-gifviewer-preview-controls">
          <button
            class="btn btn-sm"
            :class="playing ? 'btn-danger' : 'btn-success'"
            :disabled="frames.length === 0"
            @click="togglePlay"
          >
            {{ playing ? "暂停" : "播放" }}
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="currentIndex <= 0 || playing"
            @click="onMoveBackward(currentIndex)"
          >
            前移
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="currentIndex >= frames.length - 1 || playing"
            @click="onMoveForward(currentIndex)"
          >
            后移
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="playing"
            @click="onInsertBefore(currentIndex)"
          >
            向前插入新空白帧
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            :disabled="playing"
            @click="onInsertAfter(currentIndex)"
          >
            向后插入新空白帧
          </button>
          <button
            v-if="editable"
            class="btn btn-sm btn-dark"
            :disabled="frames.length === 0 || playing"
            @click="onModifyFrametime"
          >
            修改帧时长
          </button>
          <button
            v-if="editable"
            class="btn btn-sm"
            title="将此帧转换为过渡帧。选中帧将被拆分成若干个向下一帧线性渐变的帧，每帧持续 50ms。"
            :disabled="frames.length < 2 || playing"
            @click="onInterpolate(getEditTargets())"
          >
            设为过渡帧
          </button>
          <button
            v-if="editable"
            class="btn btn-sm btn-dark"
            :disabled="frames.length === 0 || playing"
            title="在当前帧后面插入图片帧"
            @click="onImportImage"
          >
            插入图片帧...
          </button>
          <button
            v-if="editable"
            class="btn btn-sm btn-dark"
            :disabled="frames.length === 0 || playing"
            title="用图片替换选中的帧"
            @click="onReplaceImage"
          >
            使用图片替换...
          </button>
          <button v-if="editable" class="btn btn-sm" @click="onImportMcmeta">导入 MCMETA...</button>
          <button
            v-if="editable"
            class="btn btn-sm btn-danger"
            :disabled="frames.length === 0 || playing"
            title="删除选中的帧（全选时删除整个动图）"
            @click="onDeleteFrame"
          >
            删除选中帧
          </button>
          <button
            v-if="editable"
            class="btn btn-sm btn-success"
            :disabled="!editedBlob"
            @click="onApplyModify"
          >
            应用更改
          </button>
          <button class="btn btn-sm btn-dark" @click="onDownloadGif">导出 GIF</button>
        </div>
        <input
          ref="imageImportInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="onImageImportSelected"
        />
        <input
          ref="imageReplaceInputRef"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="onImageReplaceSelected"
        />
        <input
          ref="mcmetaImportInputRef"
          type="file"
          accept=".mcmeta"
          class="hidden"
          @change="onMcmetaImportSelected"
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
            <img :src="frame" :alt="`第 ${index + 1} 帧`" />
          </div>
          <span class="mcmodder-gifviewer-imagetime">{{ frameTimes[index] }}ms</span>
        </button>
      </div>
    </div>
    <div v-else class="mcmodder-gifviewer-empty">
      {{ loadError }}
      <template v-if="editable">
        <div class="mcmodder-gifviewer-createnew">
          <button class="btn btn-success" @click="createNew">新建一个 GIF 动图</button>
          <button class="btn" :title="sliceImageTitle" @click="createFromSlice">
            从静态图切片新建...
          </button>
        </div>
        <input
          ref="imageSliceInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onImageSliceSelected"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Utils } from "../../Utils";
import { computed, onBeforeUnmount, ref, shallowRef, triggerRef, useTemplateRef, watch } from "vue";
import { createGIFPlayer } from "../../gif/GIFPlayer";
import { GIFUtils, type GIFFrameSource, type GIFResizeResult } from "../../gif/GIFUtils";
import { Values } from "../../Values";
import CheckboxInput from "./input/CheckboxInput.vue";
import type { Mcmodder } from "../../Mcmodder.ts";

interface Props {
  parent: Mcmodder;
  editable?: boolean;
  validate?: (ctx: { width: number; height: number }) => boolean;
}

/** 一次「替换帧画面」的编辑 */
interface FrameReplacement {
  index: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
  url: string;
}

/** 待插入的一帧：画面来源 + 缩略图 */
interface FrameInsertion {
  source: GIFFrameSource;
  url: string;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  validate: () => true,
});
const gifSource = shallowRef<Blob>();
const editable = computed(() => props.editable);
const validate = computed(() => props.validate);

const emit = defineEmits<{
  /** 每次编辑（改时长 / 换顺序 / 插帧）产出了新的 GIF 之后触发，父组件可以拿来回填图标 */
  change: [blob: Blob];
}>();

const sliceImageTitle = `对上传的图片切片，作为新的 GIF 内容。具体规则如下：
1. 被切片的图片高度必须是自身宽度的整数倍。
2. 将上传的图片横向切分成多个正方形（宽度与原始图片宽度一致，且高度与宽度相等的）图片。
3. 将切分后的图片按顺序作为新的帧来排列。`;

const frames = shallowRef<string[]>([]);
const frameTimes = shallowRef<number[]>([]);
/**
 * 界面上的第 i 帧的画面来自哪里。
 *
 * - 原文件里的帧只记序号（`source`）；
 * - 插入的空白帧 / 图片帧直接存整幅画面（`rgba`）。
 *
 * 排序、插入都只动这个数组，原始字节始终不动；写回时交给 `GIFUtils.applyEdits`。
 */
let frameSources: GIFFrameSource[] = [];
/** 自己造出来的帧缩略图 URL（插入的图片帧、被替换的帧），换源和卸载时要一并释放 */
const insertedUrls = new Set<string>();
/** 画布尺寸；插入帧时要造一张同尺寸的画面 */
let gifSize = { width: 0, height: 0 };
/** 颜色超限的提示只弹一次，免得每次拖动都弹 */
const paletteLossy = ref(false);
/** 图像放缩时丢失细节的提示 */
const sizeLossy = ref(false);
/** 渐变插值时，遇到相邻帧同像素透明状态发生变化时的提示 */
const opaqueLossy = ref(false);
const currentIndex = ref(0);
const selected = ref(new Set<number>());
const previousSelected = ref(0);
const previousSelectedWithShiftKey = ref(0);
const loading = ref(false);
const playing = ref(false);
/** 用户是否正在修改图像尺寸 */
const editingSize = ref(false);
/** 若用户正在修改图像尺寸，则在锁定宽高比的时刻记录宽高比 */
const gifSizeRatio = ref(1);
/** 若用户正在修改图像尺寸，则代表新的宽度 */
const newWidth = ref(0);
/** 若用户正在修改图像尺寸，则代表新的高度 */
const newHeight = ref(0);
/** 解析失败时的提示；有值时整个编辑器换成一行说明（删光所有帧时也借它切到空白页） */
const loadError = ref<string | null>(null);
/** 原始 GIF 字节，改时长时以它为基准重新写回（反复修改不会叠加） */
const sourceBytes = shallowRef<Uint8Array | null>(null);
/** 循环次数；`0` 表示无限循环 */
const loopCount = ref<number | null>(null);
/** 文件里原本有没有循环扩展（没有 = 只播一次，和「无限循环」的 0 不是一回事） */
const hasLoopExtension = ref(false);
/** 用户是否真的改过循环次数；没改过就沿用原文件，免得给「只播一次」的动图补一个无限循环块 */
const loopEdited = ref(false);
/** 改过时长之后的结果，供导出用；没改过时为 `null` */
const editedBlob = shallowRef<Blob | null>(null);

const fileSize = computed(() => editedBlob.value?.size ?? gifSource.value?.size ?? 0);

const imageFramesRef = useTemplateRef("imageFramesRef");
const imageSliceRef = useTemplateRef<HTMLInputElement>("imageSliceInputRef");
const imageImportRef = useTemplateRef<HTMLInputElement>("imageImportInputRef");
const imageReplaceRef = useTemplateRef<HTMLInputElement>("imageReplaceInputRef");
const mcmetaImportRef = useTemplateRef<HTMLInputElement>("mcmetaImportInputRef");
const gifSizeLockRatioInputRef = useTemplateRef("gifSizeLockRatioInputRef");

/** 上一轮解析出来的 blob URL，换源时要把它们释放掉，否则 blob 会一直挂在内存里 */
let disposePrevious: (() => void) | null = null;

/**
 * 播放器实例。
 *
 * `frameTimes` 是响应式的，但播放器构造时拿到的是当时的值；
 * 每轮解析结束后重建播放器，让它用上最新的时长。
 */
let player: ReturnType<typeof createGIFPlayer> | null = null;

/** 缩放正在生成缩略图时忽略重复点击 */
let resizing = false;
/** 生成过渡帧时忽略重复点击（缩略图是异步造的） */
let interpolating = false;
/** 解析并应用 MCMETA 时忽略重复点击 */
let applyingMcmeta = false;

const previewFrame = computed(() => frames.value[currentIndex.value] ?? null);

async function set(source: Blob) {
  gifSource.value = source;
  loading.value = true;
  try {
    if (source === undefined) {
      clearGif("暂无内容...");
      return;
    }
    const parsed = await GIFUtils.parse(source);
    // 新的一轮已经拿到，先把上一轮的 URL 释放掉
    disposePrevious?.();
    disposePrevious = parsed.dispose;
    releaseInsertedUrls();
    loadError.value = null;
    frames.value = parsed.frames;
    frameTimes.value = parsed.frameTimes;
    frameSources = parsed.frames.map((_, index) => ({ type: "source", index }));
    gifSize = { width: parsed.width, height: parsed.height };
    paletteLossy.value = false;
    sizeLossy.value = false;
    opaqueLossy.value = false;
    sourceBytes.value = parsed.source;
    loopCount.value = parsed.loopCount;
    hasLoopExtension.value = parsed.hasLoopExtension;
    loopEdited.value = false;
    editedBlob.value = null;
    currentIndex.value = 0;
    previousSelected.value = 0;
    previousSelectedWithShiftKey.value = 0;
    // 帧数变了，播放器要按新的时长重算时间轴
    player?.dispose();
    player = createGIFPlayer({
      frameTimes: parsed.frameTimes,
      onFrameChange: (index) => {
        currentIndex.value = index;
      },
    });
    playing.value = false;
    emit("change", gifSource.value);
  } catch (error) {
    // 物品图标大多是 PNG，直接解析会抛异常；这里降级成一行提示，
    // 不要让它变成未处理的 Promise 拒绝
    const message = error instanceof Error ? error.message : String(error);
    clearGif(
      message.startsWith("不是 GIF") ? "当前图标不是 GIF 动图..." : `解析 GIF 失败：${message}`,
    );
  } finally {
    loading.value = false;
  }
}
/**
 * 清空当前动图，回到「这里什么都没有」的空白页。
 *
 * 解析失败和「删光了所有帧」共用这一套收尾：解析结果的缩略图、自己造的缩略图、
 * 播放器和各种编辑状态一并收掉。`loadError` 有值时模板就会换成空白页，
 * 并给可编辑的编辑器留出新建入口。
 *
 * @param message 显示在空白页上的说明
 */
function clearGif(message: string) {
  disposePrevious?.();
  disposePrevious = null;
  releaseInsertedUrls();
  frames.value = [];
  frameTimes.value = [];
  frameSources = [];
  gifSize = { width: 0, height: 0 };
  paletteLossy.value = false;
  sizeLossy.value = false;
  opaqueLossy.value = false;
  sourceBytes.value = null;
  editedBlob.value = null;
  loopCount.value = null;
  hasLoopExtension.value = false;
  loopEdited.value = false;
  currentIndex.value = 0;
  selected.value = new Set();
  previousSelected.value = 0;
  previousSelectedWithShiftKey.value = 0;
  editingSize.value = false;
  gifSizeRatio.value = 1;
  player?.dispose();
  player = null;
  playing.value = false;
  loadError.value = message;
}

watch(
  () => currentIndex.value,
  (newValue) => {
    const target = $(imageFramesRef.value!).find(`[data-index=${newValue}]`).get(0);
    target?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  },
);

onBeforeUnmount(() => {
  player?.dispose();
  player = null;
  disposePrevious?.();
  disposePrevious = null;
  releaseInsertedUrls();
});

/**
 * 从零开始新建一个动图。
 *
 * 静态图片（PNG / JPEG …）按原始尺寸原样做成唯一一帧；解析失败的 GIF 没法当静态图用，
 * 退回 32×32 的全透明画布。新动图固定 100ms 一帧、无限循环。
 */
async function createNew() {
  if (!editable.value || loading.value) return;
  loading.value = true;
  try {
    const source = gifSource.value;
    // GIF 本身解析失败时不能拿它凑数，只有真正的静态图才铺成画面
    // 判断这个文件是不是 GIF（包括解析失败的那些）；不是 GIF 才可能拿来当静态图片
    const picture =
      source === undefined || (await GIFUtils.isGIFBlob(source))
        ? null
        : await GIFUtils.imageToOriginalFrame(source).catch(() => null);
    const width = picture?.width ?? 32;
    const height = picture?.height ?? 32;
    const rgba = picture?.rgba ?? new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
    await createFromFrames(
      [rgba],
      width,
      height,
      picture ? `已按图片原始尺寸 ${width}×${height} 新建动图~` : "已新建一个 32×32 的空白动图~",
    );
  } catch (error) {
    Utils.commonMsg(`新建动图失败... (${error})`, false);
  } finally {
    loading.value = false;
  }
}

/**
 * 用一组同尺寸的画面新建动图，并接上编辑器。
 *
 * 所有新建入口（空白画布 / 静态图 / 切片）都走这里：固定 100ms 一帧、无限循环，
 * 旧的解析结果、缩略图、播放器一并收掉。
 *
 * @param rgbas 每一帧的整幅画面，长度必须是 `width * height * 4`
 * @param width 画布宽度
 * @param height 画布高度
 * @param message 新建成功后的提示
 */
async function createFromFrames(
  rgbas: Uint8ClampedArray<ArrayBuffer>[],
  width: number,
  height: number,
  message: string,
) {
  const times = rgbas.map(() => 100);
  const result = GIFUtils.create(rgbas, width, height, times, 0);
  // 缩略图先造好再清旧资源，中途失败不会把现在的画面弄没
  const urls = await Promise.all(rgbas.map((rgba) => GIFUtils.rgbaToBlobURL(rgba, width, height)));

  disposePrevious?.();
  disposePrevious = null;
  releaseInsertedUrls();
  player?.dispose();
  for (const url of urls) insertedUrls.add(url);

  loadError.value = null;
  sourceBytes.value = result.bytes;
  frameSources = rgbas.map((_, index) => ({ type: "source", index }));
  gifSize = { width, height };
  frames.value = urls;
  frameTimes.value = times;
  paletteLossy.value = result.lossy;
  sizeLossy.value = false;
  opaqueLossy.value = false;
  loopCount.value = 0;
  hasLoopExtension.value = true;
  loopEdited.value = false;
  editedBlob.value = GIFUtils.toBlob(result.bytes);
  currentIndex.value = 0;
  selected.value = new Set();
  previousSelected.value = 0;
  previousSelectedWithShiftKey.value = 0;
  editingSize.value = false;
  gifSizeRatio.value = 1;
  playing.value = false;
  player = createGIFPlayer({
    frameTimes: times,
    onFrameChange: (index) => {
      currentIndex.value = index;
    },
  });

  Utils.commonMsg(message);
}

/**
 * 把一张竖排序列图切成若干正方形帧。
 *
 * 每帧宽高都等于图片宽度，所以图片高度必须是宽度的整数倍；从上到下依次成为各帧。
 * 尺寸不合法时会提示并返回 `null`。
 */
async function sliceImage(blob: Blob): Promise<{
  frames: Uint8ClampedArray<ArrayBuffer>[];
  size: number;
} | null> {
  const image = await GIFUtils.imageToOriginalFrame(blob);
  const size = image.width;
  if (image.height % size !== 0) {
    Utils.commonMsg(
      `图片高度 ${image.height}px 不是宽度 ${size}px 的整数倍，没法切成正方形...`,
      false,
    );
    return null;
  }

  const sliceBytes = size * size * 4;
  const frames: Uint8ClampedArray<ArrayBuffer>[] = [];
  for (let index = 0; index < image.height / size; index++) {
    const rgba = new Uint8ClampedArray(new ArrayBuffer(sliceBytes));
    rgba.set(image.rgba.subarray(index * sliceBytes, (index + 1) * sliceBytes));
    frames.push(rgba);
  }
  return { frames, size };
}

function createFromSlice() {
  if (!editable.value || loading.value || frames.value.length > 0) return;
  imageSliceRef.value?.click();
}

function togglePlay() {
  if (!player) return;
  if (playing.value) {
    player.pause();
  } else {
    player.play();
  }
  playing.value = player.playing.value;
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
  // 点选某帧时把播放位置同步过去（顺带暂停，方便细看）
  player?.seek(index);
  player?.pause();
  playing.value = false;
}

function onFrameKeydown(ev: KeyboardEvent) {
  if (ev.key === " ") {
    ev.preventDefault();
    togglePlay();
    return;
  }
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

function onModifyFrametime() {
  if (frames.value.length === 0 || !editable.value) return;
  if (playing.value) {
    togglePlay();
  }
  const targets = getEditTargets();
  const current = frameTimes.value[targets[0]];
  const isCommon = targets.every((index) => frameTimes.value[index] === current);
  swal.fire({
    text: "设置选中帧的持续时间（单位为 ms，必须为 10ms 的整数倍）...",
    input: "number",
    inputValue: isCommon ? current.toString() : "",
    preConfirm: (value) => {
      const time = value === "" ? -1 : Number(value);
      if (!Number.isInteger(time) || time < 0) {
        Utils.commonMsg("请输入一个合法的数值...", false);
        return false;
      }
      // GIF 的时长只能存整数厘秒，先把输入对齐到实际能存下的值，
      // 否则界面显示 95ms、导出后却是 100ms，预览和成品对不上
      const normalized = GIFUtils.msToCentiseconds(time) * 10;
      targets.forEach((index) => {
        frameTimes.value[index] = normalized;
      });
      triggerRef(frameTimes);
      applyEditsToGif();
      return true;
    },
  });
}

/**
 * 对于传入的帧集合中的每个帧，把选中的帧变成向下一个目标帧渐变的过渡帧。
 *
 * 设第 `index` 帧为 A（时长 T，≥100ms 且是 50ms 的整数倍），它后面那一帧为 B：
 * A 自己留在原位、时长压到 50ms，再接上 `T / 50 - 1` 个每帧 50ms 的插值帧，
 * 这一段仍然占用 T 毫秒——整条动图的总时长不变，A 的时长被摊成了一段 A→B 的等距渐变。
 *
 * 插值只混色、不改轮廓：两帧的透明区域对不上时，冲突像素在插值帧里只能留空，
 * 记进 `opaqueLossy` 交给顶部的质量提示说明，这里不弹窗打断。
 */
async function onInterpolate(targets = getEditTargets()) {
  if (frames.value.length === 0 || !editable.value || interpolating) return;
  if (playing.value) {
    togglePlay();
  }
  const filtered = targets.filter((index) => {
    const time = frameTimes.value[index];
    return time >= 100 && time % 50 === 0;
  });
  if (filtered.length === 0) {
    Utils.commonMsg("选中帧的持续时间须不短于 100ms 且是 50ms 的整数倍...", false);
    return;
  }
  const source = sourceBytes.value;
  const { width, height } = gifSize;
  if (!source || width === 0 || height === 0) return;

  // 缩略图是异步造的，算完之前不许再点一次，否则同一段会被插两遍
  interpolating = true;
  try {
    // 画面与缩略图全部基于改动前的数组算好：多选时后一段插值不会受前一段插入的帧影响
    const rgbas = GIFUtils.collectFrames(source, frameSources);
    const plans = await Promise.all(
      filtered.map(async (index) => {
        const nextIndex = (index + 1) % frames.value.length;
        const count = Math.round(frameTimes.value[index] / 50) - 1;
        const tween = GIFUtils.tweenFrames(rgbas[index], rgbas[nextIndex], count);
        const urls = await Promise.all(
          tween.frames.map((rgba) => createInsertedUrl(rgba, width, height)),
        );
        return { index, count, tween, urls };
      }),
    );

    // 从后往前改，前面的下标才不会被新帧挤歪；A 留在原位，只把时长换成 50ms
    for (const plan of plans.sort((a, b) => b.index - a.index)) {
      frameTimes.value.splice(plan.index, 1, 50, ...plan.urls.map(() => 50));
      frames.value.splice(plan.index + 1, 0, ...plan.urls);
      frameSources.splice(
        plan.index + 1,
        0,
        ...plan.tween.frames.map<GIFFrameSource>((rgba) => ({ type: "rgba", rgba })),
      );
      shiftIndexedState(plan.index + 1, plan.count);
      // 光标落在被过渡的帧后面时跟着后移，仍然停在原来那一帧上
      if (currentIndex.value > plan.index) currentIndex.value += plan.count;
    }

    triggerRef(frames);
    triggerRef(frameTimes);
    // 有任意一段过渡需要把冲突像素留空，就让顶部的质量提示说明情况
    if (plans.some((plan) => !plan.tween.lossless)) {
      if (!opaqueLossy.value) {
        Utils.commonMsg("渐变插值时，有像素的透明度发生了冲突，冲突的像素将被视为完全透明...");
      }
      opaqueLossy.value = true;
    }
    player?.pause();
    playing.value = false;
    player?.seek(currentIndex.value);
    applyEditsToGif();
  } catch (error) {
    Utils.commonMsg(`生成过渡帧失败... (${error})`, false);
  } finally {
    interpolating = false;
  }
}

function onModifyLoopCount() {
  const loop = loopCount.value;
  if (loop === null || !editable.value) return;
  if (playing.value) {
    togglePlay();
  }
  swal.fire({
    text: "设置动图的循环播放次数...（0 为无限循环，不超过 65,535）",
    input: "number",
    inputValue: loop.toString(),
    preConfirm: async (value) => {
      const newLoop = value === "" ? -1 : Number(value);
      if (!Number.isInteger(newLoop) || newLoop < 0 || newLoop > 65535) {
        Utils.commonMsg("请输入一个合法的数值...", false);
        return false;
      }
      loopCount.value = newLoop;
      loopEdited.value = true;
      applyEditsToGif();
      return true;
    },
  });
}

function onModifySize() {
  newWidth.value = gifSize.width;
  newHeight.value = gifSize.height;
  editingSize.value = true;
}

function onToggleRatioLock(info: InputValidInfo<boolean>) {
  if (info.isok) {
    props.parent.configRepository.setSettings("preferredGIFViewerRatioLock", info.final);
    if (info.final) {
      gifSizeRatio.value = newWidth.value / newHeight.value;
    }
  }
}

function onSizeBeforeInput(ev: InputEvent) {
  if (ev.data && !/^\d*$/g.test(ev.data)) {
    ev.preventDefault();
  }
}

function updateSizeInput(type: "width" | "height") {
  if (
    gifSizeLockRatioInputRef.value?.getValue() &&
    gifSizeRatio.value !== 0 &&
    Number.isFinite(gifSizeRatio.value)
  ) {
    if (type === "width") {
      newHeight.value = Math.round(newWidth.value / gifSizeRatio.value);
    } else {
      newWidth.value = Math.round(newHeight.value * gifSizeRatio.value);
    }
  }
}

async function resize(showWarning = false, width = newWidth.value, height = newHeight.value) {
  if (!editable.value) return;
  if (width <= 0 || height <= 0 || !Number.isInteger(width) || !Number.isInteger(height)) {
    Utils.commonMsg("新的宽度和/或高度不合法，请检查...", false);
    return;
  }
  // 尺寸没变就当取消，没必要白白重编码一遍
  if (width === gifSize.width && height === gifSize.height) {
    onDiscardSizeEdit();
    return;
  }
  const source = sourceBytes.value;
  const loop = loopCount.value;
  if (!source || loop === null || resizing) return;

  const originalWidth = gifSize.width;
  const originalHeight = gifSize.height;
  resizing = true;

  player?.pause();
  playing.value = false;

  try {
    // 每一帧先合成成整幅画面，再按最近邻缩放到新尺寸，最后统一重编码一次
    const result = GIFUtils.resize(
      source,
      frameTimes.value,
      frameSources,
      width,
      height,
      loopEdited.value ? loop : undefined,
    );

    const lost = result.irreversibleFrames ?? [];
    if (lost.length > 0 && showWarning) {
      // 缩放之后编辑器就以缩小后的画面为基准了，救不回来，落盘前先问一句
      swal.fire({
        type: "warning",
        title: "缩放会丢失细节",
        text: `缩放到 ${width}×${height} 后，${describeFrames(lost, frames.value.length)}无法还原回 ${originalWidth}×${originalHeight}，确定要继续吗？`,
        showCancelButton: true,
        confirmButtonText: "仍然缩放",
        cancelButtonText: "取消",
        confirmButtonColor: "var(--mcmodder-color-danger)",
        preConfirm: () => applyResizedGif(result, width, height, originalWidth, originalHeight),
      });
    } else {
      await applyResizedGif(result, width, height, originalWidth, originalHeight);
    }
  } catch (error) {
    Utils.commonMsg(`缩放动图失败... (${error})`, false);
  } finally {
    resizing = false;
  }
}

/**
 * 把缩放结果落进编辑器：换掉缩略图，把新的字节当成基准。
 *
 * 帧数、顺序、时长都没变，只是画布换了，所以帧下标、选中状态、当前帧都能原样保留。
 * 失败时已经提示过，返回 `false` 让确认框留在原地。
 */
async function applyResizedGif(
  result: GIFResizeResult,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
): Promise<boolean> {
  try {
    // 新缩略图先造好再换掉旧的，避免新旧 URL 交接时闪一下
    const oldDispose = disposePrevious;
    const oldInserted = [...insertedUrls];
    const urls = await Promise.all(
      result.frames.map((rgba) => createInsertedUrl(rgba, width, height)),
    );
    for (const url of oldInserted) insertedUrls.delete(url);
    disposePrevious = null;

    // 缩放后的字节成为新的基准：帧数、顺序、时长都没变，只是画布换了
    sourceBytes.value = result.bytes;
    frameSources = result.frames.map((_, index) => ({ type: "source", index }));
    gifSize = { width, height };
    frames.value = urls;
    editedBlob.value = GIFUtils.toBlob(result.bytes);
    if (result.lossy) paletteLossy.value = true;
    // 循环块已经写进新字节，之后就以它为准了
    hasLoopExtension.value = hasLoopExtension.value || loopEdited.value;
    loopEdited.value = false;

    oldDispose?.();
    for (const url of oldInserted) URL.revokeObjectURL(url);

    editingSize.value = false;
    gifSizeRatio.value = 1;
    Utils.commonMsg(
      sizeEditMessage(
        width,
        height,
        originalWidth,
        originalHeight,
        result.irreversibleFrames,
        frames.value.length,
      ),
    );
    return true;
  } catch (error) {
    Utils.commonMsg(`缩放动图失败... (${error})`, false);
    return false;
  }
}

/** 缩放成功后的提示：缩小要说清楚能不能还原、哪些帧还原不了 */
function sizeEditMessage(
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  irreversibleFrames: number[] | null,
  totalFrames: number,
): string {
  const lost = irreversibleFrames ?? [];
  if (lost.length > 0) {
    sizeLossy.value = true;
    return `成功缩放到 ${width}×${height}，${describeFrames(lost, totalFrames)}无法还原...`;
  }
  if (width <= originalWidth && height <= originalHeight) {
    return `成功无损缩小到 ${width}×${height}~`;
  }
  if (width >= originalWidth && height >= originalHeight) {
    return `成功无损放大到 ${width}×${height}~`;
  }
  return `成功无损缩放到 ${width}×${height}~`;
}

/**
 * 把帧序号列表说成「帧 0、3、5」。
 *
 * 序号和帧列表左侧的编号一致（从 0 开始）。列表太长时只列前 20 个，免得提示框被撑爆；
 * 全部帧都还原不了时直接说「全部 N 帧」。
 */
function describeFrames(indices: number[], totalFrames: number): string {
  if (totalFrames > 1 && indices.length >= totalFrames) {
    return `全部 ${totalFrames.toLocaleString()} 帧`;
  }
  const MAX = 20;
  const shown = indices.slice(0, MAX).join("、");
  return indices.length > MAX
    ? `帧 ${shown} 等 ${indices.length.toLocaleString()} 帧`
    : `帧 ${shown}`;
}

function onDiscardSizeEdit() {
  editingSize.value = false;
  gifSizeRatio.value = 1;
}

/** 把当前的帧顺序与帧时长写回 GIF 字节，产出可导出的结果 */
function applyEditsToGif() {
  const source = sourceBytes.value;
  const loop = loopCount.value;
  if (!source || loop === null || !editable.value) return;
  const result = GIFUtils.applyEdits(
    source,
    frameTimes.value,
    frameSources,
    // 没动过循环次数就别传，否则会给原本「只播一次」的动图补一个无限循环块
    loopEdited.value ? loop : undefined,
  );
  if (result.lossy && !paletteLossy.value) {
    paletteLossy.value = true;
    Utils.commonMsg(
      "这个动图超过 256 色，换顺序时有少量颜色被近似处理了，其余编辑已正常应用...",
      false,
    );
  }
  editedBlob.value = GIFUtils.toBlob(result.bytes);
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
      text: `您选中了全部 ${total.toLocaleString()} 帧，继续将删除整个动图，此操作不可逆，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-color-danger)",
      preConfirm: () => {
        deleteGif();
        return true;
      },
    });
    return;
  }
  swal.fire({
    type: "warning",
    title: "警告",
    text: `您正在尝试删除 ${targets.length.toLocaleString()} 个帧，此操作不可逆，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonColor: "var(--mcmodder-color-danger)",
    preConfirm: () => {
      deleteFrames(targets);
      return true;
    },
  });
}

/**
 * 把整个动图删掉，回到空白页。
 *
 * 只是清空编辑器，不会回填物品图标——图标仍然由「应用更改」负责，
 * 想彻底清掉图标就用站点自己的图标控件。
 */
function deleteGif() {
  clearGif(editable.value ? "选择一个动图初始化方式以继续~" : "动图已被删除...");
}

/**
 * 删除若干帧。
 *
 * 帧图、时长、画面来源必须一起删：少删一个，界面和写回的顺序就会错位。
 * 被删帧的缩略图如果已经没有别的帧在用，顺手释放——反复删帧 / 换图时，
 * 这些 blob URL 不然要攒到关闭编辑器为止。
 */
function deleteFrames(targets: number[]) {
  const doomed = [...new Set(targets)]
    .filter((index) => index >= 0 && index < frames.value.length)
    .sort((a, b) => a - b);
  if (doomed.length === 0 || doomed.length >= frames.value.length || !editable.value) return;

  const removedUrls = doomed.map((index) => frames.value[index]);
  // 从后往前删，前面的下标才不会被打乱
  for (let i = doomed.length - 1; i >= 0; i--) {
    const index = doomed[i];
    frames.value.splice(index, 1);
    frameTimes.value.splice(index, 1);
    frameSources.splice(index, 1);
  }

  const keptUrls = new Set(frames.value);
  for (const url of removedUrls) {
    if (!keptUrls.has(url) && insertedUrls.delete(url)) URL.revokeObjectURL(url);
  }

  triggerRef(frames);
  triggerRef(frameTimes);
  // 选中的帧已经删掉了，清空选中；光标落到原来第一个被删的位置（不够就取最后一帧）
  selected.value = new Set();
  const nextIndex = Math.min(doomed[0], frames.value.length - 1);
  currentIndex.value = nextIndex;
  previousSelected.value = nextIndex;
  previousSelectedWithShiftKey.value = nextIndex;
  player?.pause();
  playing.value = false;
  player?.seek(nextIndex);
  applyEditsToGif();
}

function onApplyModify() {
  if (!editable.value) return;
  if (editedBlob.value === null) {
    Utils.commonMsg("没有尚未保存的更改...", false);
    return;
  }
  if (!validate.value(gifSize)) {
    return;
  }
  // 让父组件（物品编辑器）把结果回填到图标
  emit("change", editedBlob.value);
  paletteLossy.value = false;
  sizeLossy.value = false;
  opaqueLossy.value = false;
}

function onDownloadGif() {
  const blob = editedBlob.value ?? gifSource.value;
  if (blob !== undefined) {
    Utils.saveFile("mcmodder.gif", blob);
  }
}

function onMoveBackward(index: number) {
  moveFrame(index, -1);
}

function onMoveForward(index: number) {
  moveFrame(index, 1);
}

function onInsertBefore(index: number) {
  void insertBlankFrame(index);
}

function onInsertAfter(index: number) {
  void insertBlankFrame(index + 1);
}

/**
 * 把第 `index` 帧与相邻帧对调。
 *
 * 帧图、时长、画面来源三者必须一起动：`frames` / `frameTimes` 决定界面和预览，
 * `frameSources` 决定写回 GIF 时的真实顺序。
 */
function moveFrame(index: number, offset: -1 | 1) {
  const target = index + offset;
  if (target < 0 || target >= frames.value.length || !editable.value) return;

  [frames.value[index], frames.value[target]] = [frames.value[target], frames.value[index]];
  [frameTimes.value[index], frameTimes.value[target]] = [
    frameTimes.value[target],
    frameTimes.value[index],
  ];
  [frameSources[index], frameSources[target]] = [frameSources[target], frameSources[index]];
  swapIndexedState(index, target);
  triggerRef(frames);
  triggerRef(frameTimes);

  // 正在看的那一帧被移动了，视线跟着它走，否则高亮会留在原来的位置上
  if (currentIndex.value === index) {
    currentIndex.value = target;
    player?.seek(target);
  }

  applyEditsToGif();
}

/**
 * 创建一个完全透明的空白帧，索引为 `index`。原来的从 `index` 帧开始的所有帧自动向后移一位。
 *
 * 整帧都透明，播放时就是「这一帧什么都不显示」：夹在两帧之间可以做出闪烁，
 * 放在开头或结尾则是一段空白停顿。
 */
async function insertBlankFrame(index: number) {
  const { width, height } = gifSize;
  if (width === 0 || height === 0 || !editable.value) return;
  const rgba = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  const url = await createInsertedUrl(rgba, width, height);
  insertFrames(index, [{ source: { type: "rgba", rgba }, url }]);
}

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

/** 打开 MCMETA 导入框 */
function onImportMcmeta() {
  if (!editable.value || frames.value.length === 0) return;
  mcmetaImportRef.value?.click();
}

async function onImageSliceSelected(ev: Event) {
  if (!editable.value || frames.value.length > 0 || loading.value) return;
  const input = ev.currentTarget as HTMLInputElement;
  const image = input.files?.[0];
  // 不清空的话，连续选同一个文件不会再触发 change
  input.value = "";
  if (!image) return;
  if (!image.type.startsWith("image/")) {
    Utils.commonMsg("需要选择一张图片哦...", false);
    return;
  }

  loading.value = true;
  try {
    const sliced = await sliceImage(image);
    if (!sliced) return;
    await createFromFrames(
      sliced.frames,
      sliced.size,
      sliced.size,
      `已切出 ${sliced.frames.length} 帧，新建了一个 ${sliced.size}×${sliced.size} 的动图~`,
    );
  } catch (error) {
    Utils.commonMsg(`切片新建动图失败... (${error})`, false);
  } finally {
    loading.value = false;
  }
}

async function onImageImportSelected(ev: Event) {
  const { width, height } = gifSize;
  if (width === 0 || height === 0 || !editable.value) return;
  const input = ev.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  const images = files.filter((file) => file.type.startsWith("image/"));
  // 不清空的话，连续选同一个文件不会再触发 change
  input.value = "";
  if (images.length === 0) {
    Utils.commonMsg("需要选择至少一张图片哦...", false);
    return;
  }

  // 读取图片是异步的，先记住要插的位置，以免得期间用户又点了别的帧时，帧插入位置错误
  const insertAt = currentIndex.value + 1;

  try {
    const rgbas = await Promise.all(
      images.map((file) => GIFUtils.imageToFrame(file, width, height)),
    );
    const urls = await Promise.all(
      images.map((_, index) => createInsertedUrl(rgbas[index], width, height)),
    );
    insertFrames(
      insertAt,
      rgbas.map((rgba, index) => ({ source: { type: "rgba", rgba }, url: urls[index] })),
    );
  } catch (error) {
    Utils.commonMsg(`读取图片失败... (${error})`, false);
  }
}

async function onImageReplaceSelected(ev: Event) {
  const { width, height } = gifSize;
  if (width === 0 || height === 0 || !editable.value) return;
  const input = ev.currentTarget as HTMLInputElement;
  const images = Array.from(input.files ?? []).filter((file) => file.type.startsWith("image/"));
  // 不清空的话，连续选同一个文件不会再触发 change
  input.value = "";
  if (images.length === 0) {
    Utils.commonMsg("需要选择至少一张图片哦...", false);
    return;
  }

  const targets = getEditTargets();
  // 只选一张图时铺给全部目标帧；多张图就按选中顺序一一替换
  const assignments =
    images.length === 1
      ? targets.map((index) => ({ index, file: images[0] }))
      : targets.slice(0, images.length).map((index, i) => ({ index, file: images[i] }));
  if (images.length > targets.length) {
    Utils.commonMsg(
      `选中的帧只有 ${targets.length} 个，多出的 ${images.length - targets.length} 张图片没有用上...`,
      false,
    );
  } else if (images.length > 1 && images.length < targets.length) {
    Utils.commonMsg(
      `图片只有 ${images.length} 张，剩下的 ${targets.length - images.length} 帧保持原样...`,
      false,
    );
  }

  try {
    // 同一张图铺给多帧时只解码一次
    const decoded = new Map<File, { rgba: Uint8ClampedArray<ArrayBuffer>; url: string }>();
    await Promise.all(
      [...new Set(assignments.map(({ file }) => file))].map(async (file) => {
        const rgba = await GIFUtils.imageToFrame(file, width, height);
        decoded.set(file, { rgba, url: await createInsertedUrl(rgba, width, height) });
      }),
    );
    replaceFrames(assignments.map(({ index, file }) => ({ index, ...decoded.get(file)! })));
  } catch (error) {
    Utils.commonMsg(`读取图片失败... (${error})`, false);
  }
}

/**
 * 把 .mcmeta 里的动态纹理参数应用到当前动图。
 *
 * 标准 .mcmeta 把参数包在 `animation` 下面（`{ "animation": { "frametime": 2 } }`），
 * 直接给出参数对象的写法也认。应用规则：
 *
 * - `frames` 决定播放顺序：同一帧可以重复出现，也可以少播某几帧，
 *   编号对应当前帧列表左侧的编号；不写或写空数组时按现有顺序播放；
 * - 每帧时长 = `time ?? frametime ?? 1` 个游戏刻（1 刻 = 50ms），`time` 不大于 0 的帧会被跳过；
 * - `interpolate` 为 true 时，再按「设为过渡帧」的逻辑把相邻两帧接起来。
 */
async function onMcmetaImportSelected(ev: Event) {
  const input = ev.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  // 不清空的话，连续选同一个文件不会再触发 change
  input.value = "";
  if (applyingMcmeta || !editable.value || frames.value.length === 0 || !file) return;

  applyingMcmeta = true;
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      Utils.commonMsg(`MCMETA 文件解析失败... (${error})`, false);
      return;
    }
    const animation = parseAnimatedTexture(parsed);
    if (!animation) return;

    // 没写 frames 或写了空数组 = 按纹理自身的顺序播放
    const entries: { index: number; time?: number }[] = animation.frames?.length
      ? animation.frames.map((frame) => (typeof frame === "number" ? { index: frame } : frame))
      : Utils.createRange(0, frames.value.length).map((index) => ({ index }));
    const maxIndex = entries.reduce((max, entry) => Math.max(max, entry.index), 0);
    if (maxIndex > frames.value.length - 1) {
      Utils.commonMsg(
        `MCMETA 中出现了超出当前动图帧数量的索引（${maxIndex}），应用失败，请检查该文件是否与当前动图匹配...`,
        false,
      );
      return;
    }

    // 每帧时长：time 覆盖 frametime，单位是游戏刻（1 刻 = 50ms）；不大于 0 的帧不播放
    const plan = entries
      .map((entry) => ({
        index: entry.index,
        time: (entry.time ?? animation.frametime ?? 1) * 50,
      }))
      .filter((entry) => entry.time > 0);
    if (plan.length === 0) {
      Utils.commonMsg("MCMETA 里没有任何可播放的帧...", false);
      return;
    }

    // 按 MCMETA 的顺序重排；重复的帧共用同一张缩略图和同一份画面来源
    const oldFrames = frames.value;
    const oldSources = frameSources;
    frames.value.splice(0, frames.value.length, ...plan.map((entry) => oldFrames[entry.index]));
    frameTimes.value.splice(0, frameTimes.value.length, ...plan.map((entry) => entry.time));
    frameSources = plan.map((entry) => oldSources[entry.index]);

    triggerRef(frames);
    triggerRef(frameTimes);
    // 整套播放顺序都换了，选中状态和光标没有保留的意义
    selected.value = new Set();
    previousSelected.value = 0;
    previousSelectedWithShiftKey.value = 0;
    currentIndex.value = 0;
    player?.pause();
    playing.value = false;
    player?.seek(0);
    applyEditsToGif();

    // interpolate 为 true 时游戏会混合相邻两帧；这里用过渡帧近似（只有一帧时没有相邻帧可混）。
    // 每帧都不足 100ms 时没有插入空间，单独说明一下，免得以为插值生效了
    const wantsInterpolation = animation.interpolate === true && frames.value.length > 1;
    let interpolated = false;
    if (wantsInterpolation) {
      const targets = Utils.createRange(0, frames.value.length);
      interpolated = targets.some((index) => frameTimes.value[index] >= 100);
      if (interpolated) await onInterpolate(targets);
    }

    const skippedInterpolation = wantsInterpolation && !interpolated;
    Utils.commonMsg(
      skippedInterpolation
        ? "MCMETA 已应用，但每帧都不到 100ms，没法插入过渡帧..."
        : "MCMETA 应用完成~",
      !skippedInterpolation,
    );
  } finally {
    applyingMcmeta = false;
  }
}

/**
 * 校验 .mcmeta 的内容并取出动态纹理参数。
 *
 * 标准 .mcmeta 把参数包在 `animation` 下面（`{ "animation": { "frametime": 2 } }`），
 * 也接受直接给出参数对象的写法。没有 `animation` 包裹、又一项动画参数都没有的文件，
 * 多半是别的用途的 mcmeta（例如 `pack.mcmeta`），直接拒绝。
 *
 * @returns 参数对象；内容不合法时已经提示过，返回 `null`
 */
function parseAnimatedTexture(parsed: unknown): AnimatedTexture | null {
  if (parsed === null || typeof parsed !== "object") {
    Utils.commonMsg("文件内容不是一个有效的 JSON 对象...", false);
    return null;
  }
  const wrapped = "animation" in parsed;
  const animation = wrapped ? (parsed as { animation: unknown }).animation : parsed;
  if (!isAnimatedTexture(animation)) return null;
  if (
    !wrapped &&
    animation.frames === undefined &&
    animation.frametime === undefined &&
    animation.interpolate === undefined
  ) {
    Utils.commonMsg("这个 MCMETA 里没有动态纹理参数（`animation`）...", false);
    return null;
  }
  return animation;
}

function isAnimatedTexture(parsed: unknown): parsed is AnimatedTexture {
  if (parsed === null || typeof parsed !== "object") {
    Utils.commonMsg("文件内容不是一个有效的 JSON 对象...", false);
    return false;
  }
  const { frames, frametime, interpolate } = parsed as Record<string, unknown>;
  if (!(
    frames === undefined ||
    (Array.isArray(frames) &&
      frames.every(
        (frame) =>
          (typeof frame === "number" && Number.isInteger(frame) && frame >= 0) ||
          (typeof frame === "object" &&
            frame !== null &&
            typeof frame.index === "number" &&
            Number.isInteger(frame.index) &&
            frame.index >= 0 &&
            (frame.time === undefined ||
              (typeof frame.time === "number" && Number.isInteger(frame.time) && frame.time >= 0))),
      ))
  )) {
    Utils.commonMsg(
      "`frames` 不是一个有效的值，期望为一个由非负整数或带有非负整数索引和可选非负整数持续时间参数的对象为元素的数组...",
      false,
    );
    return false;
  }
  if (!(
    frametime === undefined ||
    (typeof frametime === "number" && Number.isInteger(frametime) && frametime > 0)
  )) {
    Utils.commonMsg("`frametime` 不是一个有效的值，期望为一个正整数...", false);
    return false;
  }
  if (!(interpolate === undefined || typeof interpolate === "boolean")) {
    Utils.commonMsg("`interpolate` 不是一个有效的值，期望为一个布尔值...", false);
    return false;
  }
  return true;
}

/**
 * 用新的画面替换若干帧，只换像素、不动帧时长，最后统一重算一次。
 *
 * 被替换的帧从此与原文件无关，写回时会按整幅画面重新编码。原来的缩略图 URL
 * 由解析结果或 `insertedUrls` 统管，这里不单独释放，等换源/卸载时一起收掉。
 */
function replaceFrames(replacements: FrameReplacement[]) {
  if (!editable.value) return;
  let changed = false;
  for (const { index, rgba, url } of replacements) {
    if (index < 0 || index >= frames.value.length) continue;
    frames.value[index] = url;
    frameSources[index] = { type: "rgba", rgba };
    changed = true;
  }
  if (!changed) return;
  triggerRef(frames);
  applyEditsToGif();
}

/** 要修改的帧：有多选就用多选，否则只改当前帧 */
function getEditTargets(): number[] {
  return selected.value.size > 0 ? Array.from(selected.value) : [currentIndex.value];
}

/**
 * 从第 `index` 位开始连续插入若干帧。
 *
 * 新帧的时长沿用插入点后面那一帧（插在末尾就用最后一帧），这样插入空白帧不会打断原来的节奏。
 * 一批插入只重新编码一次——一次导入多张图时，逐张插入会把整个动图反复压平。
 */
function insertFrames(index: number, insertions: FrameInsertion[]) {
  if (insertions.length === 0 || !editable.value) return;
  if (index < 0 || index > frames.value.length) return;

  const duration = frameTimes.value[index] ?? frameTimes.value[index - 1] ?? 100;
  frames.value.splice(index, 0, ...insertions.map((insertion) => insertion.url));
  frameTimes.value.splice(index, 0, ...insertions.map(() => duration));
  frameSources.splice(index, 0, ...insertions.map((insertion) => insertion.source));
  // 选中集合和多选锚点都按序号记，插在它们前面时要整体后移
  shiftIndexedState(index, insertions.length);

  triggerRef(frames);
  triggerRef(frameTimes);
  player?.pause();
  playing.value = false;
  // 停在最后一个新帧上，和逐张插入时的落点一致
  const lastInserted = index + insertions.length - 1;
  currentIndex.value = lastInserted;
  player?.seek(lastInserted);
  applyEditsToGif();
}

/** 把一幅画面导出成缩略图 URL，并记下来以便换源时释放 */
async function createInsertedUrl(
  rgba: Uint8ClampedArray<ArrayBuffer>,
  width: number,
  height: number,
) {
  const url = await GIFUtils.rgbaToBlobURL(rgba, width, height);
  insertedUrls.add(url);
  return url;
}

function releaseInsertedUrls() {
  for (const url of insertedUrls) URL.revokeObjectURL(url);
  insertedUrls.clear();
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

function get() {
  return editedBlob.value ?? gifSource.value;
}

defineExpose({
  set,
  get,
  resize,
});
</script>

<style lang="css">
.mcmodder-gifviewer-empty {
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

.mcmodder-gifviewer-createnew {
  display: flex;
  flex-direction: row;
  gap: var(--mcmodder-width-padding-3);
}

.mcmodder-gifviewer-grid {
  display: grid;
  grid-template-rows: 2;
  gap: var(--mcmodder-width-padding-3);
}

.mcmodder-gifviewer-imageframes {
  display: flex;
  flex-direction: row;
  gap: var(--mcmodder-width-padding-3);
  overflow-x: auto;
  padding: 6px 0;
}

.mcmodder-gifviewer-imageframe {
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

.mcmodder-gifviewer-imageframe:focus {
  outline: none;
}

.mcmodder-gifviewer-imageframe:hover {
  background-color: var(--mcmodder-color-accent-background);
  transform: translateY(-3px);
}

.mcmodder-gifviewer-imageframe.current {
  border: 2px solid var(--mcmodder-color-primary);
  background-color: var(--mcmodder-color-primary-background);
}

.mcmodder-gifviewer-imageframe.selected {
  border: 2px solid var(--mcmodder-color-primary);
}

.mcmodder-gifviewer-imageframe-gutter {
  position: absolute;
  top: 0;
  left: 0.15em;
  line-height: 1em;
  color: var(--mcmodder-color-text-dark3);
}

.mcmodder-gifviewer-imageframe.current .mcmodder-gifviewer-imageframe-gutter {
  color: var(--mcmodder-color-primary-dark1);
}

.mcmodder-gifviewer-imagecontainer {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.mcmodder-gifviewer-imagecontainer img {
  image-rendering: pixelated;
  width: 100%;
  height: 100%;
  margin: auto;
  object-fit: contain;
}

.mcmodder-gifviewer-imagetime {
  font-size: 14px;
  font-style: italic;
  color: var(--mcmodder-color-text-dark2);
  text-wrap: nowrap;
}

.mcmodder-gifviewer-preview {
  min-height: 80px;
  display: flex;
  background-color: var(--mcmodder-color-background-transparent);
  box-shadow: 0 3px 5px var(--mcmodder-color-box-shadow);
  border-radius: var(--mcmodder-width-radius);
  position: relative;
}

.mcmodder-gifviewer-preview-imgcontainer {
  margin: 30px auto;
  line-height: 0;
}

.editable .mcmodder-gifviewer-preview-imgcontainer {
  margin-bottom: 50px;
}

.mcmodder-gifviewer-preview-controls {
  position: absolute;
  right: 0.3em;
  bottom: 0;
  padding: 0.3em 0;
  display: flex;
  gap: 0.3em;
  width: calc(100% - 0.6em);
  overflow-x: auto;
  text-wrap: nowrap;
}

.mcmodder-gifviewer-preview-controls > :first-child {
  margin-left: auto;
}

.mcmodder-gifviewer-preview-imgcontainer img {
  image-rendering: pixelated;
  margin: 0;
}

.mcmodder-gifviewer-preview-info {
  position: absolute;
  left: 0.3em;
  max-width: 40%;
  max-height: calc(100% - 35px);
  overflow: auto;
  direction: rtl;
}

.mcmodder-gifviewer-preview-info p {
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

.mcmodder-gifviewer-preview-info .form-control {
  display: inline-block;
  width: 4em;
}

.common-center .right .tab-content ul.tab-ul .mcmodder-gifviewer-preview-info .checkbox {
  margin-right: 0;
  margin-left: 8px;
}

.mcmodder-gifviewer-preview-info label {
  margin-bottom: 0;
}

.mcmodder-gifviewer-preview-editloop,
.mcmodder-gifviewer-preview-editsize {
  margin: 0 4px;
}

.mcmodder-gifviewer-preview-quality {
  margin-right: 0.3em;
}

.mcmodder-gifviewer-preview-editloop:hover,
.mcmodder-gifviewer-preview-editsize:hover {
  color: var(--mcmodder-color-accent-dark2) !important;
}

.mcmodder-gifviewer-preview-gutter {
  color: var(--mcmodder-color-primary-dark1);
}
</style>
