<template>
  <p v-for="(entry, key) in link" :key="key">
    [{{ getTitle(entry) }}] {{ entry.href }}{{ getDesc(entry) }}
  </p>
</template>

<script setup lang="ts">
type Links = Required<McmodAuthorEditorInnerData>["link"];
type Link = ValueOf<Links>;

defineProps<{ link: Links }>();

function getTitle(link: Link) {
  return link.title === "other" ? link.custom : link.title;
}

function getDesc(link: Link) {
  return link.text ? ` (${link.text})` : " "; // 这似乎就是有个空格的，也存疑
}
</script>
