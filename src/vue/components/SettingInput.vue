<template>
  <CheckboxInput
    v-if="type === McmodderInputType.CHECKBOX"
    :title="title"
    :value="!!value"
    :on-successful-change="onSuccessfulChange"
  />

  <NumberInput
    v-else-if="type === McmodderInputType.NUMBER"
    :title="title"
    :value="value"
    :range="numericRange"
    :on-successful-change="onSuccessfulChange"
  />

  <SliderInput
    v-else-if="type === McmodderInputType.SLIDER"
    :title="title"
    :value="value"
    :range="finiteRange"
    :on-successful-change="onSuccessfulChange"
  />

  <TextInput
    v-else-if="type === McmodderInputType.TEXT"
    :title="title"
    :value="value"
    :on-successful-change="onSuccessfulChange"
  />

  <ColorpickerInput
    v-else-if="type === McmodderInputType.COLORPICKER"
    :title="title"
    :value="value"
    :on-successful-change="onSuccessfulChange"
  />

  <KeybindInput
    v-else-if="type === McmodderInputType.KEYBIND"
    :title="title"
    :value="value"
    :on-successful-change="onSuccessfulChange"
  />

  <DropdownMenuInput
    v-else-if="type === McmodderInputType.DROPDOWN_MENU"
    :title="title"
    :value="value"
    :range="valueSet"
    :on-successful-change="onSuccessfulChange"
  />

  <DropdownTextInput
    v-else-if="type === McmodderInputType.DROPDOWN_TEXT_MENU"
    :title="title"
    :value="value"
    :suggestion-manager="suggestionManager"
    :on-successful-change="onSuccessfulChange"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { McmodderInputType } from "../../config/ConfigUtils";
import type {
  InputListOption,
  InputSimplifiedSuggestion,
  InputValidInfo,
  InputValueFiniteNumericRange,
  InputValueNumericRange,
  InputValueSet,
  McmodderConfigData
} from "../../types";
import CheckboxInput from "./input/CheckboxInput.vue";
import NumberInput from "./input/NumberInput.vue";
import SliderInput from "./input/SliderInput.vue";
import TextInput from "./input/TextInput.vue";
import ColorpickerInput from "./input/ColorpickerInput.vue";
import KeybindInput from "./input/KeybindInput.vue";
import DropdownMenuInput from "./input/DropdownMenuInput.vue";
import DropdownTextInput from "./input/DropdownTextInput.vue";

const props = defineProps<{
  data: McmodderConfigData | undefined;
  value: any;
}>();

const emit = defineEmits<{
  commit: [value: any];
}>();

const type = computed(() => props.data?.type ?? McmodderInputType.CHECKBOX);
const title = computed(() => props.data?.title ?? "");
const numericRange = computed(() => props.data?.range as InputValueNumericRange | undefined);
const finiteRange = computed(() => props.data?.range as InputValueFiniteNumericRange);

/** 下拉菜单不展示“默认：”说明，改为在对应选项上标注默认值 */
const valueSet = computed(() => {
  const range: InputValueSet = { ...props.data?.range as InputValueSet };
  const defaultValue = props.data?.value;
  if (range[defaultValue] !== undefined) range[defaultValue] += " (默认)";
  return range;
});

const suggestionManager = computed<InputListOption["suggestionManager"]>(() => ({
  onInitSuggestion: () => (props.data?.suggestion ?? []).map(markDefaultSuggestion)
}));

function markDefaultSuggestion(suggestion: InputSimplifiedSuggestion): InputSimplifiedSuggestion {
  const defaultValue = props.data?.value;
  if (typeof suggestion === "string") {
    return suggestion === defaultValue ? `${ suggestion } (默认)` : suggestion;
  }
  if (suggestion.value === defaultValue) {
    return { ...suggestion, html: `${ suggestion.html } (默认)` };
  }
  return suggestion;
}

function onSuccessfulChange(info: InputValidInfo<any>) {
  emit("commit", info.final);
}
</script>
