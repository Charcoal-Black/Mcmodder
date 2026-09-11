import { createApp, type App, type Component } from "vue";

export interface MountedVueApp {
  app: App;
  host: HTMLElement;
  root: ShadowRoot;
  unmount: () => void;
}

const HOST_ID_PREFIX = "mcmodder-vue-host";

/** 宿主页面点击"脚本设置"菜单时派发，通知已挂载的设置弹窗重新打开 */
export const OPEN_SETTINGS_EVENT = "mcmodder:open-settings";

let hostCount = 0;

const BASE_RESET_STYLE = `
:host {
  display: block;
  font-family: var(--mcmodder-font-family, "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif);
  font-size: 14px;
  line-height: 1.5;
}
* {
  box-sizing: border-box;
}
`;

/**
 * Shadow DOM 隔离宿主页面的全局样式，注入在宿主页面的 CSS 无法匹配 Shadow
 * Root 内部的元素，因此组件样式必须在每个 Shadow Root 内复制一份。
 * 样式带有 data-v-* scoped 属性，复制进多个 Shadow Root 不会互相污染。
 */
export function syncVueStyles(root: ShadowRoot) {
  const sources = document.querySelectorAll("style[data-mcmodder-vue-css]");
  sources.forEach(source => {
    const style = document.createElement("style");
    style.textContent = source.textContent;
    root.appendChild(style);
  });
}

/**
 * @font-face 规则注入 Shadow Root 内部时 Chromium 不会触发字体下载，需注入
 * 宿主 document（Shadow Root 内元素可直接引用）。仅在宿主自身未提供
 * FontAwesome 时才注入，避免与宿主页面的字体定义冲突。
 */
export function syncFontAwesome(): boolean {
  if (document.getElementById("mcmodder-fontawesome-face")) return true;
  let faceCss = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | null = null;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule && /fontawesome/i.test(rule.style.fontFamily)) {
          faceCss = `@font-face { font-family: ${rule.style.fontFamily}; src: ${rule.style.getPropertyValue("src")}; font-weight: ${rule.style.getPropertyValue("font-weight") || "normal"}; font-style: ${rule.style.getPropertyValue("font-style") || "normal"}; }`;
          break;
        }
      }
      if (faceCss) break;
    }
  } catch {
    faceCss = "";
  }
  if (!faceCss) {
    faceCss = [
      "@font-face { font-family: 'FontAwesome'; src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2?v=4.7.0') format('woff2'), url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff?v=4.7.0') format('woff'); font-weight: normal; font-style: normal; }",
      "@font-face { font-family: 'FontAwesome'; src: url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf?v=4.7.0') format('truetype'); font-weight: normal; font-style: normal; }"
    ].join("\n");
  }
  const style = document.createElement("style");
  style.id = "mcmodder-fontawesome-face";
  style.textContent = faceCss;
  (document.head || document.documentElement).appendChild(style);
  return true;
}

export function mountVueApp<Props extends Record<string, any> = Record<string, any>>(
  Component: Component<Props>,
  props?: Props,
  target?: HTMLElement | string,
  options: { shadow?: boolean } = {}
): MountedVueApp {
  const container = typeof target === "string" ? document.querySelector(target) : (target || document.body);
  if (!container) {
    throw new Error(`mountVueApp: 目标容器不存在 (${ String(target) })`);
  }

  const host = document.createElement("div");
  host.id = `${HOST_ID_PREFIX}-${ ++hostCount }`;

  let root: ShadowRoot | null = null;
  if (options.shadow !== false) {
    root = host.attachShadow({ mode: "open" });
  }

  container.appendChild(host);

  const app = createApp(Component, (props || {}) as Props);

  const style = document.createElement("style");
  style.textContent = BASE_RESET_STYLE;
  (root || host).appendChild(style);

  // Shadow DOM 不继承宿主的 font-family，需显式继承宿主正文字体
  if (root) {
    const hostFont = getComputedStyle(document.body).fontFamily;
    if (hostFont) {
      const fontStyle = document.createElement("style");
      fontStyle.textContent = `:host { font-family: ${hostFont}; }`;
      root.appendChild(fontStyle);
    }
  }

  // 组件样式注入宿主页面后无法作用于 Shadow Root 内部，需复制进每个 Shadow Root
  if (root) {
    syncVueStyles(root);
  }
  syncFontAwesome();

  app.mount((root || host) as unknown as Element);

  return {
    app,
    host,
    root: root || (host as unknown as ShadowRoot),
    unmount() {
      app.unmount();
      host.remove();
    }
  };
}
