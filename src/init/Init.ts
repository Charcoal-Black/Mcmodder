import { Mcmodder } from "../Mcmodder";

export abstract class McmodderInit {
  parent: Mcmodder;
  constructor(parent: Mcmodder) {
    this.parent = parent;
  }
  abstract canRun(): boolean;
  abstract run(): void;
}