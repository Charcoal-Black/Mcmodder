<template>
  <JsonFrame
    ref="jsonFrame"
    :id="id"
    :parent="parent"
    :config-name="configName"
    :allowed-keys="allowedKeys"
    :rowOptions="rowOptions"
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
        :rowOptions="guiBoundRowOptions"
        :edit-configs="guiBoundEditConfigs"
        @edit="onEditGuiBound"
      />
    </template>
  </Collapsible>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { InputType } from '../../../config/ConfigUtils.ts';
import { FieldIndex } from '../../../fieldindex/FieldIndex.ts';
import { TableUtils } from '../../../table/Table.ts';
import { ItemDisplay } from '../../../widget/ItemDisplay.ts';
import Collapsible from '../Collapsible.vue';
import GenericTable from '../table/GenericTable.vue';
import JsonFrame from './JsonFrame.vue';
import { Values } from '../../../Values.ts';
import type { JsonFrameProps } from '../../../types/props';

const props = defineProps<JsonFrameProps>();

const configName = "mcmodderRecipeJsonStorage";
const allowedKeys = ["in_id", "out_id", "in_num", "out_num", "in_chance", "out_chance", "power_num", "gui_id"];
const rowOptions = {
  gui_id: "GUI",
  input: ["输入", itemInputDisplay],
  output: ["输出", itemOutputDisplay],
  power_text: ["额外数据", TableUtils.DISPLAYRULE_ARRAY]
} satisfies RowOptionsInitializer<Recipe>;
const editConfigs = {
  in_id: null,
  out_id: null,
  in_num: null,
  out_num: null,
  in_chance: null,
  out_chance: null,
  power_num: null,
  gui_id: InputType.TEXT
} satisfies EditOptionsInitializer<Recipe>;

const jsonFrame = useTemplateRef("jsonFrame");
const guiBoundTable = useTemplateRef("guiBoundTable");

const guiBoundRowOptions = {
  guiID: ["GUI 注册名", TableUtils.DISPLAYRULE_MONOSPACE],
  mcmodID: "对应百科 ID",
  img: ["GUI 图片", (_, data) => {
    return data.mcmodID ? `<img src="//i.mcmod.cn/gui/bg/${ data.mcmodID }.gif"><img>` : "-";
  }]
} satisfies RowOptionsInitializer<RecipeJsonFrameGuiBound>;
const guiBoundEditConfigs = {
  guiID: null,
  mcmodID: InputType.NUMBER
} satisfies EditOptionsInitializer<RecipeJsonFrameGuiBound>;

const itemMap = new FieldIndex<Item>("registerName");
const tagMap = new FieldIndex<Item>("OredictList");
const guiMap = new FieldIndex<RecipeJsonFrameGuiBound>("guiID");
let guiBound: RecipeJsonFrameGuiBound[] | undefined;

const selection: JsonStorage<Item> = props.parent.configRepository.getAll("mcmodderJsonStorage") ?? {};
Object.values(selection).forEach(content => {
  itemMap.add(content);
  tagMap.add(content);
});

onMounted(() => {
  updateBindFrame();
})

function itemListDisplay(
  ids?: Record<string, RecipeIngredient>,
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

function itemInputDisplay(_: any, row: Partial<Recipe>) {
  return itemListDisplay(row.in_id, row.in_num, row.in_chance);
}

function itemOutputDisplay(_: any, row: Partial<Recipe>) {
  return itemListDisplay(row.out_id, row.out_num, row.out_chance);
}

function onRefresh() {
  updateGuiBound();
}

function updateGuiBound() {
  guiMap.clear();
  guiBound = props.parent.configRepository.getAll("guiBound") ?? Values.defaultGuiBound;
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
  props.parent.configRepository.setAll("guiBound", guiBoundTable.value!.getAllData().filter(bound => bound.mcmodID > 0));
}

</script>