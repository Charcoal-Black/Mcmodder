import { Mcmodder } from "../Mcmodder";
import { HeadConfig, HeadConfigInitializer, HeadConfigs, HeadConfigsInitializer, McmodderTableAcceptable, McmodderTableDataList, McmodderTableRowData, McmodderTableRowRange } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { ProgressBar } from "../widget/progress/ProgressBar";

export class McmodderTable<McmodderTableData extends McmodderTableAcceptable> {

  static readonly ROW_EXPAND = 2;
  static readonly THROTTLE_INTERVAL = 16; // ~60 FPS
  static readonly ROW_HEIGHT_DEFAULT = 48;

  static readonly DISPLAYRULE_NUMBER = (data: string | number) => data ? Number(data).toLocaleString() : "-";
  static readonly DISPLAYRULE_ARRAY = (data: (string | number)[]) => data.join(", ");
  static readonly DISPLAYRULE_MONOSPACE = (data: string) => data ? `<span class="mcmodder-monospace">${ data }</span>` : "-";
  static readonly DISPLAYRULE_DATE_MILLISEC_EN = (data: string | number) => (new Date(data)).toLocaleDateString();
  static readonly DISPLAYRULE_DATE_MILLISEC_ZH = (data: string | number) => McmodderUtils.getFormattedChineseDate(new Date(Number(data)));
  static readonly DISPLAYRULE_TIME_MILLISEC = (data: string | number) => (new Date(data)).toLocaleString();
  static readonly DISPLAYRULE_DATE_SEC_EN = (data: string | number) => McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN(Number(data) * 1e3);
  static readonly DISPLAYRULE_DATE_SEC_ZH = (data: string | number) => McmodderTable.DISPLAYRULE_DATE_MILLISEC_ZH(Number(data) * 1e3);
  static readonly DISPLAYRULE_LINK_ITEM = (data: number) => `<a target="_blank" href="${ McmodderUtils.getItemURLByID(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_ITEM_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_ITEM).join(", ");
  static readonly DISPLAYRULE_LINK_CLASS = (data: number) => `<a target="_blank" href="${ McmodderUtils.getClassURLByID(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_CLASS_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_CLASS).join(", ");
  static readonly DISPLAYRULE_LINK_CENTER = (data: number) => `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(data) }">${ data }</a>`;
  static readonly DISPLAYRULE_LINK_CENTER_ARRAY = (data: number[]) => data.map(McmodderTable.DISPLAYRULE_LINK_CENTER).join(", ");
  static readonly DISPLAYRULE_IMAGE_BASE64 = (data: string) => data ? `<img src="${McmodderUtils.appendBase64ImgPrefix(data)}" onerror="this.src='${ McmodderValues.assets.mcmod.emptyItemIcon32x }'; this.onerror=null;">` : "-";
  static readonly DISPLAYRULE_SIZE = (data: string | number) => McmodderUtils.getFormattedSize(Number(data));
  static readonly DISPLAYRULE_LINK_CENTER_WITH_NAME = (data: string) => {
    const row = data.split(",");
    return `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(Number(row[0])) }">${ row[1] }`;
  }
  static readonly DISPLAYRULE_HOVER = (data: string) => {
    const omittedText = data.length > 10 ? `${data.slice(0, 10)}..` : data;
    return `<a data-toggle="tooltip" data-html="true" data-original-title="${ data.replaceAll('"', '\\"').replaceAll(/\n+/g, "<br>") }">${ omittedText }</a>`
  }

  readonly parent: Mcmodder;
  readonly $instance: JQuery;
  readonly instance: Element;
  readonly $table: JQuery;
  readonly $thead: JQuery;
  readonly $tbody: JQuery;
  readonly $marginTop: JQuery;
  readonly $marginBottom: JQuery;
  readonly $empty: JQuery;
  readonly $loadingOverlay: JQuery;
  isLoading: boolean;
  renderingRows: McmodderTableRowRange;
  screenContainableRows = 1;
  rowHeight: number;
  loadingProgress: ProgressBar;
  readonly headConfigs: HeadConfigs<McmodderTableData> = {};

  protected currentData: McmodderTableRowData<McmodderTableData>[];

  private static parseHeadConfigInitializer<T>(config: HeadConfigInitializer<T>): HeadConfig<T> {
    if (typeof config === "string") return {
      name: config
    };
    return {
      name: config[0],
      displayRule: config[1]
    };
  }

  constructor(parent: Mcmodder, attr: Object, headConfigs: HeadConfigsInitializer<McmodderTableData>) {
    this.parent = parent;
    this.$instance = $(`
      <div class="mcmodder-table-container">
        <div class="mcmodder-table-loading-overlay">
          <div class="mcmodder-table-loading-container">
            <div class="mcmodder-loading" />
          </div>
        </div>
        <table>
          <thead></thead>
          <tbody>
            <tr class="mcmodder-table-margin-top" />
            <tr class="mcmodder-table-empty" />
            <tr class="mcmodder-table-margin-bottom" />
          </tbody>
        </table>
      <div>`);
    this.instance = this.$instance.get(0);
    this.$table = this.$instance.find("table").attr(attr).addClass("mcmodder-table");
    this.$thead = this.$instance.find("thead");
    this.$tbody = this.$instance.find("tbody");
    this.$marginTop = this.$tbody.find(".mcmodder-table-margin-top");
    this.$marginBottom = this.$tbody.find(".mcmodder-table-margin-bottom");
    this.$empty = this.$tbody.find(".mcmodder-table-empty");
    this.$loadingOverlay = this.$instance.find(".mcmodder-table-loading-overlay");
    this.isLoading = true;
    this.currentData = [];
    this.renderingRows = {l: -1, r: -1};
    this.rowHeight = McmodderTable.ROW_HEIGHT_DEFAULT;
    this.loadingProgress = new ProgressBar();
    this.loadingProgress.$instance
      .addClass("mcmodder-table-loading-progress")
      .appendTo(this.$instance.find(".mcmodder-table-loading-container"))
      .hide();

    // head config init
    const headConfigsConstructor: Partial<HeadConfigs<McmodderTableData>> = {};
    Object.keys(headConfigs).forEach(key => {
      headConfigsConstructor[key] = McmodderTable.parseHeadConfigInitializer(headConfigs[key]);
    });
    this.headConfigs = headConfigsConstructor as HeadConfigs<McmodderTableData>;
    this.initHeadConfigs();

    this.updateScreenContainableRows();
    this.bindEvents();
    this.refreshAll();
  }

  protected bindEvents() {
    $(document).scroll(McmodderUtils.throttle(() => this.onScroll(), McmodderTable.THROTTLE_INTERVAL));
    $(window).resize(McmodderUtils.throttle((_e: JQueryEventObject) => {
      this.updateScreenContainableRows();
      this.refreshAll();
    }, 16));
    this.$instance.on("click", ".mcmodder-table-goto", e => {
      const target = e.currentTarget;
      const key = target.getAttribute("data-goto-key") as keyof McmodderTableData;
      const value = target.getAttribute("data-goto-value");
      const index = this.searchData(key, value);
      if (index === -1) McmodderUtils.commonMsg("没有找到该链接所指向的表格行...", false);
      else this.scrollTo(index);
    })
  }

  protected updateScreenContainableRows() {
    this.screenContainableRows = Math.ceil(screen.height / this.rowHeight) + McmodderTable.ROW_EXPAND;
  }

  protected calculateRenderableRows(): McmodderTableRowRange {
    const dataLength = this.currentData.length;
    if (!dataLength) return {l: -1, r: -1};

    const l = Math.floor(this.$tbody.get(0).getBoundingClientRect().top / -this.rowHeight);
    const r = l + this.screenContainableRows * 2 + McmodderTable.ROW_EXPAND;

    const L = Math.floor(l / this.screenContainableRows) * this.screenContainableRows;
    const R = Math.ceil(r / this.screenContainableRows) * this.screenContainableRows;

    return {
      l: Math.min(dataLength - 1, Math.max(0, L)),
      r: Math.min(dataLength - 1, R)
    };
  }

  protected calculateRowHeightTopOffset(index: number) {
    return index * this.rowHeight;
  }

  protected calculateRowHeightBottomOffset(index: number) {
    const dataLength = this.currentData.length;
    if (!dataLength) return 0;
    return (dataLength - index - 1) * this.rowHeight;
  }

  searchData(key: keyof McmodderTableData | null, value: any) {
    if (key) {
      for (const i in this.currentData) {
        if (this.currentData[i].content[key] == value) {
          return Number(i);
        }
      }
    }
    return -1;
  }

  scrollTo(index: number) {
    $("html").get(0).scrollTo({
      top: McmodderUtils.getAbsolutePos(this.$tbody.get(0)).y + this.calculateRowHeightTopOffset(index) - window.screen.height / 2,
      behavior: "smooth"
    });
  }

  protected onScroll() {
    const newRows = this.calculateRenderableRows();
    if (this.renderingRows.l === newRows.l && this.renderingRows.r === newRows.r) {
      if (newRows.l === -1 && newRows.r === -1) {
        this.$marginTop.css("height", 0);
        this.$marginBottom.css("height", 0);
      }
      return;
    }
    const top = this.calculateRowHeightTopOffset(newRows.l);
    const bottom = this.calculateRowHeightBottomOffset(newRows.r);
    this.$marginTop.css("height", top);
    this.$marginBottom.css("height", bottom);

    this.$tbody.find("[data-index]").remove();
    for (let i = newRows.l; i <= newRows.r; i++) {
      this.renderRow(i).insertBefore(this.$marginBottom);
    }
    McmodderUtils.updateAllTooltip();

    // 保存行高以便实现虚拟列表
    const rowHeight = this.$tbody.find(`[data-index=${ newRows.l }]`).get(0)?.getBoundingClientRect()?.height || McmodderTable.ROW_HEIGHT_DEFAULT;
    if (rowHeight != this.rowHeight) {
      this.rowHeight = rowHeight;
      this.updateScreenContainableRows();
    }
    else {
      this.renderingRows.l = newRows.l;
      this.renderingRows.r = newRows.r;
    }
  }
  
  private initHeadConfigs() {
    Object.keys(this.headConfigs).forEach(key => {
      this.$thead.append(`<th>${ this.headConfigs[key].name }</th>`);
    });
  }

  setAllData(data: McmodderTableDataList<McmodderTableData>) {
    this.empty();
    this.currentData = data.map(e => ({ content: e }));
    this.refreshAll();
  }

  getAllData() {
    return this.currentData.map(data => data.content);
  }

  getData(index: number) {
    return this.currentData[index].content;
  }

  getRowData(index: number) {
    return this.currentData[index];
  }

  getValue(index: number, key: keyof McmodderTableData) {
    return this.getData(index)[key];
  }

  getAllRowData() {
    return this.currentData;
  }

  appendData(data: McmodderTableData) {
    this.currentData.push({
      content: data
    });
  }

  appendDataList(dataList: McmodderTableDataList<McmodderTableData>) {
    this.showLoading();
    dataList.forEach(data => {
      this.appendData(data);
    });
    this.completeLoading();
  }

  setValue(index: number, key: keyof McmodderTableData, value: any) {
    if (value === undefined) {
      this.deleteValue(index, key);
      return;
    }
    this.currentData[index].content[key] = value;
    this.refreshAll();
  }

  deleteValue(index: number, key: keyof McmodderTableData) {
    delete this.currentData[index].content[key];
    this.refreshAll();
  }

  deleteData(index: number) {
    this.currentData.splice(index, 1);
    this.refreshAll();
  }

  protected renderRow(index: number) {
    let data = this.currentData[index];
    const res = $(`<tr data-index="${ index }">`);
    Object.keys(this.headConfigs).forEach(key => {
      this.renderUnit(data, key).appendTo(res);
    });
    return res;
  }

  protected isIndexRendering(index: number) {
    return index >= this.renderingRows.l && index <= this.renderingRows.r;
  }

  getElementIndex(target?: Element | JQuery) {
    if (!target) return -1;
    target = $(target);
    if (target.attr("data-index") != undefined) return Number(target.attr("data-index"));
    return Number(target.parents("[data-index]").attr("data-index"));
  }

  getRowElement(index: number) {
    if (this.isIndexRendering(index)) return this.$tbody.find(`[data-index=${ index }]`);
    return $();
  }

  getUnitElement(index: number, key: string) {
    return this.getRowElement(index).find(`[data-key=${ key }]`);
  }

  protected renderUnit(data: McmodderTableRowData<McmodderTableData>, key: string) {
    const res = $(`<td data-key="${ String(key) }">`);
    const rawContent = (data.content as any)[key];
    const displayRule = this.headConfigs[key]?.displayRule;
    let content;
    if ((!displayRule || displayRule.length < 2) && (rawContent === "" || rawContent === undefined || rawContent == null)) {
      content = "-";
    } else {
      content = displayRule ? displayRule(rawContent, data.content) : rawContent;
    }
    res.html(content);
    return res;
  }

  refreshAll() {
    this.completeLoading();
    this.renderingRows = {l: -1, r: -1};
    this.onScroll();
    if (!this.currentData.length) {
      this.$tbody.find("[data-index]").remove();
      this.$empty.show();
    } else {
      this.$empty.hide();
    }
  }

  empty() {
    this.currentData = [];
    this.$tbody.find(`[data-index]`).remove();
    this.refreshAll();
  }

  showLoading() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.loadingProgress.hide().setProgress(0);
    this.$loadingOverlay.show().removeClass("faded");
  }

  completeLoading() {
    if (!this.isLoading) return;
    this.loadingProgress.setProgress(this.loadingProgress.max);
    this.isLoading = false;
    this.$loadingOverlay.addClass("faded");
    setTimeout(() => {
      if (!this.isLoading) this.$loadingOverlay.hide();
    }, 800);
  }

  show() {
    this.$instance.show();
  }

  hide() {
    this.$instance.hide();
  }

  protected switchDisplayState() {
    if (McmodderUtils.isNodeHidden(this.$instance)) this.show();
    else this.hide();
  }
}