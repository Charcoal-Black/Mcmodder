import { createApp, ref, type App, type ShallowRef } from "vue";
import { HorizontalDraggableFrame } from "../../widget/draggable/HorizontalDraggableFrame";
import Countdown from "../../vue/components/Countdown.vue";
import { TimerUtils } from "../../widget/TimerUtils.ts";
import { Utils } from "../../Utils.ts";
import type { Mcmodder } from "../../Mcmodder.ts";
import { InputListController } from "../../widget/InputListController.ts";
import { OredictCompareFrame } from "../../widget/compare/OredictCompareFrame.ts";
import { PlatformCompareFrame } from "../../widget/compare/PlatformCompareFrame.ts";
import { RelationCompareFrame } from "../../widget/compare/RelationCompareFrame.ts";
import { MainText } from "../../widget/MainText.ts";
import TextComparator from "../../vue/components/TextComparator.vue";
import { AdminBaseInit } from "./AdminBaseInit.ts";

type ParsedOpinion = [number, number, number, number];

export class AdminVerifyInit extends AdminBaseInit {
  private static readonly passButtonSelector = "#verify-pass-btn:not(.edit), #assistant-pass-btn";
  private static readonly refundButtonSelector =
    "#verify-refund-btn:not(.edit), #assistant-refund-btn";
  private static readonly checkButtonSelector = "#assistant-check-btn";
  private static readonly reasonInputSelector = "#verify-reason, #assistant-reason";

  private readonly splitScreenOnVerify: boolean;
  private readonly lastRefundText: Record<number, string> = {};
  private verifyContainer?: JQuery;
  private verifyWindow?: JQuery;
  private verifyFrame?: JQuery;
  private verifyWindowDivider?: HorizontalDraggableFrame;
  private passButton?: JQuery;
  private refundButton?: JQuery;
  private checkButton?: JQuery;
  private reasonInput?: JQuery;
  private prevHeight = 0;
  private verifyID: number | undefined;
  private singleVerifyCallbackOnSplit: ((mutation: MutationRecord) => void) | undefined;
  /** 分屏容器等只需挂载一次的节点是否已创建 */
  private frameMounted = false;
  /** 待审列表自动查询的定时器句柄，用于重进页面时替换旧定时器 */
  private notifyTimer?: number;
  /** 挂载在审核窗内、仅创建一个实例的正文对比组件（`TextComparator`） */
  private textComparator?: App;
  /** 正文对比组件的挂载点，每次加载待审项后被重新插回审核按钮之前 */
  private comparatorContainer?: HTMLElement;
  /** 正文对比组件当前读取的编辑前后正文（`modifyMainText` 写，`mountTextComparator` 读） */
  private readonly comparatorTextA: ShallowRef<JQuery> = ref($());
  private readonly comparatorTextB: ShallowRef<JQuery> = ref($());
  /** 传给组件的正文来源，组件据此在原地刷新对比结果 */
  private get comparatorTexts(): { textA: ShallowRef<JQuery>; textB: ShallowRef<JQuery> } {
    return { textA: this.comparatorTextA, textB: this.comparatorTextB };
  }
  private set comparatorTexts(texts: { textA: JQuery; textB: JQuery }) {
    this.comparatorTextA.value = texts.textA;
    this.comparatorTextB.value = texts.textB;
  }
  private get enableSplit() {
    return this.splitScreenOnVerify && !this.parent.isMobileClient;
  }

  /**
   * 主站通用快捷搜索功能下方的一段待审项基本信息，包括：
   * - 操作类型：[模组/资料/合成表/教程/作者][添加/修改/删除]
   * - 编辑者：只显示昵称，不包含 UID
   * - 最后提交时间：以「YYYY-MM-DD hh:mm:ss (...前)」的格式展示
   */
  private verifyInfo: Record<string, string> = {};

  private verifyClassID: number | undefined;

  constructor(parent: Mcmodder) {
    super(parent);
    this.assistantViewed = this.configs.getAll("assistantViewed") ?? {};
    this.assistantViewedSet = new Set<number>();
    this.splitScreenOnVerify = this.configs.getSettings("splitScreenOnVerify") ?? false;
  }

  override getTriggerTitle() {
    return "模组区内容审核";
  }

  run() {
    this.rearrange();

    this.verifyClassID = undefined;
    this.prevHeight = 0;

    // 分屏窗口、分隔条、委托事件均为一次性挂载，重进页面时复用旧节点，避免重复叠加
    this.singleVerifyCallbackOnSplit = undefined;
    // 分屏窗口所在节点被宿主替换时（重新登录、后台整体刷新），旧的已失效，需要重新挂载
    if (this.frameMounted && this.verifyContainer?.get(0).isConnected === false) {
      this.frameMounted = false;
      this.textComparator?.unmount();
      this.textComparator = undefined;
    }
    if (this.enableSplit && !this.frameMounted) {
      const connectedFrame = document.getElementById("connect-frame");
      if (!connectedFrame) return;
      this.verifyContainer = $("<div>").appendTo(connectedFrame);
      this.verifyWindow = $('<div id="mcmodder-verify-window">').appendTo(this.verifyContainer);
      this.verifyFrame = $(`<div id="mcmodder-verify-window-frame">`).appendTo(this.verifyWindow);
      this.verifyWindowDivider = new HorizontalDraggableFrame(
        "verifyWindowDivider",
        this.configs,
        {},
        connectedFrame,
      )
        .setHorizontalPos(1)
        .bindRight(this.verifyContainer, true);
      this.frameMounted = true;

      // 打开待审项时打开分屏
      $("#connect-frame-sub").on("click", "tr[data-data]", (e) => {
        this.verifyFrame!.empty()
          .addClass("mcmodder-loading-container")
          .append(`<div class="mcmodder-loading"></div>`);
        this.verifyWindowDivider!.expandIfCollapsed();
        const target = $(e.currentTarget);
        this.mergeChangedOpinions(target);
      });

      this.singleVerifyCallbackOnSplit = (mutation: MutationRecord) => {
        // 重排版
        if (!this.verifyFrame) return;
        this.verifyFrame.empty().removeClass("mcmodder-loading-container");
        $(mutation.target).contents().appendTo(this.verifyFrame);
        this.verifyFrame.find("> p:first-child()").next().hide();
        this.verifyFrame
          .find("> p:first-child()")
          .append("<span>[展开]</span>")
          .attr("hide", "1")
          .click((e) => {
            const t = $(e.currentTarget);
            if (t.attr("hide") === "1") {
              t.attr("hide", "0").next().show();
              t.find("span").html("[折叠]");
            } else {
              t.attr("hide", "1").next().hide();
              t.find("span").html("[展开]");
            }
          });
        this.verifyFrame.find("> hr").remove();
        this.verifyFrame.find(".verify-action-btns br").remove();
        this.verifyFrame.find(".assistant-action-btns br").remove();
        // setTimeout(() => {
        window.dispatchEvent(new Event("scroll"));
        // }, 100);
      };
    }

    this.singleVerifyObserver.observe($("#connect-frame-sub").get(0), {
      childList: true,
      subtree: true,
    });

    if (!$("#mcmodder-check-verification").length) {
      this.appendCheckButton();
    }

    const interval = this.configs.getSettings("alwaysNotifyVerification") ?? 0;
    if (interval > 0.1) {
      clearInterval(this.notifyTimer);
      this.notifyTimer = window.setInterval(
        () => {
          if ($(".page-header .title").text() != "模组区内容审核") {
            return;
          }
          this.compareAndUpdateVerifyList();
        },
        Math.max(interval * 60 * 1e3, 6e3),
      );
    }
  }

  override firstRun() {
    if (this.enableSplit) {
      const verifyWindowElement = this.verifyWindow!.get(0);
      window.addEventListener(
        "scroll",
        Utils.animationThrottle(() => {
          const top = document.scrollingElement?.scrollTop;
          const bottom = this.verifyContainer!.prop("scrollHeight") as number;
          if (top != undefined) {
            const height = Math.min(bottom - top, screen.height);
            this.verifyWindow!.css({
              "margin-top": top + "px",
              height: height + "px",
            });
            if (height < this.prevHeight) {
              const scrollTopMax =
                verifyWindowElement.scrollHeight - verifyWindowElement.clientHeight;
              if (scrollTopMax - verifyWindowElement.scrollTop < 100) {
                const shift = this.prevHeight - height;
                verifyWindowElement.scrollBy({ top: shift });
              }
            }
            this.prevHeight = height;
          }
        }),
        {
          passive: true,
        },
      );
      $(document).on("click", ".mcmodder-verify-locate", () => {
        if (this.verifyID === undefined) {
          Utils.commonMsg("待审项 ID 获取失败...", false);
          return;
        }
        const tr = this.getEntry(this.verifyID);
        if (tr.length) {
          Utils.highlight(tr, "gold", 2e3, true);
        } else {
          Utils.commonMsg("在当前显示的待审列表中找不到本待审项...", false);
        }
      });
    }

    this.initAssistantViewed();
    $(document)
      .on("click", ".mcmodder-compare-icon", (e) => {
        $(e.currentTarget).toggleClass("large");
      })
      .on("click", ".assistant-action-btns .action-btn", (e) => {
        const data = (e.currentTarget as HTMLElement).dataset.data;
        if (!data) {
          return;
        }
        const id = Number(JSON.parse(data).verifyID);
        this.markEntryAsViewed(id);
        this.getEntry(id).addClass("mcmodder-verify-commented");
      })
      .keydown((e) =>
        setTimeout(() => {
          // 由于swal自身的特性，直接检测会导致连续触发二次确认按钮，这里使用setTimeout
          if (this.parent.isMobileClient) {
            return;
          }
          if (this.parent.utils.isKeyMatchConfig("keybindVerifyCheck", e)) {
            e.stopPropagation();
            this.checkButton?.click();
          } else if (this.parent.utils.isKeyMatchConfig("keybindVerifyPass", e)) {
            e.stopPropagation();
            this.passButton?.click();
          } else if (this.parent.utils.isKeyMatchConfig("keybindVerifyRefund", e)) {
            e.stopPropagation();
            this.refundButton?.click();
          } else if (this.parent.utils.isKeyMatchConfig("keybindVerifyReason", e)) {
            e.preventDefault();
            this.reasonInput?.focus();
          }
        }, 10),
      );
  }

  private readonly singleVerifyObserver = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (
        (mutation.target as HTMLElement).id === "verify-window-frame" &&
        Array.from(mutation.addedNodes).filter(
          (c) =>
            c.nodeType === Node.ELEMENT_NODE &&
            (c as HTMLElement).classList.contains("verify-info-table"),
        ).length
      ) {
        // 当所有详情已全部加载完成
        if (this.singleVerifyCallbackOnSplit) {
          this.singleVerifyCallbackOnSplit(mutation);
        } else {
          this.verifyFrame = $("#verify-window-frame");
        }
        this.onVerifyContentsLoaded();
      } else {
        const table = Array.from(mutation.addedNodes).filter(
          (node) => (node as Element).id === "verify-list-table",
        )[0];
        if (table) {
          $(table)
            .children("tbody")
            .children()
            .each((_, e) => {
              this.checkEntry(e);
              this.addUserLink(e);
            });
        }
      }
    }
  });

  /** 每次审核信息全部加载完成后所触发的回调。 */
  private onVerifyContentsLoaded() {
    // 定位
    try {
      this.verifyID = this.verifyFrame!.find("#verify-pass-btn, #assistant-pass-btn").data(
        "data",
      ).verifyID;
      const p = $(`<p>本待审项 ID = </p>`).prependTo(this.verifyFrame!);
      const id = $(`<span class="mcmodder-slim-dark">${this.verifyID}</span>`).appendTo(p);
      Utils.addClickCopyEvent(id, "本待审项 ID ", this.verifyID);
      if (this.splitScreenOnVerify) {
        p.append(
          `<a class="mcmodder-verify-locate" title="在待审列表定位本待审项"><i class="fa fa-crosshairs"></i></a>`,
        );
      }
    } catch (e) {
      Utils.commonMsg("读取待审项 ID 失败: " + String(e), false);
    }

    // 解析基本信息
    this.verifyInfo = this.parseVerifyInfo();

    // if (info["操作类型"] === "资料修改") {
    //   const tr = $(`#verify-row-${ verifyID }-tr`);
    //   const td = tr.children("td:nth-child(2)");
    //   const itemLink = td.children("a.ignore-parent").attr("href");
    //   itemID = McmodderUtils.abstractIDFromURL(itemLink, "item");
    // }

    // 初始化按钮
    this.modifyButton();

    const tbody = $(".verify-info-table > tbody");
    const contents = this.parseVerifyInfoTable(tbody);

    this.modifyTable(contents);

    // 表内的正文已被搬运到审核窗内，组件可挂载（或复用）了
    this.mountTextComparator();

    // 附言缓存
    this.cacheMessage();
  }

  private appendImgContainer(e: Element) {
    const recipeContainer = $(`<div class="mcmodder-verify-imgcontainer">`).insertBefore(e);
    $(e).appendTo(recipeContainer);
  }

  /** 解析待审项的基本信息。 */
  private parseVerifyInfo() {
    let currentPos = 0;
    const verifyInfo: Record<string, string> = {};
    const verifyInfoText = this.verifyFrame!.children("p")
      .filter((_, p) => p.textContent.startsWith("操作类型"))
      .get(0).firstChild as Text;
    verifyInfoText.data.split("，").forEach((text) => {
      const colon = text.indexOf("：");
      if (colon < 0) return;
      const key = text.slice(0, colon);
      const value = text.slice(colon + 1);
      verifyInfo[key] = value;

      // 添加用户个人主页链接
      if (key === "编辑者" && this.verifyID !== undefined) {
        const uid = this.getEditor(this.verifyID);
        const mid = verifyInfoText.splitText(currentPos + key.length + 1);
        mid.splitText(value.length);
        const link = document.createElement("a");
        link.innerText = value;
        link.target = "_blank";
        link.href = Utils.getCenterURL(uid);
        mid.replaceWith(link);
      }
      currentPos += text.length + 1;
    });
    return verifyInfo;
  }

  /** 为按钮与附言输入框添加快捷键提示，并为附言输入框绑定快捷输入配置。 */
  private modifyButton() {
    this.passButton = this.verifyFrame!.find(AdminVerifyInit.passButtonSelector);
    this.refundButton = this.verifyFrame!.find(AdminVerifyInit.refundButtonSelector);
    this.checkButton = this.verifyFrame!.find(AdminVerifyInit.checkButtonSelector);
    this.reasonInput = this.verifyFrame!.find(AdminVerifyInit.reasonInputSelector);

    if (!this.parent.isMobileClient) {
      this.passButton.append(" " + Utils.keyToHTML(this.configs.getSettings("keybindVerifyPass")!));
      this.refundButton.append(
        " " + Utils.keyToHTML(this.configs.getSettings("keybindVerifyRefund")!),
      );
      this.checkButton.append(
        " " + Utils.keyToHTML(this.configs.getSettings("keybindVerifyCheck")!),
      );
      this.reasonInput.attr(
        "placeholder",
        `填写附言或退回理由.... (按下 ${Utils.keyToString(
          this.configs.getSettings("keybindVerifyReason")!,
        )} 以快速聚焦)`,
      );
    }

    InputListController.instance.add(this.reasonInput.get(0) as HTMLInputElement, {
      delimiter: "；",
      hideBeforeInput: true,
      suggestionManager: {
        configs: this.configs,
        configKey: "verifyReasons",
      },
    });
  }

  /** 将展示待审项详细信息的表格解析为行标题与内容的键值对，便于后续处理。 */
  private parseVerifyInfoTable(tbody: JQuery) {
    const contents: Record<string, VerifyContent> = {};

    tbody.contents().each((_, e) => {
      const row = $(e);
      const rowText = e.firstChild?.textContent;
      if (!rowText) return;
      contents[rowText] = {
        row,
        title: rowText,
        currentCell: row.children("td:nth-child(2)"),
        previousCell: row.children("td:nth-child(3)"),
        currentText: row.children("td:nth-child(2)").find(".verify-copy-text"),
        previousText: row.children("td:nth-child(3)").find(".verify-copy-text"),
      };
    });

    return contents;
  }

  /** 将展示待审项详细信息的各行根据标题内容进行二次调整。 */
  private readonly contentModifier: Record<string, (content: VerifyContent) => void> = {
    /** 为模组关系提供编辑版本对比功能。 */
    模组关系: (content) => {
      RelationCompareFrame.performCompare(content.previousText, content.currentText);
    },

    /** 为相关链接提供快速跳转链接与编辑版本对比功能。 */
    相关链接: (content) => {
      const addLink = (node: JQuery) => {
        node.find("p").each((_, p) => {
          const text = p.textContent;
          const split = text.indexOf("]");
          const bracket = text.lastIndexOf(" (");
          const name = text.slice(1, split);
          const link =
            bracket === -1 ? text.slice(split + 1).trim() : text.slice(split + 1, bracket).trim();
          const desc = bracket === -1 ? "" : ` (${text.slice(bracket + 2, -1)})`;
          p.innerHTML = `[${name}] <a target="_blank" href="${link}">${link}</a>${desc}`;
        });
      };
      addLink(content.previousText);
      addLink(content.currentText);
    },

    /** 为支持 MC 版本提供编辑版本对比功能，并检查加载器版本与相对应的所填写的支持版本是否合理。 */
    支持MC版本: (content) => {
      PlatformCompareFrame.performCompare(content.previousText, content.currentText);
    },

    /** 为小图标添加透明底与快捷放缩功能。 */
    小图标: (content) => this.iconModifier(content),
    /** 为大图标添加透明底与快捷放缩功能。 */
    大图标: (content) => this.iconModifier(content),

    /** 为模组添加快速跳转链接。 */
    来自模组: (content) => {
      if (this.verifyInfo["操作类型"] !== "资料添加") {
        return;
      }
      const modLink = content.currentCell.children("a").attr("href");
      this.verifyClassID = Utils.abstractIDFromURL(modLink, "class");
    },

    /**
     * 为资料类型添加快速跳转链接。
     * 若属于模组分区自定义资料类型，则只有在本地记录了该模组分区的自定义资料类型的情况下，
     * 链接才会被正确添加，否则会直接跳过。
     */
    资料类型: (content) => {
      content.row.children().each((i, e) => {
        if (i === 0) return;
        const text = e.textContent;
        const data = this.parent.utils.getItemTypeData(this.verifyClassID, text);
        if (data && this.verifyClassID) {
          e.innerHTML = `<a target="_blank" href="${Utils.getItemTypeURL(
            this.verifyClassID,
            data.typeID,
          )}">${text}</a>`;
        }
      });
    },

    /** 为矿物词典中的各个矿词/标签添加快速跳转与编辑版本对比。 */
    矿物词典: (content) => {
      let prev = content.previousCell;
      let next = content.currentCell;
      if (content.previousText.length) prev = content.previousText;
      if (content.currentText.length) next = content.currentText;
      OredictCompareFrame.performCompare(prev, next);
    },

    /** 为开源许可中出现的链接文本添加快速跳转。 */
    开源许可: (content) => {
      content.row
        .find("p")
        .contents()
        .each((_, e) => {
          if (e.nodeType === Node.TEXT_NODE) {
            const text = e as unknown as Text;
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
        });
    },

    /** 为合成表 GUI 的外层添加一个容器框，保证表格过窄时内容不会溢出。 */
    合成表可视化: (content) => {
      content.row.find(".TableContainer").each((_, e) => this.appendImgContainer(e));
    },

    /** 为模组封面的外层添加一个容器框，保证表格过窄时内容不会溢出。 */
    模组封面: (content) => {
      content.row.find("img").each((_, e) => this.appendImgContainer(e));
    },
  };

  private iconModifier(content: VerifyContent) {
    content.row.find("img").each((_, _img) => {
      const img = _img as HTMLImageElement;
      img.classList.add("mcmodder-compare-icon");
      const work = () => {
        const size = img.width;
        switch (size) {
          case 32:
            img.classList.add("item-32px");
            break;
          case 36:
            img.classList.add("buff-36px");
            break;
          case 128:
            img.classList.add("item-128px");
            break;
          case 144:
            img.classList.add("buff-144px");
            break;
        }
      };
      if (img.complete) work();
      else img.onload = () => work();
    });
  }

  private modifyTable(contents: Record<string, VerifyContent>) {
    Object.values(contents).forEach((content) => {
      const rowText = content.title;
      if (rowText.includes("介绍") || rowText.includes("正文")) {
        this.modifyMainText(content);
      } else {
        this.contentModifier[rowText]?.(content);
      }
    });
  }

  /**
   * 对正文行的修改：移除百科原生的正文复制快捷键，向组件提供本次的编辑前后正文。
   *
   * 组件只挂载一次（见 {@link mountTextComparator}），此处仅替换它读取的正文节点，
   * 由组件自行重算对比结果——重建组件会丢失用户已选的对比模式，并留下一个废弃的组件实例。
   */
  private modifyMainText(content: VerifyContent) {
    // 正文对比
    this.verifyFrame!.find(".verify-copy-btn")
      .parent()
      .filter((_, c) => $(c).css("position") === "absolute")
      .remove(); // 移除原版复制按钮

    let textA = content.previousCell;
    let textB = content.currentCell;
    const commonTextA = textA.find(".common-text");
    const commonTextB = textB.find(".common-text");
    if (commonTextA.length) textA = commonTextA;
    if (commonTextB.length) textB = commonTextB;
    this.comparatorTexts = { textA, textB };
    new MainText(this.parent, textA);
    new MainText(this.parent, textB);
  }

  /**
   * 挂载正文对比组件：整个会话内只挂一次，切换待审项时只换它读取的正文（见 {@link modifyMainText}）。
   *
   * 审核窗在每次加载待审项时都被清空（见 `run` 中挂载的分屏点击处理），组件的挂载点因此会
   * 脱离文档——此时把**同一个节点**插回原位即可，Vue 仍绑定在它上面，无需重建组件。
   */
  private mountTextComparator() {
    if (this.textComparator === undefined) {
      this.comparatorContainer = document.createElement("div");
      this.textComparator = createApp(TextComparator, this.comparatorTexts);
      this.textComparator.mount(this.comparatorContainer);
    }
    const insertPos = this.verifyFrame!.find(".verify-action-btns, .assistant-action-btns")
      .parent()
      .children()
      .first();
    $(insertPos).before(this.comparatorContainer!);
  }

  /**
   * 将所填写的附言自动暂存在 {@link lastRefundText} 中（仅限当前会话，不持久储存）。
   * 下次打开同待审项时，自动读取并重新填充在附言输入框内。
   */
  private cacheMessage() {
    const verifyId = Number(
      JSON.parse($("#verify-pass-btn, #assistant-pass-btn").attr("data-data")).verifyID,
    );
    $("#verify-reason, #assistant-reason")
      .val(this.lastRefundText[verifyId] ?? "")
      .focusout((e) => {
        this.lastRefundText[verifyId] = (e.currentTarget as HTMLInputElement).value;
        if (e.currentTarget.id === "assistant-reason" && this.verifyID) {
          this.markEntryAsViewed(this.verifyID);
        }
      });
  }

  /** 将审核模块向上移动，常用提示下沉 */
  private rearrange() {
    const containerWidgets = $(".container-widget").children();
    containerWidgets.eq(1).insertAfter(containerWidgets.eq(-1));
  }

  /** 添加“一键查询待审项”快捷按钮 */
  private appendCheckButton() {
    $(
      '<button class="btn" id="mcmodder-check-verification" data-toggle="tooltip" data-original-title="快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。">一键查询待审项</button>',
    )
      .insertAfter(".selectJump.bs3")
      .click(() => this.getVerificationCount());
    const autoVerifyDelay = this.configs.getSettings("autoVerifyDelay");
    if (autoVerifyDelay && autoVerifyDelay >= 1e-2) {
      const title = $(`<span style="margin-left: 10px;">距离自动查询: </span>`).insertAfter(
        "#mcmodder-check-verification",
      );
      const text = $("<span>").appendTo(title).get(0);
      createApp(Countdown, {
        parent: this.parent,
        dataGetter: TimerUtils.DATAGETTER_SCHEDULE(
          "autoCheckVerify",
          this.parent.currentUID,
          this.parent.scheduleRequestUtils,
        ),
      }).mount(text);
    }
  }

  private async getVerificationCount() {
    this.parent.scheduleRequestUtils.run("autoCheckVerify");
  }

  /** 获取当前的待审列表是在何种配置下加载的 */
  private parseCurrentVerifyListConfig() {
    const typeID = $("#verify-type-list").val() as string;
    const classAddOnly = $("#ignore-manager").is(":checked") ? "1" : "0";
    const userlink = $("#connect-frame-sub .select-row")
      .first()
      .children()
      .last()
      .find("a")
      .first()
      .prop("href");
    const userID = userlink?.slice(24, -1) ?? "0";
    let classID = $("#class-version-list").val() as string;
    if ((classID === "0" && typeID !== "0") || userID !== "0") {
      classID = "-1";
    }
    const ignoreManager = "1";
    return userlink
      ? {
          classID,
          userID,
          ignoreManager,
          classAddOnly,
          typeID,
        }
      : {
          classID,
          typeID,
          classAddOnly,
          userID,
        };
  }

  /** 以当前的待审项筛选配置，向后端请求一次最新的待审列表。 */
  private async fetchVerifyList() {
    const config = this.parseCurrentVerifyListConfig();
    if (
      (config.classID === "0" && config.userID === "0" && config.typeID === undefined) ||
      config.typeID === "0"
    ) {
      return;
    }
    const resp = await this.parent.utils.createRequest({
      url: "https://admin.mcmod.cn/frame/pageVerifyMod-list/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      data: $.param({ data: JSON.stringify(config) }),
    });
    const state = JSON.parse(resp.responseText)?.state;
    if (state === undefined || state > 0) {
      Utils.commonMsg(
        "待审列表自动更新失败，请检查登录状态和网络环境，或是检查控制台报错...",
        false,
      );
      console.error("返回状态异常: ", resp);
      return;
    }
    const html = $(JSON.parse(resp.responseText).html);
    return html;
  }

  private static readonly opinionMapKey = {
    通过: 0,
    退回: 1,
    检查: 2,
    等待: 3,
  } as Record<string, number>;

  private static readonly opinionMapName = {
    0: "通过",
    1: "退回",
    2: "检查",
    3: "等待",
  } as Record<number, string>;

  private static readonly opinionMapClassName = {
    0: "text-success",
    1: "text-danger",
    2: "text-warning",
  } as Record<number, string>;

  /** 获取展示「意见变化」的元素。 */
  private getOpinions(elem: JQuery) {
    return elem
      .find("td:nth-child(2) b.text")
      .filter((e) => !$(e).parents(".mcmodder-verify-changedopinions").length);
  }

  /**
   * 解析元素所展示的各意见数量。
   *
   * @param elem 展示意见数量（「助理意见」或「意见变化」）的元素（不是行元素！）
   * @returns 各意见数量（通过/退回/检查/等待）
   */
  private parseOpinions(elem: JQuery): ParsedOpinion {
    const data = elem.toArray().map((e) => e.textContent);
    const result: ParsedOpinion = [0, 0, 0, 0];
    data.forEach((e) => {
      const value = Number(e.slice(0, -2));
      const name = e.slice(-2);
      const key = AdminVerifyInit.opinionMapKey[name];
      if (key !== undefined) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * 根据已解析的各意见数量渲染可用于展示的节点。
   * 展示效果范例：“1通过、2退回、3检查、4等待”。
   *
   * @param data 已解析的各意见数量（通过/退回/检查/等待）
   * @param showPositiveSign 若数值为正，则在数值前额外插入一个 “+” 号
   * @returns 渲染得到的节点
   */
  private renderOpinions(data: ParsedOpinion, showPositiveSign = false) {
    const result: Node[] = [];
    let first = true;
    for (let key = 0; key < 3; key++) {
      if (data[key] === 0) {
        continue;
      }
      const value = data[key];
      const name = AdminVerifyInit.opinionMapName[key];
      const className = AdminVerifyInit.opinionMapClassName[key];
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
      span.innerText = `${showPositiveSign && value > 0 ? "+" : ""}${value}${name}`;
      result.push(span);
    }
    return $(result);
  }

  /**
   * 自动根据当前的待审项筛选配置，向后端请求一次最新的待审列表，并对比两个待审列表之间有何不同。
   *
   * - 当前页面缺失，但最新的待审项存在的项目，以蓝底+下划线高亮。
   * - 当前页面存在，但最新的待审项缺失的项目，以红底+删除线高亮。
   */
  private async compareAndUpdateVerifyList() {
    const latestHTML = await this.fetchVerifyList();
    if (latestHTML === undefined) {
      return;
    }
    const table = $("#verify-list-table > tbody");
    const latest = latestHTML.find("tbody").children();
    const current = table.children();
    const latestID = latest.toArray().map((e) => [this.getVerifyID(e), e] as [number, Element]);
    const currentID = current.toArray().map((e) => [this.getVerifyID(e), e] as [number, Element]);
    const latestMap = new Map(latestID);
    const currentMap = new Map(currentID);
    const deleted: number[] = [],
      inserted: number[] = [];
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
          const rendered = $(
            `<span class="mcmodder-verify-changedopinions">[意见变化：<span></span>]</span>`,
          ).appendTo(currentElement.find("td:nth-child(2)"));
          this.renderOpinions(changed, true).appendTo(rendered.children());
          currentElement.addClass("mcmodder-verify-newopinion");
        }
        currentElement.removeClass(".mcmodder-verify-deletedentry");
      }
    });
    currentMap.forEach((_, id) => {
      if (!latestMap.has(id)) deleted.push(id);
    });
    inserted.forEach((id) => {
      const e = latestMap.get(id)!;
      table.append(e);
      this.checkEntry(e);
      this.addUserLink(e);
    });
    deleted.forEach((id) => {
      const e = currentMap.get(id)!;
      e.classList.add("mcmodder-verify-deletedentry");
    });
  }

  /**
   * 将 DOM 中已经标注好的「意见变化」数据合并到「助理意见」中。
   *
   * - 调用前：[助理意见：x通过，y退回，z检查] [意见变化：+a通过，-b退回，-z检查，+c等待]
   * - 调用后：[助理意见：x+a通过，y-b退回，c等待]
   *
   * @param target 要更新意见变化数据的行元素
   * */
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
    const node = td
      .contents()
      .filter(
        (_, e) => e.nodeType === Node.TEXT_NODE && (e as unknown as Text).data === targetText,
      )[0];
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

  /** 根据日期分类的已提交意见的待审项 ID 列表。 */
  private readonly assistantViewed;
  /** 与 {@link assistantViewed} 组合使用，存储根据日期分类的已提交意见的待审项 ID 集合，便于快速查重。 */
  private readonly assistantViewedSet;

  /** 从本地配置加载已提交意见的待审项列表，并同步给 {@link assistantViewed} 和 {@link assistantViewedSet}。 */
  private initAssistantViewed() {
    const keys = Object.keys(this.assistantViewed).map(Number);
    const time = Utils.getStartTime(Date.now(), 0);
    keys.forEach((date) => {
      if (time - date > 30 * 24 * 60 * 60 * 1e3) {
        delete this.assistantViewed[date];
      } else {
        this.assistantViewed[date].forEach((id) => {
          this.assistantViewedSet.add(id);
        });
      }
    });
  }

  /**
   * 标记待审项为已提交意见，并向 {@link assistantViewed} 和 {@link assistantViewedSet} 同步。
   *
   * @param id 要标记的待审项的数字 ID
   */
  private markEntryAsViewed(id: number) {
    const date = Utils.getStartTime(Date.now(), 0);
    if (this.assistantViewed[date] === undefined) {
      this.assistantViewed[date] = [id];
    } else {
      this.assistantViewed[date].push(id);
    }
    this.assistantViewedSet.add(id);
    this.configs.setAll("assistantViewed", this.assistantViewed);
  }

  /** 获取行元素对应待审项的数字 ID。 */
  private getVerifyID(elem: JQuery | Node) {
    return Number($(elem).attr("id")?.split("-")[2]);
  }

  /** 获取待审项的数字 ID 反搜行元素。 */
  private getEntry(id: number | string) {
    return $(`#verify-row-${id}-tr`);
  }

  /** 检查行元素对应待审项是否已被标记为已提交意见。若是，则添加绿底斜体标记。 */
  private checkEntry(elem: JQuery | Node) {
    elem = $(elem);
    const id = this.getVerifyID(elem);
    if (this.assistantViewedSet.has(id)) {
      elem.addClass("mcmodder-verify-commented");
    }
  }

  /** 给行元素中所显示的用户昵称旁插入个人中心的快捷跳转按钮。 */
  private addUserLink(elem: JQuery | Node) {
    const userFilter = $(elem).find(".user-online-state");
    const uid = this.getEditor(elem);
    const link = Utils.getCenterURL(uid);
    $(`
      <span class="ignore-parent" style="display:inline-block;">
        <a href="${link}" target="_blank">
          <i title="查看个人主页" class="fa fa-home"></i>
        </a>
      </span>
    `).insertAfter(userFilter);
  }

  /**
   * 获取待审项目的编辑者 UID。
   *
   * @param elem 要查询的待审项目所对应的行元素或数字 ID
   */
  private getEditor(elem: JQuery | Node | number | string) {
    if (typeof elem === "number" || typeof elem === "string") {
      elem = this.getEntry(elem);
    }
    const userFilter = $(elem).find(".verify-user-filter");
    const uid = Number(userFilter.data("uid"));
    return uid;
  }
}
