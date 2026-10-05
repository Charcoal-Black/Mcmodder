<template>
  <div
    id="mcmodder-attitude-panel"
    class="mcmodder-attitude-panel"
    :class="{ 'mcmodder-attitude-panel-visible': store.visible }"
    :style="{ left: `${store.left}px`, top: `${store.top}px` }"
  >
    <div class="mcmodder-attitude-tabs">
      <button
        type="button"
        class="mcmodder-attitude-tab"
        :class="{ 'mcmodder-attitude-tab-active': tab === 'emoji' }"
        @click="switchTab('emoji')"
      >
        emoji
      </button>
      <button
        type="button"
        class="mcmodder-attitude-tab"
        :class="{ 'mcmodder-attitude-tab-active': tab === 'sticker' }"
        @click="switchTab('sticker')"
      >
        我的贴纸
      </button>
    </div>

    <template v-if="tab === 'emoji'">
      <div class="mcmodder-attitude-choice-list">
        <button
          v-for="attitudeType in store.recents"
          :key="attitudeType"
          type="button"
          class="mcmodder-attitude-choice mcmodder-attitude-emoji"
          :class="{ 'mcmodder-attitude-choice-active': store.active.includes(attitudeType) }"
          @click="store.onPick(attitudeType)"
        >
          <img
            v-if="isSticker(attitudeType) && stickerUrl(attitudeType)"
            class="mcmodder-attitude-sticker-image"
            :src="stickerUrl(attitudeType)"
            alt=""
          />
          <span
            v-else-if="isSticker(attitudeType)"
            class="mcmodder-attitude-sticker mcmodder-attitude-sticker-pending"
          ></span>
          <template v-else>{{ attitudeType }}</template>
        </button>
        <span v-if="store.recents.length === 0" class="mcmodder-attitude-empty-hint">
          最近使用的 emoji 与贴纸会显示在这里
        </span>
      </div>
      <button type="button" class="mcmodder-attitude-more" @click="toggleAllEmojis">
        {{ allEmojisVisible ? "收起全部 emoji" : "全部 emoji" }}
      </button>
      <div
        ref="pickerHost"
        class="mcmodder-attitude-picker-host"
        :class="{ 'mcmodder-attitude-picker-visible': allEmojisVisible }"
      ></div>
    </template>

    <AttitudeStickerList
      v-else
      :stickers="store.stickers"
      :quota="store.stickerQuota"
      :loading="store.stickerLoading"
      :active="store.active"
      :on-pick="store.onPick"
      :on-upload="store.onUpload"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, nextTick } from "vue";
import Picker from "emoji-picker-element/picker.js";
import zhCN from "emoji-picker-element/i18n/zh_CN.js";
import { Values } from "../../../Values";
import { clampAttitudePanelPosition } from "../../../attitude/AttitudePickerState";
import type { AttitudePickerState } from "../../../attitude/AttitudePickerState";
import { parseStickerId } from "../../../attitude/attitudeIcon";
import AttitudeStickerList from "./AttitudeStickerList.vue";

interface Props {
  store: AttitudePickerState;
}

const { store } = defineProps<Props>();

const pickerHost = ref<HTMLDivElement>();
const allEmojisVisible = ref(false);
/** 面板页签：emoji（最近使用 + 全部 emoji）与「我的贴纸」（上传的本地图片贴纸） */
const tab = ref<"emoji" | "sticker">("emoji");

/** 表态类型是否为贴纸（`sticker:<id>`） */
function isSticker(attitudeType: string) {
  return parseStickerId(attitudeType) !== undefined;
}

/** 已解析出的贴纸图片地址；尚未解析完成时为空（渲染占位方块） */
function stickerUrl(attitudeType: string) {
  return store.stickerUrls[attitudeType];
}

/** 切换页签：面板高度随之变化，重新夹取到视口内 */
function switchTab(next: "emoji" | "sticker") {
  tab.value = next;
  void nextTick(clampAttitudePanelPosition);
}

/** 站点是否处于夜间模式（站点自身与本站配色都以 `<html>` 上的 `dark` 类为准） */
const siteDark = ref(document.documentElement.classList.contains("dark"));
let pickerReady = false;
let pickerEl: HTMLElement | undefined;

const themeObserver = new MutationObserver(() => {
  siteDark.value = document.documentElement.classList.contains("dark");
});

/**
 * 让 `emoji-picker-element` 跟随站点主题。
 *
 * 它默认只在未指定主题类时跟随系统的 `prefers-color-scheme`，与站点夜间模式无关：
 * 系统深色而站点浅色时，面板里会突兀地出现一块深色选择器。故始终显式指定 `light` / `dark`。
 */
function applyPickerTheme() {
  if (!pickerEl) return;
  pickerEl.classList.toggle("dark", siteDark.value);
  pickerEl.classList.toggle("light", !siteDark.value);
}

watch(siteDark, applyPickerTheme);

/**
 * 展开 / 收起「全部 emoji」。
 *
 * 选择器本身（含 365KB 中文 emoji 数据）只在首次展开时创建并下载，数据由
 * `emoji-picker-element` 自行缓存进 IndexedDB；收起只是隐藏，不销毁实例。
 */
function toggleAllEmojis() {
  allEmojisVisible.value = !allEmojisVisible.value;
  if (allEmojisVisible.value && !pickerReady) {
    const host = pickerHost.value;
    if (host) {
      const picker = new Picker({
        locale: "zh",
        i18n: zhCN,
        dataSource: Values.attitude.emojiDataUrl,
        emojiVersion: Values.attitude.emojiVersion,
      });
      pickerEl = picker;
      applyPickerTheme();
      picker.addEventListener("emoji-click", (event) => {
        // 自定义 emoji 没有 `unicode`（本站不注册自定义 emoji），直接忽略
        const unicode = event.detail.unicode;
        if (unicode) store.onPick(unicode);
      });
      host.appendChild(picker);
      pickerReady = true;
    }
  }
  nextTick(clampAttitudePanelPosition);
}

function close() {
  store.onClose();
}

/** 页面滚动关闭面板；面板内部（如 emoji 选择器自身的滚动区）的滚动不算 */
function onAnyScroll(event: Event) {
  const target = event.target;
  if (
    target instanceof Node &&
    document.getElementById("mcmodder-attitude-panel")?.contains(target)
  ) {
    return;
  }
  close();
}

/** 点击面板外部关闭；点击工具条按钮不算外部（由 `AttitudeSystem` 的开关逻辑处理） */
function onDocumentPointerDown(event: PointerEvent) {
  if (!store.visible) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#mcmodder-attitude-panel")) return;
  if (target.closest("a.mcmodder-attitude-button")) return;
  close();
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => {
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeyDown, true);
  window.addEventListener("scroll", onAnyScroll, true);
  window.addEventListener("resize", close);
});

onUnmounted(() => {
  themeObserver.disconnect();
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  document.removeEventListener("keydown", onDocumentKeyDown, true);
  window.removeEventListener("scroll", onAnyScroll, true);
  window.removeEventListener("resize", close);
});
</script>
