<template>
  <JsonFrame
    ref="jsonFrame"
    :id="id"
    :parent="parent"
    :config-name="configName"
    :allowed-keys="indexedKeys"
    :rowOptions="rowOptions"
    :edit-configs="editConfigs"
    :attr="{
      class: 'table jsonframe-table',
    }"
    :opts="{
      idbRepo,
      parseText,
      more,
    }"
    @rename="onRename"
    @delete="onDelete"
  />
  <Teleport :to="importContainer">
    <div class="edit-autolink-frame" ref="classSearchFrame">
      <div class="input-group edit-autolink-seach">
        <input
          ref="idInput"
          placeholder="输入模组的百科数字 ID.."
          class="form-control"
          @keyup="onClassIDInputKeyup"
        />
        <input
          ref="typeInput"
          placeholder="输入资料类型 ID.. (留空默认为 1)"
          class="form-control"
          @keyup="onTypeIDInputKeyup"
        />
        <Button ref="submitButton" :on-click="onSubmitButtonClick">执行</Button>
      </div>
      <Logger ref="logger" :parent="parent" />
      <div class="title">导入设置:</div>
      <div class="edit-autolink-style">
        <div class="checkbox">
          <input :id="`jsonframe_${id}-importclass-infer`" name="infer" type="checkbox" />
          <label :for="`jsonframe_${id}-importclass-infer`"
            >访问潜在资料 -
            在一轮资料列表获取完毕后，考虑到同一类资料通常是在同一个批次中批量添加的，脚本会试图访问那些可能仍然属于目标模组区域，但是未出现在现有资料列表中的物品资料
            ID。这种方法能够应对综合子资料数量大于 100
            的情况，以及访问到部分隐藏分类中的资料。</label
          >
        </div>
        <div class="checkbox">
          <input :id="`jsonframe_${id}-importclass-geticon`" name="geticon" type="checkbox" />
          <label :for="`jsonframe_${id}-importclass-geticon`"
            >保存物品图标 - 读取的同时获取物品的小图标和大图标，并以 Base64 格式保存进 JSON
            文件里。启用该项配置会显著增大输出文件体积；若不启用，则在显示物品图标时会实时从百科获取图标。</label
          >
        </div>
        <div class="checkbox">
          <input :id="`jsonframe_${id}-importclass-getall`" name="getall" type="checkbox" />
          <label :for="`jsonframe_${id}-importclass-getall`"
            >保存完整数据 -
            读取一个资料的全部数据（包括图标、注册名、物品标签等所有可以在编辑页访问的数据）。启用该项配置会忽略“保存物品图标”的配置。确切来说，脚本会通过逐一访问所有物品的编辑页来获取这些数据。<strong
              >启用此项将会向服务器发送大量请求，使用前请务必妥善配置脚本“最短发包间隔”！！</strong
            ></label
          >
        </div>
      </div>
      <span class="mcmodder-getitemlist-result"></span>
    </div>
  </Teleport>
  <Teleport :to="bbsFilelistContainer">
    <div class="edit-autolink-frame" @click="onDownloadClick">
      <GenericTable ref="fileTable" :parent="parent" :rowOptions="jsonApplicationRowOptions" />
      <Pagination
        :parent="parent"
        :current-page="1"
        :max-page="maxPage"
        :callback="(page) => onPaginationCallback(page)"
      />
    </div>
  </Teleport>
  <Teleport :to="exportContainer">
    <div class="text-muted" style="font-size: 14px">
      即将保存 {{ jsonFrame?.activeFileName }}，请注意未保存的改动不会被导出...
      <hr />
      <p align="center">
        <button class="btn" @click="onCommonExportClick">保存为通用批量导入格式</button>
      </p>
      <p class="text-muted jsonframe-export-text">
        只保留对批量导入有用的部分，便于提交给重生来导入。
      </p>
      <hr />
      <p align="center">
        <button class="btn" @click="onFullExportClick">保存为完整格式</button>
      </p>
      <p class="text-muted jsonframe-export-text">
        保留全部内容，便于转移到其他安装了 Mcmodder v1.6+ 的浏览器查看。
        <strong>不支持批量导入，请勿直接提交此文件！！</strong>
      </p>
    </div>
  </Teleport>
  <Teleport :to="autoLinkContainer">
    <div class="text-muted" style="font-size: 14px">
      <hr />
      <p align="center">
        <button
          id="jsonframe-autolink"
          class="btn"
          :disabled="!jsonFrame?.activeFileName"
          @click="onChangeLinkState"
        >
          <template v-if="isFileLinked">移出自动链接数据库</template>
          <template v-else>加入自动链接数据库</template>
        </button>
      </p>
      <p class="text-muted jsonframe-export-text">
        在编辑页使用自动链接（本地优先搜索）时，资料会从所有已添加的 JSON 资料列表中<strong
          >**已拥有百科内资料 ID 的物品中**</strong
        >搜索~
      </p>
      <!-- <hr>
      <p align="center">
        <button id="jsonframe-autolink" class="btn">清除所有格式化代码</button>
      </p>
      <p class="text-muted jsonframe-export-text">清除所有原版可用的格式化代码。</p> -->
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, onMounted, ref, useTemplateRef } from "vue";
import { InputType } from "../../../config/ConfigUtils.ts";
import { TableUtils } from "../../../table/Table.ts";
import { Utils } from "../../../Utils.ts";
import Logger from "../logger.vue";
import JsonFrame from "./JsonFrame.vue";
import { InputListController } from "../../../widget/InputListController.ts";
import Button from "../Button.vue";
import { InferItemListRequestQueue } from "../../../requestqueue/InferRequestQueue.ts";
import { DetailedItemListRequestQueue } from "../../../requestqueue/DetailedItemRequestQueue.ts";
import { GM_openInTab } from "$";
import { Values } from "../../../Values.ts";
import { Mcmodder } from "../../../Mcmodder.ts";
import { BatchCommand } from "../../../table/command/BatchCommand.ts";
import { EditRowCommand } from "../../../table/command/EditRowCommand.ts";
import GenericTable from "../table/GenericTable.vue";
import Pagination from "../Pagination.vue";
import type { JsonFrameProps } from "../../../types/props";
import { ItemIDBRepository } from "../../../jsonframe/repository/ItemIDBRepository.ts";

const props = withDefaults(
  defineProps<
    JsonFrameProps & {
      importContainer?: HTMLDivElement;
      bbsFilelistContainer?: HTMLDivElement;
      exportContainer?: HTMLDivElement;
      autoLinkContainer?: HTMLDivElement;
    }
  >(),
  {
    importContainer: () => document.createElement("div"),
    bbsFilelistContainer: () => document.createElement("div"),
    exportContainer: () => document.createElement("div"),
    autoLinkContainer: () => document.createElement("div"),
  },
);

const configName = "mcmodderJsonStorage";
const indexedKeys = [
  "id",
  "registerName",
  "metadata",
  "name",
  "englishName",
  "creativeTabName",
  "branch",
  "OredictList",
];
const rowOptions = {
  itemType: [
    "类型",
    (type, item) => {
      return props.parent.utils.getItemTypeHTML(item.classID, type).prop("outerHTML");
    },
  ],
  smallIcon: ["小", TableUtils.DISPLAYRULE_IMAGE_BASE64],
  largeIcon: ["大", TableUtils.DISPLAYRULE_IMAGE_BASE64],
  id: ["资料 ID", TableUtils.DISPLAYRULE_LINK_ITEM],
  branch: "分支",
  relation: [
    "关联",
    (_, data) => {
      if (data.generalParent)
        return `<span class="mcmodder-general"><strong>综合父资料</strong></span> <span class="text-muted">(${data.generalNum})</span>`;
      if (data.generalTo)
        return `<span class="mcmodder-general">综合</span>至 <a href="javascript:void(0)" class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${data.generalTo}">${data.generalTo}</a>`;
      if (data.jumpTo)
        return `<span class="mcmodder-jump">合并</span>至 <a href="javascript:void(0)" class="mcmodder-table-goto" data-goto-key="id" data-goto-value="${data.jumpTo}">${data.jumpTo}</a>`;
      return null;
    },
  ],
  name: ["主要名称", Utils.getFormattedCodeDecoratedHTML],
  englishName: ["次要名称", Utils.getFormattedCodeDecoratedHTML],
  creativeTabName: "分类",
  type: "种类",
  registerName: ["注册名", TableUtils.DISPLAYRULE_MONOSPACE],
  metadata: ["元数据", TableUtils.DISPLAYRULE_NUMBER],
  OredictList: [
    "矿物词典/物品标签",
    (data) => {
      if (!data || data.charAt(0) != "[") return data;
      let res = "";
      const entries = data.slice(1, -1).split(",") as string[];
      entries.forEach((entry) => {
        entry = entry.trim();
        res += `<a class="jsonframe-oredict badge mcmodder-monospace" target="_blank" href="${Utils.getOredictURL(entry)}">${entry}</a>`;
      });
      return res;
    },
  ],
  maxStackSize: ["最大堆叠", TableUtils.DISPLAYRULE_NUMBER],
  maxDurability: ["最大耐久", TableUtils.DISPLAYRULE_NUMBER],
} satisfies RowOptionsInitializer<Item>;
const editConfigs = {
  id: InputType.NUMBER,
  itemType: {
    type: InputType.NUMBER,
    value: 1,
  },
  classID: InputType.NUMBER,
  classAbbr: null,
  className: null,
  classEname: null,
  registerName: {
    type: InputType.TEXT,
    optional: true,
  },
  metadata: {
    type: InputType.NUMBER,
    optional: true,
  },
  smallIcon: {
    type: InputType.TEXT,
    optional: true,
  },
  largeIcon: {
    type: InputType.TEXT,
    optional: true,
  },
  name: InputType.TEXT,
  englishName: {
    type: InputType.TEXT,
    optional: true,
  },
  creativeTabName: {
    type: InputType.TEXT,
    optional: true,
  },
  branch: {
    type: InputType.TEXT,
    optional: true,
  },
  type: null,
  jumpTo: null,
  jumpParent: null,
  generalTo: null,
  generalParent: null,
  generalNum: null,
  OredictList: null,
  harvestTools: null,
  maxStackSize: InputType.NUMBER,
  maxDurability: InputType.NUMBER,
  content: null,
} satisfies EditOptionsInitializer<Item>;

const jsonApplicationRowOptions = {
  user: ["发表者", TableUtils.DISPLAYRULE_LINK_CENTER_WITH_NAME],
  pid: [
    "所属楼层编号",
    (data, _row) => {
      return `<a target="_blank" href="https://bbs.mcmod.cn/forum.php?mod=redirect&goto=findpost&ptid=1281&pid=${data}">${data}</da>`;
    },
  ],
  name: "文件名",
  size: "文件大小",
  info: ["额外信息", TableUtils.DISPLAYRULE_HOVER],
  op: [
    "操作",
    (data, _row) => {
      return `<a tabindex="-1" class="jsonframe-bbs-filedl" data-url="${data}">下载并导入</a>`;
    },
  ],
} satisfies RowOptionsInitializer<ItemJsonFrameApplication>;

const jsonFrame = useTemplateRef("jsonFrame");
const logger = useTemplateRef("logger");
const idInput = useTemplateRef("idInput");
const typeInput = useTemplateRef("typeInput");
const classSearchFrame = useTemplateRef("classSearchFrame");
const fileTable = useTemplateRef("fileTable");

const maxPage = ref(1);

let inferRequestQueue: InferItemListRequestQueue | undefined;
let detailedRequestQueue: DetailedItemListRequestQueue | undefined;

// 与另一个RequestQueue区分开，这个专用于处理用户手动发起的数据同步请求，只适用于小规模数据
const manualRequestQueue = new DetailedItemListRequestQueue(props.parent, "manualRequestQueue");

onMounted(() => {
  logger.value!.key("就绪。");
  inferRequestQueue = new InferItemListRequestQueue(
    props.parent,
    "inferRequestQueue",
    1000,
    logger.value!,
  );
  detailedRequestQueue = new DetailedItemListRequestQueue(
    props.parent,
    "detailedRequestQueue",
    6,
    750,
    logger.value!,
  );

  InputListController.instance.add(typeInput.value!, {
    suggestionManager: {
      onInitSuggestion: () => {
        const classID = Number(idInput.value!.value);
        const result: InputSuggestion[] = [];
        let typeHTML = "";
        props.parent.itemTypeList?.forEach((entry) => {
          if (entry.classID === 0 || entry.classID === classID) {
            if (entry.classID === 0) {
              typeHTML = Utils.escapeHTML(entry.icon);
            } else {
              typeHTML = `<i class="fas ${Utils.escapeHTML(entry.icon)}"></i>`;
            }

            result.push({
              html: `<span style="color: ${Utils.escapeHTML(entry.color)};"><span class="iconfont icon">${
                typeHTML
              }</span> ${Utils.escapeHTML(entry.typeID)} - ${Utils.escapeHTML(entry.text)}</span>`,
              value: entry.typeID.toString(),
              noEscape: true,
            });
          }
        });
        return result;
      },
    },
  });

  const frame = jsonFrame.value!;
  const table = frame!.table!;
  table
    .contextMenu!.addItem({
      key: "syncRow",
      text: "从百科同步此行数据",
      displayRule: (e) => {
        const index = table.getElementIndex(e.target);
        return !!(
          index >= 0 &&
          table.getEditorData(index, "id") &&
          props.parent.currentUID &&
          manualRequestQueue.isIdle
        );
      },
      callback: (e) => preSyncRow(table.getElementIndex(e.target)),
    })
    .addItem({
      key: "syncMultipleRow",
      text: "从百科同步所有选中行数据",
      displayRule: (_e) => {
        return !!(table.selectedRowCount && props.parent.currentUID && manualRequestQueue.isIdle);
      },
      callback: (_e) => preSyncRow(table.getSelection()),
    })
    .addItem({
      key: "manualSubmitRow",
      text: "提交此行数据至百科",
      displayRule: (e) => {
        const index = table.getElementIndex(e.target);
        return !!(index >= 0 && props.parent.currentUID);
      },
      callback: (e) => preManualSubmitRow(table.getElementIndex(e.target)),
    });

  jsonFrame.value!.addTool(
    "export",
    "导出当前文件至本地",
    () => !!frame.activeFileName,
    () => exportJson(frame.activeFileName),
  );
  jsonFrame.value!.addTool(
    "importClass",
    "从模组导入JSON",
    () => true,
    () => openClassSearchFrame(),
  );
  jsonFrame.value!.addTool(
    "importOnline",
    "从收纳贴导入JSON",
    () => true,
    () => searchOnlineFiles(),
  );
  jsonFrame.value!.addTool(
    "submitedit",
    "提交所有改动至百科",
    () => !!(frame.activeFileName && table.unsaved),
    () => frame.submitEdit(),
    true,
  );
});

function onClassIDInputKeyup(e: KeyboardEvent) {
  if (e.key === "Enter") {
    typeInput.value!.focus();
  }
}

function onTypeIDInputKeyup(e: KeyboardEvent) {
  if (e.key === "Enter") {
    onSubmitButtonClick();
  }
}

async function onSubmitButtonClick() {
  const classID = Number(idInput.value!.value.trim());
  const typeID = Number(typeInput.value!.value.trim());
  if (isNaN(classID)) {
    Utils.commonMsg("请输入一个合法的模组 ID ~", false);
    idInput.value?.focus();
    return;
  }
  if (isNaN(typeID)) {
    typeInput.value?.focus();
    Utils.commonMsg("请输入一个合法的资料类型 ID ~", false);
    return;
  }

  idInput.value?.blur();
  typeInput.value?.blur();
  const startTime = Date.now();
  logger.value!.key(`任务已创建，请等待执行结束，期间请勿关闭当前标签页。`);

  try {
    await performClassSearch(classID, typeID || 1);
  } catch (e) {
    logger.value!.fatal(String(e));
    console.error(e);
  } finally {
    const endTime = Date.now();
    logger.value!.key(`任务已结束，耗时 ${Utils.getFormattedTime(endTime - startTime)}。`);
  }
}

async function openClassSearchFrame() {
  if (!classSearchFrame.value) return;
  swal.fire({
    title: "从现有模组资料导入JSON",
    html: `<div class="jsonframe-import-container" />`,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "完事了",
  });
  $(".jsonframe-import-container").append(props.importContainer);
  logger.value!.scrollToBottom();
}

// @override
function idbRepo() {
  return new ItemIDBRepository();
}

// @override
function parseText(text: string) {
  let success = 0,
    fail = 0,
    save: Item[] = [];
  const entries = text.split("\n");
  entries.forEach((item) => {
    item = item.trim();
    if (!item) return;
    try {
      const data = JSON.parse(item) as UnpurifiedItem;
      if (data.hasOwnProperty("maxStacksSize")) {
        data.maxStackSize = data.maxStacksSize;
        delete data.maxStacksSize;
      }
      if (data.hasOwnProperty("CreativeTabName")) {
        data.creativeTabName = data.CreativeTabName;
        delete data.CreativeTabName;
      }
      data.smallIcon = Utils.appendBase64ImgPrefix(data.smallIcon);
      data.largeIcon = Utils.appendBase64ImgPrefix(data.largeIcon);
      success++;
      save.push(data);
    } catch (err) {
      if (!fail) {
        // 只输出第一条错误信息，要不然卡死了 >_<
        jsonFrame.value!.onCaughtParseException(err);
      }
      fail++;
    }
  });
  return {
    success: success,
    fail: fail,
    result: save,
  };
}

async function getImageBlobByItemList(itemList: ItemList, width: 32 | 128, maxConcurrent = 6) {
  // 大力出奇迹
  const results = new Array(itemList.length);
  const running = new Set();
  let i = 0;
  while (i < itemList.length) {
    if (itemList[i].smallIcon && itemList[i].largeIcon) {
      results[i] = null;
      continue;
    }
    if (running.size < maxConcurrent) {
      const index = i;
      const promise = fetch(Utils.getImageURLByItemID(itemList[index].id, width), {
        redirect: "manual",
      })
        .then((resp) => resp.blob())
        .then((blob) => {
          if (blob.size) {
            results[index] = blob;
            logger.value!.log(`获取 ${itemList[index].id}-${width}x 图标 完成`);
          } else {
            results[index] = null;
            logger.value!.log(`${itemList[index].id} 没有图标`);
          }
        })
        .catch((err) => {
          if (err instanceof TypeError) logger.value!.error("网络连接失败");
          else {
            logger.value!.error("未知错误");
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

async function inferItemList(itemList: ItemList, config: ItemJsonFrameConfig) {
  let check = async (id: number) => {
    const data = config.getall
      ? await props.parent.utils.getDetailedItemByID(id)
      : await props.parent.utils.getItemByID(id);
    if (!data) {
      logger.value!.log(`${id} 已失效`);
      return false;
    }
    if (data.classID === config.classID) {
      if (data.itemType && data.itemType != 1) {
        logger.value!.log(`${id} 属于目标模组，但资料分类不是“物品/方块”`);
        return false;
      }
      itemList.push(data);
      logger.value!.success(`[${data.id}] ${Utils.getItemFullName(data.name, data.englishName)}`);
      return true;
    }
    logger.value!.log(`${id} 不属于目标模组，而是属于 ${data.classID}`);
    return false;
  };

  logger.value!.log(`共 ${itemList.length.toLocaleString()} 个资料`);
  logger.value!.log("搜索潜在资料");
  const ids = itemList.map((item) => item.id).sort((a, b) => a - b);
  const idsLength = ids.length;
  ids.push(Number.MAX_SAFE_INTEGER);
  let prev = ids[0],
    l = 0,
    r;

  for (let i = 1; i <= idsLength; i++) {
    if (ids[i] === prev + 1) {
      prev = ids[i];
      continue;
    }
    r = i - 1;
    logger.value!.log(
      `连续区间 [${ids[l]}, ${ids[r]}] - ${Utils.getPrecisionFormatter().format(((i - 1) / idsLength) * 100)}% 已完成`,
    );
    for (let j = ids[l] - 1; j > (l === 0 ? 0 : ids[l - 1]); j--) {
      if (!(await check(j))) break;
    }
    for (let j = ids[r] + 1; j < ids[r + 1]; j++) {
      if (!(await check(j))) break;
      ids[r] = j; // 避免该区间向右拓展的部分，在下个区间向左拓展时，发生重复
    }
    prev = ids[i];
    l = i;
  }
  logger.value!.log("搜索潜在资料 完成");
}

async function appendImageDataToItemList(itemList: ItemList) {
  const blobs32x = await getImageBlobByItemList(itemList, 32);
  const blobs128x = await getImageBlobByItemList(itemList, 128);
  for (const i in itemList) {
    if (blobs32x[i]) itemList[i].smallIcon = await Utils.blob2Base64(blobs32x[i]);
    if (blobs128x[i]) itemList[i].largeIcon = await Utils.blob2Base64(blobs128x[i]);
  }
  return itemList;
}

async function getItemListFromPage(
  url: string,
  itemList: ItemList,
  branchName: string,
  config: ItemJsonFrameConfig,
) {
  let jumpList = [],
    generalList = [],
    repeatedData;
  let resp = await props.parent.utils.createRequest({
    url: url,
    method: "GET",
  });
  if (!resp.responseXML) return;
  const doc = $(resp.responseXML);
  const table = doc.find(".item-list-table");
  let s;
  for (let _c of table.find(".item-list-type-right li").toArray()) {
    let c = $(_c);
    const itemID = Utils.abstractIDFromURL(c.find("a").last().attr("href"), "item");

    // 递归处理超大分类的情况
    if (c.find(".more").length) {
      const categoryURL = c.find(".more").prop("href");
      const categoryID = Number(
        categoryURL.split(`${config.classID}-${config.typeID}-`)[1].slice(0, -5),
      );
      logger.value!.log(`展开分类 ${categoryID}`);
      await getItemListFromPage(categoryURL, itemList, branchName, config);
      logger.value!.log(`展开分类 ${categoryID} 完成`);
    }

    // 处理普通资料
    if (!itemID || isNaN(Number(itemID))) continue;
    if ((repeatedData = itemList.filter((e) => e.id === itemID)[0])) {
      if (!branchName) continue;
      if (!repeatedData.branch?.split(",").includes(branchName))
        repeatedData.branch += "," + branchName;
    }
    c = c.find("a").last();
    const categoryArray = c
      .parents(".item-list-type-right")
      .prev()
      .toArray()
      .reverse()
      .map((a) => a.textContent);

    const item: Item = {
      id: itemID,
      classID: config.classID,
      smallIcon: "",
      largeIcon: "",
      name: c.text(),
      englishName: c.attr("data-en"),
      creativeTabName: categoryArray.length ? categoryArray.join(":") : "",
      branch: branchName,
    };
    item.itemType = config.typeID;
    logger.value!.success(`[${item.id}] ${Utils.getItemFullName(item.name, item.englishName)}`);

    // 处理合并资料
    s = c.parents(".skip");
    // console.log(item);
    if (s.length) {
      item.jumpTo = Utils.abstractIDFromURL(s.prev().find("a").last().attr("href"), "item");
      jumpList.push(item.jumpTo);
    }

    // 处理综合资料
    s = c.attr("data-loop");
    if (s) {
      generalList.push(item.id);
      resp = await props.parent.utils.createRequest({
        url: Utils.getItemURL(item.id),
        method: "GET",
        anonymous: true,
      });
      if (!resp.responseXML) return;
      const doc = $(resp.responseXML);

      // 展开综合父资料
      logger.value!.log(`${item.id} 是综合父资料，展开此物品页`);
      item.generalNum = Number(
        doc.find(".item-skip-list legend").text().split("共有 ")[1].split(" 个")[0],
      );
      if (item.generalNum === 100) {
        logger.value!.warn("综合子资料达到上限 (100) ，可能无法访问部分子资料");
      }
      for (let _b of doc.find(".item-skip-list ul a").toArray()) {
        const b = $(_b);
        const s = doc.find(`.name[data-id=${b.attr("data-for")}]`);
        const childID = Utils.abstractIDFromURL(s.next().find("a").first().attr("href"), "item");
        const generalData: Item = {
          id: childID,
          itemType: config.typeID,
          smallIcon: "",
          largeIcon: "",
          name: b.text(),
          englishName: s
            .text()
            .split(b.text() + " (")[1]
            ?.split(")")[0],
          creativeTabName: item.creativeTabName,
          generalTo: item.id,
          branch: branchName,
          classID: config.classID,
        };
        itemList.push(generalData);
        logger.value!.success(
          `[${generalData.id}] ${Utils.getItemFullName(generalData.name, generalData.englishName)}`,
        );
      }
      logger.value!.log(`展开物品 ${item.id} 完成`);
    }

    itemList.push(item);
  }

  // 根据已记录的所有合并/综合子资料数据来标记合并/综合父资料
  itemList.forEach((e) => {
    e.jumpParent = jumpList.includes(e.id);
    e.generalParent = generalList.includes(e.id);
  });

  return itemList;
}

async function getItemListByClassID(config: ItemJsonFrameConfig) {
  let itemList: ItemList = [];
  const classID = config.classID;
  const typeID = config.typeID;
  /* let hiddenCategoryList = []; */
  const branchList = [`${classID}-${typeID}`];
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
  const resp = await props.parent.utils.createRequest({
    url: `${props.parent.hostname}/item/list/${classID}-${typeID}.html`,
    method: "GET",
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
    logger.value!.log(`展开分支 [${branchList[i]}] ${branchNameList[i] || "默认分支"}`);
    await getItemListFromPage(
      `${props.parent.hostname}/item/list/${branchList[i]}.html`,
      itemList,
      branchNameList[i],
      config,
    );
    logger.value!.log(`展开分支 [${branchList[i]}] ${branchNameList[i] || "默认分支"} 完成`);
  }

  // 搁置
  // for (let e of hiddenCategoryList) await this.getItemListFromPage(`https://www.mcmod.cn/item/list/${id}-1-${e}.html`, itemList);

  return itemList;
}

async function performClassSearch(classID: number, typeID: number) {
  // STEP 0: 前置数据收集
  logger.value!.log(`打开模组页 ${classID}`);
  const resp = await props.parent.utils.createRequest({
    url: Utils.getClassURL(classID),
    method: "GET",
    anonymous: true,
  });
  if (!resp.responseXML) {
    logger.value!.fatal(`打开模组页 ${classID} 失败`);
    return;
  }
  logger.value!.log(`打开模组页 ${classID} 完成`);
  const doc = $(resp.responseXML);
  const { classData } = Utils.parseClassDocument(doc);
  const className = classData.name;
  const classEname = classData.englishName;
  const maxNumber =
    parseInt(doc.find(".mold.mold-1 .count").text()?.split("(")[1]?.split("条)")[0]) || 0;
  if (!maxNumber) {
    const num1 = Math.abs(classID);
    const num2 = Math.abs(typeID);
    logger.value!.warn(
      num1 === 114514 || num1 === 1919810 || num2 === 114514 || num2 === 1919810
        ? "这里除了屏幕前的 Homo 以外啥都木有..."
        : "这里啥都木有...",
    );
    return;
  }

  const configTemp: Record<string, any> = { classID, typeID };
  $(classSearchFrame.value!)
    .find("input[name]")
    .each((_, _input) => {
      const input = _input as HTMLInputElement;
      const name = input.getAttribute("name") as keyof ItemJsonFrameConfig;
      if (name) configTemp[name] = input.checked;
    });
  const config = configTemp as ItemJsonFrameConfig;

  let itemList: ItemList = [];

  const inferBackup = inferRequestQueue!.backupManager.hasBackup();
  const detailedBackup = detailedRequestQueue!.backupManager.hasBackup();

  // STEP 1: 初步获取所有物品的基础信息
  if (!inferBackup && !detailedBackup) {
    itemList = await getItemListByClassID(config);

    // STEP 1.5: O.O 似乎仍然会出现重复 ID 资料? 在这加个去重好了
    itemList = [...new Map(itemList.map((item) => [item.id, item])).values()];
  }

  // STEP 2 (可选但推荐): 向前/后拓展各个区间来获取隐藏资料的基础信息
  if (!detailedBackup) {
    if (config.infer) itemList = await inferRequestQueue!.run(itemList, config);
  }

  // STEP 3 (可选): 访问各资料编辑页来获取各资料详细信息
  if (config.getall) itemList = await detailedRequestQueue!.run(itemList);
  else if (config.geticon) itemList = await appendImageDataToItemList(itemList);

  // STEP 4: 保存结果，任务结束
  const rawName = `${classID}-${className}-${classEname}-${typeID}-${new Date().toLocaleString()}-${itemList.length}-Original.json`;
  const fileName = Utils.regulateFileName(rawName);
  logger.value!.success(
    `成功加载全部 ${maxNumber.toLocaleString()} 中的 ${itemList.length.toLocaleString()} 个物品资料，并保存于 ${fileName}。`,
  );
  await jsonFrame.value!.appRepository.write(fileName, itemList);
  await jsonFrame.value!.updateSelection();
}

async function getJSONFromURL(url: string, ctx: TableContext<ItemJsonFrameApplication>) {
  ctx.empty();
  ctx.showLoading();
  let resp = await props.parent.utils.createRequest({
    url: url,
    method: "GET",
  });
  if (!resp.responseXML) return;
  let doc = $(resp.responseXML);
  if (doc.find("title").text() === "页面重载开启") {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        getJSONFromURL(url, ctx).then(() => resolve());
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
    ctx.appendData({
      user: `${Utils.abstractLastFromURL(avatar.attr("href"), "center")},${avatar.children().attr("alt")}`,
      pid: pid,
      name: json.find("a").text(),
      size: json.find("em").text().slice(1).split(", ")[0],
      info: infoCopied.text(),
      op: json.find("a").prop("href"),
    });
  });
  ctx.refreshAll();
  Utils.updateAllTooltip();

  // 读取尾页页码
  const newMaxPage = Number(doc.find(".last").first().text().slice(4));
  if (Number.isFinite(newMaxPage)) {
    maxPage.value = newMaxPage;
  }
}

async function preSyncRow(selection: number | number[]) {
  if (!(selection instanceof Array)) selection = [selection];
  const length = selection.length;
  if (length > 100) {
    const isConfirm = await swal.fire({
      type: "warning",
      title: "警告",
      text: `您正在试图一次性从百科同步大量数据 (${length.toLocaleString()})。推荐通过“从模组导入JSON”功能来从百科批量获取数据，无论如何都要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-color-danger)",
    });
    if (isConfirm.value) return await syncRow(selection);
  } else {
    return await syncRow(selection);
  }
}

async function syncRow(selection: TableRowSelection) {
  const length = selection.length;
  const itemList: Item[] = new Array(length);
  for (const i in selection) {
    itemList[i] = Utils.simpleDeepCopy(jsonFrame.value!.table!.getEditorRowData(selection[i]));
  }
  await manualRequestQueue.run(itemList);
  const ctx = jsonFrame.value!.table!.ctx;
  const batch = new BatchCommand(ctx);
  for (const i in itemList) {
    batch.push(new EditRowCommand(ctx, selection[i], itemList[i]));
  }
  jsonFrame.value!.table!.execute(batch);
}

async function preManualSubmitRow(index: number) {
  const data = jsonFrame.value!.table!.getData(index);
  if (data.id) {
    manualSubmitRow(`${props.parent.hostname}/item/edit/${data.id}/`, index);
    return;
  }
  let modID = data.classID || Number(jsonFrame.value!.activeFileName.split("-")[0]);
  if (!modID)
    await swal.fire({
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
          Utils.commonMsg("请输入一个合法的数值~", true);
          return false;
        }
        modID = input;
        return true;
      },
    });
  if (modID) {
    manualSubmitRow(`${props.parent.hostname}/item/add/${modID}/`, index);
  }
}

function manualSubmitRow(url: string, index: number) {
  const data = convertToImportableFormat(jsonFrame.value!.table!.getData(index));
  const interactID = props.parent.utils.setInteract(JSON.stringify(data));
  GM_openInTab(`${url}?i=${interactID}`);
}

async function submitRow(selection: number | number[]) {
  if (!(selection instanceof Array)) selection = [selection];
  const length = selection.length;
  const itemList = new Array(length);
  for (const i in selection) {
    itemList[i] = Utils.simpleDeepCopy(jsonFrame.value!.table!.getData(selection[i]));
  }
  // await this.manualSubmitQueue.run(itemList);
  Utils.commonMsg("所有改动均已提交~");
}

async function getJSONByPage(page: number, table: TableContext<ItemJsonFrameApplication>) {
  await getJSONFromURL(`${Mcmodder.URL_JSON_POST}&extra=&page=${page}`, table);
}

async function downloadAndImportFile(url: string) {
  // TODO: 修复 UTF-8 => ISO-8859-1 乱码问题
  let resp = await props.parent.utils.createRequest({ url: url });
  let headers = resp.responseHeaders;
  if (!headers.includes("content-type: application/octet-stream")) {
    Utils.commonMsg("下载失败...", false);
    console.error("Error downloading JSON file: " + resp);
    return;
  }
  let name = headers.split('filename="')[1].split('"\r\n')[0];
  let text = resp.responseText;
  jsonFrame.value!.importFromText(text, name);
}

async function searchOnlineFiles() {
  if (!props.parent.currentUID) {
    Utils.commonMsg("请先登录~", false);
  }

  swal.fire({
    title: "从收纳贴获取JSON",
    html: `<div class="jsonframe-bbs-filelist" />`,
    footer: `<a target="_blank" href="${Mcmodder.URL_JSON_POST}">前往 JSON 收纳贴</a>`,
    customClass: "swal2-popup-wider",
    showConfirmButton: false,
    showCancelButton: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    cancelButtonText: "完事了",
  });

  $(".jsonframe-bbs-filelist").append(props.bbsFilelistContainer);
  const ctx = fileTable.value!.ctx;
  await getJSONByPage(1, ctx);
}

function onPaginationCallback(page: number) {
  getJSONByPage(page, fileTable.value!.ctx);
}

function onDownloadClick(e: Event) {
  const elem = e.composedPath()[0] as HTMLElement;
  if (elem.classList.contains("jsonframe-bbs-filedl")) {
    const url = elem.dataset.url;
    if (url) {
      downloadAndImportFile(url);
    }
  }
}

function convertToImportableFormat(data: Partial<Item>) {
  const entry: Record<string, any> = {};
  for (const key of Values.importableKeys) {
    let value = (data as any)[key];
    if (value === undefined || value === null || (typeof value === "number" && isNaN(value)))
      value = "";
    switch (key) {
      case "OredictList":
        entry[key] = value.replaceAll(",", ", ");
        break;
      case "smallIcon":
      case "largeIcon":
        entry[key] = Utils.removeBase64ImgPrefix(value);
        break;
      default:
        entry[key] = value;
    }
  }
  return entry as Item;
}

function exportJson(fileName: string) {
  if (!jsonFrame.value!.isAvailableFileName(fileName)) return false;
  swal.fire({
    title: "导出文件",
    html: `<div class="jsonframe-export-container">`,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "完事了",
  });
  $(".jsonframe-export-container").append(props.exportContainer);
}

function onCommonExportClick() {
  let content = "";
  jsonFrame.value!.table!.getAllData().forEach((e) => {
    content += JSON.stringify(convertToImportableFormat(e)) + "\r\n";
  });
  Utils.saveFile(jsonFrame.value!.activeFileName, content);
  swal.close();
}

function onFullExportClick() {
  let content = "";
  jsonFrame.value!.table!.getAllData().forEach((entry) => {
    content += JSON.stringify(entry) + "\r\n";
  });
  Utils.saveFile(jsonFrame.value!.activeFileName, content);
  swal.close();
}

const configs = computed(() => props.parent.configRepository);

const jsonDatabase = configs.value.getSettingsRef("jsonDatabase_v2");

const repoIndex = configs.value.getSettingsRef("itemRepository", 0 as 0 | 1);

const linkings = computed(() => {
  if (jsonDatabase.value === undefined) {
    return [];
  }
  const files = jsonDatabase.value[repoIndex.value];
  return files ?? [];
});

const isFileLinked: ComputedRef<boolean> = computed(() => {
  if (!jsonFrame.value) {
    return false;
  }
  return linkings.value.includes(jsonFrame.value.activeFileName);
});

function onRename(oldName: string, newName: string) {
  let files = linkings.value;
  files = files.filter((e) => e !== oldName);
  files.push(newName);
  commitLinkings(jsonDatabase, files);
}

function onDelete(filename: string) {
  const files = linkings.value.filter((name) => name !== filename);
  commitLinkings(jsonDatabase, files);
}

function onChangeLinkState() {
  const name = jsonFrame.value!.activeFileName;
  let files = linkings.value;
  if (isFileLinked.value) {
    const index = linkings.value.indexOf(name);
    files.splice(index, 1);
  } else {
    files.push(name);
  }
  commitLinkings(jsonDatabase, files);
}

function commitLinkings(
  jsonDatabase: ComputedRef<Record<0 | 1, string[]> | undefined>,
  files: string[],
) {
  configs.value.setSettings("jsonDatabase_v2", {
    ...jsonDatabase.value,
    [repoIndex.value]: [...files],
  });
}

function more() {
  swal.fire({
    title: "更多操作",
    html: `<div class="jsonframe-more-container">`,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "完事了",
  });
  $(".jsonframe-more-container").append(props.autoLinkContainer);
  logger.value!.scrollToBottom();
}

// 暂时没有用
defineExpose({
  inferItemList,
  submitRow,
});
</script>
