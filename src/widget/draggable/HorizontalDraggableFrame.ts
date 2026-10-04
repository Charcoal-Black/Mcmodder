import type { ConfigRepository } from "../../config/ConfigRepository";
import { Utils } from "../../Utils";

/**
 * 分屏框的可调参数（构造时传入，全部可选，缺省值见各字段说明）。
 *
 * 这些值都是 **0~1 的比例**（相对 `parent` 的宽度），而非像素。
 */
interface HorizontalDraggableFrameConfig {
  /**
   * 「初始位置」：双击分隔条时回到的位置，同时也是没有历史记录时的兜底位置。
   * @default 0.5（正中）
   */
  initPos?: number;
  /**
   * 左侧折叠阈值：分隔条位置 ≤ 该值时，左侧面板被完全收起（隐藏）。
   * @default 0.25
   */
  leftCollapseThreshold?: number;
  /**
   * 右侧折叠阈值：分隔条位置 ≥ 该值时，右侧面板被完全收起（隐藏）。
   * @default 0.75
   */
  rightCollapseThreshold?: number;
  /**
   * 拖动下界：分隔条位置被硬性钳制，不会小于该值。
   * @default 0（可一路拖到最左）
   */
  leftDraggableLimit?: number;
  /**
   * 拖动上界：分隔条位置被硬性钳制，不会大于该值。
   * @default 1（可一路拖到最右）
   */
  rightDraggableLimit?: number;
}

/**
 * 可左右拖动的分屏框：在 `parent` 内插入一条竖向分隔条，拖动 / 键盘 / 双击即可调整左右两块
 * 区域的分界位置，被收起的面板自动隐藏。
 *
 * # 位置模型
 * 对外统一用 **比例**（0~1，相对父容器宽度）表示分隔条位置，内部记在 `horizontalPos`，
 * 渲染时写成 `left: pos * 100 + "%"`。仅在拖动过程中需要像素值（见 `originalPos`）。
 *
 * # 两组界限的区别
 * - **拖动界限** `leftDraggableLimit` / `rightDraggableLimit` —— 硬性钳制，决定分隔条**能拖到哪**；
 * - **折叠阈值** `leftCollapseThreshold` / `rightCollapseThreshold` —— 决定面板**什么时候收起**。
 * 二者相互独立，典型用法是「允许拖到 0.3，但拖到 0.3 以下时左面板就整块消失」（见 `TabEditInit`）。
 * 当某个面板被收起到极限位置（位置触到拖动界限）时，称整个分屏处于「折叠」状态（`isCollapsed`）。
 *
 * # 交互方式
 * - 拖动（`pointerdown`/`pointermove`/`pointerup`）调整位置，位置按**指针位移**相对移动，不会跳到指针下；
 * - 方向键 ←/→ 每次微调 10px，且被限制在折叠阈值内侧，不会误把面板拖到收起状态；
 * - 双击在「初始位置」与「上次位置」之间来回切换；
 * - 分隔条带 `role="separator"` 与 `aria-value*` 属性，可用 Tab 聚焦、由读屏软件播报。
 *
 * # 位置记忆
 * 拖动结束且未处于折叠状态时，位置会以 `id` 为键写入配置 `preferredDragPos`，
 * 之后双击分隔条或调用 `expandIfCollapsed` 时恢复。
 *
 * @example
 * ```ts
 * // 管理端审核页：右侧审核窗默认收起，点开待审项时再展开
 * this.verifyWindowDivider = new HorizontalDraggableFrame("verifyWindowDivider", this.configs, {}, connectedFrame)
 *   .setHorizontalPos(1)
 *   .bindRight(this.verifyContainer, true);
 * ```
 */
export class HorizontalDraggableFrame {
  /** 分屏框的标识，同时作为 `preferredDragPos` 中记录位置的键 */
  private readonly id: string;
  /** 父容器，分隔条与两侧面板的定位与宽度都以它为基准 */
  private readonly parent: HTMLElement;
  /** 配置仓库，用于读写 `preferredDragPos`（位置记忆） */
  private readonly configs: ConfigRepository;
  /** 分隔条本体（原生 DOM） */
  readonly instance: HTMLElement;
  /** 分隔条的 jQuery 包装，样式与属性操作都走它 */
  readonly $instance: JQuery;
  /** 是否正处于拖动过程中（`pointerdown` 与 `pointerup` 之间为 true） */
  private dragging: boolean;
  /** 拖动起点：按下时指针相对父容器左边缘的位置（px），用作位移计算的基准 */
  private dragStartPos: number;
  /** 拖动过程中：指针相对父容器左边缘的位置（px） */
  private dragPos: number;
  /** 初始位置（比例），双击复位用 */
  private readonly initPos: number;
  /**
   * 分隔条当前左边缘的像素值（从 CSS `left` 读回）。
   * 拖动时以它为基准叠加指针位移，从而实现「按住哪拖哪、不会跳位」。
   *
   * @warning 该值经 `parseInt(this.$instance.css("left"))` 反读，若父容器已有 `padding`，
   * 或分隔条处于 `display: none` 等导致 `left` 解析为 `auto` 的状态，读回的是**包含父容器
   * padding 的绝对坐标**乃至 `NaN`（`parseInt("auto")`）。本类依赖调用方传入的 `parent`
   * 是干净的定位上下文，实际使用（`TabEditInit`/`AdminInit`）暂未触发该问题。
   */
  private originalPos: number;
  /** 绑定的左侧面板，尚未绑定时为 null */
  private leftBindNode: JQuery | null;
  /** 绑定的右侧面板，尚未绑定时为 null */
  private rightBindNode: JQuery | null;
  /** 左侧折叠阈值：位置 ≤ 此值时隐藏左面板 */
  private readonly leftCollapseThreshold: number;
  /** 右侧折叠阈值：位置 ≥ 此值时隐藏右面板 */
  private readonly rightCollapseThreshold: number;
  /** 拖动下界（比例） */
  private readonly leftDraggableLimit: number;
  /** 拖动上界（比例） */
  private readonly rightDraggableLimit: number;
  /** 分隔条当前位置（0~1 比例） */
  private horizontalPos: number;

  /**
   * @param id 分屏框标识，用于记忆拖动位置。
   * @param configs 配置仓库，用于持久化 `preferredDragPos`。
   * @param attr 附加到分隔条上的任意 HTML 属性。
   * @param parent 父容器；会被强制设为 `position: relative` 以便分隔条绝对定位。
   * @param config 分屏行为参数，见 {@link HorizontalDraggableFrameConfig}。
   */
  constructor(
    id: string,
    configs: ConfigRepository,
    attr: Record<string, string> = {},
    parent: HTMLElement = document.body,
    config: HorizontalDraggableFrameConfig = {},
  ) {
    this.id = id;
    this.configs = configs;
    this.$instance = $("<div>")
      .attr({
        tabindex: 0,
        role: "separator",
        orientation: "horizontal",
        "aria-label": id,
      })
      .appendTo(parent);
    this.instance = this.$instance.get(0) as HTMLElement;
    if (typeof attr === "object") Object.keys(attr).forEach((e) => this.$instance.attr(e, attr[e]));
    this.$instance.addClass("mcmodder-horizontal-divider");
    this.parent = parent;
    $(this.parent).css("position", "relative");
    this.dragging = false;
    this.dragStartPos = this.dragPos = 0;
    this.initPos = config.initPos ?? 0.5;
    this.horizontalPos = 0;
    this.setHorizontalPosOnDrag(this.initPos);
    this.originalPos = parseInt(this.$instance.css("left"));
    this.leftBindNode = this.rightBindNode = null;
    this.leftCollapseThreshold = config.leftCollapseThreshold ?? 0.25;
    this.rightCollapseThreshold = config.rightCollapseThreshold ?? 0.75;
    this.leftDraggableLimit = config.leftDraggableLimit ?? 0;
    this.rightDraggableLimit = config.rightDraggableLimit ?? 1;
    this.$instance.attr({
      "aria-valuemin": Math.round(
        Math.max(this.leftCollapseThreshold, this.leftDraggableLimit) * 100,
      ),
      "aria-valuemax": Math.round(
        Math.min(this.rightCollapseThreshold, this.rightDraggableLimit) * 100,
      ),
    });
    this.instance.addEventListener("pointerdown", (ev) =>
      this.onInstancePointerdown(ev as PointerEvent),
    );
    this.instance.addEventListener("pointermove", (ev) =>
      this.onInstancePointermove(ev as PointerEvent),
    );
    this.instance.addEventListener("pointerup", (ev) =>
      this.onInstancePointerup(ev as PointerEvent),
    );
    this.instance.addEventListener("pointercancel", (ev) =>
      this.onInstancePointerup(ev as PointerEvent),
    );
    this.instance.addEventListener("dblclick", () => this.onInstanceDblclick());
    this.instance.addEventListener("keydown", (ev) => this.onInstanceKeydown(ev as KeyboardEvent));
  }

  /**
   * 按下：进入拖动状态，并记下指针相对父容器左边缘的起始位置。
   * 同时捕获指针，使指针移出分隔条范围后仍能继续收到 move/up 事件。
   */
  private onInstancePointerdown(e: PointerEvent) {
    this.dragging = true;
    this.dragStartPos = e.screenX - this.parent.getBoundingClientRect().left;
    if (!this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.setPointerCapture(e.pointerId);
    }
  }

  /**
   * 拖动中：按**指针位移量**（而非指针绝对位置）更新分隔条，保证拖动过程与鼠标/手指不脱节。
   * 位置先按拖动界限钳制，再在到达折叠阈值时吸附到 0 / 1 收起对应面板。
   *
   * @warning 疑似冗余：首次 {@link setHorizontalPosByWidthOnDrag} 的返回值并未被使用，
   * 紧接着又用位移量算出 `r` 覆盖了 `horizontalPos`，故这行实际只起到「提前钳制像素位置」的副作用，
   * 大概率是历史遗留。若删除需留意二者对 `originalPos` 的处理差异（后者不刷新基准）。
   */
  private onInstancePointermove(e: PointerEvent) {
    if (!this.dragging) return;
    e.preventDefault();
    this.dragPos = e.screenX - this.parent.getBoundingClientRect().left;
    this.setHorizontalPosByWidthOnDrag(this.dragPos);
    let r = (this.originalPos - this.dragStartPos + this.dragPos) / this.getParentWidth();
    if (r <= this.leftCollapseThreshold) r = 0;
    else if (r >= this.rightCollapseThreshold) r = 1;
    this.setHorizontalPosOnDrag(r);
  }

  /**
   * 松开：结束拖动，重新记录基准位置；若此时未处于折叠状态，把位置写入配置作为「上次位置」。
   */
  private onInstancePointerup(e: PointerEvent) {
    if (!this.dragging) return;
    this.dragging = false;
    this.originalPos = parseInt(this.$instance.css("left"));
    if (this.instance.hasPointerCapture(e.pointerId)) {
      this.instance.releasePointerCapture(e.pointerId);
      if (!this.isCollapsed()) {
        const preferredDragPos = this.configs.getSettings("preferredDragPos") ?? {};
        preferredDragPos[this.id] = this.horizontalPos;
        this.configs.setSettings("preferredDragPos", preferredDragPos);
      }
    }
  }

  /**
   * 双击：在「初始位置」与「上次位置」之间来回切换；
   * 两者相差不到 0.025（约 2.5%）时视为同一位置，直接回弹到上次位置。
   */
  private onInstanceDblclick() {
    if (Math.abs(this.horizontalPos - this.initPos) < 0.025) {
      this.setHorizontalPos(this.getPreferredDragPos());
    } else {
      this.setHorizontalPos(this.initPos);
    }
  }

  /**
   * 键盘操作：←/→ 每次移动 10px，并始终停在折叠阈值内侧 1px 处，
   * 避免用键盘把面板拖到收起状态；Esc 放弃焦点。
   */
  private onInstanceKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const width = this.getWidth();
      const leftCollapseThresholdWidth = this.getWidth(this.leftCollapseThreshold);
      this.setHorizontalPosByWidth(Math.max(width - 10, leftCollapseThresholdWidth + 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const width = this.getWidth();
      const rightCollapseThresholdWidth = this.getWidth(this.rightCollapseThreshold);
      this.setHorizontalPosByWidth(Math.min(width + 10, rightCollapseThresholdWidth - 1));
    } else if (e.key === "Escape") {
      this.$instance.blur();
    }
  }

  /** 比例 → 像素宽度（相对父容器宽度） */
  private getWidth(pos = this.horizontalPos) {
    return pos * this.getParentWidth();
  }

  /** 像素位置 → 比例位置，仅在拖动过程中调用（不刷新拖动基准） */
  private setHorizontalPosByWidthOnDrag(pos: number) {
    return this.setHorizontalPosOnDrag(pos / this.getParentWidth());
  }

  /** 像素位置 → 比例位置，并在设置后刷新拖动基准 `originalPos`（键盘微调时使用） */
  private setHorizontalPosByWidth(pos: number) {
    this.setHorizontalPosByWidthOnDrag(pos);
    this.originalPos = parseInt(this.$instance.css("left"));
    return this;
  }

  /**
   * 设置分隔条位置并同步两侧面板 —— 本类的**核心渲染方法**，所有改动位置的操作最终都走这里。
   *
   * 依次完成：
   * 1. 按拖动界限钳制位置，并写入 `horizontalPos` 与分隔条的 `left`；
   * 2. 按分隔条的实际位置反算两侧面板宽度（百分比），并在越过折叠阈值时隐藏对应面板；
   * 3. 更新 `aria-valuenow`：该值额外被钳制在两个折叠阈值之间，
   *    即读屏播报的是「面板未收起时可见范围」内的位置，而非可能已收起的极端值。
   *
   * @param pos 期望位置（0~1 比例）。
   * @returns `this`，便于链式调用。
   */
  private setHorizontalPosOnDrag(pos: number) {
    pos = Utils.clamp(pos, this.leftDraggableLimit, this.rightDraggableLimit);
    this.horizontalPos = pos;
    this.$instance.css("left", pos * 100 + "%");
    if (this.leftBindNode) {
      this.leftBindNode.css("width", (this.getLeftWidth() / this.getParentWidth()) * 100 + "%");
      if (this.horizontalPos <= this.leftCollapseThreshold) this.leftBindNode.hide();
      else this.leftBindNode.show();
    }
    if (this.rightBindNode) {
      this.rightBindNode.css("width", (this.getRightWidth() / this.getParentWidth()) * 100 + "%");
      if (this.horizontalPos >= this.rightCollapseThreshold) this.rightBindNode.hide();
      else this.rightBindNode.show();
    }
    this.$instance.attr(
      "aria-valuenow",
      Math.round(
        Utils.clamp(this.horizontalPos, this.leftCollapseThreshold, this.rightCollapseThreshold) *
          100,
      ),
    );
    return this;
  }

  /**
   * 以编程方式设置分隔条位置，并刷新拖动基准。
   *
   * @param pos 目标位置（0~1 比例，内部仍会按拖动界限钳制）。
   * @returns `this`，便于链式调用。
   * @warning 内部反读像素值时依赖 `parseInt(css("left"))`，见 {@link originalPos} 的说明。
   */
  setHorizontalPos(pos: number) {
    this.setHorizontalPosOnDrag(pos);
    this.originalPos = parseInt(this.$instance.css("left"));
    return this;
  }

  /**
   * 按当前 `horizontalPos` 重新走一遍布局（重算两侧面板宽度、显隐与 aria 值）。
   * 父容器尺寸变化后需调用，否则面板宽度不会跟随。
   *
   * @returns `this`，便于链式调用。
   */
  updateHorizontalPos() {
    return this.setHorizontalPosOnDrag(this.horizontalPos);
  }

  /** 父容器宽度（px） */
  private getParentWidth() {
    return this.parent.getBoundingClientRect().width;
  }

  // private getSelfWidth() {
  //   return this.instance.getBoundingClientRect().width;
  // }

  /** 左侧面板宽度（px）：分隔条左边缘到父容器左边缘的距离 */
  private getLeftWidth() {
    return this.instance.getBoundingClientRect().left - this.parent.getBoundingClientRect().left;
  }

  /** 右侧面板宽度（px）：父容器右边缘到分隔条右边缘的距离 */
  private getRightWidth() {
    return this.parent.getBoundingClientRect().right - this.instance.getBoundingClientRect().right;
  }

  /**
   * 绑定左侧面板：把节点插到分隔条之前，套上分屏布局样式并按当前位置刷新一次宽度。
   *
   * @param node 左侧面板的 jQuery 节点。
   * @param isAbsolute 是否绝对定位。绝对定位时面板浮在内容之上、可用阴影与裁剪做出悬浮层效果，
   * 适合「覆盖式」面板（如审核窗）；否则与分隔条一起参与常规文档流。
   * @returns `this`，便于链式调用。
   */
  bindLeft(node: JQuery, isAbsolute = false) {
    this.leftBindNode = node;
    this.leftBindNode.insertBefore(this.instance);
    node
      .addClass(
        "mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""),
      )
      .addClass("mcmodder-horizontal-flex-left");
    return this.updateHorizontalPos();
  }

  /**
   * 绑定右侧面板。与 {@link bindLeft} 对称，**默认绝对定位**
   * （右侧面板通常作为浮层覆盖在主内容之上）。
   *
   * @param node 右侧面板的 jQuery 节点。
   * @param isAbsolute 是否绝对定位，默认 `true`。
   * @returns `this`，便于链式调用。
   */
  bindRight(node: JQuery, isAbsolute = true) {
    this.rightBindNode = node;
    this.rightBindNode.insertBefore(this.instance);
    node
      .addClass(
        "mcmodder-horizontal-flex" + (isAbsolute ? " mcmodder-horizontal-flex-absolute" : ""),
      )
      .addClass("mcmodder-horizontal-flex-right");
    return this.updateHorizontalPos();
  }

  /** 读取记忆中的「上次位置」；没有记录时回退到初始位置 */
  private getPreferredDragPos() {
    return this.configs.getSettings("preferredDragPos")?.[this.id] ?? this.initPos;
  }

  /**
   * 当前是否处于折叠状态：分隔条已被拖到任一拖动界限，左侧或右侧面板完全收起。
   * 注意判定用的是**拖动界限**而非折叠阈值。
   */
  isCollapsed() {
    return (
      this.horizontalPos <= this.leftDraggableLimit ||
      this.horizontalPos >= this.rightDraggableLimit
    );
  }

  /**
   * 若当前处于折叠状态，则展开到上次拖动的位置。
   * 用于「折叠状态下需要临时露出面板」的场景（如管理端点开某个待审项时展开审核窗）。
   *
   * @returns `this`，便于链式调用。
   */
  expandIfCollapsed() {
    if (this.isCollapsed()) {
      this.setHorizontalPos(this.getPreferredDragPos());
    }
    return this;
  }
}
