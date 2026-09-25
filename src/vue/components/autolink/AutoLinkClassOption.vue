<template>
  <div :data-index="index" :title="dataOriginalTitle" href="javascript:void(0);">
    <a @click="emit('click', entry.type, dataId.toString(), dataTextHalf, dataTextFull)">
      <i class="fas mcmodder-chroma" :class="typeData.icon" />
      <span class="item-id mcmodder-slim-dark">{{ data.id }}</span>
      <span v-if="data.abbr" class="item-modabbr">[{{ data.abbr }}]</span>
      <span class="item-name">{{ data.name }}</span>
      <span v-if="data.englishName" class="item-ename">{{ data.englishName }}</span>
    </a>
    <span v-if="index < 10" class="item-shortcut">
      <KeyDisplay :key-data="{ altKey: true, key: index.toString() }" />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { AutoLinkOptionEmitPayload } from '../../../types/emits';
import type { AutoLinkOptionProps } from '../../../types/props';
import { Utils } from '../../../Utils';
import { Values } from '../../../Values';
import KeyDisplay from '../KeyDisplay';

const { entry } = defineProps<AutoLinkOptionProps<AutoLinkClassEntry>>();

const data = entry.data;
const typeData = Values.nonItemTypeList[entry.type];
const fullName = Utils.getClassFullName(data.name, data.englishName, data.abbr);
const dataId = data.id;
const dataTextFull = fullName;
const dataTextHalf = data.name;
const dataOriginalTitle = `${ typeData.text } - ID:${ data.id } ${ fullName }`;

const emit = defineEmits<AutoLinkOptionEmitPayload>();

</script>