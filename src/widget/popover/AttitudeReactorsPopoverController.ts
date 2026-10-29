import { createApp } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import AttitudeReactorsPopover from "../../vue/components/attitude/AttitudeReactorsPopover.vue";
import { PopoverController, createPopoverContainer } from "./PopoverController.ts";
import type { AttitudeReactorsOption } from "../../types/props";

/**
 * 表态用户列表（`AttitudeReactorsPopover`）的控制器：**全站只有一个实例**。
 *
 * 悬停在表态结果条上即弹，移开后延时关闭；列表内容由组件按短评 + 类型自行拉取。
 */
export class AttitudeReactorsPopoverController extends PopoverController<
  AttitudeReactorsOption,
  AttitudeReactorsOption,
  Record<string, never>
> {
  constructor() {
    super({
      type: "attitudeReactors",
      trigger: "pointerover",
      component: createApp(AttitudeReactorsPopover).mount(
        createPopoverContainer(),
      ) as ComponentExposed<typeof AttitudeReactorsPopover>,
    });
    this.installHoverListeners();
  }

  protected override applyOption(option: AttitudeReactorsOption) {
    this.app.setOption(option);
  }

  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: AttitudeReactorsPopoverController | undefined;

  static get instance(): AttitudeReactorsPopoverController {
    if (this.m_instance === undefined) {
      this.m_instance = new AttitudeReactorsPopoverController();
    }
    return this.m_instance;
  }
}
