import { McmodderTableContext, McmodderTableDataMap, McmodderTableRowSelection } from "../../types";
import { Command } from "./Command";

export class DeleteMultipleRowCommand<T extends Object> extends Command<T> {
  selection: McmodderTableRowSelection;
  deletedData?: McmodderTableDataMap<T>;

  constructor(self: McmodderTableContext<T>, selection: McmodderTableRowSelection) {
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