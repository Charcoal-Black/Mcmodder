<template>{{ Values.modSourceMap[Object.values(source)[0]] }}</template>

<script setup lang="ts">
import { Values } from "../../../../../../src/Values";
defineProps<{ source: Required<McmodClassEditorInnerData>["source"] }>();
</script>
