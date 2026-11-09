/**
 * `[icon:]` 的图标名清单与渲染。
 *
 * 数据来自 mcmod.cn 编辑器帮助页（自适应图标 / 独立图标两张表），以及针对
 * `[icon:health=…]`、`[icon:saturation-level=…]` 的实测行为。
 */

/** 自适应图标：`[icon:name=数值]`，按数值生成满/半图标组 */
export interface McIconPair {
  full: string;
  half: string;
}

export const MC_ADAPTIVE_ICONS: Readonly<Record<string, McIconPair>> = {
  health: { full: "health-full", half: "health-half" },
  "health-ex": { full: "health-full-ex", half: "health-half-ex" },
  "hunger-level": { full: "food-full-hunger-level", half: "food-half-hunger-level" },
  armor: { full: "armor-full", half: "armor-half" },
  toughness: { full: "toughness-full", half: "toughness-half" },
  "health-buff-regeneration": {
    full: "health-full-buff-regeneration",
    half: "health-half-buff-regeneration",
  },
  "health-buff-poison": { full: "health-full-buff-poison", half: "health-half-buff-poison" },
  "health-buff-wither": { full: "health-full-buff-wither", half: "health-half-buff-wither" },
  "health-jockey": { full: "health-full-jockey", half: "health-half-jockey" },
  // saturation-level 是四档图标，单独处理，见 ContentPreview
  "saturation-level": { full: "food-empty-saturation-level-100", half: "" },
};

/** 独立图标：`[icon:name]`，不接受任何参数 */
export const MC_STANDALONE_ICONS: ReadonlySet<string> = new Set([
  "health-full",
  "health-half",
  "health-empty",
  "health-full-buff-regeneration",
  "health-half-buff-regeneration",
  "health-full-buff-poison",
  "health-half-buff-poison",
  "health-full-buff-wither",
  "health-half-buff-wither",
  "health-full-jockey",
  "health-half-jockey",
  "health-full-ex",
  "health-half-ex",
  "health-full-buff-poison-ex",
  "health-half-buff-poison-ex",
  "health-full-buff-regeneration-ex",
  "health-half-buff-regeneration-ex",
  "health-full-buff-wither-ex",
  "health-half-buff-wither-ex",
  "food-full-hunger-level",
  "food-half-hunger-level",
  "food-empty-hunger-level",
  "food-buff-saturation",
  "food-buff-hunger",
  "food-empty-saturation-level-100",
  "food-empty-saturation-level-75",
  "food-empty-saturation-level-50",
  "food-empty-saturation-level-25",
  "armor-full",
  "armor-half",
  "armor-empty",
  "toughness-full",
  "toughness-half",
  "toughness-empty",
  "oxygen-full",
  "oxygen-empty",
  "exp",
]);

/** 饱和度尾图标：按 `value % 2` 的四档取 25 / 50 / 75 / 100 */
export const MC_SATURATION_LEVELS: Readonly<Record<25 | 50 | 75 | 100, string>> = {
  25: "food-empty-saturation-level-25",
  50: "food-empty-saturation-level-50",
  75: "food-empty-saturation-level-75",
  100: "food-empty-saturation-level-100",
};

/** 单个图标的 SVG（与服务端输出完全一致） */
export function renderMcIconSvg(name: string): string {
  return `<svg class="common-mcicon" aria-hidden="true"><use xlink:href="#icon-${name}"></use></svg>`;
}
