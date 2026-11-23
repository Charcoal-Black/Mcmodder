<template>
  <template v-for="(entry, index) in flattened" :key="index">
    <template v-if="entry.type === 'link'">
      <a :href="`//www.mcmod.cn/author/${entry.id}.html`" target="_blank" class="text-dark">
        <b>{{ entry.data.names[0] }}</b
        ><template v-if="entry.nameList.length > 0">
          - <i class="text-muted">{{ entry.nameList.join(" / ") }}</i></template
        >
      </a>
      ({{ position(entry) }})
    </template>
    <template v-else>{{ entry.name }} ({{ position(entry) }})</template>
    <br v-if="index < flattened.length - 1" />
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Values } from "../../../../../../src/Values";
import { McmodRepository, type McmodAuthor } from "../../../../data/McmodRepository";

type Authors = Required<McmodClassEditorInnerData>["author"];
type FlattenedAuthor =
  | (ValueOf<Required<Authors>["add"]> & { type: "add" })
  | (ValueOf<Required<Authors>["link"]> & { type: "link"; data: McmodAuthor; nameList: string[] });

const { author } = defineProps<{ author: Authors }>();

const flattened = computed(() => {
  const result: FlattenedAuthor[] = [];
  Object.entries(author.add ?? {}).forEach(([_index, e], index) => {
    result[Number(index)] = { ...e, ...({ type: "add" } as const) };
  });
  Object.entries(author.link ?? {}).forEach(([_index, e], index) => {
    const data = McmodRepository.getAuthor(Number(e.id));
    // 后端只保留一个有序名称列表：第 0 项是主要名称，其余都是别名
    const nameList = data.names.slice(1);
    result[Number(index)] = { ...e, ...({ type: "link", data, nameList } as const) };
  });
  return result;
});

function position(entry: FlattenedAuthor) {
  const selects = entry.select ?? [];
  if (selects.some((pos) => pos === "other")) {
    return entry.custom;
  }
  return selects
    .filter((pos) => pos !== "")
    .map((pos) => Values.authorPositionMap[pos])
    .join("/");
}
</script>
