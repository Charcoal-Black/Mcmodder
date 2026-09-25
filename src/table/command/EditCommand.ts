import { Command } from "./Command";

export class EditCommand<T extends TableAcceptable, K extends keyof T> extends Command<T> {
  index: number;
  key: K;
  newValue: T[K];
  originalValue?: T[K];

  constructor(self: TableContext<T>, index: number, key: K, newValue: T[K]) {
    super(self);
    this.index = index;
    this.key = key;
    this.newValue = newValue;
  }

  override execute() {
    this.originalValue = this.self.getRowData(this.index).content[this.key];
    this.self.editData(this.index, this.key, this.newValue);
  }

  override undo() {
    this.self.editData(this.index, this.key, this.originalValue);
  }
}
