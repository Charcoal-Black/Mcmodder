<template>
  <div class="mcmodder-changelog-cover">
    <span class="mcmodder-changelog-title">啊哈哈哈、更新来咯！</span>
    <span class="mcmodder-changelog-subtitle">
      <span class="mcmodder-common-danger">{{ Values.mcmodderVersion }}</span>
      &nbsp;→&nbsp;
      <span class="mcmodder-common-light">{{ latestVersion }}</span>
    </span>
  </div>
  <div class="mcmodder-changelog-content" v-html="changelog"></div>
</template>

<script setup lang="ts">
import { Values } from '../../Values';

interface Props {
  latestVersion: string,
  changelog: string
}

defineProps<Props>();

</script>