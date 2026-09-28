import { AdminBaseInit } from "./AdminBaseInit";

export class AdminCenterInit extends AdminBaseInit {
  override getTriggerTitle() {
    return "MC百科后台管理中心";
  }
  override run() {
    $("td:first-child()").each((_, c) => {
      const n = c.textContent;
      c.innerHTML = `<a href="https://center.mcmod.cn/${n}" target="_blank">${n}</a>`;
    });
  }
}
