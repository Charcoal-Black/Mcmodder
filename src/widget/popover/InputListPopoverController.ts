import { createApp } from "vue";
import type { ComponentExposed } from "vue-component-type-helpers";
import InputList from "../../vue/components/InputList.vue";
import { PopoverController, createPopoverContainer } from "./PopoverController.ts";
import type { InputListProps } from "../../types/props";

/**
 * 候选列表（`InputList`）的控制器：**全站只有一个实例**。
 *
 * 候选列表挂在各种原生输入框上（百科的 textarea、UEditor 的备注框、乃至显示成按钮的下拉菜单），
 * 因此它与其它弹出框有个本质区别——**交互元素 ≠ 输入元素**：
 * `option.inputListBindElement` 可以把「什么时候弹列表」的元素与「文本读写」的元素分开
 * （见 `DropdownMenuInput.vue`）。
 */
export class InputListPopoverController extends PopoverController<
  InputListOption,
  InputListProps,
  ComponentExposed<typeof InputList>["inputEvents"]
> {
  constructor() {
    super({
      type: "inputList",
      trigger: "click",
      component: createApp(InputList).mount(createPopoverContainer()) as ComponentExposed<
        typeof InputList
      >,
    });
  }

  /**
   * 交互元素与输入元素可以不同：缺省时就是登记的这个元素本身。
   */
  protected override applyOption(option: InputListOption, target: HTMLElement) {
    const bindElement = option.inputListBindElement ?? (target as InputListBindElement);
    this.app.setOption({
      inputNode: bindElement,
      ...option,
    });
  }

  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: InputListPopoverController | undefined;

  static get instance(): InputListPopoverController {
    if (this.m_instance === undefined) {
      this.m_instance = new InputListPopoverController();
    }
    return this.m_instance;
  }
}
