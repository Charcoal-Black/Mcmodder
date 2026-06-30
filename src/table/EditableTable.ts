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
import { EditConfigInitializer, EditConfigs, EditConfigsInitializer, HeadConfigsInitializer, InputSuccessfulChangeCallBack, InputValueNumericRange, McmodderTableAcceptable, McmodderTableDataList, McmodderTableDataMap, McmodderTableInputData, McmodderTableRowData, McmodderTableRowSelection } from "../types";
import { McmodderNumberInput } from "../widget/input/NumberInput";
import { McmodderBaseInput } from "../widget/input/Input";
import { McmodderTextInput } from "../widget/input/TextInput";

export class McmodderEditableTable<McmodderTableData extends McmodderTableAcceptable> extends McmodderTable<McmodderTableData> {

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
  contextMenu = new McmodderContextMenu(/* this.parent, */this.$instance);

  onEdit?: () => void;
  
  private prevHoverIndex?: number;

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
    // this.bindEvents();
    this.initContextMenu();
    this.enableManualRearrange();
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

  override renderUnit(data: McmodderTableRowData<McmodderTableData>, key: string) {
    const res = super.renderUnit(data, key);
    if (!this.editConfigs.hasOwnProperty(key)) {
      res.attr("data-readonly", "1");
      return res;
    }
    if ((this.editConfigs as any)[key]?.readonly) {
      res.attr("data-readonly", "1");
      return res;
    }
    else {
      let original = (data.content as any)[key];
      if (original === undefined || original === null) original = "";
      res.attr("data-original", String(original));
      let newValue = data.edited && (data.edited as any)[key] as any;
      if (newValue != undefined && newValue != null) {
        let content;
        let displayRule = this.headConfigs[key]?.displayRule;
        if (newValue === "" || newValue === undefined || newValue == null) content = "-";
        else content = displayRule ? displayRule(newValue, data.content) : newValue;
        res.attr("data-value", newValue).addClass(McmodderEditableTable.CLASSNAME_UNSAVED_TD).html(content);
      }
    }
    return res;
  }

  override renderRow(index: number) {
    const res = super.renderRow(index);
    const data = this.currentData[index];
    if (data.edited && Object.keys(data.edited).length) {
      res.addClass(McmodderEditableTable.CLASSNAME_UNSAVED_TR);
    }
    if (data.selected) {
      res.addClass("selected");
    }
    return res;
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
      // delete this.clipboard[index]._selected;
    });
  }

  pasteRow(index: number) {
    this.insertMultipleRowWithArray(index, this.clipboard);
    const dataMap: McmodderTableDataMap<McmodderTableData> = {};
    const length = this.clipboard.length;
    for (let i = 0; i < length; i++) {
      dataMap[i + index] = this.clipboard[i];
    }
    return dataMap;
  }

  deleteRow(index: number): McmodderTableDataMap<McmodderTableData> {
    if (this.currentData[index].selected) this.selectedRowCount--;
    let deletedData = McmodderUtils.simpleDeepCopy(this.currentData[index].content);
    this.currentData.splice(index, 1);
    this.refreshAll();
    this.unsaved = true;
    return { [index]: deletedData };
  }

  deleteMultipleRow(selection: McmodderTableRowSelection) {
    // 循环n次deleteRow，时间复杂度是O(n^2)，这里采用O(n)的优化版方案
    const deletedData: McmodderTableDataMap<McmodderTableData> = {};
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

  _refreshRowUnsaveState(row: JQuery) {
    if (!row.find(`.${McmodderEditableTable.CLASSNAME_UNSAVED_TD}`).length) {
      row.removeClass(McmodderEditableTable.CLASSNAME_UNSAVED_TR);
    }
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
    this.getRowElement(index).replaceWith(this.renderRow(index));
    this.onEdit?.();
  }

  rearrangeRows() {
    let rows = this.$tbody.find("tr");
    let newData = new Array(rows.length);
    rows.each((index, row) => {
      newData[index] = this.currentData[this.getElementIndex(row)];
    });
    this.currentData = newData;
  }

  dataMapToSelection(dataMap: McmodderTableDataMap<McmodderTableData>) {
    return Object.keys(dataMap).map(Number).sort();
  }

  insertRowWithDataMap(dataMap: McmodderTableDataMap<McmodderTableData>) {
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

  insertMultipleRowWithDataMap(dataMap: McmodderTableDataMap<McmodderTableData>) {
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
    // this.rearrangeRows();
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
    if (this.isIndexRendering(index)) {
      const row = this.getRowElement(index);
      if (state) row.addClass("selected");
      else row.removeClass("selected");
    }
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

  private rowOnMouseenter(e: JQueryMouseEventObject) {
    if (!this.isShiftKeyPressed) return;
    if (e.currentTarget.tagName != "TR") return;
    const index = Number(this.getElementIndex(e.currentTarget));
    if (this.prevHoverIndex != undefined) {
      if (index === this.prevHoverIndex) return;
      let dir = index > this.prevHoverIndex ? 1 : -1;
      for (let i = this.prevHoverIndex + dir; i != index; i += dir) { // 补间
        this.switchSelectState(i);
      }
    }
    this.switchSelectState(this.getElementIndex(e.currentTarget));
  }

  private unitOnMouseenter(e: JQueryMouseEventObject) {
    let target = $(e.currentTarget);
    target.addClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TD);
    let row = target.parents("tr");
    row.addClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TR);
    this.hoveringIndex = Number(this.getElementIndex(row));
  }

  private unitOnMouseleave(e: JQueryMouseEventObject) {
    let target = $(e.currentTarget);
    target.removeClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TD);
    let row = target.parents("tr");
    row.removeClass(McmodderEditableTable.CLASSNAME_MOUSEOVER_TR);
    this.hoveringIndex = null;
  }

  private createInputNode(
    key: keyof EditConfigs<McmodderTableData>,
    value: unknown,
    inputData: McmodderTableInputData,
    onSuccessfulChange: InputSuccessfulChangeCallBack<unknown>
  ): McmodderBaseInput {
    const displayName = inputData.customName || this.headConfigs[key].name || String(key);
    switch (inputData.type) {
      case McmodderInputType.NUMBER: return new McmodderNumberInput(
        displayName,
        value as number,
        inputData.range as InputValueNumericRange,
        onSuccessfulChange
      );
      default: return new McmodderTextInput(
        displayName,
        value as string,
        onSuccessfulChange
      )
    }
  }

  private onDblclick(e: JQueryMouseEventObject) {
    const target = $(e.currentTarget);
    const index = this.getElementIndex(target);
    const inputData = this.currentData[this.getElementIndex(target)];
    const key = target.attr("data-key");
    const value = inputData.edited?.hasOwnProperty(key) ? inputData.edited[key] : inputData.content[key];
    if (!this.editConfigs.hasOwnProperty(key)) {
      throw new Error("Unexpected data key.");
    }
    target.empty();
    const typedKey = key as keyof EditConfigs<McmodderTableData>;
    const editConfig = this.editConfigs[typedKey] as McmodderTableInputData;
    const nonNullValue = value === undefined ? editConfig.value : value;
    const input = this.createInputNode(typedKey, nonNullValue, editConfig, info => {
      this.execute(new EditCommand(this, index, key, info.final));
    });
    input.getInstance().appendTo(target);
    input.getInputNode().addClass("mcmodder-table-input").focus().keydown(f => {
      const self = f.currentTarget as HTMLInputElement;
      if (f.key === "Enter") {
        self.blur();
      }
      else if (f.key === "Escape") {
        f.preventDefault();
        self.value = value;
        self.blur();
      }
      else if (f.key === "Shift") {
        f.stopPropagation();
      }
    })
    .blur(_f => {
      target.replaceWith(this.renderUnit(inputData, key));
    });
  }

  override bindEvents() {
    super.bindEvents();

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

    this.$instance
    .on("mouseenter", "td", e => this.unitOnMouseenter(e))
    .on("mouseenter", "tr", e => this.rowOnMouseenter(e))
    .on("mouseleave", "td", e => this.unitOnMouseleave(e))
    .on("dblclick", "td:not([data-readonly=1])", e => this.onDblclick(e));
  }
  
  private isMouseOnAnyRow(e: JQueryMouseEventObject) {
    return !isNaN(this.getElementIndex(e.target));
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
      callback: e => this.execute(new InsertRowCommand(this, this.getElementIndex(e?.target)))
    })
    .addItem({
      key: "insertRowLower",
      text: "在此行下方插入行",
      displayRule: e => this.isMouseOnAnyRow(e),
      callback: e => this.execute(new InsertRowCommand(this, this.getElementIndex(e?.target) + 1))
    })
    .addItem({
      key: "copyRow",
      text: "复制行",
      displayRule: e => this.isMouseOnAnyRow(e), 
      callback: e => this.copyRow([this.getElementIndex(e.target)])
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
      callback: e => this.execute(new PasteCommand(this, this.getElementIndex(e?.target)))
    })
    .addItem({
      key: "pasteRowLower",
      text: "粘贴在其下方",
      displayRule: e => this.isMouseOnAnyRow(e) && !this.isCopyboardEmpty(), 
      callback: e => this.execute(new PasteCommand(this, this.getElementIndex(e?.target) + 1))
    })
    .addItem({
      key: "deleteRow",
      text: "删除该行",
      displayRule: e => this.isMouseOnAnyRow(e), 
      callback: e => this.execute(new DeleteRowCommand(this, this.getElementIndex(e?.target)))
    })
    .addItem({
      key: "deleteMultipleRow",
      text: "删除所有选中行",
      displayRule: _e => this.hasSelection(), 
      callback: _e => this.execute(new DeleteMultipleRowCommand(this, this.getSelection()))
    });
  }

  protected onStopRearrange() {
    // 由子类覆写
  }

  enableManualRearrange() {
    this.$instance.sortable({
      distance: 30,
      containerSelector: "table",
      itemPath: "> tbody",
      itemSelector: "tr",
      opacity: 0.5,
      revert: true,
      stop: this.onStopRearrange()
    }).disableSelection();
  }
}