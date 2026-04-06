import { GM_getValue } from "$";
import { Mcmodder } from './Mcmodder';

(() => {
  let nightMode = false;
  try {
    const settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    nightMode = !!settings.nightMode;
  } catch (e) {}
  const splashStyle = document.createElement("style");
  // 遮罩，防止显示百科原网页闪烁
  splashStyle.id = "mcmodder-splash-screen";
  splashStyle.textContent = `html { background: ${nightMode ? "#000" : "#fff"} !important; } body { visibility: hidden !important; }`;
  document.documentElement.appendChild(splashStyle);
  const init = () => {
    if (typeof jQuery === "undefined") {
      // 已被封禁
      if (document.body.innerText.includes("您已被系统封禁")) {
        document.body.innerHTML += ('若遇封IP，请在向作者反馈时发送下列内容，并告知具体封禁时间（精确到秒）以及被封禁时已打开的百科页面数量。下列内容可能包含敏感信息，可考虑私信发送。<textarea id="mcmodder-log-export" style="min-height: 800px; min-width: 100%;">');
        (document.getElementById("mcmodder-log-export") as HTMLTextAreaElement).value = GM_getValue("mcmodderSettings") + "\n" + GM_getValue("scheduleRequestList") + "\n" + GM_getValue("mcmodderLogger");
      }
      // 后台跳转到登录
      else if (window.location.href.startsWith("https://admin.mcmod.cn/") && document.body.innerHTML === '{"state":107}') {
        window.location.href = "https://www.mcmod.cn/login/";
      }
      splashStyle.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
      setTimeout(() => splashStyle.remove(), 300);
    } else {
      new Mcmodder;
    }
  }
  const tryInit = () => {
    if (typeof jQuery !== "undefined") {
      init();
    } else {
      window.addEventListener("load", init, { once: true });
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit, { once: true });
  } else {
    tryInit();
  }
})();