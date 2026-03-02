interface HorizontalDraggableFrameConfig {
  initPos?: number,
  leftCollapseThreshold?: number,
  rightCollapseThreshold?: number,
  leftDraggableLimit?: number,
  rightDraggableLimit?: number
}

export class HorizontalDraggableFrame {
  
  parent: Element;
  instance: Element;
  $instance: JQuery;
  dragging: boolean;
  dragStartPos: number;
  dragPos: number;
  initPos: number;
  originalPos: number;
  leftBindNode: JQuery | null;
  rightBindNode: JQuery | null;
  leftCollapseThreshold: number;
  rightCollapseThreshold: number;
  leftDraggableLimit: number;
  rightDraggableLimit: number;
  horizontalPos: number;

  constructor(attr: Record<string, string> = {}, parent: Element = document.body, config: HorizontalDraggableFrameConfig = {}) {
    this.$instance = $("<div>").appendTo(parent);
    this.instance = this.$instance.get(0);
    if (typeof attr === "object") Object.keys(attr).forEach(e => this.$instance.attr(e, attr[e]));
    this.$instance.addClass("mcmodder-horizontal-divider");
    this.parent = parent;
    $(this.parent).css("position", "relative");
    this.dragging = false;
    this.dragStartPos = this.dragPos = 0;
    this.initPos = config.initPos ? config.initPos : 0.5;
    this.horizontalPos = 0;
    this.setHorizontalPos(this.initPos);
    this.originalPos = parseInt(this.$instance.css("left"));
    this.leftBindNode = this.rightBindNode = null;
    this.leftCollapseThreshold = config.leftCollapseThreshold === undefined ? 0.3 : config.leftCollapseThreshold;
    this.rightCollapseThreshold = config.rightCollapseThreshold === undefined ? 0.7 : config.rightCollapseThreshold;
    this.leftDraggableLimit = config.leftDraggableLimit === undefined ? 0 : config.leftDraggableLimit;
    this.rightDraggableLimit = config.rightDraggableLimit === undefined ? 1 : config.rightDraggableLimit;
    this.$instance.mousedown(e => {
      this.dragging = true;
      this.dragStartPos = e.screenX - this.parent.getBoundingClientRect().left;
    });
    $(this.parent).bind({
      "mousemove": (e: JQueryMouseEventObject) => {
        if (!this.dragging) return;
        e.preventDefault();
        this.dragPos = e.screenX - this.parent.getBoundingClientRect().left;
        this.setHorizontalPosByWidth(this.dragPos);
        let r = (this.originalPos - this.dragStartPos + this.dragPos) / this.getParentWidth();
        if (r <= this.leftCollapseThreshold) r = 0;
        else if (r >= this.rightCollapseThreshold) r = 1;
        this.setHorizontalPos(r);
      },
      "mouseup": (_e: JQueryMouseEventObject) => {
        if (!this.dragging) return;
        this.dragging = false;
        this.originalPos = parseInt(this.$instance.css("left"));
      }
    });
  }

  setHorizontalPosByWidth(pos: number) {
    return this.setHorizontalPos(pos / this.getParentWidth());
  }

  setHorizontalPos(pos: number) {
    pos = Math.min(this.rightDraggableLimit, Math.max(this.leftDraggableLimit, pos));
    this.horizontalPos = pos;
    this.$instance.css("left", pos * 100 + "%");
    if (this.leftBindNode) {
      this.leftBindNode.css("width", this.getLeftWidth() / this.getParentWidth() * 100 + "%");
      if (this.horizontalPos <= this.leftCollapseThreshold) this.leftBindNode.hide();
      else this.leftBindNode.show();
    }
    if (this.rightBindNode) {
      this.rightBindNode.css("width", this.getRightWidth() / this.getParentWidth() * 100 + "%");
      if (this.horizontalPos >= this.rightCollapseThreshold) this.rightBindNode.hide();
      else this.rightBindNode.show();
    }
    return this;
  }

  updateHorizontalPos() {
   return this.setHorizontalPos(this.horizontalPos);
  }

  getParentWidth() {
    return this.parent.getBoundingClientRect().width;
  }

  getSelfWidth() {
    return this.instance.getBoundingClientRect().width;
  }

  getLeftWidth() {
    return this.instance.getBoundingClientRect().left - this.parent.getBoundingClientRect().left;
  }

  getRightWidth() {
    return this.parent.getBoundingClientRect().right - this.instance.getBoundingClientRect().right;
  }

  bindLeft(node: JQuery, isAbsolute = false) {
    this.leftBindNode = node;
    this.leftBindNode.insertBefore(this.instance);
    node.addClass("mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""))
      .addClass("mcmodder-horizontal-flex-left");
    return this.updateHorizontalPos();
  }

  bindRight(node: JQuery, isAbsolute = true) {
    this.rightBindNode = node;
    this.rightBindNode.insertBefore(this.instance);
    node.addClass("mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""))
      .addClass("mcmodder-horizontal-flex-right");
    return this.updateHorizontalPos();
  }

  expandIfCollapsed() {
    if (this.horizontalPos <= this.leftDraggableLimit || this.horizontalPos >= this.rightDraggableLimit) {
      this.setHorizontalPos(this.initPos);
    }
    return this;
  }
}