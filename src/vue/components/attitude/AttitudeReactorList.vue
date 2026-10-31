<template>
  <div class="mcmodder-attitude-reactors">
    <div ref="scrollRef" class="mcmodder-attitude-reactors-scroll" @scroll.passive="onScroll">
      <template v-if="loading">
        <ReactorRow
          v-for="i in Utils.createRange(0, stickerCount)"
          :key="i"
          :parent="parent"
          :uid="-1"
        />
      </template>
      <template v-else>
        <ReactorRow
          v-for="reactor in reactors"
          :key="reactor.uid"
          :parent="parent"
          :uid="reactor.uid"
          :fallback-name="reactor.username"
          :fallback-avatar="reactor.avatar"
          :is-mine="reactor.uid === parent.currentUID"
        />
      </template>
      <div v-if="loading"></div>
      <div v-else-if="error" class="mcmodder-attitude-reactors-status">
        <span>加载失败</span>
        <button type="button" class="mcmodder-attitude-reactors-retry" @click="retry">重试</button>
      </div>
      <div v-else-if="reactors.length === 0" class="mcmodder-attitude-reactors-status">
        还没有人使用这个表态
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import ReactorRow from "./ReactorRow.vue";
import type { AttitudeReactorListProps } from "../../../types/props";
import { Utils } from "../../../Utils.ts";

const props = withDefaults(defineProps<AttitudeReactorListProps>(), {
  pageSize: 30,
  stickerCount: 1,
});
const emit = defineEmits<{ heightChange: [] }>();

const scrollRef = ref<HTMLElement>();
const reactors = ref<SupabaseAttitudeReactorRow[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref(false);
let generation = 0;

watch(
  () => [props.commentId, props.attitudeType],
  () => void load(true),
  { immediate: true },
);

watch(
  () => [reactors.value.length, loading.value, error.value],
  () => void nextTick(() => emit("heightChange")),
);

async function load(reset: boolean) {
  if (!reset && (loading.value || reactors.value.length >= total.value)) return;
  const currentGeneration = reset ? ++generation : generation;
  if (reset) {
    reactors.value = [];
    total.value = 0;
  }
  loading.value = true;
  error.value = false;
  const offset = reset ? 0 : reactors.value.length;

  try {
    const rows = await props.parent.supabaseUtils.fetchAttitudeReactors(
      props.commentId,
      props.attitudeType,
      {
        limit: props.pageSize,
        offset,
        onError: (message) => Utils.commonMsg(`表态者信息获取失败... (${message})`, false),
      },
    );
    if (currentGeneration !== generation) return;
    if (!rows) {
      error.value = true;
      return;
    }
    if (rows.length > 0) total.value = rows[0].total;
    if (reset) {
      reactors.value = rows;
    } else {
      const seen = new Set(reactors.value.map((reactor) => reactor.uid));
      reactors.value = [...reactors.value, ...rows.filter((reactor) => !seen.has(reactor.uid))];
    }
  } catch (err) {
    if (currentGeneration === generation) {
      error.value = true;
      Utils.commonMsg(`表态者信息获取失败... (${err})`, false);
    }
  } finally {
    if (currentGeneration === generation) loading.value = false;
  }
}

function onScroll() {
  const element = scrollRef.value;
  if (!element || loading.value || error.value) return;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - 32) {
    void load(false);
  }
}

function retry() {
  void load(reactors.value.length === 0);
}
</script>
