/**
 * 「假条目补齐」用到的素材与工具。
 *
 * 隐藏黑名单/表态类型后，消息列表会肉眼可见地变短。为了让数量看起来没少，
 * 这里生成与站点原生表态通知同构的假条目：系统默认昵称（`QQ酱` + 数字）、
 * 内置多配色的默认头像、从真实消息里借来的短评摘要。
 *
 * 全部在本地生成，不写云端、不发请求。
 */

/** 假昵称前缀（站点注册默认昵称的形态） */
const NICKNAME_PREFIX = "QQ酱";

import { DEFAULT_AVATARS } from "../assets/attitude/defaultAvatar";

/**
 * 随机取一张默认头像。
 *
 * 8 张变体随机，避免一批假条目头像全一样（那是最明显的破绽）。
 */
export function pickFakeAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}

/**
 * 生成一个系统默认昵称：`QQ酱` + 6 位数字。
 *
 * 数字位数与站点注册时的编号长度相当，避免出现 `QQ酱1` 这种一眼假的形态。
 */
export function buildDefaultNickname(): string {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `${NICKNAME_PREFIX}${suffix}`;
}

/**
 * 生成一条假消息的时间文本（与站点格式一致：`YYYY-MM-DD HH:mm:ss`）。
 *
 * 取最近 `maxMinutesAgo` 分钟内的随机时刻，避免总是同一个时间戳。
 */
export function buildFakeTimestamp(maxMinutesAgo = 180): string {
  const offsetMs = Math.floor(Math.random() * maxMinutesAgo * 60_000);
  const date = new Date(Date.now() - offsetMs);
  const pad = (part: number) => String(part).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * 从真实消息条目里收集短评摘要，作为假条目的文案池。
 *
 * 消息中心的表态通知里，`.content-reply > a` 就是被表态短评的摘要，
 * 直接借用这些真实文案最不容易看出来。
 *
 * @returns 去重后的文案数组（可能为空）。
 */
export function collectCommentSnippets(): string[] {
  const snippets = new Set<string>();
  $(".message-list > ul > li").each((_, li) => {
    const text = $(li).find(".content-reply > a").first().text().trim();
    if (text.length > 0) snippets.add(text);
  });
  return [...snippets];
}

/**
 * 「正面」表态类型：补齐假条目时优先用这些，让列表看起来是好消息。
 *
 * 刻意不含 `meh`（无语）、`down`（怠惰）、`angry`（安格瑞）、`tired`（难受）、
 * `heartbroken`（心碎）、`cry`（大哭）等负面或悲情类型。
 */
export const POSITIVE_ATTITUDE_TYPES = [
  "heart",
  "up",
  "grintears",
  "handshake",
  "snowflake",
  "lemon",
] as const;

/**
 * 为假条目挑一个表态类型。
 *
 * 优先从 {@link POSITIVE_ATTITUDE_TYPES} 里选**未被用户隐藏**的；
 * 若正面类型全被隐藏，退回其余未隐藏类型；仍为空时用 `heart` 兜底。
 *
 * @param hidden 用户在配置里勾选要隐藏的类型。
 */
export function pickFakeAttitudeType(hidden: string[]): string {
  const available = POSITIVE_ATTITUDE_TYPES.filter((type) => !hidden.includes(type));
  const pool =
    available.length > 0 ? available : POSITIVE_ATTITUDE_TYPES.filter(() => true).concat(); // 全被隐藏时仍用正面类型
  return pool[Math.floor(Math.random() * pool.length)];
}
