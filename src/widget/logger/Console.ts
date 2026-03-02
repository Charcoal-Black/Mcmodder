import { McmodderLogger } from "./Logger";

export class McmodderConsole implements McmodderLogger {
  log(message: string) {
    console.log(message);
  }

  warn(message: string) {
    console.warn("[WARN] " + message);
  }

  success(message: string) {
    console.log("%c[SUCCESS] " + message, "color: green;");
  }

  error(message: string) {
    console.error("[ERROR] " + message);
  }

  fatal(message: string) {
    console.error("[FATAL] " + message);
  }

  key(message: string) {
    console.log("%c" + message, "color: orchid;");
  }
}