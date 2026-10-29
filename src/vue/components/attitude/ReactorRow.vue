<template>
  <a
    ref="rowRef"
    class="mcmodder-attitude-reactor"
    :href="profileUrl"
    target="_blank"
    rel="noopener noreferrer"
    :title="name"
  >
    <div v-if="pending" class="mcmodder-attitude-reactor-avatar mcmodder-skeleton" />
    <template v-else>
      <img
        v-if="avatar && !avatarFailed"
        class="mcmodder-attitude-reactor-avatar"
        :src="avatar"
        alt=""
        @error="avatarFailed = true"
      />
      <span v-else class="mcmodder-attitude-reactor-avatar-placeholder">
        <i class="fa fa-user" />
      </span>
    </template>
    <span
      class="mcmodder-attitude-reactor-name"
      :class="pending ? 'mcmodder-skeleton' : ''"
      v-text="name"
    />
    <span v-if="!pending && isMine" class="mcmodder-attitude-reactor-me">我</span>
  </a>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import type { Mcmodder } from "../../../Mcmodder";
import { getStickerUploader, type StickerUploaderProfile } from "../../../attitude/stickerUploader";
import { Utils } from "../../../Utils";

interface Props {
  parent: Mcmodder;
  /** 要展示的用户 UID，`-1` 代表还不知道表态名单中具体都有谁，此时应显示为骨架屏 */
  uid: number;
  fallbackName?: string;
  fallbackAvatar?: string;
  isMine?: boolean;
}

const props = defineProps<Props>();

const rowRef = ref<HTMLElement>();
const profile = shallowRef<StickerUploaderProfile>();
const pending = computed(() => props.uid === -1);
const loading = ref(false);
const loaded = ref(false);
const avatarFailed = ref(false);
let observer: IntersectionObserver | undefined;

const name = computed(() =>
  pending.value ? "" : profile.value?.nickname || props.fallbackName || `UID:${props.uid}`,
);
const avatar = computed(() => {
  const url = profile.value?.avatar || props.fallbackAvatar;
  return url?.startsWith("//") ? `https:${url}` : url;
});
const profileUrl = computed(() =>
  pending.value ? `javascript:void(0)` : Utils.getCenterURL(props.uid),
);

/**
 * 用户资料按需爬取：列表可能很长，只给滚动视口附近的行发 UserCard 请求。
 */
onMounted(() => {
  if (pending.value) {
    return;
  }
  const element = rowRef.value;
  if (!element || !("IntersectionObserver" in window)) {
    void loadProfile();
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      observer = undefined;
      void loadProfile();
    },
    {
      root: element.closest(".mcmodder-attitude-reactors-scroll"),
      rootMargin: "80px",
    },
  );
  observer.observe(element);
});

onBeforeUnmount(() => observer?.disconnect());

async function loadProfile() {
  if (loading.value || loaded.value) return;
  loading.value = true;
  try {
    profile.value = await getStickerUploader(props.parent, props.uid);
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}
</script>
