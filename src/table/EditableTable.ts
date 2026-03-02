import { McmodderContextMenu } from "../widget/ContextMenu";
import { Mcmodder } from "../Mcmodder";
import { McmodderUtils } from "../Utils";
import { Command } from "./command/Command";
import { DeleteMultipleRowCommand } from "./command/DeleteMultipleRowCommand";
import { DeleteRowCommand } from "./command/DeleteRowCommand";
import { EditCommand } from "./command/EditCommand";
import { InsertRowCommand } from "./command/InsertRowCommand";
import { PasteCommand } from "./command/PasteCommand";
import { HeadConfigs, McmodderTable, McmodderTableDataList, McmodderTableDataMap, McmodderTableRowData, McmodderTableRowSelection } from "./Table";

export class McmodderEditableTable<McmodderTableData extends Object> extends McmodderTable<McmodderTableData> {

  static readonly CLASSNAME_UNSAVED_TR = "mcmodder-table-unsaved-tr";
  static readonly CLASSNAME_UNSAVED_TD = "mcmodder-table-unsaved-td";
  static readonly CLASSNAME_MOUSEOVER_TR = "mcmodder-table-mouseover-tr";
  static readonly CLASSNAME_MOUSEOVER_TD = "mcmodder-table-mouseover-td";

  onEdit: Function;
  unsavedUnitCount: number;
  selectedRowCount: number;
  isShiftKeyPressed: boolean;
  hoveringIndex: number | null;
  private history: Command<McmodderTableData>[];
  private historyStage: number;
  clipboard: McmodderTableDataList<McmodderTableData>;
  contextMenu = new McmodderContextMenu(/* this.parent, */this.$instance);
  
  private prevHoverIndex?: number;

  constructor(parent: Mcmodder, attr: object, headOptions: HeadConfigs<McmodderTableData>, onEdit?: Function) {
    super(parent, attr, headOptions);
    this.onEdit = onEdit || (() => {});
    this.unsavedUnitCount = 0;
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

  renderUnit(data: McmodderTableRowData<McmodderTableData>, key: string) {
    let res = super.renderUnit(data, key);
    if (this.headConfigs[key]?.readonly) res.attr("data-readonly", "1");
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

  renderRow(index: number) {
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
      this.clipboard[index] = McmodderUtils.simpleDeepCopy(this.currentData[row]);
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
    let deletedData = McmodderUtils.simpleDeepCopy(this.currentData[index]);
    this.currentData.splice(index, 1);
    this.refreshAll();
    return { [index]: deletedData };
  }

  deleteMultipleRow(selection: McmodderTableRowSelection) {
    // 循环n次deleteRow，时间复杂度是O(n^2)，这里采用O(n)的优化版方案
    const deletedData: McmodderTableDataMap<McmodderTableData> = {};
    const tempData: any = this.currentData;
    selection.forEach(i => {
      deletedData[i] = Object.assign({}, this.currentData[i].content);
      tempData[i] = null;
    });
    this.currentData = tempData.filter((e: any) => e);
    this.refreshAll();
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
      this.unsavedUnitCount++;
    } else {
      if (data.edited && data.edited[key]) delete data.edited[key];
      this.unsavedUnitCount--;
    }
    this.getRowElement(index).replaceWith(this.renderRow(index));
    this.onEdit();
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
    return Object.keys(dataMap).map(Number);
  }

  insertRowWithDataMap(dataMap: McmodderTableDataMap<McmodderTableData>) {
    const key = Number(Object.keys(dataMap)[0]);
    this.insertRow(key, dataMap[key]);
  }

  insertRow(index: number, newData = new Object) {
    if (index < 0 || index > this.currentData.length) return;
    this.currentData.splice(index, 0, McmodderUtils.simpleDeepCopy(newData));
    this.refreshAll();
  }

  insertMultipleRowWithArray(index: number, dataList: McmodderTableDataList<McmodderTableData>) {
    let l = this.currentData.slice(0, index);
    let r = this.currentData.slice(index);
    this.currentData = l.concat(McmodderUtils.simpleDeepCopy(dataList)).concat(r);
    this.refreshAll();
  }

  insertMultipleRowWithDataMap(dataMap: McmodderTableDataMap<McmodderTableData>) {
    let i = 0;
    let total = this.currentData.length + Object.keys(dataMap).length;
    let currentData = new Array(total);
    let deletedRowIndex = this.dataMapToSelection(dataMap);
    for (let k = 0; k < total; k++) {
      if (deletedRowIndex.includes(k)) currentData[k] = dataMap[k];
      else currentData[k] = this.currentData[i++];
      delete currentData[k]._selected;
    }
    this.currentData = currentData;
    this.refreshAll();
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
      this.unsavedUnitCount--;
    });
    // this.rearrangeRows();
    this.refreshAll();
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

  private onDblclick(e: JQueryMouseEventObject) {
    const target = $(e.currentTarget);
    const content = target.attr("data-value") || target.attr("data-original") || "";
    target.empty();
    $('<input class="form-control mcmodder-table-input">').val(content).appendTo(target).focus().blur(f => {
      const self = f.currentTarget as HTMLInputElement;
      const key = target.attr("data-key") as keyof McmodderTableData;
      const index = this.getElementIndex(target);
      this.execute(new EditCommand(this, index, key, self.value));
    })
    .keydown(f => {
      const self = f.currentTarget as HTMLInputElement;
      if (f.key === "Enter") {
        self.blur();
      }
      else if (f.key === "Escape") {
        f.preventDefault();
        self.value = content;
        self.blur();
      }
      else if (f.key === "Shift") {
        f.stopPropagation();
      }
    });
  }

  bindEvents() {
    super.bindEvents();

    $(document.body).keydown(e => {
      // 撤销 Ctrl+Z
      if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 90 }, e)) {
        e.preventDefault();
        this.undo();
      } 

      // 重做 Ctrl+Y
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 89 }, e)) {
        e.preventDefault();
        this.redo();
      } 

      // 保存 Ctrl+S
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 83 }, e)) {
        e.preventDefault();
        this.saveAll();
      }

      // 全选 Ctrl+A
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 65 }, e)) {
        e.preventDefault();
        this.selectAll(!e.shiftKey);
      } 

      // 复制 Ctrl+C
      else if (McmodderUtils.isKeyMatch({ ctrlKey: true, keyCode: 67 }, e)) {
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

  initContextMenu() {
    this.contextMenu
    .addOption("newRow", "新建行", _e => !this.currentData.length, 
      _e => this.execute(new InsertRowCommand(this, 0)))
    .addOption("insertRowUpper", "在此行上方插入行", e => !isNaN(this.getElementIndex(e.target)), 
      e => this.execute(new InsertRowCommand(this, this.getElementIndex(e?.target))))
    .addOption("insertRowLower", "在此行下方插入行", e => !isNaN(this.getElementIndex(e.target)), 
      e => this.execute(new InsertRowCommand(this, this.getElementIndex(e?.target) + 1)))
    .addOption("pasteRowUpper", "粘贴在其上方", e => !isNaN(this.getElementIndex(e?.target)) && !!this.clipboard.length, 
      e => this.execute(new PasteCommand(this, this.getElementIndex(e?.target))))
    .addOption("pasteRowLower", "粘贴在其下方", e => !isNaN(this.getElementIndex(e.target)) && !!this.clipboard.length, 
      e => this.execute(new PasteCommand(this, this.getElementIndex(e?.target) + 1)))
    .addOption("deleteRow", "删除该行", e => !isNaN(this.getElementIndex(e.target)), 
      e => this.execute(new DeleteRowCommand(this, this.getElementIndex(e?.target))))
    .addOption("deleteMultipleRow", "删除所有选中行", _e => !!this.selectedRowCount, 
      _e => this.execute(new DeleteMultipleRowCommand(this, this.getSelection())))
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