<template>
  <div ref="root" class="mcmodder-jsonframe">
    <div class="jsonframe-menu">
      <div ref="menuContent" class="jsonframe-menucontent" :class="{
        'jsonframe-fixedmenu': isFixedMenuVisible
      }" :style="{
        width: cssMenuWidth,
        top: cssMenuTopOffset
      }">
        <select class="jsonframe-select" v-model="activeFileName">
          <option value="">选择一个JSON文件</option>
          <option v-for="filename in selectionList" :value="filename">{{ filename }}</option>
        </select>
        <template v-for="tool in tools">
          <label
            v-if="tool.labelAttr"
            v-show="tool.displayCondition"
            :for="`jsonframe_${ id }-${ tool.id }`"
            class="btn btn-sm"
            :class="{ 'btn-danger': tool.dangerMode }"
          >
            {{ tool.text }}
            <input
              v-show="false"
              :id="`jsonframe_${ id }-${ tool.id }`"
              type="file"
              accept="application/json"
              @change="tool.onClick"
            >
          </label>
          <button
            v-else
            v-show="tool.displayCondition.value"
            :id="`jsonframe_${ id }-${ tool.id }`"
            class="btn btn-sm"
            :class="{ 'btn-danger': tool.dangerMode }"
            @click="tool.onClick"
          >
            {{ tool.text }}
          </button>
        </template>
      </div>
    </div>
    <div class="jsonframe-content">
      <GenericTable
        ref="table"
        :parent="parent"
        :attr="attr"
        :head-configs="headConfigs"
        :edit-configs="editConfigs"
        @edit="onEdit"
        @refresh="onRefresh"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends McmodderTableAcceptable">
import { computed, onMounted, ref, shallowRef, triggerRef, useTemplateRef, watch } from 'vue';
import { GenericJsonFrameProps, JsonFrameToolData, JsonFrameToolDisplayCondition, JsonFrameToolOnClickCallback, McmodderTableAcceptable } from '../../../types';
import { McmodderUtils } from '../../../Utils';
import { McmodderPermission } from '../../../config/ConfigUtils';
import { IndexedDBRepository } from '../../../jsonframe/repository/IndexedDBRepository';
import { GMStorageRepository } from '../../../jsonframe/repository/GMStorageRepository';
import { ItemRepository } from '../../../jsonframe/repository/ItemRepository';
import { McmodderValues } from '../../../Values';
import GenericTable from '../table/GenericTable.vue';

const props = defineProps<GenericJsonFrameProps<T>>();

const root = useTemplateRef("root");
const table = useTemplateRef("table");

const tools = shallowRef<JsonFrameToolData[]>([]);
const activeFileName = ref("");
const isFixedMenuVisible = ref(false);
const hasRearranged = ref(false);
const selectionList = ref<string[]>([]);
const itemRepository: ItemRepository<T> =
  props.parent.utils.getConfig("itemRepository") ?
  new IndexedDBRepository(props.configName, props.allowedKeys) :
  new GMStorageRepository(props.parent, props.configName);
const cssMenuWidth = ref("100%");
const cssMenuTopOffset = ref("50px");

onMounted(() => {
  addTool("importLocal", "从本地导入JSON", () => true, e => {
    const fileList = (e.target as HTMLInputElement)?.files;
    if (!fileList) return;
    const file = fileList[0];
    importFromFile(file);
  }, false, {
    type: "file",
    accept: "application/json"
  });
  addTool("new", "新建文件", () => true, () => newUnnamedJson());
  addTool("saveedit", "保存修改", () => !!activeFileName.value || hasRearranged.value, () => saveEdit());
  addTool("rename", "重命名", () => !!activeFileName.value && !(table.value!.unsaved), () => rename());
  addTool("deleteall", "删除当前文件", () => !!activeFileName.value, async () => {
    if (await tryDeleteJson(activeFileName.value)) reset();
  });
  addTool("more", "更多...", () => typeof props.opts?.more === "function", () => props.opts!.more!());

  window.addEventListener("scroll", McmodderUtils.animationThrottle(() => {
    const frameRect = root.value!.getBoundingClientRect();
    const isFrameVisible = 
      frameRect.top < McmodderValues.headerContainerHeight &&
      frameRect.bottom >= McmodderValues.headerContainerHeight;
    
    if (isFrameVisible && !isFixedMenuVisible.value) {
      isFixedMenuVisible.value = true;
    }
    else if (!isFrameVisible && isFixedMenuVisible.value) {
      updateFixedMenu();
      isFixedMenuVisible.value = false;
    }
  }));
  window.addEventListener("resize", McmodderUtils.animationThrottle(() => {
    updateFixedMenu();
  }));

  itemRepository.init().then(() => updateSelection());
})

function addTool(
  id: string,
  text: string,
  displayCondition: JsonFrameToolDisplayCondition,
  onClick: JsonFrameToolOnClickCallback,
  dangerMode = false,
  labelAttr?: object
) {
  tools.value.push({
    id,
    text,
    displayCondition: computed(displayCondition),
    onClick,
    dangerMode,
    labelAttr
  });
  triggerRef(tools);
}

function purifyData(data: T) {
  const allowedKeys = props.allowedKeys;
  const entries = Object.entries(data);
  const filteredEntries = entries.filter(([key]) => allowedKeys.includes(key));
  return Object.fromEntries(filteredEntries) as T;
}

function parseText(text: string) {
  let success = 0, fail = 0, save: T[] | undefined;
  try {
    save = JSON.parse(text);
    success = 1;
  } catch (err) {
    onCaughtParseException(err);
    fail = 1;
  }
  return {
    success: success,
    fail: fail,
    result: save
  };
}

function onCaughtParseException(err: unknown) {
  console.error("Error phasing raw JSON data: " + err);
  McmodderUtils.commonMsg(String(err), false, "解析错误");
}

function getUniqueRegulatedFileName(name: string) {
  let regulated = McmodderUtils.regulateFileName(name);
  if (selectionList.value.includes(regulated)) {
    let i = 2, dot = regulated.lastIndexOf("."), main = regulated.slice(0, dot), extension = regulated.slice(dot + 1);
    let newName;
    while ((newName = `${ main }(${ i }).${ extension }`) && selectionList.value.includes(newName)) i++;
    regulated = newName!;
  }
  return regulated;
}

async function importFromText(text: string, saveAs: string) {
  saveAs = getUniqueRegulatedFileName(saveAs);
  const { success, fail, result } = props.opts?.parseText?.(text) ?? parseText(text);
  if (success) {
    const purified = result!.map(e => purifyData(e));
    await itemRepository.write(saveAs, purified);
    await updateSelection();
    McmodderUtils.commonMsg(`已读取并保存为 ${ saveAs }，其中 ${ success } 条解析成功，${ fail } 条解析失败。`);
  }
}

function importFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = o => {
    const result = o.target?.result;
    if (typeof result === "string") {
      importFromText(result, file.name);
    }
  };
  reader.readAsText(file);
}

function isAvailableFileName(fileName: string) {
  return !!(fileName && selectionList.value.includes(fileName));
}

watch(
  () => activeFileName.value,
  () => {
    if (activeFileName.value) {
      loadJson(activeFileName.value);
    } else {
      reset();
    }
  }
)

function updateFixedMenu() {
  cssMenuWidth.value = root.value!.getBoundingClientRect().width + "px";
  cssMenuTopOffset.value = McmodderValues.headerContainerHeight + "px";
}

async function updateSelection() {
  const selection = await itemRepository.listFilename();
  selectionList.value = selection.filter(e => e);
}

function fileExistedInquire(fileName: string) {
  return swal.fire({
    type: "warning",
    title: "文件名重复",
    text: `在脚本内部存储中已存在拥有该文件名 (${ fileName }) 的文件，继续导入将会覆盖此文件，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "覆盖",
    cancelButtonText: "取消",
  });
}

async function newJson(fileName: string, content: T[]) {
  let storages = await itemRepository.listFilename();
  if (storages.includes(fileName)) return new Promise(resolve => {
    fileExistedInquire(fileName)
    .then(isConfirm => {
      if (isConfirm.value) {
        itemRepository
        .write(fileName, content)
        .then(() => resolve(true));
      }
      else resolve(false);
    });
  });
  else {
    await itemRepository.write(fileName, content);
    return true;
  }
}

async function loadJson(fileName: string) {
  table.value!.setAllData(await itemRepository.read(fileName) ?? []);
  hasRearranged.value = false;
}

async function newUnnamedJson() {
  const regulated = getUniqueRegulatedFileName("Unnamed.json");
  await itemRepository.createFile(regulated);
  await updateSelection();
  McmodderUtils.commonMsg(`创建了新的文件 ${ regulated } ~`);
}

async function saveEdit() {
  if (!(table.value!.unsaved)) {
    McmodderUtils.commonMsg("当前暂无需要保存的改动...", false);
    return;
  }
  table.value!.saveAll();
  await itemRepository.write(activeFileName.value, table.value!.getAllData());
  McmodderUtils.commonMsg("所有改动均已保存~");
}

async function rename() {
  const name = activeFileName.value;
  if (!name) return;
  swal.fire({
    title: "重命名当前文件",
    html: `将当前已打开的文件重命名为... <input class="form-control" id="jsonframe-rename-input">`,
    showCancelButton: true,
    preConfirm: async () => {
      const newName = getUniqueRegulatedFileName(input.val().trim());
      if (name === newName) return;
      
      const fileData = await itemRepository.read(name);
      await itemRepository.deleteFile(name);
      await itemRepository.write(newName, fileData);

      let database: string[] = props.parent.utils.getConfig("jsonDatabase") || [];
      database = database.filter(e => e != name);
      database.push(newName);
      props.parent.utils.setConfig("jsonDatabase", database);

      McmodderUtils.commonMsg("文件重命名成功~");
      activeFileName.value = newName;
      updateSelection();
    }
  });
  const input = $("#jsonframe-rename-input").val(name).change(e => {
    const target = e.currentTarget as HTMLInputElement;
    let newName = target.value.trim();
    target.value = McmodderUtils.regulateFileName(newName);
  });
  /*.keydown(e => {
    if (e.keyCode === 13) Swal.clickConfirm();
  }*/
}

function submitEdit() {
  if (!props.parent.currentUID) {
    McmodderUtils.commonMsg("请先登录~", false);
    return;
  }
  const lv: number = props.parent.utils.getProfile("lv");
  const permission: McmodderPermission = props.parent.utils.getProfile("permission");
  if (lv < 5 && !(permission === McmodderPermission.EDITOR || permission >= McmodderPermission.ADMIN)) {
    McmodderUtils.commonMsg("当前提交编辑需要验证码，暂无法使用此功能~（免验证码条件：用户主站等级≥Lv.5 或 已是任意模组编辑员或拥有更高权限）", false);
    return;
  }
  McmodderUtils.commonMsg("此功能尚未完工，敬请期待~");
}

function fileDeleteInquire(fileName: string): Promise<SweetAlertCallbackState> {
  return new Promise(resolve => swal.fire({
    type: "warning",
    title: "警告",
    text: `您正在尝试删除 (${fileName})，此操作不可逆，确定要继续吗？`,
    showCancelButton: true,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonColor: "var(--mcmodder-color-danger)"
  }).then(isConfirm => resolve(isConfirm)));
}

async function tryDeleteJson(fileName: string) {
  if (!isAvailableFileName(fileName)) return new Promise(resolve => resolve(false));
  const { value: isConfirm } = await fileDeleteInquire(fileName);
  if (isConfirm) {
    await deleteJson(fileName);
    McmodderUtils.commonMsg(`成功删除 ${fileName} ~`);
    updateSelection();
    return true;
  }
  else return false;
}

async function deleteJson(fileName: string) {
  await itemRepository.deleteFile(activeFileName.value);
  let linking: string[] = props.parent.utils.getConfig("jsonDatabase") || [];
  props.parent.utils.setConfig("jsonDatabase", linking.filter(name => name != fileName));
}

function reset() {
  activeFileName.value = "";
  table.value!.empty();
}

function onStopRearrage() {
  hasRearranged.value = true;
}

function onEdit() {
  emit("edit");
}

function onRefresh() {
  emit("refresh");
}

const emit = defineEmits<{
  edit: [],
  refresh: []
}>();

defineExpose({
  table,
  activeFileName,
  isAvailableFileName,
  importFromText,
  updateSelection,
  addTool,
  submitEdit,
  onCaughtParseException,

  // 暂时没有用
  newJson,
  onStopRearrage
})

</script>