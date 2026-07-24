import { GM_setValue } from "$";
import { McmodderAlmanacs } from "../widget/Almanacs";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";
import { RecentlyVisitedData } from "../types";

export class HomePageInit extends McmodderInit {
  canRun() {
    return this.parent.href === `${ this.parent.hostname }/` ||
      this.parent.href === `${ this.parent.hostname }/v4/`;
  }
  run() {
    // v3 QQ快捷登录
    $(`<a class="qq">
      <img alt="QQ登录" src="${ this.parent.hostname }/plugs/loginConnect/qqConnect/img/Connect_logo_7.png">
    </a>`)
    .appendTo(".login")
    .click(() => McmodderUtils.toQzoneLogin());

    // 函数覆写以兼容夜间模式
    if (typeof SearchOn != "undefined") SearchOn = () => {
      '搜索MOD/资料/教程..' == $('.search_box #key').val().trim() && (
        $('.search_box #key').val(''),
        $('.search_box #key').css('color', 'var(--mcmodder-color-text)')
      ),
      '搜索MOD/资料/教程..' == $('.m_center ._search .text').val().trim() && (
        $('.m_center ._search .text').val(''),
        $('.m_center ._search .text').css('color', 'var(--mcmodder-color-text)')
      )
    }

    if (this.parent.utils.getConfig("almanacs")) {
      // 数据迁移
      let almanacsList = this.parent.utils.getConfig("almanacsList");
      if (almanacsList) {
        GM_setValue("almanacsList", almanacsList);
        this.parent.utils.setConfig("almanacsList", "");
      }

      const almanacs = new McmodderAlmanacs(this.parent);
      almanacs.get(McmodderUtils.getStartTime(new Date(), 0));
      almanacs.getInstance().insertAfter($(".news_block").first());
    }

    if (this.parent.utils.getConfig("rememberVisitedMods")) {
      this.initRecentlyVisitedMods();
    }
  }

  private initRecentlyVisitedMods() {
    const v4 = this.parent.isV4;
    const recentlyVisitedMods = (this.parent.utils.getConfig("recentlyVisitedMods") as RecentlyVisitedData[]).reverse();
    const maxPage = Math.ceil(recentlyVisitedMods.length / 10);
    if (maxPage === 0) return;
    let page = 0;
    let loaded = false;
    const container = $(v4 ? ".recent-block" : ".news_block .left");
    const textContainer = container.find(v4 ? "> .recent-buttons > ul" : ".text");
    const contentContainer = v4 ? container.children(".recent-chunks") : container;
    const buttonContainer = v4 ? textContainer.parent() : textContainer;
    const hoverNode = container.find(v4 ? "" : "> .hover");
    const titleNode = $(
      v4 ?
      `<li data-id="recent"><a href="javascript:void(0);">最近浏览</a></li>` :
      `<li title="最近浏览的MOD" i="recent">最近浏览</li>`
    ).insertAfter(textContainer.children("[i=edit], [data-id=updated]"));
    const moreNode = $(
      v4 ?
      `<a class="recent-refresh" href="javascript:void(0);"><i class="fa fa-refresh"></i>换一换</a>` :
      `<a id="recent_more" title="查看更多最近浏览的MOD">更多 &gt;</a>`
    ).hide().insertAfter(buttonContainer.children("#edit_more, .refresh"));
    const contentNode = $(
      v4 ?
      `<div class="recent-list" data-id="recent">` :
      `<div id="indexNew_recent" class="blcok_frame">`
    ).hide().appendTo(contentContainer);
    titleNode.click(e => {
      const target = $(e.currentTarget);
      const activeClass = v4 ? "active" : "on";
      if (!target.hasClass(activeClass)) {
        textContainer.find("li").removeClass(activeClass);
        target.addClass(activeClass);
        setTimeout(() => {
          contentContainer.children(".recent-list, .blcok_frame").hide();
          contentNode.fadeIn(100);
          hoverNode.stop().animate({ left: 222 }); // 0 -> 73 -> 148 -> 222
          buttonContainer.children("a").hide();
          if (maxPage > 1) {
            moreNode.show();
          }
          if (!loaded) {
            this.renderRecentlyVisitedMods(contentNode, recentlyVisitedMods, 0);
            loaded = true;
          }
        }, 250);
      }
    });
    if (v4) {
      textContainer.find("li:not([data-id=recent]) > a").click(_e => {
        moreNode.hide();
      });
    }
    moreNode.click(_e => {
      page++;
      if (page >= maxPage) page = 0;
      this.renderRecentlyVisitedMods(contentNode, recentlyVisitedMods, page);
    });
  }

  private renderRecentlyVisitedMods(content: JQuery, list: RecentlyVisitedData[], page: number) {
    content.empty();
    const v4 = this.parent.isV4;
    const length = list.length;
    const maxItem = Math.min(length, (page + 1) * 10);
    for (let i = page * 10; i < maxItem; i++) {
      const { id, time } = list[i];
      const data = this.parent.utils.getAllClass(id);
      const link = McmodderUtils.getClassURL(id);
      const card = $(v4 ? '<div class="recent-item">' : '<div class="block">').appendTo(content);
      const block = v4 ? $('<div class="recent-card">').appendTo(card) : card;
      if (v4 && id === 1) {
        $('<span title="Mojang" class="mojang">').appendTo(block);
      }
      const cover = $(`<a href=${ link }>`);
      if (v4) {
        const coverContainer = $('<div class="cover">').appendTo(block);
        cover.appendTo(coverContainer);
      } else {
        cover.appendTo(block);
      }
      const now = Date.now();
      $(`<img class="img" src="${
        data.cover
      }" onerror="this.src='https://www.mcmod.cn/pages/class/images/none.jpg'">`).appendTo(cover);
      $(`
        <div class="${ v4 ? "content" : "info" }">
          <${ v4 ? "span" : "div" } class="${ v4 ? "primary" : "name" }">
            <a target="_blank" href="${ link }">${ data.name }</a>
          </${ v4 ? "span" : "div" }>
          <${ v4 ? "span" : "div" } class="${ v4 ? "secondary" : "info" }">
            <${ v4 ? "span" : "div" } title="最近浏览时间: ${
              McmodderUtils.getFormattedDateTime(new Date(time))
            }" class="time">
              <i${ v4 ? ' class="fa fa-clock-o"' : "" }></i>
              ${ McmodderUtils.getFormattedChineseTime(time - now) }
            </${ v4 ? "span" : "div" }>
          </${ v4 ? "span" : "div" }>
        </div>  
      `).appendTo(block);
    }
  }
}