<template>
  <div class="edit-autolink-frame">
    <form>
      <div class="input-group edit-autolink-search">
        <input ref="keyInput" class="form-control" name="key" value="" placeholder="搜索模组与资料.." maxlength="255" autocomplete="off" @click="onInputClick" @keydown="onKeydown">
        <button ref="submitButton" class="btn btn-dark" type="submit" :class="{ disabled: isPending }" :disabled="isPending" @click="onSearchButtonClick">搜索</button>
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
        <div v-else class="title">
          搜索结果:
        </div>
        <li v-for="(entry, index) in searchResultEntries" :class="getOptionClassList(index, entry.searchTag)">
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
    <div v-show="showResultFrame" class="title">
      链接文本:
    </div>
    <div v-show="showResultFrame" class="edit-autolink-style">
      <template v-for="(text, index) in styles">
        <div class="radio" v-show="!(index === 0 && shouldHideSelectedContentStyle)">
          <input :id="`edit-autolink-style-text-${ index }`" name="edit-autolink-style-text" :value="index" type="radio" v-model.number="style">
          <label :for="`edit-autolink-style-text-${ index }`">{{ text }}</label>
        </div>
      </template>
      <br>
      <CheckboxInput ref="insertSpace" title="在链接前后加空格" id="edit-autolink-style-space" with-label
        :value="configs.getSettings('autolinkStyleSpace') ?? false"
        :on-successful-change="info => configs.setSettings('autolinkStyleSpace', info.final)"
      />
    </div>
    <div class="edit-autolink-source" v-show="localItemCount">
      <CheckboxInput ref="sourceInputLocal" title="本地搜索" id="edit-autolink-source-local" with-label
        :value="configs.getSettings('autolinkSourceLocal') ?? false"
        :on-successful-change="info => configs.setSettings('autolinkSourceLocal', info.final)"
      />
      <CheckboxInput ref="sourceInputOnline" title="联机搜索" id="edit-autolink-source-online" with-label
        :value="configs.getSettings('autolinkSourceOnline') ?? false"
        :on-successful-change="info => configs.setSettings('autolinkSourceOnline', info.final)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, triggerRef, useTemplateRef, watch } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import CheckboxInput from './input/CheckboxInput.vue';
import { Utils } from '../../Utils.ts';
import { Values } from '../../Values.ts';
import AutoLinkItemOption from './autolink/AutoLinkItemOption.vue';
import AutoLinkAuthorOption from './autolink/AutoLinkAuthorOption.vue';
import AutoLinkOredictOption from './autolink/AutoLinkOredictOption.vue';
import AutoLinkClassOption from './autolink/AutoLinkClassOption.vue';
import { ItemIDBRepository } from '../../jsonframe/repository/ItemIDBRepository.ts';
import type { ItemRepository } from '../../jsonframe/repository/ItemRepository.ts';
import { ItemGMStorageRepository } from '../../jsonframe/repository/ItemGMStorageRepository.ts';
import Pinyin from 'pinyin-match';

const AUTOLINK_KEYWORD_MAXLENGTH = 10;

const styles = [
  "选中的文本",
  "一半名称 (仅主要名称)",
  "完整名称 (主要名称+次要名称)"
] as const;

interface Props {
  editor: any
}

const { editor } = defineProps<Props>();
const parent = shallowRef<Mcmodder>(editor.parent);
const configs = computed(() => parent.value.configRepository);

const itemRepository = computed<ItemRepository<number | string>>(() => {
  const repo = configs.value.getSettings("itemRepository") ?
    new ItemIDBRepository() :
    new ItemGMStorageRepository(configs.value);
  repo.init();
  return repo;
})

const localItems = shallowRef<Item[]>([]);

const jsonDatabase = configs.value.getSettingsRef("jsonDatabase_v2");

const repoIndex = configs.value.getSettingsRef("itemRepository", 0 as 0 | 1);

const linkings = computed(() => {
  if (jsonDatabase.value === undefined) {
    return [];
  }
  const files = jsonDatabase.value[repoIndex.value];
  return files ?? [];
})

watch(
  () => linkings.value,
  async files => {
    const allItems = await Promise.all(files.map(filename => itemRepository.value.readSearchText(filename)));
    allItems.forEach(items => localItems.value.push(...items.filter(item => item.id)));
    localItemCount.value = localItems.value.length;
    triggerRef(localItems);
  }, {
    immediate: true
  }
)

const localItemCount = ref(0);

const keyInput = useTemplateRef("keyInput");
const submitButton = useTemplateRef("submitButton");
const insertSpace = useTemplateRef("insertSpace");
const sourceInputLocal = useTemplateRef("sourceInputLocal");
const sourceInputOnline = useTemplateRef("sourceInputOnline");
const resultFrame = useTemplateRef("resultFrame");

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
  set: newValue => {
    if (newValue === 1 || newValue === 2) {
      configs.value.setSettings("preferredAutolinkStyle", newValue);
    }
  }
})
const selected = ref(-1);
const isPending = ref(false);
// const enableSearchSourceSettings = ref(false);
const shouldHideSelectedContentStyle = ref(true);
const searchResultEntries = shallowRef<AutoLinkEntries>([]);

let shortcutPending = false;

const showResultFrame = computed(() => {
  return searchKeywords.value.length || searchResultEntries.value.length;
})

const searchText = ref("");
const searchKeywords = shallowRef<string[]>([]);

const pageClassFullName = $(".common-nav li").eq(4).text().trim();
const {
  className: pageClassName,
  classEname: pageClassEname
} = Utils.parseClassFullName(pageClassFullName);

watch(
  () => editor,
  () => parent.value = editor.parent
);
watch(
  () => searchResultEntries.value,
  () => shouldHideSelectedContentStyle.value = !getEditorSelectedContent()
)

function onSearchButtonClick(e: Event) {
  e.preventDefault();
  onSearch();
}

function onClick(type: AutoLinkEntryType, id: string, textHalf: string, textFull: string) {
  const appendSpace = insertSpace.value!.getValue();
  let content;
  switch (style.value) {
    case 0: content = getEditorSelectedContent().textContent; break;
    case 1: content = textHalf; break;
    case 2: content = textFull; break;
  }
  swal.close();

  let link: string;
  if (type === "oredict") link = `${ parent.value.hostname }/${ type }/${ id }-1.html`;
  else link = `${ parent.value.hostname }/${ type }/${ id }.html`;

  let res = `<a href="${ link }" target="_blank" title="${ content }">${ content }</a>`;
  if (appendSpace) res = `&nbsp;${ res }&nbsp;`;
  editor.editor.execCommand("insertHtml", res);
}

function onInputClick() {
  selected.value = -1;
}

function onKeydown(e: KeyboardEvent) {
  const code = e.key;
  if (code === "ArrowUp") {
    e.preventDefault();
    selected.value--;
    if (selected.value < -1) {
      selected.value = searchResultEntries.value.length - 1;
    }
    return;
  }
  else if (code === "ArrowDown") {
    e.preventDefault();
    selected.value++;
    if (selected.value >= searchResultEntries.value.length) {
      selected.value = -1;
    }
    return;
  }
  else if (code === "Enter") {
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
  const target = $(resultFrame.value!).find(`[data-shortcut-num=${ num }]`);
  Utils.highlight(target, "greenyellow");
  shortcutPending = true;
  setTimeout(() => {
    target.click()
    shortcutPending = false;
  }, 200);
} 

function getEditorSelectedContent() {
  return editor.editor.selection.getRange().cloneContents();
}

function onSearch() {
  searchText.value = keyInput.value!.value.trim();
  searchKeywords.value = searchText.value.split(/\s+/).slice(0, AUTOLINK_KEYWORD_MAXLENGTH).filter(e => e); // 原生最大长度为4
  performSearch().catch(e => {
    Utils.commonMsg(e, false);
  })
  .finally(() => {
    isPending.value = false;
  });
}

async function performLocalSearch() {
  return localItems.value.map(item => evaluateItemMatchRate(item, undefined, searchKeywords.value));
}

async function performOnlineSearch() {
  let resp = await parent.value.utils.createRequest({
    url: `${ parent.value.hostname }/object/UEAutolink/`,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "Origin": parent.value.hostname,
      "Referer": parent.value.href,
      "Priority": "u=0",
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    },
    data: $.param({
      classID: nClassID,
      key: searchText.value
    })
  });
  let data = JSON.parse(resp.responseText);
  if (data.state) {
    Utils.commonMsg(Values.errorMessage[data.state], false);
    return [];
  }
  return parseOnlineSearchResult(data.html);
}

function parseOnlineSearchItemResult(index: number, element: Element): AutoLinkItemEntry | undefined {
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
  if (classTextFull.charAt(0) === '[') {
    splitIndexOf = classTextFull.indexOf("]");
    classAbbr = classTextFull.slice(1, splitIndexOf);
    className = classTextFull.slice(splitIndexOf + 2);
  }
  else className = classTextFull;
  splitIndexOf = className.lastIndexOf(" (");
  if (splitIndexOf !== -1) {
    classEname = className.slice(splitIndexOf + 2, -1);
    className = className.slice(0, splitIndexOf);
  }

  const classID = Number(parent.value.utils.getClassIDByClassName(classTextFull));
  const typeName = link.title.split(" - ")[0];
  let typeID = 0;
  const matchedTypeList = parent.value.itemTypeList?.filter(entry => 
    (entry.classID === classID || entry.classID === 0) &&
    entry.text === typeName
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
    creativeTabName: creativeTabName
  };

  return evaluateItemMatchRate(item, (30 - index) / 6, searchKeywords.value);
}

function parseOnlineSearchClassResult(index: number, link: HTMLAnchorElement, type: "class" | "modpack"): AutoLinkClassEntry {
  const text = link.dataset.textFull;
  const classID = Number(link.dataset.id);
  const {className, classEname, classAbbr} = Utils.parseClassFullName(text || "");
  const classData: Class = {
    id: classID,
    name: className,
    englishName: classEname,
    abbr: classAbbr
  };
  return {
    type: type,
    data: classData,
    searchTag: {
      matchScore: (30 - index) / 3
    }
  };
}

function parseOnlineSearchAuthorResult(index: number, link: HTMLAnchorElement, type: "author"): AutoLinkAuthorEntry | undefined {
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
    isTeam: isTeam
  };
  return {
    type: type,
    data: author,
    searchTag: {
      matchScore: (30 - index) / 3
    }
  }
}

function parseOnlineSearchNonItemResult(index: number, element: Element): AutoLinkClassEntry | AutoLinkAuthorEntry | undefined {
  const link = element.childNodes.item(0) as HTMLAnchorElement;
  if (!link || link.nodeType !== Node.ELEMENT_NODE) return;
  const type = link.dataset.type;
  if (type === "class" || type === "modpack") return parseOnlineSearchClassResult(index, link, type);
  else if (type === "author") return parseOnlineSearchAuthorResult(index, link, type);
}

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

const searchResultIDSet = {
  item: new Set,
  class: new Set,
  modpack: new Set,
  author: new Set,
  oredict: new Set
} as Record<AutoLinkEntryType, Set<string | number>>;

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
  Object.values(searchResultIDSet).forEach(set => set.clear());
  const searchResultsList = await Promise.all(searchPromises);
  searchResultsList.forEach(results => {
    results.forEach(result => {
      const type = result.type;
      const id = result.data.id;
      const set = searchResultIDSet[type];
      if (!set.has(id)) {
        set.add(id);
        searchResultEntries.value.push(result);
      }
    })
  })

  // 矿物词典/物品标签附加
  if (searchText.value.charAt(0) === "#") {
    searchResultEntries.value.push({
      type: "oredict",
      data: {
        id: searchText.value.slice(1)
      },
      searchTag: {
        matchScore: 100
      }
    } as AutoLinkOredictEntry);
  }

  // 整合搜索结果
  searchResultEntries.value = searchResultEntries.value
  .filter(e => e.searchTag.matchScore > 0)
  .sort((a, b) => {
    return b.searchTag.matchScore - a.searchTag.matchScore;
  });
}

const bonusFields = ["name", "englishName", "registerName", "className", "classEname"] as const;

const bonusFieldFactors = [2, 1, 1, 1, 0.5] as const;

const prefixFactor = 2;

// 关键词匹配
function evaluateKeywords(item: Item, keywords: string[]) {
  let totalScore = 0;
  let isAbsoluteMatches = false;
  let isModMatches = false;
  const ranges: Partial<Record<typeof bonusFields[number], [number, number][]>> = {};
  keywords.forEach(keyword => {
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
      totalScore += posBonus * (1 + 2 * matchLength / content.length);
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
    ranges
  };
}

function evaluateItemMatchRate(item: Item, baseMatchScore = 0, keywords?: string[]): AutoLinkItemEntry {
  let totalScore = 0;
  const tag: AutoLinkSearchTag = {
    matchScore: /* item.searchTag?.matchScore || */ baseMatchScore,
    isAbsoluteMatches: false,
    isModMatches: false,
    isModVanilla: false,
    isModExpansionMatches: false,
    isModDependenceMatches: false
  };

  if (keywords !== undefined) {
    const {
      totalScore: keywordMatchScore,
      isAbsoluteMatches,
      isModMatches,
      ranges
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
      }
      else if (!isModMatches && item.classID === classID) {
        isModMatches = true;
      }

      // 提升本模组物品权重
      if (isModMatches) {
        totalScore += 20;
        tag.isModMatches = true;
      }

      // 提升前置与附属模组物品权重（遇到未知 classID 时失效，因为此情形下前置和拓展也未记录）
      const strClassID = item.classID.toString();
      if (!isInvalidClassID && configs.value.getAsNumberList("modDependences_v2", strClassID)?.includes(classID)) {
        totalScore += 15;
        tag.isModDependenceMatches = true;
      }
      else if (!isInvalidClassID && configs.value.getAsNumberList("modExpansions_v2", strClassID)?.includes(classID)) {
        totalScore += 15;
        tag.isModExpansionMatches = true;
      }
    }
  }

  tag.matchScore += totalScore;
  return {
    type: "item",
    data: item,
    searchTag: tag
  } as AutoLinkItemEntry;
}

const searchTagClassMap = {
  isAbsoluteMatches: "searchtag-absolute-matches",
  isModDependenceMatches: "searchtag-mod-dependence-matches",
  isModExpansionMatches: "searchtag-mod-expansion-matches",
  isModMatches: "searchtag-mod-matches",
  isModVanilla: "searchtag-vanilla"
} satisfies Record<keyof Omit<AutoLinkSearchTag, "matchScore" | "ranges">, string>;

function getOptionClassList(index: number, searchTag: AutoLinkSearchTag) {
  const result = (Object.entries(searchTag) as [keyof typeof searchTag, boolean][])
    .filter(([key, value]) => key !== "matchScore" && value)
    .map(([key, _value]) => searchTagClassMap[key as Exclude<typeof key, "matchScore" | "ranges">]);
  if (index === selected.value) {
    result.push("selected");
  }
  return result;
}

function init() {
  keyInput.value!.focus();
  const content = getEditorSelectedContent();
  if (content) {
    keyInput.value!.value = content.textContent;
    submitButton.value!.click();
  }
}

const interceptEvents = {
  keydown: (ev: Event) => {
    if (ev.target === keyInput.value && ev instanceof KeyboardEvent) {
      onKeydown(ev);
    }
  }
} as const;

defineExpose({
  init,
  interceptEvents
});

</script>