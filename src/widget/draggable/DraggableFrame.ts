export class DraggableFrame {

  $instance: JQuery;
  instance: Element;
  dragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;

  constructor(node: JQuery) {
    this.$instance = $(node);
    this.instance = node.get(0);
    this.dragging = false;
    this.startX = this.startY = this.offsetX = this.offsetY = 0;

    this.$instance.addClass("mcmodder-draggable");

    this.instance.addEventListener("pointerdown", ev => this.onPointerdown(ev as PointerEvent));
    this.instance.addEventListener("pointermove", ev => this.onPointermove(ev as PointerEvent));
    this.instance.addEventListener("pointerup", ev => this.onPointerup(ev as PointerEvent));
    this.instance.addEventListener("pointercancel", ev => this.onPointerup(ev as PointerEvent));
  }

  private onPointerdown(e: PointerEvent) {
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.offsetX = e.offsetX;
    this.offsetY = e.offsetY;
    if (!this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.setPointerCapture(e.pointerId);
    }
  }

  private onPointermove(e: PointerEvent) {
    if (!this.dragging) return;
    this.$instance.css({
      "left": (this.startX - this.offsetX) + (e.clientX - this.startX) + 'px',
      "top": (this.startY - this.offsetY) + (e.clientY - this.startY) + 'px'
    });
  }

  private onPointerup(e: PointerEvent) {
    this.dragging = false;
    if (this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.releasePointerCapture(e.pointerId);
    }
  }
}