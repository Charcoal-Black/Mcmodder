import { McmodderTableAcceptable, McmodderTableContext } from "../../types";
import { Command } from "./Command";

export class EditCommand<T extends McmodderTableAcceptable> extends Command<T> {
  index: number;
  key: keyof T;
  newValue: any;
  originalValue: any;

  constructor(self: McmodderTableContext<T>, index: number, 
      key: keyof T, newValue: any) {
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