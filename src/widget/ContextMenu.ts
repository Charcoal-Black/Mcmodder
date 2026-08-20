import type { McmodderKeyData } from "../types";
import { McmodderUtils } from "../Utils";

type ContextMenuDisplayRule = (e: JQueryMouseEventObject) => boolean;
type ContextMenuCallback = (e: any) => void;

export interface ContextMenuEntry {
  key: string;
  text: string;
  icon?: string;
  shortcut?: McmodderKeyData;
  callback: (e: unknown) => void;
  shortcutHTML?: string;
  iconGlyph?: string;
}

export interface ContextMenuExpose {
  show: (x: number, y: number, activeIndexList: number[], entries: ContextMenuEntry[], event: unknown) => Promise<void>;
  hide: () => void;
  getActiveState: () => boolean;
}

type ContextMenuItem = {
  key: string;
  text: string;
  icon?: string;
  shortcut?: McmodderKeyData;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
};

export type ContextMenuItemOption = {
  key: string;
  text: string;
  icon?: string;
  shortcut?: McmodderKeyData;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
};

/** FontAwesome 字形缓存：从宿主页面读取 `::before` 内容，供 Shadow DOM 内渲染图标 */
const faGlyphCache: Record<string, string> = {};

function getFaGlyph(className: string): string {
  if (!(className in faGlyphCache)) {
    let glyph = "";
    try {
      const probe = document.createElement("i");
      probe.className = className;
      probe.style.visibility = "hidden";
      probe.style.position = "fixed";
      document.body.appendChild(probe);
      const content = getComputedStyle(probe, "::before").content;
      probe.remove();
      glyph = content && content !== "none" ? content.replace(/^"|"$/g, "") : "";
    } catch (e) {
      console.warn("获取 FontAwesome 字形失败:", className, e);
    }
    faGlyphCache[className] = glyph;
  }
  return faGlyphCache[className];
}

export class McmodderContextMenu {

  private $container: JQuery;
  private container: HTMLElement;
  private activeState: boolean;
    private $instance: JQuery;
  instance: Element;
  private items: ContextMenuItem[];
  private itemCount = 0;
  private contextmenuEvent?: JQueryMouseEventObject;
  private activeIndexList: number[] = [];
  private component?: ContextMenuExpose;
  private mountPromise?: Promise<void>;

  constructor(container: Element | JQuery) {
    this.$container = $(container).css("position", "relative");
    this.container = this.$container.get(0) as HTMLElement;
    this.activeState = false;
    this.$instance = $(`
      <div class="mcmodder-contextmenu-host" tabindex="-1"></div>`).prependTo(container);
    this.instance = this.$instance.get(0);
    this.items = [];
    // 宿主样式只需注入一次（宿主位于 Shadow DOM 之外）
    if (!document.getElementById("mcmodder-contextmenu-host-style")) {
      const style = document.createElement("style");
      style.id = "mcmodder-contextmenu-host-style";
      style.textContent = `
        .mcmodder-contextmenu-host {
          position: absolute;
          left: 0;
          top: 0;
          width: 0;
          height: 0;
          z-index: 1;
        }
      `;
      document.head.appendChild(style);
    }
    this.bindEvents();
  }

  private async ensureMounted() {
    if (this.component) return;
    if (!this.mountPromise) {
      this.mountPromise = Promise.all([
        import("../vue/components/ContextMenu.vue"),
        import("../vue/mount")
      ]).then(([module, mount]) => {
        mount.mountVueApp(module.default, {
          container: this.container,
          onReady: (api: ContextMenuExpose) => {
            this.component = api;
          }
        }, this.$instance.get(0) as HTMLElement);
      });
    }
    return this.mountPromise;
  }

  protected bindEvents() {
    this.$container
    .contextmenu(_e => this.onContextmenu(_e))
    .click(_e => this.onClick(_e));
  }

  protected onContextmenu(e: JQueryMouseEventObject) {
    e.preventDefault();
    const absolutePos = McmodderUtils.getAbsolutePos(this.container);
    if (!this.activeState) {
      this.activeState = true;
      this.contextmenuEvent = e;
      this.updateMenu(e);
      this.ensureMounted().then(() => {
        if (!this.activeState) return;
        this.component?.show(
          e.pageX - absolutePos.x,
          e.pageY - absolutePos.y,
          this.activeIndexList,
          this.getVisibleEntries(),
          e
        );
      });
    }
  }

  protected onClick(_e: JQueryMouseEventObject) {
    if (this.activeState) {
      this.hide();
    }
  }

  private getVisibleEntries(): ContextMenuEntry[] {
    return this.activeIndexList.map(index => {
      const item = this.items[index];
      return {
        key: item.key,
        text: item.text,
        icon: item.icon,
        shortcut: item.shortcut,
        shortcutHTML: item.shortcut ? McmodderUtils.keyToHTML(item.shortcut) : undefined,
        iconGlyph: item.icon ? getFaGlyph(item.icon) : undefined,
        callback: item.callback
      };
    });
  }

  private updateMenu(e: JQueryMouseEventObject) {
    this.activeIndexList.length = 0;
    this.items.forEach((option, index) => {
      if (option.displayRule(e)) {
        this.activeIndexList.push(index);
      }
    });
  }

  show(x: number, y: number) {
    this.activeState = true;
    if (!this.component) return;
    this.component.show(x, y, this.activeIndexList, this.getVisibleEntries(), this.contextmenuEvent);
  }

  hide() {
    this.activeState = false;
    this.component?.hide();
  }

  addItem(option: ContextMenuItemOption) {
    const { key, text, icon, shortcut, displayRule, callback } = option;
    this.items.push({
      key,
      text,
      icon,
      shortcut,
      displayRule,
      callback
    });
    this.itemCount++;
    return this;
  }

  isActive() {
    return this.activeState;
  }
}
