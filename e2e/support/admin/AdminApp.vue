<template>
  <!--
    复刻自 mcmod.cn 后台框架页（admin.mcmod.cn），仅用于离线 E2E 与手动体验时的布局还原。
    页面结构、样式、图标与文案的权利归 mcmod.cn 或其权利人所有，本项目不对其主张任何权利。
  -->
  <div id="top" class="clearfix">
    <div class="applogo"><a href="/" class="logo">MC百科后台</a></div>
    <a href="#" class="sidebar-open-button"><i class="fa fa-bars"></i></a
    ><a href="#" class="sidebar-open-button-mobile"><i class="fa fa-bars"></i></a>
    <form class="searchform" action="//www.mcmod.cn/s" target="_blank" method="get">
      <input type="text" class="searchbox" name="key" placeholder="百科搜索.." /><button
        type="submit"
        class="searchbutton"
      >
        <i class="fa fa-search"></i>
      </button>
    </form>
    <a href="javascript:void(0);" class="sidepanel-open-button openpanel"
      ><i class="fa fa-codepen"></i
    ></a>
    <ul class="top-right">
      <li class="dropdown link">
        <a
          :href="Utils.getCenterURL(user.uid)"
          data-toggle="dropdown"
          class="dropdown-toggle profilebox"
          ><img :src="user.avatar" /><b>{{ user.nickname || user.username }}</b
          ><span class="caret"></span
        ></a>
        <ul class="dropdown-menu dropdown-menu-list dropdown-menu-right">
          <li>
            <a :href="Utils.getCenterURL(user.uid)" target="_blank"
              ><i class="fa falist fa-user"></i>个人中心</a
            >
          </li>
        </ul>
      </li>
    </ul>
  </div>
  <div class="sidebar">
    <div class="user-info">
      <p>
        <a :href="Utils.getCenterURL(user.uid)" target="_blank"
          ><img :src="user.avatar" :alt="user.nickname"
        /></a>
      </p>
      <p>
        <b>{{ user.nickname || user.username }}</b>
      </p>
      <p>{{ user.userGroup ?? "百科编辑员" }}</p>
    </div>
    <ul class="sidebar-panel nav">
      <li class="sidetitle">编辑员</li>
      <li>
        <a name="menuJump" data-page="pageHome" href="javascript:void(0);"
          ><span class="icon color5"><i class="fa fa-home"></i></span>首页</a
        >
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-th-large"></i></span>模组管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageModVersion" href="javascript:void(0);"
              >模组日志管理</a
            >
          </li>
        </ul>
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-th-list"></i></span>资料管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li><a name="menuJump" data-page="pageItem" href="javascript:void(0);">资料管理</a></li>
          <li>
            <a name="menuJump" data-page="pageItemType" href="javascript:void(0);">分类管理</a>
          </li>
        </ul>
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-table"></i></span>GUI管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li><a name="menuJump" data-page="pageModGUI" href="javascript:void(0);">GUI管理</a></li>
          <li>
            <a name="menuJump" data-page="pageModGUI-add" href="javascript:void(0);">添加GUI</a>
          </li>
        </ul>
      </li>
      <li>
        <a name="menuJump" data-page="pageItemTable" href="javascript:void(0);"
          ><span class="icon color5"><i class="fa fa-list-alt"></i></span>合成表管理</a
        >
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-trello"></i></span>资料类型管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageItemCategory" href="javascript:void(0);">类型管理</a>
          </li>
          <li>
            <a name="menuJump" data-page="pageItemCategory-add" href="javascript:void(0);"
              >添加类型</a
            >
          </li>
        </ul>
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-database"></i></span>缓存管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageModCache" href="javascript:void(0);"
              >模组与资料缓存</a
            >
          </li>
        </ul>
      </li>
    </ul>
    <ul class="sidebar-panel nav">
      <li class="sidetitle">管理员</li>
      <li>
        <a name="menuJump" data-page="pageVerifyMod" href="javascript:void(0);"
          ><span class="icon color5"><i class="fa fa-mortar-board"></i></span>模组区审核</a
        >
      </li>
      <li>
        <a name="menuJump" data-page="pageClassGlobal" href="javascript:void(0);"
          ><span class="icon color5"><i class="fa fa-dashboard"></i></span>模组全局设置</a
        >
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-link"></i></span>资料列表挂载<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageItemListMount" href="javascript:void(0);">挂载管理</a>
          </li>
          <li>
            <a name="menuJump" data-page="pageItemListMount-add" href="javascript:void(0);"
              >添加挂载</a
            >
          </li>
        </ul>
      </li>
      <li>
        <a name="menuJump" data-page="pageStyle" href="javascript:void(0);"
          ><span class="icon color5"><i class="fa fa-paint-brush"></i></span>样式管理</a
        >
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-flag"></i></span>黑名单<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageClassEditBlacklist" href="javascript:void(0);"
              >模组编辑黑名单管理</a
            >
          </li>
          <li>
            <a name="menuJump" data-page="pageCommentBlacklist" href="javascript:void(0);"
              >短评黑名单管理</a
            >
          </li>
          <li>
            <a name="menuJump" data-page="pageBlacklist-add" href="javascript:void(0);"
              >设置黑名单</a
            >
          </li>
        </ul>
      </li>
      <li>
        <a href="javascript:void(0);"
          ><span class="icon color14"><i class="fa fa-cloud"></i></span>模组文件管理<span
            class="caret"
          ></span
        ></a>
        <ul>
          <li>
            <a name="menuJump" data-page="pageModfileMount" href="javascript:void(0);"
              >文件列表挂载管理</a
            >
          </li>
          <li>
            <a name="menuJump" data-page="pageModfileMount-add" href="javascript:void(0);"
              >添加文件列表挂载</a
            >
          </li>
        </ul>
      </li>
    </ul>
    <div class="sidebar-plan"><span class="space">mcmod-admin-v4.0.0</span></div>
  </div>
  <div class="content">
    <div class="connect-area">
      <div id="connect-frame">
        <img alt="载入中.." src="//www.mcmod.cn/static/public/images/loading-colourful.gif" />
      </div>
    </div>
    <div class="row footer">
      <div class="col-md-12 text-left">
        ©Copyright MC百科 2013-2026 <a target="_blank" href="//www.mcmod.cn">mcmod.cn</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Utils } from "../../../src/Utils";
import type { User } from "../users";

defineProps<{
  user: User;
}>();
</script>
