import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";
import { ScheduleRequestUtils } from "./ScheduleRequestUtils";

/**
 * 计划任务基类：每种定时任务都继承本类，由 {@link ScheduleRequestUtils} 调度。
 *
 * # 子类须知
 * 1. **必须**在 `run` 开头调用 `list.create(...)` 排下期，否则任务只执行一次（原因见
 *    {@link ScheduleRequestUtils} 类注释的「任务如何自我续期」）；
 * 2. 覆写 {@link priority} 声明执行优先级，越小越先跑（用于同一时刻多个任务到点时排序）；
 * 3. 若任务间隔依赖用户配置，应在 `run` 开头先读配置、**配置关闭时直接 return 不排期**，
 *    这样用户关掉配置后任务自然停摆（参见 {@link ScheduleRequestType} 各子类的写法）。
 */
export abstract class ScheduleRequestType {
  /** 全局上下文 */
  protected readonly parent: Mcmodder;
  /** 配置仓库（`parent.configRepository` 的快捷引用） */
  protected readonly configs: ConfigRepository;
  /**
   * 执行优先级，数值越小越先执行。
   * 现有约定：待审查询（2）< 检查更新/签到（10）< 关注列表（100）< 预编辑提交（200）。
   */
  abstract readonly priority: number;

  /**
   * 执行任务。实现时应先排下期，再做实际工作。
   *
   * @param list 调度器，用于排期。
   */
  abstract run(list: ScheduleRequestUtils): void;

  /**
   * @param parent 全局上下文。
   */
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
  }

  /** 取执行优先级 */
  getPriority() {
    return this.priority;
  }
}
