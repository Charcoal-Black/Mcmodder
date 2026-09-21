import { Command } from "./Command";

export class InsertRowCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  constructor(self: TableContext<T>, index: number) {
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