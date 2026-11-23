<template>
  <template v-if="Utils.isEmpty(data[fieldKey])">-</template>
  <template v-else-if="fieldKey === 'name'">{{ data.name }}</template>
  <VerifyPostRelation
    v-else-if="fieldKey === 'relation'"
    :relation="data.relation"
  ></VerifyPostRelation>
  <template v-else-if="fieldKey === 'owned'">{{
    Object.values(data.owned)[0] === "1" ? "个人教程" : "社区教程"
  }}</template>
  <template v-else-if="fieldKey === 'copyright'">{{
    Values.postCopyrightIDMap[Object.values(data.copyright!)[0]]
  }}</template>
  <VerifyPostContent
    v-else-if="fieldKey === 'content'"
    :content="data.content!"
  ></VerifyPostContent>
  <VerifyPostCover
    v-else-if="fieldKey === 'cover-data'"
    :cover-data="data['cover-data']!"
  ></VerifyPostCover>
  <template v-else-if="fieldKey === 'cover-delete'">{{
    data[fieldKey]![0] === "1" ? "是" : "否"
  }}</template>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../src/Utils.ts";
import { Values } from "../../../../../src/Values.ts";
import VerifyPostContent from "./field/VerifyPostContent.vue";
import VerifyPostCover from "./field/VerifyPostCover.vue";
import VerifyPostRelation from "./field/VerifyPostRelation.vue";

defineProps<{
  fieldKey: keyof typeof Values.postEditVerifyTableFields;
  data: McmodPostEditorInnerData;
}>();
</script>
