import { Command } from "./Command";

/**
 * 批量删除行命令：一次删除多行（O(n) 实现），并缓存被删数据用于整体撤销。
 *
 * @param self 表格命令上下文。
 * @param selection 被删除的行索引集合。
 */
export class DeleteMultipleRowCommand<T extends TableAcceptable> extends Command<T> {
  selection: TableRowSelection;
  deletedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, selection: TableRowSelection) {
    super(self);
    this.selection = selection;
    this.deletedData = new Array(this.selection.length);
  }

  /** 批量删除所选行，并把「行索引 → 行数据」映射保存下来 */
  execute() {
    this.deletedData = this.self.deleteMultipleRow(this.selection);
  }

  /** 撤销批量删除：按保存的索引映射整体插回，随后清空缓存 */
  undo() {
    if (this.deletedData) {
      this.self.insertMultipleRowWithDataMap(this.deletedData);
      delete this.deletedData;
    }
  }
}
