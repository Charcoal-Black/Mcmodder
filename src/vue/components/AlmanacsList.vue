<template>
  <div :class="className">
    <div v-if="!data.length" class="empty" />
    <div v-else v-for="index in range" class="block">
      <div class="title">{{ data[index] }}</div>
      <div class="text">{{ data[index + 1] }}</div>
    </div>
    <span class="mcmodder-mold-num mold">
      {{ title }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Utils } from '../../Utils';


interface Props {
  data: string[],
  className: string,
  title: string
}

const { data } = defineProps<Props>();

const range = computed(() => {
  return Utils.createRange(0, data.length, 2);
})

</script>