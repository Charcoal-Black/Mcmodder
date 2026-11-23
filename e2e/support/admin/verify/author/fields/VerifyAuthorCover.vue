<template>
  <img :src="src ?? FALLBACK" width="120" height="120" onerror="this.remove()" /><template
    v-if="desc !== null"
    ><br />{{ desc }}</template
  >
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Utils } from "../../../../../../src/Utils";
import { McmodRepository } from "../../../../data/McmodRepository";

const type = computed(() => Utils.getKeys(cover["avatar-type"]!)[0]);
const value = computed(() => cover["avatar-value"]!);

const FALLBACK = "//www.mcmod.cn/static/public/images/comment-avatar.png";

const { cover } = defineProps<{
  cover: Pick<McmodAuthorEditorInnerData, "avatar-type" | "avatar-value">;
}>();

const src = computed(() => {
  if (type.value === 1) return McmodRepository.getUser(Number(value.value)).avatar ?? null;
  if (type.value === 2) return `https://avatars.githubusercontent.com/${value.value}?size=200`;
  if (type.value === 3) return Utils.appendBase64ImgPrefix(value.value);
  return null;
});

const desc = computed(() => {
  if (type.value === 1) return `绑定MC百科头像: ${value.value}`;
  if (type.value === 2) return `绑定GitHub头像: ${value.value}`;
  return null;
});
</script>
