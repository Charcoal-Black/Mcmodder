<template>
  <Button ref="button" id="mcmodder-auth-manual" class="btn" :on-click="onButtonClick">立即认证</button>
  <span>当前已绑定: </span>
  <span v-if="!uid || !name" class="mcmodder-auth-user text-muted">?</span>
  <span v-else class="mcmodder-auth-user text-success">{{ name }} (UID:{{ uid }})</span>
  <span v-if="!uid || !name || !key" class="mcmodder-auth-state text-danger">
    <i class="fa fa-close" />
  </span>
  <span v-else class="mcmodder-auth-state text-success">
    <i class="fa fa-check" />
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { Mcmodder } from '../../../Mcmodder.ts';
import { Utils } from '../../../Utils.ts';
import Button from '../Button.vue';

interface Props {
  parent: Mcmodder
}
const configs = computed(() => parent.configRepository);

onMounted(() => {
  updateAuthState();
})

const { parent } = defineProps<Props>();
const uid = ref<number>();
const name = ref<string>();
const key = ref<string>();
const buttonRef = useTemplateRef("button");

function updateAuthState() {
  uid.value = configs.value.getProfile("auth_uid");
  name.value = configs.value.getProfile("auth_username");
  key.value = configs.value.getProfile("auth_key");
}

async function onButtonClick() {
  buttonRef.value?.setLoading();
  await updateAuthData();
  buttonRef.value?.completeLoading();
}

async function updateAuthData() {
  if (!parent.supabaseUtils.hasClient()) {
    return;
  }
  // `_uuid` 为 HttpOnly cookie，document.cookie 不包含它，需要通过油猴接口单独取出
  const uuid = await Utils.getUuidCookie();
  const resp = await parent.supabaseUtils.invoke<SupabaseAuthenticatorResponse>("authenticator", {
    body: { cookie: [uuid && `_uuid=${ uuid }`, document.cookie].filter(Boolean).join("; ") }
  });
  if (!resp) {
    return;
  }
  configs.value.setProfile("auth_uid", resp.user_id);
  configs.value.setProfile("auth_username", resp.user_name);
  configs.value.setProfile("auth_key", resp.auth_key);
}

</script>