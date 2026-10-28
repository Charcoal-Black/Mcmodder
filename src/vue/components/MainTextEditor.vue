<template>
  <div :id="id">
    <div class="mcmodder-editor-header">
      <div class="title">
        <i class="fa" :class="icon" />
        {{ title }}
        <span v-show="requireRefresh && !warning" class="refresh-text badge-row" @click="onRefresh">
          <span class="text-danger">
            <i class="fa fa-rotate-left" />
            轻触刷新
          </span>
        </span>
      </div>
    </div>
    <div v-if="warning" class="mcmodder-editor-warning">
      <div class="mcmodder-editor-warning-content">
        <span class="mcmodder-editor-warning-title">警告</span>
        <span class="mcmodder-editor-warning-text"
          >当前编辑器内容较多，可能需要花费大量的时间来加载... 是否继续？</span
        >
        <button class="btn btn-warning" @click="onCloseWarning">仍要启用</button>
        <button class="btn" @click="onDisable">关闭此编辑器</button>
      </div>
    </div>
    <div v-show="!warning" class="mcmodder-editor-container">
      <div v-once ref="containerRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import CodeMirror from "codemirror";
import { onMounted, ref, useTemplateRef } from "vue";

interface Props {
  /** 编辑器容器上的 `id` 属性 */
  id: string;
  /** 在编辑器标题栏上显示的图标代码，置于文本之前 */
  icon: string;
  /** 在编辑器标题栏上显示的文本 */
  title: string;
  /** 传递给组件内部 CodeMirror 编辑器的配置对象 */
  options: Parameters<typeof CodeMirror>[1];
  /** 组件挂载时，决定是否需要先弹警告窗口，而不立即加载内容，以优化性能 */
  shouldWarn?: () => boolean;
}
const props = defineProps<Props>();

const containerRef = useTemplateRef("containerRef");

const warning = ref(false);
const requireRefresh = ref(false);
const editor = ref<ReturnType<typeof CodeMirror>>();

onMounted(() => {
  editor.value = CodeMirror(containerRef.value!, props.options);
  if (props.shouldWarn?.()) {
    warning.value = true;
  } else {
    emits("load");
  }
});

function onRefresh() {
  requireRefresh.value = false;
  emits("refresh");
}

function onDisable() {
  emits("disable");
}

function onCloseWarning() {
  warning.value = false;
  emits("load");
}

const emits = defineEmits<{
  refresh: [];
  disable: [];
  load: [];
}>();

defineExpose({
  editor: () => editor.value,
  requestRefresh: () => (requireRefresh.value = true),
  available: () => !warning.value && !!editor.value,
});
</script>

<style lang="css">
.mcmodder-editor-header {
  background-image: linear-gradient(
    to bottom,
    var(--mcmodder-color-background),
    var(--mcmodder-color-primary-background)
  );
  border-bottom: 1px solid var(--mcmodder-color-primary-light);
  box-shadow: 0 1px 4px var(--mcmodder-color-primary-light-transparent2);
  width: 100%;
  height: 32px;
}

.mcmodder-editor-header.refresh-text {
  font-size: 14px;
}

.mcmodder-editor-container {
  display: flex;
  overflow: auto;
  height: calc(100% - 32px);
}

.mcmodder-editor-warning-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--mcmodder-width-padding-3);
  min-height: 300px;
  margin: var(--mcmodder-width-padding-3);
  padding: 50px 10%;
  border-radius: var(--mcmodder-width-radius);
  border: 2px dashed var(--mcmodder-color-warning);
}

.mcmodder-editor-warning-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--mcmodder-color-warning-dark2);
}

.mcmodder-editor-warning-text {
  color: var(--mcmodder-color-text-warning);
}

.mcmodder-editor-container .CodeMirror {
  color: var(--mcmodder-color-text);
  padding: 0.2em var(--mcmodder-width-padding-3);
  background-color: transparent;
  width: 100%;
  height: 100%;
}

.mcmodder-editor-container .CodeMirror-scroll {
  height: 100%;
}

.mcmodder-editor-container .CodeMirror span {
  font-family: monospace;
}

.mcmodder-editor-container .CodeMirror-cursor {
  border-color: var(--mcmodder-color-text);
}

.mcmodder-editor-container .CodeMirror-selected {
  background-color: var(--mcmodder-color-accent-transparent1);
}

.mcmodder-editor-container .CodeMirror-lines {
  line-height: 1.5em;
  font-size: 14px;
}
</style>
