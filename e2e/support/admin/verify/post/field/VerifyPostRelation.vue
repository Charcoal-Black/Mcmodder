<template>
  <p class="text-danger">
    <a class="text-danger" :href="href(main)" target="_blank">{{ fullName(main) }}</a
    >&nbsp;[主要] ({{ relation.main.remark }})
  </p>
  <p v-for="entry in subRelations" :key="`${entry.type}-${entry.id}`">
    <a :href="href(entry)" target="_blank">{{ fullName(entry) }}</a> ({{ entry.remark }})
  </p>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { Utils } from "../../../../../../src/Utils";
import { McmodRepository } from "../../../../data/McmodRepository";

const { relation } = defineProps<{ relation: Required<McmodPostEditorInnerData>["relation"] }>();

const main = computed(() => relation.main);
const subRelations = computed(() =>
  Object.values(relation.list).filter(
    (entry) => entry.id !== relation.main.id || entry.type !== relation.main.type,
  ),
);

function href(entry: (typeof relation)["main"] & ValueOf<(typeof relation)["list"]>) {
  return entry.type === "mod"
    ? Utils.getClassURL(Number(entry.id))
    : Utils.getModpackURL(Number(entry.id));
}

function fullName(entry: (typeof relation)["main"] & ValueOf<(typeof relation)["list"]>) {
  const id = Number(entry.id);
  if (entry.type === "mod") {
    const { name, ename, sname } = McmodRepository.getClass(id);
    return Utils.getClassFullName(name, ename ?? "", sname ?? "");
  }
  return "致密喵呜机板 (Dense Meawing Machinery Plate)"; // 直接放弃整合包侧真实逻辑模拟
}
</script>
