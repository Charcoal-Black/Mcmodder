import { AttitudeSystem } from "../attitude/AttitudeSystem";
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
 */
export class MessageInit extends Init {
  private readonly attitude = AttitudeSystem.for(this.parent);
  private refreshTimer?: number;
  private inboxSignature = "";
  private inboxFetching = false;

  canRun() {
    // 站内链接既有 `/message/` 也有 `/message?category=...`，两种形态都要命中
    return /\/message\/?(?:[?#]|$)/.test(this.parent.href);
  }

  run() {
    this.bindCommentJumpHints();

    if (this.configs.getSettings("lieqi")) {
      $(".content-comment-attitude > i").attr("class", "fas fa-surprise");
      $(".content-comment-attitude").each((_, c) => {
        $(c).contents().last().get(0).textContent = "猎奇";
      });
    }

    if (!this.attitude.enabled) return;
    this.scheduleRefresh();

    // 进消息中心即视为已看到提醒：页头红点归零
    void this.attitude.acknowledgeNew().then(() => this.parent.refreshBellNotify());
  }

  /**
   * 消息中心条目文本里带有「（10436楼）」或「（14楼的第1条回复）」，
   * 在跳转前把楼层/回复序号写进目标链接的 query，目标页据此缩小二分查找范围。
   *
   * 用委托绑定覆盖站点后续 AJAX 渲染的条目；`mousedown` 兼顾中键/新标签页打开。
   */
  private bindCommentJumpHints() {
    $(document)
      .off("mousedown.mcmodderCommentJump click.mcmodderCommentJump")
      .on(
        "mousedown.mcmodderCommentJump click.mcmodderCommentJump",
        ".message-list a[href*='#comment-']",
        (event) => this.decorateCommentJumpLink(event.currentTarget as HTMLAnchorElement),
      );
  }

  private decorateCommentJumpLink(link: HTMLAnchorElement) {
    const text = $(link).closest("li").text();
    if (!text) return;

    const url = new URL(link.href, window.location.href);
    if (!/^#comment-\d+$/.test(url.hash)) return;

    // 取最后一条匹配：条目正文可能引用其他楼层，通知摘要里的标识通常在末尾
    const replyMatches = [...text.matchAll(/[（(]\s*(\d+)\s*楼\s*的第\s*(\d+)\s*条回复\s*[）)]/g)];
    const reply = replyMatches[replyMatches.length - 1];
    const floorMatches = reply ? [] : [...text.matchAll(/[（(]\s*(\d+)\s*楼\s*[）)]/g)];
    const floor = floorMatches[floorMatches.length - 1];
    if (!reply && !floor) return;

    url.searchParams.delete(Values.commentJump.floorParam);
    url.searchParams.delete(Values.commentJump.replyParam);
    if (reply) {
      url.searchParams.set(Values.commentJump.floorParam, reply[1]);
      url.searchParams.set(Values.commentJump.replyParam, reply[2]);
    } else if (floor) {
      url.searchParams.set(Values.commentJump.floorParam, floor[1]);
    }
    link.href = url.toString();
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
      const rows = await this.parent.supabaseUtils.fetchAttitudeInboxList(authKey, {
        limit: Values.attitude.inboxPageSize,
        unreadOnly,
      });
      if (!rows) return;

      this.renderInboxItems(rows, rows[0]?.total ?? rows.length);
      this.renderFilteredHint(rows.length, unreadOnly);

      // 已读回写放在渲染之后：本批条目保持未读样式显示，只更新云端状态
      const unreadIds = rows.filter((item) => !item.is_read).map((item) => item.id);
      if (unreadIds.length) {
        await this.parent.supabaseUtils.markAttitudesRead(authKey, unreadIds);
        // 未读已清零：立即刷新合计与徽标（绕过缓存）
        await this.renderStats(true);
      }

      this.inboxSignature = [unreadOnly, this.nativeItemCount(), rows.length > 0, true].join("|");
    } finally {
      this.inboxFetching = false;
    }
  }

  private nativeItemCount() {
    return $(".message-list > ul > li").not(".mcmodder-attitude-message").length;
  }

  /** 表态合计与未读徽标（徽标只在有未读时渲染，合计行只在列表存在时渲染；统计走 `AttitudeSystem.getStats` 的 GM 缓存） */
  private async renderStats(force = false) {
    const stats = await this.attitude.getStats(force);
    if (!stats) return;

    // 内容不变时不改 DOM，避免与本页的 MutationObserver 形成注入/刷新循环
    // 徽标只显示未读数；未读为 0 时整个徽标（绿点）不渲染
    const badgeClass = "badge mcmodder-attitude-total badge-danger";
    const badgeTitle = `未读 ${stats.unread} 条`;
    const badgeText = String(stats.unread);
    const $link = $('.message-submenu a[href*="type=attitude"]').first();
    const $badge = $link.children(".mcmodder-attitude-total");
    if (stats.unread === 0) {
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
