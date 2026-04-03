import { Mcmodder } from "../Mcmodder";
import { McmodderPalette, PaletteModifierSchedule, PaletteModifierStep } from "../types";
import { McmodderUtils } from "../Utils";

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
          newPrefixList.push(prefix);
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

    const backgroundAlpha = McmodderUtils.clamp(Number(parent.utils.getConfig("backgroundAlpha")), 128, 255) / 0xFF;
    const textShadowAlpha = McmodderUtils.clamp(Number(parent.utils.getConfig("textShadowAlpha")), 0, 255) / 0xFF;
    const otherPaletteBaseCss = this.applyPaletteModifier({
      "background-transparent": McmodderUtils.setColorAlpha(basePalette.background, backgroundAlpha),
      "shadow": "#FFF0",
      "pre-ins": "#406619",
      "pre-del": "#b30000",
      "text-success": "#28a745",
      "text-danger": "#dc3545",
      "badges": "#fff8",
      "button": "#6c757d",
      "permission-editor": "#15f",
      "permission-admin": "#b3f",
      "permission-developer": "#f51",
      "itemrelation-jump": "#15f",
      "itemrelation-general": "#f51",
      "link": "#06c",
      "channel-1": "#334bdb",
      "channel-2": "#904623",
      "almanacs-good": "#f7f7b8",
      "almanacs-bad": "#ffceac",
      "copyright-title": "#3b566e",
      "copyright-text": "#6f8ba4",
      "alert-primary-1": "#004085",
      "alert-primary-2": "#cce5ff",
      "alert-primary-3": "#b8daff",
      "alert-warning-1": "#856404",
      "alert-warning-2": "#fff3cd",
      "alert-warning-3": "#ffeeba",
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
      "uknowtoomuch-hover": "#fff"
    }, []);
    const otherPaletteNightCss = this.applyPaletteModifier({
      "background-transparent": McmodderUtils.setColorAlpha(nightPalette.background, backgroundAlpha),
      "shadow": McmodderUtils.setColorAlpha(nightPalette.background, textShadowAlpha),
      "pre-ins": "#beff7b",
      "pre-del": "#ff7b7b",
      "text-success": "#5f5",
      "text-danger": "#faa",
      "badges": "#1118",
      "button": "#9ab",
      "permission-editor": "#28f",
      "permission-admin": "#c6f",
      "permission-developer": "#f82",
      "itemrelation-jump": "#28f",
      "itemrelation-general": "#f82",
      "link": "#6bf",
      "channel-1": "#8af",
      "channel-2": "#fa8",
      "almanacs-good": "#442",
      "almanacs-bad": "#432",
      "copyright-title": "#8cf",
      "copyright-text": "#8bd",
      "alert-primary-1": "#bdf",
      "alert-primary-2": "#036",
      "alert-primary-3": "#27d",
      "alert-warning-1": "#fdc",
      "alert-warning-2": "#430",
      "alert-warning-3": "#860",
      "verifyframe-error": "#f55",
      "verifyframe-warning": "#da6",
      "verifyframe-info": "#aaa",
      "uknowtoomuch": "#444",
      "uknowtoomuch-hover": "#ddd"
    }, []);

    const css = {
      themeColor: `
      :root {
        ${ basePaletteBackgroundCss }
        ${ basePaletteTextCss }
        ${ themePaletteBaseCss }
        ${ otherPaletteBaseCss }
      }
      :root.dark {
        ${ nightPaletteBackgroundCss }
        ${ nightPaletteTextCss }
        ${ themePaletteNightCss }
        ${ otherPaletteNightCss }
      }`,
      base: baseCss,
      mcmodderUI: mcmodderUICss,
      aprilFools: aprilFoolsCss,
      tableThemeColor: tableThemeColorCss,
      tableLeftAlign: tableLeftAlignCss,
      tabSelectorInfo: tabSelectorInfoCss,
      splitScreenOnVerify: splitScreenOnVerifyCss
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
    if (parent.utils.getConfig("enableAprilFools")) { /* McmodderUtils.addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ") */
      style += css.aprilFools;
    }

    parent.css = style;
    McmodderUtils.addStyle(style);

    parent.updateNightMode();
    const splashScreen = document.getElementById("mcmodder-splash-screen");
    if (splashScreen) {
      splashScreen.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
      setTimeout(() => splashScreen.remove(), 300);
    }
  }
}