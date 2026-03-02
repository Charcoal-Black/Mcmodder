import { GM_setValue } from "$";
import { McmodderAlmanacs } from "../widget/Almanacs";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class HomePageInit extends McmodderInit {
  canRun() {
    return this.parent.href === "https://www.mcmod.cn/";
  }
  run() {
    // 函数覆写以兼容夜间模式
    if (typeof SearchOn != "undefined") SearchOn = () => {
      '搜索MOD/资料/教程..' == $('.search_box #key').val().trim() && (
        $('.search_box #key').val(''),
        $('.search_box #key').css('color', 'var(--mcmodder-tx)')
      ),
      '搜索MOD/资料/教程..' == $('.m_center ._search .text').val().trim() && (
        $('.m_center ._search .text').val(''),
        $('.m_center ._search .text').css('color', 'var(--mcmodder-tx)')
      )
    }

    if (this.parent.utils.getConfig("almanacs")) {
      // 数据迁移
      let almanacsList = this.parent.utils.getConfig("almanacsList");
      if (almanacsList) {
        GM_setValue("almanacsList", almanacsList);
        this.parent.utils.setConfig("almanacsList", "");
      }

      $(".news_block").first().after(`
        <div class="news_block mcmodder-almanacs">
          <div class="title">
            <i></i>
            <a class="date" href="/tools/almanacs" target="_blank"></a>
            <div class="more"></div>
          </div>
          <div class="content">
            <div class="good"></div>
            <div class="bad"></div>
          </div>
        </div>`);

      const almanacs = new McmodderAlmanacs(this.parent);
      almanacs.get(McmodderUtils.getStartTime(new Date(), 0));
    }
  }
}