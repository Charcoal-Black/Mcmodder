<template>
  <button class="btn" :class="{ disabled: isDisabled }" :disabled="isDisabled" @click="onButtonClick">
    <slot />
    <i v-if="isDisabled" class="fa fa-pulse spinner"></i>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  onClick: (e: PointerEvent) => void | Promise<void>;
}

const props = defineProps<Props>();

const isDisabled = ref(false);

function setLoading() {
  isDisabled.value = true;
}
function completeLoading() {
  isDisabled.value = false;
}

async function onButtonClick(e: PointerEvent) {
  setLoading();
  await props.onClick(e);
  completeLoading();
}

defineExpose({
  setLoading,
  completeLoading
})

</script>