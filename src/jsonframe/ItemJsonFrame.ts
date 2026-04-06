import { GM_openInTab } from "$";
import { McmodderLoggerFrame } from "../widget/logger/LoggerFrame";
import { Mcmodder } from "../Mcmodder";
import { ItemJsonFrameApplication, ItemJsonFrameConfig, McmodderItemData, McmodderItemList, McmodderTableRowSelection } from "../types";
import { Pagination } from "../widget/Pagination";
import { McmodderDetailedItemListRequestQueue } from "../requestqueue/DetailedItemRequestQueue";
import { McmodderInferItemListRequestQueue } from "../requestqueue/InferRequestQueue";
import { BatchCommand } from "../table/command/BatchCommand";
import { EditRowCommand } from "../table/command/EditRowCommand";
import { McmodderEditableTable } from "../table/EditableTable";
import { McmodderTable } from "../table/Table";
import { McmodderUtils } from "../Utils";
import { JsonFrame } from "./JsonFrame";
import { McmodderValues } from "../Values";
import { InputList, InputRecommendation } from "../widget/InputList";
import { McmodderInputType } from "../config/ConfigUtils";

export interface McmodItemEditorInnerData {
  content: string,
  name: string,
  ename?: string,
  type?: string,
  category: Record<number, number>,
  "icon-32x-data": string,
  "icon-128x-data": string,
  "is-general-node": string,
  "is-general-parents": string,
  oredict?: string,
  maxstack?: string
}

export interface McmodItemEditorData {
  action: "item_add" | "item_edit",
  "edit-id": string,
  "class-id": string,
  "item-data": McmodItemEditorInnerData
}

export class ItemJsonFrame extends JsonFrame<McmodderItemData> {
  protected getConfigName() {
    return "mcmodderJsonStorage";
  }
  logger = new McmodderLoggerFrame(this.parent);
  maxPage?: number;
  private classSearchFrame?: JQuery;
  private classIDInput?: JQuery;
  private typeIDInput?: JQuery;
  private submitButton?: JQuery;

  protected inferRequestQueue = new McmodderInferItemListRequestQueue(this.parent, "inferRequestQueue", 1000, this.logger);
  protected detailedRequestQueue = new McmodderDetailedItemListRequestQueue(this.parent, "detailedRequestQueue", 6, 750, this.logger);

  // 与另一个RequestQueue区分开，这个专用于处理用户手动发起的数据同步请求，只适用于小规模数据
  protected manualRequestQueue = new McmodderDetailedItemListRequestQueue(this.parent, "manualRequestQueue");

  constructor(id: string, parent: Mcmodder) {
    super(id, parent);

    this.table = new McmodderEditableTable<McmodderItemData>(parent, {class: "table jsonframe-table"}, {
      itemType: ["类型", (type, item) => {
        const element = parent.utils.getItemTypeHTML(type, item.classID);
        return element.length > 0 ? element : null;
      }],
      smallIcon: ["小", McmodderTable.DISPLAYRULE_IMAGE_BASE64],
      largeIcon: ["大", McmodderTable.DISPLAYRULE_IMAGE_BASE64],
      id: ["资料 ID", McmodderTable.DISPLAYRULE_LINK_ITEM],
      branch: "分支",
      relation: ["关联", (_, data) => {
        if (data.generalParent) return `<span class="mcmodder-general"><strong>综合父资料</strong></span> <span class="text-muted">(${ data.generalNum })</span>`;
        if (data.generalTo) return `<span class="mcmodder-general">综合</span>至 <a class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${ data.generalTo }">${ data.generalTo }</a>`;
        if (data.jumpTo) return `<span class="mcmodder-jump">合并</span>至 <a class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${ data.jumpTo }">${ data.jumpTo }</a>`
        return null;
      }],
      name: ["主要名称", McmodderUtils.getFormattedCodeDecoratedHTML],
      englishName: ["次要名称", McmodderUtils.getFormattedCodeDecoratedHTML],
      creativeTabName: "分类",
      type: "种类",
      registerName: ["注册名", McmodderTable.DISPLAYRULE_MONOSPACE],
      metadata: ["元数据", McmodderTable.DISPLAYRULE_NUMBER],
      OredictList: ["矿物词典/物品标签", data => {
        if (!data || data.charAt(0) != "[") return data;
        let res = "";
        const entries = data.slice(1, -1).split(",") as string[];
        entries.forEach(entry => {
          entry = entry.trim();
          res += `<a class="jsonframe-oredict badge mcmodder-monospace" target="_blank" href="https://www.mcmod.cn/oredict/${ entry }-1.html">${ entry }</a>`;
        });
        return res;
      }],
      maxStackSize: ["最大堆叠", McmodderTable.DISPLAYRULE_NUMBER],
      maxDurability: ["最大耐久", McmodderTable.DISPLAYRULE_NUMBER],
    }, {
      id: McmodderInputType.NUMBER,
      itemType: {
        type: McmodderInputType.NUMBER,
        value: 1
      },
      classID: McmodderInputType.NUMBER,
      classAbbr: null,
      className: null,
      classEname: null,
      registerName: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      metadata: {
        type: McmodderInputType.NUMBER,
        optional: true
      },
      smallIcon: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      largeIcon: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      name: McmodderInputType.TEXT,
      englishName: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      creativeTabName: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      branch: {
        type: McmodderInputType.TEXT,
        optional: true
      },
      type: null,
      jumpTo: null,
      jumpParent: null,
      generalTo: null,
      generalParent: null,
      generalNum: null,
      OredictList: null,
      harvestTools: null,
      maxStackSize: McmodderInputType.NUMBER,
      maxDurability: McmodderInputType.NUMBER,
      content: null
    }, () => {
      this.updateToolBar();
    });

    this.initClassSearchFrame();

    this.addTool("export", "导出当前文件至本地", () => !!this.activeFileName, () => this.exportJson(this.activeFileName));

    this.table.contextMenu.addOption("syncRow", "从百科同步此行数据", e => {
      const index = this.table!.getElementIndex(e.target);
      return !!(index >= 0 && this.table!.getData(index)?.id && this.parent.currentUID && this.manualRequestQueue.isIdle);
    }, e => this.preSyncRow(this.table!.getElementIndex(e.target)))

    .addOption("syncMultipleRow", "从百科同步所有选中行数据", _e => {
      return !!(this.table!.selectedRowCount && this.parent.currentUID && this.manualRequestQueue.isIdle);
    }, _e => this.preSyncRow(this.table!.getSelection()))

    .addOption("manualSubmitRow", "提交此行数据至百科", e => {
      const index = this.table!.getElementIndex(e.target);
      return !!(index >= 0 && this.parent.currentUID);
    }, e => this.preManualSubmitRow(this.table!.getElementIndex(e.target)));

    this.addTool("importClass", "从模组导入JSON", () => true, () => this.openClassSearchFrame())
    .addTool("importOnline", "从收纳贴导入JSON", () => true, () => this.searchOnlineFiles())
    .addTool("submitedit", "提交所有改动至百科", () => !!(this.activeFileName && this.table!.unsavedUnitCount), () => this.submitEdit(), true);

    this.table.$instance.appendTo(this.content);
  }

  protected more() {
    swal.fire({
      title: "更多操作",
      html: `
      <p class="text-muted" style="font-size: 14px;">
        <hr>
        <p align="center">
          <button id="jsonframe-autolink" class="btn">加入自动链接数据库</button>
        </p>
        <p class="text-muted jsonframe-export-text">在编辑页使用自动链接（本地优先搜索）时，资料会从所有已添加的 JSON 资料列表中<strong>**已拥有百科内资料 ID 的物品中**</strong>搜索~</p>
      </p>`,
        /*<hr>
        <p align="center">
          <button id="jsonframe-autolink" class="btn">清除所有格式化代码</button>
        </p>
        <p class="text-muted jsonframe-export-text">清除所有原版可用的格式化代码。</p>
      </p>*/
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });
    
    let autolink = $("#jsonframe-autolink").click(_ => {
      swal.close();
      let linking: string[] = this.parent.utils.getConfig("jsonDatabase") || [];
      if (linking.includes(this.activeFileName)) {
        linking = linking.filter(e => e != this.activeFileName);
        autolink.text("加入自动链接数据库");
      }
      else {
        linking.push(this.activeFileName);
        autolink.text("移出自动链接数据库");
      }
      this.parent.utils.setConfig("jsonDatabase", linking);
    });
    let linking = this.parent.utils.getConfig("jsonDatabase") || [];
    if (linking.includes(this.activeFileName)) autolink.text("移出自动链接数据库");
    
  }

  setExecuteButtonState(disable: boolean) {
    if (disable) {
      this.submitButton?.addClass("disabled").attr("disabled", 1);
    } else {
      this.submitButton?.removeClass("disabled").removeAttr("disabled");
    }
  }

  initClassSearchFrame() {
    this.classSearchFrame = $(`
      <div class="edit-autolink-frame">
        <div class="input-group edit-autolink-seach">
          <input placeholder="输入模组的百科数字 ID.." id="mcmodder-getitemlist-classid-input" class="form-control">
          <input placeholder="输入资料类型 ID.. (留空默认为 1)" id="mcmodder-getitemlist-typeid-input" class="form-control">
          <button id="mcmodder-getitemlist-submit" class="btn btn-dark">执行</button>
        </div>
        <div class="title">导入设置:</div>
        <div class="edit-autolink-style">
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-infer" name="infer" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-infer">访问潜在资料 - 在一轮资料列表获取完毕后，考虑到同一类资料通常是在同一个批次中批量添加的，脚本会试图访问那些可能仍然属于目标模组区域，但是未出现在现有资料列表中的物品资料 ID。这种方法能够应对综合子资料数量大于 100 的情况，以及访问到部分隐藏分类中的资料。</label>
          </div>
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-geticon" name="geticon" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-geticon">保存物品图标 - 读取的同时获取物品的小图标和大图标，并以 Base64 格式保存进 JSON 文件里。启用该项配置会显著增大输出文件体积；若不启用，则在显示物品图标时会实时从百科获取图标。</label>
          </div>
          <div class="checkbox">
            <input id="jsonframe_${ this.id }-importclass-getall" name="getall" type="checkbox">
            <label for="jsonframe_${ this.id }-importclass-getall">保存完整数据 - 读取一个资料的全部数据（包括图标、注册名、物品标签等所有可以在编辑页访问的数据）。启用该项配置会忽略“保存物品图标”的配置。确切来说，脚本会通过逐一访问所有物品的编辑页来获取这些数据。<strong>启用此项将会向服务器发送大量请求，使用前请务必妥善配置脚本“最短发包间隔”！！</strong></label>
          </div>
        </div>
        <span class="mcmodder-getitemlist-result"></span>
      </div>`);
    this.classIDInput = this.classSearchFrame.find("#mcmodder-getitemlist-classid-input");
    this.typeIDInput = this.classSearchFrame.find("#mcmodder-getitemlist-typeid-input");
    this.submitButton = this.classSearchFrame.find("#mcmodder-getitemlist-submit");
    this.logger.key("就绪。");
    this.logger.$instance.insertAfter(this.classSearchFrame.find(".input-group"));

    new InputList(this.typeIDInput, () => {
      const classID = Number(this.classIDInput?.val());
      const result: InputRecommendation[] = [];
      let typeHTML = "";
      this.parent.itemTypeList?.forEach(entry => {
        if (entry.classID === 0 || entry.classID === classID) {
          if (entry.classID === 0) {
            typeHTML = entry.icon;
          } else {
            typeHTML = `<i class="fas ${ entry.icon }"></i>`;
          }
          result.push({
            html: `<span style="color: ${ entry.color };"><span class="iconfont icon">${ typeHTML }</span> ${ entry.typeID } - ${ entry.text }</span>`,
            value: entry.typeID.toString(),
          });
        }
      });
      return result;
    });

    this.classIDInput.keyup(e => {
      if (e.key === "Enter") {
        this.typeIDInput!.focus();
      }
    });
    this.typeIDInput.keyup(e => {
      if (e.key === "Enter") {
        this.submitButton!.click();
      }
    });
    this.submitButton.click(async _e => {
      const classID = Number(this.classIDInput?.val().trim());
      const typeID = Number(this.typeIDInput?.val().trim());
      if (isNaN(classID)) {
        McmodderUtils.commonMsg("请输入一个合法的模组 ID ~", false);
        this.classIDInput?.focus();
        return;
      }
      if (isNaN(typeID)) {
        this.typeIDInput?.focus();
        McmodderUtils.commonMsg("请输入一个合法的资料类型 ID ~", false);
        return;
      }
      
      this.classIDInput?.blur();
      this.typeIDInput?.blur();
      const startTime = Date.now();
      this.setExecuteButtonState(true);
      this.logger.key(`任务已创建，请等待执行结束，期间请勿关闭当前标签页。`);
      
      try {
        await this.performClassSearch(classID, typeID || 1);
      } catch (e) {
        this.logger.fatal(String(e));
        console.error(e);
      } finally {
        const endTime = Date.now();
        this.setExecuteButtonState(false);
        this.logger.key(`任务已结束，耗时 ${ McmodderUtils.getFormattedTime(endTime - startTime) }。`);
      }
      
      // jsonFrameB.updateSelection();
    });
  }

  async openClassSearchFrame() {
    if (!this.classSearchFrame) return;
    swal.fire({
      title: "从现有模组资料导入JSON",
      html: `<div class="jsonframe-importclass-frame" />`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });
    $(".jsonframe-importclass-frame").append(this.classSearchFrame);
    this.logger.scrollToBottom();
  }

  protected override parseText(text: string) {
    let success = 0, fail = 0, save: McmodderItemData[] = [];
    const entries = text.split('\n');
    entries.forEach(item => {
      item = item.trim();
      if (!item) return;
      try {
        const data = JSON.parse(item) as McmodderItemData & {maxStacksSize?: number};
        if (data.hasOwnProperty("maxStacksSize")) {
          data.maxStackSize = data.maxStacksSize;
          delete data.maxStacksSize;
        }
        data.smallIcon = McmodderUtils.appendBase64ImgPrefix(data.smallIcon);
        data.largeIcon = McmodderUtils.appendBase64ImgPrefix(data.largeIcon);
        success++;
        save.push(data);
      } catch (err) {
        if (!fail) { // 只输出第一条错误信息，要不然卡死了 >_<
          this.onCaughtParseException(err);
        }
        fail++;
      }
    });
    return {
      success: success,
      fail: fail,
      result: save
    };
  }

  async getImageBlobByItemList(itemList: McmodderItemList, width: 32 | 128, maxConcurrent = 6) { // 大力出奇迹
    const results = new Array(itemList.length);
    const running = new Set;
    let i = 0;
    while (i < itemList.length) {
      if (itemList[i].smallIcon && itemList[i].largeIcon) {
        results[i] = null;
        continue;
      }
      if (running.size < maxConcurrent) {
        const index = i;
        const promise = fetch(McmodderUtils.getImageURLByItemID(itemList[index].id, width), { redirect: "manual" })
          .then(resp => resp.blob())
          .then(blob => {
            if (blob.size) {
              results[index] = blob;
              this.logger.log(`获取 ${ itemList[index].id }-${ width }x 图标 完成`);
            } else {
              results[index] = null;
              this.logger.log(`${ itemList[index].id } 没有图标`);
            }
          })
          .catch(err => {
            if (err instanceof TypeError) this.logger.error("网络连接失败");
            else {
              this.logger.error("未知错误");
              console.error(err);
            }
            results[index] = null;
          })
          .finally(() => {
            running.delete(promise);
            i++;
          });
        running.add(promise);
      } else {
        await Promise.race(running);
      }
    }
    await Promise.all(running);
    return results;
  }

  async inferItemList(itemList: McmodderItemList, config: ItemJsonFrameConfig) {

    let check = async (id: number) => {
      const data = config.getall ? await this.parent.utils.getDetailedItemByID(id) : await this.parent.utils.getItemByID(id);
      if (!data) {
        this.logger.log(`${ id } 已失效`);
        return false;
      }
      if (data.classID === config.classID) {
        if (data.itemType && data.itemType != 1) {
          this.logger.log(`${ id } 属于目标模组，但资料分类不是“物品/方块”`);
          return false;
        }
        itemList.push(data);
        this.logger.success(`[${ data.id }] ${ McmodderUtils.getItemFullName(data.name, data.englishName) }`);
        return true;
      }
      this.logger.log(`${ id } 不属于目标模组，而是属于 ${ data.classID }`);
      return false;
    }

    this.logger.log(`共 ${ itemList.length.toLocaleString() } 个资料`);
    this.logger.log("搜索潜在资料");
    const ids = itemList.map(item => item.id).sort((a, b) => a - b);
    const idsLength = ids.length;
    ids.push(Number.MAX_SAFE_INTEGER);
    let prev = ids[0], l = 0, r;

    for (let i = 1; i <= idsLength; i++) {
      if (ids[i] === prev + 1) {
        prev = ids[i];
        continue;
      }
      r = i - 1;
      this.logger.log(`连续区间 [${ ids[l] }, ${ ids[r] }] - ${ McmodderUtils.getPrecisionFormatter().format((i - 1) / idsLength * 100) }% 已完成`);
      for (let j = ids[l] - 1; j > (l === 0 ? 0 : ids[l - 1]); j--) {
        if (!await check(j)) break;
      }
      for (let j = ids[r] + 1; j < ids[r + 1]; j++) {
        if (!await check(j)) break;
        ids[r] = j; // 避免该区间向右拓展的部分，在下个区间向左拓展时，发生重复
      }
      prev = ids[i];
      l = i;
    }
    this.logger.log("搜索潜在资料 完成");
  }

  async appendImageDataToItemList(itemList: McmodderItemList) {
    const blobs32x = await this.getImageBlobByItemList(itemList, 32);
    const blobs128x = await this.getImageBlobByItemList(itemList, 128);
    for (const i in itemList) {
      if (blobs32x[i]) itemList[i].smallIcon = await McmodderUtils.blob2Base64(blobs32x[i]);
      if (blobs128x[i]) itemList[i].largeIcon = await McmodderUtils.blob2Base64(blobs128x[i]);
    }
    return itemList;
  }

  async getItemListFromPage(url: string, itemList: McmodderItemList, branchName: string, config: ItemJsonFrameConfig) {
    let jumpList = [], generalList = [], repeatedData;
    let resp = await this.parent.utils.createAsyncRequest({
      url: url,
      method: "GET"
    });
    if (!resp.responseXML) return;
    const doc = $(resp.responseXML);
    const table = doc.find(".item-list-table");
    let s;
    for (let _c of table.find(".item-list-type-right li").toArray()) {
      let c = $(_c);
      const itemID = McmodderUtils.abstractIDFromURL(c.find("a").last().attr("href"), "item");

      // 递归处理超大分类的情况
      if (c.find(".more").length) {
        const categoryURL = c.find(".more").prop("href");
        const categoryID = Number(categoryURL.split(`${ config.classID }-${ config.typeID }-`)[1].slice(0, -5));
        this.logger.log(`展开分类 ${ categoryID }`);
        await this.getItemListFromPage(categoryURL, itemList, branchName, config);
        this.logger.log(`展开分类 ${ categoryID } 完成`);
      }

      // 处理普通资料
      if (!itemID || isNaN(Number(itemID))) continue;
      if (repeatedData = itemList.filter(e => e.id === itemID)[0]) {
        if (!branchName) continue;
        if (!repeatedData.branch?.split(",").includes(branchName)) repeatedData.branch += ',' + branchName;
      }
      c = c.find("a").last();
      const categoryArray = c.parents(".item-list-type-right").prev().toArray().reverse().map(a => a.textContent);

      const itemData: McmodderItemData = {
        id: itemID,
        classID: config.classID,
        smallIcon: "",
        largeIcon: "",
        name: c.text(),
        englishName: c.attr("data-en"),
        creativeTabName: categoryArray.length ? categoryArray.join(":") : "",
        branch: branchName,
      };
      itemData.itemType = config.typeID;
      this.logger.success(`[${ itemData.id }] ${ McmodderUtils.getItemFullName(itemData.name, itemData.englishName) }`);

      // 处理合并资料
      s = c.parents(".skip");
      // console.log(itemData);
      if (s.length) {
        itemData.jumpTo = McmodderUtils.abstractIDFromURL(s.prev().find("a").last().attr("href"), "item");
        jumpList.push(itemData.jumpTo);
      }

      // 处理综合资料
      s = c.attr("data-loop");
      if (s) {
        generalList.push(itemData.id);
        resp = await this.parent.utils.createAsyncRequest({
          url: `https://www.mcmod.cn/item/${itemData.id}.html`,
          method: "GET",
          anonymous: true
        });
        if (!resp.responseXML) return;
        const doc = $(resp.responseXML);

        // 展开综合父资料
        this.logger.log(`${ itemData.id } 是综合父资料，展开此物品页`);
        itemData.generalNum = Number(doc.find(".item-skip-list legend").text().split("共有 ")[1].split(" 个")[0]);
        if (itemData.generalNum === 100) {
          this.logger.warn("综合子资料达到上限 (100) ，可能无法访问部分子资料");
        }
        for (let _b of doc.find(".item-skip-list ul a").toArray()) {
          const b = $(_b);
          const s = doc.find(`.name[data-id=${b.attr("data-for")}]`);
          const childID = McmodderUtils.abstractIDFromURL(s.next().find("a").first().attr("href"), "item");
          const generalData: McmodderItemData = {
            id: childID,
            itemType: config.typeID,
            smallIcon: "",
            largeIcon: "",
            name: b.text(),
            englishName: s.text().split(b.text() + " (")[1]?.split(")")[0],
            creativeTabName: itemData.creativeTabName,
            generalTo: itemData.id,
            branch: branchName,
            classID: config.classID
          };
          itemList.push(generalData);
          this.logger.success(`[${ generalData.id }] ${ McmodderUtils.getItemFullName(generalData.name, generalData.englishName) }`);
        }
        this.logger.log(`展开物品 ${ itemData.id } 完成`);
      }

      itemList.push(itemData);
    }

    // 根据已记录的所有合并/综合子资料数据来标记合并/综合父资料
    itemList.forEach(e => {
      e.jumpParent = jumpList.includes(e.id);
      e.generalParent = generalList.includes(e.id);
    });

    return itemList;
  }

  async getItemListByClassID(config: ItemJsonFrameConfig) {
    let itemList: McmodderItemList = [];
    const classID = config.classID;
    const typeID = config.typeID;
    /* let hiddenCategoryList = []; */
    const branchList = [`${ classID }-${ typeID }`];
    const branchNameList: string[] = [];

    // 获取被隐藏分类（考虑到不同的分支会有不同的隐藏分类，目前尚不清楚后台分支管理的具体机制，此项功能暂且搁置）
    // 欢迎了解此项后台功能的朋友们与我们合作完善此项功能！
    /* if (this.utils.getProfile("editorModList").split(",").includes(classID)) { 
      const resp = await this.createAsyncRequest({
        url: "https://admin.mcmod.cn/frame/pageItemType-list/",
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
        data: "data=" + JSON.stringify({classID: classID})
      });
      $("<div>").html(JSON.parse(resp.responseText).html).find("#item-type-table tr").each((_, c) => {
        let categoryName = $(c).find("td:nth-child(2)").text();
        if (categoryName.split(":").filter(e => e.charAt(0) === "{" || e.charAt(0) === "[").length) hiddenCategoryList.push($(c).find("td:nth-child(1)").text());
      });
    } */

    // 获取分支情况
    const resp = await this.parent.utils.createAsyncRequest({ 
      url: `https://www.mcmod.cn/item/list/${ classID }-${ typeID }.html`,
      method: "GET"
    });
    if (!resp.responseXML) return [];
    const doc = $(resp.responseXML).find(".item-list-branch-frame");
    if (doc.length) {
      doc.find("a").each((_, c) => {
        branchList.push((c as HTMLLinkElement).href.split("/item/list/")[1].split(".html")[0]);
      });
      doc.find("a, span").each((_, c) => {
        branchNameList.push(c.textContent);
      });
    }
    
    // 根据分支情况逐一读取总物品列表
    config.classID = classID;
    for (let i in branchList) {
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" }`);
      await this.getItemListFromPage(`https://www.mcmod.cn/item/list/${ branchList[i] }.html`, itemList, branchNameList[i], config);
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" } 完成`);
    }

    // 搁置
    // for (let e of hiddenCategoryList) await this.getItemListFromPage(`https://www.mcmod.cn/item/list/${id}-1-${e}.html`, itemList);

    return itemList;
  }

  async performClassSearch(classID: number, typeID: number) {
    // STEP 0: 前置数据收集
    this.logger.log(`打开模组页 ${ classID }`);
    const resp = await this.parent.utils.createAsyncRequest({
      url: `https://www.mcmod.cn/class/${ classID }.html`,
      method: "GET",
      anonymous: true
    });
    if (!resp.responseXML) {
      this.logger.fatal(`打开模组页 ${ classID } 失败`);
      return;
    }
    this.logger.log(`打开模组页 ${ classID } 完成`);
    const doc = $(resp.responseXML);
    const {className, classEname} = McmodderUtils.parseClassDocument(doc);
    const maxNumber = parseInt(doc.find(".mold.mold-1 .count").text()?.split("(")[1]?.split("条)")[0]) || 0;
    if (!maxNumber) {
      const num1 = Math.abs(classID);
      const num2 = Math.abs(typeID);
      this.logger.warn((
        num1 === 114514 || num1 === 1919810 || num2 === 114514 || num2 === 1919810
      ) ? "这里除了屏幕前的 Homo 以外啥都木有..." : "这里啥都木有...");
      return;
    }

    const configTemp: Record<string, any> = {
      classID: classID,
      typeID: typeID
    };
    this.classSearchFrame!.find("input[name]").each((_, _input) => {
      const input = _input as HTMLInputElement;
      const name = input.getAttribute("name") as keyof ItemJsonFrameConfig;
      if (name) configTemp[name] = input.checked;
    });
    const config = configTemp as ItemJsonFrameConfig;
    
    let itemList: McmodderItemList = [];

    const inferBackup = this.inferRequestQueue.backupManager.hasBackup();
    const detailedBackup = this.detailedRequestQueue.backupManager.hasBackup();

    // STEP 1: 初步获取所有物品的基础信息
    if (!inferBackup && !detailedBackup) {
      itemList = await this.getItemListByClassID(config);

      // STEP 1.5: O.O 似乎仍然会出现重复 ID 资料? 在这加个去重好了
      itemList = [...new Map(itemList.map(item => [item.id, item])).values()];
    }

    // STEP 2 (可选但推荐): 向前/后拓展各个区间来获取隐藏资料的基础信息
    if (!detailedBackup) {
      if (config.infer) itemList = await this.inferRequestQueue.run(itemList, config);
    }

    // STEP 3 (可选): 访问各资料编辑页来获取各资料详细信息
    if (config.getall) itemList = await this.detailedRequestQueue.run(itemList);
    else if (config.geticon) itemList = await this.appendImageDataToItemList(itemList);

    // STEP 4: 保存结果，任务结束
    const rawName = `${classID}-${className}-${classEname}-${typeID}-${(new Date()).toLocaleString()}-${itemList.length}-Original.json`;
    const fileName = McmodderUtils.regulateFileName(rawName);
    this.logger.success(`成功加载全部 ${maxNumber.toLocaleString()} 中的 ${itemList.length.toLocaleString()} 个物品资料，并保存于 ${fileName}。`);
    this.parent.utils.setConfig(fileName, itemList, "mcmodderJsonStorage");
    this.updateSelection();
  }

  private async getJSONFromURL(url: string, table: McmodderTable<ItemJsonFrameApplication>) {
    table.showLoading();
    table.empty();
    let resp = await this.parent.utils.createAsyncRequest({ url: url, method: "GET" });
    if (!resp.responseXML) return;
    let doc = $(resp.responseXML);
    if (doc.find("title").text() === "页面重载开启") {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          this.getJSONFromURL(url, table)
          .then(() => resolve());
        }, 1e3);
      });
    }
    let jsonList = doc.find("ignore_js_op");
    jsonList.each((_, _json) => {
      const json = $(_json);
      const infoFrame = json.parents(".t_f");
      const infoCopied = infoFrame.clone();
      infoCopied.find("ignore_js_op").replaceWith("[JSON]");
      const avatar = json.parents(".plhin").find(".avatar a");
      const pid = Number(infoFrame.attr("id")?.slice(12)); // postmessage_xxxxx
      if (isNaN(pid)) return;
      table.appendData({
        user: `${ McmodderUtils.abstractLastFromURL(avatar.attr("href"), "center") },${ avatar.children().attr("alt") }`,
        pid: pid,
        name: json.find("a").text(),
        size: json.find("em").text().slice(1).split(", ")[0],
        info: infoCopied.text(),
        op: json.find("a").prop("href")
      });
    });
    table.refreshAll();
    McmodderUtils.updateAllTooltip();

    // 读取尾页页码
    this.maxPage = Number(doc.find(".last").first().text().slice(4));
  }

  async preSyncRow(selection: number | number[]) {
    if (!(selection instanceof Array)) selection = [selection];
    const length = selection.length;
    if (length > 100) {
      const isConfirm = await swal.fire({
        type: "warning",
        title: "警告",
        text: `您正在试图一次性从百科同步大量数据 (${ length.toLocaleString() })。推荐通过“从模组导入JSON”功能来从百科批量获取数据，无论如何都要继续吗？`,
        showCancelButton: true,
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        confirmButtonColor: "var(--mcmodder-color-danger)"
      });
      if (isConfirm.value) return await this.syncRow(selection);
    }
    else {
      return await this.syncRow(selection);
    }
  }

  private async syncRow(selection: McmodderTableRowSelection) {
    const length = selection.length;
    const itemList = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table!.getData(selection[i]));
    }
    await this.manualRequestQueue.run(itemList);
    const batch = new BatchCommand(this.table!);
    for (const i in itemList) {
      batch.push(new EditRowCommand(this.table!, selection[i], itemList[i]));
    }
    this.table!.execute(batch);
  }

  async preManualSubmitRow(index: number) {
    const data = this.table!.getData(index);
    if (data.id) {
      this.manualSubmitRow(`https://www.mcmod.cn/item/edit/${ data.id }/`, index);
      return;
    }
    let modID = data.classID || Number(this.activeFileName.split("-")[0]);
    if (!modID) await swal.fire({
      html: `
        请输入目标模组的百科内数字 ID...
        <input class="form-control" id="jsonframe-submit-classid">
      `,
      showCancelButton: true,
      confirmButtonText: "提交",
      cancelButtonText: "取消",
      preConfirm: () => {
        const input = Number($("#jsonframe-submit-classid").val());
        if (isNaN(input) || !input) {
          McmodderUtils.commonMsg("请输入一个合法的数值~", true);
          return false;
        }
        modID = input;
        return true;
      }
    });
    if (modID) {
      this.manualSubmitRow(`https://www.mcmod.cn/item/add/${ modID }/`, index);
    }
  }

  manualSubmitRow(url: string, index: number) {
    const data = this.convertToImportableFormat(this.table!.getData(index));
    const interactID = this.parent.utils.setInteract(JSON.stringify(data));
    GM_openInTab(`${ url }?i=${ interactID }`);
  }

  async submitRow(selection: number | number[]) {
    if (!(selection instanceof Array)) selection = [selection];
    const length = selection.length;
    const itemList = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table!.getData(selection[i]));
    }
    // await this.manualSubmitQueue.run(itemList);
    McmodderUtils.commonMsg("所有改动均已提交~");
  }

  private async getJSONByPage(page: number, table: McmodderTable<ItemJsonFrameApplication>) {
    await this.getJSONFromURL(`${ Mcmodder.URL_JSON_POST }&extra=&page=${ page }`, table);
  }

  async downloadAndImportFile(url: string) {
    // TODO: 修复 UTF-8 => ISO-8859-1 乱码问题
    let resp = await this.parent.utils.createAsyncRequest({ url: url });
    let headers = resp.responseHeaders;
    if (!headers.includes("content-type: application/octet-stream")) {
      McmodderUtils.commonMsg("下载失败...", false);
      console.error("Error downloading JSON file: " + resp);
      return;
    }
    let name = headers.split('filename="')[1].split('"\r\n')[0];
    let text = resp.responseText;
    this.importFromText(text, name);
  }

  async searchOnlineFiles() {
    if (!this.parent.currentUID) {
      McmodderUtils.commonMsg("请先登录~", false);
    }

    swal.fire({
      title: "从收纳贴获取JSON",
      html: `<div class="jsonframe-bbs-filelist" />`,
      footer: `<a target="_blank" href="${ Mcmodder.URL_JSON_POST }">前往 JSON 收纳贴</a>`,
      customClass: "swal2-popup-wider",
      showConfirmButton: false,
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      cancelButtonText: "完事了"
    });
    let fileTable = new McmodderTable<ItemJsonFrameApplication>(this.parent, {}, {
      user: ["发表者", McmodderTable.DISPLAYRULE_LINK_CENTER_WITH_NAME],
      pid: ["所属楼层编号", data => {
        return `<a target="_blank" href="https://bbs.mcmod.cn/forum.php?mod=redirect&goto=findpost&ptid=1281&pid=${ data }">${ data }</da>`
      }],
      name: "文件名",
      size: "文件大小",
      info: ["额外信息", McmodderTable.DISPLAYRULE_HOVER],
      op: ["操作", data => {
        return `<a class="jsonframe-bbs-filedl" data-url="${ data }">下载并导入</a>`
      }]
    });
    fileTable.$instance.appendTo(".jsonframe-bbs-filelist");

    fileTable.$instance.on("click", ".jsonframe-bbs-filedl", e => {
      const target = e.currentTarget as HTMLElement;
      const url = target.getAttribute("data-url");
      if (url) this.downloadAndImportFile(url);
    });
    
    await this.getJSONByPage(1, fileTable);
    let pagination = new Pagination(this.parent, null, this.maxPage, page => {
      this.getJSONByPage(page, fileTable);
    });
    pagination.$instance.insertAfter(".jsonframe-bbs-filelist");
  }

  private convertToImportableFormat(data: Partial<McmodderItemData>) {
    const entry: Record<string, any> = {};
    for (const key of McmodderValues.importableKeys) {
      let value = (data as any)[key];
      if (value === undefined || value === null || (typeof value === "number" && isNaN(value))) value = "";
      switch (key) {
        case "OredictList":
          entry[key] = value.replaceAll(",", ", ");
          break;
        case "smallIcon": case "largeIcon":
          entry[key] = McmodderUtils.removeBase64ImgPrefix(value);
          break;
        default: entry[key] = value;
      }
    }
    return entry as McmodderItemData;
  }

  exportJson(fileName: string) {
    if (!this.isAvailableFileName(fileName)) return false;
    let content = "";
    swal.fire({
      title: "导出文件",
      html: `
      <p class="text-muted" style="font-size: 14px;">
        即将保存 ${ fileName }，请注意未保存的改动不会被导出...
        <hr>
        <p align="center">
          <button id="jsonframe-export-1" class="btn">保存为通用批量导入格式</button>
        </p>
        <p class="text-muted jsonframe-export-text">只保留对批量导入有用的部分，便于提交给重生来导入。</p>
        <hr>
        <p align="center">
          <button id="jsonframe-export-2" class="btn">保存为完整格式</button>
        </p>
        <p class="text-muted jsonframe-export-text">
          保留全部内容，便于转移到其他安装了 Mcmodder v1.6+ 的浏览器查看。
          <strong>不支持批量导入，请勿直接提交此文件！！</strong>
        </p>
      </p>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "完事了"
    });
    $("#jsonframe-export-1").click(() => {
      content = "";
      this.table!.getAllData().forEach(e => {
        content += JSON.stringify(this.convertToImportableFormat(e)) + "\r\n";
      });
      McmodderUtils.saveFile(this.activeFileName, content);
      swal.close();
    });
    $("#jsonframe-export-2").click(() => {
      content = "";
      this.table!.getAllData().forEach(entry => {
        content += JSON.stringify(entry) + "\r\n";
      });
      McmodderUtils.saveFile(this.activeFileName, content);
      swal.close();
    });
  }
}