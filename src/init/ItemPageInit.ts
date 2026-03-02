import { McmodderUtils } from "../Utils";
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
    $("span.name > h5").each((i, _c) => { // 快速复制主/次要名称
      const c = $(_c);
      let s = c.text();
      if (!i) {
        const l = $("meta[name=keywords]").attr("content").split(",");
        const t = `</a><span class="item-h5-ename">${
          this.parent.utils.getConfig("mcmodderUI") ?
          `<a>${ l[1] }</a>` :
          `(<a>${ l[1] }</a>)`
        }</span>`;
        if (l[1]) s = ("<a>" + s).replace(` (${ l[1] })`, t);
        else s = `<a>${ s }</a>`;
      } else {
        const l = $(".item-skip-list a").eq(i).text();
        if (l === s) s = `<a>${ s }</a>`;
        else {
          s = s + "//end";
          let n = s.replace(l + " (", "").replace(")//end", "");
          s = `<a>${ l }</a><span class="item-h5-ename">${
            this.parent.utils.getConfig("mcmodderUI") ?
            `<a>${ n }</a>` :
            `(<a>${ n }</a>)`
          }</span>`;
        }
      }
      c.html(s);
      if (this.parent.utils.getConfig("fastCopyName")) {
        McmodderUtils.addClickCopyEvent(c.find("a"), "物品");
      }
    });

    // 矿物词典
    if (this.parent.utils.getConfig("mcmodderUI")) $(".item-dict").each((_, c) => {
      if ($(c).contents().length) {
        const od = $(c).text().slice(6).split(",\u00a0");
        $(c).html("[矿物词典/物品标签] ");
        od.forEach(e => $(`<a href="/oredict/${e.split(" (")[0]}-1.html" target="_blank">${e}</a>`).appendTo(c));
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

    if (this.parent.utils.getConfig("linkCheck")) {
      const linkMap: Map<string, string> = new Map;
      const warnList: string[] = [];
      let clashFlag = false;
      let fandomFlag = false;
      $('.item-content > *:not(.item-data) a:not([href="javascript:void(0);"])')
      .filter((_, c) => !!(c.textContent && (c.parentNode as Element)?.tagName != "LEGEND"))
      .each((_, a) => {
        const key = a.textContent, value = (a as HTMLLinkElement).href.replace("https://www.mcmod.cn", "");
        if (this.parent.utils.getConfig("linkMark")) $(a).after(`<code class="mcmodder-link-check">${value}</code>`);
        if (!linkMap.has(key)) linkMap.set(key, value);
        else if (linkMap.get(key) != value) warnList.push(key);
      })
      .each((_, a) => {
        if (warnList.includes(a.textContent)) {
          a.classList.add("mcmodder-link-warn");
          clashFlag = true;
        } else if ((a as HTMLLinkElement).href.includes("minecraft.fandom.com")) {
          a.classList.add("mcmodder-link-warn");
          fandomFlag = true;
        }
      });
      if (clashFlag) McmodderUtils.commonMsg("发现疑似的链接冲突问题，请检查~", false);
      if (fandomFlag) McmodderUtils.commonMsg("发现 Minecraft Wiki Fandom 链接，请将其及时更新至 zh.minecraft.wiki ~", false);
    }

    $(".figure img").bind("load", e => { // 本地化检测
      const img = $(e.currentTarget);
      if (!img.prop("src").includes("mcmod.cn")) {
        img.parent()
        .append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>')
        .css("border", "10px solid red");
      }
    });

    new ItemTabInit(this.parent).run();
  }
}