<template>
  <Collapsible :on-click="onClick">
    <template #header>
      <span class="name" v-html="name" />
      <span class="size" v-html="Utils.getFormattedSize(GM_getValue(id)?.length)" />
    </template>
    <template #content>
      <GenericTable
        ref="table"
        :id="`mcmodder-config-table-${ id }`"
        :parent="parent"
        :rowOptions="rowOptions"
      />
      <slot />
    </template>
  </Collapsible>
</template>

<script setup lang="ts" generic="K extends keyof AppStorage, TConfig extends object = Extract<AppStorage[K], object>, TData extends TableAcceptable = Extract<TConfig, TableAcceptable>">
import { useTemplateRef } from 'vue';
import Collapsible from '../Collapsible.vue';
import { GM_getValue } from '$';
import { Utils } from '../../../Utils.ts';
import GenericTable from '../table/GenericTable.vue';
import type { ConfigResourceInteractorProps } from '../../../types/props.d.ts';

let isLoaded = false;
let isShown = false;

const props = withDefaults(defineProps<ConfigResourceInteractorProps<K, TConfig, TData>>(), {
  configParser: () => (config: string) => JSON.parse(config || "{}") as TConfig,
  dataParser: () => (_key: string, item: unknown) => item as TData
});
const table = useTemplateRef("table");

function load() {
  const rawData = GM_getValue(props.id) as string;
  if (rawData === undefined) {
    return;
  }
  let config = props.configParser(rawData);
  table.value!.showLoading();
  Object.keys(config).forEach(key => {
    table.value!.appendData(props.dataParser(key, (config as any)[key]));
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