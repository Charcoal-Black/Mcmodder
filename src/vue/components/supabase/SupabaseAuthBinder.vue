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
import { onMounted, ref, useTemplateRef } from 'vue';
import { Mcmodder } from '../../../Mcmodder.ts';
import { SupabaseAuthenticatorResponse } from '../../../types';
import Button from '../Button.vue';

interface Props {
  parent: Mcmodder
}

onMounted(() => {
  updateAuthState();
})

const { parent } = defineProps<Props>();
const uid = ref<string>();
const name = ref<string>();
const key = ref<string>();
const buttonRef = useTemplateRef("button");

function updateAuthState() {
  uid.value = parent.utils.getProfile("auth_uid");
  name.value = parent.utils.getProfile("auth_username");
  key.value = parent.utils.getProfile("auth_key");
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
  const resp = await parent.supabaseUtils.invoke<SupabaseAuthenticatorResponse>("authenticator", {
    body: { cookie: document.cookie }
  });
  if (!resp) {
    return;
  }
  parent.utils.setProfile("auth_uid", resp.user_id);
  parent.utils.setProfile("auth_username", resp.user_name);
  parent.utils.setProfile("auth_key", resp.auth_key);
}

</script>