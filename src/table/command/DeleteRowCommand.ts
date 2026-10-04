import { Command } from "./Command";

/**
 * 删除行命令：删除指定行，并缓存被删数据用于撤销。
 *
 * @param self 表格命令上下文。
 * @param index 被删除行的索引。
 */
export class DeleteRowCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  deletedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, index: number) {
    super(self);
    this.index = index;
  }

  /** 删除该行，并把「被删行索引 → 行数据」保存下来 */
  execute() {
    this.deletedData = this.self.deleteRow(this.index);
  }

  /** 撤销删除：把缓存的行按原索引插回，随后清空缓存 */
  undo() {
    if (this.deletedData) {
      this.self.insertRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }
}
