<template>{{ Values.modStatusMap[Object.values(status)[0]] }}</template>

<script setup lang="ts">
import { Values } from "../../../../../../src/Values";
defineProps<{ status: Required<McmodClassEditorInnerData>["status"] }>();
</script>
