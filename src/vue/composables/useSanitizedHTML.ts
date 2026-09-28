import { type ComputedRef, computed } from "vue";
import createDOMPurify from "dompurify";

/**
 * DOMPurify 包装的静态单例。
 *
 * `dompurify` 的默认导出是「工厂」：不传参时它内部走 `getGlobal()`，即直接取全局
 * `window` 完成 `isSupported` 探测；传入一个 window 则显式绑定该 window。
 * 两者在此等价——脚本运行在 mcmod.cn 页面的 document-start 上下文，`window` 自始存在，
 * 不依赖 jQuery 或其它宿主全局。
 */
const DOMPurify = createDOMPurify();

/**
 * 允许列表在 DOMPurify 默认值之上额外放行的属性。
 *
 * - `target`：DOMPurify 默认不允许 `target`，而设置项描述里存在
 *   `<a href="..." target="_blank">` 外链（见 `ConfigLoader`），不放行会被静默剥掉。
 * - `rel`：配合 `target="_blank"` 使用，避免新窗口反向操纵原页面（`noopener`）。
 *   DOMPurify 默认已允许，这里显式列出是为了让意图可读。
 */
const ALLOWED_ATTR = ["target", "rel"];

/**
 * 把一段 HTML 字符串清洗为可安全用于 `v-html` 的字符串。
 *
 * 仅做**白名单**过滤：非法标签与属性被丢弃、`javascript:` 等危险协议被移除，
 * 而 `<del>`、`<code>`、`<a>`、`<span class="fa">` 等项目实际依赖的标签原样保留。
 */
export function sanitizeHTML(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { ADD_ATTR: ALLOWED_ATTR });
}

/**
 * 把一段可能含 HTML 的字符串包装成**已经过 `sanitizeHTML` 清洗**的 computed，
 * 供模板中的 `v-html` 直接绑定。
 *
 * 用法：`const safeTitle = useSanitizedHTML(() => props.title)`
 *
 * 之所以提供 composable 形式而不是让各组件自行 `DOMPurify.sanitize`：
 * 一是避免每个组件重复 import 与单例初始化，二是把「此处 `v-html` 的入参已被清洗」
 * 这件事固定在类型与命名上，配合 `vue/no-v-html` 的 eslint-disable 注释说明来源。
 */
export function useSanitizedHTML(source: () => string): ComputedRef<string> {
  return computed(() => sanitizeHTML(source()));
}
