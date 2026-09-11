import { McmodderTableAcceptable, McmodderTableContext, McmodderTableDataMap } from "../../types";
import { Command } from "./Command";

export class PasteCommand<T extends McmodderTableAcceptable> extends Command<T> {
  index: number;
  pastedData?: McmodderTableDataMap<T>;

  constructor(self: McmodderTableContext<T>, index: number) {
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

  override redo() {
    if (this.pastedData) {
      this.self.insertMultipleRowWithDataMap(this.pastedData);
    }
  }
}