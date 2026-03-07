import { McmodderConfigType, McmodderConfigUtils, McmodderPermission } from "../config/ConfigUtils";

export class ConfigLoader {
  static run(cfgutils: McmodderConfigUtils) {
    cfgutils.addConfig("themeColor1", "主题样式主配色", "主题样式主配色。", 
      McmodderConfigType.COLORPICKER, "#86c155")
    .addConfig("themeColor2", "主题样式副配色", "主题样式副配色。", 
      McmodderConfigType.COLORPICKER, "#58b6d8")
    .addConfig("themeColor3", "主题样式警告配色", "主题样式警告配色。", 
      McmodderConfigType.COLORPICKER, "#ff3030")
    .addConfig("autoCheckUpdate", "自动检查更新", "每隔一段时间自动检查更新，并在有新更新可用时提醒。")
    .addConfig("moveAds", "广告优化", "将百科的部分广告移动到不影响浏览体验的位置。（本脚本不会主动隐藏或屏蔽广告，若欲屏蔽请自行安装广告屏蔽脚本）")
    .addConfig("useNotoSans", "自定义字体", "使用 Noto Sans 替换百科默认字体。")
    .addConfig("disableGradient", "禁用文字渐变", "勾选此项可能有助于提升性能。")
    .addConfig("adaptableNightMode", "夜间模式自适应", "夜间模式将跟随当前浏览器偏好设置而自动开启或关闭。启用此配置也将隐藏页面右上角的夜间模式开关。") 
    .addConfig("forceV4", "强制v4", "打开百科任意非v4主页时，自动跳转到v4主页。") 
    // .addConfig("mcmodderUI", "Mcmodder风格UI", "启用 Mcmodder 风格的 UI 界面。（目前此配置项尚未完全分离，强烈建议保持该配置项为启用状态！）")
    // .addConfig("unlockHeaderContainer", "取消锁定导航栏", "使页面最上方导航栏默认隐藏，只有当光标移至其上时才会显示。")
    .addConfig("customAdvancements", "成就拓展", "启用自定义成就及相关特性。")
    .addConfig("disableClassDataTypesetting", "恢复模组页排版", /* "在启用“Mcmodder 风格 UI”的基础上，*/ "禁用对模组页和整合包页的默认排版功能。可能更利于编辑者审查模组基本信息。")
    .addConfig("fastCopyName", "快速复制名称", "轻触模组或物品名称即可快速将其复制到剪贴板。")
    .addConfig("compactSupportedVersions", "支持版本压缩", "将多个相近的支持版本显示为一个版本，如 {1.12.2, 1.12.1, 1.12} => 1.12.x。按住 Shift 键时显示原始的版本列表。")
    .addConfig("gtceuIntegration", "GTCEu集成", "将启用 GTCEu 相关特性。<del>绝对不是私货！！</del>")
    .addConfig("almanacs", "今日份好运", "在百科主页加载并显示今日黄历，并可记录和查询历史黄历。")
    .addConfig("enableSplashTracker", "闪烁标语追踪器", "打开百科任意主页时，自动记录页面所弹出的<del>重生骚话语录</del>闪烁标语。")
    .addConfig("enableLive2D", "Live2D", "召唤百科娘！（如果不小心赶跑了可以在这里恢复）")
    .addConfig("enableAprilFools", "愚人节特性", "允许百科愚人节彩蛋在任意日期触发。")
    .addConfig("autoCheckin", "自动签到", "每日首次访问百科，或是本机时间为 00:00:00 时，自动执行签到操作。")
    .addConfig("defaultBackground", "默认背景", "输入一个图片链接 URL。若当前页面没有设置背景，则自动使用此背景。图像加载可能会拖慢页面载入时间，可输入 <code>none</code> 以禁用此特性。",
      McmodderConfigType.TEXT, "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg")
    .addConfig("backgroundAlpha", "背景透明度", "控制背景透明度，数值越小透明度越高。", 
      McmodderConfigType.NUMBER, 204, [128, 255])
    .addConfig("textShadowAlpha", "文字阴影透明度", "控制夜间模式下的文字阴影透明度，数值越小透明度越高。", 
      McmodderConfigType.NUMBER, 64, [0, 255])
    .addConfig("classAddHelper", "展开模组添加分页", "使模组添加页面中的所有内容全部同屏显示。")
    .addConfig("editorAutoResize", "编辑器尺寸自适应", "使编辑器的长度随正文内容，宽度随窗口尺寸自动调整。")
    .addConfig("noSubmitWarningDelay", "取消提交警告延时", "<del>你的时间非常值钱</del>准备提交编辑时，取消“警告”级别提醒的等待时间。慎重使用！")
    .addConfig("autoSaveFix", "自动保存修复", "修复百科本体 Bug：自动存档时当前菜单自动关闭。")
    .addConfig("fastSubmitFix", "快速提交修复", "修复百科本体 Bug：快速提交时编辑框意外换行。")
    .addConfig("tabSelectorInfo", "物品搜索详情", "在合成表编辑界面中搜索物品时，显示每个物品的详细信息，并将属于当前模组的物品置顶。")
    .addConfig("rememberModRelation", "模组关系记录器", "打开模组主页时，自动记忆该模组的前置、拓展信息。配合“物品搜索详情”配置项使用时，属于当前所编辑模组的前置或拓展模组的物品也会在搜素结果中被置顶。")
    .addConfig("editorStats", "编辑量实时统计", "实时显示编辑器中的有效正文字节数和字节变动量，该配置值大于 0 时启用该特性，字节量超过该配置值时需要手动触发统计以避免卡顿（触发方法：轻触字节统计所显示的数字）。不保证 100% 精确，且除正文改动外的其他操作也可能会影响最终的字节变动量。", 
      McmodderConfigType.NUMBER, 10000, [0, null])
    .addConfig("anonymousUknowtoomuch", "匿名吐槽", "创建吐槽时不再记录创建人（仅影响光标悬浮于其上时的提示信息，不影响改动对比数据）。")
    .addConfig("autoExpandPage", "自动展开页面", "根据时间范围搜索待审列表和历史编辑记录时，自动展开所有页面。")
    .addConfig("multiDiffCompare", "改动列表批量对比", "(WIP) 在改动列表页中分别选取起始项和终止项，即可一键获取并展示在此期间的所有改动详情。")
    .addConfig("versionHelper", "日志智能管理", "允许从其他网站获取模组版本列表，并支持一键补充缺失的日志。支持 CurseForge 和 Modrinth 双平台。") 
    .addConfig("versionEditorHelper", "日志搬运辅助工具", "允许直接输入版本更新日期，而不再需要通过下拉列表勾选日期。")
    .addConfig("subscribeDelay", "关注功能提醒", "在所关注的模组被编辑时提醒。设置相邻两次自动检测之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。点击模组主页“关注”按钮时，脚本会自动同步关注模组列表。", 
      McmodderConfigType.NUMBER, 24, [0, null])
    .addConfig("subscribeComment", "关注模组新短评提醒", "若启用，则在所关注的模组有新的短评时也会提醒。")
    .addConfig("hoverDescription", "物品资料链接预览", "当鼠标悬停于正文中某一物品资料的链接时，显示该资料的正文预览。")
    .addConfig("hoverImage", "在资料预览显示正文图片", "在资料的正文预览中显示正文中的图片。")
    .addConfig("imageLocalizedCheck", "图像本地化检测", "高亮资料正文中未存储在百科本地中的图片资源（非 PNG/JPG/JPEG/GIF 格式或文件大小超出 1,024 KB 的除外），以便<del>水编辑次数</del>及时重新上传到本地，防止图片丢失。")
    .addConfig("autoFoldTable", "表格自动折叠", "自动折叠正文内容中超过设定行数的表格。设置为 0 以禁用。")
    .addConfig("tableFix", "表格特性修复", "使用 CSS 的标准属性替换百科表格中默认使用的 HTML 内联属性，并修复模组页正文表格中表头文字未正确居中的问题。")
    .addConfig("tableThemeColor", "表格应用样式", "对表格框线应用主题颜色。")
    .addConfig("tableLeftAlign", "表格图片左对齐", "统一左对齐资料正文中出现的表格和图片。（此配置项可能导致排版混乱）")
    .addConfig("linkCheck", "资料链接检查", "在资料正文中并高亮疑似冲突的链接和旧的基于 Fandom 的 Minecraft Wiki 链接。")
    .addConfig("linkMark", "资料链接标注", "在启用“资料链接检查”的基础上，在资料正文中所有的链接旁标注该链接所指向的 URL。")
    .addConfig("removePostProtection", "免教程保护", "移除未经允许禁止转载的个人教程防复制保护。尊重原创！")
    .addConfig("compactedChild", "紧凑化综合子资料", "减少每个综合子资料所占用的页面空间。")
    .addConfig("compactedTablist", "紧凑化合成表", "减少每个合成表所占用的页面空间，同时使用物品小图标替代材料统计中的物品名称，以及显示合成表 ID！本机安装字体 <a href=\"https://ftp.gnu.org/gnu/unifont/\" target=\"_blank\">Unifont</a> 后食用风味更佳。")
    .addConfig("compactedVerifylist", "紧凑化待审列表", "对待审列表重新排版。")
    .addConfig("compactedVerifyEntry", "紧凑化审核界面", "将有效的编辑对比表格尽可能移到靠前的位置，以省去一些时候使用鼠标滚轮的麻烦。")
    .addConfig("advancedRanklist", "贡献榜重排版", "让贡献榜中各用户的昵称、排名、编辑量、编辑占比一目了然！")
    .addConfig("advancedOredictPage", "矿词/标签页重排版", "减小矿词/标签页中单个物品所占用的页面空间，并将各物品按所属模组分类。")
    .addConfig("rememberVisited", "最近串门追踪", "自动记录我最近串门的用户。经常串门的用户会显示在“最近串门”当中。")
    .addConfig("favUserDisplayStyle", "收藏用户样式", "决定“最近串门”列表中已收藏用户的头像显示样式。",
      McmodderConfigType.DROPDOWN_MENU, 0, { 0: "星星", 1: "大头钉", 2: "爱心" })
    .addConfig("centerMainExpand", "个人主页数据拓展", "显示平均字数和科龄，令模组区域并排显示，过长的模组区域默认压缩。")
    .addConfig("byteChart", "字数活跃图表", "决定是否在个人主页显示字数活跃图表，以及是否在贡献榜查看历史贡献数据时自动获取编辑字数数据。")
    .addConfig("maxByteColorValue", "字数活跃图表最大有效值", "决定字数活跃图表的总体颜色深度，当日编辑字节数大于该值时，对应字数图表中的色块始终为黑色。", 
      McmodderConfigType.NUMBER, 30000, [5000, 524984])
    .addConfig("expCalculator", "经验计算器", "决定是否在个人等级页显示当前等级相关数据。")
    .addConfig("freezeAdvancements", "冻结进度", "使窗口右上角弹出的进度框不再自动消失。快截图留念吧！")
    .addConfig("unlockComment", "无限制留言板", "强行显示目标用户留言板，或是模组/作者的短评区，即使其已受天体运动影响而关闭。请勿滥用，除非你想见到重生亲手把这个特性毙掉。")
    .addConfig("ignoreEmptyLine", "忽略短评空白行", "隐藏短评正文中的空白行。")
    .addConfig("replyLink", "楼中楼跳转链接", "轻触短评楼中楼里出现的链接来快捷访问。该功能可能无法正确识别后文紧随其他文字的链接。")
    .addConfig("missileAlert", "核弹警告", "当短评长度超过特定值时，弹出核弹警告。")
    .addConfig("missileAlertHeight", "核弹触发最短长度", "设置核弹警告触发所需的短评长度下限，单位为 px。",
      McmodderConfigType.NUMBER, 1000, [0, null])
    .addConfig("commentExpandHeight", "短评折叠最短长度", "设置短评被折叠时所显示的长度，单位为 px。",
      McmodderConfigType.NUMBER, 300, [0, null])
    .addConfig("userBlacklist", "用户黑名单", "自动屏蔽所选定用户发布的短评和回复。输入要屏蔽的用户 UID，多个 UID 间用半角逗号隔开。",
      McmodderConfigType.TEXT /* CONFIG_NUMBER_LIST */)
    .addConfig("autoVerifyDelay", "自动查询待审项", "当打开百科页面时，自动查询所管理模组的待审项，并弹出提示消息。设置相邻两次自动查询待审项之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。",
      McmodderConfigType.NUMBER, 0, [0, null], McmodderPermission.MANAGER)
    .addConfig("itemListStylePreview", "样式管理预览", "编辑模组资料列表样式时，实时显示当前样式预览。",
      McmodderConfigType.CHECKBOX, false, [null, null], McmodderPermission.MANAGER)
    .addConfig("itemListStyleFix", "样式管理修复", "修复百科本体 Bug：原始字符串未转义导致当前样式无法显示。",
      McmodderConfigType.CHECKBOX, false, [null, null], McmodderPermission.MANAGER)
    .addConfig("alwaysNotify", "实时通讯", "设置短评动态提醒自动刷新间隔，单位为分钟，设置为小于 0.1 以禁用。",
      McmodderConfigType.NUMBER, 0, [0, null])
    .addConfig("preSubmitCheckInterval", "预编辑检测间隔", "设置相邻两次自动检测预编辑资料是否具备可正式提交条件之间的最短冷却时间，单位为小时，设置为小于 0.1 以禁用所有预编辑相关特性。",
      McmodderConfigType.NUMBER, 0, [0, null])
    .addConfig("fastUrge", "快速催审", "在待审列表中显示“一键催审”按钮。")
    .addConfig("enableStructureEditor", "结构编辑器", "启用结构编辑器。")
    .addConfig("enableJsonHelper", "JSON导入辅助", "启用 JSON 导入辅助工具。")
    .addConfig("minimumRequestInterval", "最短发包间隔", "设置脚本全局发送请求的最短间隔，单位为 ms。",
      McmodderConfigType.NUMBER, 750, [500, null])
    .addConfig("lieqi", "猎奇仙人", "猎奇猎奇猎奇！！！")
    .addConfig("keybindFastLink", "自动链接", "在此可修改打开本脚本所提供“自动链接”功能的快捷键。百科原生自带的“自动链接”（通过 Alt + X 打开）已终止支持，其入口会在将来的版本中移除。",
      McmodderConfigType.KEYBIND, { altKey: true, key: "C", keyCode: 67 })
    .addConfig("keybindFastSubmit", "快速提交", "在此可修改百科“快速提交”的快捷键。（受技术限制，百科本体的“快速提交”快捷键无法被禁用。为避免冲突，若此项配置包含 Ctrl + Enter，则其不会生效。）",
      McmodderConfigType.KEYBIND, { ctrlKey: true, key: "Enter", keyCode: 13 })
    .addConfig("keybindVerifyPass", "通过编辑", "在此可修改审核通过的快捷键。",
      McmodderConfigType.KEYBIND, { ctrlKey: true, key: "Enter", keyCode: 13 }, [null, null], McmodderPermission.MANAGER)
    .addConfig("keybindVerifyRefund", "退回编辑", "在此可修改审核退回的快捷键。",
      McmodderConfigType.KEYBIND, { shiftKey: true, key: "Enter", keyCode: 13 }, [null, null], McmodderPermission.MANAGER)
    .addConfig("keybindVerifyReason", "附言聚焦", "在此可修改聚焦到通过附言/退回原因输入框的快捷键。",
      McmodderConfigType.KEYBIND, { key: "Tab", keyCode: 9 }, [null, null], McmodderPermission.MANAGER);
  }
}