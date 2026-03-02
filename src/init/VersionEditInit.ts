import { GeneralEditInit } from "./GeneralEditInit";
import { McmodderInit } from "./Init";

export class VersionEditInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/version/add") || 
      this.parent.href.includes("/version/edit")
  }

  private checkIfValid(t: string, m: number, ma: number) {
    const nt = Number(t);
    return m <= nt && nt <= ma;
  }

  async run() {
    new GeneralEditInit(this.parent).run();

    // 快速设置日期
    const currentTime = new Date();
    const year = currentTime.getFullYear();
    $('<input id="mcmodder-date-editor" class="form-control" placeholder="输入 yymmdd 格式数字以快捷设置日期~">')
    .appendTo($("li.tab-li:nth-child(1)").first())
    .bind("change", e => {
      const target = e.currentTarget as HTMLInputElement;
      let date = [target.value.slice(0, 2), target.value.slice(2, 4), target.value.slice(4, 6)];
      if (!(this.checkIfValid(date[0], 9, year - 2e3) && 
        this.checkIfValid(date[1], 1, 12) && 
        this.checkIfValid(date[2], 1, 31))) return;
      if (date[1].charAt(0) === "0") date[1] = date[1].slice(1);
      if (date[2].charAt(0) === "0") date[2] = date[2].slice(1);
      $("#class-version-updatetime-year").selectpicker("val", "20" + date[0]);
      $("#class-version-updatetime-month").selectpicker("val", date[1]);
      $("#class-version-updatetime-day").selectpicker("val", date[2]);
      $("li.tab-li:nth-child(3) > div:nth-child(2) > input:nth-child(1)").first().focus();
    });
    // setTimeout(editorInit, 1e3);

    // 自动从 CurseForge/Modrinth 源获取日志
    const param = new URLSearchParams(window.location.search);
    let source = 0, id;
    if (param.get("cfid")) source = 1, id = param.get("cfid");
    else if (param.get("mrid")) source = 2, id = param.get("mrid");
    if (source) {
      const fileid = param.get("fileid");
      let resp, data;
      if (source === 1) {
        resp = await this.parent.utils.createAsyncRequest({
          url: `https://www.curseforge.com/api/v1/mods/${id}/files/${fileid}/change-log`,
          method: "GET"
        });
        data = JSON.parse(resp.responseText).changelogBody;
      } else if (source === 2) {
        resp = await this.parent.utils.createAsyncRequest({
          url: `https://api.modrinth.com/v2/version/${fileid}`,
          method: "GET"
        });
        data = "<p>" + JSON.parse(resp.responseText).changelog.replaceAll("\n", "</p><p>") + "</p>";
      }
      if (data) setTimeout(() => {
        editor.setContent(data);
        let w = ($("#ueditor_0").get(0) as HTMLIFrameElement).contentDocument?.body, f = false;
        if (!w) return;
        for (let i = 1; i < 6; i++) $(w).find("h" + i).each((_, e) => {
          $(e).replaceWith(`<p>[h${i}=${e.textContent}]</p>`);
          f = true;
        });
        if (f) $(w).append("<p>[ban:title_menu]</p>");
        $(w).trigger("keyup");
      }, 1100);
      $("[data-multi-id=name]").val(param.get("ver") || "");
      $("[data-multi-id=mcversion]").val(param.get("mcver") || "");
      let d = new Date(parseInt(param.get("date") || ""));
      $("#mcmodder-date-editor").val(
        d.getFullYear() % 1e2 * 1e4 + 
        (d.getMonth() + 1) * 1e2 + 
        d.getDate()
      ).trigger("change");
    }
  }
}