<template>
  <div id="mcmodder-itemjson-container">
    <div class="common-text">
      <span class="mcmodder-subtitle">物品JSON管理</span>
    </div>
    <ItemJsonFrame
      id="itemjsonframe"
      :parent="parent"
    />
  </div>
  <div id="mcmodder-recipejson-container">
    <div class="common-text">
      <span class="mcmodder-subtitle">合成表JSON管理</span>
    </div>
    <RecipeJsonFrame
      id="recipejsonframe"
      :parent="parent"
    />
  </div>
</template>

<script setup lang="ts">
import { Mcmodder } from '../../Mcmodder';
import ItemJsonFrame from './jsonframe/ItemJsonFrame.vue';
import RecipeJsonFrame from './jsonframe/RecipeJsonFrame.vue';

interface Props {
  parent: Mcmodder
}

const props = defineProps<Props>();

</script>