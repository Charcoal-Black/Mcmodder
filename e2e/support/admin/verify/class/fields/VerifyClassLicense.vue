<template>
  <template v-for="(entry, index) in license" :key="index">
    <p>
      <b class="text-primary">{{ entry.title || "通用" }}</b>
    </p>
    <p v-for="(entry2, index2) in entry.list" :key="index2">
      <b>{{ typeText(entry2.type) }}</b>
      声明许可协议为:
      <b>{{ Values.licenseName[entry2.name] }}</b>
      【{{ entry2.link }}】<template v-if="entry2.text"> ({{ entry2.text }})</template>
    </p>
  </template>
</template>

<script setup lang="ts">
import { Values } from "../../../../../../src/Values";

type Licenses = Required<McmodClassEditorInnerData>["license"];

defineProps<{ license: Licenses }>();

function typeText(types: ValueOf<ValueOf<Licenses>["list"]>["type"]) {
  if (Array.isArray(types)) {
    return types.map((type) => Values.licenseTypeMap[type]).join(" / ");
  }
  return types;
}
</script>
