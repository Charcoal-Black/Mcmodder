<template>
  <App>
    <div class="col-lg-12 common-frame">
      <div class="col-lg-12 common-center" style="margin-bottom: 30px">
        <div class="col-lg-12 center center-frame">
          <div
            class="center-header"
            style="background-image: url(//www.mcmod.cn/static/center/images/user/banner/1/1.jpg)"
          >
            <div class="bbs-link">
              <p align="right">
                <a href="//www.mcmod.cn/sandbox/179043.html" target="_blank">前往测试沙盒</a>
              </p>
              <p align="right">
                <a href="//bbs.mcmod.cn/center/179043/" target="_blank">前往社群个人中心</a>
              </p>
            </div>
            <div class="user-icon">
              <div class="user-icon-img">
                <img
                  alt="花海"
                  src="//i.mcmod.cn/user/avatar/17/179043/179043_1733843813_KwwG.png"
                  onerror="
                    this.src = '//www.mcmod.cn/pages/center/0/icon.gif';
                    this.onerror = null;
                  "
                />
              </div>
            </div>
            <div class="user-name">
              <span class="user-un">花海</span
              ><span class="user-lv common-user-lv lv-30">Lv.30</span>
            </div>
            <div class="user-sign">我是谁，我在哪，为什么我没有签名……</div>
          </div>
          <div class="common-menu-area">
            <div class="swiper-container common-menu-page center-menu">
              <ul class="swiper-wrapper page-ul">
                <li class="swiper-slide page-li active">
                  <a data-toggle="center-page-home" href="#/home/"
                    ><i class="fas fa-home"></i>主页</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-rank" href="#/rank/"
                    ><i class="fas fa-users"></i>等级</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-favorite" href="#/favorite/"
                    ><i class="fas fa-star"></i>收藏</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-comment" href="#/comment/"
                    ><i class="fas fa-commenting"></i>短评</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-task" href="#/task/"
                    ><i class="fas fa-calendar-check-o"></i>成就</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-item" href="#/item/"
                    ><i class="fas fa-suitcase"></i>背包</a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-card" href="#/card/"
                    ><i class="fas fa-id-card"></i>名片<span class="badge badge-sm badge-dark"
                      >beta</span
                    ></a
                  >
                </li>
                <li class="swiper-slide page-li">
                  <a data-toggle="center-page-setting" href="#/setting/"
                    ><i class="fas fa-gear"></i>设置</a
                  >
                </li>
              </ul>
            </div>
            <div class="tab-content">
              <div id="center-page-home" class="center-page tab-pane active"></div>
              <div id="center-page-card" class="center-page tab-pane"></div>
              <div id="center-page-setting" class="center-page tab-pane"></div>
              <div id="center-page-task" class="center-page tab-pane"></div>
              <div id="center-page-rank" class="center-page tab-pane"></div>
              <div id="center-page-comment" class="center-page tab-pane"></div>
              <div id="center-page-item" class="center-page tab-pane"></div>
              <div id="center-page-favorite" class="center-page tab-pane"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </App>
</template>

<script setup lang="ts">
import App from "./App.vue";
</script>
