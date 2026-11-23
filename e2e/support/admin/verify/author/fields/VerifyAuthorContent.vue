<!-- eslint-disable vue/no-v-html -->
<template>
  <span class="common-text font14" v-html="ContentPreview.generate(content)"></span>
</template>
<script setup lang="ts">
import { ContentPreview } from "../../../../../../src/preview/ContentPreview";
defineProps<{ content: Required<McmodAuthorEditorInnerData>["content"] }>();
</script>
