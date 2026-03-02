import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";

export class StyleLoader {
  static async run(parent: Mcmodder) {
    const module = import.meta.glob('../css/*.css', { query: "?raw" });
    const baseCss = (await module["../css/base.css"]() as any).default as string;
    const mcmodderUICss = (await module["../css/mcmodderUI.css"]() as any).default as string;
    const aprilFoolsCss = (await module["../css/aprilFools.css"]() as any).default as string;
    const tableThemeColorCss = (await module["../css/tableThemeColor.css"]() as any).default as string;
    const tableLeftAlignCss = (await module["../css/tableLeftAlign.css"]() as any).default as string;
    parent.css = {
      themeColor: `
:root {
  --mcmodder-tc1: ${parent.styleColors.tc1};
  --mcmodder-tc2: ${parent.styleColors.tc2};
  --mcmodder-tc3: ${parent.styleColors.tc3};
  --mcmodder-td1: ${parent.styleColors.td1};
  --mcmodder-td2: ${parent.styleColors.td2};
  --mcmodder-tca1: ${parent.styleColors.tca1};
  --mcmodder-tca2: ${parent.styleColors.tca2};
  --mcmodder-tca3: ${parent.styleColors.tca3};
  --mcmodder-tda1: ${parent.styleColors.tda1};
  --mcmodder-tda2: ${parent.styleColors.tda2};
  --mcmodder-tcaa1: ${parent.styleColors.tcaa1};
  --mcmodder-tcaa2: ${parent.styleColors.tcaa2};
  --mcmodder-pre-ins: #406619;
  --mcmodder-pre-del: #b30000;
  --mcmodder-bg: rgba(255, 255, 255, ${Math.max(Math.min(parent.utils.getConfig("backgroundAlpha"), 255), 128) / 255});
}
:root.dark {
  --mcmodder-tc1: ${parent.styleColors.td1};
  --mcmodder-tc2: ${parent.styleColors.td2};
  --mcmodder-td1: ${parent.styleColors.tc1};
  --mcmodder-td2: ${parent.styleColors.tc2};
  --mcmodder-bg: rgba(17, 17, 17, ${Math.max(Math.min(parent.utils.getConfig("backgroundAlpha"), 255), 128) / 255});
  --mcmodder-ts: rgba(240, 248, 255, ${Math.max(Math.min(parent.utils.getConfig("textShadowAlpha"), 255), 0) / 255});
}`,
      base: baseCss,
      mcmodderUI: mcmodderUICss,
      aprilFools: aprilFoolsCss,
      tableThemeColor: tableThemeColorCss,
      tableLeftAlign: tableLeftAlignCss
    };

    const htmlNode = $("html");
    if (parent.utils.getConfig("disableGradient")) {
      htmlNode.addClass("mcmodder-config-disable-gradient");
    }
    // if (parent.utils.getConfig("disableFadeTransition")) {
    //   htmlNode.addClass("mcmodder-config-disable-fade-transition")
    // }

    let style = "";
    style += parent.css.themeColor;
    style += parent.css.base;
    if (parent.utils.getConfig("mcmodderUI")) {
      style += parent.css.mcmodderUI;
    }
    if (parent.utils.getConfig("mcmodderUI") && parent.utils.getConfig("tableThemeColor")) {
      style += parent.css.tableThemeColor;
    }
    if (parent.utils.getConfig("tableLeftAlign")) {
      style += parent.css.tableLeftAlign;
    }
    McmodderUtils.addStyle(style);

    parent.updateNightMode();
  }
}