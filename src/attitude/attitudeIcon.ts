import { Values } from "../Values";

/** 从表态类型中解析贴纸 id（`sticker:<id>`）；不是贴纸类型时返回 undefined */
export function parseStickerId(attitudeType: string) {
  if (!attitudeType.startsWith(Values.attitude.sticker.prefix)) return undefined;
  const id = Number(attitudeType.slice(Values.attitude.sticker.prefix.length));
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** 由贴纸 id 拼出表态类型（与 {@link parseStickerId} 互逆） */
export function buildStickerType(id: number) {
  return `${Values.attitude.sticker.prefix}${id}`;
}

/**
 * 生成某一表态类型的图标节点。
 *
 * - 内置的 `devil-angry` 使用自参考实现原样移植的 SVG（宽高 1em、随 `currentColor` 取色）；
 * - 贴纸（`sticker:<id>`）只渲染带 id 的占位节点，图片地址由 `AttitudeSystem.hydrateStickers`
 *   异步解析后写成背景图（贴纸不可变、解析结果长期缓存），故所有渲染路径都无需等待网络；
 * - 其余类型一律按 emoji 文本处理，交给 `.mcmodder-attitude-emoji` 的 Twemoji 字体渲染。
 */
export function buildAttitudeIcon(attitudeType: string) {
  const stickerId = parseStickerId(attitudeType);
  if (stickerId !== undefined) {
    return $('<i class="mcmodder-attitude-sticker"></i>').attr(
      "data-mcmodder-sticker-id",
      stickerId,
    );
  }
  return attitudeType === Values.attitude.devilAngry.type
    ? $('<i class="mcmodder-attitude-svg"></i>').html(Values.attitude.devilAngry.icon)
    : $('<i class="mcmodder-attitude-emoji"></i>').text(attitudeType);
}

/**
 * 表态类型对应的展示文案。
 *
 * 贴纸没有稳定的文本形态（`sticker:<id>` 不适合展示），故取原始文件名，缺失时退回统一称呼。
 */
export function getAttitudeTitle(attitudeType: string, stickerName?: string) {
  if (attitudeType === Values.attitude.devilAngry.type) return Values.attitude.devilAngry.title;
  if (parseStickerId(attitudeType) !== undefined) return stickerName?.trim() || "自定义贴纸";
  return attitudeType;
}

/** 把贴纸占位节点填成实际图片（背景图 + 名称提示），由 `AttitudeSystem.hydrateStickers` 调用 */
export function fillStickerIcon($icon: JQuery, sticker: SupabaseAttitudeSticker) {
  return $icon
    .attr("title", getAttitudeTitle(buildStickerType(sticker.id), sticker.name))
    .css("background-image", `url("${sticker.image_url}")`)
    .removeAttr("data-mcmodder-sticker-failed");
}
