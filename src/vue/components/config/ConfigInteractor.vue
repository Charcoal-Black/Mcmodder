<template>
  <div class="center-setting-block">
    <div class="setting-item">
      <span v-if="type !== 'checkbox'">
        <MatchedText :text="titleText" :ranges="matchedRanges?.title" />
      </span>
      <CheckboxInput
        v-if="type === 'checkbox'"
        :id="id"
        :title="title"
        :title-ranges="matchedRanges?.title"
        :value="value as boolean"
        :on-successful-change="onConfigSuccessfulChange"
        :with-label="true"
      />
      <TextInput
        v-else-if="type === 'text'"
        :title="title"
        :value="value as string"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <ColorpickerInput
        v-else-if="type === 'colorpicker'"
        :title="title"
        :value="value as string"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <NumberInput
        v-else-if="type === 'number'"
        :title="title"
        :value="value as number"
        :on-successful-change="onConfigSuccessfulChange"
        :range="range"
      />
      <SliderInput
        v-else-if="type === 'slider'"
        :title="title"
        :value="value as number"
        :on-successful-change="onConfigSuccessfulChange"
        :range="finiteRange!"
      />
      <DropdownMenuInput
        v-else-if="type === 'dropdownMenu'"
        :title="title"
        :value="value as number"
        :on-successful-change="onConfigSuccessfulChange"
        :range="valueSet!"
      />
      <DropdownTextInput
        v-else-if="type === 'dropdownTextMenu'"
        :title="title"
        :value="value as string"
        :on-successful-change="onConfigSuccessfulChange"
        :suggestion-manager="{
          onInitSuggestion: () => suggestion!,
        }"
      />
      <KeybindInput
        v-else-if="type === 'keybind'"
        :title="title"
        :value="value as Key"
        :on-successful-change="onConfigSuccessfulChange"
      />
      <slot name="afterInput" />
    </div>
    <!-- 设置项描述内含 <del>/<code>/<a> 等排版标签，无法用纯文本渲染；内容来自 ConfigLoader 自身的静态配置，已过 sanitizeHTML -->
    <!-- 排版标签本身不参与匹配也不占位，故逐段渲染：标签段原样输出，文本段交给 MatchedText 高亮 -->
    <p class="text-muted">
      <template v-for="(segment, index) in descriptionSegments" :key="index">
        <!-- eslint-disable-next-line vue/no-v-html -- 片段取自已清洗的整段描述，此处按原样输出排版标签 -->
        <span v-if="segment.isTag" v-html="segment.text" />
        <MatchedText
          v-else
          :text="segment.text"
          :ranges="clipRanges(segment, matchedRanges?.description)"
        />
      </template>
    </p>
    <slot name="afterItem" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { ConfigUtils } from "../../../config/ConfigUtils";
import { Utils } from "../../../Utils";
import CheckboxInput from "../input/CheckboxInput.vue";
import TextInput from "../input/TextInput.vue";
import ColorpickerInput from "../input/ColorpickerInput.vue";
import NumberInput from "../input/NumberInput.vue";
import SliderInput from "../input/SliderInput.vue";
import DropdownMenuInput from "../input/DropdownMenuInput.vue";
import DropdownTextInput from "../input/DropdownTextInput.vue";
import KeybindInput from "../input/KeybindInput.vue";
import { useSanitizedHTML } from "../../composables/useSanitizedHTML";
import type { ConfigRepository } from "../../../config/ConfigRepository.ts";
import type { ConfigMatchRanges } from "../../../types/props";
import MatchedText from "../MatchedText";

interface Props {
  id: ConfigurableSettings["id"];
  cfgutils: ConfigUtils;
  configs: ConfigRepository;
  matchedRanges?: ConfigMatchRanges;
}

const props = withDefaults(defineProps<Props>(), {
  matchedRanges: undefined,
});
const configOption = shallowRef(props.cfgutils.options[props.id]);
const type = ref<Readonly<InputType>>(configOption.value.type);
const title = computed(() => configOption.value.title);
/** 标题（含紧跟其后的冒号与两侧空格）；命中区间相对标题本体，故结尾附加内容不影响高亮位置 */
const titleText = computed(() => `${title.value}: `);
const value = props.configs.getSettingsWritableRef(props.id);
// computed(() => configs.getSettings(id) ?? configOption.value.value);

const opt = computed(() => {
  const data = configOption.value;
  const type = data.type;
  switch (type) {
    case "checkbox":
      return {};
    case "text":
      return {};
    case "colorpicker":
      return {};
    case "number":
      return { range: data.range as InputValueNumericRange };
    case "slider":
      return { finiteRange: data.range as InputValueFiniteNumericRange };
    case "dropdownMenu": {
      const valueSet = { ...data.range } as InputValueSet;
      valueSet[data.value as number] += " (默认)";
      return { valueSet };
    }
    case "dropdownTextMenu": {
      const suggestion = (data.suggestion as InputSuggestion[]).map((e) => {
        if (typeof e === "string" && e === data.value) {
          e = {
            text: e,
            value: e,
          };
        }
        if (typeof e === "object" && e.value === data.value) {
          e = { ...e };
          e.text += " (默认)";
        }
        return e;
      });
      return { suggestion };
    }
    case "keybind":
      return {};
  }
  throw new Error("这 InputType 有力气");
});
const range = computed(() => opt.value.range);
const finiteRange = computed(() => opt.value.finiteRange);
const valueSet = computed(() => opt.value.valueSet);
const suggestion = computed(() => opt.value.suggestion);

function onConfigSuccessfulChange(resp: InputValidInfo<typeof value.value>) {
  if (resp.final !== undefined) {
    Utils.commonMsg(PublicLangData.center.setting.complete);
    value.value = resp.final;
  }
  // configs.setSettings(id, resp.final);
}

const description = computed(() => {
  const option = configOption.value;
  if (option.type === "dropdownMenu") {
    return configOption.value.description;
  }
  let list = [];
  let val = option.value;
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
              : val || "空"
      }`,
    );
  const range = ("range" in option ? option.range : [null, null]) as InputValueNumericRange;
  let l = range[0],
    r = range[1];
  let tl = l?.toLocaleString(),
    tr = r?.toLocaleString();
  if (l !== null && r !== null) list.push(`允许范围：${tl} ~ ${tr}`);
  else if (l !== null) list.push(`最小值：${tl}`);
  else if (r !== null) list.push(`最大值：${tr}`);
  let appendix = list.length ? `（${list.join("；")}）` : ``;
  return `${option.description}${appendix}`;
});

/** `description` 含排版标签，渲染前统一过一遍 sanitizeHTML */
const safeDescription = useSanitizedHTML(() => description.value);

/** 介绍文本按「HTML 标签 / 纯文本」切分出的片段 */
interface DescriptionSegment {
  /** 是否为 HTML 标签段（标签段需按原样输出，不参与匹配也不占位） */
  isTag: boolean;
  /** 片段文本 */
  text: string;
  /** 该片段在「剔除标签后的纯文本流」中的起始偏移 */
  offset: number;
}

/**
 * 把一段（已清洗的）HTML 介绍文本切分成标签段与文本段。
 * 文本段各自记录自己在**纯文本流**中的偏移，从而让「按纯文本计算的命中区间」对齐到具体片段上。
 */
function splitDescription(html: string): DescriptionSegment[] {
  const segments: DescriptionSegment[] = [];
  let offset = 0;
  html.split(/(<[^>]*>)/).forEach((text) => {
    if (!text) return;
    const isTag = text.startsWith("<");
    segments.push({ isTag, text, offset });
    if (!isTag) offset += text.length;
  });
  return segments;
}

const descriptionSegments = computed<DescriptionSegment[]>(() =>
  splitDescription(safeDescription.value),
);

/** 把整段介绍的命中区间裁剪到某个文本段内，并换算成该段自身的偏移 */
function clipRanges(segment: DescriptionSegment, ranges?: [number, number][]) {
  if (!ranges) return;
  const start = segment.offset;
  const end = start + segment.text.length;
  const clipped = ranges
    .map(([l, r]) => [Math.max(l, start) - start, Math.min(r, end) - start] as [number, number])
    .filter(([l, r]) => r > l);
  return clipped.length ? clipped : undefined;
}
</script>
