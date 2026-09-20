import type { ConfigRepository } from "../config/ConfigRepository";
import { Mcmodder } from "../Mcmodder";

export abstract class McmodderInit {
  parent: Mcmodder;
  configs: ConfigRepository;
  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.configs = parent.configRepository;
  }
  abstract canRun(): boolean;
  abstract run(): void;
}