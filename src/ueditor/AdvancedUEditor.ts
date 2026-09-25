import { Mcmodder } from "../Mcmodder";
import { TemplateFrame } from "../TemplateFrame.ts";
import { Utils } from "../Utils";
import { Values } from "../Values";
import { UEditor as UEditor } from "./UEditor"
import CodeMirror from "codemirror";
import TurndownService from "turndown";
import html_beautify from "js-beautify";
import { createApp } from "vue";
import CheckboxInput from "../vue/components/input/CheckboxInput.vue";
import AutoLink from "../vue/components/AutoLink.vue";
import TextComparator from "../vue/components/TextComparator.vue";

type ContainerComponentPair = [HTMLSpanElement, InstanceType<typeof CheckboxInput>];

export class AdvancedUEditor extends UEditor {

  editToolsBar?: JQuery;
  optionBar?: JQuery;
  toolBar?: JQuery;
  mdEditorOuterContainer?: JQuery;
  mdEditorContainer?: JQuery;
  mdEditor?: CodeMirror.Editor;
  htmlEditorOuterContainer?: JQuery;
  htmlEditorContainer?: JQuery;
  htmlEditor?: CodeMirror.Editor;
  turndownSurvice?: TurndownService;
  protected mdEditorOption?: ContainerComponentPair;
  protected htmlEditorOption?: ContainerComponentPair;
  protected verticalOption?: ContainerComponentPair;
  protected toolkitOption?: ContainerComponentPair;
  protected originalTextLength: number;
  protected currentTextLength: number;
  protected changedTextLength: number;
  statsBar?: JQuery;
  currentTextNode?: JQuery;
  changedTextNode?: JQuery;
  refreshTextNode?: JQuery;
  refreshHtmlNode?: JQuery;
  protected isModrinthVer: boolean;
  protected autoUpdateEditorStatsThreshold: number;
  autoLinkFrame?: JQuery;
  autoLink?: InstanceType<typeof AutoLink>;
  template = new TemplateFrame(this);
  private contentLock = false;
  private pending = true;
  private isFrameReady = false;

  private readonly templateObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      const className = (mutation?.addedNodes[0] as HTMLElement)?.className;
      if (mutation.type === "childList" && 
      className === "swal2-container swal2-center swal2-fade swal2-shown" && 
      $("h2#swal2-title").text() === PublicLangData.editor.template.title) {
        this.template.init();
      }
    }
  });

  constructor(editor: UEditor, parent: Mcmodder) {
    super(editor, parent);
    this.originalTextLength = this.currentTextLength = this.changedTextLength = 0;
    this.autoUpdateEditorStatsThreshold = this.configs.getSettings("editorStats") ?? 1e4;
    this.isModrinthVer = new URLSearchParams(window.location.search).has("mrid");
    if (this.isFrameReady) {
      this.pending = false;
      this.advinit();
    }
  }

  private addTool(id: string, text: string, callback: () => any) {
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
    this.refreshHtmlNode = this.htmlEditorOuterContainer.find(".refresh-text").hide().click(() => {
      this.manualTriggerHtmlUpdate();
    });;

    this.addTool("mcmodder-tool-md", "Markdown → HTML", () => this.performMarkdownIt());

    this.addTool("mcmodder-tool-brfix", "修复 br 换行", () => this.performBrFix());

    this.addTool("mcmodder-tool-linkfix", "移除无效链接", () => this.performLinkFix());

    this.addTool("mcmodder-tool-spacing", "中英间添加空格", () => this.performSpacingPage());

    this.autoLinkFrame = $('<div class="mcmodder-autolink-frame">');
    this.autoLink = createApp(AutoLink, {
      editor: this
    }).mount(this.autoLinkFrame.get(0)) as InstanceType<typeof AutoLink>;

    // 快速提交
    this.$document.keydown(e => this.fastSubmitOverride(e));

    const postRow = $(".post-row").first();
    const editTools = $(".edit-tools").first();

    // 按钮展示修改
    ((this.parent.isMobileClient ? [
      ["save", "快速存档", { ctrlKey: true, key: "S" }],
      ["new", "存档", { ctrlKey: true, shiftKey: true, key: "S" }],
      ["load", "读取", { ctrlKey: true, key: "O" }]
    ] : []) as [string, string, Key][]).forEach(data => {
      const editToolButton = editTools.find(`.${ data[0] } a`);
      if (editToolButton.length) {
        (editToolButton.get(0).lastChild as Text).data = data[1];
        editToolButton.append(` ${ Utils.keyToHTML(data[2]) }`);
      }
    });

    // 高度自适应 + 编辑量实时统计
    if (this.autoUpdateEditorStatsThreshold > 0) {
      if (!editTools.length && postRow.length) {
        // $("div.col-lg-12.left").remove();
        // $("div.col-lg-12.right").css("padding-left", "0px");
        this.statsBar = $('<span style="font-size: 12px; margin-top: 10px; position: relative;">').appendTo(postRow);
      }
      else {
        this.statsBar = $("<span>").appendTo(editTools);
      }
      this.statsBar.attr('class', 'mcmodder-editor-stats')
      .html(`<i class="fa fa-edit"></i>
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
        </span>`
      );

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
    this.$outerFrame.find(".edui-for-fullscreen").children().click(() => {
      if (this.isEditorFullScreen())
        Utils.addStyle("#editor-ueeditor > .edui-editor {background-color: var(--mcmodder-color-background);}", "mcmodder-fullscreen-style");
      else
        $("#mcmodder-fullscreen-style").remove();
    });

    if (!this.editToolsBar.length && $(".post-row").length) {
      $(".post-row").get(0).insertBefore($(".post-row > .mcmodder-editor-stats").get(0), $(".post-row > #editor-ueeditor").get(0));
    }

    this.mdEditorOption = this.addOption(
      "Markdown 编辑器",
      "mcmodder-option-md",
      _value => this.readyMarkdownEditor()
    );

    this.htmlEditorOption = this.addOption(
      "源代码编辑器",
      "mcmodder-option-html",
      _value => this.readyHtmlEditor(),
    );

    this.verticalOption = this.addOption(
      "纵向排列",
      "mcmodder-option-vertical",
      _value => this.readyVerticalEditor(),
    );

    this.toolkitOption = this.addOption(
      "实用工具",
      "mcmodder-option-toolkit",
      _value => this.readyToolkit(),
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
    if (this.configs.getSettings("anonymousUknowtoomuch"))
      this.anonymiseUknowtoomuch();
  }

  addOption(title: string, id: string, onSuccessfulChange: InputSuccessfulChangeCallBack<boolean>): ContainerComponentPair {
    const container = $("<span>").appendTo(this.optionBar!).get(0) as HTMLSpanElement;
    return [container, createApp(CheckboxInput, {
      title,
      value: false,
      onSuccessfulChange,
      id,
      withLabel: true
    }).mount(container) as InstanceType<typeof CheckboxInput>];
  }

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

  private async readyMarkdownEditor() {
    if (!this.$document || !this.head || !this.$outerFrame || !this.mdEditorContainer || !this.mdEditorOption) return;
    const c = this.mdEditorOption![1].getValue();
    if (c) {
      // await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js", null, "mcmodder-script-markdownit");
      await Utils.loadScript(this.head, null, Values.assets.js.markdownit, null, "mcmodder-script-markdownit");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirror, null, "mcmodder-script-codemirror");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.markdown, null, "mcmodder-script-codemirror-mod-markdown");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.htmlEmbedded, null, "mcmodder-script-codemirror-mod-htmlembedded");
      await Utils.loadStyle(document.head, null, Values.assets.css.codemirror, null, "mcmodder-style-codemirror");
      
      if (!this.mdEditor) {
        this.mdEditor = CodeMirror(this.mdEditorContainer.get(0), {
          mode: "markdown",
          theme: "mcmodder"
        });
        this.mdEditor.on("change", Utils.throttle(() => {
          this.heightAutoResize();
        }, 300));
        this.turndownSurvice = new TurndownService().use(turndownPluginGfm.gfm);
        if (this.$body) {
          const content = this.$body.clone();
          content.contents().filter((_, e) => e.tagName === "P").each((_, p) => {
            $(p).contents().filter((_, e) => e.nodeType == Node.TEXT_NODE).each((_, e) => {
              const textNode = e as Node as Text;
              const text = textNode.data;
              const matchResult = text.match(/\[h[1-6]=.*?\]/);
              if (matchResult) matchResult.forEach(result => {
                const index = text.indexOf(result);
                const mid = textNode.splitText(index);
                mid.splitText(result.length);
                const title =  document.createElement(`h${ text.charAt(2) }`);
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
    }
    else {
      $("#mcmodder-tool-md, #mcmodder-mdeditor").hide();
      $(this.verticalOption![0]).hide;
    }
    this.configs.setSettings("markdownIt", c);
    this.onEditorStateChange();
  }

  private async readyHtmlEditor() {
    if (!this.htmlEditorContainer || !this.$body) return;
    const c = this.htmlEditorOption?.[1].getValue();
    if (c) {
      await Utils.loadStyle(document.head, null, Values.assets.css.codemirror, null, "mcmodder-style-codemirror");
      if (!this.htmlEditor) {
        this.htmlEditor = CodeMirror(this.htmlEditorContainer.get(0), {
          mode: "xml",
          theme: "mcmodder"
        });
        this.htmlEditor.on("change", Utils.throttle(() => {
          this.heightAutoResize();
        }, 300));
        this.htmlEditor.on("change", Utils.throttle((instance: CodeMirror.Editor) => {
          if (!this.contentLock) {
            this.contentLock = true;
            this.editor?.setContent(instance.getValue());
            this.refreshHtmlNode?.hide();
            this.contentLock = false;
          }
        }, 300));
        this.syncHtml();
      }
      $("#mcmodder-htmleditor").show();
    } else {
      $("#mcmodder-htmleditor").hide();
    }
    this.configs.setSettings("htmlEditor", c);
    this.onEditorStateChange();
  }

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

  private readyToolkit() {
    const c = this.toolkitOption?.[1].getValue();
    if (c) {
      $("#mcmodder-tool-brfix, #mcmodder-tool-linkfix, #mcmodder-tool-spacing").show();
    } else {
      $("#mcmodder-tool-brfix, #mcmodder-tool-linkfix, #mcmodder-tool-spacing").hide();
    }
    this.configs.setSettings("editorToolkit", c);
  }

  performMarkdownIt() {
    // 预处理
    // this.mdEditor.find("p > br").remove();
    if (!this.mdEditorOuterContainer || !this.mdEditor || !this.body || !this.$document) return;
    const md = (this.window as any).markdownit();
    const htmlOutput = md.render(this.mdEditor.getValue());
    const content = this.$body?.html(htmlOutput);
    for (let i = 1; i <= 6; i++) {
      content?.find(`h${ i }`).each((_, e) => {
        const node = document.createElement("p");
        node.textContent = `[h${ i }=${ e.textContent }]`;
        e.replaceWith(node);
      });
    }

    // 后期检测
    this.$document.find("code").css("border", "3px solid red").each(() => {
      Utils.commonMsg("转换结果中出现不受支持的行间代码块 (code)，请适当调整~")
    });
    this.$document.find("pre").each((_, c) => {
      $(c).html($(c).text());
      if (!c.classList.length) Utils.commonMsg("转换结果中出现代码块 (pre)，记得设置相应语言~")
    });
    this.$document.find("blockquote").css("border", "3px solid red").each(() =>
      Utils.commonMsg("转换结果中出现不受支持的引用块 (blockquote)，请适当调整~", false)
    );

    // 列表统一标准
    this.$document.find("ul")
    .addClass("list-paddingleft-2")
    .each((_, ul) => {
      ul.childNodes.forEach(li => {
        if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName === "LI") {
          li.childNodes.forEach(e => {
            if ((e as Text).nodeType === Node.TEXT_NODE) {
              const p = document.createElement("p");
              p.textContent = (e as Text).data;
              const next = e.nextSibling;
              if (next?.nodeType === Node.ELEMENT_NODE && (next as HTMLElement).tagName === "BR") {
                next.remove();
              }
              e.replaceWith(p);
            }
          });
        }
      })
    })

    this.updateEditorStats();
  }

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
    ps.forEach(p => {
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
    Utils.commonMsg(`${ count } 处 br 换行问题已被修复~`);
  }

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
      Utils.commonMsg(`${ count } 处异常链接已被修复~`);
    }
  }

  async performSpacingPage() {
    if (!this.window || !this.head || !this.body || !this.$body) return;
    await Utils.loadScript(this.head, null, Values.assets.js.pangu, null, "mcmodder-script-pangu");
    const isEditable = this.body.contentEditable;
    this.body.contentEditable = "false";

    this.$body.find("*").contents().filter((_, e) => e.nodeType === Node.TEXT_NODE).each((_, _text) => {
      let first = _text as any as Text;
      const matchList = first.data.match(/\[(h[1-6]=|ban:|mark:|icon:).*?\]/g);
      matchList?.forEach(substr => {
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
            if (first && /\s/.test(first.data.slice(-1))) temp.setAttribute("data-space-prev", "1");
            if (last && /\s/.test(last?.data.slice(0))) temp.setAttribute("data-space-next", "1");
            temp.text = number + text;
          }
        }

        mid.replaceWith(temp);
        first = last;
      });
    });

    (this.window as any).pangu.spacingPage();
    if (isEditable === "true") setTimeout(() => {

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
              if (prev && prev.nodeType === Node.TEXT_NODE &&
                !temp.hasAttribute("data-space-prev") &&
                /\s/.test(prev.data.slice(-1)) &&
                !/\s/.test(temp.text.slice(0))
              ) {
                prependSpace = true;
              }
              if (next && next.nodeType === Node.TEXT_NODE &&
                !temp.hasAttribute("data-space-prev") &&
                /\s/.test(next.data.slice(0)) &&
                !/\s/.test(temp.text.slice(-1))
              ) {
                appendSpace = true;
              }
              if (`${ number } ${ text }` === temp.text) {
                insertSpace = true;
              }
              const result = `${
                prependSpace ? " " : ""
              }[icon:${ name }=${ number },${
                insertSpace ? " " : ""
              }${ text }]${
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
    }, 1e2);
  }

  isEditorLocked() {
    return $(".edit-user-alert.locked").length ? true : false;
  }

  colorpickerInit() {
    let colorpicker = $(".edui-colorpicker tbody");

    // 格式化代码颜色
    let l = Values.formatColors.length;
    let s = `<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default">
      <td colspan="10" class="edui-default" id="mcmodder-format-column">
        <a target="_blank" href="https://zh.minecraft.wiki/w/%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81#%E9%A2%9C%E8%89%B2%E4%BB%A3%E7%A0%81">格式化代码颜色</a>
      </td>
    </tr>`;
    for (let i = 0; i < l; i += 10) {
      s += '<tr class="edui-default">';
      for (let j = i; j < Math.min(i + 10, l); j++)
        s += `<td style="padding: ${j < 10 ? "6px 2px 0 2px" : "0 2px"};" class="edui-default"><a hidefocus="" title="§${j.toString(16)} - ${Values.formatColors[j]}" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#${Values.formatColors[j]}" style="background-color:#${Values.formatColors[j]};border:solid #ccc;border-width:1px;"></a></td>`
      s += '</tr>';
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

  updateTextLengthDisplay() {
    if (!this.currentTextNode || !this.changedTextNode || 
      this.currentTextLength === undefined || this.changedTextLength === undefined ||
      !this.statsBar) return;
    let changedTextLength = this.currentTextLength - this.originalTextLength;
    this.currentTextNode.html(this.currentTextLength.toLocaleString());
    this.changedTextNode.attr("class", (changedTextLength < 0 ? "mcmodder-common-danger" : "mcmodder-common-light"))
      .html((changedTextLength > 0 ? "+" : "") + changedTextLength.toLocaleString());
    let t = this.statsBar.contents().filter(i => i > 4 && i < 12);
    if (changedTextLength) t.show();
    else t.hide();
  }

  updateCurrentTextLength(length: number) {
    this.currentTextLength = length;
    this.updateTextLengthDisplay();
  }

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
    const url = commonNav.children().eq(commonNav.children().length - 3).children().first().attr("href");
    const resp = await this.parent.utils.createRequest({
      url: url,
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      anonymous: true
    });
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    const textArea = doc.find(".text-area.common-text").first() || doc.find(".item-content.common-text").first();
    textArea.find(".figure").remove();
    const t1 = textArea.children().filter((_, c) => this.isNodeCountableForBytes(c as HTMLElement));
    const t2 = this.$body.children();
    let ta = "", tb = "";
    this.originalTextLength = 0;
    t1.each((_, e) => {
      ta += e.textContent + "\n";
      this.originalTextLength += Utils.getContextLength(e.textContent);
    });
    t2.each((_, e) => {
      let t = Utils.clearContextFormatter(e.textContent);
      if (t) tb += t + "\n";
    });
    this.updateTextLengthDisplay();
    const comparatorFrame = $("<div>").insertBefore($(".tab-content").first());
    createApp(TextComparator, { textA: ta, textB: tb }).mount(comparatorFrame.get(0));
    // this.updateEditorStats();
  }

  isNodeCountableForBytes(node: HTMLElement) {
    if (!node.textContent) return false;
    if (node.className === "common-text-menu") return false;
    if (node.id.slice(0, 5) === "link_") return false;
    if (node.tagName === "SCRIPT") return false;
    if ($(node).attr("style") === "text-align:center;color:#888;width:100%;float:left;font-size:14px;") return false;
    return true;
  }

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

  private manualTriggerStatsUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStatsThreshold) {
      this.calculateBytes();
      this.refreshTextNode?.hide();
    }
  }

  private manualTriggerHtmlUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStatsThreshold) {
      this.syncHtml();
      this.refreshHtmlNode?.hide();
    }
  }

  private calculateBytes() {
    let contextLength = 0;
    if (this.body) $(this.body).contents()
      .filter((_i, c) => c.tagName != "PRE")
      .each((_i, c) => {
        contextLength += Utils.getContextLength(c.textContent);
      });
    this.updateCurrentTextLength(contextLength);
  }

  private syncHtml() {
    if (this.htmlEditor && !this.contentLock) {
      this.contentLock = true;
      const text = this.$body?.html() || "";
      const formatted = html_beautify(text, { indent_size: 2 });
      this.htmlEditor?.setValue(formatted);
      this.contentLock = false;
    }
  }

  anonymiseUknowtoomuch() {
    baidu.editor.commands.uknowtoomuch.execCommand = function () {
      let b, a = editor.selection.getRange();
      return a.select(), (b = editor.selection.getText()) ?
        (editor.execCommand("insertHtml", `<span class="uknowtoomuch">${b}</span>`, true), void 0) :
        (Utils.commonMsg(PublicLangData['warning']['inform'][164], false), void 0);
    }
  }

  showAutoLinkList() {
    Utils.createModal({ // 初始化
      title: PublicLangData.editor.autolink.title,
      html: `<div class="mcmodder-autolink-outerframe" />`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: PublicLangData.close,
      preConfirm: () => { }
    }, this.autoLink!.interceptEvents);
    this.autoLinkFrame?.appendTo(".swal2-content .mcmodder-autolink-outerframe");
    this.autoLink?.init();
  }

  fastSubmitOverride(e: JQueryKeyEventObject) {
    bindFastSubmit(e);
    if (this.parent.utils.isKeyMatchConfig("keybindFastLink", e)) {
      e.preventDefault();
      this.showAutoLinkList();
    };
    if ($(".common-menu-area").length > 0 && (Utils.isKeyMatch({ keyCode: 33 }, e) || Utils.isKeyMatch({ keyCode: 34 }, e))) {
      $(".common-menu-area").hide();
      setTimeout(() => {
        $(".common-menu-area").show();
      }, 0);
    }
  }
}