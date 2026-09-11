import { McmodderTableContext, McmodderTableDataMap } from "../../types";
import { Command } from "./Command";

export class DeleteRowCommand<T extends Object> extends Command<T> {
  index: number;
  deletedData?: McmodderTableDataMap<T>;

  constructor(self: McmodderTableContext<T>, index: number) {
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