import { Command } from "./Command";

export class PasteCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  pastedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, index: number) {
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