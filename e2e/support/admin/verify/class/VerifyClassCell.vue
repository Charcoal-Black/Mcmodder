<template>
  <template v-if="isEmptyField(fieldKey)">-</template>
  <template v-else>
    <template
      v-if="
        fieldKey === 'name' ||
        fieldKey === 'ename' ||
        fieldKey === 'sname' ||
        fieldKey === 'intro' ||
        fieldKey === 'modid'
      "
      >{{ data[fieldKey] }}</template
    >
    <template
      v-else-if="
        fieldKey === 'tag' ||
        fieldKey === 'keys' ||
        fieldKey === 'cfprojectid' ||
        fieldKey === 'mrprojectid'
      "
      >{{ data[fieldKey]!.split(",").join(" / ") }}</template
    >
    <template v-else-if="fieldKey === 'activity'">
      <i class="text-danger">{{ Object.values(data[fieldKey]!).join(",") }}</i>
    </template>
    <template v-else-if="fieldKey === 'cover-delete'">{{
      data[fieldKey]![0] === "1" ? "是" : "否"
    }}</template>
    <VerifyClassContent v-else-if="fieldKey === 'content'" :content="data.content!" />
    <VerifyClassLink v-else-if="fieldKey === 'link'" :link="data.link!" />
    <VerifyClassCategory v-else-if="fieldKey === 'category'" :category="data.category!" />
    <VerifyClassAuthor v-else-if="fieldKey === 'author'" :author="data.author!" />
    <VerifyClassMode
      v-else-if="fieldKey === 'mode'"
      :mode="{ 'mode-1': data['mode-1']!, 'mode-2': data['mode-2']! }"
    />
    <VerifyClassMCVersion v-else-if="fieldKey === 'mcversion'" :mcversion="data.mcversion!" />
    <VerifyClassCover v-else-if="fieldKey === 'cover-data'" :cover-data="data['cover-data']!" />
    <VerifyClassPlatform v-else-if="fieldKey === 'platform'" :platform="data.platform!" />
    <VerifyClassApi v-else-if="fieldKey === 'api'" :api="data.api!" />
    <VerifyClassRelation v-else-if="fieldKey === 'relation'" :relation="data.relation!" />
    <VerifyClassStatus v-else-if="fieldKey === 'status'" :status="data.status!" />
    <VerifyClassSource v-else-if="fieldKey === 'source'" :source="data.source!" />
    <VerifyClassLicense v-else-if="fieldKey === 'license'" :license="data.license!" />
  </template>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../src/Utils.ts";
import type { Values } from "../../../../../src/Values.ts";
import VerifyClassApi from "./fields/VerifyClassApi.vue";
import VerifyClassAuthor from "./fields/VerifyClassAuthor.vue";
import VerifyClassCategory from "./fields/VerifyClassCategory.vue";
import VerifyClassContent from "./fields/VerifyClassContent.vue";
import VerifyClassCover from "./fields/VerifyClassCover.vue";
import VerifyClassLicense from "./fields/VerifyClassLicense.vue";
import VerifyClassLink from "./fields/VerifyClassLink.vue";
import VerifyClassMCVersion from "./fields/VerifyClassMCVersion.vue";
import VerifyClassMode from "./fields/VerifyClassMode.vue";
import VerifyClassPlatform from "./fields/VerifyClassPlatform.vue";
import VerifyClassRelation from "./fields/VerifyClassRelation.vue";
import VerifyClassSource from "./fields/VerifyClassSource.vue";
import VerifyClassStatus from "./fields/VerifyClassStatus.vue";

const props = defineProps<{
  fieldKey: keyof typeof Values.classEditVerifyTableFields;
  data: McmodClassEditorInnerData;
}>();

/**
 * 字段是否需要显示「-」。
 *
 * `mode` 只是把 `mode-1` / `mode-2` 并成一行显示，站点数据里并没有这个键，
 * 不能按「取不到值」处理，否则运行环境那一行会永远渲染成「-」；
 * 其余字段只要取不到值（缺键或值为 `undefined`）就显示「-」。
 */
function isEmptyField(fieldKey: keyof typeof Values.classEditVerifyTableFields): boolean {
  if (fieldKey === "mode") return false;
  const data = (props.data as Partial<Record<string, unknown>>)[fieldKey];
  return Utils.isEmpty(data);
}
</script>
