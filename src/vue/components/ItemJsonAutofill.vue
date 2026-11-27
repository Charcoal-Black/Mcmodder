<template>
  <ul class="tab-ul">
    <li class="tab-li mcmodder-json-autofill">
      <p class="title">JSON快速填充:</p>
      <input
        v-model="raw"
        class="mcmodder-monospace form-control"
        placeholder="粘贴 JSON 物品导出行于此处以快速填充基本信息.."
        @change="
          () => error && console.warn('[Mcmodder] 试图解析或快速填充物品导出行时出现错误: ', error)
        "
      />
      <div class="mcmodder-interpolate-container" :class="raw.trim() ? '' : 'collapsed'">
        <p v-if="errorMessage" class="text-danger">{{ errorMessage }}</p>
        <p v-else-if="missingFields.length === 0" class="text-success">
          <i class="fa fa-check" /> 所有字段均已成功导入！
        </p>
        <p v-else class="text-muted">
          这些字段没有在导出行中找到：<span class="text-warning"
            ><strong>{{
              missingFields
                .map(
                  (field) =>
                    itemExportableFields[field as keyof typeof itemExportableFields] ?? field,
                )
                .join("、")
            }}</strong></span
          >
        </p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, shallowRef, watchEffect } from "vue";
import { Utils } from "../../Utils";
import type { Values } from "../../Values";

const itemExportableFields = {
  name: "主要名称",
  registerName: "注册名",
  englishName: "次要名称",
  smallIcon: "小图标",
  largeIcon: "大图标",
  OredictList: "矿物词典",
  maxStackSize: "最大叠加",
  maxDurability: "最大耐久",
  // metadata: "元数据",
} as const satisfies Partial<Record<keyof Item, ValueOf<typeof Values.itemEditFields>>>;

const raw = ref("");
const missingFields = shallowRef<string[]>([]);
const errorMessage = ref<string | null>(null);
const error = ref<unknown>(null);

watchEffect(() => {
  if (!raw.value) return;
  let data: UnpurifiedItem;
  try {
    data = JSON.parse(raw.value);
  } catch (e) {
    if (e instanceof SyntaxError)
      errorMessage.value = "解析失败，请检查输入的 JSON 语法是否正确...";
    else errorMessage.value = "试图解析物品导入行时遇到了未知错误...";
    error.value = e;
    return;
  }
  try {
    const item = Utils.normalizeExportedItem(data);

    const allFields = new Set(Object.keys(itemExportableFields));
    Object.keys(item).forEach((field) => allFields.delete(field));
    missingFields.value = [...allFields];

    item.smallIcon = Utils.appendBase64ImgPrefix(item.smallIcon);
    item.largeIcon = Utils.appendBase64ImgPrefix(item.largeIcon);
    if (item.name === item.englishName) {
      delete item.englishName;
    }
    $("[data-multi-id=name]").val(item.name);
    $("[data-multi-id=ename]").val(item.englishName ?? "");
    $("#icon-32x")
      .val(item.smallIcon ?? "")
      .change();
    $("#icon-128x")
      .val(item.largeIcon ?? "")
      .change();
    if (item.OredictList)
      item.OredictList.slice(1, item.OredictList.length - 1)
        .split(", ")
        .forEach((e) => {
          $("[data-multi-id=oredict]").prev().children().val(e).focusout();
        });
    if (item.maxDurability) $("#item-damage").val(item.maxDurability);
    $("#item-maxstack").val(item.maxStackSize ?? "");
    let regName = item.registerName ?? "";
    if (item.type === "Entity") {
      regName = regName.replace(":entities/", ":");
    }
    $("#item-regname").val(regName);
    if (item.metadata) $("#item-metadata").val(item.metadata);
  } catch (e) {
    if (e instanceof TypeError) Utils.commonMsg(e.toString(), false);
    errorMessage.value = String(e);
    error.value = e;
    return;
  }
  errorMessage.value = null;
  error.value = null;
});

defineExpose({
  raw,
});
</script>

<style lang="css">
.mcmodder-json-autofill {
  font-size: 14px;
  margin-top: var(--mcmodder-width-padding-2);
}

.mcmodder-json-autofill .form-control {
  font-size: inherit;
}

.mcmodder-json-autofill strong {
  font-size: inherit !important;
}
</style>
