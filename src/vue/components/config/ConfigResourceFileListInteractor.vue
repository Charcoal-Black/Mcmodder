<template>
  <ConfigResourceInteractor
    :parent="parent"
    :id="id"
    :name="name"
    :head-configs="{
      fileName: '文件名',
      size: ['数据大小', McmodderTable.DISPLAYRULE_SIZE]
    }"
    :data-parser="(key, item) => ({
      fileName: key,
      size: McmodderUtils.getContextLength(JSON.stringify(item))
    })"
  />
</template>

<script setup lang="ts" generic="T extends McmodderTableAcceptable">
import { McmodderTable } from '../../../table/Table.ts';
import { ConfigResourceFileListInteractorProps, McmodderTableAcceptable } from '../../../types';
import { McmodderUtils } from '../../../Utils.ts';
import ConfigResourceInteractor from './ConfigResourceInteractor.vue';

defineProps<ConfigResourceFileListInteractorProps<T>>();

</script>