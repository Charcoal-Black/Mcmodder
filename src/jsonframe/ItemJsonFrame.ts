import { GM_openInTab } from "$";
import { Mcmodder } from "../Mcmodder";
import { InputRecommendation, McmodderItemData, McmodderItemList, McmodderTableRowSelection } from "../types";
import type { ItemJsonFrameApplication, ItemJsonFrameConfig, McmodderUnpurifiedItemData } from "../types";
export type { ItemJsonFrameApplication, ItemJsonFrameConfig, McmodderItemData };
import { McmodderDetailedItemListRequestQueue } from "../requestqueue/DetailedItemRequestQueue";
import { McmodderInferItemListRequestQueue } from "../requestqueue/InferRequestQueue";
import { BatchCommand } from "../table/command/BatchCommand";
import { EditRowCommand } from "../table/command/EditRowCommand";
import { McmodderEditableTable } from "../table/EditableTable";
import { McmodderTable } from "../table/Table";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInputType, McmodderPermission } from "../config/ConfigUtils";
import type { McmodderLogger } from "../widget/logger/Logger";
import { GMStorageRepository } from "./repository/GMStorageRepository";
import { IndexedDBRepository } from "./repository/IndexedDBRepository";
import type { ItemRepository } from "./repository/ItemRepository";

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

export interface ItemJsonFrameLogEntry {
  type: "info" | "warn" | "success" | "error" | "fatal" | "key";
  prefix: string;
  message: string;
  time: string;
}

export interface ItemJsonFrameTaskConfig {
  infer: boolean;
  geticon: boolean;
  getall: boolean;
}

export interface ItemJsonFrameExpose {
  updateState(): void;
  setLoggerEntries(entries: ItemJsonFrameLogEntry[]): void;
  showClassSearchPanel(): void;
  showOnlinePanel(): void;
  setSearchButtonBusy(busy: boolean): void;
  setOnlineFiles(files: ItemJsonFrameApplication[], maxPage: number): void;
}

export class ItemJsonFrameLogger implements McmodderLogger {
  private entries: ItemJsonFrameLogEntry[] = [];
  private listener?: (entries: ItemJsonFrameLogEntry[]) => void;

  clear() {
    this.entries = [];
    this.listener?.(this.entries.slice());
  }

  setListener(listener: (entries: ItemJsonFrameLogEntry[]) => void) {
    this.listener = listener;
    this.listener(this.entries.slice());
  }

  private write(type: ItemJsonFrameLogEntry["type"], prefix: string, message: string) {
    this.entries.push({
      type,
      prefix: prefix,
      message: message,
      time: McmodderUtils.getFormatted24hTime()
    });
    this.listener?.(this.entries.slice());
  }

  log(message: string) {
    this.write("info", "", message);
  }

  warn(message: string) {
    this.write("warn", "[WARN] ", message);
  }

  success(message: string) {
    this.write("success", "[SUCCESS] ", message);
  }

  error(message: string) {
    this.write("error", "[ERROR] ", message);
  }

  fatal(message: string) {
    this.write("fatal", "[FATAL] ", message);
  }

  key(message: string) {
    this.write("key", "", message);
  }
}

export class ItemJsonFrame {

  parent: Mcmodder;
  id: string;
  $instance: JQuery;
  instance: Element;
  logger = new ItemJsonFrameLogger();

  protected getConfigName() {
    return "mcmodderJsonStorage";
  }

  protected getAllowedKeys() {
    return ["id", "itemType", "registerName", "metadata", "smallIcon", "largeIcon", "name", "englishName",
      "creativeTabName", "branch", "type", "jumpTo", "jumpParent", "generalTo", "generalParent", "generalNum",
      "OredictList", "harvestTools", "maxStackSize", "maxDurability"];
  }

  protected purifyData(data: McmodderItemData) {
    const allowedKeys = this.getAllowedKeys();
    const entries = Object.entries(data);
    const filteredEntries = entries.filter(([key]) => allowedKeys.includes(key));
    return Object.fromEntries(filteredEntries) as McmodderItemData;
  }
  maxPage?: number;
  activeFileName = "";
  selectionList: string[] = [];
  hasRearranged = false;

  table: McmodderEditableTable<McmodderItemData>;

  protected inferRequestQueue: McmodderInferItemListRequestQueue;
  protected detailedRequestQueue: McmodderDetailedItemListRequestQueue;
  // 与另一个RequestQueue区分开，这个专用于处理用户手动发起的数据同步请求，只适用于小规模数据
  protected manualRequestQueue: McmodderDetailedItemListRequestQueue;
  protected readonly itemRepository: ItemRepository<McmodderItemData>;

  private component?: ItemJsonFrameExpose;
  private mountPromise?: Promise<void>;

  constructor(id: string, parent: Mcmodder) {
    this.id = id;
    this.parent = parent;

    if (this.parent.utils.getConfig("itemRepository")) {
      this.itemRepository = new IndexedDBRepository(this.getConfigName(), this.getAllowedKeys());
    } else {
      this.itemRepository = new GMStorageRepository(this.parent, this.getConfigName());
    }

    this.$instance = $(`<div id="jsonframe_${ id }" class="mcmodder-jsonframe"></div>`);
    this.instance = this.$instance.get(0);

    this.inferRequestQueue = new McmodderInferItemListRequestQueue(this.parent, "inferRequestQueue", 1000, this.logger);
    this.detailedRequestQueue = new McmodderDetailedItemListRequestQueue(this.parent, "detailedRequestQueue", 6, 750, this.logger);
    this.manualRequestQueue = new McmodderDetailedItemListRequestQueue(this.parent, "manualRequestQueue", 6, 750, this.logger);

    this.table = new McmodderEditableTable<McmodderItemData>(parent, {class: "table jsonframe-table"}, {
      itemType: ["类型", (type, item) => {
        return parent.utils.getItemTypeHTML(item.classID, type);
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
          res += `<a class="jsonframe-oredict badge mcmodder-monospace" target="_blank" href="${ McmodderUtils.getOredictURL(entry) }">${ entry }</a>`;
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
    });
    this.table.onEdit = () => {
      this.notifyUpdate();
    };
    this.table.onStopRearrange = () => {
      this.hasRearranged = true;
      this.notifyUpdate();
    };

    this.initContextMenu();

    this.itemRepository.init().then(() => this.updateSelection());

    this.ensureMounted();
  }

  private async ensureMounted() {
    if (this.component) return;
    if (!this.mountPromise) {
      this.mountPromise = Promise.all([
        import("../vue/components/ItemJsonFrame.vue"),
        import("../vue/mount")
      ]).then(([module, mount]) => {
        mount.mountVueApp(module.default, {
          frame: this,
          onReady: (api: ItemJsonFrameExpose) => {
            this.component = api;
            this.logger.setListener(entries => api.setLoggerEntries(entries));
          }
        }, this.$instance.get(0) as HTMLElement);
      });
    }
    return this.mountPromise;
  }

  private notifyUpdate() {
    this.component?.updateState();
  }

  private initContextMenu() {
    this.table.contextMenu
    .addItem({
      key: "syncRow",
      text: "从百科同步此行数据",
      displayRule: e => {
        const index = this.table.getEventIndex(e);
        return !!(
          index >= 0 && this.table.getEditorData(index, "id") &&
          this.parent.currentUID &&
          this.manualRequestQueue.isIdle
        );
      },
      callback: e => this.preSyncRow(this.table.getEventIndex(e))
    })
    .addItem({
      key: "syncMultipleRow",
      text: "从百科同步所有选中行数据",
      displayRule: _e => {
        return !!(
          this.table.selectedRowCount &&
          this.parent.currentUID &&
          this.manualRequestQueue.isIdle
        );
      },
      callback: _e => this.preSyncRow(this.table.getSelection())
    })
    .addItem({
      key: "manualSubmitRow",
      text: "提交此行数据至百科",
      displayRule: e => {
        const index = this.table.getEventIndex(e);
        return !!(index >= 0 && this.parent.currentUID);
      },
      callback: e => this.preManualSubmitRow(this.table.getEventIndex(e))
    });
  }


  async updateSelection() {
    this.selectionList = await this.itemRepository.listFilename();
    this.notifyUpdate();
  }

  isAvailableFileName(fileName: string) {
    return !!(fileName && this.selectionList.includes(fileName));
  }

  private getUniqueRegulatedFileName(name: string) {
    let regulated = McmodderUtils.regulateFileName(name);
    if (this.selectionList.includes(regulated)) {
      let i = 2, dot = regulated.lastIndexOf("."), main = regulated.slice(0, dot), extension = regulated.slice(dot + 1);
      let newName;
      while ((newName = `${ main }(${ i }).${ extension }`) && this.selectionList.includes(newName)) i++;
      regulated = newName!;
    }
    return regulated;
  }

  onCaughtParseException(err: unknown) {
    console.error("Error phasing raw JSON data: " + err);
    McmodderUtils.commonMsg(String(err), false, "解析错误");
  }

  protected parseText(text: string) {
    let success = 0, fail = 0, save: McmodderItemData[] = [];
    const entries = text.split('\n');
    entries.forEach(item => {
      item = item.trim();
      if (!item) return;
      try {
        const data = JSON.parse(item) as McmodderUnpurifiedItemData;
        if (data.hasOwnProperty("maxStacksSize")) {
          data.maxStackSize = data.maxStacksSize;
          delete data.maxStacksSize;
        }
        if (data.hasOwnProperty("CreativeTabName")) {
          data.creativeTabName = data.CreativeTabName;
          delete data.CreativeTabName;
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

  async importFromText(text: string, saveAs: string) {
    saveAs = this.getUniqueRegulatedFileName(saveAs);
    const {success, fail, result} = this.parseText(text);
    if (success) {
      const purified = result!.map(e => this.purifyData(e));
      await this.itemRepository.write(saveAs, purified);
      await this.updateSelection();
      McmodderUtils.commonMsg(`已读取并保存为 ${ saveAs }，其中 ${ success } 条解析成功，${ fail } 条解析失败。`);
    }
  }

  importFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = o => {
      const result = o.target?.result;
      if (typeof result === "string") {
        this.importFromText(result, file.name);
      }
    };
    reader.readAsText(file);
  }

  async newUnnamedJson() {
    const regulated = this.getUniqueRegulatedFileName("Unnamed.json");
    await this.itemRepository.createFile(regulated);
    await this.updateSelection();
    McmodderUtils.commonMsg(`创建了新的文件 ${ regulated } ~`);
  }

  async selectFile(fileName: string) {
    this.activeFileName = fileName;
    if (fileName) await this.loadJson(fileName);
    else this.reset();
  }

  async loadJson(fileName: string) {
    this.table.selectedRowCount = 0;
    this.table.unsaved = false;
    this.table.setAllData(await this.itemRepository.read(fileName) ?? []);
    this.hasRearranged = false;
    this.notifyUpdate();
  }

  async saveEdit() {
    if (!this.table.unsaved) {
      McmodderUtils.commonMsg("当前暂无需要保存的改动...", false);
      return;
    }
    this.table.saveAll();
    await this.itemRepository.write(this.activeFileName, this.table.getAllData());
    McmodderUtils.commonMsg("所有改动均已保存~");
    this.notifyUpdate();
  }

  rename() {
    const name = this.activeFileName;
    if (!name) return;
    swal.fire({
      title: "重命名当前文件",
      html: `将当前已打开的文件重命名为... <input class="form-control" id="jsonframe-rename-input">`,
      showCancelButton: true,
      preConfirm: async () => {
        const newName = this.getUniqueRegulatedFileName((input.val() as string || "").trim());
        if (name === newName) return;

        const fileData = await this.itemRepository.read(name);
        await this.itemRepository.deleteFile(name);
        await this.itemRepository.write(newName, fileData);

        let database: string[] = this.parent.utils.getConfig("jsonDatabase") || [];
        database = database.filter(e => e != name);
        database.push(newName);
        this.parent.utils.setConfig("jsonDatabase", database);

        McmodderUtils.commonMsg("文件重命名成功~");
        this.activeFileName = newName;
        await this.updateSelection();
      }
    });
    const input = $("#jsonframe-rename-input").val(name).change(e => {
      const target = e.currentTarget as HTMLInputElement;
      let newName = target.value.trim();
      target.value = McmodderUtils.regulateFileName(newName);
    });
  }

  fileExistedInquire(fileName: string) {
    return swal.fire({
      type: "warning",
      title: "文件名重复",
      text: `在脚本内部存储中已存在拥有该文件名 (${ fileName }) 的文件，继续导入将会覆盖此文件，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "覆盖",
      cancelButtonText: "取消",
    });
  }

  async newJson(fileName: string, content: McmodderItemData[]) {
    let storages = await this.itemRepository.listFilename();
    if (storages.includes(fileName)) {
      const isConfirm = await this.fileExistedInquire(fileName);
      if (isConfirm.value) {
        await this.itemRepository.write(fileName, content);
        await this.updateSelection();
        return true;
      }
      return false;
    }
    else {
      await this.itemRepository.write(fileName, content);
      await this.updateSelection();
      return true;
    }
  }

  fileDeleteInquire(fileName: string): Promise<SweetAlertCallbackState> {
    const { promise, resolve } = Promise.withResolvers<SweetAlertCallbackState>();
    swal.fire({
      type: "warning",
      title: "警告",
      text: `您正在尝试删除 (${fileName})，此操作不可逆，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-color-danger)"
    }).then(isConfirm => resolve(isConfirm));
    return promise;
  }

  async tryDeleteJson(fileName: string) {
    if (!this.isAvailableFileName(fileName)) return false;
    const isConfirm = await this.fileDeleteInquire(fileName);
    if (isConfirm.value) {
      await this.deleteJson(fileName);
      McmodderUtils.commonMsg(`成功删除 ${fileName} ~`);
      await this.updateSelection();
      return true;
    }
    return false;
  }

  private async deleteJson(fileName: string) {
    await this.itemRepository.deleteFile(fileName);
    let linking: string[] = this.parent.utils.getConfig("jsonDatabase") || [];
    this.parent.utils.setConfig("jsonDatabase", linking.filter(name => name != fileName));
  }

  reset() {
    this.activeFileName = "";
    this.table.selectedRowCount = 0;
    this.table.empty();
    this.notifyUpdate();
  }

  submitEdit() {
    if (!this.parent.currentUID) {
      McmodderUtils.commonMsg("请先登录~", false);
      return;
    }
    const lv: number = this.parent.utils.getProfile("lv");
    const permission: McmodderPermission = this.parent.utils.getProfile("permission");
    if (lv < 5 && !(permission === McmodderPermission.EDITOR || permission >= McmodderPermission.ADMIN)) {
      McmodderUtils.commonMsg("当前提交编辑需要验证码，暂无法使用此功能~（免验证码条件：用户主站等级≥Lv.5 或 已是任意模组编辑员或拥有更高权限）", false);
      return;
    }
    McmodderUtils.commonMsg("此功能尚未完工，敬请期待~");
  }


  more() {
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
      this.table.getAllData().forEach(e => {
        content += JSON.stringify(this.convertToImportableFormat(e)) + "\r\n";
      });
      McmodderUtils.saveFile(fileName, content);
      swal.close();
    });
    $("#jsonframe-export-2").click(() => {
      content = "";
      this.table.getAllData().forEach(entry => {
        content += JSON.stringify(entry) + "\r\n";
      });
      McmodderUtils.saveFile(fileName, content);
      swal.close();
    });
    return true;
  }

  private convertToImportableFormat(data: Partial<McmodderItemData>) {
    const entry: Record<string, unknown> = {};
    for (const key of McmodderValues.importableKeys) {
      let value = (data as Record<string, unknown>)[key];
      if (value === undefined || value === null || (typeof value === "number" && isNaN(value))) value = "";
      switch (key) {
        case "OredictList":
          entry[key] = typeof value === "string" ? value.replaceAll(",", ", ") : value;
          break;
        case "smallIcon": case "largeIcon":
          entry[key] = typeof value === "string" ? McmodderUtils.removeBase64ImgPrefix(value) : value;
          break;
        default: entry[key] = value;
      }
    }
    return entry as unknown as McmodderItemData;
  }


  getTypeRecommendations(classID: number): InputRecommendation[] {
    const result: InputRecommendation[] = [];
    this.parent.itemTypeList?.forEach(entry => {
      if (entry.classID === 0 || entry.classID === classID) {
        const typeHTML = entry.classID === 0 ? entry.icon : `<i class="fas ${ entry.icon }"></i>`;
        result.push({
          html: `<span style="color: ${ entry.color };"><span class="iconfont icon">${ typeHTML }</span> ${ entry.typeID } - ${ entry.text }</span>`,
          value: entry.typeID.toString(),
        });
      }
    });
    return result;
  }

  async openClassSearchFrame() {
    await this.ensureMounted();
    this.component?.showClassSearchPanel();
  }

  async performClassSearch(classID: number, typeID: number, config: ItemJsonFrameTaskConfig) {
    // STEP 0: 前置数据收集
    this.logger.log(`打开模组页 ${ classID }`);
    const resp = await this.parent.utils.createRequest({
      url: McmodderUtils.getClassURL(classID),
      method: "GET",
      anonymous: true
    });
    if (!resp.responseXML) {
      this.logger.fatal(`打开模组页 ${ classID } 失败`);
      return;
    }
    this.logger.log(`打开模组页 ${ classID } 完成`);
    const doc = $(resp.responseXML);
    const { classData } = McmodderUtils.parseClassDocument(doc);
    const className = classData.name;
    const classEname = classData.englishName;
    const maxNumber = parseInt(doc.find(".mold.mold-1 .count").text()?.split("(")[1]?.split("条)")[0]) || 0;
    if (!maxNumber) {
      const num1 = Math.abs(classID);
      const num2 = Math.abs(typeID);
      this.logger.warn((
        num1 === 114514 || num1 === 1919810 || num2 === 114514 || num2 === 1919810
      ) ? "这里除了屏幕前的 Homo 以外啥都木有..." : "这里啥都木有...");
      return;
    }

    const taskConfig: ItemJsonFrameConfig = {
      classID: classID,
      typeID: typeID,
      infer: config.infer,
      geticon: config.geticon,
      getall: config.getall
    };

    let itemList: McmodderItemList = [];

    const inferBackup = this.inferRequestQueue.backupManager.hasBackup();
    const detailedBackup = this.detailedRequestQueue.backupManager.hasBackup();

    // STEP 1: 初步获取所有物品的基础信息
    if (!inferBackup && !detailedBackup) {
      itemList = await this.getItemListByClassID(taskConfig);

      // STEP 1.5: O.O 似乎仍然会出现重复 ID 资料? 在这加个去重好了
      itemList = [...new Map(itemList.map(item => [item.id, item])).values()];
    }

    // STEP 2 (可选但推荐): 向前/向后拓展各个区间来获取隐藏资料的基础信息
    if (!detailedBackup) {
      if (taskConfig.infer) itemList = await this.inferRequestQueue.run(itemList, taskConfig);
    }

    // STEP 3 (可选): 访问各资料编辑页来获取各资料详细信息
    if (taskConfig.getall) itemList = await this.detailedRequestQueue.run(itemList);
    else if (taskConfig.geticon) itemList = await this.appendImageDataToItemList(itemList);

    // STEP 4: 保存结果，任务结束
    const rawName = `${classID}-${className}-${classEname}-${typeID}-${(new Date()).toLocaleString()}-${itemList.length}-Original.json`;
    const fileName = McmodderUtils.regulateFileName(rawName);
    this.logger.success(`成功加载全部 ${maxNumber.toLocaleString()} 中的 ${itemList.length.toLocaleString()} 个物品资料，并保存于 ${fileName}。`);
    await this.itemRepository.write(fileName, itemList);
    await this.updateSelection();
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
    let resp = await this.parent.utils.createRequest({
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
        resp = await this.parent.utils.createRequest({
          url: McmodderUtils.getItemURL(itemData.id),
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

    // 获取分支情况
    const resp = await this.parent.utils.createRequest({ 
      url: `${ this.parent.hostname }/item/list/${ classID }-${ typeID }.html`,
      method: "GET"
    });
    if (!resp.responseXML) return [];
    const doc = $(resp.responseXML).find(".item-list-branch-frame");
    if (doc.length) {
      doc.find("a").each((_, c) => {
        branchList.push((c as HTMLAnchorElement).href.split("/item/list/")[1].split(".html")[0]);
      });
      doc.find("a, span").each((_, c) => {
        branchNameList.push(c.textContent);
      });
    }

    // 根据分支情况逐一读取总物品列表
    config.classID = classID;
    for (let i in branchList) {
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" }`);
      await this.getItemListFromPage(`${ this.parent.hostname }/item/list/${ branchList[i] }.html`, itemList, branchNameList[i], config);
      this.logger.log(`展开分支 [${ branchList[i] }] ${ branchNameList[i] || "默认分支" } 完成`);
    }

    return itemList;
  }


  async searchOnlineFiles() {
    if (!this.parent.currentUID) {
      McmodderUtils.commonMsg("请先登录~", false);
      return;
    }
    await this.ensureMounted();
    this.component?.showOnlinePanel();
    await this.loadOnlineFiles(1);
  }

  async loadOnlineFiles(page: number) {
    const files = await this.getJSONByPage(page);
    this.component?.setOnlineFiles(files || [], this.maxPage || 1);
  }

  private async getJSONFromURL(url: string): Promise<ItemJsonFrameApplication[] | undefined> {
    let resp = await this.parent.utils.createRequest({ url: url, method: "GET" });
    if (!resp.responseXML) return undefined;
    let doc = $(resp.responseXML);
    if (doc.find("title").text() === "页面重载开启") {
      await McmodderUtils.sleep(1e3);
      return this.getJSONFromURL(url);
    }
    let jsonList: ItemJsonFrameApplication[] = [];
    doc.find("ignore_js_op").each((_, _json) => {
      const json = $(_json);
      const infoFrame = json.parents(".t_f");
      const infoCopied = infoFrame.clone();
      infoCopied.find("ignore_js_op").replaceWith("[JSON]");
      const avatar = json.parents(".plhin").find(".avatar a");
      const pid = Number(infoFrame.attr("id")?.slice(12)); // postmessage_xxxxx
      if (isNaN(pid)) return;
      jsonList.push({
        user: `${ McmodderUtils.abstractLastFromURL(avatar.attr("href"), "center") },${ avatar.children().attr("alt") }`,
        pid: pid,
        name: json.find("a").text(),
        size: json.find("em").text().slice(1).split(", ")[0],
        info: infoCopied.text(),
        op: json.find("a").prop("href")
      });
    });
    // 读取尾页页码
    this.maxPage = Number(doc.find(".last").first().text().slice(4));
    return jsonList;
  }

  private async getJSONByPage(page: number) {
    return this.getJSONFromURL(`${ Mcmodder.URL_JSON_POST }&extra=&page=${ page }`);
  }

  async downloadAndImportFile(url: string) {
    // TODO: 修复 UTF-8 => ISO-8859-1 乱码问题
    let resp = await this.parent.utils.createRequest({ url: url });
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
    const itemList: McmodderItemData[] = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table.getEditorRowData(selection[i]));
    }
    await this.manualRequestQueue.run(itemList);
    const batch = new BatchCommand(this.table);
    for (const i in itemList) {
      batch.push(new EditRowCommand(this.table, selection[i], itemList[i]));
    }
    this.table.execute(batch);
  }

  async preManualSubmitRow(index: number) {
    const data = this.table.getData(index);
    if (data.id) {
      this.manualSubmitRow(`${ this.parent.hostname }/item/edit/${ data.id }/`, index);
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
      this.manualSubmitRow(`${ this.parent.hostname }/item/add/${ modID }/`, index);
    }
  }

  manualSubmitRow(url: string, index: number) {
    const data = this.convertToImportableFormat(this.table.getData(index));
    const interactID = this.parent.utils.setInteract(JSON.stringify(data));
    GM_openInTab(`${ url }?i=${ interactID }`);
  }

  async submitRow(selection: number | number[]) {
    if (!(selection instanceof Array)) selection = [selection];
    const length = selection.length;
    const itemList = new Array(length);
    for (const i in selection) {
      itemList[i] = McmodderUtils.simpleDeepCopy(this.table.getData(selection[i]));
    }
    McmodderUtils.commonMsg("所有改动均已提交~");
  }
}
