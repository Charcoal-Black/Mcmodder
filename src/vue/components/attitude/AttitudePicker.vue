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

    <div v-show="tab === 'emoji'">
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
    </div>

    <AttitudeStickerList
      v-if="tab === 'sticker'"
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
import {
  attitudeLetterIconUrl,
  attitudeLetters,
  attitudeTypeOfLetter,
} from "../../../attitude/attitudeLetter";
import AttitudeStickerList from "./AttitudeStickerList.vue";

interface Props {
  store: AttitudePickerState;
}

const { store } = defineProps<Props>();

const pickerHost = ref<HTMLDivElement>();
const allEmojisVisible = ref(false);
const tab = ref<"emoji" | "sticker">("emoji");

function isSticker(attitudeType: string) {
  return parseStickerId(attitudeType) !== undefined;
}

function stickerUrl(attitudeType: string) {
  return store.stickerUrls[attitudeType];
}

function switchTab(next: "emoji" | "sticker") {
  tab.value = next;
  void nextTick(clampAttitudePanelPosition);
}

const siteDark = ref(document.documentElement.classList.contains("dark"));
let pickerEl: HTMLElement | undefined;

/** 库的自定义类别分组 id */
const CUSTOM_GROUP_ID = "-1";
const LETTERS_CATEGORY_LABEL = "字母";

function decorateLettersCategory(picker: HTMLElement) {
  const shadow = picker.shadowRoot;
  if (!shadow) return;
  const style = document.createElement("style");
  shadow.append(style);

  const apply = (nav: Element) => {
    const buttons = [...nav.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.dataset.groupId !== undefined,
    );
    if (buttons.length === 0) return;
    const iconHost = nav.querySelector(`[data-group-id='${CUSTOM_GROUP_ID}'] .nav-emoji`);
    if (iconHost && !iconHost.querySelector("img")) {
      const icon = document.createElement("img");
      icon.src = attitudeLetterIconUrl;
      icon.alt = "";
      iconHost.replaceChildren(icon);
    }
    const visualOrder = [
      ...buttons.filter((button) => button.dataset.groupId !== CUSTOM_GROUP_ID),
      ...buttons.filter((button) => button.dataset.groupId === CUSTOM_GROUP_ID),
    ];
    const css = [
      `.nav > [data-group-id='${CUSTOM_GROUP_ID}'] { order: 1; }`,
      `.nav > [data-group-id='${CUSTOM_GROUP_ID}'] .nav-emoji img {` +
        " width: var(--category-emoji-size); height: var(--category-emoji-size); }",
      ...visualOrder.map(
        (button, column) =>
          `.picker:has(.nav > [data-group-id='${button.dataset.groupId}'][aria-selected='true'])\n` +
          `  .indicator { transform: translateX(${column * 100}%) !important; }`,
      ),
    ].join("\n");
    if (style.textContent !== css) style.textContent = css;
  };

  const start = (attempts: number) => {
    const nav = shadow.querySelector(".nav");
    if (nav) {
      apply(nav);
      new MutationObserver(() => apply(nav)).observe(nav, { childList: true, subtree: true });
      return;
    }
    if (attempts > 0) requestAnimationFrame(() => start(attempts - 1));
  };
  start(30);
}

const themeObserver = new MutationObserver(() => {
  siteDark.value = document.documentElement.classList.contains("dark");
});

function applyPickerTheme() {
  if (!pickerEl) return;
  pickerEl.classList.toggle("dark", siteDark.value);
  pickerEl.classList.toggle("light", !siteDark.value);
}

watch(siteDark, applyPickerTheme);

function ensurePicker() {
  const host = pickerHost.value;
  if (!host) return;
  if (pickerEl?.isConnected && pickerEl.parentElement === host) return;

  pickerEl?.remove();
  const picker = new Picker({
    locale: "zh",
    i18n: { ...zhCN, categories: { ...zhCN.categories, custom: LETTERS_CATEGORY_LABEL } },
    dataSource: Values.attitude.emojiDataUrl,
    emojiVersion: Values.attitude.emojiVersion,
    customEmoji: attitudeLetters,
  });
  pickerEl = picker;
  applyPickerTheme();
  picker.addEventListener("emoji-click", (event) => {
    const { unicode, emoji } = event.detail;
    const letter = unicode ? undefined : attitudeTypeOfLetter(emoji.name);
    if (letter) {
      store.onPick(letter, true);
    } else if (unicode) {
      store.onPick(unicode);
    }
  });
  host.appendChild(picker);
  decorateLettersCategory(picker);
}

async function toggleAllEmojis() {
  allEmojisVisible.value = !allEmojisVisible.value;
  // 选择器初始化时要量宽度，须等宿主可见
  await nextTick();
  if (allEmojisVisible.value) ensurePicker();
  clampAttitudePanelPosition();
}

function close() {
  store.onClose();
}

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

/** 点击面板外部关闭（工具条按钮交给 `AttitudeSystem` 的开关逻辑） */
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
