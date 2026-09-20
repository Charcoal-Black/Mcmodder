<template>
  <div>
    <p>登录过的用户至少需要在本机访问自己的个人主页一次才会在这里显示~</p>
    <div id="mcmodder-profile-frame">
      <ul>
        <li>
          <div class="profile-option empty-profile" :class="{ 'profile-selected': !uuid }">
            -- 未登录状态 --
          </div>
        </li>
        <li v-for="[uid, profile] in myProfiles" :class="{ 'profile-selected': profile.uuid === uuid }">
          <div class="profile-option" @click="onClick($event, uid, profile)">
            <div class="avatar">
              <img :src="profile.avatar">
            </div>
            <div class="info">
              <div class="title">
                <span class="uid mcmodder-slim-dark">[UID:{{ uid }}]</span>
                <span class="username mcmodder-subtitle">{{ getSubtitle(profile) }}</span>
                <span class="lv">
                  <a :class="`common-user-lv lv-${ profile.lv }`">Lv.{{ profile.lv || "null" }}</a>
                </span>
              </div>
              <div class="text">
                <ProfileAbstract :parent="parent" :target="profile" />
                <a class="delete">
                  <i class="fa fa-trash"></i>
                </a>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import ProfileAbstract from './ProfileAbstract.vue';
import { McmodderUtils } from '../../Utils.ts';

interface Props {
  parent: Mcmodder
}

const { parent } = defineProps<Props>();
const configs = computed(() => parent.configRepository);

const myUID = configs.value.getSettingsWritableRefAsNumberList("myProfiles");
const myProfiles = computed(() => {
  return myUID.value.filter(Boolean)
  .map(uid => [uid, configs.value.getAllProfile(uid)] as [number, McmodderProfileData]);
});
const uuid = ref<string>();
McmodderUtils.getUuidCookie().then(result => uuid.value = result);

function getSubtitle(profile: McmodderProfileData) {
  return profile.username + (profile.nickname ? ` (${profile.nickname})` : "");
}

function onClick(e: Event, uid: number, profile: McmodderProfileData) {
  const target = e.target as HTMLElement;
  if (target.className === "delete" || target.parentElement?.className === "delete") {
    configs.value.delete("userProfile", uid.toString());
    myUID.value = myUID.value.filter(id => id !== uid);
    configs.value.setSettingsAsNumberList("myProfiles", myUID.value);
    return;
  }
  parent.switchProfile(uid).then(result =>{
    if (result) {
      uuid.value = profile.uuid;
    }
  })
}

</script>