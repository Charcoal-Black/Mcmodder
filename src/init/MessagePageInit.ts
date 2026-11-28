import { AttitudeSystem } from "../attitude/AttitudeSystem";
import {
  buildAttitudeMessageItem,
  FALLBACK_MESSAGE_ITEM,
  findAttitudeMessageTemplate,
  insertMessageItemByTime,
} from "../attitude/attitudeMessageItem";
import {
  attitudeTypeFromIconClass,
  attitudeTypeFromName,
  parseAttitudeTypeList,
} from "../attitude/nativeAttitudeTypes";
import {
  buildDefaultNickname,
  buildFakeTimestamp,
  collectCommentSnippets,
  pickFakeAttitudeType,
  pickFakeAvatar,
} from "../attitude/fakeMessage";
import { NATIVE_ATTITUDE_TYPES } from "../attitude/nativeAttitudeTypes";
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
  /** 消息列表的黑名单过滤器；页面重渲染时重建 */
  private blacklistObserver?: MutationObserver;
  /** 本轮被隐藏的表态通知数量与类型（供假条目补齐使用） */
  private hiddenAttitudeCount = 0;
  private hiddenAttitudeTypeList: string[] = [];
  /** 补齐请求的去抖定时器 */
  private fakeFillTimer?: number;

  canRun() {
    // 站内链接既有 `/message/` 也有 `/message?category=...`，两种形态都要命中
    return /\/message\/?(?:[?#]|$)/.test(this.parent.href);
  }

  run() {
    this.bindCommentJumpHints();
    this.startBlacklistObserver();

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

  /**
   * 隐藏黑名单用户在消息中心发的表态 / 短评通知。
   *
   * # 为什么要用 MutationObserver 而不是定时过滤
   * `refresh()` 有 120ms 去抖、且只在云端表态启用时才调度 —— 用它过滤会让条目
   * 先被绘制几帧再消失（肉眼可见的闪烁）。`MutationObserver` 的回调排在**微任务**，
   * 早于本次渲染，因此在同一帧内就能把条目摘掉，用户看不到它出现过。
   *
   * 发送者 uid 从头像 / 昵称链接反解（`https://center.mcmod.cn/<uid>/`）；
   * 站点原生条目与脚本注入的表态条目结构相同，一套选择器覆盖两者。
   * 仅隐藏本机显示，云端记录与未读统计不受影响。
   */
  private startBlacklistObserver() {
    const filterByUser = this.configs.getSettings("blacklistFilterMessage");
    const blacklist = filterByUser
      ? (this.configs.getSettingsAsNumberList("userBlacklist") ?? [])
      : [];
    const hasTypeFilter = this.hiddenAttitudeTypes.length > 0;
    if (blacklist.length === 0 && !hasTypeFilter) return;

    this.purgeBlacklisted(blacklist);

    const list = document.querySelector(".message-list > ul");
    if (list === null) return;
    this.blacklistObserver?.disconnect();
    this.blacklistObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          this.purgeIfBlacklisted($(node as HTMLElement), blacklist);
        });
      }
    });
    this.blacklistObserver.observe(list, { childList: true });
  }

  /** 摘掉已渲染列表里所有黑名单条目 */
  private purgeBlacklisted(blacklist: number[]) {
    $(".message-list > ul > li").each((_, li) => {
      this.purgeIfBlacklisted($(li), blacklist);
    });
  }

  /** 单条命中黑名单或表态类型黑名单则立即移除 */
  private purgeIfBlacklisted($item: JQuery, blacklist: number[]) {
    if ($item.is(".mcmodder-attitude-summary")) return;
    // 本就是自己补的假条目，不再参与过滤
    if ($item.attr("data-mcmodder-fake") !== undefined) return;

    // 表态类型过滤：脚本注入的条目带 data 属性；站点原生条目按图标 class 或中文名反查
    const hiddenTypes = this.hiddenAttitudeTypes;
    if (hiddenTypes.length > 0) {
      const type = this.resolveAttitudeType($item);
      if (type !== undefined && hiddenTypes.includes(type)) {
        $item.remove();
        this.hiddenAttitudeCount += 1;
        this.hiddenAttitudeTypeList.push(type);
        this.scheduleFakeFill();
        return;
      }
    }

    if (blacklist.length === 0) return;
    const href = $item.find(".avatar a[href], .username b a[href]").first().attr("href") ?? "";
    const uid = Number(href.match(/center\.mcmod\.cn\/(\d+)/)?.[1]);
    if (Number.isInteger(uid) && blacklist.includes(uid)) $item.remove();
  }

  /**
   * 解析消息条目的表态类型。
   *
   * 三条来源依次尝试：脚本注入条目上的 `data` 属性 → 条目内图标类的反查 →
   * 表态标识元素的中文名反查。只有**表态类**消息才参与判断（存在
   * `.content-comment-attitude` 或带 `data-mcmodder-attitude-type`），
   * 避免普通短评正文里的同名词被误判。
   */
  private resolveAttitudeType($item: JQuery): string | undefined {
    const own = $item.attr("data-mcmodder-attitude-type");
    if (own !== undefined) return own;

    const $badge = $item.find(".content-comment-attitude").first();
    if (!$badge.length) return undefined;

    const iconType = attitudeTypeFromIconClass($badge.find("i").first().attr("class"));
    if (iconType !== undefined) return iconType;

    return attitudeTypeFromName($badge.attr("title") ?? $badge.text());
  }

  /** 合并多次过滤后的补齐请求，避免连续插入多条时反复重排 */
  private scheduleFakeFill() {
    if (this.fakeFillTimer !== undefined) window.clearTimeout(this.fakeFillTimer);
    this.fakeFillTimer = window.setTimeout(() => {
      this.fakeFillTimer = undefined;
      this.fillFakeAttitudes();
    }, 60);
  }

  /**
   * 用假条目补齐被隐藏的表态通知。
   *
   * 克隆列表里第一条真实条目作骨架，替换昵称、头像、表态类型、短评摘要与时间；
   * 表态类型从**本轮被隐藏的类型**里取，这样补上的正是被拿掉的那几种。
   * 条目带 `data-mcmodder-fake` 标记，重渲染时先清掉再补，不会无限累积。
   */
  private fillFakeAttitudes(force = false) {
    if (!force && !this.configs.getSettings("fakeFillHidden")) return;
    const list = $(".message-list > ul").first();
    if (!list.length) return;

    // 先清掉上一次补的，按最新状态重建
    list.children("li[data-mcmodder-fake]").remove();
    const count = this.hiddenAttitudeCount;
    if (count <= 0) {
      return;
    }

    // 模板池：优先用真实条目（随机挑，避免全是同一条的翻版），
    // 列表为空时退回内置模板
    const $native = list
      .children("li")
      .not("[data-mcmodder-fake]")
      .not(".mcmodder-attitude-summary");
    const templates: Element[] =
      $native.length > 0 ? $native.toArray() : [$(FALLBACK_MESSAGE_ITEM).get(0) as Element];

    const snippets = collectCommentSnippets();
    const types = this.hiddenAttitudeTypeList;
    const limit = Math.min(count, 20);
    const offset = Math.floor(Math.random() * Math.max(1, snippets.length));

    for (let i = 0; i < limit; i += 1) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const $item = $(template).clone();
      $item
        .attr("data-mcmodder-fake", "1")
        .removeClass("mcmodder-attitude-unread")
        .removeAttr("data-mcmodder-attitude-message")
        .removeAttr("data-mcmodder-attitude-type");

      const nickname = buildDefaultNickname();
      $item.find(".avatar img").attr({ src: pickFakeAvatar(), alt: nickname });
      $item.find(".avatar a").attr("href", "javascript:void(0);");
      $item.find(".username b a").attr("href", "javascript:void(0);").text(nickname);

      // 表态类型：用正面类型，并渲染成站点原生的「图标 + 中文名」形态
      const type = pickFakeAttitudeType(types);
      const typeInfo = NATIVE_ATTITUDE_TYPES.find((item) => item.type === type);
      const $badge = $item.find(".content-comment-attitude").first();
      if ($badge.length && typeInfo !== undefined) {
        $badge
          .empty()
          .append($("<i>").addClass(`fas ${typeInfo.iconClass}`))
          .append(document.createTextNode(typeInfo.name));
      }

      if (snippets.length > 0) {
        // 打乱一次后按序取，避免同一批里出现重复文案
        const snippet = snippets[(i + offset) % snippets.length];
        $item.find(".content-reply > a").first().text(snippet).attr("href", "javascript:void(0);");
        $item.find(".content-reply > span").remove();
      }

      $item.find(".content-tools > li").first().text(buildFakeTimestamp());
      list.append($item);
    }
  }

  /** 配置里要隐藏的表态类型（已规范化，兼容中英文写法） */
  private get hiddenAttitudeTypes(): string[] {
    return parseAttitudeTypeList(this.configs.getSettings("hiddenAttitudeTypes"));
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
