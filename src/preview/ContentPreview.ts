/**
 * mcmod.cn「正文预览」HTML 生成器。
 *
 * 服务端的预览输出并不是简单地把编辑器内容原样拼出来，而是依次执行：
 *   1) HTML 白名单净化（未知标签连子树一起删）
 *   2) 伪标签替换：`[mark:]` / `[ban:]` / `[h1=]`…`[h5=]` 与 `[icon:]`
 *   3) `<a>` 处理（站内补 `target`，站外改写成 webuiPopover 触发点）
 *   4) `<img>` 处理（`.figure` + 懒加载 + `figcaption`）
 *   5) 裁剪文末空段
 *   6) 按外链出现顺序追加 `<script>`
 *
 * 这里按字符串级别复刻，保留原生的一些「怪癖」：属性值不做转义、`<a>` 可能出现重复
 * 的 `target`、外链弹层里的 URL 原样插入等。
 */

import {
  serializeAttributes,
  tokenizeHtml,
  type HtmlAttribute,
  type HtmlToken,
  type TagToken,
} from "./HtmlTokenizer";
import {
  MC_ADAPTIVE_ICONS,
  MC_SATURATION_LEVELS,
  MC_STANDALONE_ICONS,
  renderMcIconSvg,
  type McIconPair,
} from "./McIcon";

export interface ContentPreviewOptions {
  /** 图片 `alt` 前缀，如资料页传入资料名；默认「正文预览」 */
  imageName?: string;
  /** 图片序号起始值，默认 1 */
  imageStart?: number;
  /** 生成 `link_` 随机 id 的函数，默认 16 位大小写字母 + 数字 */
  randomId?: (length: number) => string;
  /** 是否在末尾追加 webuiPopover 脚本，默认 `true` */
  appendScripts?: boolean;
}

export interface ContentPreviewLink {
  /** 触发点 `<a>` 的 id（含 `link_` 前缀） */
  id: string;
  /** 解码后的外链地址（弹层里 `<strong>` 显示的文本） */
  url: string;
  /** `//link.mcmod.cn/target/` 后面的自定义 base64 */
  base64: string;
}

export interface ContentPreviewResult {
  html: string;
  links: ContentPreviewLink[];
}

const ALLOWED_TAGS: ReadonlySet<string> = new Set(
  (
    "a abbr address article aside audio b big blockquote br caption center cite code col colgroup " +
    "dd del details div dl dt em font footer h1 h2 h3 h4 h5 h6 header hr i img ins li mark math " +
    "nav ol p pre s section small span strong sub sup svg table tbody td tfoot th thead tr tt u ul video"
  ).split(" "),
);

/** HTML 的 void 标签（没有闭合标签），用于避免把后续内容误当成子树 */
const VOID_HTML_TAGS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** 本模块会输出成自闭合形式的空标签 */
const SELF_CLOSING_TAGS: ReadonlySet<string> = new Set(["br", "col", "hr", "img"]);

const ALLOWED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  p: ["style"],
  div: ["style"],
  span: ["class", "style", "data-by-uid", "data-by-nickname"],
  a: ["href", "target", "title", "style"],
  img: ["src", "alt", "title", "width", "height"],
  font: ["color", "face", "size"],
  abbr: ["title"],
  table: ["border", "width", "align", "style"],
  colgroup: ["span"],
  col: ["width"],
  th: ["colspan", "rowspan", "align", "valign", "width", "style"],
  td: ["colspan", "rowspan", "align", "valign", "width", "style"],
  video: ["src", "width", "height", "controls", "loop", "preload", "autoplay", "style"],
  audio: ["src", "controls", "loop", "preload", "autoplay", "style"],
  details: ["open"],
  pre: ["class"],
};

const PRE_BRUSH_PREFIX = "brush:";
const PRE_BRUSH_NONE = "brush:none;";
/** 百科只注册了 java / cb 两种 brush，其余完整声明统一降级成 none */
const PRE_BRUSH_VALUES: ReadonlySet<string> = new Set(["brush:java;", "brush:cb;"]);

/** 判断 svg 是否保留时，白名单内的标签不算「有效子节点」（`a` 就属于这种情况） */
const SVG_IGNORED_CHILD_TAGS: ReadonlySet<string> = new Set(
  [...ALLOWED_TAGS].filter((name) => name !== "svg"),
);

const INTERNAL_LINK_PREFIXES = ["//www.mcmod.cn", "http://www.mcmod.cn", "https://www.mcmod.cn"];

const IMAGE_LOADING_GIF = "//www.mcmod.cn/static/public/images/loading-colourful.gif";
const IMAGE_ERROR_GIF = "//www.mcmod.cn/images/loadfail.gif";

/** 与服务端一致的 int64 上限（用浮点比较，边界行为相同） */
const MAX_ICON_VALUE = Number("9223372036854775807");

const ICON_TOKEN_PATTERN = /\[icon:([^\]]*)\]/g;
const TAG_MARK_PATTERN = /\[(mark|ban):([^\]]*)\]/g;
const HEADING_PATTERN = /\[h([1-5])=([^\]]*)\]/g;

interface PreviewState {
  imageName: string;
  imageStart: number;
  imageCount: number;
  randomId: (length: number) => string;
  links: ContentPreviewLink[];
}

// ---------------------------------------------------------------------------
// 1) HTML 白名单净化
// ---------------------------------------------------------------------------

function findMatchingClose(tokens: readonly HtmlToken[], openIndex: number, name: string): number {
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "tag" || token.name !== name) continue;
    if (token.closing) {
      depth -= 1;
      if (depth === 0) return index;
    } else if (!token.selfClosing) {
      depth += 1;
    }
  }
  return tokens.length;
}

/** svg 只在「存在一个非 HTML 白名单的直接子元素」时保留（空壳） */
function hasSvgContent(tokens: readonly HtmlToken[]): boolean {
  let depth = 0;
  for (const token of tokens) {
    if (token.type !== "tag") continue;
    if (token.closing) {
      if (depth > 0) depth -= 1;
      continue;
    }
    if (depth === 0 && !SVG_IGNORED_CHILD_TAGS.has(token.name)) return true;
    if (!token.selfClosing && !VOID_HTML_TAGS.has(token.name)) depth += 1;
  }
  return false;
}

function filterAttributes(name: string, attrs: readonly HtmlAttribute[]): HtmlAttribute[] {
  const allowed = ALLOWED_ATTRIBUTES[name] ?? [];
  // `style` 是「所有非 void 标签通用」的属性：`img` / `br` / `hr` / `col` 会被丢弃，
  // 其余标签（含 `ul` / `ol` / `li`）原样保留，内容不做任何过滤。
  const styleAllowed = !VOID_HTML_TAGS.has(name);
  return attrs.filter(
    (attribute) => allowed.includes(attribute.name) || (styleAllowed && attribute.name === "style"),
  );
}

function preClassAttribute(token: TagToken): HtmlAttribute | undefined {
  return token.attrs.find((attribute) => attribute.name === "class");
}

/**
 * 不完整的 brush 声明（`brush:` 开头但没有以 `;` 结尾）会触发服务端的「吞并」：
 * 从该 `<pre>` 起、直到下一个 class 以 `;` 结尾的 `<pre>` 之前的全部内容都被删掉，
 * 而那个收口的 `<pre>` 会被强制写成 `brush:none;`。
 *
 * 只有存在收口目标时才会发生；孤立的不完整声明会原样保留（例如单独一个
 * `<pre class="brush:cb">`）。
 */
function isIncompleteBrushClass(value: string | null): boolean {
  return value !== null && value.startsWith(PRE_BRUSH_PREFIX) && !value.endsWith(";");
}

function findPreMergeTarget(tokens: readonly HtmlToken[], start: number): number {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "tag" || token.name !== "pre" || token.closing) continue;
    const value = preClassAttribute(token)?.value ?? null;
    if (value !== null && value.endsWith(";")) return index;
  }
  return -1;
}

/**
 * `<pre class>` 的原样保留（不做实体还原，`a&lt;b&gt;` 在站点输出里仍是编码状态），
 * 但以 `brush:` 开头且以 `;` 结尾的声明会被归一化：只留 `java` / `cb`，其余变 `none`。
 */
function preparePreAttributes(
  attrs: readonly HtmlAttribute[],
  forceNone: boolean,
): HtmlAttribute[] {
  let classHandled = false;
  return filterAttributes("pre", attrs).map((attribute) => {
    if (attribute.name !== "class") {
      return attribute.value === null
        ? attribute
        : { ...attribute, value: decodeEntities(attribute.value) };
    }
    if (classHandled) return attribute;
    classHandled = true;
    if (forceNone) return { ...attribute, value: PRE_BRUSH_NONE };
    const value = attribute.value;
    if (value !== null && value.startsWith(PRE_BRUSH_PREFIX) && value.endsWith(";")) {
      return { ...attribute, value: PRE_BRUSH_VALUES.has(value) ? value : PRE_BRUSH_NONE };
    }
    return attribute;
  });
}

/**
 * 属性值按 HTML 解析器的规则做一次实体还原（等价于 `html_entity_decode(..., ENT_NOQUOTES)`）：
 * `&amp;` / `&lt;` / `&gt;` / `&nbsp;` 被解码，`&quot;` / `&#39;` 保留字面量。
 * 输出时不再重新转义，因此 `src="a&b<c>"` 会原样写回。
 */
function decodeAttributeValues(attrs: readonly HtmlAttribute[]): HtmlAttribute[] {
  return attrs.map((attribute) =>
    attribute.value === null ? attribute : { ...attribute, value: decodeEntities(attribute.value) },
  );
}

function sanitizeHtml(html: string): string {
  const tokens = tokenizeHtml(html);
  const output: string[] = [];
  /** 被不完整 brush 吞并、要一直丢弃到哪个 token（不含） */
  let skipUntil = -1;
  /** 收口 `<pre>` 的下标：它的 class 会被强制写成 `brush:none;` */
  let forcedNoneIndex = -1;

  for (let index = 0; index < tokens.length; index += 1) {
    if (index < skipUntil) continue;
    const token = tokens[index];
    if (token.type === "text" || token.type === "comment") {
      output.push(token.raw);
      continue;
    }
    if (token.type === "declaration") continue;

    if (token.name === "svg" && !token.closing) {
      if (token.selfClosing) continue;
      const close = findMatchingClose(tokens, index, "svg");
      if (hasSvgContent(tokens.slice(index + 1, close))) {
        output.push(`<svg${serializeAttributes(decodeAttributeValues(token.attrs))}></svg>`);
      }
      index = close;
      continue;
    }

    if (token.name === "math" && !token.closing) {
      if (token.selfClosing) {
        output.push("<math></math>");
        continue;
      }
      index = findMatchingClose(tokens, index, "math");
      output.push("<math></math>");
      continue;
    }

    if (!ALLOWED_TAGS.has(token.name)) {
      if (!token.closing && !token.selfClosing && !VOID_HTML_TAGS.has(token.name)) {
        index = findMatchingClose(tokens, index, token.name);
      }
      continue;
    }

    if (token.closing) {
      output.push(`</${token.name}>`);
      continue;
    }

    if (token.name === "pre") {
      if (isIncompleteBrushClass(preClassAttribute(token)?.value ?? null)) {
        const target = findPreMergeTarget(tokens, index + 1);
        if (target !== -1) {
          skipUntil = target;
          forcedNoneIndex = target;
          continue;
        }
      }
      output.push(
        `<pre${serializeAttributes(preparePreAttributes(token.attrs, index === forcedNoneIndex))}>`,
      );
      continue;
    }

    const attrs = filterAttributes(token.name, token.attrs);
    const terminator = SELF_CLOSING_TAGS.has(token.name) ? " />" : ">";
    output.push(`<${token.name}${serializeAttributes(decodeAttributeValues(attrs))}${terminator}`);
  }

  return output.join("");
}

// ---------------------------------------------------------------------------
// 2) 伪标签与 `[icon:]`
// ---------------------------------------------------------------------------

/** 标签名 → 原文区间；用于避免在标签/注释内部做伪标签替换 */
function nonTextRanges(html: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const token of tokenizeHtml(html)) {
    if (token.type !== "text") ranges.push([token.start, token.end]);
  }
  return ranges;
}

function replaceOutsideTags(
  html: string,
  pattern: RegExp,
  replacer: (match: RegExpExecArray) => string,
): string {
  const ranges = nonTextRanges(html);
  let output = "";
  let cursor = 0;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const start = match.index;
    if (ranges.some(([rangeStart, rangeEnd]) => start >= rangeStart && start < rangeEnd)) {
      continue;
    }
    output += html.slice(cursor, start) + replacer(match);
    cursor = start + match[0].length;
  }
  return output + html.slice(cursor);
}

function formatIconCount(value: number): string {
  if (Number.isInteger(value)) {
    return Number.isSafeInteger(value) ? String(value) : BigInt(value).toString();
  }
  return String(Math.round(value * 10) / 10);
}

function renderAdaptiveIcons(value: number, pair: McIconPair): string {
  const count = value / 2;
  if (count > 10) {
    const folded = Math.ceil(count * 2) / 2;
    return `${renderMcIconSvg(pair.full)} × ${formatIconCount(folded)}`;
  }
  const full = Math.floor(count);
  let icons = renderMcIconSvg(pair.full).repeat(full);
  if (count > full) icons += renderMcIconSvg(pair.half);
  return icons;
}

function renderSaturationIcons(value: number): string {
  const count = value / 2;
  if (count > 10) {
    return `${renderMcIconSvg(MC_SATURATION_LEVELS[100])} × ${formatIconCount(Math.ceil(count))}`;
  }
  const full = Math.floor(count);
  let icons = renderMcIconSvg(MC_SATURATION_LEVELS[100]).repeat(full);
  const remainder = value - full * 2;
  if (remainder > 0) {
    const level = remainder < 1 ? 25 : remainder < 1.5 ? 50 : 75;
    icons += renderMcIconSvg(MC_SATURATION_LEVELS[level]);
  }
  return icons;
}

function renderIconToken(token: string, inner: string): string {
  const equalIndex = inner.indexOf("=");
  if (equalIndex === -1) {
    return MC_STANDALONE_ICONS.has(inner) ? renderMcIconSvg(inner) : token;
  }

  const name = inner.slice(0, equalIndex);
  if (MC_STANDALONE_ICONS.has(name)) return token;
  const pair = MC_ADAPTIVE_ICONS[name];
  if (!pair) return token;

  const rest = inner.slice(equalIndex + 1);
  const commaIndex = rest.indexOf(",");
  const rawValue = commaIndex === -1 ? rest : rest.slice(0, commaIndex);
  const suffix = commaIndex === -1 ? "" : rest.slice(commaIndex + 1);

  const parsed = Number.parseFloat(rawValue);
  const value = Number.isNaN(parsed) ? 0 : parsed;
  if (value < 0) return "[icon:error-missing parameter!]";
  if (value > MAX_ICON_VALUE) return "[icon:error-out of limit!]";

  const icons =
    name === "saturation-level" ? renderSaturationIcons(value) : renderAdaptiveIcons(value, pair);
  const wrapped = `<span data-toggle="tooltip" data-original-title="${rawValue}">${icons}</span>`;
  // 只有带第二参数时才在图标前显示「数值 + 参数」；`[icon:health=1]` 只输出 span，不产生任何正文文本
  if (suffix === "") return wrapped;
  // 没有生成任何图标时（0 / -0 / 非数）只保留「数值 + 单位」，不生成空括号
  return icons === "" ? `${rawValue}${suffix}` : `${rawValue}${suffix}（${wrapped}）`;
}

function renderTagMark(type: string, value: string): string {
  return `<span class="common-tag-${type}" data-type="${value.replace(/_/g, "-")}"></span>`;
}

function renderHeading(level: string, body: string): string {
  return `<span class="common-text-title common-text-title-${level}">${body}</span>`;
}

// ---------------------------------------------------------------------------
// 3) <a> / <img>
// ---------------------------------------------------------------------------

/** HTML 实体还原（ENT_NOQUOTES）：属性值与外链 URL 共用 */
function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const code = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      // ENT_NOQUOTES：不还原单双引号
      if (!Number.isFinite(code) || code === 34 || code === 39) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    switch (body.toLowerCase()) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "nbsp":
        return "\u00a0";
      default:
        return match;
    }
  });
}

/** 外链 URL 的变换：实体解码 → `'` 转 `%27` */
function normalizeExternalUrl(href: string): string {
  return decodeEntities(href).replace(/'/g, "%27");
}

/** 自定义 base64：`+` → `-`、`/` → `@`，保留 `=` 填充 */
function toUrlSafeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "@");
}

function attrValue(token: TagToken, name: string): string | null {
  return token.attrs.find((attribute) => attribute.name === name)?.value ?? null;
}

function transformAnchor(token: TagToken, state: PreviewState): string {
  const href = attrValue(token, "href");
  if (href === null) return token.raw;

  if (INTERNAL_LINK_PREFIXES.some((prefix) => href.startsWith(prefix))) {
    const attrs = token.attrs.filter(
      (attribute) => !(attribute.name === "target" && attribute.value?.toLowerCase() === "_blank"),
    );
    return `<a target="_blank"${serializeAttributes(attrs)}>`;
  }

  const id = `link_${state.randomId(16)}`;
  const url = normalizeExternalUrl(href);
  state.links.push({ id, url, base64: toUrlSafeBase64(url) });

  const attrs = token.attrs.filter(
    (attribute) => attribute.name !== "href" && attribute.name !== "target",
  );
  return `<a href="javascript:void(0);" id="${id}"${serializeAttributes(attrs)}>`;
}

function transformImage(token: TagToken, state: PreviewState): string {
  const src = attrValue(token, "src") ?? "";
  const alt = attrValue(token, "alt");
  const title = attrValue(token, "title");
  const caption = alt && alt.trim() !== "" ? alt : title && title.trim() !== "" ? title : "";
  const index = state.imageStart + state.imageCount;
  state.imageCount += 1;

  const width = attrValue(token, "width");
  const height = attrValue(token, "height");
  const size =
    (width === null ? "" : ` width="${width}"`) + (height === null ? "" : ` height="${height}"`);
  const figcaption = caption === "" ? "" : `<span class="figcaption">${caption}</span>`;

  return (
    `<span class="figure"><img alt="${state.imageName}-第${index}张图片" class="lazy" ` +
    `src="${IMAGE_LOADING_GIF}" data-src="${src}" data-error="${IMAGE_ERROR_GIF}"${size} />` +
    `${figcaption}</span>`
  );
}

function transformLinksAndImages(html: string, state: PreviewState): string {
  const tokens = tokenizeHtml(html);
  const output: string[] = [];
  for (const token of tokens) {
    if (token.type !== "tag" || token.closing) {
      output.push(token.raw);
      continue;
    }
    if (token.name === "a") {
      output.push(transformAnchor(token, state));
      continue;
    }
    if (token.name === "img") {
      output.push(transformImage(token, state));
      continue;
    }
    output.push(token.raw);
  }
  return output.join("");
}

// ---------------------------------------------------------------------------
// 4) 文末空段裁剪
// ---------------------------------------------------------------------------

function findMatchingOpen(tokens: readonly HtmlToken[], closeIndex: number, name: string): number {
  let depth = 0;
  for (let index = closeIndex; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.type !== "tag" || token.name !== name) continue;
    if (token.closing) {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** 段落是否「空」：只有空白、`&nbsp;`、`<br>` 或空的成对内联标签 */
function isEmptyParagraph(inner: readonly HtmlToken[]): boolean {
  if (inner.some((token) => token.type === "comment" || token.type === "declaration")) return false;
  let text = inner.map((token) => token.raw).join("");
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text
      .replace(/<br\s*\/?>/gi, "")
      .replace(/&nbsp;|&#160;|&#xa0;/gi, "")
      .replace(/<([a-z][\w-]*)(?:\s[^>]*)?>\s*<\/\1>/gi, "");
  }
  return text.trim() === "";
}

function trimTrailingEmptyNodes(html: string): string {
  let result = html;

  // A. 先裁掉文末连续的「无 style 的空 <p>」
  for (;;) {
    const tokens = tokenizeHtml(result);
    let end = tokens.length;
    while (end > 0 && tokens[end - 1].type === "text" && tokens[end - 1].raw.trim() === "") {
      end -= 1;
    }
    if (end === 0) {
      result = "";
      break;
    }
    const last = tokens[end - 1];
    if (last.type !== "tag" || !last.closing || last.name !== "p") break;
    const open = findMatchingOpen(tokens, end - 1, "p");
    if (open === -1) break;
    const openTag = tokens[open];
    if (openTag.type !== "tag") break;
    if (openTag.attrs.some((attribute) => attribute.name === "style")) break;
    if (!isEmptyParagraph(tokens.slice(open + 1, end - 1))) break;
    result = result.slice(0, openTag.start).trimEnd();
  }

  // B. 再裁掉文末连续的 <br>
  for (;;) {
    const tokens = tokenizeHtml(result);
    let end = tokens.length;
    while (end > 0 && tokens[end - 1].type === "text" && tokens[end - 1].raw.trim() === "") {
      end -= 1;
    }
    const last = tokens[end - 1];
    if (end > 0 && last.type === "tag" && !last.closing && last.name === "br") {
      result = result.slice(0, last.start).trimEnd();
      continue;
    }
    break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 5) 外链弹层脚本
// ---------------------------------------------------------------------------

function buildPopoverScript(link: ContentPreviewLink): string {
  const content =
    `<p>此链接会跳转到:</p><p><strong>${link.url}</strong></p><br/>` +
    `<p style=\\"word-break:break-all;\\">` +
    `<a rel=\\"nofollow noreferrer\\" target=\\"_blank\\" ` +
    `href=\\"//link.mcmod.cn/target/${link.base64}\\">前往链接</a>` +
    `<a style=\\"float:right\\" class=\\"linkTips_hide\\" ` +
    `href=\\"javascript:void(0);\\">不要再提示我</a></p>`;
  return (
    `<script language="javascript">$("#${link.id}").webuiPopover({ ` +
    `title: "这是一个站外链接", content: "${content}", ` +
    `trigger: "click", closeable: true, delay: 0 });</script>`
  );
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

const RANDOM_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function defaultRandomId(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  let id = "";
  for (const byte of bytes) id += RANDOM_ID_ALPHABET[byte % RANDOM_ID_ALPHABET.length];
  return id;
}

export class ContentPreview {
  /** 生成预览 HTML（只关心结果时用这个） */
  static generate(html: string, options: ContentPreviewOptions = {}): string {
    return ContentPreview.generateWithLinks(html, options).html;
  }

  /** 生成预览 HTML，并返回外链信息，便于调用方自行接管弹层 */
  static generateWithLinks(
    html: string,
    options: ContentPreviewOptions = {},
  ): ContentPreviewResult {
    const state: PreviewState = {
      imageName: options.imageName ?? "正文预览",
      imageStart: options.imageStart ?? 1,
      imageCount: 0,
      randomId: options.randomId ?? defaultRandomId,
      links: [],
    };

    let result = sanitizeHtml(html);
    result = replaceOutsideTags(result, ICON_TOKEN_PATTERN, (match) =>
      renderIconToken(match[0], match[1]),
    );
    result = replaceOutsideTags(result, TAG_MARK_PATTERN, (match) =>
      renderTagMark(match[1], match[2]),
    );
    result = replaceOutsideTags(result, HEADING_PATTERN, (match) =>
      renderHeading(match[1], match[2]),
    );
    result = transformLinksAndImages(result, state);
    result = trimTrailingEmptyNodes(result);

    if (options.appendScripts !== false) {
      result += state.links.map(buildPopoverScript).join("");
    }

    return { html: result, links: state.links };
  }
}
