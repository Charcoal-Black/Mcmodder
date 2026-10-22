import type { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";

/** 用户卡片资料：贴纸广场上传者与表态用户列表共用，仅用于前端展示 */
export interface StickerUploaderProfile {
  nickname?: string;
  avatar?: string;
}

/** uid -> 已成功解析的资料；失败不缓存，下次使用时可重试 */
const cache = new Map<number, StickerUploaderProfile>();
/** uid -> 进行中的请求，避免同一用户的并发重复请求 */
const pending = new Map<number, Promise<StickerUploaderProfile>>();

/**
 * 读取用户的当前昵称与头像（贴纸广场上传者与表态用户列表共用）。
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

  const timeout = Promise.withResolvers<StickerUploaderProfile>();
  window.setTimeout(() => timeout.resolve({}), 15_000);
  const request = Promise.race([
    fetchStickerUploader(parent, uid),
    // `createRequest` 只在 onload 时 resolve；网络层错误不会回调，这里兜底避免详情一直停在“加载中”
    timeout.promise,
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
        url: "https://www.mcmod.cn/object/UserCard/",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Host: "www.mcmod.cn",
          Origin: parent.hostname,
          Referer: window.location.href,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
        },
        data: $.param({ uid }),
        anonymous: true,
      },
      "用户资料",
    );
    const { username: nickname, avatar: rawAvatar } = JSON.parse(resp.responseText).data;
    const avatar = rawAvatar?.startsWith("//") ? `https:${rawAvatar}` : rawAvatar;
    return { nickname, avatar };
  } catch (error) {
    Utils.commonMsg(`试图获取用户资料 (UID:${uid}) 时遇到了问题... (${error})`);
    return {};
  }
}
