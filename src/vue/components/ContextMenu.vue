<template>
  <div
    ref="root"
    class="mcmodder-contextmenu"
    :class="{
      'expand-right': classExpandRight,
      'expand-left': classExpandLeft,
      faded: classFaded,
    }"
    v-show="!classHidden"
    :style="{
      left: cssX + 'px',
      top: cssY + 'px',
    }"
    tabindex="-1"
    @keydown="onMenuKeydown"
  >
    <div class="mcmodder-contextmenu-inner">
      <div class="arrow" />
      <ul>
        <li class="empty" v-if="activeIndexLength === 0">当前无可用选项...</li>
        <template v-for="(item, i) in visibleItems">
          <li
            :class="{ selected: selected === i }"
            @pointerenter="onItemPointerenter(i)"
            @pointermove="onItemPointermove(i)"
            @pointerleave="onItemPointerleave(i)"
            @click="onItemClick(i)"
          >
            <a v-html="item.text"></a>
            <span class="item-shortcut-left" v-if="item.shortcut">
              <KeyDisplay :key-data="item.shortcut" />
            </span>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * 通用右键菜单组件。
 *
 * # 与宿主 DOM 的关系
 * 组件**不监听自身**，而是在挂载时向上找两层父元素（`root.parentElement.parentElement`）
 * 作为「宿主容器」，把 `contextmenu` / `click` 事件绑到容器上。这样菜单的定位、显示条件、
 * 条目回调都能拿到宿主上下文（如表格的行、模板列表的条目）。
 * 组件以 `<div>` 挂进容器（如 `GenericTable` 的表格容器、`TemplateFrame` 的 `.group`）。
 *
 * # 菜单项的两层索引
 * 宿主通过 `addItem` 注册**全部**条目（`items`）；每次打开时用每条的 `displayRule` 过滤出
 * 当前可用条目：`visibleItems` 是过滤后的列表，`activeIndexList` 记录它们在 `items` 中的原下标。
 * 模板里遍历的是 `visibleItems`（下标 i），而 `selected` 与 `onItemClick(i)` 用的也是
 * 「过滤后下标」，最终经 `activeIndexList[i]` 映射回 `items` 取到真正的条目。
 *
 * # 回调拿到的事件
 * `callback` 收到的是**打开菜单的那次右键事件**（`contextmenuEvent`），不是点击菜单项的这次
 * click——因为菜单是浮在页面上的，宿主需要靠原右键事件的 `currentTarget` 判断「用户当时右键的是谁」。
 */
import { onMounted, ref, useTemplateRef } from "vue";
import { Utils } from "../../Utils";
import KeyDisplay from "./KeyDisplay";

/** 打开菜单的那次右键事件，回调时透传给 `callback`，供宿主定位被右键的对象 */
let contextmenuEvent: PointerEvent | undefined;
/** 菜单是否处于打开状态（`show`/`hide` 维护；打开时拦截重复的右键事件） */
let activeState = false;
/** 本次打开以来是否已用过键盘（方向键）或指针进入——用于决定悬停是否接管键盘选中的项 */
let pressArrowKeyBeforePointerMove = false;
/** 累计注册的菜单项总数（`addItem` 时累加；当前仅统计，不参与渲染） */
let itemCount = 0;
/** 宿主容器元素（菜单本体之外、真正挂载着菜单的那个 DOM 节点） */
let container: HTMLElement | null = null;
/** 当前可用条目在 `items` 中的原下标（过滤后下标 → 原始下标的映射） */
const activeIndexList: number[] = [];

/** 菜单根节点（`.mcmodder-contextmenu`） */
const root = useTemplateRef("root");
/** 当前选中的「过滤后下标」；-1 表示无选中（模板据此加 `.selected`） */
const selected = ref(-1);
/** 当前可用条目数（`visibleItems.length`，供键盘上下边界与「无可用选项」提示判断） */
const activeIndexLength = ref(0);
/** 宿主注册的全部菜单项（按注册顺序） */
const items = ref<ContextMenuItems>([]);
/** 本次打开时过滤出的可用菜单项（模板实际渲染的就是它） */
const visibleItems = ref<ContextMenuItems>([]);

/** 箭头靠左（菜单默认在右侧展开） */
const classExpandRight = ref(false);
/** 箭头靠右（右侧空间不足时菜单翻到光标左边） */
const classExpandLeft = ref(false);
/** 淡出中（`hide` 置 true；`show` 的 setTimeout 里复位为 false 完成入场动画） */
const classFaded = ref(false);
/** 完全隐藏（`v-show` 开关；淡出结束后才置 true，避免出现动画中断） */
const classHidden = ref(true);

/** 菜单相对宿主容器的水平位置（`style.left`） */
const cssX = ref(0);
/** 菜单相对宿主容器的垂直位置（`style.top`） */
const cssY = ref(0);

/**
 * 挂载时向上找到宿主容器（两层父元素）并绑定事件：
 * - 右键 → 打开菜单（并阻止浏览器默认菜单）；
 * - 在容器内任意点击 → 关闭菜单。
 */
onMounted(() => {
  container = root.value?.parentElement!.parentElement!;
  $(container!)
    .contextmenu((e) => onContextmenu(e.originalEvent as PointerEvent))
    .click((e) => onClick(e.originalEvent as PointerEvent));
});

/**
 * 把菜单移动到相对宿主容器的指定坐标（同时更新模板的 `left` / `top`）。
 *
 * @param x 相对宿主容器左边缘的水平偏移。
 * @param y 相对宿主容器上边缘的垂直偏移。
 */
function moveTo(x: number, y: number) {
  cssX.value = x;
  cssY.value = y;
}

/**
 * 打开菜单。坐标以**宿主容器**为基准传入（调用方已减去容器绝对位置）。
 *
 * 先按 em 单位把菜单挪到光标右下方（做入场动画），再在下一帧测量真实宽度：
 * 若右侧放不下则翻转到光标左侧（`expand-left`），否则保持右侧（`expand-right`）。
 * 定位完成后把焦点移入菜单根节点（`tabindex="-1"`），使键盘上下键/快捷键可用。
 *
 * @param x 相对宿主容器的水平位置（通常是光标 pageX）。
 * @param y 相对宿主容器的垂直位置（通常是光标 pageY）。
 */
function show(x: number, y: number) {
  activeState = true;
  classExpandLeft.value = false;
  classExpandRight.value = false;
  classHidden.value = false;
  selected.value = -1;
  const em = Number(getComputedStyle(root.value!).fontSize.slice(0, -2));
  let nx = x + (2.2 - 0.2) * em;
  let ny = y + (-0.75 - 0.2) * em;
  moveTo(nx, ny);
  setTimeout(() => {
    if (x && y) {
      const menuRect = root.value!.getBoundingClientRect();
      const containerRect = container!.getBoundingClientRect();
      if (menuRect.right <= containerRect.right) {
        // 箭头靠左
        classExpandRight.value = true;
      } else {
        // 箭头靠右
        classExpandLeft.value = true;
        nx = x + (-1.7 - 0.2) * em - menuRect.width;
        ny = y + (-0.75 - 0.2) * em;
      }

      moveTo(nx, ny);
      root.value!.focus();
    }
    classFaded.value = false;
  }, 0);
}

/**
 * 按各条目的 `displayRule` 过滤当前可用项：重建 `activeIndexList`（原下标）、`visibleItems`
 * （可用项本身）与 `activeIndexLength`（数量）。
 *
 * @param e 本次右键事件——`displayRule` 可据此判断上下文（如鼠标是否在某一列表项上）。
 */
function updateMenu(e: PointerEvent) {
  activeIndexList.length = 0;
  visibleItems.value.length = 0;
  activeIndexLength.value = 0;
  items.value.forEach((option, index) => {
    if (option.displayRule(e)) {
      activeIndexList.push(index);
      visibleItems.value.push(option);
      activeIndexLength.value++;
    }
  });
}

/**
 * 右键事件：阻止浏览器默认菜单，保存事件并按 `displayRule` 刷新可用项后打开菜单。
 * 菜单已打开时忽略（避免重复打开导致的定位跳动）。
 */
function onContextmenu(e: PointerEvent) {
  e.preventDefault();
  const absolutePos = Utils.getAbsolutePos(container!);
  if (!activeState) {
    contextmenuEvent = e;
    updateMenu(e);
    show(e.pageX - absolutePos.x, e.pageY - absolutePos.y);
  }
}

/** 容器内任意点击：菜单已打开则关闭 */
function onClick(_e: PointerEvent) {
  if (activeState) {
    hide();
  }
}

/** 关闭菜单：先进入淡出态，200ms 后若期间未被重新打开再真正隐藏（保证动画不被中断） */
function hide() {
  activeState = false;
  classFaded.value = true;
  setTimeout(() => {
    if (!activeState) classHidden.value = true;
  }, 200);
}

/**
 * 注册一个菜单项（仅追加，不立即显示，显示与否由每次打开时的 `displayRule` 决定）。
 *
 * @param option 菜单项：`key` 标识、`text` 为 HTML 文案、`shortcut` 为可选快捷键，
 *               `displayRule` 决定是否显示，`callback` 为点击回调（收到原右键事件）。
 * @returns `{ addItem }`，支持链式注册多个条目。
 */
function addItem(option: ContextMenuItemOption) {
  items.value.push(option);
  itemCount++;
  return { addItem };
}

/**
 * 菜单键盘操作（根节点 `tabindex="-1"`，打开时已聚焦）：
 * 1. 先遍历可用项匹配各自的快捷键，命中则选中并执行；
 * 2. Enter 执行当前选中项；Esc 关闭；↓ / ↑ 在可用项间移动选中。
 * 方向键会置 `pressArrowKeyBeforePointerMove`，避免鼠标恰好停在上次悬停位置时被「夺回」选中态。
 */
function onMenuKeydown(e: KeyboardEvent) {
  if (!activeState) {
    return;
  }
  for (let i = 0; i < activeIndexLength.value; i++) {
    const shortcut = items.value[activeIndexList[i]].shortcut;
    if (shortcut && Utils.isKeyMatch(shortcut, e)) {
      selected.value = i;
      onItemClick(i);
      return;
    }
  }
  if (Utils.isKeyMatch({ keyCode: 13 }, e)) {
    if (selected.value !== -1) {
      onItemClick(selected.value);
    }
  } else if (Utils.isKeyMatch({ keyCode: 27 }, e)) {
    e.preventDefault();
    root.value!.blur();
    hide();
  } else if (Utils.isKeyMatch({ keyCode: 40 }, e)) {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndexLength.value < 1) return;
    pressArrowKeyBeforePointerMove = true;
    if (selected.value === -1) {
      selected.value = 0;
    } else {
      selected.value = Math.min(selected.value + 1, activeIndexLength.value - 1);
    }
  } else if (Utils.isKeyMatch({ keyCode: 38 }, e)) {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndexLength.value < 1) return;
    pressArrowKeyBeforePointerMove = true;
    if (selected.value === -1) {
      selected.value = activeIndexLength.value - 1;
    } else {
      selected.value = Math.max(selected.value - 1, 0);
    }
  }
}

/** 指针进入某项：标记本次已用过指针（此后悬停才接管键盘选中态） */
function onItemPointerenter(_index: number) {
  if (!activeState) {
    return;
  }
  pressArrowKeyBeforePointerMove = true;
}

/** 指针在项间移动：接管选中态（用过滤后下标），仅在已经发生过指针进入后生效 */
function onItemPointermove(index: number) {
  if (!activeState) {
    return;
  }
  if (!pressArrowKeyBeforePointerMove) {
    return;
  }
  // const activeIndex = activeIndexList.indexOf(index);
  selected.value = index;
}

/** 指针离开某项：清除选中态 */
function onItemPointerleave(_index: number) {
  if (!activeState) {
    return;
  }
  selected.value = -1;
}

/**
 * 执行某项：把「过滤后下标」经 `activeIndexList` 映射回 `items` 取到真正条目，
 * 把**打开菜单时的右键事件**交给其 `callback`，随后关闭菜单（200ms 后清除选中态）。
 *
 * @param index `visibleItems` 的下标（即模板 `v-for` 的 i）。
 */
function onItemClick(index: number) {
  if (!activeState) {
    return;
  }
  items.value[activeIndexList[index]].callback(contextmenuEvent!);
  hide();
  setTimeout(() => {
    selected.value = -1;
  }, 2e2);
}

/** 菜单当前是否处于打开状态（供宿主判断点击行为，如 `TemplateFrame` 首次点击加载、再次点击收起） */
function isActive() {
  return activeState;
}

/** 暴露给宿主的操作面：注册条目、查询状态、手动关闭 */
defineExpose({
  addItem,
  isActive,
  hide,
});
</script>
