import { CenterInit } from "../CenterInit";

export abstract class CenterBaseInit {
  center: CenterInit;
  abstract run(): void;
  constructor(center: CenterInit) {
    this.center = center;
  }
  get parent() {
    return this.center.parent;
  }
  get web() {
    return this.parent.web;
  }
  get configs() {
    return this.parent.configRepository;
  }
}
