import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class DiffListInit extends McmodderInit {
  canRun() {
    return this.parent.href.includes("/diff/") &&
      this.parent.href.includes("/list/") &&
      this.parent.utils.getConfig("multiDiffCompare");
  }
  run() {
    $('<button class="btn btn-sm btn-dark" id="diff-multicompare-btn">批量对比选中项</button><div class="mcmodder-multicompare-frame"></div>').insertAfter(".difference-top");
    $("#diff-multicompare-btn").click(async () => {
      let selected: number[] = [];
      // const id = $("input[name='diff-compare-box']").toArray().map(e => e.getAttribute("value")).sort();
      $("input[name='diff-compare-box']").each((i, e) => {
        if ((e as HTMLInputElement).checked) selected.push(i);
      });
      selected = selected.sort();
      const begin = selected[0];
      const end = selected[1];
      if (selected.length < 2) {
        McmodderUtils.commonMsg(PublicLangData.difference_list.warning.empty, false);
        return;
      } else if (selected.length > 2) {
        McmodderUtils.commonMsg(PublicLangData.difference_list.warning.limit, false);
        return;
      }
      for (let i = begin; i < end; i++) {
        // const resp = await this.utils.createAsyncRequest({
        //   url: `https://www.mcmod.cn/class/diff/${id[i + 1]}-${id[i]}.html`,
        //   method: "GET"
        // });
        // const doc = $(resp.responseXML);
        // TODO ...
      }
    });
  }
}