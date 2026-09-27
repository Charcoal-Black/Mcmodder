import { BatchCommand } from "./BatchCommand";
import { EditCommand } from "./EditCommand";

/**
 * 编辑整行命令：比对目标行与传入数据，对每个发生变化的字段生成一个 `EditCommand`
 * 并打包成 `BatchCommand`，使整行改动在历史栈中作为一个整体可一次撤销。
 *
 * @param self 表格命令上下文。
 * @param index 目标行索引。
 * @param data 目标行的新数据（每个字段将被逐一与当前值比对）。
 */
export class EditRowCommand<T extends TableAcceptable> extends BatchCommand<T> {
  index: number;
  constructor(self: TableContext<T>, index: number, data: T) {
    super(self);
    this.index = index;
    const original = self.getData(index);
    (Object.keys(data) as (keyof T)[]).forEach((key) => {
      if (data[key] != original[key]) {
        this.push(new EditCommand(self, index, key, data[key]));
      }
    });
  }
}
