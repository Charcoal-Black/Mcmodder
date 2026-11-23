<template>
  <div class="page-header">
    <h1 class="title">模组区内容审核</h1>
    <ol class="breadcrumb">
      <li class="active">在这里可以对用户的编辑进行审核!</li>
    </ol>
    <div class="right">
      <div class="btn-group" role="group" aria-label="...">
        <a
          id="refresh-btn"
          href="javascript:void(0);"
          class="btn btn-light"
          data-page="pageVerifyMod"
          ><i class="fa fa-refresh"></i>战术刷新 (・ω・)</a
        >
      </div>
    </div>
  </div>
  <div class="container-widget">
    <div class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">主站通用快捷搜索功能（仅用于便捷查找）</div>
          <div class="panel-body">
            <p>
              <span
                class="btn pointer verify-mcmod-select"
                mcmod-type="common-select"
                mcmod-key="post_relation_mod"
                >搜模组</span
              ><span
                class="btn pointer verify-mcmod-select"
                mcmod-type="common-select"
                mcmod-key="post_relation_modpack"
                >搜整合包</span
              ><span
                class="btn pointer verify-mcmod-select"
                mcmod-type="common-select"
                mcmod-key="item_tools"
                >搜资料</span
              ><span
                class="btn pointer verify-mcmod-select"
                mcmod-type="common-select"
                mcmod-key="author"
                >搜作者</span
              >
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">使用提示</div>
          <div class="panel-body">
            <!--<p>添加或试图修改名称的条目会被标成<span class="text-danger">红色</span>(优先)。</p><p>正文内容无变动的条目会被标成<span class="text-muted">灰色</span>。</p>-->
            <p>点击编辑者的名字可根据编辑者筛选。</p>
            <br />
            <p>审核标准参考资料：</p>
            <p>
              <a href="//bbs.mcmod.cn/thread-646-1-1.html" target="_blank"
                >《MC百科主站编辑规范》</a
              >
            </p>
            <p>
              <a href="//bbs.mcmod.cn/thread-3036-1-1.html" target="_blank"
                >《模组(MOD)收录规则》</a
              >
            </p>
            <p>
              <a href="//bbs.mcmod.cn/thread-653-1-1.html" target="_blank">《主站通用命名规则》</a>
            </p>
            <p>
              <a href="//bbs.mcmod.cn/thread-2704-1-1.html" target="_blank"
                >《模组元素定义与优先级》</a
              >
            </p>
            <p>
              <a href="//bbs.mcmod.cn/thread-2771-1-1.html" target="_blank">《模组关系的定义》</a>
            </p>
            <br />
            <p>在线文本对比工具：</p>
            <p>
              <a href="https://kmcha.com/text-compare" target="_blank"
                >https://kmcha.com/text-compare</a
              >
            </p>
            <p>
              <a href="http://wenbenbijiao.renrensousuo.com" target="_blank"
                >http://wenbenbijiao.renrensousuo.com</a
              >
            </p>
            <p>
              <a href="https://www.jq22.com/wbdb/" target="_blank">https://www.jq22.com/wbdb/</a>
            </p>
            <p>
              <a href="http://www.jq22.com/textDifference" target="_blank"
                >http://www.jq22.com/textDifference</a
              >
            </p>
            <p>
              <a href="https://www.xuanpai.com/tiaosepan/tiaose.php" target="_blank"
                >玄派 - https://www.xuanpai.com/tiaosepan/tiaose.php</a
              >
            </p>
            <br />
            <p>错别字/病句检测工具：</p>
            <p>
              <a href="https://xiezuocat.com/" target="_blank"
                >秘塔写作猫 - https://xiezuocat.com/</a
              >
            </p>
            <p>
              <a href="https://web.mypitaya.com/writing" target="_blank"
                >Pitaya火龙果写作 - https://web.mypitaya.com/writing</a
              >
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">快速审核（按优先级）</div>
          <div class="panel-body">
            <p>
              <template v-for="(stat, index) in statsByPriority" :key="stat.user.uid">
                <a
                  class="verify-user-filter ignore-parent"
                  :data-uid="stat.user.uid"
                  data-page="pageVerifyMod-list"
                  :data-data="userFilterData([stat])"
                  href="javascript:void(0);"
                  onclick="$(this).remove()"
                  >{{ stat.user.nickname || stat.user.username }} ({{ stat.count }})
                  <span style="color: #f20">({{ stat.urgeCount }})</span></a
                >
                <template v-if="index < statsByPriority.length - 1"> | </template>
              </template>
            </p>
          </div>
          <hr />
          <div class="panel-title">快速审核（按提交数量）</div>
          <div class="panel-body">
            <p>
              <template v-for="(stat, index) in statsByCount" :key="stat.user.uid">
                <a
                  class="verify-user-filter ignore-parent"
                  :data-uid="stat.user.uid"
                  data-page="pageVerifyMod-list"
                  :data-data="userFilterData([stat])"
                  href="javascript:void(0);"
                  onclick="$(this).remove()"
                  >{{ stat.user.nickname || stat.user.username }} ({{ stat.count }})
                  <span style="color: #f20">({{ stat.urgeCount }})</span></a
                >
                <template v-if="index < statsByCount.length - 1"> | </template>
              </template>
            </p>
            <p>
              <a
                class="verify-user-filter ignore-parent"
                :data-uid="userIDs(statsByCount)"
                data-page="pageVerifyMod-list"
                :data-data="userFilterData(statsByCount)"
                href="javascript:void(0);"
                >显示以上全部</a
              >
            </p>
          </div>
          <hr />
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(statsByCount)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(statsByCount)"
              href="javascript:void(0);"
              >显示所有（优先级+提交数量）</a
            >
          </p>
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(urgedStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(urgedStats)"
              href="javascript:void(0);"
              >显示所有催审过的人</a
            >
          </p>
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(recentStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(recentStats)"
              href="javascript:void(0);"
              >显示所有72小时内提交过的人</a
            >
          </p>
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(oldWeekStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(oldWeekStats)"
              href="javascript:void(0);"
              >显示所有7天前提交过的人</a
            >
          </p>
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(oldDayStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(oldDayStats)"
              href="javascript:void(0);"
              >显示所有1天前提交过的人</a
            >
          </p>
          <hr />
          <p v-if="passedStats.length > 0">
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(passedStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(passedStats)"
              href="javascript:void(0);"
              >显示所有收到过助理意见为通过的人</a
            >
          </p>
          <p v-if="suggestedStats.length > 0">
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(suggestedStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(suggestedStats)"
              href="javascript:void(0);"
              >显示所有收到助理意见的人</a
            >
          </p>
          <p>
            <a
              class="verify-user-filter ignore-parent"
              :data-uid="userIDs(unsuggestedStats)"
              data-page="pageVerifyMod-list"
              :data-data="userFilterData(unsuggestedStats)"
              href="javascript:void(0);"
              >显示所有没收到助理意见的人</a
            >
          </p>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">按模组查找审核项</div>
          <div class="panel-body">
            <div class="select-row">
              <span>模组:</span
              ><select
                id="class-version-list"
                data-name="classID"
                class="selectpicker selectJump"
                data-frame="#connect-frame-sub"
                data-page="pageVerifyMod-list"
                data-live-search="true"
              >
                <option value="0">选择一个模组</option>
                <template v-if="managedClasses.length > 0">
                  <option
                    v-for="clazz in managedClasses"
                    :key="clazz.id"
                    :value="clazz.id"
                    :data-subtext="clazz.ename"
                  >
                    ID:{{ clazz.id }} {{ clazz.name }}
                  </option>
                </template>
                <template v-if="managedClasses.length > 0 && allClasses.length > 0">
                  <option data-divider="true"></option>
                </template>
                <template v-if="allClasses.length > 0">
                  <option value="-1">全部</option>
                  <option
                    v-for="clazz in allClasses"
                    :key="clazz.id"
                    :value="clazz.id"
                    :data-subtext="clazz.ename"
                  >
                    ID:{{ clazz.id }} {{ clazz.name }}
                  </option>
                </template>
              </select>
            </div>
            <div id="connect-frame-sub"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <RawTag tag="script" :content="frameScript" />
  <RawTag tag="style" :content="frameStyle" />
</template>

<script setup lang="ts">
import { RawTag } from "../../RawTag";
import { McmodRepository, type VerificationStats } from "../../data/McmodRepository";
import { type User } from "../../users";

/** 站点返回的主页 HTML 里带着的初始化脚本与样式，原样输出给宿主页面 */
const frameScript = `$(".verify-mcmod-select").each(function (index, element) {
  setCommonSelect($(this));
});`;
const frameStyle = ".verify-mcmod-select { margin-right: 10px; }";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const stats = McmodRepository.getVerificationStats();

/** 优先级 = 最早的待审项距今的天数 + 总催审次数 */
function priorityOf(stat: VerificationStats): number {
  return (NOW - stat.earliestSubmittedAt) / DAY + stat.urgeCount;
}

const statsByPriority = [...stats].sort((a, b) => priorityOf(b) - priorityOf(a));
const statsByCount = [...stats].sort((a, b) => b.count - a.count || priorityOf(b) - priorityOf(a));

const urgedStats = stats.filter((stat) => stat.urgeCount > 0);
const recentStats = stats.filter((stat) => NOW - stat.latestSubmittedAt <= 3 * DAY);
const oldWeekStats = stats.filter((stat) => NOW - stat.latestSubmittedAt >= 7 * DAY);
const oldDayStats = stats.filter((stat) => NOW - stat.latestSubmittedAt >= DAY);
const passedStats = stats.filter((stat) => stat.suggestionTypes.includes("pass"));
const suggestedStats = stats.filter((stat) => stat.suggestionTypes.length > 0);
const unsuggestedStats = stats.filter((stat) => stat.suggestionTypes.length === 0);

/** 快捷筛选链接携带的 UID 列表 */
function userIDs(list: VerificationStats[]): string {
  return list.map((stat) => stat.user.uid).join(",");
}

/** 快捷筛选链接的 `data-data`；与站点待审列表接口的载荷形状保持一致 */
function userFilterData(list: VerificationStats[]): string {
  return JSON.stringify({ classID: "-1", typeID: "0", userID: userIDs(list) });
}

const { user } = defineProps<{
  user: User;
}>();

const managedClasses = McmodRepository.getClassesByManager(user);
const allClasses = user.assistant || user.universalManager ? McmodRepository.getClasses() : [];
</script>
