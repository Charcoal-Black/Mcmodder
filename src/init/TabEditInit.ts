import { GM_setValue } from "$";
import { HorizontalDraggableFrame } from "../widget/draggable/HorizontalDraggableFrame";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";
import { GeneralEditInit } from "./GeneralEditInit";

interface CurrentUsedData {
  item: string[];
  oredict: string[];
}

export class TabEditInit extends McmodderInit {
  isReady = false;
  guiFrame?: Element;
  slotFrame?: Element;
  modID: number = 1;
  modName = "";
  dependences: number[] = [];
  expansions: number[] = [];
  recipeTable: JQuery = $();

  canRun() {
    return this.parent.href.includes("/item/tab/") && 
      !this.parent.href.includes(".html");
  }

  // private readonly guiObserver = new MutationObserver(mutationList => {
  //   if (!this.guiFrame || !this.slotFrame) return;
  //   for (let mutation of mutationList) {
  //     if (mutation.type === "childList") {
  //       try {
  //         if ((mutation.target as HTMLElement).tagName === "DIV") {
  //           this.guiObserver.disconnect();
  //           this.slotObserver.disconnect();
  //           this.updateTabFrame();
  //           setTimeout(() => this.guiObserver.observe(this.guiFrame!, {
  //             childList: true,
  //             subtree: true
  //           }), 1e3);
  //           setTimeout(() => this.slotObserver.observe(this.slotFrame!, {
  //             attributes: true,
  //             childList: true,
  //             subtree: true
  //           }), 1e3);
  //         }
  //       } catch (e) {
  //         // awa?
  //       }
  //     }
  //   }
  // });

  private readonly slotObserver = new MutationObserver(mutationList => {
    if (!this.guiFrame || !this.slotFrame) return;
    for (let mutation of mutationList) {
      if (mutation.type === "attributes") {
        const target = mutation.target as HTMLInputElement;
        if (target.className === "value") {
          // this.guiObserver.disconnect();
          this.slotObserver.disconnect();

          $(`#mcmodder-item-tab-edit [data-multi-id=${
            target.getAttribute("data-multi-id")
          }][data-part=${
            target.getAttribute("data-part")
          }]`)
          .first()
          .val((mutation.target as HTMLInputElement).value)
          .change();

          // this.guiObserver.observe(this.guiFrame, {
          //   childList: true,
          //   subtree: true
          // });
          this.slotObserver.observe($(".gui")[0], {
            attributes: true,
            childList: true,
            subtree: true
          });
        }
      }
    }
  })

  private updateCookieByCurrentUsedList() {
    let data: CurrentUsedData = {
      item: [],
      oredict: []
    };
    let itemUsedList = $("#item-used-item"), oredictUsedList = $("#item-used-oredict, #item-used-itemtags");
    itemUsedList.find(".item-table-hover").each((_, c) => {
      data.item.push(c.getAttribute("item-id") || "-1");
    });
    oredictUsedList.find(".oredict-table-hover").each((_, c) => {
      data.oredict.push(c.getAttribute("data-oredict-name") || "<Empty>");
    });
    $.cookie("itemTableUsedList", JSON.stringify(data), { path: "/", expires: 365 });
  }

  private setSelectorInfo(containerSelector: string) {
    let pt = 0;
    $(containerSelector).each((_, item) => {
      const target = $(item);
      if (target.hasClass("mcmodder-tag")) return;
      target.addClass("mcmodder-tag");
      // 高亮选取建议
      /* const itemModName = target.attr("data-original-title").split("<b>")[1].split("</b>")[0].replace("...", "");
      if (this.modName.includes(itemModName)) McmodderUtils.highlight(target, "gold");
      else {
        for (let i of this.dependences) {
          if (i.includes(itemModName)) McmodderUtils.highlight(target, "aqua");
          else {
            for (let i of this.expansions) {
              if (i.includes(itemModName)) McmodderUtils.highlight(target, "pink");
            }
          }
        }
      } */
      if ((item as HTMLElement).style.backgroundColor) item.parentNode?.insertBefore(item, item.parentNode.childNodes[pt++]);

      // 显示详细信息
      const img = target.find("img").get(0) as HTMLImageElement;
      const zh = img.alt.split(" (")[0];
      const en = img.alt.replace(zh + " (", "");
      $(`<div>
          <span class="mcmodder-slim-dark zh-name">${ target.attr("item-id") }</span>
          <span class="zh-name">${ zh }</span>
          <span class="en-name">${ en.slice(0, en.length - 1) } [${
            target.attr("data-original-title").split("<b>")[1].split("</b>")[0]
          }]</span>
        </div>
        <a class="delete"><i class="fa fa-trash" /></a>
      `).appendTo(target);
      target.find(".delete").click(e => {
        let c = parseInt($("#item-used-item-btn").text().split("(")[1].split(")")[0]);
        $("#item-used-item-btn").text(`资料 (${c - 1})`);
        $(".tooltip").remove();
        (e.currentTarget.parentNode as HTMLElement)?.remove();
        this.updateCookieByCurrentUsedList();
      });
      if (target.parent().attr("id") === "item-search-item") target.find(".delete").remove();
    });
  }

  private setAllSelectorInfo() {
    this.setSelectorInfo("#item-search-item > .item-table-hover");
    this.setSelectorInfo("#item-used-item > .item-table-hover");
  }

  private updateTabFrame() {
    this.recipeTable.remove();

    if (!this.guiFrame || !this.slotFrame) return;

    $("div#item-table-gui-frame hr").remove();
    if ($("#mcmodder-tabedit-tip").length) return;
    $(`<span id="mcmodder-tabedit-tip" class="mcmodder-slim-dark" style="display: inline;">
      提示：巧妙运用
        <strong>Tab</strong> /
        <strong>Enter</strong> /
        <strong>上下方向</strong>
      键能够帮助您更快地填充下列数据~
    </span>`).appendTo(this.guiFrame);

    let input = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({
      valid: false,
      id: "",
      number: "",
      numberEditable: false,
      chance: "",
      chanceEditable: false,
      unit: ""
    }));
    let output = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({
      valid: false,
      id: "",
      number: "",
      numberEditable: false,
      chance: "",
      chanceEditable: false,
      unit: ""
    }));
    let extra = new Array(McmodderValues.MAX_RECIPE_LENGTH).fill(null).map(() => ({
      valid: false,
      id: "",
      number: "",
      unit: ""
    }));

    const slotlist = $(".gui").find("input.value");
    const tablist = $("#item-table-gui-frame > .tab-li");
    slotlist.each((_, _slot) => {
      const slot = $(_slot);
      const value = slot.val().trim();
      const multiName = slot.attr("data-multi-id");
      const dataId = Number(slot.attr("data-part"));
      switch (multiName) {
        case "slot-in-item": input[dataId].id = value, input[dataId].valid = true; break;
        case "slot-out-item": output[dataId].id = value, output[dataId].valid = true;
      }
    })
    tablist.each((_, _tab) => {
      const tab = $(_tab);
      const data = tab.find("input");
      const value = data.val().trim();
      const unit = tab.find("span.text-danger").text() || "";
      const multiName = data.attr("data-multi-id");
      const dataId = Number(data.attr("data-part"));
      switch (multiName) {
        case "slot-in-number": {
          input[dataId].number = value;
          input[dataId].numberEditable = true;
          input[dataId].unit = unit;
          break;
        }
        case "slot-in-chance": {
          input[dataId].chance = value;
          input[dataId].chanceEditable = true;
          break;
        }
        case "slot-out-number": {
          output[dataId].number = value;
          output[dataId].numberEditable = true;
          output[dataId].unit = unit;
          break;
        }
        case "slot-out-chance": {
          output[dataId].chance = value;
          output[dataId].chanceEditable = true;
          break;
        }
        case "slot-power-number": {
          extra[dataId].id = tab.find("p.title").html().split("<span")[0];
          extra[dataId].number = value;
          extra[dataId].valid = true;
          extra[dataId].unit = unit;
        }
      }
    });

    $(".item-table-gui-slot").each((_, e) => {
      const dataType = e.getAttribute("data-type");
      const dataId = e.getAttribute("data-id");
      $(e).append(`<span class="mcmodder-gui-${ dataType }">${ dataId }</span>`);
    });

    this.recipeTable = $(`<table id="mcmodder-item-tab-edit">`).appendTo(this.guiFrame);
    let recipeTbody = $("<tbody>").appendTo(this.recipeTable);
    $("<tr><td /></tr>").appendTo(recipeTbody);

    $(`<td><strong>物品 ID / 矿物词典 / 物品标签</strong></td>
      <td><strong>数量</strong></td>
      <td><strong>概率 (%)</strong></td>`)
    .appendTo(recipeTbody.children().first());

    let recipeTr, recipeTd, recipeInput;
    for (let i in input) {
      if (!input[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);
      $(`<td class="input-head" data-toggle="tooltip" title="${ i } 号材料">
        <strong>
          <i class="fa fa-sign-in" />
          ${i} ${input[i].unit}
        </strong>
      </td>`).appendTo(recipeTr).css("align", "right");

      recipeTd = $("<td>").appendTo(recipeTr);
      $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-multi-id": "slot-in-item",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i
      }).val(input[i].id);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-id": i,
        "data-multi-id": "slot-in-number",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i,
        "placeholder": "1"
      }).val(input[i].number);
      if (!input[i].numberEditable) recipeInput.attr({
        "title": "此材料不可设置消耗数量。",
        "disabled": "disabled"
      }).css("cursor", "no-drop");

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-id": i,
        "data-multi-id": "slot-in-chance",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i,
        "placeholder": "100"
      }).val(input[i].chance);
      if (!input[i].chanceEditable) recipeInput.attr({
        "title": "此材料不可设置消耗概率。",
        "disabled": "disabled"
      }).css("cursor", "no-drop");
    }

    $("#item-table-gui-frame > .tab-li").hide();
    $(".tips").remove();

    for (let i in output) {
      if (!output[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);
      $(`<td class="output-head" data-toggle="tooltip" title="${ i } 号成品">
        <strong>
          <i class="fa fa-sign-out" />
          ${ i } ${ output[i].unit }
        </strong>
      </td>`)
      .appendTo(recipeTr)
      .css("align", "right");

      recipeTd = $("<td>").appendTo(recipeTr);
      $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-multi-id": "slot-out-item",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i
      }).val(output[i].id);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-id": i,
        "data-multi-id": "slot-out-number",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i,
        "placeholder": "1"
      }).val(output[i].number);
      if (!output[i].numberEditable) recipeInput.attr({
        "title": "此材料不可设置产出数量。",
        "disabled": "disabled"
      }).css("cursor", "no-drop");

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-id": i,
        "data-multi-id": "slot-out-chance",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i,
        "placeholder": "100"
      }).val(output[i].chance);
      if (!output[i].chanceEditable) recipeInput.attr({
        "title": "此材料不可设置产出概率。",
        "disabled": "disabled"
      }).css("cursor", "no-drop");
    }

    for (let i in extra) {
      if (!extra[i].valid) continue;
      recipeTr = $("<tr>").appendTo(recipeTbody);

      recipeTd = $("<td>").appendTo(recipeTr)
      .attr("align", "right")
      .html(`<strong>${extra[i].id}: ${extra[i].unit}</strong>`);

      recipeTd = $("<td>").appendTo(recipeTr);

      recipeTd = $("<td>").appendTo(recipeTr);
      recipeInput = $("<input>").appendTo(recipeTd).attr({
        "data-part": i,
        "data-multi-id": "slot-power-number",
        "data-multi-name": "item-table-data",
        "data-multi-enable": true,
        "class": "form-control slot-text slot-text" + i
      }).val(extra[i].number);
    }

    let guiNote = $("b").filter((_, c) => $(c).text() === "使用此GUI时注意事项:").parent().addClass("mcmodder-gui-alert");
    let guiNoteHTMLContent = "";
    guiNote.contents().each((i, c) => {
      if (i < 2) return;
      if (c.nodeType == Node.TEXT_NODE) guiNoteHTMLContent += $(c).text();
      else guiNoteHTMLContent += c.outerHTML;
    });
    guiNote.html("<strong>[注意事项]</strong>").attr({
      "data-toggle": "tooltip",
      "data-html": true,
      "data-original-title": guiNoteHTMLContent
    });
    McmodderUtils.updateAllTooltip();

    recipeTbody.on("change", "input", e => {
      const c = $(e.currentTarget);
      const v = c.val().trim();
      const valueInput = $(`#item-table-gui-frame input[data-multi-id=${c.attr("data-multi-id")}][data-part=${c.attr("data-part")}]`);
      valueInput.val(v);
      if (c.attr("data-multi-id").indexOf("-item") > -1) {
        if (!isNaN(Number(v))) {
          valueInput.parent().children().eq(1).css("background-image", McmodderUtils.getImageURLByItemID(v));
        }
      }

      if (c.attr("data-multi-id") === "slot-out-item") {
        let flag = false;
        const submitButton = $("#edit-submit-button");
        $(`#item-table-gui-frame input[data-multi-id=${c.attr("data-multi-id")}]`).each((_, i) => {
          if (flag) return;
          let e = (i as HTMLInputElement).value;
          if (e && e != nItemID && !isNaN(Number(e))) {
            nItemID = e;
            submitButton.attr("edit-id", e);
            McmodderUtils.commonMsg(`当前页面已自动换绑至物品 ID:${e} ~`);
            flag = true;
          }
        });
      }
    })
    .on("keydown", "input", e => {
      const target = e.currentTarget as HTMLInputElement;
      if (e.keyCode === 13) {
        let col = 0;
        for (let i in target.parentNode?.parentNode?.childNodes)
          if (target.parentNode.parentNode?.childNodes[Number(i)]?.childNodes[0] === target) {
            col = Number(i);
            break;
          }
        for (let i in target.parentNode?.parentNode?.parentNode?.childNodes)
          if (target.parentNode.parentNode.parentNode?.childNodes[Number(i)]?.childNodes[col]?.childNodes[0] === target) {
            (target.parentNode.parentNode.parentNode?.childNodes[
              parseInt(i) + (e.shiftKey ? -1 : 1)
            ]?.childNodes[col]?.childNodes[0] as HTMLInputElement)?.focus();
            return;
          }
      }
      else if (e.keyCode === 38 || e.keyCode === 40) {
        let num;
        if (target.value.trim() != "") num = Number(target.value.trim());
        else num = Number(target.getAttribute("placeholder"));
        if (!isNaN(num)) {
          e.preventDefault();
          if (e.shiftKey) num = Math.floor(num * Math.pow(2, 39 - e.keyCode)); // *2, /2
          else num += (39 - e.keyCode); // +1, -1
          $(target).val(num).change();
        }
      }
    });
    this.parent.updateItemTooltip();
    this.slotObserver.disconnect();
    this.slotObserver.observe($(".gui")[0], {
      attributes: true,
      childList: true,
      subtree: true
    });
  }

  run() {
    const frame = $("#item-table-gui-frame");
    const gui = frame.find(".gui");
    if (gui.length) {
      this.work();
    }
    new MutationObserver(mutationList => {
      mutationList.forEach(mutation => {
        mutation.addedNodes?.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains("gui")) {
            if (!this.isReady) this.work();
            this.updateTabFrame();
          }
        });
      });
    })
    .observe(frame.get(0), {
      childList: true,
      subtree: true
    });
  }

  work() {
    this.isReady = true;
    new GeneralEditInit(this.parent).run();
    this.guiFrame = $("#item-table-gui-frame").get(0);
    this.slotFrame = $(".gui").get(0);
    $("#edit-page-2").attr("class", "tab-pane active");
    $(".swiper-container").remove();
    if (!this.guiFrame) return;
    // this.guiObserver.observe(this.guiFrame, { childList: true, subtree: true });

    const ingredientSelectFrame = $("<div>");
    const ingredientSelectWindow = $('<div class="mcmodder-horizontal-window">').appendTo(ingredientSelectFrame);
    const tabEditHorizontalDivider = new HorizontalDraggableFrame({}, $(".common-menu-area").get(0), {
      initPos: 0.5,
      leftCollapseThreshold: 0,
      rightCollapseThreshold: 0.7,
      leftDraggableLimit: 0.3
    })
    tabEditHorizontalDivider.bindLeft($(".common-menu-area > .tab-content"));
    tabEditHorizontalDivider.bindRight(ingredientSelectFrame);
    const ingredientSelector = $("#edit-page-1 > .tab-ul > .tab-li").first().children();
    ingredientSelector.appendTo(ingredientSelectWindow);
    this.parent.updateScreenAttachedFrame(ingredientSelectWindow.get(0) as HTMLElement);

    this.modID = Number($(".common-nav li:not(.line):nth-child(5) a").first().prop("href").split("/class/")[1].split(".html")[0]);
    this.modName = $(".common-nav li:not(.line):nth-child(5) a").text();

    // v1.6 更新后，前置/拓展模组信息仅记录模组 ID，旧信息全部删除
    GM_setValue("modDependences", "");
    GM_setValue("modExpansions", "");

    this.dependences = this.parent.utils.getConfig(this.modID, "modDependences_v2", []);
    this.expansions = this.parent.utils.getConfig(this.modID, "modExpansions_v2", []);
    if (this.parent.utils.getConfig("tabSelectorInfo")) {
      McmodderUtils.addStyle(`
#item-used-item, #item-search-item {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(192px, 1fr));
}
#item-table-item-frame .item-table-hover {
  width: 100%;
}
#item-table-item-frame .item-table-hover img {
  position: absolute;
  left: 0px;
}
#item-table-item-frame .item-table-hover div {
  display: inline-block;
  font-size: 14px;
  max-width: calc(100% - 32px);
  line-height: 1;
  max-height: 32px;
  overflow: clip;
  position: absolute;
  right: 0px;
}
#item-table-item-frame .item-table-hover .zh-name {
  margin-left: .25em;
  font-size: 12px;
}
#item-table-item-frame .item-table-hover .en-name {
  margin-left: .25em;
  font-size: 10px;
  color: gray;
      }`);
      let itemSearchObserver = new MutationObserver((_mutationList, itemSearchObserver) => {
        itemUsedObserver.disconnect();
        itemSearchObserver.disconnect();
        this.setAllSelectorInfo();
        itemSearchObserver.observe($(".item-search").get(0), { childList: true, subtree: true });
        if ($("#item-used-item").length) itemUsedObserver.observe($(".item-used-list").get(0), { childList: true, subtree: true });

        // 可拖动
        $("#item-used-item").sortable({
          distance: 30,
          containerSelector: "#item-used-item",
          itemPath: "> .item-table-hover",
          itemSelector: "div",
          opacity: 0.5,
          revert: true,
          stop: () => this.updateCookieByCurrentUsedList()
        }).disableSelection();
      });
      this.setAllSelectorInfo();
      let itemUsedObserver = itemSearchObserver;
      itemSearchObserver.observe($(".item-search").get(0), { childList: true, subtree: true });
      if ($("#item-used-item").length) itemUsedObserver.observe($(".item-used-list").get(0), { childList: true, subtree: true });
    }

    // 隐藏自定义矿词/标签功能
    $(".title").filter((_, c) => c.textContent === PublicLangData.item_tab.custom.title + ":").hide().next().hide();
    $("hr").hide();

    // 快速设置GUI
    $(`<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将 GUI 设置为当前所使用的 GUI。修改现有的合成表不会触发此特性。">
      <input id="mcmodder-gui-lock" type="checkbox">
        <label for="mcmodder-gui-lock">锁定当前 GUI</label>
      </div>`).appendTo($("#item-table-gui-select").parent());
    let guiLocker = this.parent.utils.getConfig("guiLocker");
    if (guiLocker > 0) {
      $("input#mcmodder-gui-lock").click();
      $("#item-table-gui-select").selectpicker("val", guiLocker);
    }
    $("input#mcmodder-gui-lock").bind("change", () => {
      let l = $("input#mcmodder-gui-lock").prop("checked");
      this.parent.utils.setConfig("guiLocker", l ? $("#item-table-gui-select").val() : 0);
    });

    // 应用无序
    $(`<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将摆放要求设置为无序合成。修改现有的合成表不会触发此特性。">
      <input id="mcmodder-shapeless-lock" type="checkbox">
      <label for="mcmodder-shapeless-lock">锁定无序</label>
    </div>`).appendTo($("#edit-page-2 .tab-li").first());
    if (this.parent.utils.getConfig("shapelessLocker")) {
      if (window.location.href.includes("/tab/add/")) $("#item-table-data-orderly-1").click();
      $("input#mcmodder-shapeless-lock").click();
    }

    // 快速设置无序
    $("input#mcmodder-shapeless-lock").bind("change", _e => {
      let l = $("input#mcmodder-shapeless-lock").prop("checked");
      this.parent.utils.setConfig("shapelessLocker", l.toString());
      if (l) $("#item-table-data-orderly-1").click();
    });

    // 编辑记忆列表
    /*$(".item-used-frame .item-table-hover").on("contextmenu", function (e) {
      e.preventDefault();
      let l = JSON.parse($.cookie("itemTableUsedList")).item.filter(item => parseInt(item) != parseInt($(this).attr("item-id")));
      $.cookie("itemTableUsedList", JSON.stringify(l), {expires: 365, path: "/"});
      getItemTableUsed();
    });*/

    // GTCEu 编辑提示
    if (this.modID === 5343) {
      let gtceuAlert = $(".tab-ul > p.text-danger");
      gtceuAlert.html(gtceuAlert.html().replace("使用 GTCEu 中对应的材料",
      `<a data-toggle="tooltip" data-original-title="轻触插入备注" style="font-size: unset; text-decoration: underline;">
        使用 GTCEu 中对应的材料
      </a>`));
      $(".tab-ul p.text-danger a").click(() => {
        let s = "使用 GTCEu 中对应的材料。";
        let note = $("textarea[placeholder='备注..']");
        note.val(note.val().replace(s, ""));
        note.val(`${s}\n${note.val()}`);
        McmodderUtils.commonMsg("成功将此提示插入备注中~");
      });
      this.dependences.concat([2524, 1171, 327]); // GCYL, GTCE, GT5
    }
  }
}