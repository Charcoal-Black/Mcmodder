import { AdvancementID } from "../advancement/AdvancementUtils";
import { McmodderInit } from "./Init";

export class DownloadPageInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/download/");
  }
  run() {
    if (this.parent.utils.getConfig("customAdvancements")) {
      $(document).on("click", ".download-setting-button", () => {
        this.parent.advutils.addProgress(AdvancementID.DOWNLOAD_MODS_1);
      });
    }
  }
}