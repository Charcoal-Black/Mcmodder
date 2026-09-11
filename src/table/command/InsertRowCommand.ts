import { McmodderTableAcceptable, McmodderTableContext } from "../../types";
import { Command } from "./Command";

export class InsertRowCommand<T extends McmodderTableAcceptable> extends Command<T> {
  index: number;
  constructor(self: McmodderTableContext<T>, index: number) {
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