<template>
  <div class="mcmodder-verify-timeline-bar">
    <div
      v-for="node in timeNodes"
      :key="node.time"
      class="mcmodder-verify-timeline-node"
      :class="[...(node === selected ? ['selected'] : []), ...classNameMap[node.type]]"
      :style="{ left: getPos(node.time) }"
      @pointerenter="onPointerenter(node)"
      @pointerleave="onPointerleave(node)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watchEffect, type Ref, type ShallowRef } from "vue";

interface Props {
  lastRefundElement: ShallowRef<JQuery>;
  lastSubmission: Ref<number>;
  assistantSuggestionElement: ShallowRef<JQuery>;
}

interface TimeNode {
  element?: JQuery;
  type: "pass" | "check" | "refund" | "waiting" | "lastRefund" | "lastSubmission";
  time: number;
}

const props = defineProps<Props>();

const lastRefund = computed(() => {
  if (props.lastRefundElement.value.length === 0) {
    return null;
  }
  const text = props.lastRefundElement.value.text();
  const timeList = text.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/);
  if (timeList === null) {
    throw new Error("`timeList` is null");
  }
  const time = timeList[0];
  return Date.parse(time);
});

const timeNodes = shallowRef<TimeNode[]>([]);
const oldest = ref(0);
const now = ref(Date.now());
const selected = shallowRef<TimeNode>();

/**
 * 原始 HTML 预览：
 * ```html
 * <div class="assistant-sug" style="margin-bottom:20px;">
 *   <ul>
 *     <li>
 *       <p>[<b class="text text-warning">需要检查</b>] 助理昵称 的意见：xxx</p>
 *       <p title="YYYY-MM-DD hh:mm:ss" class="text-muted">YYYY-MM-DD hh:mm:ss (x天前)</p>
 *     </li>
 *     <li> ... </li>
 *   </ul>
 * </div>
 * ```
 */
watchEffect(() => {
  const result: TimeNode[] = [];

  props.assistantSuggestionElement.value.find("li").each((_, li) => {
    const element = $(li);
    const className = element.find("b").attr("class").slice(10);
    let type: TimeNode["type"];

    if (className === "success") {
      type = "pass";
    } else if (className === "warning") {
      type = "check";
    } else if (className === "danger") {
      type = "refund";
    } else if (className === "") {
      type = "waiting";
    } else {
      throw new Error("未知的助理意见类型: " + className);
    }

    const timeElement = element.children().last().attr("title");
    const time = Date.parse(timeElement);
    const node = {
      element,
      type,
      time,
    };
    result.push(node);
    element.get(0).addEventListener("pointerenter", () => {
      selected.value = node;
      node.element.addClass("mcmodder-verify-sug-hover");
    });
    element.get(0).addEventListener("pointerleave", () => {
      selected.value = undefined;
      node.element.removeClass("mcmodder-verify-sug-hover");
    });

    if (lastRefund.value !== null && time <= lastRefund.value) {
      element.addClass("mcmodder-verify-sug-outdated");
    }
  });

  result.push({
    type: "lastSubmission",
    time: props.lastSubmission.value,
  });

  if (lastRefund.value !== null) {
    result.push({
      type: "lastRefund",
      time: lastRefund.value,
    });
  }

  now.value = Date.now();
  timeNodes.value = result;
  oldest.value = result.reduce((a, b) => Math.min(a, b.time), now.value);
});

function getPos(time: number) {
  return ((time - oldest.value) / (now.value - oldest.value)) * 100 + "%";
}

const classNameMap = {
  lastRefund: ["last-refund", "fa", "fa-close"],
  lastSubmission: ["last-submission", "fa", "fa-paper-plane"],
  pass: ["tap", "pass"],
  check: ["tap", "check"],
  refund: ["tap", "refund"],
  waiting: ["tap", "waiting"],
} as const satisfies Record<TimeNode["type"], string[]>;

function onPointerenter(node: TimeNode) {
  selected.value = node;
  node.element?.addClass("mcmodder-verify-sug-hover");
}

function onPointerleave(node: TimeNode) {
  selected.value = undefined;
  node.element?.removeClass("mcmodder-verify-sug-hover");
}
</script>

<style lang="css">
.mcmodder-verify-timeline-bar {
  width: calc(100% - 10px);
  height: 10px;
  margin: 10px 5px;
  background-image: linear-gradient(
    90deg,
    var(--mcmodder-color-primary-light),
    var(--mcmodder-color-accent-light)
  );
  border: 2px solid var(--mcmodder-color-background);
  border-radius: 5px;
  box-shadow: inset 1px 1px 3px var(--mcmodder-color-box-shadow);
  position: relative;
}

.mcmodder-verify-timeline-node {
  position: absolute;
  width: 16px;
  height: 16px;
  font-size: 16px;
  display: inline-block;
  top: 50%;
  transform: translate(-50%, -50%);
  transition:
    width 0.1s ease-in-out,
    height 0.1s ease-in-out,
    border-width 0.1s ease-in-out,
    font-size 0.1s ease-in-out;
}

.mcmodder-verify-timeline-node.last-refund {
  color: var(--mcmodder-color-text-danger);
}

.mcmodder-verify-timeline-node.last-submission {
  color: var(--mcmodder-color-text-primary);
}

.mcmodder-verify-timeline-node.tap {
  border: 2px solid var(--mcmodder-color-background);
  border-radius: 50%;
  box-shadow: 1px 1px 5px var(--mcmodder-color-box-shadow);
}

.mcmodder-verify-timeline-node.pass {
  background-color: var(--mcmodder-color-success);
}

.mcmodder-verify-timeline-node.check {
  background-color: var(--mcmodder-color-warning);
}

.mcmodder-verify-timeline-node.refund {
  background-color: var(--mcmodder-color-danger);
}

.mcmodder-verify-timeline-node.waiting {
  background-color: var(--mcmodder-color-primary);
}

.mcmodder-verify-timeline-node.selected {
  width: 24px;
  height: 24px;
  border-width: 3px;
  font-size: 24px;
  z-index: 1;
}

.mcmodder-verify-sug-outdated {
  opacity: 0.6;
  text-decoration: line-through;
}

.mcmodder-verify-sug-hover {
  background-color: var(--mcmodder-color-danger-light-transparent1);
}
</style>
