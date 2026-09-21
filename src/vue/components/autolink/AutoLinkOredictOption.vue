<template>
  <div :data-index="index" :title="dataOriginalTitle" href="javascript:void(0);">
    <a @click="emit('click', entry.type, dataId.toString(), dataTextHalf, dataTextFull)">
      <i class="fas fa-tag mcmodder-chroma" />
      #{{ item.id }}
    </a>
    <span v-if="index < 10" class="item-shortcut"
      v-html="Utils.keyToHTML({ altKey: true, key: index.toString() })" />
  </div>
</template>

<script setup lang="ts">
import type { AutoLinkOptionEmitPayload } from '../../../types/emits';
import type { AutoLinkOptionProps } from '../../../types/props';
import { Utils } from '../../../Utils';

const { entry } = defineProps<AutoLinkOptionProps<AutoLinkOredictEntry>>();

const item = entry.data;
const dataId = item.id;
const dataTextFull = item.id;
const dataTextHalf = item.id;
const dataOriginalTitle = item.id;

const emit = defineEmits<AutoLinkOptionEmitPayload>();

</script>