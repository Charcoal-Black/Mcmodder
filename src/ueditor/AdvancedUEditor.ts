import { Mcmodder } from "../Mcmodder";
import { McmodderItemList, McmodderKeyData } from "../types";
import { McmodderTemplate } from "../Template";
import { TextCompareFrame } from "../TextCompareFrame";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderAutoLink } from "../widget/AutoLink";
import { McmodderUEditor } from "./UEditor"
import { McmodderCheckboxInput } from "../widget/input/CheckboxInput";
import CodeMirror from "codemirror";
import TurndownService from "turndown";
import { style_html } from "../js/style_html";

export class McmodderAdvancedUEditor extends McmodderUEditor {

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
  protected mdEditorOption?: McmodderCheckboxInput;
  protected htmlEditorOption?: McmodderCheckboxInput;
  protected verticalOption?: McmodderCheckboxInput;
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
  autoLink?: McmodderAutoLink;
  template = new McmodderTemplate(this);
  private contentLock = false;

  constructor(editor: McmodderUEditor, parent: Mcmodder) {
    super(editor, parent);
    this.originalTextLength = this.currentTextLength = this.changedTextLength = 0;
    this.autoUpdateEditorStatsThreshold = this.parent.utils.getConfig("editorStats");
    this.isModrinthVer = new URLSearchParams(window.location.search).has("mrid");
    this.advinit();
  }

  private advinit() {
    if (!this.$outerFrame || !this.$innerFrame || !this.document || !this.$document) return;

    this.editToolsBar = this.$outerFrame.parent().find(".edit-tools");
    if (!this.editToolsBar.length) {
      this.editToolsBar = $(`<div class="edit-tools">`).insertBefore(this.$outerFrame);
    }
    this.optionBar = $(`<div class="mcmodder-option-bar"></div>`).insertAfter(this.editToolsBar);
    this.toolBar = $(`<div class="mcmodder-tool-bar"></div>`).insertAfter(this.optionBar);

    // Markdown 转 HTML
    this.mdEditorOuterContainer = $(`
      <div id="mcmodder-mdeditor">
        <div class="edui-default edui-editor-toolbarboxouter">
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

    $('<button id="mcmodder-tool-md" class="btn btn-sm">Markdown → HTML</button>')
    .hide()
    .appendTo(this.toolBar)
    .click(() => this.performMarkdownIt());

    let itemSourceList: McmodderItemList = [];
    (this.parent.utils.getConfig("jsonDatabase") as string[])?.forEach(fileName => {
      itemSourceList = itemSourceList.concat(this.parent.utils.getConfig(fileName, "mcmodderJsonStorage", []));
    });
    this.autoLink = new McmodderAutoLink(this, itemSourceList);

    // 快速提交
    this.$document.keydown(e => this.fastSubmitOverride(e));

    const postRow = $(".post-row").first();
    const editTools = $(".edit-tools").first();

    // 按钮展示修改
    ((this.parent.isMobileClient ? [
      ["save", "快速存档", { ctrlKey: true, key: "S" }],
      ["new", "存档", { ctrlKey: true, shiftKey: true, key: "S" }],
      ["load", "读取", { ctrlKey: true, key: "O" }]
    ] : []) as [string, string, McmodderKeyData][]).forEach(data => {
      const editToolButton = editTools.find(`.${ data[0] } a`);
      if (editToolButton.length) {
        (editToolButton.get(0).lastChild as Text).data = data[1];
        editToolButton.append(` ${ McmodderUtils.keyToHTML(data[2]) }`);
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
        McmodderUtils.addStyle("#editor-ueeditor > .edui-editor {background-color: var(--mcmodder-color-background);}", "mcmodder-fullscreen-style");
      else
        $("#mcmodder-fullscreen-style").remove();
    });

    if (!this.editToolsBar.length && $(".post-row").length) {
      $(".post-row").get(0).insertBefore($(".post-row > .mcmodder-editor-stats").get(0), $(".post-row > #editor-ueeditor").get(0));
    }

    /* $('<button id="mcmodder-tool-pangu" data-toggle="tooltip" data-original-title="有研究表明，打字的时候不喜欢在中文和英文之间加空格的人，感情路都走得很辛苦，有七成的比例会在 34 岁的时候跟自己不爱的人结婚，而剩下三成的人最后只能把遗产留给自己的猫。" class="btn btn-outline-dark btn-sm">中英间插入空格</button>').appendTo(".mcmodder-tool-bar").click(async () => {
      if (!$(editorDoc).find("#mcmodder-script-pangu").length) await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/pangu@7.2.0/dist/browser/pangu.umd.min.js", null, "mcmodder-script-pangu");

      let e = editorDoc.body.contentEditable;
      editorDoc.body.contentEditable = false;
      editorWin.pangu.spacingPage();
      if (e === "true") editorDoc.body.contentEditable = true;
    }); */

    this.mdEditorOption = new McmodderCheckboxInput("Markdown 编辑器", false, _value => this.readyMarkdownEditor(), "mcmodder-option-md", true);
    this.mdEditorOption.getInstance().appendTo(".mcmodder-option-bar");

    this.htmlEditorOption = new McmodderCheckboxInput("源代码编辑器", false, _value => this.readyHtmlEditor(), "mcmodder-option-html", true);
    this.htmlEditorOption.getInstance().appendTo(".mcmodder-option-bar");

    this.verticalOption = new McmodderCheckboxInput("纵向排列", false, _value => this.readyVerticalEditor(), "mcmodder-option-vertical", true);
    this.verticalOption.getInstance().appendTo(".mcmodder-option-bar").hide();

    if (this.parent.utils.getConfig("markdownIt") || this.isModrinthVer) {
      this.mdEditorOption.click(); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启
    }

    if (this.parent.utils.getConfig("htmlEditor")) {
      this.htmlEditorOption.click(); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启
    }

    let isVertical = this.parent.utils.getConfig("editorVertical");
    if (isVertical == undefined) {
      isVertical = screen.width < 741;
      this.parent.utils.setConfig("editorVertical", isVertical); 
    }
    if (isVertical) {
      this.verticalOption.click();
    }

    // 匿名吐槽
    if (this.parent.utils.getConfig("anonymousUknowtoomuch"))
      this.anonymiseUknowtoomuch();
  }

  override widthAutoResize() {
    if (!this.$innerFrame) return;
    super.widthAutoResize();
    this.mdEditorOuterContainer?.css("height", this.$innerFrame.css("height"));
    this.htmlEditorOuterContainer?.css("height", this.$innerFrame.css("height"));
  }

  override resizeHeight(height: number) {
    if (!this.$innerFrame) return;
    super.resizeHeight(height);
    (this.mdEditorOuterContainer?.get(0) as HTMLElement)?.style?.setProperty("height", this.$innerFrame?.css("height"), "important");
    (this.htmlEditorOuterContainer?.get(0) as HTMLElement)?.style?.setProperty("height", this.$innerFrame?.css("height"), "important");
  }

  private async readyMarkdownEditor() {
    if (!this.$document || !this.head || !this.$outerFrame || !this.mdEditorContainer || !this.mdEditorOption) return;
    const c = this.mdEditorOption.getCurrentValue();
    if (c) {
      // await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js", null, "mcmodder-script-markdownit");
      await McmodderUtils.loadScript(this.head, null, McmodderValues.assets.js.markdownit, null, "mcmodder-script-markdownit");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirror, null, "mcmodder-script-codemirror");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.markdown, null, "mcmodder-script-codemirror-mod-markdown");
      // await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.js.codemirrorMod.htmlEmbedded, null, "mcmodder-script-codemirror-mod-htmlembedded");
      await McmodderUtils.loadStyle(document.head, null, McmodderValues.assets.css.codemirror, null, "mcmodder-style-codemirror");
      
      if (!this.mdEditor) {
        this.mdEditor = CodeMirror(this.mdEditorContainer.get(0), {
          mode: "markdown",
          theme: "mcmodder"
        });
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
      this.verticalOption?.getInstance().show();
    }
    else {
      $("#mcmodder-tool-md, #mcmodder-mdeditor").hide();
      this.verticalOption?.getInstance().hide();
    }
    this.parent.utils.setConfig("markdownIt", c);
    this.onEditorStateChange();
  }

  private async readyHtmlEditor() {
    if (!this.htmlEditorContainer || !this.$body) return;
    const c = this.htmlEditorOption?.getCurrentValue();
    if (c) {
      await McmodderUtils.loadStyle(document.head, null, McmodderValues.assets.css.codemirror, null, "mcmodder-style-codemirror");
      if (!this.htmlEditor) {
        this.htmlEditor = CodeMirror(this.htmlEditorContainer.get(0), {
          mode: "xml",
          theme: "mcmodder"
        });
        this.htmlEditor.on("change", McmodderUtils.throttle((instance: CodeMirror.Editor) => {
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
    this.parent.utils.setConfig("htmlEditor", c);
    this.onEditorStateChange();
  }

  private onEditorStateChange() {
    const md = this.mdEditorOption?.getCurrentValue();
    const html = this.htmlEditorOption?.getCurrentValue();
    if (md || html) {
      this.verticalOption?.getInstance().show();
    } else {
      this.verticalOption?.getInstance().hide();
    }
    window.dispatchEvent(new Event("resize"));
    this.updateEditorStats();
  }

  private readyVerticalEditor() {
    const c = this.verticalOption?.getCurrentValue();
    if (c) {
      this.$outerFrame?.addClass("vertical");
    } else {
      this.$outerFrame?.removeClass("vertical");
    }
    this.parent.utils.setConfig("editorVertical", c);
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
      McmodderUtils.commonMsg("转换结果中出现不受支持的行间代码块 (code)，请适当调整~")
    });
    this.$document.find("pre").each((_, c) => {
      $(c).html($(c).text());
      if (!c.classList.length) McmodderUtils.commonMsg("转换结果中出现代码块 (pre)，记得设置相应语言~")
    });
    this.$document.find("blockquote").css("border", "3px solid red").each(() =>
      McmodderUtils.commonMsg("转换结果中出现不受支持的引用块 (blockquote)，请适当调整~", false)
    );

    this.updateEditorStats();
  }

  isEditorLocked() {
    return $(".edit-user-alert.locked").length ? true : false;
  }

  colorpickerInit() {
    let colorpicker = $(".edui-colorpicker tbody");

    // 格式化代码颜色
    let l = McmodderValues.formatColors.length;
    let s = `<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default">
      <td colspan="10" class="edui-default" id="mcmodder-format-column">
        <a target="_blank" href="https://zh.minecraft.wiki/w/%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81#%E9%A2%9C%E8%89%B2%E4%BB%A3%E7%A0%81">格式化代码颜色</a>
      </td>
    </tr>`;
    for (let i = 0; i < l; i += 10) {
      s += '<tr class="edui-default">';
      for (let j = i; j < Math.min(i + 10, l); j++)
        s += `<td style="padding: ${j < 10 ? "6px 2px 0 2px" : "0 2px"};" class="edui-default"><a hidefocus="" title="§${j.toString(16)} - ${McmodderValues.formatColors[j]}" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#${McmodderValues.formatColors[j]}" style="background-color:#${McmodderValues.formatColors[j]};border:solid #ccc;border-width:1px;"></a></td>`
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
    this.changedTextNode.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
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
      this.originalTextLength += McmodderUtils.getContextLength(e.textContent);
    });
    t2.each((_, e) => {
      let t = McmodderUtils.clearContextFormatter(e.textContent);
      if (t) tb += t + "\n";
    });
    this.updateTextLengthDisplay();
    new TextCompareFrame($(".tab-content").first(), ta, tb).performCompare();
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
      McmodderUtils.throttle(() => {
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
        contextLength += McmodderUtils.getContextLength(c.textContent);
      });
    this.updateCurrentTextLength(contextLength);
  }

  private syncHtml() {
    if (this.htmlEditor && !this.contentLock) {
      this.contentLock = true;
      const text = this.$body?.html() || "";
      const formatted = style_html(text);
      this.htmlEditor?.setValue(formatted);
      this.contentLock = false;
    }
  }

  anonymiseUknowtoomuch() {
    baidu.editor.commands.uknowtoomuch.execCommand = function () {
      let b, a = editor.selection.getRange();
      return a.select(), (b = editor.selection.getText()) ?
        (editor.execCommand("insertHtml", `<span class="uknowtoomuch">${b}</span>`, true), void 0) :
        (McmodderUtils.commonMsg(PublicLangData['warning']['inform'][164], false), void 0);
    }
  }

  showAutoLinkList() {
    this.autoLink?.init();
  }

  fastSubmitOverride(e: JQueryKeyEventObject) {
    bindFastSubmit(e);
    if (this.parent.utils.isKeyMatchConfig("keybindFastLink", e)) {
      e.preventDefault();
      this.showAutoLinkList();
    };
    if ($(".common-menu-area").length > 0 && (McmodderUtils.isKeyMatch({ keyCode: 33 }, e) || McmodderUtils.isKeyMatch({ keyCode: 34 }, e))) {
      $(".common-menu-area").hide();
      setTimeout(() => {
        $(".common-menu-area").show();
      }, 0);
    }
  }
}