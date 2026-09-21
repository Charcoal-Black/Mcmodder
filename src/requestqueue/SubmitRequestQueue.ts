import type { GmResponseEvent } from "$";
import { Mcmodder } from "../Mcmodder";
import { McmodderConsole } from "../widget/logger/Console";
import type { Logger } from "../widget/logger/Logger";
import { RequestQueue } from "./RequestQueue";

export class SubmitRequestQueue extends RequestQueue {
  constructor(parent: Mcmodder, id: string, maxConcurrent = 1, minInterval = 2000, logger: Logger = new McmodderConsole) {
    super(parent, id, maxConcurrent, minInterval, logger);
  }

  protected override onCallback(_resp: GmResponseEvent<"text", any>, _index: number, _queue: RequestList) {
    
  }
}