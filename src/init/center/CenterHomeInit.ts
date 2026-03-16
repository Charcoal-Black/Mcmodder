import { GM_cookie } from "$";
import { AdvancementID } from "../../advancement/AdvancementUtils";
import { McmodderPermission } from "../../config/ConfigUtils";
import { McmodderProfileData } from "../../types";
import { McmodderUtils } from "../../Utils";
import { McmodderValues } from "../../Values";
import { CommentInit } from "../CommentInit";
import { CenterBaseInit } from "./CenterBaseInit";

export class CenterHomeInit extends CenterBaseInit {
  static readonly maxRecentlyVisitedLength = 100;
  private optionData: any;
  private tempData: any;
  private chartOriginalData: any;

  private getByteChartOption() {
    return {
      calendar: [{
        range: parseInt($("#center-editchart-select .filter-option-inner-inner").text())
      }],
      series: [{
        data: this.optionData
      }],
      visualMap: [{
        inRange: {
          color: ["#66CAC6", "#0078F0", "#3411B9", "#B711A9", "#680B2D", "#000000"]
        },
        range: [0, this.getUtils().getConfig("maxByteColorValue")],
        max: this.getUtils().getConfig("maxByteColorValue")
      }],
      tooltip: [{
        formatter: (e: any) => {
          var t = e.data[0], i = "";
          return this.tempData[t] && (i = ` <b>${
            this.tempData[t].toLocaleString()
          }字节</b> (约${
            parseFloat((this.tempData[t] / 3).toFixed(1)).toLocaleString()
          }汉字)`),
          "<p>" + e.marker + t.substring(5) + i + "</p>";
        }
      }]
    }
  }

  private addUserBlacklist(uid: number) {
    const userBlacklist = this.getUtils().getConfigAsNumberList("userBlacklist");
    if (userBlacklist.includes(uid)) {
      this.getUtils().setConfig("userBlacklist", userBlacklist.filter(e => e != uid).join(","));
      McmodderUtils.commonMsg(`已将 UID:${ uid } 从用户黑名单中移除~`);
    } else {
      userBlacklist.push(uid);
      this.getUtils().setConfig("userBlacklist", userBlacklist.join(","));
      McmodderUtils.commonMsg(`已将 UID:${ uid } 加入用户黑名单~`);
    }
  }

  private addUserFavlist(uid: number) {
    if (!this.center.pageProfileData) {
      throw new Error("当前页面的用户档案数据尚未初始化...");
    }
    const userFavList = this.getUtils().getConfigAsNumberList("userFavList");
    if (userFavList.includes(uid)) {
      this.getUtils().setConfig("userFavList", userFavList.filter(e => e != uid).join(","));
      if (!this.getUtils().getConfig("rememberVisited")) {
        this.getUtils().deleteAllProfile(this.center.getPageUID());
      }
      McmodderUtils.commonMsg(`已将 UID:${ uid } 移出我的收藏列表~`);
    } else {
      userFavList.push(uid);
      this.getUtils().setConfig("userFavList", userFavList.join(","));
      this.getUtils().setAllProfile(this.center.pageProfileData, this.center.getPageUID())
      McmodderUtils.commonMsg(`已将 UID:${ uid } 加入我的收藏列表~`);
    }
  }

  private initPageProfileData() {
    const metadata = $("meta[name=keywords]").attr("content").replace(",我的世界,minecraft,我的世界mod", "").split(",");
    const stats = $(".center-total ul").contents();
    const profile: McmodderProfileData = {
      avatar: $(".user-icon-img img").attr("src"),
      nickname: metadata[0],
      username: metadata[1],
      regTime: Date.parse(stats.eq(6).children().eq(1).text()),
      lv: Number($(".user-name .user-lv").text().slice(3)),
      userGroup: stats.eq(0).children().eq(1).text(),
      editByte: Number(stats.eq(2).addClass("edit-byte").children().eq(1).text().slice(0, -3).replaceAll(",", "")),
      editNum: Number(stats.eq(1).addClass("edit-num").children().eq(1).text().slice(0, -2).replaceAll(",", "")),
      editAvg: Number($(stats.get(3).textContent).children().eq(1).text().slice(0, -2).replaceAll(",", "")),
      permission: McmodderPermission.NONE
    };

    // 记录模组区域
    $(".admin-list").each((_, _c) => {
      const c = $(_c);
      let s: number[] = [], l: "editorModList" | "adminModList" | "devModList", t = c.find(".title").text();
      if (t.startsWith("编辑员")) l = "editorModList";
      else if (t.startsWith("管理员")) l = "adminModList";
      else if (t.startsWith("开发者")) l = "devModList";
      else throw new Error("未能匹配模组区域标题...");
      c.find("li a").each((_, d) => {
        s.push(Number((d as HTMLLinkElement).href.split("/class/")[1].split(".html")[0]));
      });
      const str = s.join(",");
      profile[l] = str;
    });

    // 计算权限等级
    let permission: McmodderPermission;
    if (McmodderValues.adminIDList.includes(this.getParent().currentUID)) permission = McmodderPermission.ADMIN;
    else if (profile.adminModList) permission = McmodderPermission.MANAGER;
    else if (profile.devModList) permission = McmodderPermission.DEVELOPER;
    else if (profile.editorModList) permission = McmodderPermission.EDITOR;
    else if (["禁止发言", "禁止编辑", "禁止访问"].includes(profile.userGroup)) permission = McmodderPermission.BANNED;
    else permission = McmodderPermission.NONE;
    profile.permission = permission;

    this.center.pageProfileData = profile;
  }

  private getMyProfileData() {
    const profile = this.center.pageProfileData;
    if (!profile) {
      throw new Error("当前页面的用户档案数据尚未初始化...");
    }
    return new Promise<McmodderProfileData>((resolve, reject) => {
      GM_cookie.list({ name: "_uuid" }, (cookie, err) => {
        if (err) {
          reject(err);
          return;
        }
        profile.uuid = cookie[0].value,
        profile.expirationDate = cookie[0].expirationDate ? cookie[0].expirationDate * 1e3 : -1;
        if (this.getUtils().getConfig("customAdvancements") && profile.editByte >= 1e3 && profile.editAvg >= 120) {
          this.getParent().advutils.addProgress(AdvancementID.MASTER_EDITOR);
        }
        resolve(profile);
      });
    });
  }

  private calculateAge() {
    const profile = this.center.pageProfileData;
    if (!profile) {
      throw new Error("当前页面的用户档案数据尚未初始化...");
    }
    return Math.floor((Date.now() - profile.regTime) / (24 * 60 * 60 * 1000));
  }

  run() {
    // 个人数据拓展
    this.initPageProfileData();
    const age = this.calculateAge();
    const centerTotal = $(".center-total > ul");
    const averageByte = centerTotal.contents().filter((_, content) => content.nodeType === Node.COMMENT_NODE).get(0);
    if (this.getUtils().getConfig("centerMainExpand")) {
      centerTotal.addClass("mcmodder-center-main-expand");
      $("<li>").addClass("edit-avg").html($(averageByte.textContent.replace(" 次", " 字节")).html())
      .insertBefore(centerTotal.find("li:nth-child(4)"));
      $(`<li><span class="title">科龄</span><span class="text">${
        age.toLocaleString()
      } 天</span></li>`).appendTo(centerTotal);
    }
    averageByte.remove();
    $("#mcmodder-editnum").val(this.center.pageProfileData!.editNum);
    $("#mcmodder-editbyte").val(this.center.pageProfileData!.editByte);
    $("#mcmodder-editnum, #mcmodder-editbyte").removeAttr("disabled").removeAttr("placeholder");

    const adminList = $(".admin-list");
    const adminBlock = adminList.parent();
    const adminContainer = $(`<div class="mcmodder-admin-container" />`).appendTo(adminBlock);
    adminList.appendTo(adminContainer);

    adminList.each((_, c) => {
      const title = $(c).find(".title");
      const text = title.text();
      if (text.startsWith("开发者")) title.addClass("mcmodder-admin-developer");
      else if (text.startsWith("编辑员")) title.addClass("mcmodder-admin-editor");
      else if (text.startsWith("管理员")) title.addClass("mcmodder-admin-admin");
    });

    // 模组区域压缩
    if (this.getUtils().getConfig("centerMainExpand")) $(".admin-list ul").each((_, e) => {
      if (e.clientHeight > 4e2 && e.parentElement) {
        $(e).attr("style", "max-height: 400px; overflow: hidden;");
        $('<a class="mcmodder-slim-dark" style="width: 100%; display: inline-block; text-align: center;">轻触展开</a>')
        .appendTo(e.parentElement)
        .click(f => {
          let target = f.currentTarget;
          let adminList = $(target).parent().find("ul").get(0) as HTMLElement;
          target.innerHTML = adminList.style.maxHeight === "400px" ? "轻触收起" : "轻触展开";
          adminList.style.maxHeight = (adminList.style.maxHeight === "unset" ? "400px" : "unset");
          if (adminList.style.maxHeight === "400px") target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
      }
    });

    if (this.center.isMyPage()) {
      const myProfiles = this.getUtils().getConfigAsNumberList("myProfiles");
      const pageUID = this.center.getPageUID();
      if (!myProfiles.includes(pageUID)) {
        myProfiles.push(pageUID);
        this.getUtils().setConfig("myProfiles", myProfiles.join(","));
      }
      this.getMyProfileData().then(profile => {
        this.getUtils().setAllProfile(profile);
      }).catch(err => {
        console.error(err);
        McmodderUtils.commonMsg("获取用户登录信息失败...");
      });
    }
    else if (this.getUtils().doesProfileDataExist(this.center.getPageUID())) {
      const newProfile = this.center.pageProfileData;
      if (newProfile) {
        if (this.center.isFavPage()) {
          const oldProfile = this.getUtils().getAllProfile(this.center.getPageUID());
          if (oldProfile.lastUpdated) {
            const updateDiff = Date.now() - oldProfile.lastUpdated;
            const byteDiff = newProfile.editByte - oldProfile.editByte;
            const numDiff = newProfile.editNum - oldProfile.editNum;
            const avgDiff = newProfile.editAvg - oldProfile.editAvg;
            ([
              [byteDiff, "byte"],
              [numDiff, "num"],
              [avgDiff, "avg"]
            ] as [number, string][]).forEach(value => {
              if (value[0]) {
                centerTotal.find(`.edit-${ value[1] } .text`).append(`
                <span class="changed badge-row" data-toggle="tooltip" data-original-title="与 ${
                  McmodderUtils.getFormattedTime(updateDiff)
                } 前所记录的用户数据相比的变化量">
                  <span class="text-${
                    value[0] > 0 ? "success" : "danger"
                  }">${
                    value[0] > 0 ? "+" : ""
                  }${
                    value[0].toLocaleString()
                  }</span>
                </span>`);
              }
            });
          }
        }
        this.getUtils().setAllProfile(newProfile, this.center.getPageUID());
      }
    }

    // 字数统计表
    // 使用前需要在贡献榜页面保存数据
    if (this.getUtils().getConfig("byteChart")) {
      let rawData = this.getUtils().getAllConfig("rankData", []);
      this.optionData = [[0, "center"], [1, "mcmod"], [2, "cn"]];
      this.tempData = {};
      Object.keys(rawData).forEach(t => {
        let d = new Date(Number(t) * 1e3);
        let f = `${
          1900 + d.getFullYear()
        }-${
          (1 + d.getMonth()).toString().padStart(2, '0')
        }-${
          d.getDate().toString().padStart(2, '0')
        }`;
        let r = JSON.parse(rawData[t]);
        r.forEach((i: any) => {
          if (i.user == this.center.getPageUID()) {
            this.optionData.push([f, parseInt(i.value)]);
            this.tempData[f] = parseInt(i.value);
          }
        });
      });
    }

    // 夜间模式支持
    if (this.getUtils().getConfig("nightMode")) $(".post-block img").bind("load", e => {
      const img = e.currentTarget as HTMLImageElement;
      if (img.src === McmodderValues.assets.mcmod.imagesNone) {
        img.src = McmodderValues.assets.nightMode.imagesNone;
      }
    });

    // 图表
    const editChartContainer = document.getElementById("center-editchart-obj");
    if (editChartContainer) {
      const editChartObserver = new MutationObserver(mutationList => {
        mutationList.forEach(mutation => {
          const addedNode = mutation.addedNodes[0];
          if ((addedNode.firstChild as HTMLElement)?.tagName === "CANVAS") {
            const id = editChartContainer.getAttribute("_echarts_instance_");
            const editChart = echarts.getInstanceById(id);
            this.getParent().centerEditChart = editChart;
            this.editChartInit();
          }
        });
      });
      editChartObserver.observe(editChartContainer, { childList: true });
    }

    // 更新物品提示
    this.getParent().updateItemTooltip();

    // 留言板区域
    setTimeout(() => new CommentInit(this.getParent()).run(), 1e3);

    // 用户收藏&屏蔽
    if (!this.center.isMyPage()) {
      $("div.bbs-link").append(`
        <p align="right"><a id="mcmodder-user-favlist" class="mcmodder-slim-light">收藏该用户</a></p>
        <p align="right"><a id="mcmodder-user-blacklist" class="mcmodder-slim-danger">屏蔽该用户</a></p>
      `);
      $("#mcmodder-user-favlist").click(() => this.addUserFavlist(this.center.getPageUID()));
      $("#mcmodder-user-blacklist").click(() => this.addUserBlacklist(this.center.getPageUID()));

      if (this.getUtils().getConfig("rememberVisited") && age >= 7) {
        let recentlyVisited: number[] = this.getUtils().getConfig("recentlyVisited")?.split(",") || [];
        if (recentlyVisited.length >= CenterHomeInit.maxRecentlyVisitedLength) {
          recentlyVisited = recentlyVisited.slice(-CenterHomeInit.maxRecentlyVisitedLength + 1);
        }
        recentlyVisited.push(this.center.getPageUID());
        this.getUtils().setConfig("recentlyVisited", recentlyVisited.join(","));
        this.getUtils().setAllProfile(this.center.pageProfileData!, this.center.getPageUID());
      }
    }
  }

  private editChartInit() {
    const editChart = this.getParent().centerEditChart;
    // editChart.setOption({
    //   tooltip: [{
    //     backgroundColor: "var(--mcmodder-color-background)",
    //   }],
    //   calendar: [{
    //     dayLabel: { color: "var(--mcmodder-color-text)" }, 
    //     yearLabel: { color: "var(--mcmodder-color-text-dark2)" }, 
    //     monthLabel: { color: "var(--mcmodder-color-text-dark1)" }, 
    //     itemStyle: {
    //       color: "var(--mcmodder-color-background-transparent)", // "#3330",
    //       borderColor: "var(--mcmodder-color-background-dark1)"
    //     }
    //   }]
    // });
    if (this.getUtils().getConfig("enableAprilFools")) {
      let d = editChart.getOption();
      d.series[0].data = (d.series[0].data as [number, number][]).map(t => {
        if (t[0] < 3) return t;
        return [t[0], t[1] + Math.round(Math.random() * 120)];
      });
      editChart.setOption(d);
    }
    $('<button class="mcmodder-byte-chart btn btn-light">转为字数统计</button>')
    .appendTo($(".edit-chart-frame").first())
    .click(e => {
      this.switchDisplayMode(e);
    });
    this.getParent().updateNightMode();
  }

  private switchDisplayMode(e: JQueryKeyEventObject) {
    const target = e.currentTarget;
    const editChart = this.getParent().centerEditChart;
    if (target.textContent === "转为字数统计") {
      $(target).parent().find(".title-sub").text("历史成功完成改动操作的字数");
      this.chartOriginalData = editChart.getOption();
      editChart.setOption(this.getByteChartOption());
      target.innerHTML = "转为次数统计";
    } else {
      editChart.setOption(Object.assign(this.chartOriginalData, {
        calendar: [{
          range: parseInt($("#center-editchart-select .filter-option-inner-inner").text())
        }]
      }));
      $(target).parent().find(".title-sub").html("历史成功完成改动操作的次数");
      target.innerHTML = "转为字数统计";
    }
  }
}