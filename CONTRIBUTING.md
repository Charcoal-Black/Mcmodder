# 参与贡献

感谢你愿意花时间参与 Mcmodder 的开发。这是一个由**非官方**的普通百科用户群体开发的
[MC 百科](https://www.mcmod.cn/) 阅读、编辑与审核辅助脚本，
所有代码最终都以**注入宿主导航页面**的形式生效，因此它的开发方式与普通前端项目有几处明显不同，
请先花一些时间阅读此文档。

## 反馈问题

创建一个新 issue 前，请先搜索是否已有其他 issue 提出过类似的问题。通常而言，一个能复现的问题
至少应该包含下列信息：

- 脚本版本；
- 浏览器与篡改猴的版本；
- 是否开启了其他用户脚本；
- **具体页面 URL**，以及从进入页面到出问题的详细操作步骤；
- 相关配置项的启用状态（脚本中的绝大多数配置项都是默认关闭的）；
- 浏览器控制台里的报错截图或文本（如果有）；
- 如果遇到的问题与 UI 有关，请附上截图或录屏；
- **禁用脚本后，此问题是否依然存在**（你遇到的问题可能是百科原生 Bug）。

## 开发环境

- Node.js 24（与 CI 一致）；
- 首次运行 E2E 前需要安装浏览器：`npx playwright install chromium`。

```bash
npm ci
npm run dev      # 启动开发服务器，支持真实页面热更新
npm run build    # 类型检查 + 打包，产物为 dist/mcmodder.user.js
```

- `dist/` 存放构建产物，已在 `.gitignore` 中，不要提交；
- 脚本在 `document-start` 阶段注入页面，**没有可以脱离浏览器运行的入口**。
  想验证某个逻辑，请使用 E2E，或是在真实页面里手动验证。

## 提交前检查

```bash
npm run build      # vue-tsc + vite build
npm run verify     # eslint + 配置文件的 lint + E2E 类型检查 + prettier 格式检查
npm run e2e        # 使用构建产物进行离线用例测试
npm run format     # prettier --write
```

提交与推送时，husky 会再检查一次：

- `pre-commit` 执行 lint-staged，对暂存的 `ts/js/vue` 执行 `eslint --fix` + `prettier --write`；
- `pre-push` 执行 `npm run verify`。

每次推送后，CI（`.github/workflows/build.yaml`）会再执行一次 `verify` → `build` → `e2e`。

## 代码位置

每个模块的功能都存放在相应的位置，请尽可能地复用现有机制：

| 我想……              | 去哪里                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| 新增某个页面的功能  | `src/init/` 下新建 `Init` 子类，并注册到 `src/loader/InitLoader.ts`           |
| 新增一个配置项      | `Settings`（`src/types/types.d.ts`）+ `src/loader/ConfigLoader.ts` 注册       |
| 读写持久化数据      | 优先选择 `src/config/ConfigRepository.ts`                                     |
| 发送网络请求        | `Mcmodder.web.createRequest`（`src/WebFetchUtils.ts`）                        |
| 新增或修改函数工具  | `src/Utils.ts`（纯静态类，不要给它传 `Mcmodder` 实例）                        |
| 新增或修改 Vue 组件 | `src/vue/components/`，通过 `createApp(Component, { parent: mcmodder })` 挂载 |

更详细的仓库架构（后台、自定义表态、跨标签页弹窗、JSON 管理、弹层控制器等）
见 `AGENTS.md` 的“Where to change what”。

## 注意事项

- **宿主全局只在对应页面存在。** 在 `src/mcmod.d.ts` 中声明的 `$`、`editor`、`swal`、`echarts`、
  `PublicLangData` 等变量均由百科站点宿主提供，只能在 `Init.run()` 或事件回调里使用；
  在模块顶层引用会让脚本在不含该全局的页面直接崩溃。
- **网络请求必须通过 `Mcmodder.web.createRequest` 发送。** 它有请求间隔控制、日志和 `yxd_token`
  重试，直接调用 `GM_xmlhttpRequest` 会绕过这些机制，_处理不当容易导致脚本过量发包而触发网站防火墙策略_。
- **不要轻易升级 jQuery、SweetAlert 等库，也不要把宿主库替换成 npm 包。** 为了兼容旧站页面，
  脚本刻意选用了与百科相同的库版本。
- **应用数据放进 GM Storage**，非特殊情况不要用 `localStorage` 或 `sessionStorage`，
  且建议优先通过 `ConfigRepository` 来读写。
- **不要新增 ESLint 豁免或 `any` 白名单。** 现有的豁免列表只是为了无法避免或迁移成本较大的历史代码
  和宿主集成而存在。
- **`CHANGELOG.md` 与版本号由维护者维护**，不要在 PR 里改动，也不要自行加条目。

## 测试

这个项目尚无单元测试，`e2e/` 是唯一的自动化测试层，用于测试构建产物 `dist/mcmodder.user.js`：

- 默认项目 `offline` 完全离线，通过 `context.route` 与本地 HTML 页面框架来复刻 mcmod.cn 的真实行为。
  **CI 只进行这一组测试**。
- 需要真实页面结构的用例位于 `e2e/online.spec.ts`，可以通过 `E2E_ONLINE=1 npm run e2e` 来手动测试。

新增**后台相关**的用例时，请优先选择离线复刻宿主页面（参考 `e2e/support/`，复杂 fixture 的范例见
`docs/editrule-e2e.md`），让没有后台进入权限的贡献者也能够参与后台相关功能的开发；新增其他用例时，
若不涉及重要的、可能影响其他用户的修改（例如提交资料编辑等），则可以考虑直接进行真实站点的线上测试。

### 复现真实后台外观（可选）

通过 `npm run e2e:manual` 即可打开有头浏览器，测试用例会跳转到后台的“模组区资料审核”页面并暂停，
适合手动测试与体验，不进行任何断言。

`e2e:manual` 默认只涵盖仓库里的语义 fixture（包括种子图片和站点 JS 的最小实现），
后台排版会比较朴素。想看到接近真站的外观，则需要先抓取并缓存真实静态资源。

在开始之前，请先确认构建产物（`npm run build`）是最新的。

1. **记录待请求资源列表**：`npm run e2e:assets:record`。浏览器打开后，凡是被页面请求，
   但缓存和仓库里都没有的静态资源，都会被记录在
   `playwright/.cache/assets/pending.json`——包括 CSS、JS、图片、字体，以及脚本通过
   `fetch` / `ajax` 拉取的 `/static/...`、`.json` 等文件（纯业务接口不会被记录）。
2. **抓取**：`npm run e2e:assets`。抓取脚本尝试下载所有待请求资源列表里的资源，
   且会自动识别 CSS 里的 `url()` / `@import` 并继续去获取引用，最多嵌套 3 层。
   所有资源保存在 `playwright/.cache/assets/`（已在 `.gitignore` 中），
   抓取失败的资源 URL 会被保留在列表里。
3. **重复第 1、2 步。** 抓取脚本只会分析 CSS 引用，不会分析 JS 逻辑，但是页面正常打开时，
   **JS 通过 `fetch` / `ajax` 拉取的静态文件**（例如后台语言包）依然没有被记录。
   CSS 生效后浏览器还会去取它引用的字体、图标、背景图等静态资源，它们只有在回到录制模式后
   才会被记录在待请求资源列表中，因此只记录一次很有可能会漏下一些资源，需要多次重复上述操作，
   直到 `pending.json` 被清空，或是只剩下确实访问不到的资源。一般记录两次就能补齐。
4. **验证**：再执行一次 `npm run e2e:manual`，此时后台页面除了有明确的“未开放”消息提示的部分之外，
   都应当会带有完整的样式和运行逻辑。

补充说明：

- 测试后台所展示的所有非功能内容（包括用户、待审项内容、待审项元数据等）都仅用于测试目的，
  不反映百科真实状况；所有待审项均为硬编码的只读内容，无法进行通过、退回或提交助理意见等操作
  均属于正常现象。
- 只有 `E2E_ASSETS=1`（`e2e:manual` 已自带）和录制模式（`e2e:assets:record`）会启用缓存层。
- 百科更新后，缓存可能过期，此时请使用 `npm run e2e:assets -- --refresh` 全部强制重新抓取，
  或是通过 `npm run e2e:assets -- <url>` 来强制重新抓取单个指定 URL 下的资源。
- 静态资源抓取需要联网访问真实站点，属于本地开发辅助，不是离线测试的一部分，
  且抓取得到的资源也仅缓存在本地，不需要提交。

## 提交 PR

- 从 `dev` 切出分支，一个 PR 通常应该只做一件事，且**不要直接请求合并进 `master` 分支**；
- 提交信息推荐沿用仓库现状：`type(scope): 中文摘要`（`fix` / `feat` / `refactor` / `docs` / `chore` …），
  并在正文里说明原因——尤其是进行 bug 修复时，注明详细故障机理往往会很有用；
- 改动 UI 时，推荐附上前后对比截图或 GIF；
- 提交前请确认 `npm run build`、`npm run verify`、`npm run e2e` 都已通过；
- 不要在 PR 里修改 `CHANGELOG.md` 或版本号，这些都由维护者在发布时处理。

本项目以 AGPL-3.0 发布，提交 PR 即表示你同意以相同协议分发你的贡献。如果你移植了其他项目的代码，
请在 PR 中注明来源与协议，确认兼容后再提交。

## 发布（仅维护者）

1. 同时修改 `package.json` 与 `vite.config.ts` 中的 `version`；
2. 在 `CHANGELOG.md` 增加 `## [x.y.z] - YYYY-MM-DD` 小节；
3. 在提交信息中添加 `[release]` 前缀，CI 会构建、创建 `v<version>` 标签并发布 Release。

## 许可与第三方素材

本项目基于 [AGPL-3.0](./LICENSE) 发布，该许可**仅覆盖本仓库贡献者编写的代码，不覆盖任何第三方素材**。

### 与 MC 百科的关系

- 本项目是**非官方**辅助工具，与 MC 百科（[mcmod.cn](https://www.mcmod.cn/)）运营方无隶属、合作或背书关系。
- 脚本运行所依赖的站点页面结构、样式表、图标、文案以及后台框架 HTML，版权归 mcmod.cn 或其权利人所有，
  不在 AGPL-3.0 的授权范围内。
- 仓库中为兼容宿主页面与离线测试而**复刻**的页面结构（例如 `e2e/support/admin/index.html`）
  仅用于上述目的，本项目不对其主张任何权利；如权利人提出异议，我们会调整或移除相关内容。
- 脚本中引用的百科资料正文均使用 CC BY-NC-SA 3.0 协议授权。
- 使用本项目进行资料编辑、审核等操作时，仍须遵守 MC 百科自身的站点规则与使用条款。
