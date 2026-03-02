import { GM_openInTab } from "$";
import { Mcmodder } from "./Mcmodder";
import { CFVersionData, MRVersionData, VersionCompareData, VersionData } from "./types";
import { HeadConfig, McmodderTable } from "./table/Table";
import { McmodderUtils } from "./Utils";

export class VersionHelper {

  static readonly captchaAttemptMaxLimit = 2;
  static readonly captchaAttemptInterval = 5000;

  parent: Mcmodder;
  versionList: VersionData[];
  menu: JQuery;
  table: McmodderTable<VersionCompareData>;
  fetchCF: JQuery;
  fetchMR: JQuery;

  constructor(parent: Mcmodder) {
    this.versionList = this.getVersionList();
    this.parent = parent;

    this.menu = $(`<div class="version-helper">
      <fieldset>
        <legend>从其他网站获取版本列表</legend>
        <div class="bd-callout">
          <p>该功能尚不保证能够准确对应版本列表与百科现有日志的版本号，对比结果仅供参考，提交日志前请仔细检查各信息是否正确~</p>
          <p>添加时请注意：新增日志的版本号格式应尽可能与现有日志统一。例如，若其他版本号有前缀“v”，则新建日志的版本号也应带此前缀~</p>
        </div>
        <input id="mcmodder-fetch-version-cf" class="form-control" placeholder="输入 CFID 以查询...">
        <input id="mcmodder-fetch-version-mr" class="form-control" placeholder="输入 MRID 以查询...">
        <!-- McmodderTable -->
      </fieldset>
    </div>`).insertBefore(".version-menu, .version-content-empty");

    this.table = new McmodderTable<VersionCompareData>(parent, {id: "mcmodder-version-menu"}, {
      fileID: new HeadConfig("文件ID"),
      releaseType: new HeadConfig("发布状态", data => {
        const state = (data as string).toLowerCase();
        return `<span class="badge versiontag versiontag-${ state }">${ data }</span>`
      }),
      displayName: new HeadConfig("文件名称"),
      gameVersions: new HeadConfig("支持 MC 版本"),
      releaseTime: new HeadConfig("更新日期", McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN),
      mcmodVer: new HeadConfig("对应日志版本号"),
      mcmodMcver: new HeadConfig("对应日志支持版本"),
      mcmodDate: new HeadConfig("对应日志收录日期", (data: Date | null | undefined, row) => {
        if (!data) return "-";
        const str = data.toLocaleDateString();
        const logTime = data.valueOf();
        const releaseTime = row.releaseTime.valueOf();
        if (Math.abs(logTime - releaseTime) <= 8.64e7) return str;
        return `<span class="mcmodder-slim-danger" data-toggle="tooltip" data-original-title="与实际更新日期存在较大误差">${ str } <i class="fa fa-warning"></i></span>`;
      }),
      options: new HeadConfig("操作", (_, data) => {
        if (data.mcmodDate) return null;
        if (data.platform === 1) return `<a href="/class/version/add/${ McmodderUtils.abstractLastFromURL(window.location.href, "version") }/?cfid=${data.cfid}&fileid=${data.fileID}&ver=${VersionHelper.parseCFFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
        if (data.platform === 2) return `<a href="/class/version/add/${ McmodderUtils.abstractLastFromURL(window.location.href, "version") }/?mrid=${data.mrid}&fileid=${data.fileID}&ver=${VersionHelper.parseMRFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
      })
    });
    this.table.$instance.appendTo(this.menu.find("fieldset"));

    this.fetchCF = this.menu.find("#mcmodder-fetch-version-cf");
    this.fetchMR = this.menu.find("#mcmodder-fetch-version-mr");

    this.table.hide();

    let fetched = false;
    this.fetchCF.focus(() => {
      if (!fetched) {
        this.autoFillFetchID();
        fetched = true;
      }
    }).focusout(() => {
      const cfid = this.fetchCF.val().trim();
      if (cfid != parseInt(cfid)) return;
      this.getCurseForgeFileList(cfid);
    });
    this.fetchMR.focus(() => {
      if (!fetched) {
        this.autoFillFetchID();
        fetched = true;
      }
    }).focusout(() => {
      const mrid = this.fetchMR.val().trim();
      if (!mrid) return;
      this.getModrinthFileList(mrid);
    });
  }

  getVersionList() {
    let versionList: VersionData[] = [];
    $(".version-content-block").each((i, e) => {
      e.id = "mcmodder-log-" + i;
      const mcRowVer = $(e).parent().attr("data-frame");
      const mcver = mcRowVer.replaceAll(" ", "").split(/[\/,&\u3001]/);
      const name = $(e).find(".name").text();
      const date = $(e).find(".time").text();
      const dateNum = (date === "未知时间" ? 0 : date);
      versionList.push({
        date: new Date(dateNum),
        name: name,
        mcver: mcver,
        logid: i
      });
    });
    return versionList;
  }

  autoFillFetchID() { // 自动获取 CFID / MRID
    this.parent.utils.createRequest({
      url: `https://www.mcmod.cn/class/edit/${document.location.href.split("/version/")[1].split(".html")[0]}/`,
      method: "GET",
      onload: resp => {
        if (!resp.responseXML) {
          McmodderUtils.commonMsg("CFID/MRID 获取失败...", false);
          return;
        }
        let w = $(resp.responseXML);
        this.fetchCF.val(w.find("#class-cfprojectid").val().trim());
        this.fetchMR.val(w.find("#class-mrprojectid").val().trim());
      }
    });
  }

  static parseCFFileName(e: string) {
    return e.toLowerCase().replaceAll(/forge|fabric|\.jar|alpha|beta/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
  }

  static parseMRFileName(e: string) {
    return e.toLowerCase().replaceAll(/[forge|fabric|\.jar|alpha|beta]/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
  }

  getCurseForgeFileList(cfid: string) {
    this.table.show();
    this.table.showLoading();
    // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    let fileList: CFVersionData[] = [];
    let captchaAttempt = 0;
    let work = (index: number) => {
      this.parent.utils.createRequest({
        url: `https://www.curseforge.com/api/v1/mods/${cfid}/files?pageIndex=${index}&pageSize=50&sort=dateCreated&sortDescending=true&removeAlphas=false`,
        method: "GET",
        // anonymous: true,
        onload: resp => {
          if (resp.responseXML?.title === "Just a moment...") {
            if (captchaAttempt < VersionHelper.captchaAttemptMaxLimit) {
              captchaAttempt++;
              McmodderUtils.commonMsg(`正在等待人机验证，将于 ${
                McmodderUtils.getFormattedTime(VersionHelper.captchaAttemptInterval)
              } 后自动重试... (${ captchaAttempt }/${ VersionHelper.captchaAttemptMaxLimit })`);
              setTimeout(() => {
                work(0);
              }, VersionHelper.captchaAttemptInterval);
            } else {
              swal.fire({
                title: "验证失败",
                text: "请手动进入 CurseForge 验证页面，并于验证成功后重试。",
                showCancelButton: true,
                confirmButtonText: "前往验证",
                cancelButtonText: "取消"
              }).then(isConfirm => {
                if (isConfirm.value) GM_openInTab("https://www.curseforge.com");
              });
            }
            return;
          }

          let data = JSON.parse(resp.responseText);
          if (index === 0) {
            this.table.loadingProgress.setMax(Math.ceil(data.pagination.totalCount / 50)).show();
          }
          fileList = fileList.concat(data.data);
          this.table.loadingProgress.setProgress(index + 1);
          if (data.pagination.totalCount > (index - 1) * 50) setTimeout(() => work(++index), 1e3);
          else {
            this.table.empty();
            fileList.forEach(i => {
              const releaseMap = ["-", "Release", "Beta", "Alpha"];
              let fileid = i.id;
              let releaseType = releaseMap[i.releaseType];
              let displayName = i.fileName;
              let gameVersions = i.gameVersions.join(",");
              let releaseTime = new Date(i.dateCreated);
              let mcmodVer = "未找到";
              let mcmodMcver = "-";
              let mcmodDate: Date | undefined;
              // let logid = -1;

              // 匹配百科已收录日志
              this.versionList.forEach(j => {
                let mcVerName = j.name, prefix = mcVerName.charAt(0);
                if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
                if (VersionHelper.parseCFFileName(displayName) === VersionHelper.parseCFFileName(mcVerName)) {
                  mcmodVer = j.name;
                  mcmodMcver = j.mcver.join(",");
                  mcmodDate = j.date;
                  // logid = j.logid;
                }
              });
              if (mcmodDate) this.table.appendData({
                platform: 1,
                cfid: cfid,
                fileID: fileid,
                releaseType: releaseType,
                releaseTime: releaseTime,
                displayName: displayName,
                gameVersions: gameVersions,
                mcmodVer: mcmodVer,
                mcmodMcver: mcmodMcver,
                mcmodDate: mcmodDate,
                options: ""
              });
            });
            this.table.refreshAll();
          }
        }
      });
    }
    work(0);
  }

  getModrinthFileList(mrid: string) {
    this.table.show();
    this.table.showLoading();
    // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
    let fileList: MRVersionData[] = [];
    let work = () => {
      this.parent.utils.createRequest({
        url: `https://api.modrinth.com/v2/project/${mrid}/version`,
        method: "GET",
        anonymous: true,
        onload: resp => {
          let data = JSON.parse(resp.responseText);
          fileList = fileList.concat(data);
          this.table.empty();
          fileList.forEach(i => {
            let fileid = i.id;
            let releaseType = i.version_type;
            let displayName = i.version_number;
            let gameVersions = i.game_versions.join(",");
            let releaseTime = new Date(i.date_published);
            let mcmodVer = "未找到";
            let mcmodMcver = "-";
            let mcmodDate: Date | undefined;
            // let logid = -1;
            releaseType = releaseType.charAt(0).toUpperCase() + releaseType.slice(1);

            // 匹配百科已收录日志
            this.versionList.forEach(j => {
              let mcVerName = j.name, prefix = mcVerName.charAt(0);
              if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
              if (VersionHelper.parseMRFileName(displayName) === VersionHelper.parseMRFileName(mcVerName)) {
                mcmodVer = j.name;
                mcmodMcver = j.mcver.join(",");
                mcmodDate = j.date;
                // logid = j.logid;
              }
            });
            this.table.appendData({
              platform: 2,
              mrid: mrid,
              fileID: fileid,
              releaseType: releaseType,
              releaseTime: releaseTime,
              displayName: displayName,
              gameVersions: gameVersions,
              mcmodVer: mcmodVer,
              mcmodMcver: mcmodMcver,
              mcmodDate: mcmodDate,
              options: ""
            });
          });
          this.table.refreshAll();
        }
      });
    }
    work();
  }
}