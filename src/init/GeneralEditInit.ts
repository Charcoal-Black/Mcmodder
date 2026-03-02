import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class GeneralEditInit extends McmodderInit {
  canRun() {
    return false;
  }

  run() {
    // Mac 支持
    /* if (this.isMac) {
      let t = $(".edit-tools");
      t.find(".save a").contents().last().get(0).data = "⌘S";
      t.find(".new a").contents().last().get(0).data = "⌘⇧S";
      t.find(".load a").contents().last().get(0).data = "⌘O";
      t = $(".left .text").get(0);
      t.innerHTML = t.innerHTML.replace("Alt + X", "⌥X").replace("Ctrl + Enter", "⌘⏎");
    } */
    let leftText = $(".left .text").get(0);
    leftText.innerHTML = leftText.innerHTML
      .replace("Alt + X", McmodderUtils.key2Str(this.parent.utils.getConfig("keybindFastLink")))
      .replace("Ctrl + Enter", McmodderUtils.key2Str(this.parent.utils.getConfig("keybindFastSubmit")));

    // Bug修复：快速存档时当前菜单自动关闭
    if (this.parent.utils.getConfig("autoSaveFix")) {
      editAutoSaveLoop = function () {
        1 == nAutoSave ? $("#editor-frame").length > 0 && 0 == editor.getContent().trim().length ? nAutoSave = 60 : (editSave(), nAutoSave--) : nAutoSave > 0 && nAutoSave--, $("#edit-autosave-sec").text(nAutoSave), setTimeout(editAutoSaveLoop, 1e3)
      }
    }

    if (!this.parent.utils.isKeyMatchConfig("keybindFastSubmit", { ctrlKey: true, key: "Enter", keyCode: 13 }))
      bindFastSubmit = (e: MouseEvent) => { // @Override
        if (this.parent.utils.isKeyMatchConfig("keybindFastSubmit", e)) {
          e.preventDefault();
          $('#edit-submit-button').click();
          if (this.parent.utils.getConfig("fastSubmitFix")) e.stopPropagation(); // Bug修复：快速提交时编辑框意外换行
        }
        if ((!e.shiftKey) && McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 83 }, e)) {
          e.preventDefault();
          $('.edit-tools .save a').click();
        }
        if (McmodderUtils.isKeyMatch({ ctrlKey: true, shiftKey: true, keyCode: 83 }, e)) {
          e.preventDefault();
          $('.edit-tools .new a').click();
        }
      }

    // 改动附言与说明提示
    const b = $(".common-rowlist-block b");
    b.filter((_, c) => $(c).text() === "改动附言:").append('<span class="mcmodder-common-danger"> (仅用于给审核员留言)</span>');
    b.filter((_, c) => $(c).text() === "改动说明:").append('<span class="mcmodder-common-dark"> (所有人均可见)</span>');
    $("[data-multi-id=remark], [data-multi-id=reason]").hide().each((_, e) => {
      $(`<textarea id=${"mcmodder-textarea-" + $(e).attr("data-multi-id")} class="form-control" placeholder="${$(e).attr("placeholder")}"></textarea>`)
      .insertBefore($(e).parent())
      .val($(e).val())
      .bind("change", e => {
        $(e.target)
        .parent()
        .find(`[data-multi-id=${e.target.id.split("-").slice(-1)[0]}]`)
        .val($(e.target).val())
      });
    });
  }
}