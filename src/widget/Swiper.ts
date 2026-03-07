// import { Mcmodder } from "../Mcmodder";

export class McmodderSwiper {
  // private readonly parent: Mcmodder;
  private readonly instance: JQuery;
  private readonly ul: JQuery;
  private readonly tab: JQuery;
  private readonly cursor: JQuery;

  constructor(/* parent: Mcmodder, */instance: JQuery) {
    // this.parent = parent;
    this.instance = instance;
    this.ul = this.instance.find("ul");
    this.tab = $(`<div class="mcmodder-swiper-tab">`).appendTo(this.ul);
    this.cursor = $(`<div class="mcmodder-swiper-cursor">`).appendTo(this.tab);
    this.update();
    this.ul.on("click", "li", _e => {
      this.update();
    })
  }

  private update() {
    setTimeout(() => {
      const ul = this.ul.get(0);
      const active = this.ul.find("li.active").get(0) as HTMLElement;
      const cursor = this.cursor.get(0);
      if (!active) return;
      const selfLeft = active.getBoundingClientRect().left;
      const selfWidth = active.getBoundingClientRect().width;
      const parentLeft = ul.getBoundingClientRect().left;
      const cursorWidth = cursor.getBoundingClientRect().width;
      const marginLeft = selfLeft - parentLeft + selfWidth / 2 - cursorWidth / 2;
      this.cursor.css("margin-left", marginLeft);
    }, 0);
  }
}