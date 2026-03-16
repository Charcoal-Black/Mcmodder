import { ItemTypeData, ItemCustomTypeList } from "../types";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";
import svgPlarformForge from "../assets/platform/forge.svg";
import svgPlatformFabric from "../assets/platform/fabric.svg";
import svgPlatformNeoforge from "../assets/platform/neoforge.svg";
import svgPlatformQuilt from "../assets/platform/quilt.svg";
import svgPlatformRift from "../assets/platform/rift.svg";
import svgPlatformLiteloader from "../assets/platform/liteloader.svg";
import svgPlatformDefault from "../assets/platform/default.svg";

export class ClassPageInit extends McmodderInit {

  static classPageRegExp = /class\/[0-9]*\.html/;
  static modpackPageRegExp = /modpack\/[0-9]*\.html/;
  private isClassPage?: boolean;
  private pageTypeName?: "模组" | "整合包";

  canRun() {
    return !this.parent.href.includes("/class/version/") &&
      !this.parent.href.includes("/modpack/version/") && 
      (ClassPageInit.classPageRegExp.test(this.parent.href) || 
       ClassPageInit.modpackPageRegExp.test(this.parent.href));
  }

  private async syncSubscribeList(modID: number) {
    await McmodderUtils.sleep(1e3);
    let hasSubscribed = $(".subscribe i.fas").length;
    let subscribeModlist = this.parent.utils.getProfile("subscribeModlist") as number[] || [];
    if (!hasSubscribed && subscribeModlist.includes(modID)) {
      subscribeModlist = subscribeModlist.filter(e => e != modID);
      this.parent.utils.setProfile("subscribeModlist", subscribeModlist);
      this.parent.utils.setConfig(modID.toString(), 0, "latestEditTime");
      McmodderUtils.commonMsg("成功同步关注状态~");
    } else if (hasSubscribed && !subscribeModlist.includes(modID)) {
      subscribeModlist.push(modID);
      this.parent.utils.setProfile("subscribeModlist", subscribeModlist);
      McmodderUtils.commonMsg("成功同步关注状态~");
    }
  }

  run() {
    $(".common-center").addClass("mcmodder-class-page");
    this.isClassPage = ClassPageInit.classPageRegExp.test(this.parent.href);
    this.pageTypeName = this.isClassPage ? "模组" : "整合包";

    // 自动记忆前置Mod
    const classID = McmodderUtils.abstractLastFromURL(window.location.href, ["class", "modpack"]);
    const nClassID = Number(classID);
    const {nameNode, enameNode, abbrNode, className, classEname, classAbbr} = McmodderUtils.parseClassDocument($(document));
    const modFullName = McmodderUtils.getClassFullName(className, classEname, classAbbr) || "";
    this.parent.utils.updateClassNameIDMap(modFullName, classID);

    if (this.parent.utils.getConfig("fastCopyName")) {
      McmodderUtils.addClickCopyEvent(nameNode, this.pageTypeName + "主要名称", className);
      McmodderUtils.addClickCopyEvent(enameNode, this.pageTypeName + "次要名称", classEname);
      McmodderUtils.addClickCopyEvent(abbrNode, this.pageTypeName + "缩写名称", classAbbr);
    }

    if (this.parent.utils.getConfig("rememberModRelation") && this.isClassPage) {
      let modDependences = this.parent.utils.getConfig(classID, "modDependences_v2", []), newDependences: number[] = [];
      let modExpansions = this.parent.utils.getConfig(classID, "modExpansions_v2", []), newExpansions: number[] = [];
      $("li.col-lg-12.relation").each((_, e) => {
        let target = $(e);
        target.find("a[data-toggle=tooltip]").each((_, a) => {
          const href = (a as HTMLLinkElement).href;
          let id = McmodderUtils.abstractLastFromURL(href, "class");
          let name = a.textContent;
          if (id && name) this.parent.utils.updateClassNameIDMap(name, id);

          let title = target.find("span[data-toggle=tooltip]:first-child()").text();
          if (title.includes("前置Mod")) {
            newDependences.push(McmodderUtils.abstractIDFromURL(href, "class"));
          }
          else if (title.includes("依赖")) {
            newExpansions.push(McmodderUtils.abstractIDFromURL(href, "class"));
          }
        })
      });

      if (JSON.stringify(modDependences) != JSON.stringify(newDependences)) {
        this.parent.utils.setConfig(classID, newDependences, "modDependences_v2");
        McmodderUtils.commonMsg("成功更新此模组前置列表~");
      }
      if (JSON.stringify(modExpansions) != JSON.stringify(newExpansions)) {
        this.parent.utils.setConfig(classID, newExpansions, "modExpansions_v2");
        McmodderUtils.commonMsg("成功更新此模组拓展列表~");
      }
    }

    // 自动同步关注状态
    this.syncSubscribeList(nClassID);
    $(".subscribe").click(() => this.syncSubscribeList(nClassID));

    // 自动同步自定义资料类型
    let itemCustomTypeList: ItemCustomTypeList = this.parent.utils.getConfig("itemCustomTypeList") || [];
    if (typeof itemCustomTypeList === "string") {
      this.parent.utils.setConfig("itemCustomTypeList", McmodderValues.itemCustomTypeList);
      itemCustomTypeList = McmodderValues.itemCustomTypeList;
    }
    $(".class-item-type li").filter((_, e) => !e.className.includes("mold-")).each((_, e) => {
      let t = $(e).find(".text .title").text(), p = $(e).find(".iconfont i");
      const data: ItemTypeData = {
        classID: nClassID,
        typeID: Number($(e).find("a").attr("href").split(classID + "-")[1]?.split(".html")[0]),
        text: t,
        icon: p.attr("class").slice(4),
        color: McmodderUtils.rgbToHex(p.css("color"))
      };
      if (!(itemCustomTypeList.filter(entry => (
        entry.classID === data.classID &&
        entry.typeID === data.typeID &&
        entry.text === data.text &&
        entry.icon === data.icon &&
        entry.color === data.color
      )).length)) {
        itemCustomTypeList.push(data);
        this.parent.utils.setConfig("itemCustomTypeList", itemCustomTypeList);
        McmodderUtils.commonMsg(`成功同步自定义资料类型数据~ (${t})`);
      }
    });

    // 日志总是显示更多按钮
    $(".title").filter((_, e) => e.textContent === "更新日志").append(`<span class="more"><a href="/class/version/${classID}.html" target="_blank">更多</a><a></a></span>`);

    // 愚人节特性
    if (this.parent.utils.getConfig("enableAprilFools")) {
      const forgeAliasList = ["诅咒锻炉", "CurseFabric", "BlessForge", "BlessFabric"];
      const langList = PublicLangData.website;
      for (let i of $("ul.common-link-icon-frame span.name").toArray()) {
        if (i.innerHTML === langList.discord) i.innerHTML = "Drocsid";
        if (i.innerHTML === langList.github) i.innerHTML = "GayHub";
        if (i.innerHTML === langList.gitlab) i.innerHTML = "GayLab";
        if (i.innerHTML === langList.gitee) i.innerHTML = "Giteeeeee";
        if (i.innerHTML === langList.modrinth) i.innerHTML = "Pluginrinth";
        if (i.innerHTML === langList.wiki) i.innerHTML = "Kiwi";
        if (i.innerHTML === langList.curseforge) i.innerHTML = forgeAliasList[Math.floor(Math.random() * 4)];
      }
      $("div.frame span.avatar[title='MCreator - MCr'] img").attr("src", McmodderValues.assets.mcmod.aprilFools.mcr);
      $(".class-card .text-block span").each((_, e) => {
        e.innerHTML = e.innerHTML
        .replace(PublicLangData.class.card.red, "猛票")
        .replace(PublicLangData.class.card.black, "盲票")
      });
      $(".class-card .progress-bar").each((_, e) => {
        $(e).attr("data-original-title", $(e).attr("data-original-title")
        .replace(PublicLangData.class.card.red, "猛票")
        .replace(PublicLangData.class.card.black, "盲票"))
      });
    }

    // 禁用模组页排版
    if (this.parent.utils.getConfig("mcmodderUI") && !this.parent.utils.getConfig("disableClassDataTypesetting")) {
      McmodderUtils.addStyle('.common-center .right .class-text-top {min-height: unset; padding-right: unset;} .mcmodder-class-page {width: 90%; margin: 0 5%; margin-top: 6em;}');
      $("<div>").attr("class", "mcmodder-info-right").insertAfter(".class-info-left .col-lg-12:first-child()");
      $(".class-info-right").children().clone().appendTo(".mcmodder-info-right");
      const src = $(".class-info-left").attr("class", "class-info-left mcmodder-class-source-info");
      src.clone().attr("class", "class-info-left mcmodder-class-info").appendTo(".class-info-right");

      $(".common-center").append('<div class="right"><div class="class-info"></div></div>');
      $(".class-info-right").appendTo(".common-center .right .class-info");
      $(".col-lg-12.right").addClass("mcmodder-class-init");
      $(".class-text-top").css("min-height", "0");
      $(".class-text .class-info-right").remove();
      $(".common-center > .right").insertBefore(".common-center .right");
      $(".common-center > .right").remove();
      $(".mcmodder-class-info > ul > *, .common-link-frame .title")
      .contents()
      .filter((_, c) => {
        if (c.nodeType != Node.TEXT_NODE) return false;
        const text = $(c).text();
        if (![PublicLangData.class.link.title + ":", PublicLangData.class.tags.title + ": ", PublicLangData.modpack.tags.title + ": ", "支持的MC版本: "].includes(text) && !text.includes("作者")) return false;
        return true;
      })
      .each((_, _text) => {
        const text = $(_text);
        text.parent().find("> i").remove();
        text.replaceWith(`<span class="mcmodder-subtitle">${text.text().replace(":", "")}</span>`)
      });
      $(".mcmodder-class-info .author .fold").remove();

      $(".col-lg-12.common-rowlist-2 li, .mcmodder-class-info .col-lg-4").each((_, c) => {
        const t = c.textContent;
        const d = t.split(t.includes("：") ? "：" : ": ");
        if (!isNaN(Number(d[1]))) d[1] = Number(d[1]).toLocaleString();
        if (d[0] === "支持平台") d[1] = d[1].replace(" (JAVA Edition)", "").replace(" (Bedrock Edition)", "");
        else if (d[0] === "运作方式") {
          const a = d[1].split(", "); d[1] = "";
          a.forEach(e => {
            let svg;
            switch (e.toLowerCase()) {
              case "forge": svg = svgPlarformForge; break;
              case "fabric": svg = svgPlatformFabric; break;
              case "neoforge": svg = svgPlatformNeoforge; break;
              case "quilt": svg = svgPlatformQuilt; break;
              case "rift": svg = svgPlatformRift; break;
              case "liteloader": svg = svgPlatformLiteloader; break;
              default: svg = svgPlatformDefault;
            }
            d[1] += `<a class="mcmodder-modloader" data-toggle="tooltip" data-original-title="${e}"><img src="${svg}">`;
            if (a.length === 1) d[1] += `<span class="mcmodder-loadername" style="color: var(--mcmodder-color-platform-${a[0].toLowerCase()})">${a[0]}</span>`;
            d[1] += "</a>";
          });
        }
        if (d[0] === "运行环境") {
          const a = d[1].split(", ");
          a.forEach(e => {
            let r = e.slice(3, 5);
            if (r === "需装") r = `<span class="mcmodder-class-env-required"><i class="fa fa-check" />${r}</span>`;
            else if (r === "无效") r = `<span class="mcmodder-class-env-invalid"><i class="fa fa-ban" />${r}</span>`;
            else if (r === "可选") r = `<span class="mcmodder-class-env-optional"><i class="fa fa-circle-o" />${r}</span>`;
            $(`<li class="col-lg-6"><span class="title">${r}</span><span class="text">${e.slice(0, 3)}</span></li>`).insertAfter($(c).prev());
          });
          c.remove();
        } else c.innerHTML = `<span class="title">${d[1]}</span><span class="text">${d[0]}</span>`;
        if (c.className === "col-lg-4") c.className = "col-lg-6";
      });
      $(".slider-block").remove();
      $(".modlist-filter-block.auto button[type=submit]").css({ "background": "transparent", "color": "var(--mcmodder-color-text)" });

      const infoModpack = parseInt($(".infolist.modpack").text().slice(2));
      const infoServerCount = parseInt($(".infolist.server-count").text().slice(2));
      const infoServerPre = parseFloat($(".infolist.server-pre").text().split("安装率为 ")[1]);
      const infoWorldgen = parseFloat($(".infolist.worldgen").text().split("有 ")[1]);
      const infoDownload = $(".download-btn").attr("title")?.split("共 ")[1]?.split(" 次下载")[0];
      $(".infolist.modpack, .infolist.server-count, .infolist.server-pre, .infolist.worldgen").remove();
      if (infoModpack) $(`<li class="col-lg-6"><span class="title">${infoModpack}</span><span class="text"><a target="_blank" href="/modpack.html?mod=${classID}">整合包已收录</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoServerCount) $(`<li class="col-lg-6"><span class="title">${infoServerCount}</span><span class="text"><a target="_blank" href="https://play.mcmod.cn/list/?classid=${classID}">服务器已安装</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoServerPre) $(`<li class="col-lg-6"><span class="title">${infoServerPre}%</span><span class="text">模组服安装率</span></li>`).insertAfter($(".col-lg-6").last());
      if (infoWorldgen) $(`<li class="col-lg-6"><span class="title">${infoWorldgen}</span><span class="text"><a target="_blank" href="https://www.mcmod.cn/worldgen.html?mod=${classID}">资源分布数据</a></span></li>`).insertAfter($(".col-lg-6").last());
      if (infoDownload) $(`<li class="col-lg-6"><span class="title">${infoDownload}</span><span class="text">本站下载量</span></li>`).insertAfter($(".col-lg-6").last());

      // 启用悬浮链接提示兼容
      if (src.find(".common-link-frame a").first().attr("href") === "javascript:void(0);") {
        src.find(".common-link-frame a").each((_, c) => {
          const srca = $(c);
          const cpta = $(".class-info-left.mcmodder-class-info").find("#" + srca.attr("id"));
          const url = srca.next().html().split("<strong>")[1].split("</strong>")[0];
          const jumpUrl = srca.next().html().split("href=\\\"")[1].split("\\\">前往链接")[0];
          cpta.webuiPopover({
            title: "这是一个站外链接",
            content: `
              <p>此链接会跳转到:</p>
              <p><strong>${url}</strong></p>
              <br/>
              <p style="word-break:break-all;">
                <a rel="nofollow noreferrer" target="_blank" href="${jumpUrl}">前往链接</a>
                <a style="float:right" class="linkTips_hide" href="javascript:void(0);">不要再提示我</a>
              </p>`,
            trigger: "click",
            closeable: true,
            delay: 0
          });
          cpta.parent().click(() => $(".tooltip").tooltip("hide"));
        })
      }
    } else {
      McmodderUtils.addStyle('.common-center .right .class-text-top {padding-right: 250px;}');
      $(".class-info-right, .class-excount").addClass("mcmodder-disable-modern");
    }

    // 图像本地化检测
    if (this.parent.utils.getConfig("imageLocalizedCheck")) $(document).on("load", ".figure img", img => {
      const src = (img.currentTarget as HTMLImageElement).src;
      fetch(src, { method: "HEAD" }).then(resp => {
        if (resp.status != 200) return;
        if (Number(resp.headers.get("content-length")) > 1024000) return; // editor.options.fileMaxSize
        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(resp.headers.get("content-type") || "")) return; // editor.options.fileAllowFiles ?
        if (!src.includes("mcmod.cn")) $(img).parent().append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>').css("border", "10px solid red");
      });
    });

    if (this.parent.utils.getConfig("mcmodderUI")) {
      $(".class-item-type .mold:not(.mold-0)").each((_, c) => {
        $('<span class="mcmodder-mold-num">')
        .text(parseInt($(c).find(".count").text().slice(1)).toLocaleString())
        .css("color", $(c).find(".title").css("color"))
        .appendTo(c);
      });
    }

    // 广告优化
    if (this.parent.utils.getConfig("moveAds")) {
      $(".class-text .comment-ad").insertAfter($(".class-text > *").last());
    }

    // 展开高级信息
    if (this.parent.currentUID && classID) {
      $(`<a class="btn mcmodder-class-info-fold btn-outline-secondary mcmodder-content-block">
        <i class="fas fa-chevron-down"></i>
        <span>展开高级信息</span>
      </a>`).click(e => {
        const button = $(e.currentTarget);
        button.addClass("disabled");
        button.find("span").text("努力加载中...");
        button.find("i").attr("class", "fa fa-pulse fa-spinner");
        this.parent.utils.createRequest({
          url: `https://www.mcmod.cn/${ this.isClassPage ? "class" : "modpack" }/edit/${ classID }/`,
          method: "GET",
          onload: resp => {
            if (!resp.responseXML) return;
            const doc = $(resp.responseXML);
            if (doc.find(".edit-unlogining").length) {
              if (doc.find(".edit-unlogining").text().includes("登录")) McmodderUtils.commonMsg("请重新登录或在切换账号界面中退出未登录状态后再操作~", false);
              else McmodderUtils.commonMsg("受本模组/整合包区域限制，无法直接获取高级信息...", false);
              button.removeClass("disabled");
              button.find("span").text("展开高级信息");
              button.find("i").attr("class", "fas fa-chevron-down");
              return;
            }
            const infoModID = this.isClassPage ? doc.find("#class-modid").val() : undefined;
            const infoCFID = doc.find("#class-cfprojectid").val();
            const infoMRID = doc.find("#class-mrprojectid").val();
            const lastElement = $(".col-lg-6").last();
            if (infoModID) McmodderUtils.addClickCopyEvent($(`<li class="col-lg-6"><a><span class="title">${ infoModID }</span></a><span class="text">MODID</span></li>`).insertAfter(lastElement).find("a"), "MODID ");
            if (infoCFID) McmodderUtils.addClickCopyEvent($(`<li class="col-lg-6"><a><span class="title">${ infoCFID }</span></a><span class="text">CFID</span></li>`).insertAfter(lastElement).find("a"), "CFID ");
            if (infoMRID) McmodderUtils.addClickCopyEvent($(`<li class="col-lg-6"><a><span class="title">${ infoMRID }</span></a><span class="text">MRID</span></li>`).insertAfter(lastElement).find("a"), "MRID ");
            button.remove();
          }
        });
      }).insertAfter($(".col-lg-6").last());
    }
    
    // 压缩支持版本
    if (this.parent.utils.getConfig("compactSupportedVersions")) {
      type MCVersion = [number, number, number];
      type MCVersionRange = [MCVersion?, MCVersion?];
      let startIndex: number, minorIndex: number, versionRanges: MCVersionRange[], currentRange: MCVersionRange;
      $(".mcver > ul > ul").each((_, versionListNode) => {
        versionRanges = [];
        currentRange = [];
        let versionList: MCVersion[] = Array.from(versionListNode.children).slice(1).map(_ver => {
          _ver.classList.add("mcmodder-uncompactedmcver");
          let ver = _ver.textContent;
          if (ver === "远古版本") ver = "1.1.0"; // 为统一处理，远古版本视为1.1.0
          let verArray = ver.split(".").map(Number) as MCVersion;
          while (verArray.length < 3) verArray.push(0);
          return verArray;
        });
        for (let ver of versionList) {
          const major = ver[1];
          const minor = ver[2];
          minorIndex = 0;
          for (const index in McmodderValues.allVersionList[major]) { // 查找当前版本在支持版本列表中的索引
            if (McmodderValues.allVersionList[major][index] === minor) {
              minorIndex = Number(index);
              break;
            }
          }
          if (!currentRange || !currentRange.length || currentRange[0]![1] > major ||
            (currentRange[0]![1] === major && minorIndex + 1 != startIndex)) { // 新建一个版本区间
            currentRange = [Array.from(ver) as MCVersion, Array.from(ver) as MCVersion];
            versionRanges.push(currentRange);
            startIndex = minorIndex;
          }
          else if (minorIndex + 1 === startIndex) { // 将当前版本与最近的版本区间合并
            startIndex = minorIndex;
            currentRange[0] = Array.from(ver) as MCVersion;
          }
        }

        const $versionListNode = $(versionListNode);
        versionRanges.forEach(versionRange => { // 将所有版本区间写入页面
          if (versionRange.length < 2) return;
          let rangeContent;
          let major = versionRange[0]![1];
          let minorList = McmodderValues.allVersionList[major];
          let minorOld = versionRange[0]![2];
          let minorNew = versionRange[1]![2];
          if (minorList.length > 1 && minorOld === minorList[0] && minorNew === minorList[minorList.length - 1]) rangeContent = `1.${major}.x`;
          else if (minorOld === minorNew) rangeContent = McmodderUtils.versionArrayToString(versionRange[0]!);
          else rangeContent = `${McmodderUtils.versionArrayToString(versionRange[1]!)}-${McmodderUtils.versionArrayToString(versionRange[0]!)}`

          $versionListNode.append(`<li class="text-danger mcmodder-compactedmcver"><a target="_blank" class="mcmodder-content-block">${rangeContent}</a></li>`);
        });
      });

      var isUncompactedmcverShown = false;
      var uncompactedmcver = $(".mcmodder-uncompactedmcver");
      var compactedmcver = $(".mcmodder-compactedmcver");
      uncompactedmcver.hide();
      compactedmcver.show();
      window.addEventListener("keydown", e => {
        if (isUncompactedmcverShown) return;
        if (e.key === "Shift" && e.target === document.body) {
          uncompactedmcver.show();
          compactedmcver.hide();
          isUncompactedmcverShown = true;
        }
      });
      window.addEventListener("keyup", e => {
        if (!isUncompactedmcverShown) return;
        if (e.key === "Shift" && e.target === document.body) {
          uncompactedmcver.hide();
          compactedmcver.show();
          isUncompactedmcverShown = false;
        }
      });
    }

    // 若参与了活动，则为活动添加外边框
    $(".class-text > span.figure").addClass("mcmodder-golden-alert").css("width", "100%");
  }
}