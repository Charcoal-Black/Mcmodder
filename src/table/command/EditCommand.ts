import { Command } from "./Command";

/**
 * 编辑单元格命令：把某行某字段从原值改为新值。
 *
 * @param self 表格命令上下文。
 * @param index 目标行索引。
 * @param key 目标字段名。
 * @param newValue 新的字段值。
 */
export class EditCommand<T extends TableAcceptable, K extends keyof T> extends Command<T> {
  index: number;
  key: K;
  newValue: T[K];
  originalValue?: T[K];

  constructor(self: TableContext<T>, index: number, key: K, newValue: T[K]) {
    super(self);
    this.index = index;
    this.key = key;
    this.newValue = newValue;
  }

  /** 记录原值（供撤销），再写入新值 */
  override execute() {
    this.originalValue = this.self.getRowData(this.index).content[this.key];
    this.self.editData(this.index, this.key, this.newValue);
  }

  /** 把字段值还原为执行前记录的原值 */
  override undo() {
    this.self.editData(this.index, this.key, this.originalValue);
  }
}
