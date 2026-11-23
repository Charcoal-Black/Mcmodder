<template>
  <div class="page-header">
    <h1 class="title">MC百科后台管理中心</h1>
    <ol class="breadcrumb">
      <li class="active">欢迎来到MC百科后台管理中心!</li>
    </ol>
    <div class="right">
      <div class="btn-group" role="group" aria-label="...">
        <a id="refresh-btn" href="javascript:void(0);" class="btn btn-light" data-page="pageHome"
          ><i class="fa fa-refresh"></i>战术刷新 (・ω・)</a
        >
      </div>
    </div>
  </div>
  <div class="container-widget">
    <div class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">常用链接</div>
          <div class="panel-body">
            <p>
              百科主站编辑规范：<a href="http://bbs.mcmod.cn/thread-646-1-1.html" target="_blank"
                >http://bbs.mcmod.cn/thread-646-1-1.html</a
              >
            </p>
            <p>
              MOD下载区授权综合帖：<a href="http://bbs.mcmod.cn/thread-615-1-1.html" target="_blank"
                >http://bbs.mcmod.cn/thread-615-1-1.html</a
              >
            </p>
            <p>
              申请相关(板块)：<a
                href="http://bbs.mcmod.cn/forum.php?mod=forumdisplay&fid=51"
                target="_blank"
                >http://bbs.mcmod.cn/forum.php?mod=forumdisplay&fid=51</a
              >
            </p>
            <p>
              资料删除申请帖：<a href="http://bbs.mcmod.cn/thread-341-1-1.html" target="_blank"
                >http://bbs.mcmod.cn/thread-341-1-1.html</a
              >
            </p>
            <p>
              批量添加JSON收纳帖：<a href="http://bbs.mcmod.cn/thread-1281-1-1.html" target="_blank"
                >http://bbs.mcmod.cn/thread-1281-1-1.html</a
              >
            </p>
            <p>
              百科资料“合并”与“综合”功能申请专用帖：<a
                href="http://bbs.mcmod.cn/thread-4674-1-1.html"
                target="_blank"
                >http://bbs.mcmod.cn/thread-4674-1-1.html</a
              >
            </p>
            <!--<h5>各位管理请加入百科编辑员群: 81055159</h5>-->
          </div>
        </div>
      </div>
    </div>
    <div v-if="showAdmins" class="row">
      <div class="col-md-12">
        <div class="panel panel-default">
          <div class="panel-title">我的信息</div>
          <div class="panel-body">
            <from id="from-change-user-info" action="javascript:void(0);">
              <div class="form-group">
                <label for="info-contact">联系方式</label
                ><input
                  id="info-contact"
                  type="text"
                  class="form-control"
                  placeholder="填写QQ等联系方式.."
                  value=""
                />
              </div>
              <input id="info-submit" class="btn btn-dark" type="submit" value="更新" />
            </from>
          </div>
          <hr />
          <div class="panel-title">联系方式</div>
          <div class="panel-body">
            <p>显示各管理的负责区域与联系方式，按最后登录时间排序。</p>
            <hr />
            <table class="table table-bordered table-striped table-condensed table-sm">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>用户名/昵称</th>
                  <th>用户组</th>
                  <th>编辑员区域</th>
                  <th>管理员区域</th>
                  <th>联系方式</th>
                  <th>最后登录时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="admin in admins" :key="admin.uid">
                  <td>{{ admin.uid }}</td>
                  <td>{{ name(admin) }}</td>
                  <td>{{ admin.userGroup ?? "百科编辑员" }}</td>
                  <td v-for="fieldKey in ['editors', 'managers'] as const" :key="fieldKey">
                    <template
                      v-if="
                        (fieldKey === 'editors' && admin.universalEditor) ||
                        (fieldKey === 'managers' && admin.universalManager)
                      "
                      >全域</template
                    ><template v-else-if="admin[fieldKey] === undefined">-</template>
                    <p v-for="entry in admin[fieldKey]" v-else :key="entry.id">
                      <a :href="Utils.getClassURL(entry.id)" target="_blank"
                        >ID:{{ entry.id }} {{ McmodRepository.getClass(entry.id).name }}</a
                      >&nbsp;(<span
                        data-toggle="tooltip"
                        :data-original-title="Utils.getFormattedDateTime(entry.grantedAt)"
                        >{{ Utils.getFormattedDateTime(entry.grantedAt) }}</span
                      >)
                    </p>
                  </td>
                  <td>{{ admin.contact ?? "-" }}</td>
                  <td>
                    {{ Utils.getFormattedDateTime(admin.lastLoginAt) }} ({{
                      Utils.getFormattedDateTime(admin.lastLoginAt)
                    }})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
  <RawTag tag="script" :content="frameScript" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { McmodRepository } from "../../data/McmodRepository";
import type { User } from "../../users";
import { Utils } from "../../../../src/Utils";

const { user } = defineProps<{
  user: User;
}>();

const showAdmins = computed(() => user.universalManager || user.adminModList);

const admins = computed(() =>
  showAdmins.value
    ? McmodRepository.getUsersWithEditorOrHigher().sort(
        (a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0),
      )
    : [],
);

const frameScript = `$(document).on("click","#from-change-user-info #info-submit",function(){
  var data = {};data['action'] = 'update';data['contact'] = $("#from-change-user-info #info-contact").val().trim();
  if(data['contact'].length == 0) return false;sendAction('doAdminInfo',data,$("#from-change-user-info #info-submit"));
});`;

function name(user: User) {
  if (!user.nickname || user.nickname === user.username) return user.username ?? "";
  return `${user.username} (${user.nickname})`;
}
</script>
