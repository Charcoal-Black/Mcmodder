import { PreSubmitData } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoHandlePreSubmitScheduleRequest extends ScheduleRequestType {
  protected priority = 200;
  async run(list: ScheduleRequestUtils) {
    list.create(Date.now() + this.parent.utils.getConfig("preSubmitCheckInterval") * 60 * 60 * 1000, "autoHandlePreSubmit", this.parent.currentUID);
    const preSubmitList: (PreSubmitData | null)[] = (this.parent.utils.getProfile("preSubmitList") as PreSubmitData[]).filter(e => !e.errState);
    let f = true;
    if (!preSubmitList.length) return;
    for (let i in preSubmitList) {
      const e = preSubmitList[i]!;
      let resp = await this.parent.utils.createAsyncRequest({
        url: e.url,
        method: "GET"
      });
      if (!resp.responseXML) return;
      const doc = $(resp.responseXML);
      if (doc.find(".edit-user-alert.locked").length) continue;
      f = false;
      e.config.data = `data=${ encodeURIComponent(JSON.stringify(e.rawData)) }`;
      resp = await this.parent.utils.createAsyncRequest(e.config);
      console.log(resp);
      if (resp.status != 200) {
        McmodderUtils.commonMsg(`${resp.status} ${resp.statusText}`, false);
        continue;
      }
      const state = JSON.parse(resp.responseText).state as number;
      if (!state) {
        McmodderUtils.commonMsg(`预编辑项 ${e.url} 已正式提交~`);
        $(`.presubmit-frame tr[data-id="${e.id}"]`).remove();
        if (!$(".presubmit-frame tr").length) $(".presubmit-frame").remove();
        preSubmitList[i] = null;
      } else {
        McmodderUtils.commonMsg(`预编辑项 ${e.url} 提交失败：${McmodderValues.errorMessage[state]}`, false);
        e.errState = state;
      }
    }
    if (f) McmodderUtils.commonMsg("自动检查预编辑项已执行~ 当前暂无可正式提交的项目~");
    else this.parent.utils.setProfile("preSubmitList", preSubmitList.filter(o => o));
  }
}
