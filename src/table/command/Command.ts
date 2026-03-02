import { McmodderEditableTable } from "../EditableTable";

export abstract class Command<McmodderTableData extends Object> {
  self: McmodderEditableTable<McmodderTableData>;
  constructor(self: McmodderEditableTable<McmodderTableData>) {
    this.self = self;
  }

  abstract execute(): void;

  abstract undo(): void;

  redo() {
    this.execute();
  }
}