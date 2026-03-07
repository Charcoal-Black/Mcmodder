import { McmodderConfigInteractor } from "../../config/ConfigInterface";
import { McmodderConfigResourceInteractor } from "../../config/ConfigResourceInteractor";
import { McmodderConfigType } from "../../config/ConfigUtils";
import { Mcmodder } from "../../Mcmodder";
import { McmodderClassRelationData, McmodderFileDisplayData, McmodderRankDisplayData, McmodderRankStorageData, McmodderSplashData } from "../../types";
import { HeadConfig, McmodderTable } from "../../table/Table";
import { McmodderTimer } from "../../widget/Timer";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { CenterBaseInit } from "./CenterBaseInit";

export class CenterSettingInit extends CenterBaseInit {
  private async accessPublicSplashList(manager: McmodderConfigResourceInteractor<McmodderSplashData>) {
    const data = manager.table.getAllData().map(data => data.content);
    if (!data.length) {
      McmodderUtils.commonMsg("还没有记录任何标语呢... 用“闪烁标语追踪器”记录一些标语后再试试？");
      return;
    }
    const resp = await this.getUtils().createAsyncRequest({
      url: Mcmodder.URL_PUBLIC_SPLASH_LIST_RAW,
      method: "GET",
      timeout: 5e3
    });
    if (resp?.status === 200) return this.performSplashCompare(resp.responseText, data);
    const resp2 = await this.getUtils().createAsyncRequest({
      url: Mcmodder.URL_ALTERNATIVE_PUBLIC_SPLASH_LIST_RAW,
      method: "GET",
      timeout: 5e3
    });
    if (resp2?.status === 200) return this.performSplashCompare(resp2.responseText, data);
    McmodderUtils.commonMsg("公共标语库加载失败，请检查网络连接~", false);
  }

  private performSplashCompare(_publicList: string, localList: string[]) {
    const publicList: string[] = JSON.parse(_publicList);
    let unique: string[] = [], flag;
    localList.forEach(e => {
      if (!e) return;
      e = e.toString().replace(this.getParent().currentUsername, "%s");
      flag = true;
      publicList.forEach(f => {
        if (e === f) flag = false;
      });
      if (flag) unique.push(e);
    });
    const footer = `<a target="_blank" href="${ Mcmodder.URL_PUBLIC_SPLASH_LIST }">在 GitHub 查看公共标语库</a>`;
    if (unique.length) {
      swal.fire({
        type: "info",
        title: "对比完毕",
        html: `
          本地有 ${unique.length.toLocaleString()} 条标语尚未被公共标语库收录！<br>
          检查确认无误后，您可以通过任意方式与作者取得联系来更新完善我们的公共标语库~<br>
          未收录的标语如下：
          <textarea id="mcmodder-unique-splashes" class="form-control mcmodder-monospace">`,
        footer: footer
      });
      $("#mcmodder-unique-splashes").val(JSON.stringify(unique, null, 2));
    }
    else swal.fire({
      type: "success",
      title: "对比完毕",
      text: "本地所有标语均已被公共标语库收录~",
      footer: footer
    });
  }

  private emptyScheduleRequest() {
    const list = this.getParent().scheduleRequestUtils.get();
    if (list.length) {
      this.getParent().scheduleRequestUtils.empty();
      McmodderUtils.commonMsg(`${ list.length.toLocaleString() } 项计划任务已被清除~`);
    } else {
      McmodderUtils.commonMsg("当前没有计划任务~");
    }
  }

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
    );

    // 相关链接预览图尺寸调整
    $("#setting-link-style-preview").attr("data-content", '<img alt="link style" src="' + McmodderValues.assets.mcmod.iconStyleSample + '" width="220" ></a>');
    // 脚本设置
    let menuArea = $("div.center-main.setting.menuarea").get(0);
    $("<li>").html('<a data-menu-select="9" href="javascript:void(0);">脚本设置</a>').appendTo("#center-setting-frame > div.center-sub-menu > ul").bind("change", e => {
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

    const mcmodderSettingMenu = $('<div class="center-block hidden" data-menu-frame="9" style="display: none;">').appendTo(menuArea);
    mcmodderSettingMenu.html(
      `<div class="center-block-head">
        <span class="title">Mcmodder设置</span>
        <span class="text">版本 v${McmodderValues.mcmodderVersion} ~ ☆</span>
      </div>`);

    let content = $('<div class="center-content"></div>'), permission = this.getUtils().getProfile("permission");
    let interfaces = [];

    Object.keys(this.getParent().cfgutils.data).forEach(key => {
      const data = this.getParent().cfgutils.data[key];
      if (data.permission && permission < data.permission) return;
      if (data.type === McmodderConfigType.KEYBIND && 
        McmodderUtils.isMobileClient()) return;
      const entry = new McmodderConfigInteractor(key, this.getParent().cfgutils);
      entry.$instance.appendTo(content);
      interfaces.push(entry);
    });
    content.appendTo(mcmodderSettingMenu);

    // 手动检查更新
    const t = $('<button id="mcmodder-update-check-manual" class="btn" style="margin: 0 10px 0 10px;">立即检查更新</button>')
    .insertAfter("[for=settings-autoCheckUpdate]")
    .click(() => this.getParent().scheduleRequestUtils.run("autoCheckUpdate"))
    .parent();
    if (this.getUtils().getConfig("autoCheckUpdate")) {
      (new McmodderTimer(this.getParent(), McmodderTimer.DATAGETTER_SCHEDULE("autoCheckUpdate", null, this.getParent().scheduleRequestUtils)))
      .$instance
      .appendTo(t);
    }

    // 闪烁标语记录界面
    // $('<textarea class="form-control mcmodder-monospace" id="mcmodder-splash-text">').appendTo($("#mcmodder-settings-9").parents(".center-setting-block")).val(GM_getValue("mcmodderSplashList"));

    if (!window.matchMedia) $("[data-todo=adaptableNightMode]").parents(".center-setting-block").hide();

    mcmodderSettingMenu.append(`
    <div class="center-block-head">
      <span class="title">资源管理</span>
      <span style="font-size: 12px; color: gray; margin-left: 1em;">轻触各项可展开详情~</span>
    </div>
    <div class="center-content mcmodder-storage">
      <ul></ul>
    </div>`);

    const storages = $(".mcmodder-storage ul");
    const resourceManagers = [];
      
    const splashesManager = new McmodderConfigResourceInteractor<McmodderSplashData>(
      this.getParent(),
      "mcmodderSplashList_v2",
      "已记录的闪烁标语", {
        time: new HeadConfig("时间", data => data ? (new Date(data)).toLocaleString() : "未知"),
        content: new HeadConfig("记录内容"),
        num: new HeadConfig("次数", McmodderTable.DISPLAYRULE_NUMBER)
      },
      config => config?.split("\n") || [], // 最后一项是空，不考虑
      (_, data) => {
        const list = data.split(",");
        return {
          time: Number(list[0]),
          content: list[1],
          num: Number(list[2])
        }
      }
    );
    
    resourceManagers.push(splashesManager,
    new McmodderConfigResourceInteractor<McmodderClassRelationData>(
      this.getParent(),
      "modDependences_v2",
      "已记录的模组前置信息", {
        id: new HeadConfig("模组编号", McmodderTable.DISPLAYRULE_LINK_CLASS),
        children: new HeadConfig("记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY)
      }, null, (key, item) => new Object({
        id: key,
        children: item
      })
    ),
    new McmodderConfigResourceInteractor<McmodderClassRelationData>(
      this.getParent(),
      "modExpansions_v2",
      "已记录的模组拓展信息", {
        id: new HeadConfig("模组编号", McmodderTable.DISPLAYRULE_LINK_CENTER),
        children: new HeadConfig("记录内容", McmodderTable.DISPLAYRULE_LINK_CLASS_ARRAY)
      }, null, (key, item) => new Object({
        id: key,
        children: item
      })
    ),
    new McmodderConfigResourceInteractor<McmodderRankDisplayData>(
      this.getParent(),
      "rankdata",
      "已保存的贡献榜数据", {
        date: new HeadConfig("日期", McmodderTable.DISPLAYRULE_DATE_SEC_ZH),
        byteTop1: new HeadConfig("字数榜首", rawData => {
          const data = rawData.split(","); // [userID, bytes, ratio]
          return `<a target="_blank" href="${ McmodderUtils.getCenterURLByID(data[0]) }">${ data[0] }</a> 
            (${ data[1].toLocaleString() } 字节, ${ (data[2] * 100).toFixed(1) }%)`;
        }),
        totalEdited: new HeadConfig("前 60 名总编辑字数", data => `${data.toLocaleString()} 字节`),
        size: new HeadConfig("数据大小", McmodderTable.DISPLAYRULE_SIZE)
      }, null, (key, item) => {
        let list = JSON.parse(item) as McmodderRankStorageData, sum = 0;
        list.forEach(user => sum += user.value);
        return {
          date: Number(key),
          byteTop1: [list[0].user, list[0].value, list[0].value / sum].join(","),
          totalEdited: sum,
          size: item.length
        };
      }
    ),
    new McmodderConfigResourceInteractor<McmodderFileDisplayData>(
      this.getParent(),
      "mcmodderJsonStorage",
      "已保存的 JSON 文件", {
        fileName: new HeadConfig("文件名"),
        size: new HeadConfig("数据大小", McmodderTable.DISPLAYRULE_SIZE)
      }, null, (key, item) => ({
        fileName: key,
        size: McmodderUtils.getContextLength(JSON.stringify(item))
      })
    ));

    resourceManagers.forEach(manager => {
      const li = $("<li>").appendTo(storages);
      manager.$instance.appendTo(li);
    });
    
    splashesManager.$instance.find("a").click(_e => {
      if (splashesManager.$instance.find(`#${ Mcmodder.ID_SPLASH_COMPARE }`).length) return;
      $(`<btn class="btn" id="${ Mcmodder.ID_SPLASH_COMPARE }">与公共标语库对比</btn>`)
      .appendTo(splashesManager.$instance)
      .click(async e => {
        const button = $(e.currentTarget);
        button.addClass("disabled").append(`<i class="fa fa-pulse fa-spinner">`);
        await this.accessPublicSplashList(splashesManager);
        button.removeClass("disabled").find("i").remove();
      });
    });

    $(`<div class="center-setting-block" style="margin-top: 2em;">
      <div class="setting-item">
        <button class="btn">清除当前所有计划任务</btn>
      </div>
      <p class="text-muted">这在某些时候很有用——也许吧？</p>
    </div>`).appendTo(mcmodderSettingMenu)
    .find("button")
    .click(() => {
      this.emptyScheduleRequest();
    });
  }
}