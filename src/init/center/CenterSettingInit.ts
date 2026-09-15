import { Mcmodder } from "../../Mcmodder";
import { McmodderValues } from "../../Values";
import { CenterBaseInit } from "./CenterBaseInit";
import { mountVueApp, OPEN_SETTINGS_EVENT } from "../../vue/mount";

/** 弹窗宿主只挂载一次（run 可能随页面 mutation 多次触发） */
let settingsModalHost: HTMLElement | null = null;

function openSettingsModal(parent: Mcmodder) {
  if (settingsModalHost) {
    document.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
    return;
  }
  // 先占位再动态加载，避免连续点击触发重复挂载
  settingsModalHost = document.createElement("div");
  document.body.appendChild(settingsModalHost);
  import("../../vue/components/SettingsModal.vue").then(({ default: SettingsModal }) => {
    mountVueApp(
      SettingsModal,
      { parent },
      settingsModalHost as HTMLElement
    );
    document.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  }).catch(() => {
    settingsModalHost?.remove();
    settingsModalHost = null;
  });
}

export class CenterSettingInit extends CenterBaseInit {
  run() {
    // 事件解绑
    $(document)
    .off("change", ".center-setting-block .checkbox")
    .off("change", ".center-setting-block .form-control")
    .off("change", ".center-setting-block .selectpicker")
    .on(
      "change",
      ".center-block[data-menu-frame!=9] .center-setting-block .checkbox",
      function () {
        const a = $(this).children('input');
        setSetting(a.attr('data-todo'), a.is(':checked') ? 1 : 0);
      }
    ).on(
      'change',
      '.center-block[data-menu-frame!=9] .center-setting-block .form-control',
      function () {
        setSetting($(this).attr('data-todo'), $(this).val().trim());
      }
    ).on(
      'change',
      '.center-block[data-menu-frame!=9] .center-setting-block .selectpicker',
      function () {
        setSetting($(this).attr('data-todo'), $(this).val());
      }
    );

    // 相关链接预览图尺寸调整
    $("#setting-link-style-preview").attr("data-content", `<img alt="link style" src="${
      McmodderValues.assets.mcmod.iconStyleSample
    }" width="220" ></a>`);

    // 脚本设置菜单：点击直接弹出设置窗口。
    // 捕获阶段拦截并阻止冒泡，避免百科页面的菜单切换逻辑将界面切到不存在的
    // data-menu-frame="9"（设置界面已完全迁移至弹窗）。
    const menuList = $("#center-setting-frame > div.center-sub-menu > ul");
    if (menuList.find("a[data-menu-select='9']").length) return;
    $("<li>").html('<a data-menu-select="9" href="javascript:void(0);">脚本设置</a>')
    .appendTo(menuList)
    .find("a")
    .get(0)
    .addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      openSettingsModal(this.getParent());
    }, true);
  }
}
