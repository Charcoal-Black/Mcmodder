<template>
  <div
    ref="list"
    class="mcmodder-input-list"
    :class="{
      'expand-upward': expandUpward,
      faded: classFaded,
      editable: onModifySuggestion,
    }"
    :style="{
      left: cssPos.left,
      top: cssPos.top,
    }"
    v-show="!classHidden"
  >
    <div
      class="mcmodder-input-list-innerframe"
      :style="{
        'min-width': cssPos['min-width'],
        'max-width': cssPos['max-width'],
        'max-height': cssPos['max-height'],
      }"
    >
      <a
        v-for="(entry, i) in suggestedList"
        class="mcmodder-input-option"
        :class="{ selected: selected === i }"
        :title="getTitle(entry)"
        :data-value="entry.value"
        :data-index="i"
        @pointerenter="onOptionPointerenter(i)"
        @click="onOptionClick(entry.value)"
      >
        <span class="text">
          <span v-if="entry.html && entry.noEscape" v-html="entry.html" />
          <span v-else-if="entry.html !== undefined" v-text="entry.html"></span>
          <span v-else>
            <MatchedText :text="entry.value" :ranges="[entry.ranges?.value]" />
          </span>
          <span class="item-ename" v-if="entry.html === undefined && entry.showValue">
            &nbsp;
            {{ entry.value }}
          </span>
          <span class="alias" v-if="entry.alias !== undefined">
            <span v-for="(alias, aliasIndex) in entry.alias">
              <MatchedText :text="alias" :ranges="[entry.ranges?.alias[aliasIndex]]" />
            </span>
          </span>
        </span>
        <span class="mcmodder-input-extraoptions" v-if="onModifySuggestion">
          <a
            class="mcmodder-input-editalias"
            tabindex="-1"
            @click="onEditAliasClick($event, entry.value)"
          >
            <i class="fa fa-flash" />
          </a>
          <a
            class="mcmodder-input-delete"
            tabindex="-1"
            @click="onDeleteClick($event, entry.value)"
          >
            <i class="fa fa-close" />
          </a>
        </span>
      </a>
      <a
        class="mcmodder-input-option mcmodder-input-new"
        :class="{ selected: selected === suggestedList.length }"
        :data-index="suggestedList.length"
        v-show="canCreateNew"
        @pointerenter="onOptionPointerenter(suggestedList.length)"
        @click="onNewOptionClick"
      >
        <span class="mcmodder-slim-dark">+ 保存为快捷输入项</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, triggerRef, useTemplateRef, watch } from "vue";
import { Utils } from "../../Utils";
import { Values } from "../../Values";
import type { ConfigRepository } from "../../config/ConfigRepository";
import Pinyin from "pinyin-match";
import MatchedText from "./MatchedText";

const intlCollator = new Intl.Collator("zh");
const loadSuggestionFromConfig =
  <
    T extends KeysOfType<Required<AppStorage>, Record<string, InputSimplifiedSuggestion[]>> =
      "inputList",
    K extends string = string,
  >(
    configs: ConfigRepository,
    key: K,
    defaultValue = Values.defaultInputSuggestion[key] ?? [],
    item: T = "inputList" as T,
  ) =>
  () => {
    return configs.get(item, key) ?? defaultValue;
  };
const saveSuggestionToConfig =
  <
    T extends KeysOfType<Required<AppStorage>, Record<string, InputSimplifiedSuggestion[]>> =
      "inputList",
    K extends string = string,
  >(
    configs: ConfigRepository,
    key: K,
    item: T = "inputList" as T,
  ) =>
  (list: InputSuggestion[]) => {
    const simplified = list.map((e) =>
      typeof e === "string" ? e : { value: e.value, alias: e.alias },
    );
    configs.set(item, key, simplified);
    return true;
  };

const selectionValue = computed(() => {
  const val = valueRef.value;
  if (delimiter.value === undefined) {
    return val;
  }
  const pos = selectionStart.value;
  if (pos === null) {
    return "";
  }
  const vals = val.split(delimiter.value);
  const [idx, innerPos] = getSectionIndex(vals, pos, delimiter.value);
  return idx >= 0 ? (isCompletely.value ? vals[idx] : vals[idx].slice(0, innerPos)) : "";
});

const suggestedList = computed<InputRatedSuggestion[]>(() => {
  selected.value = 0;
  const content = selectionValue.value.toLowerCase();
  if (alwaysShowAllSuggestions.value) {
    selectable.value = true;
    selected.value = 0;
    return suggestionList.value;
  }

  // 所以我为什么要在这里再写一遍几乎一样的逻辑...TwT
  if (!content && hideBeforeInput.value) {
    selectable.value = false;
    canCreateNew.value = false;
    return [];
  }

  const suggestedList: InputRatedSuggestion[] = [];
  suggestionList.value.forEach((entry) => {
    const rate: InputSuggestionRate = {
      score: 0,
      ranges: { alias: {} },
    };
    [entry.value, ...(entry.alias ?? [])]
      .map((e) => e.toLowerCase())
      .forEach((value, index) => {
        const range = Pinyin.match(value, content);
        if (range) {
          range[1]++; // 闭区间改成左闭右开
          if (index === 0) {
            rate.ranges!.value = range;
          } else {
            rate.ranges!.alias[index - 1] = range;
          }
          const posFactor = range[0] === 0 ? 2 : 1;
          const matchLength = range[1] - range[0];
          rate.score! += 0.01 + (posFactor * matchLength) / value.length;
        }
      });
    suggestedList.push({ ...entry, ...rate });
  });

  canCreateNew.value = !!(onModifySuggestion.value && selectionValue.value);
  selected.value = 0;
  if (suggestedList.length) {
    selectable.value = true;
  } else {
    selectable.value = false;
  }
  return suggestedList.filter((e) => e.score).sort((a, b) => b.score! - a.score!);
});

interface Props extends InputListOption {
  inputNode: HTMLInputElement | HTMLTextAreaElement;
}

const alwaysShowAllSuggestions = ref(false);
const anchorElement = shallowRef<HTMLElement>();
const delimiter = ref<string>();
const hideBeforeInput = ref(false);
const suggestionManager = ref<SuggestionCallbackManager | SuggestionConfigManager>();
const onInitSuggestion = shallowRef<InputListOnInitSuggestion>();
const onModifySuggestion = shallowRef<InputListOnModifySuggestion>();

function setOption(option: Props) {
  inputRef.value = option.inputNode;
  alwaysShowAllSuggestions.value = option.alwaysShowAllSuggestions ?? false;
  anchorElement.value = option.anchorElement ?? option.inputNode;
  delimiter.value = option.delimiter;
  hideBeforeInput.value = option.hideBeforeInput ?? false;
  suggestionManager.value = option.suggestionManager;

  onInitSuggestion.value = pick(
    (manager) => loadSuggestionFromConfig(manager.configs, manager.configKey),
    (manager) => manager.onInitSuggestion,
  );
  onModifySuggestion.value = pick(
    (manager) => saveSuggestionToConfig(manager.configs, manager.configKey),
    (manager) => manager.onModifySuggestion,
  );

  updatePos();
}

const inputRef = shallowRef<InputListBindElement | null>(null);
const valueRef = ref("");
const selectionStart = ref<number | null>(null);
const selected = ref(0);
const suggestionList = shallowRef<InputSuggestion[]>([]);
const isCompletely = ref(false);
const selectable = ref(false);
// let isFocused = false;
const canCreateNew = ref(false);
const rectRef = shallowRef<DOMRect>();
const listHeight = ref(0);
const classFaded = ref(false);
const classHidden = ref(true);

const listRef = useTemplateRef("list");

const expandUpward = computed(() => {
  const rect = rectRef.value;
  if (!rect) {
    return false;
  }
  const topSpace = rect.top - Values.headerContainerHeight;
  const bottomSpace = innerHeight - rect.bottom;
  if (bottomSpace < listHeight.value && topSpace >= listHeight.value) {
    return true;
  } else if (bottomSpace >= listHeight.value && topSpace > bottomSpace) {
    return true;
  }
  return false;
});

const cssPos = computed(() => {
  if (!anchorElement.value) {
    return {
      left: 0,
      top: 0,
      "min-width": "0px",
    };
  }

  const { x: absPosX, y: absPosY } = Utils.getAbsolutePos(anchorElement.value);

  const rect = rectRef.value!;
  const left = absPosX;
  const top = expandUpward.value ? absPosY - listHeight.value - 4 : absPosY + rect.height;

  const minWidth = rect.width;
  const maxWidth = innerWidth - rect.left - 16;
  const maxHeight = expandUpward.value
    ? rect.top - Values.headerContainerHeight - 16
    : innerHeight - rect.bottom - 16;

  return {
    left: left + "px",
    top: top + "px",
    "min-width": minWidth + "px",
    "max-width": maxWidth + "px",
    "max-height": Math.min(maxHeight, 300) + "px",
  };
});

watch(
  () => suggestedList.value,
  (length) => {
    if (!selectable.value || !length) {
      return;
    }
    nextTick(() => {
      listHeight.value = listRef.value!.getBoundingClientRect().height;
    });
  },
);

watch(
  () => selectable.value,
  (newValue, oldValue) => {
    if (newValue && !oldValue) {
      classHidden.value = false;
      setTimeout(() => {
        classFaded.value = false;
      }, 0);
    } else if (oldValue && !newValue) {
      classFaded.value = true;
      setTimeout(() => {
        if (!selectable.value) {
          classHidden.value = true;
        }
      }, 200);
    }
  },
);

function updateValueRef(e: Event) {
  if (e instanceof KeyboardEvent && e.isComposing) {
    return;
  }
  valueRef.value = inputRef.value!.value;
  selectionStart.value = inputRef.value!.selectionStart;
}

function onInputFocus() {
  suggestionList.value =
    onInitSuggestion.value?.().map((e) => {
      if (typeof e === "string") {
        e = { value: e };
      }
      return e;
    }) ?? [];
  // isFocused = true;
}

function onInputClick() {
  onInputFocus();
}

function onInputKeydown(e: Event) {
  if (
    e instanceof KeyboardEvent &&
    selectable.value &&
    (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab" || e.key === "Enter")
  ) {
    e.preventDefault();
  }
}

function onInputKeyup(e: Event) {
  if (!(e instanceof KeyboardEvent)) {
    return;
  }
  if (selectable.value && e.key === "ArrowUp") {
    selected.value--;
    if (selected.value < 0) {
      selected.value = suggestedList.value.length - (canCreateNew.value ? 0 : 1);
    }
    scrollToSelectedNode();
  } else if (selectable.value && e.key === "ArrowDown") {
    selected.value++;
    if (selected.value >= suggestedList.value.length + (canCreateNew.value ? 1 : 0)) {
      selected.value = 0;
    }
    scrollToSelectedNode();
  } else if (selectable.value && (e.key === "Tab" || e.key === "Enter")) {
    const node = getSelectedOptionNode();
    if (node.length) {
      e.preventDefault();
      if (selected.value === suggestedList.value.length) {
        onNewOptionClick();
      } else {
        onOptionClick(suggestedList.value[selected.value].value);
      }
    }
  } else {
    updateValueRef(e);
  }
}

function onInputBlur() {
  // isFocused = false;
  setTimeout(() => {
    selectable.value = false;
  }, 100);
}

const inputEvents = {
  focus: onInputFocus,
  click: onInputClick,
  keydown: onInputKeydown,
  keyup: onInputKeyup,
  blur: onInputBlur,
  input: updateValueRef,
} as const;

function onNewOptionClick() {
  const value = selectionValue.value;
  if (suggestionList.value.filter((e) => e.value === value).length) {
    Utils.commonMsg("当前输入的内容已经存在于候选列表~", false);
    return;
  }
  suggestionList.value.push({ value });
  suggestionList.value.sort((a, b) => intlCollator.compare(a.value, b.value));
  if (onModifySuggestion.value!(suggestionList.value)) {
    Utils.commonMsg("已将当前输入的内容保存于候选列表~");
  } else {
    Utils.commonMsg("保存失败...", false);
  }
  triggerRef(suggestionList);
}

function onOptionClick(val: string) {
  setSelectionValue(val, !!delimiter.value);
  onInputBlur();
}

function onDeleteClick(e: PointerEvent, val: string) {
  suggestionList.value = suggestionList.value.filter((e) => e.value != val);
  if (onModifySuggestion.value!(suggestionList.value)) {
    Utils.commonMsg("成功从候选列表中移除选中项~");
  } else {
    Utils.commonMsg("移除失败...", false);
  }
  e.stopPropagation();
}

function onEditAliasClick(e: PointerEvent, val: string) {
  if (val === undefined) {
    console.warn("候选按钮无对应值。");
    return;
  }
  const entry = suggestionList.value.filter((e) => Utils.escapeHTML(e.value) === val)[0];
  const alias = entry.alias ? entry.alias.join("; ") : "";
  Utils.createModal(
    {
      html: `
      <p>在此处修改选中项的内容与快捷名称...（使用 ';' 分隔多个快捷名称）</p>
      <input class="form-control" id="mcmodder-input-newtext" value="${Utils.escapeHTML(val)}"/>
      <input class="form-control" id="mcmodder-input-alias" value="${Utils.escapeHTML(alias)}"/>
    `,
      showCancelButton: true,
      confirmButtonText: "保存",
      cancelButtonText: "取消",
      preConfirm: () => {
        const newText = $("#mcmodder-input-newtext").val() as string;
        const newAlias = $("#mcmodder-input-alias").val() as string;
        entry.value = newText;
        if (!newAlias) {
          delete entry.alias;
        } else {
          entry.alias = newAlias
            .split(";")
            .map((e) => e.trim())
            .filter((e) => e);
        }
        triggerRef(suggestionList);
        if (onModifySuggestion.value!(suggestionList.value)) {
          Utils.commonMsg("成功更新选中项的快捷名称~");
        } else {
          Utils.commonMsg("更新失败...", false);
        }
      },
    },
    {
      focus: () => {},
    },
  );
  e.stopPropagation();
}

function onOptionPointerenter(index: number) {
  selected.value = index;
}

const pick = <T extends Function>(
  fromConfig: (manager: SuggestionConfigManager) => T,
  fromCallback: (manager: SuggestionCallbackManager) => T | undefined,
) => {
  const manager = suggestionManager.value!;
  if ("configs" in manager) {
    return fromConfig(manager);
  }
  return fromCallback(manager);
};

function getTitle(entry: InputSuggestion) {
  let res = entry.value;
  if (entry.alias !== undefined) {
    res += ` (${entry.alias.join("; ")})`;
  }
  return res;
}

function getSectionIndex(
  vals: string[],
  pos: number,
  delimiter: string,
): [idx: number, innerPos: number] {
  for (let i = 0, j = 0; i < vals.length; j += vals[i++].length + delimiter.length) {
    if (pos >= j && pos < j + vals[i].length + delimiter.length) {
      return [i, pos - j];
    }
  }
  return [-1, -1];
}

function setSelectionValue(content: string, isContinuously = false) {
  if (!inputRef.value) {
    return;
  }
  let val = valueRef.value;
  let newPos: number | null = null;
  let isLast = false;
  const pos = selectionStart.value;
  if (delimiter.value !== undefined) {
    if (pos !== null) {
      const vals = val.split(delimiter.value);
      const [idx, innerPos] = getSectionIndex(vals, pos, delimiter.value);
      if (idx >= 0) {
        const suffix = vals[idx].slice(innerPos);
        vals[idx] = content + suffix;
        newPos = pos - innerPos + content.length;
      }
      val = vals.join(delimiter.value);
      if (idx === vals.length - 1) {
        isLast = true;
      }
    }
    if (isContinuously && isLast) {
      val += delimiter.value;
    }
  } else {
    if (pos !== null) {
      const suffix = content.slice(pos);
      val = content + suffix;
    } else {
      val = content;
    }
  }

  inputRef.value.value = val;
  inputRef.value.dispatchEvent(new Event("input"));
  inputRef.value.dispatchEvent(new Event("change"));
  if (newPos !== null) {
    inputRef.value.setSelectionRange(newPos, newPos);
  }
  if (isContinuously) {
    inputRef.value.focus();
  } else {
    inputRef.value.blur();
  }
}

function getOptionNode(index: number) {
  return $(listRef.value!).find(`[data-index=${index}]`);
}

function scrollToSelectedNode() {
  getOptionNode(selected.value).get(0).scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

function getSelectedOptionNode() {
  return getOptionNode(selected.value);
}

function updatePos() {
  if (!anchorElement.value) {
    return;
  }
  rectRef.value = anchorElement.value.getBoundingClientRect();
}

defineExpose({
  setOption,
  inputEvents,
  updatePos,
  expandUpward,
});
</script>
