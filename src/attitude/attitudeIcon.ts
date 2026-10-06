import { Values } from "../Values";

/** 解析 `sticker:<id>`；非贴纸类型返回 undefined */
export function parseStickerId(attitudeType: string) {
  if (!attitudeType.startsWith(Values.attitude.sticker.prefix)) return undefined;
  const id = Number(attitudeType.slice(Values.attitude.sticker.prefix.length));
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** {@link parseStickerId} 的逆操作 */
export function buildStickerType(id: number) {
  return `${Values.attitude.sticker.prefix}${id}`;
}

/**
 * 生成表态类型的图标节点：`devil-angry` 用内联 SVG，贴纸渲染占位节点（图由
 * {@link fillStickerIcon} 后补），其余按 emoji 文本交给 Twemoji 字体渲染。
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

/** 表态类型的展示文案：贴纸没有文本形态，退回贴纸文件名 */
export function getAttitudeTitle(attitudeType: string, stickerName?: string) {
  if (attitudeType === Values.attitude.devilAngry.type) return Values.attitude.devilAngry.title;
  if (parseStickerId(attitudeType) !== undefined) return stickerName?.trim() || "自定义贴纸";
  return attitudeType;
}

/** 由 `AttitudeSystem.hydrateStickers` 给贴纸占位节点补上图片 */
export function fillStickerIcon($icon: JQuery, sticker: SupabaseAttitudeSticker) {
  return $icon
    .attr("title", getAttitudeTitle(buildStickerType(sticker.id), sticker.name))
    .css("background-image", `url("${sticker.image_url}")`)
    .removeAttr("data-mcmodder-sticker-failed");
}
