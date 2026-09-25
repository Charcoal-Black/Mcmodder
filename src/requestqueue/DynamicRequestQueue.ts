import { Mcmodder } from "../Mcmodder";
import { RequestQueue } from "./RequestQueue";
import type { Logger } from "../widget/logger/Logger";

/** 
 * 传统的 `RequestQueue` 只能对付静态队列。
 * 
 * 如果队列中每个任务的信息都由前一个任务动态决定，那么无脑用这个！
 */
export abstract class DynamicRequestQueue extends RequestQueue {
  constructor(parent: Mcmodder, id: string, minInterval = 750, logger: Logger) {
    super(parent, id, 1, minInterval, logger);
  }

  override getResultInitializer() {
    return [];
  }

  override storeResult(result: RequestResult) {
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
      if (this.execution.results.length % RequestQueue.BACKUP_FREQUENCY === 0) {
        this.tryBackup();
      }
    }
  }

  abstract getNextRequest(_result: RequestResult): AppRequest | null;
}