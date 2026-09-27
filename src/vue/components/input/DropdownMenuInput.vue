<template>
  <span ref="container" class="mcmodder-dropdown-container" :class="{ expanded: selected }">
    <input ref="valueInput" readonly class="hidden" @change="onChange" />
    <input
      ref="input"
      readonly
      class="btn mcmodder-dropdown-button"
      :value="content"
      @click="onClick"
      @focus="onFocus"
      @blur="onBlur"
    />
  </span>
</template>

<script setup lang="ts">
/**
 * 下拉菜单式的枚举值选择器（`InputType.DROPDOWN_MENU` 的实现）：外观是一个只读按钮，
 * 展开后用全局的候选列表（`InputList`）来选值——**不自己实现下拉逻辑，而是复用候选列表**。
 *
 * # 交互元素 ≠ 输入元素（这里是重点）
 * 组件里有两个 input，职责完全不同：
 * - `ref="input"`（模板中的按钮）：**交互元素**。它被登记进 `InputListController`，
 *   负责 focus 触发候选列表、显示展开态、点击外部收起；
 * - `ref="valueInput"`（模板中的隐藏 input）：**输入元素**。候选列表的一切输入逻辑都作用在它上面——
 *   值的读写、补全写回、以及 `useInputBase` 的校验流程（`getDOMValue` 从它取值、
 *   `@change` 触发 `onChange` 校验）。
 *
 * 登记时通过 `inputListBindElement` 把两者拆开、指向 `valueInput`，并用 `anchorElement` 让
 * 候选列表贴着可见的按钮定位；候选被采纳时写进的是 `valueInput` 的 `value`，
 * 再由 `content`（`range[值]`）反向渲染出按钮上的文案。
 * 若让两者合一，候选列表就会把「按钮」当作文本框来改写，`readonly` 的按钮将无法承载补全过程。
 */
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { InputListController } from "../../../widget/InputListController.ts";
import { useInputBase } from "../../composables/useInputBase.ts";
import type { InputProps } from "../../../types/props";

interface Props extends InputProps<number> {
  range: InputValueSet;
}

const props = defineProps<Props>();
/** 外层容器（作为 `InputControlRef.getInstance` 返回的元素） */
const containerRef = useTemplateRef("container");
/** **交互元素**：可见的按钮，登记到 `InputListController` 的是它 */
const inputRef = useTemplateRef("input");
/** **输入元素**：隐藏的 input，候选列表与 `useInputBase` 的读写都作用在它上面 */
const valueInputRef = useTemplateRef("valueInput");

/** 手动向候选列表派发事件的函数（`add` 的返回值），用于补发该元素收不到的事件 */
let eventSender: ReturnType<typeof InputListController.instance.add>;
/** 是否处于展开态（决定按钮的 `.expanded` 样式） */
const selected = ref(false);
/** 刚被程序化聚焦的 100ms 内的标记：用于区分「点按钮展开」与「点按钮收起」 */
let focusLock = false;

/** 按钮上显示的文案：按当前值从 `range` 里取（`range` 的值即展示用 HTML） */
const content = computed(() => {
  return props.range[valueRef.value];
});

/**
 * 值与校验流程绑在**输入元素**（`valueInputRef`）上：取值走 `getDOMValue`，
 * 写入的 `input` 事件触发 `onChange` 校验；未通过时由 `useInputBase` 弹提示并回填当前值。
 */
const { valueRef, getValue, onChange } = useInputBase({
  inputRef: valueInputRef,
  value: props.value,
  getDOMValue,
  validate,
  onSuccessfulChange: props.onSuccessfulChange,
});

/** 从输入元素读取当前值（候选列表写回的是 `valueInput` 的 `value`，故这里是数字） */
function getDOMValue() {
  return Number(valueInputRef.value!.value);
}

/** 点击按钮：已展开且不是「刚聚焦」时才收起（点自己弹出的那次不算） */
function onClick() {
  if (selected.value && !focusLock) {
    inputRef.value!.blur();
  }
}

/** 按钮获得焦点（通常是点击后候选列表打开时补的焦点）：标记展开，并上锁 100ms */
function onFocus() {
  selected.value = true;
  focusLock = true;
  setTimeout(() => {
    focusLock = false;
  }, 100);
}

/** 按钮失焦：收起 */
function onBlur() {
  selected.value = false;
}

onMounted(() => {
  // 登记交互元素（按钮），但把输入逻辑指向隐藏的 `valueInput`，定位锚点也用按钮
  eventSender = InputListController.instance.add(inputRef.value!, {
    inputListBindElement: valueInputRef.value!,
    anchorElement: inputRef.value!,
    // 枚举选择是「列出全部」而非「按输入过滤」，不做拼音匹配
    alwaysShowAllSuggestions: true,
    // 不提供 onModifySuggestion → 候选列表不显示新增 / 删除 / 改名按钮
    suggestionManager: {
      onInitSuggestion: () => Object.entries(props.range).map(([value, html]) => ({ html, value })),
    },
  });
});

/** 校验：采纳的候选必须是 `range` 中的键（正常流程下必然成立，此处兜底非法写入） */
function validate(newValue: number) {
  if (Object.keys(props.range).map(Number).includes(newValue))
    return {
      isok: true,
      final: newValue,
    };
  return {
    isok: false,
    msg: "你干~~嘛~~~哈哈哎~哟。",
  };
}

/** 对外暴露的元素：整个容器（含按钮与隐藏 input） */
function getInstance() {
  return containerRef.value!;
}

/** 直接改值并刷新显示（不触发 `onSuccessfulChange` 回调） */
function setCurrentValue(val: number) {
  valueRef.value = val;
  setDisplayValue(val);
}

/**
 * 刷新按钮上显示的值，并补发一次 `input` 事件。
 * 候选列表采纳某项时只改了隐藏 input 的 `value` 并派发 `input` / `change`，
 * 这里把同一事件也转交给候选列表，使匹配状态同步刷新（值未变时列表内容不变）。
 */
function setDisplayValue(val: number) {
  inputRef.value!.value = val.toString();
  eventSender("input");
}

defineExpose<InputControlRef<number>>({
  getInstance,
  getValue,
  setCurrentValue,
  setDisplayValue,
});
</script>
