export interface McmodderLogger {
  log(message: string): void;
  warn(message: string): void;
  success(message: string): void;
  error(message: string): void;
  fatal(message: string): void;
  key(message: string): void;
}