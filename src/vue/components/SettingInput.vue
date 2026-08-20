<template>
  <div class="setting-input">
    <CheckboxInput
      v-if="data?.type === McmodderInputType.CHECKBOX"
      :id="`settings-${entry}`"
      :value="!!value"
      @commit="emit('commit', $event)"
    />

    <NumberInput
      v-else-if="data?.type === McmodderInputType.NUMBER"
      :title="data?.title"
      :value="value"
      :range="data?.range as InputValueNumericRange | undefined"
      @commit="emit('commit', $event)"
    />

    <SliderInput
      v-else-if="data?.type === McmodderInputType.SLIDER"
      :title="data?.title"
      :value="value"
      :range="data?.range as InputValueNumericRange | undefined"
      @commit="emit('commit', $event)"
    />

    <TextInput
      v-else-if="data?.type === McmodderInputType.TEXT"
      :value="value"
      @commit="emit('commit', $event)"
    />

    <ColorpickerInput
      v-else-if="data?.type === McmodderInputType.COLORPICKER"
      :value="value"
      @commit="emit('commit', $event)"
    />

    <KeybindInput
      v-else-if="data?.type === McmodderInputType.KEYBIND"
      :value="value"
      @commit="emit('commit', $event)"
    />

    <DropdownMenuInput
      v-else-if="data?.type === McmodderInputType.DROPDOWN_MENU"
      :range="data?.range as InputValueSet | undefined"
      :value="value"
      :defaultValue="data?.value"
      @commit="emit('commit', $event)"
    />

    <DropdownTextInput
      v-else-if="data?.type === McmodderInputType.DROPDOWN_TEXT_MENU"
      :value="value"
      :recommendation="data?.recommendation"
      :defaultValue="data?.value"
      @commit="emit('commit', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { McmodderInputType } from "../../config/ConfigUtils";
import type { InputValueNumericRange, InputValueSet, McmodderConfigData } from "../../types";
import {
  CheckboxInput,
  NumberInput,
  SliderInput,
  TextInput,
  ColorpickerInput,
  KeybindInput,
  DropdownMenuInput,
  DropdownTextInput
} from "./input";

defineProps<{
  entry: string;
  data: McmodderConfigData | undefined;
  value: any;
}>();

const emit = defineEmits<{
  commit: [value: any];
}>();
</script>

<style scoped>
.setting-input {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: .5em .8em;
  flex: 0 1 auto;
  min-width: 260px;
}
</style>
