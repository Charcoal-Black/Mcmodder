import type { ConfigRepository } from "../config/ConfigRepository";
import type { Mcmodder } from "../Mcmodder";
import { Utils } from "../Utils";
import { Values } from "../Values";

/** `CommentRow` / `CommentReply` 返回的单行数据（只声明跳转需要的字段） */
interface CommentJumpRow {
  id: string;
  floor?: string;
}

interface CommentJumpPageData {
  is_empty?: number;
  page?: {
    now_page?: number;
    total_page?: number;
    total_row?: string;
  };
  row?: CommentJumpRow[];
}

interface CommentJumpHint {
  commentId: string;
  floor?: number;
  replyIndex?: number;
}

interface CommentJumpTarget {
  page: number;
  row: CommentJumpRow;
}

interface CommentJumpParentSearch {
  /** 二分过程中命中的第一个父楼；可能不是目标回复所属的那个（楼层号有重复） */
  parent?: CommentJumpTarget;
  estimate: number;
  totalPage: number;
  visited: Set<number>;
}

/**
 * 短评跨页跳转：解析 `#comment-<cid>` 与消息中心写入的楼层/回复序号，
 * 通过站点 `CommentRow` / `CommentReply` 接口定位目标页并翻页。
 *
 * 只负责查找、loading 与滚动高亮；短评行的常规注入仍由 `CommentInit` 处理。
 */
export class CommentJumpController {
  private hint?: CommentJumpHint;
  private state:
    "idle" | "locating" | "loadingPage" | "loadingParentPage" | "loadingReply" | "done" | "failed" =
    "idle";
  private timer?: number;
  private timeout?: number;
  private waitAttempts = 0;
  private requests = 0;
  private loading?: JQuery;
  private jumpParent?: {
    cid: string;
    page: number;
    replyPage: number;
  };
  private repliesRequested = false;

  constructor(
    private readonly parent: Mcmodder,
    private readonly configs: ConfigRepository,
  ) {}

  /**
   * 页面初始化后调用；重新解析 URL，目标已在 DOM 中则直接高亮，
   * 否则等待首屏短评加载后开始查找。返回是否存在跳转目标。
   */
  start() {
    this.hint = CommentJumpController.parseJumpHint();
    if (!this.hint) return false;
    this.scheduleJumpCheck(1500);
    return true;
  }

  /** `CommentInit.processCommentFloor` 每次渲染一页短评后调用 */
  onCommentPageRendered() {
    if (!this.hint) return;
    if (
      this.state === "loadingParentPage" &&
      this.jumpParent &&
      Number(comment_nowpage) === this.jumpParent.page
    ) {
      this.loadParentReplies();
      return;
    }
    if (this.state === "idle") this.scheduleJumpCheck(400);
  }

  /** 短评行渲染时调用；命中目标 CID 时完成滚动与高亮 */
  notifyCommentRendered(target: JQuery) {
    const commentId = String(target.find("input.comment-id").val() ?? "");
    if (!this.hint || commentId !== this.hint.commentId || this.state === "done") return;
    this.completeJump();
    this.scrollToTarget(target);
  }

  private static parseJumpHint(): CommentJumpHint | undefined {
    const match = window.location.hash.match(/^#comment-(\d+)$/);
    if (!match) return undefined;
    const params = new URLSearchParams(window.location.search);
    const floor = params.get(Values.commentJump.floorParam);
    const reply = params.get(Values.commentJump.replyParam);
    return {
      commentId: match[1],
      floor: floor && /^\d+$/.test(floor) ? Number(floor) : undefined,
      replyIndex: reply && /^\d+$/.test(reply) ? Number(reply) : undefined,
    };
  }

  private static parseFloor(floor?: string) {
    const match = floor?.match(/(\d+)\s*楼/);
    return match ? Number(match[1]) : undefined;
  }

  private get jumpLimit() {
    return Math.max(1, this.configs.getSettings("commentJumpRequestLimit") ?? 12);
  }

  private isJumpStopped() {
    return this.state === "done" || this.state === "failed";
  }

  private ensureLoading() {
    const $block = $(".common-comment-block.lazy").first();
    if (!$block.length) return undefined;
    if (!this.loading?.get(0)?.isConnected) {
      this.loading?.remove();
      this.loading = $(
        '<div class="mcmodder-comment-jump-loading"><i class="fas fa-spinner fa-pulse"></i><span></span></div>',
      );
      const $floor = $block.find(".comment-floor").first();
      if ($floor.length) this.loading.insertBefore($floor);
      else this.loading.appendTo($block);
    }
    $block.addClass("mcmodder-comment-jump-loading-block");
    return this.loading;
  }

  private updateLoading(text: string) {
    this.ensureLoading()?.find("span").text(text);
  }

  private hideLoading() {
    this.loading?.remove();
    this.loading = undefined;
    $(".common-comment-block.lazy").removeClass("mcmodder-comment-jump-loading-block");
  }

  private clearTimers() {
    window.clearTimeout(this.timer);
    window.clearTimeout(this.timeout);
    this.timer = undefined;
    this.timeout = undefined;
  }

  private completeJump() {
    this.state = "done";
    this.clearTimers();
    this.hideLoading();
  }

  private failJump(message: string) {
    this.state = "failed";
    this.clearTimers();
    this.hideLoading();
    Utils.commonMsg(message, false);
  }

  private startTimeout(message: string, ms = 10000) {
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => {
      if (this.state === "done" || this.state === "failed") return;
      this.failJump(message);
    }, ms);
  }

  private scheduleJumpCheck(delay: number) {
    if (!this.hint || this.state !== "idle") return;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.startJump(), delay);
  }

  private async startJump() {
    if (!this.hint || this.state !== "idle") return;
    const rendered = this.findRenderedTarget();
    if (rendered) {
      this.completeJump();
      this.scrollToTarget(rendered);
      return;
    }
    if (!$(".common-comment-block .comment-floor .comment-row").length) {
      if (++this.waitAttempts <= 20) {
        this.scheduleJumpCheck(500);
        return;
      }
      this.failJump("短评区尚未加载完成，无法定位目标短评。");
      return;
    }
    if (
      typeof comment_container === "undefined" ||
      typeof comment_type === "undefined" ||
      typeof get_comment !== "function"
    ) {
      this.failJump("当前页面没有可用的短评分页接口。");
      return;
    }

    this.state = "locating";
    this.requests = 0;
    this.updateLoading("正在定位短评…");
    try {
      if (this.hint.replyIndex && this.hint.floor) {
        await this.locateReplyTarget();
      } else {
        await this.locateTopLevelTarget();
      }
    } catch (error) {
      if (error instanceof Error && error.message === "COMMENT_JUMP_ABORTED") return;
      if (error instanceof Error && error.message === "COMMENT_JUMP_REQUEST_LIMIT") {
        this.failJump(
          `已超过短评跳转查找请求上限（${this.jumpLimit} 次），已停止查找。可在设置中调整。`,
        );
      } else {
        console.warn("[Mcmodder] 短评跳转失败：", error);
        this.failJump("短评跳转失败，请稍后重试。");
      }
    }
  }

  private async fetchCommentPage(page: number): Promise<CommentJumpPageData | undefined> {
    if (this.isJumpStopped()) throw new Error("COMMENT_JUMP_ABORTED");
    if (this.requests >= this.jumpLimit) throw new Error("COMMENT_JUMP_REQUEST_LIMIT");
    this.requests++;
    this.updateLoading(`正在定位短评（第 ${page} 页）…`);
    const resp = await this.parent.utils.createRequest(
      {
        url: `${this.parent.hostname}/frame/comment/CommentRow/`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Referer: window.location.href.split("#")[0],
        },
        data: new URLSearchParams({
          data: JSON.stringify({
            type: comment_type,
            channel: comment_channel,
            doid: comment_container,
            page,
            selfonly: 0,
          }),
        }).toString(),
      },
      `定位短评：第 ${page} 页`,
      true,
    );
    if (resp.status !== 200 || !resp.responseText) return undefined;
    try {
      const json = JSON.parse(resp.responseText) as {
        state?: number;
        data?: CommentJumpPageData;
      };
      if (json.state !== 0 || !json.data) return undefined;
      return json.data;
    } catch {
      return undefined;
    }
  }

  private async fetchReplyPage(
    parentCid: string,
    page: number,
  ): Promise<CommentJumpPageData | undefined> {
    if (this.isJumpStopped()) throw new Error("COMMENT_JUMP_ABORTED");
    if (this.requests >= this.jumpLimit) throw new Error("COMMENT_JUMP_REQUEST_LIMIT");
    this.requests++;
    this.updateLoading(`正在定位回复（第 ${page} 页）…`);
    const resp = await this.parent.utils.createRequest(
      {
        url: `${this.parent.hostname}/frame/comment/CommentReply/`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Referer: window.location.href.split("#")[0],
        },
        data: new URLSearchParams({
          data: JSON.stringify({ replyID: parentCid, page }),
        }).toString(),
      },
      `定位短评回复：第 ${page} 页`,
      true,
    );
    if (resp.status !== 200 || !resp.responseText) return undefined;
    try {
      const json = JSON.parse(resp.responseText) as {
        state?: number;
        data?: CommentJumpPageData;
      };
      if (json.state !== 0 || !json.data) return undefined;
      return json.data;
    } catch {
      return undefined;
    }
  }

  private async locateTopLevelTarget() {
    if (this.isJumpStopped()) return;
    const hint = this.hint!;
    const first = await this.fetchCommentPage(1);
    if (this.isJumpStopped()) return;
    if (!first) {
      this.failJump("无法获取短评列表。");
      return;
    }
    const firstRows = first.row ?? [];
    if (firstRows.some((row) => String(row.id) === hint.commentId)) {
      // 第 1 页的数据已返回但目标行还没渲染，等 MutationObserver 完成高亮
      this.state = "loadingPage";
      this.startTimeout("目标短评未能显示。");
      return;
    }

    const totalPage = Number(first.page?.total_page ?? 1);
    if (totalPage <= 1) {
      this.failJump("未找到目标短评，可能已被删除或属于楼中楼回复。");
      return;
    }

    const normalFirst = firstRows.filter(
      (row) => CommentJumpController.parseFloor(row.floor) !== undefined,
    );
    const pageSize = Math.max(1, normalFirst.length);
    const maxFloor = normalFirst.reduce(
      (max, row) => Math.max(max, CommentJumpController.parseFloor(row.floor) ?? 0),
      0,
    );
    let lo = 2;
    let hi = totalPage;
    let mid =
      hint.floor && maxFloor > 0
        ? Math.max(2, Math.min(hi, 1 + Math.floor((maxFloor - hint.floor) / pageSize)))
        : Math.floor((lo + hi) / 2);
    const visited = new Set<number>([1]);

    while (lo <= hi) {
      if (visited.has(mid)) mid = Math.floor((lo + hi) / 2);
      if (mid < lo || mid > hi || visited.has(mid)) break;
      visited.add(mid);

      const data = await this.fetchCommentPage(mid);
      if (this.isJumpStopped()) return;
      if (!data) {
        this.failJump("无法获取短评列表。");
        return;
      }
      const rows = (data.row ?? []).filter(
        (row) => CommentJumpController.parseFloor(row.floor) !== undefined,
      );
      if (rows.some((row) => String(row.id) === hint.commentId)) {
        this.jumpToPage(mid);
        return;
      }
      if (rows.length === 0) {
        hi = mid - 1;
      } else {
        const ids = rows.map((row) => Number(row.id));
        const target = Number(hint.commentId);
        if (target > Math.max(...ids)) hi = mid - 1;
        else if (target < Math.min(...ids)) lo = mid + 1;
        else {
          this.failJump("未找到目标短评，可能已被删除或属于楼中楼回复。");
          return;
        }
      }
      mid = Math.floor((lo + hi) / 2);
    }
    this.failJump("未找到目标短评，可能已被删除或属于楼中楼回复。");
  }

  private jumpToPage(page: number) {
    if (this.isJumpStopped()) return;
    this.state = "loadingPage";
    if (Number(comment_nowpage) === page) {
      this.startTimeout("目标短评未能显示。");
      return;
    }
    this.updateLoading(`正在加载第 ${page} 页…`);
    comment_nowpage = page;
    get_comment(comment_container, comment_type);
    this.startTimeout("目标短评所在页加载超时。");
  }

  private async locateReplyTarget() {
    if (this.isJumpStopped()) return;
    const hint = this.hint!;
    const search = await this.locateParentByFloor(hint.floor!);
    if (this.isJumpStopped()) return;
    if (!search) {
      this.failJump(`未找到第 ${hint.floor} 楼的父楼，可能已被删除。`);
      return;
    }

    // 楼层号可能重复（站点历史数据），必须用回复 CID 反查具体父楼
    const match = await this.findReplyParentCandidate(
      hint.floor!,
      hint.commentId,
      hint.replyIndex!,
      search,
    );
    if (this.isJumpStopped()) return;
    if (!match) {
      // 消息中心的链接也可能直接指向父楼；按顶层短评再查一次
      await this.locateTopLevelTarget();
      return;
    }

    const parentCid = String(match.parent.row.id);
    this.jumpParent = {
      cid: parentCid,
      page: match.parent.page,
      replyPage: match.replyPage.page,
    };
    if (Number(comment_nowpage) !== match.parent.page) {
      this.state = "loadingParentPage";
      this.updateLoading(`正在加载第 ${match.parent.page} 页…`);
      comment_nowpage = match.parent.page;
      get_comment(comment_container, comment_type);
      this.startTimeout("父楼所在页加载超时。");
      return;
    }
    this.loadParentReplies();
  }

  /**
   * 在楼层搜索上下文里逐个尝试候选父楼，直到某个父楼的回复页包含目标 CID。
   *
   * 先试二分命中的第一个父楼；失败后从估算页向两侧扫描，覆盖楼层号重复/错位的页面。
   */
  private async findReplyParentCandidate(
    floor: number,
    replyCid: string,
    replyIndex: number,
    search: CommentJumpParentSearch,
  ): Promise<{ parent: CommentJumpTarget; replyPage: CommentJumpTarget } | undefined> {
    const tryParent = async (parent: CommentJumpTarget) => {
      const replyPage = await this.locateReplyPage(String(parent.row.id), replyCid, replyIndex);
      return replyPage ? { parent, replyPage } : undefined;
    };

    if (search.parent) {
      const first = await tryParent(search.parent);
      if (this.isJumpStopped()) return undefined;
      if (first) return first;
    }

    for (let distance = 0; distance < search.totalPage; distance++) {
      const pages =
        distance === 0
          ? [search.estimate]
          : [search.estimate - distance, search.estimate + distance];
      for (const page of pages) {
        if (page < 1 || page > search.totalPage || search.visited.has(page)) continue;
        search.visited.add(page);
        const data = await this.fetchCommentPage(page);
        if (this.isJumpStopped()) return undefined;
        const hits = (data?.row ?? []).filter(
          (row) => CommentJumpController.parseFloor(row.floor) === floor,
        );
        for (const row of hits) {
          const match = await tryParent({ page, row });
          if (this.isJumpStopped()) return undefined;
          if (match) return match;
        }
      }
    }
    return undefined;
  }

  private async locateParentByFloor(floor: number): Promise<CommentJumpParentSearch | undefined> {
    const first = await this.fetchCommentPage(1);
    if (this.isJumpStopped()) return undefined;
    if (!first) return undefined;
    const firstRows = first.row ?? [];
    const totalPage = Number(first.page?.total_page ?? 1);
    const normalFirst = firstRows.filter(
      (row) => CommentJumpController.parseFloor(row.floor) !== undefined,
    );
    const pageSize = Math.max(1, normalFirst.length);
    const maxFloor = normalFirst.reduce(
      (max, row) => Math.max(max, CommentJumpController.parseFloor(row.floor) ?? 0),
      0,
    );
    const estimate =
      totalPage <= 1
        ? 1
        : Math.max(
            2,
            Math.min(
              totalPage,
              maxFloor > 0
                ? 1 + Math.floor((maxFloor - floor) / pageSize)
                : Math.ceil(totalPage / 2),
            ),
          );
    const visited = new Set<number>([1]);
    const firstHit = firstRows.find((row) => CommentJumpController.parseFloor(row.floor) === floor);
    if (firstHit) {
      return { parent: { page: 1, row: firstHit }, estimate, totalPage, visited };
    }
    if (totalPage <= 1) return { estimate, totalPage, visited };

    let lo = 2;
    let hi = totalPage;
    let mid = estimate;
    while (lo <= hi) {
      if (visited.has(mid)) mid = Math.floor((lo + hi) / 2);
      if (mid < lo || mid > hi || visited.has(mid)) break;
      visited.add(mid);

      const data = await this.fetchCommentPage(mid);
      if (this.isJumpStopped()) return undefined;
      if (!data) return undefined;
      const rows = (data.row ?? []).filter(
        (row) => CommentJumpController.parseFloor(row.floor) !== undefined,
      );
      const hit = rows.find((row) => CommentJumpController.parseFloor(row.floor) === floor);
      if (hit) return { parent: { page: mid, row: hit }, estimate, totalPage, visited };

      if (rows.length === 0) {
        hi = mid - 1;
      } else {
        const floors = rows.map((row) => CommentJumpController.parseFloor(row.floor)!);
        const min = Math.min(...floors);
        const max = Math.max(...floors);
        if (floor > max) hi = mid - 1;
        else if (floor < min) lo = mid + 1;
        // 楼层号落在本页区间却没命中：可能错位，交给后续从估算页扫描
        else break;
      }
      mid = Math.floor((lo + hi) / 2);
    }
    return { estimate, totalPage, visited };
  }

  private async locateReplyPage(
    parentCid: string,
    replyCid: string,
    replyIndex: number,
  ): Promise<CommentJumpTarget | undefined> {
    const first = await this.fetchReplyPage(parentCid, 1);
    if (this.isJumpStopped()) return undefined;
    if (!first) return undefined;
    const firstRows = first.row ?? [];
    const firstHit = firstRows.find((row) => String(row.id) === replyCid);
    if (firstHit) return { page: 1, row: firstHit };

    const totalPage = Number(first.page?.total_page ?? 1);
    if (totalPage <= 1) return undefined;
    const totalRow = Number(first.page?.total_row ?? 0);
    const pageSize = Math.max(1, Math.ceil(totalRow / totalPage));
    let lo = 2;
    let hi = totalPage;
    let mid = Math.max(2, Math.min(hi, Math.ceil(replyIndex / pageSize)));
    const visited = new Set<number>([1]);

    while (lo <= hi) {
      if (visited.has(mid)) mid = Math.floor((lo + hi) / 2);
      if (mid < lo || mid > hi || visited.has(mid)) break;
      visited.add(mid);

      const data = await this.fetchReplyPage(parentCid, mid);
      if (this.isJumpStopped()) return undefined;
      if (!data) return undefined;
      const rows = data.row ?? [];
      const hit = rows.find((row) => String(row.id) === replyCid);
      if (hit) return { page: mid, row: hit };

      if (rows.length === 0) {
        hi = mid - 1;
      } else {
        const ids = rows.map((row) => Number(row.id));
        const target = Number(replyCid);
        if (target > Math.max(...ids)) lo = mid + 1;
        else if (target < Math.min(...ids)) hi = mid - 1;
        else {
          for (const probe of [mid - 1, mid + 1]) {
            if (probe < 1 || probe > totalPage || visited.has(probe)) continue;
            visited.add(probe);
            const probeData = await this.fetchReplyPage(parentCid, probe);
            if (this.isJumpStopped()) return undefined;
            const probeHit = (probeData?.row ?? []).find((row) => String(row.id) === replyCid);
            if (probeHit) return { page: probe, row: probeHit };
          }
          return undefined;
        }
      }
      mid = Math.floor((lo + hi) / 2);
    }
    return undefined;
  }

  private loadParentReplies() {
    if (this.state === "done" || this.state === "failed") return;
    const parent = this.jumpParent;
    if (!parent || this.repliesRequested) return;

    const rendered = this.findRenderedTarget();
    if (rendered) {
      this.completeJump();
      this.scrollToTarget(rendered);
      return;
    }

    const $parentInput = $(".common-comment-block .comment-floor input.comment-id")
      .filter((_, element) => String($(element).val() ?? "") === parent.cid)
      .first();
    if (!$parentInput.length) {
      this.failJump("父楼未能显示，可能已被删除或翻页位置已变化。");
      return;
    }
    const $replyFloor = $parentInput.closest(".comment-row").find(".comment-reply-floor").first();
    if (!$replyFloor.length) {
      this.failJump("父楼没有可加载的回复区。");
      return;
    }
    if (typeof get_reply_comment !== "function") {
      this.failJump("当前页面没有可用的楼中楼接口。");
      return;
    }

    this.repliesRequested = true;
    this.state = "loadingReply";
    this.updateLoading(`正在加载第 ${parent.replyPage} 页回复…`);
    get_reply_comment($replyFloor, parent.cid, parent.replyPage, false);
    this.startTimeout("目标回复加载超时。");
  }

  private findRenderedTarget(): JQuery | undefined {
    const cid = this.hint?.commentId;
    if (!cid) return undefined;
    const $input = $(
      ".common-comment-block .comment-floor input.comment-id, .common-comment-block .comment-reply-floor input.comment-id",
    ).filter((_, element) => String($(element).val() ?? "") === cid);
    if (!$input.length) return undefined;
    return $input.first().closest(".comment-row-content, .comment-reply-row");
  }

  private scrollToTarget(target: JQuery) {
    setTimeout(() => {
      const node = target.get(0);
      if (!node?.isConnected) return;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      target.addClass("mcmodder-mark-gold");
      setTimeout(() => target.removeClass("mcmodder-mark-gold"), 2e3);
    }, 8e2);
  }
}
