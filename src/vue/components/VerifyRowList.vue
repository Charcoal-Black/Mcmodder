<template>
  <ul class="verify-rowlist">
    <li>
      <span class="title">{{ data[1] }}</span>
      <span class="text">
        <i v-once
          data-toggle="tooltip"
          data-original-title="日常审核时间段为 19:00 ~ 次日 07:00"
          class="fa fa-question-circle"
        />
        48 小时内已处理
      </span>
    </li>
    <li>
      <span class="title">{{ data[2] }}</span>
      <span class="text">今日已处理</span>
    </li>
    <li>
      <span class="title">{{ data[3] }}</span>
      <span class="text">今日新提交</span>
    </li>
    <li>
      <span class="title">{{ data[4] }}</span>
      <span class="text">剩余待审</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
interface Props {
  data: string[]
}
defineProps<Props>();
</script>