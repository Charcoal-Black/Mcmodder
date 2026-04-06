import { GmResponseEvent } from "$";
import { McmodderBackupManager } from "../BackupManager";
import { Mcmodder } from "../Mcmodder";
import { RequestData, RequestQueue, RequestQueueBackupData, RequestQueueExecution, RequestQueuePreExecution, RequestResult } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderLogger } from "../widget/logger/Logger";
import { McmodderConsole } from "../widget/logger/Console";

export abstract class McmodderRequestQueue {

  static BACKUP_FREQUENCY = 50;

  parent: Mcmodder;
  id: string;
  maxConcurrent: number;
  minInterval: number;
  logger: McmodderLogger;
  queue: RequestQueue = [];
  isPaused = false;
  isIdle = true;
  backupManager: McmodderBackupManager<RequestQueueBackupData>;
  execution?: RequestQueueExecution;
  preExecution?: RequestQueuePreExecution;
  running?: Set<Promise<RequestResult>>;
  results?: RequestResult[];

  constructor(parent: Mcmodder, id: string, maxConcurrent = 6, minInterval = 750, logger: McmodderLogger = new McmodderConsole) {
    this.parent = parent;
    this.id = id;
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
    this.logger = logger;
    this.backupManager = new McmodderBackupManager(parent, `${ id }_backup`);
  }

  protected async executeBackup() {
    const backup = this.backupManager.restore();
    this.isIdle = false;
    (backup as any).runningIndex = new Set<number>(backup.runningIndex);
    this.execution = (backup as any);
    this.running = new Set;
    backup.runningIndex.forEach(index => {
      this.create(index, this.minInterval);
    });
    this.logger.success("读取到先前的备份，请求队列已重启。");
    await this.execute(true);
    this.backupManager.clear();
  }

  protected abstract onCallback(resp: GmResponseEvent<"text", any>, index: number, queue: RequestQueue): any;

  protected pausing() {
    // return new Promise<boolean>(resolve => {
    //   if (!this.isPaused) resolve(true);
    //   else setTimeout(() => {
    //     resolve(false);
    //   }, 1e3);
    // })
    // .then(shouldContinue => {
    //   if (!shouldContinue) return this.pausing();
    // });
    return new Promise<void>(resolve => resolve());
  }

  protected async create(index: number, interval: number, baseInterval = interval) {
    while (this.isPaused) {
      await McmodderUtils.sleep(1e3);
    }
    const request = this.execution!.queue[index];
    const result: RequestResult = {
      index: index,
      success: false,
      value: null
    };
    const promise = new Promise<GmResponseEvent<"text", any>>(resolve => {
      this.pausing().then(() => {
        setTimeout(() => {
          resolve(this.parent.utils.createAsyncRequest(request.config));
        }, interval);
      });
    })
    .then(resp => {
      if (resp.status === 200 || resp.status === 301) {
        result.success = true;
        result.value = this.onCallback(resp, index, this.execution!.queue);
      }
      else { // 网络连接成功但返回异常
        this.logger?.error(`访问失败 ${ resp.status }: ${ resp.statusText }`);
        console.error("Failed to access: ", resp);
        if (resp.status === 429) {
          this.logger?.error("等待重试");
          this.create(index, baseInterval * 30, baseInterval);
        }
      }
      return result;
    })
    .catch(err => { // 网络无法连接
      if (err instanceof TypeError) {
        console.error(err);
        this.logger?.error("网络连接失败，等待重试");
        this.create(index, baseInterval * 30, baseInterval);
      }
      else {
        this.logger?.error("未知错误");
        console.error(err);
      }
      return result;
    })
    .finally(() => {
      this.running!.delete(promise);
      this.execution!.runningIndex!.delete(index);
    });
    this.running!.add(promise);
    this.execution!.runningIndex!.add(index);
  }

  tryBackup() {
    if (this.isIdle) {
      this.logger.warn("该队列空闲中，无法备份");
      return;
    }
    this.backup();
    this.logger.key("备份已完成。");
  }

  protected backup() {
    const data = McmodderUtils.simpleDeepCopy(this.execution) as any;
    data.runningIndex = Array.from(this.execution!.runningIndex!);
    this.backupManager.backup(data);
  }

  protected getResultInitializer(requestLength?: number) {
    return new Array(requestLength);
  }

  protected storeResult(result: RequestResult) {
    if (result?.success && result.index != undefined) {
      this.execution!.results[result.index] = result.value;
    }
  }

  async execute(isRestoredFromBackup = false) {
    if (!isRestoredFromBackup) {
      if (!this.isIdle) {
        console.error("该队列已在运行中");
        return;
      }
      if (!this.queue.length) {
        console.error("队列为空，无法启动");
        return;
      }
      this.isIdle = false;
      const execution: RequestQueueExecution = {
        queue: this.queue,
        results: this.getResultInitializer(this.queue.length),
        runningIndex: new Set,
        progress: 0
      }
      if (this.preExecution) this.execution = Object.assign(this.preExecution, execution);
      else this.execution = execution;
      this.running = new Set;
    }
    if (!this.execution || this.running === undefined) return;
    const requestLength = this.execution.queue.length;
    while ((this.execution.progress < requestLength) || this.running.size) {
      if (this.running.size < this.maxConcurrent && this.execution.progress < requestLength) {
        const index = this.execution.progress;
        if (this.execution.queue[index]?.hasOwnProperty("config")) {
          this.create(index, this.minInterval);
        };
        this.execution.progress++;
        if (this.execution.progress % McmodderRequestQueue.BACKUP_FREQUENCY === 0) {
          this.tryBackup();
        }
      }
      else {
        const result = await Promise.race(this.running);
        this.storeResult(result);
      }
    }
    this.results = this.execution.results;
    this.isIdle = true;
  }

  setQueue(queue: RequestData[]) {
    if (!this.isIdle) this.logger.error("该队列正在运行中，禁止中途修改队列");
    else this.queue = queue;
    return this;
  }

  getResult() {
    return this.results;
  }

  pause() {
    this.logger.key("已暂停运行");
    this.isPaused = true;
  }

  resume() {
    this.logger.key("已恢复运行");
    this.isPaused = false;
  }
}