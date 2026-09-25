<template>
  <div class="title-container">
    <i class="icon"></i>
    <span class="title">今日运势</span>
    <a href="/tools/almanacs" target="_blank"></a>
    <span class="date badge" v-if="date">
      {{ formattedChineseDate }}
    </span>
    <div class="more">
      <a v-show="prevDate" @click="get(prevDate)">←</a>
      <a v-show="nextDate" @click="get(nextDate)">→</a>
    </div>
  </div>
  <div class="content">
    <span v-if="!almanacs">暂无数据</span>
    <template v-else>
      <AlmanacsList :data="almanacs.good" class-name="good" title="宜" />
      <AlmanacsList :data="almanacs.bad" class-name="bad" title="忌" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Mcmodder } from "../../Mcmodder.ts";
import AlmanacsList from "./AlmanacsList.vue";
import { Utils } from "../../Utils.ts";

interface Props {
  parent: Mcmodder;
}

const { parent } = defineProps<Props>();

const almanacsList = parent.configRepository.getAll("almanacsList") ?? [];

const date = ref<number>(Utils.getStartTime(new Date(), 0));
const almanacs = ref<Almanacs>();
const prevDate = ref<number>(-1);
const nextDate = ref<number>(-1);

watch(
  () => date.value,
  (date) => get(date),
  {
    immediate: true,
  },
);

const formattedChineseDate = computed(() => {
  return Utils.getFormattedChineseDate(new Date(date.value));
});

async function get(date: number) {
  almanacsList.forEach((e, i) => {
    if (e.date === date) {
      almanacs.value = e;
      prevDate.value = almanacsList[i - 1]?.date;
      nextDate.value = almanacsList[i + 1]?.date;
    }
  });
  if (!almanacs.value && date === Utils.getStartTime(new Date(), 0)) {
    const resp = await parent.utils.createRequest({
      url: `${parent.hostname}/tools/almanacs`,
      method: "GET",
      headers: { "Content-Type": "text/html; charset=UTF-8" },
      anonymous: true,
    });
    let almanacs: Almanacs = {
      date: date,
      good: [],
      bad: [],
    };
    if (!resp.responseXML) {
      console.error("Error loading almanac data for today...");
      return;
    }
    let d = $(resp.responseXML);
    d.find(".good .block").each((_, c) => {
      almanacs.good.push($(c).find(".title").text(), $(c).find(".text").text());
    });
    d.find(".bad .block").each((_, c) => {
      almanacs.bad.push($(c).find(".title").text(), $(c).find(".text").text());
    });
    almanacsList.push(almanacs);
    parent.configRepository.setAll("almanacsList", almanacsList);
    get(date);
  }
}
</script>
