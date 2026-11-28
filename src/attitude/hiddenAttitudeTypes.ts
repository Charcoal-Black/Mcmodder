import type { ConfigRepository } from "../config/ConfigRepository";
import { Utils } from "../Utils";
import { NATIVE_ATTITUDE_TYPES, parseAttitudeTypeList } from "./nativeAttitudeTypes";

/** 注入的 `<style>` 的 id，便于幂等 */
const STYLE_ID = "mcmodder-hidden-attitudes";

/** 短评结果条里表态项的容器 */
const COMMENT_RESULT = ".comment-attitude-result > li";

/** 个人中心「表态取得统计」列表的容器（站点原生 12 项与脚本追加项同处一个 ul） */
const USER_STAT_ITEM = ".center-main.attitude .center-content.attitude-list > ul > li";

/**
 * 「隐藏指定表态类型」的统一实现。
 *
 * 该设置作用于**两处**，且分别由不同 `Init` 渲染，因此抽到这里共用：
 * - 短评下方结果条（`CommentInit`，`.comment-attitude-result`）
 * - 个人中心表态统计（`CenterCommentInit`，`.center-main.attitude ...`)
 *
 * # 为什么先走 CSS
 * 结果条与统计列表都是站点异步渲染或脚本二次注入的。CSS 规则在元素插入的那一刻
 * 就生效，不需要等 JS 观察到；JS 只是兜底（`:has()` 不可用时仍能收起）。
 *
 * # 站点原生项与脚本自绘项的属性不同
 * - 站点原生：`<i class="fas fa-meh">`，没有 `data-type`
 * - 短评结果条自绘：`<a data-mcmodder-attitude="meh">`
 * - 统计面板自绘：`<i data-mcmodder-attitude="meh">`
 */
export function applyHiddenAttitudeTypes(configs: ConfigRepository): void {
  const types = parseAttitudeTypeList(configs.getSettings("hiddenAttitudeTypes"));
  if (types.length === 0) return;

  Utils.addStyle(buildCss(types), STYLE_ID);
  hideByDom(types);
  observe(types);
}

/** 按类型生成覆盖两处面板的 CSS */
function buildCss(types: string[]): string {
  const selectors = types.flatMap((type) => {
    const iconClass = NATIVE_ATTITUDE_TYPES.find((item) => item.type === type)?.iconClass;
    const rule = [
      // 短评结果条：站点原生 a[data-type] 与脚本自绘 a[data-mcmodder-attitude]
      `${COMMENT_RESULT}:has(> a[data-type="${type}"])`,
      `${COMMENT_RESULT}:has(> a[data-mcmodder-attitude="${type}"])`,
      // 表态统计：脚本自绘项带 data 属性，站点原生项只能靠图标类
      `${USER_STAT_ITEM}:has([data-mcmodder-attitude="${type}"])`,
    ];
    if (iconClass !== undefined) {
      rule.push(`${USER_STAT_ITEM}:has(> i.fas.${iconClass})`);
    }
    return rule;
  });
  return `${selectors.join(",")}{display:none!important;}`;
}

/** 从元素反查表态类型：先看 data 属性，再看图标类 */
function resolveType(element: Element): string | undefined {
  const own = element.getAttribute("data-mcmodder-attitude");
  if (own !== null) return own;
  const icon = element.querySelector("i[class*='fa-']");
  const className = icon?.getAttribute("class");
  if (className === null || className === undefined) return undefined;
  return NATIVE_ATTITUDE_TYPES.find((item) => className.includes(item.iconClass))?.type;
}

/** 标记隐藏：用属性而非移除，便于站点异步更新时不报错 */
const HIDDEN_ATTR = "data-mcmodder-attitude-hidden";

/** 遍历两个面板，把命中类型的条目收起（幂等） */
function hideByDom(types: string[]): void {
  const containers = [COMMENT_RESULT, USER_STAT_ITEM].join(",");
  $(containers).each((_, item) => {
    const $item = $(item);
    if ($item.attr(HIDDEN_ATTR) !== undefined) return;
    const type = resolveType(item);
    if (type !== undefined && types.includes(type)) {
      $item.attr(HIDDEN_ATTR, "1").hide();
    }
  });
}

/** 两处面板都可能异步重建，用一个观察器跟进 */
let observer: MutationObserver | undefined;

function observe(types: string[]): void {
  if (observer !== undefined) return;
  observer = new MutationObserver(() => hideByDom(types));
  observer.observe(document.body, { childList: true, subtree: true });
}
