<template>
  <div v-show="del_num || ins_num" id="mcmodder-text-area" ref="root">
    <div class="mcmodder-text-stats">
      <span class="stats-num">
        <span v-show="del_num" class="stats-del">
          <span class="mcmodder-slim-danger">
            删除: <strong v-text="del_num.toLocaleString()" /> 处 (<strong
              v-text="del_byte.toLocaleString()"
            />
            字节)
          </span>
        </span>
        <span v-show="ins_num" class="stats-ins">
          <span class="mcmodder-slim-dark">
            新增: <strong v-text="ins_num.toLocaleString()" /> 处 (<strong
              v-text="ins_byte.toLocaleString()"
            />
            字节)
          </span>
        </span>
      </span>
      <span class="stats-opt">
        <span class="stats-opt-nav">
          {{ (currentPos + 1).toLocaleString() }} /
          {{ maxPos.toLocaleString() }}
        </span>
        <DropdownMenuInput
          title="对比模式"
          :value="defaultMode"
          :range="modeName"
          :on-successful-change="onModeChange"
        >
        </DropdownMenuInput>
        <a v-show="maxPos >= 1" class="prev" @click="onPrevClick">↑</a>
        <a v-show="maxPos >= 1" class="next" @click="onNextClick">↓</a>
      </span>
    </div>
    <div id="mcmodder-text-result" ref="resultFrame">
      <template v-for="(data, index) in diff" :key="index">
        <del v-if="data.removed" :data-index="index">{{ data.value }}</del>
        <ins v-else-if="data.added" :data-index="index">{{ data.value }}</ins>
        <template v-else>{{ data.value }}</template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  isRef,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type Ref,
  type ShallowRef,
} from "vue";
import { diffChars, diffLines, diffWords } from "diff";
import DropdownMenuInput from "./input/DropdownMenuInput.vue";

interface Props {
  /**
   * 编辑前的正文：给出正文节点或纯文本均可。
   * 也可传入持有二者的 `ShallowRef`——宿主据此可在**组件存活期间**替换正文以就地刷新对比结果，
   * 无需销毁重建组件（重建会丢失用户已选的对比模式，并残留一个已废弃的组件实例）。
   */
  textA: JQuery | string | ShallowRef<JQuery | string>;
  /** 编辑后的正文，取值方式同 {@link Props.textA}。 */
  textB: JQuery | string | ShallowRef<JQuery | string>;
}

const props = defineProps<Props>();

const root = useTemplateRef("root");
const resultFrame = useTemplateRef("resultFrame");

const JsDiff: Record<
  TextCompareMode,
  (
    textA: string,
    textB: string,
  ) => {
    added?: boolean;
    removed?: boolean;
    value: string;
  }[]
> = { diffChars, diffWords, diffLines } as const;

function getRawContent(l: JQuery) {
  if (l.html() === "-") {
    // 空内容的占位符
    return "";
  }
  return l
    .contents()
    .filter(
      (_, c) =>
        !/^[\s\n]*$/.test(c.textContent) &&
        c.tagName !== "SCRIPT" &&
        !c.classList.contains("common-text-menu") &&
        !c.classList.contains("common-tag-ban"),
    )
    .toArray()
    .map((e) => e.textContent)
    .join("\n");
}

/** 取出 prop 的实际取值：解包 `Ref`，DOM 节点则解析为纯文本，字符串原样返回 */
function resolveText(source: JQuery | string | Ref<JQuery | string>) {
  const value = isRef(source) ? source.value : source;
  return value instanceof Object ? getRawContent(value as JQuery) : (value as string);
}

const textA = computed(() => resolveText(props.textA));
const textB = computed(() => resolveText(props.textB));

const defaultMode = computed(() => {
  const len1 = textA.value.length;
  const len2 = textB.value.length;
  if (len1 + len2 > 5e4) return 0;
  if (len1 + len2 > 1.5e4) return 1;
  return 2;
});

const currentMode = ref<keyof typeof modes>(defaultMode.value);

/**
 * 正文被宿主整体替换后（如审核页切换待审项），按新正文长度重新选定默认对比模式，
 * 避免长正文仍按「按字对比」计算而卡顿。
 * `defaultMode` 仅依赖正文长度，用户手动切换模式不会改变它，故此处不会覆盖用户的选择。
 */
watch(defaultMode, (mode) => {
  currentMode.value = mode;
});

// const currentModeName = computed(() => {
//   return modeName[modes[currentMode.value]];
// })

const modes = {
  0: "diffLines",
  1: "diffWords",
  2: "diffChars",
} as const;

const modeName: Record<keyof typeof modes, string> = {
  0: "按行对比",
  1: "按词对比",
  2: "按字对比",
} as const;

const diff = computed(() => {
  const mode = currentMode.value;
  const result = JsDiff[modes[mode]](textA.value, textB.value); // 避免正文对比耗费过长的时间
  for (const _i in result) {
    // 移除项前移
    const i = Number(_i);
    if (result[i].added && result[i + 1] && result[i + 1].removed) {
      let swap = result[i];
      result[i] = result[i + 1];
      result[i + 1] = swap;
    }
  }
  return result;
});

const del_num = ref(0);
const del_byte = ref(0);
const ins_num = ref(0);
const ins_byte = ref(0);
const maxPos = ref(1);
const currentPos = ref(0);
const indexMap: (number | undefined)[] = [];

watch(
  () => diff.value,
  () => {
    del_num.value = 0;
    del_byte.value = 0;
    ins_num.value = 0;
    ins_byte.value = 0;
    indexMap.length = 0;
    diff.value.forEach((diff, index) => {
      if (diff.removed) {
        del_num.value++;
        del_byte.value += new TextEncoder().encode(diff.value).length;
        indexMap.push(index);
      } else if (diff.added) {
        ins_num.value++;
        ins_byte.value += new TextEncoder().encode(diff.value).length;
        indexMap.push(index);
      }
    });

    maxPos.value = del_num.value + ins_num.value;

    if (currentPos.value === 0) {
      updateNavPos();
    }
    currentPos.value = 0;
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  updateNavPos();
});

watch(
  () => currentPos.value,
  () => updateNavPos(true),
);

function updateNavPos(shouldSelect = false) {
  const container = resultFrame.value;
  if (!container || !container.ownerDocument || !maxPos.value) {
    return;
  }
  const node = $(container).find(`[data-index=${indexMap[currentPos.value]}]`).get(0);
  if (!node) {
    return;
  }
  // compareResult.value![currentPos.value];

  if (shouldSelect) {
    const range = root.value!.ownerDocument.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 1);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  const innerRect = node.getBoundingClientRect();
  const outerRect = container.getBoundingClientRect();
  let x = innerRect.x - outerRect.x;
  let y = innerRect.y - outerRect.y;
  x -= outerRect.width / 2;
  y -= outerRect.height / 2;
  x += innerRect.width / 2;
  y += innerRect.height / 2;
  container.scrollBy(x, y);
}

function onPrevClick() {
  currentPos.value--;
  if (currentPos.value < 0) {
    currentPos.value = maxPos.value - 1;
  }
}

function onNextClick() {
  currentPos.value++;
  if (currentPos.value >= maxPos.value) {
    currentPos.value = 0;
  }
}

function onModeChange(info: InputValidInfo<number>) {
  if (info.isok) {
    currentMode.value = info.final as keyof typeof modes;
  }
}
</script>
