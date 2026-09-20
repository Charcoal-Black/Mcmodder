<template>
  <div ref="root" id="mcmodder-text-area" v-show="del_num || ins_num">
    <div class="mcmodder-text-stats">
      <span class="stats-del" v-show="del_num">
        <span class="mcmodder-slim-danger">
          删除: <strong v-text="del_num.toLocaleString()" />处 (<strong v-text="del_byte.toLocaleString()" />字节)
        </span>
      </span>
      <span class="stats-ins" v-show="ins_num">
        <span class="mcmodder-slim-dark">
          新增: <strong v-text="ins_num.toLocaleString()" />处 (<strong v-text="ins_byte.toLocaleString()" />字节)
        </span>
      </span>
      <span class="mcmodder-jsdiff-nodiffbytes" v-show="defaultMode !== 'diffChars'">
        *正文过长，将{{
          defaultModeName
        }}而非{{
          modeName["diffChars"]
        }}，以节省性能~
      </span>
      <span class="stats-opt">
        <span class="stats-opt-nav">
          {{ (currentPos + 1).toLocaleString() }} / {{ maxPos.toLocaleString() }}
        </span>
        <a class="prev" v-show="maxPos >= 1" @click="onPrevClick">↑</a>
        <a class="next" v-show="maxPos >= 1" @click="onNextClick">↓</a>
      </span>
    </div>
    <div ref="resultFrame" id="mcmodder-text-result">
      <template v-for="(data, index) in diff">
        <del v-if="data.removed" :data-index="index">{{ data.value }}</del>
        <ins v-else-if="data.added" :data-index="index">{{ data.value }}</ins>
        <template v-else>{{ data.value }}</template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { diffChars, diffLines, diffWords } from 'diff';

interface Props {
  textA: JQuery | string,
  textB: JQuery | string
}

const props = defineProps<Props>();

const root = useTemplateRef("root");
const resultFrame = useTemplateRef("resultFrame");

const JsDiff: Record<TextCompareMode, (textA: string, textB: string) => {
  added?: boolean,
  removed?: boolean,
  value: string
}[]> = { diffChars, diffWords, diffLines } as const;

function getRawContent(l: JQuery) {
  let s = "";
  l.contents().filter((_, c) =>
    !/^[\s\n]*$/.test(c.textContent) &&
    c.tagName != "SCRIPT" &&
    c.className != "common-text-menu" &&
    c.className != "common-tag-ban"
  ).each((_, e) => {
    s += (e.textContent + "\n")
  });
  return s;
}

const defaultMode = computed<TextCompareMode>(() => {
  const len1 = textA.value.length;
  const len2 = textB.value.length;
  if (len1 + len2 > 5e4) return "diffLines";
  if (len1 + len2 > 1.5e4) return "diffWords";
  return "diffChars";
})

const defaultModeName = computed(() => {
  return modeName[defaultMode.value];
})

const modeName: Record<TextCompareMode, string> = {
  "diffLines": "按行对比",
  "diffWords": "按词对比",
  "diffChars": "按字对比"
} as const;

const textA = computed(() => {
  return (props.textA instanceof Object) ?
    getRawContent(props.textA as JQuery) :
    props.textA;
})
const textB = computed(() => {
  return (props.textB instanceof Object) ?
    getRawContent(props.textB as JQuery) :
    props.textB;
})

const diff = computed(() => {
  const mode = defaultMode.value;
  const result = JsDiff[mode](textA.value, textB.value); // 避免正文对比耗费过长的时间
  for (const _i in result) { // 移除项前移
    const i = Number(_i);
    if (result[i].added && result[i + 1] && result[i + 1].removed) {
      let swap = result[i];
      result[i] = result[i + 1];
      result[i + 1] = swap;
    }
  }
  return result;
})

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
    let cur = 0;
    indexMap.length = maxPos.value;
    diff.value.forEach((diff, index) => {
      if (diff.removed) {
        del_num.value++;
        del_byte.value += new TextEncoder().encode(diff.value).length;
        indexMap[cur++] = index;
      } else if (diff.added) {
        ins_num.value++;
        ins_byte.value += new TextEncoder().encode(diff.value).length;
        indexMap[cur++] = index;
      }
    });

    maxPos.value = del_num.value + ins_num.value;
    
    if (currentPos.value === 0) {
      updateNavPos();
    }
    currentPos.value = 0;
  }, {
    immediate: true
  }
)

onMounted(() => {
  updateNavPos();
})

watch(
  () => currentPos.value,
  () => updateNavPos(true)
)

function updateNavPos(shouldSelect = false) {
  const container = resultFrame.value;
  if (!container || !maxPos.value) {
    return;
  }
  const node = $(container).find(`[data-index=${ indexMap[currentPos.value] }]`).get(0);
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

</script>