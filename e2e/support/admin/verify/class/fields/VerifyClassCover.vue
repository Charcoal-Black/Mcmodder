<template>
  <img
    width="320"
    height="200"
    :src="coverData"
    :onerror="`javascript:this.src='//i.mcmod.cn/item/cover/0.png';this.onerror = null`"
  />
</template>

<script setup lang="ts">
defineProps<{ coverData: Required<McmodClassEditorInnerData>["cover-data"] }>();
</script>
