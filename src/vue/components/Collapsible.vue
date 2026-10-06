<template>
  <div class="mcmodder-collapsible-container" :class="{ expanded: classExpanded }">
    <div class="mcmodder-collapsible-header" @click="onCollapsibleClick">
      <slot name="header" />
    </div>
    <div class="mcmodder-collapsible-content">
      <slot name="content" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  onClick?: (e: PointerEvent) => void;
}

const props = defineProps<Props>();

const classExpanded = ref(false);

function onCollapsibleClick(e: PointerEvent) {
  classExpanded.value = !classExpanded.value;
  props.onClick?.(e);
}
</script>
