import { Mcmodder } from "../Mcmodder";
import { RequestQueue } from "./RequestQueue";
import type { Logger } from "../widget/logger/Logger";

/**
 * 传统的 `RequestQueue` 只能对付静态队列。
 *
 * 如果队列中每个任务的信息都由前一个任务动态决定，那么无脑用这个！
 *
 * # 它怎么复用基类的循环
 * 基类的语义是「`queue` 有多长就派发多少个，下标逐一推进」。动态队列把 `queue` 永远维持成
 * **长度 1 的滑动窗口**：每回收一个结果就问子类「下一个请求是什么」，有就写回 `queue[0]`
 * 并把 `progress` 归零，让基类继续派发；没有就认为搜完了。
 *
 * 由此带来两处与基类的差异：
 * - 强制 `maxConcurrent = 1`——因为「下一个请求是什么」依赖上一个请求的**顺序**产出，
 *   并发会让窗口内容互相覆盖；
 * - `results` 用 `push` 而非下标对齐，且**只收有效结果**（下标无从得知，顺序即语义）。
 *
 * 遍历进度不再是 `progress`，而是子类自己的状态（如「已扫过的区间长度」），子类需要把它挂到
 * `execution` 上——这正是 `preExecution` 存在的原因。
 */
export abstract class DynamicRequestQueue extends RequestQueue {
  /**
   * @param minInterval 单个请求派发前的最小等待（ms）
   * @param logger 进度输出目标
   */
  constructor(parent: Mcmodder, id: string, minInterval = 750, logger: Logger) {
    // 基类构造的第二个参数即 maxConcurrent，这里固定为 1（见上方「它怎么复用基类的循环」）
    super(parent, id, 1, minInterval, logger);
  }

  /** 结果改为「按成功顺序追加」，不再需要与 `queue` 下标对齐 */
  override getResultInitializer() {
    return [];
  }

  /**
   * 回收结果并决定下一个请求——动态队列的「心跳」，取代了基类里按 `progress` 依次派发的部分。
   *
   * 顺序很重要：先把有效结果落进 `results`（之后才可能触发备份），再滑动窗口；
   * 搜完时直接清掉备份，避免下次运行误以为「还有断点可续」。
   */
  override storeResult(result: RequestResult) {
    if (!this.execution) return;
    // 注意用的是 truthy 判断：`onCallback` 返回 0 / "" 之类会被当作无效结果丢弃
    const canRestore = result?.success && result?.value;
    if (canRestore) {
      // 追加而非按下标写入：动态队列的 `queue` 只有一个槽位，下标失去意义
      this.execution.results.push(result.value);
    }
    const nextRequest = this.getNextRequest(result);
    if (nextRequest) {
      // 窗口只前进一格，基类随即按同一节奏派发下一个
      this.execution.progress = 0;
      this.execution.queue[0] = nextRequest;
    } else {
      this.backupManager.clear();
    }
    if (canRestore) {
      if (this.execution.results.length % RequestQueue.BACKUP_FREQUENCY === 0) {
        this.tryBackup();
      }
    }
  }

  /**
   * 问子类「下一个请求是什么」——子类在这里推进自己的遍历游标并返回请求配置。
   *
   * @param _result 刚回收的结果（含 `index`/`success`/`value`），子类可用它决定跳过与否
   * @returns 下一个请求；返回 `null` 表示搜索结束
   */
  abstract getNextRequest(_result: RequestResult): AppRequest | null;
}
