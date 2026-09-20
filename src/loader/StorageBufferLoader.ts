import { watch } from "vue";
import { StorageBuffer } from "../StorageBuffer";

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

    watch( // 夜间模式
      () => buffer.storageRef.mcmodderSettings!.value.nightMode,
      () => buffer.parent.updateNightMode()
    )
    watch( // 宽窄屏
      () => buffer.storageRef.mcmodderSettings!.value.preferredWiderScreen,
      () => buffer.parent.updatePageWidth()
    )
  }
}