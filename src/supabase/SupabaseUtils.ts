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
      const errorMsg = (data as SupabaseErrorResponse)?.error ?? String(error);
      if (onErrorCallback) {
        onErrorCallback(errorMsg);
      } else {
        Utils.commonMsg(errorMsg, false);
      }
      return;
    }
    return data as SupabaseSuccessfulResponse;
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
   * 读取一批短评的自定义表态聚合计数（公开读，未认证也可调用）。
   *
   * @param commentIds 短评 id 字符串列表（站点以文本存储 id）。
   * @param authKey 可选的云端认证 key；提供时额外返回 `mine`（我点过哪些类型）。
   * @param onErrorCallback 出错时的提示回调；缺省走 `Utils.commonMsg`。
   */
  async fetchAttitudeCounts(
    commentIds: string[],
    authKey?: string,
    onErrorCallback?: (error: string) => void,
  ) {
    return await this.invoke<SupabaseAttitudeCountsResponse>(
      "attitude-counts",
      { body: { comment_ids: commentIds, auth_key: authKey } },
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
   * 读取我上传的表态贴纸与今日上传额度（`attitude-sticker` 的 `list`）。
   *
   * `onError` 用于后台调用（选择面板打开时预取）自行消化错误，避免弹出模态框。
   */
  async fetchAttitudeStickers(authKey: string, onError?: (error: string) => void) {
    return await this.invoke<SupabaseAttitudeStickerListResponse>(
      "attitude-sticker",
      { body: { action: "list", auth_key: authKey } },
      onError,
    );
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

  /** 按 id 批量解析表态贴纸的图片地址（公开读，无需认证；贴纸不可变，客户端可长期缓存） */
  async resolveAttitudeStickers(ids: number[], onError?: (error: string) => void) {
    return await this.invoke<SupabaseAttitudeStickerResolveResponse>(
      "attitude-sticker",
      { body: { action: "resolve", ids } },
      onError,
    );
  }

  /**
   * 读取表态消息中心的列表（`list`）或统计（`stats`），仅返回 `auth_key` 对应的本人数据。
   *
   * `options.onError` 用于后台调用（页头提醒、消息中心徽标）自行消化错误，避免弹出模态框。
   */
  async fetchAttitudeInbox(
    authKey: string,
    action: "list",
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      onError?: (error: string) => void;
    },
  ): Promise<SupabaseAttitudeInboxListResponse | undefined>;
  async fetchAttitudeInbox(
    authKey: string,
    action: "stats",
    options?: { onError?: (error: string) => void },
  ): Promise<SupabaseAttitudeStatsResponse | undefined>;
  async fetchAttitudeInbox(
    authKey: string,
    action: "list" | "stats",
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      onError?: (error: string) => void;
    } = {},
  ): Promise<SupabaseAttitudeInboxListResponse | SupabaseAttitudeStatsResponse | undefined> {
    const { onError, ...body } = options;
    return await this.invoke<SupabaseAttitudeInboxListResponse | SupabaseAttitudeStatsResponse>(
      "attitude-inbox",
      { body: { auth_key: authKey, action, ...body } },
      onError,
    );
  }

  /** 把指定表态记录标记为已读（仅限本人收到的记录） */
  async markAttitudesRead(authKey: string, ids: number[]) {
    return await this.invoke<SupabaseAttitudeReadResponse>("attitude-inbox", {
      body: { auth_key: authKey, action: "read", ids },
    });
  }

  /** 增量读取「上次确认（`sinceId`）之后」的新表态数量与最新记录 id（不返回消息明细） */
  async checkNewAttitudes(authKey: string, sinceId: number, onError?: (error: string) => void) {
    return await this.invoke<SupabaseAttitudeCheckResponse>(
      "attitude-inbox",
      { body: { auth_key: authKey, action: "check", since_id: sinceId } },
      onError,
    );
  }

  /** 把我的全部未读表态标记为已读（页头铃铛用） */
  async markAllAttitudesRead(authKey: string) {
    return await this.invoke<SupabaseAttitudeReadResponse>("attitude-inbox", {
      body: { auth_key: authKey, action: "read" },
    });
  }
}
