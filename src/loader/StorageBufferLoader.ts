import { StorageBuffer } from "../StorageBuffer";

export class StorageBufferLoader {
  static run(buffer: StorageBuffer) {
    buffer.addCacheableItem("mcmodderSettings", null, _buffer => { // 全页面同步
      // 夜间模式
      buffer.parent.updateNightMode();
      // 宽窄屏
      buffer.parent.updatePageWidth();
      /* if (window.location.href.includes("/admin.mcmod.cn/") && $(".model-backdrop").length && this.parent.utils.getConfig("verifyScreenSplit")) {
        document.body.classList.remove("mcmodder-screen-split");
      } */
    })
    .addCacheableItem("scheduleRequestList", () => new Array)
    .addCacheableItem("classNameIDMap")
    .addCacheableItem("idClassNameMap")
    .addCacheableItem("modDependences_v2", () => new Array)
    .addCacheableItem("modExpansions_v2", () => new Array);
  }
}