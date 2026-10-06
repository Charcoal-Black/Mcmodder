import { Values } from "../Values";
import { buildAttitudeIcon } from "./attitudeIcon";

/** 头像缺失时的占位图：内联 SVG，不依赖站点的头像资源 */
const DEFAULT_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#e9ecef"/><circle cx="20" cy="15" r="7" fill="#adb5bd"/><path d="M6 38c0-8 6.3-13 14-13s14 5 14 13z" fill="#adb5bd"/></svg>',
  );

/** 没有可克隆的原生条目时的表态消息模板（与站内原生表态条目同构） */
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

/** 原生表态条目不在场时的文案兜底 */
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

function messageTimeKey($item: JQuery) {
  return $item.find(".content-tools > li").first().text().trim();
}

export function insertMessageItemByTime($list: JQuery, element: HTMLElement) {
  const newKey = messageTimeKey($(element));
  const entries: { node: Element; key: string }[] = [];
  $list.children("li").each((_, li) => {
    const key = messageTimeKey($(li));
    if (key) entries.push({ node: li, key });
  });

  const descending = entries.length < 2 || entries[0].key >= entries[1].key;
  const next = entries.find(({ key }) => (descending ? key < newKey : key > newKey));
  if (next) $(next.node).before(element);
  else $list.append(element);
}

/** 挑选可克隆的站点原生条目模板：优先原生表态条目，其次任意原生条目，最后内置模板 */
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
 * 用站点原生条目（或内置模板）构建一条表态消息条目：克隆来的只是骨架，作者、昵称链接、短评摘要、
 * 时间与工具条都按消息数据重写；回复条目独有的正文与「查看」一并去掉。
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
  $username
    .find("b a")
    .attr("href", profileUrl)
    .text(item.from_username?.trim() ?? "");
  const $nativeBadge = $username.find(".content-comment-attitude");
  const nativeSuffix = textNodes($username).last().text().trim();
  const suffix = $nativeBadge.length && nativeSuffix ? nativeSuffix : DEFAULT_ATTITUDE_SUFFIX;

  // 回复条目才有的正文与楼层提示
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

  // 链回被表态的短评，文案取摘要
  $item.find(".content-reply > span").remove();
  $item
    .find(".content-reply > a")
    .first()
    .attr("href", item.source_url || profileUrl)
    .text(item.comment_text?.trim() || "查看短评");

  // 工具条只留时间：克隆来的「查看」指向的是被克隆的那条回复
  $item
    .find(".content-tools")
    .first()
    .empty()
    .append($('<li class="text-muted"></li>').text(formatMessageTime(item.created_at)));

  const $ground = $item.find(".content-ground").empty();
  if (!item.is_read) $ground.append($('<span class="text-muted small"></span>').text("未读"));

  return $item.get(0) as HTMLElement;
}
