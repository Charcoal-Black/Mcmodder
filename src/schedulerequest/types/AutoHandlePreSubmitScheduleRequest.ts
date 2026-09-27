import { Utils } from "../../Utils";
import { Values } from "../../Values";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

/**
 * 自动提交预编辑项：定期把「预编辑」里暂存的内容正式提交到百科。
 *
 * 「预编辑」是编辑前先把内容提交到服务端暂存、由服务端返回正式编辑页的功能
 * （见 {@link PreSubmitFrame}），因此本任务能直接拿到「待提交 URL + 提交请求体」。
 */
export class AutoHandlePreSubmitScheduleRequest extends ScheduleRequestType {
  override readonly priority = 200;

  /**
   * 依次提交所有未出错的预编辑项。
   *
   * 排期为「当前时间 + `preSubmitCheckInterval` 小时」；配置关闭则不排期、任务停摆。
   * 提交的请求体是构造时存下的 `config`（含 rawData 的序列化结果），拿到正式页面前先确认目标未被他人锁定。
   */
  async run(list: ScheduleRequestUtils) {
    const preSubmitCheckInterval = this.configs.getSettings("preSubmitCheckInterval");
    if (!preSubmitCheckInterval) {
      return;
    }
    list.create(
      Date.now() + preSubmitCheckInterval * 60 * 60 * 1000,
      "autoHandlePreSubmit",
      this.parent.currentUID,
    );
    const preSubmitList: (PreSubmission | null)[] = (
      this.configs.getProfile("preSubmitList") as PreSubmission[]
    ).filter((e) => !e.errState);
    let f = true;
    if (!preSubmitList.length) return;
    for (const i in preSubmitList) {
      const e = preSubmitList[i]!;
      let resp = await this.parent.utils.createRequest({
        url: e.url,
        method: "GET",
      });
      if (!resp.responseXML) return;
      const doc = $(resp.responseXML);
      if (doc.find(".edit-user-alert.locked").length) continue;
      f = false;
      e.config.data = `data=${encodeURIComponent(JSON.stringify(e.rawData))}`;
      resp = await this.parent.utils.createRequest(e.config);
      console.log(resp);
      if (resp.status != 200) {
        Utils.commonMsg(`${resp.status} ${resp.statusText}`, false);
        continue;
      }
      const state = JSON.parse(resp.responseText).state as number;
      if (!state) {
        Utils.commonMsg(`预编辑项 ${e.url} 已正式提交~`);
        $(`.presubmit-frame tr[data-id="${e.id}"]`).remove();
        if (!$(".presubmit-frame tr").length) $(".presubmit-frame").remove();
        preSubmitList[i] = null;
      } else {
        Utils.commonMsg(`预编辑项 ${e.url} 提交失败：${Values.errorMessage[state]}`, false);
        e.errState = state;
      }
    }
    if (f) Utils.commonMsg("自动检查预编辑项已执行~ 当前暂无可正式提交的项目~");
    else this.configs.setProfile("preSubmitList", preSubmitList.filter(Boolean) as PreSubmission[]);
  }
}
