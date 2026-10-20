import { createApp } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import AttitudePicker from "../../vue/components/attitude/AttitudePicker.vue";
import { PopoverController, createPopoverContainer } from "./PopoverController.ts";

/**
 * 自定义表态选择面板（`AttitudePicker`）的控制器：**全站只有一个实例**。
 *
 * 面板的选项是懒加载的——登记时只给出一个「算出选项」的回调，
 * 真正被触发时才去解析短评节点、取出计数并打开面板。
 */
export class AttitudePickerPopoverController extends PopoverController<
  AttitudePickerState,
  AttitudePickerState,
  ComponentExposed<typeof AttitudePicker>["inputEvents"]
> {
  constructor() {
    super({
      type: "attitudePicker",
      trigger: "click",
      component: createApp(AttitudePicker).mount(createPopoverContainer()) as ComponentExposed<
        typeof AttitudePicker
      >,
    });
  }

  protected override applyOption(option: AttitudePickerState) {
    this.app.setOption(option);
  }

  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: AttitudePickerPopoverController | undefined;

  static get instance(): AttitudePickerPopoverController {
    if (this.m_instance === undefined) {
      this.m_instance = new AttitudePickerPopoverController();
    }
    return this.m_instance;
  }
}
