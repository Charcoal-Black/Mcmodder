
export abstract class Command<T extends TableAcceptable> {
  self: TableContext<T>;
  constructor(self: TableContext<T>) {
    this.self = self;
  }

  abstract execute(): void;

  abstract undo(): void;

  redo() {
    this.execute();
  }
}