<template>
  <JsonFrame
    ref="jsonFrame"
    :id="id"
    :parent="parent"
    :config-name="configName"
    :allowed-keys="allowedKeys"
    :head-configs="headConfigs"
    :edit-configs="editConfigs"
    :attr="{
      class: 'table jsonframe-table'
    }"
    @refresh="onRefresh"
  />
  <Collapsible>
    <template #header>绑定 GUI</template>
    <template #content>
      <GenericTable
        ref="guiBoundTable"
        :parent="parent"
        :head-configs="guiBoundHeadConfigs"
        :edit-configs="guiBoundEditConfigs"
        @edit="onEditGuiBound"
      />
    </template>
  </Collapsible>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { McmodderInputType } from '../../../config/ConfigUtils.ts';
import { McmodderMap } from '../../../map/Map.ts';
import { McmodderTable } from '../../../table/Table.ts';
import { EditConfigsInitializer, HeadConfigsInitializer, JsonFrameProps, McmodderItemData, McmodderJsonStorage, McmodderRecipeData, McmodderRecipeIngredient, RecipeJsonFrameGuiBound } from '../../../types';
import { ItemDisplay } from '../../../widget/ItemDisplay.ts';
import Collapsible from '../Collapsible.vue';
import GenericTable from '../table/GenericTable.vue';
import JsonFrame from './JsonFrame.vue';
import { McmodderValues } from '../../../Values.ts';

const props = defineProps<JsonFrameProps>();

const configName = "mcmodderRecipeJsonStorage";
const allowedKeys = ["in_id", "out_id", "in_num", "out_num", "in_chance", "out_chance", "power_num", "gui_id"];
const headConfigs = {
  gui_id: "GUI",
  input: ["输入", itemInputDisplay],
  output: ["输出", itemOutputDisplay],
  power_text: ["额外数据", McmodderTable.DISPLAYRULE_ARRAY]
} satisfies HeadConfigsInitializer<McmodderRecipeData>;
const editConfigs = {
  in_id: null,
  out_id: null,
  in_num: null,
  out_num: null,
  in_chance: null,
  out_chance: null,
  power_num: null,
  gui_id: McmodderInputType.TEXT
} satisfies EditConfigsInitializer<McmodderRecipeData>;

const jsonFrame = useTemplateRef("jsonFrame");
const guiBoundTable = useTemplateRef("guiBoundTable");

const guiBoundHeadConfigs = {
  guiID: ["GUI 注册名", McmodderTable.DISPLAYRULE_MONOSPACE],
  mcmodID: "对应百科 ID",
  img: ["GUI 图片", (_, data) => {
    return data.mcmodID ? `<img src="//i.mcmod.cn/gui/bg/${ data.mcmodID }.gif"><img>` : "-";
  }]
} satisfies HeadConfigsInitializer<RecipeJsonFrameGuiBound>;
const guiBoundEditConfigs = {
  guiID: null,
  mcmodID: McmodderInputType.NUMBER
} satisfies EditConfigsInitializer<RecipeJsonFrameGuiBound>;

const itemMap = new McmodderMap<McmodderItemData>("registerName");
const tagMap = new McmodderMap<McmodderItemData>("OredictList");
const guiMap = new McmodderMap<RecipeJsonFrameGuiBound>("guiID");
let guiBound: RecipeJsonFrameGuiBound[] | undefined;

const selection: McmodderJsonStorage<McmodderItemData> = props.parent.utils.getAllConfig("mcmodderJsonStorage", {});
Object.values(selection).forEach(content => {
  itemMap.add(content);
  tagMap.add(content);
});

onMounted(() => {
  updateBindFrame();
})

function itemListDisplay(
  ids?: Record<string, McmodderRecipeIngredient>,
  counts?: Record<string, number>,
  chances?: Record<string, number>
) {
  let res = "";
  if (ids) Object.keys(ids).forEach(id => {
    const count = counts && counts[id];
    const chance = chances && chances[id];
    const display = new ItemDisplay(itemMap, tagMap, ids[id], count, chance);
    res += display.getHTML();
  });
  return res;
}

function itemInputDisplay(_: any, row: Partial<McmodderRecipeData>) {
  return itemListDisplay(row.in_id, row.in_num, row.in_chance);
}

function itemOutputDisplay(_: any, row: Partial<McmodderRecipeData>) {
  return itemListDisplay(row.out_id, row.out_num, row.out_chance);
}

function onRefresh() {
  updateGuiBound();
}

function updateGuiBound() {
  guiMap.clear();
  guiBound = props.parent.utils.getAllConfig("guiBound") ?? McmodderValues.defaultGuiBound;
  guiMap.add(guiBound!);
}

function getCurrentGuiSet() {
  const set = new Set<string>();
  jsonFrame.value!.table!.getAllData().forEach(recipe => {
    if (recipe.gui_id) {
      set!.add(recipe.gui_id);
    }
  });
  guiBound?.forEach(bound => {
    set.add(bound.guiID);
  });
  return set;
}

function updateBindFrame() {
  const content: RecipeJsonFrameGuiBound[] = [];
  getCurrentGuiSet().forEach(id => {
    const bound = guiMap.get(id);
    content.push({
      guiID: id,
      mcmodID: bound?.[0]?.mcmodID ?? 0
    });
  });
  guiBoundTable.value!.setAllData(content);
}

function onEditGuiBound() {
  guiBoundTable.value!.saveAll();
  props.parent.utils.setAllConfig("guiBound", guiBoundTable.value!.getAllData().filter(bound => bound.mcmodID > 0));
}

</script>