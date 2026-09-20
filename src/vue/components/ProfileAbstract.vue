<template>
  <span v-if="isProfileInvalid" class="text-danger">
    用户信息获取失败...
  </span>
  <template v-else>
    <span v-if="profile.userGroup === '百科编辑员'" class="mcmodder-admin-editor">百科编辑员</span>
    <span v-else-if="profile.userGroup === '资深编辑员'" class="mcmodder-admin-admin">资深编辑员</span>
    <span v-if="showLv">Lv.{{ profile.lv }}</span>
    <span v-if="profile.editNum">{{ profile.editNum.toLocaleString() }} 次编辑</span>
    <span v-if="profile.editByte">{{ profile.editByte.toLocaleString() }} 字节</span>
    <template v-if="profile.expirationDate">
      <span v-if="profile.expirationDate > Date.now()">
        登录信息
        <Timer :parent="parent" :data-getter="profile.expirationDate" />
        后过期
      </span>
      <span v-else class="text-danger">登录信息已过期（须重新登录以刷新状态）</span>
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import Timer from './Timer.vue';

interface Props {
  parent: Mcmodder,
  target: number | McmodderProfileData,
  showLv?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLv: false
})

const profile = computed(() => {
  const target = props.target;
  return typeof target === "number" ?
    props.parent.configRepository.getAllProfile(target) :
    target;
})

const isProfileInvalid = computed(() => {
  return !Object.keys(profile.value).length
})

</script>