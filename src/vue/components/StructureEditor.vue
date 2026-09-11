<template>
  <Teleport to="head">
    <link type="text/css" :href="McmodderValues.assets.mcmod.css.item" rel="stylesheet">
    <link type="text/css" :href="McmodderValues.assets.mcmod.css.structureBrowser" rel="stylesheet">
    <link type="text/css" :href="McmodderValues.assets.mcmod.css.bootstrapSelect" rel="stylesheet">
  </Teleport>
  <div id="structure-container" />
  <div>
    选取预设结构：
    <select :value="commentContainer" @change="onStructureSelectorChange">
      <option value="36016">[36016] 通用机械-聚变反应堆</option>
      <option value="36550">[36550] 沉浸工程-斗轮式挖掘机</option>
      <option value="161900">[161900] 自然灵气-灵气充能台</option>
      <option value="192950">[192950] 冰火传说-龙钢锻炉</option>
      <option value="202730">[202730] 魔法金属-高炉</option>
      <option value="775298">[775298] 格雷科技现代版-土高炉</option>
    </select>
  </div>
  <div>
    操作状态：
    <div class="radio">
      <input id="previewMode" name="mode" type="radio" checked="true">
      <label for="previewMode">预览模式</label>
    </div>
    <div class="radio">
      <input id="editMode" name="mode" type="radio">
      <label for="editMode">编辑模式</label>
    </div>
  </div>
  <div @change="onInputChange">
    方块列表：
    <GenericTable
      ref="blockListTable"
      :parent="parent"
      :attr="{ id: 'block-selector' }"
      :head-configs="blockListHeadConfigs"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { McmodderTable } from '../../table/Table.ts';
import { HeadConfigsInitializer, StructureEditorBlocktype } from '../../types';
import { McmodderUtils } from '../../Utils.ts';
import GenericTable from './table/GenericTable.vue';
import { McmodderValues } from '../../Values.ts';

interface Props {
  parent: Mcmodder
}

const { parent } = defineProps<Props>();

const commentContainer = ref();
let blocktype = -1;

const blockListTable = useTemplateRef("blockListTable");

const blockListHeadConfigs = {
  op: ["操作", (_, row) => {
    const id = row.id;
    if (id === undefined) {
      throw new Error("`id` is undefined");
    }
    return `
      <div class="radio">
        <input class="block-selector" id="block-selector-${ id }" name="blocktype" type="radio" ${ blocktype === id ? "checked" : "" }>
        <label for="block-selector-${ id }">选取</label>
      </div>`;
  }],
  blockName: "方块名称",
  class: "所属模组",
  textures: ["右-左-上-下-前-后", data => {
    let res = "";
    data.forEach((face: string) => res += `<img src="${ face }" width="24">`);
    return res;
  }],
  itemID: ["对应资料ID", McmodderTable.DISPLAYRULE_LINK_ITEM]
} as HeadConfigsInitializer<StructureEditorBlocktype>;

function onInputChange(e: Event) {
  const target = e.composedPath()[0];
  if (target instanceof HTMLInputElement && target.classList.contains("block-selector")) {
    blocktype = Number(target.id.slice(15));
  }
}

function onStructureSelectorChange(e: Event) {
  parent.utils.setConfig("structureSelected", (e.currentTarget as HTMLInputElement).value);
  location.reload();
}

async function loadScripts() {
  await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrap);
  await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrapSelect);
  await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.three);
  await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.threeOrbitControls);
  await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.threeTween);
  McmodderUtils.loadScript(document.head, 'import{EXGridHelper}from"/static/public/plug/three/three.ex-grid-helper.js";window.structure_enchanted_grid_helper=function(r,e,t,i,d){return new EXGridHelper(r,e,t,i,d)}', null, "module");
  McmodderUtils.loadScript(document.body, `comment_container = ${ parent.utils.getConfig("structureSelected") || "36016" };`);
  await McmodderUtils.loadScript(document.body, null, McmodderValues.assets.mcmod.js.structureBrowser);
  await McmodderUtils.loadScript(document.body, null, McmodderValues.assets.mcmod.js.item);
}

onMounted(async () => {
  await loadScripts();

  commentContainer.value = comment_container;

  structure_browser.blocktype_list = [];
  structure_browser.get_block_type = () => {
    structure_browser.blocktype_list = [];
    structure_browser.cube_list.forEach((e: any) => {
      let i = {
        item: e.data.name.item,
        mod: e.data.name.mod,
        // material: e.material,
        face: e.material.map((t: any) => t.map.image.src),
        id: e.data.id
      }
      for (let j of structure_browser.blocktype_list)
        if (JSON.stringify(i) === JSON.stringify(j)) return;
      structure_browser.blocktype_list.push(i);
    });
  }
  structure_browser.remove_block = (uuid: any) => {
    structure_browser.cube_list = structure_browser.cube_list.filter((e: any) => e.uuid != uuid);
    structure_browser.group.children = structure_browser.group.children.filter((e: any) => e.uuid != uuid);
    structure_browser.scene.remove(structure_browser.group);
    structure_browser.scene.add(structure_browser.group);
  }
  let defaultDocumentMouseUp = structure_browser.onDocumentMouseUp;
  structure_browser.onDocumentMouseUp = (e: any) => {
    if ($("#previewMode").prop("checked")) defaultDocumentMouseUp(e);
    else {
      if (e.button != 2 || blocktype < 0) return;
      const u = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
      if (u.length) {
        let n = u[0].face.normal, x = u[0].object.data.position[0] + n.x, z = u[0].object.data.position[1] + n.z, y = u[0].object.data.layer + n.y;
        const blockData = structure_browser.blocktype_list[blocktype];
        if (!blockData) {
          McmodderUtils.commonMsg("请先在下方表格选取目标方块种类~", false);
          return;
        }
        if (structure_browser.cube_list.filter((e: any) => (x === e.data.position[0] && y === e.data.layer && z === e.data.position[1])).length) return;
        structure_browser.set_block(
          y - 1, [x, z],
          [blockData.face[0].split("/texture/")[1].split("/")[0], blockData.face[0].split("/texture/")[1].split("/")[1], blockData.face[0].includes("/fill.")],
          [blockData.id, blockData.item, blockData.mod]
        );
      }
    }
  }
  const defaultDocumentClick = structure_browser.onDocumentClick;
  structure_browser.onDocumentClick = (e: any) => {
    if ($("#previewMode").prop("checked")) defaultDocumentClick(e);
    else {
      const u = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
      if (u.length) structure_browser.remove_block(u[0].object.uuid);
    }
  }

  await McmodderUtils.sleep(3e3);

  $("#structure-close").hide();
  structure_browser.get_block_type();
  (structure_browser.blocktype_list as any[]).forEach((blocktype, index) => {
    blockListTable.value!.appendData({
      id: index,
      op: null,
      blockName: blocktype.item,
      class: blocktype.mod,
      textures: blocktype.face,
      itemID: blocktype.id
    });
    // <div class="radio"><input id="previewMode" name="mode" type="radio" checked="1"><label for="previewMode">预览模式</label></div><div class="radio"><input id="editMode" name="mode" type="radio"><label for="editMode">编辑模式</label></div>
  });
  blockListTable.value!.refreshAll();
  /* structure_browser.cube_list.forEach(cube => {
    $("<tr>" + [
      cube.data.layer,
      cube.data.position[0],
      cube.data.position[1],
      cube.data.name.mod,
      cube.data.name.item,
      cube.material[0].map.image.src,
      cube.data.id
    ].reduce((a, b) => a + '<td>' + b + '</td>', "") + "</tr>").appendTo("#mcmodder-structure-data-menu tbody");
  });*/
})

defineExpose({
  blockListTable
})

</script>