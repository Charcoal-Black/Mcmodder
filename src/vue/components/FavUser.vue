<template>
  <div 
    class="mcmodder-favuser"
    :class="[
      ['star', 'pin', 'heart'][configs.getSettings('favUserDisplayStyle') ?? 0],
      ...[deleteMode ? 'delete-mode' : undefined]
    ]"
    v-show="profiles.length"
  >
    <div class="title">
      最近串门
      <span class="edit" @click="onEditClick">
        <i class="fa" :class="deleteMode ? 'fa-close' : 'fa-pencil'"></i>
      </span>
    </div>
    <div class="mcmodder-favuser-container">
      <div class="content">
        <a v-for="[uid, profile] in profiles"
          class="user"
          :class="[
            [userFavList.includes(uid) ? 'user-fav' : 'user-recent'],
            ...[deleted.has(uid) ? 'deleted' : undefined]
          ]"
          :title="`${
            profile.nickname
          } · ${
            parent.utils.getProfileAbstract(profile, true, true)
          }`"
          target="_blank"
          :href="`https://center.mcmod.cn/${ uid }/`"
          @click="onUserClick($event, uid)"
        >
          <div class="avatar">
            <img :alt="profile.nickname" :src="profile.avatar">
          </div>
          <div class="nickname">{{ profile.nickname }}</div>
          <div class="nickname delete-text">移除</div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, triggerRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';

interface Props {
  parent: Mcmodder;
}

const { parent } = defineProps<Props>();
const configs = computed(() => parent.configRepository);

const userFavList = configs.value.getSettingsWritableRefAsNumberList("userFavList",
  value => value?.filter(Boolean) ?? []
);

const myProfileList = configs.value.getSettingsRefAsNumberList("myProfiles");

const recentlyVisited = configs.value.getSettingsWritableRefAsNumberList("recentlyVisited",
  value => value.filter(e => e && !userFavList.value.includes(e) && !myProfileList.value.includes(e))
);

const userList = computed(() => {
  let m_userList = [];
  if (recentlyVisited.value.length) {
    // 其实可以预处理把这一步的时间复杂度砍成常数的，但是感觉意义不大
    const userRecentMap: Map<number, number> = new Map;
    recentlyVisited.value.forEach(id => {
      const count = userRecentMap.get(id);
      userRecentMap.set(id, count ? count + 1 : 1);
    });
    const userRecentCountList: {id: number, count: number}[] = [];
    userRecentMap.forEach((count, id) => {
      userRecentCountList.push({ id: id, count: count });
    });
    const userRecentList = userRecentCountList.sort((a, b) => b.count - a.count).map(e => e.id);
    m_userList = userFavList.value.concat(userRecentList);
  } else {
    m_userList = userFavList.value;
  }
  m_userList = m_userList.filter(e => !myProfileList.value.includes(e));
  return m_userList;
})

const profiles = computed(() => {
  return userList.value.map(uid => [uid, configs.value.getAllProfile(uid)] as [number, McmodderProfileData]);
})

const deleteMode = ref(false);
const deleted = shallowRef(new Set<number>());

function onEditClick() {
  deleteMode.value = !deleteMode.value;
}

function onUserClick(e: Event, uid: number) {
  if (!deleteMode.value) {
    return;
  }
  e.preventDefault();
  deleted.value.add(uid);
  triggerRef(deleted);
  setTimeout(() => {
    deleted.value.delete(uid);
    userFavList.value = userFavList.value.filter(id => id !== uid);
    recentlyVisited.value = recentlyVisited.value.filter(id => id !== uid);
  }, 300);
}

function isEmpty() {
  return !(userList.value.length);
}

defineExpose({
  isEmpty
})

</script>