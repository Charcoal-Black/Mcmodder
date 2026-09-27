import type { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { DynamicRequestQueue } from "./DynamicRequestQueue";
import type { Logger } from "../widget/logger/Logger";

/**
 * 「推」出隐藏资料——即 JSON 框架 STEP 2。
 *
 * # 它在干什么
 * 百科上有些资料没有出现在模组的物品列表里（未关联到分类、或被隐藏），但 ID 往往就**夹在**
 * 已知 ID 之间。于是：把已知 ID 排序后压成若干**连续区间**，再对每个区间**从两端往中间**扫描，
 * 凡是解析出来「属于目标模组且类型正确」的，就捞进来。
 *
 * 两端交替是有意的：区间一长，从一端扫到底要很久，而多数隐藏资料集中在区间的两头
 * （与已知资料相邻的位置），交替扫描能更快撞到目标。
 *
 * 区间长度完全不可预知，所以它是标准的动态队列：每拿到一个结果才决定下一个 ID 是什么。
 * 遍历游标（`idRanges` / `dir` / `currentID` / `rangeIndex` 等）全部挂在 `execution` 上，
 * 备份会一并存下来，因此中断后能从断点继续扫。
 */
export class InferItemListRequestQueue extends DynamicRequestQueue {
  /**
   * @param parent 组合根
   * @param id 队列标识，决定备份的存储键
   * @param minInterval 单个请求派发前的最小等待（ms）；默认比基类的 750ms 更保守
   * @param logger 进度输出目标
   */
  constructor(parent: Mcmodder, id: string, minInterval = 1000, logger: Logger) {
    super(parent, id, minInterval, logger);
  }

  /**
   * 判定这个 ID 是不是「目标模组里我们想要的资料」，是则返回解析后的 `Item`，否则返回 `null`
   * （返回 `null` 会被基类视为无效结果丢弃，同时触发「跳过一次」——见 {@link getNextRequest}）。
   */
  onCallback(resp: GmResponseEvent<"text", any>) {
    if (resp.status === 301 || resp.status === 404 || !resp.responseXML) {
      this.logger.log(`目标物品已失效`);
      return null;
    }
    const doc = $(resp.responseXML);
    // 要详细信息就得进编辑页，普通资料页解析出来的字段少得多
    const data = this.execution!.config.getall
      ? Utils.parseItemEditorDocument(doc)
      : Utils.parseItemDocument(doc);
    // 双向判定：先看是不是目标模组，再看是不是目标类型（两关都过才算命中）
    if (data.classID != this.execution!.config.classID) {
      this.logger.log(`${data.id} 不属于目标模组，而是属于 ${data.classID}`);
      return null;
    }
    // 资料没填类型时按 1 算，与百科的默认行为保持一致
    if ((data.itemType || 1) != this.execution!.config.typeID) {
      this.logger.log(
        `${data.id} 属于目标模组，但资料类型编号是 ${data.itemType || 1} 而不是 ${this.execution!.config.typeID}`,
      );
      return null;
    }
    this.logger.success(`[${data.id}] ${Utils.getItemFullName(data.name, data.englishName)}`);
    return data;
  }

  /**
   * 扫描全部区间，捞出隐藏资料。
   *
   * 与 {@link DetailedItemListRequestQueue} 同理：先看有没有备份，有则从断点续跑（`itemList`
   * 与扫描游标都从备份里来）；否则把已知 ID 压成区间后**只放一个请求进队列**，
   * 之后每一步都由 {@link getNextRequest} 现场生成。
   *
   * @param itemList STEP 1 得到的已知资料列表；结果以 `concat` 追加在其后（不修改传入的数组）
   * @param config 目标模组与类型，以及是否需要详细信息
   * @returns 追加了隐藏资料后的列表
   */
  async run(itemList: ItemList, config: ItemJsonFrameConfig) {
    // 其实就是 STEP 2
    if (this.backupManager.hasBackup()) {
      await this.executeBackup();
    } else {
      this.logger.log(`共 ${itemList.length.toLocaleString()} 个资料`);
      this.logger.log("搜索潜在资料");

      const ids = itemList.map((item) => item.id).sort((a, b) => a - b);
      const idsLength = ids.length;

      // 全部挂在 preExecution 上：execute() 会把它们并入 execution，也一起进备份
      this.preExecution = {
        config: config,
        itemList: itemList,
        idRanges: [],
        idsLength: idsLength,
        checkedRangeLength: 0,
      };

      // 末尾塞一个哨兵：让最后一段连续区间也能走「遇到断点就收尾」的同一条路径
      ids.push(Number.MAX_SAFE_INTEGER);
      let prev = ids[0];
      let l = 0;
      for (let i = 1; i <= idsLength; i++) {
        // 仍连续 → 延长当前区间
        if (ids[i] === prev + 1) {
          prev = ids[i];
          continue;
        }
        // 断了 → 收下 [ids[l], ids[i-1]]，从 i 重新开一段
        this.preExecution.idRanges.push({
          l: ids[l],
          r: ids[i - 1],
        });
        prev = ids[i];
        l = i;
      }

      // 从第一个区间的左端往左扫（dir = -1 表示扫描方向朝下）
      this.preExecution.dir = -1;
      this.preExecution.rangeIndex = 0;
      this.preExecution.currentID = this.preExecution.idRanges[this.preExecution.rangeIndex].l;
      // 队列初始只有一个槽位（滑动窗口），之后每次回收结果才补上下一个
      const firstRequest = this.getNextRequest();
      if (firstRequest) {
        this.queue = [firstRequest];
        await this.execute();
      }
    }

    this.logger.log("搜索潜在资料 完成");
    this.backupManager.clear();
    // 捞到的资料是「追加」而不是「填坑」：它们在原列表中并不存在
    this.execution!.itemList = this.execution!.itemList.concat(this.results);
    // delete this.config;
    return this.execution!.itemList;
  }

  /**
   * 推进扫描游标并产出下一个请求——动态队列的全部「思考」都在这里。
   *
   * 单个区间的扫描过程：从 `l` 往左扫到不能再扫（或遇到跳过标记），再掉头从 `r` 往右扫，
   * 两边都扫到头就换下一个区间。`idRanges` 的 `l` / `r` 是**会被就地收窄**的——
   * 扫掉的部分直接写回区间本身，所以「还剩多少没扫」这件事不需要额外字段。
   *
   * @param result 刚回收的结果；`value === null` 表示上一个 ID 判定为不需要（失效/不属于目标），
   *               此时用 `forceSkip` 把紧邻的下一个 ID 跳掉——密集的无效 ID 常常连续出现，
   *               逐个请求太慢
   * @returns 下一个请求；返回 `null` 表示全部区间扫完
   */
  getNextRequest(result?: RequestResult): AppRequest | null {
    // 首次调用发生在 execute() 之前，此时只有 preExecution；续跑时则用恢复好的 execution
    const execution = this.execution || this.preExecution;
    if (!execution) return null;
    const rangeLength = execution.idRanges.length;
    // 从上次那个 ID 再走一格（上次那个已经扫过了）
    let nextID = execution.currentID + execution.dir;
    // 上一个 ID 判定为无效 → 紧接着这一个也一起跳
    let forceSkip = result?.value === null;
    while (true) {
      if (execution.rangeIndex >= rangeLength) {
        return null;
      }
      // 往左扫到头：已经贴上前一个区间的右端（否则会重复扫到已知资料）、或者越过 ID 下界
      if (
        execution.dir === -1 &&
        ((execution.rangeIndex > 0 && nextID === execution.idRanges[execution.rangeIndex - 1].r) ||
          nextID < 1 ||
          forceSkip)
      ) {
        // 掉头向右：改从本区间的右端往回扫
        execution.dir = 1;
        nextID = execution.idRanges[execution.rangeIndex].r + execution.dir;
        forceSkip = false;
        continue;
      }
      // 往右扫到头：贴上后一个区间的左端、或区间用尽
      if (
        execution.dir === 1 &&
        ((execution.rangeIndex < rangeLength - 1 &&
          nextID === execution.idRanges[execution.rangeIndex + 1].l) ||
          forceSkip)
      ) {
        // 本区间扫完，换下一个区间
        execution.rangeIndex++;
        if (execution.rangeIndex >= rangeLength) {
          return null;
        }
        const range = execution.idRanges[execution.rangeIndex];
        // 进度按「已扫过的 ID 数 / 已知 ID 总数」估算（扫过的 ID 数往往比已知的多，仅作参考）
        execution.checkedRangeLength += range.r - range.l + 1;
        this.logger.log(
          `连续区间 [${range.l}, ${range.r}] - ${Utils.getPrecisionFormatter().format(
            (execution.checkedRangeLength / execution.idsLength) * 100,
          )}% 已完成`,
        );
        // 新区间仍从左端往左扫
        execution.dir = -1;
        nextID = range.l + execution.dir;
        forceSkip = false;
        continue;
      }
      break;
    }
    // 收窄区间边界：扫过的部分就此划掉，进度即体现在 l / r 上
    if (execution.dir === -1) {
      execution.idRanges[execution.rangeIndex].l = nextID;
    } else {
      execution.idRanges[execution.rangeIndex].r = nextID;
    }
    execution.currentID = nextID;
    return {
      config: {
        // 只要基础信息就走资料页，要详细信息才进编辑页（编辑页更重，也更容易触发限流）
        url: execution.config.getall
          ? `${this.parent.hostname}/item/edit/${execution.currentID}/`
          : `${this.parent.hostname}/item/${execution.currentID}.html`,
        method: "GET",
        // 手动处理重定向：失效资料会被 301 到 404 页，据此判定「已失效」
        redirect: "manual",
      },
    };
  }
}
