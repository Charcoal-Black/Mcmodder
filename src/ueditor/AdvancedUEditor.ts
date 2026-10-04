import { Mcmodder } from "../Mcmodder";
import { TemplateFrame } from "../TemplateFrame.ts";
import { Utils } from "../Utils";
import { Values } from "../Values";
import { UEditor as UEditor } from "./UEditor";
import CodeMirror from "codemirror";
import TurndownService from "turndown";
import html_beautify from "js-beautify";
import { createApp } from "vue";
import CheckboxInput from "../vue/components/input/CheckboxInput.vue";
import AutoLink from "../vue/components/AutoLink.vue";
import TextComparator from "../vue/components/TextComparator.vue";

/** 挂载在选项栏上的复选框：容器 `<span>` 与其 Vue 组件实例，便于直接改显隐或读值 */
type ContainerComponentPair = [HTMLSpanElement, InstanceType<typeof CheckboxInput>];

/**
 * UEditor 的增强版：在基类之上追加一批编辑体验向的特性 —— Markdown 源码双向编辑、工具栏加工具、
 * 编辑量统计、自动链接面板、纵向排列、格式化代码颜色等。
 *
 * # 为什么仍然不用 Vue 组件
 * 与基类同理：编辑器本体是百科的原生 iframe，其 UI 由百科创建、类名与全局对象高度耦合。
 * 只有「外挂面板」部分（自动链接、选项栏复选框、文本对比器）才用 Vue 挂载，
 * 它们是独立挂载的节点，不接管编辑器本身。
 *
 * # 初始化时序（重要，改动前务必读）
 * 基类 {@link UEditor} 的 `init` 是**异步**的（`editor.ready` 回调 + `setTimeout(0)`），
 * 而本类有些字段（`toolBar`、`mdEditorOption` 等）必须在 `init` 之后才能赋值，
 * 但构造函数又必须同步跑完（父类构造函数会把 `init` 挂到回调上，无法 override）。
 *
 * 因此这里用 **`pending` + `isFrameReady` 两个标志位**做「双向握手」：
 * - 若基类 `init` 先跑完 → 在覆写的 {@link init} 里置 `isFrameReady = true` 并触发 `advinit()`；
 * - 若子类构造函数先跑完（`init` 尚未就绪）→ `pending` 保持 true，等基类 `init` 来触发。
 *
 * 两条路径最终都只保证 `advinit()` **被调用一次**。
 * 另有一层早退保护：`advinit` 开头会检查关键 DOM 引用是否齐全，防止在编辑器半初始化时炸掉。
 *
 * 之所以要在意，是因为本目录历史上出过多次「编辑器初始化失败」的 Bug，
 * 基本都源于某个字段在 `advinit` 执行时还没被赋值。
 */
export class AdvancedUEditor extends UEditor {
  /** 百科原生的工具条容器（`.edit-tools`），增强工具插在它旁边 */
  editToolsBar?: JQuery;
  /** 选项栏：装各种开关复选框 */
  optionBar?: JQuery;
  /** 增强工具栏：装 `addTool` 添加的按钮 */
  toolBar?: JQuery;
  /** Markdown 编辑器的外层容器（`#mcmodder-mdeditor`） */
  mdEditorOuterContainer?: JQuery;
  /** Markdown 编辑器的挂载点（CodeMirror 实际渲染于此） */
  mdEditorContainer?: JQuery;
  /** Markdown 编辑器实例 */
  mdEditor?: CodeMirror.Editor;
  /** HTML 源代码编辑器的外层容器（`#mcmodder-htmleditor`） */
  htmlEditorOuterContainer?: JQuery;
  /** HTML 源代码编辑器的挂载点 */
  htmlEditorContainer?: JQuery;
  /** HTML 源代码编辑器实例 */
  htmlEditor?: CodeMirror.Editor;
  /** HTML → Markdown 转换器（用于首次把已有正文灌进 md 编辑器） */
  turndownSurvice?: TurndownService;
  /** 「Markdown 编辑器」开关 */
  protected mdEditorOption?: ContainerComponentPair;
  /** 「源代码编辑器」开关 */
  protected htmlEditorOption?: ContainerComponentPair;
  /** 「纵向排列」开关 */
  protected verticalOption?: ContainerComponentPair;
  /** 「实用工具」开关 */
  protected toolkitOption?: ContainerComponentPair;
  /** 打开页面时正文的字节数（编辑量的基准） */
  protected originalTextLength: number;
  /** 当前正文的字节数 */
  protected currentTextLength: number;
  /** 编辑器被锁定时为 `current - original`，否则与 `original` 同步 */
  protected changedTextLength: number;
  /** 编辑量统计栏 */
  statsBar?: JQuery;
  /** 统计栏中显示当前字节数的节点 */
  currentTextNode?: JQuery;
  /** 统计栏中显示字节变化量的节点 */
  changedTextNode?: JQuery;
  /** 统计栏的「轻触刷新」按钮（正文过大时自动统计被关闭，靠它手动触发） */
  refreshTextNode?: JQuery;
  /** HTML 编辑器标题栏的「轻触刷新」按钮 */
  refreshHtmlNode?: JQuery;
  /** 是否为 Modrinth 日志编辑页（此类页面正文以 Markdown 存储，需强制开启 md 编辑器） */
  protected isModrinthVer: boolean;
  /** 超过该字节数就停止实时统计，改由用户手动刷新 */
  protected autoUpdateEditorStatsThreshold: number;
  /** 自动链接面板的挂载点 */
  autoLinkFrame?: JQuery;
  /** 自动链接组件实例 */
  autoLink?: InstanceType<typeof AutoLink>;
  /** 模板面板（惰性初始化，见 {@link templateObserver}） */
  template = new TemplateFrame(this);
  /** 重入锁：防止原生编辑器与 HTML 编辑器互相触发 change 造成死循环 */
  private contentLock = false;
  /** 构造期间为 true，表示「等待基类 init 来触发 advinit」 */
  private pending = true;
  /** 基类 init 完成后为 true */
  private isFrameReady = false;

  /**
   * 监听百科的 SweetAlert 弹窗：模板面板的 `swal` 弹窗由用户操作触发而非初始化时存在，
   * 因此只能在弹窗出现的瞬间才 {@link TemplateFrame.init} 模板数据。
   *
   * @warning 判定条件同时校验了弹窗 class 与标题文案（`PublicLangData.editor.template.title`），
   * 二者缺一不可；改动标题或 swal 的 class 都会让模板面板静默失效。
   */
  private readonly templateObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      const className = (mutation?.addedNodes[0] as HTMLElement)?.className;
      if (
        mutation.type === "childList" &&
        className === "swal2-container swal2-center swal2-fade swal2-shown" &&
        $("h2#swal2-title").text() === PublicLangData.editor.template.title
      ) {
        this.template.init();
      }
    }
  });

  /**
   * 先交给基类完成 DOM 解包（必须如此，本类后续逻辑依赖 `$outerFrame` 等引用），
   * 再置位 `isFrameReady` 并补触发 `advinit`，详见类注释中的「双向握手」。
   *
   * @param editor 百科的原生编辑器实例。
   */
  constructor(editor: UEditor, parent: Mcmodder) {
    super(editor, parent);
    this.originalTextLength = this.currentTextLength = this.changedTextLength = 0;
    this.autoUpdateEditorStatsThreshold = this.configs.getSettings("editorStats") ?? 1e4;
    this.isModrinthVer = new URLSearchParams(window.location.search).has("mrid");
    // 基类 init 已跑完（极少见，说明 iframe 早已就绪）时在此直接补一次 advinit
    if (this.isFrameReady) {
      this.pending = false;
      this.advinit();
    }
  }

  /**
   * 往增强工具栏里加一个按钮。按钮初始为隐藏，需由对应的选项开关（`readyToolkit` 等）控制显隐。
   *
   * @param id 按钮的 DOM id，供其他代码用 `#id` 直接操作。
   * @param text 按钮文案。
   * @param callback 点击回调。
   */
  private addTool(id: string, text: string, callback: () => unknown) {
    $('<button class="btn btn-sm">')
      .attr("id", id)
      .text(text)
      .hide()
      .appendTo(this.toolBar!)
      .click(callback);
  }

  protected override init(editor: any) {
    super.init(editor);
    this.isFrameReady = true;
    if (this.pending) {
      this.pending = false;
      this.advinit();
    }
  }

  /**
   * 增强特性的真正的初始化入口：铺设工具栏/选项栏/两个源码编辑器，挂载 Vue 面板，
   * 绑定各类事件，并按用户配置回填各开关的初始状态。
   *
   * # 顺序为什么重要
   * 本方法内部对顺序有硬性依赖，**调整前请先确认调用点**：
   * 1. 先建容器（`editToolsBar`/`optionBar`/`toolBar`/两个编辑器外壳），
   *    因为后面的 {@link addTool} 与 {@link addOption} 都要往 `toolBar`/`optionBar` 里挂载；
   * 2. 再建工具按钮与 `AutoLink` 组件 —— `AutoLink` 需要 `this` 作为 prop 传入，
   *    因此它必须等父类 `init` 完成（即 `this.$outerFrame` 等可用）后才能创建；
   * 3. 事件绑定放在容器就绪之后，避免委托到尚未插入 DOM 的节点上；
   * 4. **各 `addOption` 必须在对应容器创建之后**，且最后的「按配置回填开关」必须在其之后，
   *    否则 `option[1].setCurrentValue` 会因为组件还没挂载而失效；
   * 5. `setCurrentValue` 会反过来触发 `ready*` 系列，那些方法又会读 `mdEditorContainer` 等字段，
   *    所以字段赋值必须早于这一步 —— 这也是整个方法只在初始化末尾集中回填配置的原因。
   *
   * 若关键 DOM 引用缺失则直接返回，宁可什么都不做也不要让编辑器崩掉。
   */
  private advinit() {
    if (!this.$outerFrame || !this.$innerFrame || !this.document || !this.$document) return;

    this.templateObserver.observe(document.body, { childList: true });

    this.editToolsBar = this.$outerFrame.parent().find(".edit-tools");
    if (!this.editToolsBar.length) {
      this.editToolsBar = $(`<div class="edit-tools">`).insertBefore(this.$outerFrame);
    }
    this.optionBar = $(`<div class="mcmodder-option-bar"></div>`).insertAfter(this.editToolsBar);
    this.toolBar = $(`<div class="mcmodder-tool-bar"></div>`).insertAfter(this.optionBar);

    // Markdown 转 HTML
    this.mdEditorOuterContainer = $(`
      <div id="mcmodder-mdeditor">
        <div class="mcmodder-editor-header">
          <div class="title">
            <i class="fa fa-pencil"></i>
            Markdown
          </div>
        </div>
        <div class="mcmodder-editor-container">
      </div>
    `);
    this.mdEditorOuterContainer.hide().insertBefore(this.$innerFrame);
    this.mdEditorContainer = this.mdEditorOuterContainer.children().last();

    // 源代码编辑器
    this.htmlEditorOuterContainer = $(`
      <div id="mcmodder-htmleditor">
        <div class="edui-default edui-editor-toolbarboxouter">
          <div class="title">
            <i class="fa fa-code"></i>
            HTML
            <span class="refresh-text badge-row" style="font-size: 14px;">
              <span class="text-danger">
                <i class="fa fa-rotate-left"></i>
                轻触刷新
              </span>
            </span>
          </div>
        </div>
        <div class="mcmodder-editor-container">
      </div>
    `);
    this.htmlEditorOuterContainer.hide().insertBefore(this.$innerFrame);
    this.htmlEditorContainer = this.htmlEditorOuterContainer.children().last();
    this.refreshHtmlNode = this.htmlEditorOuterContainer
      .find(".refresh-text")
      .hide()
      .click(() => {
        this.manualTriggerHtmlUpdate();
      });

    this.addTool("mcmodder-tool-md", "Markdown → HTML", () => this.performMarkdownIt());

    this.addTool("mcmodder-tool-brfix", "修复 br 换行", () => this.performBrFix());

    this.addTool("mcmodder-tool-linkfix", "移除无效链接", () => this.performLinkFix());

    this.addTool("mcmodder-tool-spacing", "中英间添加空格", () => this.performSpacingPage());

    this.autoLinkFrame = $('<div class="mcmodder-autolink-frame">');
    this.autoLink = createApp(AutoLink, {
      editor: this,
    }).mount(this.autoLinkFrame.get(0)) as InstanceType<typeof AutoLink>;

    // 快速提交
    this.$document.keydown((e) => this.fastSubmitOverride(e));

    const postRow = $(".post-row").first();
    const editTools = $(".edit-tools").first();

    // 按钮展示修改
    (
      (this.parent.isMobileClient
        ? [
            ["save", "快速存档", { ctrlKey: true, key: "S" }],
            ["new", "存档", { ctrlKey: true, shiftKey: true, key: "S" }],
            ["load", "读取", { ctrlKey: true, key: "O" }],
          ]
        : []) as [string, string, Key][]
    ).forEach((data) => {
      const editToolButton = editTools.find(`.${data[0]} a`);
      if (editToolButton.length) {
        (editToolButton.get(0).lastChild as Text).data = data[1];
        editToolButton.append(` ${Utils.keyToHTML(data[2])}`);
      }
    });

    // 高度自适应 + 编辑量实时统计
    if (this.autoUpdateEditorStatsThreshold > 0) {
      if (!editTools.length && postRow.length) {
        // $("div.col-lg-12.left").remove();
        // $("div.col-lg-12.right").css("padding-left", "0px");
        this.statsBar = $(
          '<span style="font-size: 12px; margin-top: 10px; position: relative;">',
        ).appendTo(postRow);
      } else {
        this.statsBar = $("<span>").appendTo(editTools);
      }
      this.statsBar.attr("class", "mcmodder-editor-stats").html(`<i class="fa fa-edit"></i>
        <span class="current-text mcmodder-common-dark" style="margin-right: 0px">0</span>
        <span style="margin-right: 0px">字节</span>
        <i class="fa fa-line-chart" style="margin-left: .8em;"></i>
        <span class="changed-text mcmodder-common-light" style="margin-right: 0px">--</span>
        <span style="margin-right: 0px">字节</span>
        <span class="refresh-text badge-row" style="margin-left: .625em; margin-right: 0;">
          <span style="margin: 0;" class="text-danger">
            <i class="fa fa-rotate-left" style="margin: 0;"></i>
            轻触刷新
          </span>
        </span>`);

      // 正文编辑量统计
      this.originalTextLength = 0;
      this.currentTextLength = 0;
      this.changedTextLength = 0;

      this.currentTextNode = this.statsBar.find(".current-text");
      this.changedTextNode = this.statsBar.find(".changed-text");
      this.refreshTextNode = this.statsBar.find(".refresh-text");

      this.calculateBytes();
      this.updateOriginalTextLength();
      this.refreshTextNode.hide().click(() => {
        this.manualTriggerStatsUpdate();
      });
    }

    // 格式化代码颜色
    this.$outerFrame.on("click", ".edui-for-forecolor .edui-arrow", () => {
      if ($("#mcmodder-format-column").length) return;

      this.colorpickerInit();
    });

    // 全屏背景不再透明
    this.$outerFrame
      .find(".edui-for-fullscreen")
      .children()
      .click(() => {
        if (this.isEditorFullScreen())
          Utils.addStyle(
            "#editor-ueeditor > .edui-editor {background-color: var(--mcmodder-color-background);}",
            "mcmodder-fullscreen-style",
          );
        else $("#mcmodder-fullscreen-style").remove();
      });

    if (!this.editToolsBar.length && $(".post-row").length) {
      $(".post-row")
        .get(0)
        .insertBefore(
          $(".post-row > .mcmodder-editor-stats").get(0),
          $(".post-row > #editor-ueeditor").get(0),
        );
    }

    this.mdEditorOption = this.addOption("Markdown 编辑器", "mcmodder-option-md", () =>
      this.readyMarkdownEditor(),
    );

    this.htmlEditorOption = this.addOption("源代码编辑器", "mcmodder-option-html", () =>
      this.readyHtmlEditor(),
    );

    this.verticalOption = this.addOption("纵向排列", "mcmodder-option-vertical", () =>
      this.readyVerticalEditor(),
    );

    this.toolkitOption = this.addOption("实用工具", "mcmodder-option-toolkit", () =>
      this.readyToolkit(),
    );

    if (this.configs.getSettings("markdownIt") || this.isModrinthVer) {
      this.mdEditorOption![1].setCurrentValue(true); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启
    }

    if (this.configs.getSettings("htmlEditor")) {
      this.htmlEditorOption![1].setCurrentValue(true); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启
    }

    let isVertical = this.configs.getSettings("editorVertical");
    if (isVertical === undefined) {
      isVertical = screen.width < 741;
      this.configs.setSettings("editorVertical", isVertical);
    }
    if (isVertical) {
      this.verticalOption![1].setCurrentValue(true);
    }

    if (this.configs.getSettings("editorToolkit")) {
      this.toolkitOption![1].setCurrentValue(true);
    }

    // 匿名吐槽
    if (this.configs.getSettings("anonymousUknowtoomuch")) this.anonymiseUknowtoomuch();
  }

  /**
   * 在选项栏加一个开关复选框。
   *
   * @param title 开关显示的标题。
   * @param id 复选框的 DOM id。
   * @param onSuccessfulChange 状态变化后的回调（各 `ready*` 方法都通过它接收新状态并持久化配置）。
   * @returns 容器节点与其组件实例，供外部直接改显隐（`option[0]`）或读值（`option[1]`）。
   */
  addOption(
    title: string,
    id: string,
    onSuccessfulChange: InputSuccessfulChangeCallBack<boolean>,
  ): ContainerComponentPair {
    const container = $("<span>").appendTo(this.optionBar!).get(0) as HTMLSpanElement;
    return [
      container,
      createApp(CheckboxInput, {
        title,
        value: false,
        onSuccessfulChange,
        id,
        withLabel: true,
      }).mount(container) as InstanceType<typeof CheckboxInput>,
    ];
  }

  /**
   * 宽度自适应：在基类撑满 `#edui1` 的基础上，让两个源码编辑器与外层编辑区等高同宽。
   * 容器高度固定为外层高度减 32px（标题栏高度）。
   */
  override widthAutoResize() {
    if (!this.$innerFrame) return;
    super.widthAutoResize();
    const outerHeight = parseInt(this.$innerFrame.css("height"));
    const innerHeight = outerHeight - 32;
    this.mdEditorOuterContainer?.css("height", outerHeight + "px");
    this.mdEditorContainer?.css("height", innerHeight + "px");
    this.htmlEditorOuterContainer?.css("height", outerHeight + "px");
    this.htmlEditorContainer?.css("height", innerHeight + "px");
  }

  /**
   * 计算正文高度：取基类结果与「已展开的源码编辑器实际高度」的最大值，
   * 避免源码编辑器把外层编辑区撑得比它矮。
   */
  override autoCalculateHeight() {
    let height = super.autoCalculateHeight();
    if (this.mdEditorOption?.[1].getValue()) {
      height = Math.max(height, this.mdEditorContainer?.height() ?? 0);
    }
    if (this.htmlEditorOption?.[1].getValue()) {
      height = Math.max(height, this.htmlEditorContainer?.height() ?? 0);
    }
    return height;
  }

  /**
   * 调整编辑器高度：基类调整外层后，再让两个源码编辑器跟随。
   * **纵向排列**模式下两个编辑器上下排列、由内容撑高，故清除固定高度；否则锁定为外层高度。
   */
  override resizeHeight(height: number) {
    if (!this.$innerFrame) return;
    super.resizeHeight(height);
    const finalHeight = this.$innerFrame?.css("height");
    const mdContainer = this.mdEditorOuterContainer?.get(0) as HTMLElement;
    const htmlContainer = this.htmlEditorOuterContainer?.get(0) as HTMLElement;
    const isVertical = this.verticalOption?.[1].getValue();
    if (isVertical) {
      mdContainer?.style?.removeProperty("height");
      htmlContainer?.style?.removeProperty("height");
    } else {
      mdContainer?.style?.setProperty("height", finalHeight, "important");
      htmlContainer?.style?.setProperty("height", finalHeight, "important");
    }
  }

  /**
   * 「Markdown 编辑器」开关：按需**惰性创建** CodeMirror 实例，并把当前正文反向转成 Markdown 灌入。
   * 关闭时只是隐藏编辑器（实例保留），因此再次开启无需重新转换。
   *
   * 惰性创建的原因是 CodeMirror 初始化开销不小，且并非所有用户需要。
   */
  private async readyMarkdownEditor() {
    if (
      !this.$document ||
      !this.head ||
      !this.$outerFrame ||
      !this.mdEditorContainer ||
      !this.mdEditorOption
    )
      return;
    const c = this.mdEditorOption![1].getValue();
    if (c) {
      // await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js", null, "mcmodder-script-markdownit");
      await Utils.loadScript(
        this.head,
        null,
        Values.assets.js.markdownit,
        null,
        "mcmodder-script-markdownit",
      );
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirror, null, "mcmodder-script-codemirror");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.markdown, null, "mcmodder-script-codemirror-mod-markdown");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.htmlEmbedded, null, "mcmodder-script-codemirror-mod-htmlembedded");
      await Utils.loadStyle(
        document.head,
        null,
        Values.assets.css.codemirror,
        null,
        "mcmodder-style-codemirror",
      );

      if (!this.mdEditor) {
        this.mdEditor = CodeMirror(this.mdEditorContainer.get(0), {
          mode: "markdown",
          theme: "mcmodder",
        });
        this.mdEditor.on(
          "change",
          Utils.throttle(() => {
            this.heightAutoResize();
          }, 300),
        );
        this.turndownSurvice = new TurndownService().use(turndownPluginGfm.gfm);
        if (this.$body) {
          const content = this.$body.clone();
          content
            .contents()
            .filter((_, e) => e.tagName === "P")
            .each((_, p) => {
              $(p)
                .contents()
                .filter((_, e) => e.nodeType == Node.TEXT_NODE)
                .each((_, e) => {
                  const textNode = e as Node as Text;
                  const text = textNode.data;
                  const matchResult = text.match(/\[h[1-6]=.*?\]/);
                  if (matchResult)
                    matchResult.forEach((result) => {
                      const index = text.indexOf(result);
                      const mid = textNode.splitText(index);
                      mid.splitText(result.length);
                      const title = document.createElement(`h${text.charAt(2)}`);
                      title.textContent = result.slice(4, -1);
                      mid.replaceWith(title);
                    });
                });
            });
          const converted = this.turndownSurvice.turndown(content.html());
          this.mdEditor.setValue(converted);
        }
      }

      if (this.isModrinthVer) $("#mcmodder-tool-md").click();
      $("#mcmodder-tool-md, #mcmodder-mdeditor").show();
      $(this.verticalOption![0]).show();
    } else {
      $("#mcmodder-tool-md, #mcmodder-mdeditor").hide();
      $(this.verticalOption![0]).hide();
    }
    this.configs.setSettings("markdownIt", c);
    this.onEditorStateChange();
  }

  /**
   * 「源代码编辑器」开关：惰性创建 XML 模式的 CodeMirror，并与原生编辑器**双向同步**：
   * 在源码编辑器里改动会写回 `editor.setContent`，原生编辑器改动则由 {@link syncHtml} 拉回。
   * 两个方向的同步都靠 {@link contentLock} 互斥，避免互相触发造成循环。
   */
  private async readyHtmlEditor() {
    if (!this.htmlEditorContainer || !this.$body) return;
    const c = this.htmlEditorOption?.[1].getValue();
    if (c) {
      await Utils.loadStyle(
        document.head,
        null,
        Values.assets.css.codemirror,
        null,
        "mcmodder-style-codemirror",
      );
      if (!this.htmlEditor) {
        this.htmlEditor = CodeMirror(this.htmlEditorContainer.get(0), {
          mode: "xml",
          theme: "mcmodder",
        });
        this.htmlEditor.on(
          "change",
          Utils.throttle(() => {
            this.heightAutoResize();
          }, 300),
        );
        this.htmlEditor.on(
          "change",
          Utils.throttle((instance: CodeMirror.Editor) => {
            if (!this.contentLock) {
              this.contentLock = true;
              this.editor?.setContent(instance.getValue());
              this.refreshHtmlNode?.hide();
              this.contentLock = false;
            }
          }, 300),
        );
        this.syncHtml();
      }
      $("#mcmodder-htmleditor").show();
    } else {
      $("#mcmodder-htmleditor").hide();
    }
    this.configs.setSettings("htmlEditor", c);
    this.onEditorStateChange();
  }

  /**
   * 任一源码编辑器开关变化后的收尾：决定「纵向排列」开关是否可用，并重算尺寸与统计。
   */
  private onEditorStateChange() {
    const md = this.mdEditorOption?.[1].getValue();
    const html = this.htmlEditorOption?.[1].getValue();
    if (md || html) {
      $(this.verticalOption![0]).show();
    } else {
      $(this.verticalOption![0]).hide();
    }
    window.dispatchEvent(new Event("resize"));
    this.updateEditorStats();
  }

  /**
   * 「纵向排列」开关：给外层加/去 `vertical` 类（样式表据此把编辑器与源码编辑器改为上下排布）
   */
  private readyVerticalEditor() {
    const c = this.verticalOption?.[1].getValue();
    if (c) {
      this.$outerFrame?.addClass("vertical");
    } else {
      this.$outerFrame?.removeClass("vertical");
    }
    this.configs.setSettings("editorVertical", c);
    this.heightAutoResize();
  }

  /**
   * 「实用工具」开关：控制三个正文加工工具按钮的显隐（工具始终已创建）
   */
  private readyToolkit() {
    const c = this.toolkitOption?.[1].getValue();
    if (c) {
      $("#mcmodder-tool-brfix, #mcmodder-tool-linkfix, #mcmodder-tool-spacing").show();
    } else {
      $("#mcmodder-tool-brfix, #mcmodder-tool-linkfix, #mcmodder-tool-spacing").hide();
    }
    this.configs.setSettings("editorToolkit", c);
  }

  /**
   * 「Markdown → HTML」：把 md 编辑器的内容渲染进正文。
   *
   * 渲染后还要做若干**针对百科编辑器的适配与体检**：
   * - 把渲染出的 `h1`~`h6` 反向转成 `[hN=标题]` 占位符（百科正文以这种标记表达标题）；
   * - `code`/`blockquote` 是百科不支持的标签，给它们描红并提示用户手动调整；
   * - `pre` 剥掉标签只留文本，未指定语言的提醒补语言；
   * - 统一 `ul` 列表的缩进类，并把 `li` 里的裸文本包成 `<p>`（百科只接受 `li > p` 结构）。
   */
  performMarkdownIt() {
    // 预处理
    // this.mdEditor.find("p > br").remove();
    if (!this.mdEditorOuterContainer || !this.mdEditor || !this.body || !this.$document) return;
    const md = (this.window as any).markdownit();
    const htmlOutput = md.render(this.mdEditor.getValue());
    const content = this.$body?.html(htmlOutput);
    for (let i = 1; i <= 6; i++) {
      content?.find(`h${i}`).each((_, e) => {
        const node = document.createElement("p");
        node.textContent = `[h${i}=${e.textContent}]`;
        e.replaceWith(node);
      });
    }

    // 后期检测
    this.$document
      .find("code")
      .css("border", "3px solid red")
      .each(() => {
        Utils.commonMsg("转换结果中出现不受支持的行间代码块 (code)，请适当调整~");
      });
    this.$document.find("pre").each((_, c) => {
      $(c).html($(c).text());
      if (!c.classList.length) Utils.commonMsg("转换结果中出现代码块 (pre)，记得设置相应语言~");
    });
    this.$document
      .find("blockquote")
      .css("border", "3px solid red")
      .each(() =>
        Utils.commonMsg("转换结果中出现不受支持的引用块 (blockquote)，请适当调整~", false),
      );

    // 列表统一标准
    this.$document
      .find("ul")
      .addClass("list-paddingleft-2")
      .each((_, ul) => {
        ul.childNodes.forEach((li) => {
          if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName === "LI") {
            li.childNodes.forEach((e) => {
              if ((e as Text).nodeType === Node.TEXT_NODE) {
                const p = document.createElement("p");
                p.textContent = (e as Text).data;
                const next = e.nextSibling;
                if (
                  next?.nodeType === Node.ELEMENT_NODE &&
                  (next as HTMLElement).tagName === "BR"
                ) {
                  next.remove();
                }
                e.replaceWith(p);
              }
            });
          }
        });
      });

    this.updateEditorStats();
  }

  /**
   * 「修复 br 换行」：百科正文的 `<br>` 无法表达段落结构（粘贴正文时常见），
   * 此处把含 `<br>` 的段落按 `<br>` 切成多个段落。
   */
  performBrFix() {
    if (!this.$body) return;
    const p = this.$body.find("p");
    const ps: JQuery[] = [];
    p.each((_, _e) => {
      const e = $(_e);
      const contents = p.contents();
      const contentsLength = contents.length - 1;
      for (let i = 1; i < contentsLength; i++) {
        if (contents.get(i).tagName === "BR") {
          ps.push(e);
          break;
        }
      }
    });
    const count = ps.length;
    if (!count) {
      Utils.commonMsg(`未发现 br 换行问题~`);
      return;
    }
    ps.forEach((p) => {
      let np = p.clone().html("").insertAfter(p);
      p.contents().each((_, e) => {
        if (e.tagName === "BR") {
          np = p.clone().html("").insertAfter(np);
        } else {
          np.append(e);
        }
      });
      p.remove();
    });
    Utils.commonMsg(`${count} 处 br 换行问题已被修复~`);
  }

  /**
   * 「移除无效链接」：把没有 `href` 的 `<a>`（粘贴残留的空链接）还原成纯文本。
   */
  performLinkFix() {
    if (!this.$body) return;
    let count = 0;
    this.$body.find("a").each((_, _e) => {
      const e = $(_e);
      const href = e.attr("href");
      if (!href) {
        const text = e.text();
        const parent = _e.parentNode;
        e.replaceWith(text);
        parent?.normalize();
        count++;
      }
    });
    if (!count) {
      Utils.commonMsg("未发现异常链接~");
    } else {
      Utils.commonMsg(`${count} 处异常链接已被修复~`);
    }
  }

  /**
   * 「中英间添加空格」：用 pangu 批量处理正文。
   *
   * pangu 会把 `[icon:名=数量,文本]` 这类**自定义标记**也当作普通文本切开、破坏其语义，
   * 因此处理前先把每个标记替换成临时的 `<a class="mcmodder-tempnode">`（属性里存好各字段，
   * 并记录标记原本的前后是否已有空格），pangu 处理完再把临时节点换回原文。
   *
   * 期间会临时把 `<body>` 设为不可编辑，因为 pangu 会跳过可编辑容器的子元素。
   */
  async performSpacingPage() {
    if (!this.window || !this.head || !this.body || !this.$body) return;
    await Utils.loadScript(this.head, null, Values.assets.js.pangu, null, "mcmodder-script-pangu");
    const isEditable = this.body.contentEditable;
    this.body.contentEditable = "false";

    this.$body
      .find("*")
      .contents()
      .filter((_, e) => e.nodeType === Node.TEXT_NODE)
      .each((_, _text) => {
        let first = _text as unknown as Text;
        const matchList = first.data.match(/\[(h[1-6]=|ban:|mark:|icon:).*?\]/g);
        matchList?.forEach((substr) => {
          const mid = first.splitText(first.data.indexOf(substr));
          const last = mid.splitText(substr.length);
          const temp = this.document!.createElement("a");
          temp.classList.add("mcmodder-tempnode");
          temp.title = substr;

          if (substr.startsWith("[icon:")) {
            const colon = substr.indexOf(":");
            const equal = substr.indexOf("=");
            const comma = substr.indexOf(",");
            if (colon > 0 && equal > 0 && comma > 0) {
              const name = substr.slice(colon + 1, equal);
              const number = substr.slice(equal + 1, comma);
              const text = substr.slice(comma + 1, -1);
              temp.setAttribute("data-name", name);
              temp.setAttribute("data-number", number);
              temp.setAttribute("data-text", text);
              if (first && /\s/.test(first.data.slice(-1)))
                temp.setAttribute("data-space-prev", "1");
              if (last && /\s/.test(last?.data.slice(0))) temp.setAttribute("data-space-next", "1");
              temp.text = number + text;
            }
          }

          mid.replaceWith(temp);
          first = last;
        });
      });

    (this.window as any).pangu.spacingPage();
    if (isEditable === "true")
      setTimeout(() => {
        this.$body?.find(".mcmodder-tempnode").each((_, e) => {
          const temp = e as HTMLAnchorElement;
          const parent = temp.parentNode;
          if (parent && temp.hasAttribute("data-name")) {
            const name = temp.getAttribute("data-name")!;
            const number = temp.getAttribute("data-number")!;
            const text = temp.getAttribute("data-text")!;
            let prependSpace = false;
            let appendSpace = false;
            let insertSpace = false;
            const children = parent.childNodes;
            const length = children.length;
            for (let i = 0; i < length; i++) {
              const node = children[i];
              if (node === temp) {
                const prev = children.item(i - 1) as Text;
                const next = children.item(i + 1) as Text;
                if (
                  prev &&
                  prev.nodeType === Node.TEXT_NODE &&
                  !temp.hasAttribute("data-space-prev") &&
                  /\s/.test(prev.data.slice(-1)) &&
                  !/\s/.test(temp.text.slice(0))
                ) {
                  prependSpace = true;
                }
                if (
                  next &&
                  next.nodeType === Node.TEXT_NODE &&
                  !temp.hasAttribute("data-space-prev") &&
                  /\s/.test(next.data.slice(0)) &&
                  !/\s/.test(temp.text.slice(-1))
                ) {
                  appendSpace = true;
                }
                if (`${number} ${text}` === temp.text) {
                  insertSpace = true;
                }
                const result = `${prependSpace ? " " : ""}[icon:${name}=${number},${insertSpace ? " " : ""}${text}]${
                  appendSpace ? " " : ""
                }`;
                temp.replaceWith(result);
                break;
              }
            }
          }
          temp.replaceWith(temp.title);
          parent?.normalize();
        });

        this.body!.contentEditable = "true";
      }, 1e2); // pangu.spacingPage 并不是同步方法，强制延迟 100ms 以保证执行时 pangu 已完成空格插入
  }

  /** 编辑器是否处于锁定（他人正在编辑）状态 */
  isEditorLocked() {
    return $(".edit-user-alert.locked").length ? true : false;
  }

  /**
   * 往百科的文字颜色选择器底部插入一批「格式化代码颜色」色块。
   * 借助 UEditor 既有的色块样式，插入的就是普通 `<a data-color>`，无需改动百科自身逻辑。
   */
  colorpickerInit() {
    const colorpicker = $(".edui-colorpicker tbody");

    // 格式化代码颜色
    const l = Values.formatColors.length;
    let s = `<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default">
      <td colspan="10" class="edui-default" id="mcmodder-format-column">
        <a target="_blank" href="https://zh.minecraft.wiki/w/%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81#%E9%A2%9C%E8%89%B2%E4%BB%A3%E7%A0%81">格式化代码颜色</a>
      </td>
    </tr>`;
    for (let i = 0; i < l; i += 10) {
      s += '<tr class="edui-default">';
      for (let j = i; j < Math.min(i + 10, l); j++)
        s += `<td style="padding: ${j < 10 ? "6px 2px 0 2px" : "0 2px"};" class="edui-default"><a hidefocus="" title="§${j.toString(16)} - ${Values.formatColors[j]}" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#${Values.formatColors[j]}" style="background-color:#${Values.formatColors[j]};border:solid #ccc;border-width:1px;"></a></td>`;
      s += "</tr>";
    }
    $(s).appendTo(colorpicker);

    // 自定义颜色
    /* $('<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default"><td colspan="10" class="edui-default" id="mcmodder-custom-column">自定义颜色</td></tr><tr class="edui-default"><td style="padding: 6px 2px 0 2px;" class="edui-default"><input id="mcmodder-customcolor-input"><a id="mcmodder-customcolor-select" hidefocus="" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#000000" style="background-color:#000000;border:solid #ccc;border-width:1px;"></a></td></tr>').appendTo(colorPicker).find("#mcmodder-customcolor-input").change(e => {
      let val = e.target.value;
      if (/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(val)) {
        if (val[0] != "#") val = "#" + val;
        $("#mcmodder-customcolor-select").attr("data-color", val).attr("title", val).css("background-color", val);
      }
    }); */
  }

  /**
   * 刷新统计栏：显示当前字节数，以及相对打开页面时的字节变化量（增删量，正数为加、负数为删，
   * 删多了染成警示色）。`t` 取统计栏里的特定几个节点，仅在确有变化时显示。
   */
  updateTextLengthDisplay() {
    if (
      !this.currentTextNode ||
      !this.changedTextNode ||
      this.currentTextLength === undefined ||
      this.changedTextLength === undefined ||
      !this.statsBar
    )
      return;
    const changedTextLength = this.currentTextLength - this.originalTextLength;
    this.currentTextNode.html(this.currentTextLength.toLocaleString());
    this.changedTextNode
      .attr("class", changedTextLength < 0 ? "mcmodder-common-danger" : "mcmodder-common-light")
      .html((changedTextLength > 0 ? "+" : "") + changedTextLength.toLocaleString());
    const t = this.statsBar.contents().filter((i) => i > 4 && i < 12);
    if (changedTextLength) t.show();
    else t.hide();
  }

  /** 记录当前字节数并刷新统计栏 */
  updateCurrentTextLength(length: number) {
    this.currentTextLength = length;
    this.updateTextLengthDisplay();
  }

  /**
   * 求出「打开页面时」的字节数，作为编辑量基准。
   *
   * 编辑器未被锁定时无从比较，直接把当前值当作基准（相当于变化量为 0）。
   * 被锁定（他人正在编辑）时，正文里已含对方的改动，无法从当前内容反推原文，
   * 于是**另外请求一次历史版本页面**，取其正文来计算基准，同时挂一个文本对比器让用户看清差异。
   */
  async updateOriginalTextLength() {
    if (!this.changedTextNode || !this.$body) return;
    if (!this.isEditorLocked()) {
      this.originalTextLength = this.currentTextLength;
      this.updateTextLengthDisplay();
      return;
    }

    // 根据先前的正文数据计算字节变化量
    const commonNav = $(".common-nav > ul");
    this.changedTextNode.html(`<img src="${Values.assets.mcmod.loading}"></img>`);
    const url = commonNav
      .children()
      .eq(commonNav.children().length - 3)
      .children()
      .first()
      .attr("href");
    const resp = await this.parent.utils.createRequest(
      {
        url: url,
        method: "GET",
        headers: { "Content-Type": "text/html; charset=UTF-8" },
        anonymous: true,
      },
      "获取资料原始正文",
    );
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    const textArea =
      doc.find(".text-area.common-text").first() || doc.find(".item-content.common-text").first();
    textArea.find(".figure").remove();
    const t1 = textArea.children().filter((_, c) => this.isNodeCountableForBytes(c as HTMLElement));
    const t2 = this.$body.children();
    let ta = "",
      tb = "";
    this.originalTextLength = 0;
    t1.each((_, e) => {
      ta += e.textContent + "\n";
      this.originalTextLength += Utils.getContextLength(e.textContent);
    });
    t2.each((_, e) => {
      const t = Utils.clearContextFormatter(e.textContent);
      if (t) tb += t + "\n";
    });
    this.updateTextLengthDisplay();
    const comparatorFrame = $("<div>").insertBefore($(".tab-content").first());
    createApp(TextComparator, { textA: ta, textB: tb }).mount(comparatorFrame.get(0));
    // this.updateEditorStats();
  }

  /**
   * 判断某个节点是否计入字节统计：排除空节点、编辑菜单、锚点链接、`<script>`，
   * 以及那行固定样式的居中说明文字（这些都是编辑器的界面元素而非用户正文）。
   */
  isNodeCountableForBytes(node: HTMLElement) {
    if (!node.textContent) return false;
    if (node.className === "common-text-menu") return false;
    if (node.id.slice(0, 5) === "link_") return false;
    if (node.tagName === "SCRIPT") return false;
    if (
      $(node).attr("style") === "text-align:center;color:#888;width:100%;float:left;font-size:14px;"
    )
      return false;
    return true;
  }

  /**
   * 内容变化后的统一处理：重算高度（仅非全屏时，全屏下改高度会抖），
   * 并在正文未超过阈值时**节流**地重算字节数与同步 HTML 源码。
   *
   * 超过 {@link autoUpdateEditorStatsThreshold} 时停止自动统计（逐字重算 + 美化 HTML 开销太大），
   * 改为显示「轻触刷新」按钮交由用户手动触发。
   */
  override updateEditorStats() {
    if (!this.isEditorFullScreen()) this.heightAutoResize();
    if (this.currentTextLength <= this.autoUpdateEditorStatsThreshold) {
      Utils.throttle(() => {
        this.calculateBytes();
        this.syncHtml();
      }, 300)();
    } else {
      this.refreshTextNode?.show();
      this.refreshHtmlNode?.show();
    }
  }

  /** 统计栏「轻触刷新」：正文过大时由用户手动重算字节数 */
  private manualTriggerStatsUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStatsThreshold) {
      this.calculateBytes();
      this.refreshTextNode?.hide();
    }
  }

  /** HTML 编辑器「轻触刷新」：正文过大时由用户手动重新拉取源码 */
  private manualTriggerHtmlUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStatsThreshold) {
      this.syncHtml();
      this.refreshHtmlNode?.hide();
    }
  }

  /** 统计当前正文的字节数（`<pre>` 代码块内的内容不计入） */
  private calculateBytes() {
    let contextLength = 0;
    if (this.body)
      $(this.body)
        .contents()
        .filter((_i, c) => c.tagName != "PRE")
        .each((_i, c) => {
          contextLength += Utils.getContextLength(c.textContent);
        });
    this.updateCurrentTextLength(contextLength);
  }

  /**
   * 把当前正文同步到 HTML 源代码编辑器（经 `html_beautify` 美化，便于手改）。
   * 同步期间上锁，防止 `setValue` 触发的 change 再写回原生编辑器。
   */
  private syncHtml() {
    if (this.htmlEditor && !this.contentLock) {
      this.contentLock = true;
      const text = this.$body?.html() || "";
      const formatted = html_beautify(text, { indent_size: 2 });
      this.htmlEditor?.setValue(formatted);
      this.contentLock = false;
    }
  }

  /**
   * 「我知道了」：覆写百科的 `uknowtoomuch` 命令，把选中文本包进
   * `<span class="uknowtoomuch">` 存进正文（原本只弹提示、不留内容）。
   */
  anonymiseUknowtoomuch() {
    baidu.editor.commands.uknowtoomuch.execCommand = function () {
      editor.selection.getRange().select();
      const b = editor.selection.getText();
      return b
        ? (editor.execCommand("insertHtml", `<span class="uknowtoomuch">${b}</span>`, true), void 0)
        : (Utils.commonMsg(PublicLangData["warning"]["inform"][164], false), void 0);
    };
  }

  /** 在 swal 弹窗里挂载并初始化自动链接面板 */
  showAutoLinkList() {
    Utils.createModal(
      {
        // 初始化
        title: PublicLangData.editor.autolink.title,
        html: `<div class="mcmodder-autolink-outerframe" />`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: PublicLangData.close,
        preConfirm: () => {},
      },
      this.autoLink!.interceptEvents,
    );
    this.autoLinkFrame?.appendTo(".swal2-content .mcmodder-autolink-outerframe");
    this.autoLink?.init();
  }

  /**
   * 编辑器 iframe 内的快捷键总入口。
   *
   * 先转交百科侧的快速提交处理（`bindFastSubmit` 由 {@link GeneralEditInit} 按配置装填），
   * 再叠加本脚本的按键：快速链接面板；PgUp/PgDn 临时折叠展开左侧菜单（松开即恢复）。
   */
  fastSubmitOverride(e: JQueryKeyEventObject) {
    bindFastSubmit(e);
    if (this.parent.utils.isKeyMatchConfig("keybindFastLink", e)) {
      e.preventDefault();
      this.showAutoLinkList();
    }
    if (
      $(".common-menu-area").length > 0 &&
      (Utils.isKeyMatch({ keyCode: 33 }, e) || Utils.isKeyMatch({ keyCode: 34 }, e))
    ) {
      $(".common-menu-area").hide();
      setTimeout(() => {
        $(".common-menu-area").show();
      }, 0);
    }
  }
}
