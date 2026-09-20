<template>
  <div :data-index="index" :title="dataOriginalTitle" href="javascript:void(0);">
    <a @click="emit('click', entry.type, dataId.toString(), dataTextHalf, dataTextFull)">
      <i class="fas mcmodder-chroma" :class="typeData.icon" />
      <span class="item-id mcmodder-slim-dark">{{ data.id }}</span>
      <span class="item-name">{{ data.name }}</span>
      <span v-if="data.alias" class="item-ename">{{ data.alias }}</span>
    </a>
    <span v-if="index < 10" class="item-shortcut"
      v-html="McmodderUtils.keyToHTML({ altKey: true, key: index.toString() })" />
  </div>
</template>

<script setup lang="ts">
import type { AutoLinkOptionEmitPayload } from '../../../types/emits';
import type { AutoLinkOptionProps } from '../../../types/props';
import { McmodderUtils } from '../../../Utils';
import { McmodderValues } from '../../../Values';

const { entry } = defineProps<AutoLinkOptionProps<AutoLinkAuthorEntry>>();

const data = entry.data;
const typeData = McmodderValues.nonItemTypeList[data.isTeam ? "authors" : "author"];
const dataId = data.id;
const fullName = data.name + (data.alias ? " - " + data.alias : "");
const dataTextHalf = data.name;
const dataTextFull = fullName;
const dataOriginalTitle = fullName;

const emit = defineEmits<AutoLinkOptionEmitPayload>();

</script>