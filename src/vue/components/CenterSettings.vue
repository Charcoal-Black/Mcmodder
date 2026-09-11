<template>
  <div class="center-block-head">
    <span class="title">Mcmodder设置</span>
    <span class="text">版本 v{{ McmodderValues.mcmodderVersion }} ~ ☆</span>
  </div>

  <div class="center-content">
    <template v-for="key in visibleConfigData">
      <ConfigInteractor :id="key" :cfgutils="cfgutils">
        <template #afterInput v-if="key === 'autoCheckUpdate'">
          <button
            id="mcmodder-update-check-manual"
            class="btn"
            @click="() => parent.scheduleRequestUtils.run('autoCheckUpdate')"
          >立即检查更新</button>
          <Timer :parent="parent" :data-getter="McmodderTimer.DATAGETTER_SCHEDULE(
            'autoCheckUpdate',
            null,
            parent.scheduleRequestUtils
          )" />
        </template>
        <template #afterInput v-else-if="key === 'useSupabase'">
          <!-- 等待补充仅当 useSupabase = true 时启用的逻辑 -->
          <SupabaseAuthBinder :parent="parent" />
        </template>
        <template #afterItem v-if="key === 'useSupabase'">
          <!-- 等待补充仅当 useSupabase = true 时启用的逻辑 -->
          <SupabaseConfigLoader :parent="parent" />
        </template>
      </ConfigInteractor>
    </template>
  </div>

  <div class="center-block-head">
    <span class="title">资源管理</span>
    <span style="font-size: 12px; color: gray; margin-left: 1em;">轻触各项可展开详情~</span>
  </div>

  <div class="center-content mcmodder-storage">
    <ul>
      <li v-for="props in configResourceInteractorProps">
        <ConfigResourceInteractor v-bind="props" />
      </li>
      <li v-for="props in configResourceFileListInteractorProps">
        <ConfigResourceFileListInteractor v-bind="props" />
      </li>
    </ul>
  </div>

  <div class="center-setting-block" style="margin-top: 2em;">
    <h4 style="margin-bottom: 0.5em; font-weight: bold;">投稿自定义闪烁标语</h4>
    <p class="text-muted" style="margin-bottom: 0.8em; font-size: 13px;">已登录用户可投稿标语至云端。投稿需经脚本管理员审核过审后方可被其它脚本用户抓取显示。</p>
    <div class="setting-item" style="display: flex; gap: 8px; align-items: center;">
      <input type="text" class="form-control" placeholder="输入自定义闪烁标语内容..." style="max-width: 400px; display: inline-block;" v-model="splashInput">
      <Button :on-click="submitSplash">提交投稿</button>
    </div>
  </div>

  <div class="center-setting-block" style="margin-top: 2em;">
    <div class="setting-item">
      <button class="btn" @click="emptyScheduleRequest">清除当前所有计划任务</button>
    </div>
    <p class="text-muted">这在某些时候很有用——也许吧？</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { McmodderValues } from '../../Values';
import { McmodderInputType } from '../../config/ConfigUtils';
import { McmodderTable } from '../../table/Table.ts';
import ConfigInteractor from './config/ConfigInteractor.vue';
import Timer from './Timer.vue';
import { McmodderTimer } from '../../widget/Timer.ts';
import SupabaseConfigLoader from './supabase/SupabaseConfigLoader.vue';
import ConfigResourceInteractor from './config/ConfigResourceInteractor.vue';
import { ConfigResourceInteractorProps, McmodderClassRelationData, McmodderRankDisplayData, McmodderRankStorageData, McmodderSplashData } from '../../types';
import { McmodderUtils } from '../../Utils.ts';
import ConfigResourceFileListInteractor from './config/ConfigResourceFileListInteractor.vue';
import SupabaseAuthBinder from './supabase/SupabaseAuthBinder.vue';
import Button from './Button.vue';

interface Props {
  parent: Mcmodder
}

const props = defineProps<Props>();
const cfgutils = props.parent.cfgutils;
const configData = ref(cfgutils.data);
const permission = props.parent.utils.getProfile("permission");
const visibleConfigData = computed(() => {
  const result: string[] = [];
  Object.entries(configData.value).forEach(([key, value]) => {
    const data = value;
    if (data.permission && permission < data.permission) return;
    if (data.type === McmodderInputType.KEYBIND && 
      props.parent.isMobileClient) return;
    // const entry = new McmodderConfigInteractor(key, cfgutils);
    // entry.$instance.appendTo(content);
    // interfaces.push(entry);
    result.push(key);
  });
  return result;
})

const configResourceInteractorProps = [
  {
    parent: props.parent,
    id: "mcmodderSplashList_v2",
    name: "已记录的闪烁标语",
    headConfigs: {
      time: ["时间", (data: number) => data ? (new Date(data)).toLocaleString() : "未知"],
      content: "记录内容",
      num: ["次数", McmodderTable.DISPLAYRULE_NUMBER]
    },
    configParser: config => config?.split("\n") || [], // 最后一项是空，不考虑
    dataParser: (_, data) => {
      const list = data.split(",");
      return {
        time: Number(list[0]),
        content: list[1],
        num: Number(list[2])
      }
    }
  } satisfies ConfigResourceInteractorProps<McmodderSplashData>,
  {
    parent: props.parent,
    id: "modDependences_v2",
    name: "已记录的模组前置信息",
    headConfigs: {
      id: ["模组编号", McmodderTable.DISPLAYRULE_LINK_CLASS],
      children: ["记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY]
    },
    dataParser: (key, item) => ({
      id: key,
      children: item
    })
  } satisfies ConfigResourceInteractorProps<McmodderClassRelationData>,
  {
    parent: props.parent,
    id: "modExpansions_v2",
    name: "已记录的模组拓展信息",
    headConfigs: {
      id: ["模组编号", McmodderTable.DISPLAYRULE_LINK_CENTER],
      children: ["记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY],
    },
    dataParser: (key, item) => ({
      id: key,
      children: item
    })
  } satisfies ConfigResourceInteractorProps<McmodderClassRelationData>,
  {
    parent: props.parent,
    id: "rankdata",
    name: "已保存的贡献榜数据",
    headConfigs: {
      date: ["日期", McmodderTable.DISPLAYRULE_DATE_SEC_ZH],
      byteTop1: ["字数榜首", (rawData: string) => {
        const data = rawData.split(",") as unknown as [number, number, number]; // [userID, bytes, ratio]
        return `<a target="_blank" href="${ McmodderUtils.getCenterURL(data[0]) }">${ data[0] }</a> 
          (${ data[1].toLocaleString() } 字节, ${ (data[2] * 100).toFixed(1) }%)`;
      }],
      totalEdited: ["前 60 名总编辑字数", (data: number) => `${data.toLocaleString()} 字节`],
      size: ["数据大小", McmodderTable.DISPLAYRULE_SIZE]
    }, 
    dataParser: (key, item) => {
      let list = JSON.parse(item) as McmodderRankStorageData, sum = 0;
      list.forEach(user => sum += user.value);
      return {
        date: Number(key),
        byteTop1: [list[0].user, list[0].value, list[0].value / sum].join(","),
        totalEdited: sum,
        size: item.length
      };
    }
  } satisfies ConfigResourceInteractorProps<McmodderRankDisplayData>,  
] as const;

const configResourceFileListInteractorProps = [
  {
    parent: props.parent,
    id: "mcmodderJsonStorage",
    name: "已保存的物品 JSON 文件"
  }, {
    parent: props.parent,
    id: "mcmodderRecipeJsonStorage",
    name: "已保存的合成表 JSON 文件"
  }
] as const;

function emptyScheduleRequest() {
  const list = props.parent.scheduleRequestUtils.get();
  if (list.length) {
    props.parent.scheduleRequestUtils.empty();
    McmodderUtils.commonMsg(`${ list.length.toLocaleString() } 项计划任务已被清除~`);
  } else {
    McmodderUtils.commonMsg("当前没有计划任务~");
  }
}

const splashInput = ref<string>("");
async function submitSplash() {
  const content = splashInput.value.trim();

  if (!content) {
    McmodderUtils.commonMsg("标语内容不能为空！", false);
    return;
  }

  if (!props.parent.currentUID) {
    McmodderUtils.commonMsg("请先登录 MC百科 账号后再发起投稿！", false);
    return;
  }

  const authKey = props.parent.utils.getProfile("auth_key");
  if (!authKey) {
    McmodderUtils.commonMsg("未获取到登录校验 Key，请重新登录！", false);
    return;
  }

  const res = await props.parent.supabaseUtils.uploadCustomSplash(content, authKey);

  if (res && res.message) {
    McmodderUtils.commonMsg(res.message);
    splashInput.value = "";
  }
}

</script>