<template>
  <VerifyClassCell v-if="row.type === 'class'" :field-key="row.key" :data="row[role]" />
  <VerifyVersionCell v-else-if="row.type === 'version'" :field-key="row.key" :data="row[role]" />
  <VerifyItemCell v-else-if="row.type === 'item'" :field-key="row.key" :data="row[role]" />
  <VerifyTabCell
    v-else-if="row.type === 'tab'"
    :field-key="row.key"
    :data="row[role]"
    :original="row.original"
    :role="role"
  />
  <VerifyPostCell
    v-else-if="row.type === 'post'"
    :field-key="row.key"
    :data="row[role]"
    :original="row.original"
  />
  <VerifyAuthorCell v-else :field-key="row.key" :data="row[role]" :original="row.original" />
</template>

<script setup lang="ts">
import VerifyAuthorCell from "./author/VerifyAuthorCell.vue";
import VerifyClassCell from "./class/VerifyClassCell.vue";
import VerifyItemCell from "./item/VerifyItemCell.vue";
import VerifyPostCell from "./post/VerifyPostCell.vue";
import type { VerifyRow } from "./schema";
import VerifyTabCell from "./tab/VerifyTabCell.vue";
import VerifyVersionCell from "./version/VerifyVersionCell.vue";

defineProps<{
  row: VerifyRow;
  role: "original" | "current";
}>();
</script>
