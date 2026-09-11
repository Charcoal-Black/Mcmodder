import { HorizontalDraggableFrame } from "../widget/draggable/HorizontalDraggableFrame";
import { TextCompareFrame } from "../widget/compare/TextCompareFrame";
import { McmodderTimer } from "../widget/Timer";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";
import { RelationCompareFrame } from "../widget/compare/RelationCompareFrame";
import { PlatformCompareFrame } from "../widget/compare/PlatformCompareFrame";
import { OredictCompareFrame } from "../widget/compare/OredictCompareFrame";
import { InputList } from "../widget/InputList";
import { McmodderMainText } from "../widget/MainText";

type ParsedOpinion = [number, number, number, number];

export class AdminInit extends McmodderInit {
  private triggered: Set<string> = new Set;
  canRun() {
    return this.parent.href.includes("admin.mcmod.cn");
  }
  run() {
    const adminEntries: Record<string, (mutation: MutationRecord) => void> = {
      "模组区内容审核": _mutation => {
        // 调整排版顺序
        const containerWidgets = $(".container-widget").children();
        containerWidgets.eq(1).insertAfter(containerWidgets.eq(-1));

        const passButtonSelector = "#verify-pass-btn:not(.edit), #assistant-pass-btn";
        const refundButtonSelector = "#verify-refund-btn:not(.edit), #assistant-refund-btn";
        const checkButtonSelector = "#assistant-check-btn";
        const reasonInputSelector = "#verify-reason, #assistant-reason";
        let passButton: JQuery;
        let refundButton: JQuery;
        let checkButton: JQuery;
        let reasonInput: JQuery;
        let verifyContainer: JQuery;
        let verifyWindow: JQuery;
        let verifyFrame: JQuery;
        let verifyWindowDivider: HorizontalDraggableFrame;
        let verifyClassID: number | undefined;
        let prevHeight = 0;
        // let itemID: number | undefined;
        let verifyID: number | undefined;
        let intervalEventID: number | undefined;
        const verifyInfo: Record<string, string> = {};

        // 一键查询待审项
        let work = () => {
          const verifyDelay = this.parent.utils.getConfig("autoVerifyDelay");
          if (verifyDelay && verifyDelay > 1e-2) {
            this.parent.scheduleRequestUtils.deleteByTodo("autoCheckVerify");
            this.parent.scheduleRequestUtils.create(Date.now() + verifyDelay * 60 * 60 * 1000, "autoCheckVerify", this.parent.currentUID);
          }
          $("#mcmodder-check-verification").text("一键查询待审项 (加载中...)").addClass("disabled");
          const menuOptions = $("#class-version-list > option");
          const menuElements = $("ul.dropdown-menu:nth-child(1)").children();
          const modList = menuOptions.toArray()
          .map((e, i) => [Number(e.getAttribute("value")), i])
          .filter(([e, _i]) => e > 0) as [number, number][];
          let t = 0;
          const getUnverifiedNumber = ([id, index]: [number | string | null, number]) => {
            if (id) this.parent.utils.createRequest({
              url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
              data: $.param({ data: JSON.stringify({ classID: id }) })
            })
            .then(resp => {
              const state = JSON.parse(resp.responseText)?.state;
              if (state === undefined || state > 0) {
                console.error("返回状态异常: ", resp);
                return;
              }
              let n = Number($(JSON.parse(resp.responseText).html).find(".selectJump").next().text().slice(4, -2).replaceAll(",", ""));
              if (n > 0 && t === 0) $("button.btn:nth-child(2)").first().click();
              t += n;
              if (n > 0) {
                const li = menuElements.eq(index).addClass("mcmodder-mark-gold");
                const firstChild = li.children().first();
                firstChild.find(".mcmodder-admin-verify-notify").remove();
                firstChild.append(`<span class="mcmodder-admin-verify-notify text-danger">${ n }个待审！</span>`).removeClass("disabled");
              }
              if (modList.length > index + 1) {
                getUnverifiedNumber(modList[++index]);
                return;
              }
              else $("#mcmodder-check-verification").text(`一键查询待审项 (${t}个)`).removeClass("disabled");
            });
          };
          if (modList) getUnverifiedNumber(modList[0]);
        }
        $('<button class="btn" id="mcmodder-check-verification" data-toggle="tooltip" data-original-title="快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。">一键查询待审项</button>')
        .insertAfter(".selectJump.bs3")
        .click(work);
        if (this.parent.utils.getConfig("autoVerifyDelay") >= 1e-2) {
          let t = $(`<span style="margin-left: 10px;">距离自动查询: </span>`).insertAfter("#mcmodder-check-verification");
          (new McmodderTimer(this.parent, McmodderTimer.DATAGETTER_SCHEDULE("autoCheckVerify", this.parent.currentUID, this.parent.scheduleRequestUtils))).$instance.appendTo(t);
        }

        if (!this.triggered.has("模组区内容审核")) {
          this.initAssistantViewed();
          $(document).on("click", ".mcmodder-compare-icon", e => {
            $(e.currentTarget).toggleClass("large");
          })
          .on("click", ".mcmodder-verify-locate", _e => {
            if (verifyID === undefined) {
              McmodderUtils.commonMsg("待审项 ID 获取失败...", false);
              return;
            }
            const tr = this.getEntry(verifyID);
            if (tr.length) {
              McmodderUtils.highlight(tr, "gold", 2e3, true);
            } else {
              McmodderUtils.commonMsg("在当前显示的待审列表中找不到本待审项...", false);
            }
          })
          .on("click", ".assistant-action-btns .action-btn", e => {
            const data = (e.currentTarget as HTMLElement).dataset.data!;
            const id = Number(JSON.parse(data).verifyID);
            this.markEntryAsViewed(id);
            this.getEntry(id).addClass("mcmodder-verify-commented");
          })
          .keydown(e => setTimeout(() => { // 由于swal自身的特性，直接检测会导致连续触发二次确认按钮，这里使用setTimeout
            if (this.parent.isMobileClient) {
              return;
            }
            if (this.parent.utils.isKeyMatchConfig("keybindVerifyCheck", e)) {
              e.stopPropagation();
              checkButton?.click();
            }
            else if (this.parent.utils.isKeyMatchConfig("keybindVerifyPass", e)) {
              e.stopPropagation();
              passButton?.click();
            }
            else if (this.parent.utils.isKeyMatchConfig("keybindVerifyRefund", e)) {
              e.stopPropagation();
              refundButton?.click();
            }
            else if (this.parent.utils.isKeyMatchConfig("keybindVerifyReason", e)) {
              e.preventDefault();
              reasonInput?.focus();
            }
          }, 10));
        }

        // 单项审核界面
        // 分屏
        let singleVerifyCallbackOnSplit: ((mutation: MutationRecord) => void) | undefined;
        const splitScreenOnVerify = this.parent.utils.getConfig("splitScreenOnVerify");
        if (splitScreenOnVerify && !this.parent.isMobileClient) {
          const connectedFrame = document.getElementById("connect-frame");
          if (!connectedFrame) return;
          verifyContainer = $("<div>").appendTo(connectedFrame);
          verifyWindow = $('<div id="mcmodder-verify-window">').appendTo(verifyContainer);
          verifyFrame = $(`<div id="mcmodder-verify-window-frame">`).appendTo(verifyWindow);
          verifyWindowDivider = new HorizontalDraggableFrame({}, connectedFrame)
          .setHorizontalPos(1)
          .bindRight(verifyContainer, true);

          if (!this.triggered.has("模组区内容审核")) {
            const verifyWindowElement = verifyWindow.get(0);
            $(document).scroll(McmodderUtils.throttle(() => {
              const top = document.scrollingElement?.scrollTop;
              const bottom = verifyContainer.prop("scrollHeight") as number;
              if (top != undefined) {
                const height = Math.min(bottom - top, screen.height);
                verifyWindow.css({
                  "margin-top": top + "px",
                  "height": height + "px"
                });
                if (height < prevHeight) {
                  const scrollTopMax = verifyWindowElement.scrollHeight - verifyWindowElement.clientHeight;
                  if (scrollTopMax - verifyWindowElement.scrollTop < 100) {
                    const shift = prevHeight - height;
                    verifyWindowElement.scrollBy({ top: shift });
                  }
                }
                prevHeight = height;
              }
            }, 16));
          }

          // 打开待审项时打开分屏
          $("#connect-frame-sub").on("click", "tr[data-data]", e => {
            verifyFrame.empty().addClass("mcmodder-loading-container").append(`<div class="mcmodder-loading"></div>`);
            verifyWindowDivider.expandIfCollapsed();
            const target = $(e.currentTarget);
            this.mergeChangedOpinions(target);
          });

          singleVerifyCallbackOnSplit = (mutation: MutationRecord) => {
            // 重排版
            verifyFrame.empty().removeClass("mcmodder-loading-container").trigger("scroll");
            $(mutation.target).contents().appendTo(verifyFrame);
            verifyFrame.find("> p:first-child()").next().hide();
            verifyFrame.find("> p:first-child()").append("<span>[展开]</span>").attr("hide", "1").click(e => {
              let t = $(e.currentTarget);
              if (t.attr("hide") === "1") {
                t.attr("hide", "0").next().show();
                t.find("span").html("[折叠]");
              } else {
                t.attr("hide", "1").next().hide();
                t.find("span").html("[展开]");
              }
            });
            verifyFrame.find("> hr").remove();
            verifyFrame.find(".verify-action-btns br").remove();
            verifyFrame.find(".assistant-action-btns br").remove();
          }
        }

        const lastRefundText: Record<number, string> = {};
        const singleVerifyObserver = new MutationObserver(mutationList => {
          for (let mutation of mutationList) {
            if ((mutation.target as HTMLElement).id === "verify-window-frame" &&
            Array.from(mutation.addedNodes).filter(c => c.nodeType === Node.ELEMENT_NODE &&
            (c as HTMLElement).classList.contains("verify-info-table")).length) { // 当所有详情已全部加载完成
              if (singleVerifyCallbackOnSplit) {
                singleVerifyCallbackOnSplit(mutation);
              } else {
                verifyFrame = $("#verify-window-frame");
              }

              // 定位
              try {
                verifyID = verifyFrame.find("#verify-pass-btn, #assistant-pass-btn").data("data").verifyID;
                const p = $(`<p>本待审项 ID = </p>`).prependTo(verifyFrame);
                const id = $(`<span class="mcmodder-slim-dark">${ verifyID }</span>`).appendTo(p);
                McmodderUtils.addClickCopyEvent(id, "本待审项 ID ", verifyID);
                if (splitScreenOnVerify) {
                  p.append(`<a class="mcmodder-verify-locate" title="在待审列表定位本待审项"><i class="fa fa-crosshairs"></i></a>`);
                }
              } catch (e) {
                McmodderUtils.commonMsg("读取待审项 ID 失败: " + String(e), false);
              }

              // 解析基本信息
              let currentPos = 0;
              const verifyInfoText = verifyFrame.children("p").filter((_, p) => p.textContent.startsWith("操作类型")).get(0).firstChild as Text;
              verifyInfoText.data.split("，")
              .forEach(text => {
                const colon = text.indexOf("：");
                if (colon < 0) return;
                const key = text.slice(0, colon);
                const value = text.slice(colon + 1);
                verifyInfo[key] = value;

                // 添加用户个人主页链接
                if (key === "编辑者" && verifyID !== undefined) {
                  const uid = this.getEditor(verifyID);
                  const mid = verifyInfoText.splitText(currentPos + key.length + 1);
                  mid.splitText(value.length);
                  const link = document.createElement("a");
                  link.innerText = value;
                  link.target = "_blank";
                  link.href = McmodderUtils.getCenterURL(uid);
                  mid.replaceWith(link);
                }
                currentPos += text.length + 1;
              });

              // if (info["操作类型"] === "资料修改") {
              //   const tr = $(`#verify-row-${ verifyID }-tr`);
              //   const td = tr.children("td:nth-child(2)");
              //   const itemLink = td.children("a.ignore-parent").attr("href");
              //   itemID = McmodderUtils.abstractIDFromURL(itemLink, "item");
              // }

              passButton = verifyFrame.find(passButtonSelector);
              refundButton = verifyFrame.find(refundButtonSelector);
              checkButton = verifyFrame.find(checkButtonSelector);
              reasonInput = verifyFrame.find(reasonInputSelector);

              if (!this.parent.isMobileClient) {
                passButton.append(" " + McmodderUtils.keyToHTML(this.parent.utils.getConfig("keybindVerifyPass")));
                refundButton.append(" " + McmodderUtils.keyToHTML(this.parent.utils.getConfig("keybindVerifyRefund")));
                checkButton.append(" " + McmodderUtils.keyToHTML(this.parent.utils.getConfig("keybindVerifyCheck")));
                reasonInput.attr("placeholder", `填写附言或退回理由.... (按下 ${
                  McmodderUtils.keyToString(this.parent.utils.getConfig("keybindVerifyReason"))
                } 以快速聚焦)`);
              }

              new InputList(reasonInput, this.parent.utils, "verifyReasons", "；", true)
              .getInstance()
              .css({
                display: "inline-block",
                width: "100%"
              })
              .parent()
              .next()
              .css("margin-top", 0);

              // 正文对比
              verifyFrame.find("#mcmodder-text-area").remove();
              verifyFrame.find(".verify-copy-btn").parent()
              .filter((_, c) => $(c).css("position") === "absolute").remove(); // 移除原版复制按钮

              const appendImgContainer = (_: number, e: Element) => {
                const recipeContainer = $(`<div class="mcmodder-verify-imgcontainer">`).insertBefore(e);
                $(e).appendTo(recipeContainer);
              }
              
              $(".verify-info-table > tbody").contents().each((_, e) => {
                const row = $(e);
                const rowText = e.firstChild?.textContent;
                if (!rowText) return;
                else if (rowText.includes("介绍") || rowText.includes("正文")) {
                  const insertPos = verifyFrame.find(".verify-action-btns, .assistant-action-btns").parent().children().first();
                  let textA = row.children("td:nth-child(3)");
                  let textB = row.children("td:nth-child(2)");
                  const commonTextA = textA.find(".common-text");
                  const commonTextB = textB.find(".common-text");
                  if (commonTextA.length) textA = commonTextA;
                  if (commonTextB.length) textB = commonTextB;
                  if (textA.length && textB.length) {
                    (new TextCompareFrame(insertPos, textA, textB)).performCompare();
                  }
                  new McmodderMainText(this.parent, textA);
                  new McmodderMainText(this.parent, textB);
                }
                else if (rowText === "模组关系") {
                  const prev = row.children("td:nth-child(3)").find(".verify-copy-text");
                  const next = row.children("td:nth-child(2)").find(".verify-copy-text");
                  RelationCompareFrame.performCompare(prev, next);
                }
                else if (rowText === "相关链接") {
                  const prev = row.children("td:nth-child(3)").find(".verify-copy-text");
                  const next = row.children("td:nth-child(2)").find(".verify-copy-text");
                  const addLink = (node: JQuery) => {
                    node.find("p").each((_, p) => {
                      const text = p.textContent;
                      const split = text.indexOf("]");
                      const bracket = text.lastIndexOf(" (");
                      const name = text.slice(1, split);
                      const link = bracket === -1 ? text.slice(split + 1).trim() : text.slice(split + 1, bracket).trim();
                      const desc = bracket === -1 ? "" : ` (${ text.slice(bracket + 2, -1) })`;
                      p.innerHTML = `[${ name }] <a target="_blank" href="${ link }">${ link }</a>${ desc }`;
                    });
                  };
                  addLink(prev);
                  addLink(next);
                }
                else if (rowText === "支持MC版本") {
                  const prev = row.children("td:nth-child(3)").find(".verify-copy-text");
                  const next = row.children("td:nth-child(2)").find(".verify-copy-text");
                  PlatformCompareFrame.performCompare(prev, next);
                }
                else if (rowText === "小图标" || rowText === "大图标") {
                  row.find("img").each((_, _img) => {
                    const img = _img as HTMLImageElement;
                    img.classList.add("mcmodder-compare-icon");
                    const work = () => {
                      const size = img.width;
                      switch (size) {
                        case 32: img.classList.add("item-32px"); break;
                        case 36: img.classList.add("buff-36px"); break;
                        case 128: img.classList.add("item-128px"); break;
                        case 144: img.classList.add("buff-144px"); break;
                      }
                    }
                    if (img.complete) work();
                    else img.onload = () => work();
                  });
                }
                else if (rowText === "来自模组") {
                  if (verifyInfo["操作类型"] !== "资料添加") {
                    return;
                  }
                  const modLink = row.children("td:nth-child(2)").children("a").attr("href");
                  verifyClassID = McmodderUtils.abstractIDFromURL(modLink, "class");
                }
                else if (rowText === "资料类型") {
                  row.children().each((i, e) => {
                    if (i === 0) return;
                    const text = e.textContent;
                    const data = this.parent.utils.getItemTypeData(verifyClassID, text);
                    if (data && verifyClassID) {
                      e.innerHTML = `<a target="_blank" href="${
                        McmodderUtils.getItemTypeURL(verifyClassID, data.typeID)
                      }">${ text }</a>`;
                    }
                  });
                }
                else if (rowText === "矿物词典") {
                  let prev = row.children("td:nth-child(3)");
                  let next = row.children("td:nth-child(2)");
                  if (prev.children(".verify-copy-text").length) prev = prev.children(".verify-copy-text");
                  if (next.children(".verify-copy-text").length) next = next.children(".verify-copy-text");
                  OredictCompareFrame.performCompare(prev, next);
                }
                else if (rowText === "开源许可") {
                  row.find("p").contents().each((_, e) => {
                    if (e.nodeType === Node.TEXT_NODE) {
                      const text = e as any as Text;
                      if (text.data.startsWith(" 【") && text.data.endsWith("】")) {
                        const link = text.data.slice(2, -1);
                        const mid = text.splitText(2);
                        mid.splitText(link.length);
                        const anchor = document.createElement("a");
                        anchor.target = "_blank";
                        anchor.href = link;
                        anchor.innerText = link;
                        mid.replaceWith(anchor);
                      }
                    }
                  })
                }
                else if (rowText === "合成表可视化") {
                  row.find(".TableContainer").each(appendImgContainer);
                }
                else if (rowText === "模组封面") {
                  row.find("img").each(appendImgContainer);
                }
              });

              // 附言缓存
              const verifyId = Number(JSON.parse($("#verify-pass-btn, #assistant-pass-btn").attr("data-data")).verifyID);
              $("#verify-reason, #assistant-reason")
              .val(lastRefundText[verifyId] ?? "")
              .focusout(e => {
                lastRefundText[verifyId] = (e.currentTarget as HTMLInputElement).value;
                if (e.currentTarget.id === "assistant-reason" && verifyID) {
                  this.markEntryAsViewed(verifyID);
                }
              });
            }
            else {
              const table = Array.from(mutation.addedNodes).filter(node => (node as Element).id === "verify-list-table")[0];
              if (table) {
                $(table).children("tbody").children().each((_, e) => {
                  this.checkEntry(e);
                  this.addUserLink(e);
                });
              }
            }
          }
        });
        singleVerifyObserver.observe($("#connect-frame-sub").get(0), { childList: true, subtree: true });

        clearInterval(intervalEventID);
        const interval = this.parent.utils.getConfig("alwaysNotifyVerification") ?? 0;
        if (interval > 0.1) {
          setInterval(() => {
            if ($(".page-header .title").text() != "模组区内容审核") {
              clearInterval(intervalEventID);
              return;
            }
            this.compareAndUpdateVerifyList();
          }, Math.max(interval * 60 * 1e3, 6e3));
        }
      },
      "MC百科后台管理中心": _mutation => {
        $("td:first-child()").each((_, c) => {
          const n = c.textContent;
          c.innerHTML = `<a href="https://center.mcmod.cn/${ n }" target="_blank">${ n }</a>`;
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

  private parseCurrentVerifyListConfig() {
    const typeID = $("#verify-type-list").val() as string;
    const classAddOnly = $("#ignore-manager").is(":checked") ? "1" : "0";
    const userlink = $("#connect-frame-sub .select-row").first().children().last().find("a").first().prop("href");
    const userID = userlink?.slice(24, -1) ?? "0";
    let classID = $("#class-version-list").val() as string;
    if (classID === "0" && typeID !== "0" || userID !== "0") {
      classID = "-1";
    }
    const ignoreManager = "1";
    return userlink ? {
      classID, userID, ignoreManager, classAddOnly, typeID
    } : {
      classID, typeID, classAddOnly, userID
    };
  }

  private async fetchVerifyList() {
    const config = this.parseCurrentVerifyListConfig();
    if (config.classID === "0" && config.userID === "0" && (config.typeID === undefined) || (config.typeID === "0")) {
      return;
    }
    const resp = await this.parent.utils.createRequest({
      url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      data: $.param({ data: JSON.stringify(config) })
    });
    const state = JSON.parse(resp.responseText)?.state;
    if (state === undefined || state > 0) {
      McmodderUtils.commonMsg("待审列表自动更新失败，请检查登录状态和网络环境，或是检查控制台报错...", false);
      console.error("返回状态异常: ", resp);
      return;
    }
    const html = $(JSON.parse(resp.responseText).html);
    return html;
  }
  
  private static readonly opinionMapKey = {
    "通过": 0,
    "退回": 1,
    "检查": 2,
    "等待": 3,
  } as Record<string, number>;

  private static readonly opinionMapName = {
    0: "通过",
    1: "退回",
    2: "检查",
    3: "等待"
  } as Record<number, string>;

  private static readonly opinionMapClassName = {
    0: "text-success",
    1: "text-danger",
    2: "text-warning"
  } as Record<number, string>;

  private getOpinions(elem: JQuery) {
    return elem.find("td:nth-child(2) b.text").filter(e => !$(e).parents(".mcmodder-verify-changedopinions").length);
  }

  private parseOpinions(elem: JQuery): ParsedOpinion {
    const data = elem.toArray().map(e => e.textContent);
    const result: ParsedOpinion = [0, 0, 0, 0];
    data.forEach(e => {
      const value = Number(e.slice(0, -2));
      const name = e.slice(-2);
      const key = AdminInit.opinionMapKey[name];
      if (key !== undefined) {
        result[key] = value;
      }
    });
    return result;
  }

  private renderOpinions(data: ParsedOpinion, showPositiveSign = false) {
    const result: Node[] = [];
    let first = true;
    for (let key = 0; key < 3; key++) {
      if (data[key] === 0) {
        continue;
      }
      const value = data[key];
      const name = AdminInit.opinionMapName[key];
      const className = AdminInit.opinionMapClassName[key];
      if (!first) {
        result.push(document.createTextNode("、"));
      } else {
        first = false;
      }
      const span = document.createElement("b");
      span.classList.add("text");
      if (className != undefined) {
        span.classList.add(className);
      }
      span.innerText = `${ showPositiveSign && value > 0 ? "+" : "" }${ value }${ name }`;
      result.push(span);
    }
    return $(result);
  }

  private async compareAndUpdateVerifyList() {
    const latestHTML = await this.fetchVerifyList();
    if (latestHTML === undefined) {
      return;
    }
    const table = $("#verify-list-table > tbody");
    const latest = latestHTML.find("tbody").children();
    const current = table.children();
    const latestID = latest.toArray().map(e => [this.getVerifyID(e), e] as [number, Element]);
    const currentID = current.toArray().map(e => [this.getVerifyID(e), e] as [number, Element]);
    const latestMap = new Map(latestID);
    const currentMap = new Map(currentID);
    const deleted: number[] = [], inserted: number[] = [];
    latestMap.forEach((e, id) => {
      if (!currentMap.has(id)) inserted.push(id);
      else {
        const latestElement = $(e);
        const currentElement = $(currentMap.get(id)!);
        const latestOpinion = this.parseOpinions(this.getOpinions(latestElement));
        const currentOpinion = this.parseOpinions(this.getOpinions(currentElement));
        const changed: ParsedOpinion = [0, 0, 0, 0];
        let sum = 0;
        for (let i = 0; i < 4; i++) {
          changed[i] = latestOpinion[i] - currentOpinion[i];
          sum += Math.abs(changed[i]);
        }
        currentElement.find(".mcmodder-verify-changedopinions").remove();
        if (sum) {
          const rendered = $(`<span class="mcmodder-verify-changedopinions">[意见变化：<span></span>]</span>`)
            .appendTo(currentElement.find("td:nth-child(2)"));
          this.renderOpinions(changed, true).appendTo(rendered.children());
          currentElement.addClass("mcmodder-verify-newopinion");
        }
        currentElement.removeClass(".mcmodder-verify-deletedentry");
      }
    });
    currentMap.forEach((_, id) => {
      if (!latestMap.has(id)) deleted.push(id);
    });
    inserted.forEach(id => {
      const e = latestMap.get(id)!;
      table.append(e);
      this.checkEntry(e);
      this.addUserLink(e);
    });
    deleted.forEach(id => {
      const e = currentMap.get(id)!;
      e.classList.add("mcmodder-verify-deletedentry");
    });
  }

  private mergeChangedOpinions(target: JQuery) {
    const changed = target.find(".mcmodder-verify-changedopinions");
    const changedText = changed.find("b.text");
    const parsedChanged = this.parseOpinions(changedText);
    const td = changed.parents("td").first();
    const tr = td.parents().first();
    const current = this.parseOpinions(this.getOpinions(tr));
    target.removeClass("mcmodder-verify-newopinion");
    const targetText = "[📚 助理意见：";
    for (let i = 0; i < 4; i++) {
      current[i] += parsedChanged[i];
    }
    changed.remove();
    const node = td.contents().filter((_, e) => e.nodeType === Node.TEXT_NODE && (e as any as Text).data === targetText)[0];
    if (node !== undefined) {
      while (node.nextSibling !== null) {
        node.nextSibling.remove();
      }
      node.previousSibling?.remove();
      node.remove();
    }
    $("<br>").appendTo(td);
    $(document.createTextNode(targetText)).appendTo(td);
    this.renderOpinions(current).appendTo(td);
    $(document.createTextNode("]")).appendTo(td);
  }

  private readonly assistantViewed = this.parent.utils.getAllConfig("assistantViewed", {}) as Record<number, number[]>;
  private readonly assistantViewedSet = new Set<number>();
  
  private initAssistantViewed() {
    const keys = Object.keys(this.assistantViewed).map(Number);
    const time = McmodderUtils.getStartTime(Date.now(), 0);
    keys.forEach(date => {
      if (time - date > 30 * 24 * 60 * 60 * 1e3) {
        delete this.assistantViewed[date];
      } else {
        this.assistantViewed[date].forEach(id => {
          this.assistantViewedSet.add(id);
        });
      }
    });
  }

  private markEntryAsViewed(id: number) {
    const date = McmodderUtils.getStartTime(Date.now(), 0);
    if (this.assistantViewed[date] === undefined) {
      this.assistantViewed[date] = [id];
    } else {
      this.assistantViewed[date].push(id);
    }
    this.assistantViewedSet.add(id);
    this.parent.utils.setAllConfig("assistantViewed", this.assistantViewed);
  }

  private getVerifyID(elem: JQuery | Node) {
    return Number($(elem).attr("id")?.split("-")[2]);
  }

  private getEntry(id: number | string) {
    return $(`#verify-row-${ id }-tr`);
  }

  private checkEntry(elem: JQuery | Node) {
    elem = $(elem);
    const id = this.getVerifyID(elem);
    if (this.assistantViewedSet.has(id)) {
      elem.addClass("mcmodder-verify-commented");
    }
  }

  private addUserLink(elem: JQuery | Node) {
    const userFilter = $(elem).find(".user-online-state");
    const uid = this.getEditor(elem);
    const link = McmodderUtils.getCenterURL(uid);
    $(`
      <span class="ignore-parent" style="display:inline-block;">
        <a href="${ link }" target="_blank">
          <i title="查看个人主页" class="fa fa-home"></i>
        </a>
      </span>
    `)
    .insertAfter(userFilter);
  }

  private getEditor(elem: JQuery | Node | number | string) {
    if (typeof elem === "number" || typeof elem === "string") {
      elem = this.getEntry(elem);
    }
    const userFilter = $(elem).find(".verify-user-filter");
    const uid = Number(userFilter.data("uid"));
    return uid;
  }
}