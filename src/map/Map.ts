import { McmodderMapKeyHandler } from "../types";

export class McmodderMap<T extends object> {
  private readonly map = new Map<any, T[]>();
  private readonly key: keyof T;
  private readonly keyHandler?: McmodderMapKeyHandler;

  constructor(key: keyof T, keyHandler?: McmodderMapKeyHandler) {
    this.key = key;
    this.keyHandler = keyHandler;
  }

  add(list: T[]) {
    list.forEach(data => {
      this.push(data);
    });
  }

  private push(data: T) {
    let mapKey = data[this.key];
    if (this.keyHandler) mapKey = this.keyHandler(mapKey);
    if (mapKey instanceof Array) {
      mapKey.forEach(key => {
        this.pushSingle(key, data);
      });
    } else {
      this.pushSingle(mapKey, data);
    }
  }

  private pushSingle(key: any, data: T) {
    let res = this.map.get(key);
    if (res === undefined) {
      res = [];
      this.map.set(key, res);
    }
    res.push(data);
    return data;
  }

  get(mapKey: any) {
    return this.map.get(mapKey);
  }

  clear() {
    this.map.clear();
  }
}