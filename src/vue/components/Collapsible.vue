<template>
  <div class="mcmodder-collapsible-container" :class="{ expanded: classExpanded }">
    <div
      type="button"
      class="mcmodder-collapsible-header"
      :aria-expanded="classExpanded"
      @click="onCollapsibleClick"
    >
      <slot name="header" />
    </div>
    <div
      class="mcmodder-collapsible-content mcmodder-interpolate-container"
      :class="{ collapsed: !classExpanded }"
    >
      <div class="mcmodder-collapsible-content-inner">
        <slot name="content" />
      </div>
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
