import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";
import { addUploadFileButton } from "./UploadFileButton";

/**
 * 百科原生 UEditor 的封装基类：把 `editor` 实例解包成一系列好用的 DOM 引用，
 * 并施加一批与编辑页强相关的通用增强（注入样式、夜间模式、按钮现代化、上传文件按钮（默认关闭）、高度/宽度自适应、编辑量统计）。
 *
 * # 关于「不写成 Vue 组件」
 * UEditor 是百科技能自带的 iframe + 原生 DOM，工具栏、颜色选择器、下拉菜单等 UI 全部由百科自己的
 * 代码创建，且大量逻辑依赖其内部类名（`.edui-*`）与全局对象（`editor`、`baidu.editor`）。
 * 强行套 Vue 组件反而要与之对抗，因此这里选择**直接操作原生 DOM**。
 *
 * # 初始化时序（重要）
 * 本类**不在构造函数里同步初始化**，而是等到 `editor.ready()` 回调后再 `setTimeout(0)` 才执行 {@link init}。
 * 原因：百科的编辑器是异步渲染的，`ready` 触发时 iframe 及其内部 document 才刚挂载，
 * 立刻访问 `editor.iframe` / `editor.document` 很可能拿到 undefined 或半成品节点。
 * 这里用 `setTimeout(0)` 把初始化推迟到当前任务之后，确保 DOM 已就绪。
 *
 * 该回调由 {@link Mcmodder.callEditor} 在观察到 `#edui1_iframeholder` 出现子节点后才触发，
 * 因此整条链路是「DOM 出现 → observer 触发 → 延迟 300ms 构造 → ready 回调 → 再延迟一拍 → init」。
 * 各层延迟都是历史踩坑后加的，**请勿随意缩短或去掉**。
 *
 * @see {@link AdvancedUEditor} 在本类之上追加编辑器增强特性。
 */
export class UEditor {
  /** 百科的原生编辑器实例（宿主全局 `editor`），用它调用 `setContent`/`addListener` 等 API */
  editor: any;
  /** 全局上下文，用于访问配置、样式表与夜间模式状态 */
  parent: Mcmodder;
  /** 配置仓库（`parent.configRepository` 的快捷引用） */
  configs: ConfigRepository;
  /** 编辑器的最外层容器，即百科的 `#editor-ueeditor` */
  outerFrame?: Element;
  /** {@link outerFrame} 的 jQuery 包装 */
  $outerFrame?: JQuery;
  /** 内层容器，即工具栏与 iframe 所在的 `#edui1` */
  innerFrame?: Element;
  /** {@link innerFrame} 的 jQuery 包装 */
  $innerFrame?: JQuery;
  /** 外层容器的首个子节点（承载实际高度的那个盒子） */
  frame?: HTMLElement;
  /** 编辑器工具栏（`.edui-toolbar`） */
  toolbar?: JQuery;
  /** 编辑内容 iframe */
  iframe?: HTMLIFrameElement;
  /** {@link iframe} 的 jQuery 包装 */
  $iframe?: JQuery;
  /** iframe 的父节点，高度自适应时直接改它 */
  iframeHolder?: HTMLElement;
  /** iframe 的 window 对象（与页面主 window 不同） */
  window?: Window;
  /** {@link window} 的 jQuery 包装 */
  $window?: JQuery;
  /** iframe 的 document，后续绝大多数正文操作都作用在它上面 */
  document?: Document;
  /** {@link document} 的 jQuery 包装 */
  $document?: JQuery;
  /** iframe 内的 `<head>`，动态脚本/样式需插入到这里（而非主文档） */
  head?: HTMLHeadElement;
  /** {@link head} 的 jQuery 包装 */
  $head?: JQuery;
  /** iframe 内的 `<body>`，即用户编辑的正文所在节点 */
  body?: HTMLElement;
  /** {@link body} 的 jQuery 包装 */
  $body?: JQuery;

  /**
   * @param editor 百科的原生编辑器实例。
   * @param parent 全局上下文。
   */
  constructor(editor: any, parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
    this.editor = editor;
    // ready 回调触发时 iframe 内的 DOM 尚未完全就绪，需再让出一个任务周期，详见类注释
    editor.ready(() => {
      setTimeout(() => {
        this.init(editor);
      }, 0);
    });
  }

  /**
   * 初始化：解包编辑器各层 DOM 引用，登记到 {@link Mcmodder.ueditorFrame}，并施加通用增强。
   * 子类可覆写本方法，但**必须先调用 `super.init(editor)`**。
   *
   * @param editor 百科的原生编辑器实例。
   */
  protected init(editor: any) {
    const iframe = editor.iframe;

    this.outerFrame = $(iframe).parents("#editor-ueeditor").get(0) as HTMLElement;
    this.$outerFrame = $(this.outerFrame);
    this.innerFrame = $(iframe).parents("#edui1").get(0) as HTMLElement;
    this.$innerFrame = $(this.innerFrame);
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

    // 把自己登记进全局列表，并给**所有**已登记的编辑器 iframe 补注入样式与夜间模式
    // （含此前已初始化的那些，保证页面上多个编辑器时样式一致）
    this.parent.ueditorFrame.push(this);
    this.parent.ueditorFrame.forEach((e) => {
      if (!e.document) return;
      Utils.addStyle(this.parent.css, "", e.document);
      if (this.parent.isNightMode) {
        e.$document!.find("html").addClass("dark");
      }
    });

    // 现代化按钮
    // if (this.configs.get("mcmodderUI")) {
    const toolBar = this.$outerFrame.find(".edui-editor-toolbarboxinner");
    for (let i = 0; i < Values.ueButton1.length; i++) {
      toolBar
        .find(`.edui-for-${Values.ueButton1[i]} .edui-icon`)
        .addClass("mcmodder-edui-box fa fa-" + Values.ueButton2[i])
        .css("background-image", "none");
    }
    toolBar
      .find(".edui-arrow")
      .addClass("mcmodder-edui-arrow fa fa-caret-down")
      .css("background-image", "none");
    // }

    // 短评编辑器（`.comment-editor-area` 里的那个编辑器，即页面上没有主编辑器工具栏 `.edit-tools` 的那种）
    // 补一个「上传文件」按钮：站点工具栏只给了图片上传，附件上传接口虽有却没有入口。默认关闭，需在设置里开启。
    // 主编辑器（`AdvancedUEditor`）的 `.edit-tools` 自带附件入口，不重复注入。
    const isCommentEditor =
      this.$outerFrame?.closest(".comment-editor-area").length || !$(".edit-tools").length;
    if (isCommentEditor && this.configs.getSettings("uploadFileButton")) {
      addUploadFileButton(this);
    }

    // 宽度自适应：监听窗口 resize，并立即手动触发一次（iframe 内的文档不会自动继承外层尺寸）
    window.addEventListener("resize", () => this.widthAutoResize());
    window.dispatchEvent(new Event("resize"));

    this.updateEditorStats();

    this.editor.addListener("contentChange", () => {
      this.updateEditorStats();
    });
  }

  /**
   * 编辑器当前是否处于全屏：全屏时百科会给 `.edui-editor` 加 `position: absolute`，
   * 据此判断（比匹配全屏按钮的状态更可靠）。
   */
  isEditorFullScreen() {
    return (
      this.$outerFrame?.find(".edui-editor").prop("style").getPropertyValue("position") ===
      "absolute"
    );
  }

  /**
   * 设置编辑器高度。
   *
   * @param height 正文区域应有的高度（px），实际写入时会再加上工具栏高度。
   */
  resizeHeight(height: number) {
    this.frame?.style?.setProperty(
      "height",
      height + $("#edui1_toolbarbox").first().prop("offsetHeight") + "px",
      "important",
    );
    this.iframeHolder?.style?.setProperty("height", height + "px", "important");

    // this.editor.setHeight(height);
  }

  /**
   * 计算正文应有的高度：以**最后一个子元素**的底边为准（而非逐个累加），
   * 这样能正确处理嵌套与浮动；结果不低于 120px。
   *
   * @returns 正文高度（px）。
   */
  protected autoCalculateHeight() {
    let height = 50;
    if (this.$body && this.$body.children().length && this.window) {
      const rect = this.$body.children().last().get(0).getBoundingClientRect();
      height += rect.top + rect.height + this.window.pageYOffset;
    }
    /* this.$body.children().each((_, e) => {
      let cs = getComputedStyle(e);
      height += (e.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + 0.2);
    }); */
    height = Math.max(height, 120);
    return height;
  }

  /** 按计算出的正文高度调整编辑器高度 */
  protected heightAutoResize() {
    const height = this.autoCalculateHeight();
    this.resizeHeight(height);
  }

  /** 宽度自适应：让编辑器内层与 iframe 容器撑满可用宽度 */
  widthAutoResize() {
    // $("#mcmodder-mdeditor, #editor-ueeditor").css("width", "100%");
    $("#edui1, #edui1_iframeholder").css("width", "100%");
  }

  /** 内容变化后要重算的东西，目前只有高度 */
  updateEditorStats() {
    this.heightAutoResize();
  }
}
