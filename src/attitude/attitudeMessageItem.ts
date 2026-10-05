import { Values } from "../Values";
import { buildAttitudeIcon } from "./attitudeIcon";

/**
 * 头像缺失时的占位图。
 *
 * 站点没有公开的默认头像资源（`static/public/images/avatar_none.png` 实测 404），故用内联
 * SVG data URI 兜底，既不产生 404 请求也不依赖站点私有资源路径。
 */
const DEFAULT_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e9ecef"/><circle cx="20" cy="15" r="7" fill="#adb5bd"/><path d="M6 38c0-8 6.3-13 14-13s14 5 14 13z" fill="#adb5bd"/></svg>',
  );

/**
 * 站点列表里没有可克隆的原生条目时使用的表态消息模板（与站内原生表态条目同构）：
 * 只有「X 表示很 + 表情徽标」「被表态的短评」「时间」，没有回复条目那套正文与「查看」。
 */
const FALLBACK_MESSAGE_ITEM = `
  <li>
    <span class="avatar">
      <a href="javascript:void(0);" target="_blank"><img alt="" src="${DEFAULT_AVATAR}"></a>
    </span>
    <span class="info">
      <span class="username">
        <b><a href="javascript:void(0);" target="_blank"></a></b>表示很
      </span>
      <span class="content-reply bd-callout text-muted"><a href="javascript:void(0);" target="_blank"></a></span>
      <ul class="content-tools"><li class="text-muted"></li></ul>
    </span>
    <span class="content-ground"><span class="text-muted"></span></span>
  </li>`;

/** 原生表态条目不在场时的表态文案兜底（`X 表示很 [表情]`） */
const DEFAULT_ATTITUDE_SUFFIX = "表示很";

/** 消息中心时间格式与站点一致（`YYYY-MM-DD HH:mm:ss`，本地时区） */
function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** `$element` 的直接子文本节点 */
function textNodes($element: JQuery) {
  return $element.contents().filter((_, node) => node.nodeType === Node.TEXT_NODE);
}

/**
 * 选出可供克隆的站点原生条目模板。
 *
 * 优先站点自己的表态条目（`.username` 带原生表态徽标）：结构与文案都与我们的消息一致；
 * 页面上没有这类条目时退回任意原生条目（{@link buildAttitudeMessageItem} 会把回复形态归一成
 * 表态形态），再退回内置模板。
 */
export function findAttitudeMessageTemplate() {
  const $nativeItems = $(".message-list > ul > li").not(".mcmodder-attitude-message");
  const $attitudeItem = $nativeItems
    .filter((_, li) => $(li).find(".username .content-comment-attitude").length > 0)
    .first();
  if ($attitudeItem.length) return $attitudeItem;
  const $anyItem = $nativeItems.first();
  return $anyItem.length ? $anyItem : $(FALLBACK_MESSAGE_ITEM);
}

/**
 * 用站点原生条目（或内置模板）构建一条表态消息条目。
 *
 * 站点的「短评回复」条目与「短评表态」条目结构不同：回复条目多出 `.content-new`（回复正文）与
 * 工具条里的「查看」（指向那条回复），用户名后的文案也是「回复了我的短评」。直接克隆回复条目会让
 * 注入的消息看起来是别人的回复——连回复正文与指向他人短评的链接一起带出来——故这里逐项归一，
 * 只保留表态条目该有的样子：`X 表示很 [表情]`、被表态的短评摘要、时间、（未读）。
 */
export function buildAttitudeMessageItem($template: JQuery, item: SupabaseAttitudeInboxItem) {
  const $item = $template.clone();
  $item
    .addClass("mcmodder-attitude-message")
    .toggleClass("mcmodder-attitude-unread", !item.is_read)
    .attr("data-mcmodder-attitude-message", String(item.id));

  const profileUrl = `//center.mcmod.cn/${item.from_uid}/`;
  $item.find(".avatar a").attr("href", profileUrl);
  $item.find(".avatar img").attr({
    src: item.from_avatar || DEFAULT_AVATAR,
    alt: item.from_username ?? "",
  });

  const $username = $item.find(".username").first();
  // 站点原生表态徽标（`.content-comment-attitude`）不复用：猎奇功能会改写它的图标与文案
  const $nativeBadge = $username.find(".content-comment-attitude");
  // 表态文案（如「表示很」）优先取自原生表态条目，站点改措辞时这里不会继续写死
  const nativeSuffix = textNodes($username).last().text().trim();
  const suffix = $nativeBadge.length && nativeSuffix ? nativeSuffix : DEFAULT_ATTITUDE_SUFFIX;

  // 回复条目专属内容：回复正文与「（N楼的第M条回复）」提示都不属于表态消息
  $item.find(".content-new").remove();
  $nativeBadge.remove();
  textNodes($username).remove();
  $username.append(document.createTextNode(suffix)).append(
    $('<span class="badge badge-light mcmodder-attitude-badge"></span>')
      .append(buildAttitudeIcon(item.attitude_type))
      .append(
        item.attitude_type === Values.attitude.devilAngry.type
          ? document.createTextNode(Values.attitude.devilAngry.title)
          : "",
      ),
  );

  // 被表态的短评：链回表态所在的短评（`source_url`），文案取短评摘要
  $item.find(".content-reply > span").remove();
  $item
    .find(".content-reply > a")
    .first()
    .attr("href", item.source_url || profileUrl)
    .text(item.comment_text?.trim() || "查看短评");

  // 工具条只保留时间：回复条目的「查看」指向被克隆的那条回复，必须丢掉
  $item
    .find(".content-tools")
    .first()
    .empty()
    .append($('<li class="text-muted"></li>').text(formatMessageTime(item.created_at)));

  const $ground = $item.find(".content-ground").empty();
  if (!item.is_read) $ground.append($('<span class="text-muted small"></span>').text("未读"));

  // 克隆一定产出元素节点
  return $item.get(0) as HTMLElement;
}
