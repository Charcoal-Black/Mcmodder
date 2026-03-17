import { GM_getValue } from "$";
import { Mcmodder } from './Mcmodder';

(() => {
  let nightMode = false;
  try {
    const settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    nightMode = !!settings.nightMode;
  } catch (e) {}
  const splashStyle = document.createElement("style");
  //遮罩，防止显示百科原网页闪烁
  splashStyle.id = "mcmodder-splash-screen";
  splashStyle.textContent = `html { background: ${nightMode ? "#000" : "#fff"} !important; } body { visibility: hidden !important; }`;
  document.documentElement.appendChild(splashStyle);
  const init = () => new Mcmodder;
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