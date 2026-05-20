import { GM_setValue } from "$";
import { McmodderAlmanacs } from "../widget/Almanacs";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class HomePageInit extends McmodderInit {
  canRun() {
    return this.parent.href === `${ this.parent.hostname }/`;
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
  }
}