import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { ScheduleRequestType } from "./ScheduleRequestType";

/**
 * 计划任务的触发方式。
 *
 * - `NONE` —— 不由此处触发（预留）；
 * - `CONFIG` —— 由一个用户配置项决定是否启用、以及最小启用阈值（见 {@link ScheduleRequestUtils.addRequestType}）。
 */
export const enum ScheduleRequestTriggerType {
  NONE,
  CONFIG,
}

/**
 * 计划任务调度器：管理「到点该执行什么」的队列，并按优先级依次执行到期任务。
 *
 * # 整体机制
 * 调度器本身**不含任何定时器** —— 它只维护一份持久化的待办列表（`scheduleRequestList`），
 * 由外部每秒调用一次 {@link check} 来轮询「有没有到点的任务」。
 * 轮询由 {@link ScheduleRequestLoader} 用 `setInterval` 挂在页面里。
 *
 * 之所以用「持久化列表 + 轮询」而非 `setTimeout`：用户脚本随时可能被油猴停用、页面随时可能关闭，
 * 任务必须**记住**上次排到什么时候、跨会话续跑，否则「每天自动签到」会随着页面关闭而失效。
 *
 * # 任务如何自我续期
 * 每个 {@link ScheduleRequestType} 子类在 `run` 开头就调用 {@link ScheduleRequestUtils.create}
 * 排下下一次，这是**首要约定**：
 * {@link check} 执行完任务后会立刻把该条待办从列表中移除，若子类没有重新排期，任务就只跑这一次。
 * 因此新增任务类型时，`run` 的第一件事必须是排下期。
 *
 * # 间隔的两种表达
 * - **固定间隔**：排 `Date.now() + n * 3_600_000`，如自动检查更新（1 小时）、自动提交预编辑项（用户可配）；
 * - **每天固定时刻**：排 `Utils.getStartTime(new Date())`（次日零点），如自动签到。
 */
export class ScheduleRequestUtils {
  /** 全局上下文 */
  readonly parent: Mcmodder;
  /** 配置仓库 */
  private readonly configs: ConfigRepository;
  /** 任务 id → 任务实例的映射，由 {@link addRequestType} 填充 */
  private readonly requestData: ScheduleRequestOption;

  /**
   * @param parent 全局上下文。
   */
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
    this.requestData = {};
  }

  /**
   * 注册一种任务，并按触发方式决定是否立即排期。
   * 各任务的注册见 {@link ScheduleRequestLoader}。
   *
   * @param key 任务 id，同时是待办列表中的 `todo` 字段。
   * @param request 任务实例。
   * @param trigger 触发方式。
   * @param param 触发参数三元组，依次为
   *   「关联的配置项 id」、「该配置项的最小启用阈值」、「是否要求登录用户」。
   */
  addRequestType(
    key: keyof ScheduleRequestTypes,
    request: ScheduleRequestType,
    trigger: ScheduleRequestTriggerType,
    ...param: [KeysOfType<Settings, number | boolean>, number, boolean]
  ) {
    this.requestData[key] = request;
    this.init(key, trigger, param);
  }

  /**
   * 按触发方式决定某任务「现在要不要立刻排一次」。
   *
   * `CONFIG` 模式下有三种走向：
   * - 配置已启用（含用户限制）、且该任务当前**没有待办** → 立刻排期（`time = 0` 表示已到点，
   *   会在下一次轮询时马上执行）；
   * - 配置已启用但已有待办 → 什么都不做，保留原有排期；
   * - 配置未启用 → 清除该任务的待办，任务就此停摆。
   *
   * @param key 任务 id。
   * @param trigger 触发方式。
   * @param param 同 {@link addRequestType} 的 `param`。
   */
  init(
    key: keyof ScheduleRequestTypes,
    trigger: ScheduleRequestTriggerType,
    param: [KeysOfType<Settings, number | boolean>, number, boolean],
  ) {
    switch (trigger) {
      case ScheduleRequestTriggerType.CONFIG: {
        const configID = param[0],
          minimum = param[1] ?? 0,
          hasUserLimit = param[2];
        const configValue = this.configs.getSettings(configID);
        if (
          (hasUserLimit ? this.parent.currentUID > 0 : true) &&
          configValue &&
          Number(configValue) >= minimum &&
          !this.find(key, hasUserLimit ? this.parent.currentUID : undefined)?.time
        ) {
          this.create(0, key, hasUserLimit ? this.parent.currentUID : undefined);
        } else if (!configValue) {
          this.deleteByTodo(key);
        }
        break;
      }
    }
  }

  /** 读取全部待办列表 */
  get(): ScheduleRequestList {
    return this.configs.getAll("scheduleRequestList") ?? [];
  }

  /**
   * 覆盖写入待办列表。
   *
   * @param e 新的待办列表。
   */
  set(e: ScheduleRequestList) {
    this.configs.setAll("scheduleRequestList", e);
  }

  /** 清空全部待办 */
  empty() {
    this.set([]);
  }

  /**
   * 查找某任务当前**最早**的那条待办。
   *
   * @param todo 任务 id。
   * @param userID 按用户过滤；`undefined`/`0` 表示不限用户。
   * @returns 最早的一条待办，不存在时返回 undefined。
   */
  find(todo: keyof ScheduleRequestTypes, userID?: number | null) {
    const scheduleRequestList = this.get();
    return scheduleRequestList
      .filter((e) => e.todo === todo && (!userID || e.userID === userID))
      .sort((a, b) => a.time - b.time)[0];
  }

  /**
   * 清除某任务的**全部**待办（不限用户），用于关闭配置时停摆任务。
   *
   * @param todo 任务 id。
   */
  deleteByTodo(todo: keyof ScheduleRequestTypes) {
    let scheduleRequestList = this.get();
    scheduleRequestList = scheduleRequestList.filter((e) => !(e.todo === todo));
    this.set(scheduleRequestList);
  }

  /**
   * 排一次待办。**同一任务只保留一条**（会先清除旧待办），
   * 因此调用方无需关心是否已有排期 —— 这也是任务能在 `run` 开头无条件续期的底气。
   *
   * @param time 触发时刻（毫秒时间戳），传 0 表示立即到点。
   * @param todo 任务 id。
   * @param userID 归属用户；`0`/`undefined` 表示不限定用户。
   * @param priority 执行优先级（越小越先执行），缺省取任务自身的 `priority`，
   *   再缺省为 `Number.MAX_SAFE_INTEGER`（即排在最后）。
   */
  create(time: number, todo: keyof ScheduleRequestTypes, userID?: number, priority?: number) {
    this.deleteByTodo(todo);
    const scheduleRequestList = this.get();
    scheduleRequestList.push({
      time: time,
      todo: todo,
      userID: userID,
      priority: priority ?? this.requestData[todo]?.priority ?? Number.MAX_SAFE_INTEGER,
      id: Utils.randStr(8),
    });
    this.set(scheduleRequestList);
  }

  /**
   * 轮询入口：找出所有「已到点且属于当前用户」的待办，按优先级依次执行，然后移除它们。
   *
   * 归属判定：待办的 `userID` 为空或 ≤ 0 视为**不限定用户**（如自动检查更新），
   * 否则必须等于当前登录用户才执行 —— 避免在未登录或登录成他人账号时误跑他人任务。
   *
   * @warning 执行前先算好 `idList`，执行后再从**重新读取**的列表里过滤。
   * 由于任务的 `run` 内部会调用 {@link create} 追加下一次待办，
   * 若拿执行前的旧列表做过滤，会把刚排好的下一轮一并抹掉。
   */
  check() {
    let scheduleRequestList = this.get();
    const now = new Date().getTime();
    const todoList = scheduleRequestList.filter(
      (e) =>
        e.time <= now &&
        (e.userID === undefined || e.userID <= 0 || e.userID === this.parent.currentUID),
    );
    const idList = todoList.map((e) => e.id);
    if (todoList.length) {
      todoList.sort((a, b) => a.priority - b.priority);
      todoList.forEach((e) => this.run(e.todo));
      scheduleRequestList = this.get().filter((e) => !idList.includes(e.id));
      this.set(scheduleRequestList);
    }
  }

  /**
   * 执行某个任务，任务实例由 {@link addRequestType} 注册而来。
   *
   * @param todo 任务 id。
   */
  run(todo: keyof ScheduleRequestTypes) {
    this.requestData[todo]!.run(this);
  }
}
