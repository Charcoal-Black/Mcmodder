<template>
  <div
    ref="root"
    class="mcmodder-contextmenu"
    :class="{
      'expand-right': classExpandRight,
      'expand-left': classExpandLeft,
      'faded': classFaded,
    }"
    v-show="!classHidden"
    :style="{
      left: cssX + 'px',
      top: cssY + 'px'
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
            <span class="item-shortcut-left"
              v-if="item.shortcut"
              v-html="McmodderUtils.keyToHTML(item.shortcut)"
            ></span>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>
<script setup lang="ts">

import { onMounted, ref, useTemplateRef } from "vue";
import { McmodderUtils } from "../../Utils";

let contextmenuEvent: PointerEvent | undefined;
let activeState = false;
let pressArrowKeyBeforePointerMove = false;
let itemCount = 0;
let container: HTMLElement | null = null;
const activeIndexList: number[] = [];

const root = useTemplateRef("root");
const selected = ref(-1);
const activeIndexLength = ref(0);
const items = ref<ContextMenuItems>([]);
const visibleItems = ref<ContextMenuItems>([]);

const classExpandRight = ref(false);
const classExpandLeft = ref(false);
const classFaded = ref(false);
const classHidden = ref(true);

const cssX = ref(0);
const cssY = ref(0);

onMounted(() => {
  container = root.value?.parentElement!.parentElement!;
  $(container!)
  .contextmenu(e => onContextmenu(e.originalEvent as PointerEvent))
  .click(e => onClick(e.originalEvent as PointerEvent));
})

function moveTo(x: number, y: number) {
  cssX.value = x;
  cssY.value = y;
}

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
      if (menuRect.right <= containerRect.right) { // 箭头靠左
        classExpandRight.value = true;
      }
      else { // 箭头靠右
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

function onContextmenu(e: PointerEvent) {
  e.preventDefault();
  const absolutePos = McmodderUtils.getAbsolutePos(container!);
  if (!activeState) {
    contextmenuEvent = e;
    updateMenu(e);
    show(e.pageX - absolutePos.x, e.pageY - absolutePos.y);
  }
}

function onClick(_e: PointerEvent) {
  if (activeState) {
    hide();
  }
}

function hide() {
  activeState = false;
  classFaded.value = true;
  setTimeout(() => {
    if (!activeState) classHidden.value = true;
  }, 200);
}

function addItem(option: ContextMenuItemOption) {
  items.value.push(option);
  itemCount++;
  return { addItem };
}

function onMenuKeydown(e: KeyboardEvent) {
  if (!activeState) {
    return;
  }
  for (let i = 0; i < activeIndexLength.value; i++) {
    const shortcut = items.value[activeIndexList[i]].shortcut;
    if (shortcut && McmodderUtils.isKeyMatch(shortcut, e)) {
      selected.value = i;
      onItemClick(i);
      return;
    }
  }
  if (McmodderUtils.isKeyMatch({ keyCode: 13 }, e)) {
    if (selected.value !== -1) {
      onItemClick(selected.value);
    }
  }
  else if (McmodderUtils.isKeyMatch({ keyCode: 27 }, e)) {
    e.preventDefault();
    root.value!.blur();
    hide();
  }
  else if (McmodderUtils.isKeyMatch({ keyCode: 40 }, e)) {
    e.preventDefault();
    e.stopPropagation();
    if (activeIndexLength.value < 1) return;
    pressArrowKeyBeforePointerMove = true;
    if (selected.value === -1) {
      selected.value = 0;
    } else {
      selected.value = Math.min(selected.value + 1, activeIndexLength.value - 1);
    }
  }
  else if (McmodderUtils.isKeyMatch({ keyCode: 38 }, e)) {
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

function onItemPointerenter(_index: number) {
  if (!activeState) {
    return;
  }
  pressArrowKeyBeforePointerMove = true;
}

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

function onItemPointerleave(_index: number) {
  if (!activeState) {
    return;
  }
  selected.value = -1;
}

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

function isActive() {
  return activeState;
}

defineExpose({
  addItem,
  isActive,
  hide
})

</script>