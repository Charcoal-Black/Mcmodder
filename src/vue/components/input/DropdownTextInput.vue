<template>
  <TextInput
    ref="textInput"
    :title="title"
    :value="value"
    :on-successful-change="onSuccessfulChange"
  />
</template>

<script setup lang="ts">
/**
 * 带候选列表的文本输入：在 `TextInput` 外包一层，负责把自身登记进全局的 `InputListController`。
 *
 * 与 `DropdownMenuInput` 不同，这里**交互元素与输入元素是同一个**（`TextInput` 内部那个 input），
 * 因此无需传 `inputListBindElement`；props 直接充当 `InputListOption`（候选来源、别名等），
 * `InputList` 的匹配、补全、候选维护全部由 `TextInput` 自身的行为承接。
 */
import { onMounted, useTemplateRef } from "vue";
import TextInput from "./TextInput.vue";
import { InputListController } from "../../../widget/InputListController.ts";
import type { DropdownTextInputProps } from "../../../types/props";

const props = defineProps<DropdownTextInputProps>();
/** 内层 `TextInput` 组件实例（经它拿到真实的 input DOM） */
const inputRef = useTemplateRef("textInput");

onMounted(() => {
  // 登记的是最内层的 input：候选列表的 focus / 键盘 / 输入事件都挂在它上面
  const target = inputRef.value!.getInstance();
  InputListController.instance?.add(target as InputListBindElement, props);
});

defineExpose<InputControlRef<string>>({
  getInstance: () => inputRef.value!.getInstance(),
  getValue: () => inputRef.value!.getValue(),
  setCurrentValue: (val) => inputRef.value!.setCurrentValue(val),
  setDisplayValue: (val) => inputRef.value!.setDisplayValue(val),
});
</script>
