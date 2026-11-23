<template>
  <p v-if="mode['mode-1']">
    客户端: {{ Values.modEnvironmentModeMap[Object.values(mode["mode-1"])[0]] }}
  </p>
  <p v-if="mode['mode-2']">
    服务端: {{ Values.modEnvironmentModeMap[Object.values(mode["mode-2"])[0]] }}
  </p>
</template>

<script setup lang="ts">
import { Values } from "../../../../../../src/Values";
defineProps<{
  mode: Pick<McmodClassEditorInnerData, "mode-1" | "mode-2">;
}>();
</script>
