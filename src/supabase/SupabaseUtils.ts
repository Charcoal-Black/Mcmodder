import type { FunctionInvokeOptions, SupabaseClient } from "@supabase/supabase-js";
import { monkeyWindow, unsafeWindow } from "$";
import { watch, type ComputedRef } from "vue";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import type { ConfigRepository } from "../config/ConfigRepository";

type SupabaseSdk = Pick<typeof import("@supabase/supabase-js"), "createClient">;

export class SupabaseUtils {
  private static readonly supabaseUrl = "https://kjghwgrbawdtatyrrxin.supabase.co";
  private static readonly supabaseKey = "sb_publishable_yQ4SlDDDQ8OE8tgbnLrkNw_deH9GSjd";
  private static readonly fallbackSources = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
  ];
  private static preparing: Promise<void> | undefined;

  /** @require 位于油猴沙箱，动态 script 位于页面；开发模式也可能处于不同 realm。 */
  private static getSdk() {
    for (const scope of [globalThis, monkeyWindow, unsafeWindow]) {
      const sdk = (scope as { supabase?: SupabaseSdk } | undefined)?.supabase;
      if (typeof sdk?.createClient === "function") return sdk;
    }
  }

  /** 只在 @require 缺失时尝试备用源；全部失败也允许本地功能继续启动。 */
  static async prepare() {
    if (this.getSdk()) return;
    const preparing = (this.preparing ??= this.loadFallback());
    try {
      await preparing;
    } finally {
      if (this.preparing === preparing) this.preparing = undefined;
    }
  }

  private static async loadFallback() {
    for (const src of this.fallbackSources) {
      try {
        await Utils.loadScript(
          document.head ?? document.documentElement,
          null,
          src,
          null,
          undefined,
          5000,
        );
        if (this.getSdk()) return;
        throw new Error("脚本加载后未找到 Supabase SDK");
      } catch (error) {
        console.warn("Supabase 备用源加载失败：", src, error);
      }
    }
    console.warn("Supabase 依赖不可用，本页云端功能已停用，本地功能继续运行。");
  }

  private readonly configs: ConfigRepository;
  /** 云端客户端实例；随「启用云端服务」配置的开合而创建/释放 */
  private instance: SupabaseClient | null = null;
  /** 「启用云端服务」配置的响应式引用（`mcmodderSettings` 是可缓存键，故可响应式读取） */
  private readonly useSupabaseRef: ComputedRef<boolean | undefined>;
  /** 上一次创建客户端是否失败；失败后不反复重试，除非配置再次变化 */
  private createFailed = false;

  constructor(parent: Mcmodder) {
    this.configs = parent.configRepository;
    this.useSupabaseRef = this.configs.getSettingsRef("useSupabase");

    // 初始化时若已开启云端服务，立刻创建客户端
    this.syncInstance();

    // 开启云端服务时按需补齐依赖；关闭时立即释放引用
    watch(this.useSupabaseRef, async () => {
      if (this.isEnabled()) await SupabaseUtils.prepare();
      this.syncInstance(true);
    });
  }

  /** 当前是否启用了云端服务（取响应式配置的即时快照） */
  private isEnabled() {
    return !!this.useSupabaseRef.value;
  }

  /**
   * 依据「启用云端服务」配置同步客户端实例。
   *
   * @param retry 是否允许在先前创建失败后重试（配置发生变化时传入 true）。
   */
  private syncInstance(retry = false) {
    if (!this.isEnabled()) {
      this.instance = null;
      this.createFailed = false;
      return;
    }
    if (this.instance) return;
    if (this.createFailed && !retry) return;
    const sdk = SupabaseUtils.getSdk();
    if (!sdk) {
      this.createFailed = true;
      return;
    }
    try {
      this.instance = sdk.createClient(SupabaseUtils.supabaseUrl, SupabaseUtils.supabaseKey, {
        auth: {
          persistSession: false,
        },
      });
      this.createFailed = false;
    } catch (e) {
      console.warn("Failed to create Supabase client: ", e);
      this.instance = null;
      this.createFailed = true;
    }
  }

  getClient() {
    // `watch` 回调是异步触发的，此处补一次同步，依赖就绪时保证配置即时生效
    this.syncInstance();
    return this.instance;
  }

  hasClient() {
    return !!this.getClient();
  }

  async invoke<SupabaseSuccessfulResponse extends object>(
    functionName: string,
    options?: FunctionInvokeOptions,
    onErrorCallback?: (error: string) => void,
  ) {
    const client = this.getClient();
    if (!client) {
      return;
    }
    const { data, error } = await client.functions.invoke<
      SupabaseSuccessfulResponse | SupabaseErrorResponse
    >(functionName, options);
    if (error || (data as SupabaseErrorResponse)?.error) {
      this.reportError((data as SupabaseErrorResponse)?.error ?? String(error), onErrorCallback);
      return;
    }
    return data as SupabaseSuccessfulResponse;
  }

  /**
   * 调用 PostgREST RPC（`/rest/v1/rpc/<name>`）。
   *
   * 表态的读操作走这里而不是 Edge Function：Edge Function 调用按次计费（免费档有月度额度），
   * REST 请求不计费。服务端函数一律返回行集合，因此结果固定为对象数组；**行序有语义**
   * （如计数的「各类别首次表态的时间序」），调用方按行序构造展示顺序，勿重排。
   */
  async rpc<Row extends object>(
    functionName: string,
    args: Record<string, unknown>,
    onErrorCallback?: (error: string) => void,
  ) {
    const client = this.getClient();
    if (!client) {
      return;
    }
    const { data, error } = await client.rpc(functionName, args);
    if (error) {
      this.reportError(error.message || String(error), onErrorCallback);
      return;
    }
    return (data ?? []) as Row[];
  }

  /** Edge 调用与 RPC 共用的错误出口：有回调就交给调用方自行消化，否则弹提示 */
  private reportError(errorMsg: string, onErrorCallback?: (error: string) => void) {
    if (onErrorCallback) {
      onErrorCallback(errorMsg);
    } else {
      Utils.commonMsg(errorMsg, false);
    }
  }

  async uploadCustomSplash(content: string, authKey: string) {
    return await this.invoke<SupabaseUploadSplashResponse>("upload-splash", {
      body: {
        auth_key: authKey,
        content: content,
      },
    });
  }

  async fetchCustomSplashes(): Promise<SupabaseCustomSplash[] | undefined> {
    const res = await this.invoke<SupabaseGetCustomSplashesResponse>("get-custom-splashes");
    return res?.splashes;
  }

  /**
   * 读取一批短评的自定义表态聚合计数（RPC `mcmodder_attitude_counts`，公开读，未认证也可调用）。
   *
   * 返回的是行集合：行序即「各类别首次表态的时间序」，调用方据此同时构造 `counts` 与 `mine`。
   *
   * @param commentIds 短评 id 字符串列表（站点以文本存储 id）。
   * @param authKey 可选的云端认证 key；提供时行的 `mine` 标注我点过哪些类型。
   * @param onErrorCallback 出错时的提示回调；缺省走 `Utils.commonMsg`。
   */
  async fetchAttitudeCounts(
    commentIds: string[],
    authKey?: string,
    onErrorCallback?: (error: string) => void,
  ) {
    return await this.rpc<SupabaseAttitudeCountRow>(
      "mcmodder_attitude_counts",
      { p_comment_ids: commentIds, p_auth_key: authKey ?? null },
      onErrorCallback,
    );
  }

  /** 读取某个用户收到的自定义表态计数（RPC `mcmodder_attitude_user_counts`，公开读） */
  async fetchAttitudeUserCounts(uid: number, onErrorCallback?: (error: string) => void) {
    return await this.rpc<SupabaseAttitudeUserCountRow>(
      "mcmodder_attitude_user_counts",
      { p_uid: uid },
      onErrorCallback,
    );
  }

  /**
   * 写入 / 取消一条自定义表态，返回该短评的最新聚合计数。
   *
   * `attitudeType` 为字符串时按存在性切换（已存在则取消）；为 `null` 时取消我在该短评下的全部表态。
   */
  async putAttitude(payload: {
    authKey: string;
    commentId: string;
    attitudeType: string | null;
    toUid: number;
    toUsername: string;
    fromAvatar: string;
    commentText: string;
    sourceUrl: string;
  }) {
    return await this.invoke<SupabaseAttitudePutResponse>("attitude-put", {
      body: {
        auth_key: payload.authKey,
        comment_id: payload.commentId,
        attitude_type: payload.attitudeType,
        to_uid: payload.toUid,
        to_username: payload.toUsername,
        from_avatar: payload.fromAvatar,
        comment_text: payload.commentText,
        source_url: payload.sourceUrl,
      },
    });
  }

  /**
   * 读取“我的贴纸”集合（RPC `mcmodder_attitude_sticker_collection`）：
   * 我上传的贴纸 + 我收藏的贴纸，行序由服务端决定（我上传的在前）。
   *
   * `onError` 用于后台调用（选择面板打开时预取）自行消化错误，避免弹出模态框。
   */
  async fetchAttitudeStickerCollection(authKey: string, onError?: (error: string) => void) {
    return await this.rpc<SupabaseAttitudeSticker>(
      "mcmodder_attitude_sticker_collection",
      { p_auth_key: authKey },
      onError,
    );
  }

  /**
   * 读取贴纸广场的一页（RPC `mcmodder_attitude_sticker_plaza`，公开读）。
   *
   * `authKey` 只用于标注「我上传的 / 我收藏的」；未认证时传 `undefined`，列表照常返回。
   */
  async fetchAttitudeStickerPlaza(
    authKey: string | undefined,
    limit: number,
    offset: number,
    onError?: (error: string) => void,
  ) {
    return await this.rpc<SupabaseAttitudeStickerPlazaRow>(
      "mcmodder_attitude_sticker_plaza",
      { p_auth_key: authKey ?? null, p_limit: limit, p_offset: offset },
      onError,
    );
  }

  /** 共享 / 取消共享自己上传的贴纸（RPC `mcmodder_attitude_sticker_share`，幂等） */
  async shareAttitudeSticker(payload: { authKey: string; id: number; shared: boolean }) {
    const rows = await this.rpc<{ id: number; shared_at: string | null }>(
      "mcmodder_attitude_sticker_share",
      { p_auth_key: payload.authKey, p_id: payload.id, p_shared: payload.shared },
    );
    return rows?.[0];
  }

  /** 收藏 / 取消收藏他人上传的贴纸（RPC `mcmodder_attitude_sticker_favorite`，幂等） */
  async favoriteAttitudeSticker(payload: { authKey: string; id: number; favorite: boolean }) {
    const rows = await this.rpc<{ id: number; is_favorite: boolean }>(
      "mcmodder_attitude_sticker_favorite",
      { p_auth_key: payload.authKey, p_id: payload.id, p_favorite: payload.favorite },
    );
    return rows?.[0];
  }

  /** 读取今日贴纸额度（RPC `mcmodder_attitude_sticker_quota`，恒返回一行） */
  async fetchAttitudeStickerQuota(authKey: string, onError?: (error: string) => void) {
    const rows = await this.rpc<SupabaseAttitudeStickerQuotaRow>(
      "mcmodder_attitude_sticker_quota",
      { p_auth_key: authKey },
      onError,
    );
    return rows?.[0];
  }

  /** 登记一张已上传到百科图床的表态贴纸（`attitude-sticker` 的 `put`，服务端按自然日限额） */
  async putAttitudeSticker(payload: { authKey: string; imageUrl: string; name: string }) {
    return await this.invoke<SupabaseAttitudeStickerPutResponse>("attitude-sticker", {
      body: {
        action: "put",
        auth_key: payload.authKey,
        image_url: payload.imageUrl,
        name: payload.name,
      },
    });
  }

  /** 对表态贴纸重命名 */
  async renameAttitudeSticker(payload: { authKey: string; id: number; name: string }) {
    return await this.invoke<SupabaseAttitudeStickerPutResponse>("attitude-sticker", {
      body: {
        action: "rename",
        auth_key: payload.authKey,
        id: payload.id,
        name: payload.name,
      },
    });
  }

  /** 删除表态贴纸 */
  async deleteAttitudeSticker(payload: { authKey: string; id: number }) {
    return await this.invoke<SupabaseAttitudeStickerPutResponse>("attitude-sticker", {
      body: {
        action: "delete",
        auth_key: payload.authKey,
        id: payload.id,
      },
    });
  }

  /** 按 id 批量解析表态贴纸的图片地址（RPC `mcmodder_attitude_stickers_by_ids`，公开读；贴纸不可变，客户端可长期缓存） */
  async resolveAttitudeStickers(ids: number[], onError?: (error: string) => void) {
    return await this.rpc<SupabaseAttitudeSticker>(
      "mcmodder_attitude_stickers_by_ids",
      { p_ids: ids },
      onError,
    );
  }

  /**
   * 读取我收到的表态消息列表（RPC `mcmodder_attitude_inbox_list`）。
   *
   * `options.onError` 用于后台调用（页头提醒、消息中心徽标）自行消化错误，避免弹出模态框。
   */
  async fetchAttitudeInboxList(
    authKey: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      onError?: (error: string) => void;
    } = {},
  ) {
    const { limit, offset, unreadOnly, onError } = options;
    return await this.rpc<SupabaseAttitudeInboxListRow>(
      "mcmodder_attitude_inbox_list",
      {
        p_auth_key: authKey,
        p_limit: limit ?? null,
        p_offset: offset ?? null,
        p_unread_only: unreadOnly ?? false,
      },
      onError,
    );
  }

  /** 我收到的表态统计：未读条数与总条数（RPC `mcmodder_attitude_inbox_stats`，恒返回一行） */
  async fetchAttitudeInboxStats(authKey: string, onError?: (error: string) => void) {
    const rows = await this.rpc<SupabaseAttitudeStatsRow>(
      "mcmodder_attitude_inbox_stats",
      { p_auth_key: authKey },
      onError,
    );
    return rows?.[0];
  }

  /** 把指定表态记录标记为已读（RPC `mcmodder_attitude_inbox_read`，仅限本人收到的记录） */
  async markAttitudesRead(authKey: string, ids: number[]) {
    await this.rpc("mcmodder_attitude_inbox_read", { p_auth_key: authKey, p_ids: ids });
  }

  /** 增量读取「上次确认（`sinceId`）之后」的新表态数量与最新记录 id（不返回消息明细） */
  async checkNewAttitudes(authKey: string, sinceId: number, onError?: (error: string) => void) {
    const rows = await this.rpc<SupabaseAttitudeCheckRow>(
      "mcmodder_attitude_inbox_check",
      { p_auth_key: authKey, p_since_id: sinceId },
      onError,
    );
    return rows?.[0];
  }

  /** 把我的全部未读表态标记为已读（页头铃铛用） */
  async markAllAttitudesRead(authKey: string) {
    await this.rpc("mcmodder_attitude_inbox_read", { p_auth_key: authKey, p_ids: null });
  }
}
