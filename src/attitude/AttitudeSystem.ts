import type { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";
import {
  buildAttitudeIcon,
  buildStickerType,
  fillStickerIcon,
  parseStickerId,
} from "./attitudeIcon";
import { PopoverController } from "../widget/PopoverController.ts";
import type { ConfigRepository } from "../config/ConfigRepository.ts";

/**
 * 自定义表态系统：纯 DOM 编排 + 云端读写。读操作走 PostgREST RPC（`mcmodder_attitude_*` 函数，
 * 不占 Edge Function 调用额度；计数为 TTL 缓存 + 去抖合并请求），写操作走 `attitude-put` 并以
 * 服务端返回的计数就地刷新；同一短评可按类型并存多种表态。
 *
 * 全站单例：短评页与消息中心共用同一份缓存与去抖通道，经 {@link AttitudeSystem.for} 获取。
 */
export class AttitudeSystem {
  private static instance?: AttitudeSystem;

  private readonly configs: ConfigRepository;
  private readonly countsCache = new Map<string, { time: number; record: AttitudeRecord }>();
  private readonly writeQueues = new Map<string, Promise<AttitudeRecord | undefined | void>>();
  private pendingCommentIds = new Set<string>();
  private pendingResolvers: ((records: Map<string, AttitudeRecord>) => void)[] = [];
  private flushTimer?: number;
  private eventsBound = false;

  /** 我上传的贴纸与今日上传额度（`attitude-sticker` 的 `list` 结果，TTL 内复用） */
  myStickers?: {
    time: number;
    stickers: SupabaseAttitudeSticker[];
    quota?: SupabaseAttitudeStickerQuota;
  };
  /** `sticker:<id>` → 贴纸记录（贴纸不可变，命中即长期有效） */
  private readonly stickerCache = new Map<string, SupabaseAttitudeSticker>();
  /** 服务端答复「不存在」的贴纸 id（不再重复请求） */
  private readonly missingStickerIds = new Set<number>();
  private pendingStickerTypes = new Set<string>();
  private pendingStickerResolvers: ((stickers: Map<string, SupabaseAttitudeSticker>) => void)[] =
    [];
  private stickerFlushTimer?: number;

  /** 获取全站单例（组合根：首个使用方传入 `Mcmodder`） */
  static for(parent: Mcmodder) {
    return (AttitudeSystem.instance ??= new AttitudeSystem(parent));
  }

  private constructor(private readonly parent: Mcmodder) {
    this.configs = parent.configRepository;
  }

  /** 功能是否可用：配置开启且云端客户端存在（`useSupabase` 关闭时整套静默停用） */
  get enabled() {
    return !!this.configs.getSettings("customAttitude") && this.parent.supabaseUtils.hasClient();
  }

  /** 当前账号的云端认证 key；未认证时为空字符串 */
  getAuthKey() {
    return this.configs.getProfile("auth_key") ?? "";
  }

  /** 最近使用的 emoji（本机维度） */
  getRecentEmojis() {
    const raw = this.configs.getSettings("attitudeRecentEmojis");
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((emoji): emoji is string => typeof emoji === "string")
        : [];
    } catch {
      return [];
    }
  }

  /**
   * 我收到的表态统计（`unreadCacheTtl` 内复用 GM 缓存）。
   *
   * 功能关闭 / 未认证返回 `{ unread: 0, total: 0 }`；请求失败且无缓存可用时返回 undefined。
   */
  async getStats(force = false): Promise<AttitudeStats | undefined> {
    if (!this.enabled) return { unread: 0, total: 0 };
    const authKey = this.getAuthKey();
    if (!authKey) return { unread: 0, total: 0 };

    const cached = this.readUnreadCache();
    if (!force && cached && Date.now() - cached.at < Values.attitude.unreadCacheTtl) {
      return { unread: cached.unread, total: cached.total };
    }
    // 后台提醒用：失败只记录日志，不弹模态框
    const resp = await this.parent.supabaseUtils.fetchAttitudeInboxStats(authKey, (error) =>
      console.warn("[Mcmodder] 表态消息统计获取失败：", error),
    );
    if (!resp) return cached && { unread: cached.unread, total: cached.total };
    const stats = { unread: resp.unread ?? 0, total: resp.total ?? 0 };
    this.writeUnreadCache(stats);
    return stats;
  }

  /**
   * 未确认的新表态数量（页头红点用）：只取 `since_id` 之后的增量，数量在 {@link acknowledgeNew}
   * 之前不归零；进入页面时调用一次，{@link Values.attitude.remindCacheTtl} 内复用结果。
   *
   * @returns 功能关闭 / 未认证时为 0，请求失败且无缓存时为 undefined。
   */
  async getNewCount(): Promise<number | undefined> {
    if (!this.enabled) return 0;
    const authKey = this.getAuthKey();
    if (!authKey) return 0;

    const checkedAt = this.configs.get("attitudeCache", "checkedAt") ?? 0;
    const cachedCount = this.configs.get("attitudeCache", "checkedCount") ?? 0;
    if (Date.now() - checkedAt < Values.attitude.remindCacheTtl) return cachedCount;

    const sinceId = this.configs.get("attitudeCache", "lastSeenId") ?? 0;
    const resp = await this.parent.supabaseUtils.checkNewAttitudes(authKey, sinceId, (error) =>
      console.warn("[Mcmodder] 表态提醒检查失败：", error),
    );
    if (!resp) return checkedAt ? cachedCount : undefined;

    // 请求期间若已确认提醒（打开消息中心 / 点铃铛），本次结果已过期，丢弃
    if ((this.configs.get("attitudeCache", "lastSeenId") ?? 0) !== sinceId)
      return this.configs.get("attitudeCache", "checkedCount") ?? 0;

    const count = resp.new_count ?? 0;
    this.configs.set("attitudeCache", "checkedAt", Date.now());
    this.configs.set("attitudeCache", "checkedCount", count);
    this.configs.set("attitudeCache", "latestId", resp.latest_id ?? 0);
    return count;
  }

  /** 最近一次检查得到的未确认表态数（不发请求） */
  getCachedNewCount() {
    if (!this.enabled || !this.getAuthKey()) return 0;
    return this.configs.get("attitudeCache", "checkedCount") ?? 0;
  }

  /** 确认已看到全部表态提醒（打开消息中心 / 点铃铛）：确认位置写成当前最新记录 id，没有缓存时现取一次 */
  async acknowledgeNew() {
    if (!this.enabled) return;
    const authKey = this.getAuthKey();
    if (!authKey) return;

    const checkedAt = this.configs.get("attitudeCache", "checkedAt") ?? 0;
    let latestId = this.configs.get("attitudeCache", "latestId") ?? 0;
    if (!latestId || Date.now() - checkedAt >= Values.attitude.remindCacheTtl) {
      const resp = await this.parent.supabaseUtils.checkNewAttitudes(authKey, 0, () => {});
      latestId = resp?.latest_id ?? latestId;
    }
    // 从未取到最新记录 id 时不推进确认位置：写成 0 会让下次检查重新数出全部历史记录
    if (!latestId) return;
    this.configs.set("attitudeCache", "latestId", latestId);
    this.configs.set("attitudeCache", "lastSeenId", latestId);
    this.configs.set("attitudeCache", "checkedCount", 0);
    this.configs.set("attitudeCache", "checkedAt", Date.now());
  }

  /** 把我的全部未读表态标记为已读，并同步本地未读缓存（页头铃铛用） */
  async markAllRead() {
    if (!this.enabled) return;
    const authKey = this.getAuthKey();
    if (!authKey) return;
    const cached = this.readUnreadCache();
    if (cached?.unread === 0) return;
    await this.parent.supabaseUtils.markAllAttitudesRead(authKey);
    this.writeUnreadCache({ unread: 0, total: cached?.total ?? 0 });
  }

  /** 读取未读数 GM 缓存（未写入过时返回 undefined） */
  private readUnreadCache() {
    const at = this.configs.get("attitudeCache", "unreadAt");
    if (at === undefined) return undefined;
    return {
      unread: this.configs.get("attitudeCache", "unread") ?? 0,
      total: this.configs.get("attitudeCache", "total") ?? 0,
      at,
    };
  }

  private writeUnreadCache(stats: AttitudeStats) {
    this.configs.set("attitudeCache", "unread", stats.unread);
    this.configs.set("attitudeCache", "total", stats.total);
    this.configs.set("attitudeCache", "unreadAt", Date.now());
  }

  /** 读取若干短评的表态计数：命中 `countsCacheTtl` 的直接返回，其余合并进一个去抖窗口（{@link fetchCounts}） */
  async requestCounts(commentIds: string[]): Promise<Map<string, AttitudeRecord>> {
    const result = new Map<string, AttitudeRecord>();
    if (!this.enabled || commentIds.length === 0) return result;

    const now = Date.now();
    const missing: string[] = [];
    for (const commentId of new Set(commentIds)) {
      const cached = this.countsCache.get(commentId);
      if (cached && now - cached.time < Values.attitude.countsCacheTtl) {
        result.set(commentId, cached.record);
      } else {
        missing.push(commentId);
      }
    }
    if (missing.length === 0) return result;

    const fetched = await this.fetchCounts(missing);
    for (const [commentId, record] of fetched) {
      result.set(commentId, record);
    }
    return result;
  }

  /** 把一批缺失缓存的短评并入去抖窗口（计时器只在窗口开启时排期一次，突发调用不会无限推迟请求） */
  private fetchCounts(commentIds: string[]) {
    commentIds.forEach((commentId) => this.pendingCommentIds.add(commentId));
    return new Promise<Map<string, AttitudeRecord>>((resolve) => {
      this.pendingResolvers.push(resolve);
      if (this.flushTimer === undefined) {
        this.flushTimer = window.setTimeout(
          () => void this.flushCounts(),
          Values.attitude.countsDebounce,
        );
      }
    });
  }

  /** 去抖窗口结束：按服务端单次上限分片请求，成功后写入缓存并交付给全部等待方 */
  private async flushCounts() {
    this.flushTimer = undefined;
    const commentIds = Array.from(this.pendingCommentIds);
    const resolvers = this.pendingResolvers;
    this.pendingCommentIds = new Set();
    this.pendingResolvers = [];

    const result = new Map<string, AttitudeRecord>();
    const authKey = this.getAuthKey();
    // 本次读取的起始时刻：此后写请求返回的记录（`sendWrite` 写入缓存）比本次读取结果权威
    const startedAt = Date.now();
    for (let i = 0; i < commentIds.length; i += Values.attitude.maxCountsPerRequest) {
      const chunk = commentIds.slice(i, i + Values.attitude.maxCountsPerRequest);
      // 后台批量读：失败只记录日志，不弹模态框
      const resp = await this.parent.supabaseUtils.fetchAttitudeCounts(chunk, authKey, (error) =>
        console.warn("[Mcmodder] 自定义表态计数获取失败：", error),
      );
      if (!resp) continue;
      // 服务端返回行集合，行序即「各类别首次表态的时间序」：按行序还原成展示用的对象
      const grouped = new Map<string, AttitudeRecord>();
      for (const row of resp) {
        let record = grouped.get(row.comment_id);
        if (!record) grouped.set(row.comment_id, (record = { counts: {}, mine: [] }));
        record.counts[row.attitude_type] = row.total;
        if (row.mine) record.mine.push(row.attitude_type);
      }
      for (const commentId of chunk) {
        const fetched = grouped.get(commentId) ?? { counts: {}, mine: [] };
        // 读取期间该短评已被写入更新：保留缓存里的新记录，并把新记录交付给等待方，避免用过期结果覆盖
        const cached = this.countsCache.get(commentId);
        const record = cached && cached.time > startedAt ? cached.record : fetched;
        if (record === fetched) this.countsCache.set(commentId, { time: Date.now(), record });
        result.set(commentId, record);
      }
    }
    resolvers.forEach((resolve) => resolve(result));
  }

  /**
   * 我上传的表态贴纸与今日上传额度。
   *
   * {@link Values.attitude.sticker.listCacheTtl} 内复用缓存；功能关闭 / 未认证返回 undefined。
   * 列表结果同时写进贴纸解析缓存，随后渲染这些贴纸无需再解析。
   */
  async listMyStickers(force = false) {
    if (!this.enabled) return undefined;
    const authKey = this.getAuthKey();
    if (!authKey) return undefined;

    const cached = this.myStickers;
    if (!force && cached && Date.now() - cached.time < Values.attitude.sticker.listCacheTtl) {
      return { stickers: cached.stickers, quota: cached.quota };
    }
    // 面板打开时的预取：失败只记录日志，不弹模态框
    const onError = (error: string) => console.warn("[Mcmodder] 表态贴纸列表获取失败：", error);
    const [stickers, quota] = await Promise.all([
      this.parent.supabaseUtils.fetchAttitudeStickers(authKey, onError),
      this.parent.supabaseUtils.fetchAttitudeStickerQuota(authKey, onError),
    ]);
    if (!stickers) return cached && { stickers: cached.stickers, quota: cached.quota };

    const stored = this.storeStickers(
      stickers,
      quota && { limit: quota.daily_limit, used: quota.used_today, remaining: quota.remaining },
    );
    return { stickers: stored.stickers, quota: stored.quota };
  }

  /** 写入贴纸列表缓存（同时进入解析缓存） */
  private storeStickers(stickers: SupabaseAttitudeSticker[], quota?: SupabaseAttitudeStickerQuota) {
    for (const sticker of stickers) {
      this.stickerCache.set(buildStickerType(sticker.id), sticker);
    }
    this.myStickers = { time: Date.now(), stickers, quota: quota ?? this.myStickers?.quota };
    return this.myStickers;
  }

  /**
   * 上传一张本地图片作为表态贴纸：先传百科图床，再把地址登记到云端，返回 `sticker:<新贴纸 id>`。
   *
   * 失败时以 `Utils.commonMsg` 提示（非图片、体积超限、图床拒绝、今日额度用尽等）并返回 undefined。
   */
  async uploadSticker(file: File): Promise<string | undefined> {
    if (!this.enabled) {
      Utils.commonMsg("自定义表态未启用，无法上传表态贴纸。", false);
      return undefined;
    }
    const authKey = this.getAuthKey();
    if (!authKey) {
      Utils.commonMsg("尚未完成云端认证，请先到“个人中心 - 设置”完成认证，再上传表态贴纸。", false);
      return undefined;
    }
    if (!file.type.startsWith("image/")) {
      Utils.commonMsg("请选择图片文件作为表态贴纸。", false);
      return undefined;
    }
    if (file.size > Values.attitude.sticker.maxUploadBytes) {
      const mb = Values.attitude.sticker.maxUploadBytes / 1024 / 1024;
      Utils.commonMsg(`图片体积不能超过 ${mb}MB。`, false);
      return undefined;
    }

    const imageUrl = await this.uploadImageToMcmod(file);
    if (!imageUrl) return undefined;

    const resp = await this.parent.supabaseUtils.putAttitudeSticker({
      authKey,
      imageUrl,
      name: file.name,
    });
    const sticker = resp?.sticker;
    // 登记失败时刷新一次列表（错误提示由 `invoke` 给出）
    if (!sticker) {
      void this.listMyStickers(true);
      return undefined;
    }

    const rest = (this.myStickers?.stickers ?? []).filter((item) => item.id !== sticker.id);
    this.storeStickers([sticker, ...rest], resp?.quota);
    Utils.commonMsg("表态贴纸上传成功~");
    return buildStickerType(sticker.id);
  }

  /**
   * 把本地图片传到百科图床（站点 UEditor 图片接口），返回图片地址。
   *
   * 请求体与站点前端一致（`upfile` + `type=ajax`）；走 `GM_xmlhttpRequest` 以带上站点 cookie。
   */
  private async uploadImageToMcmod(file: File) {
    const form = new FormData();
    form.append("upfile", file, file.name);
    form.append("type", "ajax");
    try {
      const resp = await this.parent.utils.createRequest({
        url: Values.attitude.sticker.uploadUrl,
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://center.mcmod.cn",
          Referer: "https://center.mcmod.cn/",
        },
        data: form,
      });
      const result = JSON.parse(resp.responseText?.trim() ?? "") as {
        state?: string;
        url?: string;
      };
      if (result.state !== "SUCCESS" || !result.url) {
        Utils.commonMsg(`图片上传失败：${result.state || "未知错误"}`, false);
        return undefined;
      }
      return result.url;
    } catch (error) {
      // 图床异常响应（登录失效会返回 HTML 报错页）会走到这里，原始错误留在控制台
      console.warn("[Mcmodder] 表态贴纸上传失败：", error);
      Utils.commonMsg("图片上传失败，请稍后再试。", false);
      return undefined;
    }
  }

  /** 解析一批表态类型里的贴纸（`sticker:<id>` → 记录）：命中缓存的立即返回，其余合并进去抖窗口 */
  async resolveStickers(attitudeTypes: Iterable<string>) {
    const result = new Map<string, SupabaseAttitudeSticker>();
    if (!this.enabled) return result;

    const missing: string[] = [];
    for (const attitudeType of new Set(attitudeTypes)) {
      const cached = this.stickerCache.get(attitudeType);
      if (cached) {
        result.set(attitudeType, cached);
        continue;
      }
      const id = parseStickerId(attitudeType);
      if (id !== undefined && !this.missingStickerIds.has(id)) missing.push(attitudeType);
    }
    if (missing.length === 0) return result;

    for (const [attitudeType, sticker] of await this.fetchStickers(missing)) {
      result.set(attitudeType, sticker);
    }
    return result;
  }

  /** 把一批缺失缓存的贴纸并入去抖窗口（与计数同款做法） */
  private fetchStickers(attitudeTypes: string[]) {
    attitudeTypes.forEach((attitudeType) => this.pendingStickerTypes.add(attitudeType));
    return new Promise<Map<string, SupabaseAttitudeSticker>>((resolve) => {
      this.pendingStickerResolvers.push(resolve);
      if (this.stickerFlushTimer === undefined) {
        this.stickerFlushTimer = window.setTimeout(
          () => void this.flushStickers(),
          Values.attitude.countsDebounce,
        );
      }
    });
  }

  /** 去抖窗口结束：按服务端单次上限分片解析，成功的贴纸写入缓存并交付给全部等待方 */
  private async flushStickers() {
    this.stickerFlushTimer = undefined;
    const attitudeTypes = Array.from(this.pendingStickerTypes);
    const resolvers = this.pendingStickerResolvers;
    this.pendingStickerTypes = new Set();
    this.pendingStickerResolvers = [];

    const result = new Map<string, SupabaseAttitudeSticker>();
    for (let i = 0; i < attitudeTypes.length; i += Values.attitude.sticker.maxResolvePerRequest) {
      const chunk = attitudeTypes.slice(i, i + Values.attitude.sticker.maxResolvePerRequest);
      const ids = chunk
        .map((attitudeType) => parseStickerId(attitudeType))
        .filter((id): id is number => id !== undefined);
      if (ids.length === 0) continue;
      // 后台批量解析：失败只记录日志，不弹模态框
      const resp = await this.parent.supabaseUtils.resolveAttitudeStickers(ids, (error) =>
        console.warn("[Mcmodder] 表态贴纸解析失败：", error),
      );
      if (!resp) continue;
      const unanswered = new Set(ids);
      for (const sticker of resp) {
        const attitudeType = buildStickerType(sticker.id);
        this.stickerCache.set(attitudeType, sticker);
        result.set(attitudeType, sticker);
        unanswered.delete(sticker.id);
      }
      // 服务端答复里没有的 id 记为缺失：占位块走降级样式，且不再重复请求
      unanswered.forEach((id) => this.missingStickerIds.add(id));
    }
    resolvers.forEach((resolve) => resolve(result));
  }

  /**
   * 给一批贴纸占位节点（`[data-mcmodder-sticker-id]`）补上图片与名称；解析失败的标上
   * `data-mcmodder-sticker-failed` 走降级样式。
   */
  async hydrateStickers(root: JQuery | HTMLElement) {
    if (!this.enabled) return;
    const $icons = $(root).find("[data-mcmodder-sticker-id]").not("[data-mcmodder-sticker-failed]");
    if (!$icons.length) return;

    const attitudeTypes = $icons
      .toArray()
      .map((icon) => buildStickerType(Number($(icon).attr("data-mcmodder-sticker-id"))));
    const stickers = await this.resolveStickers(attitudeTypes);
    $(root)
      .find("[data-mcmodder-sticker-id]")
      .each((_, icon) => {
        const $icon = $(icon);
        const stickerId = Number($icon.attr("data-mcmodder-sticker-id"));
        const sticker = stickers.get(buildStickerType(stickerId));
        if (sticker) {
          fillStickerIcon($icon, sticker);
        } else if (this.missingStickerIds.has(stickerId)) {
          // 仅「服务端答复不存在」才降级；请求失败时保留占位
          $icon.attr("data-mcmodder-sticker-failed", "1");
        }
      });
  }

  /** 绑定工具条点击与原生表态列表的悬停补注入（全站一次） */
  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("mouseover", this.onDocumentMouseOver);
  }

  /** 鼠标进入站点原生表态列表时补注入恶魔安格瑞（站点首次悬停才显示该列表，且可能整体重绘） */
  private readonly onDocumentMouseOver = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const $list = $(target).closest(".comment-tools li.comment-attitude-list");
    if (!$list.length) return;
    const $tools = $list.closest(".comment-tools");
    if ($tools.length) this.injectNativeDevilAngry($tools);
  };

  bindOption(button: HTMLElement) {
    const resolved = this.resolveTarget($(button).closest(".comment-row, .comment-reply-row"));
    if (resolved) {
      return this.openPicker(button, resolved);
    } else {
      throw new Error("短评节点解析失败...");
    }
  }

  private readonly onDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const value = target.closest("a[data-mcmodder-attitude]");
    if (value) {
      event.preventDefault();
      const resolved = this.resolveTarget($(value).closest(".comment-row, .comment-reply-row"));
      const attitudeType = value.getAttribute("data-mcmodder-attitude");
      if (resolved && attitudeType) void this.write(resolved, attitudeType);
    }
  };

  private openPicker(anchor: Element, target: AttitudeTarget): AttitudePickerState {
    return {
      type: "attitudePicker",
      anchorElement: anchor as HTMLElement,
      parent: this.parent,
      commentId: target.commentId,
      active: this.countsCache.get(target.commentId)?.record.mine ?? [],
      target,
    };
  }

  rememberRecentEmoji(attitudeType: string) {
    if (attitudeType === Values.attitude.devilAngry.type) return;
    const recents = this.getRecentEmojis().filter((emoji) => emoji !== attitudeType);
    recents.unshift(attitudeType);
    this.configs.setSettings(
      "attitudeRecentEmojis",
      JSON.stringify(recents.slice(0, Values.attitude.recentEmojisLimit)),
    );
  }

  /**
   * 给一批新插入的短评（顶层短评与楼中楼回复）注入自定义表态入口，并统一刷新这批短评的计数。
   *
   * 仅处理站点渲染了原生表态候选列表（`.comment-attitude-list`，即「已登录 + 非作者」）的条目。
   */
  async processCommentRows($context: JQuery) {
    if (!this.enabled) return;
    const rows: { $row: JQuery; target: AttitudeTarget }[] = [];
    $context.find(".comment-row, .comment-reply-row").each((_, row) => {
      const $row = $(row);
      if ($row.attr("data-mcmodder-attitude-row")) return;
      const $tools = $row.find(".comment-tools").first();
      if (!$tools.find(".comment-attitude-list").length) return;
      const target = this.resolveTarget($row);
      if (!target) return;
      $row.attr("data-mcmodder-attitude-row", target.commentId);
      this.injectTools($tools);
      rows.push({ $row, target });
    });
    if (rows.length === 0) return;

    const records = await this.requestCounts(rows.map(({ target }) => target.commentId));
    rows.forEach(({ $row, target }) => {
      const record = records.get(target.commentId);
      if (record) this.renderRow($row, record);
    });
  }

  /** 注入工具条按钮与结果条（站点未渲染结果条时自建，保持与站点同构） */
  private injectTools($tools: JQuery) {
    if (!$tools.children("li.mcmodder-attitude-tools").length) {
      $tools.append(
        `<li class="mcmodder-attitude-tools"><a class="mcmodder-attitude-button" href="javascript:void(0);" title="自定义表态"><span class="mcmodder-attitude-emoji">😀</span><i class="fas fa-caret-up"></i></a></li>`,
      );
      const button = $tools.find(".mcmodder-attitude-button").get(0) as HTMLElement;
      PopoverController.instance.addAttitudePicker(button, (button) => this.bindOption(button));
    }
    if (!$tools.children("ol.comment-attitude-result").length) {
      $('<ol class="comment-attitude-result mcmodder-attitude-result-custom"></ol>').insertAfter(
        $tools.children("input.comment-id"),
      );
    }
    this.injectNativeDevilAngry($tools);
  }

  /**
   * 把「恶魔安格瑞」补进站点原生的表态候选列表（`.comment-attitude-list-hover > ul`）。
   *
   * 它不是 emoji，故与原生 12 项并列，而不放进 emoji 面板；站点对 `.comment-attitude` 有
   * document 事件委托（命中即发原生单表态请求），故这里用自绘类名承接点击。
   */
  private injectNativeDevilAngry($tools: JQuery) {
    const $list = $tools.find("li.comment-attitude-list .comment-attitude-list-hover > ul").first();
    if (!$list.length || $list.children("li.mcmodder-attitude-native-item").length) return;
    $list.append(
      $('<li class="mcmodder-attitude-native-item"></li>')
        .attr("title", Values.attitude.devilAngry.title)
        .append(
          $("<a>")
            .attr({
              class:
                "mcmodder-attitude-value mcmodder-attitude-native mcmodder-attitude-devil-angry",
              href: "javascript:void(0);",
              title: Values.attitude.devilAngry.title,
              "data-mcmodder-attitude": Values.attitude.devilAngry.type,
            })
            .append(buildAttitudeIcon(Values.attitude.devilAngry.type)),
        ),
    );
  }

  /** 从短评节点解析写入所需的上下文；无法解析（未登录 / 自己的短评 / 缺 author 信息）时返回 undefined */
  resolveTarget($row: JQuery): AttitudeTarget | undefined {
    // `.get()` 只给出 `Element`，短评节点实际是 `<div>`，按已知宿主结构收窄
    const row = $row.get(0) as HTMLElement | undefined;
    if (!row) return undefined;
    const $tools = $row.find(".comment-tools").first();
    const commentId = String($tools.find("input.comment-id").first().val() ?? "");
    if (!commentId) return undefined;

    const $author = $row
      .find(".comment-row-username a.poped, .comment-reply-row-username a.poped")
      .first();
    const toUid = Number($author.attr("data-uid"));
    if (!toUid || toUid === this.parent.currentUID) return undefined;

    return {
      commentId,
      toUid,
      toUsername: $author.text().trim(),
      commentText: $row
        .find(".comment-row-text-content, .comment-reply-row-text-content")
        .first()
        .text()
        .trim(),
      sourceUrl: `${window.location.href.split("#")[0]}#comment-${commentId}`,
      row,
    };
  }

  /** 渲染某条短评的自定义表态结果条（保留站点原生项，只重建自绘项） */
  private renderRow($row: JQuery, record: AttitudeRecord) {
    const $result = $row.find(".comment-tools > ol.comment-attitude-result").first();
    if (!$result.length) return;

    $result.children("li.mcmodder-attitude-item").remove();
    const mine = new Set(record.mine);
    // 顺序即服务端键序（各类别首次表态时间序）
    Object.keys(record.counts)
      .filter((attitudeType) => (record.counts[attitudeType] ?? 0) > 0 || mine.has(attitudeType))
      .forEach((attitudeType) => {
        $result.append(
          this.buildResultItem(
            attitudeType,
            record.counts[attitudeType] ?? 0,
            mine.has(attitudeType),
          ),
        );
      });

    // 原生候选列表里的恶魔安格瑞同步「我点过」高亮
    $row
      .find("a.mcmodder-attitude-native")
      .toggleClass("mcmodder-attitude-active", mine.has(Values.attitude.devilAngry.type));

    void this.hydrateStickers($result);
  }

  private buildResultItem(attitudeType: string, count: number, active: boolean) {
    const isDevilAngry = attitudeType === Values.attitude.devilAngry.type;
    return $('<li class="mcmodder-attitude-item"></li>').append(
      $("<a>")
        .attr({
          href: "javascript:void(0);",
          "data-mcmodder-attitude": attitudeType,
          title: isDevilAngry ? Values.attitude.devilAngry.title : attitudeType,
          class: [
            "mcmodder-attitude-value",
            isDevilAngry ? "mcmodder-attitude-devil-angry" : "",
            active ? "mcmodder-attitude-active" : "",
          ]
            .filter(Boolean)
            .join(" "),
        })
        .append(buildAttitudeIcon(attitudeType))
        .append($("<span></span>").text(String(count))),
    );
  }

  /**
   * 添加 / 取消一条表态（服务端按 `(短评, 我, 类型)` 存在性切换）：不做乐观计数，以服务端返回的
   * 计数为准；同一短评的写操作串行排队。
   */
  write(target: AttitudeTarget, attitudeType: string) {
    if (!this.enabled) return;
    const authKey = this.getAuthKey();
    if (!authKey) {
      Utils.commonMsg(
        "尚未完成云端认证，请先到“个人中心 - 设置”完成认证，再使用自定义表态。",
        false,
      );
      return;
    }

    const commentId = target.commentId;
    const job = (this.writeQueues.get(commentId) ?? Promise.resolve())
      .then(() => this.sendWrite(target, attitudeType, authKey))
      .catch((error) => console.warn("[Mcmodder] 自定义表态写入失败：", error));
    this.writeQueues.set(commentId, job);
    return job.then((attitudeRecord) => {
      // 排空后清理，避免 Map 无限增长
      if (this.writeQueues.get(commentId) === job) this.writeQueues.delete(commentId);
      return attitudeRecord;
    });
  }

  private async sendWrite(target: AttitudeTarget, attitudeType: string, authKey: string) {
    const resp = await this.parent.supabaseUtils.putAttitude({
      authKey,
      commentId: target.commentId,
      attitudeType,
      toUid: target.toUid,
      toUsername: target.toUsername,
      fromAvatar: this.configs.getProfile("avatar") ?? "",
      commentText: target.commentText,
      sourceUrl: target.sourceUrl,
    });
    if (!resp) return;
    const record: AttitudeRecord = { counts: resp.counts ?? {}, mine: resp.mine ?? [] };
    this.countsCache.set(target.commentId, { time: Date.now(), record });
    this.renderRow($(target.row), record);
    return record;
  }
}
