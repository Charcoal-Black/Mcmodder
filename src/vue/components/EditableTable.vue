<template>
  <div class="mcmodder-vue-table">
    <div v-if="table.isLoading" class="mcmodder-table-loading-overlay">
      <div class="mcmodder-table-loading-container">
        <div class="mcmodder-loading" />
      </div>
    </div>

    <table class="mcmodder-table" :class="{ 'has-data': dataLength > 0 }">
      <thead>
        <tr>
          <th v-for="(head, key) in table.headConfigs" :key="key">{{ head.name }}</th>
        </tr>
      </thead>
      <tbody ref="tbodyEl" @click="onBodyClick">
        <template v-if="dataLength > 0">
          <tr v-if="topOffset > 0" class="mcmodder-table-margin-top">
            <td :colspan="colCount" :style="{ height: topOffset + 'px' }" />
          </tr>
          <tr
            v-for="index in visibleRows"
            :key="'row-' + index"
            :data-index="index"
            draggable="true"
            :class="rowClasses(index)"
            @mouseenter="onRowMouseenter(index)"
            @dragstart="onDragStart(index, $event)"
            @dragover.prevent
            @drop.prevent="onDrop(index, $event)"
            @dragend="dragIndex = null"
          >
            <td
              v-for="(_, key) in table.headConfigs"
              :key="key"
              :data-key="key"
              :data-readonly="cellDisplay(index, key).readonly ? '1' : undefined"
              :class="cellClasses(index, key)"
              @dblclick="onTdDblclick(index, key, $event)"
              @mouseenter="onTdMouseenter(index, key)"
              @mouseleave="onTdMouseleave"
            >
              <input
                v-if="isEditingCell(index, key)"
                ref="editInputEl"
                class="form-control mcmodder-table-input"
                :type="editing!.type === McmodderInputType.NUMBER ? 'number' : 'text'"
                :value="editValue"
                @input="editValue = ($event.target as HTMLInputElement).value"
                @keydown="onEditKeydown"
                @blur="onEditBlur"
              >
              <span v-else v-html="cellDisplay(index, key).html" />
            </td>
          </tr>
          <tr v-if="bottomOffset > 0" class="mcmodder-table-margin-bottom">
            <td :colspan="colCount" :style="{ height: bottomOffset + 'px' }" />
          </tr>
        </template>
        <tr v-else class="mcmodder-table-empty">
          <td :colspan="colCount" />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { McmodderInputType } from "../../config/ConfigUtils";
import type { EditableTableCellDisplay, EditableTableBridge, EditableTableExpose } from "../../table/EditableTable";

const props = defineProps<{
  table: EditableTableBridge;
  onReady?: (api: EditableTableExpose) => void;
}>();

const table = props.table;

const ROW_EXPAND = 2;
const THROTTLE_INTERVAL = 16;
const ROW_HEIGHT_DEFAULT = 48;


const version = ref(0);
const tbodyEl = useTemplateRef<HTMLElement>("tbodyEl");
const range = reactive({ l: -1, r: -1 });
const topOffset = ref(0);
const bottomOffset = ref(0);
const rowHeight = ref(ROW_HEIGHT_DEFAULT);
const screenContainableRows = ref(Math.ceil(screen.height / ROW_HEIGHT_DEFAULT) + ROW_EXPAND);

const dataLength = computed(() => {
  version.value;
  return table.currentData.length;
});
const colCount = computed(() => {
  version.value;
  return Object.keys(table.headConfigs).length;
});
const visibleRows = computed(() => {
  version.value;
  if (range.l === -1 || range.r === -1) return [];
  const list: number[] = [];
  for (let i = range.l; i <= range.r; i++) list.push(i);
  return list;
});

function requestRender(_rowIndex?: number) {
  version.value++;
}

function updateVisibleRange() {
  const dataLengthValue = table.currentData.length;
  if (!dataLengthValue) {
    range.l = -1;
    range.r = -1;
    topOffset.value = 0;
    bottomOffset.value = 0;
    return;
  }
  const tbodyTop = tbodyEl.value?.getBoundingClientRect().top ?? 0;
  const l = Math.floor(tbodyTop / -rowHeight.value);
  const r = l + screenContainableRows.value * 2 + ROW_EXPAND;
  const L = Math.floor(l / screenContainableRows.value) * screenContainableRows.value;
  const R = Math.ceil(r / screenContainableRows.value) * screenContainableRows.value;
  range.l = Math.min(dataLengthValue - 1, Math.max(0, L));
  range.r = Math.min(dataLengthValue - 1, R);
  topOffset.value = range.l * rowHeight.value;
  bottomOffset.value = (dataLengthValue - range.r - 1) * rowHeight.value;
}

let scrollTimer: number | undefined;
function onScroll() {
  if (scrollTimer) return;
  scrollTimer = window.setTimeout(() => {
    scrollTimer = undefined;
    updateVisibleRange();
  }, THROTTLE_INTERVAL);
}

/** 测量实际行高（虚拟滚动依赖） */
function measureRowHeight() {
  const row = tbodyEl.value?.querySelector<HTMLElement>("tr[data-index]");
  if (!row) return;
  const height = row.getBoundingClientRect().height;
  if (height && height !== rowHeight.value) {
    rowHeight.value = height;
    screenContainableRows.value = Math.ceil(screen.height / height) + ROW_EXPAND;
  }
}


const visibleCells = computed<Record<string, EditableTableCellDisplay>>(() => {
  version.value;
  const keys = Object.keys(table.headConfigs);
  const map: Record<string, EditableTableCellDisplay> = {};
  for (const index of visibleRows.value) {
    for (const key of keys) {
      map[`${ index }:${ key }`] = table.getCellDisplay(index, key);
    }
  }
  return map;
});

function cellDisplay(index: number, key: string) {
  return visibleCells.value[`${ index }:${ key }`];
}

function rowClasses(index: number) {
  const rowData = table.currentData[index];
  const classes: Record<string, boolean> = {
    "mcmodder-table-unsaved-tr": !!rowData?.edited && Object.keys(rowData.edited).length > 0,
    selected: !!rowData?.selected,
    "mcmodder-table-mouseover-tr": hoveredCell.value?.index === index,
    "row-even": index % 2 === 0,
    "row-odd": index % 2 === 1,
    "drag-over": dragOverIndex.value === index
  };
  return classes;
}

function cellClasses(index: number, key: string) {
  const cell = cellDisplay(index, key);
  return {
    "mcmodder-table-unsaved-td": cell.unsaved,
    "mcmodder-table-mouseover-td": hoveredCell.value?.index === index && hoveredCell.value?.key === key
  };
}


const hoveredCell = ref<{ index: number; key: string } | null>(null);

function onRowMouseenter(index: number) {
  table.onRowHover(index);
}

function onTdMouseenter(index: number, key: string) {
  hoveredCell.value = { index, key };
  table.onCellHover(index);
}

function onTdMouseleave() {
  hoveredCell.value = null;
  table.onCellHover(null);
}


const editing = ref<{ index: number; key: string; initial: any; type: McmodderInputType } | null>(null);
const editValue = ref("");
const editInputEl = useTemplateRef<HTMLInputElement>("editInputEl");

function isEditingCell(index: number, key: string) {
  return editing.value?.index === index && editing.value?.key === key;
}

function onTdDblclick(index: number, key: string, _e: Event) {
  const cell = cellDisplay(index, key);
  if (cell.readonly) return;
  editing.value = {
    index,
    key,
    initial: cell.value,
    type: cell.editableType
  };
  editValue.value = cell.value === undefined || cell.value === null ? "" : String(cell.value);
  nextTick(() => {
    editInputEl.value?.focus();
    editInputEl.value?.select();
  });
}

function onEditKeydown(e: KeyboardEvent) {
  const input = e.target as HTMLInputElement;
  if (e.key === "Enter") {
    input.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    editing.value = null;
  } else if (e.key === "Shift") {
    e.stopPropagation();
  }
}

function onEditBlur() {
  const ed = editing.value;
  if (!ed) return;
  editing.value = null;
  let newValue: any;
  if (ed.type === McmodderInputType.NUMBER) {
    newValue = Number(editValue.value);
  } else {
    newValue = String(editValue.value).trim();
  }
  if (String(newValue) === String(ed.initial)) return;
  table.commitEdit(ed.index, ed.key, newValue);
}


const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index;
  e.dataTransfer?.setData("text/plain", String(index));
  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
}

function onDrop(index: number, _e: DragEvent) {
  const from = dragIndex.value;
  dragOverIndex.value = null;
  dragIndex.value = null;
  if (from === null || from === index) return;
  const order = table.currentData.slice();
  const [moved] = order.splice(from, 1);
  order.splice(index, 0, moved);
  table.onRowsRearranged(order);
}


function onBodyClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest?.(".mcmodder-table-goto");
  if (!target) return;
  const key = target.getAttribute("data-goto-key");
  const value = target.getAttribute("data-goto-value");
  if (key) table.onGotoClick(key, value);
}


watch(version, async () => {
  updateVisibleRange();
  await nextTick();
  measureRowHeight();
});

onMounted(() => {
  updateVisibleRange();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  props.onReady?.({ requestRender });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  if (scrollTimer) clearTimeout(scrollTimer);
});
</script>

<style scoped>
.mcmodder-vue-table {
  position: relative;
}
.mcmodder-table {
  width: 100%;
  margin-top: 0;
  background-color: var(--mcmodder-color-background-transparent);
  overflow: hidden;
  border-collapse: collapse;
}
.mcmodder-table thead {
  height: 1em;
}
.mcmodder-table td,
.mcmodder-table th {
  border-width: 1px;
  border-color: transparent;
  text-align: center;
  max-width: 500px;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: .2em .5em;
  white-space: nowrap;
}
.mcmodder-table tbody {
  white-space: nowrap;
  overflow: hidden;
}
.mcmodder-table tr[data-index] {
  height: 48px;
  cursor: default;
}
.mcmodder-table tr.row-even:not(.mcmodder-table-empty) {
  background-color: var(--mcmodder-color-background);
}
.mcmodder-table tr.row-odd:not(.mcmodder-table-empty) {
  background-color: var(--mcmodder-color-primary-background);
}
.mcmodder-table tr.drag-over td {
  box-shadow: 0 2px 0 0 var(--mcmodder-color-accent) inset;
}
.mcmodder-table-empty {
  height: 100px;
  min-height: 100px;
  position: relative;
}
.mcmodder-table-empty::before {
  content: "暂无数据";
  text-wrap: nowrap;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  line-height: 100px;
  color: var(--mcmodder-color-text-dark3);
  text-align: center;
}
.mcmodder-table tr.selected {
  box-shadow: 0 0 0 3px var(--mcmodder-color-accent-transparent1) inset;
  backdrop-filter: sepia(40%);
  position: relative;
}
.mcmodder-table tr.selected::after {
  content: "\f00c";
  font-size: 24px;
  position: absolute;
  right: .25em;
  bottom: 0;
  color: var(--mcmodder-color-accent-dark1-transparent1);
  font-family: FontAwesome;
}
.mcmodder-table tr.mcmodder-table-unsaved-tr.selected::after {
  color: var(--mcmodder-color-primary-dark1);
}
.mcmodder-table-unsaved-td {
  font-weight: bold;
  background-color: var(--mcmodder-color-primary-transparent1);
}
.mcmodder-table-unsaved-tr {
  background-color: var(--mcmodder-color-primary-transparent1);
}
:host-context(html.dark) .mcmodder-table-mouseover-tr > td:not(.mcmodder-table-mouseover-td) {
  backdrop-filter: brightness(125%);
}
:host-context(html.dark) .mcmodder-table-mouseover-tr > .mcmodder-table-mouseover-td {
  backdrop-filter: brightness(150%);
}
.mcmodder-table-mouseover-tr > td:not(.mcmodder-table-mouseover-td) {
  backdrop-filter: brightness(98%);
}
.mcmodder-table-mouseover-tr > .mcmodder-table-mouseover-td {
  backdrop-filter: brightness(95%);
}
.mcmodder-table td img {
  margin-bottom: 0;
  width: 32px;
  height: 32px;
  vertical-align: middle;
}
.form-control.mcmodder-table-input {
  width: 100%;
  padding: .1em;
  border-radius: 0;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-accent);
  color: var(--mcmodder-color-text);
  font-size: 14px;
}
.mcmodder-table-loading-overlay {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: var(--mcmodder-color-background-transparent);
  backdrop-filter: blur(3px) contrast(50%);
  overflow: hidden;
  z-index: 1;
}
.mcmodder-table-loading-container {
  height: 100%;
  max-height: 300px;
  position: relative;
}
.mcmodder-loading {
  height: 100%;
  width: 100%;
  min-width: 70px;
  min-height: 50px;
  position: relative;
}
.mcmodder-loading::before,
.mcmodder-loading::after {
  content: "";
  width: 2em;
  height: 2em;
  border-radius: 50%;
  position: absolute;
  top: calc(50% - 1em);
}
.mcmodder-loading::before {
  background-color: var(--mcmodder-color-primary);
  transform-origin: right center;
  left: calc(50% - 2em);
  animation: mcmodder-loading-first 1s ease-in-out 0s infinite alternate;
}
.mcmodder-loading::after {
  background-color: var(--mcmodder-color-accent);
  transform-origin: left center;
  right: calc(50% - 2em);
  animation: mcmodder-loading-second 1s ease-in-out 0s infinite alternate;
}
@keyframes mcmodder-loading-first {
  from { transform: scale(0.5); }
  to { transform: scale(1); }
}
@keyframes mcmodder-loading-second {
  from { transform: scale(1); }
  to { transform: scale(0.5); }
}
</style>
