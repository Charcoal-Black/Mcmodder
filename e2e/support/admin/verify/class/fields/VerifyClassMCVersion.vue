<template>
  <template v-for="(versions, loader, index) in sorted" :key="index"
    ><p>{{ Values.reversedLoaderID[loader] }}:</p>
    {{ text(versions) }}</template
  >
</template>

<script setup lang="ts">
import { computed, type UnwrapRef } from "vue";
import { Values } from "../../../../../../src/Values";
import { Utils } from "../../../../../../src/Utils";

type MCVersions = Required<McmodClassEditorInnerData>["mcversion"];

const { mcversion } = defineProps<{ mcversion: MCVersions }>();

const sorted = computed(() => {
  const result: Partial<Record<keyof typeof mcversion, ValueOf<typeof Values.mcVersionMap>[]>> = {};
  Utils.getKeys(mcversion).forEach((loader) => {
    result[loader] = Object.values(mcversion[loader])
      .map(Number)
      .sort((a, b) => b - a)
      .map((id) => Values.mcVersionMap[id.toString() as ValueOf<ValueOf<typeof mcversion>>]);
  });
  return result;
});

function text(versions: ValueOf<UnwrapRef<typeof sorted>>) {
  return versions?.join(" / ");
}
</script>
