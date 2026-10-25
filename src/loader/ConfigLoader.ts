import { Utils } from "../Utils";
import { Values } from "../Values";

export const settings = [
  {
    id: "appearance",
    label: "外观",
    sections: [
      {
        id: "theme",
        label: "主题样式",
        settings: [
          {
            id: "themeColor1",
            title: "主题样式主配色",
            description: "主题样式主配色。",
            type: "colorpicker",
            value: "#86c155",
          },
          {
            id: "themeColor2",
            title: "主题样式副配色",
            description: "主题样式副配色。",
            type: "colorpicker",
            value: "#58b6d8",
          },
        ],
      },
      {
        id: "background",
        label: "背景",
        settings: [
          {
            id: "defaultBackground",
            title: "默认背景",
            description:
              "输入一个图片链接 URL。若当前页面没有设置背景，则自动使用此背景。图像加载可能会拖慢页面载入时间，可输入 <code>none</code> 以禁用此特性。",
            type: "text",
            value: Values.assets.bg,
          },
          {
            id: "defaultNightBackground",
            title: "默认夜间背景",
            description:
              "输入一个图片链接 URL，在夜间模式下此背景会覆盖默认背景。输入 <code>none</code> 以禁用此特性。",
            type: "text",
            value: Values.assets.nightMode.bg,
          },
        ],
      },
      {
        id: "ui",
        label: "UI 与排版",
        settings: [
          {
            id: "customFont",
            title: "自定义字体",
            description: "对百科默认字体应用选中的方案。",
            type: "dropdownMenu",
            value: 0,
            range: {
              0: "不指定",
              1: "使用系统字体组",
              2: "Noto Sans SC",
              3: "Inter",
            },
          },
          {
            id: "disableGradient",
            title: "禁用文字渐变",
            description: "勾选此项可能有助于提升性能。",
            type: "checkbox",
          },
          {
            id: "moveAds",
            title: "广告优化",
            description:
              "将百科的部分广告移动到不影响浏览体验的位置。（本脚本不会主动隐藏或屏蔽广告，若欲屏蔽请自行安装广告屏蔽插件）",
            type: "checkbox",
          },
          {
            id: "adaptableNightMode",
            title: "夜间模式自适应",
            description:
              "夜间模式将跟随当前浏览器偏好设置而自动开启或关闭。启用此配置也将隐藏页面右上角的夜间模式开关。",
            type: "checkbox",
          },
          {
            id: "bbsNightMode",
            title: "社群夜间模式兼容",
            description: "(Beta!) 对社群应用夜间模式配色。",
            type: "checkbox",
          },
          {
            id: "forceV4",
            title: "强制v4",
            description: "打开百科任意非v4主页时，自动跳转到v4主页。",
            type: "checkbox",
          },
          {
            id: "backgroundAlpha",
            title: "背景透明度",
            description: "控制背景透明度，数值越小透明度越高。",
            type: "slider",
            value: 204,
            range: [128, 255],
          },
          {
            id: "textShadowAlpha",
            title: "文字阴影透明度",
            description: "控制夜间模式下的文字阴影透明度，数值越小透明度越高。",
            type: "slider",
            value: 64,
            range: [0, 255],
          },
          {
            id: "radiusRatio",
            title: "圆角大小比例",
            description: "控制页面中绝大多数 UI 元素的边缘圆角半径。",
            type: "slider",
            value: 1,
            range: [0, 1],
          },
          // {
          //   id: "mcmodderUI",
          //   title: "Mcmodder风格UI",
          //   description:
          //     "启用 Mcmodder 风格的 UI 界面。（目前此配置项尚未完全分离，强烈建议保持该配置项为启用状态！）",
          //   type: "checkbox",
          // },
          // {
          //   id: "unlockHeaderContainer",
          //   title: "取消锁定导航栏",
          //   description: "使页面最上方导航栏默认隐藏，只有当光标移至其上时才会显示。",
          //   type: "checkbox",
          // },
          {
            id: "autoExpandPage",
            title: "自动展开页面",
            description: "根据时间范围搜索待审列表和历史编辑记录时，自动展开所有页面。",
            type: "checkbox",
          },
          {
            id: "compactedChild",
            title: "紧凑化综合子资料",
            description: "减少每个综合子资料所占用的页面空间。",
            type: "checkbox",
          },
          // {
          //   id: "compactedTablist",
          //   title: "紧凑化合成表",
          //   description:
          //     "减少每个合成表所占用的页面空间，同时使用物品小图标替代材料统计中的物品名称，以及显示合成表 ID！本机安装字体 <a href=\"https://ftp.gnu.org/gnu/unifont/\" target=\"_blank\">Unifont</a> 后食用风味更佳。",
          //   type: "checkbox",
          // },
          {
            id: "compactedVerifylist",
            title: "紧凑化待审列表",
            description: "对待审列表重新排版。",
            type: "checkbox",
          },
          {
            id: "compactedVerifyEntry",
            title: "紧凑化审核界面",
            description:
              "将有效的编辑对比表格尽可能移到靠前的位置，以省去一些时候使用鼠标滚轮的麻烦。",
            type: "checkbox",
          },
          {
            id: "advancedRanklist",
            title: "贡献榜重排版",
            description: "让贡献榜中各用户的昵称、排名、编辑量、编辑占比一目了然！",
            type: "checkbox",
          },
          {
            id: "advancedOredictPage",
            title: "矿词/标签页重排版",
            description: "减小矿词/标签页中单个物品所占用的页面空间，并将各物品按所属模组分类。",
            type: "checkbox",
          },
        ],
      },
    ],
  },
  {
    id: "center",
    label: "个人中心",
    sections: [
      {
        id: "center",
        label: "个人中心",
        settings: [
          {
            id: "customAdvancements",
            title: "成就拓展",
            description: "启用自定义成就及相关特性。",
            type: "checkbox",
          },
          {
            id: "autoCheckin",
            title: "自动签到",
            description: "每日首次访问百科，或是本机时间为 00:00:00 时，自动执行签到操作。",
            type: "checkbox",
          },
          {
            id: "centerMainExpand",
            title: "个人主页数据拓展",
            description: "显示平均字数和科龄，令模组区域并排显示，过长的模组区域默认压缩。",
            type: "checkbox",
          },
          {
            id: "byteChart",
            title: "字数活跃图表",
            description:
              "决定是否在个人主页显示字数活跃图表，以及是否在贡献榜查看历史贡献数据时自动获取编辑字数数据。",
            type: "checkbox",
          },
          {
            id: "maxByteColorValue",
            title: "字数活跃图表最大有效值",
            description:
              "决定字数活跃图表的总体颜色深度，当日编辑字节数大于该值时，对应字数图表中的色块始终为黑色。",
            type: "number",
            value: 30000,
            range: [5000, 524984],
            visible: (ctx) => ctx.configs.getSettings("byteChart"),
          },
          {
            id: "expCalculator",
            title: "经验计算器",
            description: "决定是否在个人等级页显示当前等级相关数据。",
            type: "checkbox",
          },
        ],
      },
    ],
  },
  {
    id: "editor",
    label: "编辑与资料",
    sections: [
      {
        id: "common",
        label: "通用",
        settings: [
          {
            id: "classAddHelper",
            title: "展开模组添加分页",
            description: "使模组添加页面中的所有内容全部同屏显示。",
            type: "checkbox",
          },
          {
            id: "noSubmitWarningDelay",
            title: "取消提交警告延时",
            description:
              "<del>你的时间非常值钱</del>准备提交编辑时，取消“警告”级别提醒的等待时间。慎重使用！",
            type: "checkbox",
          },
          {
            id: "autoSaveFix",
            title: "自动保存修复",
            description: "修复百科本体 Bug：自动存档时当前菜单自动关闭。",
            type: "checkbox",
          },
          {
            id: "fastSubmitFix",
            title: "快速提交修复",
            description: "修复百科本体 Bug：快速提交时编辑框意外换行。",
            type: "checkbox",
          },
          {
            id: "anonymousUknowtoomuch",
            title: "匿名吐槽",
            description:
              "创建吐槽时不再记录创建人（仅影响光标悬浮于其上时的提示信息，不影响改动对比数据）。",
            type: "checkbox",
          },
          {
            id: "tabSelectorInfo",
            title: "物品搜索详情",
            description:
              "在合成表编辑界面中搜索物品时，显示每个物品的详细信息，并将属于当前模组的物品置顶。",
            type: "checkbox",
          },
          {
            id: "autoCloseSwal",
            title: "渐入佳境",
            description: "成功提交审核后不再强制跳转至待审列表页面。对免审编辑无效。",
            type: "checkbox",
          },
          {
            id: "multiDiffCompare",
            title: "改动列表批量对比",
            description:
              "(WIP) 在改动列表页中分别选取起始项和终止项，即可一键获取并展示在此期间的所有改动详情。",
            type: "checkbox",
          },
          {
            id: "fastUrge",
            title: "快速催审",
            description: "在待审列表中显示“一键催审”按钮。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "editor",
        label: "编辑器",
        settings: [
          {
            id: "editorAutoResize",
            title: "编辑器尺寸自适应",
            description: "使编辑器的长度随正文内容，宽度随窗口尺寸自动调整。",
            type: "checkbox",
          },
          {
            id: "editorStats",
            title: "编辑量实时统计",
            description:
              "实时显示编辑器中的有效正文字节数和字节变动量，该配置值大于 0 时启用该特性，字节量超过该配置值时，字节数自动统计和源代码编辑器的内容自动同步会暂停，以避免卡顿。字节数统计不保证 100% 精确，且除正文改动外的其他操作也可能会影响最终的字节变动量。",
            type: "number",
            value: 10000,
            range: [0, null],
          },
          {
            id: "mdEditorInlineCodeConverter",
            title: "Markdown 编辑器行内代码标签转换方式",
            description:
              "选择在将 Markdown 编辑器的内容转换为富文本中，遇到由反引号括起的内容所转换而成的行内代码标签时，脚本所自动执行的操作。",
            type: "dropdownMenu",
            range: {
              0: "保留并警告",
              1: "转换为纯文本",
              2: "转换为斜体文本",
            },
          },
          {
            id: "mdEditorBlockquoteConverter",
            title: "Markdown 编辑器块引用标签转换方式",
            description:
              '选择在将 Markdown 编辑器的内容转换为富文本中，遇到由 ">" 开头的段落所转换而成的块引用标签时，脚本所自动执行的操作。',
            type: "dropdownMenu",
            range: {
              0: "保留并警告",
              1: "转换为纯文本",
              2: "转换为灰色斜体文本",
            },
          },
          {
            id: "htmlEditorIndentSize",
            title: "源代码编辑器自动缩进风格",
            description: "选择源代码编辑器自动美化 HTML 文档所使用的缩进风格。",
            type: "dropdownMenu",
            value: 2,
            range: {
              0: "关闭自动美化",
              1: "Tab",
              2: "2 个空格",
              4: "4 个空格",
              8: "8 个空格",
            },
          },
        ],
      },
      {
        id: "check",
        label: "审查",
        settings: [
          {
            id: "disableAutoStyleFix",
            title: "禁用正文样式修复",
            description:
              "通常情况下，脚本会自动去除正文资料中的异常白色背景颜色和黑色文字颜色，并在夜间模式下微调文字亮度，以保证阅读体验。想要针对性编辑修复异常样式问题时，推荐启用此配置项。",
            type: "checkbox",
          },
          {
            id: "imageLocalizedCheck",
            title: "图像本地化检测",
            description:
              "高亮资料正文中未存储在百科本地中的图片资源（非 PNG/JPG/JPEG/GIF 格式或文件大小超出 1,024 KB 的除外），以便<del>水编辑次数</del>及时重新上传到本地，防止图片丢失。",
            type: "checkbox",
          },
          {
            id: "linkCheck",
            title: "资料链接检查",
            description:
              "在资料正文和后台审核中高亮疑似冲突的链接和旧的基于 Fandom 的 Minecraft Wiki 链接。",
            type: "checkbox",
          },
          {
            id: "linkMark",
            title: "资料链接标注",
            description:
              "在启用“资料链接检查”的基础上，在资料正文和后台审核中所有的链接旁标注该链接所指向的 URL。",
            type: "checkbox",
            visible: (ctx) => ctx.configs.getSettings("linkCheck"),
          },
          {
            id: "removePostProtection",
            title: "免教程保护",
            description: "移除未经允许禁止转载的个人教程防复制保护。尊重原创！",
            type: "checkbox",
          },
        ],
      },
      {
        id: "table",
        label: "表格",
        settings: [
          {
            id: "autoFoldTable",
            title: "表格自动折叠",
            description: "自动折叠正文内容中超过设定行数的表格。设置为 0 以禁用。",
            type: "number",
            value: 10,
            range: [0, null],
          },
          {
            id: "tableFix",
            title: "表格特性修复",
            description:
              "使用 CSS 的标准属性替换百科表格中默认使用的 HTML 内联属性，并修复模组页正文表格中表头文字未正确居中的问题。",
            type: "checkbox",
          },
          {
            id: "tableThemeColor",
            title: "表格应用样式",
            description: "对表格框线应用主题颜色。",
            type: "checkbox",
          },
          {
            id: "tableLeftAlign",
            title: "表格图片左对齐",
            description: "统一左对齐资料正文中出现的表格和图片。（此配置项可能导致排版混乱）",
            type: "checkbox",
          },
        ],
      },
      {
        id: "logs",
        label: "更新日志",
        settings: [
          {
            id: "versionHelper",
            title: "日志智能管理",
            description:
              "允许从其他网站获取模组版本列表，并支持一键补充缺失的日志。支持 CurseForge 和 Modrinth 双平台。",
            type: "checkbox",
          },
          {
            id: "versionEditorHelper",
            title: "日志搬运辅助工具",
            description: "允许直接输入版本更新日期，而不再需要通过下拉列表勾选日期。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "mod",
        label: "模组与资料",
        settings: [
          {
            id: "disableClassDataTypesetting",
            title: "恢复模组页排版",
            description:
              /* "在启用“Mcmodder 风格 UI”的基础上，" */ "禁用对模组页和整合包页的默认排版功能。可能更利于编辑者审查模组基本信息。",
            type: "checkbox",
          },
          {
            id: "compactSupportedVersions",
            title: "支持版本压缩",
            description:
              "将多个相近的支持版本显示为一个版本，如 {1.12.2, 1.12.1, 1.12} => 1.12.x。按住 Shift 键时显示原始的版本列表。",
            type: "checkbox",
          },
          {
            id: "fastCopyName",
            title: "快速复制名称",
            description: "轻触模组或物品名称即可快速将其复制到剪贴板。",
            type: "checkbox",
          },
          {
            id: "rememberModRelation",
            title: "模组关系记录器",
            description:
              "打开模组主页时，自动记忆该模组的前置、拓展信息。配合“物品搜索详情”配置项使用时，属于当前所编辑模组的前置或拓展模组的物品也会在搜素结果中被置顶。",
            type: "checkbox",
          },
          {
            id: "hoverDescription",
            title: "物品资料链接预览",
            description: "当鼠标悬停于正文中某一物品资料的链接时，显示该资料的正文预览。",
            type: "checkbox",
          },
          {
            id: "hoverImage",
            title: "在资料预览显示正文图片",
            description: "在资料的正文预览中显示正文中的图片。",
            type: "checkbox",
            visible: (ctx) => ctx.configs.getSettings("hoverImage"),
          },
          {
            id: "rememberVisitedMods",
            title: "最近浏览模组追踪",
            description: "自动记录我最近浏览的模组。这些模组会显示在主页。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "presubmit",
        label: "预编辑",
        settings: [
          {
            id: "preSubmitCheckInterval",
            title: "预编辑检测间隔",
            description:
              "设置相邻两次自动检测预编辑资料是否具备可正式提交条件之间的最短冷却时间，单位为小时，设置为小于 0.1 以禁用所有预编辑相关特性。",
            type: "number",
            value: 0,
            range: [0, null],
          },
        ],
      },
      {
        id: "verify",
        label: "后台管理",
        settings: [
          {
            id: "autoVerifyDelay",
            title: "自动查询待审项",
            description:
              "当打开百科页面时，自动查询所管理模组的待审项，并弹出提示消息。设置相邻两次自动查询待审项之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。",
            type: "number",
            value: 0,
            range: [0, null],
            visible: (ctx) => Utils.hasVerifyOperateAccess(ctx.permission),
          },
          {
            id: "alwaysNotifyVerification",
            title: "实时更新审核项",
            description: "设置后台待审列表自动刷新间隔，单位为分钟，设置为小于 0.1 以禁用。",
            type: "number",
            value: 0,
            range: [0, null],
            visible: (ctx) => Utils.hasVerifyAccess(ctx.permission),
          },
          {
            id: "splitScreenOnVerify",
            title: "审核页面分屏",
            description:
              "在后台查看一个待审项时，其内容只会占据右半区域，左半部分依旧可预览列表中的其他待审项。（为保证排版正常，此配置在移动端无效）",
            type: "checkbox",
            value: false,
            visible: (ctx) => Utils.hasVerifyAccess(ctx.permission),
          },
          {
            id: "itemListStylePreview",
            title: "样式管理预览",
            description: "编辑模组资料列表样式时，实时显示当前样式预览。",
            type: "checkbox",
            value: false,
            visible: (ctx) => Utils.hasVerifyOperateAccess(ctx.permission),
          },
          {
            id: "itemListStyleFix",
            title: "样式管理修复",
            description: "修复百科本体 Bug：原始字符串未转义导致当前样式无法显示。",
            type: "checkbox",
            value: false,
            visible: (ctx) => Utils.hasVerifyOperateAccess(ctx.permission),
          },
        ],
      },
    ],
  },
  {
    id: "community",
    label: "社交",
    sections: [
      {
        id: "comment",
        label: "短评区/留言板",
        settings: [
          {
            id: "unlockComment",
            title: "无限制留言板",
            description:
              "强行显示目标用户留言板，或是模组/作者的短评区，即使其已受天体运动影响而关闭。请勿滥用，除非你想见到重生亲手把这个特性毙掉。",
            type: "checkbox",
          },
          {
            id: "replyLink",
            title: "楼中楼跳转链接",
            description:
              "轻触短评楼中楼里出现的链接来快捷访问。该功能可能无法正确识别后文紧随其他文字的链接。",
            type: "checkbox",
          },
          {
            id: "missileAlert",
            title: "核弹警告",
            description: "当短评长度超过特定值时，弹出核弹警告。",
            type: "checkbox",
          },
          {
            id: "missileAlertHeight",
            title: "核弹触发最短长度",
            description: "设置核弹警告触发所需的短评长度下限，单位为 px。",
            type: "number",
            value: 1000,
            range: [0, null],
            visible: (ctx) => ctx.configs.getSettings("missileAlert"),
          },
          {
            id: "commentExpandHeight",
            title: "短评折叠最短长度",
            description: "设置短评被折叠时所显示的长度，单位为 px。",
            type: "number",
            value: 300,
            range: [0, null],
          },
          {
            id: "commentJumpRequestLimit",
            title: "短评跳转查找请求上限",
            description:
              "通过 #comment-<id> 链接跨页跳转短评时，二分查找目标页最多发出的请求数。超过上限仍未定位则停止查找。",
            type: "number",
            value: 12,
            range: [1, null],
          },
          {
            id: "userBlacklist",
            title: "用户黑名单",
            description:
              "自动屏蔽所选定用户发布的短评和回复。输入要屏蔽的用户 UID，多个 UID 间用半角逗号隔开。",
            type: "text",
          },
          {
            id: "alwaysNotify",
            title: "实时通讯",
            description: "设置短评动态提醒自动刷新间隔，单位为分钟，设置为小于 0.1 以禁用。",
            type: "number",
            value: 0,
            range: [0, null],
          },
          {
            id: "ignoreEmptyLine",
            title: "忽略短评空白行",
            description: "隐藏短评正文中的空白行。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "userlist",
        label: "快捷串门",
        settings: [
          {
            id: "rememberVisited",
            title: "最近串门追踪",
            description: "自动记录我最近串门的用户。经常串门的用户会显示在“最近串门”当中。",
            type: "checkbox",
          },
          {
            id: "favUserDisplayStyle",
            title: "收藏用户样式",
            description: "决定“最近串门”列表中已收藏用户的头像显示样式。",
            type: "dropdownMenu",
            value: 0,
            range: {
              0: "星星",
              1: "大头钉",
              2: "爱心",
            },
          },
        ],
      },
    ],
  },
  {
    id: "cloud",
    label: "云端与更新",
    sections: [
      {
        id: "cloud",
        label: "云端服务",
        settings: [
          {
            id: "useSupabase",
            title: "启用云端服务",
            description:
              "是否启用 Mcmodder 云端服务与功能。相关服务由 Supabase 驱动。若禁用此项，所有依赖云端服务的功能都不会运作。",
            type: "checkbox",
            value: true,
          },
          {
            id: "fetchCustomSplashes",
            title: "抓取云端闪烁标语",
            description: "是否抓取与显示用户投稿并审核通过的 Supabase 云端闪烁标语。",
            type: "checkbox",
            visible: (ctx) => ctx.configs.getSettings("useSupabase"),
          },
          {
            id: "customSplashRate",
            title: "云端标语替换概率 (%)",
            description: "设置进入主页时使用云端自定义闪烁标语替换 MC百科 官方默认标语的概率。",
            type: "number",
            value: 50,
            range: [0, 100],
            visible: (ctx) =>
              ctx.configs.getSettings("useSupabase") &&
              ctx.configs.getSettings("fetchCustomSplashes"),
          },
          {
            id: "supabaseSplash",
            title: "云端闪烁标语同步",
            description:
              "[需要用户认证] 启用后，脚本会将主页记录的闪烁标语自动上传到云端的闪烁标语库，同时记录标语贡献者。",
            type: "checkbox",
            visible: (ctx) => ctx.configs.getSettings("useSupabase"),
          },
          {
            id: "anonymiseSplashContributor",
            title: "匿名闪烁标语贡献者",
            description:
              "(WIP) [需要用户认证] 启用后，您所提交的闪烁标语的贡献信息将对其他用户隐藏。",
            type: "checkbox",
            visible: (ctx) =>
              ctx.configs.getSettings("useSupabase") && ctx.configs.getSettings("supabaseSplash"),
            syncWithSupabase: true,
          },
          {
            id: "supabaseByteChart",
            title: "云端字数统计数据",
            description: "启用后，脚本会从云端读取贡献榜数据，用于显示个人主页的字数活跃图表。",
            type: "checkbox",
            visible: (ctx) =>
              ctx.configs.getSettings("useSupabase") && ctx.configs.getSettings("byteChart"),
          },
          {
            id: "showUserBadge",
            title: "脚本用户展示",
            description:
              "(WIP) [需要用户认证] 启用后，您将能够在短评区/留言板中看到其他同样正在使用 Mcmodder 且启用了此选项的用户！同时，您对于其他用户也是如此。",
            type: "checkbox",
            visible: (ctx) => ctx.configs.getSettings("useSupabase"),
            syncWithSupabase: true,
          },
          {
            id: "customAttitude",
            title: "自定义表态",
            description:
              "启用短评自定义表态（恶魔安格瑞与全 emoji）、消息中心表态消息与个人中心表态统计。浏览短评表态无需认证；发送表态、消息中心与个人统计仍需完成用户认证。",
            type: "checkbox",
            value: true,
            visible: (ctx) => ctx.configs.getSettings("useSupabase"),
          },
          {
            id: "attitudeTwemoji",
            title: "表态使用 Twemoji 字体",
            description: "用 Mozilla Twemoji 字体渲染自定义表态 emoji，保证跨平台一致外观。",
            type: "checkbox",
            visible: (ctx) =>
              ctx.configs.getSettings("useSupabase") && ctx.configs.getSettings("customAttitude"),
          },
        ],
      },
      {
        id: "update",
        label: "更新检查",
        settings: [
          {
            id: "autoCheckUpdate",
            title: "自动检查更新",
            description: "每隔一段时间自动检查更新，并在有新更新可用时提醒。",
            type: "checkbox",
            value: true,
          },
        ],
      },
    ],
  },
  {
    id: "other",
    label: "其他",
    sections: [
      {
        id: "keybind",
        label: "快捷键",
        settings: [
          {
            id: "keybindFastLink",
            title: "自动链接",
            description: `在此可修改打开本脚本所提供“自动链接”功能的快捷键。百科原生自带的“自动链接”（通过 ${Utils.keyToString({ altKey: true, keyCode: 88 })} 打开）已终止支持，其入口会在将来的版本中移除。`,
            type: "keybind",
            value: { altKey: true, key: "C", keyCode: 67 },
            visible: (ctx) => !ctx.mobile,
          },
          {
            id: "keybindFastSubmit",
            title: "快速提交",
            description: `在此可修改百科“快速提交”的快捷键。（受技术限制，百科本体的“快速提交”快捷键无法被禁用。为避免冲突，若此项配置包含 ${Utils.keyToString({ ctrlKey: true, keyCode: 13, key: "Enter" })}，则其不会生效。）`,
            type: "keybind",
            value: { ctrlKey: true, key: "Enter", keyCode: 13 },
            visible: (ctx) => !ctx.mobile,
          },
          {
            id: "keybindVerifyPass",
            title: "通过编辑",
            description: "在此可修改审核通过/助理建议通过的快捷键。",
            type: "keybind",
            value: Utils.getXplatCtrlCombinationKey({ key: "Enter", keyCode: 13 }),
            visible: (ctx) => !ctx.mobile && Utils.hasVerifyAccess(ctx.permission),
          },
          {
            id: "keybindVerifyRefund",
            title: "退回编辑",
            description: "在此可修改审核退回/助理建议退回的快捷键。",
            type: "keybind",
            value: { shiftKey: true, key: "Enter", keyCode: 13 },
            visible: (ctx) => !ctx.mobile && Utils.hasVerifyAccess(ctx.permission),
          },
          {
            id: "keybindVerifyCheck",
            title: "需要检查",
            description: "在此可修改助理需要检查的快捷键（仅审核助理可用）。",
            type: "keybind",
            value: Utils.getXplatCtrlCombinationKey({
              shiftKey: true,
              key: "Enter",
              keyCode: 13,
            }),
            visible: (ctx) => !ctx.mobile && Utils.hasVerifyAccess(ctx.permission),
          },
          {
            id: "keybindVerifyReason",
            title: "附言聚焦",
            description: "在此可修改聚焦到通过附言/退回原因输入框的快捷键。",
            type: "keybind",
            value: { key: "Tab", keyCode: 9 },
            visible: (ctx) => !ctx.mobile && Utils.hasVerifyAccess(ctx.permission),
          },
        ],
      },
      {
        id: "subscribe",
        label: "关注模组",
        settings: [
          {
            id: "subscribeDelay",
            title: "关注功能提醒",
            description:
              "在所关注的模组被编辑时提醒。设置相邻两次自动检测之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。点击模组主页“关注”按钮时，脚本会自动同步关注模组列表。",
            type: "number",
            value: 24,
            range: [0, null],
          },
          {
            id: "subscribeComment",
            title: "关注模组新短评提醒",
            description: "若启用，则在所关注的模组有新的短评时也会提醒。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "structureeditor",
        label: "结构编辑器",
        settings: [
          {
            id: "enableStructureEditor",
            title: "结构编辑器",
            description: "启用结构编辑器。",
            type: "checkbox",
          },
        ],
      },
      {
        id: "jsoneditor",
        label: "JSON管理",
        settings: [
          {
            id: "enableJsonHelper",
            title: "JSON导入辅助",
            description: "启用 JSON 导入辅助工具。",
            type: "checkbox",
          },
          {
            id: "itemRepository",
            title: "JSON存储方式",
            description:
              "配置使用 JSON 导入辅助工具时，JSON 应当以何种方式存储。（注意：切换此配置时，已存储的 JSON 文件不会自动同步，请手动转移）",
            type: "dropdownMenu",
            value: 0,
            range: { 0: "脚本存储", 1: "IndexedDB (推荐)" },
            visible: (ctx) => ctx.configs.getSettings("enableJsonHelper"),
          },
        ],
      },
      {
        id: "web",
        label: "网络请求",
        settings: [
          {
            id: "minimumRequestInterval",
            title: "最短发包间隔",
            description: "设置脚本全局发送请求的最短间隔，单位为 ms。",
            type: "number",
            value: 750,
            range: [500, null],
          },
          {
            id: "requestMonitorPosition",
            title: "网络请求监控位置",
            description:
              "记录脚本发出的所有网络请求的时间戳与基本信息，并在指定的位置展示，便于实时监控与调试。设置为“关闭”以禁用此特性。",
            type: "dropdownMenu",
            value: 1, // 默认启用！！网络请求失控会封 IP，惨痛的教训
            range: {
              0: "关闭",
              1: "右下角",
              2: "上方",
              3: "左上角",
              4: "右上角",
              5: "左下角",
              6: "下方",
              7: "中央",
            },
          },
        ],
      },
      {
        id: "misc",
        label: "杂项",
        settings: [
          {
            id: "gtceuIntegration",
            title: "GTCEu集成",
            description: "将启用 GTCEu 相关特性。<del>绝对不是私货！！</del>",
            type: "checkbox",
          },
          {
            id: "freezeAdvancements",
            title: "冻结进度",
            description: "使窗口右上角弹出的进度框不再自动消失。快截图留念吧！",
            type: "checkbox",
          },
          {
            id: "uploadFileButton",
            title: "上传文件按钮",
            description:
              "在编辑器的工具栏新增“上传文件”选项，允许用户将本地文件（如 WEBP, AVIF 文件等）上传到百科。请勿滥用，除非你想见到重生亲手把这个特性毙掉。（此特性由 pppopipupu 发现）",
            type: "checkbox",
          },
        ],
      },
      {
        id: "fun",
        label: "娱乐",
        settings: [
          {
            id: "almanacs",
            title: "今日份好运",
            description: "在百科主页加载并显示今日黄历，并可记录和查询历史黄历。",
            type: "checkbox",
          },
          {
            id: "enableSplashTracker",
            title: "闪烁标语追踪器",
            description:
              "打开百科任意主页时，自动记录页面所弹出的<del>重生骚话语录</del>闪烁标语。",
            type: "checkbox",
          },
          {
            id: "splashStyle",
            title: "闪烁标语渲染风格",
            description: "选择主页闪烁标语的渲染效果。",
            type: "dropdownMenu",
            value: 0,
            range: {
              0: "默认风格",
              1: "3D Bloom 旋转字 (WebGPU)",
            },
          },
          {
            id: "splashFontUrl",
            title: "闪烁标语 3D 字体 URL",
            description: "闪烁标语在 3D Bloom 风格下所使用的 TTF 字体 CDN 链接。",
            type: "dropdownTextMenu",
            value:
              "https://cdn.jsdelivr.net.cn/npm/@electron-fonts/noto-sans-sc/fonts/NotoSansSC-Regular.ttf",
            suggestion: [
              {
                text: "Noto Sans SC",
                value:
                  "https://cdn.jsdelivr.net.cn/npm/@electron-fonts/noto-sans-sc/fonts/NotoSansSC-Regular.ttf",
                showValue: true,
              },
            ],
            visible: (ctx) => ctx.configs.getSettings("splashStyle") === 1,
          },
          {
            id: "enableLive2D",
            title: "Live2D",
            description: "召唤百科娘！（如果不小心赶跑了可以在这里恢复）",
            type: "checkbox",
          },
          {
            id: "enableAprilFools",
            title: "愚人节特性",
            description: "允许百科愚人节彩蛋在任意日期触发。",
            type: "checkbox",
          },
          {
            id: "lieqi",
            title: "猎奇仙人",
            description: "猎奇猎奇猎奇！！！",
            type: "checkbox",
          },
        ],
      },
    ],
  },
] as const satisfies SettingsCategory[];
