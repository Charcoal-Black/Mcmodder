import type { GmResponseEvent } from "$";
import { BackupManager } from "../BackupManager";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import type { Logger } from "../widget/logger/Logger";
import { McmodderConsole } from "../widget/logger/Console";

/**
 * 批量请求队列的抽象基类：把「一堆要发的请求」包装成**可暂停、可限速、可中断恢复**的执行器。
 *
 * # 它解决什么问题
 * 从百科抓数据动辄上千个请求，一次性全发出去会被限流、会被中途打断（关页面、切走、报错）。
 * 这里用一个「生产者-消费者」式的循环来消化队列：
 * - **并发上限** `maxConcurrent`：同时在飞的请求不超过这个数；
 * - **最小间隔** `minInterval`：每个请求派发前至少等待这么久（真正的全局限速还叠在
 *   `Utils.createRequest` 里一层）；
 * - **暂停** `pause()` / `resume()`：只影响「还没派发出去」的请求，在飞的不打断；
 * - **断点续传**：`execution`（执行现场）每隔 {@link BACKUP_FREQUENCY} 个请求就落盘一次备份，
 *   下次运行发现备份存在就直接从断点接着跑。
 *
 * # 两种执行现场
 * - {@link execution}：本次运行真正在用的现场（`runningIndex` 是 `Set`，只能存在内存里）；
 * - {@link preExecution}：子类在启动前塞进来的「附加数据」（如待处理的 `itemList`、目标模组配置），
 *   `execute()` 启动时会与新现场合并——它同时也是**备份里保存这些附加数据的载体**，
 *   所以「从备份恢复」时不必由调用方重新提供。
 *
 * # 静态队列 vs 动态队列
 * 本类的 `queue` 在运行前就已完全确定。需要「下一个请求由上一个请求的结果决定」的场景，
 * 请改用 {@link DynamicRequestQueue}——它会把这套循环整个反过来用。
 */
export abstract class RequestQueue {
  /** 每派发多少个请求做一次现场备份（静态队列按 `progress` 计，动态队列按成功数计） */
  static BACKUP_FREQUENCY = 50;

  /** 组合根，队列用它去拿 `utils.createRequest` 等共享服务 */
  parent: Mcmodder;
  /** 本队列的标识，同时决定备份的存储键（`${id}_backup`） */
  id: string;
  /** 最大并发数 */
  maxConcurrent: number;
  /** 单个请求派发前的最小等待（ms） */
  minInterval: number;
  /** 进度与错误信息的输出目标 */
  logger: Logger;
  /** 待执行的请求表；子类在 `run()` 里填好后交给 {@link execute} */
  queue: RequestList = [];
  /** 是否处于暂停态（`run()` 中调用不会立即生效，只挡住后续派发） */
  isPaused = false;
  /** 是否空闲：`false` 表示从启动到全部完成的整个周期内都算忙（外部据此禁用按钮） */
  isIdle = true;
  /** 备份的读写门面（落到 GM 存储的 `mcmodderBackup` 下） */
  backupManager: BackupManager<RequestQueueBackup>;
  /** 本次运行的执行现场：队列副本、已回收的结果、进行中的下标集合、派发游标 */
  execution?: RequestQueueExecution;
  /** 子类在启动前提供的附加现场数据（会被合并进 `execution`，也随备份一起持久化） */
  preExecution?: RequestQueuePreExecution;
  /** 当前在飞的请求 Promise 集合（同时也是并发计数的依据） */
  running?: Set<Promise<RequestResult>>;
  /** 全部完成后按 `queue` 下标对齐的结果数组 */
  results?: RequestResult[];

  /**
   * @param parent 组合根
   * @param id 队列标识，决定备份的存储键
   * @param maxConcurrent 最大并发数
   * @param minInterval 单个请求派发前的最小等待（ms）
   * @param logger 进度输出目标，缺省用控制台 logger
   */
  constructor(
    parent: Mcmodder,
    id: string,
    maxConcurrent = 6,
    minInterval = 750,
    logger: Logger = new McmodderConsole(),
  ) {
    this.parent = parent;
    this.id = id;
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
    this.logger = logger;
    this.backupManager = new BackupManager(parent, `${id}_backup`);
  }

  /**
   * 从备份恢复现场并继续执行。
   *
   * 备份里的 `runningIndex` 是「上次中断时正在飞的那几个请求」——它们的**结果当时还没拿到**，
   * 因此原样重发一遍（`results` 里缺失的槽位正是它们的），这也是为什么 `queue` 必须整个存进备份。
   * 恢复期间沿用 `minInterval`，不额外惩罚。
   */
  protected async executeBackup() {
    const backup = this.backupManager.restore();
    if (backup === null) {
      this.logger.error("备份读取失败...");
      return;
    }
    this.isIdle = false;
    // JSON 存盘会把 Set 拍平成数组，这里还原回 Set
    (backup as any).runningIndex = new Set<number>(backup.runningIndex);
    this.execution = backup as any;
    this.running = new Set();
    backup.runningIndex.forEach((index) => {
      this.create(index, this.minInterval);
    });
    this.logger.success("读取到先前的备份，请求队列已重启。");
    // 从备份恢复时跳过「建现场 / 检查队列」那段初始化，直接消费已有现场
    await this.execute(true);
    this.backupManager.clear();
  }

  /**
   * 每个请求拿到响应后的加工钩子：把原始响应转成队列要用的数据（通常是一个 `Item`）。
   *
   * @param resp 响应（调用方已保证 `status` 为 200/301）
   * @param index 该请求在 `queue` 中的下标
   * @param queue 整个请求表（子类可用它算总进度）
   */
  protected abstract onCallback(
    resp: GmResponseEvent<"text", any>,
    index: number,
    queue: RequestList,
  ): any;

  /**
   * 派发前的挂起点，语义上是「等到可以继续为止」。
   *
   * 早期版本在这里用递归实现过真正的暂停等待（注释里还留着），但那样会在暂停期间
   * 疯狂起定时器；现在直接用 `create` 开头的 `while (this.isPaused)` 轮询来等，
   * 本方法只保留为一个「派发前钩子」的空实现。
   */
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
    return new Promise<void>((resolve) => resolve());
  }

  /**
   * 派发第 `index` 个请求，把返回的 Promise 登记到 `running` 里。
   *
   * 注意它**没有**把 Promise return 给调用方——调用方只关心「它跑完了自然会从 `running` 里消失」，
   * 真正的等待发生在 {@link execute} 的 `Promise.race` 上。
   *
   * @param index 请求在 `queue` 中的下标
   * @param interval 本次派发前的等待时长
   * @param baseInterval 重试时倍增的基准间隔（缺省即本次的 `interval`），避免递归重试时基准被逐层放大
   */
  protected async create(index: number, interval: number, baseInterval = interval) {
    // 暂停态：原地轮询等待，恢复后继续；在飞请求不受影响

    while (this.isPaused) {
      await Utils.sleep(1e3);
    }
    const request = this.execution!.queue[index];
    // 结果对象是「就地改」的：它在 Promise 链外声明，好让 `.then` / `.catch` 都能往同一份里写
    const result: RequestResult = {
      index: index,
      success: false,
      value: null,
    };
    const promise = new Promise<GmResponseEvent<"text", any>>((resolve) => {
      this.pausing().then(() => {
        // 真正的限速靠这里的 setTimeout 加上 Utils.createRequest 内部的全局间隔
        setTimeout(() => {
          resolve(this.parent.utils.createRequest(request.config));
        }, interval);
      });
    })
      .then((resp) => {
        if (resp.status === 200 || resp.status === 301) {
          result.success = true;
          result.value = this.onCallback(resp, index, this.execution!.queue);
        } else {
          // 网络连接成功但返回异常
          this.logger?.error(`访问失败 ${resp.status}: ${resp.statusText}`);
          console.error("Failed to access: ", resp);
          if (resp.status === 429) {
            // 被限流：间隔 30 倍后重发同一个下标（重发会走 `create` 重新登记进 running）
            this.logger?.error("等待重试");
            this.create(index, baseInterval * 30, baseInterval);
          }
          // 其它状态码（如 404）视为「这一项本来就不存在」，直接放弃，对应结果槽位留空
        }
        return result;
      })
      .catch((err) => {
        // 网络无法连接
        if (err instanceof TypeError) {
          // 断网类错误：同样退避 30 倍后重发
          console.error(err);
          this.logger?.error("网络连接失败，等待重试");
          this.create(index, baseInterval * 30, baseInterval);
        } else {
          // 其它异常多半来自 onCallback 的解析逻辑，重试也没用，直接放弃
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
    // runningIndex 记录「在飞的下标」，它会被写进备份：中断后据此判断哪些结果尚未拿到
    this.execution!.runningIndex!.add(index);
  }

  /** 手动触发一次备份（外部按钮、以及循环里每 {@link BACKUP_FREQUENCY} 个请求的自动备份都走这里） */
  tryBackup() {
    if (this.isIdle) {
      this.logger.warn("该队列空闲中，无法备份");
      return;
    }
    this.backup();
    this.logger.key("备份已完成。");
  }

  /** 把执行现场深拷贝后落盘；`Set` 无法直接 JSON 序列化，先转成数组 */
  protected backup() {
    const data = Utils.simpleDeepCopy(this.execution) as any;
    data.runningIndex = Array.from(this.execution!.runningIndex!);
    this.backupManager.backup(data);
  }

  /** 结果数组的初始形态：按请求数开同长度的空槽（下标对齐）；动态队列会 override 成空数组 */
  protected getResultInitializer(requestLength?: number) {
    return new Array(requestLength);
  }

  /** 回收一个完成的结果：按 `index` 写回对齐槽位，失败与缺下标的结果直接丢弃 */
  protected storeResult(result: RequestResult) {
    if (result?.success && result.index != undefined) {
      this.execution!.results[result.index] = result.value;
    }
  }

  /**
   * 主循环：尽可能填满并发地派发请求，直到全部派发完且在飞请求全部落地。
   *
   * 每轮二选一——**有空位就继续派发**（并按频次自动备份），**没空位就等最先回来的那个**。
   * `queue` 中的空槽（子类用 `new Array(n)` 打洞、跳过某些项留下的 `undefined`）会被直接跳过。
   *
   * @param isRestoredFromBackup 为真时沿用 {@link executeBackup} 已建好的现场，不重新初始化
   */
  async execute(isRestoredFromBackup = false) {
    if (!isRestoredFromBackup) {
      // 三道前置检查：不许重入、不许空跑
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
        runningIndex: new Set(),
        progress: 0,
      };
      // preExecution 在左侧：附加字段在前、核心字段在后，保证核心字段不会被附加数据覆盖
      if (this.preExecution) this.execution = Object.assign(this.preExecution, execution);
      else this.execution = execution;
      this.running = new Set();
    }
    if (!this.execution || this.running === undefined) return;
    const requestLength = this.execution.queue.length;
    // 派发条件与结束条件是两个「或」：队列派完 ≠ 结束，在飞的还得等回来
    while (this.execution.progress < requestLength || this.running.size) {
      if (this.running.size < this.maxConcurrent && this.execution.progress < requestLength) {
        const index = this.execution.progress;
        const request = this.execution.queue[index];
        if (request !== undefined && Object.prototype.hasOwnProperty.call(request, "config")) {
          this.create(index, this.minInterval);
        }
        // 无论这一格是否为空洞，游标都要前进（洞位只留空结果）
        this.execution.progress++;
        if (this.execution.progress % RequestQueue.BACKUP_FREQUENCY === 0) {
          this.tryBackup();
        }
      } else {
        // 并发已满：等最先返回的那个，收完立刻回到循环顶部补位
        const result = await Promise.race(this.running);
        this.storeResult(result);
      }
    }
    this.results = this.execution.results;
    this.isIdle = true;
  }

  /**
   * 设置待执行的请求表（返回 `this` 以便链式调用）。
   * 运行中禁止替换——`execution.queue` 与之共享引用，中途改动会让下标全部错位。
   */
  setQueue(queue: AppRequest[]) {
    if (!this.isIdle) this.logger.error("该队列正在运行中，禁止中途修改队列");
    else this.queue = queue;
    return this;
  }

  /** 取最终结果（仅在 {@link execute} 全部结束后有值），下标与 `queue` 对齐，失败的项为空洞 */
  getResult() {
    return this.results;
  }

  /** 暂停：只挡住尚未派发的请求，在飞的不受影响 */
  pause() {
    this.logger.key("已暂停运行");
    this.isPaused = true;
  }

  /** 恢复：解除暂停，排队中的请求继续以原节奏派发 */
  resume() {
    this.logger.key("已恢复运行");
    this.isPaused = false;
  }
}
