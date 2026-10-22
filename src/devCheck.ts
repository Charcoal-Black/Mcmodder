/**
 * dev 期自检：确认 GM API 真的挂上了。
 *
 * 背景：vite-plugin-monkey 的 dev 模式靠 `document[__monkeyWindow-xxx]` 把 Tampermonkey 沙箱里的
 * GM API 暴露给页面 realm 的模块，那个 key 是「用户脚本注释块」的哈希。
 *
 * 只要改了 `vite.config.ts` 里的 `@require` / `@match` / `@grant`，哈希就会变；若浏览器还缓存着
 * 旧版本的客户端模块（预打包产物带 `immutable`，URL 不变），已安装脚本与实时模块便对不上号 ——
 * client 兜底到页面 window，于是 `GM_info` / `GM_getValue` 等**全部**变成 undefined。
 *
 * 本模块必须**先于**任何用到 GM API 的模块执行（尤其是 `Values` 的静态初始化），否则报错会变成
 * 一句莫名其妙的「Cannot read properties of undefined」，看不出真正的原因。
 * 因此它被 `src/main.ts` 以副作用导入的方式放在最前面。
 */
import { GM_getValue } from "$";

if (import.meta.env.DEV && typeof GM_getValue !== "function") {
  console.error(
    "[Mcmodder] dev 模式下未取到 GM API：Tampermonkey 里的用户脚本多半已过期" +
      "（改动 @require 等元数据后需重装，且浏览器可能缓存了旧的 dev 依赖，需硬刷新）。" +
      "请打开 dev server 的 /__vite-plugin-monkey.install.user.js 重新安装，然后硬刷新（Cmd/Ctrl+Shift+R）本页。",
  );
}
