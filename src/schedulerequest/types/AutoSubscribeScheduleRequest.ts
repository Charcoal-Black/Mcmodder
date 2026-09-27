import { GM_openInTab } from "$";
import { Utils } from "../../Utils";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

/**
 * 关注列表提醒：定时遍历已关注的模组，发现「编辑记录」或「短评」有新动静时开标签页提醒。
 *
 * 这是本目录里唯一**不使用 `await` 串行**的任务：为了不阻塞轮询，用 `setTimeout` 每秒推进一个模组。
 */
export class AutoSubscribeScheduleRequest extends ScheduleRequestType {
  override readonly priority = 100;

  /**
   * 检查关注列表中所有模组的更新。
   *
   * 排期为「当前时间 + `subscribeDelay` 小时」；配置关闭则直接 return 不排期，任务停摆。
   *
   * 提醒的判定方式是「与上次记录的 id/时间比较」，记录分别存在
   * `latestEditTime`（编辑历史最后一条的时间戳）与 `latestComment`（短评楼层 id）里。
   */
  run(list: ScheduleRequestUtils) {
    const subscribeDelay = this.configs.getSettings("subscribeDelay");
    if (!subscribeDelay) {
      return;
    }
    list.create(
      Date.now() + subscribeDelay * 60 * 60 * 1000,
      "autoSubscribe",
      this.parent.currentUID,
    );
    let index = 0;
    const subscribeModlist: number[] = this.configs.getProfile(`subscribeModlist`) || [];
    const getModEditLog = (id: number) => {
      if (!id) return;
      const sid = id.toString();
      const l = `${this.parent.hostname}/class/history/${id}.html`;
      this.parent.utils
        .createRequest({
          url: l,
          method: "GET",
        })
        .then((resp) => {
          if (!resp.responseXML) return;
          const doc = $(resp.responseXML);
          const t = Date.parse(
            doc.find(".history-list-frame li:first-child() .time").text()?.split(" (")[0],
          );
          const lt = this.configs.get("latestEditTime", sid);
          if (!lt) this.configs.set("latestEditTime", sid, t);
          else if (lt < t) {
            GM_openInTab(`${l}?t=${lt}`, { active: true });
            this.configs.set("latestEditTime", sid, t);
          }

          if (this.configs.getSettings("subscribeComment")) {
            this.parent.utils.createRequest({
              url: `${this.parent.hostname}/frame/comment/CommentRow/`,
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                Origin: this.parent.hostname,
                Referer: Utils.getItemURL(id),
              },
              data: $.param({
                data: {
                  type: "class",
                  channel: 1,
                  doid: id,
                  page: 1,
                  selfonly: 0,
                },
              }),
              onload: (resp) => {
                const d = JSON.parse(resp.responseText)?.data?.row || [];
                const t = (d[0]?.floor.includes("# 置顶 #") ? d[1]?.id : d[0]?.id) || 0;
                const lt = this.configs.get("latestComment", sid);
                if (!lt) this.configs.set("latestComment", sid, t);
                else if (lt < t) {
                  GM_openInTab(`${Utils.getClassURL(id)}#comment-${t}`, {
                    active: true,
                  });
                  this.configs.set("latestComment", sid, t);
                }
              },
            });
          }

          if (subscribeModlist.length > index + 1) {
            setTimeout(() => getModEditLog(subscribeModlist[++index]), 1e3);
            return;
          }
        });
    };
    if (subscribeModlist) {
      getModEditLog(subscribeModlist[0]);
    }
  }
}
