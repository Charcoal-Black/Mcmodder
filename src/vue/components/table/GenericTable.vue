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
        <th
          v-for="config in headConfigs"
          v-html="config.name"
        />
      </thead>
      <tbody>
        <tr
          class="mcmodder-table-margin-top"
          :style="{ height: cssMarginTopHeight + 'px' }"
        />
        <tr
          class="mcmodder-table-empty"
          v-show="!currentData.length"
        />
        <tr
          v-for="index in renderingRowArray"
          :data-index="index"
          :class="{
            'mcmodder-table-mouseover-tr': index === hoveringIndex,
            'mcmodder-table-unsaved-tr': currentData[index].edited && Object.keys(currentData[index].edited).length,
            'selected': currentData[index].selected
          }"
          @mouseenter="rowOnMouseenter(index)"
        >
          <td
            v-for="key in Object.keys(headConfigs)"
            :data-key="key"
            :class="{
              'mcmodder-table-mouseover-td': key === hoveringKey,
              'mcmodder-table-unsaved-td': currentData[index].edited?.[key]
            }"
            @mouseenter="unitOnMouseenter(index, key)"
            @mouseleave="unitOnMouseleave(index, key)"
            @dblclick="onDblclick(index, key)"
          >
            <div
              v-if="editingIndex !== index || editingKey !== key" v-html="renderUnit(currentData[index], key)" />
            <div v-else ref="inputContainer" class="mcmodder-table-input" @keydown="onInputKeydown" @focusout="onInputFocusout">
              <NumberInput
                v-if="inputNodeData?.type === McmodderInputType.NUMBER"
                ref="input"
                :title="inputNodeData.title"
                :value="inputNodeData.value"
                :range="inputNodeData.range",
                :onSuccessfulChange="inputNodeData.onSuccessfulChange"
              />
              <TextInput
                ref="input"
                v-if="inputNodeData?.type === McmodderInputType.TEXT"
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

<script setup lang="ts" generic="T extends McmodderTableAcceptable">
import { computed, nextTick, onMounted, ref, shallowRef, triggerRef, useTemplateRef, watch } from 'vue';
import { EditConfigs, EditConfigsInitializer, HeadConfigs, InputSuccessfulChangeCallBack, InputValueNumericRange, McmodderTableAcceptable, McmodderTableContext, McmodderTableDataList, McmodderTableDataMap, McmodderTableInputData, McmodderTableProps, McmodderTableRowData, McmodderTableRowRange, McmodderTableRowSelection } from '../../../types';
import { McmodderTable } from '../../../table/Table.ts';
import { McmodderUtils } from '../../../Utils.ts';
import ContextMenu from '../ContextMenu.vue';
import { McmodderEditableTable } from '../../../table/EditableTable.ts';
import { Command } from '../../../table/command/Command.ts';
import { McmodderInputType } from '../../../config/ConfigUtils.ts';
import { EditCommand } from '../../../table/command/EditCommand.ts';
import NumberInput from '../input/NumberInput.vue';
import TextInput from '../input/TextInput.vue';
import { InsertRowCommand } from '../../../table/command/InsertRowCommand.ts';
import { PasteCommand } from '../../../table/command/PasteCommand.ts';
import { DeleteRowCommand } from '../../../table/command/DeleteRowCommand.ts';
import { DeleteMultipleRowCommand } from '../../../table/command/DeleteMultipleRowCommand.ts';
import ProgressBar from '../ProgressBar.vue';

const props = defineProps<McmodderTableProps<T>>();

const isLoading = ref(true);
const currentData = shallowRef<McmodderTableRowData<T>[]>([]);
const renderingRows = ref<McmodderTableRowRange>({ l: -1, r: -1 });
const screenContainableRows = ref(1);
const rowHeight = ref(McmodderTable.ROW_HEIGHT_DEFAULT);
const root = useTemplateRef("root");
const loadingProgress = useTemplateRef("progressBar");
const inputContainer = useTemplateRef("inputContainer");

const cssMarginTopHeight = ref(0);
const cssMarginBottomHeight = ref(0);
const showTable = ref(true);
const showLoadingOverlay = ref(true);
const classLoadingOverlayFaded = ref(false);

// === EDITABLE TABLE === //

const contextMenu = useTemplateRef("contextMenu");

const editable = ref(false);
const editConfigsInitializer = shallowRef(props.editConfigs);
const editConfigs = shallowRef<EditConfigs<T>>();
const unsaved = ref(false);
const selectedRowCount = ref(0);
const isShiftKeyPressed = ref(false);
const hoveringIndex = ref<number | null>(null);
const hoveringKey = ref<keyof T | null>(null);
const prevHoverIndex = ref<number>();
const editingIndex = ref<number | null>(null);
const editingKey = ref<keyof T | null>(null);
const history: Command<T>[] = [];
let historyStage = 0;
let clipboard: McmodderTableDataList<T> = [];

// ====================== //

const renderingRowArray = computed(() => {
  const { l, r } = renderingRows.value;
  return McmodderUtils.createRange(l, r);
});

// head config init
const headConfigsConstructor: Partial<HeadConfigs<T>> = {};
Object.entries(props.headConfigs).forEach(([key, value]) => {
  headConfigsConstructor[key] = McmodderTable.parseHeadConfigInitializer(value);
});
const headConfigs = headConfigsConstructor as HeadConfigs<T>;

function bindEvents() {
  window.addEventListener("scroll", McmodderUtils.animationThrottle(() => {
    onScroll();
  }));
  window.addEventListener("resize", McmodderUtils.animationThrottle(() => {
    updateScreenContainableRows();
  }));
  refreshAll();

  $(document.body).keydown(e => {
    // 撤销 Ctrl+Z
    if (McmodderUtils.isKeyMatch(McmodderEditableTable.undoKey, e) && !e.shiftKey) {
      e.preventDefault();
      undo();
    } 

    // 重做 Ctrl+Y (Ctrl+Shift+Z)
    else if (
      McmodderUtils.isKeyMatch(McmodderEditableTable.redoKey, e) ||
      McmodderUtils.isKeyMatch(McmodderEditableTable.redoKey2, e)
    ) {
      e.preventDefault();
      redo();
    }

    // 保存 Ctrl+S
    else if (McmodderUtils.isKeyMatch(McmodderEditableTable.saveKey, e)) {
      e.preventDefault();
      saveAll();
    }

    // 全选 Ctrl+A
    else if (McmodderUtils.isKeyMatch(McmodderEditableTable.selectAllKey, e)) {
      e.preventDefault();
      selectAll(!e.shiftKey);
    } 

    // 复制 Ctrl+C
    else if (McmodderUtils.isKeyMatch(McmodderEditableTable.copyKey, e)) {
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
  }).keyup(e => {
    if (e.key === "Shift") isShiftKeyPressed.value = false;
  });
}

function gotoHandler(e: Event) {
  const target = e.composedPath()[0] as HTMLElement;
  if (target.classList.contains("mcmodder-table-goto")) {
    const key = target.dataset["goto-key"] as keyof T;
    const value = target.dataset["goto-value"];
    const index = searchData(key, value);
    if (index === -1) McmodderUtils.commonMsg("没有找到该链接所指向的表格行...", false);
    else scrollTo(index);
  }
}

function updateScreenContainableRows() {
  screenContainableRows.value = Math.ceil(window.innerHeight / rowHeight.value) + McmodderTable.ROW_EXPAND;
}

function getTbody() {
  return $(root.value!).find("tbody").get(0);
}

function calculateRenderableRows(): McmodderTableRowRange {
  const dataLength = currentData.value.length;
  if (!dataLength) return { l: -1, r: -1 };

  const l = Math.floor(getTbody().getBoundingClientRect().top / -rowHeight.value);
  const r = l + screenContainableRows.value * 2 + McmodderTable.ROW_EXPAND;

  const L = Math.floor(l / screenContainableRows.value) * screenContainableRows.value;
  const R = Math.ceil(r / screenContainableRows.value) * screenContainableRows.value;

  return {
    l: Math.min(dataLength - 1, Math.max(0, L)),
    r: Math.min(dataLength, R)
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

function scrollTo(index: number) {
  $("html").get(0).scrollTo({
    top: McmodderUtils.getAbsolutePos(getTbody()).y + calculateRowHeightTopOffset(index) - window.screen.height / 2,
    behavior: "smooth"
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
    const newRowHeight = $(getTbody()).find(`[data-index=${ newRows.l }]`).get(0)?.getBoundingClientRect()?.height ?? McmodderTable.ROW_HEIGHT_DEFAULT;
    if (newRowHeight !== rowHeight.value) {
      rowHeight.value = newRowHeight;
      updateScreenContainableRows();
    }
    else {
      renderingRows.value.l = newRows.l;
      renderingRows.value.r = newRows.r;
    }
    nextTick(() => {
      McmodderUtils.updateAllTooltip();
    });
  });
}

function setAllData(data: McmodderTableDataList<T>) {
  empty();
  currentData.value = data.map(e => ({ content: e }));
}

onMounted(() => {
  loadingProgress.value?.hide();
  updateScreenContainableRows();
  bindEvents();
  refreshAll();
  initContextMenu();
})

function getAllData() {
  return currentData.value.map(data => data.content);
}

function getData(index: number) {
  return currentData.value[index].content;
}

function getRowData(index: number) {
  return currentData.value[index];
}

function getValue(index: number, key: keyof T) {
  return getData(index)[key];
}

function getAllRowData() {
  return currentData.value;
}

function appendData(data: T) {
  currentData.value.push({
    content: data
  });
}

function appendDataList(dataList: McmodderTableDataList<T>) {
  dataList.forEach(data => {
    appendData(data);
  });
}

function setValue(index: number, key: keyof T, value: any) {
  if (value === undefined) {
    deleteValue(index, key);
    return;
  }
  currentData.value[index].content[key] = value;
  refreshAll();
}

function deleteValue(index: number, key: keyof T) {
  delete currentData.value[index].content[key];
  refreshAll();
}

function deleteData(index: number) {
  currentData.value.splice(index, 1);
  refreshAll();
}

function isIndexRendering(index: number) {
  return index >= renderingRows.value.l && index <= renderingRows.value.r;
}

function getElementIndex(target?: EventTarget | Element | JQuery | null) {
  if (!target) return -1;
  target = $(target);
  if (target.data("index") !== undefined) return Number(target.data("index"));
  return Number(target.parents("[data-index]").data("index"));
}

function getRowElement(index: number) {
  if (isIndexRendering(index)) return $(getTbody()).find(`[data-index=${ index }]`);
  return $();
}

function getUnitElement(index: number, key: string) {
  return getRowElement(index).find(`[data-key=${ key }]`);
}

function renderUnit(data: McmodderTableRowData<T>, key: string) {
  const rawContent = (data.edited as any)?.[key] ?? (data.content as any)[key];
  const displayRule = headConfigs[key].displayRule;
  let content;
  if ((!displayRule || displayRule.length < 2) && (rawContent === undefined || rawContent === null)) {
    content = null;
  } else {
    content = displayRule?.(rawContent, data.content) ?? rawContent;
  }
  if (content === undefined || content === null) {
    return '<span class="text-muted">∅</span>'
  }
  return content;
}

function refreshAll() {
  triggerRef(currentData);
  completeLoading();
  renderingRows.value = { l: -1, r: -1 };
  emit("refresh");
  nextTick(() => {
    onScroll();
  })
}

function empty() {
  currentData.value = [];
  selectedRowCount.value = 0;
  unsaved.value = false;
  refreshAll();
}

function showLoading() {
  if (isLoading.value) return;
  isLoading.value = true;
  showLoadingOverlay.value = true;
  classLoadingOverlayFaded.value = false;
  loadingProgress.value!.hide();
  loadingProgress.value!.setProgress(0);
}

function completeLoading() {
  if (!isLoading.value) return;
  loadingProgress.value!.setProgressToMax();
  isLoading.value = false;
  classLoadingOverlayFaded.value = true;
  setTimeout(() => {
    if (!isLoading.value) showLoadingOverlay.value = false;
  }, 800);
}

function show() {
  showTable.value = true;
}

function hide() {
  showTable.value = false;
}

function switchDisplayState() {
  if (!showTable.value) show();
  else hide();
}

// === EDITABLE TABLE === //

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
    const result: Partial<EditConfigsInitializer<T>> = {};
    (Object.entries(editConfigsInitializer.value)).forEach(([key, value]) => {
      result[key as keyof T] = McmodderEditableTable.parseEditConfigInitializer(value);
    });
    editConfigs.value = result as unknown as EditConfigs<T>; // doge
  }, {
    immediate: true
  }
)

function execute(command: Command<T>) {
  if (!editable.value) {
    return;
  }
  command.execute();
  history.length = historyStage;
  historyStage = history.push(command);
}

function undo() {
  if (historyStage > 0) {
    history[--historyStage].undo();
  }
}

function redo() {
  if (historyStage < history.length) {
    history[historyStage++].redo();
  }
}

function getEditorData(index: number, key: keyof T) {
  const rowData = getRowData(index);
  return rowData.edited?.[key] ?? rowData.content[key];
}

function getEditorRowData(index: number) {
  const rowData = getRowData(index);
  const content = McmodderUtils.simpleDeepCopy(rowData.content);
  Object.keys(rowData.edited || {}).forEach(key => {
    (content as any)[key] = rowData.edited![key];
  });
  return content;
}

function getSelection() {
  let selection: McmodderTableRowSelection = [];
  currentData.value.forEach((data, index) => {
    if (data.selected) selection.push(index);
  });
  return selection;
}

function copyRow(selection = getSelection()) {
  clipboard = new Array(selection.length);
  selection.forEach((row, index) => {
    clipboard[index] = McmodderUtils.simpleDeepCopy(currentData.value[row].content);
    // delete this.clipboard[index]._selected;
  });
}

function pasteRow(index: number) {
  insertMultipleRowWithArray(index, clipboard);
  const dataMap: McmodderTableDataMap<T> = {};
  const length = clipboard.length;
  for (let i = 0; i < length; i++) {
    dataMap[i + index] = clipboard[i];
  }
  return dataMap;
}

function deleteRow(index: number): McmodderTableDataMap<T> {
  if (currentData.value[index].selected) selectedRowCount.value--;
  let deletedData = McmodderUtils.simpleDeepCopy(currentData.value[index].content);
  currentData.value.splice(index, 1);
  refreshAll();
  unsaved.value = true;
  return { [index]: deletedData };
}

function deleteMultipleRow(selection: McmodderTableRowSelection) {
  // 循环n次deleteRow，时间复杂度是O(n^2)，这里采用O(n)的优化版方案
  const deletedData: McmodderTableDataMap<T> = {};
  const tempData: any = currentData;
  selection.forEach(i => {
    if (currentData.value[i].selected) selectedRowCount.value--;
    deletedData[i] = Object.assign({}, currentData.value[i].content);
    tempData[i] = null;
  });
  currentData.value = tempData.filter((e: any) => e);
  refreshAll();
  unsaved.value = true;
  return deletedData;
}

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

function dataMapToSelection(dataMap: McmodderTableDataMap<T>) {
  return Object.keys(dataMap).map(Number).sort();
}

function insertRowWithDataMap(dataMap: McmodderTableDataMap<T>) {
  const key = Number(Object.keys(dataMap)[0]);
  insertRow(key, dataMap[key]);
}

function createDefaultRowData() {
  const result: Partial<T> = {};
  (Object.keys(editConfigs.value!) as (keyof EditConfigs<T>)[]).forEach(key => {
    const editConfig = editConfigs.value![key];
    if (!editConfig.optional) result[key] = editConfigs.value![key].value;
  });
  return result as T;
}

function insertRow(index: number, newData?: T) {
  if (!newData) newData = createDefaultRowData();
  if (index < 0 || index > currentData.value.length) return;
  currentData.value.splice(index, 0, {content: McmodderUtils.simpleDeepCopy(newData)});
  refreshAll();
  unsaved.value = true;
}

function insertMultipleRowWithArray(index: number, dataList: McmodderTableDataList<T>) {
  const l = currentData.value.slice(0, index);
  const r = currentData.value.slice(index);
  currentData.value = l.concat(McmodderUtils.simpleDeepCopy(dataList.map(e => ({
    content: McmodderUtils.simpleDeepCopy(e)
  })))).concat(r);
  refreshAll();
  unsaved.value = true;
}

function insertMultipleRowWithDataMap(dataMap: McmodderTableDataMap<T>) {
  let i = 0, j = 0;
  let total = currentData.value.length + Object.keys(dataMap).length;
  let newData: any[] = new Array(total).fill(null).map(() => ({}));
  let deletedRowIndex = dataMapToSelection(dataMap);
  for (let k = 0; k < total; k++) {
    if (deletedRowIndex[j] == k) {
      newData[k].content = McmodderUtils.simpleDeepCopy(dataMap[k]);
      j++;
    }
    else newData[k] = currentData.value[i++];
  }
  currentData.value = newData;
  refreshAll();
  unsaved.value = true;
}

function saveAll() {
  currentData.value.forEach(data => {
    if (!data.edited) return;
    (Object.keys(data.edited) as (keyof T)[]).forEach(key => {
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

function selectRange(l: number, r: number, state: boolean) {
  for (let i = l; i <= r; i++) {
    selectRow(i, state);
  }
}

function selectAll(state: boolean) {
  selectRange(0, currentData.value.length - 1, state);
}

function switchSelectState(index: number) {
  if (isNaN(index)) return;
  const target = currentData.value[index];
  if (!target) return;
  prevHoverIndex.value = index;
  const selected = !target.selected;
  selectRow(index, selected);
}

function rowOnMouseenter(index: number) {
  if (!isShiftKeyPressed.value) return;
  if (prevHoverIndex.value != undefined) {
    if (index === prevHoverIndex.value) return;
    let dir = index > prevHoverIndex.value ? 1 : -1;
    for (let i = prevHoverIndex.value + dir; i != index; i += dir) { // 补间
      switchSelectState(i);
    }
  }
  switchSelectState(index);
}

function unitOnMouseenter(index: number, key: keyof T) {
  hoveringIndex.value = index;
  hoveringKey.value = key;
}

function unitOnMouseleave(index: number, key: keyof T) {
  if (hoveringIndex.value === index) {
    hoveringIndex.value = null;
  }
  if (hoveringKey.value === key) {
    hoveringKey.value = null;
  }
}

function getEditedValue() {
  const data = currentData.value[editingIndex.value!];
  return data.edited?.[editingKey.value] ?? data.content[editingKey.value];
}

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
  const value = inputData.edited?.hasOwnProperty(key) ? inputData.edited[key] : inputData.content[key];
  if (!editConfigs.value!.hasOwnProperty(key)) {
    throw new Error("Unexpected data key.");
  }

  const typedKey = key as keyof EditConfigs<T>;
  const editConfig = editConfigs.value![typedKey] as McmodderTableInputData;
  const nonNullValue = value ?? editConfig.value;
  computeInputNode(typedKey, nonNullValue, editConfig, info => {
    execute(new EditCommand(ctx, index, key, info.final));
    onInputFocusout();
  });
  nextTick(() => {
    $(inputContainer.value![0]).children("input").focus();
  })
}

const inputNodeData = shallowRef<{
  type: McmodderInputType,
  title: string,
  value: any,
  range?: InputValueNumericRange,
  onSuccessfulChange: InputSuccessfulChangeCallBack<unknown>
}>();

function computeInputNode(
  key: keyof EditConfigs<T>,
  value: unknown,
  inputData: McmodderTableInputData,
  onSuccessfulChange: InputSuccessfulChangeCallBack<unknown>
) {
  const displayName = inputData.customName || headConfigs[key].name || String(key);
  if (inputData.type === McmodderInputType.NUMBER) {
    inputNodeData.value = {
      type: inputData.type,
      title: displayName,
      value: value as number,
      range: inputData.range as InputValueNumericRange | undefined,
      onSuccessfulChange
    };
  } else {
    inputNodeData.value = {
      type: inputData.type,
      title: displayName,
      value: value as string,
      onSuccessfulChange
    };
  }
}

function onInputKeydown(e: KeyboardEvent) {
  const self = e.composedPath()[0] as HTMLInputElement;
  if (e.key === "Enter") {
    e.preventDefault();
    self.blur();
  }
  else if (e.key === "Escape") {
    e.preventDefault();
    self.value = getEditedValue();
    self.blur();
  }
  else if (e.key === "Shift") {
    e.stopPropagation();
  }
}

function onInputFocusout() {
  editingIndex.value = null;
  editingKey.value = null; 
}

const ctx: McmodderTableContext<T> = {
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
  dataMapToSelection
}

function isMouseOnAnyRow() {
  return hoveringIndex.value !== null;
}

function hasSelection() {
  return !!selectedRowCount.value;
}

function isCopyboardEmpty() {
  return !clipboard.length;
}

function initContextMenu() {
  contextMenu.value!.addItem({
    key: "newRow",
    text: "新建行",
    displayRule: _e => editable.value && !currentData.value.length, 
    callback: _e => execute(new InsertRowCommand(ctx, 0))
  })
  .addItem({
    key: "insertRowUpper",
    text: "在此行上方插入行",
    displayRule: _e => editable.value && isMouseOnAnyRow(), 
    callback: e => execute(new InsertRowCommand(ctx, getElementIndex(e?.target)))
  })
  .addItem({
    key: "insertRowLower",
    text: "在此行下方插入行",
    displayRule: _e => editable.value && isMouseOnAnyRow(),
    callback: e => execute(new InsertRowCommand(ctx, getElementIndex(e?.target) + 1))
  })
  .addItem({
    key: "copyRow",
    text: "复制行",
    displayRule: _e => editable.value && isMouseOnAnyRow(), 
    callback: e => copyRow([getElementIndex(e.target)])
  })
  .addItem({
    key: "copyMultipleRow",
    text: "复制所有选中行",
    shortcut: McmodderEditableTable.copyKey,
    displayRule: _e => editable.value && hasSelection(), 
    callback: _e => copyRow(getSelection())
  })
  .addItem({
    key: "pasteRowUpper",
    text: "粘贴在其上方",
    displayRule: _e => editable.value && isMouseOnAnyRow() && !isCopyboardEmpty(), 
    callback: e => execute(new PasteCommand(ctx, getElementIndex(e?.target)))
  })
  .addItem({
    key: "pasteRowLower",
    text: "粘贴在其下方",
    displayRule: _e => editable.value && isMouseOnAnyRow() && !isCopyboardEmpty(), 
    callback: e => execute(new PasteCommand(ctx, getElementIndex(e?.target) + 1))
  })
  .addItem({
    key: "deleteRow",
    text: "删除该行",
    displayRule: _e => editable.value && isMouseOnAnyRow(), 
    callback: e => execute(new DeleteRowCommand(ctx, getElementIndex(e?.target)))
  })
  .addItem({
    key: "deleteMultipleRow",
    text: "删除所有选中行",
    displayRule: _e => editable.value && hasSelection(), 
    callback: _e => execute(new DeleteMultipleRowCommand(ctx, getSelection()))
  });
}

const emit = defineEmits<{
  edit: [],
  refresh: []
}>()

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
  selectedRowCount
})

</script>