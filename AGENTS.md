# AGENTS.md

## 项目是什么

Mcmodder 是一个 **油猴（Tampermonkey）用户脚本**，用于增强 [MC百科 (mcmod.cn)](https://www.mcmod.cn/)。它基于 [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) 构建，在 `document-start` 阶段注入 **mcmod.cn 页面内部**运行，用 jQuery 操作宿主站点的 DOM，并注入 Vue 3 组件。项目没有自己的 HTML 外壳、路由或后端 —— 构建产物是一个单独的用户脚本，由用户手动安装进油猴。

## 项目背景

- 整个仓库是作者的练手作，最初是纯 JS 单文件，之后逐步转 TypeScript，当前正在向 Vue 3 组件重构。部分早期代码风格较老、可读性参差（eslint 中标记为「祖传代码」的文件改动前先多读上下文，不要贸然大改）。
- SweetAlert、jQuery 等刻意使用旧版本，UEditor、StructureEditor 使用的 Three.js、ECharts 直接复用百科自带的库，都是为了兼容 mcmod.cn 这个老站 —— 不要随意升级或替换这些用法。

## 常用命令

```bash
npm run dev      # vite-plugin-monkey 开发服务器（安装其提供的脚本以获得热更新）
npm run build    # vue-tsc（类型检查）&& vite build  →  dist/mcmodder.user.js
npm run lint     # eslint src
npm run format   # prettier --write src
```

- `build` 会先跑 `vue-tsc`，因此**类型错误或未使用的局部变量/参数都会导致构建失败**（`tsconfig.json` 开启了 `strict`、`noUnusedLocals`、`noUnusedParameters`、`verbatimModuleSyntax`）。
- 没有测试套件（`playwright` 依赖目前尚未接入任何测试）。
- 可安装产物是 `dist/mcmodder.user.js`，用户通过复制粘贴进油猴来安装。

## 架构

### 启动流程

1. `src/main.ts` 在 `document-start` 运行。它先绘制防闪烁遮罩，单独处理 `bbs.mcmod.cn` 的夜间模式路径，其余情况下等待宿主页面的 `jQuery` 就绪后再构造 `src/Mcmodder.ts`。
2. `Mcmodder` 构造函数是**组合根**。按顺序：
   - 构建核心服务（`Utils`、`ConfigRepository`、`EchartsUtils`、`AdvancementUtils`、`ScheduleRequestUtils`、`SupabaseUtils`）；
   - 运行 `src/loader/*` 中的加载器（`ConfigLoader`、`StyleLoader`、`StorageBufferLoader`、`AdvancementLoader`、`ScheduleRequestLoader`、`MenuCommandLoader`）；
   - 通过 `InitLoader.run(this, this.initList)` 注册所有页面处理器；
   - 调用 `main()`，应用全局调整，最后执行 `initList.filter(i => i.canRun()).forEach(i => i.run())`。

### 页面处理器：`Init` 模式

`src/init/` 下每个页面类型对应一个类（如 `ItemPageInit`、`AdminInit`、`CenterInit`）。所有处理器都继承 `src/init/Init.ts`，并实现：

- `canRun()` —— URL/DOM 判断（例如 `this.parent.href.includes("/item/")`）；
- `run()` —— 该页面专属的 DOM 操作。

它们统一在 `src/loader/InitLoader.ts` 中注册。**为某个页面新增功能时，在这里新增/复用 `Init`，不要改 `main.ts`。** `CenterInit`/`AdminInit` 内部会借助 `MutationObserver` 派生子初始化（位于 `src/init/center/`），因为这些页面类似 SPA，内容是异步渲染的。注意 `GeneralEditInit.canRun()` 恒为 `false`，它是在存在编辑器时由 `Mcmodder` 直接实例化的。

### 配置与存储分层

三层结构，集中在 `src/config/` 与 `src/types/types.d.ts`：

- **定义层** —— `ConfigLoader.ts` 通过 `ConfigUtils` 的 `add*Config` 调用注册每个选项，每个选项都有 id/标题/描述/默认值，可选带 `Permission` 等级。新增选项时需保持 `ConfigUtils`、`ConfigLoader`、`types.d.ts` 中的 `Settings` 接口以及 `src/vue/components/input/` 中的输入组件同步。
- **持久层** —— 所有数据都存在 GM 存储键下（`types.d.ts` 中的 `AppStorage`，如 `mcmodderSettings`、`classData`、`userProfile`）。`ConfigRepository` 是类型化的读写门面：`getSettings`、`setSettings`、`getSettingsRef`（响应式）、列表类型的变体，以及按用户/按模组的记录辅助方法。
- **响应式层** —— `StorageBuffer` 将一小部分选定的 GM 键（在 `StorageBufferLoader.ts` 中注册）映射为 Vue 的 `shallowRef`，并监听 `GM_addValueChangeListener` 实现跨标签页同步。`getSettingsRef`/`get*WritableRef` 基于这些 ref 派生 `computed`。

`$` 导入（如 `import { GM_getValue } from "$"`）是 `vite-plugin-monkey/client` 的别名，提供 GM_* API。**存取配置与发请求一律用它，不要用 `localStorage`。**

### Vue 集成

这里**不是一个 Vue SPA**。`src/vue/components/` 中的 Vue 3 组件是临时挂载到宿主 DOM 节点上的：

```ts
createApp(SomeComponent, { parent: this.parent }).mount(domNode);
```

几乎所有组件都接收一个 `parent: Mcmodder` prop 来访问共享服务与配置。`src/vue/mount.ts` 提供了可选 Shadow DOM 封装（`mountVueApp`，目前尚无调用点，属未完成的重构产物），用于把组件样式与宿主页面隔离。现有组件都是直接 `createApp(...).mount(...)`，尚未走这套封装。由于没有应用根节点，组件的样式经由注入的 `<style data-mcmodder-vue-css>` 标签间接提供（见 CSS 一节）。

### 请求与后台任务

- `Utils.createRequest` 是全局请求入口：按 `minimumRequestInterval` 设置限速、写入 `mcmodderLogger`，并在 API 返回 `yxd_token` 校验时透明重发。不要直接调用 `GM_xmlhttpRequest`。
- `src/requestqueue/*`（`RequestQueue` 及若干专用队列）把批量操作包装成可暂停、带备份恢复的队列。`SubmitRequestQueue`、`InferRequestQueue` 等子类负责批量编辑/爬取。
- `src/schedulerequest/*` 负责定时任务（自动签到、检查更新、预编辑轮询）。

### JSON 框架 / 仓储

`src/jsonframe/repository/` 为 JSON 导入功能（物品 + 合成表数据）实现了可插拔的 `AppRepository<T>` 接口。有两条后端，通过 `itemRepository` 设置切换：`GMStorageRepository`（GM 存储）与 `IDBRepository`（Dexie/IndexedDB）。物品/合成表的 Vue 界面位于 `src/vue/components/jsonframe/`。

### 组件与集成

- `src/widget/` —— 可复用 DOM 组件：`MainText`（正文渲染）、`DraggableFrame`、`compare/*`（对比框）、`logger/*`、`Splash3D`（three.js WebGPU 标语）、`Swiper`、`Timer`。
- `src/ueditor/` —— 封装宿主站点的 UEditor 富文本编辑器（`UEditor` 基类，`AdvancedUEditor` 扩展之）。
- `src/integration/GTCEu.ts` —— GTCEu 模组相关功能。
- `src/table/` —— 可编辑表格模型，采用命令/撤销模式（`Command` 基类 + `table/command/` 中的具体命令）。

### CSS

两种机制：

- **全局样式** —— `src/css/*.css` 在 `loader/StyleLoader.ts` 中通过 `import.meta.glob` 以原始字符串导入，据此构建 `--mcmodder-*` CSS 变量动态调色板（依据用户主题色生成亮色/夜间两套），再注入一个合并后的 `<style>`。`base.css` 承担大部分整站重排版样式。
- **Vue 组件样式** —— Vite 配置里的 `cssSideEffects` 钩子把编译后的组件 CSS 收集到宿主文档的 `<style data-mcmodder-vue-css>` 标签中。

## 约定与坑

- **注释、配置标题和 UI 文案都是中文。** 排版风格统一（还常带点玩梗的语气）。
- **宿主全局变量在 mcmod.cn 之外是 undefined** —— `jQuery`/`$`、`editor`、`swal`、`PublicLangData`、`echarts`、`structure_browser` 等在 `src/Mcmod.d.ts` 中声明，但只在真实页面上存在。任何触碰它们的代码都要在 `Init.run()` / 事件回调中执行，绝不能在模块加载期执行，也无法用 Node 单独运行。
- **外部库分两类，都不打进 bundle，不要 `import` 它们并期待被 bundle：**
  - **CDN 库**（`vite.config.ts` 的 `require:` 条目 + `externalGlobals` 映射）：`codemirror`、`turndown`、`js-beautify`、`@supabase/supabase-js`、`three`、`opentype.js`（多为全局挂载，如 `window.THREE`）。类型检查依赖它们的 npm 类型。注意 `three` 的 CDN 版只用于 Splash3D。
  - **百科自带库**（宿主页面已加载，直接用全局变量，或按需用 `Utils.loadScript` 加载 `Values.assets.mcmod.js/*` 路径）：jQuery/`$`、SweetAlert(`swal`)、Bootstrap、UEditor(`editor`)、ECharts(`echarts`)、`structure_browser`，以及 StructureEditor 使用的百科版 Three.js。
- **必须用 `import type`**（`verbatimModuleSyntax`），未引用的局部变量/参数会直接导致构建失败。
- `eslint.config.ts` 对祖传代码（`src/main.ts`、`src/widget/Splash3D.ts`，注释标记为「祖传代码」）以及无法避免 `any` 的宿主集成文件做了定向豁免 —— 不要随便把新文件塞进这些豁免列表。
- `src/types/` 存放环境类型（组件会引入 `props.d.ts`、`emits.d.ts`）；`KeysOfType`、`IndexedType`、`AppStorage`、`Settings`、`Profile`、`Class`、`Item` 是核心共享类型。
- 版本号：`package.json` 的 `version` 与 `vite.config.ts` 中的用户脚本 `version` 需同步升级；`CHANGELOG.md` 会被写进 GitHub release 说明。

## 发布

CI（`.github/workflows/build.yaml`）每次推送都会构建。提交信息包含 `[release]` 的提交会触发附加的 GitHub release 任务，上传 `dist/mcmodder.user.js`，依据 `CHANGELOG.md` 生成 tag（`v<version>`）与发布说明。
