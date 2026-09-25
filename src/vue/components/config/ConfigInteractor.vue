<template>
  <div class="center-setting-block">
    <div class="setting-item">
      <span v-if="type !== InputType.CHECKBOX"> {{ configOption.title }}: </span>
      <CheckboxInput
        v-if="type === InputType.CHECKBOX"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :id="id"
        :with-label="true"
      />
      <TextInput
        v-else-if="type === InputType.TEXT"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <ColorpickerInput
        v-else-if="type === InputType.COLORPICKER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <NumberInput
        v-else-if="type === InputType.NUMBER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="range"
      />
      <SliderInput
        v-else-if="type === InputType.SLIDER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="finiteRange!"
      />
      <DropdownMenuInput
        v-else-if="type === InputType.DROPDOWN_MENU"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="valueSet!"
      />
      <DropdownTextInput
        v-else-if="type === InputType.DROPDOWN_TEXT_MENU"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :suggestion-manager="{
          onInitSuggestion: () => suggestion!,
        }"
      />
      <KeybindInput
        v-else-if="type === InputType.KEYBIND"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <slot name="afterInput" />
    </div>
    <p class="text-muted" v-html="description" />
    <slot name="afterItem" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, type WritableComputedRef } from "vue";
import { ConfigUtils, InputType } from "../../../config/ConfigUtils";
import { Utils } from "../../../Utils";
import CheckboxInput from "../input/CheckboxInput.vue";
import TextInput from "../input/TextInput.vue";
import ColorpickerInput from "../input/ColorpickerInput.vue";
import NumberInput from "../input/NumberInput.vue";
import SliderInput from "../input/SliderInput.vue";
import DropdownMenuInput from "../input/DropdownMenuInput.vue";
import DropdownTextInput from "../input/DropdownTextInput.vue";
import KeybindInput from "../input/KeybindInput.vue";
import type { ConfigRepository } from "../../../config/ConfigRepository.ts";

interface Props {
  id: keyof Settings;
  cfgutils: ConfigUtils;
  configs: ConfigRepository;
}

const { id, cfgutils, configs } = defineProps<Props>();
const configOption = shallowRef(cfgutils.data[id]);
const type = ref<Readonly<InputType>>(configOption.value.type);
const title = computed(() => configOption.value.title);
const value = configs.getSettingsWritableRef(id) as WritableComputedRef<any>;
// computed(() => configs.getSettings(id) ?? configOption.value.value);

const opt = computed(() => {
  const data = configOption.value;
  const type = data.type;
  switch (type) {
    case InputType.CHECKBOX:
      return {};
    case InputType.TEXT:
      return {};
    case InputType.COLORPICKER:
      return {};
    case InputType.NUMBER:
      return { range: data.range as InputValueNumericRange };
    case InputType.SLIDER:
      return { finiteRange: data.range as InputValueFiniteNumericRange };
    case InputType.DROPDOWN_MENU: {
      const valueSet = data.range as InputValueSet;
      valueSet[data.value as number] += " (默认)";
      return { valueSet };
    }
    case InputType.DROPDOWN_TEXT_MENU: {
      const suggestion = data.suggestion!;
      suggestion.map((e) => {
        if (typeof e === "string" && e === data.value) {
          e = {
            html: e,
            value: e,
          };
        }
        if (typeof e === "object" && e.value === data.value) {
          e.html += " (默认)";
        }
        return e;
      });
      return { suggestion };
    }
    case InputType.KEYBIND:
      return {};
  }
  throw new Error("这 InputType 有力气");
});
const range = computed(() => opt.value.range);
const finiteRange = computed(() => opt.value.finiteRange);
const valueSet = computed(() => opt.value.valueSet);
const suggestion = computed(() => opt.value.suggestion);

function onConfigSuccessfulChange(resp: InputValidInfo<any>) {
  Utils.commonMsg(PublicLangData.center.setting.complete);
  value.value = resp.final;
  // configs.setSettings(id, resp.final);
}

const description = computed(() => {
  if (configOption.value.type === InputType.DROPDOWN_MENU) {
    return configOption.value.description;
  }
  let list = [];
  let val = configOption.value.value;
  if (val != null)
    list.push(
      `默认：${
        typeof val === "boolean"
          ? val
            ? "开启"
            : "关闭"
          : typeof val === "number"
            ? val.toLocaleString()
            : typeof val === "object"
              ? Utils.keyToString(val)
              : val
      }`,
    );
  const range = (configOption.value.range || [null, null]) as InputValueNumericRange;
  let l = range[0],
    r = range[1];
  let tl = l?.toLocaleString(),
    tr = r?.toLocaleString();
  if (l !== null && r !== null) list.push(`允许范围：${tl} ~ ${tr}`);
  else if (l !== null) list.push(`最小值：${tl}`);
  else if (r !== null) list.push(`最大值：${tr}`);
  let appendix = list.length ? `（${list.join("；")}）` : ``;
  return `${configOption.value.description}${appendix}`;
});
</script>
