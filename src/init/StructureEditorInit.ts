import { StructureEditorBlocktype } from "../types";
import { McmodderTable } from "../table/Table";
import { McmodderUtils } from "../Utils";
import { McmodderInit } from "./Init";
import { McmodderValues } from "../Values";

export class StructureEditorInit extends McmodderInit {
  canRun() {
    return this.parent.href === "https://www.mcmod.cn/mcmodder/structureeditor/" && 
      this.parent.utils.getConfig("enableStructureEditor");
  }

  async loadScripts() {
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrap);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.bootstrapSelect);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.three);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.threeOrbitControls);
    await McmodderUtils.loadScript(document.head, null, McmodderValues.assets.mcmod.js.threeTween);
    McmodderUtils.loadScript(document.head, 'import{EXGridHelper}from"/static/public/plug/three/three.ex-grid-helper.js";window.structure_enchanted_grid_helper=function(r,e,t,i,d){return new EXGridHelper(r,e,t,i,d)}', null, "module");
    McmodderUtils.loadScript(document.body, `comment_container = ${ this.parent.utils.getConfig("structureSelected") || "36016" };`);
    await McmodderUtils.loadScript(document.body, null, McmodderValues.assets.mcmod.js.structureBrowser);
    await McmodderUtils.loadScript(document.body, null, McmodderValues.assets.mcmod.js.item);
  }

  async run() {
    const pageName = "结构编辑器";
    this.parent.title = pageName;
    $("title, .common-nav .item").html(pageName);
    $(".search-frame, .eat-frame").remove();

    $(".info-frame").html('<div class="common-text" />');
    $(`
      <link type="text/css" href="${ McmodderValues.assets.mcmod.css.item }" rel="stylesheet">
      <link type="text/css" href="${ McmodderValues.assets.mcmod.css.structureBrowser }" rel="stylesheet">
      <link type="text/css" href="${ McmodderValues.assets.mcmod.css.bootstrapSelect }" rel="stylesheet">
    `).appendTo("head");

    await this.loadScripts();

    $(`<div>选取预设结构：
      <select id="mcmodder-structure-selector">
        <option value="36016">[36016] 通用机械-聚变反应堆</option>
        <option value="36550">[36550] 沉浸工程-斗轮式挖掘机</option>
        <option value="161900">[161900] 自然灵气-灵气充能台</option>
        <option value="192950">[192950] 冰火传说-龙钢锻炉</option>
        <option value="202730">[202730] 魔法金属-高炉</option>
        <option value="775298">[775298] 格雷科技现代版-土高炉</option>
      </select>
    </div>`).appendTo(".info-frame");
    $("#mcmodder-structure-selector").val(comment_container).change(e => {
      this.parent.utils.setConfig("structureSelected", (e.currentTarget as HTMLInputElement).value);
      location.reload();
    }).selectpicker("render");

    $(`<div>操作状态：
      <div class="radio">
        <input id="previewMode" name="mode" type="radio" checked="1">
        <label for="previewMode">预览模式</label>
      </div>
      <div class="radio">
        <input id="editMode" name="mode" type="radio">
        <label for="editMode">编辑模式</label>
      </div>
    </div>`).appendTo(".info-frame");

    /* window.blockMap = [
      {
        id: 546234,
        name: "聚变堆框架",
        ename: "Fusion Reactor Frame",
        mod: "通用机械",
        modpath: "mekanism",
        blockpath: "reactor_frame"
      }
    ]; */
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
        if (e.button != 2 || $("item[name=blocktype]:checked()").length) return;
        const u = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
        if (u.length) {
          let n = u[0].face.normal, x = u[0].object.data.position[0] + n.x, z = u[0].object.data.position[1] + n.z, y = u[0].object.data.layer + n.y;
          const blockData = structure_browser.blocktype_list[$("input[name=blocktype]:checked()").parents("tr").attr("data-index")];
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

    /* $('<table id="mcmodder-structure-data-menu"><thead><th>Y</th><th>X</th><th>Z</th><th>所属模组</th><th>方块名称</th><th>纹理资源路径</th><th>对应资料ID</th></thead><tbody></tbody></table>').appendTo(".info-frame"); */

    let blockList = $(`<div>方块列表：</div>`).appendTo(".info-frame");
    let blockListTable = new McmodderTable<StructureEditorBlocktype>(this.parent, {id: "block-selector"}, {
      op: ["操作", (_, __) => {
        const id = McmodderUtils.randStr(8);
        return `
          <div class="radio">
            <input id="block-selector-${ id }" name="blocktype" type="radio">
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
    });
    blockListTable.$instance.appendTo(blockList);
    blockListTable.showLoading();

    await McmodderUtils.sleep(3e3);

    $("#structure-close").hide();
    structure_browser.get_block_type();
    structure_browser.blocktype_list.forEach((blocktype: any) => {
      blockListTable.appendData({
        op: null,
        blockName: blocktype.item,
        class: blocktype.mod,
        textures: blocktype.face,
        itemID: blocktype.id
      });
      // <div class="radio"><input id="previewMode" name="mode" type="radio" checked="1"><label for="previewMode">预览模式</label></div><div class="radio"><input id="editMode" name="mode" type="radio"><label for="editMode">编辑模式</label></div>
    });
    blockListTable.refreshAll();
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
  }
}