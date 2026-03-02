import { Mcmodder } from "./Mcmodder";
import { McmodderAdvancedUEditor } from "./ueditor/AdvancedUEditor";
import { McmodderUEditor } from "./ueditor/UEditor";
import { McmodderUtils } from "./Utils";
import { McmodderValues } from "./Values";
import { McmodderContextMenu } from "./widget/ContextMenu";

type McmodderTemplateData = {
  id: string;
  title: string;
  description: string;
  content: string;
}

export class McmodderTemplate {
  private parent: Mcmodder;
  private editor: McmodderUEditor;
  private list: McmodderTemplateData[];
  private newTitle: JQuery;
  private newDescription: JQuery;
  private currentContextMenu?: McmodderContextMenu;

  constructor(editor: McmodderAdvancedUEditor) {
    this.editor = editor;
    this.parent = this.editor.parent;

    // v1.x 旧版本遗留修复
    let legacyList = this.parent.utils.getConfig("templateList");
    if (legacyList) {
      this.parent.utils.setAllConfig("templateList", legacyList);
      this.parent.utils.deleteConfig("templateList");
    }

    // v2.0 去序列化修复
    legacyList = this.parent.utils.getAllConfig("templateList");
    if (typeof legacyList === "string") {
      this.parent.utils.setAllConfig("templateList", JSON.parse(legacyList));
    }

    // 初始化模板配置
    if (!this.parent.utils.getAllConfig("templateList", []).length) {
      this.parent.utils.setAllConfig("templateList", McmodderValues.defaultTemplateList);
    }

    this.list = this.parent.utils.getAllConfig("templateList", []);
    this.newTitle = this.newDescription = $();
  }

  init() {
    $(".group li").remove();
    const groupUl = $(".group ul");
    this.list.forEach(item => {
      const entry = $(`<li data-tag="${ item.id }">
        <p class="title">${ item.title }</p>
        <p class="text">${ item.description }</p>
      </li>`).appendTo(groupUl);
      if (!item.description) entry.find(".text").hide();
    });
    const groupLi = groupUl.find("li");
    groupUl.on("click", "li", e => {
      const menu = this.currentContextMenu;
      const isActive = menu?.isActive();
      if (!menu || !isActive) {
        this.load(e.currentTarget.getAttribute("data-tag"));
      }
      else if (menu && isActive) {
        menu.hide();
      }
    });
    // $(".group li a").click(e => this.delete((e.currentTarget.parentNode as HTMLElement)?.getAttribute("data-tag")));
    groupUl.prepend(`
      <li class="mcmodder-template-add">
        <input id="mcmodder-template-newtitle" class="form-control title" placeholder="新模板标题... (必填)">
        <input id="mcmodder-template-newdescription" class="form-control" placeholder="新模板介绍...">
        <button id="mcmodder-template-confirm" class="btn btn-sm btn-dark">新建模板</button>
      </li>`);
    $("#mcmodder-template-confirm").click(() => this.add());

    this.newTitle = $("#mcmodder-template-newtitle").hide();
    this.newDescription = $("#mcmodder-template-newdescription").hide();

    $('<input id="mcmodder-template-search" class="form-control" placeholder="搜索..">')
    .insertAfter(".common-template-frame .input-group")
    .bind("change", () => {
      let s: string[] = $(".common-template-frame .form-control").val().trim().split(" ");
      groupLi.each((_, c) => {
        let flag = false;
        if (!$(c).find("#mcmodder-template-add").length) s.forEach(d => {
          if (!c.textContent.includes(d)) flag = true;
        });
        flag ? $(c).hide() : $(c).show();
      });
    });

    this.currentContextMenu = new McmodderContextMenu(/* this.parent, */$(".group"))
    .addOption("modifyTitle", "修改标题", e => this.isValidSelection(e), e => this.onModifyTitle(e))
    .addOption("modifyDescription", "修改简介", e => this.isValidSelection(e), e => this.onModifyDescription(e))
    .addOption("updateContent", "更新为当前编辑器内容", e => this.isValidSelection(e), e => this.onUpdateContent(e))
    .addOption("delete", `<span class="mcmodder-slim-danger">删除</span>`, e => this.isValidSelection(e), e => this.delete(this.getCurrentSelection(e).attr("data-tag")));
  }

  private getCurrentSelection(e: JQueryMouseEventObject) {
    const target = $(e.target);
    if (target.prop("tagName") === "LI") return target; 
    return target.parents(".group li");
  }

  private isValidSelection(e: JQueryMouseEventObject) {
    return !this.getCurrentSelection(e).hasClass("mcmodder-template-add");
  }

  private syncTemplateConfig() {
    this.parent.utils.setAllConfig("templateList", this.list);
  }

  private add() {
    if (this.newTitle.val()) {
      this.list.push({
        id: McmodderUtils.randStr(),
        title: this.newTitle.val(),
        description: this.newDescription.val(),
        content: this.editor.editor.getContent()
      });
      this.syncTemplateConfig();
      this.editor.$outerFrame?.find(".edui-for-mctemplate .edui-button-body").click();
    }
    else {
      this.newTitle.show();
      this.newDescription.show();
    }
  }

  private onModifyTitle(e: JQueryMouseEventObject) {
    const selection = this.getCurrentSelection(e);
    const data = this.list.filter(e => e.id === selection.attr("data-tag"))[0];
    const title = selection.find(".title").first();
    const input = $(`<input id="mcmodder-template-title" class="form-control title" placeholder="新模板标题... (必填)">`)
    .val(data.title)
    .blur(_e => {
      const newTitle = input.val().trim();
      data.title = newTitle;
      input.replaceWith($(`<p class="title">`).text(newTitle));
      this.syncTemplateConfig();
    })
    .click(e => {
      e.stopPropagation();
    })
    .keyup(e => {
      if (e.key === "Enter") input.blur();
    });
    title.replaceWith(input);
    input.focus();
  }

  private onModifyDescription(e: JQueryMouseEventObject) {
    const selection = this.getCurrentSelection(e);
    const data = this.list.filter(e => e.id === selection.attr("data-tag"))[0];
    const text = selection.find("p.text").first();
    const input = $(`<input id="mcmodder-template-description" class="form-control" placeholder="新模板介绍...">`)
    .val(data.description)
    .blur(_e => {
      const newDescription = input.val().trim();
      data.description = newDescription;
      const textNode = $(`<p class="text">`).text(newDescription);
      if (!newDescription) textNode.hide();
      input.replaceWith(textNode);
      this.syncTemplateConfig();
    })
    .click(e => {
      e.stopPropagation();
    })
    .keyup(e => {
      if (e.key === "Enter") input.blur();
    });
    text.replaceWith(input);
    input.focus();
  }

  private onUpdateContent(e: JQueryMouseEventObject) {
    const selection = this.getCurrentSelection(e);
    const data = this.list.filter(e => e.id === selection.attr("data-tag"))[0];
    data.content = this.editor.editor.getContent();
    McmodderUtils.commonMsg(`${ data.title } 内容已更新~`);
  }

  private delete(id: string | null) {
    this.list = this.list.filter(item => item.id != id);
    this.parent.utils.setAllConfig("templateList", this.list);
    this.editor.$outerFrame?.find(".edui-for-mctemplate .edui-button-body").click();
  }

  private load(id: string | null) {
    const matched = this.list.filter(item => id === item.id)[0];
    if (matched) {
      if ($(".common-template-frame .input-group input").prop("checked")) {
        this.editor.editor.execCommand("insertHtml", matched.content);
      } else {
        this.editor.editor.setContent(matched.content);
      }
      swal.close();
      this.editor.$body?.keyup();
    }
  }
}