<template>
  <HeaderContainer />
  <slot />
  <FooterContainer />
</template>

<script setup lang="ts">
import FooterContainer from "./FooterContainer.vue";
import HeaderContainer from "./HeaderContainer.vue";
</script>
