import { GTCEuEnergyFrame } from "../integration/GTCEuEnergyFrame";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";

export class ItemTabInit extends McmodderInit {
  canRun() {
    return false;
  }
  run() {
    // GTCEu
    if (this.parent.utils.getConfig("gtceuIntegration")) {
      $(".power_area").each((_, c) => {
        new GTCEuEnergyFrame(c);
      });
    }

    // 紧凑合成表
    if (!this.parent.utils.getConfig("compactedTablist")) return;
    McmodderUtils.addStyle(`
      .item-table-block p {
        display: inline; margin: 2px;
      }
      .item-table-block td {
        padding: 0rem;
        line-height: 1.0;
      }
      .alert {
        margin-bottom: 0rem;
      }
      .alert.alert-table-forother {
        background-color: transparent; color: #c63;
        border: 1px solid #963;
      }
      .alert.alert-table-startver {
        background-color: transparent; color: #369;
        border: 1px solid #336;
      }
      .alert.alert-table-endver {
        background-color: transparent; color: #933; 
        border: 1px solid #633;
      }
      .alert.alert-table-guifromother {
        background-color: transparent;
        color: #9b9c9d;
        border: 1px solid #d6d8db;
      }
      .item-table-remarks {
        width: 25%;
      }
      .item-table-id {
        width: 7%;
      }
      .item-table-remarks span {
        margin-left: 5%;
        margin-right: 5%;
        width: 90%
      }
      .item-table-block .power_area {
        margin-left: 5%;
        margin-right: 5%;
        width: 90%;
        border-radius: .25em;
      }`);
    $("div.item-table-frame > table.item-table-block > thead > tr").each((_, e) => {
      e.innerHTML = '<th class="title item-table-id">合成表 ID</th>' + e.innerHTML;
    });
    $("div.item-table-frame > table.item-table-block > tbody > tr").each((_, e) => {
      const idTd = $('<td class="text item-table-id"><span class="mcmodder-slim-dark">' + $(e).find("td.text.item-table-remarks ul.table-tool a:first-child()").first().prop("href").split("/edit/")[1].split("/")[0] + '</span></td>').appendTo(e);
      e.insertBefore(idTd[0], e.childNodes[0]);
    })
    $("div.item-table-frame > table.item-table-block td.text.item-table-gui").each((_, e) => {
      $(e).find("div.TableBlock").first().hide();
      $('<a class="mcmodder-gui-control">轻触展开 GUI</a>').appendTo(e).click(f => {
        const target = $(f.currentTarget);
        const gui = target.parent().find(".TableBlock");
        if (McmodderUtils.isNodeHidden(gui)) {
          target.html("轻触收起 GUI");
          gui.show();
        } else {
          target.html("轻触展开 GUI");
          gui.hide();
        }
      });
    });
    $("div.item-table-frame > table.item-table-block td.text.item-table-count a[data-toggle=tooltip]").each((_, e) => {
      const href = (e as HTMLLinkElement).href;
      if (e.parentNode?.textContent?.includes("[使用:")) {
        $(e).attr("mcmodder-gui-id", McmodderUtils.abstractLastFromURL(href, "item"));
        return;
      }
      let itemID;
      if (href.includes("/oredict/")) {
        const dictName = href.split("/oredict/")[1].split("-1.html")[0];
        for (const i of $(e).parent().parent().parent().find("div.common-oredict-loop a").toArray())
          if ((i as HTMLLinkElement).href.split("/oredict/")[1].split("-1.html")[0] === dictName) {
            const img = i.childNodes[0] as HTMLImageElement;
            itemID = parseInt(img.src.split("/")[img.src.split("/").length - 1].split(".png")[0]);
            break;
          }
      }
      else itemID = Number(McmodderUtils.abstractLastFromURL(href, "item"));
      if (itemID) e.innerHTML = `<span class="mcmodder-tab-item-name">${e.textContent}</span><span class="mcmodder-tab-item-icon" style="background-image: url(${McmodderUtils.getImageURLByItemID(itemID)}); width: 32px; height: 32px; display: inline-block; position: relative; background-size: cover;"></span>`;
      let itemCount = parseInt((e.parentNode as HTMLElement)?.innerHTML?.replace(",", "").split("* ")[1]);
      if (itemCount > 1) {
        const displayCount = McmodderUtils.getFormattedNumber(itemCount);
        const fontSize = (itemCount < 1e3 ? 16 : 12);
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: white; position: absolute; right: 1px; bottom: 1px; line-height: ' + fontSize + 'px; font-size: ' + fontSize + 'px;">' + displayCount + '</span>');
      }
      if ($(e).parent().find("span[data-original-title=合成后返还]").length) {
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: lime; position: absolute; right: 1px; bottom: 1px; line-height: 12px; font-size: 12px;">无损</span>');
        $(e).parent().find("span[data-original-title=合成后返还]").remove();
      }
      if (href.includes("/oredict/")) {
        let ns = "";
        switch (href.split("/oredict/")[1].split(":")[0]) {
          case "forge": ns = "F"; break;
          case "c": ns = "C"; break;
          case "minecraft": ns = "M"; break;
        }
        $(e).find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; color: black; position: absolute; left: 0px; top: 1px; line-height: 16px; font-size: 16px;">#' + ns + '</span><span style="font-family: Unifont; color: aqua; position: absolute; left: 1px; top: 0px; line-height: 16px; font-size: 16px;">#' + ns + '</span>');
      }
      $(e).parent().find("span").each((_, f) => {
        if (f.getAttribute("data-original-title")?.includes("概率")) {
          const chance = f.textContent.split("(")[1].split(")")[0];
          $(f).parent().find("span.mcmodder-tab-item-icon").append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: yellow; position: absolute; right: 1px; top: 0px; line-height: 16px; font-size: 12px;">' + chance + '</span>');
          f.remove();
        }
      })
      $(e).parent().contents().filter((_, c) => c.nodeType === Node.TEXT_NODE).remove();
    });
    $("div.item-table-frame").each((_, e) => {
      if ($(e).find("tr").length > 9 && !window.location.href.includes("/tab/") && !window.location.href.includes("/oredict/"))
        $("<tr>").appendTo($(e).find("tbody").get(0)).html(`<td colspan="4" style="text-align: center; padding: 5px;"><a class="mcmodder-common-danger" href="${$(e).parent().parent().find(".item-table-tips a").attr("href")}">显示的合成表数量已达到 10 个，可能有更多合成表已被隐藏！轻触此处查看所有合成/用途~</span></td>`);
    })
    $("span.mcmodder-tab-item-name").hide();
    $("div.item-table-frame > table.item-table-block td.text.item-table-count p").filter((_, c) => c.textContent === "↓").each((_, p) => {
      let guiID = parseInt($(p).find("[mcmodder-gui-id]").attr("mcmodder-gui-id"));

      // 原版GUI图标来自EMI: https://github.com/emilyploszaj/emi/
      let x = -1, y = -1;
      switch (Number(guiID)) {
        case 52: x = 0, y = 0; break; // 工作台
        case 54: x = 34, y = 0; break; // 熔炉
        case 209877: x = 68, y = 0; break; // 高炉
        case 209876: x = 0, y = 34; break; // 烟熏炉
        case 158632: x = 34, y = 34; break; // 营火
        case 209864: x = 68, y = 34; break; // 切石机
        case 210368: x = 0, y = 68; break; // 锻造台
        case 48: x = 34, y = 68; break; // 酿造台
        case 209863: x = 68, y = 68; break; // 砂轮
      }
      $(p).html(`<span style="background-image: url(${McmodderValues.assets.progress2}); height: 32px; width: 64px; display: inline-block; background-size: cover; margin-left: 5px; margin-right: 5px; position: relative;">${guiID ? ((x < 0) ? '<span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + Math.floor(guiID / 1e4) + '/' + guiID + '.png); width: 32px; height: 32px; display: inline-block; position: absolute; left: 12px; background-size: cover;"></span>' : '<span class="mcmodder-tab-item-icon" style="background-image: url(' + McmodderValues.assets.sprite + '); background-position: -' + x + 'px -' + y + 'px; width: 34px; height: 34px; display: inline-block; position: absolute; left: 12px;"></span>') : ''}</span>`);
    });
    $("div.item-table-frame > table.item-table-block td.text.item-table-count span.noecho").remove();
    $("fieldset.power_area > p:not(fieldset.power_area > p:last-child())").append(" ·");
    $(".item-table-tips").remove();
  }
}