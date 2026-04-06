import { McmodderTableDataMap } from "../../types";
import { McmodderEditableTable } from "../EditableTable";
import { Command } from "./Command";

export class DeleteRowCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  index: number;
  deletedData?: McmodderTableDataMap<McmodderTableData>;

  constructor(self: McmodderEditableTable<McmodderTableData>, index: number) {
    super(self);
    this.index = index;
  }

  execute() {
    this.deletedData = this.self.deleteRow(this.index);
  }

  undo() {
    if (this.deletedData) {
      this.self.insertRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }
}