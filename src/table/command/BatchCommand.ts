import { Command } from "./Command";

export class BatchCommand<T extends TableAcceptable> extends Command<T> {
  commandList: Command<T>[];

  constructor(self: TableContext<T>) {
    super(self);
    this.commandList = [];
  }

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