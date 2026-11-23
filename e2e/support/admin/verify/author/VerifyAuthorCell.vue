<template>
  <template v-if="fieldKey !== 'avatar' && Utils.isEmpty(data[fieldKey])">-</template>
  <template v-if="fieldKey === 'team'">{{
    Object.values(data.team!)[0] === "1" ? "是" : "否"
  }}</template>
  <VerifyAuthorMember v-else-if="fieldKey === 'member'" :member="data[fieldKey]!" />
  <VerifyAuthorLink v-else-if="fieldKey === 'link'" :link="data[fieldKey]!" />
  <template v-else-if="fieldKey === 'name'"
    ><b>{{ data.name }}</b> - {{ Object.values(data.name.list).join(",") }}</template
  >
  <VerifyAuthorContent
    v-else-if="fieldKey === 'content'"
    :content="data.content!"
  ></VerifyAuthorContent>
  <VerifyAuthorCover v-else-if="fieldKey === 'avatar'" :cover="data" />
</template>

<script setup lang="ts">
import { Utils } from "../../../../../src/Utils.ts";
import { Values } from "../../../../../src/Values.ts";
import VerifyAuthorContent from "./fields/VerifyAuthorContent.vue";
import VerifyAuthorCover from "./fields/VerifyAuthorCover.vue";
import VerifyAuthorLink from "./fields/VerifyAuthorLink.vue";
import VerifyAuthorMember from "./fields/VerifyAuthorMember.vue";

defineProps<{
  fieldKey: keyof typeof Values.authorEditVerifyTableFields;
  data: McmodAuthorEditorInnerData;
}>();
</script>
