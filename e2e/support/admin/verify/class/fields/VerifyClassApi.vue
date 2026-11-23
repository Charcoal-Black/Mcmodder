<template>{{ text }}</template>

<script setup lang="ts">
import { computed } from "vue";
import { Values } from "../../../../../../src/Values";

const { api } = defineProps<{ api: Required<McmodClassEditorInnerData>["api"] }>();

const text = computed(() =>
  Object.values(api)
    .map((entry) => Values.reversedLoaderID[entry])
    .join(" / "),
);
</script>
