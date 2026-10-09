<template>
  <Popover ref="popoverRef" :anchor-element="state?.anchorElement">
    <div id="mcmodder-attitude-panel" class="mcmodder-attitude-panel">
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
            v-for="attitudeType in recents"
            :key="attitudeType"
            type="button"
            class="mcmodder-attitude-choice mcmodder-attitude-emoji"
            :class="{ 'mcmodder-attitude-choice-active': active.includes(attitudeType) }"
            @click="onPick(attitudeType)"
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
          <span
            v-if="recents === undefined || recents.length === 0"
            class="mcmodder-attitude-empty-hint"
          >
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
        v-show="tab === 'sticker'"
        ref="stickerListRef"
        :parent="state?.parent"
        :stickers="stickers"
        :quota="quota"
        :active="active"
        :on-pick="onPick"
        :on-upload="onUpload"
      />
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useTemplateRef, shallowRef } from "vue";
import Picker from "emoji-picker-element/picker.js";
import zhCN from "emoji-picker-element/i18n/zh_CN.js";
import { Values } from "../../../Values";
import { ConfigRepository } from "../../../config/ConfigRepository.ts";
import { AttitudeSystem } from "../../../attitude/AttitudeSystem";
import type { AttitudePickerState, PopoverExpose } from "../../../types/props.d.ts";
import { parseStickerId } from "../../../attitude/attitudeIcon";
import {
  attitudeLetterIconUrl,
  attitudeLetters,
  attitudeTypeOfLetter,
} from "../../../attitude/attitudeLetter";
import AttitudeStickerList from "./AttitudeStickerList.vue";
import Popover from "../Popover.vue";

const state = shallowRef<AttitudePickerState>();
const configs = shallowRef<ConfigRepository>();
const system = shallowRef<AttitudeSystem>();

const pickerHost = ref<HTMLDivElement>();
const allEmojisVisible = ref(false);
const tab = ref<"emoji" | "sticker">("emoji");

const visible = ref(false);
const popoverRef = useTemplateRef("popoverRef");

/**
 * 「我点过」的高亮：打开时取选项里的初始值（本地缓存），后台刷新与写请求的返回都会替换它。
 *
 * `state` 是 `shallowRef`，改它的属性不会触发重渲染，故高亮单独用一个 ref 承载。
 */
const active = shallowRef<string[]>([]);

/** 最近使用的 emoji（本机维度） */
const recents = shallowRef<string[]>();
/** 我上传的贴纸：懒加载，首次切到「我的贴纸」页签时才拉取（系统内另有 30s 缓存） */
const stickers = shallowRef<SupabaseAttitudeSticker[]>();
const quota = shallowRef<SupabaseAttitudeStickerQuota | null>(null);
/** 贴纸列表请求进行中（避免切页签时重复发请求） */
let stickersLoading = false;
/** 面板内已点击表态的次数：写请求的返回比打开时的后台刷新更权威，点过之后即丢弃过期刷新 */
let pickCount = 0;

/** 拉取「我的贴纸」与今日额度；失败时保持未加载状态，切页签可重试 */
async function loadStickers() {
  const instance = system.value;
  if (!instance || stickersLoading) return;
  stickersLoading = true;
  try {
    const data = await instance.listMyStickers();
    if (!data) return;
    stickers.value = data.stickers;
    quota.value = data.quota ?? null;
  } finally {
    stickersLoading = false;
  }
}

watch(
  () => visible.value,
  (newValue) => popoverRef.value?.onPopoverVisibilityChange(newValue ?? false),
);

function isSticker(attitudeType: string) {
  return parseStickerId(attitudeType) !== undefined;
}

let stickerUrls: Record<string, string> = {};

function stickerUrl(attitudeType: string) {
  return stickerUrls[attitudeType];
}

function switchTab(next: "emoji" | "sticker") {
  tab.value = next;
  if (next === "sticker") void loadStickers();
  // void nextTick(clampAttitudePanelPosition);
}

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

function applyPickerTheme() {
  if (!pickerEl) return;
  if (configs.value?.getSettings("nightMode")) {
    pickerEl.classList.add("dark");
    pickerEl.classList.remove("light");
  } else {
    pickerEl.classList.add("light");
    pickerEl.classList.remove("dark");
  }
}

watch(
  () => configs.value?.getSettingsRef("nightMode").value,
  () => applyPickerTheme(),
);

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
  picker.addEventListener("emoji-click", (event) => {
    const { unicode, emoji } = event.detail;
    const letter = unicode ? undefined : attitudeTypeOfLetter(emoji.name);
    if (letter) {
      onPick(letter, true);
    } else if (unicode) {
      onPick(unicode);
    }
  });
  host.appendChild(picker);
  decorateLettersCategory(picker);
  applyPickerTheme();
}

async function toggleAllEmojis() {
  allEmojisVisible.value = !allEmojisVisible.value;
  // 选择器初始化时要量宽度，须等宿主可见
  await nextTick();
  if (allEmojisVisible.value) ensurePicker();
  // clampAttitudePanelPosition();
}

function onDocumentFocus() {
  visible.value = true;
}

/** 点击面板外部关闭（工具条按钮交给 `AttitudeSystem` 的开关逻辑） */
function onDocumentPointerDown(event: Event) {
  if (!visible.value || !(event instanceof PointerEvent)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#mcmodder-attitude-panel")) return;
  if (target.closest("a.mcmodder-attitude-button")) return;
  onClose();
}

function onDocumentKeyDown(event: Event) {
  if (event instanceof KeyboardEvent && event.key === "Escape") {
    onClose();
  }
}

/** 点击贴纸；不传 = 只查看（贴纸不可点；`keepOpen` 为真时保持面板打开（字母连续拼词） */
function onPick(attitudeType: string, keepOpen?: boolean) {
  if (!keepOpen) visible.value = false;
  pickCount += 1;
  system.value!.rememberRecentEmoji(attitudeType);
  const target = state.value!.target;
  system.value!.write(target, attitudeType)?.then((attitudeRecord) => {
    // 写请求返回的是权威结果；面板已关或已换到别的短评时不再回填
    if (attitudeRecord && visible.value && state.value!.target === target) {
      active.value = attitudeRecord.mine;
    }
  });
}

/** 上传本地图片；不传则不显示上传入口；用户上传本地图片作为贴纸（`AttitudeSystem` 接管；成功后直接用它表态） */
async function onUpload(file: File) {
  const attitudeType = await system.value!.uploadSticker(file);
  stickers.value = system.value?.myStickers?.stickers;
  quota.value = system.value?.myStickers?.quota ?? null;
  // 上传后面板仍停在同一条短评上就直接用它表态（否则只加入「我的贴纸」）
  if (attitudeType && visible.value && state.value!.commentId === state.value!.target.commentId) {
    onPick(attitudeType);
  }
}

/** 请求关闭面板（`AttitudeSystem` 落地） */
function onClose() {
  visible.value = false;
}

/**
 * 打开面板：`active` 由 `AttitudeSystem` 取打开瞬间的本地缓存给出，这里不再等云端；
 * 随后后台刷新一次计数，响应到达时补上「我点过」高亮（用户已点击表态则丢弃这次刷新结果）。
 */
function setOption(option: AttitudePickerState) {
  state.value = option;
  configs.value = state.value ? state.value.parent.configRepository : undefined;
  system.value = state.value ? AttitudeSystem.for(state.value.parent) : undefined;
  active.value = option.active;

  if (system.value) {
    if (recents.value === undefined) {
      recents.value = system.value?.getRecentEmojis();
    }
    // 后台补一次计数：命中缓存立即返回，未命中则去抖后请求（面板此时已经开着）
    const generation = pickCount;
    void system.value.requestCounts([option.commentId]).then((records) => {
      const record = records.get(option.commentId);
      if (!record || generation !== pickCount) return;
      if (!visible.value || state.value!.commentId !== option.commentId) return;
      active.value = record.mine;
    });
    // 我的贴纸：打开时不预取，切到该页签（或打开时正停在它上面）才拉取列表与今日额度
    if (tab.value === "sticker") void loadStickers();
  }

  initializeStickerUrls();
  visible.value = true;
  // nextTick(() => clampAttitudePanelPosition());
}

/** 最近使用里的贴纸先解析图片地址，解析完成后补上（不阻塞面板渲染）*/
function initializeStickerUrls() {
  system.value!.resolveStickers(recents.value!).then((stickers) => {
    stickerUrls = Object.fromEntries(
      [...stickers].map(([attitudeType, sticker]) => [attitudeType, sticker.image_url]),
    );
  });
}

/**
 * 把面板夹取到视口内（按面板当前实际尺寸）：打开面板与展开「全部 emoji」后各调用一次，
 * 这样 JS 侧无需重复 CSS 里的尺寸常量。
 */
// function clampAttitudePanelPosition() {
//   const panel = document.getElementById("mcmodder-attitude-panel");
//   if (!panel) return;
//   const { width, height } = panel.getBoundingClientRect();
//   state.value!.left = Math.min(
//     Math.max(8, state.value!.left),
//     Math.max(8, window.innerWidth - width - 8),
//   );
//   state.value!.top = Math.min(
//     Math.max(8, state.value!.top),
//     Math.max(8, window.innerHeight - height - 8),
//   );
// }

/** 输入框事件名 → 处理函数：由 `PopoverController` 转发到 `window`（也可被宿主直接调用其中任意一个） */
const inputEvents = {
  focus: onDocumentFocus,
  pointerdown: onDocumentPointerDown,
  keydown: onDocumentKeyDown,
} as const;

defineExpose<PopoverExpose<AttitudePickerState, typeof inputEvents>>({
  setOption,
  inputEvents,
  updatePos: () => popoverRef.value?.updatePos(),
  close: onClose,
});
</script>
