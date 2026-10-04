/**
 * 表格编辑命令基类：可编辑表格的「命令 / 撤销」模式的基座。
 * 每个子类封装一次原子操作（编辑单元格、插入/删除/粘贴行等），
 * 组件通过 `GenericTable.execute` 把命令推入历史栈，撤销/重做时逆序调用 `undo` / `redo`。
 *
 * @param self 指向表格的命令执行上下文（`TableContext`），命令只能经它操作表格，
 * 不直接触碰组件内部状态，从而保证行为可回放。
 */
export abstract class Command<T extends TableAcceptable> {
  self: TableContext<T>;
  constructor(self: TableContext<T>) {
    this.self = self;
  }

  abstract execute(): void;

  abstract undo(): void;

  /** 默认重做即重新执行；需要「恢复原状」的语义时由子类覆写 */
  redo() {
    this.execute();
  }
}
