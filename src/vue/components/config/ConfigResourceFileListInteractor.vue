<template>
  <ConfigResourceInteractor
    :parent="parent"
    :id="id"
    :name="name"
    :rowOptions="{
      fileName: '文件名',
      size: ['数据大小', TableUtils.DISPLAYRULE_SIZE],
    }"
    :data-parser="
      (key, item) => ({
        fileName: key,
        size: Utils.getContextLength(JSON.stringify(item)),
      })
    "
  />
</template>

<script setup lang="ts" generic="K extends keyof AppStorage">
import { TableUtils } from "../../../table/Table.ts";
import type { ConfigResourceFileListInteractorProps } from "../../../types/props";
import { Utils } from "../../../Utils.ts";
import ConfigResourceInteractor from "./ConfigResourceInteractor.vue";

defineProps<ConfigResourceFileListInteractorProps<K>>();
</script>
