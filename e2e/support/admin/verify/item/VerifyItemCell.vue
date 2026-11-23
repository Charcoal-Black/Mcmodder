<template>
  <template v-if="data[fieldKey] === undefined">-</template>
  <template v-else>
    <template
      v-if="
        fieldKey === 'name' ||
        fieldKey === 'ename' ||
        fieldKey === 'type' ||
        fieldKey === 'regname' ||
        fieldKey === 'metadata' ||
        fieldKey === 'damage' ||
        fieldKey === 'maxstack'
      "
      >{{ data[fieldKey] }}</template
    >
    <template v-else-if="fieldKey === 'oredict'">{{
      (data[fieldKey] as string).split(",").join(" / ")
    }}</template>
    <template
      v-else-if="
        fieldKey === 'icon-32x-lock' ||
        fieldKey === 'icon-32x-delete' ||
        fieldKey === 'icon-128x-lock' ||
        fieldKey === 'icon-128x-delete' ||
        fieldKey === 'cover-delete'
      "
      >{{ (data[fieldKey] as { 0: string })[0] === "1" ? "是" : "否" }}</template
    >
    <template v-else-if="fieldKey === 'category'">{{
      Values.itemTypeIDMap[Number(data[fieldKey]![0]) as keyof typeof Values.itemTypeIDMap]?.text ??
      "Unknown"
    }}</template>
    <template
      v-else-if="
        fieldKey === 'cover-data' || fieldKey === 'icon-32x-data' || fieldKey === 'icon-128x-data'
      "
    >
      <img
        :src="data[fieldKey] as string"
        onerror="
          javascript: this.src = '//i.mcmod.cn/item/icon/32x32/0.png';
          this.onerror = null;
        "
      />
    </template>
    <template
      v-for="(tool, _, index) in data[fieldKey]"
      v-else-if="fieldKey === 'tool'"
      :key="index"
    >
      <template v-if="index === 0"> / </template>
      <a :href="Utils.getItemURL(Number(tool))" target="_blank">Unknown</a>
    </template>
    <VerifyItemContent v-else-if="fieldKey === 'content'" :content="data[fieldKey]!" />
  </template>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../src/Utils.ts";
import { Values } from "../../../../../src/Values.ts";
import VerifyItemContent from "./fields/VerifyItemContent.vue";

defineProps<{
  fieldKey: keyof typeof Values.itemEditVerifyTableFields;
  data: McmodItemEditorInnerData;
}>();
</script>
