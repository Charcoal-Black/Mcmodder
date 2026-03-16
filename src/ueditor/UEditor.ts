import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class McmodderUEditor {

  editor: any;
  parent: Mcmodder;
  outerFrame?: Element;
  $outerFrame?: JQuery;
  frame?: HTMLElement;
  toolbar?: JQuery;
  iframe?: HTMLIFrameElement;
  $iframe?: JQuery;
  iframeHolder?: HTMLElement;
  window?: Window;
  $window?: JQuery;
  document?: Document;
  $document?: JQuery;
  head?: HTMLHeadElement;
  $head?: JQuery;
  body?: HTMLElement;
  $body?: JQuery;

  constructor(editor: any, parent: Mcmodder) {
    this.parent = parent;
    this.editor = editor;
    editor.ready(() => {
      this.init(editor);
    });
  }

  init(editor: any) {
    let iframe = editor.iframe;

    this.outerFrame = $(iframe).parents("#editor-ueeditor").get(0) as HTMLElement;
    this.$outerFrame = $(this.outerFrame);
    this.frame = this.outerFrame.childNodes.item(0) as HTMLElement;
    this.toolbar = this.$outerFrame.find(".edui-toolbar");
    this.iframe = iframe;
    this.$iframe = $(this.iframe || "");
    this.iframeHolder = this.iframe?.parentNode as HTMLElement;
    this.window = editor.window;
    this.$window = $(this.window || "");
    this.document = editor.document;
    this.$document = $(this.document || "");
    this.head = this.document?.head;
    this.body = this.document?.body;
    this.$head = $(this.head || "");
    this.$body = $(this.body || "");

    this.parent.ueditorFrame.push(this);
    this.parent.ueditorFrame.forEach(e => {
      if (!e.document) return;
      McmodderUtils.addStyle(this.parent.css, "", e.document);
      if (this.parent.isNightMode) {
        e.$document!.find("html").addClass("dark");
      }
    });

    // 现代化按钮
    if (this.parent.utils.getConfig("mcmodderUI")) {
      let toolBar = this.$outerFrame.find(".edui-editor-toolbarboxinner");
      for (let i = 0; i < McmodderValues.ueButton1.length; i++) {
        toolBar.find(`.edui-for-${McmodderValues.ueButton1[i]} .edui-icon`)
        .addClass("mcmodder-edui-box fa fa-" + McmodderValues.ueButton2[i])
        .css("background-image", "none");
      }
      toolBar.find(".edui-arrow").addClass("mcmodder-edui-arrow fa fa-caret-down").css("background-image", "none");
    }

    // 宽度自适应
    window.addEventListener("resize", () => this.widthAutoResize());
    window.dispatchEvent(new Event("resize"));

    this.updateEditorStats();

    this.$document.find("body").off("keydown").bind({
      keyup: () => this.updateEditorStats(),
      paste: () => this.updateEditorStats(),
      dragover: () => this.updateEditorStats()
    });
  }

  isEditorFullScreen() {
    return this.$outerFrame
    ?.find(".edui-editor")
    .prop("style")
    .getPropertyValue("position") === "absolute";
  }

  resizeHeight(height: number) {
    this.frame?.style?.setProperty("height", (height + $("#edui1_toolbarbox").first().prop("offsetHeight")) + "px", "important");
    this.iframeHolder?.style?.setProperty("height", height + "px", "important");

    // this.editor.setHeight(height);
  }

  heightAutoResize() {
    let height = 50;
    if (this.$body && this.$body.children().length && this.window) {
      let rect = this.$body.children().last().get(0).getBoundingClientRect();
      height += rect.top + rect.height + this.window.pageYOffset;
    }
    /* this.$body.children().each((_, e) => {
      let cs = getComputedStyle(e);
      height += (e.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + 0.2);
    }); */
    height = Math.max(height, 120);
    this.resizeHeight(height);
  }

  widthAutoResize() {
    const checked = $("#mcmodder-option-md").prop("checked");
    $("#mcmodder-mdeditor, #editor-ueeditor").css("width", checked ? "50%" : "100%");
    $("#edui1, #edui1_iframeholder").css("width", "100%");
  }

  updateEditorStats() {
    this.heightAutoResize();
  }
}