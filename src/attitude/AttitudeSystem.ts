import { createApp, nextTick } from "vue";
import type { App } from "vue";
import type { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";
import AttitudePicker from "../vue/components/attitude/AttitudePicker.vue";
import {
  buildAttitudeIcon,
  buildStickerType,
  fillStickerIcon,
  parseStickerId,
} from "./attitudeIcon";
import { attitudePickerState, clampAttitudePanelPosition } from "./AttitudePickerState";

/** 一条短评的自定义表态聚合结果 */
export interface AttitudeRecord {
  /** `attitude_type` → 数量 */
  counts: AttitudeCounts;
  /** 我点过的 `attitude_type`；未认证时为空 */
  mine: string[];
}

/** 我收到的表态统计（页头提醒、消息中心徽标与合计行共用） */
export interface AttitudeStats {
  /** 未读条数 */
  unread: number;
  /** 我收到的表态总条数 */
  total: number;
}

/** 写一条表态所需的短评上下文 */
export interface AttitudeTarget {
  commentId: string;
  toUid: number;
  toUsername: string;
  commentText: string;
  sourceUrl: string;
  /** 顶层短评节点（`.comment-row`） */
  row: HTMLElement;
}

/**
 * 自定义表态系统：纯 DOM 编排 + 云端读写。
 *
 * - **注入**：在站点渲染了原生表态候选列表的顶层短评工具条（`.comment-tools`）末尾追加自定义表态
 *   按钮与结果条；站点原生的单表态逻辑与事件委托不受影响（两套类名完全隔离）。
 * - **计数**：短评计数走 `attitude-counts`，按 TTL 缓存，缺失部分合并成一次去抖请求；
 *   写操作（`attitude-put`）成功后用服务端返回的最新计数就地刷新。
 * - **多表态**：同一用户对同一短评可按类型并存多种表态；点击已表态的类型即取消。
 *
 * 全站单例：短评页与消息中心共用同一份缓存与去抖通道，经 {@link AttitudeSystem.for} 获取。
 */
export class AttitudeSystem {
  private static instance?: AttitudeSystem;

  private readonly countsCache = new Map<string, { time: number; record: AttitudeRecord }>();
  private readonly busyCommentIds = new Set<string>();
  private pendingCommentIds = new Set<string>();
  private pendingResolvers: ((records: Map<string, AttitudeRecord>) => void)[] = [];
  private flushTimer?: number;
  private eventsBound = false;
  private pickerApp?: App;

  /** 我上传的贴纸与今日上传额度（`attitude-sticker` 的 `list` 结果，TTL 内复用） */
  private myStickers?: {
    time: number;
    stickers: SupabaseAttitudeSticker[];
    quota?: SupabaseAttitudeStickerQuota;
  };
  /** `sticker:<id>` → 贴纸记录（贴纸不可变，命中即长期有效） */
  private readonly stickerCache = new Map<string, SupabaseAttitudeSticker>();
  /** 服务端明确答复「不存在」的贴纸 id：避免反复请求，也用于区分「未解析完」与「确实缺失」 */
  private readonly missingStickerIds = new Set<number>();
  private pendingStickerTypes = new Set<string>();
  private pendingStickerResolvers: ((stickers: Map<string, SupabaseAttitudeSticker>) => void)[] =
    [];
  private stickerFlushTimer?: number;

  /** 获取全站单例（组合根：首个使用方传入 `Mcmodder`） */
  static for(parent: Mcmodder) {
    return (AttitudeSystem.instance ??= new AttitudeSystem(parent));
  }

  private constructor(private readonly parent: Mcmodder) {}

  private get configs() {
    return this.parent.configRepository;
  }

  /** 功能是否可用：配置开启且云端客户端存在（`useSupabase` 关闭时整套静默停用） */
  get enabled() {
    return !!this.configs.getSettings("customAttitude") && this.parent.supabaseUtils.hasClient();
  }

  /** 当前账号的云端认证 key；未认证时为空字符串 */
  getAuthKey() {
    return this.configs.getProfile("auth_key") ?? "";
  }

  /** 最近使用的 emoji（本机维度存储，解析失败按空列表处理） */
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
   * 我收到的表态统计（未读数供页头提醒与消息中心徽标共用）。
   *
   * 命中 `Values.attitude.unreadCacheTtl` 内的 GM 缓存直接返回，避免每个页面都请求云端；
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
    // 后台提醒用：失败只记录日志，不弹模态框打断用户
    const resp = await this.parent.supabaseUtils.fetchAttitudeInbox(authKey, "stats", {
      onError: (error) => console.warn("[Mcmodder] 表态消息统计获取失败：", error),
    });
    if (!resp) return cached && { unread: cached.unread, total: cached.total };
    const stats = { unread: resp.unread ?? 0, total: resp.total ?? 0 };
    this.writeUnreadCache(stats);
    return stats;
  }

  /**
   * 未确认的新表态数量（页头红点用）。
   *
   * 只请求 `since_id`（上次确认位置）之后的增量，不返回消息明细；数量在 {@link acknowledgeNew}
   * 之前不会归零，因此消息中心自动标记已读不会让红点提前消失。每个页面只在进入时调用一次
   * （不做轮询），{@link Values.attitude.remindCacheTtl} 内的结果直接复用，避免连续开页重复请求。
   *
   * @returns 新表态数量；功能关闭 / 未认证时为 0，请求失败且无缓存时为 undefined。
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

    // 请求期间若已确认提醒（打开消息中心 / 点铃铛），本次结果已过期，丢弃以免红点被重新点亮
    if ((this.configs.get("attitudeCache", "lastSeenId") ?? 0) !== sinceId)
      return this.configs.get("attitudeCache", "checkedCount") ?? 0;

    const count = resp.count ?? 0;
    this.configs.set("attitudeCache", "checkedAt", Date.now());
    this.configs.set("attitudeCache", "checkedCount", count);
    this.configs.set("attitudeCache", "latestId", resp.latest_id ?? 0);
    return count;
  }

  /** 最近一次检查得到的未确认表态数（不发请求；站点自身刷新消息数时叠加它） */
  getCachedNewCount() {
    if (!this.enabled || !this.getAuthKey()) return 0;
    return this.configs.get("attitudeCache", "checkedCount") ?? 0;
  }

  /**
   * 确认已看到全部表态提醒（打开消息中心 / 点击铃铛时调用），红点随之归零。
   *
   * 确认位置总是写成「当前最新记录 id」：刚检查过就直接复用缓存（不重复请求），否则现取一次，
   * 以免把「刚到达但尚未检查过」的提醒一并吞掉。
   */
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
    // 从未成功取到最新记录 id 时不推进确认位置：宁可让红点多留一会儿，
    // 也不能把它写成 0（那会让下一次检查重新数出全部历史记录，红点反而消不掉）
    if (!latestId) return;
    this.configs.set("attitudeCache", "latestId", latestId);
    this.configs.set("attitudeCache", "lastSeenId", latestId);
    this.configs.set("attitudeCache", "checkedCount", 0);
    this.configs.set("attitudeCache", "checkedAt", Date.now());
  }

  /** 把我的全部未读表态标记为已读，并同步本地未读缓存（页头铃铛点击时调用） */
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

  /**
   * 读取若干短评的自定义表态计数。
   *
   * 命中缓存（{@link Values.attitude.countsCacheTtl}）的短评直接返回；其余合并进同一个去抖窗口，
   * 由 {@link flushCounts} 一次性请求。请求失败的短评不会进入缓存，也不会出现在返回值里。
   */
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

  /**
   * 把一批缺失缓存的短评并入去抖窗口（窗口内的多次调用只发一次请求）。
   *
   * 计时器只在窗口开启时排期一次：若每个调用都重排计时器，突发持续的调用会把请求无限推迟。
   */
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
    for (let i = 0; i < commentIds.length; i += Values.attitude.maxCountsPerRequest) {
      const chunk = commentIds.slice(i, i + Values.attitude.maxCountsPerRequest);
      // 后台批量读：失败只记录日志，不弹模态框打断用户
      const resp = await this.parent.supabaseUtils.fetchAttitudeCounts(chunk, authKey, (error) =>
        console.warn("[Mcmodder] 自定义表态计数获取失败：", error),
      );
      if (!resp) continue;
      for (const commentId of chunk) {
        const record: AttitudeRecord = {
          counts: resp.counts?.[commentId] ?? {},
          mine: resp.mine?.[commentId] ?? [],
        };
        this.countsCache.set(commentId, { time: Date.now(), record });
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
    // 面板打开时的预取：失败只记录日志，不弹模态框打断用户
    const resp = await this.parent.supabaseUtils.fetchAttitudeStickers(authKey, (error) =>
      console.warn("[Mcmodder] 表态贴纸列表获取失败：", error),
    );
    if (!resp) return cached && { stickers: cached.stickers, quota: cached.quota };

    const stored = this.storeStickers(resp.stickers ?? [], resp.quota);
    return { stickers: stored.stickers, quota: stored.quota };
  }

  /** 写入贴纸列表缓存（列表里的贴纸同时进入解析缓存，随后渲染无需再解析） */
  private storeStickers(stickers: SupabaseAttitudeSticker[], quota?: SupabaseAttitudeStickerQuota) {
    for (const sticker of stickers) {
      this.stickerCache.set(buildStickerType(sticker.id), sticker);
    }
    this.myStickers = { time: Date.now(), stickers, quota: quota ?? this.myStickers?.quota };
    return this.myStickers;
  }

  /**
   * 上传一张本地图片作为表态贴纸：先传百科图床，再把图片地址登记到云端，返回可用的表态类型。
   *
   * 失败时以 `Utils.commonMsg` 提示（非图片、体积超限、图床拒绝、今日额度用尽等）并返回 undefined；
   * 成功后的表态类型为 `sticker:<新贴纸 id>`，可直接交给 {@link write} 使用。
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
    // 登记失败（额度用尽 / 网络异常）时刷新一次列表：错误提示由 `invoke` 给出
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
   * 把本地图片传到百科图床（站点 UEditor 的图片上传接口），返回图片地址。
   *
   * 请求体与站点前端一致（`upfile` + `type=ajax`，multipart 边界由 GM 请求自行生成）；
   * 跨站也走 `GM_xmlhttpRequest`，站点登录 cookie 由浏览器按目标域名带上，故不在页面内直传。
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
      // 图床异常响应（登录失效返回 HTML 报错页等）会走到这里，原始错误留在控制台便于排查
      console.warn("[Mcmodder] 表态贴纸上传失败：", error);
      Utils.commonMsg("图片上传失败，请稍后再试。", false);
      return undefined;
    }
  }

  /**
   * 解析一批表态类型里的贴纸：返回 `sticker:<id>` → 贴纸记录（渲染图片与展示名称用）。
   *
   * 贴纸不可变，命中缓存的立即返回；其余合并进同一个去抖窗口，由 {@link flushStickers} 一次性请求。
   * 解析失败的贴纸不写入缓存，也不出现在返回值里（调用方按缺失降级渲染）。
   */
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

  /** 把一批缺失缓存的贴纸并入去抖窗口（窗口内的多次调用只发一次请求，与计数同款做法） */
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
      // 后台批量解析：失败只记录日志，不弹模态框打断用户
      const resp = await this.parent.supabaseUtils.resolveAttitudeStickers(ids, (error) =>
        console.warn("[Mcmodder] 表态贴纸解析失败：", error),
      );
      if (!resp) continue;
      const unanswered = new Set(ids);
      for (const sticker of resp.stickers ?? []) {
        const attitudeType = buildStickerType(sticker.id);
        this.stickerCache.set(attitudeType, sticker);
        result.set(attitudeType, sticker);
        unanswered.delete(sticker.id);
      }
      // 服务端明确答复里没有的 id 记为缺失：占位块走降级样式，且不再重复请求
      unanswered.forEach((id) => this.missingStickerIds.add(id));
    }
    resolvers.forEach((resolve) => resolve(result));
  }

  /**
   * 把一批已渲染的贴纸占位节点（`[data-mcmodder-sticker-id]`）填上图片与名称。
   *
   * 渲染路径因此不必等待网络：图标先以占位形态出现，解析完成后补上背景图；解析失败的贴纸
   * 标上 `data-mcmodder-sticker-failed` 走降级样式，不再反复请求。
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
          // 仅「服务端明确答复不存在」才降级；请求失败时保留占位，等下次渲染再试
          $icon.attr("data-mcmodder-sticker-failed", "1");
        }
      });
  }

  /** 绑定工具条点击与原生表态列表的悬停补注入（全站一次即可；自绘元素与站点原生选择器完全隔离） */
  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("mouseover", this.onDocumentMouseOver);
  }

  /**
   * 鼠标进入站点原生表态列表时补注入恶魔安格瑞。
   *
   * 站点在首次悬停时才显示该列表（并可能整体重绘），故除了渲染时注入一次，这里再兜一次底。
   */
  private readonly onDocumentMouseOver = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const $list = $(target).closest(".comment-tools li.comment-attitude-list");
    if (!$list.length) return;
    const $tools = $list.closest(".comment-tools");
    if ($tools.length) this.injectNativeDevilAngry($tools);
  };

  private readonly onDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("a.mcmodder-attitude-button");
    if (button) {
      event.preventDefault();
      const resolved = this.resolveTarget($(button).closest(".comment-row"));
      if (resolved) void this.handleButtonClick(button, resolved);
      return;
    }

    const value = target.closest("a[data-mcmodder-attitude]");
    if (value) {
      event.preventDefault();
      const resolved = this.resolveTarget($(value).closest(".comment-row"));
      const attitudeType = value.getAttribute("data-mcmodder-attitude");
      if (resolved && attitudeType) void this.write(resolved, attitudeType);
    }
  };

  /** 点击表态按钮：同一短评再次点击即关闭，否则读取该短评计数后打开面板 */
  private async handleButtonClick(anchor: Element, target: AttitudeTarget) {
    if (attitudePickerState.visible && attitudePickerState.commentId === target.commentId) {
      attitudePickerState.visible = false;
      return;
    }
    const records = await this.requestCounts([target.commentId]);
    await this.openPicker(anchor, target, records.get(target.commentId));
  }

  /** 打开选择面板：先按按钮位置渲染，再按面板实际尺寸夹取到视口内 */
  private async openPicker(
    anchor: Element,
    target: AttitudeTarget,
    record: AttitudeRecord | undefined,
  ) {
    if (!this.pickerApp) {
      const host = document.createElement("div");
      host.id = "mcmodder-attitude-panel-host";
      document.body.append(host);
      this.pickerApp = createApp(AttitudePicker, { store: attitudePickerState });
      this.pickerApp.mount(host);
    }

    const rect = anchor.getBoundingClientRect();
    attitudePickerState.commentId = target.commentId;
    attitudePickerState.active = record?.mine ?? [];
    const recents = this.getRecentEmojis();
    attitudePickerState.recents = recents;
    // 最近使用里的贴纸要先解析出图片地址：面板同步渲染，解析完成后补上（不阻塞打开）
    attitudePickerState.stickerUrls = {};
    void this.resolveStickers(recents).then((stickers) => {
      attitudePickerState.stickerUrls = Object.fromEntries(
        [...stickers].map(([attitudeType, sticker]) => [attitudeType, sticker.image_url]),
      );
    });
    // 我的贴纸：先用缓存渲染，再后台刷新列表与今日额度
    attitudePickerState.stickers = this.myStickers?.stickers ?? [];
    attitudePickerState.stickerQuota = this.myStickers?.quota ?? null;
    attitudePickerState.stickerLoading = true;
    void this.listMyStickers().then((data) => {
      if (data) {
        attitudePickerState.stickers = data.stickers;
        attitudePickerState.stickerQuota = data.quota ?? null;
      }
      attitudePickerState.stickerLoading = false;
    });
    attitudePickerState.onUpload = async (file) => {
      const attitudeType = await this.uploadSticker(file);
      attitudePickerState.stickers = this.myStickers?.stickers ?? attitudePickerState.stickers;
      attitudePickerState.stickerQuota = this.myStickers?.quota ?? attitudePickerState.stickerQuota;
      // 上传后面板仍停在同一条短评上就直接用它表态（否则只加入「我的贴纸」）
      if (
        attitudeType &&
        attitudePickerState.visible &&
        attitudePickerState.commentId === target.commentId
      ) {
        attitudePickerState.onPick(attitudeType);
      }
    };
    attitudePickerState.onPick = (attitudeType) => {
      attitudePickerState.visible = false;
      this.rememberRecentEmoji(attitudeType);
      void this.write(target, attitudeType);
    };
    attitudePickerState.onClose = () => {
      attitudePickerState.visible = false;
    };
    attitudePickerState.left = rect.left;
    attitudePickerState.top = rect.bottom + 6;
    attitudePickerState.visible = true;

    await nextTick();
    clampAttitudePanelPosition();
  }

  private rememberRecentEmoji(attitudeType: string) {
    if (attitudeType === Values.attitude.devilAngry.type) return;
    const recents = this.getRecentEmojis().filter((emoji) => emoji !== attitudeType);
    recents.unshift(attitudeType);
    this.configs.setSettings(
      "attitudeRecentEmojis",
      JSON.stringify(recents.slice(0, Values.attitude.recentEmojisLimit)),
    );
  }

  /**
   * 给一批新插入的短评注入自定义表态入口，并统一刷新这批短评的计数。
   *
   * 仅处理站点渲染了原生表态候选列表（`.comment-attitude-list`，即「已登录 + 非作者」）的顶层短评；
   * 其余场景（未登录、自己的短评、楼中楼）站点本身也不允许表态。
   */
  async processCommentRows($context: JQuery) {
    if (!this.enabled) return;
    const rows: { $row: JQuery; target: AttitudeTarget }[] = [];
    $context.find(".comment-row").each((_, row) => {
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
   * 它不是 emoji，故与原生 12 项并列显示，而不是放进 emoji 面板。站点对 `.comment-attitude`
   * 有 document 事件委托（命中即发原生单表态请求），故这里用自绘类名承接点击。
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
  private resolveTarget($row: JQuery): AttitudeTarget | undefined {
    // jQuery 的 `.get()` 只会给出 `Element`；`.comment-row` 实际是 `<div>`，这里按已知的宿主结构收窄
    const row = $row.get(0) as HTMLElement | undefined;
    if (!row) return undefined;
    const $tools = $row.find(".comment-tools").first();
    const commentId = String($tools.find("input.comment-id").first().val() ?? "");
    if (!commentId) return undefined;

    const $author = $row.find(".comment-row-username a.poped").first();
    const toUid = Number($author.attr("data-uid"));
    if (!toUid || toUid === this.parent.currentUID) return undefined;

    return {
      commentId,
      toUid,
      toUsername: $author.text().trim(),
      commentText: $row.find(".comment-row-text-content").first().text().trim(),
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
    Object.keys(record.counts)
      .filter((attitudeType) => (record.counts[attitudeType] ?? 0) > 0 || mine.has(attitudeType))
      .sort((a, b) => (record.counts[b] ?? 0) - (record.counts[a] ?? 0) || a.localeCompare(b))
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

    // 结果条里的贴纸先以占位形态渲染，图片地址解析完成后补上
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
   * 添加 / 取消一条表态（服务端按 `(短评, 我, 类型)` 存在性切换），成功后就地刷新结果条。
   *
   * 不做乐观计数：以服务端返回的最新计数为准；同一短评的写操作排队执行，避免连点竞态。
   */
  async write(target: AttitudeTarget, attitudeType: string) {
    if (!this.enabled || this.busyCommentIds.has(target.commentId)) return;
    const authKey = this.getAuthKey();
    if (!authKey) {
      Utils.commonMsg(
        "尚未完成云端认证，请先到“个人中心 - 设置”完成认证，再使用自定义表态。",
        false,
      );
      return;
    }

    this.busyCommentIds.add(target.commentId);
    attitudePickerState.visible = false;
    try {
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
    } finally {
      this.busyCommentIds.delete(target.commentId);
    }
  }
}
