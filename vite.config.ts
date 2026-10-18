import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import monkey from "vite-plugin-monkey";

// 开发期补丁：让 Firefox 的 Private Network Access 预检通过。
// 宿主页面是 https://*.mcmod.cn（公网源），dev server 在 http://127.0.0.1（本地地址空间），
// Firefox 会先发一个 OPTIONS 预检并要求响应带 `Access-Control-Allow-Private-Network: true`，
// 预检失败就表现为「已拦截跨源请求…（原因：CORS 请求未能成功）。状态码：(null)」。
// vite 自带的 cors 中间件在插件的 configureServer 钩子之前注册，并会直接结束预检请求，
// 所以 vite-plugin-monkey 里设置该响应头的中间件来不及生效（只对非预检请求有效）。
// 这里把预检响应插到 cors 中间件之前，仅在 serve 模式生效。
const devPrivateNetworkAccess: Plugin = {
  name: "dev-private-network-access",
  apply: "serve",
  configureServer(server) {
    server.middlewares.stack.unshift({
      route: "",
      handle(req, res, next) {
        if (req.method !== "OPTIONS") return next();
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-methods", "GET,HEAD,OPTIONS");
        res.setHeader(
          "access-control-allow-headers",
          req.headers["access-control-request-headers"] ?? "*",
        );
        res.setHeader("access-control-max-age", "86400");
        res.setHeader("access-control-allow-private-network", "true");
        res.statusCode = 204;
        res.end();
      },
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devPrivateNetworkAccess,
    vue(),
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "Mcmodder-MC百科辅助工具",
        author: "Charcoal-Black",
        version: "2.3",
        description: "Mcmodder",
        license: "AGPL-3.0",
        icon: "https://www.mcmod.cn/static/public/images/favicon.ico",
        namespace: "http://www.mcmod.cn/",
        "run-at": "document-start",
        match: ["https://*.mcmod.cn/*"],
        exclude: [
          "https://api.mcmod.cn/*",
          "https://www.mcmod.cn/v2/*",
          "https://play.mcmod.cn/add/*",
          "https://www.mcmod.cn/tools/*/*",
          "https://*.mcmod.cn/ueditor/*",
          "https://www.mcmod.cn/script/*",
          "https://www.mcmod.cn/item/aspects/*",
        ],
        grant: [
          "unsafeWindow",
          "GM_cookie",
          "GM_registerMenuCommand",
          "GM_openInTab",
          "GM_setValue",
          "GM_getValue",
          "GM_deleteValue",
          "GM_addValueChangeListener",
          "GM_xmlhttpRequest",
        ],
        connect: [
          "mcmod.cn",
          "www.curseforge.com",
          "api.modrinth.com",
          "raw.githubusercontent.com",
          "hub.gitmirror.com",
          "supabase.co",
          "fastly.jsdelivr.net",
          "cdn.jsdelivr.net",
          "cdn.jsdelivr.net.cn",
        ],
        require: [
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/codemirror.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/markdown/markdown.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/xml/xml.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-html.min.js",
          "https://unpkg.com/turndown/dist/turndown.js",
          "https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js",
          "https://cdn.jsdelivr.net.cn/npm/@supabase/supabase-js@2",
          "https://cdn.jsdelivr.net.cn/npm/three@0.160.0/build/three.min.js",
          "https://cdn.jsdelivr.net.cn/npm/opentype.js@1.3.4/dist/opentype.min.js",
        ],
      },
      build: {
        cssSideEffects: (css) => {
          const style = document.createElement("style");
          style.setAttribute("data-mcmodder-vue-css", "");
          style.textContent = css;
          (document.head || document.documentElement).appendChild(style);
        },
        externalGlobals: {
          codemirror: "CodeMirror",
          turndown: "TurndownService",
          "js-beautify": "html_beautify",
          "@supabase/supabase-js": "supabase",
          three: "THREE",
          "opentype.js": "opentype",
        },
      },
    }),
  ],
});
