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

// 用户脚本元数据单独提出来：dev 期要用它算哈希给客户端模块打缓存戳（见下方说明）。
const userscriptMeta = {
  name: "Mcmodder-MC百科辅助工具",
  author: "Charcoal-Black",
  version: "2.4",
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
    "https://registry.npmmirror.com/turndown/7.2.4/files/dist/turndown.js",
    "https://fastly.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
    "https://registry.npmmirror.com/three/0.160.0/files/build/three.min.js",
    "https://registry.npmmirror.com/opentype.js/1.3.4/files/dist/opentype.min.js",
  ],
} as const;

/** 32 位 FNV-1a 哈希，用于给 dev 期模块 URL 打缓存戳 */
const hashString = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
};

/**
 * dev 期缓存击穿：vite-plugin-monkey 的 dev 客户端（`vite-plugin-monkey/dist/client`）里写死了
 * `__MONKEY_WINDOW_KEY__` —— 那是「用户脚本注释块」的哈希。Tampermonkey 沙箱与页面 realm 靠它对齐：
 * 已安装的脚本执行 `document[该 key] = 沙箱 window`，实时下发的客户端则按同一个 key 去取 GM API。
 *
 * 只要改了 userscript 元数据（@require / @match / @grant …），哈希就会变。可 Vite 的依赖预打包把
 * 该文件钉死在 `?v=<预打包 hash>` 这个 URL 上（该 hash 只由 lockfile 与部分配置决定，**不含**
 * userscript 元数据），响应头还是 `Cache-Control: max-age=31536000,immutable` —— URL 不变而内容变了，
 * 浏览器便一直沿用旧副本，于是「已安装脚本」与「实时模块」对不上号：
 * `GM_info` / `GM_getValue` 等**全部**变成 undefined（不报错、极难排查，重装脚本与重启 dev 都无效，
 * 只能硬刷新）。
 *
 * 这里把客户端里写死的 key 查找改成**运行时动态查找**（扫 document 上 `__monkeyWindow-` 前缀的属性），
 * 于是即便浏览器还在用旧副本，它也能找到当前已安装脚本挂上来的沙箱 window，问题自愈。
 *
 * 另外把插件名带上元数据哈希：Vite 计算依赖预打包 hash 时会算上插件名列表，改名即换 hash，
 * 客户端模块的 URL 随之变化，浏览器便不会继续沿用旧副本。
 */
const devMonkeyClientCacheBust: Plugin = {
  name: `dev-monkey-client-cache-bust-${hashString(JSON.stringify(userscriptMeta))}`,
  apply: "serve",
  enforce: "post",
  transform(code, id) {
    if (!id.includes("/node_modules/.vite/deps/")) return null;
    if (!code.includes("__monkeyWindow-")) return null;
    return {
      code: code.replace(
        /document\["__monkeyWindow-[^"]+"\]/,
        `(() => { const k = Object.keys(document).find((x) => x.startsWith("__monkeyWindow-")); return k ? document[k] : undefined; })()`,
      ),
      map: null,
    };
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    devPrivateNetworkAccess,
    devMonkeyClientCacheBust,
    vue(),
    monkey({
      entry: "src/main.ts",
      userscript: userscriptMeta,
      build: {
        cssSideEffects: (css) => {
          const style = document.createElement("style");
          style.setAttribute("data-mcmodder-vue-css", "");
          style.textContent = css;
          (document.head || document.documentElement).appendChild(style);
        },
        externalGlobals: {
          turndown: "TurndownService",
          "@supabase/supabase-js": "supabase",
          three: "THREE",
          "opentype.js": "opentype",
        },
      },
    }),
  ],
});
