import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";
import { McmodderInit } from "./Init";
import { PreSubmitInit } from "./PreSubmitInit";

export class VerifyPageInit extends McmodderInit {
  canRun() {
    return false;
  }
  run() {
    if ((new URLSearchParams(window.location.search)).get("selfonly") && this.parent.utils.getConfig("preSubmitCheckInterval") >= 0.1) {
      new PreSubmitInit(this.parent);
    }

    // 排版调整
    if (this.parent.utils.getConfig("mcmodderUI")) {
      const p = $(".verify-list-frame .list-row-limit p").first();
      const d = p.text().match(/\d+/g)?.map(Number).map(e => e.toLocaleString());
      if (d) p.html(`
        <ul class="verify-rowlist">
          <li>
            <span class="title">${d[1]}</span>
            <span class="text">
              <i data-toggle="tooltip" data-original-title="日常审核时间段为 19:00 ~ 次日 07:00" class="fa fa-question-circle"></i>
              48 小时内已处理
            </span>
          </li>
          <li>
            <span class="title">${d[2]}</span>
            <span class="text">今日已处理</span>
          </li>
          <li>
            <span class="title">${d[3]}</span>
            <span class="text">今日新提交</span>
          </li>
          <li>
            <span class="title">${d[4]}</span>
            <span class="text">剩余待审</span>
          </li>
        </ul>`);
    }

    if ($("p.empty").length) return;
    // if ($("#mcmodder-verify-search").length) return;

    // 紧凑式待审列表
    if (this.parent.utils.getConfig("compactedVerifylist")) {
      McmodderUtils.addStyle(".table-bordered thead td, .table-bordered thead th {text-align: center; min-width: 3em;} .btn-group-sm > .btn, .btn-sm {padding: .0rem .5rem} .table > tbody > tr > td:nth-child(4) > p {display: inline;} td {text-overflow: ellipsis; overflow: hidden; white-space: nowrap;} .verify-list-list td:nth-child(4) i {width: unset; margin: unset;}");
      const verifyTable = $(".table");
      const stateLang = Object.entries(PublicLangData.verify_list.state.list);
      const stateIcon = ["", "fa fa-pulse fa-spinner", "fa fa-check", "fa fa-close", "fa fa-mail-reply"];

      verifyTable.find("thead th").last().html('状态').after('<th>审核人</th><th>最后审核</th><th>操作</th><th>附言</span></th>');

      verifyTable.find("thead > tr:nth-child(1) > th:nth-child(3)").append("&nbsp;");
      const verifyStateTd = verifyTable.find("tbody > tr > td:nth-child(4)");
      verifyStateTd.each((_, _entry) => {
        const entry = $(_entry);
        const verifyState = ["", "", "", "", ""];
        const s = entry.find("p:first-child()");
        const t = s.text();
        stateLang.forEach(e => {
          if (t === e[1]) s.html(`<i data-toggle="tooltip" data-original-title="${t}" class="${stateIcon[Number(e[0])]}"></i>`);
        });
        verifyState[0] = s.get(0).outerHTML;
        entry.find("p:not(p:first-child())").each((_, e) => {
          const c = e.textContent.split(": "), h = e.outerHTML.replaceAll(c[0] + ": ", "")
          if (c[0] === PublicLangData.verify_list.verifynum) verifyState[0] += `&nbsp;<p data-toggle="tooltip" data-original-title="${c[0]}: ${c[1]}">(${parseInt(c[1])})</p>`;
          else if (c[0] === PublicLangData.verify_list.verifyuser) verifyState[1] = h;
          else if (c[0] === PublicLangData.verify_list.time.verifytime) verifyState[2] = h;
          else if (c[0] === PublicLangData.verify_list.reason) verifyState[4] = h;
        });
        verifyState[3] = entry.contents().filter("*:not(p)").toArray().reduce((a, b) => a + b.outerHTML, "");
        entry.after(verifyState.reduce((a, b) => `${a}<td>${b ? b : ""}</td>`, "")).remove();
      });

      if (verifyTable.find("thead th").eq(2).text().includes("最后审核时间")) {
        verifyTable.find("thead th:nth-child(6), tbody td:nth-child(6)").remove();
        verifyTable.find("thead th").eq(2).text("最后审核");
      }

      $(".table i.fa-lightbulb-o").parent().each((_, c) => {
        let rawContent = $(c).text(), newContent = "";
        for (let i = 0; i < rawContent.length; i++) newContent += (rawContent[i].charCodeAt(0) <= 0xff) ? rawContent[i] : " ";
        const urlList = newContent.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
        urlList.forEach(item => { c.innerHTML = rawContent.replace(item, '<a href="' + item + '" target="_blank">' + item + '</a>'); });
      });

      // 筛选索引
      const counter = new Array(McmodderValues.searchOption.length).fill(null).map(() => [0, 0, 0, 0, 0]);
      $(".verify-list-list-table tbody tr").each((_, e) => {
        const tr = $(e);
        let d = tr.find("td:nth-child(2)").text();
        McmodderValues.searchOption.forEach((item, index) => {
          if (item.reg.test(d) && ((!item.exclude) || !d.includes(item.exclude)) && ((!item.exclude2) || !d.includes(item.exclude2))) {
            tr.attr("edit-type", index.toString());
            counter[index][0]++;
            let t = tr.find("td:nth-child(4) p:first-child() i").attr("class");
            stateIcon.forEach((e, i) => {
              if (t.includes(e)) counter[index][i]++;
            });
          }
        });
      });
      $("[edit-type=3],[edit-type=9]").each((_, _e) => { // 查看详细
        const e = $(_e);
        let d = e.find("td:nth-child(4)"), t = "item";
        if (!d.find("i").get(0).classList.contains("fa-spinner")) return;
        switch (Number(e.attr("edit-type"))) {
          case 3: t = "class"; break;
          case 9: t = "item";
        }
        let l = e.find("td:nth-child(2) a").filter((_, c) => (c as HTMLLinkElement).href.includes("/" + t + "/"));
        if (l.length && !e.find(".verify-withdraw-btn").length) {
          e.find("td").last().prev().append(`<a class="btn btn-outline-dark btn-sm mcmodder-content-block" href="/${t}/edit/${McmodderUtils.abstractLastFromURL(l.attr("href"), t)}/" target="_blank">查看改动</a>`);
        }
      });

      // 快捷切换时间段
      const t0 = Number((new Date()).getTime() / 1e3);
      const param = window.location.href.split("verify.html?")[1]?.split("&page=")[0];
      const daytime = 24 * 60 * 60;
      $(".verify-list-search-area").append(`<a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 30 * daytime}&endtime=${t0}" style="margin-left: 8px;">近30天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 7 * daytime}&endtime=${t0}" style="margin-left: 8px;">近7天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 3 * daytime}&endtime=${t0}" style="margin-left: 8px;">近3天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${param}&starttime=${t0 - 1 * daytime}&endtime=${t0}" style="margin-left: 8px;">近24小时</a>`);

      // 筛选待审项
      let searchFrame = $('<div class="verify-list-search-area">');
      McmodderValues.searchOption.forEach((item, index) => {
        const data = counter[index];
        const text = data.map(e => e.toLocaleString());
        if (!data[0]) return;
        const c = $('<div class="checkbox" style="display: inline-block;">');
        let h = `<input type="checkbox" id="mcmodder-type-${index}"><label for="mcmodder-type-${index}">${item.label} <span class="badge-row">`;
        if (data[1]) h += `<span class="text-muted" data-toggle="tooltip" data-original-title="${ text[1] } 条待审核">${ text[1] }</span>`;
        if (data[2]) h += `<span class="text-success" data-toggle="tooltip" data-original-title="${ text[2] } 条已通过">${ text[2] }</span>`;
        if (data[3]) h += `<span class="text-danger" data-toggle="tooltip" data-original-title="${ text[3] } 条已退回">${ text[3] }</span>`;
        if (data[4]) h += `<span style="text-muted-muted" data-toggle="tooltip" data-original-title="${ text[4] } 条已撤回">${ text[4] }</span>`;
        h += `</span></label>`;
        c.html(h);
        c.find("input").bind("change", e => {
          const input = e.currentTarget as HTMLInputElement;
          let opt: string[] = [], v = $("#mcmodder-verify-search").val().trim().toLowerCase();
          $("div.checkbox input", $(input).parent().parent().parent())
          .filter((_, c) => (c as HTMLInputElement).checked)
          .each((_, c) => {
            opt.push((c as HTMLInputElement).id.split("-")[2]);
          });
          $(".verify-list-list-table tbody tr").each((_, _tr) => {
            const tr = $(_tr);
            if ((!opt.length || opt.includes(tr.attr("edit-type"))) && tr.find("td:nth-child(2)").text().toLowerCase().includes(v || "")) {
              tr.show();
            }
            else tr.hide();
          });
        });
        c.appendTo(searchFrame);
      });
      searchFrame.appendTo(".verify-list-list-head fieldset");

      searchFrame = $('<div class="verify-list-search-area">');
      $('<input id="mcmodder-verify-search" class="form-control" placeholder="搜索...">').bind("change", e => {
        const input = e.currentTarget as HTMLInputElement;
        let opt: string[] = [], v = $("#mcmodder-verify-search").val().trim().toLowerCase();
        $("div.checkbox input", $(input).parent().parent().parent())
        .each((_, c) => {
          if ((c as HTMLInputElement).checked) {
            opt.push((c as HTMLInputElement).id.split("-")[2]);
          }
        });
        $(".verify-list-list-table tbody tr").each((_, _tr) => {
          const tr = $(_tr);
          if ((!opt.length || opt.includes(tr.attr("edit-type"))) && tr.find("td:nth-child(2)").text().toLowerCase().includes(v || "")) {
            tr.show();
          }
          else tr.hide();
        });
      }).appendTo(searchFrame);
      searchFrame.appendTo(".verify-list-list-head fieldset");

    }

    // 一键催审
    if (this.parent.utils.getConfig("fastUrge")) {
      // $("div.bd-callout-warning").first().html('审核周期通常在 24 小时以内，有管理员的模组区域审核周期通常在 7 日以内，如逾期未审，<span class="mcmodder-common-dark">可点“一键催审”按钮给重生上强度！！</span> (´・ω・`)');
      $('<button id="mcmodder-fast-urge" class="btn btn-dark btn-sm" data-toggle="tooltip" data-html="true" data-original-title="一键对当前列表中可催审的审核项催审！审核项提交 24 小时后可催审，首次催审后每隔 1 小时可再次催审。<br>催审并不会对管理员发送强提醒，但能够使审核项在后台的待审列表中排在更靠前的位置。">一键催审</button>')
      .insertBefore(".verify-list-list")
      .click(_e => {
        let b = $("#mcmodder-fast-urge");
        b.html("一键催审 (处理中...)");
        let urgeList = $(".verify-urge-btn").filter((_, e) => e.textContent != "代催").toArray();
        let verifyList = urgeList.map(e => Number($(e).attr("data-id")));
        let t = 0, index = 0;
        let doUrge = (id: number) => {
          this.parent.utils.createRequest({
            url: "https://www.mcmod.cn/action/edit/doUrge/",
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              "X-Requested-With": "XMLHttpRequest",
              "Origin": "https://www.mcmod.cn",
              "Referer": window.location.href,
              "Priority": "u=0",
              "Pragma": "no-cache",
              "Cache-Control": "no-cache"
            },
            data: $.param({ nVerifyID: id }),
            onload: resp => {
              const state = JSON.parse(resp.responseText).state;
              if (state === 0) {
                t++;
                $(urgeList[index]).html("催审成功").attr("class", "ml-1 text-muted");
              };
              if (verifyList.length > index + 1) {
                setTimeout(() => doUrge(verifyList[++index]), 3e2);
                return;
              }
              else b.html(`一键催审 (${t}项已处理)`);
            }
          });
        }
        if (verifyList[0]) doUrge(verifyList[0]);
        else b.html("一键催审 (无可催审项)");
      });
    }

    // 更新 swiper
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 1e3);
    
    // 更新工具提示
    this.parent.updateItemTooltip();
  }
}