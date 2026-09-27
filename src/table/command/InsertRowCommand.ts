import { Command } from "./Command";

/**
 * 插入行命令：在指定位置插入一行默认数据（行内字段值由 `EditConfigs` 的默认值填充）。
 *
 * @param self 表格命令上下文。
 * @param index 新行插入后的行索引（插入位置）。
 */
export class InsertRowCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  constructor(self: TableContext<T>, index: number) {
    super(self);
    this.index = index;
  }

  execute() {
    this.self.insertRow(this.index);
  }

  /** 撤销插入：删除该位置的行 */
  undo() {
    this.self.deleteRow(this.index);
  }
}
