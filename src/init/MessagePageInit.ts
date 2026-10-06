import { AttitudeSystem } from "../attitude/AttitudeSystem";
import type { AttitudeRecord } from "../attitude/AttitudeSystem";
import { buildAttitudeIcon } from "../attitude/attitudeIcon";
import {
  buildAttitudeMessageItem,
  findAttitudeMessageTemplate,
  insertMessageItemByTime,
} from "../attitude/attitudeMessageItem";
import { Values } from "../Values";
import { Init } from "./Init";

/**
 * 消息中心的表态集成：子 tab 徽标与列表顶部合计行在任何消息中心页面都渲染；每条短评类消息显示该短评
 * 获得的自定义表态数量；「短评表态」与「全部」子页签额外注入自定义表态消息列表（克隆原生条目样式），
 * 并把本批未读记录回写为已读。
 *
 * 站点自身的列表渲染不被接管：`MutationObserver` 观察 `body` 做幂等增量注入。
 */
export class MessageInit extends Init {
  private readonly attitude = AttitudeSystem.for(this.parent);
  private readonly messageObserver = new MutationObserver(() => this.scheduleRefresh());
  private refreshTimer?: number;
  private inboxSignature = "";
  private inboxFetching = false;

  canRun() {
    // 站内链接既有 `/message/` 也有 `/message?category=...`，两种形态都要命中
    return /\/message\/?(?:[?#]|$)/.test(this.parent.href);
  }

  run() {
    if (this.configs.getSettings("lieqi")) {
      $(".content-comment-attitude > i").attr("class", "fas fa-surprise");
      $(".content-comment-attitude").each((_, c) => {
        $(c).contents().last().get(0).textContent = "猎奇";
      });
    }

    if (!this.attitude.enabled) return;
    // 列表由站点 AJAX 渲染、切子 tab 时整块重绘：观察 body 而非列表本身，节点被替换后仍能接上
    this.messageObserver.observe(document.body, { childList: true, subtree: true });
    $("#message-unread").on("change", () => {
      this.inboxSignature = "";
      this.scheduleRefresh();
    });
    this.scheduleRefresh();

    // 进消息中心即视为已看到提醒：页头红点归零
    void this.attitude.acknowledgeNew().then(() => this.parent.refreshBellNotify());
  }

  /** 站点列表的增删改合并到一次刷新（自身注入也会触发，靠签名去重） */
  private scheduleRefresh() {
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => void this.refresh(), 120);
  }

  private async refresh() {
    this.refreshTimer = undefined;
    // 合计与未读徽标不依赖子 tab
    await this.renderStats();
    if (!$(".message-list").length) return;
    await this.renderCommentCounts();
    if (this.isInboxTab()) await this.renderInbox();
  }

  /** 可注入表态消息条目的子页签：「全部」（不带 `type`）与「短评表态」 */
  private isInboxTab() {
    const type = new URLSearchParams(window.location.search).get("type");
    return !type || type === "attitude";
  }

  /** 每条短评类消息在尾部显示该短评获得的自定义表态数量 */
  private async renderCommentCounts() {
    const items: { $item: JQuery; commentId: string }[] = [];
    $(".message-list > ul > li").each((_, li) => {
      const $item = $(li);
      if ($item.hasClass("mcmodder-attitude-message")) return;
      const commentId = $item
        .find(".content-reply > a[href*='#comment-']")
        .first()
        .attr("href")
        ?.match(/#comment-(\d+)/)?.[1];
      if (commentId) items.push({ $item, commentId });
    });
    if (items.length === 0) return;

    const records = await this.attitude.requestCounts(items.map(({ commentId }) => commentId));
    items.forEach(({ $item, commentId }) => {
      const record = records.get(commentId);
      if (record) this.renderCountBadge($item, record);
    });
  }

  /** 写入数量标签；内容不变时不改 DOM（避免与 `MutationObserver` 形成循环） */
  private renderCountBadge($item: JQuery, record: AttitudeRecord) {
    const $ground = $item.find(".content-ground").first();
    if (!$ground.length) return;

    const entries = Object.entries(record.counts).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const detail = entries.map(([attitudeType, count]) => `${attitudeType}×${count}`).join(" ");
    const signature = `${detail}|${total}`;
    const $existing = $ground.children(".mcmodder-attitude-count");

    if (entries.length === 0) {
      $existing.remove();
      return;
    }
    if ($existing.attr("data-mcmodder-attitude-signature") === signature) return;
    $existing.remove();

    const $badge = $("<span></span>").attr({
      class: "mcmodder-attitude-count",
      title: detail,
      "data-mcmodder-attitude-signature": signature,
    });
    if (entries.length <= 2) {
      entries.forEach(([attitudeType, count], index) => {
        if (index > 0) $badge.append(document.createTextNode(" "));
        $badge.append(buildAttitudeIcon(attitudeType), document.createTextNode(String(count)));
      });
    } else {
      $badge.text(`自定义表态 ${total}`);
    }
    $ground.append($badge);
    void this.attitude.hydrateStickers($badge);
  }

  /** 「短评表态」子 tab：注入表态消息列表 */
  private async renderInbox() {
    if (this.inboxFetching) return;
    const authKey = this.attitude.getAuthKey();
    if (!authKey) {
      this.renderUnauthNotice();
      return;
    }

    const unreadOnly = $("#message-unread").prop("checked") ?? false;
    const signature = [
      unreadOnly,
      this.nativeItemCount(),
      $(".message-list > ul > li.mcmodder-attitude-message").length > 0,
      $(".message-list > .mcmodder-attitude-summary").length > 0,
    ].join("|");
    if (signature === this.inboxSignature) return;

    this.inboxFetching = true;
    try {
      const listResp = await this.parent.supabaseUtils.fetchAttitudeInbox(authKey, "list", {
        limit: Values.attitude.inboxPageSize,
        unreadOnly,
      });
      if (!listResp) return;

      const items = listResp.items ?? [];
      this.renderInboxItems(items, listResp.total ?? items.length);
      this.renderFilteredHint(items.length, unreadOnly);

      // 已读回写放在渲染之后：本批条目保持未读样式显示，只更新云端状态
      const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
      if (unreadIds.length) {
        await this.parent.supabaseUtils.markAttitudesRead(authKey, unreadIds);
        // 未读已清零：立即刷新合计与徽标（绕过缓存）
        await this.renderStats(true);
      }

      this.inboxSignature = [unreadOnly, this.nativeItemCount(), items.length > 0, true].join("|");
    } finally {
      this.inboxFetching = false;
    }
  }

  private nativeItemCount() {
    return $(".message-list > ul > li").not(".mcmodder-attitude-message").length;
  }

  /** 表态合计与未读徽标（徽标始终渲染，合计行只在列表存在时渲染；统计走 `AttitudeSystem.getStats` 的 GM 缓存） */
  private async renderStats(force = false) {
    const stats = await this.attitude.getStats(force);
    if (!stats) return;

    // 内容不变时不改 DOM，避免与本页的 MutationObserver 形成注入/刷新循环
    const badgeClass = `badge mcmodder-attitude-total ${stats.unread > 0 ? "badge-danger" : "badge-light"}`;
    const badgeTitle = `共 ${stats.total} 条，未读 ${stats.unread} 条`;
    const badgeText = stats.unread > 0 ? `${stats.unread}/${stats.total}` : String(stats.total);
    const $link = $('.message-submenu a[href*="type=attitude"]').first();
    const $badge = $link.children(".mcmodder-attitude-total");
    if (stats.total === 0) {
      $badge.remove();
    } else if (
      $badge.attr("class") !== badgeClass ||
      $badge.attr("title") !== badgeTitle ||
      $badge.text() !== badgeText
    ) {
      $badge.remove();
      $("<span></span>")
        .attr({ class: badgeClass, title: badgeTitle })
        .text(badgeText)
        .appendTo($link);
    }

    if (!$(".message-list").length) return;
    const summaryText = `自定义表态：共 ${stats.total} 条（未读 ${stats.unread}）`;
    const $summary = $(".message-list > .mcmodder-attitude-summary");
    if (stats.total === 0) {
      $summary.remove();
    } else if ($summary.length) {
      if ($summary.text() !== summaryText) $summary.text(summaryText);
    } else {
      $('<div class="mcmodder-attitude-summary"></div>')
        .text(summaryText)
        .prependTo(".message-list");
    }
  }

  /** 未完成云端认证时给出可操作提示（否则该子页签只会静默无内容） */
  private renderUnauthNotice() {
    if (!this.isInboxTab()) return;
    if ($(".message-list > .mcmodder-attitude-notice").length) return;
    $('<div class="mcmodder-attitude-notice text-muted"></div>')
      .text("完成云端认证后即可在消息中心查看自定义表态消息（个人中心 - 设置）。")
      .prependTo(".message-list");
  }

  /** 「忽略已读」把列表过滤空时给出说明（只剩合计行时容易被当成注入失败） */
  private renderFilteredHint(shown: number, unreadOnly: boolean) {
    const $hint = $(".message-list > .mcmodder-attitude-filter-hint");
    if (!unreadOnly || shown > 0) {
      $hint.remove();
      return;
    }
    if (!$hint.length) {
      $('<div class="mcmodder-attitude-filter-hint text-muted"></div>')
        .text("自定义表态已按「忽略已读」过滤（当前没有未读），取消勾选即可查看全部。")
        .prependTo(".message-list");
    }
  }

  private renderInboxItems(items: SupabaseAttitudeInboxItem[], total: number) {
    const $list = this.ensureMessageList();
    if (!$list.length) return;
    $list.children("li.mcmodder-attitude-message, li.mcmodder-attitude-more-hint").remove();
    if (items.length === 0) return;

    const $template = findAttitudeMessageTemplate();
    items.forEach((item) =>
      insertMessageItemByTime($list, buildAttitudeMessageItem($template, item)),
    );

    if (total > items.length) {
      $('<li class="mcmodder-attitude-more-hint text-muted"></li>')
        .text(`共 ${total} 条自定义表态，仅显示最近 ${items.length} 条`)
        .appendTo($list);
    }
    $(".message-list > .message-empty").hide();
    void this.attitude.hydrateStickers($list);
  }

  private ensureMessageList() {
    const $existing = $(".message-list > ul").first();
    return $existing.length ? $existing : $("<ul></ul>").appendTo(".message-list");
  }
}
