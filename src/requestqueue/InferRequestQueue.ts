import { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { ItemJsonFrameConfig, McmodderItemList, RequestData, RequestResult } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderDynamicRequestQueue } from "./DynamicRequestQueue";
import { McmodderLogger } from "../widget/logger/Logger";

export class McmodderInferItemListRequestQueue extends McmodderDynamicRequestQueue {
  constructor(parent: Mcmodder, id: string, minInterval = 1000, logger: McmodderLogger) {
    super(parent, id, minInterval, logger);
  }

  onCallback(resp: GmResponseEvent<"text", any>) {
    if (resp.status === 301 || resp.status === 404 || !resp.responseXML) {
      this.logger.log(`目标物品已失效`);
      return null;
    }
    const doc = $(resp.responseXML);
    const data = this.execution!.config.getall ? McmodderUtils.parseItemEditorDocument(doc) : McmodderUtils.parseItemDocument(doc);
    if (data.classID != this.execution!.config.classID) {
      this.logger.log(`${ data.id } 不属于目标模组，而是属于 ${ data.classID }`);
      return null;
    }
    if ((data.itemType || 1) != this.execution!.config.typeID) {
      this.logger.log(`${ data.id } 属于目标模组，但资料类型编号是 ${ data.itemType || 1 } 而不是 ${ this.execution!.config.typeID }`);
      return null;
    }
    this.logger.success(`[${ data.id }] ${ McmodderUtils.getItemFullName(data.name, data.englishName) }`);
    return data;
  }

  async run(itemList: McmodderItemList, config: ItemJsonFrameConfig) { // 其实就是 STEP 2
    if (this.backupManager.hasBackup()) {
      await this.executeBackup();
    } else {
      this.logger.log(`共 ${ itemList.length.toLocaleString() } 个资料`);
      this.logger.log("搜索潜在资料");

      const ids = itemList.map(item => item.id).sort((a, b) => a - b);
      const idsLength = ids.length;

      this.preExecution = {
        config: config,
        itemList: itemList,
        idRanges: [],
        idsLength: idsLength,
        checkedRangeLength: 0
      };

      ids.push(Number.MAX_SAFE_INTEGER);
      let prev = ids[0];
      let l = 0;
      for (let i = 1; i <= idsLength; i++) {
        if (ids[i] === prev + 1) {
          prev = ids[i];
          continue;
        }
        this.preExecution.idRanges.push({
          l: ids[l],
          r: ids[i - 1]
        });
        prev = ids[i];
        l = i;
      }

      this.preExecution.dir = -1;
      this.preExecution.rangeIndex = 0;
      this.preExecution.currentID = this.preExecution.idRanges[this.preExecution.rangeIndex].l;
      const firstRequest = this.getNextRequest();
      if (firstRequest) {
        this.queue = [firstRequest];
        await this.execute();
      }
    }
    
    this.logger.log("搜索潜在资料 完成");
    this.backupManager.clear();
    this.execution!.itemList = this.execution!.itemList.concat(this.results);
    // delete this.config;
    return this.execution!.itemList;
  }

  getNextRequest(result?: RequestResult): RequestData | null {
    const execution = this.execution || this.preExecution;
    if (!execution) return null;
    const rangeLength = execution.idRanges.length;
    let nextID = execution.currentID + execution.dir;
    let forceSkip = result?.value === null;
    while (true) {
      if (execution.rangeIndex >= rangeLength) {
        return null;
      }
      if (execution.dir === -1 && ((execution.rangeIndex > 0 && nextID === execution.idRanges[execution.rangeIndex - 1].r) || nextID < 1 || forceSkip)) {
        execution.dir = 1;
        nextID = execution.idRanges[execution.rangeIndex].r + execution.dir;
        forceSkip = false;
        continue;
      }
      if (execution.dir === 1 && ((execution.rangeIndex < rangeLength - 1 && nextID === execution.idRanges[execution.rangeIndex + 1].l) || forceSkip)) {
        execution.rangeIndex++;
        if (execution.rangeIndex >= rangeLength) {
          return null;
        }
        const range = execution.idRanges[execution.rangeIndex];
        execution.checkedRangeLength += range.r - range.l + 1;
        this.logger.log(`连续区间 [${ range.l }, ${ range.r }] - ${
          McmodderUtils.getPrecisionFormatter().format(execution.checkedRangeLength / execution.idsLength * 100)
        }% 已完成`);
        execution.dir = -1;
        nextID = range.l + execution.dir;
        forceSkip = false;
        continue;
      }
      break;
    }
    if (execution.dir === -1) {
      execution.idRanges[execution.rangeIndex].l = nextID;
    } else {
      execution.idRanges[execution.rangeIndex].r = nextID;
    }
    execution.currentID = nextID;
    return {
      config: {
        url: execution.config.getall ?
          `https://www.mcmod.cn/item/edit/${ execution.currentID }/` :
          `https://www.mcmod.cn/item/${ execution.currentID }.html`,
        method: "GET",
        redirect: "manual"
      }
    }
  }
}