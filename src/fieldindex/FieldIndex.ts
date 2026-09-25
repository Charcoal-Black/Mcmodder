
export class FieldIndex<T extends object, P extends keyof T, K = T[P]> {
  private readonly map = new Map<K, T[]>();
  private readonly key: P;
  private readonly keyHandler?: MapKeyHandler<T[P], K>;

  constructor(key: P, keyHandler?: MapKeyHandler<T[P], K>) {
    this.key = key;
    this.keyHandler = keyHandler;
  }

  add(list: T[]) {
    list.forEach(data => {
      this.push(data);
    });
  }

  private push(data: T) {
    const mapKey = data[this.key];
    const handledKey = this.keyHandler?.(mapKey) ?? mapKey;
    if (handledKey instanceof Array) {
      (handledKey as K[]).forEach(key => {
        this.pushSingle(key, data);
      });
    } else {
      this.pushSingle(handledKey as K, data);
    }
  }

  private pushSingle(key: K, data: T) {
    let res = this.map.get(key);
    if (res === undefined) {
      res = [];
      this.map.set(key, res);
    }
    res.push(data);
    return data;
  }

  get(mapKey: K) {
    return this.map.get(mapKey);
  }

  getKeyOrDefault<K2 extends keyof T>(mapKey: K, targetKey: K2, defaultValue: T[K2]) {
    const result = this.get(mapKey);
    if (result !== undefined) return result[0][targetKey];
    return defaultValue;
  }

  clear() {
    this.map.clear();
  }
}

