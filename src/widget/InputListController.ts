import { createApp } from "vue";
import InputList from "../vue/components/InputList.vue";
import { Utils } from "../Utils.ts";

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
export class InputListController {
  /** 单例（`instance` 访问时懒创建） */
  private static m_instance: InputListController | undefined;

  /** 统一的中止信号：`abort()` 一次即摘掉本控制器注册的所有 `window` 监听 */
  private readonly ac = new AbortController();
  /** 捕获阶段监听的公共选项（捕获是为了在事件到达目标前就拦截到，`focus` 不冒泡） */
  private readonly opt = {
    capture: true,
    signal: this.ac.signal,
  };

  /** 挂载在 `body` 下的候选列表组件实例（`createApp(...).mount` 的返回值即组件的 exposed） */
  private readonly app;
  /** 已登记的「交互元素 → 选项」映射（用 WeakMap，元素被移除后自动失效） */
  private readonly optionMap = new WeakMap<HTMLElement, InputListOption>();

  constructor() {
    const body = document.body;
    const container = $('<div class="mcmodder-input-container">').appendTo(body);
    this.app = createApp(InputList).mount(container.get(0)) as InstanceType<typeof InputList>;

    // 任何已登记元素获得焦点 → 切换候选列表的当前服务对象
    window.addEventListener(
      "focus",
      (e) => {
        const target = e.composedPath()[0] as HTMLElement;
        const option = this.optionMap.get(target);
        if (option) {
          // 交互元素与输入元素可以不同：缺省时就是登记的这个元素本身
          const bindElement = option.inputListBindElement ?? (target as InputListBindElement);
          this.app.setOption({
            inputNode: bindElement,
            ...option,
          });
        }
      },
      this.opt,
    );

    // 页面滚动时重新量锚点位置（列表是 fixed 定位，需跟随输入框）
    window.addEventListener(
      "scroll",
      Utils.animationThrottle(() => {
        this.app.updatePos();
      }),
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

    // 把组件的 inputEvents 转发到 window：仅对「命中已登记的 INPUT / TEXTAREA」生效
    for (const [key, event] of Object.entries(this.app.inputEvents)) {
      window.addEventListener(
        key,
        (e) => {
          const target = e.composedPath()[0] as InputListBindElement;
          if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
            return;
          }
          if (this.optionMap.has(target)) {
            event(e);
          }
        },
        this.opt,
      );
    }

    InputListController.m_instance = this;
  }

  /** 懒加载单例（首次访问时构造） */
  static get instance() {
    if (this.m_instance === undefined) {
      this.m_instance = new InputListController();
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
  add(e: HTMLElement, option: InputListOption) {
    if (this.optionMap.has(e)) {
      throw new Error("元素已绑定下拉菜单事件。");
    }
    this.optionMap.set(e, option);
    return (eventName: keyof typeof this.app.inputEvents, event?: Event) => {
      this.app.inputEvents[eventName](event ?? new Event(eventName));
    };
  }

  /** 摘掉本控制器注册的所有 `window` 监听（组件本身不销毁） */
  abort() {
    this.ac.abort();
  }
}
