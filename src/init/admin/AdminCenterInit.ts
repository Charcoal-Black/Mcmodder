import { Utils } from "../../Utils";
import { AdminBaseInit } from "./AdminBaseInit";

export class AdminCenterInit extends AdminBaseInit {
  override getTriggerTitle() {
    return "MC百科后台管理中心";
  }
  override run() {
    $("td:first-child()").each((_, c) => {
      const n = Number(c.textContent);
      c.innerHTML = `<a href="${Utils.getCenterURL(n)}" target="_blank">${n}</a>`;
    });
  }
}
