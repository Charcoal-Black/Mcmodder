<template>
  <Popover ref="popoverRef" v-bind="popoverProps">
    <div v-if="option" class="mcmodder-linkpreview-container">
      <div
        v-if="status === 'loading'"
        class="mcmodder-linkpreview-frame maintext"
        :class="option?.kind"
      >
        <div class="mcmodder-linkpreview-content mcmodder-linkpreview-skeleton-content">
          <div class="mcmodder-linkpreview-header">
            <div class="mcmodder-linkpreview-title">
              <div class="mcmodder-skeleton mcmodder-linkpreview-skeleton-title" />
              <div class="mcmodder-skeleton mcmodder-linkpreview-skeleton-subtitle" />
            </div>
          </div>
          <div class="mcmodder-linkpreview-maintext">
            <div
              v-for="line in SKELETON_LINE_COUNT"
              :key="`before-${line}`"
              class="mcmodder-skeleton mcmodder-linkpreview-skeleton-line"
            />
            <div class="mcmodder-skeleton mcmodder-linkpreview-skeleton-image" />
            <div
              v-for="line in SKELETON_LINE_COUNT"
              :key="`after-${line}`"
              class="mcmodder-skeleton mcmodder-linkpreview-skeleton-line"
            />
          </div>
        </div>
        <div v-if="option?.kind === 'item'" class="mcmodder-imagepreview-sidebar">
          <div class="mcmodder-skeleton mcmodder-linkpreview-skeleton-icon-large" />
          <div class="mcmodder-skeleton mcmodder-linkpreview-skeleton-icon-small" />
          <div
            v-for="row in SKELETON_ROW_COUNT"
            :key="row"
            class="mcmodder-skeleton mcmodder-linkpreview-skeleton-row"
          />
        </div>
      </div>
      <div v-else-if="status === 'error'" class="mcmodder-linkpreview-frame maintext">
        <span class="mcmodder-common-danger">{{ errorText }}</span>
      </div>
      <div v-else-if="data" class="mcmodder-linkpreview-frame common-center" :class="data.kind">
        <div class="mcmodder-linkpreview-content">
          <div class="mcmodder-linkpreview-header">
            <div class="mcmodder-linkpreview-title">
              <div v-if="data.kind === 'item'" class="itemname">
                <span class="name">
                  <h5>
                    {{ data.name }}
                    <span v-if="data.englishName" class="item-h5-ename">{{
                      data.englishName
                    }}</span>
                  </h5>
                </span>
              </div>
              <div v-else class="class-title">
                <div v-if="data.status && data.source" class="class-official-group">
                  <div :class="tagClass('status', data.status)" :title="data.status.description">
                    {{ data.status.text }}
                  </div>
                  <div :class="tagClass('source', data.source)" :title="data.source.description">
                    {{ data.source.text }}
                  </div>
                </div>
                <div
                  v-else-if="data.status"
                  :class="tagClass('status', data.status)"
                  :title="data.status.description"
                >
                  {{ data.status.text }}
                </div>
                <div
                  v-else-if="data.source"
                  :class="tagClass('status', data.source)"
                  :title="data.source.description"
                >
                  {{ data.source.text }}
                </div>
                <span v-if="data.abbr" class="short-name">[{{ data.abbr }}]</span>
                <h3>{{ data.name }}</h3>
                <h4 v-if="data.englishName">{{ data.englishName }}</h4>
              </div>
            </div>
          </div>
          <!-- eslint-disable vue/no-v-html -- 预览正文来自百科资料页，需保留正文排版与懒加载图片属性 -->
          <div
            v-if="data.content"
            class="mcmodder-linkpreview-maintext maintext common-text font14"
            @load.capture="onContentImageSettled"
            @error.capture="onContentImageSettled"
            v-html="data.content"
          />
          <!-- eslint-enable vue/no-v-html -->
          <div v-else class="mcmodder-linkpreview-maintext">
            <span class="mcmodder-common-danger">该资料正文暂无介绍...</span>
          </div>
        </div>
        <div v-if="data.kind === 'item'" class="mcmodder-imagepreview-sidebar">
          <div class="item-info-table">
            <table
              v-if="data.infoRows.length"
              class="mcmodder-linkpreview-info table table-bordered"
            >
              <tbody>
                <template v-for="field in iconFields" :key="field">
                  <tr v-if="data[field]">
                    <td colspan="2">
                      <img
                        :key="data.name"
                        class="mcmodder-linkpreview-icon mcmodder-linkpreview-img-pending"
                        :class="field === 'smallIcon' ? 'small' : 'large'"
                        :src="data[field]"
                        :alt="data.name"
                        @load="onIconSettled"
                        @error="onIconError"
                      />
                    </td>
                  </tr>
                </template>
                <tr v-for="row in data.infoRows" :key="row.label">
                  <td>{{ row.label }}：</td>
                  <td>
                    <a v-if="row.href" :href="row.href" target="_blank">{{ row.value }}</a>
                    <span v-else>{{ row.value }}</span>
                  </td>
                </tr>
                <tr v-if="data.tabUrl" class="mcmodder-linkpreview-tab">
                  <td colspan="2">
                    <div class="common-icon-text-frame">
                      <div class="common-icon-text item-table">
                        <i></i>
                        <a :href="data.tabUrl" target="_blank">查看合成/用途</a>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { nextTick, ref, shallowRef } from "vue";
import Popover from "./Popover.vue";
import { usePopoverHost } from "../composables/usePopoverHost";
import { Utils } from "../../Utils";
import type { LinkPreviewOption, PopoverExpose } from "../../types/props";

/**
 * 弹出框宿主的接线：显隐、定位、`updatePos` / `close` 都在 `usePopoverHost` 里，
 * 这里只管资料预览内容的抓取、结构化解析与缓存。
 */
const {
  popoverRef,
  visible,
  popoverProps,
  applyOption,
  updatePos,
  close: closePopover,
  getPopoverElement,
  getAnchorElement,
} = usePopoverHost({
  maxHeight: 420,
  direction: "down",
});

/** 物品预览：在 `ItemPreview` 之外补上模板直接可用的图标地址 */
interface ItemPreviewView extends ItemPreview {
  kind: "item";
  smallIcon: string;
  largeIcon: string;
}

const iconFields = ["largeIcon", "smallIcon"] as const;

interface ClassPreviewView extends ClassPreview {
  kind: "class";
}

type LinkPreviewData = ItemPreviewView | ClassPreviewView;
type PreviewStatus = "idle" | "loading" | "ready" | "error";

const option = shallowRef<LinkPreviewOption>();
const data = shallowRef<LinkPreviewData>();
const status = ref<PreviewStatus>("idle");
const errorText = ref("");

/** 悬停后等待这么久再弹出面板并发起请求，避免鼠标扫过链接时闪出大块骨架 */
const REQUEST_DELAY = 250;
/** 加载骨架占位的正文行数（图片前后各一组）与侧栏信息行数 */
const SKELETON_LINE_COUNT = 3;
const SKELETON_ROW_COUNT = 3;
/** 正文图片尚未加载完成时挂上的类名，加载结束后移除（骨架背景见下方样式） */
const PENDING_IMAGE_CLASS = "mcmodder-linkpreview-img-pending";
/** 已解析好的预览数据（键包含是否显示正文图片，切换配置后不会读到旧结果） */
const previewCache = new Map<string, LinkPreviewData>();
/** 同一资料页正在进行的请求，避免重复抓取 */
const pendingRequests = new Map<string, Promise<LinkPreviewData | undefined>>();
/** 当前打开代次：快速切换链接时丢弃迟到的响应 */
let generation = 0;
/** 尚未到点的弹出定时器（悬停离开或切换链接时取消） */
let showTimer: number | null = null;

function setOption(newOption: LinkPreviewOption) {
  const samePreview =
    option.value?.sourceUrl === newOption.sourceUrl && (visible.value || showTimer !== null);
  option.value = newOption;
  applyOption(newOption);
  // 同一资料的链接内部移动（pointerover 会重复触发）：保持现状，不重置等待
  if (samePreview) {
    popoverRef.value?.updatePos();
    return;
  }

  cancelShow();
  // 先收起上一份预览（保留其内容，避免淡出时闪成骨架）；等到光标确实停住后再弹出
  visible.value = false;
  const current = ++generation;
  showTimer = window.setTimeout(() => {
    showTimer = null;
    // 取最新选项：同一资料的另一个链接可能在此期间接管了锚点
    const target = option.value;
    if (!target || !target.anchorElement?.matches(":hover")) return;
    status.value = "loading";
    data.value = undefined;
    errorText.value = "";
    visible.value = true;
    resetScroll();
    void loadPreview(target, current);
  }, REQUEST_DELAY);
}

/** 取消尚未到点的弹出（光标已离开或已切换到别的链接） */
function cancelShow() {
  if (showTimer !== null) {
    window.clearTimeout(showTimer);
    showTimer = null;
  }
}

/** 收起弹出框（同时取消尚未到点的弹出定时器） */
function close() {
  cancelShow();
  closePopover();
}

/** 切换链接时把上一份预览的滚动位置复位 */
function resetScroll() {
  popoverRef.value?.rootElement
    ?.querySelector<HTMLElement>(".mcmodder-popover-inner")
    ?.scrollTo({ top: 0 });
}

async function loadPreview(target: LinkPreviewOption, current: number) {
  const showImages = !!target.parent.configRepository.getSettings("hoverImage");
  const cacheKey = `${target.sourceUrl}\u0000${showImages ? 1 : 0}`;

  const cached = previewCache.get(cacheKey);
  if (cached !== undefined) {
    showData(cached);
    return;
  }

  const pending = pendingRequests.get(cacheKey);
  if (pending !== undefined) {
    await applyPreviewResult(pending, current);
    return;
  }

  const request = fetchPreview(target, showImages)
    .then((result) => {
      if (result !== undefined) previewCache.set(cacheKey, result);
      return result;
    })
    .catch(() => undefined);
  pendingRequests.set(cacheKey, request);

  try {
    await applyPreviewResult(request, current);
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/** 等待一次请求的结果并落到界面上；请求失败或没有可预览内容时显示错误提示 */
async function applyPreviewResult(request: Promise<LinkPreviewData | undefined>, current: number) {
  const result = await request;
  if (current !== generation) return;
  if (result !== undefined) showData(result);
  else showError("预览加载失败，请稍后重试...");
}

function showData(preview: LinkPreviewData) {
  data.value = preview;
  status.value = "ready";
  popoverRef.value?.onPopoverHeightChange();
  // 插入后已经就绪的图片不会再派发 load，补一次清理，避免骨架一直留着
  void nextTick(clearSettledPendingImages);
}

function showError(message: string) {
  status.value = "error";
  errorText.value = message;
  popoverRef.value?.onPopoverHeightChange();
}

/**
 * 正文图片加载完成（或失败）后去掉骨架占位。
 *
 * 图片尺寸变化会撑开预览，所以顺带重新量一次高度与位置。
 */
function onContentImageSettled(event: Event) {
  const target = event.target;
  if (target instanceof HTMLImageElement) {
    target.classList.remove(PENDING_IMAGE_CLASS);
  }
  popoverRef.value?.onPopoverHeightChange();
}

/** 兜底：插入时就已经就绪（浏览器不再派发 load）的图片直接去掉骨架 */
function clearSettledPendingImages() {
  popoverRef.value?.rootElement
    ?.querySelectorAll<HTMLImageElement>(`img.${PENDING_IMAGE_CLASS}`)
    .forEach((img) => {
      if (img.complete) img.classList.remove(PENDING_IMAGE_CLASS);
    });
}

/** 侧栏图标加载完成：撤掉骨架占位 */
function onIconSettled(event: Event) {
  const img = event.target;
  if (img instanceof HTMLImageElement) img.classList.remove(PENDING_IMAGE_CLASS);
}

/** 图标加载失败时退回站点默认图标；兜底图标也失败时才撤掉骨架，避免一直留着 */
function onIconError(event: Event) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  const size = img.classList.contains("small") ? 32 : 128;
  const fallback = Utils.getImageURLByItemID(0, size);
  if (img.src !== fallback) {
    img.src = fallback;
    return;
  }
  img.classList.remove(PENDING_IMAGE_CLASS);
}

/** 按链接指向的资料类型抓取并整理成模板直接可用的结构 */
async function fetchPreview(
  target: LinkPreviewOption,
  showImages: boolean,
): Promise<LinkPreviewData | undefined> {
  if (target.kind === "item") {
    const item = await target.parent.web.getItemByID(target.id, true);
    if (!item) return undefined;
    const id = item.id || target.id;
    return {
      ...item,
      kind: "item",
      id,
      smallIcon: Utils.getImageURLByItemID(id, 32),
      largeIcon: Utils.getImageURLByItemID(id, 128),
      content: prepareContent(item.content, showImages),
    };
  }

  const classData = await target.parent.web.getClassByID(target.id, true);
  if (!classData) return undefined;
  return {
    ...classData,
    kind: "class",
    id: classData.id || target.id,
    content: prepareContent(classData.content, showImages),
  };
}

/**
 * 处理正文 HTML：空正文与站点的「暂无简介」占位统一视为无内容；
 * 开启 `hoverImage` 时把懒加载的 `data-src` 提到 `src`，让图片立即可见。
 */
function prepareContent(content: string, showImages: boolean) {
  if (!content) return "";
  const $wrapper = $("<div>").html(content);
  if ($wrapper.text().trim() === "暂无简介，欢迎协助完善。") return "";
  if (showImages) revealLazyImages($wrapper);
  markPendingImages($wrapper);
  return $wrapper.html() ?? "";
}

/** 给尚未加载完成的正文图片挂上骨架占位（已完成的、无地址的都跳过） */
function markPendingImages(container: JQuery) {
  container.find("img").each((_, img) => {
    const $img = $(img);
    if (!$img.attr("src") || (img as HTMLImageElement).complete) return;
    $img.addClass(PENDING_IMAGE_CLASS);
  });
}

/** 把站点懒加载图片的 `data-src` 提到 `src`，让预览里的图片立即可见 */
function revealLazyImages(container: JQuery) {
  container.find("img").each((_, img) => {
    const $img = $(img);
    const src = $img.attr("data-src");
    if (src !== undefined) {
      $img.attr("src", src);
      $img.removeAttr("data-src");
    }
  });
}

/** 状态 / 开源标签的站点样式类（配色由 `status-N` / `source-N` 决定） */
function tagClass(type: "status" | "source", tag: ClassPreviewTag) {
  return `class-${type}${tag.level === undefined ? "" : ` ${type}-${tag.level}`}`;
}

defineExpose<PopoverExpose<LinkPreviewOption, Record<string, never>>>({
  setOption,
  inputEvents: {},
  updatePos,
  close,
  getPopoverElement,
  getAnchorElement,
});
</script>

<style lang="css">
.mcmodder-linkpreview-container {
  padding: var(--mcmodder-width-padding-3) var(--mcmodder-width-padding-2);
  text-align: left;
}
.mcmodder-linkpreview-frame {
  overflow: hidden;
  max-width: 600px;
  text-align: left;
  display: inline-block;
  vertical-align: top;
  display: flex;
  gap: var(--mcmodder-width-padding-1);
}

.mcmodder-linkpreview-frame.common-center {
  margin: 0;
  padding: 0;
  width: 100%;
}
.mcmodder-linkpreview-frame .common-text > .common-text-menu,
.mcmodder-linkpreview-frame.common-center .maintext .quote_text {
  width: 100%;
}
.mcmodder-linkpreview-content {
  overflow: hidden;
  max-width: 600px;
  text-align: left;
  vertical-align: top;
  display: flex;
  flex-direction: column;
}
.mcmodder-linkpreview-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.mcmodder-imagepreview-sidebar {
  width: 175px;
  min-width: 175px;
}
.mcmodder-linkpreview-info {
  font-size: 14px;
}
.mcmodder-linkpreview-info td {
  padding: 4px;
  text-align: center;
}
.mcmodder-linkpreview-icon {
  flex: none;
  image-rendering: pixelated;
  margin: var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-icon.small {
  width: 32px;
  height: 32px;
}
.mcmodder-linkpreview-icon.large {
  width: 128px;
  height: 128px;
}
.mcmodder-linkpreview-title {
  flex: 1;
  min-width: 0;
}
.mcmodder-linkpreview-title .itemname h5 {
  margin-bottom: 0;
  text-wrap: nowrap;
  overflow-x: auto;
  text-overflow: ellipsis;
}
.mcmodder-linkpreview-title .item-h5-ename {
  font-weight: initial;
}
.mcmodder-linkpreview-skeleton-content {
  width: 380px;
}
.mcmodder-linkpreview-frame.class .mcmodder-linkpreview-skeleton-content {
  width: 480px;
}
.mcmodder-linkpreview-skeleton-title {
  width: 55%;
  height: 24px;
  margin-bottom: var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-skeleton-subtitle {
  width: 35%;
  height: 16px;
  margin-bottom: var(--mcmodder-width-padding-2);
}
.mcmodder-linkpreview-skeleton-line {
  height: 12px;
  margin-bottom: var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-skeleton-line:last-child {
  width: 60%;
}
.mcmodder-linkpreview-skeleton-image {
  width: 240px;
  height: 135px;
  margin-bottom: var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-skeleton-icon-large {
  width: 128px;
  height: 128px;
  margin: var(--mcmodder-width-padding-3) auto;
}
.mcmodder-linkpreview-skeleton-icon-small {
  width: 32px;
  height: 32px;
  margin: 0 auto var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-skeleton-row {
  height: 14px;
  margin: 0 var(--mcmodder-width-padding-3) var(--mcmodder-width-padding-3);
}
.mcmodder-linkpreview-maintext {
  margin-top: 6px;
}
/* 图片的加载占位（正文图片与侧栏图标）：未就绪时显示与骨架屏同款的底色与扫光。
   加载完成（或失败）后由 onContentImageSettled / onIconSettled 移除类名，
   透明图标不会被底色污染。 */
.mcmodder-linkpreview-container img.mcmodder-linkpreview-img-pending {
  border-radius: 4px;
  background-color: var(--mcmodder-color-background-dark1);
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--mcmodder-color-background-dark2),
    transparent
  );
  background-repeat: no-repeat;
  background-size: 200% 100%;
  animation: mcmodder-linkpreview-img-shimmer 1.5s ease-in-out infinite;
}
.mcmodder-linkpreview-maintext img.mcmodder-linkpreview-img-pending {
  min-width: 32px;
  min-height: 32px;
}
@keyframes mcmodder-linkpreview-img-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
.mcmodder-linkpreview-maintext .quote_text {
  border-width: 1px;
  border-style: solid;
  padding: 10px;
}
.mcmodder-linkpreview-maintext .quote_text legend {
  width: auto;
  margin-bottom: 0;
}
.mcmodder-linkpreview-frame img,
.mcmodder-linkpreview-frame .common-text table img {
  max-height: 135px;
  max-width: 240px;
  object-fit: contain;
}
.mcmodder-linkpreview-frame .quote_text legend {
  font-size: 12px;
  color: var(--mcmodder-color-text-dark2);
}
.mcmodder-linkpreview-frame.overflown {
  position: relative;
}
.mcmodder-linkpreview-frame.overflown:after {
  content: "......";
  vertical-align: bottom;
  text-align: center;
  position: absolute;
  bottom: 0;
  width: 100%;
  background-image: linear-gradient(180deg, #0000, var(--mcmodder-color-background));
}
</style>
