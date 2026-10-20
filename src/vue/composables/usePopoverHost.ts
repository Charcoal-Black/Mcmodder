import { type Ref, reactive, ref, watch, useTemplateRef } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import Popover from "../components/Popover.vue";
import type { PopoverBaseOption } from "../../types/props";

/** `Popover` 组件对外暴露的接口（重新定位、显隐同步、高度测量） */
export type PopoverInstance = ComponentExposed<typeof Popover>;

/**
 * 弹出框默认的 z-index（与 `base.css` 里 `.mcmodder-popover` 的取值一致）。
 *
 * 之所以在这里也写一份：选项（`PopoverBaseOption.zIndex`）可能显式指定别的值，
 * 那时就要盖过样式表里的默认值。
 */
const DEFAULT_Z_INDEX = 500;

/** 透传给 `<Popover>` 的属性 */
export interface PopoverProps {
  /** 定位锚点（以此元素的矩形计算位置与宽度） */
  anchorElement: HTMLElement | undefined;
  /** z-index */
  zIndex: number;
  /** 最大高度限制（`null` = 不限） */
  maxHeight: number | null;
}

/** `usePopoverHost` 的可选参数 */
export interface UsePopoverHostOptions {
  /**
   * 弹出框的显示状态。
   *
   * 缺省时由 composable 自己维护（`visible.value = true` 即弹出）；
   * 显示状态由别处决定时（如候选列表的显隐取决于匹配结果）传自己的 ref 进来。
   */
  visible?: Ref<boolean>;
  /** 刚打开时的额外动作（如表态面板要重新定位页签指示器） */
  onOpen?: () => void;
  /** 最大高度限制（`null` = 不限） */
  maxHeight?: number | null;
}

/**
 * 弹出框宿主（`Popover` 组件）的通用接线。
 *
 * 三个弹出框组件（候选列表 `InputList`、表态面板 `AttitudePicker`、贴纸查看器 `StickerPopover`）
 * 长成同一个样子：根节点是 `<Popover>`，要把锚点等属性透传给它，并且都要对外提供
 * `updatePos`（跟随锚点重新定位）与 `close`（收起）两个接口——控制器正是这样调用它们的。
 * 这部分接线集中在这里，三个组件各自只留自己的业务逻辑。
 *
 * 用法：
 * ```ts
 * const { visible, popoverProps, applyOption, updatePos, close } = usePopoverHost();
 * ```
 * 模板里写 `<Popover ref="popoverRef" v-bind="popoverProps">`——
 * `ref` 的名字必须与本 composable 内部取的一致（`popoverRef`），否则拿不到实例。
 */
export function usePopoverHost(options: UsePopoverHostOptions = {}) {
  /** `<Popover>` 的实例（显隐同步、重新定位都要经由它） */
  const popoverRef = useTemplateRef<PopoverInstance>("popoverRef");
  /** 是否显示 */
  const visible = options.visible ?? ref(false);
  /** 透传给 `<Popover>` 的属性（模板里 `v-bind="popoverProps"`） */
  const popoverProps = reactive<PopoverProps>({
    anchorElement: undefined,
    zIndex: DEFAULT_Z_INDEX,
    maxHeight: options.maxHeight ?? null,
  });

  // 显隐同步：显示状态一变就通知 `Popover`（它据此播放淡入淡出），打开时再量一次高度
  watch(visible, (value) => {
    popoverRef.value?.onPopoverVisibilityChange(value);
    if (value) {
      popoverRef.value?.onPopoverHeightChange();
      options.onOpen?.();
    }
  });

  /**
   * 把选项里与弹出框表现相关的部分（锚点、z-index）透传给 `<Popover>`。
   *
   * 组件在 `setOption` 里调用即可——那是它唯一知道「当前服务的是哪个锚点」的时机。
   */
  function applyOption(option: PopoverBaseOption) {
    popoverProps.anchorElement = option.anchorElement;
    popoverProps.zIndex = option.zIndex ?? DEFAULT_Z_INDEX;
  }

  /** 重新量一次锚点位置（页面滚动 / 缩放时由控制器调用） */
  function updatePos() {
    popoverRef.value?.updatePos();
  }

  /** 收起弹出框 */
  function close() {
    visible.value = false;
  }

  return { popoverRef, visible, popoverProps, applyOption, updatePos, close };
}
