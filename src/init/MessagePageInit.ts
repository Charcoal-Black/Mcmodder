import { AttitudeSystem } from "../attitude/AttitudeSystem";
import type { AttitudeRecord } from "../attitude/AttitudeSystem";
import { buildAttitudeIcon } from "../attitude/attitudeIcon";
import {
  buildAttitudeMessageItem,
  findAttitudeMessageTemplate,
} from "../attitude/attitudeMessageItem";
import { Values } from "../Values";
import { Init } from "./Init";

/**
 * 消息中心的表态集成。
 *
 * - 子 tab 徽标与列表顶部合计行（共 N 条 / 未读 M）在**任何**消息中心页面都渲染，进页即可看到提醒，
 *   不必先点进「短评表态」子 tab；统计走 GM 缓存，正常每次访问只请求一次云端；
 * - 每条短评类消息在 `.content-ground` 显示该短评获得的自定义表态数量（复用短评页的计数缓存）；
 * - 「短评表态」与「全部」子页签（`?category=comment` 及 `?type=attitude`）额外注入自定义表态消息列表
 *   （克隆原生条目样式），并把本批未读记录回写为已读；未完成云端认证时给出可操作提示，
 *   「忽略已读」把列表过滤空时给出说明；
 * - 「忽略已读」勾选框（`#message-unread`）勾选时只取未读记录，与站点语义一致；
 * - 进入消息中心即视为已看到提醒（`AttitudeSystem.acknowledgeNew`），页头红点随之归零。
 *
 * 站点的列表渲染（含 AJAX / 滚动分页与子 tab 切换时的整块重绘）不被接管：`MutationObserver`
 * 观察 `body` 做幂等增量注入，每次请求由签名（子 tab / 未读过滤 / 原生条目数 / 我方列表是否存在）去重。
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
    // 列表可能由站点 AJAX 渲染，且切换子 tab 时整块重绘：观察 body 而非列表本身，
    // 保证列表节点被替换后仍能接上（刷新按签名去重，不会因自身注入而循环）
    this.messageObserver.observe(document.body, { childList: true, subtree: true });
    $("#message-unread").on("change", () => {
      this.inboxSignature = "";
      this.scheduleRefresh();
    });
    this.scheduleRefresh();

    // 进消息中心即视为已看到提醒：页头红点归零（表态本身的未读状态仍按各子 tab 展示）
    void this.attitude.acknowledgeNew().then(() => this.parent.refreshBellNotify());
  }

  /** 站点列表的增删改都合并到一次刷新里（我方自己的注入也会触发，靠签名与缓存去重） */
  private scheduleRefresh() {
    if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => void this.refresh(), 120);
  }

  private async refresh() {
    this.refreshTimer = undefined;
    // 合计与未读徽标不依赖子 tab：进消息中心即可看到提醒
    await this.renderStats();
    if (!$(".message-list").length) return;
    await this.renderCommentCounts();
    if (this.isInboxTab()) await this.renderInbox();
  }

  /** 我方可注入消息条目的子页签：「全部」（不带 `type`）与「短评表态」 */
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

  /** 写入数量标签；结果不变时不动 DOM，避免与 `MutationObserver` 形成抖动循环 */
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
    // 徽标里的贴纸先以占位形态出现，图片地址解析完成后补上
    void this.attitude.hydrateStickers($badge);
  }

  /** 「短评表态」子 tab：注入自定义表态消息、子 tab 徽标与合计行 */
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

      // 已读回写放在渲染之后：本批条目本次仍保持原样式显示，只更新云端状态
      const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
      if (unreadIds.length) {
        await this.parent.supabaseUtils.markAttitudesRead(authKey, unreadIds);
        // 未读已清零：立即刷新合计与子 tab 徽标（绕过缓存）
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

  /**
   * 表态合计与未读徽标。
   *
   * 子 tab 徽标始终渲染（不点进「表态」子页签也能看到提醒），列表顶部合计行只在列表存在时渲染；
   * 统计走 {@link AttitudeSystem.getStats} 的 GM 缓存，正常每个页面只请求一次云端。
   */
  private async renderStats(force = false) {
    const stats = await this.attitude.getStats(force);
    if (!stats) return;

    // 幂等：内容不变就不动 DOM，否则会与本页的 MutationObserver 形成「注入 -> 刷新」循环
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

  /**
   * 「忽略已读」把列表过滤空时给出说明。
   *
   * 否则列表顶部只有合计行、正文却停在站点的空态提示上，容易被当成没注入成功。
   */
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
    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.append(buildAttitudeMessageItem($template, item)));
    $list.prepend(fragment);

    if (total > items.length) {
      $('<li class="mcmodder-attitude-more-hint text-muted"></li>')
        .text(`共 ${total} 条自定义表态，仅显示最近 ${items.length} 条`)
        .insertAfter($list.children("li.mcmodder-attitude-message").last());
    }
    $(".message-list > .message-empty").hide();
    // 表态消息里的贴纸同样按占位渲染后异步补图
    void this.attitude.hydrateStickers($list);
  }

  private ensureMessageList() {
    const $existing = $(".message-list > ul").first();
    return $existing.length ? $existing : $("<ul></ul>").appendTo(".message-list");
  }
}
