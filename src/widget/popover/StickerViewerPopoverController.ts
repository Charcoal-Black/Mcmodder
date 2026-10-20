import { createApp } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import StickerPopover from "../../vue/components/StickerPopover.vue";
import { PopoverController, createPopoverContainer } from "./PopoverController.ts";

/**
 * 表态贴纸查看器（`StickerPopover`）的控制器：**全站只有一个实例**。
 *
 * 它与其它弹出框的触发方式不同——**悬停即弹**（`pointerover`），而不是点击：
 * 鼠标移到表情贴纸上就弹出预览，移开后延时关闭。
 */
export class StickerViewerPopoverController extends PopoverController<
  StickerViewerOption,
  StickerViewerOption,
  Record<string, (e: Event) => void>
> {
  constructor() {
    super({
      type: "stickerViewer",
      trigger: "pointerover",
      component: createApp(StickerPopover).mount(createPopoverContainer()) as ComponentExposed<
        typeof StickerPopover
      >,
    });
    this.installHoverListeners();
  }

  protected override applyOption(option: StickerViewerOption) {
    this.app.setOption(option);
  }

  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: StickerViewerPopoverController | undefined;

  static get instance(): StickerViewerPopoverController {
    if (this.m_instance === undefined) {
      this.m_instance = new StickerViewerPopoverController();
    }
    return this.m_instance;
  }
}
