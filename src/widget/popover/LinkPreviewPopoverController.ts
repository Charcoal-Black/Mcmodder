import { createApp } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import LinkPreviewPopover from "../../vue/components/LinkPreviewPopover.vue";
import { PopoverController, createPopoverContainer } from "./PopoverController.ts";
import type { LinkPreviewOption } from "../../types/props";

/**
 * 资料链接预览（`LinkPreviewPopover`）的控制器：**全站只有一个实例**。
 *
 * 与贴纸查看器一样是**悬停触发**（`pointerover`）：鼠标移入正文中的资料链接并停留片刻后
 * 才弹出预览（避免扫过链接时闪出大块骨架），移入预览框后可继续阅读、滚动或点击其中内容，
 * 移开后延时关闭。
 */
export class LinkPreviewPopoverController extends PopoverController<
  LinkPreviewOption,
  LinkPreviewOption,
  Record<string, never>
> {
  constructor() {
    super({
      type: "linkPreview",
      trigger: "pointerover",
      component: createApp(LinkPreviewPopover).mount(createPopoverContainer()) as ComponentExposed<
        typeof LinkPreviewPopover
      >,
    });
    this.installHoverListeners();
  }

  protected override applyOption(option: LinkPreviewOption) {
    this.app.setOption(option);
  }

  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: LinkPreviewPopoverController | undefined;

  static get instance(): LinkPreviewPopoverController {
    if (this.m_instance === undefined) {
      this.m_instance = new LinkPreviewPopoverController();
    }
    return this.m_instance;
  }
}
