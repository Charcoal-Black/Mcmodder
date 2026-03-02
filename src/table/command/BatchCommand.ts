import { McmodderEditableTable } from "../EditableTable";
import { Command } from "./Command";

export class BatchCommand<McmodderTableData extends Object> extends Command<McmodderTableData> {
  commandList: Command<McmodderTableData>[];

  constructor(self: McmodderEditableTable<McmodderTableData>) {
    super(self);
    this.commandList = new Array;
  }

  push(command: Command<McmodderTableData>) {
    this.commandList.push(command);
    return this;
  }

  execute() {
    let length = this.commandList.length;
    if (!length) {
      console.warn("批处理命令为空。");
    }
    for (let i = 0; i < length; i++) {
      this.commandList[i].execute();
    }
  }

  undo() {
    let length = this.commandList.length;
    for (let i = length - 1; i >= 0; i--) {
      this.commandList[i].undo();
    }
  }
}