<template>
  <div ref="root" class="mcmodder-logger mcmodder-monospace" v-once />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { McmodderLogger } from '../../widget/logger/Logger';
import { McmodderUtils } from '../../Utils';

interface Props {
  parent: Mcmodder
}

const props = defineProps<Props>();
const root = useTemplateRef("root");

function getScrollTopMax() {
  return root.value!.scrollHeight - root.value!.clientHeight;
}

function scrollToBottom() {
  root.value!.scrollTo(0, getScrollTopMax());
}

function write(className: string, prefix: string, message: string) {
  root.value!.insertAdjacentHTML("beforeend", `<p class="${ className }">&lt;${ McmodderUtils.getFormatted24hTime() }&gt; ${ prefix }${ message }</span>`);
  if (getScrollTopMax() - root.value!.scrollTop < 100) {
    scrollToBottom();
  }
}

function log(message: string) {
  write("info", "", message);
}

function warn(message: string) {
  write("warn", "[WARN] ", message);
}

function success(message: string) {
  write("success", "[SUCCESS] ", message);
}

function error(message: string) {
  write("error", "[ERROR] ", message);
}

function fatal(message: string) {
  write("fatal", "[FATAL] ", message);
}

function key(message: string) {
  write("key", "", message);
}

defineExpose<McmodderLogger>({
  log,
  warn,
  success,
  error,
  fatal,
  key,
  scrollToBottom
})

</script>