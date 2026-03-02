import { Mcmodder } from "../Mcmodder";
import { McmodderItemList } from "../types";
import { McmodderTemplate } from "../Template";
import { TextCompareFrame } from "../TextCompareFrame";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderAutoLink } from "../widget/AutoLink";
import { McmodderUEditor } from "./UEditor";

export class McmodderAdvancedUEditor extends McmodderUEditor {

  editToolsBar?: JQuery;
  optionBar?: JQuery;
  toolBar?: JQuery;
  mdEditor?: JQuery;
  protected originalTextLength: number;
  protected currentTextLength: number;
  protected changedTextLength: number;
  statsBar?: JQuery;
  currentTextNode?: JQuery;
  changedTextNode?: JQuery;
  refreshTextNode?: JQuery;
  protected isModrinthVer: boolean;
  protected autoUpdateEditorStatsThreshold: number;
  autoLink?: McmodderAutoLink;
  template = new McmodderTemplate(this);

  constructor(editor: McmodderUEditor, parent: Mcmodder) {
    super(editor, parent);
    this.editToolsBar = this.optionBar = this.toolBar = this.mdEditor = this.statsBar = this.currentTextNode = this.changedTextNode = this.autoLink = undefined;
    this.originalTextLength = this.currentTextLength = this.changedTextLength = 0;
    this.autoUpdateEditorStatsThreshold = this.parent.utils.getConfig("editorStats");
    this.isModrinthVer = new URLSearchParams(window.location.search).has("mrid");
    this.advinit();
  }

  private advinit() {
    if (!this.$outerFrame || !this.document || !this.$document) return;

    this.editToolsBar = this.$outerFrame.parent().find(".edit-tools");
    this.optionBar = $(`<div class="mcmodder-option-bar"></div>`).insertAfter(this.editToolsBar);
    this.toolBar = $(`<div class="mcmodder-tool-bar"></div>`).insertAfter(this.optionBar);

    // Markdown 转 HTML
    this.mdEditor = $('<textarea id="mcmodder-mdeditor" class="form-control mcmodder-monospace" placeholder="Markdown 编辑区域...">');
    this.mdEditor.hide().insertBefore(this.$outerFrame);

    $('<button id="mcmodder-tool-md" class="btn btn-sm">Markdown → HTML</button>')
    .hide()
    .appendTo(this.toolBar)
    .click(() => this.performMarkdownIt());

    let itemSourceList: McmodderItemList = [];
    (this.parent.utils.getConfig("jsonDatabase") as string[])?.forEach(fileName => {
      itemSourceList = itemSourceList.concat(this.parent.utils.getConfig(fileName, "mcmodderJsonStorage", []));
    });
    this.autoLink = new McmodderAutoLink(this, itemSourceList);

    // 内置样式
    McmodderUtils.addStyle("pre {font-family: Consolas, monospace; box-shadow: inset rgba(50, 50, 100, 0.4) 0px 2px 4px 0px;}", "", this.document);

    // 快速提交
    this.$document.keydown(e => this.fastSubmitOverride(e));

    // 高度自适应 + 编辑量实时统计
    if (this.autoUpdateEditorStatsThreshold > 0) {
      if (!$(".edit-tools").length && $(".post-row").length) {
        // $("div.col-lg-12.left").remove();
        // $("div.col-lg-12.right").css("padding-left", "0px");
        this.statsBar = $('<span style="font-size: 12px; margin-top: 10px; position: relative;">').appendTo($(".post-row").first());
      }
      else {
        this.statsBar = $("<span>").appendTo($(".edit-tools").first());
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
        McmodderUtils.addStyle("#editor-ueeditor > .edui-editor {background-color: var(--mcmodder-bgn);}", "mcmodder-fullscreen-style");
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

    $(`<div class="checkbox" data-toggle="tooltip" data-original-title="通过外部库 markdown-it，实现一键 Markdown→HTML 转换。">
      <input type="checkbox" id="mcmodder-option-md" name="mcmodder-option-md">
      <label for="mcmodder-option-md">Markdown 编辑模式</label>
    </div>`).appendTo(".mcmodder-option-bar");

    $("#mcmodder-option-md").click(() => this.readyMarkdownIt());

    if (this.parent.utils.getConfig("markdownIt") || this.isModrinthVer) {
      $("#mcmodder-option-md").click(); // Modrinth 日志以 Md 格式保存，自动添加日志时总是开启
    }

    // 匿名吐槽
    if (this.parent.utils.getConfig("anonymousUknowtoomuch"))
      this.anonymiseUknowtoomuch();
  }

  widthAutoResize() {
    if (!this.$outerFrame) return;
    super.widthAutoResize();
    this.mdEditor?.css("height", this.$outerFrame.css("height"));
  }

  resizeHeight(height: number) {
    super.resizeHeight(height);
    (this.mdEditor?.get(0) as HTMLElement)?.style?.setProperty("height", $("#editor-ueeditor").css("height"), "important");
  }

  async readyMarkdownIt() {
    if (!this.$document || !this.head || !this.$outerFrame) return;
    let c = $("#mcmodder-option-md").prop("checked");
    if (c) {
      // await McmodderUtils.loadScript(editorDoc.head, null, "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js", null, "mcmodder-script-md");
      if (!this.$document.find("#mcmodder-script-md").length)
        await McmodderUtils.loadScript(this.head, null, McmodderValues.assets.js.markdownit, null, "mcmodder-script-md");
      if (this.isModrinthVer) $("#mcmodder-tool-md").click();
      $("#mcmodder-tool-md, #mcmodder-mdeditor").show();
      this.$outerFrame.css("width", "50%");
    }
    else {
      $("#mcmodder-tool-md, #mcmodder-mdeditor").hide();
      this.$outerFrame.css("width", "100%");
    }
    this.parent.utils.setConfig("markdownIt", !!c);
    window.dispatchEvent(new Event("resize"));
    this.updateEditorStats();
  }

  performMarkdownIt() {
    // 预处理
    // this.mdEditor.find("p > br").remove();
    if (!this.mdEditor || !this.body || !this.$document) return;
    let content: string[] = this.mdEditor.val().split("\n");
    content = content.map(c => {
      for (let i = 1; i < 6; i++)
        if (c.slice(0, i + 1) === "#".repeat(i) + " ")
          return `[h${i}=${c.slice(i + 1)}]`;
      return c;
    });

    const md = (this.window as any).markdownit();
    const htmlOutput = md.render(content.join("\n"));
    this.body.innerHTML = htmlOutput;

    // 后期检测
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
    let t = this.statsBar.contents().filter(i => i > 4);
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
    const resp = await this.parent.utils.createAsyncRequest({
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

  updateEditorStats() {
    if (!this.isEditorFullScreen()) this.heightAutoResize();
    if (this.currentTextLength <= this.autoUpdateEditorStatsThreshold) {
      this.calculateBytes();
    } else {
      this.refreshTextNode?.show();
    }
  }

  manualTriggerStatsUpdate() {
    if (this.currentTextLength > this.autoUpdateEditorStatsThreshold) {
      this.calculateBytes();
      this.refreshTextNode?.hide();
    }
  }

  calculateBytes() {
    let contextLength = 0;
    if (this.body) $(this.body).contents()
      .filter((_i, c) => c.tagName != "PRE")
      .each((_i, c) => {
        contextLength += McmodderUtils.getContextLength(c.textContent);
      });
    this.updateCurrentTextLength(contextLength);
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