<template>
  <div class="edit-autolink-frame">
    <form>
      <div class="input-group edit-autolink-search">
        <input
          ref="keyInput"
          class="form-control"
          name="key"
          value=""
          placeholder="搜索模组与资料.."
          maxlength="255"
          autocomplete="off"
          @click="onInputClick"
          @keydown="onKeydown"
        />
        <button
          ref="submitButton"
          class="btn btn-dark"
          type="submit"
          :class="{ disabled: isPending }"
          :disabled="isPending"
          @click="onSearchButtonClick"
        >
          搜索
        </button>
      </div>
    </form>
    <p class="tips">
      可用空格分割多个关键词，如“工业 电路”、“原版 甘蔗”等，最多
      {{ AUTOLINK_KEYWORD_MAXLENGTH.toLocaleString() }}
      个关键词。
    </p>
    <div v-show="showResultFrame" ref="resultFrame" class="edit-autolink-list">
      <ul v-show="!isPending">
        <li v-if="searchResultEntries.length === 0" class="empty">
          没有找到与“ {{ searchText }} ”有关的内容。
        </li>
        <div v-else class="title">搜索结果:</div>
        <li
          v-for="(entry, index) in searchResultEntries"
          :key="entry.data.id"
          :class="getOptionClassList(index, entry.searchTag)"
        >
          <AutoLinkClassOption
            v-if="entry.type === 'class' || entry.type === 'modpack'"
            :parent="parent"
            :entry="entry"
            :index="index"
            @click="onClick"
          />
          <AutoLinkItemOption
            v-else-if="entry.type === 'item'"
            :parent="parent"
            :entry="entry"
            :index="index"
            @click="onClick"
          />
          <AutoLinkAuthorOption
            v-else-if="entry.type === 'author'"
            :parent="parent"
            :entry="entry"
            :index="index"
            @click="onClick"
          />
          <AutoLinkOredictOption
            v-else-if="entry.type === 'oredict'"
            :parent="parent"
            :entry="entry"
            :index="index"
            @click="onClick"
          />
        </li>
      </ul>
      <div v-show="isPending" class="mcmodder-loading-container">
        <div class="mcmodder-loading" />
      </div>
    </div>
    <div v-show="showResultFrame" class="title">链接文本:</div>
    <div v-show="showResultFrame" class="edit-autolink-style">
      <template v-for="(text, index) in styles" :key="index">
        <div v-show="!(index === 0 && shouldHideSelectedContentStyle)" class="radio">
          <input
            :id="`edit-autolink-style-text-${index}`"
            v-model.number="style"
            name="edit-autolink-style-text"
            :value="index"
            type="radio"
          />
          <label :for="`edit-autolink-style-text-${index}`">{{ text }}</label>
        </div>
      </template>
      <br />
      <CheckboxInput
        id="edit-autolink-style-space"
        ref="insertSpace"
        title="在链接前后加空格"
        with-label
        :value="configs.getSettings('autolinkStyleSpace') ?? false"
        :on-successful-change="(info) => configs.setSettings('autolinkStyleSpace', info.final)"
      />
    </div>
    <div v-show="localItemCount" class="edit-autolink-source">
      <CheckboxInput
        id="edit-autolink-source-local"
        ref="sourceInputLocal"
        title="本地搜索"
        with-label
        :value="configs.getSettings('autolinkSourceLocal') ?? false"
        :on-successful-change="(info) => configs.setSettings('autolinkSourceLocal', info.final)"
      />
      <CheckboxInput
        id="edit-autolink-source-online"
        ref="sourceInputOnline"
        title="联机搜索"
        with-label
        :value="configs.getSettings('autolinkSourceOnline') ?? false"
        :on-successful-change="(info) => configs.setSettings('autolinkSourceOnline', info.final)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 自动链接弹窗组件：对百科原生编辑器「自动链接」功能的全面重写。
 *
 * # 功能
 * 根据用户选中的内容或手动输入的关键词，生成指向百科内相应资料的链接文本插入编辑器。
 * 搜索支持两种来源（由底部「本地搜索 / 联机搜索」复选框控制，对应配置
 * `autolinkSourceLocal` / `autolinkSourceOnline`）：
 *
 * - **联机搜索**：POST `/object/UEAutolink/`，效果与接口都和原生功能几乎完全一致，
 *   结果可包含模组、整合包、个人作者、开发团队等类型；
 * - **本地搜索**：在 `itemRepository`（GM Storage / IndexedDB 两种形态，见
 *   `jsonframe/repository/`）导入的条目上按关键词打分筛选，只包含物品条目
 *   （模组、整合包、个人作者与开发团队不会出现，这些只在联机搜索时返回）。
 *
 * # 交互改进（相比原生）
 * - 方向键 ↑/↓ 与 Alt+数字 快捷键选择结果；
 * - 等待后端返回期间展示「加载中」动画（isPending）；
 * - 更智能的推荐算法（见 `evaluateKeywords` / `evaluateItemMatchRate`）：
 *   按多个字段加权打分，与当前正在编辑资料同模组（isModMatches）、为前置/附属模组
 *   （isModDependenceMatches / isModExpansionMatches）或原版物品（isModVanilla）的条目得分更高。
 */
import { computed, ref, shallowRef, triggerRef, useTemplateRef, watch } from "vue";
import { Mcmodder } from "../../Mcmodder";
import CheckboxInput from "./input/CheckboxInput.vue";
import { Utils } from "../../Utils.ts";
import { Values } from "../../Values.ts";
import AutoLinkItemOption from "./autolink/AutoLinkItemOption.vue";
import AutoLinkAuthorOption from "./autolink/AutoLinkAuthorOption.vue";
import AutoLinkOredictOption from "./autolink/AutoLinkOredictOption.vue";
import AutoLinkClassOption from "./autolink/AutoLinkClassOption.vue";
import { ItemIDBRepository } from "../../jsonframe/repository/ItemIDBRepository.ts";
import type { ItemRepository } from "../../jsonframe/repository/ItemRepository.ts";
import { ItemGMStorageRepository } from "../../jsonframe/repository/ItemGMStorageRepository.ts";
import Pinyin from "pinyin-match";

/** 允许手动输入的关键词数量上限（空格分隔） */
const AUTOLINK_KEYWORD_MAXLENGTH = 10;

/** 链接文本的三种样式选项（对应 `style` 的 0/1/2） */
const styles = ["选中的文本", "一半名称 (仅主要名称)", "完整名称 (主要名称+次要名称)"] as const;

interface Props {
  editor: any;
}

const { editor } = defineProps<Props>();
/** 宿主编译器实例上的组合根（因挂载时机晚于注入，用 shallowRef 承接） */
const parent = shallowRef<Mcmodder>(editor.parent);
const configs = computed(() => parent.value.configRepository);

/** 本地条目仓储：按 `itemRepository` 配置选用 IndexedDB（数值主键）或 GM Storage（字符串主键）形态 */
const itemRepository = computed<ItemRepository<number | string>>(() => {
  const repo = configs.value.getSettings("itemRepository")
    ? new ItemIDBRepository()
    : new ItemGMStorageRepository(configs.value);
  repo.init();
  return repo;
});

/** 本地库读出的全部物品条目（跨文件合并、过滤掉无 id 的条目） */
const localItems = shallowRef<Item[]>([]);

/** 当前 JSON 数据库文件登记表（`{ 0: GM 存储的文件名, 1: IndexedDB 的文件名 }`） */
const jsonDatabase = configs.value.getSettingsRef("jsonDatabase_v2");

/** 当前选用的仓储形态（与 `itemRepository` 配置联动的响应式副本） */
const repoIndex = configs.value.getSettingsRef("itemRepository", 0 as 0 | 1);

/** 当前仓储形态下的文件名列表 */
const linkings = computed(() => {
  if (jsonDatabase.value === undefined) {
    return [];
  }
  const files = jsonDatabase.value[repoIndex.value];
  return files ?? [];
});

// 监听文件名列表变化：逐个文件读取检索面并合并进 localItems（immediate 保证初次即加载）
watch(
  () => linkings.value,
  async (files) => {
    const allItems = await Promise.all(
      files.map((filename) => itemRepository.value.readSearchText(filename)),
    );
    allItems.forEach((items) => localItems.value.push(...items.filter((item) => item.id)));
    localItemCount.value = localItems.value.length;
    triggerRef(localItems);
  },
  {
    immediate: true,
  },
);

/** 本地库条目总数；为 0 时强制走联机搜索 */
const localItemCount = ref(0);

const keyInput = useTemplateRef("keyInput");
const submitButton = useTemplateRef("submitButton");
const insertSpace = useTemplateRef("insertSpace");
const sourceInputLocal = useTemplateRef("sourceInputLocal");
const sourceInputOnline = useTemplateRef("sourceInputOnline");
const resultFrame = useTemplateRef("resultFrame");

/**
 * 链接文本样式（0/1/2，对应 `styles`）。
 * 当无选中文本时（shouldHideSelectedContentStyle），「选中的文本」样式不可用，
 * 此时读取并回退到用户偏好 `preferredAutolinkStyle`（仅接受 1/2）。
 */
const style = computed({
  get: () => {
    if (shouldHideSelectedContentStyle.value) {
      const config = Number(configs.value.getSettings("preferredAutolinkStyle"));
      if (config !== 1 && config !== 2) {
        return 1;
      }
      return config;
    }
    return 0;
  },
  set: (newValue) => {
    if (newValue === 1 || newValue === 2) {
      configs.value.setSettings("preferredAutolinkStyle", newValue);
    }
  },
});
/** 当前高亮的候选项下标（-1 表示未选中） */
const selected = ref(-1);
/** 是否正在等待搜索请求返回（模板据此展示「加载中」动画） */
const isPending = ref(false);
// const enableSearchSourceSettings = ref(false);
/** 无选中文本时隐藏「选中的文本」这一样式项，并回退到 `preferredAutolinkStyle` */
const shouldHideSelectedContentStyle = ref(true);
/** 可展示的搜索结果列表 */
const searchResultEntries = shallowRef<AutoLinkEntries>([]);

/** Alt+数字 快捷跳转的防抖标记，避免连击 */
let shortcutPending = false;

/** 结果框是否显示：有搜索词或有结果时显示 */
const showResultFrame = computed(() => {
  return searchKeywords.value.length || searchResultEntries.value.length;
});

/** 搜索框原文（未分词） */
const searchText = ref("");
/** 按空格切分后的关键词数组（封顶 `AUTOLINK_KEYWORD_MAXLENGTH` 个） */
const searchKeywords = shallowRef<string[]>([]);

// 从页面导航读取当前正在编辑资料所属模组的全名，并解析出名称/英文名，
// 供本地搜索时判断「同模组」加权
const pageClassFullName = $(".common-nav li").eq(4).text().trim();
const { className: pageClassName, classEname: pageClassEname } =
  Utils.parseClassFullName(pageClassFullName);

watch(
  () => editor,
  () => (parent.value = editor.parent),
);
watch(
  () => searchResultEntries.value,
  () => (shouldHideSelectedContentStyle.value = !getEditorSelectedContent()),
);

function onSearchButtonClick(e: Event) {
  e.preventDefault();
  onSearch();
}

/**
 * 点击某条搜索结果：按当前样式拼出链接文本（可带前后空格），插入编辑器并关闭弹窗
 *
 * @param type 条目类型
 * @param id 条目编号
 * @param textHalf 条目的一半名称，在模式为“一半名称”时作为最终结果插入编辑器
 * @param textFull 条目的完整名称，在模式为“完整名称”时作为最终结果插入编辑器
 */
function onClick(type: AutoLinkEntryType, id: string, textHalf: string, textFull: string) {
  const appendSpace = insertSpace.value!.getValue();
  let content;
  switch (style.value) {
    case 0:
      content = getEditorSelectedContent().textContent;
      break;
    case 1:
      content = textHalf;
      break;
    case 2:
      content = textFull;
      break;
  }
  swal.close();

  let link: string;
  if (type === "oredict") link = `${parent.value.hostname}/${type}/${id}-1.html`;
  else link = `${parent.value.hostname}/${type}/${id}.html`;

  let res = `<a href="${link}" target="_blank" title="${content}">${content}</a>`;
  if (appendSpace) res = `&nbsp;${res}&nbsp;`;
  editor.editor.execCommand("insertHtml", res);
}

function onInputClick() {
  selected.value = -1;
}

/**
 * 搜索框键盘交互：
 * - ↑/↓：循环移动高亮候选项；
 * - Enter：未高亮时触发「搜索」按钮，已高亮时点击当前候选项；
 * - Alt+0~9（候选项 ≤10 时显示）：高亮并延迟 200ms 触发对应项（配 `shortcutPending` 防抖）。
 *
 * @param e 键盘事件
 */
function onKeydown(e: KeyboardEvent) {
  const code = e.key;
  if (code === "ArrowUp") {
    e.preventDefault();
    selected.value--;
    if (selected.value < -1) {
      selected.value = searchResultEntries.value.length - 1;
    }
    return;
  } else if (code === "ArrowDown") {
    e.preventDefault();
    selected.value++;
    if (selected.value >= searchResultEntries.value.length) {
      selected.value = -1;
    }
    return;
  } else if (code === "Enter") {
    e.preventDefault();
    if (selected.value === -1) {
      submitButton.value!.click();
    } else {
      ($(resultFrame.value!).find(".selected a").get(0) as HTMLAnchorElement).click();
    }
    return;
  }
  if (!e.altKey || !searchResultEntries.value.length || shortcutPending) return;
  if (code.length !== 1) return;
  const num = code.charCodeAt(0) - 48;
  if (num < 0 || num > 9) return;
  e.preventDefault();
  const target = $(resultFrame.value!).find(`[data-shortcut-num=${num}]`);
  Utils.highlight(target, "greenyellow");
  shortcutPending = true;
  setTimeout(() => {
    target.click();
    shortcutPending = false;
  }, 200);
}

/** 取编辑器当前选中的内容片段 */
function getEditorSelectedContent() {
  return editor.editor.selection.getRange().cloneContents();
}

/** 读取搜索框输入，切分成关键词数组后发起搜索；完成/出错都会复位 isPending */
function onSearch() {
  searchText.value = keyInput.value!.value.trim();
  searchKeywords.value = searchText.value
    .split(/\s+/)
    .slice(0, AUTOLINK_KEYWORD_MAXLENGTH)
    .filter((e) => e); // 原生最大长度为4
  performSearch()
    .catch((e) => {
      Utils.commonMsg(e, false);
    })
    .finally(() => {
      isPending.value = false;
    });
}

/** 本地搜索：对全部本地物品条目按关键词打分，返回条目数组（只在有本地库时调用） */
async function performLocalSearch() {
  return localItems.value.map((item) =>
    evaluateItemMatchRate(item, undefined, searchKeywords.value),
  );
}

/** 联机搜索：POST `/object/UEAutolink/`，解析返回的 HTML 列表为条目数组；后端报错时提示并返回空 */
async function performOnlineSearch() {
  let resp = await parent.value.utils.createRequest({
    url: `${parent.value.hostname}/object/UEAutolink/`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Origin: parent.value.hostname,
      Referer: parent.value.href,
      Priority: "u=0",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
    data: $.param({
      classID: nClassID,
      key: searchText.value,
    }),
  });
  let data = JSON.parse(resp.responseText);
  if (data.state) {
    Utils.commonMsg(Values.errorMessage[data.state], false);
    return [];
  }
  return parseOnlineSearchResult(data.html);
}

/**
 * 解析联机结果中的物品条目：从 `<img>` + `<a>` 还原 Item 字段，并按关键词打分
 *
 * @param index 该元素在联机结果中的出现次序
 * @param element 元素自身
 * */
function parseOnlineSearchItemResult(
  index: number,
  element: Element,
): AutoLinkItemEntry | undefined {
  const img = element.childNodes.item(0);
  const link = element.childNodes.item(1) as HTMLAnchorElement;
  if (!(img && link)) return;

  const dataType = link.dataset.type;
  if (dataType !== "item") return; // TODO: 支持其他类型的搜索结果

  const id = Number(link.dataset.id);
  const name = link.dataset.textHalf || "";
  const ename = name ? link.dataset.textFull?.slice(name.length + 2, -1) : undefined;

  let splitIndexOf = link.textContent.indexOf(" - ");
  const creativeTabName = link.textContent.slice(0, splitIndexOf);

  splitIndexOf = 0;
  const nameIndexOf = link.title.indexOf(name);
  const classTextFull = link.title.slice(nameIndexOf + name.length).split(" - ")[1];
  let className, classEname, classAbbr;
  if (classTextFull.charAt(0) === "[") {
    splitIndexOf = classTextFull.indexOf("]");
    classAbbr = classTextFull.slice(1, splitIndexOf);
    className = classTextFull.slice(splitIndexOf + 2);
  } else className = classTextFull;
  splitIndexOf = className.lastIndexOf(" (");
  if (splitIndexOf !== -1) {
    classEname = className.slice(splitIndexOf + 2, -1);
    className = className.slice(0, splitIndexOf);
  }

  const classID = Number(parent.value.utils.getClassIDByClassName(classTextFull));
  const typeName = link.title.split(" - ")[0];
  let typeID = 0;
  const matchedTypeList = parent.value.itemTypeList?.filter(
    (entry) => (entry.classID === classID || entry.classID === 0) && entry.text === typeName,
  );
  if (matchedTypeList && matchedTypeList.length) {
    typeID = matchedTypeList[0].typeID;
  }

  const item: Item = {
    id: id,
    itemType: typeID,
    name: name,
    englishName: ename,
    classID: classID,
    classAbbr: classAbbr,
    className: className,
    classEname: classEname,
    creativeTabName: creativeTabName,
  };

  return evaluateItemMatchRate(item, (30 - index) / 6, searchKeywords.value);
}

/**
 * 解析联机结果中的模组/整合包条目（class / modpack）
 *
 * @param index 该元素在联机结果中的出现次序
 * @param link 元素自身
 * @param type 条目类型
 * */
function parseOnlineSearchClassResult(
  index: number,
  link: HTMLAnchorElement,
  type: "class" | "modpack",
): AutoLinkClassEntry {
  const text = link.dataset.textFull;
  const classID = Number(link.dataset.id);
  const { className, classEname, classAbbr } = Utils.parseClassFullName(text || "");
  const classData: Class = {
    id: classID,
    name: className,
    englishName: classEname,
    abbr: classAbbr,
  };
  return {
    type: type,
    data: classData,
    searchTag: {
      matchScore: (30 - index) / 3,
    },
  };
}

/** 解析联机结果中的个人作者/开发团队条目 */
function parseOnlineSearchAuthorResult(
  index: number,
  link: HTMLAnchorElement,
  type: "author",
): AutoLinkAuthorEntry | undefined {
  const text = link.textContent;
  const textHalf = link.dataset.textHalf;
  const textFull = link.dataset.textFull;
  const id = Number(link.dataset.id);
  if (!textHalf || !textFull) return;
  const alias = textHalf === textFull ? textHalf : textFull.slice(textHalf.length + 3);
  let isTeam: boolean;
  if (text.startsWith("个人作者")) isTeam = false;
  else if (text.startsWith("开发团队")) isTeam = true;
  else return;
  const author: Author = {
    id: id,
    name: textHalf,
    alias: alias,
    isTeam: isTeam,
  };
  return {
    type: type,
    data: author,
    searchTag: {
      matchScore: (30 - index) / 3,
    },
  };
}

/**
 * 解析联机结果中的非物品条目（模组/整合包/作者），按其 `data-type` 分流
 *
 * @param index 联机结果中该元素的出现次序
 * @param element 元素自身
 */
function parseOnlineSearchNonItemResult(
  index: number,
  element: Element,
): AutoLinkClassEntry | AutoLinkAuthorEntry | undefined {
  const link = element.childNodes.item(0) as HTMLAnchorElement;
  if (!link || link.nodeType !== Node.ELEMENT_NODE) return;
  const type = link.dataset.type;
  if (type === "class" || type === "modpack")
    return parseOnlineSearchClassResult(index, link, type);
  else if (type === "author") return parseOnlineSearchAuthorResult(index, link, type);
}

/** 解析联机搜索返回的 HTML：提取结果列表的每个 `<li>`，逐项分派给对应的解析函数 */
function parseOnlineSearchResult(raw: string) {
  const html = $("<div>").html(raw).find(".edit-autolink-list li");
  const searchResult: AutoLinkEntries = [];
  if (html.attr("class") === "empty") return [];
  html.each((index, element) => {
    const childNodes = element.childNodes;
    let result;
    if (childNodes.length === 1) result = parseOnlineSearchNonItemResult(index, element);
    else result = parseOnlineSearchItemResult(index, element);
    if (result) searchResult.push(result);
  });

  return searchResult;
}

/** 本地 + 联机结果合并时按类型分桶去重的 ID 集合 */
const searchResultIDSet = {
  item: new Set(),
  class: new Set(),
  modpack: new Set(),
  author: new Set(),
  oredict: new Set(),
} as Record<AutoLinkEntryType, Set<string | number>>;

/**
 * 搜索主流程：
 * 1. 依据本地库是否有数据决定搜索来源（无本地数据则强制联机）；
 * 2. 清空上次结果；输入为空则直接返回；
 * 3. 并行发起本地/联机搜索，合并结果并按类型去重（联机结果在后，覆盖不了先入的本地条目）；
 * 4. 搜索词以 `#` 开头时附带一条矿物词典/物品标签条目；
 * 5. 过滤掉零分条目，按 `matchScore` 降序排列。
 */
async function performSearch() {
  if (isPending.value) return;
  isPending.value = true;

  let searchLocal: boolean, searchOnline: boolean;
  if (!localItemCount.value) {
    searchLocal = false;
    searchOnline = true;
  } else {
    searchLocal = sourceInputLocal.value!.getValue();
    searchOnline = sourceInputOnline.value!.getValue();
  }

  searchResultEntries.value.length = 0;

  if (!searchText.value || !searchText.value.length) {
    triggerRef(searchResultEntries);
    return;
  }

  const searchPromises: Promise<AutoLinkEntries>[] = [];

  // 本地搜索
  if (searchLocal && searchKeywords.value) {
    searchPromises.push(performLocalSearch());
  }

  // 联网搜索
  if (searchOnline) {
    searchPromises.push(performOnlineSearch());
  }

  // 批量请求并对 ID 去重
  Object.values(searchResultIDSet).forEach((set) => set.clear());
  const searchResultsList = await Promise.all(searchPromises);
  searchResultsList.forEach((results) => {
    results.forEach((result) => {
      const type = result.type;
      const id = result.data.id;
      const set = searchResultIDSet[type];
      if (!set.has(id)) {
        set.add(id);
        searchResultEntries.value.push(result);
      }
    });
  });

  // 矿物词典/物品标签附加
  if (searchText.value.charAt(0) === "#") {
    searchResultEntries.value.push({
      type: "oredict",
      data: {
        id: searchText.value.slice(1),
      },
      searchTag: {
        matchScore: 100,
      },
    } as AutoLinkOredictEntry);
  }

  // 整合搜索结果
  searchResultEntries.value = searchResultEntries.value
    .filter((e) => e.searchTag.matchScore > 0)
    .sort((a, b) => {
      return b.searchTag.matchScore - a.searchTag.matchScore;
    });
}

/** 参与加权的字段（与 `bonusFieldFactors` 一一对应） */
const bonusFields = ["name", "englishName", "registerName", "className", "classEname"] as const;

/** 各字段的加权系数：名称 > 英文名/注册名/模组名 > 模组英文名 */
const bonusFieldFactors = [2, 1, 1, 1, 0.5] as const;

/** 前缀命中（命中位置在字段开头）的额外倍率 */
const prefixFactor = 2;

/**
 * 关键词匹配打分：
 * - 关键词等于条目 ID 时 +50 并标记 isAbsoluteMatches；
 * - 对每个加权字段做拼音/大小写不敏感匹配，命中得分 =
 *   字段系数 × (是否前缀命中 ? prefixFactor : 1) × (1 + 命中长度占比)；
 * - 关键词等于模组缩写的（不区分大小写）直接视为同模组命中（isModMatches）。
 * 返回总分（0 表示一个关键词都没命中，该条目将被过滤）及命中标记与范围。
 */
function evaluateKeywords(item: Item, keywords: string[]) {
  let totalScore = 0;
  let isAbsoluteMatches = false;
  let isModMatches = false;
  const ranges: Partial<Record<(typeof bonusFields)[number], [number, number][]>> = {};
  keywords.forEach((keyword) => {
    if (Number(keyword) === item.id) {
      totalScore += 50;
      isAbsoluteMatches = true;
    }
    keyword = keyword.toLowerCase();

    bonusFields.forEach((field, index) => {
      const factor = bonusFieldFactors[index];
      const content = item[field]?.toLowerCase();
      if (content === undefined) {
        return;
      }
      const range = Pinyin.match(content, keyword);
      if (range === false) {
        return;
      }
      range[1]++; // 闭区间改成左闭右开
      let rangeList = ranges[field];
      if (rangeList === undefined) {
        rangeList = [];
        ranges[field] = rangeList;
      }
      rangeList.push(range);
      const matchLength = range[1] - range[0];
      const posBonus = factor * (range[0] === 0 ? prefixFactor : 1);
      totalScore += posBonus * (1 + (2 * matchLength) / content.length);
    });

    // 模组缩写要求完全匹配，此时直接视为 mod-matches
    if (keyword === item.classAbbr?.toLowerCase()) {
      isModMatches = true;
      totalScore += 0.01;
    }
  });
  return {
    totalScore,
    isAbsoluteMatches,
    isModMatches,
    ranges,
  };
}

/**
 * 计算单个物品条目的匹配度并组装结果条目。
 * 仅在至少命中一个关键词时继续加权：
 * - 原版物品（classID === 1）+8；
 * - 同模组（isModMatches）+20，前置/附属模组各 +15；
 * - 未知 classID 时退化为按模组名/英文名字符串比较判断同模组。
 *
 * @param item 该条目的物品信息
 * @param baseMatchScore 用于联机结果（把后端排序折算成分数）
 * @param keywords 根据关键词打分时所需要基于的关键词列表，为 undefined 时跳过本地打分
 */
function evaluateItemMatchRate(
  item: Item,
  baseMatchScore = 0,
  keywords?: string[],
): AutoLinkItemEntry {
  let totalScore = 0;
  const tag: AutoLinkSearchTag = {
    matchScore: /* item.searchTag?.matchScore || */ baseMatchScore,
    isAbsoluteMatches: false,
    isModMatches: false,
    isModVanilla: false,
    isModExpansionMatches: false,
    isModDependenceMatches: false,
  };

  if (keywords !== undefined) {
    const {
      totalScore: keywordMatchScore,
      isAbsoluteMatches,
      isModMatches,
      ranges,
    } = evaluateKeywords(item, keywords);
    totalScore += keywordMatchScore;
    tag.isAbsoluteMatches = isAbsoluteMatches;
    tag.isModMatches = isModMatches;
    tag.ranges = ranges;
  }

  // 至少匹配到一个关键词才会出现在检索结果
  if (totalScore) {
    // 提升原版物品权重
    if (item.classID === 1) {
      totalScore += 8;
      tag.isModVanilla = true;
    }

    if (typeof nClassID !== "undefined") {
      const classID = Number(nClassID);
      const isInvalidClassID = Number.isNaN(item.classID);

      // 遇到未知 classID 时，fallback 到传统字符串比较
      let isModMatches = tag.isModMatches;
      if (!isModMatches && isInvalidClassID) {
        if (item.className === pageClassName || item.classEname === pageClassEname) {
          isModMatches = true;
        }
      } else if (!isModMatches && item.classID === classID) {
        isModMatches = true;
      }

      // 提升本模组物品权重
      if (isModMatches) {
        totalScore += 20;
        tag.isModMatches = true;
      }

      // 提升前置与附属模组物品权重（遇到未知 classID 时失效，因为此情形下前置和拓展也未记录）
      const strClassID = item.classID.toString();
      if (
        !isInvalidClassID &&
        configs.value.getAsNumberList("modDependences_v2", strClassID)?.includes(classID)
      ) {
        totalScore += 15;
        tag.isModDependenceMatches = true;
      } else if (
        !isInvalidClassID &&
        configs.value.getAsNumberList("modExpansions_v2", strClassID)?.includes(classID)
      ) {
        totalScore += 15;
        tag.isModExpansionMatches = true;
      }
    }
  }

  tag.matchScore += totalScore;
  return {
    type: "item",
    data: item,
    searchTag: tag,
  } as AutoLinkItemEntry;
}

/** 命中标记 → CSS 类名，用于给搜索结果列表项挂不同标签样式 */
const searchTagClassMap = {
  isAbsoluteMatches: "searchtag-absolute-matches",
  isModDependenceMatches: "searchtag-mod-dependence-matches",
  isModExpansionMatches: "searchtag-mod-expansion-matches",
  isModMatches: "searchtag-mod-matches",
  isModVanilla: "searchtag-vanilla",
} satisfies Record<keyof Omit<AutoLinkSearchTag, "matchScore" | "ranges">, string>;

/**
 * 由条目的命中标记计算其 `<li>` 的 class 列表（命中标签 + 选中态）
 *
 * @param index 条目在搜索结果中的出现次序
 * @param searchTag 条目的命中标记
 */
function getOptionClassList(index: number, searchTag: AutoLinkSearchTag) {
  const result = (Object.entries(searchTag) as [keyof typeof searchTag, boolean][])
    .filter(([key, value]) => key !== "matchScore" && value)
    .map(([key, _value]) => searchTagClassMap[key as Exclude<typeof key, "matchScore" | "ranges">]);
  if (index === selected.value) {
    result.push("selected");
  }
  return result;
}

/** 弹窗打开时由 `AdvancedUEditor.showAutoLinkList` 调用：聚焦搜索框，若编辑器有选中文本则以之为关键词自动搜索 */
function init() {
  keyInput.value!.focus();
  const content = getEditorSelectedContent();
  if (content) {
    keyInput.value!.value = content.textContent;
    submitButton.value!.click();
  }
}

/** 交由 SweetAlert 弹窗捕获并转发的事件（此处的 keydown 输入会给到搜索框） */
const interceptEvents = {
  keydown: (ev: Event) => {
    if (ev.target === keyInput.value && ev instanceof KeyboardEvent) {
      onKeydown(ev);
    }
  },
} as const;

defineExpose({
  init,
  interceptEvents,
});
</script>
