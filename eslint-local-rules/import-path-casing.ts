// @ts-check

/**
 * 校验 import / export ... from / `import("...")` 的相对路径大小写与磁盘上的真实文件名一致。
 *
 * macOS 与 Windows 默认大小写不敏感，`import "../values"` 能解析到 `Values.ts`，写错时 TS 静默把
 * 类型退化成 `any`，报错被推迟到 Linux CI 上且指不到真正原因。`forceConsistentCasingInFileNames`
 * 依赖大小写敏感的文件系统，在 macOS 上不生效；这里改用 `readdirSync` 取真实文件名比对，
 * 它返回的大小写与磁盘一致，跨平台行为相同。
 *
 * 只检查相对路径；`$`（vite-plugin-monkey）、`vue` 等非相对说明符不做磁盘查找。
 */

import fs from "node:fs";
import path from "node:path";

/**
 * import 路径省略扩展名时依次尝试的候选，按仓库实际使用的顺序排列。
 * 命中第一个即停止，因此本仓库的 `.ts` 排在最前。
 *
 * @warning 如果以后引入 .mts/.cts 等扩展名，则需要补
 */
const EXTENSION_CANDIDATES = [
  "",
  ".ts",
  ".d.ts",
  ".tsx",
  ".vue",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
];

/**
 * @param {string} dir
 * @returns {Map<string, string> | null} `真实文件名（小写） -> 真实文件名`，目录不存在时为 `null`
 */
function getEntries(dir) {
  if (!fs.existsSync(dir)) {
    return null;
  }
  return new Map(fs.readdirSync(dir).map((entry) => [entry.toLowerCase(), entry]));
}

/**
 * 逐级向上查找并解析 import 路径指向的真实文件名。
 *
 * 逐段用 `readdirSync` 的真实条目做查找，而不是直接 `existsSync`：后者在大小写不敏感的系统上
 * 对错误大小写同样返回 `true`，无法据此判断大小写是否写错；只有精确匹配才算命中。
 *
 * @param {string} fromDir
 * @param {string} specifier
 * @returns {{ realName: string, usedName: string } | null} `null` 表示非相对路径或未定位到真实文件
 */
function resolveRealName(fromDir, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const resolved = path.resolve(fromDir, specifier);
  /** 路径根：POSIX 为 `/`，Windows 为 `C:\`（盘符是根的一部分，不能当目录名去查） */
  const root = path.parse(resolved).root;
  const segments = resolved.slice(root.length).split(path.sep);
  /** import 路径里写的最后一段，可能不含扩展名 */
  const usedBase = /** @type {string} */ segments.pop();
  /** 逐段校验目录段，同时修正其真实大小写 */
  let dir = root;
  for (const segment of segments) {
    const realSegment = getEntries(dir)?.get(segment.toLowerCase());
    if (realSegment === undefined) {
      return null;
    }
    dir = path.join(dir, realSegment);
  }

  const entries = getEntries(dir);
  if (!entries) {
    return null;
  }
  for (const extension of EXTENSION_CANDIDATES) {
    const usedName = usedBase + extension;
    const realName = entries.get(usedName.toLowerCase());
    if (realName !== undefined) {
      return { realName, usedName };
    }
  }
  // 未定位到真实文件时不报错，交由 TS / bundler 报「文件不存在」，避免重复诊断
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "import 的相对路径大小写必须与磁盘上的真实文件名一致",
    },
    schema: [],
    messages: {
      mismatch: '文件名 "{{actual}}" 与导入路径 "{{used}}" 仅大小写不同，请改成实际的文件名。',
    },
  },
  create(context) {
    /** @param {unknown} node ESTree / TS-ESTree 的字符串字面量节点 */
    function checkSpecifier(node) {
      // `export const x = 1` 之类的节点没有 source
      if (!node || typeof (/** @type {{ value?: unknown }} */ node.value) !== "string") {
        return;
      }
      const usedValue = /** @type {{ value: string }} */ node.value;
      const resolved = resolveRealName(path.dirname(context.filename), usedValue);
      if (resolved && resolved.realName !== resolved.usedName) {
        context.report({
          node: /** @type {any} */ node,
          messageId: "mismatch",
          data: { actual: resolved.realName, used: resolved.usedName },
        });
      }
    }

    return {
      ImportDeclaration: (node) => checkSpecifier(node.source),
      ExportNamedDeclaration: (node) => checkSpecifier(node.source),
      ExportAllDeclaration: (node) => checkSpecifier(node.source),
      ImportExpression: (node) =>
        node.source.type === "Literal" ? checkSpecifier(node.source) : undefined,
      // 类型导入：.d.ts 中大量使用 `import("../Values")`。
      // argument 是 TSLiteralType 包装，字面量在其 literal 属性上。
      TSImportType: (node) => {
        const argument = node.argument;
        const literal = argument.type === "TSLiteralType" ? argument.literal : argument;
        return checkSpecifier(literal);
      },
    };
  },
};

export default rule;
