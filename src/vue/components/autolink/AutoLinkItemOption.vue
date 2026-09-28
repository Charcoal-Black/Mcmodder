<template>
  <div :data-index="index" :title="dataOriginalTitle" href="javascript:void(0);">
    <img class="item-img" :src="itemImgSrc" width="32" height="32" @error="onIconFail" />
    <a @click="emit('click', entry.type, dataId.toString(), dataTextHalf, dataTextFull)">
      <!-- 物品类型图标为宿主 PublicLangData.itemTypeList 拼出的 HTML，来源不完全可信 -->
      <!-- eslint-disable-next-line vue/no-v-html -- 入参为 useSanitizedHTML 清洗后的结果 -->
      <span class="item-type" v-html="safeItemTypeHTML" />
      <span class="item-id mcmodder-slim-dark">{{ itemId }}</span>
      <span v-if="classFullName" class="item-modabbr">[{{ itemAbbr }}]</span>
      <span class="item-name">
        <MatchedText :text="itemName" :ranges="entry.searchTag.ranges?.name" />
      </span>
      <span v-if="itemEnglishName" class="item-ename">
        <MatchedText :text="itemEnglishName" :ranges="entry.searchTag.ranges?.englishName" />
      </span>
    </a>
    <span v-if="index < 10" class="item-shortcut">
      <KeyDisplay :key-data="{ altKey: true, key: index.toString() }" />
    </span>
  </div>
</template>

<script setup lang="ts">
import type { AutoLinkOptionEmitPayload } from "../../../types/emits";
import type { AutoLinkOptionProps } from "../../../types/props";
import { Utils } from "../../../Utils";
import { Values } from "../../../Values";
import KeyDisplay from "../KeyDisplay";
import MatchedText from "../MatchedText";
import { useSanitizedHTML } from "../../composables/useSanitizedHTML";

const { parent, entry } = defineProps<AutoLinkOptionProps<AutoLinkItemEntry>>();

const item = entry.data;

const fullName = Utils.getItemFullName(item.name, item.englishName);

const classID = item.classID;
let classFullName = parent.utils.getClassNameByClassID(classID);
let { className, classEname, classAbbr } = Utils.parseClassFullName(classFullName);

if (!classFullName) {
  className ||= item.className || "";
  classEname ||= item.classEname || "";
  classAbbr ||= item.classAbbr || "";
  classFullName = Utils.getClassFullName(className, classEname, classAbbr);
}

const dataId = item.id;
const dataTextFull = fullName;
const dataTextHalf = item.name;
const matchedType = parent.utils.getItemTypeData(item.classID, item.itemType);
const typename = matchedType?.text ? matchedType.text + " - " : "";
const dataOriginalTitle = `${typename}ID:${item.id} ${fullName} - ${classFullName}`;

const itemImgSrc = item.smallIcon || Utils.getImageURLByItemID(item.id);
const itemImgErrorSrc = Values.assets.mcmod.emptyItemIcon32x;

const itemTypeHTML = parent.utils.getItemTypeHTML(matchedType).get(0).outerHTML;
/** 图标 HTML 源自宿主 itemTypeList，绑定 `v-html` 前统一过一遍 sanitizeHTML */
const safeItemTypeHTML = useSanitizedHTML(() => itemTypeHTML);
const itemAbbr = classAbbr || classEname || className;
const itemId = item.id;
const itemName = item.name;
const itemEnglishName = item.englishName;

function onIconFail(e: Event) {
  const img = e.currentTarget as HTMLImageElement;
  img.onerror = null;
  img.src = itemImgErrorSrc;
}

const emit = defineEmits<AutoLinkOptionEmitPayload>();
</script>
