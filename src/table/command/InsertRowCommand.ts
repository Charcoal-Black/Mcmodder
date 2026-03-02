import { McmodderEditableTable } from "../EditableTable";
import { Command } from "./Command";

export class InsertRowCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  index: number;
  constructor(self: McmodderEditableTable<McmodderTableData>, index: number) {
    super(self);
    this.index = index;
  }

  execute() {
    this.self.insertRow(this.index);
  }

  undo() {
    this.self.deleteRow(this.index);
  }
}