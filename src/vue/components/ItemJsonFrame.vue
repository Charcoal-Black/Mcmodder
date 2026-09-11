<template>
  <div class="mcmodder-jsonframe">
    <div class="jsonframe-menu">
      <div class="jsonframe-menucontent">
        <select class="jsonframe-select btn btn-sm" v-model="activeFileName">
          <option value="">选择一个JSON文件</option>
          <option v-for="name in selectionList" :key="name" :value="name">{{ name }}</option>
        </select>
        <template v-for="tool in tools" :key="tool.id">
          <label v-if="tool.kind === 'file'" class="btn btn-sm" :for="fileInputId" v-show="tool.visible">
            {{ tool.text }}
            <input :id="fileInputId" type="file" accept="application/json" class="jsonframe-file-input" @change="onImportFile(tool, $event)">
          </label>
          <button v-else class="btn btn-sm" :class="{ 'btn-danger': tool.danger }" v-show="tool.visible" @click="tool.action()">
            {{ tool.text }}
          </button>
        </template>
      </div>
    </div>

    <div class="jsonframe-content" ref="contentSlot" />

    <div v-if="panelMode === 'class'" class="jsonframe-panel-mask" @click.self="panelMode = null">
      <div class="jsonframe-panel">
        <div class="jsonframe-panel-head">
          <span class="title">从现有模组资料导入JSON</span>
          <a class="close" href="javascript:void(0)" @click="panelMode = null">×</a>
        </div>
        <div class="edit-autolink-frame">
          <div class="input-group edit-autolink-seach">
            <input
              v-model="classSearch.classID"
              placeholder="输入模组的百科数字 ID.."
              class="form-control"
              @keyup.enter="typeIDInput?.focus()"
            >
            <div class="mcmodder-input-container">
              <input
                ref="typeIDInput"
                v-model="classSearch.typeID"
                placeholder="输入资料类型 ID.. (留空默认为 1)"
                class="form-control"
                @focus="openTypeSuggestions"
                @input="filterTypeSuggestions"
                @blur="closeTypeSuggestions"
                @keyup.enter="runClassSearch"
              >
              <div v-if="typeSuggestionsOpen" class="mcmodder-input-list">
                <a
                  v-for="(rec, i) in typeSuggestions"
                  :key="i"
                  href="javascript:void(0)"
                  @mousedown.prevent="pickTypeSuggestion(rec.value)"
                >
                  <span v-if="rec.html" v-html="rec.html" />
                  <span v-else>{{ rec.value }}</span>
                </a>
                <span v-if="!typeSuggestions.length" class="empty">没有匹配的推荐项...</span>
              </div>
            </div>
            <button class="btn btn-dark" :disabled="searchBusy" @click="runClassSearch">
              {{ searchBusy ? "执行中..." : "执行" }}
            </button>
          </div>
          <div class="title">导入设置:</div>
          <div class="edit-autolink-style">
            <div class="checkbox">
              <input :id="inferInputId" v-model="classSearch.infer" type="checkbox">
              <label :for="inferInputId">访问潜在资料 - 在一轮资料列表获取完毕后，考虑到同一类资料通常是在同一个批次中批量添加的，脚本会试图访问那些可能仍然属于目标模组区域，但是未出现在现有资料列表中的物品资料 ID。这种方法能够应对综合子资料数量大于 100 的情况，以及访问到部分隐藏分类中的资料。</label>
            </div>
            <div class="checkbox">
              <input :id="geticonInputId" v-model="classSearch.geticon" type="checkbox">
              <label :for="geticonInputId">保存物品图标 - 读取的同时获取物品的小图标和大图标，并以 Base64 格式保存进 JSON 文件里。启用该项配置会显著增大输出文件体积；若不启用，则在显示物品图标时会实时从百科获取图标。</label>
            </div>
            <div class="checkbox">
              <input :id="getallInputId" v-model="classSearch.getall" type="checkbox">
              <label :for="getallInputId">保存完整数据 - 读取一个资料的全部数据（包括图标、注册名、物品标签等所有可以在编辑页访问的数据）。启用该项配置会忽略“保存物品图标”的配置。确切来说，脚本会通过逐一访问所有物品的编辑页来获取这些数据。<strong>启用此项将会向服务器发送大量请求，使用前请务必妥善配置脚本“最短发包间隔”！！</strong></label>
            </div>
          </div>
          <span class="mcmodder-getitemlist-result" />
          <div ref="loggerEl" class="mcmodder-logger mcmodder-monospace">
            <p v-for="(entry, i) in loggerEntries" :key="i" :class="entry.type">&lt;{{ entry.time }}&gt; {{ entry.prefix }}{{ entry.message }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="panelMode === 'online'" class="jsonframe-panel-mask" @click.self="panelMode = null">
      <div class="jsonframe-panel jsonframe-panel-wide">
        <div class="jsonframe-panel-head">
          <span class="title">从收纳贴获取JSON</span>
          <a class="close" href="javascript:void(0)" @click="panelMode = null">×</a>
        </div>
        <div class="jsonframe-bbs-filelist">
          <table class="mcmodder-table">
            <thead>
              <tr>
                <th>发表者</th>
                <th>所属楼层编号</th>
                <th>文件名</th>
                <th>文件大小</th>
                <th>额外信息</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in onlineFiles" :key="file.pid">
                <td><a target="_blank" :href="centerURL(file)">{{ userName(file) }}</a></td>
                <td><a target="_blank" :href="pidURL(file.pid)">{{ file.pid }}</a></td>
                <td>{{ file.name }}</td>
                <td>{{ file.size }}</td>
                <td class="jsonframe-file-info"><span :title="file.info">{{ omitText(file.info) }}</span></td>
                <td><a class="jsonframe-bbs-filedl" href="javascript:void(0)" @click="downloadFile(file)">下载并导入</a></td>
              </tr>
              <tr v-if="!onlineFiles.length" class="mcmodder-table-empty">
                <td colspan="6" />
              </tr>
            </tbody>
          </table>
          <ul v-if="maxPage > 1" class="pagination common-pages">
            <li v-if="currentPage > 1" class="page-item"><a class="page-link" href="javascript:void(0)" @click="gotoPage(1)">首页</a></li>
            <li v-if="currentPage > 1" class="page-item"><a class="page-link" href="javascript:void(0)" @click="gotoPage(currentPage - 1)">前页</a></li>
            <li
              v-for="page in pageNumbers"
              :key="page"
              class="page-item"
              :class="{ active: page === currentPage }"
            >
              <a class="page-link" href="javascript:void(0)" @click="gotoPage(page)">{{ page.toLocaleString() }}</a>
            </li>
            <li v-if="currentPage < maxPage" class="page-item"><a class="page-link" href="javascript:void(0)" @click="gotoPage(currentPage + 1)">后页</a></li>
            <li v-if="currentPage < maxPage" class="page-item"><a class="page-link" href="javascript:void(0)" @click="gotoPage(maxPage)">尾页</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from "vue";
import type { ItemJsonFrameApplication, ItemJsonFrameLogEntry } from "../../jsonframe/ItemJsonFrame";
import type { ItemJsonFrame as ItemJsonFrameAdapter } from "../../jsonframe/ItemJsonFrame";
import type { ItemJsonFrameExpose } from "../../jsonframe/ItemJsonFrame";
import { McmodderUtils } from "../../Utils";

const props = defineProps<{
  frame: ItemJsonFrameAdapter;
  onReady?: (api: ItemJsonFrameExpose) => void;
}>();

const frame = props.frame;


const stateVersion = ref(0);
const selectionList = computed(() => {
  stateVersion.value;
  return frame.selectionList;
});

const activeFileName = computed({
  get: () => {
    stateVersion.value;
    return frame.activeFileName;
  },
  set: (value: string) => frame.selectFile(value)
});
const fileInputId = `jsonframe_${ frame.id }-importLocal`;

interface FrameTool {
  id: string;
  text: string;
  kind: "button" | "file";
  visible: boolean;
  danger?: boolean;
  action: (e?: Event) => void;
}

const tools = computed<FrameTool[]>(() => {
  stateVersion.value;
  return [
    {
      id: "importLocal",
      text: "从本地导入JSON",
      kind: "file",
      visible: true,
      action: e => {
        const file = (e?.target as HTMLInputElement)?.files?.[0];
        if (file) frame.importFromFile(file);
      }
    },
    { id: "new", text: "新建文件", kind: "button", visible: true, action: () => frame.newUnnamedJson() },
    {
      id: "saveedit",
      text: "保存修改",
      kind: "button",
      visible: !!frame.activeFileName || frame.hasRearranged,
      action: () => frame.saveEdit()
    },
    {
      id: "rename",
      text: "重命名",
      kind: "button",
      visible: !!frame.activeFileName && !frame.table.unsaved,
      action: () => frame.rename()
    },
    {
      id: "deleteall",
      text: "删除当前文件",
      kind: "button",
      visible: !!frame.activeFileName,
      danger: true,
      action: () => {
        frame.tryDeleteJson(frame.activeFileName).then(ok => {
          if (ok) frame.reset();
        });
      }
    },
    { id: "more", text: "更多...", kind: "button", visible: true, action: () => frame.more() },
    {
      id: "export",
      text: "导出当前文件至本地",
      kind: "button",
      visible: !!frame.activeFileName,
      action: () => frame.exportJson(frame.activeFileName)
    },
    { id: "importClass", text: "从模组导入JSON", kind: "button", visible: true, action: () => frame.openClassSearchFrame() },
    { id: "importOnline", text: "从收纳贴导入JSON", kind: "button", visible: true, action: () => frame.searchOnlineFiles() },
    {
      id: "submitedit",
      text: "提交所有改动至百科",
      kind: "button",
      visible: !!(frame.activeFileName && frame.table.unsaved),
      danger: true,
      action: () => frame.submitEdit()
    }
  ];
});

function onImportFile(tool: FrameTool, e: Event) {
  tool.action?.(e);
  (e.target as HTMLInputElement).value = "";
}


const contentSlot = useTemplateRef<HTMLElement>("contentSlot");

onMounted(() => {
  contentSlot.value?.appendChild(frame.table.$instance.get(0));
  props.onReady?.({
    updateState,
    setLoggerEntries,
    showClassSearchPanel,
    showOnlinePanel,
    setSearchButtonBusy,
    setOnlineFiles
  });
});

function updateState() {
  stateVersion.value++;
}


const loggerEntries = ref<ItemJsonFrameLogEntry[]>([]);
const loggerEl = useTemplateRef<HTMLElement>("loggerEl");

function setLoggerEntries(entries: ItemJsonFrameLogEntry[]) {
  loggerEntries.value = entries;
  nextTick(() => {
    const el = loggerEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}


const panelMode = ref<"class" | "online" | null>(null);
const searchBusy = ref(false);
const typeIDInput = useTemplateRef<HTMLInputElement>("typeIDInput");

const classSearch = reactive({
  classID: "",
  typeID: "",
  infer: false,
  geticon: false,
  getall: false
});

const inferInputId = `jsonframe_${ frame.id }-importclass-infer`;
const geticonInputId = `jsonframe_${ frame.id }-importclass-geticon`;
const getallInputId = `jsonframe_${ frame.id }-importclass-getall`;

const typeSuggestionsOpen = ref(false);
const typeSuggestions = ref<{ html?: string; value: string }[]>([]);

function openTypeSuggestions() {
  typeSuggestionsOpen.value = true;
  filterTypeSuggestions();
}

function filterTypeSuggestions() {
  const text = classSearch.typeID.trim().toLowerCase();
  const classID = Number(classSearch.classID.trim());
  typeSuggestions.value = frame.getTypeRecommendations(isNaN(classID) ? 0 : classID).filter(rec => {
    const value = (rec.value || "").toLowerCase();
    return !text || value.includes(text);
  });
}

function closeTypeSuggestions() {
  window.setTimeout(() => {
    typeSuggestionsOpen.value = false;
  }, 150);
}

function pickTypeSuggestion(value: string) {
  typeSuggestionsOpen.value = false;
  classSearch.typeID = value;
}

async function runClassSearch() {
  const classID = Number(classSearch.classID.trim());
  const typeID = Number(classSearch.typeID.trim());
  if (isNaN(classID)) {
    McmodderUtils.commonMsg("请输入一个合法的模组 ID ~", false);
    return;
  }
  if (isNaN(typeID)) {
    McmodderUtils.commonMsg("请输入一个合法的资料类型 ID ~", false);
    return;
  }
  searchBusy.value = true;
  frame.logger.key("任务已创建，请等待执行结束，期间请勿关闭当前标签页。");
  const startTime = Date.now();
  try {
    await frame.performClassSearch(classID, typeID || 1, {
      infer: classSearch.infer,
      geticon: classSearch.geticon,
      getall: classSearch.getall
    });
  } catch (e) {
    frame.logger.fatal(String(e));
    console.error(e);
  } finally {
    searchBusy.value = false;
    const endTime = Date.now();
    frame.logger.key(`任务已结束，耗时 ${ McmodderUtils.getFormattedTime(endTime - startTime) }。`);
  }
}

function showClassSearchPanel() {
  panelMode.value = "class";
}

function setSearchButtonBusy(busy: boolean) {
  searchBusy.value = busy;
}


const onlineFiles = ref<ItemJsonFrameApplication[]>([]);
const maxPage = ref(1);
const currentPage = ref(1);

const PAGE_RENDER_RANGE = 4;

const pageNumbers = computed(() => {
  const list: number[] = [];
  const l = Math.max(currentPage.value - PAGE_RENDER_RANGE, 1);
  const r = Math.min(currentPage.value + PAGE_RENDER_RANGE, maxPage.value);
  for (let i = l; i <= r; i++) list.push(i);
  return list;
});

function showOnlinePanel() {
  panelMode.value = "online";
  currentPage.value = 1;
  onlineFiles.value = [];
}

function setOnlineFiles(files: ItemJsonFrameApplication[], pageCount: number) {
  onlineFiles.value = files;
  maxPage.value = pageCount;
}

function gotoPage(page: number) {
  const target = Math.min(Math.max(page, 1), maxPage.value);
  if (target === currentPage.value) return;
  currentPage.value = target;
  frame.loadOnlineFiles(target);
}

function userName(file: ItemJsonFrameApplication) {
  return String(file.user).split(",")[1] || String(file.user);
}

function centerURL(file: ItemJsonFrameApplication) {
  return McmodderUtils.getCenterURL(Number(String(file.user).split(",")[0]));
}

function pidURL(pid: number) {
  return `https://bbs.mcmod.cn/forum.php?mod=redirect&goto=findpost&ptid=1281&pid=${ pid }`;
}

function omitText(info: string) {
  return info.length > 10 ? `${ info.slice(0, 10) }..` : info;
}

function downloadFile(file: ItemJsonFrameApplication) {
  frame.downloadAndImportFile(file.op);
}
</script>

<style scoped>
.mcmodder-jsonframe {
  font-size: 14px;
  color: var(--mcmodder-color-text);
  display: inline-block;
  width: 100%;
  border: 1px solid var(--mcmodder-color-accent-dark1);
  vertical-align: top;
}
.jsonframe-menu {
  padding: 3px;
  width: 100%;
  overflow: scroll;
  white-space: nowrap;
  position: sticky;
  top: 50px;
  z-index: 1;
  background-color: var(--mcmodder-color-background-transparent);
  backdrop-filter: blur(10px);
}
.jsonframe-menucontent > * {
  margin-right: .5em;
  vertical-align: middle;
}
.jsonframe-select {
  max-width: 250px;
  text-align: left;
}
.jsonframe-select option {
  background-color: var(--mcmodder-color-background);
  color: var(--mcmodder-color-text);
}
.jsonframe-file-input {
  display: none;
}
.btn {
  display: inline-block;
  padding: .3em .8em;
  border-radius: var(--mcmodder-width-radius);
  border: 1px solid var(--mcmodder-color-background-dark3);
  background: linear-gradient(45deg, var(--mcmodder-color-primary-light), var(--mcmodder-color-accent-light));
  color: var(--mcmodder-color-text);
  cursor: var(--mcmodder-cursor-hand);
  font-size: 13px;
  line-height: 1.5;
  text-decoration: none;
}
.btn-sm {
  padding: .2em .6em;
  font-size: 12.5px;
}
.btn-danger {
  background: linear-gradient(45deg, var(--mcmodder-color-danger-dark2), var(--mcmodder-color-danger));
  color: #fff;
}
.btn-dark {
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent));
  color: #fff;
}
.btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}
.jsonframe-content {
  min-height: 300px;
  background-color: var(--mcmodder-color-accent-transparent2);
  width: 100%;
  overflow: scroll;
}
.jsonframe-content :deep(.mcmodder-table-container) {
  position: relative;
  min-height: 150px;
  transition: height 1s ease 0s;
}
.jsonframe-content :deep(.jsonframe-table) {
  font-size: 14px;
}
.jsonframe-content :deep(.jsonframe-content) {
  background-color: transparent;
}
.jsonframe-panel-mask {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background-color: rgba(0, 0, 0, .45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2em;
}
.jsonframe-panel {
  width: min(720px, 100%);
  max-height: 85vh;
  overflow: auto;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: var(--mcmodder-width-radius);
  box-shadow: 0px 4px 16px var(--mcmodder-color-background-dark2);
  padding: 1em 1.2em;
}
.jsonframe-panel-wide {
  width: min(960px, 100%);
}
.jsonframe-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: .8em;
  font-size: 16px;
  font-weight: bold;
}
.jsonframe-panel-head .close {
  font-size: 22px;
  line-height: 1;
  color: var(--mcmodder-color-text-dark3);
  text-decoration: none;
  cursor: var(--mcmodder-cursor-hand);
}
.edit-autolink-frame {
  font-size: 13.5px;
}
.input-group.edit-autolink-seach {
  display: flex;
  gap: .5em;
  align-items: center;
  margin-bottom: .8em;
}
.input-group .form-control {
  flex: 1;
  min-width: 0;
  padding: .3em .6em;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: var(--mcmodder-width-radius);
  color: var(--mcmodder-color-text);
  font-size: 13.5px;
}
.input-group .btn {
  white-space: nowrap;
}
.edit-autolink-frame .title {
  font-weight: bold;
  margin: .5em 0 .3em;
}
.edit-autolink-style .checkbox {
  display: block;
  margin: .3em 0;
  line-height: 1.7;
}
.mcmodder-getitemlist-result {
  display: block;
  height: 0;
}
.checkbox {
  position: relative;
  display: inline-block;
  cursor: var(--mcmodder-cursor-hand);
}
.checkbox input[type="checkbox"] {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}
.checkbox label {
  display: inline-block;
  position: relative;
  padding-left: 1.6em;
  margin-bottom: 0;
  cursor: var(--mcmodder-cursor-hand);
}
.checkbox label::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1.15em;
  height: 1.15em;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: 3px;
}
.checkbox input[type="checkbox"]:checked + label::before {
  background-color: var(--mcmodder-color-primary);
  border-color: var(--mcmodder-color-primary-dark1);
}
.checkbox input[type="checkbox"]:checked + label::after {
  content: "\f00c";
  font-family: FontAwesome;
  position: absolute;
  left: .12em;
  top: 50%;
  transform: translateY(-50%);
  color: #fff;
  font-size: .85em;
}
.mcmodder-input-container {
  position: relative;
  flex: 1;
  min-width: 0;
}
.mcmodder-input-container .form-control {
  width: 100%;
}
.mcmodder-input-list {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  min-width: 100%;
  max-width: 480px;
  max-height: 300px;
  overflow: auto;
  background-color: var(--mcmodder-color-background);
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: var(--mcmodder-width-radius);
  box-shadow: 0px 2px 5px var(--mcmodder-color-background-dark2);
}
.mcmodder-input-list a {
  display: block;
  padding: .3em .6em;
  color: var(--mcmodder-color-text);
  text-decoration: none;
  white-space: nowrap;
}
.mcmodder-input-list a:hover {
  background-color: var(--mcmodder-color-primary-transparent1);
}
.mcmodder-input-list .empty {
  display: block;
  padding: .3em .6em;
  color: var(--mcmodder-color-text-dark3);
}
.mcmodder-logger {
  height: 300px;
  max-height: 300px;
  background-color: #313131;
  margin-top: .5em;
  padding: .5em;
  color: white;
  font-size: 12px;
  overflow: scroll;
  border-radius: var(--mcmodder-width-radius);
}
.mcmodder-logger p {
  margin: 0;
  line-height: 1.5em;
  font-family: var(--mcmodder-font-monospace);
}
.mcmodder-logger .warn {
  color: orange;
}
.mcmodder-logger .error {
  color: orangered;
}
.mcmodder-logger .fatal {
  color: red;
}
.mcmodder-logger .success {
  color: lime;
}
.mcmodder-logger .key {
  color: orchid;
}
.jsonframe-bbs-filelist .mcmodder-table {
  width: 100%;
  border-collapse: collapse;
}
.jsonframe-bbs-filelist .mcmodder-table th,
.jsonframe-bbs-filelist .mcmodder-table td {
  border: 1px solid var(--mcmodder-color-background-dark3);
  padding: .3em .6em;
  text-align: center;
  white-space: nowrap;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jsonframe-bbs-filelist .mcmodder-table tbody tr:nth-child(2n) {
  background-color: var(--mcmodder-color-background);
}
.jsonframe-bbs-filelist .mcmodder-table tbody tr:nth-child(2n+1) {
  background-color: var(--mcmodder-color-primary-background);
}
.jsonframe-bbs-filelist .mcmodder-table a {
  color: var(--mcmodder-color-accent-dark1);
}
.jsonframe-bbs-filelist .mcmodder-table .mcmodder-table-empty td {
  height: 80px;
  position: relative;
}
.jsonframe-bbs-filelist .mcmodder-table .mcmodder-table-empty td::before {
  content: "暂无数据";
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  line-height: 80px;
  color: var(--mcmodder-color-text-dark3);
  text-align: center;
}
.jsonframe-file-info span {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
.pagination {
  list-style: none;
  display: flex;
  gap: .3em;
  padding: 0;
  margin: .8em 0 0;
  flex-wrap: wrap;
}
.pagination .page-link {
  display: inline-block;
  padding: .2em .6em;
  border: 1px solid var(--mcmodder-color-background-dark3);
  border-radius: var(--mcmodder-width-radius);
  color: var(--mcmodder-color-text);
  text-decoration: none;
  cursor: var(--mcmodder-cursor-hand);
  font-size: 13px;
}
.pagination .page-item.active .page-link {
  background: linear-gradient(45deg, var(--mcmodder-color-primary), var(--mcmodder-color-accent));
  color: #fff;
  border-color: transparent;
}
</style>
