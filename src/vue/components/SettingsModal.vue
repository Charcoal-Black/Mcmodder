<template>
  <div class="mcmodder-settings-panel">
    <Transition name="modal-fade">
      <div v-if="open" class="mcmodder-settings-modal">
        <div class="modal-mask" @click="close" />
        <Transition name="modal-pop">
          <div class="modal-window" role="dialog" aria-modal="true">
            <header class="modal-header">
              <span class="modal-title">Mcmodder 脚本设置 <span class="modal-version">v{{ version }}</span></span>
              <div class="modal-search">
                <i class="fa fa-search" />
                <input v-model="query" placeholder="搜索设置..." />
                <button v-if="query" class="search-clear" @click="query = ''">×</button>
              </div>
              <button class="modal-close" @click="close" aria-label="关闭">×</button>
            </header>

            <div class="modal-body">
              <aside class="modal-sidebar">
                <button
                  v-for="g in groups"
                  :key="g.id"
                  class="sidebar-item"
                  :class="{ active: !query && activeGroup === g.id }"
                  @click="selectGroup(g.id)"
                >
                  <span class="sidebar-label">{{ g.label }}</span>
                  <span class="sidebar-count">{{ sidebarCount(g) }}</span>
                </button>
              </aside>

              <main class="modal-content">
                <template v-if="displayedGroups.length">
                  <div v-for="g in displayedGroups" :key="g.id" class="group-block">
                    <h3 v-if="query || g.sections.length > 1" class="group-heading">{{ g.label }}</h3>
                    <div v-for="s in g.sections" :key="s.id" class="group-card">
                      <div class="group-title-row">
                        <h4 class="group-title" v-html="s.titleHtml" />
                        <template v-if="s.id === 'update'">
                          <button class="btn btn-accent" id="mcmodder-update-check-manual" @click="checkUpdate">立即检查更新</button>
                          <span :ref="el => (timerSlots.autoCheckUpdate = el as HTMLElement | null)" class="mcmodder-settings-timer-slot" />
                        </template>
                      </div>

                      <div v-if="s.id === 'data'" ref="dataContainer" class="data-manager" />
                      <div v-for="entry in s.keys" :key="entry" class="setting-item">
                        <div class="setting-info">
                          <div class="setting-title-row">
                            <span class="title" v-html="entriesMap[entry]?.titleHtml ?? ''" />
                          </div>
                          <p class="text-muted" v-html="entriesMap[entry]?.descriptionHtml ?? ''" />
                        </div>
                        <div class="setting-control">
                          <SettingInput
                            :entry="entry"
                            :data="entriesMap[entry]?.data"
                            :value="getValue(entry)"
                            @commit="commitValue(entry, $event)"
                          />

                          <template v-if="entry === 'useSupabase' && !!getValue('useSupabase')">
                            <button class="btn btn-accent" id="mcmodder-auth-manual" :disabled="authing" @click="manualAuth">
                              {{ authing ? "认证中..." : "立即认证" }}
                            </button>
                            <span class="mcmodder-auth-user" :class="authUserClass">{{ authUserName }}</span>
                            <span class="mcmodder-auth-state" :class="authStateClass">
                              <i :class="authStateIcon" />
                            </span>
                          </template>
                        </div>
                      </div>

                      <div v-if="s.id === 'cloud' && !!getValue('useSupabase')" class="supabase-sync-block">
                        <span class="supabase-sync-hint">将当前全部配置保存至云端，或从云端拉取并覆盖本地配置：</span>
                        <div class="supabase-sync-buttons">
                          <button class="btn" :disabled="syncing" @click="syncUpload">
                            <i class="fa fa-cloud-upload" />
                            保存所有配置数据至云端
                          </button>
                          <button class="btn" :disabled="syncing" @click="syncDownload">
                            <i class="fa fa-cloud-download" />
                            从云端同步所有配置数据
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-else class="no-result">未找到匹配的设置项</div>
              </main>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { GM_getValue, GM_setValue } from "$";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { Mcmodder } from "../../Mcmodder";
import { McmodderConfigUtils, McmodderInputType } from "../../config/ConfigUtils";
import { McmodderConfigResourceInteractor } from "../../config/ConfigResourceInteractor";
import { McmodderConfigResourceFileListInteractor } from "../../config/ConfigResouceFileListInteractor";
import type { InputValueNumericRange, McmodderClassRelationData, McmodderConfigData, McmodderRankDisplayData, McmodderRankStorageData, McmodderSplashData, SupabaseAuthenticatorResponse, SupabaseSyncSettingsResponse } from "../../types";
import { McmodderTable } from "../../table/Table";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { McmodderTimer } from "../../widget/Timer";
import { useConfig } from "../composables/useConfig";
import { OPEN_SETTINGS_EVENT } from "../mount";
import SettingInput from "./SettingInput.vue";

const props = defineProps<{
  parent: Mcmodder;
}>();

const parent = props.parent;
const utils = parent.utils;
const cfgutils = parent.cfgutils;

const { get, set } = useConfig("mcmodderSettings");

const permission = utils.getProfile("permission");

const entries = computed<string[]>(() => {
  const list: string[] = [];
  Object.keys(cfgutils.data).forEach(key => {
    const data = cfgutils.data[key];
    if (data.permission && permission < data.permission) return;
    if (data.type === McmodderInputType.KEYBIND && parent.isMobileClient) return;
    list.push(key);
  });
  return list;
});

interface SettingsSection {
  id: string;
  title: string;
  titleHtml?: string;
  keys: string[];
}

interface SettingsGroup {
  id: string;
  label: string;
  sections: SettingsSection[];
}

const GROUP_DEFS: SettingsGroup[] = [
  {
    id: "appearance", label: "外观",
    sections: [
      { id: "theme", title: "主题样式", keys: ["themeColor1", "themeColor2", "themeColor3", "customFont", "disableGradient", "adaptableNightMode", "bbsNightMode", "forceV4", "disableAutoStyleFix", "moveAds"] },
      { id: "background", title: "背景", keys: ["defaultBackground", "defaultNightBackground", "backgroundAlpha", "textShadowAlpha", "radiusRatio"] },
    ]
  },
  {
    id: "home", label: "主页",
    sections: [
      { id: "home", title: "主页功能", keys: ["almanacs", "enableSplashTracker", "splashStyle", "splashFontUrl", "enableLive2D", "enableAprilFools", "autoCheckin", "centerMainExpand", "byteChart", "maxByteColorValue", "expCalculator", "rememberVisited", "rememberVisitedMods", "favUserDisplayStyle", "freezeAdvancements", "customAdvancements"] },
    ]
  },
  {
    id: "editor", label: "编辑与资料",
    sections: [
      { id: "editor", title: "编辑与表格", keys: ["editorAutoResize", "noSubmitWarningDelay", "autoSaveFix", "fastSubmitFix", "editorStats", "enableStructureEditor", "autoFoldTable", "tableFix", "tableThemeColor", "tableLeftAlign", "classAddHelper", "tabSelectorInfo", "rememberModRelation", "imageLocalizedCheck", "hoverDescription", "hoverImage", "linkCheck", "linkMark"] },
      { id: "mod", title: "模组与资料", keys: ["fastCopyName", "compactSupportedVersions", "disableClassDataTypesetting", "versionHelper", "versionEditorHelper", "subscribeDelay", "subscribeComment", "compactedChild", "advancedRanklist", "advancedOredictPage", "removePostProtection", "gtceuIntegration"] },
    ]
  },
  {
    id: "community", label: "社区",
    sections: [
      { id: "comment", title: "评论区", keys: ["anonymousUknowtoomuch", "unlockComment", "ignoreEmptyLine", "replyLink", "missileAlert", "missileAlertHeight", "commentExpandHeight", "userBlacklist", "alwaysNotify"] },
      { id: "moderation", title: "审核管理", keys: ["autoVerifyDelay", "splitScreenOnVerify", "itemListStylePreview", "itemListStyleFix", "keybindVerifyPass", "keybindVerifyRefund", "keybindVerifyReason", "fastUrge", "compactedVerifylist", "compactedVerifyEntry", "autoExpandPage", "multiDiffCompare"] },
    ]
  },
  {
    id: "cloud", label: "云端与更新",
    sections: [
      { id: "cloud", title: "云端服务", keys: ["useSupabase", "fetchCustomSplashes", "customSplashRate", "supabaseSplash", "supabaseByteChart"] },
      { id: "update", title: "更新检查", keys: ["autoCheckUpdate"] },
    ]
  },
  {
    id: "other", label: "其他",
    sections: [
      { id: "keybind", title: "快捷键", keys: ["keybindFastLink", "keybindFastSubmit"] },
    ]
  },
  {
    id: "data", label: "数据管理",
    sections: [
      { id: "data", title: "数据管理", keys: [] },
    ]
  },
];

const groups = computed<SettingsGroup[]>(() => {
  const visible = new Set(entries.value);
  const keepSection = (s: SettingsSection) => s.id === "data" || s.keys.some(k => visible.has(k));
  const list = GROUP_DEFS
    .map(g => ({
      ...g,
      sections: g.sections
        .map(s => ({ ...s, keys: s.keys.filter(k => visible.has(k)) }))
        .filter(keepSection)
    }))
    .filter(g => g.sections.length);
  const covered = new Set(list.flatMap(g => g.sections.flatMap(s => s.keys)));
  const rest = entries.value.filter(k => !covered.has(k));
  if (rest.length) {
    const other = list.find(g => g.id === "other");
    if (other) other.sections.push({ id: "other", title: "其他", keys: rest });
    else list.push({ id: "other", label: "其他", sections: [{ id: "other", title: "其他", keys: rest }] });
  }
  return list;
});

const activeGroup = ref(groups.value[0]?.id ?? "");
const open = ref(true);
const query = ref("");
const version = McmodderValues.mcmodderVersion;

const entriesMap = computed<Record<string, SettingsEntryLike>>(() => {
  const q = query.value.trim();
  const markStyle = q ? highlightMarkStyle() : "";
  const map: Record<string, SettingsEntryLike> = {};
  entries.value.forEach(key => {
    const data = cfgutils.data[key];
    const description = buildDescription(data);
    map[key] = {
      key,
      data,
      description,
      titleHtml: q ? highlightText(data.title, markStyle) : data.title,
      descriptionHtml: q ? highlightHtml(description, markStyle) : description
    };
  });
  return map;
});

function selectGroup(id: string) {
  activeGroup.value = id;
  query.value = "";
}

function matchesEntry(key: string) {
  const e = entriesMap.value[key];
  if (!e) return false;
  const q = query.value.trim().toLowerCase();
  return !q
    || key.toLowerCase().includes(q)
    || e.data.title.toLowerCase().includes(q)
    || e.description.toLowerCase().includes(q);
}

function sidebarCount(g: SettingsGroup) {
  if (!query.value.trim()) return g.sections.reduce((n, s) => n + s.keys.length, 0);
  return g.sections.reduce((n, s) => n + s.keys.filter(matchesEntry).length, 0);
}

const displayedGroups = computed<SettingsGroup[]>(() => {
  const q = query.value.trim();
  const markStyle = q ? highlightMarkStyle() : "";
  const filterSections = (g: SettingsGroup): SettingsGroup => ({
    ...g,
    sections: g.sections
      .map(s => ({ ...s, keys: s.keys.filter(matchesEntry), titleHtml: q ? highlightText(s.title, markStyle) : s.title }))
      .filter(s => s.id === "data" || s.keys.length)
  });
  if (query.value.trim()) return groups.value.map(filterSections).filter(g => g.sections.length);
  const cur = groups.value.find(g => g.id === activeGroup.value) ?? groups.value[0];
  return cur ? [cur] : [];
});

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const escapeHtml = (s: string) => s.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

function highlightMarkStyle() {
  const rs = getComputedStyle(document.documentElement);
  const bg = rs.getPropertyValue("--mcmodder-color-accent-transparent2").trim();
  const fg = rs.getPropertyValue("--mcmodder-color-accent").trim();
  return `background-color:${ bg || "rgba(172, 219, 236, .35)" };color:${ fg || "#58b6d8" };border-radius:2px;padding:0 1px`;
}

function highlightText(text: string, markStyle: string): string {
  const q = query.value.trim();
  if (!q) return text;
  return escapeHtml(text).replace(new RegExp(`(${ escapeHtml(escapeRegExp(q)) })`, "gi"), `<mark style="${ markStyle }">$1</mark>`);
}

function highlightHtml(html: string, markStyle: string): string {
  const q = query.value.trim();
  if (!q) return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  const lowerQ = q.toLowerCase();
  textNodes.forEach(t => {
    const parts = t.nodeValue?.split(new RegExp(`(${ escapeRegExp(q) })`, "i")) ?? [""];
    if (parts.length <= 1) return;
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      if (p && p.toLowerCase() === lowerQ) {
        const mark = document.createElement("mark");
        mark.setAttribute("style", markStyle);
        mark.textContent = p;
        frag.appendChild(mark);
      } else if (p) {
        frag.appendChild(document.createTextNode(p));
      }
    });
    t.parentNode?.replaceChild(frag, t);
  });
  return div.innerHTML;
}

function openModal() {
  open.value = true;
  document.body.style.overflow = "hidden";
}

function close() {
  open.value = false;
  query.value = "";
  document.body.style.overflow = "";
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

interface SettingsEntryLike {
  key: string;
  data: McmodderConfigData;
  description: string;
  titleHtml: string;
  descriptionHtml: string;
}

function getValue(key: string) {
  const value = get(key);
  if (value !== undefined) return value;
  const type = (cfgutils.data[key]?.type ?? McmodderInputType.CHECKBOX) as McmodderInputType;
  return cfgutils.data[key]?.value ?? McmodderConfigUtils.defaultValue[type];
}

function commitValue(key: string, value: any) {
  set(key, value);
}


const timerSlots = reactive<Record<string, HTMLElement | null>>({});
let updateTimer: McmodderTimer | undefined;

function checkUpdate() {
  parent.scheduleRequestUtils.run("autoCheckUpdate");
}

function refreshUpdateTimer() {
  if (!timerSlots.autoCheckUpdate) return;
  timerSlots.autoCheckUpdate.innerHTML = "";
  if (getValue("autoCheckUpdate")) {
    updateTimer = new McmodderTimer(
      parent,
      McmodderTimer.DATAGETTER_SCHEDULE("autoCheckUpdate", null, parent.scheduleRequestUtils)
    );
    updateTimer.$instance.appendTo(timerSlots.autoCheckUpdate);
  }
}


const authing = ref(false);
const syncing = ref(false);

const authState = reactive({
  uid: 0,
  name: "",
  key: ""
});

function refreshAuthState() {
  authState.uid = utils.getProfile("auth_uid");
  authState.name = utils.getProfile("auth_username");
  authState.key = utils.getProfile("auth_key");
}

const authUserClass = computed(() => (!authState.uid || !authState.name ? "text-muted" : "text-success"));
const authUserName = computed(() => (!authState.uid || !authState.name ? "?" : `${ authState.name } (UID:${ authState.uid })`));
const authStateClass = computed(() => {
  if (!authState.uid || !authState.name) return "text-danger";
  return authState.key ? "text-success" : "text-danger";
});
const authStateIcon = computed(() => (authStateClass.value === "text-success" ? "fa fa-check" : "fa fa-close"));

async function manualAuth() {
  authing.value = true;
  try {
    if (!parent.supabaseUtils.hasClient()) return;
    const resp = await parent.supabaseUtils.invoke<SupabaseAuthenticatorResponse>("authenticator", {
      body: { cookie: document.cookie }
    });
    if (!resp) return;
    utils.setProfile("auth_uid", resp.user_id);
    utils.setProfile("auth_username", resp.user_name);
    utils.setProfile("auth_key", resp.auth_key);
    refreshAuthState();
  } finally {
    authing.value = false;
  }
}

async function syncUpload() {
  const { value } = await swal.fire({
    type: "warning",
    title: "配置上传确认",
    text: `即将把本地的所有脚本配置数据保存在云端（包括脚本设置、已保存的用户信息和模板列表），便于同步到其他终端设备上。
      云端若已保存配置则会被覆盖，无法撤销。是否继续？`,
    showCancelButton: true,
    confirmButtonText: "确认",
    cancelButtonText: "取消"
  });
  if (!value) return;
  syncing.value = true;
  try {
    const resp = await parent.supabaseUtils.invoke<SupabaseSyncSettingsResponse>("sync_settings", {
      body: {
        auth_key: utils.getProfile("auth_key"),
        content: {
          mcmodder_settings: GM_getValue("mcmodderSettings"),
          user_profile: GM_getValue("userProfile"),
          template_list: GM_getValue("templateList"),
        }
      }
    });
    if (resp) {
      McmodderUtils.commonMsg("已将本地配置保存至云端~");
    }
  } finally {
    syncing.value = false;
  }
}

async function syncDownload() {
  const { value } = await swal.fire({
    type: "warning",
    title: "配置下载确认",
    text: `即将把云端所有已保存的脚本配置数据同步到本地（包括脚本设置、已保存的用户信息和模板列表）。
      本地配置将会与云端配置合并（模板则是全部覆盖），无法撤销。是否继续？`,
    showCancelButton: true,
    confirmButtonText: "确认",
    cancelButtonText: "取消"
  });
  if (!value) return;
  syncing.value = true;
  try {
    const resp = await parent.supabaseUtils.invoke<SupabaseSyncSettingsResponse>("sync_settings", {
      body: {
        auth_key: utils.getProfile("auth_key")
      }
    });
    if (resp) {
      let success = 0;
      if (resp.mcmodder_settings) {
        try {
          const obj1 = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
          const obj2 = JSON.parse(resp.mcmodder_settings);
          GM_setValue("mcmodderSettings", JSON.stringify(Object.assign({}, obj1, obj2)));
          success++;
        } catch (e) {
          McmodderUtils.commonMsg(String(e), false);
        }
      }
      if (resp.user_profile) {
        try {
          const obj1 = JSON.parse(GM_getValue("userProfile") || "{}");
          const obj2 = JSON.parse(resp.user_profile);
          GM_setValue("userProfile", JSON.stringify(Object.assign({}, obj1, obj2)));
          success++;
        } catch (e) {
          McmodderUtils.commonMsg(String(e), false);
        }
      }
      if (resp.template_list) {
        GM_setValue("templateList", resp.template_list);
        success++;
      }
      if (success > 0) {
        const interval = Date.now() - Date.parse(resp.last_modified);
        const formatted = McmodderUtils.getFormattedTime(interval);
        McmodderUtils.commonMsg(`已将 ${ formatted } 前保存在云端的 ${ success } 项配置同步到本地，刷新标签页以查看同步后的配置~`);
      } else {
        McmodderUtils.commonMsg("本地配置未发生变化...");
      }
    }
  } finally {
    syncing.value = false;
  }
}


function buildDescription(data: McmodderConfigData) {
  if (data.type === McmodderInputType.DROPDOWN_MENU) return data.description;
  const list: string[] = [];
  const val = data.value;
  if (val != null) {
    list.push(`默认：${
      typeof val === "boolean" ? (val ? "开启" : "关闭") :
      typeof val === "number" ? val.toLocaleString() :
      typeof val === "object" ? McmodderUtils.keyToString(val) : val
    }`);
  }
  const range = (data.range || [null, null]) as InputValueNumericRange;
  const l = range[0], r = range[1];
  const tl = l?.toLocaleString(), tr = r?.toLocaleString();
  if (l != null && r != null) list.push(`允许范围：${ tl } ~ ${ tr }`);
  else if (l != null) list.push(`最小值：${ tl }`);
  else if (r != null) list.push(`最大值：${ tr }`);
  const appendix = list.length ? `（${ list.join("；") }）` : "";
  return `${ data.description }${ appendix }`;
}


onMounted(() => {
  refreshAuthState();
  refreshUpdateTimer();
  window.addEventListener("keydown", onKeydown);
  document.addEventListener(OPEN_SETTINGS_EVENT, onOpenSettingsEvent);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  document.removeEventListener(OPEN_SETTINGS_EVENT, onOpenSettingsEvent);
  document.body.style.overflow = "";
});

function onOpenSettingsEvent() {
  openModal();
}

watch(
  () => getValue("autoCheckUpdate"),
  () => refreshUpdateTimer()
);

watch(
  () => open.value && activeGroup.value === "data",
  async visible => {
    if (!visible) return;
    await nextTick();
    mountDataManager();
  }
);


const dataContainer = useTemplateRef<HTMLElement>("dataContainer");
let dataManagers: McmodderConfigResourceInteractor<any>[] | null = null;

/** 管理器实例与实例内一次性绑定（数据与事件不随弹窗开关销毁） */
function ensureDataManagers() {
  if (dataManagers) return;

  const splashesManager = new McmodderConfigResourceInteractor<McmodderSplashData>(
    parent,
    "mcmodderSplashList_v2",
    "已记录的闪烁标语", {
      time: ["时间", (data: number) => data ? (new Date(data)).toLocaleString() : "未知"],
      content: "记录内容",
      num: ["次数", McmodderTable.DISPLAYRULE_NUMBER]
    },
    config => config?.split("\n") || [],
    (_, data) => {
      const list = data.split(",");
      return {
        time: Number(list[0]),
        content: list[1],
        num: Number(list[2])
      }
    }
  );
  dataManagers = [splashesManager,
  new McmodderConfigResourceInteractor<McmodderClassRelationData>(
    parent,
    "modDependences_v2",
    "已记录的模组前置信息", {
      id: ["模组编号", McmodderTable.DISPLAYRULE_LINK_CLASS],
      children: ["记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY]
    }, null, (key, item) => new Object({
      id: key,
      children: item
    })
  ),
  new McmodderConfigResourceInteractor<McmodderClassRelationData>(
    parent,
    "modExpansions_v2",
    "已记录的模组拓展信息", {
      id: ["模组编号", McmodderTable.DISPLAYRULE_LINK_CENTER],
      children: ["记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY],
    }, null, (key, item) => new Object({
      id: key,
      children: item
    })
  ),
  new McmodderConfigResourceInteractor<McmodderRankDisplayData>(
    parent,
    "rankdata",
    "已保存的贡献榜数据", {
      date: ["日期", McmodderTable.DISPLAYRULE_DATE_SEC_ZH],
      byteTop1: ["字数榜首", (rawData: string) => {
        const data = rawData.split(",") as unknown as [number, number, number];
        return `<a target="_blank" href="${ McmodderUtils.getCenterURL(data[0]) }">${ data[0] }</a> 
          (${ data[1].toLocaleString() } 字节, ${ (data[2] * 100).toFixed(1) }%)`;
      }],
      totalEdited: ["前 60 名总编辑字数", (data: number) => `${data.toLocaleString()} 字节`],
      size: ["数据大小", McmodderTable.DISPLAYRULE_SIZE]
    }, null, (key, item) => {
      let list = JSON.parse(item) as McmodderRankStorageData, sum = 0;
      list.forEach(user => sum += user.value);
      return {
        date: Number(key),
        byteTop1: [list[0].user, list[0].value, list[0].value / sum].join(","),
        totalEdited: sum,
        size: item.length
      };
    }
  ),
  new McmodderConfigResourceFileListInteractor(
    parent,
    "mcmodderJsonStorage",
    "已保存的物品 JSON 文件"
  ),
  new McmodderConfigResourceFileListInteractor(
    parent,
    "mcmodderRecipeJsonStorage",
    "已保存的合成表 JSON 文件"
  )];

  splashesManager.container.getHeader().click(_e => {
    const splashCompare = splashesManager.instance.find(`#${ Mcmodder.ID_SPLASH_COMPARE }`);
    if (splashCompare.length) {
      if (McmodderUtils.isNodeHidden(splashCompare)) splashCompare.show();
      else splashCompare.hide();
      return;
    }
    $(`<btn class="btn" id="${ Mcmodder.ID_SPLASH_COMPARE }">与公共标语库对比</btn>`)
    .appendTo(splashesManager.instance)
    .click(async e => {
      const button = $(e.currentTarget);
      McmodderUtils.setButtonLoadingState(button);
      await accessPublicSplashList(splashesManager);
      McmodderUtils.cancelButtonLoadingState(button);
    });
  });
}

/** 将管理器挂载到当前数据容器（弹窗每次开关、切换组都会重建容器 DOM） */
function mountDataManager() {
  const container = dataContainer.value;
  if (!container) return;
  ensureDataManagers();
  if (!dataManagers) return;

  const $container = $(container);
  $container.empty();
  $container.append(`<div class="center-block-head">
    <span class="title">资源管理</span>
    <span style="font-size: 12px; color: gray; margin-left: 1em;">轻触各项可展开详情~</span>
  </div>
  <div class="center-content mcmodder-storage">
    <ul></ul>
  </div>`);

  const storages = $container.find(".mcmodder-storage ul");
  dataManagers.forEach(manager => {
    const li = $("<li>").appendTo(storages);
    manager.instance.appendTo(li);
  });

  $container.append(`<div class="center-setting-block" style="margin-top: 2em;">
    <h4 style="margin-bottom: 0.5em; font-weight: bold;">投稿自定义闪烁标语</h4>
    <p class="text-muted" style="margin-bottom: 0.8em; font-size: 13px;">已登录用户可投稿标语至云端。投稿需经脚本管理员审核过审后方可被其它脚本用户抓取显示。</p>
    <div class="setting-item" style="display: flex; gap: 8px; align-items: center;">
      <input type="text" id="mcmodder-custom-splash-input" class="form-control" placeholder="输入自定义闪烁标语内容..." style="max-width: 400px; display: inline-block;">
      <button class="btn btn-primary" id="mcmodder-custom-splash-submit">提交投稿</button>
    </div>
  </div>`);
  $container.find("#mcmodder-custom-splash-submit")
  .click(async e => {
    const button = $(e.currentTarget);
    const input = $container.find("#mcmodder-custom-splash-input");
    const content = String(input.val() || "").trim();

    if (!content) {
      McmodderUtils.commonMsg("标语内容不能为空！", false);
      return;
    }

    if (!parent.currentUID) {
      McmodderUtils.commonMsg("请先登录 MC百科 账号后再发起投稿！", false);
      return;
    }

    const authKey = utils.getProfile("auth_key");
    if (!authKey) {
      McmodderUtils.commonMsg("未获取到登录校验 Key，请重新登录！", false);
      return;
    }

    McmodderUtils.setButtonLoadingState(button);
    const res = await parent.supabaseUtils.uploadCustomSplash(content, authKey);
    McmodderUtils.cancelButtonLoadingState(button);

    if (res && res.message) {
      McmodderUtils.commonMsg(res.message);
      input.val("");
    }
  });

  $container.append(`<div class="center-setting-block" style="margin-top: 2em;">
    <div class="setting-item">
      <button class="btn">清除当前所有计划任务</button>
    </div>
    <p class="text-muted">这在某些时候很有用——也许吧？</p>
  </div>`);
  $container.find(".center-setting-block .btn").last().click(() => {
    emptyScheduleRequest();
  });
}

async function accessPublicSplashList(manager: McmodderConfigResourceInteractor<McmodderSplashData>) {
  const data = manager.table.getAllData().map(data => data.content).filter(data => data) as string[];
  if (!data.length) {
    McmodderUtils.commonMsg("还没有记录任何标语呢... 用“闪烁标语追踪器”记录一些标语后再试试？");
    return;
  }
  const resp = await utils.createRequest({
    url: Mcmodder.URL_PUBLIC_SPLASH_LIST_RAW,
    method: "GET",
    timeout: 5e3
  });
  if (resp?.status === 200) return performSplashCompare(resp.responseText, data);
  const resp2 = await utils.createRequest({
    url: Mcmodder.URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW,
    method: "GET",
    timeout: 5e3
  });
  if (resp2?.status === 200) return performSplashCompare(resp2.responseText, data);
  McmodderUtils.commonMsg("公共标语库加载失败，请检查网络连接~", false);
}

function performSplashCompare(_publicList: string, localList: string[]) {
  const publicList: string[] = JSON.parse(_publicList);
  let unique: string[] = [], flag;
  localList.forEach(e => {
    if (!e) return;
    e = e.toString().replace(parent.currentUsername, "%s");
    flag = true;
    publicList.forEach(f => {
      if (e === f) flag = false;
    });
    if (flag) unique.push(e);
  });
  const footer = `<a target="_blank" href="${ Mcmodder.URL_PUBLIC_SPLASH_LIST }">在 GitHub 查看公共标语库</a>`;
  if (unique.length) {
    swal.fire({
      type: "info",
      title: "对比完毕",
      html: `
        本地有 ${unique.length.toLocaleString()} 条标语尚未被公共标语库收录！<br>
        检查确认无误后，您可以通过任意方式与作者取得联系来更新完善我们的公共标语库~<br>
        未收录的标语如下：
        <textarea id="mcmodder-unique-splashes" class="form-control mcmodder-monospace">`,
      footer: footer
    });
    $("#mcmodder-unique-splashes").val(JSON.stringify(unique, null, 2));
  }
  else swal.fire({
    type: "success",
    title: "对比完毕",
    text: "本地所有标语均已被公共标语库收录~",
    footer: footer
  });
}

function emptyScheduleRequest() {
  const list = parent.scheduleRequestUtils.get();
  if (list.length) {
    parent.scheduleRequestUtils.empty();
    McmodderUtils.commonMsg(`${ list.length.toLocaleString() } 项计划任务已被清除~`);
  } else {
    McmodderUtils.commonMsg("当前没有计划任务~");
  }
}
</script>

<style scoped>
.mcmodder-settings-panel {
  font-size: 14px;
  color: var(--mcmodder-color-text);
  line-height: 1.7;
}
.mcmodder-settings-panel .btn {
  display: inline-block;
  padding: 6px 14px;
  font-size: 14px;
  line-height: 1.428;
  border-radius: calc(var(--mcmodder-width-radius) * .8);
  border: 1px solid var(--mcmodder-color-background-dark3);
  background: linear-gradient(45deg, var(--mcmodder-color-primary-light), var(--mcmodder-color-accent-light));
  color: var(--mcmodder-color-text);
  cursor: var(--mcmodder-cursor-hand);
  white-space: nowrap;
}
.mcmodder-settings-panel .btn:hover {
  background-color: var(--mcmodder-color-accent-background);
  background-image: none;
}
.mcmodder-settings-panel .btn:active {
  background-color: var(--mcmodder-color-accent-transparent2);
  background-image: none;
}
.mcmodder-settings-panel .btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.btn-accent {
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent)) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 2px 8px var(--mcmodder-color-primary-transparent1);
}
.btn-accent:hover {
  background-color: var(--mcmodder-color-accent-dark1) !important;
  background-image: none !important;
}

.mcmodder-settings-modal {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity .18s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-pop-enter-active {
  transition: opacity .22s ease, transform .22s cubic-bezier(.34, 1.2, .5, 1);
}
.modal-pop-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.modal-pop-enter-from,
.modal-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(.96);
}
.mcmodder-hl {
  background-color: var(--mcmodder-color-accent-transparent2);
  color: var(--mcmodder-color-accent);
  border-radius: 2px;
  padding: 0 1px;
}
.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .45);
}
.modal-window {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(980px, 94vw);
  height: min(760px, 88vh);
  display: flex;
  flex-direction: column;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark2);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, .35);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--mcmodder-color-background-dark2);
  background-color: var(--mcmodder-color-background-dark1);
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}
.modal-version {
  font-size: 12px;
  font-weight: 400;
  color: var(--mcmodder-color-text-dark3);
  margin-left: .4em;
}
.modal-search {
  position: relative;
  flex: 1;
  max-width: 380px;
  margin: 0 auto;
}
.modal-search > i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--mcmodder-color-text-dark3);
  font-size: 13px;
  pointer-events: none;
}
.modal-search input {
  width: 100%;
  height: 32px;
  padding: 4px 28px 4px 30px;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  color: var(--mcmodder-color-text);
  font-size: 13.5px;
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.modal-search input:focus {
  border-color: var(--mcmodder-color-accent);
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
}
.search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--mcmodder-color-text-dark3);
  font-size: 16px;
  line-height: 1;
  cursor: var(--mcmodder-cursor-hand);
}
.search-clear:hover {
  background-color: var(--mcmodder-color-background-dark2);
  color: var(--mcmodder-color-text);
}
.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--mcmodder-color-text-dark3);
  font-size: 20px;
  line-height: 1;
  cursor: var(--mcmodder-cursor-hand);
  flex: none;
}
.modal-close:hover {
  background-color: var(--mcmodder-color-background-dark2);
  color: var(--mcmodder-color-text);
}
.modal-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.modal-sidebar {
  width: 190px;
  flex: none;
  overflow-y: auto;
  padding: 12px 10px;
  border-right: 1px solid var(--mcmodder-color-background-dark2);
  background-color: var(--mcmodder-color-background-dark1);
}
.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  margin-bottom: 2px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--mcmodder-color-text);
  font-size: 13.5px;
  text-align: left;
  cursor: var(--mcmodder-cursor-hand);
  transition: background-color .15s ease, color .15s ease;
}
.sidebar-item:hover {
  background-color: var(--mcmodder-color-background-dark2);
}
.sidebar-item.active {
  background: linear-gradient(45deg, var(--mcmodder-color-primary-transparent1), var(--mcmodder-color-accent-transparent2));
  color: var(--mcmodder-color-accent);
  font-weight: 600;
}
.sidebar-count {
  font-size: 11.5px;
  color: var(--mcmodder-color-text-dark3);
  background-color: var(--mcmodder-color-background-dark2);
  border-radius: 8px;
  padding: 1px 7px;
  flex: none;
}
.sidebar-item.active .sidebar-count {
  background-color: var(--mcmodder-color-accent-transparent2);
  color: var(--mcmodder-color-accent);
}
.modal-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px 20px 24px;
}
.group-block {
  margin-bottom: 16px;
}
.group-block:last-child {
  margin-bottom: 0;
}
.group-heading {
  margin: 0 0 8px 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mcmodder-color-text-dark3);
}
.group-card {
  background-color: var(--mcmodder-color-background-dark1);
  border: 1px solid var(--mcmodder-color-background-dark2);
  border-radius: 14px;
  padding: 4px 18px 10px;
}
.group-block .group-card + .group-card {
  margin-top: 12px;
}
.group-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .4em .8em;
  padding: 10px 0 6px;
}
.group-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1em 1.5em;
  flex-wrap: wrap;
  padding: 10px 0;
  border-top: 1px solid var(--mcmodder-color-background-dark2);
}
.setting-info {
  flex: 1 1 46%;
  min-width: 260px;
}
.setting-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .4em .8em;
}
.setting-info > .title,
.setting-title-row > .title {
  font-weight: 600;
  font-size: 14.5px;
  white-space: normal;
}
.setting-control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .5em .8em;
  flex: 0 1 auto;
  min-width: 260px;
}
.setting-control .btn {
  margin: 0;
}
.text-muted {
  color: var(--mcmodder-color-text-dark3);
  font-size: 13px;
  margin: .35em 0 0 0;
  line-height: 1.7;
}
.mcmodder-auth-user {
  font-size: 13px;
}
.mcmodder-auth-state {
  font-size: 14px;
}
.supabase-sync-block {
  margin-top: 8px;
  padding: 12px 0 6px;
  border-top: 1px dashed var(--mcmodder-color-background-dark3);
}
.supabase-sync-hint {
  display: block;
  margin-bottom: .6em;
  font-size: 12.5px;
  color: var(--mcmodder-color-text-dark3);
}
.supabase-sync-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: .6em;
}
.supabase-sync-buttons .btn {
  margin: 0;
}
.supabase-sync-buttons .btn i {
  margin-right: .4em;
  color: var(--mcmodder-color-accent-dark1);
}
.mcmodder-settings-timer-slot {
  display: inline-block;
  margin-left: .5em;
}
.no-result {
  padding: 48px 0;
  text-align: center;
  color: var(--mcmodder-color-text-dark3);
  font-size: 13.5px;
}
</style>

<style>
/* 数据管理：资源管理器由 jQuery 生成 DOM（无 data-v 属性），scoped 样式
   无法命中，需以非 scoped 形式注入（vite 构建时统一标记并由 syncVueStyles
   复制进 Shadow Root）。 */
.data-manager .mcmodder-collapsible-container {
  border: 1px solid var(--mcmodder-color-primary);
  border-radius: var(--mcmodder-width-radius);
  margin: .5em 0;
}
.data-manager .mcmodder-collapsible-header {
  position: relative;
  padding: var(--mcmodder-width-padding-2);
  border-radius: var(--mcmodder-width-radius);
  background-image: linear-gradient(45deg, var(--mcmodder-color-primary-background), var(--mcmodder-color-accent-background));
  cursor: var(--mcmodder-cursor-hand);
  user-select: none;
}
.data-manager .mcmodder-collapsible-container.expanded .mcmodder-collapsible-header {
  border-radius: var(--mcmodder-width-radius) var(--mcmodder-width-radius) 0 0;
}
.data-manager .mcmodder-collapsible-header::after {
  position: absolute;
  content: "\f0d7";
  font-family: "FontAwesome";
  right: var(--mcmodder-width-padding-2);
  transition: transform .3s;
}
.data-manager .mcmodder-collapsible-container.expanded .mcmodder-collapsible-header::after {
  transform: rotate(-180deg);
}
.data-manager .mcmodder-collapsible-header:hover {
  background-image: none;
  background-color: var(--mcmodder-color-background);
}
.data-manager .mcmodder-collapsible-content {
  display: none;
}
.data-manager .mcmodder-collapsible-container.expanded .mcmodder-collapsible-content {
  display: inherit;
  padding: var(--mcmodder-width-padding-2);
  border-top: 1px solid var(--mcmodder-color-primary-transparent1);
}
.data-manager .mcmodder-collapsible-content > * {
  transition: opacity .3s;
  opacity: 0;
}
.data-manager .mcmodder-collapsible-container.expanded .mcmodder-collapsible-content > * {
  opacity: 1;
}
.data-manager .mcmodder-storage {
  margin-top: .5em;
}
.data-manager .mcmodder-storage ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.data-manager .mcmodder-storage ul > li {
  margin: 0 0 .3em;
}
.data-manager .mcmodder-table-container {
  position: relative;
  min-height: 150px;
}
.data-manager .mcmodder-table-loading-overlay {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: var(--mcmodder-color-background-transparent);
  opacity: 1;
  transition: opacity 0.8s ease-in-out 0s;
  z-index: 1;
}
.data-manager .mcmodder-table-loading-overlay.faded {
  opacity: 0;
}
.data-manager .mcmodder-table-loading-container {
  height: 100%;
  max-height: 300px;
  position: relative;
}
.data-manager .mcmodder-table-loading-progress {
  position: absolute;
  width: 16em;
  left: calc(50% - 8em);
  bottom: calc(50% - 5em);
}
.data-manager .mcmodder-table {
  width: 100%;
  margin-top: 0;
  background-color: var(--mcmodder-color-background-transparent);
  overflow: hidden;
  border-collapse: collapse;
}
.data-manager .mcmodder-table-empty {
  height: 100px;
  min-height: 100px;
  position: relative;
}
.data-manager .mcmodder-table-empty::before {
  content: "暂无数据";
  text-wrap: nowrap;
  position: absolute;
  width: 100%;
  line-height: 100px;
  color: var(--mcmodder-color-text-dark3);
  text-align: center;
}
.data-manager .mcmodder-table tbody {
  white-space: nowrap;
  overflow: hidden;
}
.data-manager .mcmodder-table thead {
  height: 1em;
}
.data-manager .mcmodder-table td,
.data-manager .mcmodder-table th {
  border: 1px solid var(--mcmodder-color-background-dark2);
  text-align: center;
  max-width: 500px;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: .3em .6em;
}
.data-manager .mcmodder-table tr:not(.mcmodder-table-empty):nth-child(2n) {
  background-color: var(--mcmodder-color-background);
}
.data-manager .mcmodder-table tr:not(.mcmodder-table-empty):nth-child(2n+1) {
  background-color: var(--mcmodder-color-primary-background);
}
.data-manager .mcmodder-table-margin-top,
.data-manager .mcmodder-table-margin-bottom {
  height: 0;
}
.data-manager .mcmodder-table-loading-overlay .mcmodder-table-loading-container::before {
  content: "加载中...";
  color: var(--mcmodder-color-text-dark3);
}
.data-manager .btn {
  display: inline-block;
  padding: 6px 14px;
  font-size: 14px;
  line-height: 1.428;
  border-radius: calc(var(--mcmodder-width-radius) * .8);
  border: 1px solid var(--mcmodder-color-background-dark3);
  background: linear-gradient(45deg, var(--mcmodder-color-primary-light), var(--mcmodder-color-accent-light));
  color: var(--mcmodder-color-text);
  cursor: var(--mcmodder-cursor-hand);
  white-space: nowrap;
  margin: 0;
}
.data-manager .btn:hover {
  background-color: var(--mcmodder-color-accent-background);
  background-image: none;
}
.data-manager .btn:active {
  background-color: var(--mcmodder-color-accent-transparent2);
  background-image: none;
}
.data-manager .btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.data-manager .btn-primary {
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent));
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 8px var(--mcmodder-color-primary-transparent1);
}
.data-manager .btn-primary:hover {
  background-color: var(--mcmodder-color-accent-dark1);
  background-image: none;
  color: #fff;
}
.data-manager .form-control {
  display: inline-block;
  height: 34px;
  padding: 6px 12px;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 10px;
  color: var(--mcmodder-color-text);
  font-size: 14px;
  line-height: 1.428;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.data-manager .form-control:focus {
  border-color: var(--mcmodder-color-accent);
  box-shadow: 0 0 0 .2em var(--mcmodder-color-accent-transparent2);
  outline: none;
}
.data-manager .center-block-head {
  display: flex;
  align-items: baseline;
  gap: 1em;
  margin: .5em 0;
}
.data-manager .center-block-head .title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--mcmodder-color-text);
}
.data-manager .center-content.mcmodder-storage {
  margin-top: .5em;
}
.data-manager .text-muted {
  color: var(--mcmodder-color-text-dark3);
  font-size: 13px;
  line-height: 1.7;
}
.data-manager .center-setting-block h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--mcmodder-color-text);
}
.data-manager .center-setting-block {
  background-color: var(--mcmodder-color-background-dark1);
  border: 1px solid var(--mcmodder-color-background-dark2);
  border-radius: 14px;
  padding: 12px 16px;
}
</style>
