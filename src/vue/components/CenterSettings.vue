<template>
  <div class="center-block-head">
    <span class="title">Mcmodder设置</span>
    <span class="text">版本 v{{ Values.mcmodderVersion }} ~ ☆</span>
  </div>

  <div class="center-content">
    <template v-for="key in visibleConfigData">
      <ConfigInteractor :id="key" :cfgutils="cfgutils" :configs="configs">
        <template #afterInput v-if="key === 'autoCheckUpdate'">
          <button
            id="mcmodder-update-check-manual"
            class="btn"
            @click="() => parent.scheduleRequestUtils.run('autoCheckUpdate')"
          >立即检查更新</button>
          <Timer :parent="parent" :data-getter="TimerUtils.DATAGETTER_SCHEDULE(
            'autoCheckUpdate',
            null,
            parent.scheduleRequestUtils
          )" />
        </template>
        <template #afterInput v-else-if="key === 'useSupabase'">
          <span v-show="configs.getSettingsRef('useSupabase').value">
            <SupabaseAuthBinder :parent="parent" />
          </span>
        </template>
        <template #afterItem v-if="key === 'useSupabase'">
          <div v-show="configs.getSettingsRef('useSupabase').value">
            <SupabaseConfigLoader :parent="parent" />
          </div>
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
import { computed, ref, shallowRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { Values } from '../../Values';
import { InputType } from '../../config/ConfigUtils';
import { TableUtils } from '../../table/Table.ts';
import ConfigInteractor from './config/ConfigInteractor.vue';
import Timer from './Timer.vue';
import { TimerUtils } from '../../widget/Timer.ts';
import SupabaseConfigLoader from './supabase/SupabaseConfigLoader.vue';
import ConfigResourceInteractor from './config/ConfigResourceInteractor.vue';
import { Utils } from '../../Utils.ts';
import ConfigResourceFileListInteractor from './config/ConfigResourceFileListInteractor.vue';
import SupabaseAuthBinder from './supabase/SupabaseAuthBinder.vue';
import Button from './Button.vue';
import type { ConfigResourceFileListInteractorProps, ConfigResourceInteractorProps } from '../../types/props';

interface Props {
  parent: Mcmodder
}

const props = defineProps<Props>();
const configs = computed(() => props.parent.configRepository);
const cfgutils = props.parent.cfgutils;
const configOption = shallowRef(cfgutils.data);
const permission = props.parent.configRepository.getProfile("permission");
const visibleConfigData = computed(() => {
  const result: (keyof Settings)[] = [];
  (Object.entries(configOption.value) as [keyof Settings, ConfigOption][]).forEach(([key, value]) => {
    const data = value;
    if (data.permission && permission < data.permission) return;
    if (data.type === InputType.KEYBIND && 
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
    rowOptions: {
      time: ["时间", (data: number) => data ? (new Date(data)).toLocaleString() : "未知"],
      content: "记录内容",
      num: ["次数", TableUtils.DISPLAYRULE_NUMBER]
    },
    configParser: config => config?.split("\n") || [], // 最后一项是空，不考虑
    dataParser: (_, data) => {
      const list = (data as string).split(",");
      return {
        time: Number(list[0]),
        content: list[1],
        num: Number(list[2])
      } as Splash;
    }
  } satisfies ConfigResourceInteractorProps<"mcmodderSplashList_v2", string[], Splash>,
  {
    parent: props.parent,
    id: "modDependences_v2",
    name: "已记录的模组前置信息",
    rowOptions: {
      id: ["模组编号", TableUtils.DISPLAYRULE_LINK_CLASS],
      children: ["记录内容", TableUtils.DISPLAYRULE_LINK_CLASS_ARRAY]
    },
    dataParser: (key, item) => ({
      id: Number(key),
      children: item as number[]
    } as any) // ???
  } satisfies ConfigResourceInteractorProps<"modDependences_v2", Record<string, number[]>, ClassRelation>,
  {
    parent: props.parent,
    id: "modExpansions_v2",
    name: "已记录的模组拓展信息",
    rowOptions: {
      id: ["模组编号", TableUtils.DISPLAYRULE_LINK_CENTER],
      children: ["记录内容", TableUtils.DISPLAYRULE_LINK_CLASS_ARRAY],
    },
    dataParser: (key, item) => ({
      id: Number(key),
      children: item as number[]
    })
  } satisfies ConfigResourceInteractorProps<"modExpansions_v2", Record<string, number[]>, ClassRelation>,
  {
    parent: props.parent,
    id: "rankData",
    name: "已保存的贡献榜数据",
    rowOptions: {
      date: ["日期", TableUtils.DISPLAYRULE_DATE_SEC_ZH],
      byteTop1: ["字数榜首", (rawData: string) => {
        const data = rawData.split(",") as unknown as [number, number, number]; // [userID, bytes, ratio]
        return `<a target="_blank" href="${ Utils.getCenterURL(data[0]) }">${ data[0] }</a> 
          (${ data[1].toLocaleString() } 字节, ${ (data[2] * 100).toFixed(1) }%)`;
      }],
      totalEdited: ["前 60 名总编辑字数", (data: number) => `${data.toLocaleString()} 字节`],
      size: ["数据大小", TableUtils.DISPLAYRULE_SIZE]
    }, 
    dataParser: (key, item) => {
      let list = JSON.parse(item as string) as RankStorage, sum = 0;
      list.forEach(user => sum += user.value);
      return {
        date: Number(key),
        byteTop1: [list[0].user, list[0].value, list[0].value / sum].join(","),
        totalEdited: sum,
        size: (item as string).length
      };
    }
  } satisfies ConfigResourceInteractorProps<"rankData", Record<string, string>, RankDisplay>,  
] as const;

const configResourceFileListInteractorProps = [
  {
    parent: props.parent,
    id: "mcmodderJsonStorage",
    name: "已保存的物品 JSON 文件（仅脚本存储）"
  } satisfies ConfigResourceFileListInteractorProps<"mcmodderJsonStorage">,
  {
    parent: props.parent,
    id: "mcmodderRecipeJsonStorage",
    name: "已保存的合成表 JSON 文件（仅脚本存储）"
  } satisfies ConfigResourceFileListInteractorProps<"mcmodderRecipeJsonStorage">
] as const;

function emptyScheduleRequest() {
  const list = props.parent.scheduleRequestUtils.get();
  if (list.length) {
    props.parent.scheduleRequestUtils.empty();
    Utils.commonMsg(`${ list.length.toLocaleString() } 项计划任务已被清除~`);
  } else {
    Utils.commonMsg("当前没有计划任务~");
  }
}

const splashInput = ref<string>("");
async function submitSplash() {
  const content = splashInput.value.trim();

  if (!content) {
    Utils.commonMsg("标语内容不能为空！", false);
    return;
  }

  if (!props.parent.currentUID) {
    Utils.commonMsg("请先登录 MC百科 账号后再发起投稿！", false);
    return;
  }

  const authKey = configs.value.getProfile("auth_key");
  if (!authKey) {
    Utils.commonMsg("未获取到登录校验 Key，请重新登录！", false);
    return;
  }

  const res = await props.parent.supabaseUtils.uploadCustomSplash(content, authKey);

  if (res && res.message) {
    Utils.commonMsg(res.message);
    splashInput.value = "";
  }
}

</script>