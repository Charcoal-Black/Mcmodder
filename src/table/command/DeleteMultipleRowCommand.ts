import { Command } from "./Command";

export class DeleteMultipleRowCommand<T extends TableAcceptable> extends Command<T> {
  selection: TableRowSelection;
  deletedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, selection: TableRowSelection) {
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