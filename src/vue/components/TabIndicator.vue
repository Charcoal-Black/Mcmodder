<template>
  <div ref="tabRef" class="mcmodder-swiper-tab">
    <div
      ref="cursurRef"
      class="mcmodder-swiper-cursor"
      :style="{
        'margin-left': left + 'px',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from "vue";

const tabRef = useTemplateRef("tabRef");
const cursorRef = useTemplateRef("cursurRef");

const left = ref(0);

function update(active: HTMLElement) {
  const ul = tabRef.value;
  const cursor = cursorRef.value;
  if (ul === null || cursor === null) {
    return;
  }
  const selfLeft = active.getBoundingClientRect().left;
  const selfWidth = active.getBoundingClientRect().width;
  const parentLeft = ul.getBoundingClientRect().left;
  const cursorWidth = cursor.getBoundingClientRect().width;
  const marginLeft = selfLeft - parentLeft + selfWidth / 2 - cursorWidth / 2;
  left.value = marginLeft;
}

defineExpose({
  update,
});
</script>
