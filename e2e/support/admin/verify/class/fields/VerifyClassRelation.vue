<template>
  <template v-for="(entry, index) in relation" :key="index">
    <p>
      <b class="text-primary">{{ entry.title || "通用" }}</b>
    </p>
    <p v-for="(entry2, index2) in entry.list" :key="index2">
      [{{ Values.modRelationTypeMap[entry2.type] }}]
      <a :href="Utils.getClassURL(Number(entry2.id))" target="_blank"
        >ID:{{ entry2.id }} {{ fullName(entry2.id) }}</a
      >
    </p>
  </template>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../../src/Utils";
import { Values } from "../../../../../../src/Values";
import { McmodRepository } from "../../../../data/McmodRepository";
defineProps<{ relation: Required<McmodClassEditorInnerData>["relation"] }>();

function fullName(id: string) {
  const clazz = McmodRepository.getClass(Number(id));
  return Utils.getClassFullName(clazz.name, clazz.ename ?? "", clazz.sname ?? "");
}
</script>
