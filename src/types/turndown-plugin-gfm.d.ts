/**
 * `turndown-plugin-gfm` 没有随包发布类型声明，官方也没有 `@types` 包。
 * 这里只声明实际用到的插件函数，签名与 `@types/turndown` 的 `TurndownService.Plugin` 对齐。
 *
 * 该包随产物一起打包（不走 CDN / `@require`），dev 与 build 都是同一份 npm 依赖。
 */
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";

  export function gfm(turndownService: TurndownService): void;
  export function tables(turndownService: TurndownService): void;
  export function strikethrough(turndownService: TurndownService): void;
  export function taskListItems(turndownService: TurndownService): void;
}
