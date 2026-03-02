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

    this.$instance.bind({
      'mousedown': (e: JQueryMouseEventObject) => this.onMousedown(e)
    });
    $(document).bind({
      'mousemove': (e: JQueryMouseEventObject) => this.onMousemove(e),
      'mouseup': (e: JQueryMouseEventObject) => this.onMouseup(e)
    });
  }

  onMousedown(e: JQueryMouseEventObject) {
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.offsetX = e.offsetX;
    this.offsetY = e.offsetY;
  }

  onMousemove(e: JQueryMouseEventObject) {
    if (!this.dragging) return;
    this.$instance.css({
      "left": (this.startX - this.offsetX) + (e.clientX - this.startX) + 'px',
      "top": (this.startY - this.offsetY) + (e.clientY - this.startY) + 'px'
    });
  }

  onMouseup(_e: JQueryMouseEventObject) {
    this.dragging = false;
  }
}