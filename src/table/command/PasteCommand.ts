import { Command } from "./Command";

/**
 * 粘贴行命令：把剪贴板内容成批插入到指定位置，并记录本次插入的数据以便撤销/重做。
 *
 * @param self 表格命令上下文。
 * @param index 插入的起始行索引。
 */
export class PasteCommand<T extends TableAcceptable> extends Command<T> {
  index: number;
  pastedData?: TableDataMap<T>;

  constructor(self: TableContext<T>, index: number) {
    super(self);
    this.self = self;
    this.index = index;
  }

  /** 调用 `pasteRow` 插入剪贴板内容，并把返回的「插入的行索引 → 数据」映射存下 */
  execute() {
    this.pastedData = this.self.pasteRow(this.index);
  }

  /** 撤销粘贴：按插入时的索引集合删除这些行 */
  undo() {
    if (this.pastedData) {
      this.self.deleteMultipleRow(this.self.dataMapToSelection(this.pastedData));
    }
  }

  /** 重做粘贴：不重新执行（剪贴板可能已变），直接把上次插入的数据按原索引插回 */
  override redo() {
    if (this.pastedData) {
      this.self.insertMultipleRowWithDataMap(this.pastedData);
    }
  }
}
