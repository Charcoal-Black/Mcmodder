import { InputSuccessfulChangeCallBack, InputValidInfo } from "../../types";
import { McmodderUtils } from "../../Utils";

export abstract class McmodderBaseInput {
  protected readonly title: string;
  protected value: any;
  protected readonly instance: JQuery;
  protected readonly onSuccessfulChange: InputSuccessfulChangeCallBack<any>;

  protected getEventType() {
    return "change";
  }

  protected abstract checkIsValid(newValue: any): InputValidInfo<any>;

  protected abstract getInstanceHTML(): JQuery;

  protected abstract getCurrentValue(): any;

  protected abstract setDisplayValue(value: any): void;

  protected abstract onChange(value: any): void;

  protected resetDisplayValue() {
    this.setDisplayValue(this.value);
  }

  constructor(title: string, value: any, onSuccessfulChange: InputSuccessfulChangeCallBack<any>) {
    this.title = title;
    this.value = value;
    this.instance = this.getInstanceHTML();
    this.instance.bind(this.getEventType(), () => this.onChange(this.getCurrentValue()));
    this.setDisplayValue(value);
    this.onSuccessfulChange = onSuccessfulChange;
  }

  getInstance() {
    return this.instance;
  }
}

export abstract class McmodderInput<T> extends McmodderBaseInput {
  declare protected value: T;
  declare protected readonly onSuccessfulChange: InputSuccessfulChangeCallBack<T>;

  protected checkIsValid(newValue: T): InputValidInfo<T> {
    return {
      isok: this.value != newValue,
      final: newValue
    };
  }

  constructor(title: string, value: T, onSuccessfulChange: InputSuccessfulChangeCallBack<T>) {
    super(title, value, onSuccessfulChange);
  }

  protected abstract override getCurrentValue(): T;

  protected abstract override setDisplayValue(value: T): void;

  protected onChange(value: T) {
    const resp = this.checkIsValid(value);
    if (resp.isok) {
      this.value = resp.final!;
      this.onSuccessfulChange(resp);
    }
    else {
      if (resp.msg) McmodderUtils.commonMsg(resp.msg, false);
      this.resetDisplayValue();
    }
  }
}