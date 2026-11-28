import { ref, type Ref, type ShallowRef } from "vue";
import { ensureArray } from "../../CollectionUtils";

export function useMenuList<T>(opts: {
  items: ShallowRef<T[]>;
  selectable?: Ref<boolean>;
  listRef: Readonly<ShallowRef<HTMLElement | null>>;
  updateItems?: (e: Event) => void;
  onOptionClick?: (option: T) => void;
  acceptKeys?: Arrayable<string>;
}) {
  /**
   * 按下标取候选项的 DOM 节点（模板用 `data-index` 标注）。
   */
  function getOptionNode(index: number) {
    return $(listRef.value!).find(`[data-index=${index}]`);
  }

  /** 把当前选中项滚动进可视区域（键盘上下移动后调用） */
  function scrollToSelectedNode() {
    getOptionNode(selected.value).get(0).scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  /** 当前选中项的 DOM 节点（Tab / Enter 前用它判断「确有可采纳的选中项」） */
  function getSelectedOptionNode() {
    return getOptionNode(selected.value);
  }

  const { items, updateItems, onOptionClick, listRef } = opts;
  const selectable = opts.selectable ?? ref(true);
  const acceptKeys = opts.acceptKeys ?? "Enter";

  const selected = ref(-1);
  return {
    /** 当前高亮项下标（-1 表示未选中） */
    selected,
    /** 指针悬停某项：直接把它设为选中项（与键盘操作共享同一个 `selected`） */
    onMenuPointermove: (index: number) => {
      selected.value = index;
    },
    /**
     * 按下这些键时先拦下默认行为（真正消费发生在 `onMenuKeyup`），
     * 避免光标在输入框内上下跳动、Tab 切走焦点、回车提前提交表单。
     */
    onMenuKeydown: (e: Event) => {
      if (
        e instanceof KeyboardEvent &&
        selectable.value &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab" || e.key === "Enter")
      ) {
        e.preventDefault();
      }
    },
    /**
     * 键盘操作（列表可见时）：
     * - ↑ / ↓ 循环移动选中项，并把它滚动进可视区域；
     * - `acceptKeys` 定义选择键；
     * - 其余按键交回 `updateItems` 同步值与选区。
     */
    onMenuKeyup: (e: Event) => {
      if (!(e instanceof KeyboardEvent)) {
        return;
      }
      if (items.value.length === 0) {
        return;
      }
      if (selectable.value && e.key === "ArrowUp") {
        if (selected.value === -1) {
          selected.value = items.value.length - 1;
        } else {
          selected.value--;
          if (selected.value < 0) {
            selected.value = items.value.length - 1;
          }
        }
        scrollToSelectedNode();
      } else if (selectable.value && e.key === "ArrowDown") {
        if (selected.value === -1) {
          selected.value = 0;
        } else {
          selected.value++;
          if (selected.value >= items.value.length) {
            selected.value = 0;
          }
        }
        scrollToSelectedNode();
      } else if (selectable.value && ensureArray(acceptKeys).includes(e.key)) {
        const node = getSelectedOptionNode();
        if (node.length) {
          e.preventDefault();
          onOptionClick?.(items.value[selected.value]);
        }
      } else {
        updateItems?.(e);
      }
    },
  };
}
