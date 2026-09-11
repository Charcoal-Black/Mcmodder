import { McmodderTableContext } from "../../types";
import { BatchCommand } from "./BatchCommand";
import { EditCommand } from "./EditCommand";

export class EditRowCommand<T extends Object> extends BatchCommand<T> {
  index: number;
  constructor(self: McmodderTableContext<T>, index: number, data: T) {
    super(self);
    this.index = index;
    const original = self.getData(index);
    (Object.keys(data) as (keyof T)[]).forEach(key => {
      if (data[key] != original[key]) {
        this.push(new EditCommand(self, index, key, data[key]));
      }
    });
  }
}