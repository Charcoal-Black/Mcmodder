import { Command } from "./Command";

export class DeleteRowCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  deletedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, index: number) {
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
