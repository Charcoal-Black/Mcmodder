<template>
  <VerifyTabVisualization
    v-if="fieldKey === 'visualization'"
    :tab="data"
    :original="original"
    :gui="gui"
    :role="role"
  />
  <template v-else-if="fieldKey === 'startver'">{{ data.startver }}</template>
  <template v-else-if="fieldKey === 'endver'">{{ data.endver }}</template>
  <template v-else-if="fieldKey === 'orderly'">
    <template v-if="Object.values(data.orderly ?? {})[0] === '1'">无序合成</template>
    <template v-else>有序合成</template>
  </template>
  <template v-else-if="fieldKey === 'others'"
    ><a v-for="modID in data.others" :key="modID" :href="Utils.getClassURL(Number(modID))">{{
      McmodRepository.getClass(Number(modID)).name
    }}</a></template
  >
  <template v-else-if="fieldKey === 'text'">{{ data.text }}</template>
  <VerifyTabRaw v-else-if="fieldKey === 'source'" :tab="data" :gui="gui"></VerifyTabRaw>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Values } from "../../../../../src/Values.ts";
import { McmodRepository } from "../../../data/McmodRepository.ts";
import VerifyTabRaw from "./fields/VerifyTabRaw.vue";
import VerifyTabVisualization from "./fields/VerifyTabVisualization.vue";
import { Utils } from "../../../../../src/Utils.ts";

const props = withDefaults(
  defineProps<{
    fieldKey: keyof typeof Values.tabEditVerifyTableFields;
    data: McmodTabEditorInnerData;
    original?: McmodTabEditorInnerData;
    role: "current" | "original";
  }>(),
  {
    original: undefined,
  },
);

const gui = computed(() => McmodRepository.getGUI(Number(props.data.gui ?? 1)));
</script>
