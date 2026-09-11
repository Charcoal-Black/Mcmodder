<template>
  <Collapsible :on-click="onClick">
    <template #header>
      <span class="name" v-html="name" />
      <span class="size" v-html="McmodderUtils.getFormattedSize(GM_getValue(id)?.length)" />
    </template>
    <template #content>
      <GenericTable
        ref="table"
        :id="`mcmodder-config-table-${ id }`"
        :parent="parent"
        :head-configs="headConfigs"
      />
      <slot />
    </template>
  </Collapsible>
</template>

<script setup lang="ts" generic="T extends McmodderTableAcceptable">
import { useTemplateRef } from 'vue';
import { ConfigResourceInteractorProps, McmodderTableAcceptable } from '../../../types';
import Collapsible from '../Collapsible.vue';
import { GM_getValue } from '$';
import { McmodderUtils } from '../../../Utils.ts';
import GenericTable from '../table/GenericTable.vue';

let isLoaded = false;
let isShown = false;

const props = withDefaults(defineProps<ConfigResourceInteractorProps<T>>(), {
  configParser: (config: any) => JSON.parse(config || "{}"),
  dataParser: ((_: any, item: any) => item)
});
const table = useTemplateRef("table");

function load() {
  let data = props.configParser(GM_getValue(props.id));
  table.value!.showLoading();
  Object.keys(data).forEach(key => {
    table.value!.appendData(props.dataParser(key, data[key]));
  });
  table.value!.refreshAll();
  isLoaded = true;
}

function onClick() {
  if (!isShown) {
    if (!isLoaded) load();
    table.value!.show();
    isShown = true;
  }
  else {
    // this.table.hide();
    isShown = false;
  }
}

defineExpose({
  table
})

</script>