import { Mcmodder } from "../../Mcmodder";
import { Utils } from "../../Utils";
import type { Logger } from "./Logger";

export class LoggerFrame implements Logger {

  parent: Mcmodder;
  $instance: JQuery;
  instance: Element;

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.$instance = $(`<div class="mcmodder-logger mcmodder-monospace" />`);
    this.instance = this.$instance.get(0);
  }
  
  private getScrollTopMax() {
    return this.instance.scrollHeight - this.instance.clientHeight;
  }

  clear() {
    this.$instance.empty();
  }

  scrollToBottom() {
    this.instance.scrollTo(0, this.getScrollTopMax());
  }

  private write(className: string, prefix: string, message: string) {
    this.$instance.append(`<p class="${ className }">&lt;${ Utils.getFormatted24hTime() }&gt; ${ prefix }${ message }</span>`);
    if (this.getScrollTopMax() - this.instance.scrollTop < 100) {
      this.scrollToBottom();
    }
  }

  log(message: string) {
    this.write("info", "", message);
  }

  warn(message: string) {
    this.write("warn", "[WARN] ", message);
  }

  success(message: string) {
    this.write("success", "[SUCCESS] ", message);
  }

  error(message: string) {
    this.write("error", "[ERROR] ", message);
  }

  fatal(message: string) {
    this.write("fatal", "[FATAL] ", message);
  }

  key(message: string) {
    this.write("key", "", message);
  }
}