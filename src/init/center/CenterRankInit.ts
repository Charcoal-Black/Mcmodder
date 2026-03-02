import { McmodderValues } from "../../Values";
import { CenterBaseInit } from "./CenterBaseInit";

export class CenterRankInit extends CenterBaseInit {
  private refreshExpBar(newExp: number, currentExp = 0) {
    let level = 1, progress = 0, expToNextLevel = 0, s = newExp;
    while (newExp - McmodderValues.expRequisition[level] >= 0) newExp -= McmodderValues.expRequisition[level++];
    progress = Math.round(newExp / McmodderValues.expRequisition[level] * 100);
    expToNextLevel = McmodderValues.expRequisition[level] - newExp;
    if (level <= McmodderValues.maxLevel) {
      $(".lv-title span:nth-child(2)").html(`升级进度: ${newExp.toLocaleString()} / ${McmodderValues.expRequisition[level].toLocaleString()} Exp`);
      $(".lv-title span:nth-child(3)").html(`升级还需经验: ${expToNextLevel.toLocaleString()} Exp`);
    } else {
      level = McmodderValues.maxLevel, progress = 100;
      $(".lv-title span:nth-child(2)").html(`升级进度: ${s.toLocaleString()} / - Exp`);
      $(".lv-title span:nth-child(3)").html(`升级还需经验: - Exp`);
    }
    $(".lv-title span:nth-child(1)").html(`${(s > currentExp) ? "预测等级" : "当前等级"}: <i class="common-user-lv large lv-${level}">Lv.${level}</i>`);
    $(".lv-title span:nth-child(5)").html(`总经验: ${s.toLocaleString()} Exp`);
    $(".lv-bar .progress-bar").attr({ "style": `width: ${progress}%;`, "aria-valuenow": progress });
    $(".lv-bar .per").html(progress + "%");
    $("#mcmodder-lv-input").trigger("change");
  }

  run() {
    // 各等级数据查询
    let currentLevel = parseInt($("i.common-user-lv").text().replace("Lv.", ""));
    let lvTitle = $(".lv-title").get(0);
    let progressExp = parseInt($(".lv-title > span:nth-child(2)").text().replace("升级进度: ", "").replace(",", ""));
    lvTitle.innerHTML += '<span>升至<i class="common-user-lv large lv-' + Math.min(currentLevel + 1, McmodderValues.maxLevel) + '">Lv.<input id="mcmodder-lv-input" maxlength="2"></i> 还需经验: <span id="mcmodder-expreq" style="margin-right: 0px">-</span> Exp</span>';
    
    $("input#mcmodder-lv-input", lvTitle).val(Math.min(currentLevel + 1, McmodderValues.maxLevel));
    $("input#mcmodder-lv-input", lvTitle).bind("change", e => {
      const input = e.currentTarget as HTMLInputElement;
      let lv1 = parseInt($("i.common-user-lv").text().replace("Lv.", ""));
      let lv2 = Math.min(parseInt(input.value), McmodderValues.maxLevel);
      if (lv2 < 0 || lv2 > McmodderValues.maxLevel || isNaN(lv2) || lv1 >= lv2) {
        $("span#mcmodder-expreq").text("-");
        return;
      }
      let total = -parseInt($(".lv-title > span:nth-child(2)").text().replace("升级进度: ", "").replace(",", ""));
      for (let i = lv1; i <= lv2 - 1; i++) total += McmodderValues.expRequisition[i];
      $("span#mcmodder-expreq").text(total.toLocaleString());
      const parent = input.parentNode;
      if (parent) (input.parentNode as HTMLElement).className = "common-user-lv large lv-" + lv2;
    });
    $("input#mcmodder-lv-input", lvTitle).trigger("change");

    // 计算总经验
    let totalExp = progressExp;
    if (progressExp < 1e5) for (let i = 1; i < currentLevel; i++) totalExp += McmodderValues.expRequisition[i];

    const editNumEvents = {
      change: (e: JQueryEventObject) => {
        let t = totalExp;
        if (!this.center.pageProfileData) return;
        const value = Number((e.currentTarget as HTMLInputElement).value);
        if (isNaN(value)) return;
        for (let i = Math.floor((this.center.pageProfileData.editNum + 1) / 1e3) * 1e3; i <= Math.min(1.9e4, Math.floor(value / 1e3 - 1) * 1e3); i += 1e3) { t += (i + 1e3) / 2 };
        for (let i = Math.floor((this.center.pageProfileData.editByte + 1) / 5e4) * 5e4; i <= Math.min(9.5e5, Math.floor($("#mcmodder-editbyte").val() / 5e4 - 1) * 5e4); i += 5e4) { t += (i + 5e4) / 100 };
        this.refreshExpBar(t, totalExp);
      },
      keydown: (e: JQueryKeyEventObject) => {
        const target = $(e.currentTarget);
        let v = Number(target.val());
        switch (e.keyCode) {
          case 40: {
            if (v < 1e3) return; 
            target.val(v - 1e3).trigger("change");
            return;
          }
          case 38: target.val(v + 1e3).change();
        }
      }
    };
    const editByteEvents = {
      change: (e: JQueryEventObject) => {
        let t = totalExp;
        if (!this.center.pageProfileData) return;
        const value = Number((e.currentTarget as HTMLInputElement).value);
        if (isNaN(value)) return;
        for (let i = Math.floor((this.center.pageProfileData.editByte + 1) / 5e4) * 5e4; i <= Math.min(9.5e5, Math.floor(value / 5e4 - 1) * 5e4); i += 5e4) { t += (i + 5e4) / 100 };
        for (let i = Math.floor((this.center.pageProfileData.editNum + 1) / 1e3) * 1e3; i <= Math.min(1.9e4, Math.floor(Number($("#mcmodder-editnum").val()) / 1e3 - 1) * 1e3); i += 1e3) { t += (i + 1e3) / 2 };
        this.refreshExpBar(t, totalExp);
      },
      keydown: (e: JQueryKeyEventObject) => {
        const target = $(e.currentTarget);
        let v = Number(target.val());
        switch (e.keyCode) {
          case 40: {
            if (v < 5e4) return;
            target.val(v - 5e4).change();
            return;
          }
          case 38: target.val(v + 5e4).change();
        }
      }
    }

    $(lvTitle).append(`<span>总经验: <span id="mcmodder-totalexp" style="margin-right: 0px">${totalExp.toLocaleString()} Exp</span></span><span>次数计算器: <input id="mcmodder-editnum"></span><span>字数计算器: <input id="mcmodder-editbyte"></span>`);
    $("#mcmodder-editnum").val(this.center.pageProfileData?.editNum || "").change(e => editNumEvents.change(e)).keydown(e => editNumEvents.keydown(e));
    $("#mcmodder-editbyte").val(this.center.pageProfileData?.editByte || "").change(e => editByteEvents.change(e)).keydown(e => editByteEvents.keydown(e));

    // 若未加载主页，则禁用输入框
    if (!this.center.pageProfileData) $("#mcmodder-editnum, #mcmodder-editbyte").attr({ "disabled": "disabled", "placeholder": "需要从主页获取数据.." });
  }
}