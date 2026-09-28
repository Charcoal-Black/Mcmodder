import { StorageBuffer } from "../StorageBuffer";

/**
 * 存储缓冲加载器：集中登记所有「可缓存」的 GM 存储键。
 *
 * # 登记规则
 * 只有高频读取、适合常驻响应式的键才会在这里 `addCacheableItem`；其余键由 `ConfigRepository`
 * 走「直通 GM Storage」路径（每次 JSON 解析）。
 */
export class StorageBufferLoader {
  static run(buffer: StorageBuffer) {
    /* if (window.location.href.includes("/admin.mcmod.cn/") && $(".model-backdrop").length && this.configs.get("verifyScreenSplit")) {
        document.body.classList.remove("mcmodder-screen-split");
      } */

    buffer
      .addCacheableItem("mcmodderSettings")
      .addCacheableItem("scheduleRequestList", () => [])
      .addCacheableItem("classNameIDMap")
      .addCacheableItem("idClassNameMap")
      .addCacheableItem("modDependences_v2", () => ({}))
      .addCacheableItem("modExpansions_v2", () => ({}));
  }
}
