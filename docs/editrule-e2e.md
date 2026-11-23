# 审核页自动查错的离线用例

审核页（`src/init/admin/AdminVerifyInit.ts`）的「快速查错」依赖 `src/editrule/*`：脚本从详情
HTML 里解析出一份编辑数据，再交给规则类逐条检查。这条链路的正确性由两层东西决定 ——
**解析**（HTML → 字段）和**规则**（字段 → 提示），只测其中一层都容易漏。

离线用例的做法是把站点本来会返回的详情 HTML 用 Vue 组件复刻出来
（`e2e/support/admin/verify/`），注入审核窗，让真实的解析与查错代码跑一遍。
于是「一份待审项长什么样」变成可版本化、可 diff 的代码，不必等真实用户提交一份带错误的编辑。

## 为什么用「坏编辑」而不是真实页面快照

真实待审项的字段大多是对的，偶尔一处不对；这类样本无法说明「规则是否还在工作」。
反过来，**按规则生成的反例**能直接回答两个问题：

1. 这条规则在审核页上会不会触发（解析层有没有把字段读丢）；
2. 它产生的提示文案、级别（error / warning / info）是否与实现一致。

因此 fixture 必须是**类型合法、内容违规**的：字段名与结构照 `src/types/types.d.ts` /
`src/Values.ts` 抄，只有值被改成触发条件的样子。字段语义始终以仓库为准，不以外部文档为准
（例如外部 Skill 里的 `durability`，在本仓库是 `damage`）。

## 目录结构 + 台账

```text
e2e/support/admin/verify/cases/
  baseline.ts   三类编辑的「干净基线」，必须一条提示都不产生
  ledger.ts     规则台账：有哪些规则、提示原文、触发条件、审核页能否触发
  network.ts    只服务列表筛选 / 详情骨架的网络 mock
  rules.ts      表驱动反例：{ id, edition, expect? }，id 指向台账
  collection.ts 把上面三份数据合并为 verifyEditions，列表 / 详情 / 种子共用
```

- `baseline.ts`：反例都是它的副本，**只改一处**。基线一旦混进杂音（链接串味、`mcversion`
  映射错误、空内容占位 `-` 被当成字段），所有反例都会一起变红，失败信息直接指向问题。
- `ledger.ts`：提示文案在 e2e 侧的**唯一来源**。`rules.ts` 只写台账 `id`，期望结果由
  `level` + `message` 推导；带动态片段（如「以下运作方式还未勾选版本：NeoForge。」）的
  规则由用例自己提供 `expect`。`editrules.spec.ts` 的第一个用例会把台账里的静态文案与
  `src/editrule/*.ts` 逐段比对，改文案却忘了改台账会直接失败。
- `network.ts`：列表行需要完整的编辑载荷（名称、图标、被引用的资料），与规则无关，
  因此只保留三条网络用例；规则反例不要塞进来，免得只关心筛选协议的用例跟着变慢。
- `rules.ts`：`id` 沿用源码里每条检查末尾的 `xxx_yyy` 注释（对应百科原生语言包
  `PublicLangData.editor.inform.list`）；源码没有标注键名的规则用 `scope:规则` 形式的
  自造 ID，不凭空发明原生键名。

## 每条用例都是真正的待审项

`collection.ts` 的 `verifyEditions` 是「后端里的全部待审项」：

```text
verifyEditions = network.ts 的 3 条 + 三类基线 + rules.ts 的每条反例（按 ID 升序）
```

它同时被三处使用，因此不存在「只为断言临时渲染、列表里却找不到」的 fixture：

| 使用方               | 用途                                                    |
| -------------------- | ------------------------------------------------------- |
| `mockVerifyInfo`     | 默认按 ID 返回详情；点开哪一条就解析哪一条              |
| `mockVerifyList`     | 默认按模组 / 类型 / 提交者筛选并渲染待审行              |
| `data/seed/index.ts` | 写入 `verifications` 表，驱动统计、管理者区域与仓储查询 |

于是 `npm run e2e:manual` 打开的待审列表就是这批数据本身：模组类在「1171 格雷科技社区版 →
模组」，资料 / 合成表在「1 我的世界原版 → 资料 / 合成表」，任意一行都能点开详情。

ID 必须全局唯一（网络 1–3、基线 101–103、反例 201–245 / 301–310 / 401–402），
并且每条都要带齐 `owner` / `classID` / `editID` / 时间戳；`editrules.spec.ts` 的
「待审项集合」用例会检查唯一性、升序与元数据完整性。

只关心筛选协议的用例（`admin-verify.spec.ts`）会显式传
`mockVerifyList(context, { allEditions: editCases })`，把行数固定在三条网络数据上。

断言是**精确相等**：`error` / `warning` / `info` 三个数组都要与期望完全一致。
「包含某条消息」这种写法会让上面那些杂音永远藏在水下。

## 规则台账的三种状态

- **已移植且可触发**（默认）：台账完整性用例强制要求 `rules.ts` 里必须有一条反例。
- **已移植但审核页不可达**：带 `unreachable` 说明原因，spec 生成一条 `test.fixme`。
- **未移植**（`status: "unported"`）：只记录「原生校验有、`editrule` 还没有」，同样生成
  `test.fixme`。断言一条当前实现不会产生的消息，只会把「待办」伪装成回归。

目前未移植的只剩「未修改任何项」（审核页拿不到「提交内容与线上完全一致」的信号）和
`tab_inout_notmatch`（审核页无法得知合成表是在哪个资料下提交的）。

当前记在名下的不可达规则：

- `class:relation_version_duplicate`：审核页的 `RelationCompareFrame` 以条件组名称为键
  合并，同名条件组在到达 `editrule` 之前就被折叠成一组；该规则只在编辑页生效。
- `common_content_title_broken` / `common_content_title_less` /
  `common_content_ban_title_duplicate`：审核详情用 `src/preview/ContentPreview` 输出预览
  HTML，`[h3=]` / `[ban:]` 已被替换成 `<span>`，`stripHtmlTag` 之后拿不到原始标记 ——
  真实审核页同样如此，只能在编辑页覆盖。

## 顺带修掉的问题

P1 把规则一条条跑通时，发现了三处问题：

1. **支持 MC 版本**：原实现只做编辑前后对比，没有写 `data.mcversion`，`class_mcver_empty`
   是一条死规则。现在从对比结果里反查加载器与版本，填回审核页实际展示的加载器。
2. **空正文占位符**：空单元格渲染为 `-`，`模组介绍` / `资料介绍` 把占位符当成了正文，
   于是「正文介绍中需要有文字介绍」永远不触发，反而多出标点与中文检查的提示。现在与其它
   文本字段一致，把 `-` 视为字段缺失。
3. **只有杂项元素的模组**：`Utils.getClassFullName` 直接对核心分类取 `.name`，用户只勾
   「资源 / 世界」这类杂项元素时，待审列表渲染会抛 `Cannot read properties of undefined`。
   把 `class_category_empty` 放进完整待审列表后才暴露这条；现在分类缺失时只显示名称。

> 相关链接的前缀显示的是键名（`curseforge`），不是 `Values.siteMap` 的值；这一点由
> fixture 的 `VerifyClassLink` 负责，解析层不需要反查。

## 正文词库

机翻 / 第一人称 / 不确定 / 不规范 / 版本模糊五类词库放在
`src/editrule/ContentBadWords.ts`，模组正文与资料正文共用：

- 词库来自站点公开资源 `/static/public/json/badwords.json`；
- 匹配方式与原生 `mc.edit.verify.functions.js` 一致：不区分大小写的子串匹配，
  命中项按词库顺序以「, 」拼接；
- 提示文案取自 `PublicLangData.editor.inform.list`，原生用 `<b>` 高亮命中词，
  脚本统一输出纯文本（`displayCheckResult` 会做 HTML 转义）。

`editrules.spec.ts` 额外用资料基线跑一条 `common_content_machine`，确认
`ItemEditRules` 也接上了共用的词库检查，而不是只修了模组这一侧。

## 外部参考

只作为**反例生成器**参考，代码与文档都不进仓库：

- [`zgxhzhr/mcmod-page`](https://github.com/zgxhzhr/mcmod-page)（MIT）：页面编写规范与
  常见错误清单，适合生成「读起来像真实不合格提交」的自然语言反例。
- [`Creeper-banner/MCMOD-Guide`](https://github.com/Creeper-banner/MCMOD-Guide)：仓库没有
  LICENSE，**只读不复制**。

两者对字段的称呼与本站表单不一致（`durability` / `damage` 之类的差异），
移植时必须回到 `src/Values.ts` 与 `src/types/types.d.ts` 核对。
