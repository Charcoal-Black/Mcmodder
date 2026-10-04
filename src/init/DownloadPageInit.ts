import { AdvancementID } from "../advancement/AdvancementUtils";
import { Init } from "./Init";

export class DownloadPageInit extends Init {
  canRun() {
    return this.parent.href.includes("/download/");
  }
  run() {
    if (this.configs.getSettings("customAdvancements")) {
      $(document).on("click", ".download-setting-button", () => {
        this.parent.advutils.addProgress(AdvancementID.DOWNLOAD_MODS_1);
      });
    }
  }
}
