import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";

/**
 * 样式加载器：把若干张「调色盘」展开为 `--mcmodder-color-*` CSS 变量，
 * 再与 `src/css/*.css` 的静态样式一起注入宿主页面，并处理圆角比例、
 * 夜间模式切换与首屏遮罩等收尾工作。
 *
 * # 调色盘系统（本文件的核心）
 * 调色盘（`Palette`）只是「名字 → 颜色」的映射，但页面实际需要的是一族衍生色：
 * 同一个语义色（如 `primary`）要额外派生出 `dark1`/`dark2`/`light`/`background`/
 * `transparent1`/`transparent2` 等变体，亮色与夜间两套还方向相反。为此引入
 * `PaletteModifierSchedule`（修饰表）：按序排列若干「修饰步骤」，每个步骤内若干
 * 「修饰」（如 `dark`/`light`/`transparent`）各带一个颜色转换函数 `converter` 与
 * 可选的 `maxTier`（展开几档）。`applyPaletteModifier` 据此把调色盘递归展开成一组
 * CSS 自定义属性，变量名形如 `--mcmodder-color-{名字}-{修饰串}{档号}`。
 *
 * - `converter` 收一个可选 `tier`（档号）：多档修饰用它区分 `dark1~dark4` 等
 *   不同深浅，单档修饰（未设 `maxTier`）则收不到该参数；
 * - 多档修饰：变量名追加「修饰名+档号」，如 `dark1`、`transparent2`；
 * - 单档修饰：变量名追加修饰名本身，如 `light`、`background`、`universal`；
 * - 每个步骤都会先「原样穿透」一次（不加修饰进入下一步），保证每个名字最终都产出
 *   一个不带修饰的基础变量（如 `--mcmodder-color-primary`）。
 *
 * 亮色变量写入 `:root`，夜间变量写入 `:root.dark`；`base.css` 等全局样式里通过
 * `var(--mcmodder-color-*)` 取色，从而随 `<html>` 上的 `dark` 类自动切换。
 */
export class StyleLoader {
  /**
   * 把一张调色盘按修饰表展开成 CSS 自定义属性声明（多行文本）。
   *
   * # 递归展开算法
   * 从 `stepIndex = 0` 出发，持有「当前颜色」与「前缀列表」（初始为 `[名字]`）：
   * 1. 若已走完所有步骤（`!schedule[stepIndex]`），输出一行
   *    `--mcmodder-color-{前缀.join("-")}: {当前颜色};` 并返回（递归终点）；
   * 2. 否则先「原样穿透」：不改变颜色与前缀，直接进入下一 `stepIndex`；
   * 3. 再遍历当前步骤的每个修饰（按 `Object.keys` 顺序）：
   *    - 设 `maxTier` 时：对 `1..maxTier` 每一档，前缀追加 `修饰名+档号`，
   *      颜色经 `converter(当前颜色, 档号)` 变换后进入下一步骤；
   *    - 未设 `maxTier` 时：前缀追加修饰名，颜色经 `converter(当前颜色)` 变换后进入下一步骤。
   * 于是基础色、各档修饰、各修饰间的组合都会被逐一枚举。
   *
   * @param palette 待展开的调色盘（名字 → 初始颜色）。
   * @param schedule 修饰表；传空数组 `[]` 则每个名字只产出基础变量。
   * @returns 多行 CSS 变量声明，形如
   *          `--mcmodder-color-primary: #xxx;`、`--mcmodder-color-primary-dark2: #xxx;`。
   */
  static applyPaletteModifier(palette: Palette, schedule: PaletteModifierSchedule) {
    // 递归大手子
    const work = (
      schedule: PaletteModifierSchedule,
      stepIndex: number,
      currentColor: string,
      prefixList: string[],
      resultList: string[],
    ) => {
      const step = schedule[stepIndex];
      if (!step) {
        resultList.push(`--mcmodder-color-${prefixList.join("-")}: ${currentColor};`);
        return;
      }
      stepIndex++;
      work(schedule, stepIndex, currentColor, prefixList, resultList);
      Object.keys(step).forEach((prefix) => {
        const modifier = step[prefix];
        const maxTier = modifier.maxTier;
        if (maxTier) {
          for (let i = 1; i <= maxTier; i++) {
            const newPrefixList = Array.from(prefixList);
            newPrefixList.push(prefix + i);
            work(
              schedule,
              stepIndex,
              modifier.converter(currentColor, i),
              newPrefixList,
              resultList,
            );
          }
        } else {
          const newPrefixList = Array.from(prefixList);
          if (prefixList) {
            newPrefixList.push(prefix);
          }
          work(schedule, stepIndex, modifier.converter(currentColor), newPrefixList, resultList);
        }
      });
    };

    const result: string[] = [];

    Object.keys(palette).forEach((name) => {
      const color = palette[name];
      work(schedule, 0, color, [name], result);
    });

    return result.join("\n");
  }

  /**
   * 组装并注入整套样式（组合根启动阶段调用，见 `Mcmodder` 构造流程）。
   *
   * # 流程
   * 1. 用 `import.meta.glob` 读入 `src/css/*.css` 原始文本；
   * 2. 定义基础调色盘（background/text 亮暗两套）、主题调色盘（由主题色 `tc1`/`tc2`
   *    派生 primary/accent/danger/success/warning）、CodeMirror 语法高亮调色盘、
   *    高亮标记色，各自调用 `applyPaletteModifier` 展开成亮色与夜间两套变量；
   * 3. 定义「其他杂色」的亮/夜两套调色盘（背景透明、文字阴影、链接、态度、
   *    加载平台、版本标记、分类状态等固定色板），直接以 `[]` 修饰表产出基础变量；
   * 4. 将上述变量并入 `:root`（亮色）与 `:root.dark`（夜间）两个选择器，
   *    并根据用户配置开关拼接 `base`/`mcmodderUI`/`tableThemeColor`/`tableLeftAlign`/
   *    `tabSelectorInfo`/`splitScreenOnVerify`/`codemirrorCss`/`aprilFools` 等静态 CSS；
   * 5. 合并结果存入 `parent.css` 并通过 `Utils.addStyle` 注入 `<head>`；
   * 6. 写入 `--mcmodder-ratio-radius` 圆角比例变量，调用 `parent.updateNightMode()`
   *    应用当前主题，最后给防闪烁遮罩写入淡入动画并移除遮罩，完成首屏渲染。
   *
   * @param parent 组合根 `Mcmodder` 实例（取用 `configRepository`、`styleColors`、`css` 等）。
   */
  static async run(parent: Mcmodder) {
    const configs = parent.configRepository;
    const module = import.meta.glob("../css/*.css", {
      query: "?raw",
      eager: true,
    });
    const mods = module as Record<string, { default: string }>;
    const importCSS = (name: string) => mods[`../css/${name}.css`].default;

    const baseCss = importCSS("base");
    const mcmodderUICss = importCSS("mcmodderUI");
    const attitudeCss = importCSS("attitude");
    const aprilFoolsCss = importCSS("aprilFools");
    const tableThemeColorCss = importCSS("tableThemeColor");
    const tableLeftAlignCss = importCSS("tableLeftAlign");
    const tabSelectorInfoCss = importCSS("tabSelectorInfo");
    const splitScreenOnVerifyCss = importCSS("splitScreenOnVerify");
    const codemirrorCss = importCSS("codemirror");

    const basePalette: Palette = {
      background: "#fff",
      text: "#333",
    };
    const nightPalette: Palette = {
      background: "#111",
      text: "#ddd",
    };
    const basePaletteBackgroundCss = this.applyPaletteModifier(
      { background: basePalette.background },
      [
        {
          dark: {
            converter: (color, tier) => Utils.adjustColorBrightness(color, 1.1 - 0.15 * tier!),
            maxTier: 4,
          },
        },
      ],
    );
    const nightPaletteBackgroundCss = this.applyPaletteModifier(
      { background: nightPalette.background },
      [
        {
          dark: {
            converter: (color, tier) => Utils.adjustColorBrightness(color, 0.9 + 0.15 * tier!),
            maxTier: 4,
          },
        },
      ],
    );
    const basePaletteTextCss = this.applyPaletteModifier({ text: basePalette.text }, [
      {
        dark: {
          converter: (color, tier) => Utils.adjustColorBrightness(color, 1 + 0.15 * tier!),
          maxTier: 3,
        },
      },
    ]);
    const nightPaletteTextCss = this.applyPaletteModifier({ text: nightPalette.text }, [
      {
        dark: {
          converter: (color, tier) => Utils.adjustColorBrightness(color, 1 - 0.15 * tier!),
          maxTier: 3,
        },
      },
    ]);

    const themeBasePalette: Palette = {
      primary: Utils.setColorBrightness(parent.styleColors.tc1, 80),
      accent: Utils.setColorBrightness(parent.styleColors.tc2, 80),
      danger: Utils.setColorBrightness("#dc3545", 80),
      success: Utils.setColorBrightness("#28a745", 80),
      warning: Utils.setColorBrightness("#8a6d3b", 80),
    };
    const themeNightPalette: Palette = {
      primary: Utils.setColorBrightness(parent.styleColors.tc1, 60),
      accent: Utils.setColorBrightness(parent.styleColors.tc2, 60),
      danger: Utils.setColorBrightness("#dc3545", 60),
      success: Utils.setColorBrightness("#28a745", 60),
      warning: Utils.setColorBrightness("#8a6d3b", 60),
    };
    const paletteTransparentStep: PaletteModifierStep = {
      transparent: {
        converter: (color, tier) => Utils.setColorAlpha(color, Math.pow(0.5, tier!)),
        maxTier: 2,
      },
    };
    const themePaletteBaseCss = this.applyPaletteModifier(themeBasePalette, [
      {
        dark: {
          converter: (color, tier) => Utils.adjustColorBrightness(color, 1 - 0.2 * tier!),
          maxTier: 2,
        },
        light: {
          converter: (color) => Utils.adjustColorBrightness(color, 1.5),
        },
        background: {
          converter: (color) => Utils.setColorBrightness(color, 99),
        },
      },
      paletteTransparentStep,
    ]);
    const themePaletteNightCss = this.applyPaletteModifier(themeNightPalette, [
      {
        dark: {
          converter: (color, tier) => Utils.adjustColorBrightness(color, 1 + 0.2 * tier!),
          maxTier: 2,
        },
        light: {
          converter: (color) => Utils.adjustColorBrightness(color, 0.5),
        },
        background: {
          converter: (color) => Utils.setColorBrightness(color, 8),
        },
      },
      paletteTransparentStep,
    ]);

    const codemirrorPalette: Palette = {
      "cm-keyword": "#708",
      "cm-atom": "#219",
      "cm-number": "#164",
      "cm-def": "#00f",
      "cm-variable": "#000",
      "cm-variable-2": "#05a",
      "cm-variable-3": "#085",
      "cm-property": "#000",
      "cm-operator": "#000",
      "cm-comment": "#a50",
      "cm-string": "#a11",
      "cm-string-2": "#f50",
      "cm-meta": "#555",
      "cm-error": "#f00",
      "cm-qualifier": "#555",
      "cm-builtin": "#30a",
      "cm-bracket": "#cc7",
      "cm-tag": "#170",
      "cm-attribute": "#00c",
      "cm-header": "#a0a",
      "cm-quote": "#090",
      "cm-hr": "#999",
      "cm-link": "#00c",
      "sh-comment": "#008200",
      "sh-string": "#0000ff",
      "sh-keyword": "#006699",
      "sh-preprocessor": "#808080",
      "sh-variable": "#aa7700",
      "sh-value": "#009900",
      "sh-functions": "#ff1493",
      "sh-constants": "#0066cc",
      "sh-color1": "#808080",
      "sh-color2": "#ff1493",
      "sh-color3": "#ff0000",
      "sh-highlighted-bg": "#e0e0e0",
      "sh-gutter-theme": "#6ce26c",
      "java-highlighted-bg": "#c3defe",
      "java-gutter-theme": "#d4d0c8",
      "java-xml-keyword": "#3f7f7f",
      "java-xml-color1": "#7f007f",
      "java-xml-string": "#2a00ff",
      "java-comments": "#3f5fbf",
      "java-string": "#2a00ff",
      "java-keyword": "#7f0055",
      "java-preprocessor": "#646464",
      "java-variable": "#aa7700",
      "java-value": "#009900",
      "java-functions": "#ff1493",
      "java-constants": "#0066cc",
      "java-plain": "#000000",
      "cb-line-color": "#555555",
      "cb-line-border": "#dddddd",
      "cb-plain": "#2b7068",
      "cb-functions": "#007bb3",
      "cb-selector": "#800040",
      "cb-nbt": "#666010",
      "cb-tools-bg": "#eeeeee",
      "cb-tools-color": "#333333",
    };
    const codemirrorPaletteCss = this.applyPaletteModifier(codemirrorPalette, [
      {
        universal: { converter: (color) => color },
      },
    ]);
    const codemirrorPaletteNightCss = this.applyPaletteModifier(codemirrorPalette, [
      {
        universal: {
          converter: (color) => {
            if (color === "#646464") return "#e5c07b";
            if (color === "#7f0055") return "#569cd6";
            if (color === "#2a00ff") return "#ce9178";
            if (color === "#3f5fbf") return "#608b4e";
            if (color === "#aa7700" || color === "#ff1493" || color === "#000000") return "#abb2bf";
            if (color === "#009900") return "#b5cea8";
            if (color === "#0066cc") return "#c678dd";
            if (color === "#555555") return "#888888";
            if (color === "#dddddd") return "#343434";
            if (color === "#2b7068") return "#54b7aa";
            if (color === "#007bb3") return "#40c4ff";
            if (color === "#800040") return "#ff80c0";
            if (color === "#666010") return "#efe89a";
            if (color === "#eeeeee") return "#050505";
            if (color === "#333333") return "#ffffff";
            if (color === "#008200") return "#608b4e";
            if (color === "#0000ff") return "#ce9178";
            if (color === "#006699") return "#569cd6";
            if (color === "#808080") return "#abb2bf";
            if (color === "#ff0000") return "#f44747";
            const brightness = Utils.colorToHSL(color).l;
            return Utils.setColorBrightness(color, 100 - brightness);
          },
        },
      },
    ]);

    const highlightPalette: Palette = {
      "highlight-gold": "#fd0",
      "highlight-aqua": "#8fd",
      "highlight-pink": "#fcc",
      "highlight-greenyellow": "#bf3",
    };
    const highlightPaletteCss = this.applyPaletteModifier(highlightPalette, [
      paletteTransparentStep,
    ]);

    const backgroundAlpha =
      Utils.clamp(Number(configs.getSettings("backgroundAlpha")), 128, 255) / 0xff;
    const textShadowAlpha =
      Utils.clamp(Number(configs.getSettings("textShadowAlpha")), 0, 255) / 0xff;
    const otherPaletteBaseCss = this.applyPaletteModifier(
      {
        "background-transparent": Utils.setColorAlpha(basePalette.background, backgroundAlpha),
        "text-shadow": "#FFF0",
        "text-shadow-strong": "#8884",
        "box-shadow": "#8884",
        "pre-ins": "#406619",
        "pre-del": "#b30000",
        "code-text": "#c7254e",
        "code-background": "#f9f2f4",
        "text-success": "#28a745",
        "text-danger": "#dc3545",
        "text-warning": "#8a6d3b",
        "text-info": "#31708f",
        "text-primary": "#31708f",
        badges: "#fff8",
        button: "#6c757d",
        "permission-editor": "#15f",
        "permission-admin": "#b3f",
        "permission-developer": "#f51",
        "itemrelation-jump": "#15f",
        "itemrelation-general": "#f51",
        link: "#06c",
        "link-visited": "#551a8b",
        "link-foot": "#008000",
        "channel-1": "#334bdb",
        "channel-2": "#904623",
        "almanacs-good": "#f7f7b880",
        "almanacs-bad": "#ffceac80",
        "copyright-title": "#3b566e",
        "copyright-text": "#6f8ba4",
        "alert-primary-1": "#004085",
        "alert-primary-2": "#cce5ff",
        "alert-primary-3": "#b8daff",
        "alert-warning-1": "#856404",
        "alert-warning-2": "#fff3cd",
        "alert-warning-3": "#ffeeba",
        "alert-danger-1": "#721c24",
        "alert-danger-2": "#f8d7da",
        "alert-danger-3": "#f5c6cb",
        "verifyframe-error": "#933",
        "verifyframe-warning": "#7c4916",
        "verifyframe-info": "#666",
        "version-alpha-1": "#f55",
        "version-alpha-2": "#faa8",
        "version-beta-1": "#55f",
        "version-beta-2": "#aaf8",
        "version-release-1": "#5a5",
        "version-release-2": "#afa8",
        "platform-forge": "#5b6197",
        "platform-fabric": "#8a7b71",
        "platform-neoforge": "#dc895c",
        "platform-quilt": "#8b61d4",
        "platform-liteloader": "#4c90de",
        "platform-nilloader": "#dd5088",
        "platform-javaagent": "#111827",
        uknowtoomuch: "#000",
        "uknowtoomuch-hover": "#fff",
        "attitude-up": "#09f",
        "attitude-grintears": "#ad901c",
        "attitude-heart": "#c03",
        "attitude-flushed": "#000",
        "attitude-down": "#222",
        "attitude-lemon": "#938626",
        "attitude-horsehead": "#74260c",
        "attitude-heartbroken": "#900",
        "attitude-angry": "#f30",
        "attitude-tired": "#960",
        "attitude-snowflake": "#39c",
        "attitude-handshake": "#363",
        "attitude-devil-angry": "#8a1212",
        "classstatus-1": "#2cbe4e",
        "classstatus-2": "#cb6431",
        "classstatus-3": "#cb2431",
        "classstatus-4": "#adadad",
        "classstatus-5": "#3675e9",
        "classstatus-6": "#303030",
      },
      [],
    );
    const otherPaletteNightCss = this.applyPaletteModifier(
      {
        "background-transparent": Utils.setColorAlpha(nightPalette.background, backgroundAlpha),
        "text-shadow": Utils.setColorAlpha(nightPalette.background, textShadowAlpha),
        "text-shadow-strong": "#0004",
        "box-shadow": "#0008",
        "pre-ins": "#beff7b",
        "pre-del": "#ff7b7b",
        "code-text": "#f68",
        "code-background": "#423",
        "text-success": "#4c4",
        "text-danger": "#faa",
        "text-warning": "#fa5",
        "text-info": "#4be",
        "text-primary": "#4be",
        badges: "#1118",
        button: "#9ab",
        "permission-editor": "#28f",
        "permission-admin": "#c6f",
        "permission-developer": "#f82",
        "itemrelation-jump": "#28f",
        "itemrelation-general": "#f82",
        link: "#6bf",
        "link-visited": "#96c",
        "link-foot": "#3a3",
        "channel-1": "#8af",
        "channel-2": "#fa8",
        "almanacs-good": "#4428",
        "almanacs-bad": "#4328",
        "copyright-title": "#8cf",
        "copyright-text": "#8bd",
        "alert-primary-1": "#bdf",
        "alert-primary-2": "#036",
        "alert-primary-3": "#27d",
        "alert-warning-1": "#fdc",
        "alert-warning-2": "#430",
        "alert-warning-3": "#860",
        "alert-danger-1": "#fcc",
        "alert-danger-2": "#411",
        "alert-danger-3": "#822",
        "verifyframe-error": "#f55",
        "verifyframe-warning": "#da6",
        "verifyframe-info": "#aaa",
        uknowtoomuch: "#444",
        "uknowtoomuch-hover": "#ddd",
        "attitude-up": "#09f",
        "attitude-grintears": "#db1",
        "attitude-heart": "#f14",
        "attitude-flushed": "#fff",
        "attitude-down": "#666",
        "attitude-lemon": "#a93",
        "attitude-horsehead": "#d64",
        "attitude-heartbroken": "#a11",
        "attitude-angry": "#f30",
        "attitude-tired": "#b71",
        "attitude-snowflake": "#7ac",
        "attitude-handshake": "#383",
        "attitude-devil-angry": "#ff4d4d",
        "classstatus-1": "#183",
        "classstatus-2": "#852",
        "classstatus-3": "#822",
        "classstatus-4": "#666",
        "classstatus-5": "#258",
        "classstatus-6": "#333",
      },
      [],
    );

    const bg = configs.getSettings("defaultBackground") || Values.assets.bg;
    const bgNight = configs.getSettings("defaultNightBackground") || Values.assets.nightMode.bg;
    const otherCss = `
      --mcmodder-image-background: ${bg === "none" ? "none" : `url(${bg}) fixed`};
    `;
    const otherNightCss = `
      --mcmodder-image-background: ${bgNight === "none" ? "none" : `url(${bgNight}) fixed`};
    `;

    const css = {
      themeColor: `
      :root {
        ${basePaletteBackgroundCss}
        ${basePaletteTextCss}
        ${themePaletteBaseCss}
        ${highlightPaletteCss}
        ${codemirrorPaletteCss}
        ${otherPaletteBaseCss}
        ${otherCss}
      }
      :root.dark {
        ${nightPaletteBackgroundCss}
        ${nightPaletteTextCss}
        ${themePaletteNightCss}
        ${codemirrorPaletteNightCss}
        ${otherPaletteNightCss}
        ${otherNightCss}
      }`,
      base: baseCss,
      mcmodderUI: mcmodderUICss,
      attitude: attitudeCss,
      aprilFools: aprilFoolsCss,
      tableThemeColor: tableThemeColorCss,
      tableLeftAlign: tableLeftAlignCss,
      tabSelectorInfo: tabSelectorInfoCss,
      splitScreenOnVerify: splitScreenOnVerifyCss,
      codemirrorCss: codemirrorCss,
    };

    const htmlNode = $("html");
    if (configs.getSettings("disableGradient")) {
      htmlNode.addClass("mcmodder-config-disable-gradient");
    }
    // if (configs.get("disableFadeTransition")) {
    //   htmlNode.addClass("mcmodder-config-disable-fade-transition")
    // }

    let style = "";
    style += css.themeColor;
    style += css.base;
    // if (configs.get("mcmodderUI")) {
    style += css.mcmodderUI;
    // }
    if (configs.getSettings("customAttitude")) {
      style += css.attitude;
    }
    if (/* configs.get("mcmodderUI") && */ configs.getSettings("tableThemeColor")) {
      style += css.tableThemeColor;
    }
    if (configs.getSettings("tableLeftAlign")) {
      style += css.tableLeftAlign;
    }
    if (configs.getSettings("tabSelectorInfo")) {
      style += css.tabSelectorInfo;
    }
    if (configs.getSettings("splitScreenOnVerify")) {
      style += css.splitScreenOnVerify;
    }
    // if (configs.get("markdownIt")) {
    style += css.codemirrorCss;
    // }
    if (configs.getSettings("enableAprilFools")) {
      /* McmodderUtils.addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ") */
      style += css.aprilFools;
    }

    parent.css = style;
    Utils.addStyle(style);

    const radiusRatio: number | undefined = configs.getSettings("radiusRatio");
    document.documentElement.style.setProperty(
      "--mcmodder-ratio-radius",
      (radiusRatio === undefined ? 1 : radiusRatio).toString(),
    );

    parent.updateNightMode();
    const splashScreen = document.getElementById("mcmodder-splash-screen");
    if (splashScreen) {
      splashScreen.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
      setTimeout(() => splashScreen.remove(), 300);
    }
  }
}
