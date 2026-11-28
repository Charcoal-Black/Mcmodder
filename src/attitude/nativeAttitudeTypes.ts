/**
 * 站点原生表态类型（14 种）的查表。
 *
 * 站点的表态结果与表态通知只给出中文名（`title`）与 FontAwesome 图标类，
 * 不暴露 `data-type`，因此需要反查表把它们还原成脚本内部使用的类型标识。
 *
 * 数据来源：短评结果条 `<ol class="comment-attitude-result">` 的条目结构，例如
 * `<li title="无语"><a class="comment-attitude up" data-type="meh"><i class="fas fa-meh"></i></a></li>`。
 */
export interface NativeAttitudeType {
  /** 脚本内部使用的类型标识（与站点 `data-type` 一致） */
  type: string;
  /** 站点显示的中文名（`li` 的 `title`） */
  name: string;
  /** FontAwesome 图标类名（不含 `fa`/`fas` 前缀拼接，直接匹配 `class` 字符串里的片段） */
  iconClass: string;
}

/** 站点原生 14 种表态，顺序与站点展示一致 */
export const NATIVE_ATTITUDE_TYPES: readonly NativeAttitudeType[] = [
  { type: "up", name: "勤勉", iconClass: "fa-thumbs-up" },
  { type: "grintears", name: "欢乐", iconClass: "fa-grin-tears" },
  { type: "heart", name: "有爱", iconClass: "fa-heart" },
  { type: "flushed", name: "震惊", iconClass: "fa-flushed" },
  { type: "cry", name: "大哭", iconClass: "fa-sad-cry" },
  { type: "meh", name: "无语", iconClass: "fa-meh" },
  { type: "down", name: "怠惰", iconClass: "fa-thumbs-down" },
  { type: "lemon", name: "酸酸", iconClass: "fa-lemon" },
  { type: "horsehead", name: "疑问", iconClass: "fa-horse-head" },
  { type: "heartbroken", name: "心碎", iconClass: "fa-heart-broken" },
  { type: "angry", name: "安格瑞", iconClass: "fa-angry" },
  { type: "tired", name: "难受", iconClass: "fa-tired" },
  { type: "snowflake", name: "雪飘风萧", iconClass: "fa-snowflake" },
  { type: "handshake", name: "握爪", iconClass: "fa-handshake" },
];

/** 图标类 → 类型；`fa-heart` 是 `fa-heart-broken` 的前缀，匹配时取最长命中 */
const BY_ICON: readonly { iconClass: string; type: string }[] = [...NATIVE_ATTITUDE_TYPES]
  .map(({ iconClass, type }) => ({ iconClass, type }))
  .sort((a, b) => b.iconClass.length - a.iconClass.length);

/** 中文名 → 类型 */
const BY_NAME = new Map<string, string>(
  NATIVE_ATTITUDE_TYPES.map(({ name, type }) => [name, type]),
);

/**
 * 从元素的 `class` 字符串里反查表态类型。
 *
 * @param className 例如 `"fas fa-meh"`；命中 `fa-heart-broken` 时不会误判成 `fa-heart`。
 * @returns 未命中返回 `undefined`。
 */
export function attitudeTypeFromIconClass(className: string | undefined): string | undefined {
  if (!className) return undefined;
  return BY_ICON.find(({ iconClass }) => className.includes(iconClass))?.type;
}

/**
 * 从文本（中文名）反查表态类型。
 *
 * @param text 例如 `"无语"` 或包含该词的句子；匹配最长名字优先，避免子串误判。
 * @returns 未命中返回 `undefined`。
 */
export function attitudeTypeFromName(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  const exact = BY_NAME.get(trimmed);
  if (exact !== undefined) return exact;
  // 文本里嵌着名字（如「XX 表示很 无语」）：按名字长度从长到短找
  const names = [...BY_NAME.keys()].sort((a, b) => b.length - a.length);
  const hit = names.find((name) => trimmed.includes(name));
  return hit === undefined ? undefined : BY_NAME.get(hit);
}

/**
 * 宽松解析用户填写的表态类型。
 *
 * 配置说明里把中文名与标识并排展示（`meh`无语），用户很容易一起填进来，
 * 因此这里同时接受：`meh`、`无语`、`meh无语`、`无语meh` 等写法。
 *
 * @returns 规范化后的类型标识；无法识别返回 `undefined`。
 */
export function resolveAttitudeTypeInput(input: string): string | undefined {
  const text = input.trim();
  if (text === "") return undefined;

  // 1. 完全是类型标识或中文名
  const exact = NATIVE_ATTITUDE_TYPES.find((item) => item.type === text || item.name === text);
  if (exact !== undefined) return exact.type;

  // 2. 以 ASCII 标识开头（`meh无语`、`meh 无语`）
  const asciiPrefix = /^([a-z][a-z-]*)/i.exec(text)?.[1];
  if (asciiPrefix !== undefined) {
    const hit = NATIVE_ATTITUDE_TYPES.find((item) => item.type === asciiPrefix.toLowerCase());
    if (hit !== undefined) return hit.type;
  }

  // 3. 文本里含中文名（`无语meh`、`我要隐藏无语`）
  const byName = NATIVE_ATTITUDE_TYPES.find((item) => text.includes(item.name));
  return byName?.type;
}

/** 把配置里的原始文本解析成去重后的类型标识数组 */
export function parseAttitudeTypeList(raw: string | undefined): string[] {
  if (!raw) return [];
  const types = raw
    .split(/[,，、\s]+/)
    .map((item) => resolveAttitudeTypeInput(item))
    .filter((item): item is string => item !== undefined);
  return [...new Set(types)];
}
