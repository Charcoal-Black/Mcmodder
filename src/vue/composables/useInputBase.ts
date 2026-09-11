import { nextTick, shallowRef, ShallowRef } from "vue";
import { InputSuccessfulChangeCallBack, InputValidInfo } from "../../types";
import { McmodderUtils } from "../../Utils";

export function useInputBase<T>(opts: {
  inputRef: Readonly<ShallowRef<HTMLElement | null>>,
  value: T,
  validate?: (newValue: T) => InputValidInfo<T>,
  getDOMValue?: () => T,
  setDOMValue?: (value: T) => void,
  onSuccessfulChange: InputSuccessfulChangeCallBack<T>
}) {
  const valueRef = shallowRef<T>(opts.value);

  const validate = opts.validate ?? (newValue => {
    return {
      isok: valueRef.value != newValue,
      final: newValue
    } as InputValidInfo<T>
  });

  const getDOMValue = opts.getDOMValue ?? (() => {
    return valueRef.value;
  });

  function onChange() {
    const value = getDOMValue();
    const resp = validate(value);
    if (resp.isok) {
      valueRef.value = resp.final!;
      opts.onSuccessfulChange(resp);
    }
    else {
      if (resp.msg) {
        McmodderUtils.commonMsg(resp.msg, false);
      }
      opts.setDOMValue?.(valueRef.value);
    }
  }

  function getInstance() {
    return opts.inputRef.value!;
  }

  function getValue(): T {
    return valueRef.value;
  }

  function setCurrentValue(newValue: T) {
    setDisplayValue(newValue);
    onChange();
  }

  function setDisplayValue(newValue: T) {
    opts.setDOMValue?.(newValue);
  }

  nextTick(() => {
    setDisplayValue(opts.value);
  });

  return {
    valueRef,
    onChange,
    getInstance,
    getValue,
    setCurrentValue,
    setDisplayValue
  }
}