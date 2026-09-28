import { AdminBaseInit } from "./AdminBaseInit";

export class AdminGUIInit extends AdminBaseInit {
  override getTriggerTitle() {
    return "GUI管理";
  }
  private readonly guiAdminObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if ((mutation.addedNodes[0] as HTMLElement)?.id === "class-gui-table") {
        $("#class-gui-table td:nth-child(4) > *:not(.btn)").css("background-color", "transparent");
      }
    }
  });
  override run() {
    this.guiAdminObserver.observe($("div#connect-frame-sub").get(0), {
      childList: true,
    });
  }
}
