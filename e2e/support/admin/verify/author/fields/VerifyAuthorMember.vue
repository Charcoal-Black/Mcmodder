<template>
  <a
    v-for="(entry, index) in author"
    :key="index"
    :href="Utils.getAuthorURL(Number(entry.id))"
    target="_blank"
    class="text-dark"
    ><br v-if="index > 0" /><b>{{ entry.author.names[0] }}</b
    ><template v-if="entry.author.names.length > 1">
      - <i class="text-muted">{{ entry.author.names.slice(1).join(" / ") }}</i> ({{
        positions(entry)
      }})</template
    ></a
  >
</template>
<script setup lang="ts">
import { computed, type UnwrapRef } from "vue";
import { Utils } from "../../../../../../src/Utils";
import { McmodRepository } from "../../../../data/McmodRepository";
import { Values } from "../../../../../../src/Values";

const { member } = defineProps<{ member: Required<McmodAuthorEditorInnerData>["member"] }>();
const author = computed(() =>
  Object.values(member).map((entry) => ({
    ...entry,
    id: Number(entry.id),
    author: McmodRepository.getAuthor(Number(entry.id)),
  })),
);

function positions(entry: ElementOf<UnwrapRef<typeof author>>) {
  return entry.select
    ?.filter((position) => position !== "")
    .map((position) => Values.authorPositionMap[position])
    .join(","); // 分隔符存疑
}
</script>
