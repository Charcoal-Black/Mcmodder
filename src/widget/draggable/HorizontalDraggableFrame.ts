import type { ConfigRepository } from "../../config/ConfigRepository";
import { Utils } from "../../Utils";

interface HorizontalDraggableFrameConfig {
  initPos?: number,
  leftCollapseThreshold?: number,
  rightCollapseThreshold?: number,
  leftDraggableLimit?: number,
  rightDraggableLimit?: number
}

export class HorizontalDraggableFrame {
  private readonly id: string;
  private readonly parent: HTMLElement;
  private readonly configs: ConfigRepository;
  readonly instance: HTMLElement;
  readonly $instance: JQuery;
  private dragging: boolean;
  private dragStartPos: number;
  private dragPos: number;
  private readonly initPos: number;
  private originalPos: number;
  private leftBindNode: JQuery | null;
  private rightBindNode: JQuery | null;
  private readonly leftCollapseThreshold: number;
  private readonly rightCollapseThreshold: number;
  private readonly leftDraggableLimit: number;
  private readonly rightDraggableLimit: number;
  private horizontalPos: number;

  constructor(
    id: string,
    configs: ConfigRepository,
    attr: Record<string, string> = {},
    parent: HTMLElement = document.body,
    config: HorizontalDraggableFrameConfig = {}
  ) {
    this.id = id;
    this.configs = configs;
    this.$instance = $("<div>")
    .attr({
      tabindex: 0,
      role: "separator",
      orientation: "horizontal",
      "aria-label": id
    })
    .appendTo(parent);
    this.instance = this.$instance.get(0) as HTMLElement;
    if (typeof attr === "object") Object.keys(attr).forEach(e => this.$instance.attr(e, attr[e]));
    this.$instance.addClass("mcmodder-horizontal-divider");
    this.parent = parent;
    $(this.parent).css("position", "relative");
    this.dragging = false;
    this.dragStartPos = this.dragPos = 0;
    this.initPos = config.initPos ?? 0.5;
    this.horizontalPos = 0;
    this.setHorizontalPosOnDrag(this.initPos);
    this.originalPos = parseInt(this.$instance.css("left"));
    this.leftBindNode = this.rightBindNode = null;
    this.leftCollapseThreshold = config.leftCollapseThreshold ?? 0.25;
    this.rightCollapseThreshold = config.rightCollapseThreshold ?? 0.75;
    this.leftDraggableLimit = config.leftDraggableLimit ?? 0;
    this.rightDraggableLimit = config.rightDraggableLimit ?? 1;
    this.$instance.attr({
      "aria-valuemin": Math.round(Math.max(this.leftCollapseThreshold, this.leftDraggableLimit) * 100),
      "aria-valuemax": Math.round(Math.min(this.rightCollapseThreshold, this.rightDraggableLimit) * 100)
    });
    this.instance.addEventListener("pointerdown", ev => this.onInstancePointerdown(ev as PointerEvent));
    this.instance.addEventListener("pointermove", ev => this.onInstancePointermove(ev as PointerEvent));
    this.instance.addEventListener("pointerup", ev => this.onInstancePointerup(ev as PointerEvent));
    this.instance.addEventListener("pointercancel", ev => this.onInstancePointerup(ev as PointerEvent));
    this.instance.addEventListener("dblclick", ev => this.onInstanceDblclick(ev as MouseEvent));
    this.instance.addEventListener("keydown", ev => this.onInstanceKeydown(ev as KeyboardEvent));
  }

  private onInstancePointerdown(e: PointerEvent) {
    this.dragging = true;
    this.dragStartPos = e.screenX - this.parent.getBoundingClientRect().left;
    if (!this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.setPointerCapture(e.pointerId);
    }
  }

  private onInstancePointermove(e: PointerEvent) {
    if (!this.dragging) return;
    e.preventDefault();
    this.dragPos = e.screenX - this.parent.getBoundingClientRect().left;
    this.setHorizontalPosByWidthOnDrag(this.dragPos);
    let r = (this.originalPos - this.dragStartPos + this.dragPos) / this.getParentWidth();
    if (r <= this.leftCollapseThreshold) r = 0;
    else if (r >= this.rightCollapseThreshold) r = 1;
    this.setHorizontalPosOnDrag(r);
  }

  private onInstancePointerup(e: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
    this.originalPos = parseInt(this.$instance.css("left"));
    if (this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.releasePointerCapture(e.pointerId);
      if (!this.isCollapsed()) {
        const preferredDragPos = this.configs.getSettings("preferredDragPos") ?? {};
        preferredDragPos[this.id] = this.horizontalPos;
        this.configs.setSettings("preferredDragPos", preferredDragPos);
      }
    }
  }

  private onInstanceDblclick(_e: MouseEvent) {
    if (Math.abs(this.horizontalPos - this.initPos) < 0.025) {
      this.setHorizontalPos(this.getPreferredDragPos());
    } else {
      this.setHorizontalPos(this.initPos);
    }
  }

  private onInstanceKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const width = this.getWidth();
      const leftCollapseThresholdWidth = this.getWidth(this.leftCollapseThreshold);
      this.setHorizontalPosByWidth(Math.max(width - 10, leftCollapseThresholdWidth + 1));
    }
    else if (e.key === "ArrowRight") {
      e.preventDefault();
      const width = this.getWidth();
      const rightCollapseThresholdWidth = this.getWidth(this.rightCollapseThreshold);
      this.setHorizontalPosByWidth(Math.min(width + 10, rightCollapseThresholdWidth - 1));
    }
    else if (e.key === "Escape") {
      this.$instance.blur();
    }
  }

  private getWidth(pos = this.horizontalPos) {
    return pos * this.getParentWidth();
  }

  private setHorizontalPosByWidthOnDrag(pos: number) {
    return this.setHorizontalPosOnDrag(pos / this.getParentWidth());
  }

  private setHorizontalPosByWidth(pos: number) {
    this.setHorizontalPosByWidthOnDrag(pos);
    this.originalPos = parseInt(this.$instance.css("left"));
    return this;
  }

  private setHorizontalPosOnDrag(pos: number) {
    pos = Utils.clamp(pos, this.leftDraggableLimit, this.rightDraggableLimit);
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
    this.$instance.attr("aria-valuenow", Math.round(Utils.clamp(
      this.horizontalPos, this.leftCollapseThreshold, this.rightCollapseThreshold
    ) * 100));
    return this;
  }

  setHorizontalPos(pos: number) {
    this.setHorizontalPosOnDrag(pos);
    this.originalPos = parseInt(this.$instance.css("left"));
    return this;
  }

  updateHorizontalPos() {
   return this.setHorizontalPosOnDrag(this.horizontalPos);
  }

  private getParentWidth() {
    return this.parent.getBoundingClientRect().width;
  }

  // private getSelfWidth() {
  //   return this.instance.getBoundingClientRect().width;
  // }

  private getLeftWidth() {
    return this.instance.getBoundingClientRect().left - this.parent.getBoundingClientRect().left;
  }

  private getRightWidth() {
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

  private getPreferredDragPos() {
    return this.configs.getSettings("preferredDragPos")?.[this.id] ?? this.initPos;
  }

  isCollapsed() {
    return this.horizontalPos <= this.leftDraggableLimit || this.horizontalPos >= this.rightDraggableLimit;
  }

  expandIfCollapsed() {
    if (this.isCollapsed()) {
      this.setHorizontalPos(this.getPreferredDragPos());
    }
    return this;
  }
}