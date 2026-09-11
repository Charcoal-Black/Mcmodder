import { McmodderTableAcceptable, McmodderTableContext } from "../../types";

export abstract class Command<T extends McmodderTableAcceptable> {
  self: McmodderTableContext<T>;
  constructor(self: McmodderTableContext<T>) {
    this.self = self;
  }

  abstract execute(): void;

  abstract undo(): void;

  redo() {
    this.execute();
  }
}