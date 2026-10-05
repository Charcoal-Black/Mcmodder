import { buildAttitudeIcon, getAttitudeTitle } from "../../attitude/attitudeIcon";
import { CenterBaseInit } from "./CenterBaseInit";

/**
 * 个人中心「短评」子页（`center.mcmod.cn/<uid>/#/comment/`）的「我的表态取得统计」扩展。
 *
 * 只在本人页注入：在原生 12 项之后按数量降序追加自定义表态（恶魔安格瑞 + 各 emoji）的
 * 取得次数，文案严格复刻站点格式 `被评“XX”: N次`，仅渲染 `count > 0` 的类型。
 *
 * 该页是 hash 路由 SPA，每次进入都会重渲染面板：注入前先查自绘标记、注入时先清旧项，保证幂等。
 */
export class CenterCommentInit extends CenterBaseInit {
  private fetching = false;

  async run() {
    if (this.fetching) return;
    if (!this.configs.getSettings("customAttitude")) return;
    if (!this.parent.supabaseUtils.hasClient()) return;
    if (!this.center.isMyPage()) return;
    if (!$(".center-main.attitude .center-content.attitude-list > ul").length) return;
    if ($(".center-main.attitude .mcmodder-attitude-stat").length) return;

    const authKey = this.configs.getProfile("auth_key");
    if (!authKey) return;

    this.fetching = true;
    try {
      const resp = await this.parent.supabaseUtils.fetchAttitudeInbox(authKey, "stats");
      if (!resp) return;
      const entries = Object.entries(resp.received ?? {})
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a);
      if (entries.length === 0) return;

      // 贴纸没有文本形态，先解析出原始文件名再写文案（失败时退回统一称呼）
      const attitudeSystem = this.parent.attitudeSystem;
      const stickers = await attitudeSystem.resolveStickers(
        entries.map(([attitudeType]) => attitudeType),
      );

      // 异步期间面板可能已被重渲染，重新定位并清掉可能存在的旧项
      const $list = $(".center-main.attitude .center-content.attitude-list > ul").first();
      if (!$list.length) return;
      $list.children(".mcmodder-attitude-stat").remove();
      entries.forEach(([attitudeType, count]) => {
        const title = getAttitudeTitle(attitudeType, stickers.get(attitudeType)?.name);
        $('<li class="mcmodder-attitude-stat"></li>')
          .append(buildAttitudeIcon(attitudeType).attr("data-mcmodder-attitude", attitudeType))
          .append(document.createTextNode(`被评“${title}”: ${count.toLocaleString("en-US")}次`))
          .appendTo($list);
      });
      // 贴纸图标先占位，再补上图片
      void attitudeSystem.hydrateStickers($list);
    } finally {
      this.fetching = false;
    }
  }
}
