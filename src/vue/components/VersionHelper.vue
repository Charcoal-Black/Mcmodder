<template>
  <div class="version-helper">
    <fieldset>
      <legend>从其他网站获取版本列表</legend>
      <div class="bd-callout">
        <p>该功能尚不保证能够准确对应版本列表与百科现有日志的版本号，对比结果仅供参考，提交日志前请仔细检查各信息是否正确~</p>
        <p>添加时请注意：新增日志的版本号格式应尽可能与现有日志统一。例如，若其他版本号有前缀“v”，则新建日志的版本号也应带此前缀~</p>
      </div>
      <input ref="fetchCF" id="mcmodder-fetch-version-cf" class="form-control"
        placeholder="输入 CFID 以查询..." @focus="onFetchCFFocus" @focusout="onFetchCFFocusout">
      <input ref="fetchMR" id="mcmodder-fetch-version-mr" class="form-control"
        placeholder="输入 MRID 以查询..." @focus="onFetchMRFocus" @focusout="onFetchMRFocusout">
      <GenericTable
        ref="table"
        :parent="parent"
        :attr="{ id: 'mcmodder-version-menu' }"
        :head-configs="headConfigs"
      />
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { Mcmodder } from '../../Mcmodder';
import { McmodderTable } from '../../table/Table.ts';
import { CFVersionData, HeadConfigsInitializer, MRVersionData, VersionCompareData, VersionData } from '../../types';
import { McmodderUtils } from '../../Utils.ts';
import GenericTable from './table/GenericTable.vue';
import { GM_openInTab } from '$';

interface Props {
  parent: Mcmodder
}

const { parent } = defineProps<Props>();

const headConfigs = {
  fileID: "文件ID",
  releaseType: ["发布状态", data => {
    const state = (data as string).toLowerCase();
    return `<span class="badge versiontag versiontag-${ state }">${ data }</span>`
  }],
  displayName: "文件名称",
  gameVersions: "支持 MC 版本",
  releaseTime: ["更新日期", McmodderTable.DISPLAYRULE_DATE_MILLISEC_EN],
  mcmodVer: "对应日志版本号",
  mcmodMcver: "对应日志支持版本",
  mcmodDate: ["对应日志收录日期", (data: Date | null | undefined, row) => {
    if (!data) return "-";
    const str = data.toLocaleDateString();
    const logTime = data.valueOf();
    const releaseTime = row.releaseTime?.valueOf();
    if (!releaseTime) return "未知";
    if (Math.abs(logTime - releaseTime) <= 8.64e7) return str;
    return `<span class="mcmodder-slim-danger" data-toggle="tooltip" data-original-title="与实际更新日期存在较大误差">${ str } <i class="fa fa-warning"></i></span>`;
  }],
  options: ["操作", (_, data) => {
    if (data.mcmodDate || !data.displayName || !data.releaseTime) return null;
    if (data.platform === 1) return `<a href="/class/version/add/${ McmodderUtils.abstractLastFromURL(window.location.href, "version") }/?cfid=${data.cfid}&fileid=${data.fileID}&ver=${parseCFFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
    if (data.platform === 2) return `<a href="/class/version/add/${ McmodderUtils.abstractLastFromURL(window.location.href, "version") }/?mrid=${data.mrid}&fileid=${data.fileID}&ver=${parseMRFileName(data.displayName)}&mcver=${data.gameVersions}&date=${data.releaseTime.valueOf()}" target="_blank">补全日志</a>`;
  }]
} satisfies HeadConfigsInitializer<VersionCompareData>;
const captchaAttemptMaxLimit = 2;
const captchaAttemptInterval = 5000;

const table = useTemplateRef("table");
const fetchCF = useTemplateRef("fetchCF");
const fetchMR = useTemplateRef("fetchMR");
let versionList = getVersionList();
let fetched = false;

function getVersionList() {
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

function onFetchCFFocus() {
  if (!fetched) {
    autoFillFetchID();
    fetched = true;
  }
}

function onFetchCFFocusout() {
  const cfid = fetchCF.value!.value.trim();
  if (!Number.isFinite(Number(cfid))) return;
  getCurseForgeFileList(cfid);
}

function onFetchMRFocus() {
  if (!fetched) {
    autoFillFetchID();
    fetched = true;
  }
}

function onFetchMRFocusout() {
  const mrid = fetchMR.value!.value.trim();
  if (!mrid) return;
  getModrinthFileList(mrid);
}

async function autoFillFetchID() { // 自动获取 CFID / MRID
  const resp = await parent.utils.createRequest({
    url: `${ parent.hostname }/class/edit/${document.location.href.split("/version/")[1].split(".html")[0]}/`,
    method: "GET"
  });
  if (!resp.responseXML) {
    McmodderUtils.commonMsg("CFID/MRID 获取失败...", false);
    return;
  }
  let w = $(resp.responseXML);
  fetchCF.value!.value = w.find("#class-cfprojectid").val().trim();
  fetchMR.value!.value = w.find("#class-mrprojectid").val().trim();
}

function parseCFFileName(e: string) {
  return e.toLowerCase().replaceAll(/forge|fabric|\.jar|alpha|beta/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
}

function parseMRFileName(e: string) {
  return e.toLowerCase().replaceAll(/[forge|fabric|\.jar|alpha|beta]/g, "").split(/[\/-\s]/).filter(k => k).slice(-1)[0];
}

function getCurseForgeFileList(cfid: string) {
  table.value!.show();
  table.value!.showLoading();
  // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
  let fileList: CFVersionData[] = [];
  let captchaAttempt = 0;
  let work = (index: number) => {
    parent.utils.createRequest({
      url: `https://www.curseforge.com/api/v1/mods/${cfid}/files?pageIndex=${index}&pageSize=50&sort=dateCreated&sortDescending=true&removeAlphas=false`,
      method: "GET",
      // anonymous: true
    }).then(resp => {
      if (resp.responseXML?.title === "Just a moment...") {
        if (captchaAttempt < captchaAttemptMaxLimit) {
          captchaAttempt++;
          McmodderUtils.commonMsg(`正在等待人机验证，将于 ${
            McmodderUtils.getFormattedTime(captchaAttemptInterval)
          } 后自动重试... (${ captchaAttempt }/${ captchaAttemptMaxLimit })`);
          setTimeout(() => {
            work(0);
          }, captchaAttemptInterval);
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
        table.value!.loadingProgress!.setMax(Math.ceil(data.pagination.totalCount / 50));
        table.value!.loadingProgress!.show();
      }
      fileList = fileList.concat(data.data);
      table.value!.loadingProgress!.setProgress(index + 1);
      if (data.pagination.totalCount > (index - 1) * 50) setTimeout(() => work(++index), 1e3);
      else {
        table.value!.empty();
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
          versionList.forEach(j => {
            let mcVerName = j.name, prefix = mcVerName.charAt(0);
            if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
            if (parseCFFileName(displayName) === parseCFFileName(mcVerName)) {
              mcmodVer = j.name;
              mcmodMcver = j.mcver.join(",");
              mcmodDate = j.date;
              // logid = j.logid;
            }
          });
          if (mcmodDate) table.value!.appendData({
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
        table.value!.refreshAll();
      }
    });
  }
  work(0);
}

function getModrinthFileList(mrid: string) {
  table.value!.show();
  table.value!.showLoading();
  // this.tbody.html(`<img src="${McmodderValues.assets.mcmod.loading}"></img>`);
  let fileList: MRVersionData[] = [];
  let work = () => {
    parent.utils.createRequest({
      url: `https://api.modrinth.com/v2/project/${mrid}/version`,
      method: "GET",
      anonymous: true
    }).then(resp => {
      let data = JSON.parse(resp.responseText);
      fileList = fileList.concat(data);
      table.value!.empty();
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
        versionList.forEach(j => {
          let mcVerName = j.name, prefix = mcVerName.charAt(0);
          if (["v", "V"].includes(prefix)) mcVerName = mcVerName.slice(1);
          if (parseMRFileName(displayName) === parseMRFileName(mcVerName)) {
            mcmodVer = j.name;
            mcmodMcver = j.mcver.join(",");
            mcmodDate = j.date;
            // logid = j.logid;
          }
        });
        table.value!.appendData({
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
      table.value!.refreshAll();
    });
  }
  work();
}

</script>