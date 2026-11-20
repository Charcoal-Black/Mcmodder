import {
  GM_cookie,
  GM_getValue,
  GM_setValue,
  GM_xmlhttpRequest,
  type GmResponseEvent,
  type GmResponseType,
  type GmXmlhttpRequestOption,
} from "$";
import type { ConfigRepository } from "./config/ConfigRepository";
import type { Mcmodder } from "./Mcmodder";
import { Utils } from "./Utils";
import { Values } from "./Values";

/**
 * 网络访问层：承载依赖 `Mcmodder` 上下文与配置的有状态请求逻辑。
 *
 * 限速排期、请求日志、`yxd_token` 重试与跨标签页请求提示原先挂在 `Utils` 实例上，现统一收敛到
 * 这里，由组合根持有为 `Mcmodder.web`。纯静态工具函数仍在 `Utils`，持久化状态见
 * `ConfigRepository`。
 */
export class WebFetchUtils {
  constructor(
    private readonly parent: Mcmodder,
    private readonly configs: ConfigRepository,
  ) {}

  /**
   * 计算并记录本次请求的调度时间戳（按 `minimumRequestInterval` 限速；队列过长时返回 null）
   *
   * @returns 排定的发包时刻；返回 null 表示队列已超出上限，本次请求**不应**被发出，
   *   调用方必须据此放弃派发（见 {@link createRequest}）。
   */
  updateRequestTime() {
    const minimumRequestInterval = Math.max(
      this.configs.getSettings("minimumRequestInterval")!,
      500,
    );
    const now = Date.now();
    let lastRequestTime = this.configs.getSettings("lastRequestTime") || now;
    // 持久化的游标可能因旧版本数据、云端同步覆盖等而异常领先当前时间；此时照着它排期会把
    // 整条发包队列堵死，故直接丢弃、以当前时间重新起算
    if (lastRequestTime > now + minimumRequestInterval * Values.REQUEST_SCHEDULE_MAX_DRIFT_FACTOR) {
      console.warn("已排定时刻异常领先当前时间，发包排期将重新起算。");
      lastRequestTime = now;
    }
    if (lastRequestTime > now + minimumRequestInterval * Values.MAX_REQUEST_COUNT) {
      console.warn("已入队的请求数量超限，新的请求被忽略。");
      return null;
    }
    if (now > lastRequestTime) lastRequestTime = now;
    this.configs.setSettings("lastRequestTime", lastRequestTime + minimumRequestInterval);
    return lastRequestTime;
  }

  /**
   * 发送限速请求的全局入口：
   * 按 `updateRequestTime` 排定延迟后发出，记录日志；遇到 `yxd_token` 校验响应时写入 cookie 并自动重发。
   *
   * 允许同时传入一个附加信息。若启用网络请求监控，则会在所有可见的标签页上提示本次发包的同时显示此信息。
   * 原则上所有网络请求都应当有附加信息，便于在监控中理解请求目的。
   *
   * @warning 队列超出 {@link Values.MAX_REQUEST_COUNT} 上限时，本请求直接以失败告终、**不会发包**
   *   （此前是把旧的队满哨兵值 `-1` 交给 `setTimeout`，负延迟被当作 0 处理，反而使限速彻底失效）。
   *   对本就无法降级重试的调用方而言失败与「不关心结果」无异；但计划任务与队列必须让失败
   *   可见地冒泡，否则会留下一条已排期、实则永远不会落地的待办。
   *
   * @param config 请求配置
   * @param message 本次请求附带的提示消息
   * @param silent 为 true 时不在请求监控中弹出提示（仍进入限速队列），用于脚本内部的批量查找
   * @param log 为 false 时不写请求日志；含认证 key 等敏感数据的内部请求应关闭
   */
  createRequest<R extends GmResponseType = "text">(
    config: GmXmlhttpRequestOption<R, unknown>,
    message?: string,
    silent = false,
    log = true,
  ): Promise<GmResponseEvent<R, unknown>> {
    const lastRequestTime = this.updateRequestTime(),
      now = Date.now();
    if (lastRequestTime === null) {
      const errorMsg = "排队的请求已超出上限，本次请求被丢弃。";
      Utils.commonMsg(errorMsg + "（详见控制台）", false);
      return Promise.reject(new Error(errorMsg));
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        config.onload = (resp) => {
          // 二进制响应（`responseType: "arraybuffer"` 等）下 responseText 未必是字符串，不能直接 trim
          const str = typeof resp.responseText === "string" ? resp.responseText.trim() : "";
          if (str.startsWith("<script>") && str.endsWith("</script>")) {
            const yxdTokenList = str.match(/'yxd_token=[0-9a-f]+'/);
            if (yxdTokenList) {
              const url = new URL(resp.finalUrl);
              const hostname = url.hostname;
              const pathname = url.pathname;
              const index = pathname.lastIndexOf("/");
              const path = "/" + pathname.slice(1, index);
              const yxdToken = yxdTokenList[0].slice(11, -1);
              GM_cookie.set(
                {
                  name: "yxd_token",
                  value: yxdToken,
                  domain: hostname,
                  path: path,
                },
                (err) => {
                  if (err) {
                    console.warn("Failed to set `yxd_token!`");
                  } else {
                    this.createRequest(config, message, silent, log).then((resp) => resolve(resp));
                  }
                },
              );
            }
          } else {
            resolve(resp);
          }
        };
        if (log) {
          const logs = GM_getValue("mcmodderLogger")?.split(";") || [];
          if (logs.length >= Values.MAX_REQUEST_COUNT / 10) logs.shift();
          let content = `A${lastRequestTime}:${config.url}`;
          if (config.data) content += `(${config.data})`;
          logs.push(content);
          GM_setValue("mcmodderLogger", logs.join(";"));
        }
        // 调试与监控：在所有可见的标签页上提示本次发包（须置于限速等待之后，否则排队中的请求会提前亮起）
        if (!silent) this.parent.requestToastBroadcaster.send(config.method, config.url, message);
        // console.debug("Send Async request: ", config);
        GM_xmlhttpRequest(config);
      }, lastRequestTime - now);
    });
  }

  /** 按 ID 抓取物品资料页并解析为 `Item`，失败返回 undefined */
  async getItemByID(id: string | number) {
    id = Number(id);
    const resp = await this.createRequest(
      {
        url: `${this.parent.hostname}/item/${id}.html`,
        method: "GET",
        redirect: "manual",
        anonymous: true,
      },
      "获取物品基础信息",
    );
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return Utils.parseItemDocument(doc);
  }

  /** 按 ID 抓取物品编辑页并解析为 `Item`，未登录或失败返回 undefined */
  async getDetailedItemByID(id: string | number) {
    if (!this.parent.currentUID) return;
    id = Number(id);
    const resp = await this.createRequest(
      {
        url: `${this.parent.hostname}/item/edit/${id}/`,
        method: "GET",
        redirect: "manual",
      },
      "获取物品详细信息",
    );
    if (resp.status > 300 || !resp.responseXML) {
      return;
    }
    const doc = $(resp.responseXML);
    return Utils.parseItemEditorDocument(doc);
  }
}
