export class McmodderCollapsible {
  private readonly instance: JQuery;
  private readonly header: JQuery;
  private readonly body: JQuery;
  private readonly onClick: (e: JQueryMouseEventObject) => any;

  constructor(onClick: (e: JQueryMouseEventObject) => any) {
    this.instance = $(`<div class="mcmodder-collapsible-container">`);
    this.header = $(`<div class="mcmodder-collapsible-header">`).appendTo(this.instance);
    this.body = $(`<div class="mcmodder-collapsible-content">`).appendTo(this.instance);
    this.onClick = onClick;

    this.header.click(e => {
      this.instance.toggleClass("expanded");
      this.onClick(e);
    });
  }

  getInstance() {
    return this.instance;
  }

  getHeader() {
    return this.header;
  }

  getBody() {
    return this.body;
  }
}