import { Init } from "../Init";

/**
 * 后台管理页（admin.mcmod.cn）子模块的基类。
 *
 * 每一个子类对应后台左侧菜单里的一个页面，由 {@link AdminInit} 统一注册，
 * 按 `h1.title` 匹配后随导航切换被调用：
 * - {@link run} —— 每次进入该页面都会调用，负责渲染当前页面（须可重复执行）；
 * - {@link firstRun} —— 仅在本次会话首次进入该页面时调用，
 *   用于挂 `window` / `document` 级事件、注册定时器等只应发生一次的副作用。
 *
 * 子类不由 `InitLoader` 注册，因此 `canRun()` 一律返回 `false`，
 * 与 {@link GeneralEditInit} 同理，仅由父级显式实例化。
 */
export abstract class AdminBaseInit extends Init {
  override canRun() {
    return false;
  }
  abstract getTriggerTitle(): string;
  abstract override run(): void;
  firstRun() {}
}
