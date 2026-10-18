<template>
  <ButtonWithSpinner id="mcmodder-auth-manual" ref="button" class="btn btn-success" :on-click="onAuthButtonClick"
    >立即认证</ButtonWithSpinner
  >
  <ButtonWithSpinner id="mcmodder-auth-withkey" ref="button" class="btn" :on-click="onKeyButtonClick"
    >使用密钥认证</ButtonWithSpinner
  >
  <span>当前已绑定: </span>
  <span v-if="!uid || !name" class="mcmodder-auth-user text-muted">?</span>
  <span v-else class="mcmodder-auth-user text-success">{{ name }} (UID:{{ uid }})</span>
  <span v-if="!uid || !name || !key" class="mcmodder-auth-state text-danger">
    <i class="fa fa-close" />
  </span>
  <template v-else>
    <span class="mcmodder-auth-state text-success">
      <i class="fa fa-check" />
    </span>
    <span class="mcmodder-auth-state-key-bar text-muted">
      密钥:
      <span class="mcmodder-auth-state-key-container">
        <span v-if="keyVisible" class="mcmodder-monospace" v-text="key" />
        <input v-else class="mcmodder-auth-state-key mcmodder-monospace" type="password" readonly autocomplete="off" :value="' '.repeat(key.length)" />
      </span>
      <a tabindex=0 @click="onToggleVisibility">
        <i v-if="keyVisible" class="fa fa-eye-slash" title="隐藏密钥" />
        <i v-else class="fa fa-eye" title="显示密钥" />
      </a>
      <a tabindex=0 @click="onCopyKey">
        <i v-if="keyCopied" class="fa fa-check" title="复制成功" />
        <i v-else class="fa fa-copy" title="复制密钥" />
      </a>
    </span>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { Mcmodder } from "../../../Mcmodder.ts";
import { Utils } from "../../../Utils.ts";
import ButtonWithSpinner from "../ButtonWithSpinner.vue";

interface Props {
  parent: Mcmodder;
}
const configs = computed(() => parent.configRepository);

onMounted(() => {
  updateAuthState();
});

const { parent } = defineProps<Props>();
const uid = ref<number>();
const name = ref<string>();
const key = ref<string>();
const buttonRef = useTemplateRef("button");
const keyVisible = ref(false);
const keyCopied = ref(false);

function updateAuthState() {
  uid.value = configs.value.getProfile("auth_uid");
  name.value = configs.value.getProfile("auth_username");
  key.value = configs.value.getProfile("auth_key");
}

async function onAuthButtonClick() {
  buttonRef.value?.setLoading();
  await updateAuthData();
  buttonRef.value?.completeLoading();
}

async function onKeyButtonClick() {
  swal.fire({
    text: "输入用户认证密钥，用于本地多浏览器共享认证信息...",
    input: "password",
    preConfirm: async (resp: string) => {
      const uuid = resp.trim();
      if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/g.test(uuid)) {
        Utils.commonMsg("密钥需要是一个合法的 UUID 字符串...", false);
        return false;
      }
      await updateAuthData(uuid);
    }
  })
}

async function updateAuthData(withKey?: string) {
  if (!parent.supabaseUtils.hasClient()) {
    return;
  }
  // `_uuid` 为 HttpOnly cookie，document.cookie 不包含它，需要通过油猴接口单独取出
  const uuid = await Utils.getUuidCookie();
  const resp = await parent.supabaseUtils.invoke<SupabaseAuthenticatorResponse>("authenticator", {
    body: {
      cookie: [uuid && `_uuid=${uuid}`, document.cookie].filter(Boolean).join("; "),
      ...(withKey ? { auth_key: withKey } : undefined) // 若同时传入了 auth_key 且与云端的 auth_key 匹配，则认证时不重置 auth_key
    },
  });
  if (!resp) {
    return;
  }
  configs.value.setProfile("auth_uid", resp.user_id);
  configs.value.setProfile("auth_username", resp.user_name);
  configs.value.setProfile("auth_key", resp.auth_key);
  updateAuthState();
}

function onToggleVisibility() {
  keyVisible.value = !keyVisible.value;
}

function onCopyKey() {
  if (key.value === undefined) {
    return;
  }
  navigator.clipboard.writeText(key.value);
  keyCopied.value = true;
  setTimeout(() => {
    keyCopied.value = false;
  }, 1500);
}
</script>

<style lang="css">
.mcmodder-auth-state-key-bar {
  display: inline-flex;
  gap: var(--mcmodder-width-padding-3);
}

.mcmodder-auth-state-key-container {
  width: 22em;
  display: inline-block;
}

.mcmodder-auth-state-key-bar a {
  color: var(--mcmodder-color-text-dark2);
}

.mcmodder-auth-state-key-bar a:hover {
  color: var(--mcmodder-color-accent-dark2);
}

.mcmodder-auth-state-key {
  border: 0;
  padding: 0;
  background: none;
  box-shadow: 0 0;
  user-select: none;
  cursor: inherit;
  color: inherit;
  width: 100%;
}
</style>
