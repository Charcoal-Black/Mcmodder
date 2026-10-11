// import { Mcmodder } from "../Mcmodder";

import { createApp } from "vue";
import TabIndicator from "../vue/components/TabIndicator.vue";
import type { ComponentExposed } from "vue-component-type-helpers";

export class Swiper {
  // private readonly parent: Mcmodder;
  private readonly instance: JQuery;
  private readonly ul: JQuery;
  private readonly tab: JQuery;
  private readonly indicator;
  private hover = false;
  private timeout?: number;

  constructor(/* parent: Mcmodder, */ instance: JQuery) {
    // this.parent = parent;
    this.instance = instance;
    this.ul = this.instance.find("ul");
    this.tab = $(`<div class="mcmodder-swiper-tab-container">`).appendTo(this.ul);
    this.indicator = createApp(TabIndicator).mount(this.tab.get(0)) as ComponentExposed<
      typeof TabIndicator
    >;
    this.update();

    const ul = this.ul.get(0);
    ul.addEventListener(
      "click",
      () => {
        this.update();
      },
      {
        passive: true,
      },
    );
    ul.addEventListener(
      "pointerover",
      (e) => {
        if (e.target instanceof HTMLLIElement) {
          this.hover = true;
          this.timeout = setTimeout(() => {
            this.update();
          }, 550); // 原生实现中标签切换延迟为 500ms，这里稍微多等待一会，确保标签已完全切换
        }
      },
      {
        passive: true,
      },
    );
    ul.addEventListener(
      "pointerout",
      (e) => {
        if (e.target instanceof HTMLLIElement) {
          if (this.hover) {
            this.hover = false;
            clearTimeout(this.timeout);
            this.timeout = undefined;
          }
        }
      },
      {
        passive: true,
      },
    );
  }

  private update() {
    setTimeout(() => {
      const active = this.ul.find("li.active").get(0) as HTMLElement;
      this.indicator.update(active);
    }, 0);
  }
}
