import { McmodderEditableTable } from "../EditableTable";
import { Command } from "./Command";

export class EditCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  index: number;
  key: keyof McmodderTableData;
  newValue: any;
  originalValue: any;

  constructor(self: McmodderEditableTable<McmodderTableData>, index: number, 
      key: keyof McmodderTableData, newValue: any) {
    super(self);
    this.index = index;
    this.key = key;
    this.newValue = newValue;
  }

  execute() {
    this.originalValue = this.self.getRowData(this.index).content[this.key];
    this.self.editData(this.index, this.key, this.newValue);
  }

  undo() {
    this.self.editData(this.index, this.key, this.originalValue);
  }
}