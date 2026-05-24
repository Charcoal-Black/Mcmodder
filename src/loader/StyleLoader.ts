import { Mcmodder } from "../Mcmodder";
import { McmodderPalette, PaletteModifierSchedule, PaletteModifierStep } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class StyleLoader {

  static applyPaletteModifier(palette: McmodderPalette, schedule: PaletteModifierSchedule) {
    // 递归大手子
    const work = (schedule: PaletteModifierSchedule, stepIndex: number, currentColor: string, prefixList: string[], resultList: string[]) => {
      const step = schedule[stepIndex];
      if (!step) {
        resultList.push(`--mcmodder-color-${ prefixList.join("-") }: ${ currentColor };`);
        return;
      }
      stepIndex++;
      work(schedule, stepIndex, currentColor, prefixList, resultList);
      Object.keys(step).forEach(prefix => {
        const modifier = step[prefix];
        const maxTier = modifier.maxTier;
        if (maxTier) {
          for (let i = 1; i <= maxTier; i++) {
            const newPrefixList = Array.from(prefixList);
            newPrefixList.push(prefix + i);
            work(schedule, stepIndex, modifier.converter(currentColor, i), newPrefixList, resultList);
          }
        } else {
          const newPrefixList = Array.from(prefixList);
          if (prefixList) {
            newPrefixList.push(prefix);
          }
          work(schedule, stepIndex, modifier.converter(currentColor), newPrefixList, resultList);
        }
      });
    }

    const result: string[] = [];

    Object.keys(palette).forEach(name => {
      const color = palette[name];
      work(schedule, 0, color, [name], result);
    });

    return result.join("\n");
  }

  static async run(parent: Mcmodder) {
    const module = import.meta.glob('../css/*.css', { query: "?raw", eager: true });
    const baseCss = (module["../css/base.css"] as any).default as string;
    const mcmodderUICss = (module["../css/mcmodderUI.css"] as any).default as string;
    const aprilFoolsCss = (module["../css/aprilFools.css"] as any).default as string;
    const tableThemeColorCss = (module["../css/tableThemeColor.css"] as any).default as string;
    const tableLeftAlignCss = (module["../css/tableLeftAlign.css"] as any).default as string;
    const tabSelectorInfoCss = (module["../css/tabSelectorInfo.css"] as any).default as string;
    const splitScreenOnVerifyCss = (module["../css/splitScreenOnVerify.css"] as any).default as string;
    const codemirrorCss = (module["../css/codemirror.css"] as any).default as string;

    const basePalette: McmodderPalette = {
      "background": "#fff",
      "text": "#333"
    };
    const nightPalette: McmodderPalette = {
      "background": "#111",
      "text": "#ddd"
    };
    const basePaletteBackgroundCss = this.applyPaletteModifier({ "background": basePalette.background },
        [{ "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 1.1 - 0.15 * tier!), maxTier: 4 }}]
    );
    const nightPaletteBackgroundCss = this.applyPaletteModifier({ "background": nightPalette.background },
        [{ "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 0.9 + 0.15 * tier!), maxTier: 4 }}]
    );
    const basePaletteTextCss = this.applyPaletteModifier({ "text": basePalette.text },
        [{ "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 1 + 0.15 * tier!), maxTier: 3 }}]
    );
    const nightPaletteTextCss = this.applyPaletteModifier({ "text": nightPalette.text },
        [{ "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 1 - 0.15 * tier!), maxTier: 3 }}]
    );

    const themeBasePalette: McmodderPalette = {
      "primary": McmodderUtils.setColorBrightness(parent.styleColors.tc1, 80),
      "accent": McmodderUtils.setColorBrightness(parent.styleColors.tc2, 80),
      "danger": McmodderUtils.setColorBrightness(parent.styleColors.tc3, 80)
    };
    const themeNightPalette: McmodderPalette = {
      "primary": McmodderUtils.setColorBrightness(parent.styleColors.tc1, 60),
      "accent": McmodderUtils.setColorBrightness(parent.styleColors.tc2, 60),
      "danger": McmodderUtils.setColorBrightness(parent.styleColors.tc3, 60)
    };
    const paletteTransparentStep: PaletteModifierStep = {
      "transparent": {
        converter: (color, tier) => McmodderUtils.setColorAlpha(color, Math.pow(0.5, tier!)),
        maxTier: 2
      }
    };
    const themePaletteBaseCss = this.applyPaletteModifier(themeBasePalette, [
      {
        "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 1 - 0.2 * tier!), maxTier: 2 },
        "light": { converter: color => McmodderUtils.adjustColorBrightness(color, 1.5) },
        "background": { converter: color => McmodderUtils.setColorBrightness(color, 99) },
      },
      paletteTransparentStep
    ]);
    const themePaletteNightCss = this.applyPaletteModifier(themeNightPalette, [
      {
        "dark": { converter: (color, tier) => McmodderUtils.adjustColorBrightness(color, 1 + 0.2 * tier!), maxTier: 2 },
        "light": { converter: color => McmodderUtils.adjustColorBrightness(color, 0.5) },
        "background": { converter: color => McmodderUtils.setColorBrightness(color, 8) }
      },
      paletteTransparentStep
    ]);

    const codemirrorPalette: McmodderPalette = {
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
      "cb-tools-color": "#333333"
    }
    const codemirrorPaletteCss = this.applyPaletteModifier(codemirrorPalette, [{
      "universal": { converter: color => color }
    }]);
    const codemirrorPaletteNightCss = this.applyPaletteModifier(codemirrorPalette, [{
      "universal": { converter: color => {
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
          const brightness = McmodderUtils.colorToHSL(color).l;
          return McmodderUtils.setColorBrightness(color, 100 - brightness);
        } }
    }]);

    const backgroundAlpha = McmodderUtils.clamp(Number(parent.utils.getConfig("backgroundAlpha")), 128, 255) / 0xFF;
    const textShadowAlpha = McmodderUtils.clamp(Number(parent.utils.getConfig("textShadowAlpha")), 0, 255) / 0xFF;
    const otherPaletteBaseCss = this.applyPaletteModifier({
      "background-transparent": McmodderUtils.setColorAlpha(basePalette.background, backgroundAlpha),
      "text-shadow": "#FFF0",
      "text-shadow-strong": "#8884",
      "box-shadow": "#8884",
      "pre-ins": "#406619",
      "pre-del": "#b30000",
      "code-text": "#c7254e",
      "code-background": "#f9f2f4",
      "text-success": "#28a745",
      "text-danger": "#dc3545",
      "text-info": "#31708f",
      "badges": "#fff8",
      "button": "#6c757d",
      "permission-editor": "#15f",
      "permission-admin": "#b3f",
      "permission-developer": "#f51",
      "itemrelation-jump": "#15f",
      "itemrelation-general": "#f51",
      "link": "#06c",
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
      "uknowtoomuch": "#000",
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
      "classstatus-1": "#2cbe4e",
      "classstatus-2": "#cb6431",
      "classstatus-3": "#cb2431",
      "classstatus-4": "#adadad",
      "classstatus-5": "#3675e9",
      "classstatus-6": "#303030"
    }, []);
    const otherPaletteNightCss = this.applyPaletteModifier({
      "background-transparent": McmodderUtils.setColorAlpha(nightPalette.background, backgroundAlpha),
      "text-shadow": McmodderUtils.setColorAlpha(nightPalette.background, textShadowAlpha),
      "text-shadow-strong": "#0004",
      "box-shadow": "#0008",
      "pre-ins": "#beff7b",
      "pre-del": "#ff7b7b",
      "code-text": "#f68",
      "code-background": "#423",
      "text-success": "#5f5",
      "text-danger": "#faa",
      "text-info": "#4be",
      "badges": "#1118",
      "button": "#9ab",
      "permission-editor": "#28f",
      "permission-admin": "#c6f",
      "permission-developer": "#f82",
      "itemrelation-jump": "#28f",
      "itemrelation-general": "#f82",
      "link": "#6bf",
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
      "uknowtoomuch": "#444",
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
      "classstatus-1": "#183",
      "classstatus-2": "#852",
      "classstatus-3": "#822",
      "classstatus-4": "#666",
      "classstatus-5": "#258",
      "classstatus-6": "#333"
    }, []);

    const bg = parent.utils.getConfig("defaultBackground") || McmodderValues.assets.bg;
    const bgNight = parent.utils.getConfig("defaultNightBackground") || McmodderValues.assets.nightMode.bg;
    const otherCss = `
      --mcmodder-image-background: ${ bg === "none" ? "none" : `url(${ bg }) fixed` };
    `
    const otherNightCss = `
      --mcmodder-image-background: ${ bgNight === "none" ? "none" : `url(${ bgNight }) fixed` };
    `

    const css = {
      themeColor: `
      :root {
        ${ basePaletteBackgroundCss }
        ${ basePaletteTextCss }
        ${ themePaletteBaseCss }
        ${ codemirrorPaletteCss }
        ${ otherPaletteBaseCss }
        ${ otherCss }
      }
      :root.dark {
        ${ nightPaletteBackgroundCss }
        ${ nightPaletteTextCss }
        ${ themePaletteNightCss }
        ${ codemirrorPaletteNightCss }
        ${ otherPaletteNightCss }
        ${ otherNightCss }
      }`,
      base: baseCss,
      mcmodderUI: mcmodderUICss,
      aprilFools: aprilFoolsCss,
      tableThemeColor: tableThemeColorCss,
      tableLeftAlign: tableLeftAlignCss,
      tabSelectorInfo: tabSelectorInfoCss,
      splitScreenOnVerify: splitScreenOnVerifyCss,
      codemirrorCss: codemirrorCss
    };

    const htmlNode = $("html");
    if (parent.utils.getConfig("disableGradient")) {
      htmlNode.addClass("mcmodder-config-disable-gradient");
    }
    // if (parent.utils.getConfig("disableFadeTransition")) {
    //   htmlNode.addClass("mcmodder-config-disable-fade-transition")
    // }

    let style = "";
    style += css.themeColor;
    style += css.base;
    if (parent.utils.getConfig("mcmodderUI")) {
      style += css.mcmodderUI;
    }
    if (parent.utils.getConfig("mcmodderUI") && parent.utils.getConfig("tableThemeColor")) {
      style += css.tableThemeColor;
    }
    if (parent.utils.getConfig("tableLeftAlign")) {
      style += css.tableLeftAlign;
    }
    if (parent.utils.getConfig("tabSelectorInfo")) {
      style += css.tabSelectorInfo;
    }
    if (parent.utils.getConfig("splitScreenOnVerify")) {
      style += css.splitScreenOnVerify;
    }
    // if (parent.utils.getConfig("markdownIt")) {
    style += css.codemirrorCss;
    // }
    if (parent.utils.getConfig("enableAprilFools")) { /* McmodderUtils.addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ") */
      style += css.aprilFools;
    }

    parent.css = style;
    McmodderUtils.addStyle(style);

    const radiusRatio: number | undefined = parent.utils.getConfig("radiusRatio");
    document.documentElement.style.setProperty("--mcmodder-ratio-radius", (radiusRatio === undefined ? 1 : radiusRatio).toString());

    parent.updateNightMode();
    const splashScreen = document.getElementById("mcmodder-splash-screen");
    if (splashScreen) {
      splashScreen.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
      setTimeout(() => splashScreen.remove(), 300);
    }
  }
}