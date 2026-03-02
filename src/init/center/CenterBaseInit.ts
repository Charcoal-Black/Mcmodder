import { CenterInit } from "../CenterInit";

export abstract class CenterBaseInit {
  center: CenterInit;
  abstract run(): void;
  constructor(center: CenterInit) {
    this.center = center;
  }
  getParent() {
    return this.center.parent;
  }
  getUtils() {
    return this.getParent().utils;
  }
}