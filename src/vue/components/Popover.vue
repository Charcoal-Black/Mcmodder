<template>
  <div
    v-show="!classHidden"
    ref="list"
    class="mcmodder-popover"
    :class="{
      'expand-upward': placement === 'top',
      'expand-left': placement === 'left',
      'expand-right': placement === 'right',
    }"
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
import type { PopoverProps } from "../composables/usePopoverHost";

const props = withDefaults(defineProps<PopoverProps>(), {
  anchorElement: undefined,
  maxHeight: null,
  zIndex: 500,
  direction: "up-down",
  align: "start",
});

const listRef = useTemplateRef<HTMLElement>("list");
const visibility = ref(false);
/** 锚点元素的矩形缓存（`updatePos` 在聚焦、页面滚动与缩放时刷新） */
const rectRef = shallowRef<DOMRect>();
/** 列表自身高度（向上/向下展开与垂直居中对齐的判断依据） */
const listHeight = ref(0);
/** 列表自身宽度（向左/向右展开、水平居中对齐与视口约束的判断依据） */
const listWidth = ref(0);
/** 淡出中（`selectable` 由真变假时置 true）；初始为 true，保证首次显示从透明态淡入 */
const classFaded = ref(true);
/** 完全隐藏（`v-show` 开关；淡出结束后才置 true） */
const classHidden = ref(true);
/** 与 `.mcmodder-popover-anim` 的过渡时长保持一致 */
const ANIM_MS = 160;
/** 淡出结束后真正隐藏的定时器（重开时取消） */
let hideTimer: number | undefined;

/** 与锚点之间的间距（px）；与 `.mcmodder-popover` 垂直方向的 margin 保持一致 */
const ANCHOR_GAP = 4;
/** 弹出框与视口边缘至少保持的距离（px） */
const VIEWPORT_MARGIN = 16;

/** 弹出框相对锚点的展开方向 */
type PopoverPlacement = "top" | "bottom" | "left" | "right";

/** `direction` 为 `"right" | "left-right"` 时沿水平方向展开，其余情况沿竖直方向展开 */
const isHorizontalDirection = computed(
  () => props.direction === "right" || props.direction === "left-right",
);

/**
 * 根据 `direction` 与两侧可用空间决定展开方向。
 *
 * - `up-down` 保持原有行为：下方放不下而上方放得下时向上；两侧都放得下但上方更宽裕时也向上；
 * - `down` 只有下方放不下时才向上；
 * - `left-right` 选择左右两侧中空间更大的一侧；
 * - `right` 只有右侧放不下时才向左。
 *
 * 上方的可用空间扣除了吸顶导航高度，避免列表被页头遮住。
 */
const placement = computed<PopoverPlacement>(() => {
  const rect = rectRef.value;
  if (!rect) {
    return "bottom";
  }

  if (isHorizontalDirection.value) {
    const leftSpace = rect.left;
    const rightSpace = innerWidth - rect.right;
    if (props.direction === "right") {
      if (rightSpace >= listWidth.value) {
        return "right";
      }
      return leftSpace > rightSpace ? "left" : "right";
    }
    return leftSpace > rightSpace ? "left" : "right";
  }

  const topSpace = rect.top - Values.headerContainerHeight;
  const bottomSpace = innerHeight - rect.bottom;
  if (props.direction === "down") {
    if (bottomSpace >= listHeight.value) {
      return "bottom";
    }
    return topSpace > bottomSpace ? "top" : "bottom";
  }

  // up-down：保持重构前的判断顺序，避免默认行为发生变化
  if (bottomSpace < listHeight.value && topSpace >= listHeight.value) {
    return "top";
  }
  if (bottomSpace >= listHeight.value && topSpace > bottomSpace) {
    return "top";
  }
  return "bottom";
});

/** 把数值限制在 `[min, max]` 内；当区间无效（弹出框比视口还大）时优先保证左/上边界 */
function clampToViewport(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

/**
 * 列表的定位样式。
 *
 * 以锚点矩形为基准：`direction` 决定主展开方向，`align` 决定交叉轴上的对齐方式；
 * 任一方向放不下时都会把弹出框平移回视口内，避免超出页面或遮挡页面边缘。
 */
const cssPos = computed(() => {
  if (!props.anchorElement) {
    return {
      left: 0,
      top: 0,
      "min-width": "0px",
    };
  }

  const { x: anchorDocLeft, y: anchorDocTop } = Utils.getAbsolutePos(props.anchorElement);

  if (rectRef.value === undefined) {
    updatePos();
  }

  const rect = rectRef.value!;
  const anchorDocRight = anchorDocLeft + rect.width;
  const anchorDocBottom = anchorDocTop + rect.height;
  const popoverWidth =
    listWidth.value || (listRef.value ? listRef.value.getBoundingClientRect().width : 0);
  const viewportLeft = window.scrollX + VIEWPORT_MARGIN;
  const viewportRight = window.scrollX + innerWidth - VIEWPORT_MARGIN;
  const viewportTop = window.scrollY + Math.max(Values.headerContainerHeight, VIEWPORT_MARGIN);
  const viewportBottom = window.scrollY + innerHeight - VIEWPORT_MARGIN;
  const maxWidth = Math.max(0, innerWidth - VIEWPORT_MARGIN * 2) + "px";

  if (placement.value === "left" || placement.value === "right") {
    // 水平展开：`align` 控制与锚点在竖直方向上的对齐（start = 上边缘，center = 水平轴线）
    const left =
      placement.value === "right"
        ? anchorDocRight + ANCHOR_GAP
        : anchorDocLeft - popoverWidth - ANCHOR_GAP;
    const clampedLeft = clampToViewport(left, viewportLeft, viewportRight - popoverWidth);

    const top =
      props.align === "center" ? anchorDocTop + (rect.height - listHeight.value) / 2 : anchorDocTop;
    const clampedTop = clampToViewport(top, viewportTop, viewportBottom - listHeight.value);

    return {
      left: clampedLeft + "px",
      top: clampedTop + "px",
      "max-width": maxWidth,
    };
  }

  // 竖直展开：`align` 控制与锚点在水平方向上的对齐（start = 左边缘，center = 竖直轴线）
  let left =
    props.align === "center" ? anchorDocLeft + (rect.width - popoverWidth) / 2 : anchorDocLeft;
  if (popoverWidth > 0) {
    // start 对齐时若右侧放不下，先尝试右对齐锚点右端，尽量覆盖锚点所在的水平范围；
    // 仍放不下则交给下面的视口钳制处理。
    if (props.align === "start" && left + popoverWidth > viewportRight) {
      const candidate = anchorDocRight - popoverWidth;
      if (candidate >= viewportLeft) {
        left = candidate;
      }
    }
    left = clampToViewport(left, viewportLeft, viewportRight - popoverWidth);
  }

  if (placement.value === "top") {
    const bottom = innerHeight - anchorDocTop;
    return {
      left: left + "px",
      bottom: bottom + "px",
      "max-width": maxWidth,
    };
  }

  return {
    left: left + "px",
    top: anchorDocBottom + "px",
    "max-width": maxWidth,
  };
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
      ? isHorizontalDirection.value
        ? innerHeight - Math.max(Values.headerContainerHeight, VIEWPORT_MARGIN) - VIEWPORT_MARGIN
        : placement.value === "top"
          ? rect.top - Values.headerContainerHeight - VIEWPORT_MARGIN
          : innerHeight - rect.bottom - VIEWPORT_MARGIN
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
  /** 弹出框的根节点（控制器据此判断事件是否发生在**本**弹出框内部） */
  rootElement: listRef,
  /** 重新量一次锚点矩形（页面滚动 / 缩放时调用以跟随位置） */
  updatePos,
  /** 更新弹出框的显示状态 */
  onPopoverVisibilityChange,
  /** 重新测量弹出框尺寸（高度参与方向判断，宽度参与水平定位） */
  onPopoverHeightChange,
  /** 供子组件确定容器大小 */
  rectRef,
});
</script>
