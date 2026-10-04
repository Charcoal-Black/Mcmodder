import { Command } from "./Command";

/**
 * 批处理命令：把多个子命令打包成一个原子命令，execute 按序执行、undo 逆序撤销。
 * 用于「一次操作改动多个单元格/多行」时整组入栈，保证撤销时整体回滚。
 */
export class BatchCommand<T extends TableAcceptable> extends Command<T> {
  commandList: Command<T>[];

  constructor(self: TableContext<T>) {
    super(self);
    this.commandList = [];
  }

  /** 追加一个子命令，返回自身以支持链式调用 */
  push(command: Command<T>) {
    this.commandList.push(command);
    return this;
  }

  execute() {
    const length = this.commandList.length;
    if (!length) {
      console.warn("批处理命令为空。");
    }
    for (let i = 0; i < length; i++) {
      this.commandList[i].execute();
    }
  }

  undo() {
    const length = this.commandList.length;
    for (let i = length - 1; i >= 0; i--) {
      this.commandList[i].undo();
    }
  }
}
