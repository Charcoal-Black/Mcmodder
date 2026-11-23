<template>
  <div
    data-toggle="tooltip"
    :data-original-title="`<p class='item-table-hover-t1'>${
      itemId === 0 ? guiSlot.id : McmodRepository.getItem(itemId).name
    } </p><p class='item-table-hover-t2'><b>${
      itemId === 0 ? '' : McmodRepository.getClass(McmodRepository.getItem(itemId).classID).name
    }</b></p>`"
    data-html="true"
    :item-id="itemId"
    class="item-table-hover"
    :style="{
      margin: `${guiSlot.y}px 0 0 ${guiSlot.x}px`,
    }"
  >
    <!-- `size` 只决定应当显示资料的大图标还是小图标，图标实际尺寸永远是 32，即使是 BUFF/DEBUFF 也是如此 -->
    <a
      target="_blank"
      :href="guiSlot.isTag ? Utils.getOredictURL(guiSlot.id) : Utils.getItemURL(itemId)"
      ><img
        :alt="guiSlot.isTag ? guiSlot.id : McmodRepository.getItem(itemId).name"
        :src="Utils.getImageURLByItemID(itemId, guiSlot.size)"
        width="32"
        height="32"
        :onerror="`this.src='${Utils.getImageURLByItemID(0, guiSlot.size)}';this.onerror=null;`"
    /></a>
  </div>
</template>

<script setup lang="ts">
import { Utils } from "../../../../../../src/Utils";
import { McmodRepository } from "../../../../data/McmodRepository";
import type { GUISlot } from "../schema";

defineProps<{
  guiSlot: GUISlot;
  itemId: number;
}>();
</script>
