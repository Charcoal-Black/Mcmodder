
<template>
  <Button :on-click="onUpload">
    <i class="fa fa-cloud-upload" />
    保存所有配置数据至云端
  </Button>
  <Button :on-click="onDownload">
    <i class="fa fa-cloud-download" />
    从云端同步所有配置数据
  </button>
</template>

<script setup lang="ts">
import { GM_getValue, GM_setValue } from '$';
import { Mcmodder } from '../../../Mcmodder';
import { SupabaseSyncSettingsResponse } from '../../../types';
import { McmodderUtils } from '../../../Utils.ts';
import Button from '../Button.vue';

interface Props {
  parent: Mcmodder
}

const { parent } = defineProps<Props>();

async function onUpload() {
  const { value } = await swal.fire({
    type: "warning",
    title: "配置上传确认",
    text: `即将把本地的所有脚本配置数据保存在云端（包括脚本设置、已保存的用户信息和模板列表），便于同步到其他终端设备上。
      云端若已保存配置则会被覆盖，无法撤销。是否继续？`,
    showCancelButton: true,
    confirmButtonText: "确认",
    cancelButtonText: "取消"
  });
  if (!value) return;
  const resp = await parent.supabaseUtils.invoke<SupabaseSyncSettingsResponse>("sync_settings", {
    body: {
      auth_key: parent.utils.getProfile("auth_key"),
      content: {
        mcmodder_settings: GM_getValue("mcmodderSettings"),
        user_profile: GM_getValue("userProfile"),
        template_list: GM_getValue("templateList"),
      }
    }
  });
  if (resp) {
    McmodderUtils.commonMsg("已将本地配置保存至云端~");
  }
}

async function onDownload() {
  const { value } = await swal.fire({
    type: "warning",
    title: "配置下载确认",
    text: `即将把云端所有已保存的脚本配置数据同步到本地（包括脚本设置、已保存的用户信息和模板列表）。
      本地配置将会与云端配置合并（模板则是全部覆盖），无法撤销。是否继续？`,
    showCancelButton: true,
    confirmButtonText: "确认",
    cancelButtonText: "取消"
  });
  if (!value) return;
  const resp = await parent.supabaseUtils.invoke<SupabaseSyncSettingsResponse>("sync_settings", {
    body: {
      auth_key: parent.utils.getProfile("auth_key")
    }
  });
  if (resp) {
    let success = 0;
    if (resp.mcmodder_settings) {
      try {
        const obj1 = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
        const obj2 = JSON.parse(resp.mcmodder_settings);
        GM_setValue("mcmodderSettings", JSON.stringify(Object.assign({}, obj1, obj2)));
        success++;
      }
      catch (e) {
        McmodderUtils.commonMsg(String(e), false);
      }
    }
    if (resp.user_profile) {
      try {
        const obj1 = JSON.parse(GM_getValue("userProfile") || "{}");
        const obj2 = JSON.parse(resp.user_profile);
        GM_setValue("userProfile", JSON.stringify(Object.assign({}, obj1, obj2)));
        success++;
      }
      catch (e) {
        McmodderUtils.commonMsg(String(e), false);
      }
    }
    if (resp.template_list) {
      GM_setValue("templateList", resp.template_list);
      success++;
    }
    if (success > 0) {
      const interval = Date.now() - Date.parse(resp.last_modified);
      const formatted = McmodderUtils.getFormattedTime(interval);
      McmodderUtils.commonMsg(`已将 ${
        formatted
      } 前保存在云端的 ${
        success
      } 项配置同步到本地，刷新标签页以查看同步后的配置~`);
    } else {
      McmodderUtils.commonMsg(`本地配置未发生变化...`);
    }
  }
}

</script>