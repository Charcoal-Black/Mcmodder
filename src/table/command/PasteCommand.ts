import { McmodderEditableTable } from "../EditableTable";
import { McmodderTableDataMap } from "../Table";
import { Command } from "./Command";

export class PasteCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  index: number;
  pastedData?: McmodderTableDataMap<McmodderTableData>;

  constructor(self: McmodderEditableTable<McmodderTableData>, index: number) {
    super(self);
    this.self = self;
    this.index = index;
  }

  execute() {
    this.pastedData = this.self.pasteRow(this.index);
  }

  undo() {
    if (this.pastedData) {
      this.self.deleteMultipleRow(this.self.dataMapToSelection(this.pastedData));
    }
  }

  redo() {
    if (this.pastedData) {
      this.self.insertMultipleRowWithDataMap(this.pastedData);
    }
  }
}