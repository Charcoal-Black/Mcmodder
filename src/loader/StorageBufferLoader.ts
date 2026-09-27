import { watch } from "vue";
import { StorageBuffer } from "../StorageBuffer";

/**
 * 存储缓冲加载器：集中登记所有「可缓存」的 GM 存储键，并挂载全局响应式副作用。
 *
 * # 登记规则
 * 只有高频读取、适合常驻响应式的键才会在这里 `addCacheableItem`；其余键由 `ConfigRepository`
 * 走「直通 GM Storage」路径（每次 JSON 解析）。
 *
 * # 副作用挂载
 * 这里也是少数用 `watch` 监听配置变化驱动全局行为的入口（夜间模式、宽窄屏切换）。
 * 新增「配置变化 → 全局行为」的关联时，优先考虑在此追加 watch。
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

    watch(
      // 夜间模式
      () => buffer.storageRef.mcmodderSettings!.value.nightMode,
      () => buffer.parent.updateNightMode(),
    );
    watch(
      // 宽窄屏
      () => buffer.storageRef.mcmodderSettings!.value.preferredWiderScreen,
      () => buffer.parent.updatePageWidth(),
    );
  }
}
