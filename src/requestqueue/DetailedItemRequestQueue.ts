import { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { McmodderItemList, RequestQueue } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderRequestQueue } from "./RequestQueue";
import { McmodderConsole } from "../widget/logger/Console";
import { McmodderLogger } from "../widget/logger/Logger";

export class McmodderDetailedItemListRequestQueue extends McmodderRequestQueue {
  constructor(parent: Mcmodder, id: string, maxConcurrent = 6, minInterval = 750, logger: McmodderLogger = new McmodderConsole) {
    super(parent, id, maxConcurrent, minInterval, logger);
  }

  onCallback(resp: GmResponseEvent<"text", any>, index: number, requestQueue: RequestQueue) {
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    const data = McmodderUtils.parseItemEditorDocument(doc);
    // console.log(data);
    this.logger.log(`${ data.id } 信息读取完成`);

    const completed = index + 1;
    if (completed % 50 === 0) {
      const total = requestQueue.length;
      this.logger.success(`${ completed.toLocaleString() }/${ total.toLocaleString() } 已完成 (${ McmodderUtils.getPrecisionFormatter().format(completed / total * 100) }%)`);
    }

    return data;
  }

  async run(itemList: McmodderItemList) { // 其实就是 STEP 3
    if (this.backupManager.hasBackup()) {
      await this.executeBackup();
    } else {
      const itemListLength = itemList.length;
      const requestList = new Array(itemListLength);
      this.logger.log(`共 ${ itemListLength.toLocaleString() } 个资料`);
      this.logger.log("获取资料详细信息");
      for (const i in itemList) {
        if (!itemList[i].id) {
          this.logger.log(`百科内资料 ID 为空，跳过`);
          continue;
        }
        if (itemList[i].registerName) { // 以注册名的存在与否作为资料是否已有详细信息的判断基准
          this.logger.log(`${ itemList[i].id } 已有注册名，跳过`);
          continue;
        }
        requestList[i] = {
          config: {
            url: `https://www.mcmod.cn/item/edit/${ itemList[i].id }/`,
            method: "GET",
            redirect: "manual"
          }
        }
      }
      this.setQueue(requestList);
      this.preExecution = {
        itemList: itemList
      };
      await this.execute();
    }

    const requestResults = this.getResult();
    for (const i in requestResults) {
      this.execution!.itemList[i] = Object.assign(this.execution!.itemList[i], requestResults[Number(i)]);
    }
    this.logger.log("获取资料详细信息 完成");
    this.backupManager.clear();
    return this.execution!.itemList;
  }
}