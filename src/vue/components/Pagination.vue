<template>
  <ul class="pagination common-pages" v-bind="attr">
    <template v-if="regulatedPage > 1">
      <li class="page-item" >
        <a class="page-link" @click="setPage(1)">首页</a>
      </li>
      <li class="page-item">
        <a class="page-link" @click="setPage(regulatedPage - 1)">前页</a>
      </li>
    </template>
    <li class="page-item" :class="{ active: regulatedPage === i }" v-for="i in pageRange">
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
        <NumberInput ref="input" title="" :value="regulatedPage" :range="[1, maxPage]" :on-successful-change="jump" />
        &nbsp;页
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { McmodderUtils } from '../../Utils';
import NumberInput from './input/NumberInput.vue';

interface Props {
  parent: Mcmodder,
  attr?: object,
  maxPage: number,
  callback: (page: number) => void,
  currentPage: number
}

const props = withDefaults(defineProps<Props>(), {
  maxPage: 1,
  currentPage: 1
})
const inputRef = useTemplateRef("input");

const page = ref(props.currentPage);

const RENDER_RANGE = 4;
const regulatedPage = computed(() => {
  if (!Number.isFinite(page.value)) return 1;
  const result = McmodderUtils.clamp(Math.floor(page.value), 1, props.maxPage);
  inputRef.value?.setDisplayValue(result);
  return result;
})
const pageRange = computed(() => {
  const l = Math.max(regulatedPage.value - RENDER_RANGE, 1);
  const r = Math.min(regulatedPage.value + RENDER_RANGE, Math.max(props.maxPage, 1));
  return McmodderUtils.createRange(l, r);
})

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