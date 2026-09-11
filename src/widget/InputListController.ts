import { createApp } from "vue";
import InputList from "../vue/components/InputList.vue";
import { InputListBindElement, InputListOption } from "../types";
import { McmodderUtils } from "../Utils.ts";

export class InputListController {
  private static m_instance: InputListController | undefined;

  private readonly ac = new AbortController();
  private readonly opt = {
    capture: true,
    signal: this.ac.signal
  };

  private readonly app;
  private readonly optionMap = new WeakMap<HTMLElement, InputListOption>;

  constructor() {
    const body = document.body;
    const container = $('<div class="mcmodder-input-container">').appendTo(body);
    this.app = createApp(InputList).mount(container.get(0)) as InstanceType<typeof InputList>;
    
    window.addEventListener("focus", e => {
      const target = e.composedPath()[0] as HTMLElement;
      const option = this.optionMap.get(target);
      if (option) {
        const bindElement = option.inputListBindElement ?? target as InputListBindElement;
        this.app.setOption({
          inputNode: bindElement,
          ...option
        });
      }
    }, this.opt);

    window.addEventListener("scroll", McmodderUtils.animationThrottle(() => {
      this.app.updatePos();
    }), {
      passive: true,
      ...this.opt
    });

    for (const [key, event] of Object.entries(this.app.inputEvents)) {
      window.addEventListener(key, e => {
        const target = e.composedPath()[0] as InputListBindElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          return;
        }
        if (this.optionMap.has(target)) {
          event(e);
        }
      }, this.opt);
    }

    InputListController.m_instance = this;
  }

  static get instance() {
    if (this.m_instance === undefined) {
      this.m_instance = new InputListController;
    }
    return this.m_instance;
  }

  add(e: HTMLElement, option: InputListOption) {
    if (this.optionMap.has(e)) {
      throw new Error("元素已绑定下拉菜单事件。");
    }
    this.optionMap.set(e, option);
    return (eventName: keyof typeof this.app.inputEvents, event?: Event) => {
      this.app.inputEvents[eventName](event ?? new Event(eventName));
    }
  }

  abort() {
    this.ac.abort();
  }
}