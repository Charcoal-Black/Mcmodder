import type { AdminBaseInit } from "./admin/AdminBaseInit";
import { AdminCenterInit } from "./admin/AdminCenterInit";
import { AdminGUIInit } from "./admin/AdminGUIInit";
import { AdminStyleInit } from "./admin/AdminStyleInit";
import { AdminVerifyInit } from "./admin/AdminVerifyInit";
import { Init } from "./Init";

export class AdminInit extends Init {
  private triggered: Set<string> = new Set();
  private readonly adminEntries: Record<string, AdminBaseInit> = {};

  private readonly initList = [
    new AdminVerifyInit(this.parent),
    new AdminCenterInit(this.parent),
    new AdminStyleInit(this.parent),
    new AdminGUIInit(this.parent),
  ];

  canRun() {
    return this.parent.href.includes("admin.mcmod.cn");
  }
  run() {
    this.initList.forEach((base) => {
      const title = base.getTriggerTitle();
      this.adminEntries[title] = base;
    });

    this.adminObserver.observe($(".connect-area").get(0), { childList: true });
  }

  private readonly adminObserver = new MutationObserver(() => {
    const title = $("#connect-frame > div.page-header > h1.title").first().text();
    if (this.adminEntries[title]) {
      const base = this.adminEntries[title];
      base.run();
      if (!this.triggered.has(title)) {
        base.firstRun();
        this.triggered.add(title);
      }
    }
  });
}
