<template>
  <ul class="pagination common-pages" v-bind="attr">
    <template v-if="regulatedPage > 1">
      <li class="page-item">
        <a class="page-link" @click="setPage(1)">首页</a>
      </li>
      <li class="page-item">
        <a class="page-link" @click="setPage(regulatedPage - 1)">前页</a>
      </li>
    </template>
    <li v-for="i in pageRange" :key="i" class="page-item" :class="{ active: regulatedPage === i }">
      <a class="page-link" @click="setPage(i)">{{ i.toLocaleString() }}</a>
    </li>
    <template v-if="regulatedPage < maxPage">
      <li class="page-item">
        <a class="page-link" @click="setPage(regulatedPage + 1)">后页</a>
      </li>
      <li class="page-item">
        <a class="page-link" @click="setPage(maxPage)">尾页</a>
      </li>
    </template>
    <li class="page-item">
      <a class="page-link page-custom">
        跳转至第&nbsp;
        <NumberInput
          ref="input"
          title=""
          :value="regulatedPage"
          :range="[1, maxPage]"
          :on-successful-change="jump"
        />
        &nbsp;页
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { Mcmodder } from "../../Mcmodder.ts";
import { Utils } from "../../Utils.ts";
import NumberInput from "./input/NumberInput.vue";

interface Props {
  parent: Mcmodder;
  attr?: object;
  maxPage?: number;
  callback: (page: number) => void;
  currentPage?: number;
}

const props = withDefaults(defineProps<Props>(), {
  attr: undefined,
  maxPage: 1,
  currentPage: 1,
});
const inputRef = useTemplateRef("input");

const page = ref(props.currentPage);

const RENDER_RANGE = 4;
const regulatedPage = computed(() => {
  if (!Number.isFinite(page.value)) return 1;
  const result = Utils.clamp(Math.floor(page.value), 1, props.maxPage);
  inputRef.value?.setDisplayValue(result);
  return result;
});
const pageRange = computed(() => {
  const l = Math.max(regulatedPage.value - RENDER_RANGE, 1);
  const r = Math.min(regulatedPage.value + RENDER_RANGE, Math.max(props.maxPage, 1));
  return Utils.createRange(l, r);
});

function setPage(newPage: number) {
  page.value = newPage;
  nextTick(() => {
    props.callback(regulatedPage.value);
  });
}

function jump() {
  const num = inputRef.value!.getValue();
  setPage(num);
}
</script>
