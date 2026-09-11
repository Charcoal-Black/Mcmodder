import { McmodderContextMenu } from "../widget/ContextMenu";
import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";
import { Command } from "./command/Command";
import { DeleteMultipleRowCommand } from "./command/DeleteMultipleRowCommand";
import { DeleteRowCommand } from "./command/DeleteRowCommand";
import { EditCommand } from "./command/EditCommand";
import { InsertRowCommand } from "./command/InsertRowCommand";
import { PasteCommand } from "./command/PasteCommand";
import { McmodderTable } from "./Table";
import { McmodderConfigUtils, McmodderInputType } from "../config/ConfigUtils";
import { EditConfigInitializer, EditConfigs, EditConfigsInitializer, HeadConfigsInitializer, InputValueNumericRange, McmodderTableAcceptable, McmodderTableDataList, McmodderTableRowData, McmodderTableRowSelection, McmodderTableInputData } from "../types";

export type EditableTableExpose = {
  requestRender(rowIndex?: number): void;
};

export interface EditableTableCellDisplay {
  html: string;
  original: string;
  value: any;
  unsaved: boolean;
  readonly: boolean;
  editableType: McmodderInputType;
  inputRange?: InputValueNumericRange;
}

export interface EditableTableBridge<T extends McmodderTableAcceptable = McmodderTableAcceptable> {
  readonly currentData: McmodderTableRowData<T>[];
  readonly headConfigs: Record<string, { name: string }>;
  readonly editConfigs: EditConfigs<T>;
  readonly hoveringIndex: number | null;
  readonly selectedRowCount: number;
  readonly isLoading: boolean;
  getCellDisplay(index: number, key: string): EditableTableCellDisplay;
  commitEdit(index: number, key: string, newValue: any): boolean;
  onRowHover(index: number): void;
  onCellHover(index: number | null): void;
  onRowsRearranged(newOrder: McmodderTableRowData<T>[]): void;
  onGotoClick(key: string, value: any): void;
  requestRender(rowIndex?: number): void;
}

export class McmodderEditableTable<McmodderTableData extends McmodderTableAcceptable> extends McmodderTable<McmodderTableData> implements EditableTableBridge<McmodderTableData> {

  static readonly CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  static readonly CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  static readonly CLASSNAME_MOUSEOVER_TR = "mcmodder-table-mouseover-tr";
  static readonly CLASSNAME_MOUSEOVER_TD = "mcmodder-table-mouseover-td";

  readonly undoKey = McmodderUtils.getXplatCtrlCombinationKey('Z');
  readonly redoKey = McmodderUtils.getXplatCtrlCombinationKey('Y');
  readonly redoKey2 = McmodderUtils.getXplatCtrlCombinationKey({ shiftKey: true, keyCode: 90 });
  readonly saveKey = McmodderUtils.getXplatCtrlCombinationKey('S');
  readonly selectAllKey = McmodderUtils.getXplatCtrlCombinationKey('A');
  readonly copyKey = McmodderUtils.getXplatCtrlCombinationKey('C');
  readonly pasteKey = McmodderUtils.getXplatCtrlCombinationKey('V');

  readonly editConfigs: EditConfigs<McmodderTableData>;
  unsaved: boolean;
  selectedRowCount: number;
  isShiftKeyPressed: boolean;
  hoveringIndex: number | null;
  private history: Command<McmodderTableData>[];
  private historyStage: number;
  clipboard: McmodderTableDataList<McmodderTableData>;
  contextMenu = new McmodderContextMenu(this.$instance);

  onEdit?: () => void;

  private prevHoverIndex?: number;

  private vueHost: JQuery;
  private component?: EditableTableExpose;
  private mountPromise?: Promise<void>;

  private static parseEditConfigInitializer(config: EditConfigInitializer): McmodderTableInputData {
    let result;
    if (config === undefined || config === null) {
      config = {
        readonly: true
      };
    }
    if (typeof config === "number") {
      result = {
        type: config,
        value: McmodderConfigUtils.defaultValue[config as McmodderInputType]
      }
    }
    else {
      result = McmodderUtils.simpleDeepCopy(config) as any;
      if (result.readonly) {
        if (result) result.type = McmodderInputType.TEXT;
        result.value = McmodderConfigUtils.defaultValue[McmodderInputType.TEXT];
      }
      if (result.value === undefined) {
        result.value = McmodderConfigUtils.defaultValue[result.type as McmodderInputType];
      }
    }
    return result;
  }

  constructor(parent: Mcmodder, attr: object, headConfigs: HeadConfigsInitializer<McmodderTableData>, editConfigs: EditConfigsInitializer<McmodderTableData>) {
    super(parent, attr, headConfigs);

    // edit config init
    (Object.keys(editConfigs) as (keyof McmodderTableData)[]).forEach(key => {
      editConfigs[key] = McmodderEditableTable.parseEditConfigInitializer(editConfigs[key]);
    });
    this.editConfigs = editConfigs as unknown as EditConfigs<McmodderTableData>; // doge

    // other init
    this.unsaved = false;
    this.selectedRowCount = 0;
    this.isShiftKeyPressed = false;
    this.hoveringIndex = null;
    this.history = new Array;
    this.historyStage = 0;
    this.clipboard = new Array;

    this.initContextMenu();

    this.vueHost = $(`<div class="mcmodder-vue-table-host"></div>`).appendTo(this.$instance);
    this.ensureMounted().then(() => {
      this.$instance.find("table, .mcmodder-table-loading-overlay").remove();
    });
  }

  private ensureMounted() {
    if (this.component) return Promise.resolve();
    if (!this.mountPromise) {
      this.mountPromise = Promise.all([
        import("../vue/components/EditableTable.vue"),
        import("../vue/mount")
      ]).then(([module, mount]) => {
        mount.mountVueApp(module.default, {
          table: this,
          onReady: (api: EditableTableExpose) => {
            this.component = api;
            api.requestRender();
          }
        }, this.vueHost.get(0) as HTMLElement);
      });
    }
    return this.mountPromise;
  }

  execute(command: Command<McmodderTableData>) {
    command.execute();
    this.history = this.history.slice(0, this.historyStage);
    this.historyStage = this.history.push(command);
  }

  undo() {
    if (this.historyStage > 0) {
      this.history[--this.historyStage].undo();
    }
  }

  redo() {
    if (this.historyStage < this.history.length) {
      this.history[this.historyStage++].redo();
    }
  }

  getEditorData(index: number, key: keyof McmodderTableData) {
    const rowData = this.getRowData(index);
    return rowData.edited?.[key] ?? rowData.content[key];
  }

  getEditorRowData(index: number) {
    const rowData = this.getRowData(index);
    const content = McmodderUtils.simpleDeepCopy(rowData.content);
    Object.keys(rowData.edited || {}).forEach(key => {
      (content as any)[key] = rowData.edited![key];
    });
    return content;
  }


  getCellDisplay(index: number, key: string): EditableTableCellDisplay {
    const rowData = this.currentData[index];
    const editConfig = (this.editConfigs as any)[key] as McmodderTableInputData | undefined;
    const readonly = !this.editConfigs.hasOwnProperty(key) || !!editConfig?.readonly;
    const raw = (rowData.content as any)[key];
    const edited = (rowData.edited as any)?.[key];
    const unsaved = edited !== undefined && edited !== null;
    const value = unsaved ? edited : raw;
    const displayRule = this.headConfigs[key]?.displayRule;

    let html: string;
    if (unsaved) {
      if (value === "" || value === undefined || value == null) html = "-";
      else html = EditableTableUtils.displayRuleToString(displayRule ? displayRule(value, rowData.content) : value);
    } else {
      if ((!displayRule || displayRule.length < 2) && (value === "" || value === undefined || value == null)) html = "-";
      else html = EditableTableUtils.displayRuleToString(displayRule ? displayRule(value, rowData.content) : value);
    }
    const original = raw === undefined || raw === null ? "" : String(raw);
    return {
      html,
      original,
      value,
      unsaved,
      readonly,
      editableType: editConfig?.type ?? McmodderInputType.TEXT,
      inputRange: editConfig?.range as InputValueNumericRange | undefined
    };
  }

  commitEdit(index: number, key: string, newValue: any): boolean {
    const editConfig = (this.editConfigs as any)[key] as McmodderTableInputData | undefined;
    if (editConfig?.type === McmodderInputType.NUMBER) {
      const num = Number(newValue);
      const range = (editConfig.range || [null, null]) as InputValueNumericRange;
      const min = range[0], max = range[1];
      if (isNaN(num)) {
        McmodderUtils.commonMsg("请输入一个正确的数值~", false);
        return false;
      }
      if (min != null && num < min) {
        McmodderUtils.commonMsg(`您输入的数值 (${ num.toLocaleString() }) 低于允许的最小值 (${ min.toLocaleString() })，请重新设置~`, false);
        return false;
      }
      if (max != null && num > max) {
        McmodderUtils.commonMsg(`您输入的数值 (${ num.toLocaleString() }) 高于允许的最大值 (${ max.toLocaleString() })，请重新设置~`, false);
        return false;
      }
      newValue = num;
    }
    this.execute(new EditCommand(this, index, key as keyof McmodderTableData, newValue));
    return true;
  }

  onRowHover(index: number) {
    if (!this.isShiftKeyPressed) return;
    const data = this.currentData[index];
    if (!data) return;
    if (this.prevHoverIndex != undefined) {
      if (index === this.prevHoverIndex) return;
      let dir = index > this.prevHoverIndex ? 1 : -1;
      for (let i = this.prevHoverIndex + dir; i != index; i += dir) {
        this.switchSelectState(i);
      }
    }
    this.switchSelectState(index);
  }

  onCellHover(index: number | null) {
    this.hoveringIndex = index;
  }

  onRowsRearranged(newOrder: McmodderTableRowData<McmodderTableData>[]) {
    this.currentData = newOrder;
    this.unsaved = true;
    this.onStopRearrange();
    this.refreshAll();
  }

  onGotoClick(key: string, value: any) {
    const index = this.searchData(key as keyof McmodderTableData, value);
    if (index === -1) McmodderUtils.commonMsg("没有找到该链接所指向的表格行...", false);
    else this.scrollTo(index);
  }

  requestRender(rowIndex?: number) {
    this.component?.requestRender(rowIndex);
  }


  getSelection() {
    let selection: McmodderTableRowSelection = [];
    this.currentData.forEach((data, index) => {
      if (data.selected) selection.push(index);
    });
    return selection;
  }

  copyRow(selection = this.getSelection()) {
    this.clipboard = new Array(selection.length);
    selection.forEach((row, index) => {
      this.clipboard[index] = McmodderUtils.simpleDeepCopy(this.currentData[row].content);
    });
  }

  pasteRow(index: number) {
    this.insertMultipleRowWithArray(index, this.clipboard);
    const dataMap: Record<number, McmodderTableData> = {};
    const length = this.clipboard.length;
    for (let i = 0; i < length; i++) {
      dataMap[i + index] = this.clipboard[i];
    }
    return dataMap;
  }

  deleteRow(index: number): Record<number, McmodderTableData> {
    if (this.currentData[index].selected) this.selectedRowCount--;
    let deletedData = McmodderUtils.simpleDeepCopy(this.currentData[index].content);
    this.currentData.splice(index, 1);
    this.refreshAll();
    this.unsaved = true;
    return { [index]: deletedData };
  }

  deleteMultipleRow(selection: McmodderTableRowSelection) {
    // 循环n次deleteRow，时间复杂度是O(n^2)，这里采用O(n)的优化版方案
    const deletedData: Record<number, McmodderTableData> = {};
    const tempData: any = this.currentData;
    selection.forEach(i => {
      if (this.currentData[i].selected) this.selectedRowCount--;
      deletedData[i] = Object.assign({}, this.currentData[i].content);
      tempData[i] = null;
    });
    this.currentData = tempData.filter((e: any) => e);
    this.refreshAll();
    this.unsaved = true;
    return deletedData;
  }

  editData(index: number, key: keyof McmodderTableData, newValue: any) {
    let data = this.currentData[index] || "";
    let original = data.content[key] || "";
    if (original != newValue) {
      if (!data.edited) data.edited = {};
      data.edited[key] = newValue;
      this.unsaved = true;
    } else {
      if (data.edited && data.edited[key]) delete data.edited[key];
    }
    this.requestRender(index);
    this.onEdit?.();
  }

  dataMapToSelection(dataMap: Record<number, McmodderTableData>) {
    return Object.keys(dataMap).map(Number).sort();
  }

  insertRowWithDataMap(dataMap: Record<number, McmodderTableData>) {
    const key = Number(Object.keys(dataMap)[0]);
    this.insertRow(key, dataMap[key]);
  }

  private createDefaultRowData() {
    const result: Partial<McmodderTableData> = {};
    (Object.keys(this.editConfigs) as (keyof EditConfigs<McmodderTableData>)[]).forEach(key => {
      const editConfig = this.editConfigs[key];
      if (!editConfig.optional) result[key] = this.editConfigs[key].value;
    });
    return result as McmodderTableData;
  }

  insertRow(index: number, newData?: McmodderTableData) {
    if (!newData) newData = this.createDefaultRowData();
    if (index < 0 || index > this.currentData.length) return;
    this.currentData.splice(index, 0, {content: McmodderUtils.simpleDeepCopy(newData)});
    this.refreshAll();
    this.unsaved = true;
  }

  insertMultipleRowWithArray(index: number, dataList: McmodderTableDataList<McmodderTableData>) {
    let l = this.currentData.slice(0, index);
    let r = this.currentData.slice(index);
    this.currentData = l.concat(McmodderUtils.simpleDeepCopy(dataList.map(e => ({
      content: McmodderUtils.simpleDeepCopy(e)
    })))).concat(r);
    this.refreshAll();
    this.unsaved = true;
  }

  insertMultipleRowWithDataMap(dataMap: Record<number, McmodderTableData>) {
    let i = 0, j = 0;
    let total = this.currentData.length + Object.keys(dataMap).length;
    let currentData: any[] = new Array(total).fill(null).map(() => ({}));
    let deletedRowIndex = this.dataMapToSelection(dataMap);
    for (let k = 0; k < total; k++) {
      if (deletedRowIndex[j] == k) {
        currentData[k].content = McmodderUtils.simpleDeepCopy(dataMap[k]);
        j++;
      }
      else currentData[k] = this.currentData[i++];
    }
    this.currentData = currentData;
    this.refreshAll();
    this.unsaved = true;
  }

  saveAll() {
    this.currentData.forEach(data => {
      if (!data.edited) return;
      (Object.keys(data.edited) as (keyof McmodderTableData)[]).forEach(key => {
        if (data.edited && data.edited[key]) {
          data.content[key] = data.edited[key];
        }
      });
      delete data.edited;
    });
    this.refreshAll();
    this.unsaved = false;
  }

  selectRow(index: number, state: boolean) {
    const data = this.currentData[index];
    data.selected = !!state;
    if (state) {
      data.selected = true;
      this.selectedRowCount++;
    } else {
      data.selected = false;
      this.selectedRowCount--;
    }
    this.requestRender(index);
  }

  selectRange(l: number, r: number, state: boolean) {
    for (let i = l; i <= r; i++) {
      this.selectRow(i, state);
    }
  }

  selectAll(state: boolean) {
    this.selectRange(0, this.currentData.length - 1, state);
  }

  switchSelectState(index: number) {
    if (isNaN(index)) return;
    const target = this.currentData[index];
    if (!target) return;
    this.prevHoverIndex = index;
    const selected = !target.selected;
    this.selectRow(index, selected);
  }


  override refreshAll() {
    this.completeLoading();
    this.onRefresh?.();
    this.requestRender();
  }

  override onScroll() {
  }

  override bindEvents() {
    $(document.body).keydown(e => {
      // 撤销 Ctrl+Z
      if (McmodderUtils.isKeyMatch(this.undoKey, e) && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } 

      // 重做 Ctrl+Y (Ctrl+Shift+Z)
      else if (
        McmodderUtils.isKeyMatch(this.redoKey, e) ||
        McmodderUtils.isKeyMatch(this.redoKey2, e)
      ) {
        e.preventDefault();
        this.redo();
      }

      // 保存 Ctrl+S
      else if (McmodderUtils.isKeyMatch(this.saveKey, e)) {
        e.preventDefault();
        this.saveAll();
      }

      // 全选 Ctrl+A
      else if (McmodderUtils.isKeyMatch(this.selectAllKey, e)) {
        e.preventDefault();
        this.selectAll(!e.shiftKey);
      } 

      // 复制 Ctrl+C
      else if (McmodderUtils.isKeyMatch(this.copyKey, e)) {
        e.preventDefault();
        this.copyRow(this.getSelection());
      } 
      
      // 选中行
      else if (e.key === "Shift") {
        this.isShiftKeyPressed = true;
        if (this.hoveringIndex != undefined) {
          this.switchSelectState(this.hoveringIndex);
        }
      }
    }).keyup(e => {
      if (e.key === "Shift") this.isShiftKeyPressed = false;
    });
  }

  /** 从合成事件路径中解析行索引（Shadow DOM 事件重定向后仍可用） */
  getEventIndex(e: any): number {
    const native = e?.originalEvent || e;
    if (native && typeof native.composedPath === "function") {
      for (const el of native.composedPath() as Element[]) {
        if (el instanceof HTMLElement && el.hasAttribute && el.hasAttribute("data-index")) {
          return Number(el.getAttribute("data-index"));
        }
      }
    }
    if (e?.target) {
      const index = this.getElementIndex(e.target);
      if (index != -1) return index;
    }
    return -1;
  }

  private isMouseOnAnyRow(e: any) {
    return this.getEventIndex(e) >= 0;
  }

  private hasSelection() {
    return !!this.selectedRowCount;
  }

  private isCopyboardEmpty() {
    return !this.clipboard.length;
  }

  private initContextMenu() {
    this.contextMenu
    .addItem({
      key: "newRow",
      text: "新建行",
      displayRule: _e => !this.currentData.length, 
      callback: _e => this.execute(new InsertRowCommand(this, 0))
    })
    .addItem({
      key: "insertRowUpper",
      text: "在此行上方插入行",
      displayRule: e => this.isMouseOnAnyRow(e), 
      callback: e => this.execute(new InsertRowCommand(this, this.getEventIndex(e)))
    })
    .addItem({
      key: "insertRowLower",
      text: "在此行下方插入行",
      displayRule: e => this.isMouseOnAnyRow(e),
      callback: e => this.execute(new InsertRowCommand(this, this.getEventIndex(e) + 1))
    })
    .addItem({
      key: "copyRow",
      text: "复制行",
      displayRule: e => this.isMouseOnAnyRow(e), 
      callback: e => this.copyRow([this.getEventIndex(e)])
    })
    .addItem({
      key: "copyMultipleRow",
      text: "复制所有选中行",
      shortcut: this.copyKey,
      displayRule: _e => this.hasSelection(), 
      callback: _e => this.copyRow(this.getSelection())
    })
    .addItem({
      key: "pasteRowUpper",
      text: "粘贴在其上方",
      displayRule: e => this.isMouseOnAnyRow(e) && !this.isCopyboardEmpty(), 
      callback: e => this.execute(new PasteCommand(this, this.getEventIndex(e)))
    })
    .addItem({
      key: "pasteRowLower",
      text: "粘贴在其下方",
      displayRule: e => this.isMouseOnAnyRow(e) && !this.isCopyboardEmpty(), 
      callback: e => this.execute(new PasteCommand(this, this.getEventIndex(e) + 1))
    })
    .addItem({
      key: "deleteRow",
      text: "删除该行",
      displayRule: e => this.isMouseOnAnyRow(e), 
      callback: e => this.execute(new DeleteRowCommand(this, this.getEventIndex(e)))
    })
    .addItem({
      key: "deleteMultipleRow",
      text: "删除所有选中行",
      displayRule: _e => this.hasSelection(), 
      callback: _e => this.execute(new DeleteMultipleRowCommand(this, this.getSelection()))
    });
  }

  onStopRearrange() {
    // 由子类覆写（可在实例上直接赋值覆盖）
  }
}

export namespace EditableTableUtils {
  export function displayRuleToString(content: any): string {
    if (content === null || content === undefined) return "-";
    if (typeof content === "string") return content;
    if (content && content.jquery) return (content as JQuery).prop("outerHTML");
    return String(content);
  }
}
