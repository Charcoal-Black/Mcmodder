import { defineConfig } from 'vite';
import monkey, { cdn } from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: "Mcmodder-MC百科辅助工具",
        author: "Charcoal-Black",
        version: "2.0.5",
        description: "Mcmodder",
        license: "AGPL-3.0",
        icon: 'https://www.mcmod.cn/static/public/images/favicon.ico',
        namespace: 'http://www.mcmod.cn/',
        "run-at": 'document-start',
        match: ['https://*.mcmod.cn/*'],
        exclude: [
          "https://api.mcmod.cn/*",
          "https://bbs.mcmod.cn/*",
          "https://www.mcmod.cn/v2/*",
          "https://play.mcmod.cn/add/*",
          "https://www.mcmod.cn/tools/*/*",
          "https://*.mcmod.cn/ueditor/*",
          "https://www.mcmod.cn/script/*",
          "https://www.mcmod.cn/item/aspects/*"
        ],
        grant: [
          'GM_cookie',
          'GM_registerMenuCommand',
          'GM_openInTab',
          'GM_setValue',
          'GM_getValue',
          'GM_deleteValue',
          'GM_addValueChangeListener',
          'GM_xmlhttpRequest',
        ],
        connect: [
          "mcmod.cn",
          "www.curseforge.com",
          "api.modrinth.com",
          "raw.githubusercontent.com",
          "hub.gitmirror.com"
        ],
        require: [
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/codemirror.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/markdown/markdown.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/xml/xml.min.js",
          "https://unpkg.com/turndown/dist/turndown.js",
          "https://unpkg.com/turndown-plugin-gfm/dist/turndown-plugin-gfm.js"
        ]
      },
      build: {
        externalGlobals: {
          "codemirror": "CodeMirror",
          "turndown": "TurndownService"
        }
      }
    })
  ]
});
