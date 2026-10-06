import {
  createClient,
  type FunctionInvokeOptions,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import type { ConfigRepository } from "../config/ConfigRepository";

export class SupabaseUtils {
  private static readonly supabaseUrl = "https://kjghwgrbawdtatyrrxin.supabase.co";
  private static readonly supabaseKey = "sb_publishable_yQ4SlDDDQ8OE8tgbnLrkNw_deH9GSjd";

  private readonly configs: ConfigRepository;
  private readonly instance: SupabaseClient | null;

  constructor(parent: Mcmodder) {
    this.configs = parent.configRepository;

    if (!this.configs.getSettings("useSupabase")) {
      this.instance = null;
    } else
      try {
        this.instance = createClient(SupabaseUtils.supabaseUrl, SupabaseUtils.supabaseKey, {
          auth: {
            persistSession: false,
          },
        });
      } catch (e) {
        console.warn("Failed to create Supabase client: ", e);
        this.instance = null;
      }
  }

  getClient() {
    return this.instance;
  }

  hasClient() {
    return !!this.instance;
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
   * 读取我上传的表态贴纸（RPC `mcmodder_attitude_sticker_list`）。
   *
   * `onError` 用于后台调用（选择面板打开时预取）自行消化错误，避免弹出模态框。
   */
  async fetchAttitudeStickers(authKey: string, onError?: (error: string) => void) {
    return await this.rpc<SupabaseAttitudeSticker>(
      "mcmodder_attitude_sticker_list",
      { p_auth_key: authKey },
      onError,
    );
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
