<template>{{ text }}</template>

<script setup lang="ts">
import { computed } from "vue";
import { Values } from "../../../../../../src/Values";

type Categories = Required<McmodClassEditorInnerData>["category"];

const { category } = defineProps<{ category: Categories }>();

const text = computed(() =>
  Object.values(category)
    .map((entry) => Values.classCategoryValueMap[entry].name)
    .join(" / "),
);
</script>
