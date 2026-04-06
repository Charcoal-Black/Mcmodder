import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class CommentInit extends McmodderInit {
  canRun() {
    return !!$(".common-comment-block.lazy").length;
  }

  private displayPublishTime(target: JQuery) {
    target.find(".comment-reply-row-time").each((_, time) => {
      time.append(` (${ (time as HTMLElement).title })`);
    })
  }

  private promoteAsManager(target: JQuery) {
    const userLv = target.find(".common-user-lv");
    const lv = userLv.prop("title")
    .replace(PublicLangData.comment.suffix.mod_admin + " (", "")
    .replace(PublicLangData.comment.suffix.mod_manager + " (", "")
    .replace(PublicLangData.comment.suffix.mod_developer + " (", "")
    .replaceAll(")", "");
    target.find(".common-user-lv")
    .attr({ "class": "common-user-lv manager", "title": `${ PublicLangData.comment.suffix.mod_manager } (${ lv })`, "href": "https://t.bilibili.com/779290398405165095" })
    .text(PublicLangData.comment.suffix.mod_manager);
  }

  private renderPagination() {
    $("ul.pagination.common-pages > span").each((_, e) => {
      e.innerHTML += '快速跳转至：第&nbsp;<input id="mcmodder-gotopage" class="form-control">&nbsp;页。';
      $(e).find("#mcmodder-gotopage").val(e.textContent.replace("当前 ", "").split(" / ")[0]).bind("change", f => {
        const target = f.currentTarget as HTMLInputElement;
        const value = parseInt(target.value);
        if (value < 1 || value > parseInt(target.textContent.replace("当前 ", "").split(" / ")[1])) {
          return;
        }
        comment_nowpage = value;
        get_comment(comment_container, comment_type);
      });
    });
  }

  private readonly commentObserver = new MutationObserver(mutationList => {
    for (let mutation of mutationList) {
      const commentFloor = $(mutation.target);
      const className = commentFloor.prop("class");
      if ((className === "comment-floor" || className === "comment-reply-floor") && mutation.addedNodes.length > 0) {
        // 防广告误触发
        if ((Array.from(mutation.addedNodes) as HTMLElement[]).map(e => e.className).includes("google-auto-placed")) {
          return;
        }

        // 显示短评发布时间
        this.displayPublishTime(commentFloor);

        if (className === "comment-floor") {
          // 显示快速跳转面板
          this.renderPagination();

          const alertHeight = this.parent.utils.getConfig("missileAlertHeight");
          const expandHeight = this.parent.utils.getConfig("commentExpandHeight");
          $("div.comment-row-content", mutation.target).each((_, c) => {
            // 隐藏黑名单用户发布的短评
            const target = $(c);
            const uid = Number(target.find("a.poped").attr("data-uid"));
            if (this.parent.utils.getConfigAsNumberList("userBlacklist").includes(uid)) { // 用户屏蔽
              target.parent().remove();
              return;
            }

            // 愚人节特性 全员管理
            if (this.parent.utils.getConfig("enableAprilFools") && 
                uid === this.parent.currentUID && 
                this.parent.href.includes("/class/")) {
              this.promoteAsManager(target);
            }

            // 楼中楼快速链接
            this.setReplyLink(target);
            const commentContent = target.find("div.comment-row-text-content.common-text.font14").get(0);
            if (this.parent.utils.getConfig("ignoreEmptyLine")) {
              $(commentContent).children().filter((_, c) => c.innerHTML === "<br>").remove();
            }

            // 补充 展开更多内容 按钮
            const h = commentContent.clientHeight;
            if (h > expandHeight && h < 3e2 && expandHeight < 3e2) {
              $(`<a class="fold text-muted"><i class="fas fa-chevron-down"></i>${ PublicLangData.comment.fold.down }</a>`).appendTo(target);
              target.insertBefore(target.find("a.fold.text-muted").get(0)/*, target.find("ul.comment-tools").get(0) */);
            }
            
            // 核弹警告
            if (this.parent.utils.getConfig("missileAlert") && h > alertHeight) {
              target.find("a.fold.text-muted")
              .append(` - <span class="mcmodder-slim-danger">核弹警告！</span>本楼展开后将会长达 <span class="mcmodder-common-danger">${ h.toLocaleString() } px</span>！`); // 核弹警告
            }
          });
        }
        else if (className === "comment-reply-floor" && this.parent.utils.getConfig("replyLink")) {
          $("div.comment-reply-row", mutation.target).each((_, _e) => {
            const e = $(_e);
            const uid = Number(e.find("a.poped").attr("data-uid"));
            if (this.parent.utils.getConfigAsNumberList("userBlacklist").includes(uid)) e.remove();
            this.setReplyLink(e);
            const replyContent = e.find("div.comment-reply-row-text-content.common-text.font14").first();
            const rawContent = replyContent.html().replaceAll("<br>", " ");
            let newContent = "";
            for (let i = 0; i < rawContent.length; i++) {
              newContent += (rawContent[i].charCodeAt(0) <= 0xff) ? rawContent[i] : " ";
            }
            let urlList = newContent.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
            urlList.forEach(item => {
              replyContent.html(replyContent.html().replace(item, '<a href="' + item + '" target="_blank">' + item + '</a>'));
            })
          });
        }
      }
      else if (className === "common-comment-block lazy" && mutation.addedNodes.length > 0) {
        this.unlockComment();
      }
    }
  });

  private unlockComment() {
    if ($(".common-comment-block.lazy").length && !$(".comment-close").length) return;
    if (!this.parent.utils.getConfig("unlockComment")) return;
    // 无限制留言板
    const commentClassName = "common-comment-block lazy";
    let messageCenter = $(".center-block:last-child()").get(0) || $(".common-comment-block.lazy .comment-editor").get(0) || $(".author-row").get(0);
    let messageBoard = document.getElementsByClassName(commentClassName);
    if (messageCenter && (!messageBoard.length || $(".comment-close").length)) {
      const t1 = document.createElement("div");
      t1.className = commentClassName;
      t1.style = "";
      const t = messageCenter.appendChild(t1);
      McmodderUtils.addScript(t, "comment_channel = '1';comment_user_id = '1';comment_user_editnum = '19732';comment_user_wordnum = '1356802';$(document).ready(function(){$(\".comment-channel-list li a.c1\").click();});");
      $(t).append('<div><ul class="comment-floor"></ul></div>');
      McmodderUtils.addScript(t, "get_comment(comment_container,comment_type);var isUEReady=0;if($(\".comment-editor-area .editor-frame\").length>0&&0==isUEReady)var ueObj=$.ajax({url:\"//www.mcmod.cn/static/ueditor/\",async:!0,type:\"post\",data:{type:\"comment\"},xhrFields:{withCredentials:true},crossDomain:true,complete:function(e){$(\".comment-editor-area .editor-frame .load\").html(ueObj.responseText),isUEReady=1}});");
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
      "fa-thumbs-down",
      "fa-lemon",
      "fa-horse-head",
      "fa-heart-broken",
      "fa-angry",
      "fa-tired",
      "fa-snowflake",
      "fa-handshake"
    ]
    attitudeList.forEach(attitude => {
      target.find(`.${ attitude }`).each(_e => {
        const e = $(_e);
        e.removeClass(attitude).addClass("fa-surprise");
        e.parents("[title]").first().attr("title", "猎奇");
      });
    });
  }

  private setReplyLink(target: JQuery) {
    if (target.find("input.comment-id").val() === this.parent.href.split("comment-")[1]) {
      setTimeout(() => {
        target.get(0).scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.addClass("mcmodder-mark-gold");
        setTimeout(() => target.removeClass("mcmodder-mark-gold"), 2e3);
      }, 8e2);
    }
    if (this.parent.utils.getConfig("lieqi")) {
      this.lieqi(target);
    }
  }

  run() {
    if (this.parent.utils.getConfig("commentExpandHeight")) {
      let commentHeight = this.parent.utils.getConfig("commentExpandHeight") || "300";
      McmodderUtils.addStyle(`.comment-row-text {max-height: ${ commentHeight }px;}`);
    }
    if (this.parent.href.includes("center.mcmod.cn") || this.parent.href.includes("/author/")) {
      this.unlockComment();
    }
    if (this.parent.href.includes("#comment-")) {
      $(".common-comment-block.lazy").get(0)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
    const commentContainer = $(".common-comment-block.lazy");
    if (commentContainer.length) this.commentObserver.observe(commentContainer.get(0), {
      childList: true,
      subtree: true
    });
  }
}