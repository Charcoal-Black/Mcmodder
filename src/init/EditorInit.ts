import { EditorAlertForm, EditorAlertHTMLModifier, PreSubmitData } from "../types";
import { McmodderAdvancedUEditor } from "../ueditor/AdvancedUEditor";
import { McmodderUEditor } from "../ueditor/UEditor";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

abstract class EditorAlertLink {
  static replaceText = (c: HTMLElement, target: string) => {
    const work = (first: Text) => {
      const content = first.textContent;
      const pos = content?.indexOf(target);
      if (pos === undefined || pos < 0) return;
      const mid = first.splitText(pos);
      const last = mid.splitText(target.length);
      mid.remove();
      $(`<a>`).text(target).insertBefore(last);
    }
    const search = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) work(node as Text);
      else if (node.nodeType === Node.ELEMENT_NODE) {
        (node as HTMLElement).childNodes.forEach(child => search(child));
      }
    }
    search(c);
  }
  static appendButton = (c: HTMLElement) => c.innerHTML += `<a>定位</a>`;
  protected readonly editor: McmodderUEditor[];
  private text: string[] = [];
  readonly modifier: EditorAlertHTMLModifier;
  abstract run(): boolean;
  private setText(text: string | string[]) {
    if (!(text instanceof Array)) this.text = [text];
    else this.text = text;
  }
  check(text: string) {
    return this.text.includes(text);
  }
  constructor(editor: McmodderUEditor[], text: string | string[], modifier: EditorAlertHTMLModifier) {
    this.editor = editor;
    this.setText(text);
    this.modifier = modifier;
  }
}

abstract class EditorAlertContextLink extends EditorAlertLink {
  protected range?: Range;
  protected contents?: JQuery;
  abstract checkContent(text: string, element: Element): boolean;
  run() {
    let state = false;
    this.range = this.editor[0]?.document?.createRange();
    this.contents = this.editor[0]?.$body?.find("*, * *").contents();
    if (!this.range || !this.contents) return false;
    this.contents!.each((_, c) => {
      if (c.nodeType != Node.TEXT_NODE) return;
      if (state) return;
      state = this.checkContent(c.textContent, c);
    });
    swal.close();
    if (state) setTimeout(() => {
      const selection = this.editor[0]?.window?.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(this.range!);
        (selection.anchorNode?.parentNode as HTMLElement)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 400);
    return state;
  }
}

class EditorAlertTextLink extends EditorAlertContextLink {
  private readonly target: string[];
  checkContent(text: string, element: Element) {
    if (!this.target.length) return true;
    let flag = false;
    this.target.forEach(target => {
      if (!flag) {
        const pos = text.indexOf(target);
        if (pos >= 0) {
          this.range!.setStart(element, pos);
          this.range!.setEnd(element, pos + target.length);
          flag = true;
        }
      }
    });
    return flag;
  }
  constructor(editor: McmodderUEditor[], text: string | string[], modifier: EditorAlertHTMLModifier, target: string | string[]) {
    super(editor, text, modifier);
    if (target instanceof Array) this.target = target;
    else this.target = [target];
  }
}

class EditorAlertRegLink extends EditorAlertContextLink {
  private readonly regExp: RegExp;
  checkContent(text: string, element: Element) {
    const regSearch = text.search(this.regExp);
    const regMatchList = text.match(this.regExp);
    const regMatch = regMatchList ? regMatchList[0] : undefined;
    if (regSearch && regMatch) {
      this.range!.setStart(element, regSearch);
      this.range!.setEnd(element, regSearch + regMatch.length);
      return true;
    }
    return false;
  }
  constructor(editor: McmodderUEditor[], text: string | string[], modifier: EditorAlertHTMLModifier, target: RegExp) {
    super(editor, text, modifier);
    this.regExp = target;
  }
}

class EditorAlertFormLink extends EditorAlertLink {
  private getForm: EditorAlertForm;
  run() {
    swal.close();
    const target = this.getForm().first();
    if (target.length) {
      McmodderUtils.highlight(target, "gold", 2e3, true);
      return true;
    }
    return false;
  }
  constructor(editor: McmodderUEditor[], text: string | string[], modifier: EditorAlertHTMLModifier, getForm: EditorAlertForm) {
    super(editor, text, modifier);
    this.getForm = getForm;
  }
}

export class EditorInit extends McmodderInit {
  modName = "";
  itemName = "";
  links: EditorAlertLink[] = [];
  
  canRun() {
    return false;
  }

  private getEditor() {
    return this.parent.ueditorFrame;
  }

  private init() {
    const langList = PublicLangData.editor.inform.list;
    this.links.push(
      new EditorAlertTextLink(this.getEditor(), langList.common_content_personal_pronoun, c => EditorAlertLink.replaceText(c, "您"), "您"),
      new EditorAlertTextLink(this.getEditor(), langList.common_content_personal_pronoun, c => EditorAlertLink.replaceText(c, "你"), "你"),
      new EditorAlertRegLink(this.getEditor(), langList.common_content_ban_title_duplicate, c => EditorAlertLink.replaceText(c, "大量空格"), /\s{5}/),
      new EditorAlertTextLink(this.getEditor(), langList.common_content_wrong_horizontal_rule, c => EditorAlertLink.replaceText(c, "大量横线"), ["-----", "=====", "~~~~~"]),
      new EditorAlertFormLink(this.getEditor(), [langList.common_name_empty, langList.common_name_repeat, langList.item_name_empty, langList.item_name_repeat], EditorAlertLink.appendButton, () => $("[data-multi-id=name]")),
      new EditorAlertFormLink(this.getEditor(), langList.common_ename_format, EditorAlertLink.appendButton, () => $("[data-multi-id=ename]")),
      new EditorAlertFormLink(this.getEditor(), langList.common_name_empty, EditorAlertLink.appendButton, () => $("[data-multi-id=name]")),
      new EditorAlertFormLink(this.getEditor(), [langList.common_link_empty, langList.common_link_blank, langList.common_link_nohttp, langList.common_link_no_statement, langList.common_link_remark_redund, langList.common_link_suffix_redund_common, langList.common_link_suffix_redund_cf, langList.common_link_suffix_redund_mr, langList.common_link_no_prefix, langList.common_link_wrong_prefix, langList.common_link_personal, langList.common_link_wrong_location, langList.common_link_source_address_missing], EditorAlertLink.appendButton, () => $("#link-frame")),
      new EditorAlertFormLink(this.getEditor(), langList.common_tag_wrong_spliter, EditorAlertLink.appendButton, () => $("#class-tags").prev()),
      new EditorAlertFormLink(this.getEditor(), langList.common_key_wrong_spliter, EditorAlertLink.appendButton, () => $("#class-keys").prev()),
      new EditorAlertFormLink(this.getEditor(), langList.common_cfid_format, EditorAlertLink.appendButton, () => $("#class-cfprojectid").prev()),
      new EditorAlertFormLink(this.getEditor(), langList.common_mrid_format, EditorAlertLink.appendButton, () => $("#class-mrprojectid").prev()),
      new EditorAlertFormLink(this.getEditor(), langList.common_author_empty, EditorAlertLink.appendButton, () => $("#author-frame")),
      new EditorAlertFormLink(this.getEditor(), langList.common_sname_limit, EditorAlertLink.appendButton, () => $("[data-multi-id=sname]")),
      new EditorAlertFormLink(this.getEditor(), [langList.class_category_empty, langList.modpack_category_empty], EditorAlertLink.appendButton, () => $(".common-class-category").parent()),
      new EditorAlertFormLink(this.getEditor(), langList.class_cover_empty, EditorAlertLink.appendButton, () => $("#cover-select-label").parent()),
      new EditorAlertFormLink(this.getEditor(), langList.class_platform_api_empty, EditorAlertLink.appendButton, () => $("#class-data-platform-1").parent().parent()),
      new EditorAlertFormLink(this.getEditor(), langList.class_mcver_empty, EditorAlertLink.appendButton, () => $("#mcversion-frame")),
      new EditorAlertFormLink(this.getEditor(), [langList.class_modid_empty, langList.class_modid_wrong_spliter], EditorAlertLink.appendButton, () => $("#class-modid").prev()),
      new EditorAlertFormLink(this.getEditor(), langList.class_relation_version_duplicate, EditorAlertLink.appendButton, () => $("#relation-frame")),
      new EditorAlertFormLink(this.getEditor(), langList.version_name_empty, EditorAlertLink.appendButton, () => $("[data-multi-id=name]")),
      new EditorAlertFormLink(this.getEditor(), langList.version_updatetime_empty, EditorAlertLink.appendButton, () => $("#class-version-updatetime-year").parent().parent()),
      new EditorAlertFormLink(this.getEditor(), langList.version_mcversion_empty, EditorAlertLink.appendButton, () => $("[data-multi-id=mcversion]")),
      new EditorAlertFormLink(this.getEditor(), langList.item_category_empty, EditorAlertLink.appendButton, () => $(".common-item-mold-list")),
      new EditorAlertFormLink(this.getEditor(), langList.item_type_empty, EditorAlertLink.appendButton, () => $("#item-type-frame")),
      // new EditorAlertTextLink(this.getEditor(), [], () => {

      // }, )
    )
  }

  private runLatex() {
    // let mathjax_config = document.createElement("script");
    // mathjax_config.id = "mcmodder-mathjax-config";
    // mathjax_config.innerHTML = "\
    //   MathJax = {\
    //   tex: {\
    //     inlineMath: [['$', '$'], ['\\(', '\\)']]\
    //   },\
    //   svg: {\
    //     fontCache: 'global'\
    //   }\
    // };";
    // editorDoc.head.appendChild(mathjax_config);
    // let mathjax_src = document.createElement("script");
    // mathjax_src.id = "mcmodder-mathjax";
    // mathjax_src.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-svg.js";
    // editorDoc.head.appendChild(mathjax_src);
    // let html2canvas_src = document.createElement("script");
    // html2canvas_src.id = "mcmodder-canvg";
    // html2canvas_src.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js";
    // editorDoc.head.appendChild(html2canvas_src);
    // setTimeout(function () {
    //   $($(".edui-editor-toolbarboxinner").get(0).appendChild(document.createElement("button"))).attr("class", "btn btn-outline-dark btn-sm").html("转化为 LaTeX").click(function () {
    //     let w = $("#ueditor_0").get(0).contentWindow;
    //     w.MathJax.typeset();
    //     $("mjx-container", w.document).each(function () {
    //       w.html2canvas(this).then(canvas => {
    //         const img = w.document.createElement("img");
    //         img.src = canvas.toDataURL("image/png");
    //         w.document.body.appendChild(img);
    //       })
    //     })
    //   });
    // }, 2e3);
  }

  private readonly autoLinkObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if (mutation.type === "childList" && 
      (mutation?.addedNodes[0] as HTMLElement)?.className === "swal2-container swal2-center swal2-fade swal2-shown" && 
      $("h2#swal2-title").text() === PublicLangData.editor.template.title) {
        // McmodderTemplate.init();
        this.parent.ueditorFrame.forEach(e => {
          if (e instanceof McmodderAdvancedUEditor) e.template.init();
        });
      }
    }
  });

  private readonly swalObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      if (!(mutation.addedNodes[0] as HTMLElement)?.className?.includes("swal2")) continue;
      let st = $(".swal2-title").text();
      if (st === PublicLangData.editor.success.title) {
        if (this.parent.utils.getConfig("autoCloseSwal")) {
          swal.close();
          McmodderUtils.commonMsg("提交成功，请等待管理员审核~");
        }
        else {
          $(".swal2-success-circular-line-left, .swal2-success-circular-line-right, .swal2-success-fix").css("background-color", "transparent");
        }
      }
      else if (st.includes("确认")) {
        $(".edit-dataverify-frame .error li, .edit-dataverify-frame .warning li, .edit-dataverify-frame .info li")
        .each((_i, c) => {
          const warningContent = $(c).text();
          this.links.filter(link => link.check(warningContent)).forEach(link => {
            link.modifier(c as HTMLElement);
            $(c).find("a:not(.mcmodder-editor-link)")
            .addClass("badge mcmodder-editor-link")
            .click(_e => link.run());
          });
          if (/*/正文介绍中含有疑似.+的/.test(warningContent)*/true) {
            $(c).find("b").each((_, b) => {
              b.textContent.split(", ").forEach(text => {
                const link = new EditorAlertTextLink(this.getEditor(), [], c => EditorAlertLink.replaceText(c, text), text);
                link.modifier(c as HTMLElement);
                $(c).find("a:not(.mcmodder-editor-link)")
                .addClass("badge mcmodder-editor-link")
                .click(_e => link.run());
              });
            });
          }
        });

        if (this.parent.utils.getConfig("noSubmitWarningDelay") && $(".edit-dataverify-frame .warning li").length) {
          McmodderUtils.commonMsg("您已启用“取消提交警告延时”，请检查编辑内容无误后再提交！", false, "警告");
          $(".swal2-confirm").removeAttr("disabled");
        }
      }
    }
  });

  run() {
    // new McmodderAdvancedUEditor(document.getElementsByTagName("IFRAME").item(0));

    this.init();
    let commonNav = $(".common-nav > ul");
    if (commonNav && commonNav.children().length > 4) {
      commonNav = commonNav.first();
      this.modName = commonNav.children().eq(4).text().replace("]", "] ");
      if (commonNav.children().eq(8).length) this.itemName = commonNav.children().eq(8).text();
    }
    McmodderUtils.addStyle(".swal2-show {animation: unset; -webkit-animation: unset;}");

    // McmodderTemplate ...

    this.autoLinkObserver.observe(document.body, { childList: true });

    if ($(".edit-tools").length) {

      if ($(".edit-user-alert.locked").length) {
        // 改动说明提前
        const desc = $(".col-lg-12.left .common-rowlist-block:last-child() .text p:last-child()").text();
        $("<p>").text("改动说明: " + desc).appendTo(".edit-user-alert");

        // 预提交
        if (this.parent.utils.getConfig("preSubmitCheckInterval") >= 0.1) {
          let strEditTypeName;
          if (strEditType === "author") strEditTypeName = $("#author-team").prop("checked") ? PublicLangData[strEditType].alter.team : PublicLangData[strEditType].alter.single;
          else strEditTypeName = PublicLangData[strEditType].alter;
          let submitButton = $(`
          <div class="text">
            <b>[预编辑] 改动附言:</b>
            <textarea class="form-control" placeholder="改动附言.." id="mcmodder-presubmit-remark"></textarea>
            <p>请填写改动附言，用于给审核留下信息，只有审核员会看到。</p>
            <hr>
            <b>[预编辑] 改动说明:</b>
            <textarea class="form-control" placeholder="改动说明.." id="mcmodder-presubmit-reason"></textarea>
            <p>
              请填写大致修改了哪些地方，会在
              <a target="_blank" href="/class/diff/list/2.html">改动对比</a>
              中显示，所有人都能看到。
            </p>
            <hr>
          </div>
          <input type="button" id="edit-submit-button" class="btn btn-primary mcmodder-content-block mcmodder-presubmit" edit-id="" redo-id="" data-type="${strEditType}_edit" value="预${strEditTypeName}">
        `);
          $(".common-rowlist-block").last().append(submitButton);
          $(document).on("click", ".mcmodder-presubmit", _e => {
            let popup = $(".swal2-popup");
            popup.find("#swal2-title").html(popup.find("#swal2-title").html().replace("编辑", "预编辑"));
            popup.find(".edit-dataverify-frame").after('<span class="mcmodder-slim-dark">预编辑内容将会被临时保存在本地，直到该用户的待审项被处理之后才会正式提交。已保存的预编辑项可在“审核列表 -> 只显示我提交的”看到，暂不支持重新修改，请知悉。');
            (popup.find(".swal2-confirm").get(0) as HTMLButtonElement).onclick = null;
            popup.find(".swal2-confirm").click(() => {
              // if (error.length > 0) return;
              const editorData = getEditorData(false);
              editorData["edit-id"] ||= McmodderUtils.abstractLastFromURL(window.location.href, "edit");
              editorData["redo-id"] ||= 0;
              const remark = $("#mcmodder-presubmit-remark").val().trim();
              const reason = $("#mcmodder-presubmit-reason").val().trim();
              if (remark) editorData[strEditType + "-data"].remark = remark;
              if (reason) editorData[strEditType + "-data"].reason = reason;
              const config = {
                url: "https://" + strEventUrl + "/action/edit/doEdit/",
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Origin": "https://www.mcmod.cn",
                  "Referer": "https://www.mcmod.cn/",
                  "Priority": "u=0",
                  "Sec-Fetch-Dest": "empty",
                  "Sec-Fetch-Mode": "cors",
                  "Sec-Fetch-Site": "same-site"
                }
                // data: $.param({ data: editorData })
              };
              const timeStr = $(".locked").text().match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/);
              if (!timeStr) {
                McmodderUtils.commonMsg("待审项提交时间获取失败...", false);
                return;
              }
              let preSubmitEntry: PreSubmitData | null = {
                id: McmodderUtils.randStr(8),
                title: this.parent.title,
                lastSubmitTime: (new Date(timeStr[0])).getTime(),
                createTime: Date.now(),
                url: window.location.href,
                rawData: editorData,
                config: config
              };
              const preSubmitList = this.parent.utils.getProfile("preSubmitList") || [];
              for (const i in preSubmitList) {
                if (preSubmitEntry && preSubmitEntry.url === preSubmitList[i].url) {
                  preSubmitList[i] = Object.assign({}, preSubmitEntry);
                  preSubmitEntry = null;
                }
              }
              if (preSubmitEntry) preSubmitList.push(preSubmitEntry);
              this.parent.utils.setProfile("preSubmitList", preSubmitList);
              McmodderUtils.commonMsg(`预编辑内容${ preSubmitEntry ? "保存" : "替换" }成功，将会在正式提交时提醒~`);
              swal.close();
            })
          });
        }
      }

      // 其他一堆并进 McmodderAdvancedUEditor 的小玩意儿

      // LaTeX 编辑器
      if (this.parent.utils.getConfig("latexEditor")) {
        this.runLatex();
      }
    }

    this.swalObserver.observe(document.body, { childList: true });
  }
}