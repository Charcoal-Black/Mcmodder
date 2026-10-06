import { buildAttitudeIcon, getAttitudeTitle } from "../../attitude/attitudeIcon";
import { CenterBaseInit } from "./CenterBaseInit";

/**
 * 个人中心「短评」子页（`center.mcmod.cn/<uid>/#/comment/`）的「表态取得统计」扩展：
 * 在原生 12 项之后按数量降序追加自定义表态的取得次数。自己与别人的主页都按该页 uid 读公开聚合计数。
 *
 * 该页是 hash 路由 SPA，面板每次进入都会重渲染，注入逻辑要做幂等。
 */
export class CenterCommentInit extends CenterBaseInit {
  private fetching = false;

  async run() {
    if (this.fetching) return;
    if (!this.configs.getSettings("customAttitude")) return;
    if (!this.parent.supabaseUtils.hasClient()) return;
    const uid = this.center.getPageUID();
    if (!(uid > 0)) return;
    if (!$(".center-main.attitude .center-content.attitude-list > ul").length) return;
    if ($(".center-main.attitude .mcmodder-attitude-stat").length) return;

    this.fetching = true;
    try {
      const rows = await this.parent.supabaseUtils.fetchAttitudeUserCounts(uid, (error) =>
        console.warn("[Mcmodder] 表态取得统计获取失败：", error),
      );
      if (!rows) return;
      // 服务端按「各类别首次获得表态的时间序」返回行，这里保持该顺序追加展示
      const entries = rows
        .filter((row) => row.total > 0)
        .map((row) => [row.attitude_type, row.total] as const);
      if (entries.length === 0) return;

      // 贴纸先解析出原始文件名再写文案
      const attitudeSystem = this.parent.attitudeSystem;
      const stickers = await attitudeSystem.resolveStickers(
        entries.map(([attitudeType]) => attitudeType),
      );

      // 异步期间面板可能已重渲染，重新定位并清掉旧项
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
      void attitudeSystem.hydrateStickers($list);
    } finally {
      this.fetching = false;
    }
  }
}
