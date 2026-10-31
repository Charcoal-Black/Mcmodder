<template>
  <Popover ref="popoverRef" v-bind="popoverProps">
    <div id="mcmodder-attitude-panel" class="mcmodder-attitude-panel" :data-mcmodder-tab="tab">
      <div class="mcmodder-swiper-tab-container">
        <div class="mcmodder-attitude-tabs">
          <button
            ref="emojiTabRef"
            type="button"
            class="mcmodder-attitude-tab"
            :class="{ 'mcmodder-attitude-tab-active': tab === 'emoji' }"
            @click="switchTab('emoji')"
          >
            Emoji
          </button>
          <button
            ref="stickerTabRef"
            type="button"
            class="mcmodder-attitude-tab"
            :class="{ 'mcmodder-attitude-tab-active': tab === 'sticker' }"
            @click="switchTab('sticker')"
          >
            我的贴纸
          </button>
          <button
            ref="plazaTabRef"
            type="button"
            class="mcmodder-attitude-tab"
            :class="{ 'mcmodder-attitude-tab-active': tab === 'plaza' }"
            @click="switchTab('plaza')"
          >
            贴纸广场
          </button>
        </div>
        <TabIndicator ref="indicatorRef" />
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
              class="mcmodder-attitude-sticker mcmodder-attitude-sticker-pending mcmodder-skeleton"
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
        <button type="button" class="mcmodder-attitude-more btn btn-light" @click="toggleAllEmojis">
          {{ allEmojisVisible ? "收起全部 Emoji" : "全部 Emoji" }}
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
        :on-favorite="onUnfavorite"
        :on-share="onShare"
        :on-delete="deleteAttitudeSticker"
      />
      <AttitudeStickerPlaza
        v-show="tab === 'plaza'"
        :parent="state?.parent"
        :stickers="plazaStickers"
        :total="plazaTotal"
        :loading="plazaLoading"
        :sort="plazaSort"
        :active="active"
        :on-pick="onPick"
        :on-favorite="onFavoritePlaza"
        :on-share="onShare"
        :on-delete="deleteAttitudeSticker"
        :on-load-more="onLoadMorePlaza"
        :on-sort-change="onPlazaSortChange"
        @sticker-removed="onPlazaStickerRemoved"
      />
    </div>
  </Popover>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useTemplateRef, shallowRef, computed } from "vue";
import Picker from "emoji-picker-element/picker.js";
import zhCN from "emoji-picker-element/i18n/zh_CN.js";
import { Values } from "../../../Values";
import type { ConfigRepository } from "../../../config/ConfigRepository.ts";
import { AttitudeSystem } from "../../../attitude/AttitudeSystem";
import type { AttitudePickerState, PopoverExpose } from "../../../types/props.d.ts";
import { parseStickerId } from "../../../attitude/attitudeIcon";
import {
  attitudeLetterIconUrl,
  attitudeLetters,
  attitudeTypeOfLetter,
} from "../../../attitude/attitudeLetter";
import AttitudeStickerList from "./AttitudeStickerList.vue";
import AttitudeStickerPlaza from "./AttitudeStickerPlaza.vue";
import Popover from "../Popover.vue";
import TabIndicator from "../TabIndicator.vue";
import { usePopoverHost } from "../../composables/usePopoverHost.ts";

/**
 * 弹出框宿主的接线：显隐、定位、`updatePos` / `close` 都在 `usePopoverHost` 里；
 * 面板打开时顺带把页签指示器挪到当前页签上。
 */
const { popoverRef, visible, popoverProps, applyOption, updatePos, close, getPopoverElement } =
  usePopoverHost({
    onOpen: () => updateIndicator(),
  });

const state = shallowRef<AttitudePickerState>();
const configs = shallowRef<ConfigRepository>();
const system = shallowRef<AttitudeSystem>();

const pickerHost = ref<HTMLDivElement>();
const allEmojisVisible = ref(false);
const tab = ref<"emoji" | "sticker" | "plaza">("emoji");

const indicatorRef = useTemplateRef("indicatorRef");
const emojiTabRef = useTemplateRef("emojiTabRef");
const stickerTabRef = useTemplateRef("stickerTabRef");
const plazaTabRef = useTemplateRef("plazaTabRef");

/**
 * 「我点过」的高亮：打开时取选项里的初始值（本地缓存），后台刷新与写请求的返回都会替换它。
 *
 * `state` 是 `shallowRef`，改它的属性不会触发重渲染，故高亮单独用一个 ref 承载。
 */
const active = shallowRef<string[]>([]);

/** 最近使用的 emoji（本机维度） */
const recents = computed(() => {
  return system.value?.recentEmojis.value;
});
/**
 * 我上传与收藏的贴纸 / 今日额度（面板打开时懒加载）
 *
 * 直接由 `AttitudeSystem` 的集合缓存派生，不再另存一份快照：任何写操作（面板内的上传、重命名、
 * 共享、收藏、删除，以及贴纸小窗里的快捷收藏）都已就地同步进那份缓存，这里自然跟着变。
 */
const stickers = computed(() => {
  const cached = system.value?.myStickers.value?.stickers;
  if (cached !== undefined) return cached;
  // 未认证时没有「我的贴纸」可读：按空列表展示，避免停留在骨架屏；认证后仍走正常加载
  return system.value?.getAuthKey() ? undefined : [];
});
const quota = computed(() => system.value?.myStickers.value?.quota ?? null);
/** 贴纸广场：服务端返回的原始列表（按当前排序方式，分页加载） */
const plazaRows = shallowRef<SupabaseAttitudeSticker[]>();
/** 贴纸广场排序方式：切换后清空已加载页，由 watch 重新拉取第一页 */
const plazaSort = ref<StickerPlazaSort>(
  (["latest", "favorites"] as const)[
    state.value?.parent?.configRepository.getSettings("preferredStickerPlazaSort") ?? 0
  ],
);

/**
 * 交给广场面板的列表：行上的「我收藏的」标记改由集合缓存派生。
 *
 * 服务端只在拉取那一刻告诉我们哪些贴纸被收藏过；之后在广场、贴纸小窗或「我的贴纸」里改了收藏
 * 状态，这份列表本身不会更新（`plazaRows` 只在拉取 / 分页 / 下架时换新），按钮文案与徽标就会
 * 停在旧值上。集合缓存尚未加载时没有依据，保留服务端的判断。
 */
const plazaStickers = computed(() => {
  const rows = plazaRows.value;
  const collection = system.value?.myStickers.value?.stickers;
  if (!rows || !collection) return rows;
  const favorited = new Set(collection.map((item) => item.id));
  return rows.map((row) => {
    // 自己上传的贴纸本来就在集合里，「在不在集合里」不能当收藏用（也收藏不了自己），
    // 这类行沿用服务端给的 `is_favorite`
    const isFavorite = row.is_mine ? !!row.is_favorite : favorited.has(row.id);
    return isFavorite === !!row.is_favorite ? row : { ...row, is_favorite: isFavorite };
  });
});
const plazaTotal = ref(0);
const plazaLoading = ref(false);
/** 贴纸列表请求进行中（避免切页签时重复发请求） */
let stickersLoading = false;
/** 广场请求进行中 */
let plazaLoadingGuard = false;
/** 有请求在飞时收到的整页刷新请求，等当前请求结束后补一次 */
let plazaReloadQueued = false;
/** 面板内已点击表态的次数：写请求的返回比打开时的后台刷新更权威，点过之后即丢弃过期刷新 */
let pickCount = 0;

/** 拉取「我的贴纸」与今日额度（结果落在 `AttitudeSystem` 的集合缓存里）；失败时保持未加载状态，切页签可重试 */
async function loadStickers() {
  const instance = system.value;
  if (!instance || stickersLoading) return;
  stickersLoading = true;
  try {
    await instance.listMyStickers();
  } finally {
    stickersLoading = false;
  }
}

/**
 * 广场里取消共享 / 删除：先把这行移出视野，再重新拉取一页。
 *
 * 不能只靠广场组件上报的事件来刷新：共享、删除成功后会把广场列表置为 `undefined`，
 * 广场随即切到「正在加载贴纸广场…」并卸载浏览区，事件就发不出来了（组件卸载后 `emit` 会被丢弃）。
 */
function onPlazaStickerRemoved(sticker: SupabaseAttitudeSticker) {
  plazaRows.value = plazaRows.value?.filter((item) => item.id !== sticker.id);
  void loadPlaza(true);
}

/**
 * 切换广场排序：清空已加载的页，由下面的 watch 重新拉取第一页。
 *
 * 列表已经是 `undefined`（首屏请求中）时 watch 不会再次触发，这里直接补一次；请求在飞时
 * `loadPlaza` 会把它排进队列。旧排序的响应由 `loadPlaza` 里的 sort 比对丢弃。
 */
function onPlazaSortChange(next: StickerPlazaSort) {
  if (next === plazaSort.value) return;
  plazaSort.value = next;
  plazaTotal.value = 0;
  if (plazaRows.value === undefined) void loadPlaza(true);
  else plazaRows.value = undefined;
}

/** 拉取贴纸广场一页；`reset` 为真时从第一页重新开始 */
async function loadPlaza(reset = false) {
  const instance = system.value;
  if (!instance) return;
  if (plazaLoadingGuard) {
    // 已有请求在飞：记下这次整页刷新，等它结束后再拉一次，免得漏掉刚刚下架 / 删除的贴纸
    plazaReloadQueued = plazaReloadQueued || reset;
    return;
  }
  plazaLoadingGuard = true;
  plazaLoading.value = true;
  const sort = plazaSort.value;
  try {
    const offset = reset ? 0 : (plazaRows.value?.length ?? 0);
    const rows = await instance.listPlazaStickers(
      offset,
      Values.attitude.sticker.plazaPageSize,
      sort,
      (error) => console.warn("[Mcmodder] 贴纸广场获取失败：", error),
    );
    // 请求期间切换了排序：这份结果属于旧排序，丢弃；新排序的请求已排进队列
    if (!rows || sort !== plazaSort.value) return;
    plazaTotal.value = rows[0]?.total ?? 0;
    plazaRows.value = reset || plazaRows.value === undefined ? rows : [...plazaRows.value, ...rows];
  } finally {
    plazaLoadingGuard = false;
    plazaLoading.value = false;
    if (plazaReloadQueued) {
      plazaReloadQueued = false;
      void loadPlaza(true);
    }
  }
}

/**
 * 广场页签打开期间，广场列表被置为待刷新（共享、删除等写操作之后）就自动重拉。
 *
 * 有了它，广场不必依赖自己的组件事件来触发刷新（列表一旦变成 `undefined`，浏览区就会被卸载，
 * 卸载后 Vue 会丢弃它发出的事件）；切到广场页签时的首次加载也一并由这里负责。
 */
watch([() => tab.value, () => plazaRows.value], () => {
  if (tab.value === "plaza" && plazaRows.value === undefined) void loadPlaza(true);
});

function isSticker(attitudeType: string) {
  return parseStickerId(attitudeType) !== undefined;
}

let stickerUrls: Record<string, string> = {};

function stickerUrl(attitudeType: string) {
  return stickerUrls[attitudeType];
}

function switchTab(next: "emoji" | "sticker" | "plaza") {
  tab.value = next;
  if (next === "sticker") void loadStickers();
  // 切到广场页签时的首次加载交给上面的 watch（广场列表为空时自动重拉）
  // void nextTick(clampAttitudePanelPosition);
  popoverRef.value?.onPopoverHeightChange();
  updateIndicator();
}

function updateIndicator() {
  nextTick(() => {
    const active =
      tab.value === "emoji"
        ? emojiTabRef.value
        : tab.value === "sticker"
          ? stickerTabRef.value
          : plazaTabRef.value;
    if (active !== null) {
      indicatorRef.value?.update(active);
    }
  });
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
  popoverRef.value?.onPopoverHeightChange();
}

async function toggleAllEmojis() {
  allEmojisVisible.value = !allEmojisVisible.value;
  // 选择器初始化时要量宽度，须等宿主可见
  await nextTick();
  if (allEmojisVisible.value) ensurePicker();
  // clampAttitudePanelPosition();
}

/** 点击面板外部关闭（工具条按钮交给 `AttitudeSystem` 的开关逻辑） */
function onDocumentPointerDown(event: Event) {
  if (!visible.value || !(event instanceof PointerEvent)) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#mcmodder-attitude-panel")) return;
  if (target.closest("a.mcmodder-attitude-button")) return;
  close();
}

function onDocumentKeyDown(event: Event) {
  if (event instanceof KeyboardEvent && event.key === "Escape") {
    close();
  }
}

/** 点击贴纸；不传 = 只查看（贴纸不可点；`keepOpen` 为真时保持面板打开（字母连续拼词） */
function onPick(attitudeType: string, keepOpen?: boolean) {
  if (!keepOpen) close();
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
  // 上传后面板仍停在同一条短评上就直接用它表态（否则只加入「我的贴纸」）
  if (attitudeType && visible.value && state.value!.commentId === state.value!.target.commentId) {
    onPick(attitudeType);
  }
}

/** 共享 / 取消共享自己上传的贴纸（共享状态由 `AttitudeSystem` 就地同步进集合缓存） */
async function onShare(sticker: SupabaseAttitudeSticker) {
  const shared = !sticker.shared_at;
  const ok = await system.value!.shareSticker(sticker.id, shared);
  if (!ok) return false;
  // 广场列表需要重新拉取（新增或下架）
  plazaRows.value = undefined;
  return true;
}

/** 在「我的贴纸」里取消收藏 */
async function onUnfavorite(sticker: SupabaseAttitudeSticker) {
  const ok = await system.value!.favoriteSticker(sticker.id, false);
  if (!ok) return false;
  plazaRows.value = undefined;
  return true;
}

/** 删除自己上传的贴纸：「我的贴纸」与广场里都不再保留 */
async function deleteAttitudeSticker(sticker: SupabaseAttitudeSticker) {
  const ok = await system.value!.deleteSticker(sticker.id);
  if (!ok) return false;
  plazaRows.value = undefined;
  return true;
}

/** 在广场里收藏 / 取消收藏 */
async function onFavoritePlaza(sticker: SupabaseAttitudeSticker) {
  const favorite = !sticker.is_favorite;
  const result = await system.value!.favoriteSticker(sticker.id, favorite);
  if (!result) return false;
  // 收藏标记与人数以服务端返回为准就地回填；集合缓存已加载时 `plazaStickers` 会再用它派生一次
  // `is_favorite`，两者一致。详情区的收藏人数由 `useStickerSelectionGuard` 跟随新行更新。
  plazaRows.value = plazaRows.value?.map((item) =>
    item.id === sticker.id
      ? { ...item, is_favorite: result.is_favorite, favorite_count: result.favorite_count }
      : item,
  );
  return true;
}

/** 广场分页：加载下一页 */
function onLoadMorePlaza() {
  return loadPlaza(false);
}

/**
 * 打开面板：`active` 由 `AttitudeSystem` 取打开瞬间的本地缓存给出，这里不再等云端；
 * 随后后台刷新一次计数，响应到达时补上「我点过」高亮（用户已点击表态则丢弃这次刷新结果）。
 */
function setOption(option: AttitudePickerState) {
  state.value = option;
  applyOption(option);
  configs.value = state.value ? state.value.parent.configRepository : undefined;
  system.value = state.value ? AttitudeSystem.for(state.value.parent) : undefined;
  active.value = option.active;

  if (system.value) {
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
    else if (tab.value === "plaza" && plazaRows.value === undefined) void loadPlaza(true);
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
 * 把面板夹取到视口内（按面板当前实际尺寸）：打开面板与展开「全部 Emoji」后各调用一次，
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

/** 输入框事件名 → 处理函数：由 `AttitudePickerPopoverController` 转发到 `window`（也可被宿主直接调用其中任意一个） */
const inputEvents = {
  pointerdown: onDocumentPointerDown,
  keydown: onDocumentKeyDown,
} as const;

defineExpose<PopoverExpose<AttitudePickerState, typeof inputEvents>>({
  setOption,
  inputEvents,
  updatePos,
  close,
  getPopoverElement,
});
</script>
