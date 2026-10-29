<template>
  <div
    v-show="!classHidden"
    ref="list"
    class="mcmodder-popover"
    :class="{ 'expand-upward': expandUpward }"
    :style="[cssPos, { zIndex: props.zIndex }]"
  >
    <div class="mcmodder-popover-anim" :class="{ faded: classFaded }">
      <div class="mcmodder-popover-inner" :style="heightCss">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from "vue";
import { Values } from "../../Values";
import { Utils } from "../../Utils";

const props = withDefaults(
  defineProps<{
    /** 定位锚点；缺省为输入元素本身（下拉菜单会把它指向那个可见的按钮） */
    anchorElement?: HTMLElement;
    /** 最大高度限制；缺省或 null 为无限制 */
    maxHeight?: number | null;
    /**
     * 决定弹出框样式中的 z-index 值，在诸如需要区分是否会被 swal 弹出框（z-index=1000）
     * 覆盖的场景下很有用 @default 500
     * */
    zIndex?: number;
  }>(),
  {
    anchorElement: undefined,
    maxHeight: null,
    zIndex: 500,
  },
);

const listRef = useTemplateRef("list");
const visibility = ref(false);
/** 锚点元素的矩形缓存（`updatePos` 在聚焦、页面滚动与缩放时刷新） */
const rectRef = shallowRef<DOMRect>();
/** 列表自身高度（向上弹出时用来算 top，也是 `expandUpward` 的判断依据） */
const listHeight = ref(0);
/** 列表自身宽度（水平方向上把弹出框 constraint 在视口内时使用） */
const listWidth = ref(0);
/** 淡出中（`selectable` 由真变假时置 true）；初始为 true，保证首次显示从透明态淡入 */
const classFaded = ref(true);
/** 完全隐藏（`v-show` 开关；淡出结束后才置 true） */
const classHidden = ref(true);
/** 与 `.mcmodder-popover-anim` 的过渡时长保持一致 */
const ANIM_MS = 160;
/** 淡出结束后真正隐藏的定时器（重开时取消） */
let hideTimer: number | undefined;

/**
 * 是否需要向上弹出：下方放不下而上方放得下时向上；两侧都放得下但上方更宽裕时也向上
 * （上方的可用空间扣除了吸顶导航高度，避免列表被页头遮住）。
 */
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

/** 列表的定位与尺寸样式（相对锚点：向下为锚点下方，向上为锚点上方且减去自身高度） */
const cssPos = computed(() => {
  if (!props.anchorElement) {
    return {
      left: 0,
      top: 0,
      "min-width": "0px",
    };
  }

  const { x: absPosX, y: absPosY } = props.anchorElement
    ? Utils.getAbsolutePos(props.anchorElement)
    : { x: 0, y: 0 };

  if (rectRef.value === undefined) {
    updatePos();
  }

  const rect = rectRef.value!;
  const anchorWidth = rect.width;

  // 水平方向：默认与锚点左对齐向右展开；若右边界超出视口，则先尝试右对齐锚点右端，
  // 让弹出框尽量覆盖锚点所在的水平范围、不遮挡锚点；仍放不下时再整体平移至视口内。
  const margin = 16;
  const popoverWidth =
    listWidth.value || (listRef.value ? listRef.value.getBoundingClientRect().width : 0);
  const viewportLeft = window.scrollX + margin;
  const viewportRight = window.scrollX + innerWidth - margin;

  let left = absPosX;
  if (popoverWidth > 0) {
    if (left + popoverWidth > viewportRight) {
      const anchorRightDoc = absPosX + anchorWidth;
      const candidate = anchorRightDoc - popoverWidth;
      if (candidate >= viewportLeft && candidate + popoverWidth <= viewportRight) {
        left = candidate;
      } else {
        left = viewportRight - popoverWidth;
      }
    }
    if (left < viewportLeft) {
      left = viewportLeft;
    }
  }

  const maxWidth = Math.max(0, innerWidth - margin * 2) + "px";

  if (expandUpward.value) {
    const bottom = innerHeight - absPosY;
    return {
      left: left + "px",
      bottom: bottom + "px",
      "max-width": maxWidth,
    };
  } else {
    const top = absPosY + rect.height;
    return {
      left: left + "px",
      top: top + "px",
      "max-width": maxWidth,
    };
  }
});

const heightCss = computed(() => {
  if (rectRef.value === undefined) {
    updatePos();
  }

  if (props.maxHeight === null) {
    return;
  }

  const rect = rectRef.value;
  const maxHeight =
    rect !== undefined
      ? expandUpward.value
        ? rect.top - Values.headerContainerHeight - 16
        : innerHeight - rect.bottom - 16
      : props.maxHeight;

  return {
    "max-height": Math.min(maxHeight, props.maxHeight) + "px",
  };
});

function onPopoverVisibilityChange(state: boolean) {
  visibility.value = state;
}

function onPopoverHeightChange() {
  nextTick(() => {
    const measured = listRef.value!.getBoundingClientRect();
    listHeight.value = measured.height;
    listWidth.value = measured.width;
    updatePos();
  });
}

/**
 * 显隐动画。
 *
 * 定位依赖的是根节点的布局盒，而动画层（`.mcmodder-popover-anim`）的 transform
 * 不会影响根节点的布局盒，因此动画期间 `updatePos` 量到的仍是最终尺寸。
 *
 * 显示时必须先让 faded 起始态完成一次布局，再移除 faded：`display: none -> block`
 * 与 opacity 变化若发生在同一帧，CSS transition 不会触发。
 */
watch(
  () => visibility.value,
  (newValue) => {
    window.clearTimeout(hideTimer);

    if (newValue) {
      classHidden.value = false;
      classFaded.value = true;
      nextTick(() => {
        updatePos();
        // 没有锚点时 updatePos 会提前返回，这里显式强制一次布局
        void listRef.value?.offsetHeight;
        if (visibility.value) {
          classFaded.value = false;
        }
      });
    } else {
      classFaded.value = true;
      hideTimer = window.setTimeout(() => {
        if (!visibility.value) {
          classHidden.value = true;
        }
      }, ANIM_MS);
    }
  },
);

onBeforeUnmount(() => {
  window.clearTimeout(hideTimer);
});

/** 刷新锚点矩形缓存（聚焦时、以及页面滚动 / 缩放时由控制器调用） */
function updatePos() {
  if (!props.anchorElement) {
    return;
  }
  rectRef.value = props.anchorElement.getBoundingClientRect();
  if (listRef.value) {
    const measured = listRef.value.getBoundingClientRect();
    if (measured.height > 0) {
      listHeight.value = measured.height;
    }
    if (measured.width > 0) {
      listWidth.value = measured.width;
    }
  }
}

defineExpose({
  /** 重新量一次锚点矩形（页面滚动 / 缩放时调用以跟随位置） */
  updatePos,
  /** 是否需要向上弹出（`false` 时向下） */
  expandUpward,
  /** 更新弹出框的显示状态 */
  onPopoverVisibilityChange,
  /** 更新弹出框的高度 */
  onPopoverHeightChange,
  /** 供子组件确定容器大小 */
  rectRef,
});
</script>
