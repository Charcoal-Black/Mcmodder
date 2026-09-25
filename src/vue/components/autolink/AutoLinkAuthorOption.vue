<template>
  <div :data-index="index" :title="dataOriginalTitle" href="javascript:void(0);">
    <a @click="emit('click', entry.type, dataId.toString(), dataTextHalf, dataTextFull)">
      <i class="fas mcmodder-chroma" :class="typeData.icon" />
      <span class="item-id mcmodder-slim-dark">{{ data.id }}</span>
      <span class="item-name">{{ data.name }}</span>
      <span v-if="data.alias" class="item-ename">{{ data.alias }}</span>
    </a>
    <span v-if="index < 10" class="item-shortcut">
      <KeyDisplay :key-data="{ altKey: true, key: index.toString() }" />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { AutoLinkOptionEmitPayload } from '../../../types/emits';
import type { AutoLinkOptionProps } from '../../../types/props';
import { Values } from '../../../Values';
import KeyDisplay from '../KeyDisplay';

const { entry } = defineProps<AutoLinkOptionProps<AutoLinkAuthorEntry>>();

const data = entry.data;
const typeData = Values.nonItemTypeList[data.isTeam ? "authors" : "author"];
const dataId = data.id;
const fullName = data.name + (data.alias ? " - " + data.alias : "");
const dataTextHalf = data.name;
const dataTextFull = fullName;
const dataOriginalTitle = fullName;

const emit = defineEmits<AutoLinkOptionEmitPayload>();

</script>