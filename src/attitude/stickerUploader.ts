import type { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";

/** 贴纸上传者的展示资料：从个人中心主页爬取，仅用于前端展示 */
export interface StickerUploaderProfile {
  nickname?: string;
  avatar?: string;
}

/** uid -> 已成功解析的资料；失败不缓存，下次选中可重试 */
const cache = new Map<number, StickerUploaderProfile>();
/** uid -> 进行中的请求，避免同一上传者的并发重复请求 */
const pending = new Map<number, Promise<StickerUploaderProfile>>();

/**
 * 读取上传者的当前昵称与头像。
 *
 * 云端 `users` 表只有注册名（`user_name`），个人中心主页的 `meta[name=keywords]`
 * 与 `.user-icon-img img` 才是用户当前昵称与头像，故这里按需爬取一次并缓存。
 */
export function getStickerUploader(parent: Mcmodder, uid: number): Promise<StickerUploaderProfile> {
  if (!Number.isInteger(uid) || uid <= 0) return Promise.resolve({});

  // 自己的资料本地已有，不必再爬一次；只认当前昵称，避免退回注册名
  if (uid === parent.currentUID) {
    const nickname = parent.configRepository.getProfile("nickname");
    const avatar = parent.configRepository.getProfile("avatar");
    if (nickname) return Promise.resolve({ nickname, avatar });
  }

  const cached = cache.get(uid);
  if (cached) return Promise.resolve(cached);
  const running = pending.get(uid);
  if (running) return running;

  const request = Promise.race([
    fetchStickerUploader(parent, uid),
    // `createRequest` 只在 onload 时 resolve；网络层错误不会回调，这里兜底避免详情一直停在“加载中”
    new Promise<StickerUploaderProfile>((resolve) => {
      window.setTimeout(() => resolve({}), 15_000);
    }),
  ])
    .then((profile) => {
      if (profile.nickname || profile.avatar) cache.set(uid, profile);
      return profile;
    })
    .finally(() => pending.delete(uid));
  pending.set(uid, request);
  return request;
}

async function fetchStickerUploader(
  parent: Mcmodder,
  uid: number,
): Promise<StickerUploaderProfile> {
  try {
    const resp = await parent.utils.createRequest(
      {
        url: Utils.getCenterURL(uid),
        method: "GET",
      },
      "上传者资料",
    );
    const doc = new DOMParser().parseFromString(resp.responseText ?? "", "text/html");
    const keywords = doc.querySelector('meta[name="keywords"]')?.getAttribute("content") ?? "";
    const image = doc.querySelector<HTMLImageElement>(".user-icon-img img");
    const nickname =
      image?.alt.trim() ||
      keywords.split(",")[0]?.trim() ||
      (doc.title.includes("的主页") ? doc.title.split("的主页")[0]?.trim() : "") ||
      undefined;
    const rawAvatar = image?.getAttribute("src") ?? undefined;
    const avatar = rawAvatar?.startsWith("//") ? `https:${rawAvatar}` : rawAvatar;
    return { nickname, avatar };
  } catch (error) {
    console.warn("[Mcmodder] 上传者资料获取失败：", uid, error);
    return {};
  }
}
