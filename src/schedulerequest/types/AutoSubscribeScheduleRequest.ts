import { GM_openInTab } from "$";
import { ScheduleRequestType } from "../ScheduleRequestType";
import { ScheduleRequestUtils } from "../ScheduleRequestUtils";

export class AutoSubscribeScheduleRequest extends ScheduleRequestType {
  protected priority = 100;
  run(list: ScheduleRequestUtils) {
      list.create(Date.now() + this.parent.utils.getConfig("subscribeDelay") * 60 * 60 * 1000, "autoSubscribe", this.parent.currentUID);
      let index = 0;
      const subscribeModlist: number[] = this.parent.utils.getProfile(`subscribeModlist`) || [];
      const getModEditLog = (id: number) => {
        if (!id) return;
        const l = `https://www.mcmod.cn/class/history/${ id }.html`;
        this.parent.utils.createRequest({
          url: l,
          method: "GET",
          onload: resp => {
            if (!resp.responseXML) return;
            const doc = $(resp.responseXML);
            const t = Date.parse(doc.find(".history-list-frame li:first-child() .time").text()?.split(" (")[0]);
            const lt = this.parent.utils.getConfig(id, "latestEditTime");
            if (!lt) this.parent.utils.setConfig(id, t, "latestEditTime");
            else if (lt < t) {
              GM_openInTab(`${ l }?t=${ lt }`, { active: true });
              this.parent.utils.setConfig(id, t, "latestEditTime");
            }

            if (this.parent.utils.getConfig("subscribeComment")) {
              this.parent.utils.createRequest({
                url: "https://www.mcmod.cn/frame/comment/CommentRow/",
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                  "Origin": "https://www.mcmod.cn",
                  "Referer": `https://www.mcmod.cn/class/${id}.html`
                },
                data: $.param({
                  data: {
                    type: "class",
                    channel: 1,
                    doid: id,
                    page: 1,
                    selfonly: 0
                  }
                }),
                onload: resp => {
                  const d = JSON.parse(resp.responseText)?.data?.row || [];
                  const t = (d[0]?.floor.includes("# 置顶 #") ? d[1]?.id : d[0]?.id) || 0;
                  const lt = this.parent.utils.getConfig(id, "latestComment");
                  if (!lt) this.parent.utils.setConfig(id, t, "latestComment");
                  else if (lt < t) {
                    GM_openInTab(`https://www.mcmod.cn/class/${id}.html#comment-${t}`, { active: true });
                    this.parent.utils.setConfig(id, t, "latestComment");
                  }
                }
              });
            }

            if (subscribeModlist.length > index + 1) {
              setTimeout(() => getModEditLog(subscribeModlist[++index]), 1e3);
              return;
            }
          }
        });
      };
      if (subscribeModlist) {
        getModEditLog(subscribeModlist[0]);
      }
    }
}