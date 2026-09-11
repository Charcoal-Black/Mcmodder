import { HeadConfig, HeadConfigInitializer } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

export class McmodderTable {

  static readonly ROW_EXPAND = 2;
  static readonly ROW_HEIGHT_DEFAULT = 48;

  static readonly DISPLAYRULE_NUMBER = (data: string | number) => data ? Number(data).toLocaleString() : null;
  static readonly DISPLAYRULE_ARRAY = (data: (string | number)[]) => data.join(", ");
  static readonly DISPLAYRULE_MONOSPACE = (data: string) => data ? `<span class="mcmodder-monospace">${ data }</span>` : null;
  static readonly DISPLAYRULE_DATE_MILLISEC_EN = (data: string | number) => (new Date(data)).toLocaleDateString();
  static readonly DISPLAYRULE_DATE_MILLISEC_ZH = (data: string | number) => McmodderUtils.getFormattedChineseDate(new Date(Number(data)));
  static readonly DISPLAYRULE_TIME_MILLISEC = (data: string | number) => (new Date(data)).toLocaleString();
  static readonly DISPLAYRULE_DATE_SEC_EN = (data: string | number) => McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN(Number(data) * 1e3);
  static readonly DISPLAYRULE_DATE_SEC_ZH = (data: string | number) => McmodderTable.DISPLAYRULE_DATE_MILLISEC_ZH(Number(data) * 1e3);
  static readonly DISPLAYRULE_LINK_ITEM = (data: number) => `<a target="_blank" href="${ McmodderUtils.getItemURL(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_ITEM_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_ITEM).join(", ");
  static readonly DISPLAYRULE_LINK_CLASS = (data: number) => `<a target="_blank" href="${ McmodderUtils.getClassURL(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_CLASS_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_CLASS).join(", ");
  static readonly DISPLAYRULE_LINK_CENTER = (data: number) => `<a target="_blank" href="${ McmodderUtils.getCenterURL(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_CENTER_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_CENTER).join(", ");
  static readonly DISPLAYRULE_IMAGE_BASE64 = (data: string) => data ? `<img src="${McmodderUtils.appendBase64ImgPrefix(data)}" onerror="this.src='${ McmodderValues.assets.mcmod.emptyItemIcon32x }'; this.onerror=null;">` : null;
  static readonly DISPLAYRULE_SIZE = (data: string | number) => McmodderUtils.getFormattedSize(Number(data));
  static readonly DISPLAYRULE_LINK_CENTER_WITH_NAME = (data: string) => {
    const row = data.split(",");
    return `<a target="_blank" href="${ McmodderUtils.getCenterURL(Number(row[0])) }">${ row[1] }`;
  }
  static readonly DISPLAYRULE_HOVER = (data: string) => {
    const omittedText = data.length > 10 ? `${data.slice(0, 10)}..` : data;
    return `<a data-toggle="tooltip" data-html="true" data-original-title="${ data.replaceAll('"', '\\"').replaceAll(/\n+/g, "<br>") }">${ omittedText }</a>`
  }

  static parseHeadConfigInitializer<T>(config: HeadConfigInitializer<T>): HeadConfig<T> {
    if (typeof config === "string") return {
      name: config
    };
    return {
      name: config[0],
      displayRule: config[1]
    };
  }
}