import { Mcmodder } from "../Mcmodder";
import { McmodderTable } from "../table/Table";
import { McmodderFileDisplayData } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderConfigResourceInteractor } from "./ConfigResourceInteractor";

export class McmodderConfigResourceFileListInteractor extends McmodderConfigResourceInteractor<McmodderFileDisplayData> {
  constructor(parent: Mcmodder, id: string, name: string) {
    super(
      parent, id, name, {
        fileName: "文件名",
        size: ["数据大小", McmodderTable.DISPLAYRULE_SIZE]
      }, null, (key, item) => ({
        fileName: key,
        size: McmodderUtils.getContextLength(JSON.stringify(item))
      })
    );
  }
}