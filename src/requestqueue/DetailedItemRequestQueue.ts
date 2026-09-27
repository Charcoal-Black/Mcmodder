import type { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { RequestQueue } from "./RequestQueue";
import { McmodderConsole } from "../widget/logger/Console";
import type { Logger } from "../widget/logger/Logger";

/**
 * 抓取「物品编辑页」的详细信息——即 JSON 框架 STEP 3。
 *
 * 与 {@link InferItemListRequestQueue}（STEP 2，往外拓展找隐藏资料）相反，这一步是**向内**的：
 * 输入一份已知 ID 的 `itemList`，逐个访问 `/item/edit/{id}/` 把编辑页里的完整资料解析出来，
 * 回填到 `itemList` 的对应下标上。
 *
 * 因为每个 ID 已知、要访问哪个 URL 一开始就能列全，所以是标准的静态队列（并发 6、间隔 750ms），
 * 直接用基类的循环即可。断点续传也由基类兜住：中断时 `execution`（含整个 `itemList`）被备份，
 * 下次运行直接接着跑，**不需要重新从 STEP 1 抓一遍**。
 */
export class DetailedItemListRequestQueue extends RequestQueue {
  /**
   * @param parent 组合根
   * @param id 队列标识，决定备份的存储键（`ItemJsonFrame` 里分了 `detailedRequestQueue` 与
   *           `manualRequestQueue` 两份，互不干扰）
   * @param maxConcurrent 最大并发数
   * @param minInterval 单个请求派发前的最小等待（ms）
   * @param logger 进度输出目标
   */
  constructor(
    parent: Mcmodder,
    id: string,
    maxConcurrent = 6,
    minInterval = 750,
    logger: Logger = new McmodderConsole(),
  ) {
    super(parent, id, maxConcurrent, minInterval, logger);
  }

  /** 解析编辑页文档得到完整 `Item`，并每 50 个打印一次百分比进度 */
  protected override onCallback(
    resp: GmResponseEvent<"text", any>,
    index: number,
    requestQueue: RequestList,
  ) {
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    const data = Utils.parseItemEditorDocument(doc);
    // console.log(data);
    this.logger.log(`${data.id} 信息读取完成`);

    const completed = index + 1;
    // 用下标当进度：静态队列的结果按 `queue` 下标对齐，且下标大体按派发顺序递增
    if (completed % 50 === 0) {
      const total = requestQueue.length;
      this.logger.success(
        `${completed.toLocaleString()}/${total.toLocaleString()} 已完成 (${Utils.getPrecisionFormatter().format((completed / total) * 100)}%)`,
      );
    }

    return data;
  }

  /**
   * 抓取整份 `itemList` 的详细信息。
   *
   * 两条路径：存在备份 → {@link RequestQueue.executeBackup} 从断点续跑（此时 `itemList` 直接取自
   * 备份里的现场）；否则按 `itemList` 的长度**打洞**出一份等长的 `requestList`——
   * 跳过的那几项留作空洞，基类会跳过它们并在对齐的结果数组里留空位（见 `execute` 中的 `hasOwnProperty` 判断）。
   *
   * @param itemList 待补全的资料列表；会**就地**被返回对象合并修改
   * @returns 补全后的 `itemList`
   */
  async run(itemList: ItemList) {
    // 其实就是 STEP 3
    if (this.backupManager.hasBackup()) {
      // 续跑：`execution.itemList` 来自备份，与调用方传进来的这份未必是同一批数据
      await this.executeBackup();
    } else {
      const itemListLength = itemList.length;
      // 先按 itemList 的长度开好等长的洞，跳过的项留空——下标必须保持一一对应
      const requestList = new Array(itemListLength);
      this.logger.log(`共 ${itemListLength.toLocaleString()} 个资料`);
      this.logger.log("获取资料详细信息");
      for (const i in itemList) {
        if (!itemList[i].id) {
          this.logger.log(`百科内资料 ID 为空，跳过`);
          continue;
        }
        if (itemList[i].registerName) {
          // 以注册名的存在与否作为资料是否已有详细信息的判断基准
          this.logger.log(`${itemList[i].id} 已有注册名，跳过`);
          continue;
        }
        requestList[i] = {
          config: {
            url: `${this.parent.hostname}/item/edit/${itemList[i].id}/`,
            method: "GET",
            redirect: "manual",
          },
        };
      }
      this.setQueue(requestList);
      // itemList 挂到现场上：它既是备份的一部分（中断后据此还原），也是结果的落点
      this.preExecution = {
        itemList: itemList,
      };
      await this.execute();
    }

    // 按下标合并回原对象：队列下标与 itemList 下标一一对应（空洞除外，其结果槽也是空的）
    const requestResults = this.getResult();
    for (const i in requestResults) {
      this.execution!.itemList[i] = Object.assign(
        this.execution!.itemList[i],
        requestResults[Number(i)],
      );
    }
    this.logger.log("获取资料详细信息 完成");
    this.backupManager.clear();
    return this.execution!.itemList;
  }
}
