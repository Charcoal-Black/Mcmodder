import { GM_getValue, GM_addValueChangeListener } from "$";
import { Mcmodder } from './Mcmodder';
import bbsCss from './css/bbs.css?raw';

(() => {
  let nightMode = false;
  try {
    const settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    nightMode = !!settings.nightMode;
  } catch (e) {}
  const splashStyle = document.createElement("style");
  // 遮罩，防止显示百科原网页闪烁
  splashStyle.id = "mcmodder-splash-screen";
  splashStyle.textContent = `html { background: ${nightMode ? "#111" : "#fff"} !important; } body { visibility: hidden !important; }`;
  if (document.documentElement != null) {
    document.documentElement.appendChild(splashStyle);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.documentElement != null) {
        document.documentElement.appendChild(splashStyle);
      }
    });
  }
  const initBbsDarkMode = () => {
    let settings: any = {};
    try {
      settings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
    } catch (e) {}
    if (!settings.bbsNightMode) {
      clearScreenCover();
      return;
    }
    const updateClass = (cfg: any) => {
      const isNight = cfg.adaptableNightMode ? 
        window.matchMedia("(prefers-color-scheme: dark)").matches : 
        !!cfg.nightMode;
      if (isNight) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    updateClass(settings);
    GM_addValueChangeListener("mcmodderSettings", (_key: string, _oldValue?: string, newValue?: string) => {
      try {
        const newSettings = JSON.parse(newValue || "{}");
        updateClass(newSettings);
      } catch (e) {}
    });
    if (settings.adaptableNightMode) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        try {
          const currentSettings = JSON.parse(GM_getValue("mcmodderSettings") || "{}");
          updateClass(currentSettings);
        } catch (e) {}
      });
    }
    const style = document.createElement("style");
    style.textContent = bbsCss;
    document.documentElement.appendChild(style);
    const moveStyleToBottom = () => {
      if (document.head) {
        document.head.appendChild(style);
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", moveStyleToBottom, { once: true });
    } else {
      moveStyleToBottom();
    }
    const cleanInlineStyles = () => {
      const mn = document.querySelector(".yudilistl .mn");
      if (mn) {
        (mn as HTMLElement).style.background = "";
      }
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j] as CSSStyleRule;
              if (rule.selectorText && (rule.selectorText.includes('.ts') || rule.selectorText.includes('separatorline'))) {
                if (rule.style.getPropertyPriority('background') === 'important' || rule.style.getPropertyPriority('background-color') === 'important') {
                  rule.style.removeProperty('background');
                  rule.style.removeProperty('background-color');
                }
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
      const cleanBbsElements = () => {
        const els = document.querySelectorAll('.tl .ts th, .tl .ts td, #separatorline th, #separatorline td');
        els.forEach(el => {
          (el as HTMLElement).style.setProperty('background', 'var(--mcmodder-color-background-dark1)', 'important');
        });
        document.querySelectorAll('tr[style*="background"], td[style*="background"], div[style*="background"], span[style*="background"], table[style*="background"]').forEach(el => {
          const bg = (el as HTMLElement).style.background || (el as HTMLElement).style.backgroundColor;
          if (bg && (bg.includes('#fff') || bg.includes('rgb(255, 255, 255)') || bg.includes('#FFF') || bg.includes('FFFFFF') || bg.includes('255,255,255'))) {
            (el as HTMLElement).style.background = '';
            (el as HTMLElement).style.backgroundColor = '';
          }
        });
      };
      cleanBbsElements();
      setTimeout(cleanBbsElements, 100);
      setTimeout(cleanBbsElements, 500);
      setTimeout(cleanBbsElements, 1000);
      const observer = new MutationObserver(cleanBbsElements);
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", cleanInlineStyles, { once: true });
    } else {
      cleanInlineStyles();
    }
    clearScreenCover();
  };
  const clearScreenCover = () => {
    splashStyle.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
    setTimeout(() => splashStyle.remove(), 300);
  }
  const init = () => {
    if (window.location.hostname === "bbs.mcmod.cn") {
      initBbsDarkMode();
    } else if (typeof jQuery === "undefined" && document.body != null) {
      // 已被封禁
      if (document.body.innerText.includes("您已被系统封禁")) {
        document.body.innerHTML += ('若遇封IP，请在向作者反馈时发送下列内容，并告知具体封禁时间（精确到秒）以及被封禁时已打开的百科页面数量。下列内容可能包含敏感信息，可考虑私信发送。<textarea id="mcmodder-log-export" style="min-height: 800px; min-width: 100%;">');
        (document.getElementById("mcmodder-log-export") as HTMLTextAreaElement).value = GM_getValue("mcmodderSettings") + "\n" + GM_getValue("scheduleRequestList") + "\n" + GM_getValue("mcmodderLogger");
      }
      // 后台跳转到登录
      else if (window.location.href.startsWith("https://admin.mcmod.cn/") && document.body.innerHTML === '{"state":107}') {
        document.body.innerHTML += `
          <br><a target="_blank" href="https://www.mcmod.cn/login/">登录 (主网址)</a>
          <br><a target="_blank" href="https://www1.mcmod.cn/login/">登录 (备用网址)</a>
        `;
      }
      splashStyle.textContent = `body { animation: mcmodder-fadein .3s ease forwards; } @keyframes mcmodder-fadein { from { opacity: 0; } to { opacity: 1; } }`;
      setTimeout(() => splashStyle.remove(), 300);
    } else {
      new Mcmodder;
    }
  }
  const tryInit = () => {
    if (window.location.hostname === "bbs.mcmod.cn") {
      init();
    } else if (typeof jQuery !== "undefined") {
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