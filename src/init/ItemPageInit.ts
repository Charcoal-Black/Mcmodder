import { McmodderUtils } from "../Utils";
import { McmodderMainText } from "../widget/MainText";
import { McmodderInit } from "./Init";
import { ItemTabInit } from "./ItemTabInit";

export class ItemPageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/item/") && 
      this.parent.href.includes(".html") && 
      !this.parent.href.includes("/diff/") && 
      !this.parent.href.includes("/list/")
  }

  run() {
    const itemTexts = $(".item-text");
    const isSingle = itemTexts.length === 1;
    const isGeneral = !isSingle && !itemTexts.first().children(".item-give").length;
    $("span.name > h5").each((i, _c) => { // 快速复制主/次要名称
      const c = $(_c);
      let s = McmodderUtils.escapeHTML(c.text());
      const skipLinkList = $(".item-skip-list ul a");
      if ((!i && isGeneral) || isSingle) {
        const l = $("meta[name=keywords]").attr("content").split(",");
        const ename = McmodderUtils.escapeHTML(l[1]);
        const t = `</a>${ this.renderEname(ename) }`;
        if (ename) s = ("<a>" + s).replace(` (${ ename })`, t);
        else s = `<a>${ s }</a>`;
      }
      else if (skipLinkList.length) {
        const l = McmodderUtils.escapeHTML(skipLinkList.eq(isGeneral ? i - 1 : i).text());
        if (l === s) s = `<a>${ s }</a>`;
        else {
          const ename = s.replace(l + " (", "").replace(/\)$/, "");
          s = `<a>${ l }</a>${ this.renderEname(ename) }`;
        }
      }
      else { // 极端情况，例如：综合资料只有 1 个子资料，此时主/次要名称拆分方式不一定准确
        const { name, englishName } = McmodderUtils.parseItemFullName(s);
        s = `<a>${ name }</a>${ this.renderEname(englishName) }`;
      }
      c.html(s);
      if (this.parent.utils.getConfig("fastCopyName")) {
        McmodderUtils.addClickCopyEvent(c.find("a"), "物品名称");
      }
    });

    // 矿物词典
    if (this.parent.utils.getConfig("mcmodderUI")) $(".item-dict").each((_, c) => {
      if ($(c).contents().length) {
        const od = $(c).text().slice(6).split(",\u00a0");
        $(c).html("[矿物词典/物品标签] ");
        od.forEach(e => $(`<a href="${
          McmodderUtils.getOredictURL(e.split(" (")[0])
        }" target="_blank">${
          e
        }</a>`).appendTo(c));
      }
    })

    $(".maintext .table").filter((_, c) => $(c).css("width") === "100%").css("width", "unset");
    const autoFoldTable = this.parent.utils.getConfig("autoFoldTable");
    if (autoFoldTable) {
      $(".table.table-bordered.text-nowrap tbody")
      .filter((_, c) => $(c).children().length >= autoFoldTable)
      .find("tr:first-child() th:last-child()")
      .append(' [<a class="collapsetoggle">隐藏</a>]')
      .find(".collapsetoggle")
      .click(e => {
        const button = $(e.currentTarget)
        const container = button.parent().parent().parent();
        const target = container.find("tr:not(tr:first-child())");
        if (button.text() === "显示") {
          target.show();
          button.text("隐藏")
        } else {
          target.hide();
          button.text("显示");
        }
      })
      .trigger("click");
    }

    const isCompactable = $("div.item-skip-list").length && $("div.item-content").length < 2;
    if (!isCompactable) $(".item-data").each((_, _c) => {
      const c = $(_c);
      c.insertBefore(c.parent().find(".item-content").children().first());
      let n = c.parents(".item-text").find(".name h5 > a").text();
      $(`<th colspan="2" align="center">${n}</th>`).insertBefore(c.find("tbody").children().first());
      c.parent().find("i").filter((_, e) => e.textContent === "暂无简介，欢迎协助完善。").parent().css({
        "float": "unset",
        "display": "block"
      });
    });

    // 根据ID快速跳转
    const h = $("span.name > h5").parent().get(0);
    if (this.parent.utils.getConfig("mcmodderUI") && h) {
      const s = $('<span class="small badge-row mcmodder-item-flip">').appendTo(h);
      const isTabPage = this.parent.href.includes("/tab/") ? "tab/" : "";
      const itemId = parseInt(this.parent.href.split("item/" + isTabPage)[1]);
      if (itemId > 1) s.append(`<a href="/item/${ isTabPage }${ itemId - 1 }.html" class="text-danger"><i class="fas fa-arrow-left" />${ itemId - 1 }</a>`);
      s.append(`<a href="/item/${ isTabPage + (itemId + 1) }.html" class="text-success">${itemId + 1}<i class="fas fa-arrow-right" /></a>`);
    }

    if (isCompactable && this.parent.utils.getConfig("compactedChild")) { // 综合子资料紧凑化
      McmodderUtils.addStyle("table.table-bordered.righttable td {padding: 0rem;}");
      $(".col-lg-12.right > hr").remove();
      $("table.table-bordered.righttable").each((_, e) => {
        const target = $(e);
        target.find("tr").first().remove();
        const mainTr = target.find("tr:first-child()");
        target.find("tr:not(tr:first-child())").each((_, tr) => {
          mainTr.append(tr.innerHTML);
          tr.remove();
        })
        target.find("img").first().hide();
        $('<a class="mcmodder-largeicon-control">轻触展开大图标</a>')
        .appendTo(target.find("img").first().parent())
        .click(e => {
          const target = $(e.currentTarget);
          const largeIcon = target.parent().find("img").first();
          if (McmodderUtils.isNodeHidden(largeIcon)) {
            target.html("轻触收起大图标");
            largeIcon.show();
          } else {
            target.html("轻触展开大图标");
            largeIcon.hide();
          }
        });
        target.parents(".item-row").find(".common-fuc-group").hide();
        target.parents(".maintext").find(".item-text .item-info-table").hide();
      })
    }

    $(".item-content").each((_, e) => {
      new McmodderMainText(this.parent, e);
    });

    new ItemTabInit(this.parent).run();
  }

  private renderEname(ename: string) {
    return `<span class="item-h5-ename">${
      this.parent.utils.getConfig("mcmodderUI") ?
      `<a>${ ename }</a>` :
      `(<a>${ ename }</a>)`
    }</span>`;
  }
}