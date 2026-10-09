import { createApp } from "vue";
import InputList from "../vue/components/InputList.vue";
import { Utils } from "../Utils.ts";
import AttitudePicker from "../vue/components/attitude/AttitudePicker.vue";
import type { ComponentExposed } from "vue-component-type-helpers";

/**
 * 候选列表（`InputList` 组件）的全局控制器——**全站只有一个实例**（`instance` 单例）。
 *
 * # 为什么要它
 * 候选列表要挂在各种宿主 DOM 上：百科原生表单里的 textarea、UEditor 里的备注框、乃至显示成
 * 按钮的下拉菜单。它们既不是 Vue 组件树的一部分，也没有统一的挂载点，因此由本控制器：
 * 1. 在 `document.body` 下建一个容器，把 `InputList` 挂一次（列表本体）；
 * 2. 在 `window` 上以**捕获阶段**监听 `focus` 与输入框的各类事件，命中已登记的元素时
 *    调组件的 `setOption` 切换服务对象，或把事件转交给组件的 `inputEvents` 处理函数。
 *
 * # 交互元素 ≠ 输入元素
 * `add` 的第一个参数是**交互元素**（被登记、被监听的那个节点）。绝大多数场景它同时也是输入元素；
 * 但也可以通过 `option.inputListBindElement` 另行指定**输入元素**——此时交互元素只负责
 * 「什么时候该弹列表」，文本读写全部发生在输入元素上（见 `DropdownMenuInput.vue`）。
 * 注意事件监听在 `window` 上，判断用的是 `e.composedPath()[0]`，即**实际被命中的最深元素**，
 * 因此挂 `inputListBindElement` 时，登记的必须是那个真正会收到 focus 的节点。
 *
 * # 事件委派的过滤器
 * 转发来的 `focus` / `keydown` 等事件只对「INPUT / TEXTAREA 且已登记」生效（见构造函数里的循环），
 * 所以宿主可以放心把同一批监听同时用于其它元素。
 */
export class PopoverController {
  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: PopoverController | undefined;

  /** 统一的中止信号：`abort()` 一次即摘掉本控制器注册的所有 `window` 监听 */
  private readonly ac = new AbortController();
  /** 捕获阶段监听的公共选项（捕获是为了在事件到达目标前就拦截到，`focus` 不冒泡） */
  private readonly opt = {
    capture: true,
    signal: this.ac.signal,
  };

  /** 挂载在 `body` 下的候选列表组件实例（`createApp(...).mount` 的返回值即组件的 exposed） */
  private readonly inputListApp;
  private readonly attitudePickerApp;
  /** 已登记的「交互元素 → 选项」映射（用 WeakMap，元素被移除后自动失效） */
  private readonly optionMap = new WeakMap<HTMLElement, PopoverOption>();
  /** 已登记的「交互元素 → 选项」懒映射，交互元素触发事件时才异步加载，加载完成后从此中移出，并将结果存回 {@link optionMap} */
  private readonly lazyOptionMap = new WeakMap<
    HTMLElement,
    (element: HTMLElement) => Awaitable<PopoverOption>
  >();
  /** 正在异步计算懒映射的交互元素，此过程中该交互元素无法重复触发事件，计算完成后将交互元素移出 */
  private readonly pendingOptionMap = new WeakSet<HTMLElement>();

  private activeType: PopoverOption["type"] | null = null;
  // private activeElement: HTMLElement | null = null;
  private get activeApp() {
    return this.activeType !== null ? this.typeMap[this.activeType] : null;
  }

  private visibilityLock = false;

  private readonly typeMap;

  constructor() {
    const body = document.body;
    const container = $('<div class="mcmodder-input-container">').appendTo(body);
    this.inputListApp = createApp(InputList).mount(container.get(0)) as ComponentExposed<
      typeof InputList
    >;
    this.attitudePickerApp = createApp(AttitudePicker).mount(container.get(0)) as ComponentExposed<
      typeof AttitudePicker
    >;
    this.typeMap = {
      inputList: this.inputListApp,
      attitudePicker: this.attitudePickerApp,
    } as const;

    // 任何已登记元素获得焦点 → 切换候选列表的当前服务对象
    window.addEventListener(
      "focus",
      async (e) => {
        const target = e.composedPath()[0] as HTMLElement;
        if (this.pendingOptionMap.has(target)) {
          return;
        }
        let option = this.optionMap.get(target) ?? this.lazyOptionMap.get(target);
        if (option !== undefined) {
          // 防止 focus 和 click 事件冲突
          this.visibilityLock = true;
          setTimeout(() => {
            this.visibilityLock = false;
          }, 100);

          if (option instanceof Function) {
            this.pendingOptionMap.add(target);
            option = await option(target);
            this.pendingOptionMap.delete(target);
            this.lazyOptionMap.delete(target);
            this.optionMap.set(target, option);
          }
          this.activeType = option.type;
          // this.activeElement = target;
          if (option.type === "inputList") {
            // 交互元素与输入元素可以不同：缺省时就是登记的这个元素本身
            const bindElement = option.inputListBindElement ?? (target as InputListBindElement);
            this.inputListApp.setOption({
              inputNode: bindElement,
              ...option,
            });
          } else if (option.type === "attitudePicker") {
            this.attitudePickerApp.setOption({
              ...option,
            });
          }
        }
      },
      this.opt,
    );

    // 页面滚动时重新量锚点位置（列表是 fixed 定位，需跟随输入框）
    window.addEventListener(
      "scroll",
      Utils.animationThrottle(() => {
        this.inputListApp.updatePos();
        this.attitudePickerApp.updatePos();
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
        this.inputListApp.updatePos();
      }),
      {
        passive: true,
        ...this.opt,
      },
    );

    window.addEventListener(
      "click",
      (e) => {
        if (this.visibilityLock) {
          return;
        }
        const inPopover = e
          .composedPath()
          .some((e) => e instanceof HTMLElement && e.classList.contains("mcmodder-popover"));
        if (!inPopover) {
          this.activeApp?.close();
        }
      },
      {
        passive: true,
        ...this.opt,
      },
    );

    // 把组件的 inputEvents 转发到 window
    for (const [type, app] of Object.entries(this.typeMap)) {
      for (const [eventName, event] of Object.entries(app.inputEvents)) {
        window.addEventListener(
          eventName,
          (e) => {
            const target = e.composedPath()[0] as HTMLElement;
            if (this.optionMap.get(target)?.type === type) {
              event(e);
            }
          },
          this.opt,
        );
      }
    }

    PopoverController.m_instance = this;
  }

  /** 懒加载单例（首次访问时构造） */
  static get instance() {
    if (this.m_instance === undefined) {
      this.m_instance = new PopoverController();
    }
    return this.m_instance;
  }

  /**
   * 给一个元素登记候选列表选项。
   *
   * @param e **交互元素**：被监听 focus / 键盘 / 输入事件的那个节点。
   * @param option 行为选项；其中 `inputListBindElement` 可另行指定**输入元素**（缺省即 `e` 本身），
   *               `anchorElement` 可把列表定位到别的锚点上。
   * @returns 一个手动派发事件的函数——用于「交互元素收不到该事件」时主动触发（如点击按钮时补发 `input`），
   *          第二个参数为要传递的事件对象，缺省时按事件名构造一个空的 `Event`。
   * @throws 同一元素重复登记时抛错（`optionMap` 的键不能重复）。
   */
  addInputList(
    e: HTMLElement,
    option:
      | (PopoverOption & { type: "inputList" })
      | ((element: HTMLElement) => Awaitable<PopoverOption & { type: "inputList" }>),
  ) {
    if (this.optionMap.has(e) || this.lazyOptionMap.has(e)) {
      throw new Error("元素已绑定弹出框事件。");
    }
    if (option instanceof Function) {
      this.lazyOptionMap.set(e, option);
    } else {
      this.optionMap.set(e, option);
    }
    return (eventName: keyof ComponentExposed<typeof InputList>["inputEvents"], event?: Event) => {
      const option = this.optionMap.get(e);
      if (option !== undefined) {
        const events = this.typeMap["inputList"].inputEvents;
        events[eventName](event ?? new Event(eventName));
      }
    };
  }

  addAttitudePicker(
    e: HTMLElement,
    option:
      | (PopoverOption & { type: "attitudePicker" })
      | ((element: HTMLElement) => Awaitable<PopoverOption & { type: "attitudePicker" }>),
  ) {
    if (this.optionMap.has(e) || this.lazyOptionMap.has(e)) {
      throw new Error("元素已绑定弹出框事件。");
    }
    if (option instanceof Function) {
      this.lazyOptionMap.set(e, option);
    } else {
      this.optionMap.set(e, option);
    }
    return (
      eventName: keyof ComponentExposed<typeof AttitudePicker>["inputEvents"],
      event?: Event,
    ) => {
      const option = this.optionMap.get(e);
      if (option !== undefined) {
        const events = this.typeMap["attitudePicker"].inputEvents;
        events[eventName](event ?? new Event(eventName));
      }
    };
  }

  /** 摘掉本控制器注册的所有 `window` 监听（组件本身不销毁） */
  abort() {
    this.ac.abort();
  }
}
