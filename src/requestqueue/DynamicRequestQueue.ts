import { Mcmodder } from "../Mcmodder";
import { RequestData, RequestResult } from "../types";
import { McmodderRequestQueue } from "./RequestQueue";
import { McmodderLogger } from "../widget/logger/Logger";

/** 
 * 传统的 `McmodderRequestQueue` 只能对付静态队列。
 * 
 * 如果队列中每个任务的信息都由前一个任务动态决定，那么无脑用这个！
 */
export abstract class McmodderDynamicRequestQueue extends McmodderRequestQueue {
  constructor(parent: Mcmodder, id: string, minInterval = 750, logger: McmodderLogger) {
    super(parent, id, 1, minInterval, logger);
  }

  getResultInitializer(_requestLength?: number) {
    return [];
  }

  storeResult(result: RequestResult) {
    if (!this.execution) return;
    const canRestore = result?.success && result?.value;
    if (canRestore) {
      this.execution.results.push(result.value);
    }
    const nextRequest = this.getNextRequest(result);
    if (nextRequest) {
      this.execution.progress = 0;
      this.execution.queue[0] = nextRequest;
    } else {
      this.backupManager.clear();
    }
    if (canRestore) {
      if (this.execution.results.length % McmodderRequestQueue.BACKUP_FREQUENCY === 0) {
        this.tryBackup();
      }
    }
  }

  abstract getNextRequest(_result: RequestResult): RequestData | null;
}