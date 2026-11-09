/**
 * 轻量 HTML 词法分析器。
 *
 * 预览生成需要尽量复刻服务端的「字符串级」行为（属性顺序、未转义的 `&`/`<`、重复的
 * `target` 等），因此这里不借助 `DOMParser`，而是把输入切成 `text` / `comment` /
 * `declaration` / `tag` 四类 token，交给上层做白名单与重写。
 *
 * 扫描 open tag 时会跳过引号内的 `>`，避免属性值里的 `>` 提前结束标签。
 */

export interface HtmlAttribute {
  name: string;
  value: string | null;
}

interface TokenBase {
  start: number;
  end: number;
  raw: string;
}

export interface TextToken extends TokenBase {
  type: "text";
}

export interface CommentToken extends TokenBase {
  type: "comment";
}

/** `<!DOCTYPE ...>`、`<?xml ...>` 等，清洗阶段直接丢弃 */
export interface DeclarationToken extends TokenBase {
  type: "declaration";
}

export interface TagToken extends TokenBase {
  type: "tag";
  name: string;
  closing: boolean;
  selfClosing: boolean;
  attrs: HtmlAttribute[];
}

export type HtmlToken = TextToken | CommentToken | DeclarationToken | TagToken;

const ATTRIBUTE_PATTERN = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** 解析单个标签片段（含 `<` `>`） */
function parseTag(raw: string): Omit<TagToken, "start" | "end" | "raw"> {
  let body = raw.slice(1);
  if (body.endsWith(">")) body = body.slice(0, -1);
  let closing = false;
  if (body.startsWith("/")) {
    closing = true;
    body = body.slice(1);
  }
  let selfClosing = false;
  if (/\/\s*$/.test(body)) {
    selfClosing = true;
    body = body.replace(/\/\s*$/, "");
  }
  const nameMatch = /^\s*([a-zA-Z][\w:-]*)/.exec(body);
  const name = (nameMatch?.[1] ?? "").toLowerCase();
  const attrs: HtmlAttribute[] = [];
  if (!closing && nameMatch) {
    const rest = body.slice(nameMatch[0].length);
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ATTRIBUTE_PATTERN.exec(rest)) !== null) {
      if (match[0].trim() === "") {
        ATTRIBUTE_PATTERN.lastIndex += 1;
        continue;
      }
      attrs.push({
        name: match[1].toLowerCase(),
        value: match[2] ?? match[3] ?? match[4] ?? null,
      });
    }
  }
  return { type: "tag", name, closing, selfClosing, attrs };
}

/** 把 HTML 切成 token 序列，`start`/`end` 为原文偏移，便于按区间裁剪 */
export function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let index = 0;

  const pushText = (start: number, end: number) => {
    if (end <= start) return;
    tokens.push({ type: "text", start, end, raw: html.slice(start, end) });
  };

  while (index < html.length) {
    const lt = html.indexOf("<", index);
    if (lt === -1) {
      pushText(index, html.length);
      break;
    }
    pushText(index, lt);

    if (html.startsWith("<!--", lt)) {
      const close = html.indexOf("-->", lt + 4);
      const end = close === -1 ? html.length : close + 3;
      tokens.push({ type: "comment", start: lt, end, raw: html.slice(lt, end) });
      index = end;
      continue;
    }

    const next = html[lt + 1] ?? "";
    if (next === "!" || next === "?") {
      const close = html.indexOf(">", lt + 2);
      const end = close === -1 ? html.length : close + 1;
      tokens.push({ type: "declaration", start: lt, end, raw: html.slice(lt, end) });
      index = end;
      continue;
    }

    if (next === "/" || /[a-zA-Z]/.test(next)) {
      let cursor = lt + 1;
      let quote = "";
      while (cursor < html.length) {
        const char = html[cursor];
        if (quote) {
          if (char === quote) quote = "";
        } else if (char === '"' || char === "'") {
          quote = char;
        } else if (char === ">") {
          break;
        }
        cursor += 1;
      }
      const end = Math.min(cursor + 1, html.length);
      const raw = html.slice(lt, end);
      tokens.push({ ...parseTag(raw), start: lt, end, raw });
      index = end;
      continue;
    }

    // 孤立的 `<`：按普通文本处理
    pushText(lt, lt + 1);
    index = lt + 1;
  }

  return tokens;
}

/** 序列化单个属性；布尔属性输出 `name=""`（与服务端一致） */
export function serializeAttribute(attribute: HtmlAttribute): string {
  return attribute.value === null
    ? `${attribute.name}=""`
    : `${attribute.name}="${attribute.value}"`;
}

/** 序列化属性列表，自动补前导空格 */
export function serializeAttributes(attributes: readonly HtmlAttribute[]): string {
  return attributes.length === 0 ? "" : ` ${attributes.map(serializeAttribute).join(" ")}`;
}
