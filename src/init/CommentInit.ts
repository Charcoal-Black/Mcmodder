import { createApp } from "vue";
import { AttitudeSystem } from "../attitude/AttitudeSystem";
import { Utils } from "../Utils";
import Countdown from "../vue/components/Countdown.vue";
import { TimerUtils } from "../widget/TimerUtils.ts";
import { CommentJumpController } from "./CommentJump";
import { Init } from "./Init";

export class CommentInit extends Init {
  canRun() {
    return !!$(".common-comment-block.lazy").length;
  }

  /** 自定义表态（恶魔安格瑞 + 全 emoji）：全站单例，与消息中心共用计数缓存；浏览公开，发送需认证 */
  private readonly attitude = AttitudeSystem.for(this.parent);

  /** 短评跨页跳转：查找、翻页与 loading 都由它负责 */
  private readonly jump = new CommentJumpController(this.parent, this.configs);

  private displayPublishTime(target: JQuery) {
    target.find(".comment-reply-row-time").each((_, node) => {
      // 同一楼可能被重复处理（见 PROCESSED_ATTR），倒计时只挂一次
      if (node.querySelector(`.${CommentInit.PUBLISH_TIME_CLASS}`)) return;
      const published = CommentInit.parsePublishTime(node.textContent);
      const container = $(`<span class="${CommentInit.PUBLISH_TIME_CLASS}"></span>`)
        .appendTo(node)
        .get(0);
      createApp(Countdown, {
        parent: this.parent,
        dataGetter: published,
        dataFormatter: TimerUtils.DATAFORMATTER_ZH,
      }).mount(container) as InstanceType<typeof Countdown>;
      container.insertAdjacentText("beforebegin", " (");
      container.insertAdjacentText("afterend", ")");
    });
  }

  private promoteAsManager(target: JQuery) {
    const userLv = target.find(".common-user-lv");
    const lv = userLv
      .prop("title")
      .replace(PublicLangData.comment.suffix.mod_admin + " (", "")
      .replace(PublicLangData.comment.suffix.mod_manager + " (", "")
      .replace(PublicLangData.comment.suffix.mod_developer + " (", "")
      .replaceAll(")", "");
    target
      .find(".common-user-lv")
      .attr({
        class: "common-user-lv manager",
        title: `${PublicLangData.comment.suffix.mod_manager} (${lv})`,
        href: "https://t.bilibili.com/779290398405165095",
      })
      .text(PublicLangData.comment.suffix.mod_manager);
  }

  private replaceMobileClientIcon(target: JQuery) {
    const legacy = target.find(".phone");
    if (legacy.length) {
      const icon = $(
        '<i class="mcmodder-mobileclient fa fa-mobile" data-toggle="tooltip" data-original-title="移动端用户">',
      );
      legacy.replaceWith(icon);
      icon.tooltip({});
    }
  }

  private renderPagination() {
    $("ul.pagination.common-pages > span").each((_, _e) => {
      // 站点重渲染翻页条后需要重新注入，已注入过的跳过
      const e = $(_e);
      if (e.hasClass("mcmodder-comment-goto")) return;
      e.addClass("mcmodder-comment-goto");
      const gotopage = $(`<input id="mcmodder-gotopage" class="form-control">`);
      const gotofloor = $(`<input id="mcmodder-gotofloor" class="form-control">`);
      e.append(`快速跳转至：第`, gotopage, `页 / 第`, gotofloor, `楼。`);
      const [currentPage, maxPage] = e.text().replace("当前 ", "").split(" / ").map(Number);
      gotopage.val(currentPage).change(() => {
        const value = parseInt(gotopage.val().trim());
        if (value < 1 || value > maxPage) {
          Utils.commonMsg("请输入一个合法的数值...", false);
          return;
        }
        comment_nowpage = value;
        get_comment(comment_container, comment_type);
      });
      let currentFloor = 1;
      $(".comment-floor")
        .children()
        .each((_, e) => {
          const row = $(e);
          const userinfo = row.find(".comment-row-userinfo");
          if (userinfo.find(".L1").length) return; // 是置顶评论
          const floor = parseInt(userinfo.text()); // xxx楼
          if (Number.isInteger(floor)) {
            currentFloor = Math.max(floor, currentFloor);
            return false;
          }
        });
      gotofloor.val(currentFloor).change(() => {
        const targetFloor = parseInt(gotofloor.val().trim(), 10);
        if (!Number.isInteger(targetFloor) || targetFloor < 1) {
          Utils.commonMsg("请输入一个合法的数值...", false);
          return;
        }
        this.jump.startFloorJump(targetFloor);
      });
    });
  }

  /** 已完成注入的顶层短评行标记：MutationObserver 会因我们自己的异步写入（表态计数、贴纸解析等）再次回调，靠它保证不重复注入 */
  private static readonly PROCESSED_ATTR = "data-mcmodder-comment-processed";
  /** 楼中楼行标记：与顶层楼分用，避免嵌套结构下两级标记互相干扰 */
  private static readonly REPLY_PROCESSED_ATTR = "data-mcmodder-comment-reply-processed";
  /** 发布时间倒计时容器的标记类 */
  private static readonly PUBLISH_TIME_CLASS = "mcmodder-comment-publish-time";

  /** 站点发布时间不带时区，固定按 UTC+8 解析，避免脚本在其它时区运行时倒计时整体偏移 */
  private static parsePublishTime(text: string | null) {
    const match = text?.matchAll(/\d+/g);
    if (!match) return Date.parse(text ?? "");
    const [year, month, day, hour, minute, second] = match;
    return Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) - 8 * 60 * 60 * 1000;
  }

  private readonly commentObserver = new MutationObserver((mutationList) => {
    // 防广告误触发：站点的广告楼层始终单独插入，遇到即跳过整批
    if (mutationList.some((mutation) => CommentInit.isAdFloor(mutation))) return;
    for (const mutation of mutationList) {
      if (mutation.addedNodes.length === 0) continue;
      const commentFloor = $(mutation.target);
      // 投递到我们手上时，该楼层可能已被站点重渲染或整块替换
      if (!commentFloor.get(0)?.isConnected) continue;
      const className = commentFloor.prop("class");
      if (className === "comment-floor" || className === "comment-reply-floor") {
        // 显示短评发布时间：顶层楼与楼中楼都要处理
        this.displayPublishTime(commentFloor);
        if (className === "comment-floor") {
          this.processCommentFloor(commentFloor);
        } else {
          this.processCommentReplyFloor(commentFloor);
        }
      } else if (className === "common-comment-block lazy") {
        this.unlockComment();
        // 整块重渲染（如翻页）时兜底重注入
        void this.attitude.processCommentRows(commentFloor);
      }
    }
  });

  /** 站点单独插入的广告楼层 */
  private static isAdFloor(mutation: MutationRecord) {
    return (Array.from(mutation.addedNodes) as HTMLElement[]).some(
      (e) => e.className === "google-auto-placed",
    );
  }

  private processCommentFloor(commentFloor: JQuery) {
    // 显示快速跳转面板
    this.renderPagination();

    // 自定义表态：注入按钮并刷新这批短评的计数
    void this.attitude.processCommentRows(commentFloor);

    const alertHeight = this.configs.getSettings("missileAlertHeight")!;
    const expandHeight = this.configs.getSettings("commentExpandHeight")!;
    $("div.comment-row-content", commentFloor).each((_, c) => {
      const target = $(c);
      // 本楼已注入过：二次触发时整楼跳过，避免重复追加倒计时、折叠按钮等
      if (target.attr(CommentInit.PROCESSED_ATTR)) return;
      target.attr(CommentInit.PROCESSED_ATTR, "1");

      // 隐藏黑名单用户发布的短评
      const uid = Number(target.find("a.poped").attr("data-uid"));
      if (this.configs.getSettingsAsNumberList("userBlacklist")?.includes(uid)) {
        // 用户屏蔽
        target.parent().remove();
        return;
      }

      // 愚人节特性 全员管理
      if (
        this.configs.getSettings("enableAprilFools") &&
        uid === this.parent.currentUID &&
        this.parent.href.includes("/class/")
      ) {
        this.promoteAsManager(target);
      }

      // 楼中楼快速链接
      this.setReplyLink(target);
      const commentContent = target.find("div.comment-row-text-content.common-text.font14").get(0);
      if (this.configs.getSettings("ignoreEmptyLine")) {
        $(commentContent)
          .children()
          .filter((_, c) => c.innerHTML === "<br>")
          .remove();
      }

      // 补充 展开更多内容 按钮
      const h = commentContent.clientHeight;
      if (h > expandHeight && h < 3e2 && expandHeight < 3e2) {
        $(
          `<a class="fold text-muted"><i class="fas fa-chevron-down"></i>${PublicLangData.comment.fold.down}</a>`,
        ).appendTo(target);
        target.insertBefore(
          target.find("a.fold.text-muted").get(0) /*, target.find("ul.comment-tools").get(0) */,
        );
      }

      // 核弹警告
      if (this.configs.getSettings("missileAlert") && h > alertHeight) {
        target
          .find("a.fold.text-muted")
          .append(
            ` - <span class="mcmodder-slim-danger">核弹警告！</span>本楼展开后将会长达 <span class="mcmodder-common-danger">${h.toLocaleString()} px</span>！`,
          ); // 核弹警告
      }

      // 移动端图标优化
      this.replaceMobileClientIcon(target);
    });

    this.jump.onCommentPageRendered();
  }

  private processCommentReplyFloor(commentFloor: JQuery) {
    void this.attitude.processCommentRows(commentFloor);
    const autoLink = this.configs.getSettings("replyLink");
    $("div.comment-reply-row", commentFloor).each((_, _e) => {
      const e = $(_e);
      if (e.attr(CommentInit.REPLY_PROCESSED_ATTR)) return;
      e.attr(CommentInit.REPLY_PROCESSED_ATTR, "1");
      const uid = Number(e.find("a.poped").attr("data-uid"));
      if (this.configs.getSettingsAsNumberList("userBlacklist")?.includes(uid)) e.remove();
      this.setReplyLink(e);
      if (!autoLink) return;
      const replyContent = e.find("div.comment-reply-row-text-content.common-text.font14").first();
      const rawContent = replyContent.html().replaceAll("<br>", " ");
      let newContent = "";
      for (let i = 0; i < rawContent.length; i++) {
        newContent += rawContent[i].charCodeAt(0) <= 0xff ? rawContent[i] : " ";
      }
      const urlList = newContent.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
      urlList.forEach((item) => {
        replyContent.html(
          replyContent
            .html()
            .replace(item, '<a href="' + item + '" target="_blank">' + item + "</a>"),
        );
      });
    });
  }

  private unlockComment() {
    if ($(".common-comment-block.lazy").length && !$(".comment-close").length) return;
    if (!this.configs.getSettings("unlockComment")) return;
    // 无限制留言板
    const commentClassName = "common-comment-block lazy";
    const messageCenter =
      $(".center-block:last-child()").get(0) ||
      $(".common-comment-block.lazy .comment-editor").get(0) ||
      $(".author-row").get(0);
    const messageBoard = document.getElementsByClassName(commentClassName);
    if (messageCenter && (!messageBoard.length || $(".comment-close").length)) {
      const t1 = document.createElement("div");
      t1.className = commentClassName;
      t1.style = "";
      const t = messageCenter.appendChild(t1);
      Utils.addScript(
        t,
        "comment_channel = '1';comment_user_id = '1';comment_user_editnum = '19732';comment_user_wordnum = '1356802';$(document).ready(function(){$(\".comment-channel-list li a.c1\").click();});",
      );
      $(t).append('<div><ul class="comment-floor"></ul></div>');
      Utils.addScript(
        t,
        `get_comment(comment_container,comment_type);var isUEReady=0;if($(".comment-editor-area .editor-frame").length>0&&0==isUEReady)var ueObj=$.ajax({url:"${this.parent.hostname}/static/ueditor/",async:!0,type:"post",data:{type:"comment"},xhrFields:{withCredentials:true},crossDomain:true,complete:function(e){$(".comment-editor-area .editor-frame .load").html(ueObj.responseText),isUEReady=1}});`,
      );
      if ($(".comment-close").length && $(".comment-dl-tips").length) {
        // messageCenter.insertBefore($(".common-comment-block.lazy", messageCenter).get(0), $(".comment-dl-tips", messageCenter).get(0));
        $(".comment-close").remove();
      }
    }
  }

  private lieqi(target: JQuery) {
    const attitudeList = [
      "fa-thumbs-up",
      "fa-grin-tears",
      "fa-heart",
      "fa-flushed",
      "fa-sad-cry",
      "fa-meh",
      "fa-thumbs-down",
      "fa-lemon",
      "fa-horse-head",
      "fa-heart-broken",
      "fa-angry",
      "fa-tired",
      "fa-snowflake",
      "fa-handshake",
    ];
    attitudeList.forEach((attitude) => {
      target.find(`.${attitude}`).each((_, _e) => {
        const e = $(_e);
        e.removeClass(attitude).addClass("fa-surprise");
        e.parents("[title]").first().attr("title", "猎奇");
      });
    });
  }

  private setReplyLink(target: JQuery) {
    this.jump.notifyCommentRendered(target);
    if (this.configs.getSettings("lieqi")) {
      this.lieqi(target);
    }
  }

  run() {
    if (this.configs.getSettings("commentExpandHeight")) {
      const commentHeight = this.configs.getSettings("commentExpandHeight") || "300";
      Utils.addStyle(`.comment-row-text {max-height: ${commentHeight}px;}`);
    }
    if (this.parent.href.includes("center.mcmod.cn") || this.parent.href.includes("/author/")) {
      this.unlockComment();
    }
    if (this.jump.start()) {
      $(".common-comment-block.lazy").get(0)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
    const commentContainer = $(".common-comment-block.lazy");
    if (commentContainer.length)
      this.commentObserver.observe(commentContainer.get(0), {
        childList: true,
        subtree: true,
      });

    // 自定义表态：绑定工具条事件，并刷新页面上已有的短评
    if (this.configs.getSettings("customAttitude_v2")) {
      this.attitude.bindEvents();
      this.attitude.processCommentRows($(document.body));
    }
  }
}
