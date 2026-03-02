import { McmodderEditableTable } from "../EditableTable";
import { McmodderTableDataMap, McmodderTableRowSelection } from "../Table";
import { Command } from "./Command";

export class DeleteMultipleRowCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  selection: McmodderTableRowSelection;
  deletedData?: McmodderTableDataMap<McmodderTableData>;

  constructor(self: McmodderEditableTable<McmodderTableData>, selection: McmodderTableRowSelection) {
    super(self);
    this.selection = selection;
    this.deletedData = new Array(this.selection.length);
  }

  execute() {
    this.deletedData = this.self.deleteMultipleRow(this.selection);
  }

  undo() {
    if (this.deletedData) {
      this.self.insertMultipleRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }
}