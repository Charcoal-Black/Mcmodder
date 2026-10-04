import { onMounted, shallowRef, type ShallowRef } from "vue";
import { Utils } from "../../Utils";

/**
 * 各 `input/*` 组件共用的「取值 → 校验 → 提交」底座：把「值」与「DOM」之间的一层样板抽出来。
 *
 * 默认行为是**以内存中的 `valueRef` 为准**（`getDOMValue` 直接返回它），适用于选项式输入
 * （下拉、复选等 DOM 里没有自由文本的控件）；需要真实文本输入的组件（如 `TextInput`）传入
 * `getDOMValue` / `setDOMValue` 改为与某个 `inputRef` 同步。
 *
 * @param opts.inputRef 承载输入的元素；`getInstance` 返回它，`onMounted` 时用它做首次显示同步。
 * @param opts.value 初始值（写入 `valueRef`）。
 * @param opts.validate 校验函数：返回 `isok` 为假时用 `msg` 提示并回填旧值；缺省时仅判断「值是否变化」。
 * @param opts.getDOMValue 从 DOM 读取待校验值；缺省直接返回 `valueRef.value`。
 * @param opts.setDOMValue 把值写回 DOM；缺省则不做任何回填（此时校验失败只会提示）。
 * @param opts.onSuccessfulChange 校验通过后的回调（`props.onSuccessfulChange`）。
 */
export function useInputBase<T>(opts: {
  inputRef: Readonly<ShallowRef<HTMLElement | null>>;
  value: T;
  validate?: (newValue: T) => InputValidInfo<T>;
  getDOMValue?: () => T;
  setDOMValue?: (value: T) => void;
  onSuccessfulChange?: InputSuccessfulChangeCallBack<T>;
}) {
  const valueRef = shallowRef<T>(opts.value);

  const validate =
    opts.validate ??
    ((newValue) => {
      return {
        isok: valueRef.value != newValue,
        final: newValue,
      } as InputValidInfo<T>;
    });

  const getDOMValue =
    opts.getDOMValue ??
    (() => {
      return valueRef.value;
    });

  /** DOM 上的值发生变化后的统一入口（`@change` 绑定到 `inputRef`）：取值 → 校验 → 提交或回滚 */
  function onChange() {
    const value = getDOMValue();
    const resp = validate(value);
    if (resp.isok) {
      valueRef.value = resp.final!;
      opts.onSuccessfulChange?.(resp);
    } else {
      if (resp.msg) {
        Utils.commonMsg(resp.msg, false);
      }
      opts.setDOMValue?.(valueRef.value);
    }
  }

  /** 对外暴露的输入元素（供需要拿到真实 DOM 的场景，如登记候选项） */
  function getInstance() {
    return opts.inputRef.value!;
  }

  /** 取当前值（内存态） */
  function getValue(): T {
    return valueRef.value;
  }

  /** 改值：先写回 DOM（保持 DOM 与内存同步）再走一遍校验流程 */
  function setCurrentValue(newValue: T) {
    setDisplayValue(newValue);
    onChange();
  }

  /** 只改 DOM 显示，不做校验、不触发回调 */
  function setDisplayValue(newValue: T) {
    opts.setDOMValue?.(newValue);
  }

  // 挂载时把 props 的初始值同步到 DOM
  onMounted(() => {
    setDisplayValue(opts.value);
  });

  return {
    valueRef,
    onChange,
    getInstance,
    getValue,
    setCurrentValue,
    setDisplayValue,
  };
}
