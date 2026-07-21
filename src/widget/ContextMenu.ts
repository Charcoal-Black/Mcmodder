// import { Mcmodder } from "../Mcmodder";
import { McmodderKeyData } from "../types";
import { McmodderUtils } from "../Utils";

type ContextMenuDisplayRule = (e: JQueryMouseEventObject) => boolean;
type ContextMenuCallback = (e: JQueryMouseEventObject) => void;

type ContextMenuItem = {
  key: string,
  node: JQuery;
  shortcut?: McmodderKeyData;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
}
type ContextMenuItems = ContextMenuItem[];

type ContextMenuItemOption = {
  key: string,
  text: string,
  shortcut?: McmodderKeyData,
  displayRule: ContextMenuDisplayRule,
  callback: ContextMenuCallback
}

export class McmodderContextMenu {

  // private parent: Mcmodder;
  private $container: JQuery;
  private container: Element;
  private activeState: boolean;
  private $instance: JQuery;
  private instance: Element;
  private menu: JQuery;
  // private arrow: JQuery;
  private items: ContextMenuItems;
  private contextmenuEvent?: JQueryMouseEventObject;
  private selected: number;
  private itemCount = 0;
  private activeIndexList: number[] = [];
  private activeIndexLength = 0;
  private pressArrowKeyBeforeMouseMove = false;

  constructor(/* parent: Mcmodder, */container: Element | JQuery) {
    // this.parent = parent;
    this.$container = $(container).css("position", "relative");
    this.container = this.$container.get(0);
    this.activeState = false;
    this.$instance = $(`
      <div class="mcmodder-contextmenu" tabindex="-1">
        <div class="mcmodder-contextmenu-inner">
          <div class="arrow" />
          <ul>
            <li class="empty">当前无可用选项...</li>
          </ul>
        </div>
      </div>`).prependTo(container).hide();
    this.instance = this.$instance.get(0);
    this.menu = this.$instance.find("ul");
    // this.arrow = this.$instance.find(".arrow");
    this.items = [];
    this.selected = -1;
    this.bindEvents();
  }

  protected bindEvents() {
    this.$container
    .contextmenu(_e => this.onContextmenu(_e))
    .click(_e => this.onClick(_e));

    this.$instance
    .keydown(_e => this.activeState && this.onMenuKeydown(_e));

    this.$instance
    .on("mouseenter", "li", _e => this.activeState && this.onItemMouseenter(_e))
    .on("mousemove", "li", _e => this.activeState && this.onItemMousemove(_e))
    .on("mouseleave", "li", _e => this.activeState && this.onItemMouseleave(_e))
    .on("click", "li", _e => this.activeState && this.onItemClick(_e));
  }

  protected onContextmenu(e: JQueryMouseEventObject) {
    e.preventDefault();
    const absolutePos = McmodderUtils.getAbsolutePos(this.container);
    if (!this.activeState) {
      this.contextmenuEvent = e;
      this.updateMenu(e);
      this.show(e.pageX - absolutePos.x, e.pageY - absolutePos.y);
    }
  }

  protected onClick(_e: JQueryMouseEventObject) {
    if (this.activeState) {
      this.hide();
    }
  }

  private addSelectedClass() {
    this.items[this.activeIndexList[this.selected]].node.addClass("selected");
  }

  private removeSelectedClass() {
    this.items[this.activeIndexList[this.selected]].node.removeClass("selected");
  }

  protected onMenuKeydown(e: JQueryKeyEventObject) {
    for (let i = 0; i < this.itemCount; i++) {
      const shortcut = this.items[i].shortcut;
      if (shortcut && McmodderUtils.isKeyMatch(shortcut, e)) {
        this.items[i].node.addClass("selected").click();
        return;
      }
    }
    if (McmodderUtils.isKeyMatch({ keyCode: 13 }, e)) {
      if (this.selected != -1) {
        this.items[this.activeIndexList[this.selected]].node.click();
      }
    }
    else if (McmodderUtils.isKeyMatch({ keyCode: 27 }, e)) {
      e.preventDefault();
      this.$instance.blur();
      this.hide();
    }
    else if (McmodderUtils.isKeyMatch({ keyCode: 40 }, e)) {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeIndexLength < 1) return;
      this.pressArrowKeyBeforeMouseMove = true;
      if (this.selected === -1) {
        this.selected = 0;
      } else {
        this.removeSelectedClass();
        this.selected = Math.min(this.selected + 1, this.activeIndexLength - 1);
      }
      this.addSelectedClass();
    }
    else if (McmodderUtils.isKeyMatch({ keyCode: 38 }, e)) {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeIndexLength < 1) return;
      this.pressArrowKeyBeforeMouseMove = true;
      if (this.selected === -1) {
        this.selected = this.activeIndexLength - 1;
      } else {
        this.removeSelectedClass();
        this.selected = Math.max(this.selected - 1, 0);
      }
      this.addSelectedClass();
    }
  }

  protected onItemMouseenter(_e: JQueryMouseEventObject) {
    this.pressArrowKeyBeforeMouseMove = true;
  }

  protected onItemMousemove(e: JQueryMouseEventObject) {
    if (!this.pressArrowKeyBeforeMouseMove) {
      return;
    }
    if (this.selected !== -1) {
      this.removeSelectedClass();
    }
    const index = Number(e.currentTarget.getAttribute("data-index"));
    const activeIndex = this.activeIndexList.indexOf(index);
    this.selected = activeIndex;
    this.addSelectedClass();
  }

  protected onItemMouseleave(_e: JQueryMouseEventObject) {
    if (this.selected !== -1) {
      this.removeSelectedClass();
      this.selected = -1;
    }
  }

  protected onItemClick(e: JQueryMouseEventObject) {
    const index = Number(e.currentTarget.getAttribute("data-index"));
    this.items[index].callback(this.contextmenuEvent!);
    setTimeout(() => {
      this.items[index].node.removeClass("selected");
    }, 2e2);
  }

  protected moveTo(x: number, y: number) {    
    this.$instance.css({
      left: x + "px",
      top: y + "px"
    })
  }

  private updateMenu(e: JQueryMouseEventObject) {
    let isEmpty = true;
    const emptyNode = this.menu.find(".empty");
    this.activeIndexList.length = 0;
    this.activeIndexLength = 0;
    this.items.forEach((option, index) => {
      if (option.displayRule(e)) {
        option.node.show();
        isEmpty = false;
        this.activeIndexList.push(index);
        this.activeIndexLength++;
      } else {
        option.node.hide();
      }
    });
    if (isEmpty) {
      emptyNode.show();
    } else {
      emptyNode.hide();
    }
  }

  show(x: number, y: number) {
    this.activeState = true;
    this.$instance.removeClass("expand-left").removeClass("expand-right").show().focus();
    this.selected = -1;
    const em = Number(getComputedStyle(this.instance).fontSize.slice(0, -2));
    let nx = x + (2.2 - 0.2) * em;
    let ny = y + (-0.75 - 0.2) * em;
    this.moveTo(nx, ny);
    setTimeout(() => {
      if (x && y) {
        const menuRect = this.instance.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        if (menuRect.right <= containerRect.right) { // 箭头靠左
          this.$instance.addClass("expand-right");
        }
        else { // 箭头靠右
          this.$instance.addClass("expand-left");
          nx = x + (-1.7 - 0.2) * em - menuRect.width;
          ny = y + (-0.75 - 0.2) * em;
        }
        
        this.moveTo(nx, ny);
      }
      this.$instance.removeClass("faded");
    }, 0);
  }

  hide() {
    this.activeState = false;
    this.$instance.addClass("faded");
    setTimeout(() => {
      if (!this.activeState) this.$instance.hide();
    }, 200);
  }

  addItem(option: ContextMenuItemOption) {
    const { key, text, shortcut, displayRule, callback } = option;
  
    const node = $(`
      <li data-index="${
        this.itemCount
      }" id="mcmodder-contextmenu-${
        key
      }"><a>${
        text
      }</a></li>
    `)
    .appendTo(this.menu);

    if (shortcut) {
      $(`<span class="item-shortcut-left">`)
      .html(McmodderUtils.keyToHTML(shortcut))
      .appendTo(node);
    }

    this.items.push({
      key,
      node,
      shortcut,
      displayRule,
      callback,
    })
    this.itemCount++;

    return this;
  }

  isActive() {
    return this.activeState;
  }
}