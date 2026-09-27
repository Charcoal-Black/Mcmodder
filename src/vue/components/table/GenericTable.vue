<template>
  <div
    class="mcmodder-table-container"
    ref="root"
    v-bind="attr"
    v-show="showTable"
    @click="gotoHandler"
  >
    <div
      class="mcmodder-table-loading-overlay"
      v-show="showLoadingOverlay"
      :class="{ faded: classLoadingOverlayFaded }"
    >
      <div class="mcmodder-table-loading-container">
        <div class="mcmodder-loading" />
        <ProgressBar ref="progressBar" />
      </div>
    </div>
    <table class="mcmodder-table">
      <thead>
        <th v-for="option in columnOptions" v-html="option.name" />
      </thead>
      <tbody>
        <tr class="mcmodder-table-margin-top" :style="{ height: cssMarginTopHeight + 'px' }" />
        <tr class="mcmodder-table-empty" v-show="!currentData.length" />
        <tr
          v-for="index in renderingRowArray"
          :data-index="index"
          :class="{
            'mcmodder-table-pointerover-tr': index === hoveringIndex,
            'mcmodder-table-unsaved-tr':
              currentData[index].edited && Object.keys(currentData[index].edited).length,
            selected: currentData[index].selected,
          }"
          @pointerenter="rowOnPointerenter(index)"
        >
          <td
            v-for="key in Object.keys(columnOptions)"
            :data-key="key"
            :class="{
              'mcmodder-table-pointerover-td': key === hoveringKey,
              'mcmodder-table-unsaved-td': currentData[index].edited?.[key],
            }"
            @pointerenter="unitOnPointerenter(index, key)"
            @pointerleave="unitOnPointerleave(index, key)"
            @dblclick="onDblclick(index, key)"
          >
            <div
              v-if="editingIndex !== index || editingKey !== key"
              v-html="renderUnit(currentData[index], key)"
            />
            <div
              v-else
              ref="inputContainer"
              class="mcmodder-table-input"
              @keydown="onInputKeydown"
              @focusout="onInputFocusout"
            >
              <NumberInput
                v-if="inputNodeData?.type === InputType.NUMBER"
                ref="input"
                :title="inputNodeData.title"
                :value="inputNodeData.value"
                :range="inputNodeData.range"
                ,
                :onSuccessfulChange="inputNodeData.onSuccessfulChange"
              />
              <TextInput
                ref="input"
                v-if="inputNodeData?.type === InputType.TEXT"
                :title="inputNodeData.title"
                :value="inputNodeData.value"
                :onSuccessfulChange="inputNodeData.onSuccessfulChange"
              />
            </div>
          </td>
        </tr>
        <tr
          class="mcmodder-table-margin-bottom"
          :style="{ height: cssMarginBottomHeight + 'px' }"
        />
      </tbody>
    </table>
    <ContextMenu ref="contextMenu" />
  </div>
</template>

<script setup lang="ts" generic="T extends TableAcceptable">
/**
 * 通用可编辑表格组件：由旧版「Table / EditableTable 两个类」迁移而来。
 *
 * # 总体运行机制
 *
 * - **数据层**：外部通过 `setAllData` / `appendData` 输入 `T[]`，组件逐行包成 `TableRowData<T>`
 *   存入 `currentData`（`shallowRef`）：`content` 是原始数据、`selected` 是选中标记、`edited`
 *   是尚未保存的单元格改动。
 *
 * - **展示层**：`columnOptions` 的键即展示列，表头取 `name`，单元格由 `renderUnit` + 该列的
 *   `displayRule` 渲染成 HTML。**展示列与数据字段并不一定一一对应**：一个展示列可以是对多个
 *   字段综合加工后的结果（如 `DISPLAYRULE_LINK_CENTER_WITH_NAME` 以 `"id,名称"` 一列同时展示
 *   两个字段），这种「纯展示列」只有展示语义、无法反解回某个字段，因此**一定不能双击编辑**。
 *
 * - **渲染层**：表格体用虚拟滚动只渲染可视行（该实现存在已知问题，后续会替换为 VueUse，本文件
 *   不展开注释）。
 *
 * - **编辑层**：`editConfigs` 声明哪些列可编辑及控件形态。双击可编辑单元格时按 `TableInputOption`
 *   装配 NUMBER/TEXT 输入控件，提交后经 `EditCommand`（或 `EditRowCommand`）写入 `edited`；
 *   `saveAll` 才把 `edited` 合并回 `content`。所有改动走「命令 / 撤销」模式（`Command` 子类），
 *   由 `execute`/`undo`/`redo` 在历史栈上回放。
 *
 * - **命令上下文**：组件把一组操作暴露为 `ctx: TableContext<T>` 交给各 `Command`，命令只经 `ctx`
 *   操作表格、不触碰组件内部状态，从而保证可撤销、可重做。
 */
import {
  computed,
  nextTick,
  onMounted,
  ref,
  type ShallowRef,
  shallowRef,
  triggerRef,
  useTemplateRef,
  watch,
} from "vue";
import { TableUtils } from "../../../table/Table.ts";
import { Utils } from "../../../Utils.ts";
import ContextMenu from "../ContextMenu.vue";
import { McmodderEditableTable } from "../../../table/EditableTable.ts";
import { Command } from "../../../table/command/Command.ts";
import { InputType } from "../../../config/ConfigUtils.ts";
import { EditCommand } from "../../../table/command/EditCommand.ts";
import NumberInput from "../input/NumberInput.vue";
import TextInput from "../input/TextInput.vue";
import { InsertRowCommand } from "../../../table/command/InsertRowCommand.ts";
import { PasteCommand } from "../../../table/command/PasteCommand.ts";
import { DeleteRowCommand } from "../../../table/command/DeleteRowCommand.ts";
import { DeleteMultipleRowCommand } from "../../../table/command/DeleteMultipleRowCommand.ts";
import ProgressBar from "../ProgressBar.vue";
import type { TableProps } from "../../../types/props";

const props = defineProps<TableProps<T>>();

// === 基础状态 === //
/** 数据主体：`TableRowData<T>[]`，用 `shallowRef` 包裹。每行 `content` 为原数据、`selected` 为选中标记、`edited` 为尚未保存的单元格改动 */
const currentData = shallowRef<TableRowData<T>[]>([]);
/** 是否处于加载中：控制加载遮罩的显示与淡入淡出（由 `showLoading`/`completeLoading` 驱动） */
const isLoading = ref(true);
/** 是否显示表格主表（`show`/`hide`/`switchDisplayState` 切换） */
const showTable = ref(true);
/** 加载遮罩是否可见（加载结束后淡出再隐藏） */
const showLoadingOverlay = ref(true);
/** 加载遮罩是否已进入淡出态（`completeLoading` 置 true，用于过渡动画） */
const classLoadingOverlayFaded = ref(false);

/** 组件根节点（`mcmodder-table-container`） */
const root = useTemplateRef("root");
/** 加载进度条子组件实例 */
const loadingProgress = useTemplateRef("progressBar");
/** 编辑态输入控件容器（双击单元格后在此渲染输入框） */
const inputContainer = useTemplateRef("inputContainer");

// === 虚拟滚动状态（当前实现存在已知问题，后续将整体替换为 VueUse；相关片段不展开注释） === //
const renderingRows = ref<TableRowRange>({ l: -1, r: -1 });
const screenContainableRows = ref(1);
const rowHeight = ref(TableUtils.ROW_HEIGHT_DEFAULT);
const cssMarginTopHeight = ref(0);
const cssMarginBottomHeight = ref(0);

// === EDITABLE TABLE === //

const contextMenu = useTemplateRef("contextMenu");

/** 是否处于可编辑模式：由 `editConfigsInitializer` 是否有值决定（未传 `editConfigs` 时整表只读） */
const editable = ref(false);
/** `editConfigs` props 的副本；被 watch 监听以触发编辑配置归一化 */
const editConfigsInitializer: ShallowRef<EditOptionsInitializer<T> | undefined> = shallowRef(
  props.editConfigs,
);
/** 归一化后的编辑配置（键 = 数据字段）：缺失/空值视为只读，其余按 `InputType` 装配控件与默认值 */
const editConfigs = shallowRef<EditConfigs<T>>();
/** 是否存在尚未 `saveAll` 的整行级改动（增/删/粘贴行等） */
const unsaved = ref(false);
/** 当前选中的行数（由 `selectRow` 维护，供右键菜单判断「删除/复制所有选中行」） */
const selectedRowCount = ref(0);
/** Shift 键是否按下（用于 Shift+悬停 连续多选） */
const isShiftKeyPressed = ref(false);
/** 当前悬停的行索引（悬停高亮 + 右键菜单定位） */
const hoveringIndex = ref<number | null>(null);
/** 当前悬停的列（字段名，用于单元格高亮） */
const hoveringKey = ref<keyof T | null>(null);
/** 上一次切换选中态的行索引（Shift+悬停补间选择的起点） */
const prevHoverIndex = ref<number>();
/** 正在编辑单元格的行索引（模板据此渲染输入控件，null 表示非编辑态） */
const editingIndex = ref<number | null>(null);
/** 正在编辑单元格的字段名（模板据此渲染输入控件，null 表示非编辑态） */
const editingKey = ref<keyof T | null>(null);
/** 编辑历史栈（Command 序列）；`historyStage` 指向即将被重做的位置，撤销/重做只移动该指针 */
const history: Command<T>[] = [];
let historyStage = 0;
/** 剪贴板：复制行时暂存的深拷贝数据（粘贴时整体插入） */
let clipboard: TableDataList<T> = [];

// ====================== //

const renderingRowArray = computed(() => {
  const { l, r } = renderingRows.value;
  return Utils.createRange(l, r);
});

// 列配置初始化：把 props.columnOptions 里每列初始化器归一化为 `ColumnOption`（表头名 + 可选展示规则）。
// 注意：这里的键是「展示列」名，通常与数据字段同名，但也可以在 displayRule 里综合多个字段展示。
const columnOptionsConstructor: Partial<ColumnOptions<T>> = {};
Object.entries(props.columnOptions).forEach(([key, value]) => {
  columnOptionsConstructor[key] = TableUtils.parseColumnOptionsInitializer(value);
});
const columnOptions = columnOptionsConstructor as ColumnOptions<T>;

/**
 * 绑定全局事件（挂载时调用一次）：
 * - 窗口滚动 / 缩放 → 重算虚拟滚动可视区（`Utils.animationThrottle` 节流、passive 监听）；
 * - 文档 keydown → 撤销/重做/保存/全选/复制等快捷键分发，以及 Shift 按下进入连续多选模式；
 * - 文档 keyup → Shift 抬起清除多选标记；
 * 绑定结束后立即 `refreshAll()` 触发首屏渲染。
 */
function bindEvents() {
  window.addEventListener(
    "scroll",
    Utils.animationThrottle(() => {
      onScroll();
    }),
    {
      passive: true,
    },
  );
  window.addEventListener(
    "resize",
    Utils.animationThrottle(() => {
      updateScreenContainableRows();
    }),
    {
      passive: true,
    },
  );
  refreshAll();

  $(document.body)
    .keydown((e) => {
      // 撤销 Ctrl+Z
      if (Utils.isKeyMatch(McmodderEditableTable.undoKey, e) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // 重做 Ctrl+Y (Ctrl+Shift+Z)
      else if (
        Utils.isKeyMatch(McmodderEditableTable.redoKey, e) ||
        Utils.isKeyMatch(McmodderEditableTable.redoKey2, e)
      ) {
        e.preventDefault();
        redo();
      }

      // 保存 Ctrl+S
      else if (Utils.isKeyMatch(McmodderEditableTable.saveKey, e)) {
        e.preventDefault();
        saveAll();
      }

      // 全选 Ctrl+A
      else if (Utils.isKeyMatch(McmodderEditableTable.selectAllKey, e)) {
        e.preventDefault();
        selectAll(!e.shiftKey);
      }

      // 复制 Ctrl+C
      else if (Utils.isKeyMatch(McmodderEditableTable.copyKey, e)) {
        e.preventDefault();
        copyRow(getSelection());
      }

      // 选中行
      else if (e.key === "Shift") {
        if (editable.value) {
          isShiftKeyPressed.value = true;
          if (hoveringIndex.value !== null) {
            switchSelectState(hoveringIndex.value);
          }
        }
      }
    })
    .keyup((e) => {
      if (e.key === "Shift") isShiftKeyPressed.value = false;
    });
}

/**
 * 表格容器上的点击委托：命中带 `mcmodder-table-goto` 类的「跳转链接」时，
 * 读出 `data-goto-key`/`data-goto-value`，用 `searchData` 定位行并滚动到该行；
 * 找不到时弹提示「没有找到该链接所指向的表格行...」。
 */
function gotoHandler(e: Event) {
  const target = e.composedPath()[0] as HTMLElement;
  if (target.classList.contains("mcmodder-table-goto")) {
    const key = target.dataset.gotoKey as keyof T;
    const value = target.dataset.gotoValue;
    const index = searchData(key, value);
    if (index === -1) Utils.commonMsg("没有找到该链接所指向的表格行...", false);
    else scrollTo(index);
  }
}

// 下方的虚拟滚动实现（含 updateScreenContainableRows / calculateRenderableRows / onScroll 等）
// 存在已知问题，后续将整体替换为 VueUse 的虚拟滚动组件，故不展开逐行注释。

function updateScreenContainableRows() {
  screenContainableRows.value =
    Math.ceil(window.innerHeight / rowHeight.value) + TableUtils.ROW_EXPAND;
}

/** 取表格体 `<tbody>` 的原生 DOM 节点 */
function getTbody() {
  return $(root.value!).find("tbody").get(0);
}

function calculateRenderableRows(): TableRowRange {
  const dataLength = currentData.value.length;
  if (!dataLength) return { l: -1, r: -1 };

  const l = Math.floor(getTbody().getBoundingClientRect().top / -rowHeight.value);
  const r = l + screenContainableRows.value * 2 + TableUtils.ROW_EXPAND;

  const L = Math.floor(l / screenContainableRows.value) * screenContainableRows.value;
  const R = Math.ceil(r / screenContainableRows.value) * screenContainableRows.value;

  return {
    l: Math.min(dataLength - 1, Math.max(0, L)),
    r: Math.min(dataLength, R),
  };
}

function calculateRowHeightTopOffset(index: number) {
  return index * rowHeight.value;
}

function calculateRowHeightBottomOffset(index: number) {
  const dataLength = currentData.value.length;
  if (!dataLength) return 0;
  return (dataLength - index - 1) * rowHeight.value;
}

/**
 * 按字段值全文查找：返回第一个 `content[key] == value` 的行索引。
 * 主要供 `gotoHandler` 的链接跳转及父组件调用的 `searchData` 使用。
 *
 * @param key 目标字段名；为 null 时不查找。
 * @param value 目标值（宽松相等比较）。
 * @returns 匹配行索引；未找到返回 -1。
 */
function searchData(key: keyof T | null, value: any) {
  if (key) {
    for (const i in currentData.value) {
      if (currentData.value[i].content[key] == value) {
        return Number(i);
      }
    }
  }
  return -1;
}

/** 把窗口平滑滚动到指定行：以该行在页面中的位置减去半屏高度定位（行大致居中） */
function scrollTo(index: number) {
  $("html")
    .get(0)
    .scrollTo({
      top:
        Utils.getAbsolutePos(getTbody()).y +
        calculateRowHeightTopOffset(index) -
        window.screen.height / 2,
      behavior: "smooth",
    });
}

function onScroll() {
  const newRows = calculateRenderableRows();
  if (renderingRows.value.l === newRows.l && renderingRows.value.r === newRows.r) {
    if (newRows.l === -1 && newRows.r === -1) {
      cssMarginTopHeight.value = 0;
      cssMarginBottomHeight.value = 0;
    }
    return;
  }
  const top = calculateRowHeightTopOffset(newRows.l);
  const bottom = calculateRowHeightBottomOffset(newRows.r);
  cssMarginTopHeight.value = top;
  cssMarginBottomHeight.value = bottom;

  // this.$tbody.find("[data-index]").remove();
  // for (let i = newRows.l; i <= newRows.r; i++) {
  //   this.renderRow(i).insertBefore(this.$marginBottom);
  // }

  // 保存行高以便实现虚拟列表
  nextTick(() => {
    const newRowHeight =
      $(getTbody()).find(`[data-index=${newRows.l}]`).get(0)?.getBoundingClientRect()?.height ??
      TableUtils.ROW_HEIGHT_DEFAULT;
    if (newRowHeight !== rowHeight.value) {
      rowHeight.value = newRowHeight;
      updateScreenContainableRows();
    } else {
      renderingRows.value.l = newRows.l;
      renderingRows.value.r = newRows.r;
    }
    nextTick(() => {
      Utils.updateAllTooltip();
    });
  });
}

/**
 * 一次性设置全表数据：清空表格后用外部传入的 `T[]` 重建 `currentData`。
 * 这是外部载入数据的主入口之一（每行数据先包成 `{ content: e }` 行包装）。
 */
function setAllData(data: TableDataList<T>) {
  empty();
  currentData.value = data.map((e) => ({ content: e }));
}

// 挂载初始化：隐藏初始进度动画 → 计算可视行数 → 绑定全局事件 → 刷新渲染 → 装配右键菜单
onMounted(() => {
  loadingProgress.value?.hide();
  updateScreenContainableRows();
  bindEvents(); // 内部末尾也会 refreshAll，与下一条 refreshAll 各触发一次（保持原行为）
  refreshAll();
  initContextMenu();
});

/** 取全表数据：把每行包装解包回 `content`，返回 `T[]`（父组件读取/导出用） */
function getAllData() {
  return currentData.value.map((data) => data.content);
}

/** 取指定行的原始数据 `T`；越界会 undefined（调用方需保证 index 合法） */
function getData(index: number) {
  return currentData.value[index].content;
}

/** 取指定行的整行包装 `TableRowData<T>`（含 selected/edited 标记，命令上下文内部使用） */
function getRowData(index: number) {
  return currentData.value[index];
}

/** 取指定行指定字段的展示值（从 `content` 直接读，不含未保存编辑） */
function getValue(index: number, key: keyof T) {
  return getData(index)[key];
}

/** 取全部行包装（含 selected/edited 标记），直接返回 `currentData` 本身 */
function getAllRowData() {
  return currentData.value;
}

/** 追加一行数据到表尾 */
function appendData(data: T) {
  currentData.value.push({
    content: data,
  });
}

/** 批量追加多行数据到表尾 */
function appendDataList(dataList: TableDataList<T>) {
  dataList.forEach((data) => {
    appendData(data);
  });
}

/**
 * 直接设置某单元格字段值（忽略撤销历史，用于外部程序化赋值）。
 * 值为 undefined 时转为删除该字段。
 */
function setValue(index: number, key: keyof T, value: any) {
  if (value === undefined) {
    deleteValue(index, key);
    return;
  }
  currentData.value[index].content[key] = value;
  refreshAll();
}

/** 删除某单元格字段值 */
function deleteValue(index: number, key: keyof T) {
  delete currentData.value[index].content[key];
  refreshAll();
}

/** 删除一行 */
function deleteData(index: number) {
  currentData.value.splice(index, 1);
  refreshAll();
}

/** 判断某行当前是否在虚拟滚动的渲染区间内（虚拟滚动相关，不展开注释） */
function isIndexRendering(index: number) {
  return index >= renderingRows.value.l && index <= renderingRows.value.r;
}

/**
 * 从事件目标/元素反查其所属行的行索引：优先取元素自身 `data-index`，
 * 否则向上查找最近的 `[data-index]` 祖先。右键菜单据此定位当前操作行。
 */
function getElementIndex(target?: EventTarget | Element | JQuery | null) {
  if (!target) return -1;
  target = $(target);
  if (target.data("index") !== undefined) return Number(target.data("index"));
  return Number(target.parents("[data-index]").data("index"));
}

/** 取指定行的 DOM 元素（仅在该行处于渲染区间时可用，否则返回空 jQuery 集） */
function getRowElement(index: number) {
  if (isIndexRendering(index)) return $(getTbody()).find(`[data-index=${index}]`);
  return $();
}

/** 取指定行指定列的单元格 DOM 元素 */
function getUnitElement(index: number, key: string) {
  return getRowElement(index).find(`[data-key=${key}]`);
}

/**
 * 渲染单个单元格的展示 HTML：优先取未保存编辑值（`edited`），否则取 `content` 原值；
 * 有展示规则时用 `displayRule(rawContent, 整行)` 加工（展示列可综合多个字段），否则原样输出；
 * 内容为空时显示灰色「∅」占位。返回值直接 `v-html` 注入。
 */
function renderUnit(data: TableRowData<T>, key: string) {
  const rawContent = (data.edited as any)?.[key] ?? (data.content as any)[key];
  const displayRule = columnOptions[key].displayRule;
  let content;
  if (
    (!displayRule || displayRule.length < 2) &&
    (rawContent === undefined || rawContent === null)
  ) {
    content = null;
  } else {
    content = displayRule?.(rawContent, data.content) ?? rawContent;
  }
  if (content === undefined || content === null) {
    return '<span class="text-muted">∅</span>';
  }
  return content;
}

/** 刷新整表：手动 `triggerRef(currentData)` 触发视图更新、结束加载态、重置渲染区间并发 `refresh` 事件 */
function refreshAll() {
  triggerRef(currentData);
  completeLoading();
  renderingRows.value = { l: -1, r: -1 };
  emit("refresh");
  nextTick(() => {
    onScroll();
  });
}

/** 清空全表数据（并复位选中计数 / 未保存标记），随后刷新 */
function empty() {
  currentData.value = [];
  selectedRowCount.value = 0;
  unsaved.value = false;
  refreshAll();
}

/** 显示加载遮罩并把进度条归零（`isLoading` 防止重复触发） */
function showLoading() {
  if (isLoading.value) return;
  isLoading.value = true;
  showLoadingOverlay.value = true;
  classLoadingOverlayFaded.value = false;
  loadingProgress.value!.hide();
  loadingProgress.value!.setProgress(0);
}

/** 结束加载：进度条拉满、标记淡出，800ms 后（若期间未再次加载）隐藏遮罩 */
function completeLoading() {
  if (!isLoading.value) return;
  loadingProgress.value!.setProgressToMax();
  isLoading.value = false;
  classLoadingOverlayFaded.value = true;
  setTimeout(() => {
    if (!isLoading.value) showLoadingOverlay.value = false;
  }, 800);
}

/** 显示表格主表 */
function show() {
  showTable.value = true;
}

/** 隐藏表格主表 */
function hide() {
  showTable.value = false;
}

/** 切换表格主表显示/隐藏 */
function switchDisplayState() {
  if (!showTable.value) show();
  else hide();
}

// === EDITABLE TABLE === //

/**
 * 编辑配置的归一化 watch（immediate）：监听 `editConfigsInitializer`，把每字段的
 * `EditOptionInitializer` 解析为 `TableInputOption` 存入 `editConfigs`。
 * 未传 `editConfigs`（undefined）时整表 `editable = false`（只读模式）。
 */
watch(
  () => editConfigsInitializer.value,
  () => {
    // edit config init
    if (editConfigsInitializer.value === undefined) {
      editable.value = false;
      editConfigs.value = {} as EditConfigs<T>;
      return;
    }
    editable.value = true;
    const result: Partial<EditOptionsInitializer<T>> = {};
    Object.entries(editConfigsInitializer.value).forEach(([key, value]) => {
      result[key as keyof T] = McmodderEditableTable.parseEditConfigInitializer(value);
    });
    editConfigs.value = result as unknown as EditConfigs<T>; // doge
  },
  {
    immediate: true,
  },
);

/**
 * 执行一条编辑命令并压入历史栈：先截断「撤销后又执行新操作」产生的多余历史
 * （`history.length = historyStage`），再 push 并把 `historyStage` 指向栈顶。
 * 只读模式下直接忽略。
 */
function execute(command: Command<T>) {
  if (!editable.value) {
    return;
  }
  command.execute();
  history.length = historyStage;
  historyStage = history.push(command);
}

/** 撤销上一条命令：`historyStage` 后退一位并调用该命令的 `undo` */
function undo() {
  if (historyStage > 0) {
    history[--historyStage].undo();
  }
}

/** 重做刚被撤销的命令：`historyStage` 前进一位并调用该命令的 `redo` */
function redo() {
  if (historyStage < history.length) {
    history[historyStage++].redo();
  }
}

/** 取某单元格「生效中的展示值」：优先未保存编辑值（`edited`），否则取 `content` 原值 */
function getEditorData(index: number, key: keyof T) {
  const rowData = getRowData(index);
  return rowData.edited?.[key] ?? rowData.content[key];
}

/** 取某行「生效中的完整数据」：深拷贝 `content` 后用 `edited` 里的字段覆盖，返回合并结果 */
function getEditorRowData(index: number) {
  const rowData = getRowData(index);
  const content = Utils.simpleDeepCopy(rowData.content);
  Object.keys(rowData.edited || {}).forEach((key) => {
    (content as any)[key] = rowData.edited![key];
  });
  return content;
}

/** 收集所有 `selected` 行的行索引（升序），用于复制/删除选中行 */
function getSelection() {
  let selection: TableRowSelection = [];
  currentData.value.forEach((data, index) => {
    if (data.selected) selection.push(index);
  });
  return selection;
}

/** 把选中（或传入选择集）的各行 `content` 深拷贝进剪贴板，供后续粘贴 */
function copyRow(selection = getSelection()) {
  clipboard = new Array(selection.length);
  selection.forEach((row, index) => {
    clipboard[index] = Utils.simpleDeepCopy(currentData.value[row].content);
    // delete this.clipboard[index]._selected;
  });
}

/**
 * 把剪贴板内容粘贴到指定行之前：插入后构造「新行索引 → 行数据」映射返回，
 * 供 `PasteCommand` 记录以便撤销/重做。
 */
function pasteRow(index: number) {
  insertMultipleRowWithArray(index, clipboard);
  const dataMap: TableDataMap<T> = {};
  const length = clipboard.length;
  for (let i = 0; i < length; i++) {
    dataMap[i + index] = clipboard[i];
  }
  return dataMap;
}

/** 删除一行（若该行被选中则同步减少选中计数），返回 `{ 被删行索引: 行数据浅拷贝 }` 供撤销 */
function deleteRow(index: number): TableDataMap<T> {
  if (currentData.value[index].selected) selectedRowCount.value--;
  let deletedData = Utils.simpleDeepCopy(currentData.value[index].content);
  currentData.value.splice(index, 1);
  refreshAll();
  unsaved.value = true;
  return { [index]: deletedData };
}

/** 批量删除多行（O(n) 一趟完成，避免循环 deleteRow 的 O(n²)），返回 `行索引 → 行数据` 映射供撤销 */
function deleteMultipleRow(selection: TableRowSelection) {
  const deletedData: TableDataMap<T> = {};
  const tempData: any = currentData;
  selection.forEach((i) => {
    if (currentData.value[i].selected) selectedRowCount.value--;
    deletedData[i] = Object.assign({}, currentData.value[i].content);
    tempData[i] = null;
  });
  currentData.value = tempData.filter((e: any) => e);
  refreshAll();
  unsaved.value = true;
  return deletedData;
}

/**
 * 编辑单元格（`EditCommand` 的唯一写入面，自身直接可逆）：
 * 改动不为 undefined 且与原值不同时写入行 `edited`；改回原值时清除该字段的未保存标记。
 * 不落 `content`，待 `saveAll` 才真正提交。
 */
function editData(index: number, key: keyof T, newValue: any) {
  let data = currentData.value[index] || "";
  let original = data.content[key] || "";
  if (original != newValue) {
    if (!data.edited) data.edited = {};
    data.edited[key] = newValue;
    triggerRef(currentData);
    unsaved.value = true;
  } else {
    if (data.edited && data.edited[key]) {
      delete data.edited[key];
      triggerRef(currentData);
    }
  }
  emit("edit");
}

/** 把「行索引 → 行数据」映射转为升序的行索引数组（供批量删除/插入定位） */
function dataMapToSelection(dataMap: TableDataMap<T>) {
  return Object.keys(dataMap).map(Number).sort();
}

/** 按「行索引 → 行数据」映射插入单行（取映射里第一项的索引与数据） */
function insertRowWithDataMap(dataMap: TableDataMap<T>) {
  const key = Number(Object.keys(dataMap)[0]);
  insertRow(key, dataMap[key]);
}

/** 生成一行默认数据：把每个非可选（`optional` 为假）字段的默认值从 `editConfigs` 摘出来 */
function createDefaultRowData() {
  const result: Partial<T> = {};
  (Object.keys(editConfigs.value!) as (keyof EditConfigs<T>)[]).forEach((key) => {
    const editConfig = editConfigs.value![key];
    if (!editConfig.optional) (result[key] as unknown) = editConfigs.value![key].value;
  });
  return result as T;
}

/** 在指定位置插入一行（缺省时用 `createDefaultRowData` 生成默认行；越界则忽略） */
function insertRow(index: number, newData?: T) {
  if (!newData) newData = createDefaultRowData();
  if (index < 0 || index > currentData.value.length) return;
  currentData.value.splice(index, 0, {
    content: Utils.simpleDeepCopy(newData),
  });
  refreshAll();
  unsaved.value = true;
}

/** 在指定位置批量插入一组行（用于粘贴） */
function insertMultipleRowWithArray(index: number, dataList: TableDataList<T>) {
  const l = currentData.value.slice(0, index);
  const r = currentData.value.slice(index);
  currentData.value = l
    .concat(
      Utils.simpleDeepCopy(
        dataList.map((e) => ({
          content: Utils.simpleDeepCopy(e),
        })),
      ),
    )
    .concat(r);
  refreshAll();
  unsaved.value = true;
}

/**
 * 按「行索引 → 行数据」映射批量插回多行（撤销批量删除的逆操作）：
 * 遍历目标长度，命中映射里的索引时填入对应数据，否则依次取现有行。
 */
function insertMultipleRowWithDataMap(dataMap: TableDataMap<T>) {
  let i = 0,
    j = 0;
  let total = currentData.value.length + Object.keys(dataMap).length;
  let newData: any[] = new Array(total).fill(null).map(() => ({}));
  let deletedRowIndex = dataMapToSelection(dataMap);
  for (let k = 0; k < total; k++) {
    if (deletedRowIndex[j] == k) {
      newData[k].content = Utils.simpleDeepCopy(dataMap[k]);
      j++;
    } else newData[k] = currentData.value[i++];
  }
  currentData.value = newData;
  refreshAll();
  unsaved.value = true;
}

/** 保存全部未存编辑：把每行 `edited` 里改动过的字段写回 `content` 并清空 `edited`，复位 `unsaved` */
function saveAll() {
  currentData.value.forEach((data) => {
    if (!data.edited) return;
    (Object.keys(data.edited) as (keyof T)[]).forEach((key) => {
      if (data.edited && data.edited[key]) {
        data.content[key] = data.edited[key];
      }
    });
    delete data.edited;
  });
  // this.rearrangeRows();
  refreshAll();
  unsaved.value = false;
}

/**
 * 设置单行选中态（并维护 `selectedRowCount` 计数）。直接改 `content` 的浅层包装对象，
 * 随后 `triggerRef` 强制视图更新（因 `currentData` 是 shallowRef）。
 */
function selectRow(index: number, state: boolean) {
  const data = currentData.value[index];
  data.selected = !!state;
  if (state) {
    data.selected = true;
    selectedRowCount.value++;
  } else {
    data.selected = false;
    selectedRowCount.value--;
  }
  triggerRef(currentData);
  // if (isIndexRendering(index)) {
  //   const row = getRowElement(index);
  //   if (state) row.addClass("selected");
  //   else row.removeClass("selected");
  // }
}

/** 整段选中/取消选中 `[l, r]` 闭区间的行 */
function selectRange(l: number, r: number, state: boolean) {
  for (let i = l; i <= r; i++) {
    selectRow(i, state);
  }
}

/** 全选/取消全选（Ctrl+A 及右键菜单「复制/删除所有选中行」依赖它） */
function selectAll(state: boolean) {
  selectRange(0, currentData.value.length - 1, state);
}

/** 翻转某行的选中态，并把它记为 Shift 连续多选的起点（`prevHoverIndex`） */
function switchSelectState(index: number) {
  if (isNaN(index)) return;
  const target = currentData.value[index];
  if (!target) return;
  prevHoverIndex.value = index;
  const selected = !target.selected;
  selectRow(index, selected);
}

/**
 * 行悬停处理：仅 Shift 按下时生效，从上次选中行到本行之间「补间」翻转各行的选中态，
 * 实现 Shift+悬停 的连续多选。
 */
function rowOnPointerenter(index: number) {
  if (!isShiftKeyPressed.value) return;
  if (prevHoverIndex.value != undefined) {
    if (index === prevHoverIndex.value) return;
    let dir = index > prevHoverIndex.value ? 1 : -1;
    for (let i = prevHoverIndex.value + dir; i != index; i += dir) {
      // 补间
      switchSelectState(i);
    }
  }
  switchSelectState(index);
}

/** 单元格进入：记录当前悬停行/列（用于高亮 + 右键菜单定位） */
function unitOnPointerenter(index: number, key: keyof T) {
  hoveringIndex.value = index;
  hoveringKey.value = key;
}

/** 单元格离开：清除对应行列的悬停记录 */
function unitOnPointerleave(index: number, key: keyof T) {
  if (hoveringIndex.value === index) {
    hoveringIndex.value = null;
  }
  if (hoveringKey.value === key) {
    hoveringKey.value = null;
  }
}

/** 取当前编辑中单元格「生效中的值」（Escape 恢复输入框时用） */
function getEditedValue() {
  const data = currentData.value[editingIndex.value!];
  return data.edited?.[editingKey.value] ?? data.content[editingKey.value];
}

/**
 * 双击单元格进入编辑态：
 * 1. 该展示列不在 `editConfigs` 中、或标记只读 → 不可编辑，直接返回（**这正是「展示列与
 *    数据字段不一定对应」的体现——没有编辑配置 / 只读的展示列无法双击编辑**）；
 * 2. 记录编辑中的行列，取当前生效值（未保存编辑优先，缺失时回退该输入类型的默认值）；
 * 3. 装配输入控件（NUMBER/TEXT），键入成功后用 `EditCommand` 写入 `edited`；
 * 4. 下一帧聚焦输入框。
 */
function onDblclick(index: number, key: keyof T) {
  if (!editConfigs.value!.hasOwnProperty(key)) {
    return;
  }
  if ((editConfigs.value as any)[key]?.readonly) {
    return;
  }
  editingIndex.value = index;
  editingKey.value = key;

  const inputData = currentData.value[index];
  const value = inputData.edited?.hasOwnProperty(key)
    ? inputData.edited[key]
    : inputData.content[key];
  if (!editConfigs.value!.hasOwnProperty(key)) {
    throw new Error("Unexpected data key.");
  }

  const typedKey = key as keyof EditConfigs<T>;
  const editConfig = editConfigs.value![typedKey] as TableInputOption;
  const nonNullValue = value ?? editConfig.value;
  computeInputNode(typedKey, nonNullValue, editConfig, (info) => {
    execute(new EditCommand(ctx, index, key, info.final as T[typeof key]));
    onInputFocusout();
  });
  nextTick(() => {
    $(inputContainer.value![0]).children("input").focus();
  });
}

/** 编辑态输入控件的数据快照：模板据此把一个单元格临时 `v-else` 替换成 `<NumberInput>`/`<TextInput>` */
const inputNodeData = shallowRef<{
  type: InputType;
  title: string;
  value: any;
  range?: InputValueNumericRange;
  onSuccessfulChange: InputSuccessfulChangeCallBack<unknown>;
}>();

/**
 * 根据 `TableInputOption` 装配编辑态输入控件快照：
 * 显示名优先 `customName`，其次列配置的 `name`，最后字段名；
 * NUMBER 型附带 `range` 数值范围，其余类型一律按 TEXT 字符串处理。
 */
function computeInputNode(
  key: keyof EditConfigs<T>,
  value: unknown,
  inputData: TableInputOption,
  onSuccessfulChange: InputSuccessfulChangeCallBack<unknown>,
) {
  const displayName = inputData.customName || columnOptions[key].name || String(key);
  if (inputData.type === InputType.NUMBER) {
    inputNodeData.value = {
      type: inputData.type,
      title: displayName,
      value: value as number,
      range: inputData.range as InputValueNumericRange | undefined,
      onSuccessfulChange,
    };
  } else {
    inputNodeData.value = {
      type: inputData.type,
      title: displayName,
      value: value as string,
      onSuccessfulChange,
    };
  }
}

/** 编辑态输入框按键：Enter 提交（失焦触发 onSuccessfulChange）、Escape 还原后失焦取消、Shift 阻止冒泡 */
function onInputKeydown(e: KeyboardEvent) {
  const self = e.composedPath()[0] as HTMLInputElement;
  if (e.key === "Enter") {
    e.preventDefault();
    self.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    self.value = getEditedValue() as string;
    self.blur();
  } else if (e.key === "Shift") {
    e.stopPropagation();
  }
}

/** 输入框失焦：退出编辑态（清空编辑中的行列） */
function onInputFocusout() {
  editingIndex.value = null;
  editingKey.value = null;
}

/** 命令执行上下文：把这些方法打包交给各 `Command`，命令只经此面操作表格，保证可撤销/重做 */
const ctx: TableContext<T> = {
  empty,
  showLoading,
  refreshAll,
  getData,
  getRowData,
  editData,
  appendData,
  appendDataList,
  insertRow,
  insertRowWithDataMap,
  insertMultipleRowWithDataMap,
  deleteRow,
  deleteMultipleRow,
  copyRow,
  pasteRow,
  dataMapToSelection,
};

/** 当前是否有行处于悬停态（右键菜单显示「在某行上下方插入/复制/删除该行」的前提） */
function isPointerOnAnyRow() {
  return hoveringIndex.value !== null;
}

/** 当前是否有选中行（右键菜单显示「复制/删除所有选中行」的前提） */
function hasSelection() {
  return !!selectedRowCount.value;
}

/** 剪贴板是否为空（右键菜单显示「粘贴」的前提） */
function isCopyboardEmpty() {
  return !clipboard.length;
}

/** 装配右键菜单：每个条目通过 `displayRule` 决定是否显示，回调统一走 `execute` 入历史栈 */
function initContextMenu() {
  contextMenu
    .value!.addItem({
      key: "newRow",
      text: "新建行",
      displayRule: (_e) => editable.value && !currentData.value.length,
      callback: (_e) => execute(new InsertRowCommand(ctx, 0)),
    })
    .addItem({
      key: "insertRowUpper",
      text: "在此行上方插入行",
      displayRule: (_e) => editable.value && isPointerOnAnyRow(),
      callback: (e) => execute(new InsertRowCommand(ctx, getElementIndex(e?.target))),
    })
    .addItem({
      key: "insertRowLower",
      text: "在此行下方插入行",
      displayRule: (_e) => editable.value && isPointerOnAnyRow(),
      callback: (e) => execute(new InsertRowCommand(ctx, getElementIndex(e?.target) + 1)),
    })
    .addItem({
      key: "copyRow",
      text: "复制行",
      displayRule: (_e) => editable.value && isPointerOnAnyRow(),
      callback: (e) => copyRow([getElementIndex(e.target)]),
    })
    .addItem({
      key: "copyMultipleRow",
      text: "复制所有选中行",
      shortcut: McmodderEditableTable.copyKey,
      displayRule: (_e) => editable.value && hasSelection(),
      callback: (_e) => copyRow(getSelection()),
    })
    .addItem({
      key: "pasteRowUpper",
      text: "粘贴在其上方",
      displayRule: (_e) => editable.value && isPointerOnAnyRow() && !isCopyboardEmpty(),
      callback: (e) => execute(new PasteCommand(ctx, getElementIndex(e?.target))),
    })
    .addItem({
      key: "pasteRowLower",
      text: "粘贴在其下方",
      displayRule: (_e) => editable.value && isPointerOnAnyRow() && !isCopyboardEmpty(),
      callback: (e) => execute(new PasteCommand(ctx, getElementIndex(e?.target) + 1)),
    })
    .addItem({
      key: "deleteRow",
      text: "删除该行",
      displayRule: (_e) => editable.value && isPointerOnAnyRow(),
      callback: (e) => execute(new DeleteRowCommand(ctx, getElementIndex(e?.target))),
    })
    .addItem({
      key: "deleteMultipleRow",
      text: "删除所有选中行",
      displayRule: (_e) => editable.value && hasSelection(),
      callback: (_e) => execute(new DeleteMultipleRowCommand(ctx, getSelection())),
    });
}

/** 组件事件：`edit` 单元格改动、`refresh` 刷新（均无参数，仅供父组件感知时机） */
const emit = defineEmits<{
  edit: [];
  refresh: [];
}>();

/** 暴露给父组件/`TemplateRef` 的操作面（数据读写、编辑、选中、命令栈、右键菜单等） */
defineExpose({
  searchData,
  scrollTo,
  setAllData,
  getAllData,
  getData,
  getRowData,
  getValue,
  getAllRowData,
  appendData,
  appendDataList,
  setValue,
  deleteValue,
  deleteData,
  getElementIndex,
  getRowElement,
  getUnitElement,
  refreshAll,
  empty,
  showLoading,
  completeLoading,
  show,
  hide,
  switchDisplayState,
  execute,
  undo,
  redo,
  getEditorData,
  getEditorRowData,
  getSelection,
  saveAll,
  loadingProgress,
  unsaved,
  root: root.value!,
  ctx,
  contextMenu,
  selectedRowCount,
});
</script>
