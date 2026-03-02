import { McmodderEditableTable } from "../EditableTable";
import { BatchCommand } from "./BatchCommand";
import { EditCommand } from "./EditCommand";

export class EditRowCommand<McmodderTableData extends Object> extends BatchCommand<McmodderTableData> {
  index: number;
  constructor(self: McmodderEditableTable<McmodderTableData>, index: number, data: McmodderTableData) {
    super(self);
    this.index = index;
    const original = self.getData(index);
    (Object.keys(data) as (keyof McmodderTableData)[]).forEach(key => {
      if (data[key] != original[key]) {
        this.push(new EditCommand(self, index, key, data[key]));
      }
    });
  }
}