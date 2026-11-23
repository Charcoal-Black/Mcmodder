<template>
  {{ text }}
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Values } from "../../../../../../src/Values";

const { platform } = defineProps<{ platform: Required<McmodClassEditorInnerData>["platform"] }>();

const text = computed(() =>
  Object.values(platform)
    .map((entry) => Values.modPlatformMap[entry])
    .join(" / "),
);
</script>
