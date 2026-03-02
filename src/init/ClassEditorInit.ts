import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";

export class ClassEditorInit extends McmodderInit {

  private originalModRelationList: Record<string, {
    id: number;
    type: number;
  }[]> = {};

  canRun() {
    return this.parent.href.includes("/class/edit/") ||
      this.isClassAddPage();
  }

  private isClassAddPage() {
    return this.parent.href.includes("/class/add/");
  }
  
  private hideUnavailableVersion() {
    let flag = false, flag2 = false;
    $("#mcversion-frame fieldset").each((_, _e) => {
      const e = $(_e);
      if (e.attr("mcmodder-huv")) return;
      e.attr("mcmodder-huv", "1");
      const loaderName = e.find("legend").text().split(":")[0];
      const loaderID = e.attr("id").split("-")[2];
      let h = $(), c = $();
      if (loaderID === "2") {
        c = $(`<a id="mcmodder-fabric-hidever" class="fold text-muted" style="display: block">
          <i class="fas fa-chevron-down" style="margin-right: 5px;"></i>
          展开仅 Legacy Fabric/Babric/Ornithe 等低版本移植加载器支持的版本
        </a>`)
        .insertAfter($("#class-data-mcversion-2-29").parent()).click(() => {
          if (McmodderUtils.isNodeHidden(h)) {
            h.show();
            c.html('<i class="fas fa-chevron-up" style="margin-right: 5px;"></i>折叠仅 Legacy Fabric/Babric/Ornithe 支持的版本');
          }
          else {
            h.hide();
            c.html('<i class="fas fa-chevron-down" style="margin-right: 5px;"></i>展开仅 Legacy Fabric/Babric/Ornithe 支持的版本');
          }
        });
        h = $('<div id="mcmodder-fabric-hiddenver"></div>').hide().insertAfter(c);
      }
      e.find(".checkbox").each((_, _f) => {
        const f = $(_f);
        let l = (McmodderValues.loaderSupportVersions as any)[loaderID], t = f.find("label").text();
        if (l && !(l.includes(t) || (l[0].includes(">=") && McmodderUtils.versionCompare(t, l[0].split(">=")[1]) > -1))) {
          if (loaderID != "2") {
            f.show();
            if (f.find("input").prop("checked")) {
              flag = true;
              f.find("label").removeClass("text-muted");
              f.addClass("mcmodder-slim-danger").attr({
                "data-toggle": "tooltip",
                "data-html": "true",
                "data-original-title": `${loaderName} 自身并不支持 ${t}！这可能由先前的编辑者疏忽所致，强烈建议取消勾选此版本。<br>如果你认为这个提示是错误的，请向 Mcmodder 作者反馈！`
              });
            }
            else f.hide();
          }
          else {
            f.appendTo(h);
            if (f.find("input").prop("checked")) flag2 = true;
          }
        }
      });
      if (flag2) c.click();
    });
    if (flag) McmodderUtils.commonMsg("支持的 MC 版本存疑，请检查~", false);
    this.parent.updateItemTooltip();
  }

  private sortModRelationList(relationGroup: JQuery) {
    const temp = $("<div>");
    const name = relationGroup.prev().find(".relation-version-value").text();
    this.originalModRelationList[name] = relationGroup.children().filter("[data-id]").toArray().map(_li => {
      const li = $(_li);
      const id = li.attr("data-id");
      const type = li.find(".selectpicker.relation-row-type").val();
      li.appendTo(temp);
      return {
        id: Number(id),
        type: Number(type)
      };
    });
    Array.from(this.originalModRelationList[name]).sort((a, b) => {
      if (a.type === b.type) return a.id - b.id;
      return a.type - b.type;
    })
    .forEach(data => {
      temp.find(`[data-id=${ data.id }]`).appendTo(relationGroup);
    });
    temp.remove();
  }

  private resetModRelationList(relationGroup: JQuery) {
    const temp = $("<div>");
    const name = relationGroup.prev().find(".relation-version-value").text();
    relationGroup.children().filter("[data-id]").appendTo(temp);
    const list = this.originalModRelationList[name];
    if (!list) {
      McmodderUtils.commonMsg("列表恢复失败，可能是因为关系组名称已经发生变化？", false);
      return;
    }
    list.forEach(data => {
      temp.find(`[data-id=${ data.id }]`).appendTo(relationGroup);
    })
    temp.remove();
    delete this.originalModRelationList[name];
  }

  run() {
    if (!this.isClassAddPage()) this.parent.editorLoad();
    setTimeout(() => {
      this.hideUnavailableVersion();
      $("#relation-frame .relation-version").each((_, _e) => {
        const e = $(_e);
        const last = e.children().last();
        $(`<i class="fa fa-sort-numeric-asc relation-version-sort-button">`)
        .insertBefore(last)
        .click(e => {
          const target = $(e.currentTarget);
          const relationGroup = $(e.currentTarget).parents("fieldset").find(".relation-group");
          if (target.hasClass("fa-sort-numeric-asc")) {
            this.sortModRelationList(relationGroup);
            target.removeClass("fa-sort-numeric-asc").addClass("fa-rotate-left");
          } else {
            this.resetModRelationList(relationGroup);
            target.addClass("fa-sort-numeric-asc").removeClass("fa-rotate-left");
          }
        });
      });
    }, 1e3);
    setTimeout(() => $(document).on("click", "input[data-multi-id=api]", () => this.hideUnavailableVersion()), 1e3);
  }
}