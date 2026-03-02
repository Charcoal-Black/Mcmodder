import { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { RequestQueue } from "../types";
import { McmodderConsole } from "../widget/logger/Console";
import { McmodderLogger } from "../widget/logger/Logger";
import { McmodderRequestQueue } from "./RequestQueue";

export class McmodderSubmitRequestQueue extends McmodderRequestQueue {
  constructor(parent: Mcmodder, id: string, maxConcurrent = 1, minInterval = 2000, logger: McmodderLogger = new McmodderConsole) {
    super(parent, id, maxConcurrent, minInterval, logger);
  }

  onCallback(_resp: GmResponseEvent<"text", any>, _index: number, _queue: RequestQueue) {
    
  }
}