import { HorizontalDraggableFrame } from "../widget/draggable/HorizontalDraggableFrame";
import { TextCompareFrame } from "../TextCompareFrame";
import { McmodderTimer } from "../widget/Timer";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";

export class AdminInit extends McmodderInit {
  private triggered: Set<string> = new Set;
  canRun() {
    return this.parent.href.includes("admin.mcmod.cn");
  }
  run() {
    const adminEntries: Record<string, (mutation: MutationRecord) => void> = {
      "模组区内容审核": _mutation => {
        // 分屏
        const connectedFrame = document.getElementById("connect-frame");
        if (!connectedFrame) return;
        const verifyContainer = $("<div>").appendTo(connectedFrame);
        const verifyWindow = $('<div id="mcmodder-verify-window">').appendTo(verifyContainer);
        const verifyFrame = $(`<div id="mcmodder-verify-window-frame">`).appendTo(verifyWindow);
        const verifyWindowDivider = new HorizontalDraggableFrame({}, connectedFrame).setHorizontalPos(1).bindRight(verifyContainer, true);

        if (!this.triggered.has("模组区内容审核")) {
          $(document).scroll(McmodderUtils.throttle(() => {
            const top = document.scrollingElement?.scrollTop;
            if (top != undefined) {
              verifyWindow.css("margin-top", top + "px");
            }
          }, 16));
        }

        // 打开待审项时打开分屏
        $("#connect-frame-sub").on("click", "tr[data-data]", _ => {
          verifyFrame.empty();
          verifyWindowDivider.expandIfCollapsed();
        });

        // 调整排版顺序
        const w = $(".container-widget").get(0);
        w.insertBefore(w.childNodes[2], w.childNodes[1]);

        // 一键查询待审项
        let work = () => {
          const verifyDelay = this.parent.utils.getConfig("autoVerifyDelay");
          if (verifyDelay && verifyDelay > 1e-2) {
            this.parent.scheduleRequestUtils.deleteByTodo("autoCheckVerify");
            this.parent.scheduleRequestUtils.create(Date.now() + verifyDelay * 60 * 60 * 1000, "autoCheckVerify", this.parent.currentUID);
          }
          $("#mcmodder-check-verification").text("一键查询待审项 (加载中...)").addClass("disabled");
          const menuList = $("#class-version-list > option");
          const modList = menuList.toArray().map(e => e.getAttribute("value"));
          let index = 1, t = 0;
          const getUnverifiedNumber = (id: number | string | null) => {
            if (id) this.parent.utils.createRequest({
              url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
              data: $.param({ data: JSON.stringify({ classID: id }) }),
              onload: resp => {
                const state = JSON.parse(resp.responseText)?.state;
                if (state === undefined || state > 0) {
                  console.error("返回状态异常: ", resp);
                  return;
                }
                let n = Number($(JSON.parse(resp.responseText).html).find(".selectJump").next().text().slice(4, -2).replaceAll(",", ""));
                if (n > 0 && t === 0) $("button.btn:nth-child(2)").first().click();
                t += n;
                if (n > 0) {
                  const li = $("ul.dropdown-menu:nth-child(1)").children().eq(index).addClass("mcmodder-mark-gold");
                  const firstChild = li.children().first();
                  firstChild.find(".mcmodder-admin-verify-notify").remove();
                  firstChild.append(`<span class="mcmodder-admin-verify-notify text-danger">${ n }个待审！</span>`).removeClass("disabled");
                }
                if (modList.length > index + 1) {
                  getUnverifiedNumber(modList[++index]);
                  return;
                }
                else $("#mcmodder-check-verification").text(`一键查询待审项 (${t}个)`);
              }
            });
          };
          if (modList) getUnverifiedNumber(modList[1]);
        }
        $('<button class="btn" id="mcmodder-check-verification" data-toggle="tooltip" data-original-title="快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。">一键查询待审项</button>').insertAfter(".selectJump.bs3").click(work);
        if (this.parent.utils.getConfig("autoVerifyDelay") >= 1e-2) {
          let t = $(`<span style="margin-left: 10px;">距离自动查询: </span>`).insertAfter("#mcmodder-check-verification");
          (new McmodderTimer(this.parent, McmodderTimer.DATAGETTER_SCHEDULE("autoCheckVerify", this.parent.currentUID, this.parent.scheduleRequestUtils))).$instance.appendTo(t);
        }

        // 单项审核界面
        let lastRefundText: Record<number, string> = {};
        const singleVerifyObserver = new MutationObserver(mutationList => {
          for (let mutation of mutationList) {
            console.log(mutation);
            if ((mutation.target as HTMLElement).id === "verify-window-frame" && $(mutation.addedNodes).filter((_, c) => c.classList.contains("verify-info-table")).length) { // 当所有详情已全部加载完成
              // 重排版
              const target = $(mutation.target);
              target.contents().appendTo(verifyFrame);
              target.find("> p:first-child()").next().hide();
              target.find("> p:first-child()").append("<span>[展开]</span>").attr("hide", "1").click(_ => {
                let t = $("#verify-window-frame > p:first-child()");
                if (t.attr("hide") === "1") {
                  t.attr("hide", "0").next().show();
                  t.find("span").html("[折叠]");
                } else {
                  t.attr("hide", "1").next().hide();
                  t.find("span").html("[展开]");
                }
              });
              target.find("> hr").remove();
              target.find(".verify-action-btns br").remove();
              target.find("#verify-pass-btn:not(.edit)").append(` (${McmodderUtils.key2Str(this.parent.utils.getConfig("keybindVerifyPass"))})`);
              target.find("#verify-refund-btn:not(.edit)").append(` (${McmodderUtils.key2Str(this.parent.utils.getConfig("keybindVerifyRefund"))})`);
              target.find("#verify-reason").attr("placeholder", `填写附言或退回理由.... (按下 ${McmodderUtils.key2Str(this.parent.utils.getConfig("keybindVerifyReason"))} 以快速聚焦)`);
              $(document).keyup(e => { // 由于swal自身的特性，使用keydown会导致连续触发二次确认按钮，这里使用keyup
                if (this.parent.utils.isKeyMatchConfig("keybindVerifyPass", e)) {
                  e.stopPropagation();
                  $("#verify-pass-btn:not(.edit)").click();
                }
                else if (this.parent.utils.isKeyMatchConfig("keybindVerifyRefund", e)) {
                  e.stopPropagation();
                  $("#verify-refund-btn:not(.edit)").click();
                }
                else if (this.parent.utils.isKeyMatchConfig("keybindVerifyReason", e)) {
                  e.preventDefault();
                  $("#verify-reason").focus();
                }
              });

              // 正文对比
              $(".verify-copy-btn").parent().filter((_, c) => $(c).css("position") === "absolute").remove(); // 移除原版复制按钮
              const textTr = $(".verify-info-table > tbody").contents().filter((_, c) => $(c).children().text().includes("介绍"));
              const textA = textTr.find("td:nth-child(3) .common-text");
              const textB = textTr.find("td:nth-child(2) .common-text");
              (new TextCompareFrame($("#verify-window-frame").first(), textA, textB)).performCompare();

              // 附言缓存
              const verifyId = Number(JSON.parse($("#verify-pass-btn").attr("data-data")).verifyID);
              $("#verify-reason")
              .val(lastRefundText[verifyId] || "")
              .focusout(e => {
                lastRefundText[verifyId] = (e.currentTarget as HTMLInputElement).value;
              });
            }
          }
        });
        singleVerifyObserver.observe($("#connect-frame-sub").get(0), { childList: true, subtree: true });
      },
      "MC百科后台管理中心": _mutation => {
        $("td:first-child()").each((_, c) => {
          const n = c.textContent;
          c.innerHTML = `<a href="https://www.mcmod.cn/center/${ n }" target="_blank">${ n }</a>`;
        })
      },
      "样式管理": _mutation => {
        const styleEditObserver = new MutationObserver(mutationList => {
          for (let mutation of mutationList) {
            if (!(mutation.addedNodes.length > 7 || mutation.removedNodes.length > 7) || $(".item-list-table").length) return;
            // const preview = $('<table class="table table-bordered item-list-table item-list-table-1"><thead><tr><th colspan="3"><span class="title"><a target="_blank" href="//www.mcmod.cn/class/8.html">[M3]更多喵呜机 (More Meowing Machinery)</a> 的 物品/方块 资料 (预览)</span></th></tr></thead><tbody><tr><th class="item-list-type-left" style="padding: 0px">一级分类</th><th class="item-list-type-left" style="padding: 0px">二级分类</th><td class="item-list-type-right" style="padding: 0px"><ul><li><span><a href="/item/5281.html" target="_blank"><img class="icon" alt="锡矿石" src="//i.mcmod.cn/item/icon/32x32/0/5281.png?v=3" width="15" height="15"></a><a href="/item/5281.html" target="_blank" >锡矿石</a></span></li><li><span><a href="//www.mcmod.cn/item/40226.html" target="_blank"><img class="icon" alt="锇矿石" src="//i.mcmod.cn/item/icon/32x32/4/40226.png?v=5" width="15" height="15"></a><a href="//www.mcmod.cn/item/40226.html" target="_blank" >锇矿石</a></span></li><li><span><a href="/item/40227.html" target="_blank"><img class="icon" alt="铜矿石" src="//i.mcmod.cn/item/icon/32x32/4/40227.png?v=3" width="15" height="15"></a><a href="//www.mcmod.cn/item/40227.html" target="_blank" >铜矿石</a></span></li><li><span><a href="/item/40337.html" target="_blank"><img class="icon alt="盐块" src="//i.mcmod.cn/item/icon/32x32/4/40337.png?v=2" width="15" height="15"></a><a href="//www.mcmod.cn/item/40337.html" target="_blank" >盐块</a></span></li></ul></td></tr></tbody></table>').insertBefore($(".table-condensed").get(1));
            McmodderUtils.addStyle('', "mcmodder-style-preview");

            if (this.parent.utils.getConfig("itemListStyleFix")) {
              const h = $("#connect-frame-sub script").html() + "//end";
              $("#itemlist-head-th").val(h.split('$("#itemlist-head-th").val("')[1].split('");$("#itemlist-body-th").val("')[0].replaceAll("\\n", "\n"));
              $("#itemlist-body-th").val(h.split('");$("#itemlist-body-th").val("')[1].split('");$("#itemlist-body-td").val("')[0].replaceAll("\\n", "\n"));
              $("#itemlist-body-td").val(h.split('");$("#itemlist-body-td").val("')[1].split('");//end')[0].replaceAll("\\n", "\n"));
            }
            $("#connect-frame-sub textarea").addClass("mcmodder-monospace");
            if (this.parent.utils.getConfig("itemListStylePreview")) {
              $("textarea.style-box").each(function () {
                $(this).bind("change", function () {
                  const t = (c: string) => $(c).val().replace(/<!--[\s\S]*?-->/g, "");
                  const titleStyle = t("#itemlist-head-th");
                  const categoryStyle = t("#itemlist-body-th");
                  const itemListStyle = t("#itemlist-body-td");
                  $("#mcmodder-style-preview").html(`table.item-list-table.item-list-table-1 {table-layout: auto}.item-list-table.item-list-table-1 thead th {${titleStyle}}.item-list-table.item-list-table-1 thead th * {color:inherit}.item-list-table.item-list-table-1 thead th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody th {${categoryStyle}}.item-list-table.item-list-table-1 tbody th * {color:inherit}.item-list-table.item-list-table-1 tbody th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody td {${itemListStyle}}.item-list-table.item-list-table-1 tbody td * {color:inherit}.item-list-table.item-list-table-1 tbody td th {${categoryStyle}}.item-list-table.item-list-table-1 tbody td a:hover {color:inherit; opacity:.75}.item-list-table th,.item-list-table td {border-color:#DADADA}.item-list-table {position:relative; margin-bottom:10px}.item-list-table .title {width:100%; margin:0; line-height:30px; font-size:14px; font-weight:bold; text-align:center; display:block}.item-list-table th {background-color:#f9f9f9; font-size:14px; color:#222}.item-list-table .item-list-type-left {width:100px; text-align:center; vertical-align:middle; font-size:12px}.item-list-table .item-list-type-right ul {width:100%; display:block}.item-list-table .item-list-type-right li {display:inline-block; margin-right:10px; font-size:14px}.item-list-table .item-list-type-right li img {margin-right:5px}.item-list-table .item-list-type-right li .null {color:#F30}.item-list-table .item-list-type-right li .null:hover {color:#222}.item-list-table .empty td {line-height:120px; font-size:14px; text-align:center; color:#777}.item-list-table .item-list-type-right li .more {color:#777}.item-list-table .item-list-type-right li .more:hover {color:#222}.item-list-table .item-list-type-right li .more i {margin-right:5px}.item-list-table .title a {text-decoration:underline; text-transform: none;}.item-list-table td {padding:0}.item-list-type-right ul {padding:.75rem}.item-list-table table {width:100%}.item-list-table table td {border-bottom:0; border-right:0}.item-list-table table th {border-bottom:0; border-left:0}.item-list-table:last-child {margin-bottom:0}.item-list-type-right .loading {position:absolute}.item-list-style-setting {text-align:right; font-size:12px; line-height:30px; position:absolute; bottom:-5px; right:5px}.item-list-style-setting i {margin-right:5px}.item-list-style-setting a {color:#99a2aa}.item-list-style-setting a:hover {color:#222}.item-list-branch-frame {width:100%; margin-bottom:10px}.item-list-branch-frame li {display:inline-block; margin-right:5px}.item-list-switch,.item-list-switch-fold {position:absolute; right:10px; top:8px}.item-list-switch-fold {right:auto; left:10px}.item-list-switch li,.item-list-switch-fold {display:inline-block; margin-left:10px; color:#99a2aa}.item-list-pages {padding:0; margin:0}.item-list-pages ul {margin-bottom:10px}@media(max-width:990px) {.item-list-style-setting { position:inherit;  bottom:0 }}@media(max-width:980px) {.item-list-switch { top:-10px }}@media(max-width:720px) {.item-list-switch-fold { top:25px }}@media(max-width:460px) {.item-list-table .item-list-type-left { width:80px;  padding:5px }}@media(max-width:360px) {.item-list-table .item-list-type-left { width:50px;  padding:5px }}@media(max-width:260px) {.item-list-table .item-list-type-left { width:0;  padding:5px }}`);
                });
              });
            }
            $("textarea.style-box").trigger("change");
          }
        });
        styleEditObserver.observe($("div#connect-frame-sub").get(0), { childList: true });
      },
      "GUI管理": _mutation => {
        const guiAdminObserver = new MutationObserver(mutationList => {
          for (let mutation of mutationList) {
            if ((mutation.addedNodes[0] as HTMLElement)?.id === "class-gui-table") {
              $("#class-gui-table td:nth-child(4) > *:not(.btn)").css("background-color", "transparent");
            }
          }
        });
        guiAdminObserver.observe($("div#connect-frame-sub").get(0), { childList: true });
      }
    };
    const adminObserver = new MutationObserver(mutationList => {
      for (let mutation of mutationList) {
        let title = $("#connect-frame > div.page-header > h1.title").first().text();
        if (adminEntries[title]) {
          adminEntries[title](mutation);
          this.triggered.add(title);
        }
      }
    });
    adminObserver.observe($(".connect-area").get(0), { childList: true });
  }
}