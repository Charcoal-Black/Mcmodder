import { Utils } from "../../Utils.ts";
import type { PopoverExpose } from "../../types/props";

/**
 * 弹出框（以 `Popover` 作为 DOM 根组件的组件）的控制器**基类**。
 *
 * # 为什么要按组件类型拆分
 * 弹出框要挂在各种宿主 DOM 上：百科原生表单里的 textarea、UEditor 里的备注框、乃至显示成
 * 按钮的下拉菜单。它们既不是 Vue 组件树的一部分，也没有统一的挂载点，因此需要控制器来：
 * 1. 在 `document.body` 下建一个容器，把弹出框组件挂上去；
 * 2. 在 `window` 上以**捕获阶段**监听事件，命中已登记的元素时调组件的 `setOption` 切换服务对象，
 *    或把事件转交给组件的 `inputEvents` 处理函数。
 *
 * 每种弹出框组件各有一个控制器（`InputListPopoverController` / `AttitudePickerPopoverController` /
 * `StickerViewerPopoverController`），它们共享本基类提供的上述机制，彼此只在三处不同：
 * **组件类型**、**触发方式**（点击 / 悬停）、**如何把选项交给组件**（`applyOption`）。
 *
 * # 交互元素 ≠ 输入元素
 * `add` 的第一个参数是**交互元素**（被登记、被监听的那个节点）。绝大多数场景它同时也是输入元素；
 * 但也可以通过 `option.inputListBindElement` 另行指定**输入元素**——此时交互元素只负责
 * 「什么时候该弹列表」，文本读写全部发生在输入元素上（见 `DropdownMenuInput.vue`）。
 * 注意事件监听在 `window` 上，判断用的是 `e.composedPath()[0]`，即**实际被命中的最深元素**，
 * 因此挂 `inputListBindElement` 时，登记的必须是那个真正会收到 focus 的节点。
 *
 * # 事件委派的过滤器
 * 转发来的 `focus` / `keydown` 等事件只对「已登记元素」生效（见 `installListeners` 里的循环），
 * 所以宿主可以放心把同一批监听同时用于其它元素。
 */

/** 触发弹出框的方式 */
export type PopoverTrigger = "click" | "pointerover";

/** 弹出框控制器的构造参数 */
export interface PopoverControllerConfig<
  TOption extends PopoverOption,
  TProps extends TOption,
  TEvents extends Record<string, (e: Event) => void>,
> {
  /** 组件类型标识（仅用于报错信息） */
  type: TOption["type"];
  /** 触发弹出框的事件 */
  trigger: PopoverTrigger;
  /** 已挂载的组件实例 */
  component: PopoverExpose<TProps, TEvents>;
}

/**
 * 在 `body` 下建一个容器，供弹出框组件挂载。
 *
 * 弹出框组件不是宿主页面的一部分（宿主既没有统一的挂载点，也不认得这些组件），
 * 因此统一挂到 `body` 下，由组件自己用 fixed 定位贴到锚点旁边。
 */
export function createPopoverContainer(): HTMLElement {
  return $("<div>").appendTo(document.body).get(0) as HTMLElement;
}

/**
 * 手动派发事件的函数：事件名取自组件的 `inputEvents`，
 * 第二个参数为要传递的事件对象，缺省时按事件名构造一个空的 `Event`。
 */
export type PopoverEventSender<TEvents extends Record<string, (e: Event) => void>> = (
  eventName: keyof TEvents,
  event?: Event,
) => void;

/**
 * 弹出框控制器的基类：只提供与组件类型无关的机制，具体组件由子类给出。
 *
 * 每个子类是一个**单例**（各自持有一份 `instance`），彼此独立：登记关系、当前服务对象、
 * 事件监听都各管各的。
 */
export abstract class PopoverController<
  TOption extends PopoverOption,
  TProps extends TOption,
  TEvents extends Record<string, (e: Event) => void>,
> {
  /**
   * 跨控制器共享的「交互元素 → 已登记的组件类型」表：同一元素不允许登记到多个控制器，
   * 否则多个弹出框会抢同一个触发点。
   */
  private static readonly registeredTypes = new WeakMap<HTMLElement, PopoverOption["type"]>();

  /** 统一的中止信号：`abort()` 一次即摘掉本控制器注册的所有 `window` 监听 */
  private readonly ac = new AbortController();
  /** 捕获阶段监听的公共选项（捕获是为了在事件到达目标前就拦截到，`focus` 不冒泡） */
  private readonly opt = {
    capture: true,
    signal: this.ac.signal,
  };

  /** 弹出框组件的实例（由子类在构造时挂载好） */
  protected readonly app: PopoverExpose<TProps, TEvents>;
  /** 组件类型标识（仅用于报错信息） */
  protected readonly type: TOption["type"];
  /** 触发弹出框的事件 */
  protected readonly trigger: PopoverTrigger;

  /** 已登记的「交互元素 → 选项」映射（用 WeakMap，元素被移除后自动失效） */
  private readonly optionMap = new WeakMap<HTMLElement, TOption>();
  /**
   * 已登记的「交互元素 → 选项」懒映射，交互元素触发事件时才异步加载，
   * 加载完成后从此中移出，并将结果存回 {@link optionMap}
   */
  private readonly lazyOptionMap = new WeakMap<
    HTMLElement,
    (element: HTMLElement) => Awaitable<TOption>
  >();
  /**
   * 正在异步计算懒映射的交互元素，此过程中该交互元素无法重复触发事件，计算完成后将交互元素移出
   */
  private readonly pendingOptionSet = new WeakSet<HTMLElement>();

  /** 当前服务的交互元素（`null` 表示当前没有弹出框在服务） */
  private activeTarget: HTMLElement | null = null;
  /** 悬停离开后的关闭延时（仅悬停型控制器用到） */
  private timeout: number | null = null;
  /** 鼠标是否已移入弹出框内部（仅悬停型控制器用到） */
  private hoveringPopover = false;

  protected constructor(config: PopoverControllerConfig<TOption, TProps, TEvents>) {
    this.app = config.component;
    this.type = config.type;
    this.trigger = config.trigger;
    this.installListeners();
  }

  /**
   * 把本控制器需要的事件监听挂到 `window` 上。
   *
   * 悬停型的监听（`pointerover` / `pointerout`）不在这里——它们只对「悬停触发」的控制器有意义，
   * 由相应子类在自己的构造函数里追加。
   */
  private installListeners() {
    // 任何已登记元素被点击 → 切换弹出框的当前服务对象
    // 先前为监听 focus，但是已经获得焦点的元素在失焦前无法再次被聚焦，导致当弹出框并非因锚点失焦而隐藏时，
    // 再次点击锚点不会让弹出框重新出现，因此现在改为监听 click 以优化交互
    window.addEventListener(
      "click",
      async (e) => {
        const closest = this.getClosestWithOption(e);
        if (closest !== undefined) {
          const { target, option } = closest;
          const success = await this.serve("click", target, option);
          if (success) {
            return;
          }
        }

        if (!this.inPopover(e)) {
          this.closeActive();
        }
      },
      this.opt,
    );

    // 页面滚动时重新量锚点位置（列表是 fixed 定位，需跟随输入框）
    window.addEventListener(
      "scroll",
      // 有时弹出框的位置更新优先级要先于锚点跟随父元素的位置更新，导致弹出框的更新出现延迟，
      // 这里下调优先级（不填则缺省为 0）
      Utils.animationThrottle(() => {
        this.app.updatePos();
      }, 1),
      {
        passive: true,
        ...this.opt,
      },
    );

    // 窗口尺寸变化同理
    window.addEventListener(
      "resize",
      Utils.animationThrottle(() => {
        this.app.updatePos();
      }),
      {
        passive: true,
        ...this.opt,
      },
    );

    // 把组件的 inputEvents 转发到 window
    for (const [eventName, event] of Object.entries(this.app.inputEvents)) {
      window.addEventListener(
        eventName,
        (e) => {
          const target = e.composedPath()[0] as HTMLElement;
          if (this.optionMap.get(target) !== undefined) {
            event(e);
          }
        },
        this.opt,
      );
    }
  }

  /**
   * 挂上「悬停触发」所需的监听：鼠标移入已登记元素即弹出，移出后延时关闭。
   *
   * 只有悬停型的控制器才需要它（点击型的控制器不会用到这里的延时与「鼠标在框内」状态）。
   */
  protected installHoverListeners() {
    window.addEventListener(
      "pointerover",
      async (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement) || this.pendingOptionSet.has(target)) {
          return;
        }

        if (this.timeout !== null && this.inPopover(e)) {
          clearTimeout(this.timeout);
          this.timeout = null;
          this.hoveringPopover = true;
        }

        const option = this.hasOption(target);
        if (option) {
          const success = await this.serve("pointerover", target, option);
          if (success && this.timeout !== null) {
            clearTimeout(this.timeout);
            this.timeout = null;
          }
        }
      },
      this.opt,
    );

    window.addEventListener(
      "pointerout",
      async (e) => {
        if (
          (this.activeTarget === e.target && this.timeout === null) ||
          (this.hoveringPopover && !this.inPopover(e))
        ) {
          this.hoveringPopover = false;
          this.timeout = setTimeout(() => {
            this.closeActive();
            this.timeout = null;
          }, 300);
        }
      },
      this.opt,
    );
  }

  /** 已登记的「交互元素 → 选项」查询（懒映射里的选项也算） */
  private hasOption(target: HTMLElement) {
    return this.optionMap.get(target) ?? this.lazyOptionMap.get(target);
  }

  /** 沿事件路径由内向外找出第一个已登记的交互元素 */
  private getClosestWithOption(ev: Event) {
    const eventTargets = ev.composedPath();
    for (const target of eventTargets) {
      if (!(target instanceof HTMLElement)) {
        continue;
      }
      if (this.pendingOptionSet.has(target)) {
        return;
      }
      const option = this.hasOption(target);
      if (option !== undefined) {
        return {
          option,
          target,
        };
      }
    }
  }

  /** 事件是否发生在某个弹出框内部 */
  private inPopover(e: Event) {
    return e
      .composedPath()
      .some((e) => e instanceof HTMLElement && e.classList.contains("mcmodder-popover"));
  }

  /**
   * 切换弹出框的服务对象，并令弹出框显示。
   *
   * 现在弹出框的显示状态均由弹出框组件自身的 setOption 实现，即只要服务对象切换就立即显示，
   * 以后如果有需要，可以拆分逻辑。
   */
  private async serve(
    eventName: string,
    target: HTMLElement,
    option: TOption | ((element: HTMLElement) => Awaitable<TOption>),
  ) {
    if (option instanceof Function) {
      this.pendingOptionSet.add(target);
      option = await option(target);
      this.pendingOptionSet.delete(target);
      this.lazyOptionMap.delete(target);
      this.optionMap.set(target, option);
    }
    if (eventName !== this.trigger) {
      return false;
    }
    if (option.closeWhenClickAgain && this.activeTarget === target) {
      return false;
    }
    this.activeTarget = target;
    this.applyOption(option, target);
    return true;
  }

  /** 关闭当前正在服务的弹出框 */
  private closeActive() {
    if (this.activeTarget === null) return;
    this.app.close();
    this.activeTarget = null;
  }

  /**
   * 把选项交给组件（各组件的 `setOption` 入参不同，由子类实现）。
   *
   * @param option 已解析出的选项。
   * @param target 当前服务的交互元素。
   */
  protected abstract applyOption(option: TOption, target: HTMLElement): void;

  /**
   * 给一个元素登记弹出框选项。
   *
   * @param e **交互元素**：被监听 focus / 键盘 / 输入事件的那个节点。
   * @param option 行为选项；各类型的专属选项见各自的 `*Option` 接口
   *               （如 `inputListBindElement` 另行指定**输入元素**，缺省即 `e` 本身）。
   * @returns 一个手动派发事件的函数——用于「交互元素收不到该事件」时主动触发（如点击按钮时补发 `input`）。
   * @throws 同一元素重复登记时抛错（同一元素不允许登记到多个控制器）。
   */
  add(
    e: HTMLElement,
    option: TOption | ((element: HTMLElement) => Awaitable<TOption>),
  ): PopoverEventSender<TEvents> {
    const registered = PopoverController.registeredTypes.get(e);
    if (registered !== undefined) {
      throw new Error(`元素已绑定弹出框事件（${registered}）。`);
    }
    PopoverController.registeredTypes.set(e, this.type);
    if (option instanceof Function) {
      this.lazyOptionMap.set(e, option);
    } else {
      this.optionMap.set(e, option);
    }
    return (eventName, event) => {
      const resolved = this.optionMap.get(e);
      if (resolved !== undefined) {
        const handler = this.app.inputEvents[eventName];
        if (typeof handler === "function") {
          handler(event ?? new Event(String(eventName)));
        }
      }
    };
  }

  /** 摘掉本控制器注册的所有 `window` 监听（组件本身不销毁） */
  abort() {
    this.ac.abort();
  }
}
