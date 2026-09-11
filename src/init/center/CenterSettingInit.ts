import { McmodderValues } from "../../Values";
import { CenterBaseInit } from "./CenterBaseInit";
import { createApp } from "vue";
import CenterSettings from "../../vue/components/CenterSettings.vue";

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
    // 脚本设置
    let menuArea = $("div.center-main.setting.menuarea").get(0);
    $("<li>").html('<a data-menu-select="9" href="javascript:void(0);">脚本设置</a>')
    .appendTo("#center-setting-frame > div.center-sub-menu > ul")
    .bind("change", e => {
      const target = $(e.currentTarget);
      const a = target.attr("data-menu-select");
      if (a) {
        const e = target.parent().parent().parent();
        const t = e.parent().children(".center-main");
        e.children("ul").find("a").removeClass("active");
        target.addClass("active"), t.children(".center-block").hide();
        t.children(`.center-block[data-menu-frame='${a}']`).show();
      }
    });

    const mcmodderSettingMenu = $('<div class="center-block hidden" data-menu-frame="9" style="display: none;">')
    .appendTo(menuArea);
    
    createApp(CenterSettings, {
      parent: this.getParent()
    }).mount(mcmodderSettingMenu.get(0));
  }
}