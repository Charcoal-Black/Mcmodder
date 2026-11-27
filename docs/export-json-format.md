# 导出器 JSON 格式对照

收纳贴里的 JSON 来自多个第三方导出器（IRR、IconR、LMS、MAEx 等），它们的字段名、类型与
序列化习惯各不相同。`src/vue/components/jsonframe/ItemJsonFrame.vue` 的 `parseText` 在导入时
统一做一次归一化，本文件记录这些差异的来源与对应处理，改动归一化规则时请同步此表。

除物品外，部分导出器还会输出实体、状态效果、流体与合成表，这些格式见「其他资料类型」，
它们目前没有对应的导入界面，仅作格式参考。

分析对象为各仓库的默认分支，结论来自各仓库负责写 JSON 的类：

| 仓库             | 分支                                                                                                                                                                                | 写入类                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| MAEx             | `zgxhzhr/meowarchive` `1.21.1`                                                                                                                                                      | `common/.../exporter/core/LmsWriter.java`（物品/实体/效果/流体）、`scan/RegistryScanner.java`                                                  |
| IRR              | `0999312/Item-Render-Rebirth` `master`（1.12.2）                                                                                                                                    | `src/main/java/itemrender/client/export/ItemData.java`、`MobData.java`、`ExportUtils.java`                                                     |
| IconR            | `GregTaoo/IconRenderer` `v2.0`（Fabric 1.16.5~1.20.1）                                                                                                                              | `Fabric-*/src/main/java/top/gregtao/iconr/export/ExportItemTask.java`、`ExportEntityTask.java`、`ExportRecipeTask.java`、`recipe/*Dumper.java` |
| IconR Forge 移植 | `pkstDev/IconRendererPort` `forge/1.18.2`、`BocchiKessokuTeam/IconRendererRePort` `forge/1.19.x`、`Nova-Committee/IconR` `master`、`Darknight123MC/IconRendererPort` `forge/1.18.2` | `utils/JsonMeta.java`、`utils/EntityJsonMeta.java`、`utils/FileHelper.java`                                                                    |
| LMS              | `xkball/LetMeSeeSee` `master`（NeoForge 1.21）                                                                                                                                      | `client/gui/screen/ItemDataExporterScreen.java`                                                                                                |
| RecipeDumper     | `friendlyhj/RecipeDumper` `main`（Forge 1.16.5）                                                                                                                                    | `impl/DumpRecipeCommand.java`、`impl/*RecipeDumper.java`                                                                                       |
| EffectExport     | `AmarokIce/EffectExport` `master`（Forge 1.18.2）                                                                                                                                   | `effect_export/ImgHelper.java`、`effect_export/Data.java`                                                                                      |

## 文件布局

除两个合成表导出器与 EffectExport 的效果表外都是 **JSONL**（一行一个对象，不是数组），只是路径与粒度不同。

| 导出器           | 路径                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| IRR              | `export/<modid>_item.json`、`<modid>_entity.json`                                                                                                     |
| IconR (v2)       | `IconRenderer/Json/<modid>/<modid>-items.json`、`-entities.json`、`-recipes.json`；实体图另存 `IconRenderer/Images/<modid>/Entities/<path>-128px.png` |
| IconR Forge 移植 | `IconRendererOutput/<modid>.json`（物品）、`<modid>_entity.json`                                                                                      |
| LMS              | `<export>/<namespace>.json`（按 `registerName` 排序）、`<export>/_images/*.png`                                                                       |
| MAEx             | `<ns>/<ns>_items.json`、`_entities.json`、`_effects.json`、`_fluids.json`，以及混合全部条目的 `_all.json`（每条带 `kind`）                            |
| RecipeDumper     | `export/dump_recipes_<modid>.json`（单个 JSON 对象）                                                                                                  |
| EffectExport     | `export/<modid>_effect.json`（单个 JSON 数组）                                                                                                        |

## 物品字段对照

空表示该导出器不输出此字段。

| 字段                    | IRR                      | IconR v2                             | IconR Forge 移植                                   | LMS                            | MAEx                           |
| ----------------------- | ------------------------ | ------------------------------------ | -------------------------------------------------- | ------------------------------ | ------------------------------ |
| `name`                  | ✓                        | ✓                                    | ✓                                                  | ✓ `zh_cn`                      | ✓ `zh_cn`，缺失回退 `en_us`    |
| `englishName`           | ✓                        | ✓                                    | ✓                                                  | ✓                              | ✓                              |
| `registerName`          | ✓                        | ✓                                    | ✓                                                  | ✓                              | ✓                              |
| `type`                  | `Block`/`Item`           | **恒 `Item`**                        | `Block`/`Item`                                     | `Block`/`Item`                 | `Block`/`Item`                 |
| `metadata`              | ✓ int                    |                                      |                                                    |                                |                                |
| 创造栏                  | `CreativeTabName`        | `CreativeTabName`，多分类以 `,` 连接 | `CreativeTabName`（`Darknight123MC` 的移植不输出） | `CreativeTabName`，缺省 `未知` | `CreativeTabName`，缺省 `未知` |
| 标签                    | `OredictList` = `[a, b]` | **`TagList`: `string[]`**            | `OredictList` = `[a, b]`                           | `OredictList` = `[a,b]`        | `OredictList` = `[a,b]`        |
| 最大堆叠                | `maxStackSize` int       | `maxStackSize` **字符串**            | `maxStacksSize` int                                | `maxStacksSize` int            | `maxStacksSize` int            |
| 最大耐久                | `getMaxDamage()+1`       | `getMaxDamage()`                     | `getMaxDamage()`                                   | `getMaxDamage()`               | `getMaxDamage()`               |
| `smallIcon`/`largeIcon` | 裸 Base64                | 裸 Base64                            | 裸 Base64                                          | 裸 Base64                      | 裸 Base64，关闭图标时为空串    |

`id`、`classID`、`itemType`、`classAbbr`/`className`/`classEname`、`branch`、`jump*`、`general*`、`harvestTools`、`content` 等百科业务字段**任何导出器都不输出**，由脚本自行补全。

## 物品差异清单

1. **标签字段名不同**：IconR v2 输出 `TagList`（`["minecraft:planks", ...]`），其余输出 `[a,b]` 形式的 `OredictList` 字符串。
2. **标签分隔符不同**：IRR（`List.toString()`）与 IconR 的 Forge 移植用 `", "`，LMS/MAEx 用 `","`。
3. **别名与类型**：IRR/移植/LMS/MAEx 用 `maxStacksSize`；IconR v2 用 `maxStackSize` 但序列化为字符串（`maxDurability` 同样是字符串）。
4. **`type` 语义**：IconR v2 把方块也标成 `Item`，无法从数据上区分。
5. **`maxDurability` 语义**：IRR 为 `getMaxDamage()+1`（1.12 的"损耗值"语义，不可损伤物品为 1），其余为 `getMaxDamage()`（不可损伤为 0）；脚本对带 `metadata` 的行回退一位。
6. **MAEx 合并文件**：`<ns>_all.json` 中每行带 `kind`（`item`/`entity`/`effect`/`fluid`），只有 `item` 行是物品。
7. **创造栏**：`Darknight123MC/IconRendererPort` 把 `CreativeTabName` 注释掉了，该字段缺失属正常。

## 其他资料类型

### 实体

LMS 当前 `master` 只导出物品；MAEx 的实体字段按其声称的 LMS 兼容格式输出。

| 字段           | IRR            | IconR v2       | IconR Forge 移植                               | MAEx                                                             |
| -------------- | -------------- | -------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `name`         | ✓              | ✓              | ✓                                              | ✓ 缺 `zh_cn` 时回退 `en_us`                                      |
| 英文名         | `Englishname`  | `englishName`  | `englishName`                                  | `Englishname`                                                    |
| `registerName` | 实体注册名     | 实体注册名     | **掉落物表 id**（`minecraft:entities/zombie`） | 实体注册名                                                       |
| `mod`          | ✓              |                | ✓                                              | ✓                                                                |
| `type`         |                |                | 恒 `Entity`                                    |                                                                  |
| 主图标         | `Icon` 200×200 | `Icon` 128×128 | `Icon` 128×128                                 | `Icon` 128×128                                                   |
| 小图标         |                |                |                                                | `IconSmall` 32×32                                                |
| 其他           |                |                |                                                | `iconSource`、`noVisual`、`suspect`、`suspectReason`、`renderer` |

- 实体覆盖范围不同：IRR 遍历 `ForgeRegistries.ENTITIES`，非 `EntityLivingBase`（投射物等）也会写一行但 `Icon` 是空串；IconR v2 只导出生灵实体（`LivingEntity`），Forge 移植只导出 `MobEntity`，MAEx 按注册表全导但跳过无名 `MISC`。
- 实体图标同样是**裸 Base64**（没有 `data:image/png;base64,` 前缀），导入前需要补前缀。
- IRR 的 `MobData` 字段最少：只有一张 200×200 的 `Icon`（由 `FBOHelper(200)` 渲染），中英文名都取自 `entity.<name>.name` 翻译键。
- Forge 移植（含 `Nova-Committee/IconR`）用 `entity.getType().getLootTableId()` 填 `registerName`，所以得到的是战利品表 id 而不是实体类型 id，导入时无法直接对应百科实体注册名；Nova 的分支改用 `getDefaultLootTable()`，结论相同。
- MAEx 只跳过「中英文名都为空且属于 `MISC` 类别」的技术性实体（投射物、辅助实体），漏写翻译的真生物照常导出，名字回退为注册名。

### 状态效果

有两个导出器：MAEx（`<ns>_effects.json`）与 EffectExport（`export/<modid>_effect.json`）。

MAEx 的全部字段：

| 字段                                        | 说明                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `name` / `Englishname`                      | 中文名缺失回退英文名，都没有写空串                                                                                 |
| `mod` / `registerName`                      | 命名空间与效果注册名                                                                                               |
| `category`                                  | 面向百科的 `BUFF` / `DEBUFF`（`BENEFICIAL`/`HARMFUL` 直接映射，`NEUTRAL` 取导出配置 `effectNeutral`，默认 `BUFF`） |
| `effectCategory`                            | 原版注册表分类 `BENEFICIAL` / `HARMFUL` / `NEUTRAL`                                                                |
| `color` / `instant`                         | 效果颜色、是否瞬间效果                                                                                             |
| `Icon` / `IconSmall`                        | 128×128 / 32×32，来自效果贴图（`iconMode` 恒为 `nearest`）                                                         |
| `iconSource` / `iconMode`                   | `sprite` / `nearest`                                                                                               |
| `iconColorCount` / `iconExpectedColorCount` | 图标实际颜色数与原贴图颜色数，用于自查                                                                             |
| `nameSource`                                | `zh_cn` / `en_us` / `none`                                                                                         |
| `warnings`                                  | 预留数组，目前恒为空                                                                                               |

MAEx 作者给出的百科导入映射是 `name→name`、`Englishname→ename`、`registerName→regname`、`category→category`、`IconSmall→icon32`、`Icon→icon128`。

EffectExport 是服务端 mod（命令 `/effectexport <modid>`），输出的是**美化打印的 JSON 数组**，字段也只有五个：

| 字段           | 说明                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| `registerName` | 效果注册名                                                              |
| `name`         | `getDisplayName()` 的结果，取决于运行环境语言（专用服务器上通常是英文） |
| `englishname`  | **全小写**；从 `assets/<modid>/lang/en_us.json` 查，缺失回退显示名      |
| `smallIcon`    | 裸 Base64，贴图放大 2×（意图是 32×32）                                  |
| `largeIcon`    | 裸 Base64，贴图放大 8×（意图是 128×128）                                |

- 图标直接读模组 jar 里的 `assets/<modid>/textures/mob_effect/<path>.png`，再按固定倍数放大（传 32 时 2×、128 时 8×），并不会强制缩放到目标尺寸——原版效果贴图是 18×18，实际往往得到 36×36 / 144×144。找不到贴图时字段是字符串 `"null"`（不是 `null`，也不是空串）。
- 没有 `mod`、`color`、`category`、`instant` 等字段，因此无法区分 BUFF / DEBUFF，也没有效果颜色。

### 流体

只有 MAEx（`<ns>_fluids.json`）导出，且只导 source 流体：

| 字段                                               | 说明                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `name` / `Englishname`                             | 缺失时逐级回退，最后按注册名转写                                       |
| `mod` / `registerName`                             | 命名空间与流体注册名                                                   |
| `color`                                            | ARGB 着色，`-1` 表示未知                                               |
| `bucket`                                           | 对应桶物品 id，无桶为空串                                              |
| `stillTexture` / `flowingTexture`                  | 静止/流动贴图 id（如 `block/water_still`）                             |
| `Icon` / `IconSmall`                               | 128×128 / 32×32，优先立体方块（顶面静止 + 侧面流动），失败时退回平面图 |
| `iconSource` / `iconMode`                          | `cube` / `texture` / `bucket` / 空，`iconMode` 恒为 `nearest`          |
| `IconStill` / `IconStillSmall` / `stillIconSource` | 另外保留的平面图标及其来源                                             |

### 合成表

有两个导出器：IconR v2（Fabric 1.16.5~1.20.1）与 RecipeDumper（Forge 1.16.5，命令 `/dumprecipe <mod>`）。两者都输出 `{"recipes": [...], "error": [...]}` 的**单个 JSON 对象**（美化打印），不是 JSONL。共同的形状（以 IconR v2 为例）：

```json
{
  "recipes": [
    {
      "type": "minecraft:crafting_shaped",
      "name": "mymod:my_pickaxe",
      "input": { "1": { "item": "minecraft:iron_ingot" }, "2": { "tag": "minecraft:planks" } },
      "output": { "1": { "item": "mymod:my_pickaxe", "count": 1 } }
    }
  ],
  "error": ["mymod:some_unsupported_recipe"]
}
```

|             | IconR v2                                                | RecipeDumper                                                                                                                                               |
| ----------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 筛选        | 按配方的模组归属                                        | 按配方 id 的命名空间                                                                                                                                       |
| `type`      | 配方序列化器的注册 id（如 `minecraft:crafting_shaped`） | 有序/无序合成硬编码为 `crafting_shaped` / `crafting_shapeless`（不带命名空间），其余取 `recipe.getType().toString()`（由配方类型自身实现决定，通常是短名） |
| `input` 值  | 原版 `Ingredient.toJson()` 原样                         | 原版 `Ingredient.serialize()` 再补一个 `count`（目前恒为 1）                                                                                               |
| `output` 值 | `{ item, count }`                                       | `{ item, count }`，有 NBT 时多一个 `nbt` 字段（SNBT 字符串）                                                                                               |
| `error`     | 找不到 dumper 的配方 id                                 | 序列化失败的配方 id；没有 dumper 的配方被**静默跳过**，连 `error` 都不进                                                                                   |

- 槽位号约定一致：有序合成按 3×3 网格 `1..9`（RecipeDumper 是 `y*3+x+1`，IconR 是 `i+j*3+1`），无序合成按原料顺序 `1..9`，熔炉/烟熏/高炉/营火/切石机只有 `"1"`；铁砧锻造在 1.16.5 / 1.19.3 及以前是 `1`=基底、`2`=添加物，1.19.4 起 IconR 拆成 `1`=基底、`2`=添加物、`3`=模板。
- 空原料槽不会出现在 `input` 里；`output` 都只有主产物，没有几率。
- RecipeDumper 只接受原版 ingredient（`Ingredient.isVanilla()` 为真），否则整条配方进 `error`；IconR v2 的原料值直接来自原版 `Ingredient.toJson()`（单物品 `{"item": id}`、标签 `{"tag": id}`），形状随 Minecraft 版本变化，不是稳定契约。
- RecipeDumper 可通过 `@IRecipeDumper.For` 注解给模组配方注册扩展 dumper，未注册的配方类型不会出现在输出里。

### 其他类型差异清单

1. **实体英文名大小写不一**：IRR、MAEx 用 `Englishname`，IconR 两系用 `englishName`。
2. **实体 `registerName` 语义**：Forge 移植写的是掉落物表 id，其余写实体类型注册名。
3. **实体图标字段**：统一叫 `Icon`（大写 I），只有 MAEx 额外给 `IconSmall`；IRR 渲染尺寸为 200，其余 128。
4. **效果字段命名三套**：MAEx `Englishname`/`Icon`/`IconSmall`，EffectExport `englishname`/`smallIcon`/`largeIcon`；EffectExport 还缺 `mod`、`color`、`category`、`instant`。
5. **效果贴图缺失的占位不同**：EffectExport 写字符串 `"null"`，MAEx 写空串。
6. **合成表两个导出器的顶层形状一致**，但 `type` 的命名、`input` 的 `count`、`output` 的 `nbt` 与 `error` 的语义都不同。
7. **两个合成表与 EffectExport 的效果表都不是 JSONL**，`error` 也不是逐行数组。
8. **覆盖范围**：效果 = MAEx / EffectExport，流体只有 MAEx，合成表 = IconR v2 / RecipeDumper，LMS 只导物品。
9. MAEx 的 `<ns>_all.json` 把实体/效果/流体也混在里面，靠 `kind` 区分；物品导入会跳过这些行。

## 脚本侧归一化

入口是 `src/vue/components/jsonframe/ItemJsonFrame.vue` 的 `parseText`（文件导入与收纳贴"下载并导入"共用），对每一行：

- `maxStacksSize` → `maxStackSize`，`CreativeTabName` → `creativeTabName`；
- `maxStackSize`/`maxDurability`/`metadata` 强制转数值，非法或空串时删除；
- 带 `metadata`（即 1.12 系导出器）的行把 `maxDurability` 回退一位，还原 `getMaxDamage()`；
- `TagList` → `OredictList`，并把分隔符统一为 `,`（`Utils.parseOredictList`）；
- `kind` 存在且不为 `item` 的行计为"跳过"，不写入资料；
- `smallIcon`/`largeIcon` 补 `data:image/png;base64,` 前缀。

`Utils.parseOredictList` 同时被 `TabEditInit`、`RecipeJsonFrame`（`FieldIndex` 的标签索引）与 `Utils.convertToImportableFormat`（写入编辑页 `oredict`）复用，因此历史数据里带空格的 `OredictList` 也能被正确匹配与提交。

脚本目前只有两个 JSON 导入入口：物品（`mcmodderJsonStorage`，`ItemJsonFrame`）与合成表（`mcmodderRecipeJsonStorage`，`RecipeJsonFrame`）。实体、状态效果、流体没有对应界面，上面记录的格式仅供将来扩展或人工核对；合成表入口也只接受脚本自己的 `Recipe` 数组，IconR v2 与 RecipeDumper 的 `{ recipes, error }` 都需要先做一次转换。
