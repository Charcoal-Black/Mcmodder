// import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";

type ContextMenuDisplayRule = (e: JQueryMouseEventObject) => boolean;
type ContextMenuCallback = (e: JQueryMouseEventObject) => void;

type ContextMenuOption = {
  node: JQuery;
  displayRule: ContextMenuDisplayRule;
  callback: ContextMenuCallback;
}
type ContextMenuOptions = Record<string, ContextMenuOption>;

export class McmodderContextMenu {

  // private parent: Mcmodder;
  private $container: JQuery;
  private container: Element;
  private activeState: boolean;
  private $instance: JQuery;
  private instance: Element;
  private menu: JQuery;
  // private arrow: JQuery;
  private options: ContextMenuOptions;
  private contextmenuEvent?: JQueryMouseEventObject;

  constructor(/* parent: Mcmodder, */container: Element | JQuery) {
    // this.parent = parent;
    this.$container = $(container).css("position", "relative");
    this.container = this.$container.get(0);
    this.activeState = false;
    this.$instance = $(`
      <div class="mcmodder-contextmenu">
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
    this.options = {};
    this.bindEvents();
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

  protected moveTo(x: number, y: number) {    
    this.$instance.css({
      left: x + "px",
      top: y + "px"
    })
  }

  updateMenu(e: JQueryMouseEventObject) {
    let isEmpty = true;
    const emptyNode = this.menu.find(".empty");
    Object.keys(this.options).forEach(key => {
      const option = this.options[key];
      if (option.displayRule(e)) {
        option.node.show();
        isEmpty = false;
      }
      else option.node.hide();
    });
    if (isEmpty) emptyNode.show();
    else emptyNode.hide();
  }

  show(x: number, y: number) {
    this.activeState = true;
    this.$instance.removeClass("expand-left").removeClass("expand-right").show();
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

  addOption(key: string, text: string, displayRule: ContextMenuDisplayRule, callback: ContextMenuCallback) {
    this.options[key] = {
      node: $(`<li id="${ key }"><a>${ text }</a></li>`).click(_ => {
        this.options[key].callback(this.contextmenuEvent!);
      }).appendTo(this.menu),
      displayRule: displayRule,
      callback: callback
    };
    return this;
  }

  isActive() {
    return this.activeState;
  }
}