<template>
  <Popover ref="popoverRef" :anchor-element="anchorElement" :max-height="300">
    <div
      ref="listRef"
      class="mcmodder-input-list"
      :class="{
        editable: onModifySuggestion,
      }"
      :style="sizeCss"
    >
      <a
        v-for="(entry, i) in suggestedList"
        :key="i"
        class="mcmodder-input-option"
        :class="{ selected: selected === i }"
        :title="getTitle(entry)"
        :data-value="entry.value"
        :data-index="i"
        @pointerenter="onOptionPointerenter(i)"
        @click="onOptionClick(entry.value)"
      >
        <span class="text">
          <span v-if="entry.text && entry.noEscape" v-text="entry.text" />
          <span v-else-if="entry.text !== undefined" v-text="entry.text"></span>
          <span v-else>
            <MatchedText :text="entry.value" :ranges="[entry.ranges?.value]" />
          </span>
          <span v-if="entry.text === undefined && entry.showValue" class="item-ename">
            &nbsp;
            {{ entry.value }}
          </span>
          <span v-if="entry.alias !== undefined" class="alias">
            <span v-for="(alias, aliasIndex) in entry.alias" :key="aliasIndex">
              <MatchedText :text="alias" :ranges="[entry.ranges?.alias[aliasIndex]]" />
            </span>
          </span>
        </span>
        <span v-if="onModifySuggestion" class="mcmodder-input-extraoptions">
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
        v-show="canCreateNew"
        class="mcmodder-input-option mcmodder-input-new"
        :class="{ selected: selected === suggestedList.length }"
        :data-index="suggestedList.length"
        @pointerenter="onOptionPointerenter(suggestedList.length)"
        @click="onNewOptionClick"
      >
        <span class="mcmodder-slim-dark">+ 保存为快捷输入项</span>
      </a>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  shallowRef,
  triggerRef,
  useTemplateRef,
  watch,
  watchEffect,
} from "vue";
import { Utils } from "../../Utils";
import { Values } from "../../Values";
import type { ConfigRepository } from "../../config/ConfigRepository";
import type { InputListProps, PopoverExpose } from "../../types/props";
import Pinyin from "pinyin-match";
import MatchedText from "./MatchedText";
import Popover from "./Popover.vue";

/**
 * 候选列表（快速补全）组件。
 *
 * # 它不是「自己长在输入框下面」的
 * 组件本体不监听任何输入框，而是由 `InputListController` 统一挂载到 `document.body`，
 * 并把 `inputEvents` 转发到 `window`（捕获阶段）——事件命中某个已登记的输入元素时，控制器才会
 * 调 `setOption` 告诉本组件「当前服务的是哪个输入框、候选从哪来」。
 * 因此组件内部没有「当前输入框」这个状态，只有 `setOption` 之后的一段生命周期。
 *
 * # 匹配与补全
 * - 匹配：`suggestedList` 是个 computed，每次求值都拿 `selectionValue`（光标所在段落的已输入前缀）
 *   与每条候选的 `value` / `alias` 做拼音匹配（`pinyin-match`），算出 `score` 与命中区间 `ranges`，
 *   过滤零分项并按分数降序——所以**输入的变化只需体现在输入元素本身**，列表会自行重算；
 * - 补全：`setSelectionValue` 把选中候选写回输入元素（多段输入时只替换光标所在段落），
 *   并派发 `input` / `change` 事件，让宿主原有的表单绑定照常感知到这次修改。
 *
 * # 显隐
 * `selectable` 是唯一的显隐开关（由 `suggestedList` 求值时顺带计算），
 * `classHidden` / `classFaded` 只负责动画。
 */
const intlCollator = new Intl.Collator("zh");

/** 候选列表的「配置式」读取器工厂：把 `SuggestionConfigManager` 转成 `onInitSuggestion` 回调 */
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
/**
 * 候选列表的「配置式」保存器工厂：把 `SuggestionConfigManager` 转成 `onModifySuggestion` 回调。
 * 写回前只保留 `value` 与 `alias`（丢弃 `html` 等纯展示字段），并把字符串形式的简写规范化。
 */
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

/**
 * **匹配所用的文本**：光标当前所在「段落」的前缀。
 * 未设 `delimiter` 时就是整段输入值；设了分隔符（如审核理由的「；」）时只取光标所在的那一段，
 * 且只取到光标位置（`isCompletely` 为真时才取整段）——这样补全只影响当前段落，不误伤其它段落。
 */
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

const suggestedList = shallowRef<InputRatedSuggestion[]>([]);

// === 来自 setOption 的选项（组件没有自身的「当前输入框」状态，全部由此驱动） ===

/** 忽略输入内容，直接展示全部候选（显示成按钮的下拉菜单用法） */
const alwaysShowAllSuggestions = ref(false);
/** 当 {@link alwaysShowAllSuggestions} 启用时，提供默认候选序号的回调 */
const defaultSelectionProvider = ref(() => 0 as number);
/** 定位锚点；缺省为输入元素本身（下拉菜单会把它指向那个可见的按钮） */
const anchorElement = shallowRef<HTMLElement>();
/** 多段输入的分隔符：补全只替换光标所在段落 */
const delimiter = ref<string>();
/** 输入为空时不弹列表 */
const hideBeforeInput = ref(false);
/** 候选来源（配置式 / 回调式），`setOption` 时据此决定下面两个回调怎么取 */
const suggestionManager = ref<SuggestionCallbackManager | SuggestionConfigManager>();
/** 实际生效的候选读取回调（已由 `pick` 从 `suggestionManager` 解析而来） */
const onInitSuggestion = shallowRef<InputListOnInitSuggestion>();
/** 实际生效的候选保存回调；为 `undefined` 时不提供「新增 / 删除候选」的操作 */
const onModifySuggestion = shallowRef<InputListOnModifySuggestion>();

/**
 * 由 `InputListController` 在输入元素获得焦点时调用：切换「当前服务对象」并重建候选读写回调。
 * 这是本组件唯一的入口——组件自身不观察任何输入框。
 *
 * @param option 当前输入框及其行为选项；`inputNode` 即 `inputListBindElement` 的值
 *               （交互元素与输入元素是同一个时，控制器会把两者一并传进来）。
 */
function setOption(option: InputListProps) {
  inputRef.value = option.inputNode;
  alwaysShowAllSuggestions.value = option.alwaysShowAllSuggestions ?? false;
  defaultSelectionProvider.value = option.defaultSelectionProvider ?? (() => 0);
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

  popoverRef.value!.updatePos();
}

// === 内部状态 ===

/** **真正承载输入的元素**：文本的读写、选区维护、补全替换全都作用在它上面 */
const inputRef = shallowRef<InputListBindElement | null>(null);
/** 输入元素的当前值（由 `input` 事件同步；`selectionValue` 的数据源） */
const valueRef = ref("");
/** 输入元素的光标位置（由 `input` 事件同步；决定「替换哪一段」） */
const selectionStart = ref<number | null>(null);
/** 当前高亮项下标；`canCreateNew` 为真时 `suggestedList.length` 这一项是「保存为快捷输入项」 */
const selected = ref(0);
/** 候选全集（每次聚焦时由 `onInitSuggestion` 重新拉取；`shallowRef` + `triggerRef` 以支持原地增删改） */
const suggestionList = shallowRef<InputSuggestion[]>([]);
/** 取整段而非「到光标为止」的前缀（`selectionValue` 的开关） */
const isCompletely = ref(false);
/** 列表是否应显示（唯一的显隐开关，由 `suggestedList` 求值时顺带计算） */
const selectable = ref(false);
// let isFocused = false;
/** 是否展示「+ 保存为快捷输入项」这一项（需要可保存回调且当前段非空） */
const canCreateNew = ref(false);

/** 弹出框根节点 */
const popoverRef = useTemplateRef("popoverRef");
/** 列表根节点（量高度、按 `data-index` 找选项节点） */
const listRef = useTemplateRef("listRef");

// 候选数量变化后重新量一次列表高度（向上弹出时需要它来定位）
watch(
  () => suggestedList.value,
  (length) => {
    if (!selectable.value || !length) {
      return;
    }
    nextTick(() => {
      popoverRef.value?.onPopoverHeightChange();
    });
  },
);

// 显隐动画：显示时先取消隐藏、下一帧再取消淡出；隐藏时先淡出、200ms 后才真正隐藏
watch(
  () => selectable.value,
  (value) => popoverRef.value?.onPopoverVisibilityChange(value),
);

const sizeCss = computed(() => {
  const rect = popoverRef.value?.rectRef ?? new DOMRect();
  const minWidth = rect.width;
  const maxWidth = innerWidth - rect.left - 16;

  return {
    "min-width": minWidth + "px",
    "max-width": maxWidth + "px",
  };
});

/**
 * 通过 watchEffect 计算当前展示的候选列表（全局唯一的「匹配 → 过滤 → 排序」入口）。
 *
 * 求值时顺带维护几个副作用状态：`selected` 复位为 0、`selectable` 决定列表是否应显示、
 * `canCreateNew` 决定是否展示「保存为快捷输入项」。之所以能写在 computed 里，
 * 是因为它依赖 `valueRef` / `selectionStart` / `suggestionList` 等响应式源——任何一次输入变化都会触发重算。
 */
watchEffect(() => {
  selected.value = 0;
  const content = selectionValue.value.toLowerCase();
  if (alwaysShowAllSuggestions.value) {
    selectable.value = true;
    selected.value = defaultSelectionProvider.value();
    suggestedList.value = suggestionList.value;
    return;
  }

  if (!content && hideBeforeInput.value) {
    selectable.value = false;
    canCreateNew.value = false;
    suggestedList.value = [];
    return;
  }

  const rawSuggestedList: InputRatedSuggestion[] = [];
  suggestionList.value.forEach((entry) => {
    const rate: InputSuggestionRate = {
      score: 0,
      ranges: { alias: {} },
    };
    [entry.value, ...(entry.alias ?? [])]
      .map((e) => e.toLowerCase())
      .forEach((value, index) => {
        // index 0 是候选本体，其余下标对应各 alias（ranges 里以 alias 的下标存储）
        const range = Pinyin.match(value, content);
        if (range) {
          range[1]++; // 闭区间改成左闭右开
          if (index === 0) {
            rate.ranges!.value = range;
          } else {
            rate.ranges!.alias[index - 1] = range;
          }
          // 命中越靠前、占比越大，分数越高；每个命中字段另有 0.01 的底分，避免短串被长串碾压
          const posFactor = range[0] === 0 ? 2 : 1;
          const matchLength = range[1] - range[0];
          rate.score! += 0.01 + (posFactor * matchLength) / value.length;
        }
      });
    rawSuggestedList.push({ ...entry, ...rate });
  });

  canCreateNew.value = !!(onModifySuggestion.value && selectionValue.value);
  selected.value = 0;
  if (rawSuggestedList.length) {
    selectable.value = true;
  } else {
    selectable.value = false;
  }
  suggestedList.value = rawSuggestedList.filter((e) => e.score).sort((a, b) => b.score! - a.score!);
});

/**
 * 同步输入元素的当前值与光标位置。
 * 处于中文输入法组字过程中（`isComposing`）直接忽略——否则拼音还没上屏就会拿中间态去匹配候选。
 *
 * @param e `input` 事件，或其它需要刷新值 / 选区的键盘事件（`onInputKeyup` 的兜底分支）。
 */
function updateValueRef(e: Event) {
  if (e instanceof KeyboardEvent && e.isComposing) {
    return;
  }
  valueRef.value = inputRef.value!.value;
  selectionStart.value = inputRef.value!.selectionStart;
}

/** 输入元素获得焦点：拉取候选全集（字符串形式的简写在此规范化为对象） */
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

/** 点击已聚焦的输入框：同样按「重新聚焦」处理——此时候选已可见，这次点击发生在列表弹出之后 */
function onInputClick() {
  onInputFocus();
}

/**
 * 按下这些键时先拦下默认行为（真正消费发生在 `onInputKeyup`），
 * 避免光标在输入框内上下跳动、Tab 切走焦点、回车提前提交表单。
 */
function onInputKeydown(e: Event) {
  if (
    e instanceof KeyboardEvent &&
    selectable.value &&
    (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab" || e.key === "Enter")
  ) {
    e.preventDefault();
  }
}

/**
 * 键盘操作（列表可见时）：
 * - ↑ / ↓ 在候选间循环移动选中项，并把它滚动进可视区域；
 * - Tab / Enter 采纳选中项（选中的是「保存为快捷输入项」时改为新增候选）；
 * - 其余按键交回 `updateValueRef` 同步值与选区。
 */
function onInputKeyup(e: Event) {
  if (!(e instanceof KeyboardEvent)) {
    return;
  }
  if (selectable.value && e.key === "ArrowUp") {
    selected.value--;
    if (selected.value < 0) {
      // 向上越界：绕回末尾（有「保存为快捷输入项」时落在它身上，否则是最后一条候选）
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

/** 输入元素失焦：延迟 100ms 关闭——给「点击候选项」留出时间（否则 mousedown 先于 click 触发失焦） */
function onInputBlur() {
  // isFocused = false;
  setTimeout(() => {
    selectable.value = false;
  }, 100);
}

/** 输入框事件名 → 处理函数：由 `InputListController` 转发到 `window`（也可被宿主直接调用其中任意一个） */
const inputEvents = {
  focus: onInputFocus,
  click: onInputClick,
  keydown: onInputKeydown,
  keyup: onInputKeyup,
  blur: onInputBlur,
  input: updateValueRef,
} as const;

/**
 * 「+ 保存为快捷输入项」：把当前段落写进候选全集并交由保存回调持久化。
 * 已存在同值则拒绝；新项按中文自然序插入，最后 `triggerRef` 触发候选列表重算。
 */
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

/**
 * 采纳一条候选：把它的文本写回输入元素，随后按「已失焦」收尾。
 *
 * @param val 被采纳候选的 `value`。
 */
function onOptionClick(val: string) {
  setSelectionValue(val, !!delimiter.value);
  onInputBlur();
}

/**
 * 删除一条候选（候选项右侧的删除按钮）。
 * 注意：只改动内存与配置，保存回调返回 false 时仅提示失败，不回滚。
 *
 * @param e 指针事件（阻止冒泡，避免连带触发该候选项的点击）。
 * @param val 被删候选的 `value`。
 */
function onDeleteClick(e: PointerEvent, val: string) {
  suggestionList.value = suggestionList.value.filter((e) => e.value != val);
  if (onModifySuggestion.value!(suggestionList.value)) {
    Utils.commonMsg("成功从候选列表中移除选中项~");
  } else {
    Utils.commonMsg("移除失败...", false);
  }
  e.stopPropagation();
}

/**
 * 编辑某条候选的本体与快捷名称（闪电按钮）：弹出模态框，确认时在 `preConfirm` 里写回并保存。
 * 别名以「;」分隔，保存时拆分、去空白、丢弃空项；留空则删除 `alias` 字段。
 *
 * @param e 指针事件（阻止冒泡）。
 * @param val 被编辑候选的 `value`。
 */
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

/** 指针悬停某项：直接把它设为选中项（与键盘操作共享同一个 `selected`） */
function onOptionPointerenter(index: number) {
  selected.value = index;
}

/**
 * 按候选来源类型选择回调的取法：配置式（`SuggestionConfigManager`）自动包装成读写回调，
 * 回调式（`SuggestionCallbackManager`）直接取宿主给的函数（可能为 `undefined`）。
 */
const pick = <T extends (...args: never[]) => unknown>(
  fromConfig: (manager: SuggestionConfigManager) => T,
  fromCallback: (manager: SuggestionCallbackManager) => T | undefined,
) => {
  const manager = suggestionManager.value!;
  if ("configs" in manager) {
    return fromConfig(manager);
  }
  return fromCallback(manager);
};

/** 候选项的悬停提示（title）：本体 + 括号内列出各快捷名称 */
function getTitle(entry: InputSuggestion) {
  let res = entry.value;
  if (entry.alias !== undefined) {
    res += ` (${entry.alias.join("; ")})`;
  }
  return res;
}

/**
 * 由「整段文本中的绝对光标位置」求「所在段落的下标 + 段内位置」。
 *
 * @param vals 按分隔符切分后的各段。
 * @param pos 光标在**整段文本**中的位置。
 * @param delimiter 分隔符。
 * @returns `[段落下标, 段内位置]`；光标不落在任何段落内时返回 `[-1, -1]`。
 */
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

/**
 * 补全的落笔处：把 `content` 写进输入元素，并按需补分隔符、决定是否继续聚焦。
 *
 * 设了 `delimiter`（多段输入）时只替换光标所在段落、其余段落原样保留，光标随后落在新内容之后；
 * 若补的是最后一段且 `isContinuously` 为真，再补一个分隔符，方便接着写下一段。
 * 未设分隔符时按「从光标到末尾的剩余文本」拼接，即前缀补全。
 *
 * 写完派发 `input` 与 `change` 事件，宿主原有的表单绑定、以及 `onInputKeyup` 的值同步都能收到这次变化。
 *
 * @param content 被采纳的候选文本。
 * @param isContinuously 是否保持输入元素聚焦以便可继续输入（分段输入时传 true）。
 */
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

/**
 * 按下标取候选项的 DOM 节点（模板用 `data-index` 标注）。
 *
 * @param index 候选项下标；`canCreateNew` 为真时，下标等于 `suggestedList.length` 的是「保存为快捷输入项」。
 */
function getOptionNode(index: number) {
  return $(listRef.value!).find(`[data-index=${index}]`);
}

/** 把当前选中项滚动进可视区域（键盘上下移动后调用） */
function scrollToSelectedNode() {
  getOptionNode(selected.value).get(0).scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}

/** 当前选中项的 DOM 节点（Tab / Enter 前用它判断「确有可采纳的选中项」） */
function getSelectedOptionNode() {
  return getOptionNode(selected.value);
}

defineExpose<PopoverExpose<InputListProps, typeof inputEvents>>({
  setOption,
  inputEvents,
  updatePos: () => popoverRef.value?.updatePos(),
  close,
});
</script>
