<template>
  <div class="center-block-head">
    <span class="mcmodder-title-new">Mcmodder 设置</span>
    <span class="text">版本 v{{ Values.mcmodderVersion }} ~ ☆</span>
  </div>

  <div class="center-setting-search">
    <input
      ref="searchInputRef"
      class="form-control"
      placeholder="搜索配置项.."
      @input="onSearchInput"
    />
  </div>

  <p
    class="center-setting-search-empty text-muted mcmodder-intepolate-container"
    :class="{ collapsed: !(isSearching && !hasVisibleSetting) }"
  >
    <span>没有找到与“{{ searchText.trim() }}”相关的配置项...</span>
  </p>

  <div class="center-block-settings">
    <div ref="settingsContentRef" class="center-block-settings-content">
      <div
        v-for="category in settings"
        :key="category.id"
        class="center-block-category-container mcmodder-intepolate-container"
        :class="{ collapsed: !hasVisibleSettingInCategory(category) }"
        :data-category="category.id"
      >
        <div class="center-block-category">
          <div class="center-block-category-label" v-text="category.label" />
          <div
            v-for="section in category.sections"
            :key="section.id"
            class="center-block-section-container center-content mcmodder-intepolate-container"
            :class="{ collapsed: !hasVisibleSettingInSection(section) }"
            :data-section="section.id"
          >
            <div class="center-block-section">
              <div class="center-block-section-label" v-text="section.label" />
              <template v-for="key in section.settings" :key="key.id">
                <div
                  class="center-block-setting-container mcmodder-intepolate-container"
                  :class="{ collapsed: !isSettingVisible(key.id) }"
                >
                  <ConfigInteractor
                    :id="key.id"
                    :cfgutils="cfgutils"
                    :configs="configs"
                    :matched-ranges="matchedRanges.get(key.id)"
                  >
                    <template v-if="key.id === 'autoCheckUpdate'" #afterInput>
                      <button
                        id="mcmodder-update-check-manual"
                        class="btn"
                        @click="() => parent.scheduleRequestUtils.run('autoCheckUpdate')"
                      >
                        立即检查更新
                      </button>
                      <Countdown
                        :parent="parent"
                        :data-getter="
                          TimerUtils.DATAGETTER_SCHEDULE(
                            'autoCheckUpdate',
                            null,
                            parent.scheduleRequestUtils,
                          )
                        "
                      />
                    </template>
                    <template v-else-if="key.id === 'useSupabase'" #afterInput>
                      <span
                        v-show="configs.getSettingsRef('useSupabase').value"
                        class="center-block-settings-authbinder"
                      >
                        <SupabaseAuthBinder :parent="parent" />
                      </span>
                    </template>
                    <template v-if="key.id === 'useSupabase'" #afterItem>
                      <div
                        v-show="configs.getSettingsRef('useSupabase').value"
                        class="center-block-settings-configloader"
                      >
                        <SupabaseConfigLoader :parent="parent" />
                      </div>
                    </template>
                  </ConfigInteractor>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="center-block-settings-sidebar">
      <div class="mcmodder-menutree">
        <ul class="mcmodder-menutree-category">
          <li
            v-for="category in settings"
            :key="category.id"
            class="mcmodder-intepolate-container"
            :class="{ collapsed: !hasVisibleSettingInCategory(category) }"
          >
            <div>
              <a
                tabindex="0"
                class="mcmodder-menutree-link mcmodder-menutree-link-category"
                :class="{ active: activeCategoryId === category.id }"
                @click="goto('category', category.id)"
                v-text="category.label"
              />
              <ul class="mcmodder-menutree-section">
                <li
                  v-for="section in category.sections"
                  :key="section.id"
                  class="mcmodder-intepolate-container"
                  :class="{ collapsed: !hasVisibleSettingInSection(section) }"
                >
                  <a
                    tabindex="0"
                    class="mcmodder-menutree-link mcmodder-menutree-link-section"
                    :class="{ active: activeSectionId === section.id }"
                    @click="goto('section', section.id)"
                    v-text="section.label"
                  />
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div class="center-block-head">
    <span class="mcmodder-title-new">资源管理</span>
    <span class="text">轻触各项可展开详情~</span>
  </div>

  <div class="center-content mcmodder-storage">
    <ul>
      <li v-for="cfgProps in configResourceInteractorProps" :key="cfgProps.id">
        <ConfigResourceInteractor v-bind="cfgProps" />
      </li>
      <li v-for="cfgProps in configResourceFileListInteractorProps" :key="cfgProps.id">
        <ConfigResourceFileListInteractor v-bind="cfgProps" />
      </li>
    </ul>
  </div>

  <div class="center-block-head">
    <span class="mcmodder-title-new">投稿自定义闪烁标语</span>
    <span class="text"
      >已登录用户可投稿标语至云端。投稿需经脚本管理员审核过审后方可被其它脚本用户抓取显示。</span
    >
  </div>

  <div class="center-setting-block">
    <div class="setting-item" style="display: flex; gap: 8px; align-items: center">
      <input
        v-model="splashInput"
        type="text"
        class="form-control"
        placeholder="输入自定义闪烁标语内容..."
        style="max-width: 400px; display: inline-block"
      />
      <ButtonWithSpinner :on-click="submitSplash">提交投稿</ButtonWithSpinner>
    </div>
  </div>

  <div class="center-block-head">
    <span class="mcmodder-title-new">我上传的表态贴纸</span>
    <span class="text"
      >所有曾经由我上传的表态贴纸都会显示在这里。贴纸的图片文件均保存在百科图床，因此同样会受到百科图床的上传限制。</span
    >
  </div>

  <div class="center-setting-block">
    <template v-if="attitudeStickersEnabled">
      <AttitudeStickerList
        :parent="parent"
        :stickers="attitudeStickers"
        :quota="attitudeStickerQuota"
        :on-upload="uploadAttitudeSticker"
      />
      <button class="btn btn-light" @click="refreshAttitudeStickers(true)">刷新列表</button>
    </template>
    <p v-else class="text-muted" style="font-size: 13px">{{ attitudeStickersHint }}</p>
  </div>

  <div class="center-setting-block">
    <div class="setting-item">
      <button class="btn" @click="emptyScheduleRequest">清除当前所有计划任务</button>
    </div>
    <p class="text-muted">这在某些时候很有用——也许吧？</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { Mcmodder } from "../../Mcmodder";
import { Values } from "../../Values";
import { TableUtils } from "../../table/Table.ts";
import ConfigInteractor from "./config/ConfigInteractor.vue";
import Countdown from "./Countdown.vue";
import { TimerUtils } from "../../widget/TimerUtils.ts";
import SupabaseConfigLoader from "./supabase/SupabaseConfigLoader.vue";
import ConfigResourceInteractor from "./config/ConfigResourceInteractor.vue";
import { Utils } from "../../Utils.ts";
import ConfigResourceFileListInteractor from "./config/ConfigResourceFileListInteractor.vue";
import SupabaseAuthBinder from "./supabase/SupabaseAuthBinder.vue";
import AttitudeStickerList from "./attitude/AttitudeStickerList.vue";
import ButtonWithSpinner from "./ButtonWithSpinner.vue";
import type { ConfigMatchRanges } from "../../types/props";
import type {
  ConfigResourceFileListInteractorProps,
  ConfigResourceInteractorProps,
} from "../../types/props";
import { settings } from "../../loader/ConfigLoader.ts";
import Pinyin from "pinyin-match";

interface Props {
  parent: Mcmodder;
}

const props = defineProps<Props>();
const configs = computed(() => props.parent.configRepository);
const cfgutils = props.parent.cfgutils;

const ctx = computed<ConfigVisibilityContext>(() => ({
  configs: configs.value,
  permission: props.parent.configRepository.getProfile("permission"),
  mobile: props.parent.isMobileClient,
}));

const configVisibility = computed(() => {
  const result: Partial<Record<ConfigurableSettings["id"], boolean>> = {};
  Object.entries(cfgutils.options).forEach(([key, option]) => {
    result[key as ConfigurableSettings["id"]] =
      "visible" in option ? (option.visible(ctx.value) ?? false) : true;
  });
  return result;
});

/** 设置项检索框的输入内容 */
const searchText = ref("");
const searchInputRef = useTemplateRef("searchInputRef");
const settingsContentRef = useTemplateRef("settingsContentRef");

/**
 * 检索框输入即时生效：每次内容变化都全量重算一次匹配（设置项数量很少，无需增量优化）。
 * 监听 `input` 而非 `keydown`，以便粘贴、中文输入法等非按键途径的改动同样被捕获。
 */
function onSearchInput(e: InputEvent) {
  if (e.isComposing) {
    return;
  }
  searchText.value = searchInputRef.value?.value ?? "";
}

/** 是否正在进行检索（输入有实际内容时才是；纯空白视为未检索） */
const isSearching = computed(() => !!searchText.value.trim());

/**
 * 检索命中区间表：配置项 id -> 该配置项标题/介绍中的命中区间。
 *
 * 匹配字段只有标题 `title` 与介绍 `description`（介绍的排版标签在匹配前先行剔除，
 * 以保持区间与渲染时的纯文本流对齐），大小写不敏感且支持拼音；不做打分与排序，
 * 保留 `settings` 中的原有次序。输入为空时返回空表，即下方全部照常展示。
 */
const matchedRanges = computed(() => {
  const map = new Map<ConfigurableSettings["id"], ConfigMatchRanges>();
  const keywords = searchText.value.toLowerCase().trim().split(/\s+/);
  if (!keywords) {
    return map;
  }
  settings.forEach((category) =>
    category.sections.forEach((section) =>
      section.settings.forEach((item) => {
        const ranges: ConfigMatchRanges = {};
        keywords.forEach((keyword) => {
          const title = Pinyin.match(item.title, keyword);
          if (title) {
            title[1]++; // 闭区间改成左闭右开
            if (ranges.title === undefined) {
              ranges.title = [title];
            } else {
              ranges.title.push(title);
            }
          }
          const description = Pinyin.match(item.description.replace(/<[^>]*>/g, ""), keyword);
          if (description) {
            description[1]++; // 闭区间改成左闭右开
            if (ranges.description === undefined) {
              ranges.description = [description];
            } else {
              ranges.description.push(description);
            }
          }
        });
        if (ranges.title || ranges.description) {
          map.set(item.id, ranges);
        }
      }),
    ),
  );
  return map;
});

/** 检索时命中的配置项；未检索时一律视为命中 */
const isConfigMatched = (key: ConfigurableSettings["id"]) =>
  !isSearching.value || matchedRanges.value.has(key);

type SettingsCategory = (typeof settings)[number];
type SettingsSection = SettingsCategory["sections"][number];

/**
 * 配置项是否实际显示：用户组/移动端可见性与检索命中均满足时才显示。
 *
 * 整棵设置树（分类 -> 分区 -> 配置项，含侧边目录树）始终完整渲染在 DOM 中，
 * 显隐一律交给模板上的 `v-show`：这样检索或权限变化时无需重建整棵树，
 * IntersectionObserver 的观察目标也能保持稳定。
 */
const isSettingVisible = (key: ConfigurableSettings["id"]) =>
  !!configVisibility.value[key] && isConfigMatched(key);

/** 分区内是否存在需要显示的配置项 */
const hasVisibleSettingInSection = (section: SettingsSection) =>
  section.settings.some((item) => isSettingVisible(item.id));

/** 分类内是否存在需要显示的分区 */
const hasVisibleSettingInCategory = (category: SettingsCategory) =>
  category.sections.some(hasVisibleSettingInSection);

/** 整棵树是否至少有一个配置项需要显示（检索无任何命中时为 false） */
const hasVisibleSetting = computed(() => settings.some(hasVisibleSettingInCategory));

const configResourceInteractorProps: ConfigResourceInteractorProps<
  keyof AppStorage,
  object,
  TableAcceptable
>[] = [
  {
    parent: props.parent,
    id: "mcmodderSplashList_v2",
    name: "已记录的闪烁标语",
    columnOptions: {
      time: ["时间", (data: number) => (data ? new Date(data).toLocaleString() : "未知")],
      content: "记录内容",
      num: ["次数", TableUtils.DISPLAYRULE_NUMBER],
    },
    configParser: (config) => config?.split("\n") || [], // 最后一项是空，不考虑
    dataParser: (_, data) => {
      const list = (data as string).split(",");
      return {
        time: Number(list[0]),
        content: list[1],
        num: Number(list[2]),
      } as Splash;
    },
  } satisfies ConfigResourceInteractorProps<"mcmodderSplashList_v2", string[], Splash>,
  {
    parent: props.parent,
    id: "modDependences_v2",
    name: "已记录的模组前置信息",
    columnOptions: {
      id: ["模组编号", TableUtils.DISPLAYRULE_LINK_CLASS],
      children: ["记录内容", TableUtils.DISPLAYRULE_LINK_CLASS_ARRAY],
    },
    dataParser: (key, item) => ({
      id: Number(key),
      children: item as number[],
    }),
  } satisfies ConfigResourceInteractorProps<
    "modDependences_v2",
    Record<string, number[]>,
    ClassRelation
  >,
  {
    parent: props.parent,
    id: "modExpansions_v2",
    name: "已记录的模组拓展信息",
    columnOptions: {
      id: ["模组编号", TableUtils.DISPLAYRULE_LINK_CENTER],
      children: ["记录内容", TableUtils.DISPLAYRULE_LINK_CLASS_ARRAY],
    },
    dataParser: (key, item) => ({
      id: Number(key),
      children: item as number[],
    }),
  } satisfies ConfigResourceInteractorProps<
    "modExpansions_v2",
    Record<string, number[]>,
    ClassRelation
  >,
  {
    parent: props.parent,
    id: "rankData",
    name: "已保存的贡献榜数据",
    columnOptions: {
      date: ["日期", TableUtils.DISPLAYRULE_DATE_SEC_ZH],
      byteTop1: [
        "字数榜首",
        (rawData: string) => {
          const data = rawData.split(",") as unknown as [number, number, number]; // [userID, bytes, ratio]
          return `<a target="_blank" href="${Utils.getCenterURL(data[0])}">${data[0]}</a> 
          (${data[1].toLocaleString()} 字节, ${(data[2] * 100).toFixed(1)}%)`;
        },
      ],
      totalEdited: ["前 60 名总编辑字数", (data: number) => `${data.toLocaleString()} 字节`],
      size: ["数据大小", TableUtils.DISPLAYRULE_SIZE],
    },
    dataParser: (key, item) => {
      let list = JSON.parse(item as string) as RankStorage,
        sum = 0;
      list.forEach((user) => (sum += user.value));
      return {
        date: Number(key),
        byteTop1: [list[0].user, list[0].value, list[0].value / sum].join(","),
        totalEdited: sum,
        size: (item as string).length,
      };
    },
  } satisfies ConfigResourceInteractorProps<"rankData", Record<string, string>, RankDisplay>,
] as const;

const configResourceFileListInteractorProps = [
  {
    parent: props.parent,
    id: "mcmodderJsonStorage",
    name: "已保存的物品 JSON 文件（仅脚本存储）",
  } satisfies ConfigResourceFileListInteractorProps<"mcmodderJsonStorage">,
  {
    parent: props.parent,
    id: "mcmodderRecipeJsonStorage",
    name: "已保存的合成表 JSON 文件（仅脚本存储）",
  } satisfies ConfigResourceFileListInteractorProps<"mcmodderRecipeJsonStorage">,
] as const;

function emptyScheduleRequest() {
  const list = props.parent.scheduleRequestUtils.get();
  if (list.length) {
    props.parent.scheduleRequestUtils.empty();
    Utils.commonMsg(`${list.length.toLocaleString()} 项计划任务已被清除~`);
  } else {
    Utils.commonMsg("当前没有计划任务~");
  }
}

/** 我上传的表态贴纸（图片存于百科图床，云端只登记归属） */
const attitudeStickers = ref<SupabaseAttitudeSticker[]>([]);
const attitudeStickerQuota = ref<SupabaseAttitudeStickerQuota | null>(null);
const attitudeStickersLoading = ref(false);

const customAttitudeEnabled = configs.value.getSettingsRef("customAttitude");
const useSupabaseEnabled = configs.value.getSettingsRef("useSupabase");
/** 表态与云端开关都打开且已认证时才可用 */
const attitudeStickersEnabled = computed(
  () =>
    customAttitudeEnabled.value &&
    useSupabaseEnabled.value &&
    !!props.parent.attitudeSystem.getAuthKey(),
);
const attitudeStickersHint = computed(() => {
  if (!customAttitudeEnabled.value) return "自定义表态未开启：可在上方开启后再管理表态贴纸。";
  if (!useSupabaseEnabled.value) return "云端服务未开启：可在上方开启后再管理表态贴纸。";
  return "尚未完成云端认证：请先在上方完成认证。";
});

async function refreshAttitudeStickers(force = false) {
  if (!attitudeStickersEnabled.value) return;
  attitudeStickersLoading.value = true;
  try {
    const data = await props.parent.attitudeSystem.listMyStickers(force);
    if (!data) return;
    attitudeStickers.value = data.stickers;
    attitudeStickerQuota.value = data.quota ?? null;
  } finally {
    attitudeStickersLoading.value = false;
  }
}

async function uploadAttitudeSticker(file: File) {
  await props.parent.attitudeSystem.uploadSticker(file);
  await refreshAttitudeStickers(true);
}

onMounted(() => void refreshAttitudeStickers());
watch(attitudeStickersEnabled, (enabled) => {
  if (enabled) void refreshAttitudeStickers();
});

const splashInput = ref<string>("");

async function submitSplash() {
  const content = splashInput.value.trim();

  if (!content) {
    Utils.commonMsg("标语内容不能为空！", false);
    return;
  }

  if (!props.parent.currentUID) {
    Utils.commonMsg("请先登录 MC百科 账号后再发起投稿！", false);
    return;
  }

  const authKey = configs.value.getProfile("auth_key");
  if (!authKey) {
    Utils.commonMsg("未获取到登录校验 Key，请重新登录！", false);
    return;
  }

  const res = await props.parent.supabaseUtils.uploadCustomSplash(content, authKey);

  if (res && res.message) {
    Utils.commonMsg(res.message);
    splashInput.value = "";
  }
}

function goto(type: "category" | "section", id: string) {
  const target = $(settingsContentRef.value!).find(`[data-${type}=${id}]`);
  const el = target.get(0);
  if (!el) return;
  // scrollIntoView 只支持 "start"/"center"/"end"，故手动滚到「视口顶端 + 顶栏高度」处
  const top = el.getBoundingClientRect().top + window.scrollY - Values.headerContainerHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * 目录树高亮：滚动到某一分区时，给侧边栏相应的链接加上 `active`。
 *
 * 由 IntersectionObserver 监听每个 `.center-block-section-container` 与视口的相交情况：
 * - 观察范围自上端收回 `Values.headerContainerHeight`（本站 50px 高的 fixed 顶栏），
 *   即分区顶部被顶栏遮住时才算「已进入」；
 * - 相交中的分区按 DOM 顺序取第一个，因此多个分区同屏时只高亮最靠上的那个；
 * - 分区之间存在间距，可能出现「无一相交」的空档，此时退化为「最后一个已完整滚过观察线的分区」，
 *   避免高亮在两屏交界处反复闪烁；设置区域之上（尚未滚动到）则不高亮。
 */
const activeSectionId = ref<string | null>(null);
/** 当前高亮分区所属的分类，用于点亮分类链接 */
const activeCategoryId = computed(() => {
  if (!activeSectionId.value) return null;
  for (const category of settings) {
    if (category.sections.some((section) => section.id === activeSectionId.value)) {
      return category.id;
    }
  }
  return null;
});

let treeObserver: IntersectionObserver | null = null;

/**
 * 按 `settings` 的原有顺序收集当前需要被观察的分区（检索、用户组等会改变可见性，需重新收集）。
 *
 * 注意 `data-section` 挂在 `.center-block-section-container` 上而非内层的 `.center-block-section` 上，
 * 且折叠动画也只压缩容器自身的高度，故观察目标必须是容器本身。
 *
 * 只收集「有可见配置项」的分区：被折叠的分区高度为 0，若仍参与计算会把高亮错置到空分区上。
 * 分区可见意味着其所属分类同样可见，因此无需再判断分类。
 */
function collectObservedSections() {
  const root = settingsContentRef.value;
  if (!root) return [];
  const sections: { el: HTMLElement; id: string }[] = [];
  settings.forEach((category) =>
    category.sections.forEach((section) => {
      if (!hasVisibleSettingInSection(section)) return;
      const el = root.querySelector<HTMLElement>(
        `.center-block-section-container[data-section="${section.id}"]`,
      );
      if (el) sections.push({ el, id: section.id });
    }),
  );
  return sections;
}

function setupTreeObserver() {
  treeObserver?.disconnect();
  treeObserver = null;
  activeSectionId.value = null;

  const sections = collectObservedSections();
  if (!sections.length) {
    return;
  }

  /**
   * 按当前滚动位置重算高亮（分区集合已按 DOM 顺序排好，直接顺序取值）。
   *
   * 相交判断不依赖 IntersectionObserver 交回的 entries，而是统一用视口坐标算：
   * 观察线位于顶栏下沿，分区越过该线（或仍有一部分露在其下）即算「相交」。
   */
  const update = () => {
    const intersecting = sections.filter(({ el }) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > Values.headerContainerHeight && rect.top < window.innerHeight;
    });
    if (intersecting.length) {
      // 多个分区同屏时只高亮最靠上的那个
      activeSectionId.value = intersecting[0].id;
      return;
    }

    // 空档期：高亮最后一个已完整滚过观察线的分区
    const passed = sections.filter(
      ({ el }) => el.getBoundingClientRect().bottom <= Values.headerContainerHeight,
    );
    activeSectionId.value = passed.length ? passed[passed.length - 1].id : null;
  };

  treeObserver = new IntersectionObserver(update, {
    // 把 fixed 顶栏的高度从观察区域顶端挖掉，命中判断与 goto 的目标位置保持一致
    rootMargin: `-${Values.headerContainerHeight}px 0px 0px 0px`,
    threshold: [0, 0.01, 0.99],
  });
  sections.forEach(({ el }) => treeObserver!.observe(el));
  update(); // 观察器的首次回调要等下一帧，先按当前滚动位置高亮一次
}

/** 可见分区集合的指纹：任一分区因检索/权限变化显隐时都需要重新建立观察 */
const visibleSectionIds = computed(() =>
  settings.flatMap((c) => c.sections.filter(hasVisibleSettingInSection).map((s) => s.id)).join(","),
);

onMounted(setupTreeObserver);
watch(visibleSectionIds, () => nextTick(setupTreeObserver));
onBeforeUnmount(() => treeObserver?.disconnect());
</script>

<style lang="css">
.center-block-category {
  display: flex;
  flex-direction: column;
  padding-bottom: var(--mcmodder-width-padding-1);
}

.center-block-category-label {
  font-size: 24px;
  color: var(--mcmodder-color-text-dark1);
  border-bottom: 2px dashed var(--mcmodder-color-primary-light);
  line-height: 2em;
}

.center-block-section {
  padding: 0.5em var(--mcmodder-width-padding-2);
  border: 1px solid var(--mcmodder-color-primary-light);
  border-radius: var(--mcmodder-width-radius);
  display: flex;
  flex-direction: column;
}

.center-block-section-label {
  font-size: 18px;
  color: var(--mcmodder-color-text-dark1);
  font-weight: bold;
}

.center-block-section .center-setting-block {
  margin-bottom: 0;
  overflow-clip-margin: 5px;
}

.center-block-section-container {
  margin-top: var(--mcmodder-width-padding-2);
}

.center-block-setting-container {
  margin-top: var(--mcmodder-width-padding-1);
}

.center-setting-search {
  display: flex;
  flex-direction: column;
  gap: var(--mcmodder-width-padding-3);
  padding: var(--mcmodder-width-padding-3) 0;
}

.center-setting-search-empty {
  font-size: 14px;
}

.center-block-settings {
  display: flex;
  flex-direction: row;
}

.center-block-settings-authbinder {
  display: flex;
  align-items: center;
  gap: var(--mcmodder-width-padding-3);
}

.center-block-settings-configloader {
  padding-bottom: 5px; /* 让阴影可以完全显示（ */
}

.center-block-settings-content {
  flex: 1;
}

.center-block-settings-sidebar {
  width: 280px;
}

.mcmodder-menutree {
  padding: 0 1em 0 3em;
  line-height: 1.8em;
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  position: sticky;
  top: 60px;
}

.mcmodder-menutree-section {
  padding-left: 0.6em;
}

a.mcmodder-menutree-link {
  color: var(--mcmodder-color-text-dark1);
  transition:
    color 0.5s ease,
    padding 0.5s ease;
}

a.mcmodder-menutree-link:hover {
  padding-left: 5px;
  color: var(--mcmodder-color-accent-dark2);
}

a.mcmodder-menutree-link.active {
  padding-left: 5px;
  color: var(--mcmodder-color-primary-dark2);
}

a.mcmodder-menutree-link-category {
  color: var(--mcmodder-color-text-dark2);
  font-weight: bold;
}

/* 检索命中高亮：跟随主题配色，避免浏览器默认的黄色 mark 在夜间模式下刺眼 */
.center-block-section mark {
  padding: 0;
  color: var(--mcmodder-color-accent-dark2);
  background: inherit;
  font-weight: bold;
}
</style>
