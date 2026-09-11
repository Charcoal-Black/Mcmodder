<template>
  <div class="presubmit-list">
    <span class="mcmodder-subtitle">等待提交的预编辑</span>
    <button id="presubmit-check" class="btn btn-sm" style="margin-left: .5em;">立即检测所有预编辑项</button>
    <span class="text-muted btn-sm">距离下次检测: </span>
    <Timer :parent="parent" :data-getter="McmodderTimer.DATAGETTER_SCHEDULE(
      'autoHandlePreSubmit',
      parent.currentUID,
      parent.scheduleRequestUtils
    )" />
    <GenericTable ref="table" :parent="parent" :head-configs="headConfigs" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import GenericTable from './table/GenericTable.vue';
import { McmodderTable } from '../../table/Table.ts';
import { HeadConfigsInitializer, PreSubmitData } from '../../types';
import { McmodderValues } from '../../Values.ts';
import Timer from './Timer.vue';
import { McmodderTimer } from '../../widget/Timer.ts';
import { McmodderUtils } from '../../Utils.ts';

interface Props {
  parent: Mcmodder
}

const props = defineProps<Props>();
const headConfigs = {
  createTime: ["保存时间", McmodderTable.DISPLAYRULE_TIME_MILLISEC],
  lastSubmitTime: ["待审项提交时间", McmodderTable.DISPLAYRULE_TIME_MILLISEC],
  title: ["页面概述", (title, data) => {
    let res = `<a target="_blank" href="${ data.url }">${ title }</a>`;
    if (data.errState) res += `<br><span class="mcmodder-slim-danger">（试图提交时出现异常：${
      McmodderValues.errorMessage[data.errState]
    }）</span>`;
    return res;
  }],
  option: ["操作", (_, __) => `
    <button class="btn btn-sm mcmodder-presubmit-edit">修改</button>
    <button class="btn btn-sm mcmodder-presubmit-delete">删除</button>
  `]
} satisfies HeadConfigsInitializer<PreSubmitData>;

const tableRef = useTemplateRef("table");

onMounted(() => {
  const table = tableRef.value!;

  const preSubmitList = props.parent.utils.getProfile("preSubmitList") || [] as PreSubmitData[];
  table.setAllData(preSubmitList);
  table.refreshAll();

  $(table.root).on("click", ".mcmodder-presubmit-delete", e => {
    swal.fire({
      title: "删除确认",
      text: "确定要删除此预编辑项吗？该操作不可逆！",
      type: "question",
      confirmButtonText: "确认",
      cancelButtonText: "取消"
    }).then(isConfirm => {
      if (isConfirm.value) {
        const index = table.getElementIndex(e.currentTarget);
        table.deleteData(index);
        props.parent.utils.setProfile("preSubmitList", table.getAllData());
        McmodderUtils.commonMsg("预编辑项删除成功！");
      }
    });
  }).on("click", ".mcmodder-presubmit-edit", e => {
    const index = table.getElementIndex(e.currentTarget);
    let html = `在此处以 JSON 格式修改... <strong>**请务必保证提交格式与百科要求相匹配**</strong><br>`;
    const errState = table.getData(index).errState;
    if (errState) html += `上一次试图提交此预编辑项时遇到错误：“${ McmodderValues.errorMessage[errState] }”，在此处修改后可尝试重新提交。<br>`
    html += `<textarea class="form-control mcmodder-presubmit-editor mcmodder-monospace" />`;
    swal.fire({
      title: "修改预编辑项",
      html: html,
      customClass: "swal2-popup-wider",
      showCancelButton: true,
      confirmButtonText: "保存并退出",
      cancelButtonText: "放弃修改并退出",
      allowEscapeKey: false,
      allowOutsideClick: false,
      preConfirm: () => {
        try {
          const newData = JSON.parse(input.val());
          table.setValue(index, "rawData", newData);
          table.deleteValue(index, "errState");
          props.parent.utils.setProfile("preSubmitList", table.getAllData());
          table.refreshAll();
          McmodderUtils.commonMsg("预编辑项编辑完成！");
          return true;
        }
        catch (e) {
          McmodderUtils.commonMsg(String(e), false, (e instanceof SyntaxError) ? "解析错误" : "未知错误");
          return false;
        }
      }
    });
    var input = $(".mcmodder-presubmit-editor").val(JSON.stringify(table.getValue(index, "rawData"), null, 2));
  })
})

</script>