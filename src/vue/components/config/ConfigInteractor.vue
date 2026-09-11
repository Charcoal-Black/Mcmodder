<template>
  <div class="center-setting-block">
    <div class="setting-item">
      <span v-if="type !== McmodderInputType.CHECKBOX">
        {{ configData.title }}:
      </span>
      <CheckboxInput
        v-if="type === McmodderInputType.CHECKBOX"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :id="id"
        :with-label="true"
      />
      <TextInput
        v-else-if="type === McmodderInputType.TEXT"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <ColorpickerInput
        v-else-if="type === McmodderInputType.COLORPICKER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <NumberInput
        v-else-if="type === McmodderInputType.NUMBER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="range"
      />
      <SliderInput
        v-else-if="type === McmodderInputType.SLIDER"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="finiteRange!"
      />
      <DropdownMenuInput
        v-else-if="type === McmodderInputType.DROPDOWN_MENU"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :range="valueSet!"
      />
      <DropdownTextInput
        v-else-if="type === McmodderInputType.DROPDOWN_TEXT_MENU"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
        :suggestion-manager="{
          onInitSuggestion: () => suggestion!
        }"
      />
      <KeybindInput
        v-else-if="type === McmodderInputType.KEYBIND"
        :title="title"
        :value="value"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <slot name="afterInput"/>
    </div>
    <p class="text-muted" v-html="description" />
    <slot name="afterItem"/>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { McmodderConfigUtils, McmodderInputType } from '../../../config/ConfigUtils';
import { InputValidInfo, InputValueFiniteNumericRange, InputValueNumericRange, InputValueSet } from '../../../types';
import { McmodderUtils } from '../../../Utils';
import CheckboxInput from '../input/CheckboxInput.vue';
import TextInput from '../input/TextInput.vue';
import ColorpickerInput from '../input/ColorpickerInput.vue';
import NumberInput from '../input/NumberInput.vue';
import SliderInput from '../input/SliderInput.vue';
import DropdownMenuInput from '../input/DropdownMenuInput.vue';
import DropdownTextInput from '../input/DropdownTextInput.vue';
import KeybindInput from '../input/KeybindInput.vue';

interface Props {
  id: string,
  cfgutils: McmodderConfigUtils
}

const { id, cfgutils } = defineProps<Props>();
const configData = shallowRef(cfgutils.data[id]);
const type = ref<Readonly<McmodderInputType>>(configData.value.type);
const title = computed(() => configData.value.title);
const value = computed(() => cfgutils.parent.utils.getConfig(id) ?? configData.value.value);

const opt = computed(() => {
  const data = configData.value;
  const type = data.type;
  switch (type) {
    case McmodderInputType.CHECKBOX: return {} ;
    case McmodderInputType.TEXT: return {};
    case McmodderInputType.COLORPICKER: return {};
    case McmodderInputType.NUMBER: return { range: data.range as InputValueNumericRange };
    case McmodderInputType.SLIDER: return { finiteRange: data.range as InputValueFiniteNumericRange };
    case McmodderInputType.DROPDOWN_MENU: {
      const valueSet = data.range as InputValueSet;
      valueSet[data.value] += " (默认)";
      return { valueSet };
    }
    case McmodderInputType.DROPDOWN_TEXT_MENU: {
      const suggestion = data.suggestion!;
      suggestion.map(e => {
        if (typeof e === "string" && e === data.value) {
          e = {
            html: e,
            value: e
          };
        }
        if (typeof e === "object" && e.value === data.value) {
          e.html += " (默认)";
        }
        return e;
      })
      return { suggestion };
    }
    case McmodderInputType.KEYBIND: return {};
  }
  throw new Error("这 InputType 有力气");
})
const range = computed(() => opt.value.range);
const finiteRange = computed(() => opt.value.finiteRange);
const valueSet = computed(() => opt.value.valueSet);
const suggestion = computed(() => opt.value.suggestion);

function onConfigSuccessfulChange(resp: InputValidInfo<any>) {
  McmodderUtils.commonMsg(PublicLangData.center.setting.complete);
  cfgutils.parent.utils.setConfig(id, resp.final);
}

const description = computed(() => {
  if (configData.value.type === McmodderInputType.DROPDOWN_MENU) {
    return configData.value.description;
  }
  let list = [];
  let val = configData.value.value;
  if (val != null) list.push(`默认：${
    typeof val === "boolean" ? (val ? "开启" : "关闭") :
    typeof val === "number" ? val.toLocaleString() :
    typeof val === "object" ? McmodderUtils.keyToString(val) : val
  }`);
  const range = (configData.value.range || [null, null]) as InputValueNumericRange;
  let l = range[0], r = range[1];
  let tl = l?.toLocaleString(), tr = r?.toLocaleString();
  if (l !== null && r !== null) 
    list.push(`允许范围：${ tl } ~ ${ tr }`);
  else if (l !== null)
    list.push(`最小值：${ tl }`);
  else if (r !== null)
    list.push(`最大值：${ tr }`);
  let appendix = list.length ? `（${list.join("；")}）` : ``;
  return `${ configData.value.description }${ appendix }`;
})

</script>