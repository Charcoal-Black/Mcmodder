<template>
  <div class="mcmodder-changelog-cover">
    <span class="mcmodder-changelog-title">啊哈哈哈、更新来咯！</span>
    <span class="mcmodder-changelog-subtitle">
      <span class="mcmodder-common-danger">{{ Values.mcmodderVersion }}</span>
      &nbsp;→&nbsp;
      <span class="mcmodder-common-light">{{ latestVersion }}</span>
    </span>
  </div>
  <!-- 更新日志为 Markdown 渲染后的 HTML，保留 <del>/<b>/<code> 等排版标签 -->
  <!-- eslint-disable-next-line vue/no-v-html -- 入参为 useSanitizedHTML 清洗后的结果 -->
  <div class="mcmodder-changelog-content" v-html="safeChangelog"></div>
</template>

<script setup lang="ts">
import { Values } from "../../Values";
import { useSanitizedHTML } from "../composables/useSanitizedHTML";

interface Props {
  latestVersion: string;
  changelog: string;
}

const props = defineProps<Props>();

/** 更新日志含 Markdown 渲染出的排版标签，绑定 `v-html` 前统一过一遍 sanitizeHTML */
const safeChangelog = useSanitizedHTML(() => props.changelog);
</script>
