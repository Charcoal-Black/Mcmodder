<template>
  <template v-if="Utils.isEmpty(data[fieldKey])">-</template>
  <template v-else-if="fieldKey === 'name'">{{ data.name }}</template>
  <template v-else-if="fieldKey === 'mcversion'">{{ data.mcversion }}</template>
  <template v-else-if="fieldKey === 'updatetime'">{{
    Utils.getFormattedDate(Date.parse(data.updatetime!))
  }}</template>
  <VerifyVersionContent
    v-else-if="fieldKey === 'content'"
    :content="data.content!"
  ></VerifyVersionContent>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../src/Utils.ts";
import { Values } from "../../../../../src/Values.ts";
import VerifyVersionContent from "./fields/VerifyVersionContent.vue";

defineProps<{
  fieldKey: keyof typeof Values.versionEditVerifyTableFields;
  data: McmodVersionEditorInnerData;
}>();
</script>
