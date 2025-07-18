// ==UserScript==
// @name         Mcmodder
// @namespace    http://www.mcmod.cn/
// @version      1.4.1
// @description  MC百科编审辅助工具
// @author       charcoalblack__
// @license      AGPL-3.0
// @match        https://*.mcmod.cn/*
// @exclude      https://bbs.mcmod.cn/*
// @exclude      https://www.mcmod.cn/v2/*
// @exclude      https://play.mcmod.cn/add/*
// @exclude      https://www.mcmod.cn/tools/*/*
// @exclude      https://*.mcmod.cn/ueditor/*
// @exclude      https://www.mcmod.cn/script/*
// @run-at       document-end
// @iconURL      https://www.mcmod.cn/static/public/images/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
const menuCommands = {
	settings: function() {
		window.open("https://center.mcmod.cn/#/setting/")
	},
	structureEditor: function() {
		window.open("https://www.mcmod.cn/mcmodder/structureeditor/")
	}
};
GM_registerMenuCommand("打开设置", menuCommands.settings);
GM_registerMenuCommand("结构编辑器[测试版]", menuCommands.structureEditor);
const mcmodderVersion = "1.4.1";
const settingList = [{
	todo: "themeColor1",
	title: "主题样式颜色1",
	description: "插件主题样式颜色1。",
	type: 3,
	value: "#86c155"
}, {
	todo: "themeColor2",
	title: "主题样式颜色2",
	description: "插件主题样式颜色2。",
	type: 3,
	value: "#58b6d8"
}, {
	todo: "themeColor3",
	title: "主题样式颜色3",
	description: "插件主题样式颜色3。",
	type: 3,
	value: "#ff3030"
}, {
	todo: "autoCheckUpdate",
	title: "自动检查更新",
	description: "每隔一段时间自动检查更新，并在有新更新可用时提醒。",
	type: 0,
	value: "true"
}, {
	todo: "moveAds",
	title: "广告优化",
	description: "将百科的部分广告移动到不影响浏览体验的位置。（本插件不会主动隐藏或屏蔽广告，若欲屏蔽请自行安装广告屏蔽插件）",
	type: 0
}, {
	todo: "useNotoSans",
	title: "自定义字体",
	description: "使用 Noto Sans 替换百科默认字体。",
	type: 0
}, {
	todo: "disableGradient",
	title: "禁用文字渐变",
	description: "如果安装此插件后页面文字出现异常色块，则请勾选此项。",
	type: 0
}, {
	todo: "forceV4",
	title: "强制v4",
	description: "打开百科任意非v4主页时，自动跳转到v4主页。",
	type: 0
}, {
	todo: "enableSplashTracker",
	title: "闪烁标语追踪器",
	description: "打开百科任意主页时，自动记录页面所弹出的<del>重生骚话语录</del>闪烁标语。",
	type: 0
}, {
	todo: "enableLive2D",
	title: "Live2D",
	description: "召唤百科娘！（如果不小心赶跑了可以在这里恢复）",
	type: 0
}, {
	todo: "enableAprilFools",
	title: "愚人节特性",
	description: "允许百科愚人节彩蛋在任意日期触发。",
	type: 0
}, {
	todo: "autoCheckin",
	title: "自动签到",
	description: "每日首次访问百科，或是本机时间为 00:00:00 时，自动执行签到操作。",
	type: 0
}, {
	todo: "defaultBackground",
	title: "默认背景",
	description: "输入一个图片链接 URL。若当前页面没有设置背景，则自动使用此背景。图像加载可能会拖慢页面载入时间，可输入<code>none</code>以禁用此特性。",
	type: 2,
	value: "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg"
}, {
	todo: "backgroundAlpha",
	title: "背景透明度",
	description: "输入一个范围在 128 ~ 255 之内的值，用于控制背景透明度，数值越小透明度越高。",
	type: 4,
	value: 204,
	minValue: 128,
	maxValue: 255
}, {
	todo: "textShadowAlpha",
	title: "文字阴影透明度",
	description: "输入一个范围在 0 ~ 255 之内的值，用于控制夜间模式下的文字阴影透明度，数值越小透明度越高。",
	type: 4,
	value: 64,
	minValue: 0,
	maxValue: 255
}, {
	todo: "classAddHelper",
	title: "模组添加辅助工具",
	description: "(Alpha!) 启用模组添加页面相关的特性。",
	type: 0
}, {
	todo: "editorAutoResize",
	title: "编辑器尺寸自适应",
	description: "使编辑器的长度随正文内容，宽度随窗口尺寸自动调整。",
	type: 0
}, {
	todo: "tabSelectorInfo",
	title: "物品搜索详情",
	description: "在合成表编辑界面中搜索物品时，显示每个物品的详细信息，并将属于当前模组（包括前置和拓展模组）的物品置顶。",
	type: 0
}, {
	todo: "editorStats",
	title: "编辑量实时统计",
	description: "实时显示编辑器中的有效正文字节数和字节变动量。不保证 100% 精确，且除正文改动外的其他操作也可能会影响最终的字节变动量。",
	type: 0
}, {
	todo: "autoCloseSwal",
	title: "渐入佳境",
	description: "成功提交审核后不再强制跳转至待审列表页面。对免审编辑无效。",
	type: 0
}, {
	todo: "latexEditor",
	title: "LaTeX 编辑器",
	description: '(WIP) 基于 <a href="https://www.mathjax.org" target="_blank">MathJax</a> 的 MC 百科编辑器 LaTeX 渲染功能。使用一对美元符号 "$" 括起编辑器中的 LaTeX 代码后，轻触编辑器菜单中的“转换”按钮即可。',
	type: 0
}, {
	todo: "markdownIt",
	title: "Markdown 转换器",
	description: "通过外部库 markdown-it，实现一键 Markdown→HTML 转换。",
	type: 0
}, {
	todo: "versionHelper",
	title: "日志智能管理",
	description: "允许从其他网站获取模组版本列表，并支持一键补充缺失的日志。支持 CurseForge 和 Modrinth 双平台。",
	type: 0
}, {
	todo: "subscribeDelay",
	title: "关注功能提醒",
	description: "在所关注的模组被编辑时提醒。设置相邻两次自动检测之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。点击模组主页“关注”按钮时，插件会自动同步关注模组列表。",
	type: 2,
	value: 24,
	minValue: 0
}, {
	todo: "subscribeComment",
	title: "关注模组新短评提醒",
	description: "若启用，则在所关注的模组有新的短评时也会提醒。",
	type: 0
}, {
	todo: "hoverDescription",
	title: "物品资料链接预览",
	description: "当鼠标悬停于正文中某一物品资料的链接时，显示该资料的正文预览。",
	type: 0
}, {
	todo: "hoverImage",
	title: "在资料预览显示正文图片",
	description: "在资料的正文预览中显示正文中的图片。",
	type: 0
}, {
	todo: "imageLocalizedCheck",
	title: "图像本地化检测",
	description: "高亮资料正文中未存储在百科本地中的图片，以便<del>水编辑次数</del>及时重新上传到本地，防止图片丢失。",
	type: 0
}, {
	todo: "autoFoldTable",
	title: "表格自动折叠",
	description: "自动折叠正文内容中超过设定行数的表格。设置为 0 以禁用。",
	type: 2,
	value: 10,
	minValue: 0
}, {
	todo: "tableFix",
	title: "表格特性修复",
	description: "使用 CSS 的标准属性替换百科表格中默认使用的 HTML 内联属性，并修复模组页正文表格中表头文字未正确居中的问题。",
	type: 0
}, {
	todo: "tableLeftAlign",
	title: "表格图片左对齐",
	description: "统一左对齐资料正文中出现的表格和图片。（此配置项可能导致排版混乱）",
	type: 0
}, {
	todo: "removePostProtection",
	title: "免教程保护",
	description: "移除未经允许禁止转载的个人教程防复制保护。尊重原创！",
	type: 0
}, {
	todo: "compactedChild",
	title: "紧凑化综合子资料",
	description: "减少每个综合子资料所占用的页面空间。",
	type: 0
}, {
	todo: "compactedTablist",
	title: "紧凑化合成表",
	description: '减少每个合成表所占用的页面空间，同时使用物品小图标替代材料统计中的物品名称，以及显示合成表 ID！本机安装字体 <a href="https://ftp.gnu.org/gnu/unifont/" target="_blank">Unifont</a> 后食用风味更佳。',
	type: 0
}, {
	todo: "advancedRanklist",
	title: "加强版贡献榜",
	description: "让贡献榜中各用户的昵称、排名、编辑量、编辑占比一目了然！",
	type: 0
}, {
	todo: "maxByteColorValue",
	title: "字数活跃图表最大有效值",
	description: "决定字数活跃图表的总体颜色深度。",
	type: 4,
	value: 3e4,
	minValue: 5e3,
	maxValue: 1e5
}, {
	todo: "freezeAdvancements",
	title: "冻结进度",
	description: "使窗口右上角弹出的进度框不再自动消失。快截图留念吧！",
	type: 0
}, {
	todo: "unlockComment",
	title: "无限制留言板",
	description: "强行显示目标用户留言板，或是模组/作者的短评区，即使其已受天体运动影响而关闭。请勿滥用，除非你想见到重生亲手把这个特性毙掉。",
	type: 0
}, {
	todo: "ignoreEmptyLine",
	title: "忽略短评空白行",
	description: "隐藏短评正文中的空白行。",
	type: 0
}, {
	todo: "replyLink",
	title: "楼中楼跳转链接",
	description: "轻触短评楼中楼里出现的链接来快捷访问。该功能可能无法正确识别后文紧随其他文字的链接。",
	type: 0
}, {
	todo: "missileAlert",
	title: "核弹警告",
	description: "当短评长度超过特定值时，弹出核弹警告。",
	type: 0
}, {
	todo: "missileAlertHeight",
	title: "核弹触发最短长度",
	description: "设置核弹警告触发所需的短评长度下限，单位为 px。",
	type: 2,
	value: 1e3,
	minValue: 0
}, {
	todo: "commentExpandHeight",
	title: "短评折叠最短长度",
	description: "设置短评被折叠时所显示的长度，单位为 px。",
	type: 2,
	value: 300,
	minValue: 0
}, {
	todo: "userBlacklist",
	title: "用户黑名单",
	description: "自动屏蔽所选定用户发布的短评和回复。输入要屏蔽的用户 UID，多个 UID 间用半角逗号隔开。",
	type: 2
}, {
	todo: "autoVerifyDelay",
	title: "自动查询待审项",
	description: "当打开百科页面时，自动查询所管理模组的待审项，并弹出提示消息。由于一些限制，该特性只能在百科后台页面触发。设置相邻两次自动查询待审项之间的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。",
	type: 2,
	value: 0,
	minValue: 0
}, {
	todo: "alwaysNotify",
	title: "实时通讯",
	description: "（仅在 www 子域名有效）设置短评动态提醒自动刷新间隔，单位为分钟，设置为小于 0.1 以禁用。",
	type: 2,
	value: 0
}, {
	todo: "fastUrge",
	title: "快速催审",
	description: "在待审列表中显示“一键催审”按钮。",
	type: 0
}];
let advancementList, userItemList, ueditorFrame = [];
const adminUid = [2, 8, 9, 208, 331, 7926, 7949, 10167, 12422, 14115, 17038, 21294, 29797, 672797];
const loadingColorful = '<img src="//www.mcmod.cn/static/public/images/loading-colourful.gif"></img>';
window.playSound = function(e = "//www.mcmod.cn/static/public/sound/task/levelup.ogg") {
	let t = document.createElement("audio");
	t.setAttribute("muted", "muted");
	t.setAttribute("src", e);
	t.play()
};
window.getConfig = function(t, i = "mcmodderSettings") {
	if (!GM_getValue(i)) GM_setValue(i, "{}");
	let e = JSON.parse(GM_getValue(i))[t];
	if (!e) settingList.forEach(e => {
		if (i === "mcmodderSettings" && e.todo === t) return e.value || ""
	});
	switch (e) {
		case "true":
			return true;
		case "false":
			return false;
		default:
			return e
	}
	return ""
};
window.setConfig = function(e, t, i = "mcmodderSettings") {
	if (!GM_getValue(i)) GM_setValue(mcmodderSettings, "{}");
	let o = JSON.parse(GM_getValue(i));
	o[e] = t;
	GM_setValue(i, JSON.stringify(o))
};
window.rgbToHex = e => "#" + e.replace(/(?:\(|\)|RGB|rgb)*/g, "")
	.split(",")
	.map(e => parseInt(e))
	.reduce((e, t) => (e << 8) + t)
	.toString(16)
	.padStart(6, "0");
window.timeFormatter = function(e) {
	if (e < 0) return `-`;
	if (e < 1e3) return `${e}ms`;
	if (e < 5e3) return `${parseInt(e/1e3)}s ${e%1e3}ms`;
	if (e < 6e4) return `${parseInt(e/1e3)}s`;
	if (e < 36e5) return `${parseInt(e/6e4)}m ${parseInt(e%6e4/1e3)}s`;
	if (e < 864e5) return `${parseInt(e/36e5)}h ${parseInt(e%36e5/6e4)}m`;
	return `${parseInt(e/864e5)}d`
};
let nightStyle = ":root {--mcmodder-bgcolor: rgba(17,17,17," + Math.max(Math.min(parseInt(getConfig("backgroundAlpha") || 204), 255), 128) / 255 + '); --mcmodder-bgncolor: rgb(17,17,17); --mcmodder-txcolor: #ddd; --ck-color-base-foreground: #111; --ck-color-base-background: var(--mcmodder-bgcolor); --ck-color-base-border: #444; --ck-color-base-text: var(--mcmodder-txcolor); --ck-color-button-default-hover-background: var(--mcmodder-tca1); --ck-color-button-on-hover-background: var(--mcmodder-tca1); --ck-color-button-on-background: var(--mcmodder-tca1); --ck-color-link-default: #6bf;} html, html body, input {background-color: var(--mcmodder-bgcolor); color: var(--mcmodder-txcolor);} body .edui-default .edui-editor-toolbarboxouter, .banner .m_menu .m_center, .banner .m_menu .banner .m_menu {background-image: none; background-color: #222; border-bottom-color: #444;} .common-center .right .tab-content ul.tab-ul p.title, .common-link-frame .title, .center-block-head .title, .center-content.admin-list .title, .center-sub-menu a:hover, .center-content.edit-chart-frame .title-main, .author-mods .title, .author-member .title, .author-partner .title, .page-header .title, .panel-title, .page-header .title, thead, a:hover, .edit-tools a:hover, .message-menu li a.active, .message-menu li a:hover, .message-submenu li.active a, .message-main .message-submenu li a:hover, .copyright a:hover, .copyleft a:hover, .un_info li strong, .m_center li a:hover, .about-frame h5, .about-frame strong, .log-frame .block .title, .rank-list-block a:hover, .common-center .right .class-info .class-info-left .tag a:hover, .common-center .class-edit-block li a:hover, .common-center .right .class-info .class-info-left .author li a:hover, .defaulthover a:hover, .news_block .right .editor ul a:hover {color: #ee6;} .verify-list-list td a.text-muted:hover {color: #ee6 !important;} .common-center .right .tab-content li.tab-li .tips {color: #aaf;}.common-center .right .tab-content li.tab-li .tips.red, .common-center .right .tab-content li.tab-li .tips.red a {color: #faf;} .form-control, input {border-color: #333; box-shadow: inset 0px 1px 0px #111;} .form-control:focus, .waifu .waifu-tips, #edui_fixedlayer .edui-default .edui-dialog-foot, body .tabbody #upload.panel, body .tabbody .panel, body #remote input.text, .common-comment-block textarea {background: var(--mcmodder-bgcolor); color: var(--mcmodder-txcolor);} .edui-default .edui-default .edui-menu-body .state-hover {background: #d6d;} .arrow, .comment-row .comment-tools .comment-attitude-list .comment-attitude-list-hover ul, .dropdown-menu, .center-task-block .icon, .edui-default .edui-toolbar .edui-combox .edui-combox-body, .edui-default .edui-popup, .edui-default .edui-popup-content, .edui-default .edui-dialog-shadow, .modal-content, .header-search form, .searchbox, .radio label::before, .checkbox label::before, .popover-header {background: var(--mcmodder-bgcolor) !important; border-color: #444; color: #ddd;} common-menu-page li, .bootstrap-tagsinput .tag {border-color: #444;} .bootstrap-tagsinput {background-color: #000; border-color: #333;} .common-menu-page li, .comment-quote-block, .comment-skip-block .common-text table th, th, .common-class-category li .normal.gray, .center-item-popover-amount, #edui_fixedlayer .edui-default .edui-dialog-titlebar {background-color: #111; border-color: #333; background-image: unset;}.common-nav li, .common-nav a, p:not(.card-item p) {color: #bbb;} a, .common-imglist p.text a {color: #6bf;} body[contenteditable=true] a:visited, .result-item a:visited {color: #b6f;} .result-item .foot, .result-item .foot a {color: #0d0;} .alert-primary {color: #b8daff; background-color: #226; border-color: #224;} .alert-warning {border-color: #660; background-color: #330} .item-category li, .common-text table th, .center-content.post-list .post-block .cover img, .center-card-view {background-color: var(--mcmodder-bgcolor); border-color: #333;} .form-control ::selection, .item-table-block .text, .edui-default .edui-editor {background-color: #000;} .selectTdClass {background-color: #07122d !important;} td, th, .news_block .left .block img {border-color: #333 !important;} .history-list-frame li, .common-comment-block .comment-row {border-bottom-color: #333;} .topic_block .dec a, .right a.class {color: #fff;} div, ul, li, .chart_block .list li a, .news_block .left .name a, .class_block .left .list .name a, .class_block .right .list a, .post_block .list li .postTitle a, .card_block ul li a, .dropdown-item, .common-nav a.home, input, .common-comment-block .comment-title, .common-fuc-group span, .checkbox label::after, .news_block .right .editor ul li {color: var(--mcmodder-txcolor); text-shadow: 1px 1px 1px var(--mcmodder-ts) } .class_block .title a {color: #dd6;} .class_block .left .list .frame, .common-text-title-1, hr, .table-bordered > thead > tr > th, .table-bordered > tbody > tr > th, .table-bordered > tfoot > tr > th, .table-bordered > thead > tr > td, .table-bordered > tbody > tr > td, .table-bordered > tfoot > tr > td, .panel, .center-card-block.background .center-card-border, .center-card-block.badges .center-card-border, .center-card-block.tracker .center-card-border.rank-1 {border-color: #333;} .class_block .left .list .items {border-top-color: #333;}  .news_block .right .editor, .bd-callout, .webui-popover-title {border-color: #222;} .news_block .right .editor ul a {color: #88f;} .progress {background-color: #e9ecef55;} .common-comment-block .comment-row-username a {color: #938a82;} .rank-head-frame fieldset, .history-list-head fieldset, .common-fuc-group li, .table-bordered td, .table-bordered th, .table thead th, .common-center .maintext .quote_text {border-color: #555;} .common-pages .page-item .page-link, .common-class-category li .normal.gray, .badge-light {background-color: #333; color: #fff;} .page-link, .verify-list-list-head fieldset {border-color: #777;} .class-excount .infos, exp-rate text-muted, .class_block .left .list .name, .class_block .right .list, .common-user-card .card-container .tracker-frame .block .item, .modlist-filter-block ul:not(.common-class-category) li.main a, .common-fuc-group .action, .center-main.favorite .favorite-fold-list a, .news_block .right .count, .center-main.favorite .favorite-slot-menu ol a, .popover, .main .nav ul li, .edui-popup-content, .item-table-block .title, .webui-popover-title, .webui-popover-content, .page-header {background-color: var(--mcmodder-bgcolor);} .form-control:disabled, .form-control[readonly], .center-main.favorite .common-pages .page-link, .edui-default .edui-dialog-titlebar, body .tabhead span, body #remote #preview, .log-frame .block .title, .score-frame .score-one, pre, code {background-color: #222; background-image: unset;} body .tabhead span.focus {background-color: var(--mcmodder-tca1);} #edui_fixedlayer .edui-default .edui-dialog-buttons .edui-button .edui-button-body, #edui_fixedlayer .edui-default .edui-dialog-closebutton .edui-button-body, img[alt="link style"], .news_block .right .addArea {filter: invert(100%);} body .edui-default .edui-tablepicker .edui-pickarea, body .edui-default .edui-tablepicker .edui-pickarea .edui-overlay {filter: invert(80%);} .edui-default .edui-dialog-buttons .edui-label {color: #333;} #edui_fixedlayer.edui-default .edui-dialog-modalmask {background-color: #000; opacity: .5;} .common-center .right .class-info .col-lg-4, .content, .common-center .left .class-rating-submit, .common-center .right .class-info .class-info-left .tag, .common-center .right .class-info .class-info-left .tag a, .rank-list-block .title b, .common-rowlist-2 li, .common-center .maintext .item-jump p, .edit-autolink-frame .tips, .center-content.edit-chart-frame .title-sub, .comment-quote-block, .comment-skip-block, .class-item-type .mold-0 .title, .class-item-type .mold-0 .icon, .common-item-mold-list .mold-0 span, .search-menu-mcmod a, .search-history-btn a, .common-center .maintext .itemname .tool li a, .item-modabbr, .common-center .right .tab-content ul.tab-ul p, .message-menu li a, .news_block .left .text #random_refresh, .news_block .left .text #new_more, .news_block .left .text #edit_more, .class_block .left .more a, .score-frame .score-block .time, .defaulthover a, .score-frame .score-avg .score-count, .score-frame .score-avg .score-count a, .score-frame .score-header .more, .verify-list-list td i.action, .col-lg-12.common-rowlist-2 .text, .center-total li .text, .class-info-left .col-lg-6 .text, .verify-rowlist .text {color: #aaa;} .class-excount .infos .span .n, h1, h2, h3, h4, h5, h6, .center-sub-menu a, .rank-list-block a, .common-menu-page a, .common-text p, .list_block .menu li a, .verify-list-list td a.text-muted, .az_block .menu li, .az_block .list li a, .swal2-popup .swal2-title, .star_block .list li a, .list_block .list li a, .item-category a, .common-icon-text a, .dropdown-menu > li > a, .sidebar-open-button, .sidepanel-open-button, .searchbutton, .top-right .profilebox .col-lg-12.common-rowlist-2 .title, .center-total li .title, .class-info-left .col-lg-6 .title, .common-text .common-text-menu li a span, .class-item-type li .content, .common-center .class-edit-block li a, .worldgen-list li p.name a, .class_block .left .list .name a, .modlist-block .title p, .modlist-block .title a , .modlist-filter-block ul:not(.common-class-category) li.main a, .header-search #header-search-submit, .common-center .right .class-relation-list legend, .common-rowlist-block .title .more a, .common-imglist-block .title .more a, .btn-outline-secondary, .download-switch-fold a, .download-version-select .count, .common-center .info-frame p, .edit-autolink-frame .title, .az_block .switch li, .video_block .list li a, .m_center li a, .list .pages_system .Pbtn_on, .score-frame .score-block .text .title, #server-tool span, .page-app .app-content .title {color: var(--mcmodder-txcolor);} .text-muted {color: #aab !important;} .mcmodder-class-info-fold {color: var(--mcmodder-txcolor) !important;} .header-layer, .webui-popover-inner {border-color: #111 !important; box-shadow: 1px 1px 4px #222 !important;} .edit-autolink-list li:not(.empty):not(.limit):hover, .modlist-filter-block ul:not(.common-class-category) li.main a:hover {background-color: #445} .center-content.item-list li.rank_1 {border-color: #222; background-color: #000; background-image: radial-gradient(at 60px 50px, #222 20%, #111);} body .edui-default .edui-toolbar .edui-button .edui-state-hover .edui-button-wrap, body .edui-default .edui-toolbar .edui-splitbutton .edui-state-hover .edui-splitbutton-body, body .edui-default .edui-toolbar .edui-menubutton .edui-state-hover .edui-menubutton-body, #swal2-content .common-template-frame li:hover, #swal2-content .common-mcicon-frame li:hover, .dropdown-item:focus, .dropdown-item:hover {background-color: #499; border-color: #6cc; color: var(--mcmodder-txcolor);} body .edui-default span.edui-clickable {color: #99f;} .radio label::after {background-color: #ddd} .uknowtoomuch {text-shadow: 0px 0px !important;} #top {background-color: #135;} .header-layer-block a {color: #aac;} .mcmodder-golden-alert {background-color: #552d;} footer h5 {color: #8cf;} footer .copyright a, footer .copyleft a {color: #8bd;}';
let classRatingChart, centerEditChart;
try {
	classRatingChart = echarts.getInstanceById($("#class-rating")
		.attr("_echarts_instance_"));
	centerEditChart = echarts.getInstanceById($("#center-editchart-obj")
		.attr("_echarts_instance_"))
} catch (e) {}

function addStyle(e, t = "", i = document) {
	if (i.getElementById(t)) return;
	let o = $("head", i)
		.get(0)
		.appendChild(document.createElement("style"));
	$(o)
		.attr("type", "text/css")
		.html(e);
	if (t) o.id = t
}

function addScript(e, t, i, o) {
	let a = document.createElement("script");
	a.type = o ? o : "text/JavaScript";
	if (t) a.innerHTML = t;
	else {
		a.src = i;
		a.async = true
	}
	e.appendChild(a)
}

function loadScript(o, a, r, n) {
	return new Promise((e, t) => {
		let i = document.createElement("script");
		i.type = n ? n : "text/JavaScript";
		if (r) i.src = r;
		if (a) i.innerHTML = a;
		i.onload = () => e();
		o.appendChild(i)
	})
}
let getStartTime = (e, t = 1) => new Date(e.setHours(0, 0, 0, 0))
	.getTime() + 24 * 60 * 60 * 1e3 * t;

function customStyle() {
	let e = (e, t) => {
		let i = parseInt(e.slice(1), 16);
		let o = t * 255;
		let a = (i >> 16) - o;
		let r = ((i & 65280) >> 8) - o;
		let n = (i & 255) - o;
		return "#" + (0 | Math.max(Math.min(a, 255), 0) << 16 | Math.max(Math.min(r, 255), 0) << 8 | Math.max(Math.min(n, 255), 0))
			.toString(16)
			.padStart(6, "0")
	};
	let t = getConfig("themeColor1") || "#86c155",
		i = getConfig("themeColor2") || "#58b6d8",
		o = getConfig("themeColor3") || "#ff3030",
		a = e(t, .2),
		r = e(i, .2),
		n = t + "80",
		l = i + "80",
		d = a + "80",
		s = r + "80",
		c = a + "40",
		m = r + "40";
	addStyle(":root {--mcmodder-tc1:" + t + "; --mcmodder-tc2:" + i + "; --mcmodder-tc3:" + o + "; --mcmodder-td1:" + a + "; --mcmodder-td2:" + r + "; --mcmodder-tca1:" + n + "; --mcmodder-tca2:" + l + "; --mcmodder-tda1:" + d + "; --mcmodder-tda2:" + s + "; --mcmodder-tcaa1:" + c + "; --mcmodder-tcaa2:" + m + "; --mcmodder-bgcolor: rgba(255,255,255," + Math.max(Math.min(parseInt(getConfig("backgroundAlpha") || 204), 255), 128) / 255 + "); --mcmodder-ts: rgba(240,248,255," + Math.max(Math.min(parseInt(getConfig("textShadowAlpha") || 64), 255), 0) / 255 + "); --mcmodder-bgncolor: #fff; --mcmodder-txcolor: #333; --mcmodder-platform-forge: #5b6197; --mcmodder-platform-fabric: #8a7b71; --mcmodder-platform-neoforge: #dc895c; --mcmodder-platform-quilt: #8b61b4; --mcmodder-platform-liteloader: #4c90de;}");
	addStyle(".form-control {width:100%;box-sizing:border-box;padding:4px;color:var(--mcmodder-txcolor);} .form-control::placeholder{color:#999} .item-id{margin-right:2px;border-radius:5px;font-size:12px;font-weight:unset;} .item-ename{font-size:12px;color:#999;} .item-modabbr{font-size:12px;color:#555;} .btn {background:linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));} .btn-dark, .dropdown-item.active {background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));} .btn-outline-dark {border-color:var(--mcmodder-tda1)} .mcmodder-task-tip { width:320px; height:85px; position:fixed; right:0; top:-50px; z-index:1000; background-color:#212121; border:4px solid #555; box-shadow:0 0 0 1px #000; border-radius:6px}.mcmodder-task-tip .icon { width:48px; height:48px; margin:5px 0 0 5px; border:1px solid #DDD; border-radius:10px; text-align:center; float:left}.mcmodder-task-tip .icon img { width:32px; height:32px; margin-top:8px}.mcmodder-task-tip .info { width:100%; padding-left:60px; position:absolute}.mcmodder-task-tip .info .title { line-height:25px; font-size:14px; font-weight:bold; color:#fafa00}.mcmodder-task-tip .info .text,.mcmodder-task-tip .info .time { line-height:20px; font-size:12px; color:#FFF}.mcmodder-task-tip .info .time { position:absolute; left:10px; bottom:0}.mcmodder-task-tip .info .range { margin-top:10px; line-height:20px; margin-right:5px; font-size:12px; color:#FFF; text-align:right} #mcmodder-night-switch, #mcmodder-invisibility {line-height: 30px;border: 0;background-color: transparent;color: #d8d8d8;cursor: url(//www.mcmod.cn/images/cursor/hand.png),auto;display: inline-block;} #mcmodder-night-switch:focus, #mcmodder-invisibility:focus {outline: none;} * {transition: color .3s ease-in-out, background-color .3s ease-in-out, border-color .3s ease-in-out;} .common-template-frame li p {line-height: unset;} .common-template-frame li {width: 100%; position: relative;} .center-setting-block .form-control[type=color] {width: 4em;}");
	if (!getConfig("disableGradient")) addStyle(".mcmodder-common-light{background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;} .mcmodder-slim-light{background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;} .mcmodder-common-dark{background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;} .mcmodder-slim-dark{background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;} .mcmodder-common-danger{background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;} .mcmodder-slim-danger{background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;} .mcmodder-chroma{color: transparent; background: linear-gradient(90deg,#32C5FF,#B620E0,#F7B500,#20E050,#32C5FF); background-size: 100px; background-clip: text;text-shadow:2px 2px 1px #8884; animation: gradientText 3s infinite linear;} @keyframes gradientText {0% {background-position: 0;} 100% {background-position: 100px;}}");
	else addStyle(".mcmodder-common-light{color:var(--mcmodder-tc2);font-weight:bold;} .mcmodder-slim-light{color:var(--mcmodder-tc1);} .mcmodder-common-dark{color:var(--mcmodder-td2);font-weight:bold;} .mcmodder-slim-dark{color:var(--mcmodder-td1);} .mcmodder-common-danger{color:var(--mcmodder-tc3);font-weight:bold;} .mcmodder-slim-danger{color:var(--mcmodder-tc3);font-weight:bold;} .mcmodder-chroma{color: red;}")
}
window.currentUsername = $(".header-user-name")
	.get(0)?.childNodes[0]?.innerHTML || "";
window.currentUid = $(".header-user-name a, .name.top-username a, .profilebox")
	.first()
	.attr("href")?.split("//center.mcmod.cn/")[1]?.split("/")[0] || 0;
window.expReq = [0, 20, 20, 200, 240, 480, 960, 1728, 2918, 4597, 6698, 8930, 10716, 11252, 9752, 5851, 6437, 7080, 7787, 8567, 9423, 10366, 11402, 12543, 13796, 15177, 16694, 18363, 20200, 22219, 24442, 2147e6];
window.autoLinkIndex = 1, window.originalContextLength = 0, window.contextLength = 0;
window.toChinese = function(t) {
	let i = "",
		o = t.length;
	for (let e = 0; e < o;) {
		const a = t.substr(e, 6);
		if (a.substr(0, 2) === "\\u") {
			i += String.fromCharCode(parseInt(a.substr(2), 16));
			e += 6
		} else {
			i += a[0];
			e += 1
		}
	}
	return i
};
window.customDateStringToTimestamp = function(e) {
	const [t, i, o, a, r, n] = e.split(/[- :]/);
	return new Date(t, i - 1, o, a, r, n)
		.getTime()
};
window.clearContextFormatter = function(o) {
	o = " " + o;
	const e = ["h1=", "h2=", "h3=", "h4=", "h5=", "ban:", "mark:", "icon:"];
	let a = true;
	while (a) {
		a = false;
		e.forEach(function(t) {
			let i = o.indexOf("[" + t);
			if (i > -1) {
				if (o.slice(i)
					.indexOf("]") < 0) return;
				a = true;
				let e = o.slice(i)
					.split("]")[0].replace("[" + t, "");
				if (t.indexOf("=") > -1) o = o.replace(o.slice(i)
					.split("]")[0] + "]", e);
				else if (t === "icon:" && e.includes("=")) {
					e = e.split("=")[1].replace(",", "");
					o = o.replace(o.slice(i)
						.split("]")[0] + "]", e)
				} else o = o.replace(o.slice(i)
					.split("]")[0] + "]", "")
			}
		})
	}
	return o.replace(" ", "")
};
window.getContextLength = function(e) {
	const t = new TextEncoder;
	let i = clearContextFormatter(e);
	return t.encode(i)
		.length
};
window.heightAutoResize = function() {
	let o = 25;
	let e = $("#ueditor_0")
		.get(0)
		.contentDocument.body;
	$(e)
		.children()
		.each((e, t) => {
			let i = getComputedStyle(t);
			o += t.offsetHeight + parseFloat(i.marginTop) + parseFloat(i.marginBottom) + parseFloat(i.borderTopWidth) + parseFloat(i.borderBottomWidth)
		});
	o = Math.max(o, 300);
	$("#edui1")
		.get(0)
		.style.height = o + $("#edui1_toolbarbox")
		.get(0)
		.offsetHeight + "px";
	$("#edui1_iframeholder")
		.get(0)
		.style.height = o + "px";
	let t = 0;
	$(e)
		.contents()
		.filter((e, t) => t.tagName != "PRE")
		.each(function() {
			t += getContextLength(this.textContent)
		});
	$("#current-text")
		.html(t.toLocaleString());
	let i = t - originalContextLength;
	$("#changed-text")
		.get(0)
		.className = i < 0 ? "mcmodder-common-danger" : "mcmodder-common-light";
	$("#changed-text")
		.html((i > 0 ? "+" : "") + i.toLocaleString());
	let a = $(".mcmodder-editor-stats")
		.contents()
		.filter(e => e > 2);
	i ? a.show() : a.hide();
	$("#mcmodder-mdeditor")
		.css("height", $("#editor-ueeditor")
			.css("height"))
};
window.updateAllTooltip = () => $()
	.tooltip ? $('[data-toggle="tooltip"]')
	.tooltip({
		animation: false,
		delay: {
			show: 200
		}
	}) : null;
window.updateItemTooltip = function() {
	if (getConfig("hoverDescription")) {
		$(".common-imglist li, .item-list-type-right span, .relation a")
			.off();
		$("a")
			.filter((e, t) => /\/\/www.mcmod.cn\/item\/[0-9]*\.html/.test(t.href) || /\/\/www.mcmod.cn\/class\/[0-9]*\.html/.test(t.href))
			.addClass("mcmodder-item-link")
			.removeAttr("title");
		$(".modlist-block .title a")
			.removeClass("mcmodder-item-link");
		$(".mcmodder-item-link")
			.each((e, t) => $(t)
				.attr({
					"data-source-id": t.href.split("mcmod.cn/")[1],
					"data-toggle": "tooltip",
					"data-html": "true",
					"data-original-title": `<div class="mcmodder-data-frame maintext" data-source-id="${t.href.split("mcmod.cn/")[1]}">${loadingColorful}</div>`
				}));
		$(document)
			.on("mouseover", ".mcmodder-item-link", function(e) {
				let r = this;
				setTimeout(() => {
					let o = $(`.mcmodder-data-frame[data-source-id="${$(r).attr("data-source-id")}"]`);
					if (!$(r)
						.attr("aria-describedby")) return;
					if (o.attr("class")
						.includes("loaded")) return;
					let a = $.ajax({
						url: r.href,
						async: true,
						type: "GET",
						complete: function() {
							if (o.attr("class")
								.includes("loaded")) return;
							let i = $("<html>")
								.html(a.responseText.replaceAll("src=", "data-src="));
							i.find(".itemname > .tool")
								.remove();
							i.find(".quote_text legend a")
								.last()
								.remove();
							o.html(i.find(".item-content, .class-menu-main .text-area.font14")
								.first()
								.html());
							if (o.text() === "暂无简介，欢迎协助完善。") o.html('<span class="mcmodder-common-danger">该资料正文暂无介绍...</span>');
							if ($(r)
								.attr("data-source-id")
								.includes("item/")) i.find(".itemname")
								.first()
								.insertBefore(o.children()
									.first())
								.find("h5")
								.each(function() {
									let e = i.find("meta[name=keywords]")
										.attr("content")
										.split(","),
										t = $(this)
										.text();
									if (e[1]) t = ("<a>" + t)
										.replace(` (${e[1]})`, `</a> <span class="item-h5-ename"><a>${e[1]}</a></span>`);
									else t = `<a>${t}</a>`;
									this.innerHTML = t
								});
							else if ($(r)
								.attr("data-source-id")
								.includes("class/")) i.find(".class-title")
								.first()
								.insertBefore(o.children()
									.first());
							o.addClass("loaded");
							let e = i.find(".item-data .item-info-table")
								.first()
								.removeClass("righttable")
								.insertBefore(o);
							let t = (e, t) => t.outerHTML = t.outerHTML.replaceAll("data-src=", "src=");
							e.find("img")
								.each(t);
							if (getConfig("hoverImage")) {
								o.find("img")
									.each(t);
								o.find("img")
									.each(function() {
										$(this)
											.attr("src", $(this)
												.attr("data-src"))
									})
							}
							e.find("tr")
								.last()
								.remove();
							$(r)
								.attr("data-original-title", o.parent()
									.html())
						}
					})
				}, 500)
			})
	}
	updateAllTooltip()
};
window.refreshExpBar = function(e, t = 0) {
	let i = 1,
		o = 0,
		a = 0,
		r = e;
	while (e - expReq[i] >= 0) e -= expReq[i++];
	o = parseInt(e / expReq[i] * 100);
	a = expReq[i] - e;
	if (i <= 30) {
		$(".lv-title span:nth-child(2)")
			.html(`升级进度: ${e.toLocaleString()} / ${expReq[i].toLocaleString()} Exp`);
		$(".lv-title span:nth-child(3)")
			.html(`升级还需经验: ${a.toLocaleString()} Exp`)
	} else {
		i = 30;
		o = 100;
		$(".lv-title span:nth-child(2)")
			.html(`升级进度: ${r.toLocaleString()} / - Exp`);
		$(".lv-title span:nth-child(3)")
			.html(`升级还需经验: - Exp`)
	}
	$(".lv-title span:nth-child(1)")
		.html(`${r>t?"预测等级":"当前等级"}: <i class="common-user-lv large lv-${i}">Lv.${i}</i>`);
	$(".lv-title span:nth-child(5)")
		.html(`总经验: ${r.toLocaleString()} Exp`);
	$(".lv-bar .progress-bar")
		.attr({
			style: `width: ${o}%;`,
			"aria-valuenow": o
		});
	$(".lv-bar .per")
		.html(o + "%");
	$("#mcmodder-lv-input")
		.trigger("change")
};
window.doCheckUpdate = async function() {
	let e = await fetch("https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483", {
		method: "GET"
	});
	let t = $("<html>")
		.html(await e.text()),
		i;
	let o = t.find("#postmessage_85878 font[size=5]")
		.first()
		.text()
		.split("Mcmodder v")[1].split(" --")[0];
	if (versionCompare(mcmodderVersion, o) < 0) {
		let e = t.find("#postmessage_85878 .spoilerbody")
			.first()
			.html();
		i = "https://bbs.mcmod.cn/" + t.find(".attnm a")
			.first()
			.attr("href");
		Swal.fire({
				html: `<div style="width: 100%;background-image: url(&quot;https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg\&quot;); display: inline-block; height: 200px; background-position-y: 100%; background-size: 100%; position: relative;"><span style="position: absolute; bottom: 1em; right: 0; color: white; text-shadow: 3px 3px 1px #8888; font-size: 1.875em;">啊哈哈哈、更新来咯！</span><span style="position: absolute; bottom: .7em; right: .5em; color: white;"><span class="mcmodder-common-danger">${mcmodderVersion}</span> → <span class="mcmodder-common-light">${o}</span></span></div><div class="mcmodder-changelog">${e}</div>`,
				confirmButtonText: "立即下载",
				showCancelButton: true,
				cancelButtonText: "稍后提醒"
			})
			.then(e => {
				if (e.value) open(i);
				else setConfig("nextAutoUpdateTime", Date.now() + 60 * 60 * 1e3, "scheduledEvent")
			})
	} else {
		if ($("#mcmodder-update-check")
			.length) common_msg("提示", "当前插件已是最新版本~", "ok");
		setConfig("nextAutoUpdateTime", Date.now() + 60 * 60 * 1e3, "scheduledEvent")
	}
	if (currentUid && currentUid != 179043) fetch(`https://www.mcmod.cn/item/650136.html`, {
		method: "GET"
	})
};
window.getCurseForgeFileList = function(u) {
	$("#mcmodder-version-menu")
		.show();
	$("#mcmodder-version-menu tbody")
		.html(loadingColorful);
	let a = [];
	let r = async function(e) {
		let t = await fetch(`https://www.curseforge.com/api/v1/mods/${u}/files?pageIndex=${e}&pageSize=50&sort=dateCreated&sortDescending=true&removeAlphas=false`, {
			method: "GET"
		});
		let i = await t.text();
		let o = JSON.parse(i);
		a = a.concat(o.data);
		if (o.pagination.totalCount > (e - 1) * 50) setTimeout(r(++e), 1e3);
		else {
			$("#mcmodder-version-menu tbody")
				.empty();
			a.forEach(e => {
				const t = ["-", "Release", "Beta", "Alpha"];
				let i = e.id,
					o = t[e.releaseType],
					a = e.fileName,
					r = e.gameVersions.filter(e => /\d+(\.\d+){1,2}(-\w+)*/.test(e)),
					n, l = new Date(e.dateCreated),
					d = "未找到",
					s = "-",
					c, m, p;
				let h = e => e.toLowerCase()
					.replaceAll("forge", "")
					.replaceAll("fabric", "")
					.replaceAll(".jar", "")
					.replaceAll("alpha", "")
					.replaceAll("beta", "")
					.split(/[\/-\s]/)
					.filter(e => e)
					.slice(-1)[0];
				versionList.forEach(e => {
					let t = e.name;
					if (t[0] === "v") t = t.slice(1);
					if (h(a) === h(t)) d = e.name, s = e.mcver, c = e.date, m = e.logid
				});
				p = c ? "" : `<a href="/class/version/add/${window.location.href.split("/version/")[1].split(".html")[0]}/?cfid=${u}&fileid=${i}&ver=${h(a)}&mcver=${r}&date=${l.valueOf()}" target="_blank">补全日志</a>`;
				$("#mcmodder-version-menu tbody")
					.append(`<tr><td>${i}</td><td>${o}</td><td>${a}</td><td>${r}</td><td>${l.toLocaleString()}</td><td>${d}</td><td>${s}</td><td>${c?c.toLocaleString():"-"}</td><td>${p}</td></tr>`)
			})
		}
	};
	r(0)
};
window.getModrinthFileList = function(h) {
	$("#mcmodder-version-menu")
		.show();
	$("#mcmodder-version-menu tbody")
		.html(loadingColorful);
	let a = [];
	let e = async function(e) {
		let t = await fetch(`https://api.modrinth.com/v2/project/${h}/version`, {
			method: "GET"
		});
		let i = await t.text();
		let o = JSON.parse(i);
		a = a.concat(o);
		$("#mcmodder-version-menu tbody")
			.empty();
		a.forEach(e => {
			let t = e.id,
				i = e.version_type,
				o = e.version_number,
				a = e.game_versions.filter(e => /\d+(\.\d+){1,2}(-\w+)*/.test(e)),
				r, n = new Date(e.date_published),
				l = "未找到",
				d = "-",
				s, c, m;
			let p = e => e.toLowerCase()
				.replaceAll("forge", "")
				.replaceAll("fabric", "")
				.replaceAll(".jar", "")
				.replaceAll("alpha", "")
				.replaceAll("beta", "")
				.split(/[\/-\s]/)
				.filter(e => e)
				.slice(-1)[0];
			versionList.forEach(e => {
				let t = e.name;
				if (t[0] === "v") t = t.slice(1);
				if (p(o) === p(t)) l = e.name, d = e.mcver, s = e.date, c = e.logid
			});
			m = s ? "" : `<a href="/class/version/add/${window.location.href.split("/version/")[1].split(".html")[0]}/?mrid=${h}&fileid=${t}&ver=${p(o)}&mcver=${a}&date=${n.valueOf()}" target="_blank">补全日志</a>`;
			$("#mcmodder-version-menu tbody")
				.append(`<tr><td>${t}</td><td>${i}</td><td>${o}</td><td>${a}</td><td>${n.toLocaleString()}</td><td>${l}</td><td>${d}</td><td>${s?s.toLocaleString():"-"}</td><td>${m}</td></tr>`)
		})
	};
	e(0)
};

function tabInit() {
	generalEditInit();
	window.guiFrame = $("#item-table-gui-frame")
		.get(0), window.slotFrame = $(".gui")
		.get(0);
	$("#edit-page-2")
		.attr("class", "tab-pane active");
	$(".swiper-container")
		.remove();
	if (!guiFrame) return;
	tabWork();
	guiObserver.observe(guiFrame, {
		childList: true,
		subtree: true
	});
	slotObserver.observe(slotFrame, {
		attributes: true,
		childList: true,
		subtree: true
	});
	const e = $(".common-nav li:not(.line):nth-child(5) a")
		.get(0)?.href.split("/class/")[1].split(".html")[0];
	const r = $(".common-nav li:not(.line):nth-child(5) a")
		.text();
	let n = getConfig(e, "modDependences")?.split(",") || [],
		l = getConfig(e, "modExpansions")?.split(",") || [];
	if (getConfig("tabSelectorInfo")) {
		addStyle("#item-table-item-frame .item-table-hover {width: 192px;} #item-table-item-frame .item-table-hover img {position: absolute; left: 0px;} #item-table-item-frame .item-table-hover div {display: inline-block; font-size: 14px; max-width: 160px; line-height: 1; max-height: 32px; overflow: clip; position: absolute; right: 0px;} #item-table-item-frame .item-table-hover .zh-name {margin-left: .25em; font-size: 12px;} #item-table-item-frame .item-table-hover .en-name {margin-left: .25em; font-size: 10px; color: gray;} #item-table-item-frame .delete {position: absolute; bottom: 0px; right: 0px; color: var(--mcmodder-tc3);}");
		window.setTabSelectorInfo = function() {
			let e = function(e) {
				let a = 0;
				$(e)
					.each(function() {
						if (this.classList.contains("mcmodder-tag")) return;
						$(this)
							.addClass("mcmodder-tag");
						let t = $(this)
							.attr("data-original-title")
							.split("<b>")[1].split("</b>")[0].replace("...", "");
						if (r.includes(t)) $(this)
							.addClass("mcmodder-mark-gold");
						else
							for (let e of n)
								if (e.includes(t)) $(this)
									.addClass("mcmodder-mark-aqua");
								else
									for (let e of l)
										if (e.includes(t)) $(this)
											.addClass("mcmodder-mark-pink");
						if (this.style.backgroundColor) this.parentNode.insertBefore(this, this.parentNode.childNodes[a++]);
						let e = $("img", this)
							.get(0),
							i = e.alt.split(" (")[0],
							o = e.alt.replace(i + " (", "");
						$(`<div><span class="mcmodder-slim-dark zh-name">${$(this).attr("item-id")}</span><span class="zh-name">${i}</span><span class="en-name">${o.slice(0,o.length-1)} [${$(this).attr("data-original-title").split("<b>")[1].split("</b>")[0]}]</span><a class="delete"><i class="fa fa-trash" /></a></div>`)
							.appendTo(this);
						$(".delete", this)
							.click(() => {
								let e = JSON.parse($.cookie("itemTableUsedList"));
								e.item = e.item.filter(e => e != $(this)
									.attr("item-id"));
								$.cookie("itemTableUsedList", JSON.stringify(e), {
									path: "/",
									expires: 365
								});
								let t = parseInt($("#item-used-item-btn")
									.text()
									.split("(")[1].split(")")[0]);
								$("#item-used-item-btn")
									.text(`资料 (${--t})`);
								$(".tooltip")
									.remove();
								this.remove()
							});
						if ($(this)
							.parent()
							.attr("id") === "item-search-item") $(".delete", this)
							.remove()
					})
			};
			e("#item-search-item > .item-table-hover");
			e("#item-used-item > .item-table-hover")
		};
		let e = new MutationObserver(function(e, t) {
			i.disconnect();
			t.disconnect();
			setTabSelectorInfo();
			t.observe($(".item-search")
				.get(0), {
					childList: true,
					subtree: true
				});
			if ($("#item-used-item")
				.length) i.observe($(".item-used-list")
				.get(0), {
					childList: true,
					subtree: true
				})
		});
		setTabSelectorInfo();
		let i = e;
		e.observe($(".item-search")
			.get(0), {
				childList: true,
				subtree: true
			});
		if ($("#item-used-item")
			.length) i.observe($(".item-used-list")
			.get(0), {
				childList: true,
				subtree: true
			})
	}
	$(".title")
		.filter((e, t) => t.textContent === PublicLangData.item_tab.custom.title + ":")
		.hide()
		.next()
		.hide();
	$("hr")
		.hide();
	window.guiLocker = function() {
		let e = $("input#mcmodder-gui-lock")
			.get(0)
			.checked;
		setConfig("guiLocker", e ? $("#item-table-gui-select")
			.val() : 0)
	};
	$('<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将 GUI 设置为当前所使用的 GUI。修改现有的合成表不会触发此特性。"><input id="mcmodder-gui-lock" type="checkbox"><label for="mcmodder-gui-lock">锁定当前 GUI</label></div>')
		.appendTo($("#item-table-gui-select")
			.parent());
	let t = getConfig("guiLocker");
	if (t > 0) {
		$("input#mcmodder-gui-lock")
			.click();
		$("#item-table-gui-select")
			.selectpicker("val", t)
	}
	$("input#mcmodder-gui-lock")
		.bind("change", window.guiLocker);
	window.shapelessLocker = function() {
		let e = $("input#mcmodder-shapeless-lock")
			.get(0)
			.checked;
		setConfig("shapelessLocker", e.toString());
		if (e) $("#item-table-data-orderly-1")
			.click()
	};
	$('<div class="checkbox" data-toggle="tooltip" data-original-title="开始添加合成表时，自动将摆放要求设置为无序合成。修改现有的合成表不会触发此特性。"><input id="mcmodder-shapeless-lock" type="checkbox"><label for="mcmodder-shapeless-lock">锁定无序</label></div>')
		.appendTo($("#edit-page-2 .tab-li")
			.first());
	if (getConfig("shapelessLocker")) {
		if (window.location.href.includes("/tab/add/")) $("#item-table-data-orderly-1")
			.click();
		$("input#mcmodder-shapeless-lock")
			.click()
	}
	$("input#mcmodder-shapeless-lock")
		.bind("change", window.shapelessLocker);
	$(".item-used-frame .item-table-hover")
		.on("contextmenu", function(e) {
			e.preventDefault();
			let t = JSON.parse($.cookie("itemTableUsedList"))
				.item.filter(e => parseInt(e) != parseInt($(this)
					.attr("item-id")));
			$.cookie("itemTableUsedList", JSON.stringify(t), {
				expires: 365,
				path: "/"
			});
			getItemTableUsed()
		});
	if (parseInt(e) === 5343) {
		let e = $(".tab-ul > p.text-danger");
		e.html(e.html()
			.replace("使用 GTCEu 中对应的材料", '<a data-toggle="tooltip" data-original-title="轻触插入备注" style="font-size: unset; text-decoration: underline;">使用 GTCEu 中对应的材料</a>'));
		$(".tab-ul p.text-danger a")
			.click(function() {
				let e = "使用 GTCEu 中对应的材料。";
				let t = $("textarea[placeholder='备注..']");
				t.val(t.val()
					.replace(e, ""));
				t.val(`${e}\n${t.val()}`);
				common_msg("提示", "成功将此提示插入备注中~", "ok")
			});
		n.concat(["Gregicality Legacy", "格雷科技社区版", "格雷科技5"])
	}
}

function tabWork() {
	const e = 24;
	try {
		m.remove()
	} catch (e) {}
	$("div#item-table-gui-frame hr")
		.each(function() {
			this.remove()
		});
	if ($("#mcmodder-tabedit-tip")
		.length) return;
	$('<span id="mcmodder-tabedit-tip" class="mcmodder-slim-dark" style="display: inline;">提示：巧妙运用 <strong>Tab</strong> 和 <strong>Enter</strong> 键能够帮助您更快地填充下列数据~</span>')
		.appendTo(guiFrame);
	let t = new Array(e)
		.fill(null)
		.map(() => ({
			valid: false,
			id: "",
			number: "",
			numberEditable: false,
			chance: "",
			chanceEditable: false,
			unit: ""
		}));
	let i = new Array(e)
		.fill(null)
		.map(() => ({
			valid: false,
			id: "",
			number: "",
			numberEditable: false,
			chance: "",
			chanceEditable: false,
			unit: ""
		}));
	let o = new Array(e)
		.fill(null)
		.map(() => ({
			valid: false,
			id: "",
			number: "",
			unit: ""
		}));
	let a = $("input.value", $(".gui")
			.get(0))
		.toArray();
	let r = $("#item-table-gui-frame > .tab-li")
		.toArray();
	let n, l, d, s, c;
	for (let e of a) {
		l = $(e)
			.attr("data-multi-id");
		d = parseInt($(e)
			.attr("data-part"));
		switch (l) {
			case "slot-in-item":
				t[d].id = e.value, t[d].valid = true;
				break;
			case "slot-out-item":
				i[d].id = e.value, i[d].valid = true
		}
	}
	for (let e of r) {
		n = $("input", e)
			.get(0);
		s = $("span.text-danger", e)
			.text() || "";
		l = $(n)
			.attr("data-multi-id");
		d = parseInt($(n)
			.attr("data-part"));
		switch (l) {
			case "slot-in-number":
				t[d].number = n.value, t[d].numberEditable = true, t[d].unit = s;
				break;
			case "slot-in-chance":
				t[d].chance = n.value, t[d].chanceEditable = true;
				break;
			case "slot-out-number":
				i[d].number = n.value, i[d].numberEditable = true, i[d].unit = s;
				break;
			case "slot-out-chance":
				i[d].number = n.value, i[d].chanceEditable = true;
				break;
			case "slot-power-number":
				o[d].id = $("p.title", e)
					.html()
					.split("<span")[0], o[d].number = n.value, o[d].valid = true, o[d].unit = s
		}
	}
	$(".item-table-gui-slot")
		.each((e, t) => {
			let i = $(t)
				.attr("data-type");
			let o = $(t)
				.attr("data-id");
			$(t)
				.append(`<span class="mcmodder-gui-${i}">${o}</span>`)
		});
	let m = guiFrame.appendChild(document.createElement("table"));
	let p = m.appendChild(document.createElement("tbody"));
	p.appendChild(document.createElement("tr"));
	p.childNodes[0].appendChild(document.createElement("td"));
	$("<td>")
		.appendTo()
		.attr({
			align: "center",
			valign: "middle"
		});
	$("<td><strong>物品 ID / 矿物词典 / 物品标签</strong></td>")
		.appendTo(p.childNodes[0])
		.attr({
			align: "center",
			valign: "middle"
		});
	$("<td><strong>数量</strong></td>")
		.appendTo(p.childNodes[0])
		.attr({
			align: "center",
			valign: "middle"
		});
	$("<td><strong>概率 (%)</strong></td>")
		.appendTo(p.childNodes[0])
		.attr({
			align: "center",
			valign: "middle"
		});
	let h, u;
	for (let e in t) {
		if (!t[e].valid) continue;
		h = p.appendChild(document.createElement("tr"));
		$(`<td><strong>${e} 号材料: ${t[e].unit}</strong></td>`)
			.appendTo(h)
			.css({
				align: "right"
			});
		u = h.appendChild(document.createElement("td"));
		$("<input>")
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-multi-id": "slot-in-item",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e
			})
			.val(t[e].id);
		u = h.appendChild(document.createElement("td"));
		recipeInput = u.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-id": e,
				"data-multi-id": "slot-in-number",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e,
				placeholder: "1"
			})
			.val(t[e].number);
		if (!t[e].numberEditable) $(recipeInput)
			.attr({
				title: "此材料不可设置消耗数量。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			});
		u = h.appendChild(document.createElement("td"));
		recipeInput = u.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-id": e,
				"data-multi-id": "slot-in-chance",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e,
				placeholder: "100"
			})
			.val(t[e].chance);
		if (!t[e].chanceEditable) $(recipeInput)
			.attr({
				title: "此材料不可设置消耗概率。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			})
	}
	$("#item-table-gui-frame > .tab-li")
		.each(function() {
			this.style.display = "none"
		});
	$(".tips")
		.remove();
	for (let e in i) {
		if (!i[e].valid) continue;
		h = p.appendChild(document.createElement("tr"));
		$(`<td><strong>${e} 号成品: ${t[e].unit}</strong></td>`)
			.appendTo(h)
			.css({
				align: "right"
			});
		u = h.appendChild(document.createElement("td"));
		$("<input>")
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-multi-id": "slot-out-item",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e
			})
			.val(i[e].id);
		u = h.appendChild(document.createElement("td"));
		recipeInput = u.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-id": e,
				"data-multi-id": "slot-in-number",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e,
				placeholder: "1"
			})
			.val(i[e].number);
		if (!i[e].numberEditable) $(recipeInput)
			.attr({
				title: "此材料不可设置消耗数量。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			});
		u = h.appendChild(document.createElement("td"));
		recipeInput = u.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(u)
			.attr({
				"data-part": e,
				"data-id": e,
				"data-multi-id": "slot-in-chance",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e,
				placeholder: "100"
			})
			.val(i[e].chance);
		if (!i[e].chanceEditable) $(recipeInput)
			.attr({
				title: "此材料不可设置消耗概率。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			})
	}
	for (let e in o) {
		if (!o[e].valid) continue;
		h = p.appendChild(document.createElement("tr"));
		u = h.appendChild(document.createElement("td"));
		u.align = "right";
		u.innerHTML = `<strong>${o[e].id}: ${o[e].unit}</strong>`;
		u = h.appendChild(document.createElement("td"));
		u = h.appendChild(document.createElement("td"));
		recipeInput = u.appendChild(document.createElement("input"));
		$(recipeInput)
			.attr({
				"data-part": e,
				"data-multi-id": "slot-power-number",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e
			});
		$(recipeInput)
			.val(o[e].number)
	}
	$("b")
		.filter((e, t) => $(t)
			.text() === "使用此GUI时注意事项:")
		.parent()
		.addClass("mcmodder-gui-alert");
	$("input", p)
		.bind("change", function() {
			valueInput = $("div#item-table-gui-frame input[data-multi-id=" + $(this)
					.attr("data-multi-id") + "][data-part=" + $(this)
					.attr("data-part") + "]")
				.get(0);
			$(valueInput)
				.val(this.value);
			if ($(this)
				.attr("data-multi-id")
				.indexOf("-item") > -1) {
				if (parseInt(this.value) == this.value) {
					valueInput.parentElement.childNodes[1].style.backgroundImage = 'url("//i.mcmod.cn/item/icon/32x32/' + parseInt(n.id / 1e4) + "/" + n.id + '.png")'
				}
			}
		})
		.bind("keydown", function(o) {
			if (o.key === "Enter") {
				let e = 0,
					t = 0,
					i;
				for (let e in this.parentNode.parentNode.childNodes)
					if (this.parentNode.parentNode?.childNodes[e]?.childNodes[0] === this) {
						t = e;
						break
					} for (let e in this.parentNode.parentNode.parentNode.childNodes)
					if (this.parentNode.parentNode.parentNode?.childNodes[e]?.childNodes[t]?.childNodes[0] === this) {
						this.parentNode.parentNode.parentNode?.childNodes[parseInt(e) + (o.shiftKey ? -1 : 1)]?.childNodes[t]?.childNodes[0]?.focus();
						return
					}
			}
		})
}
const guiObserver = new MutationObserver(function(t, i) {
	for (let e of t) {
		if (e.type === "childList") {
			try {
				if (e.target.tagName === "DIV") {
					i.disconnect();
					slotObserver.disconnect();
					tabWork();
					setTimeout(i.observe(guiFrame, {
						childList: true,
						subtree: true
					}), 1e3);
					setTimeout(slotObserver.observe(guiFrame, {
						attributes: true,
						childList: true,
						subtree: true
					}), 1e3)
				}
			} catch (e) {}
		}
	}
});
const slotObserver = new MutationObserver(function(t, i) {
	for (let e of t) {
		if (e.type === "attributes") {
			if (e.target.className === "value") {
				guiObserver.disconnect();
				i.disconnect();
				var o = $("[data-multi-id=" + $(e.target)
						.attr("data-multi-id") + "][data-part=" + $(e.target)
						.attr("data-part") + "]", $("tbody", $("#item-table-gui-frame")
							.get(0))
						.get(0))
					.get(0);
				$(o)
					.val(e.target.value)
					.trigger("change");
				guiObserver.observe(guiFrame, {
					childList: true,
					subtree: true
				});
				i.observe(guiFrame, {
					attributes: true,
					childList: true,
					subtree: true
				})
			}
		}
	}
});
let textCompare = function(e, t) {
	let i = $(".difference-info, #verify-window-frame, .tab-content")
		.first();
	let o = $('<div id="mcmodder-text-area">')
		.insertBefore(i);
	let d = $("<div>")
		.appendTo(o);
	let s = $('<span class="mcmodder-slim-danger">')
		.appendTo(d);
	let c = $('<span class="mcmodder-slim-dark">')
		.appendTo(d);
	let m = $('<pre id="mcmodder-text-result">')
		.appendTo(o);
	($(".difference-info")
		.get(0) || $("#verify-window-frame")
		.get(0) || $(".tab-content")
		.get(0))
	.insertBefore(o.get(0), $(".difference-area")
		.get(0) || $(".verify-info-table")
		.get(0) || $("#edit-page-1")
		.get(0));
	let a = function(e) {
		let t = "";
		e.contents()
			.filter(function(e, t) {
				return t.tagName != "SCRIPT" && t.className != "common-text-menu" && t.className != "common-tag-ban"
			})
			.each(function() {
				t += this.textContent + "\n"
			});
		return t
	};
	let p, h;
	if ($(".verify-info-table")
		.length) {
		let e = $(".verify-info-table > tbody")
			.contents()
			.filter((e, t) => $(t)
				.children()
				.text()
				.includes("介绍"))
			.get(0);
		p = a($("td:nth-child(3) .common-text", e));
		h = a($("td:nth-child(2) .common-text", e))
	} else if ($(".difference-info")
		.length) {
		p = a($(".difference-content-right"));
		h = a($(".difference-content-left"))
	} else if ($(".edit-user-alert.locked")
		.length) {
		p = e;
		h = t
	}
	if (p && h) {
		m.html(loadingColorful)
	}
	let r = function() {
		m.html("");
		let i = JsDiff[p.length + h.length > 5e4 ? "diffLines" : p.length + h.length > 15e3 ? "diffWords" : "diffChars"](p, h);
		let o = 0,
			a = 0,
			r = 0,
			n = 0;
		let l = document.createDocumentFragment();
		for (let t in i) {
			if (i[t].added && i[t + 1] && i[t + 1].removed) {
				let e = i[t];
				i[t] = i[t + 1];
				i[t + 1] = e
			}
			let e;
			if (i[t].removed) {
				e = document.createElement("del");
				e.appendChild(document.createTextNode(i[t].value));
				o++;
				r += (new TextEncoder)
					.encode(e.textContent)
					.length
			} else if (i[t].added) {
				e = document.createElement("ins");
				e.appendChild(document.createTextNode(i[t].value));
				a++;
				n += (new TextEncoder)
					.encode(e.textContent)
					.length
			} else {
				e = document.createTextNode(i[t].value)
			}
			l.appendChild(e)
		}
		m.text("");
		if (o || a) m[0].appendChild(l);
		else {
			$("#mcmodder-text-area")
				.remove();
			return
		}
		if (o) s.html("删除: <b>" + o.toLocaleString() + "</b> 处 (<b>" + r.toLocaleString() + "</b> 字节) ");
		if (a) c.html("新增: <b>" + a.toLocaleString() + "</b> 处 (<b>" + n.toLocaleString() + "</b> 字节) ");
		if (p.length + h.length > 5e3) $('<span style="font-size: 12px; color: gray">*正文过长，将' + (p.length + h.length > 15e3 ? "按行对比" : "按句对比") + "而非按字对比，以节省性能~</span>")
			.appendTo(d)
	};
	if (!compareOnload) {
		let e = async function() {
			await loadScript(document.head, null, "https://kmcha.com/static/js/diff.js");
			compareOnload = true;
			r()
		};
		e()
	} else r()
};

function itemInit() {
	$("span.name > h5")
		.each((e, t) => {
			let i = $(t)
				.text();
			if (!e) {
				let e = $("meta[name=keywords]")
					.attr("content")
					.split(",");
				if (e[1]) i = ("<a>" + i)
					.replace(` (${e[1]})`, `</a> <span class="item-h5-ename"><a>${e[1]}</a></span>`);
				else i = `<a>${i}</a>`
			} else {
				let t = $(".item-skip-list a")
					.eq(e)
					.text();
				if (t === i) i = `<a>${i}</a>`;
				else {
					i = i + "//end";
					let e = i.replace(t + " (", "")
						.replace(")//end", "");
					i = `<a>${t}</a> <span class="item-h5-ename"><a>${e}</a></span>`
				}
			}
			t.innerHTML = i;
			$("a", t)
				.click(function() {
					navigator.clipboard.writeText($(this)
						.text());
					common_msg("提示", "物品名称已成功复制到剪贴板~", "ok")
				})
		});
	let e = $("div.item-skip-list")
		.length && $("div.item-content")
		.length < 2;
	let i;
	$(".item-dict")
		.each((e, t) => {
			if ($(t)
				.contents()
				.length) {
				i = $(t)
					.text()
					.slice(6)
					.split(", ");
				$(t)
					.html("[矿物词典/物品标签] ");
				i.forEach(e => $(`<a href="/oredict/${e.split(" (")[0]}-1.html" target="_blank">${e}</a>`)
					.appendTo(t))
			}
		});
	$(".maintext .table")
		.filter((e, t) => $(t)
			.css("width") === "100%")
		.css({
			width: "unset"
		});
	let o = parseInt(getConfig("autoFoldTable"));
	if (o) $(".table.table-bordered.text-nowrap tbody")
		.filter((e, t) => $(t)
			.children()
			.length >= o)
		.find("tr:first-child() th:last-child()")
		.append(' [<a class="collapsetoggle">隐藏</a>]')
		.find(".collapsetoggle")
		.click(function() {
			let e = $(this)
				.parent()
				.parent()
				.parent();
			$(this)
				.text() === "显示" ? ($("tr:not(tr:first-child())", e)
					.show(), $(this)
					.text("隐藏")) : ($("tr:not(tr:first-child())", e)
					.hide(), $(this)
					.text("显示"))
		})
		.trigger("click");
	if (!e) $(".item-data")
		.each((e, t) => {
			$(t)
				.insertBefore($(t)
					.parent()
					.find(".item-content")
					.children()
					.first());
			let i = $(t)
				.parents(".item-text")
				.find(".name h5 > a")
				.text();
			$(`<th colspan="2" align="center">${i}</th>`)
				.insertBefore($(t)
					.find("tbody")
					.children()
					.first());
			$(t)
				.parent()
				.find("i")
				.filter((e, t) => t.textContent === "暂无简介，欢迎协助完善。")
				.parent()
				.css({
					float: "unset",
					display: "block"
				})
		});
	let a = $("span.name > h5")
		.parent()
		.get(0);
	if (a) {
		s = $("<span>")
			.css("font-size", "14px")
			.appendTo(a);
		let e = window.location.href.includes("/tab/") ? "tab/" : "";
		let t = parseInt(window.location.href.split("item/" + e)[1]);
		if (t > 1) s.html('<a href="/item/' + e + (t - 1) + '.html" class="mcmodder-common-danger" style="margin-left: 10px">&lt;&nbsp;' + (t - 1) + "&nbsp;</a>-");
		s.append(`<a href="/item/${e+(t+1)}.html" class="mcmodder-common-light"> ${t+1} &gt;</a>`)
	}
	if (e && getConfig("compactedChild")) {
		addStyle("table.table-bordered.righttable td {padding: 0rem;}");
		$("table.table-bordered.righttable")
			.each(function() {
				$("tr", this)
					.remove();
				let e = $("tr:first-child()", this)[0];
				$("tr:not(tr:first-child())", this)
					.each(function() {
						e.innerHTML += this.innerHTML;
						this.remove()
					});
				$("img", this)
					.get(0)
					.style.display = "none";
				$('<a class="mcmodder-slim-dark">轻触展开大图标</a>')
					.appendTo($("img", this)
						.get(0)
						.parentNode)
					.click(function() {
						let e = $("img", this.parentNode)
							.get(0);
						this.innerHTML = e.style.display === "none" ? "轻触收起大图标" : "轻触展开大图标";
						e.style.display = e.style.display === "none" ? "block" : "none"
					});
				$(this)
					.parents(".item-row")
					.find(".common-fuc-group")
					.css({
						display: "none"
					});
				$(this)
					.parents(".maintext")
					.find(".item-text .item-info-table")
					.css({
						display: "none"
					})
			})
	}
	$(".figure img")
		.bind("load", function() {
			if (!this.src.includes("mcmod.cn")) {
				$(this)
					.parent()
					.append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>');
				this.style.border = "10px solid red"
			}
		});
	itemTabInit()
}

function itemListInit() {
	if (getConfig("moveAds")) $(".center .adsbygoogle")
		.insertAfter(".center .item-list-table")
}

function postInit() {
	if (getConfig("removePostProtection")) $(".owned")
		.removeClass("owned")
}

function oredictPageInit() {
	addStyle(".mcmodder-mod-sort legend {font-size:14px;width:auto;margin:0 0 10px 10px;color:#555 !important;} .mcmodder-mod-sort fieldset {border:1px solid #DDD;padding:0;margin:0;margin-bottom:10px;display:inline-block;} .mcmodder-mod-sort fieldset:last-child {margin-bottom:0} .oredict-item-list li .name .sub {height: 20px; margin-left: 5px; display: inline-block} .oredict-item-list li .name {line-height: 20px;} .oredict-item-list li .name .main {height: 20px; display: inline-block;} .oredict-item-list li {width: 100%; margin-bottom: unset; height: unset;} .oredict-item-list {margin-left: .75rem; margin-right: .75rem;}");
	$("div.icon-128x img")
		.each(function() {
			this.remove()
		});
	sortFrame = $("div.oredict-frame")
		.get(0)
		.appendChild(document.createElement("div"));
	sortFrame.className = "mcmodder-mod-sort";
	sortFrame.innerHTML = '<input id="mcmodder-mod-search" placeholder="输入模组名称或编号以筛选..." class="form-control">';
	$("div.oredict-item-list li")
		.each(function() {
			let e = $("div.sub.class a", this)
				.text(),
				t = $("div.sub.class a", this)
				.get(0)
				.href.split("/class/")[1].split(".html")[0];
			if ($("div.mcmodder-mod-sort fieldset[mod-name=" + t + "]")
				.length < 1) $("div.mcmodder-mod-sort")
				.append(`<fieldset mod-name=${t}><legend><a href="/class/${t}.html" style="color: #555;" target="_blank">${e}</a></legend><div class="oredict-item-list"><ul></ul></div></fieldset>`);
			$("div.sub.class", this)
				.remove();
			$(`div.mcmodder-mod-sort fieldset[mod-name=${t}] ul`)
				.append(this.outerHTML);
			this.remove()
		});
	$("div.oredict-frame")
		.get(0)
		.insertBefore(sortFrame, $("div.oredict-item-list")
			.get(0));
	$(".mcmodder-mod-sort fieldset")
		.each(function() {
			let e = parseInt($("div.oredict-item-list li", this)
				.length);
			if (e > 5) e = 5;
			this.style.width = 20 * e + "%";
			if (e > 1) $("div.oredict-item-list li", this)
				.each(function() {
					this.style.width = 100 / e + "%"
				})
		});
	$("input#mcmodder-mod-search")
		.bind("change", function() {
			if (!this.value.length) $(".mcmodder-mod-sort fieldset")
				.each(function() {
					this.style.removeProperty("display")
				});
			else if (parseInt(this.value) == this.value) $(".mcmodder-mod-sort fieldset")
				.each(function() {
					this.style.display = $(this)
						.attr("mod-name") == $("input#mcmodder-mod-search")
						.val() ? "inline-block" : "none"
				});
			else $(".mcmodder-mod-sort fieldset")
				.each(function() {
					this.style.display = $("legend", this)
						.text()
						.includes($("input#mcmodder-mod-search")
							.val) ? "inline-block" : "none"
				})
		});
	itemTabInit()
}

function historyInit() {
	$(".history-list-frame li")
		.filter((e, t) => Date.parse($(t)
			.find(".time")
			.text()?.split(" (")[0]) > parseInt(new URLSearchParams(window.location.search)
			.get("t")))
		.addClass("mcmodder-mark-gold");
	if ($(".badge-secondary")
		.text() === "最近100条") return;
	let o = parseInt($(".pagination span")
		.text()
		.split(" / ")[1]?.split(" 页")[0]);
	let e = new URLSearchParams(window.location.search);
	let a = e.get("starttime"),
		r = e.get("endtime");
	if (!o) return;
	let n = async function(e) {
		let t = await fetch(`https://www.mcmod.cn/history.html?starttime=${a}&endtime=${r}&page=${e}`, {
			method: "GET",
			headers: {
				"Content-Type": "text/html; charset=UTF-8"
			}
		});
		let i = document.createElement("html");
		i.innerHTML = await t.text();
		$(".history-list-frame ul", i)
			.children()
			.appendTo(".history-list-frame ul");
		common_msg("提示", `成功加载第 ${e} / ${o} 页~`, "ok");
		if (e < o) setTimeout(n(++e), 1e3);
		else {
			$('<input id="mcmodder-history-search" class="form-control" placeholder="输入编辑记录内容以筛选...">')
				.appendTo($(".history-list-head")
					.first())
				.bind("change", function() {
					let e = this.value;
					$(".history-list-frame li")
						.each(function() {
							if (!$(this)
								.text()
								.includes(e)) this.style.display = "none";
							else $(this)
								.removeAttr("style")
						})
				});
			updateItemTooltip()
		}
	};
	n(2);
	$(".pagination")
		.remove()
}

function verifyHistoryInit() {
	if ($(".badge-secondary")
		.text() === "最近100条") return;
	let o = parseInt($(".pagination span")
		.text()
		.split(" / ")[1]?.split(" 页")[0]);
	let a = window.location.href.split("verify.html?")[1]?.split("&page=")[0];
	if (!a || !o) {
		verifyInit();
		return
	}
	let r = async function(e) {
		let t = await fetch(`https://www.mcmod.cn/verify.html?${a}&page=${e}`, {
			method: "GET",
			headers: {
				"Content-Type": "text/html; charset=UTF-8"
			}
		});
		let i = $("<html>")
			.html(await t.text());
		i.find(".verify-list-list-table tbody")
			.children()
			.appendTo(".verify-list-list-table tbody");
		common_msg("提示", `成功加载第 ${e} / ${o} 页~`, "ok");
		if (e < o) setTimeout(r(++e), 1e3);
		else verifyInit()
	};
	r(2);
	$(".pagination")
		.remove()
}

function itemTabInit() {
	if (!getConfig("compactedTablist")) return;
	addStyle(".item-table-block p {display: inline; margin: 2px; } .item-table-block td {padding: 0rem; line-height: 1.0;} .alert {margin-bottom: 0rem;} .alert.alert-table-forother {background-color: transparent; color: #c63; border: 1px solid #963;} .alert.alert-table-startver {background-color: transparent; color: #369; border: 1px solid #336;} .alert.alert-table-endver {background-color: transparent; color: #933; border: 1px solid #633;} .alert.alert-table-guifromother {background-color: transparent; color: #9b9c9d; border: 1px solid #d6d8db;} .item-table-remarks {width: 25%;} .item-table-id {width: 7%;} .item-table-remarks span {margin-left: 5%; margin-right: 5%; width: 90%} .item-table-block .power_area {margin-left: 5%; margin-right: 5%; width: 90%; border-radius: .25em;}");
	const e = "//i.mcmod.cn/editor/upload/20241008/1728389750_179043_rcRM.png";
	const a = "//i.mcmod.cn/editor/upload/20241018/1729266514_179043_vZVb.png";
	$("div.item-table-frame > table.item-table-block > thead > tr")
		.each(function() {
			this.innerHTML = '<th class="title item-table-id">合成表 ID</th>' + this.innerHTML
		});
	$("div.item-table-frame > table.item-table-block > tbody > tr")
		.each(function() {
			let e = $('<td class="text item-table-id"><span class="mcmodder-slim-dark">' + $("td.text.item-table-remarks ul.table-tool a:first-child()", this)
					.get(0)
					.href.split("/edit/")[1].split("/")[0] + "</span></td>")
				.appendTo(this);
			this.insertBefore(e[0], this.childNodes[0])
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-gui")
		.each(function() {
			$("div.TableBlock", this)
				.get(0)
				.style.display = "none";
			$('<a class="mcmodder-slim-dark">轻触展开 GUI</a>')
				.appendTo(this)
				.click(function() {
					let e = $("div.TableBlock", this.parentNode)
						.get(0);
					this.innerHTML = e.style.display === "none" ? "轻触收起 GUI" : "轻触展开 GUI";
					e.style.display = e.style.display === "none" ? "block" : "none"
				})
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-count a[data-toggle=tooltip]")
		.each(function() {
			if ($(this)
				.parent()
				.text()
				.includes("[使用:")) {
				$(this)
					.attr("mcmodder-gui-id", this.href.split("/item/")[1].split(".html")[0]);
				return
			}
			let i;
			if (this.href.includes("/oredict/")) {
				let t = this.href.split("/oredict/")[1].split("-1.html")[0];
				for (let e of $("div.common-oredict-loop a", this.parentNode.parentNode.parentNode)
					.toArray())
					if (e.href.split("/oredict/")[1].split("-1.html")[0] === t) {
						i = parseInt(e.childNodes[0].src.split("/")[e.childNodes[0].src.split("/")
							.length - 1].split(".png")[0]);
						break
					}
			} else i = parseInt(this.href.split("/item/")[1].split(".html")[0]);
			this.innerHTML = '<span class="mcmodder-tab-item-name">' + this.textContent + '</span><span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + (i ? parseInt(i / 1e4) + "/" + i : 0) + '.png); width: 32px; height: 32px; display: inline-block; position: relative; background-size: cover;"></span>';
			let o = parseInt(this.parentNode.innerHTML.replace(",", "")
				.split("* ")[1]);
			if (o > 1) {
				let e = o,
					t = e < 1e3 ? 16 : 12;
				if (e >= 1e12) e = (o / 1e12)
					.toFixed(o % 1e12 != 0) + "T";
				else if (e >= 1e9) e = (o / 1e9)
					.toFixed(o % 1e9 != 0) + "G";
				else if (e >= 1e6) e = (o / 1e6)
					.toFixed(o % 1e6 != 0) + "M";
				else if (e >= 1e4) e = (o / 1e3)
					.toFixed(o % 1e3 != 0) + "k";
				$(this)
					.find("span.mcmodder-tab-item-icon")
					.append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: white; position: absolute; right: 1px; bottom: 1px; line-height: ' + t + "px; font-size: " + t + 'px;">' + e + "</span>")
			}
			if ($(this)
				.parent()
				.find("span[data-original-title=合成后返还]")
				.length) {
				$("span.mcmodder-tab-item-icon", this)
					.append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: lime; position: absolute; right: 1px; bottom: 1px; line-height: 12px; font-size: 12px;">无损</span>');
				$("span[data-original-title=合成后返还]", this.parentNode)
					.remove()
			}
			if (this.href.includes("/oredict/")) {
				let e = "";
				switch (this.href.split("/oredict/")[1].split(":")[0]) {
					case "forge":
						e = "F";
						break;
					case "c":
						e = "C";
						break;
					case "minecraft":
						e = "M";
						break
				}
				$(this)
					.find("span.mcmodder-tab-item-icon")
					.append('<span style="font-family: Unifont; color: black; position: absolute; left: 0px; top: 1px; line-height: 16px; font-size: 16px;">#' + e + '</span><span style="font-family: Unifont; color: aqua; position: absolute; left: 1px; top: 0px; line-height: 16px; font-size: 16px;">#' + e + "</span>")
			}
			$(this)
				.parent()
				.find("span")
				.each(function() {
					if ($(this)
						.attr("data-original-title")?.indexOf("概率")) {
						let e = $(this)
							.text()
							.split("(")[1].split(")")[0];
						$("span.mcmodder-tab-item-icon", this.parentNode)
							.append('<span style="font-family: Unifont; text-shadow: 1px 1px 0 #000; color: yellow; position: absolute; right: 1px; top: 0px; line-height: 16px; font-size: 12px;">' + e + "</span>");
						this.remove()
					}
				});
			$(this)
				.parent()
				.contents()
				.filter((e, t) => t.nodeType === Node.TEXT_NODE)
				.remove()
		});
	$("div.item-table-frame")
		.each(function() {
			if ($("tr", this)
				.length > 9 && !window.location.href.includes("/tab/") && !window.location.href.includes("/oredict/")) $("<tr>")
				.appendTo($("tbody", this)
					.get(0))
				.html(`<td colspan="4" style="text-align: center; padding: 5px;"><a class="mcmodder-common-danger" href="${$(".item-table-tips a",this.parentNode.parentNode).attr("href")}">显示的合成表数量已达到 10 个，可能有更多合成表已被隐藏！轻触此处查看所有合成/用途~</span></td>`)
		});
	$("span.mcmodder-tab-item-name")
		.hide();
	$("div.item-table-frame > table.item-table-block td.text.item-table-count p")
		.filter((e, t) => $(t)
			.text() === "↓")
		.each(function() {
			let e = parseInt($(this)
				.find("[mcmodder-gui-id]")
				.attr("mcmodder-gui-id"));
			const t = "//i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png";
			let i = -1,
				o = -1;
			switch (parseInt(e)) {
				case 52:
					i = 0, o = 0;
					break;
				case 54:
					i = 34, o = 0;
					break;
				case 209877:
					i = 68, o = 0;
					break;
				case 209876:
					i = 0, o = 34;
					break;
				case 158632:
					i = 34, o = 34;
					break;
				case 209864:
					i = 68, o = 34;
					break;
				case 210368:
					i = 0, o = 68;
					break;
				case 48:
					i = 34, o = 68;
					break;
				case 209863:
					i = 68, o = 68;
					break
			}
			$(this)
				.html('<span style="background-image: url(' + a + '); height: 32px; width: 64px; display: inline-block; background-size: cover; margin-left: 5px; margin-right: 5px; position: relative;">' + (e ? i < 0 ? '<span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + parseInt(e / 1e4) + "/" + e + '.png); width: 32px; height: 32px; display: inline-block; position: absolute; left: 12px; background-size: cover;"></span>' : '<span class="mcmodder-tab-item-icon" style="background-image: url(' + t + "); background-position: -" + i + "px -" + o + 'px; width: 34px; height: 34px; display: inline-block; position: absolute; left: 12px;"></span>' : "") + "</span>")
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-count span.noecho")
		.remove();
	$("fieldset.power_area > p:not(fieldset.power_area > p:last-child())")
		.append(" ·");
	$(".item-table-tips")
		.remove()
}
const ue_button_1 = "fullscreen, emotion, undo, redo, insertunorderedlist, insertorderedlist, link, unlink, insertimage, justifyleft, justifycenter, justifyright, justifyjustify, indent, removeformat, formatmatch, inserttable, deletetable, bold, italic, underline, horizontal, forecolor, spechars, superscript, subscript, mctitle".split(", ");
const ue_button_2 = "window-maximize, smile-o, rotate-left, rotate-right, list-ul, list-ol, link, unlink, image, align-left, align-center, align-right, align-justify, indent, eraser, paint-brush, table, trash, bold, italic, underline, minus, font, book, superscript, subscript, header".split(", ");
const formatColors = "000000,0000AA,00AA00,00AAAA,AA0000,AA00AA,FFAA00,AAAAAA,555555,5555FF,55FF55,55FFFF,FF5555,FF55FF,FFFF55,FFFFFF".split(",");
window.pushIframeList = function(e) {
	ueditorFrame.push(e.contentDocument);
	if (isNightMode) ueditorFrame.forEach(e => {
		addStyle(nightStyle, "mcmodder-night-controller", e);
		$("html", e)
			.addClass("dark")
	});
	$(e)
		.parents("#editor-ueeditor")
		.on("click", ".edui-for-forecolor .edui-arrow", function() {
			if ($("#mcmodder-format-column")
				.length) return;
			let i = formatColors.length;
			let o = '<tr style="border-bottom: 1px solid #ddd;font-size: 13px;line-height: 25px;color:#39C;" class="edui-default"><td colspan="10" class="edui-default" id="mcmodder-format-column"><a target="_blank" href="https://zh.minecraft.wiki/w/%E6%A0%BC%E5%BC%8F%E5%8C%96%E4%BB%A3%E7%A0%81#%E9%A2%9C%E8%89%B2%E4%BB%A3%E7%A0%81">格式化代码颜色</a></td></tr>';
			for (let t = 0; t < i; t += 10) {
				o += '<tr class="edui-default">';
				for (let e = t; e < Math.min(t + 10, i); e++) o += `<td style="padding: ${e<10?"6px 2px 0 2px":"0 2px"};" class="edui-default"><a hidefocus="" title="§${e.toString(16)} - ${formatColors[e]}" onclick="return false;" href="javascript:" unselectable="on" class="edui-box edui-colorpicker-colorcell edui-default" data-color="#${formatColors[e]}" style="background-color:#${formatColors[e]};border:solid #ccc;border-width:1px;"></a></td>`;
				o += "</tr>"
			}
			$(o)
				.appendTo(".edui-colorpicker tbody")
		});
	let t = $(e)
		.parents("#editor-ueeditor")
		.find(".edui-editor-toolbarboxinner");
	for (let e = 0; e < ue_button_1.length; e++) t.find(".edui-for-" + ue_button_1[e] + " .edui-icon")
		.addClass("mcmodder-edui-box fa fa-" + ue_button_2[e])
		.css({
			"background-image": "none"
		});
	t.find(".edui-arrow")
		.addClass("mcmodder-edui-arrow fa fa-caret-down")
		.css({
			"background-image": "none"
		})
};
const generalEditorObserver = new MutationObserver(function(e, t) {
	for (let t of e) {
		if (t.target.id === "edui1_iframeholder" && t.addedNodes.length) setTimeout(() => pushIframeList($(t.target)
			.find("#ueditor_0")
			.get(0)), 300);
		else if (isNightMode && t.target.id != "edit-autosave-sec") {
			let e = t.addedNodes[1];
			if (e && e.className === "%%-iframe") setTimeout(() => pushIframeList(e), 300)
		}
	}
});

function generalEditInit() {
	editAutoSaveLoop = function() {
		1 == nAutoSave ? $("#editor-frame")
			.length > 0 && 0 == editor.getContent()
			.trim()
			.length ? nAutoSave = 60 : (editSave(), nAutoSave--) : nAutoSave > 0 && nAutoSave--, $("#edit-autosave-sec")
			.text(nAutoSave), setTimeout(editAutoSaveLoop, 1e3)
	};
	$(".common-rowlist-block b")
		.filter((e, t) => $(t)
			.text() === "改动附言:")
		.append('<span class="mcmodder-common-danger"> (仅用于给审核员留言)</span>');
	$(".common-rowlist-block b")
		.filter((e, t) => $(t)
			.text() === "改动说明:")
		.append('<span class="mcmodder-common-dark"> (所有人均可见)</span>');
	$("[data-multi-id=remark], [data-multi-id=reason]")
		.hide()
		.each((e, t) => $(`<textarea id=${"mcmodder-textarea-"+$(t).attr("data-multi-id")} class="form-control" placeholder="${$(t).attr("placeholder")}"></textarea>`)
			.insertBefore($(t)
				.parent())
			.val($(t)
				.val())
			.bind("change", function() {
				$(this)
					.parent()
					.find(`[data-multi-id=${this.id.split("-").slice(-1)[0]}]`)
					.val($(this)
						.val())
			}))
}

function editorInit() {
	let commonNav = $(".common-nav > ul");
	window.modName = window.itemName = "";
	if (commonNav && commonNav.children()
		.length > 4) {
		commonNav = commonNav.first();
		modName = commonNav.children()
			.eq(4)
			.text()
			.replace("]", "] ");
		if (commonNav.children()
			.eq(8)
			.length) itemName = commonNav.children()
			.eq(8)
			.text()
	}
	addStyle(".swal2-show {animation: unset; -webkit-animation: unset;}");
	window.addTemplate = function() {
		if ($("#template-title")
			.val() && $("#template-description")
			.val()) {
			templateList.push({
				id: randStr(),
				title: $("#template-title")
					.val(),
				description: $("#template-description")
					.val(),
				content: editor.getContent()
			});
			setConfig("templateList", JSON.stringify(templateList));
			$("#edui59_body")
				.click()
		} else $("#template-title, #template-description")
			.css({
				display: "block"
			})
	};
	window.removeTemplate = function() {
		templateList = templateList.filter(e => e.id != $(this)
			.parent()
			.attr("data-tag"));
		setConfig("templateList", JSON.stringify(templateList));
		$("#edui59_body")
			.click()
	};
	window.loadCustomTemplate = function() {
		templateList.forEach(e => {
			if ($(this)
				.attr("data-tag") === e.id) $(".common-template-frame .input-group input")
				.get(0)
				.checked ? editor.execCommand("insertHtml", e.content) : editor.setContent(e.content);
			swal.close();
			$($("#ueditor_0")
					.get(0)
					.contentWindow.document.body)
				.trigger("keyup")
		})
	};
	window.nonItemTypeList = [{
		text: "模组",
		icon: "fa-cubes"
	}, {
		text: "整合包",
		icon: "fa-file-zip-o"
	}, {
		text: "个人作者",
		icon: "fa-user"
	}, {
		text: "开发团队",
		icon: "fa-users"
	}], window.itemDefaultTypeList = [{
		text: "物品/方块",
		icon: "",
		color: "#1b9100"
	}, {
		text: "群系/群落",
		icon: "",
		color: "#e69a37"
	}, {
		text: "世界/维度",
		icon: "",
		color: "#975a0a"
	}, {
		text: "生物/实体",
		icon: "",
		color: "#0c55b9"
	}, {
		text: "附魔/魔咒",
		icon: "",
		color: "#a239e4"
	}, {
		text: "BUFF/DEBUFF",
		icon: "",
		color: "#e4393f"
	}, {
		text: "多方块结构",
		icon: "",
		color: "#810914"
	}, {
		text: "自然生成",
		icon: "",
		color: "#d91baf"
	}, {
		text: "绑定热键",
		icon: "",
		color: "#3a6299"
	}, {
		text: "游戏设定",
		icon: "",
		color: "#4382d8"
	}];
	if (!getConfig("itemCustomTypeList")) setConfig("itemCustomTypeList", `[{"text": "元素/要素", "icon": "fa-mortar-pestle", "color": "#90f"},{"text": "工具属性", "icon": "fa-shapes", "color": "#c300ff"},{"text": "成就/进度", "icon": "fa-star", "color": "#e3cc25"},{"text": "新版已移除", "icon": "fa-clock-o", "color": "#b56f34"},{"text": "技能", "icon": "fa-star-of-david", "color": "#6cf"},{"text": "技能/能力", "icon": "fa-magic", "color": "#32d4a9"},{"text": "工具能力", "icon": "fa-tools", "color": "#f4d329"},{"text": "编辑规范", "icon": "fa-book", "color": "#000"},{"text": "材料类型", "icon": "fa-sitemap", "color": "#0a9"}]`);
	window.itemCustomTypeList = JSON.parse(getConfig("itemCustomTypeList") || "[]");
	const autoLinkObserver = new MutationObserver(function(e, t) {
		for (let h of e) {
			if (h.type === "childList" && h?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title")
				.text() === PublicLangData.editor.autolink.title) {
				let e = $(h.addedNodes[0]);
				let i, o = 1,
					a = "",
					r = "",
					t, n, l, d, s = $(".common-nav li:not(.line):nth-child(5) a")
					.get(0)?.href.split("/class/")[1].split(".html")[0];
				let c = e.find(".edit-autolink-list > ul")
					.first();
				let m = e.find("input.form-control")
					.val()
					.trim()
					.toLowerCase()
					.split(" ");
				if (!c.length) return;
				let p = c.find("li");
				e.find("button[type=submit]")
					.click(() => $(".edit-autolink-list input.form-control")
						.attr("disabled", "disabled"));
				if (m[0]?.includes("#")) {
					let e = $("<li>"),
						t = m[0].replaceAll("#", "");
					$(e)
						.html(`<li><a title="矿物词典/物品标签 - ${t}" data-type="oredict" data-text-full="#${t}" data-text-half="${t}" href="javascript:void(0);"><i class="fas fa-cubes mcmodder-chroma"></i> #${t}</a></li>`);
					e.find("a")
						.click(function() {
							let e = function(e, t, i) {
								t = t.replaceAll("#", "");
								if (i.length < 1) return 0;
								swal.close(), $("#edit-autolink-style-space:checked")
									.val() === 1 ? editor.execCommand("insertHtml", '&nbsp;<a href="//www.mcmod.cn/' + e + "/" + t + '-1.html" target="_blank" title="' + i + '">' + i + "</a>&nbsp;") : editor.execCommand("insertHtml", '<a href="//www.mcmod.cn/' + e + "/" + t + '-1.html" target="_blank" title="' + i + '">' + i + "</a>")
							};
							var t = editor.selection.getRange()
								.cloneContents();
							switch ($(".edit-autolink-style input[name='edit-autolink-style-text']:checked")
								.val()) {
								case "0":
									var i = t ? t.textContent : "_(:з」∠)_";
									break;
								case "1":
									i = $(this)
										.attr("data-text-half");
									break;
								case "2":
									i = $(this)
										.attr("data-text-full");
									break;
								default:
									return 0
							}
							e($(this)
								.attr("data-type"), i, i)
						});
					e.appendTo(p.parent());
					p = c.find("li")
				}
				p.filter((e, t) => t.className != "limit" && t.className != "empty")
					.each(function() {
						autoLinkIndex = 1, i = $("a", this)
							.get(0), a = i.title.split(" - ")[2] || "", r = a.includes("[") ? a.slice(1)
							.split("] ")[0] : a.split(" (")[0], n = $(i)
							.attr("data-id");
						nonItemTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<i class="fas ${e.icon} mcmodder-chroma"></i>`));
						itemDefaultTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<span class="iconfont icon" style="color: ${e.color}">${e.icon}</span>`));
						itemCustomTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<i class="fas ${e.icon}" style="color: ${e.color}"></i>`));
						i.innerHTML = i.innerHTML.replace("ID:" + n, '<span class="mcmodder-slim-dark item-id">' + n + "</span>");
						l = $(i)
							.attr("data-text-half");
						d = $(i)
							.attr("data-text-full")
							.replace(l, "");
						d = d.slice(2, d.length - 1);
						i.innerHTML = i.innerHTML.replace("(" + d + ")", '<span class="item-ename">' + d + "</span>");
						if (r) i.innerHTML = i.innerHTML.replace(n + "</span>", n + '</span> <span class="item-modabbr">[' + r + "]</span>");
						let e = getConfig(s, "modDependences")?.split(",") || [],
							t = getConfig(s, "modExpansions")?.split(",") || [];
						if (a === modName || r === "MC" || e.includes(a) || t.includes(a) || m.includes(r.toLowerCase()) || m.includes("原版") || $("a", this)
							.attr("data-type") === "oredict") {
							if ($(".item-modabbr", this)
								.length) {
								if (r === "MC" || e.includes(a)) $(".item-modabbr", this)
									.addClass("mcmodder-mark-aqua");
								else if (t.includes(a)) $(".item-modabbr", this)
									.addClass("mcmodder-mark-pink");
								else $(".item-modabbr", this)
									.addClass("mcmodder-mark-gold");
								$(".item-modabbr", this)
									.get(0)
									.style.fontWeight = "bold"
							}
							$(this)
								.insertBefore(c.children()
									.eq(o++ + 1));
							if (m.includes(l.toLowerCase()) || m.includes(d.toLowerCase()) || $("a", this)
								.attr("data-type") === "oredict") {
								$(this)
									.addClass("mcmodder-mark-gold");
								$(this)
									.insertBefore(c.children()
										.eq(2));
								$(".edit-autolink-list .empty")
									.remove()
							}
						}
						$(this)
							.find("a")
							.attr("data-toggle", "tooltip")
					});
				$(".edit-autolink-list ul")
					.children()
					.each((e, t) => {
						if (e > 0 && e < 10) $("a", t)
							.append(`<span class="mcmodder-common-dark item-ename"> [Alt+${e}]</span>`)
					});
				$("input.form-control", e)
					.bind("keyup", e => {
						if (!e.altKey) return;
						e.preventDefault();
						let t = e.key;
						if (t != parseInt(t)) return;
						let i = $(".edit-autolink-list ul")
							.children()
							.eq(parseInt(t));
						i.addClass("mcmodder-mark-greenyellow");
						setTimeout(() => {
							i.find("a")
								.trigger("click")
						}, 200)
					});
				updateAllTooltip()
			} else if (h.type === "childList" && h?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title")
				.text() === PublicLangData.editor.template.title) {
				$(".group li")
					.remove();
				window.templateList = JSON.parse(getConfig("templateList") || "[]");
				templateList.forEach(e => $(".group ul")
					.append(`<li data-tag="${e.id}"><p class="title">${e.title}</p><p>${e.description}</p><a style="position: absolute; right: .5em; top: .5em;" class="mcmodder-slim-danger"><i class="fa fa-trash" /></a></li>`));
				$(".group li")
					.click(window.loadCustomTemplate);
				$(".group li a")
					.click(window.removeTemplate);
				$(".group ul")
					.append(`<li><input id="template-title" class="form-control title" style="display: none;" placeholder="新模板标题... (必填)"><input id="template-description" class="form-control" style="display: none;" placeholder="新模板介绍... (必填)"><button id="mcmodder-add-template" class="btn btn-sm btn-dark">新建模板</button></li>`);
				$("#mcmodder-add-template")
					.click(window.addTemplate)
			}
		}
	});
	autoLinkObserver.observe(document.body, {
		childList: true
	});
	let editorWin = $("#ueditor_0")
		.get(0)
		.contentWindow,
		editorDoc = editorWin.document;
	addStyle("pre {font-family: Consolas, monospace; box-shadow: inset rgba(50, 50, 100, 0.4) 0px 2px 4px 0px;}", editorDoc);
	if ($(".edit-tools")
		.length) {
		let totalStats;
		if (!$(".edit-tools")
			.length && $(".post-row")
			.length) {
			$("div.col-lg-12.left")
				.remove();
			$("div.col-lg-12.right")
				.css({
					"padding-left": "0px"
				});
			totalStats = $('<span style="font-size: 12px; margin-top: 10px; position: relative;">')
				.appendTo($(".post-row")
					.first())
		} else totalStats = $("<span>")
			.appendTo($(".edit-tools")
				.first());
		totalStats.attr("class", "mcmodder-editor-stats")
			.html('<i class="fa fa-edit"></i><span id="current-text" class="mcmodder-common-dark" style="margin-right: 0px">0</span><span style="margin-right: 0px">&nbsp;字节</span><i class="fa fa-line-chart" style="margin-left: .8em;"></i><span id="changed-text" class="mcmodder-common-light" style="margin-right: 0px">--</span><span style="margin-right: 0px">&nbsp;字节</span>');
		if (!$(".edit-user-alert.locked")
			.length) originalContextLength = $("#changed-text", totalStats)
			.html(getContextLength(editorDoc.body.textContent));
		else {
			async function getPreviousContext() {
				$("#changed-text", totalStats)
					.html(loadingColorful);
				originalContextLength = 0;
				let e = commonNav.childNodes[commonNav.childNodes.length - 3].childNodes[0].href;
				let t = await fetch(e, {
					method: "GET",
					headers: {
						"Content-Type": "text/html; charset=UTF-8"
					},
					credentials: "omit"
				});
				let i = $("<html>")
					.html(await t.text());
				let o = i.find(".text-area.common-text")
					.get(0) || i.find(".item-content.common-text")
					.get(0);
				$(".figure", o)
					.remove();
				let a = $(o)
					.children()
					.filter((e, t) => {
						if (t.className === "common-text-menu") return false;
						if (t.id.includes("link_")) return false;
						if (t.tagName === "SCRIPT") return false;
						if ($(t)
							.attr("style") === "text-align:center;color:#888;width:100%;float:left;font-size:14px;") return false;
						return true
					});
				let r = $(editorDoc.body)
					.children();
				let n = "",
					l = "";
				a.each(function() {
					n += this.textContent + "\n";
					originalContextLength += getContextLength(this.textContent)
				});
				r.each(function() {
					let e = clearContextFormatter(this.textContent);
					if (e) l += e + "\n"
				});
				textCompare(n, l);
				heightAutoResize()
			}
			getPreviousContext()
		}
		if (!$(".edit-tools")
			.length && $(".post-row")
			.length) $(".post-row")
			.get(0)
			.insertBefore($(".post-row > .mcmodder-editor-stats")
				.get(0), $(".post-row > #editor-ueeditor")
				.get(0));
		window.addEventListener("resize", () => {
			$("#mcmodder-mdeditor, #editor-ueeditor")
				.css("width", getConfig("markdownIt") ? "50%" : "100%");
			$("#edui1, #edui1_iframeholder")
				.css("width", "100%");
			$("#mcmodder-mdeditor")
				.css("height", $("#editor-ueeditor")
					.css("height"))
		});
		window.dispatchEvent(new Event("resize"));
		heightAutoResize();
		$(editorDoc.body)
			.bind({
				keyup: heightAutoResize,
				paste: heightAutoResize
			});
		if (getConfig("nightMode")) {
			if ($("#item-cover-preview-img")
				.first()
				.attr("src") === "https://www.mcmod.cn/pages/class/images/none.jpg") $("#item-cover-preview-img")
				.attr("src", "https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg")
		}
		const isModrinthVer = window.location.href.includes("?mrid=");
		if (getConfig("markdownIt") || isModrinthVer) {
			window.md2html = function() {
				let e = $("#ueditor_0")
					.get(0)
					.contentWindow,
					t = editorDoc.body,
					i = $("#mcmodder-mdeditor");
				let o = i.val()
					.split("\n");
				o = o.map(t => {
					for (let e = 1; e < 6; e++)
						if (t.slice(0, e + 1) === "#".repeat(e) + " ") return `[h${e}=${t.slice(e+1)}]`;
					return t
				});
				const a = e.markdownit();
				const r = a.render(o.reduce((e, t) => e + t + "\n", ""));
				t.innerHTML = r;
				$("pre", editorDoc)
					.each((e, t) => {
						$(t)
							.html($(t)
								.text());
						if (!t.classList.length) common_msg("提示", "转换结果中出现代码块 (pre)，记得设置相应语言~", "ok")
					});
				$("blockquote", editorDoc)
					.css({
						border: "3px solid red"
					})
					.each(() => common_msg("警告", "转换结果中出现不受支持的引用块 (blockquote)，请适当调整~", "err"));
				heightAutoResize()
			};
			let loadScripts = async function() {
				await loadScript(editorDoc.head, null, "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.1/markdown-it.min.js");
				$('<button id="mcmodder-markdown-it" class="btn btn-outline-dark btn-sm">Markdown → HTML</button>')
					.insertBefore("#mcmodder-mdeditor")
					.click(md2html);
				if (isModrinthVer) $("#mcmodder-markdown-it")
					.click();
				window.dispatchEvent(new Event("resize"))
			};
			$('<textarea id="mcmodder-mdeditor" class="form-control mcmodder-monospace" placeholder="Markdown 编辑区域...">')
				.insertBefore("#editor-ueeditor");
			addStyle("#mcmodder-mdeditor, #editor-ueeditor {display: inline-block;} #mcmodder-markdown-it {display: block;}");
			loadScripts()
		}
	}
	const swalObserver = new MutationObserver(function(mutationList, swalObserver) {
		for (let mutation of mutationList) {
			if (!mutation.addedNodes[0]?.className?.includes("swal2")) continue;
			let st = $(".swal2-title")
				.text();
			if (st === PublicLangData.editor.success.title) {
				if (getConfig("autoCloseSwal")) {
					swal.close();
					common_msg("提示", "提交成功，请等待管理员审核~", "ok")
				} else $(".swal2-success-circular-line-left, .swal2-success-circular-line-right, .swal2-success-fix")
					.css({
						"background-color": "transparent"
					})
			} else if (st.includes("确认")) {
				let setDirector = function(e, b, textLink, formLink, regLink) {
					$(`<a class="badge">${e} <i class="fa fa-search" style="margin: 0"></i></a>`)
						.click(function() {
							let r = editorDoc.createRange(),
								l = $("*, * *", editorDoc.body)
								.contents();
							l.each((i, c) => {
								if (c.nodeType != Node.TEXT_NODE) return;
								let t = $(c)
									.text(),
									flag = true;
								textLink && textLink.split(",")
									.forEach(e => {
										if (flag && t.includes(e)) {
											r.setStart(c, t.indexOf(e));
											r.setEnd(c, t.indexOf(e) + e.length);
											flag = false
										}
									});
								let regSearch, regMatch, reg = eval(regLink);
								regSearch = t.search(reg), regMatch = t.match(reg)[0];
								if (regLink && regSearch && regMatch) {
									r.setStart(c, regSearch);
									r.setEnd(c, regSearch + regMatch.length)
								}
							});
							swal.close();
							if (textLink || regLink) setTimeout(() => {
								let e = editorWin.getSelection();
								e.removeAllRanges();
								e.addRange(r);
								e.anchorNode.parentNode?.scrollIntoView({
									behavior: "smooth",
									block: "center"
								})
							}, 400);
							else if (formLink) {
								let t = eval(formLink)
									.first()
									.addClass("mcmodder-mark-gold");
								t.get(0)
									.scrollIntoView({
										behavior: "smooth",
										block: "center"
									});
								setTimeout(() => {
									t.removeClass("mcmodder-mark-gold")
								}, 2e3)
							}
						})
						.insertBefore(b)
				};
				let langList = PublicLangData.editor.inform.list;
				$(".edit-dataverify-frame .error li, .edit-dataverify-frame .warning li, .edit-dataverify-frame .info li")
					.each((e, t) => {
						let i = $(t)
							.text();
						if (i === langList.common_content_personal_pronoun) t.innerHTML = t.innerHTML.replace("您", "<b>您</b>")
							.replace("你", "<b>你</b>");
						else if (i === langList.common_content_ban_title_duplicate) t.innerHTML = t.innerHTML.replace("[ban:title_menu]", "<b>[ban:title_menu]</b>");
						else if (i === langList.common_content_too_many_space) t.innerHTML = t.innerHTML.replace("大量空格", '<a reg-link="/s{5}/">大量空格</a>');
						else if (i === langList.common_content_wrong_horizontal_rule) t.innerHTML = t.innerHTML.replace("大量横线", '<a text-link="-----,=====,~~~~~">大量横线</a>');
						else if (i === langList.common_name_empty || i === langList.common_name_repeat || i === langList.item_name_empty || i === langList.item_name_repeat) t.innerHTML += "<a form-link=\"$('[data-multi-id=name]')\">定位</a>";
						else if (i === langList.common_ename_format) t.innerHTML += "<a form-link=\"$('[data-multi-id=ename]')\">定位</a>";
						else if (i === langList.common_name_empty) t.innerHTML += "<a form-link=\"$('[data-multi-id=name]')\">定位</a>";
						else if ([langList.common_link_empty, langList.common_link_blank, langList.common_link_nohttp, langList.common_link_no_statement, langList.common_link_remark_redund, langList.common_link_suffix_redund_common, langList.common_link_suffix_redund_cf, langList.common_link_suffix_redund_mr, langList.common_link_no_prefix, langList.common_link_wrong_prefix, langList.common_link_personal, langList.common_link_wrong_location, langList.common_link_source_address_missing].includes(i)) t.innerHTML += "<a form-link=\"$('#link-frame')\">定位</a>";
						else if (i === langList.common_tag_wrong_spliter) t.innerHTML += "<a form-link=\"$('#class-tags').prev()\">定位</a>";
						else if (i === langList.common_key_wrong_spliter) t.innerHTML += "<a form-link=\"$('#class-keys').prev()\">定位</a>";
						else if (i === langList.common_cfid_format) t.innerHTML += "<a form-link=\"$('#class-cfprojectid').prev()\">定位</a>";
						else if (i === langList.common_mrid_format) t.innerHTML += "<a form-link=\"$('#class-mrprojectid').prev()\">定位</a>";
						else if (i === langList.common_author_empty) t.innerHTML += "<a form-link=\"$('#author-frame')\">定位</a>";
						else if (i === langList.common_sname_limit) t.innerHTML += "<a form-link=\"$('[data-multi-id=sname]')\">定位</a>";
						else if (i === langList.class_category_empty || i === langList.modpack_category_empty) t.innerHTML += "<a form-link=\"$('.common-class-category').parent()\">定位</a>";
						else if (i === langList.class_cover_empty) t.innerHTML += "<a form-link=\"$('#cover-select-label').parent()\">定位</a>";
						else if (i === langList.class_platform_api_empty) t.innerHTML += "<a form-link=\"$('#class-data-platform-1').parent().parent()\">定位</a>";
						else if (i === langList.class_mcver_empty) t.innerHTML += "<a form-link=\"$('#mcversion-frame')\">定位</a>";
						else if (i === langList.class_modid_empty || i === langList.class_modid_wrong_spliter) t.innerHTML += "<a form-link=\"$('#class-modid').prev()\">定位</a>";
						else if (i === langList.class_relation_version_duplicate) t.innerHTML += "<a form-link=\"$('#relation-frame')\">定位</a>";
						else if (i === langList.version_name_empty) t.innerHTML += "<a form-link=\"$('[data-multi-id=name]')\">定位</a>";
						else if (i === langList.version_updatetime_empty) t.innerHTML += "<a form-link=\"$('#class-version-updatetime-year').parent().parent()\">定位</a>";
						else if (i === langList.version_mcversion_empty) t.innerHTML += "<a form-link=\"$('[data-multi-id=mcversion]')\">定位</a>";
						else if (i === langList.item_category_empty) t.innerHTML += "<a form-link=\"$('.common-item-mold-list')\">定位</a>";
						else if (i === langList.item_type_empty) t.innerHTML += "<a form-link=\"$('#item-type-frame')\">定位</a>";
						if (true) {
							let e = $(t)
								.find("b, a[text-link], a[form-link], a[reg-link]");
							e.each((e, t) => {
								t.textContent.split(", ")
									.forEach(e => setDirector(e, t, t.tagName === "B" ? e : $(t)
										.attr("text-link"), $(t)
										.attr("form-link"), $(t)
										.attr("reg-link")));
								t.remove()
							})
						}
					})
			}
		}
	});
	swalObserver.observe(document.body, {
		childList: true
	})
}

function editorLoad() {
	generalEditInit();
	if (!$("#editor-frame")
		.length) return;
	const e = new MutationObserver(function(t, e) {
		for (let e of t) {
			if (e.target.id === "editor-frame" && e.removedNodes.length) setTimeout(editorInit, 1e3)
		}
	});
	e.observe($("#editor-frame")
		.get(0), {
			childList: true
		})
}

function classEditorInit() {
	window.arrLoaderVer = {
		1: [">=1.21.4", "1.21.4", "1.21.3", "1.21.1", "1.21", "1.20.6", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.13.2", "1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8.8", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.3", "1.4.2", "1.3.2", "1.2.5", "远古版本"],
		2: [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
		11: [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
		13: [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1"],
		3: ["1.13.2", "1.13.1", "1.13"],
		4: ["1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.2", "1.3.2"],
		9: ["1.18.2", "1.18.1", "1.18"],
		6: [">=1.4.2"],
		5: [">=1.13"]
	};
	window.hideUnavailableVersion = function() {
		$("#mcversion-frame fieldset")
			.each((e, a) => {
				$(".checkbox", a)
					.each((e, t) => {
						let i = arrLoaderVer[a.id.split("-")[2]],
							o = $("label", t)
							.text();
						if (i && !(i.includes(o) || i[0].includes(">=") && versionCompare(o, i[0].split(">=")[1]) > -1)) $(t)
							.hide()
					})
			})
	};
	hideUnavailableVersion();
	$(document)
		.on("click", "input[data-multi-id=api]", hideUnavailableVersion)
}

function itemEditorInit() {
	window.imgResize = function(e, t) {
		let i = document.createElement("canvas");
		let o = i.getContext("2d");
		let a = new Image;
		a.onload = function() {
			i.width = i.height = t * ($(".common-item-mold-list li a[data-category-selected='true']")
				.attr("data-multi-value") === "6" ? 1.125 : 1);
			o.imageSmoothingEnabled = false;
			o.drawImage(a, 0, 0, i.width, i.height);
			let e = i.toDataURL("image/png");
			$(`#icon-${t}x`)
				.val(e);
			$(`#icon-${t}x-editor`)
				.val(e);
			$(`#item-icon-${t}x-preview-img`)
				.attr("src", e)
		};
		a.src = $(`#icon-${e}x`)
			.val()
	};
	window.loadOriginal = function() {
		let e = this.files[0];
		if (!e.type.includes("image/")) return common_msg(PublicLangData.warning.inform[120], "err"), false;
		let t = new FileReader;
		t.onload = function(e) {
			var t = e.target.result;
			if (!t) return !1;
			var i = new Image;
			i.src = t;
			var o = 0,
				a = 0;
			i.onload = function() {
				$("#icon-16x")
					.val(t);
				$("#item-icon-16x-preview-img")
					.show()
					.attr("src", t);
				imgResize(16, 32);
				imgResize(16, 128)
			}
		}, t.readAsDataURL(e)
	};
	const e = "#edit-page-1 .tab-ul hr:nth-child(6)";
	$('<img id="item-icon-16x-preview-img" /><br><input id="icon-input-16x" type="file" accept="image/*" class="hidden"><label id="icon-input-16x-label" class="btn btn-dark" for="icon-input-16x">上传图标以自动调整尺寸</label><input id="icon-16x" style="display: none;">')
		.insertAfter(e);
	$("#item-icon-16x-preview-img")
		.hide();
	$("#icon-input-16x")
		.bind("change", loadOriginal);
	$('<input id="icon-32x-editor" placeholder="输入 Base64 格式小图标...">')
		.insertAfter("#icon-32x");
	$('<input id="icon-128x-editor" placeholder="输入 Base64 格式大图标...">')
		.insertAfter("#icon-128x");
	window.imgResize32 = function() {
		imgResize(32, 128)
	};
	window.imgResize128 = function() {
		imgResize(128, 32)
	};
	$('<button class="btn">同步至大图标</button>')
		.insertAfter("#icon-32x-editor")
		.click(window.imgResize32);
	$('<button class="btn">同步至小图标</button>')
		.insertAfter("#icon-128x-editor")
		.click(window.imgResize128);
	$("#icon-32x, #icon-128x")
		.bind("change", function() {
			let e = $(this)
				.val()
				.trim();
			if (e && e.slice(0, 11) != "data:image/") $(this)
				.val("data:image/png;base64," + e);
			$(`#item-${this.id}-preview-img`)
				.attr("src", $(this)
					.val()
					.trim());
			$(`#${this.id}-editor`)
				.val($(this)
					.val()
					.trim())
		});
	$("#icon-32x-editor, #icon-128x-editor")
		.attr({
			class: "form-control"
		})
		.bind("change", function() {
			$("#" + this.id.replace("-editor", ""))
				.val($(this)
					.val()
					.trim())
				.trigger("change")
		});
	$("#icon-32x-editor")
		.val($("#icon-32x")
			.val()
			.trim());
	$("#icon-128x-editor")
		.val($("#icon-128x")
			.val()
			.trim());
	editorLoad();
	$(document)
		.on("click", updateItemTooltip);
	$('<input id="mcmodder-json-upload" class="form-control" placeholder="粘贴 JSON 物品导出行于此处以快速填充基本信息..">')
		.insertBefore($(".tab-ul")
			.first())
		.bind("change", function() {
			let e;
			try {
				e = JSON.parse(this.value)
			} catch (e) {
				if (e instanceof SyntaxError) common_msg("解析错误", "请检查提交的 JSON 语法是否正确~", "err");
				return
			}
			try {
				$("[data-multi-id=name]")
					.val(e.name);
				$("[data-multi-id=ename]")
					.val(e.englishName);
				$("#icon-32x")
					.val(e.smallIcon)
					.change();
				$("#icon-128x")
					.val(e.largeIcon)
					.change();
				e.OredictList.slice(1, e.OredictList.length - 1)
					.split(", ")
					.forEach(e => {
						$("[data-multi-id=oredict]")
							.prev()
							.children()
							.val(e)
							.trigger("focusout")
					});
				if (e.maxDurability) $("#item-damage")
					.val(e.maxDurability);
				$("#item-maxstack")
					.val(e.maxStacksSize);
				$("#item-regname")
					.val(e.registerName);
				if (e.metadata) $("#item-metadata")
					.val(e.metadata)
			} catch (e) {
				if (e instanceof TypeError) common_msg("错误", e.toString(), "err")
			}
		})
}

function versionListInit() {
	window.versionList = [];
	$(".version-content-block")
		.each((e, t) => {
			t.id = "mcmodder-log-" + e;
			let i = $(t)
				.parent()
				.attr("data-frame"),
				o = [];
			o = i.replaceAll(" ", "")
				.split(/[\/,&\u3001]/);
			let a = $(t)
				.find(".name")
				.text(),
				r = $(t)
				.find(".time")
				.text();
			if (r === "未知时间") r = 0;
			versionList.push({
				date: new Date(r),
				name: a,
				mcver: o,
				logid: e
			})
		});
	if (getConfig("versionHelper")) {
		$('<div class="version-menu"><fieldset><legend>从其他网站获取版本列表</legend><div class="bd-callout"><p>该功能尚不保证能够准确对应版本列表与百科现有日志的版本号，对比结果仅供参考，提交日志前请仔细检查各信息是否正确~</p><p>添加时请注意：新增日志的版本号格式应尽可能与现有日志统一。例如，若其他版本号有前缀“v”，则新建日志的版本号也应带此前缀~</p></div><input id="mcmodder-fetch-version-cf" class="form-control" placeholder="输入 CFID 以查询..."><input id="mcmodder-fetch-version-mr" class="form-control" placeholder="输入 MRID 以查询..."><table id="mcmodder-version-menu"><thead><tr><th>文件 ID</th><th>发布状态</th><th>文件名称</th><th>支持 MC 版本</th><th>更新日期</th><th>对应日志版本号</th><th>对应日志支持版本</th><th>对应更新日期</th><th>操作</th></tr></thead><tbody></tbody></table></fieldset></div>')
			.insertBefore(".version-menu, .version-content-empty");
		$("#mcmodder-version-menu")
			.hide();
		$("#mcmodder-fetch-version-cf")
			.bind("focusout", () => {
				let e = $("#mcmodder-fetch-version-cf")
					.val()
					.trim();
				if (e != parseInt(e)) return;
				getCurseForgeFileList($("#mcmodder-fetch-version-cf")
					.val()
					.trim())
			});
		$("#mcmodder-fetch-version-mr")
			.bind("focusout", () => {
				let e = $("#mcmodder-fetch-version-mr")
					.val()
					.trim();
				if (!e) return;
				getModrinthFileList($("#mcmodder-fetch-version-mr")
					.val()
					.trim())
			});
		let e = async function() {
			let e = await fetch(`https://www.mcmod.cn/class/edit/${document.location.href.split("/version/")[1].split(".html")[0]}/`, {
				method: "GET"
			});
			let t = $("<html>")
				.html(await e.text());
			$("#mcmodder-fetch-version-cf")
				.val(t.find("#class-cfprojectid")
					.val()
					.trim());
			$("#mcmodder-fetch-version-mr")
				.val(t.find("#class-mrprojectid")
					.val()
					.trim())
		};
		$("#mcmodder-fetch-version-cf, #mcmodder-fetch-version-mr")
			.bind("focus", e)
	}
}

function versionInit() {
	generalEditInit();
	const e = new Date;
	const i = e.getFullYear();
	let o = (e, t, i) => t <= e && e <= i;
	$('<input id="mcmodder-date-editor" class="form-control" placeholder="输入 yymmdd 格式数字以快捷设置日期~">')
		.appendTo($("li.tab-li:nth-child(1)")
			.first())
		.bind("change", function() {
			let e = new Array(this.value.slice(0, 2), this.value.slice(2, 4), this.value.slice(4, 6)),
				t;
			if (!(o(e[0], 9, i - 2e3) && o(e[1], 1, 12) && o(e[2], 1, 31))) return;
			if (e[1][0] === "0") e[1] = e[1].slice(1);
			if (e[2][0] === "0") e[2] = e[2].slice(1);
			$("#class-version-updatetime-year")
				.selectpicker("val", "20" + e[0]);
			$("#class-version-updatetime-month")
				.selectpicker("val", e[1]);
			$("#class-version-updatetime-day")
				.selectpicker("val", e[2]);
			$("li.tab-li:nth-child(3) > div:nth-child(2) > input:nth-child(1)")
				.get(0)
				.focus()
		});
	setTimeout(editorInit, 1e3);
	let t = new URLSearchParams(window.location.search),
		s = 0,
		a;
	if (t.get("cfid")) s = 1, a = t.get("cfid");
	else if (t.get("mrid")) s = 2, a = t.get("mrid");
	if (s) {
		let e = async function(e, t, i, o, a) {
			let r, n, l;
			if (s === 1) {
				r = await fetch(`https://www.curseforge.com/api/v1/mods/${e}/files/${t}/change-log`, {
					method: "GET"
				});
				n = await r.text();
				l = JSON.parse(n)
					.changelogBody
			} else if (s === 2) {
				r = await fetch(`https://api.modrinth.com/v2/version/${t}`, {
					method: "GET"
				});
				n = await r.text();
				l = "<p>" + JSON.parse(n)
					.changelog.replaceAll("\n", "</p><p>") + "</p>"
			}
			if (l) setTimeout(() => {
				editor.setContent(l);
				let e = $("#ueditor_0")
					.get(0)
					.contentDocument.body,
					o = false;
				for (let i = 1; i < 6; i++) $(e)
					.find("h" + i)
					.each((e, t) => {
						$(t)
							.replaceWith(`<p>[h${i}=${t.textContent}]</p>`);
						o = true
					});
				if (o) $(e)
					.append("<p>[ban:title_menu]</p>");
				$(e)
					.trigger("keyup")
			}, 1100);
			$("[data-multi-id=name]")
				.val(i);
			$("[data-multi-id=mcversion]")
				.val(o);
			let d = new Date(parseInt(a));
			$("#mcmodder-date-editor")
				.val(d.getYear() % 100 * 1e4 + (d.getMonth() + 1) * 100 + d.getDate())
				.trigger("change")
		};
		e(a, t.get("fileid"), t.get("ver"), t.get("mcver"), t.get("date"))
	}
}

function classInit() {
	let r = window.location.href.split("/class/")[1]?.split(".html")[0] || window.location.href.split("/modpack/")[1]?.split(".html")[0];
	if (window.location.href.includes("/class/")) {
		let e = getConfig(r, "modDependences"),
			t = "";
		let i = getConfig(r, "modExpansions"),
			o = "";
		$("li.col-lg-12.relation")
			.each(function() {
				if ($("span[data-toggle=tooltip]:first-child()", this)
					.text()
					.includes("前置Mod")) {
					$("a[data-toggle=tooltip]", this)
						.each(function() {
							t += $(this)
								.text()
								.replaceAll("  ", " ") + ","
						})
				}
				if ($("span[data-toggle=tooltip]:first-child()", this)
					.text()
					.includes("依赖")) {
					$("a[data-toggle=tooltip]", this)
						.each(function() {
							o += $(this)
								.text()
								.replaceAll("  ", " ") + ","
						})
				}
			});
		if (e != t) {
			setConfig(r, t, "modDependences");
			common_msg("提示", "成功更新此模组前置列表~", "ok")
		}
		if (i != o) {
			setConfig(r, o, "modExpansions");
			common_msg("提示", "成功更新此模组拓展列表~", "ok")
		}
	}
	window.syncSubscribeList = function() {
		setTimeout(() => {
			let e = $(".subscribe i.fas")
				.length,
				t = getConfig("subscribeModlist-" + currentUid);
			if (!e && t?.split(",")
				.includes(r)) {
				setConfig("subscribeModlist-" + currentUid, t.replace(r + ",", ""));
				setConfig(r, "0", "latestEditTime");
				common_msg("提示", "成功同步关注状态~", "ok")
			} else if (e && !t?.split(",")
				.includes(r)) {
				setConfig("subscribeModlist-" + currentUid, t + "," + r);
				common_msg("提示", "成功同步关注状态~", "ok")
			}
		}, 1e3)
	};
	syncSubscribeList();
	$(".subscribe")
		.click(syncSubscribeList);
	let n = JSON.parse(getConfig("itemCustomTypeList") || "[]");
	$(".class-item-type li")
		.filter((e, t) => !t.className.includes("mold-"))
		.each((e, t) => {
			let i = false,
				o = $(t)
				.find(".text .title")
				.text(),
				a = $(t)
				.find(".iconfont i");
			n.forEach(e => i ||= e.text === o);
			if (!i) {
				n.push({
					text: o,
					icon: a.attr("class")
						.slice(4),
					color: rgbToHex(a.css("color"))
				});
				setConfig("itemCustomTypeList", JSON.stringify(n));
				common_msg("提示", `成功同步自定义资料类型数据~ (${o})`, "ok")
			}
		});
	$(".title")
		.filter((e, t) => t.textContent === "更新日志")
		.append(`<span class="more"><a href="/class/version/${r}.html" target="_blank">更多</a><a></a></span>`);
	if (getConfig("enableAprilFools")) {
		let e = 0,
			t = ["诅咒锻炉", "CurseFabric", "BlessForge", "BlessFabric"];
		for (let e of $("ul.common-link-icon-frame span.name")
			.toArray()) {
			if (e.innerHTML === PublicLangData.website.discord) e.innerHTML = "Drocsid";
			if (e.innerHTML === PublicLangData.website.github) e.innerHTML = "GayHub";
			if (e.innerHTML === PublicLangData.website.gitlab) e.innerHTML = "GayLab";
			if (e.innerHTML === PublicLangData.website.gitee) e.innerHTML = "Giteeeeee";
			if (e.innerHTML === PublicLangData.website.modrinth) e.innerHTML = "Pluginrinth";
			if (e.innerHTML === PublicLangData.website.wiki) e.innerHTML = "Kiwi";
			if (e.innerHTML === PublicLangData.website.curseforge) e.innerHTML = t[Math.floor(Math.random() * 4)]
		}
		$("div.frame span.avatar[title='MCreator - MCr'] img")
			.attr("src", "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif");
		$(".class-card .text-block span")
			.each((e, t) => {
				t.innerHTML = t.innerHTML.replace(PublicLangData.class.card.red, "猛票")
					.replace(PublicLangData.class.card.black, "盲票")
			});
		$(".class-card .progress-bar")
			.each((e, t) => $(t)
				.attr("data-original-title", $(t)
					.attr("data-original-title")
					.replace(PublicLangData.class.card.red, "猛票")
					.replace(PublicLangData.class.card.black, "盲票")))
	}
	$("<div>")
		.attr("class", "mcmodder-info-right")
		.insertAfter(".class-info-left .col-lg-12:first-child()");
	$(".class-info-right")
		.children()
		.clone()
		.appendTo(".mcmodder-info-right");
	let e = $(".class-info-left")
		.attr("class", "class-info-left mcmodder-class-source-info")
		.clone();
	e.attr("class", "class-info-left mcmodder-class-info");
	e.appendTo(".class-info-right");
	$(".common-center")
		.append('<div class="right"><div class="class-info"></div></div>');
	$(".class-info-right")
		.appendTo(".common-center .right .class-info");
	$(".col-lg-12.right")
		.addClass("mcmodder-class-init");
	$(".class-text-top")
		.css({
			"min-height": "0"
		});
	$(".class-text .class-info-right")
		.remove();
	$(".common-center > .right")
		.insertBefore(".common-center .right");
	$(".common-center > .right")
		.remove();
	$(".mcmodder-class-info > ul > *, .common-link-frame .title")
		.contents()
		.filter((e, t) => t.nodeType === Node.TEXT_NODE && ([PublicLangData.class.link.title + ":", PublicLangData.class.tags.title + ": ", PublicLangData.modpack.tags.title + ": ", "支持的MC版本: "].includes(t.data) || t.data.includes("作者")))
		.each(function() {
			$(this)
				.parent()
				.find("> i")
				.remove();
			$(this)
				.replaceWith(`<span class="mcmodder-subtitle">${this.data.replace(":","")}</span>`)
		});
	$(".mcmodder-class-info .author .fold")
		.remove();
	if (getConfig("imageLocalizedCheck")) $(document)
		.on("load", ".figure img", function() {
			if (!this.src.includes("mcmod.cn")) {
				$(this)
					.parent()
					.append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>');
				this.style.border = "10px solid red"
			}
		});
	let t = $("body > svg")
		.first()
		.html();
	$("body > svg")
		.first()
		.html(t + '<symbol id="mcmodder-icon-forge" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path fill="none" stroke="var(--mcmodder-platform-forge)" stroke-width="2" d="M2 7.5h8v-2h12v2s-7 3.4-7 6 3.1 3.1 3.1 3.1l.9 3.9H5l1-4.1s3.8.1 4-2.9c.2-2.7-6.5-.7-8-6Z"></path></symbol><symbol id="mcmodder-icon-fabric" viewBox="0 0 24 24"><path fill="none" stroke="var(--mcmodder-platform-fabric)" d="m820 761-85.6-87.6c-4.6-4.7-10.4-9.6-25.9 1-19.9 13.6-8.4 21.9-5.2 25.4 8.2 9 84.1 89 97.2 104 2.5 2.8-20.3-22.5-6.5-39.7 5.4-7 18-12 26-3 6.5 7.3 10.7 18-3.4 29.7-24.7 20.4-102 82.4-127 103-12.5 10.3-28.5 2.3-35.8-6-7.5-8.9-30.6-34.6-51.3-58.2-5.5-6.3-4.1-19.6 2.3-25 35-30.3 91.9-73.8 111.9-90.8" transform="matrix(.08671 0 0 .0867 -49.8 -56)" stroke-width="23"></path></symbol><symbol id="mcmodder-icon-neoforge" viewBox="0 0 24 24"><g fill="none" stroke="var(--mcmodder-platform-neoforge)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m12 19.2v2m0-2v2"></path><path d="m8.4 1.3c0.5 1.5 0.7 3 0.1 4.6-0.2 0.5-0.9 1.5-1.6 1.5m8.7-6.1c-0.5 1.5-0.7 3-0.1 4.6 0.2 0.6 0.9 1.5 1.6 1.5"></path><path d="m3.6 15.8h-1.7m18.5 0h1.7"></path><path d="m3.2 12.1h-1.7m19.3 0h1.8"></path><path d="m8.1 12.7v1.6m7.8-1.6v1.6"></path><path d="m10.8 18h1.2m0 1.2-1.2-1.2m2.4 0h-1.2m0 1.2 1.2-1.2"></path><path d="m4 9.7c-0.5 1.2-0.8 2.4-0.8 3.7 0 3.1 2.9 6.3 5.3 8.2 0.9 0.7 2.2 1.1 3.4 1.1m0.1-17.8c-1.1 0-2.1 0.2-3.2 0.7m11.2 4.1c0.5 1.2 0.8 2.4 0.8 3.7 0 3.1-2.9 6.3-5.3 8.2-0.9 0.7-2.2 1.1-3.4 1.1m-0.1-17.8c1.1 0 2.1 0.2 3.2 0.7"></path><path d="m4 9.7c-0.2-1.8-0.3-3.7 0.5-5.5s2.2-2.6 3.9-3m11.6 8.5c0.2-1.9 0.3-3.7-0.5-5.5s-2.2-2.6-3.9-3"></path><path d="m12 21.2-2.4 0.4m2.4-0.4 2.4 0.4"></path></g></symbol><symbol id="mcmodder-icon-quilt" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24"><defs><path id="quilt" fill="none" stroke="var(--mcmodder-platform-quilt)" stroke-width="65.6" d="M442.5 233.9c0-6.4-5.2-11.6-11.6-11.6h-197c-6.4 0-11.6 5.2-11.6 11.6v197c0 6.4 5.2 11.6 11.6 11.6h197c6.4 0 11.6-5.2 11.6-11.7v-197Z"></path></defs><path fill="none" d="M0 0h24v24H0z"></path><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 -3.2)"></use><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 7)"></use><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 6.9 -3.2)"></use><path fill="none" stroke="currentColor" stroke-width="70.4" d="M442.5 234.8c0-7-5.6-12.5-12.5-12.5H234.7c-6.8 0-12.4 5.6-12.4 12.5V430c0 6.9 5.6 12.5 12.4 12.5H430c6.9 0 12.5-5.6 12.5-12.5V234.8Z" transform="rotate(45 3.5 24) scale(.02843 .02835)"></path></symbol><symbol id="mcmodder-icon-rift" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.7 6.6v10.8l9.3 5.3 9.3-5.3V6.6L12 1.3zm0 0L12 12m9.3-5.4L12 12m0 10.7V12"></path></symbol><symbol id="mcmodder-icon-liteloader" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"></rect><path d="m3.924 21.537s3.561-1.111 8.076-6.365c2.544-2.959 2.311-1.986 4-4.172" fill="none" stroke="currentColor" stroke-width="2px"></path><path d="m7.778 19s1.208-0.48 4.222 0c2.283 0.364 6.037-4.602 6.825-6.702 1.939-5.165 0.894-10.431 0.894-10.431s-4.277 4.936-6.855 7.133c-5.105 4.352-6.509 11-6.509 11" fill="none" stroke="currentColor" stroke-width="2px"></path></symbol><symbol id="mcmodder-icon-default" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clip-rule="evenodd"></path></symbol>');
	$(".col-lg-12.common-rowlist-2 li, .mcmodder-class-info .col-lg-4")
		.each(function(i) {
			let e = $(this)
				.text();
			let o = e.split(e.includes("：") ? "：" : ": ");
			if (o[1] == parseInt(o[1])) o[1] = parseInt(o[1])
				.toLocaleString();
			if (o[0] === "支持平台") o[1] = o[1].replace(" (JAVA Edition)", "")
				.replace(" (Bedrock Edition)", "");
			else if (o[0] === "运作方式") {
				let t = o[1].split(", ");
				o[1] = "";
				t.forEach(e => {
					o[1] += `<a class="mcmodder-modloader" data-toggle="tooltip" data-original-title="${e}"><svg viewBox="0 0 24 24"><use xlink:href="#mcmodder-icon-${["forge","fabric","neoforge","rift","liteloader"].includes(e.toLowerCase())?e.toLowerCase():"default"}"></use></svg>`;
					if (t.length === 1) o[1] += `<span class="mcmodder-loadername" style="color: var(--mcmodder-platform-${t[0].toLowerCase()})">${t[0]}</span>`;
					o[1] += "</a>"
				})
			}
			if (o[0] === "运行环境") {
				let e = o[1].split(", ");
				e.forEach(e => {
					let t = e.slice(3, 5);
					if (t === "需装") t = `<span style="color: var(--mcmodder-td1)"><i class="fa fa-check" />${t}</span>`;
					else if (t === "无效") t = `<span style="color: gray"><i class="fa fa-ban" />${t}</span>`;
					else if (t === "可选") t = `<span style="color: var(--mcmodder-td2)"><i class="fa fa-circle-o" />${t}</span>`;
					$(`<li class="col-lg-6"><span class="title">${t}</span><span class="text">${e.slice(0,3)}</span></li>`)
						.insertAfter($(this)
							.parent()
							.children()[i - 1])
				});
				this.remove()
			} else $(this)
				.html(`<span class="title">${o[1]}</span><span class="text">${o[0]}</span>`);
			if (this.className === "col-lg-4") this.className = "col-lg-6"
		});
	$(".slider-block")
		.remove();
	$(".modlist-filter-block.auto button[type=submit]")
		.css({
			background: "transparent",
			color: "var(--mcmodder-txcolor)"
		});
	let i = parseInt($(".infolist.modpack")
		.text()
		.slice(2));
	let o = parseInt($(".infolist.server-count")
		.text()
		.slice(2));
	let a = parseFloat($(".infolist.server-pre")
		.text()
		.split("安装率为 ")[1]);
	let l = parseFloat($(".infolist.worldgen")
		.text()
		.split("有 ")[1]);
	let d = $(".download-btn")
		.attr("title")?.split("共 ")[1]?.split(" 次下载")[0];
	$(".infolist.modpack, .infolist.server-count, .infolist.server-pre, .infolist.worldgen")
		.remove();
	if (i) $(`<li class="col-lg-6"><span class="title">${i}</span><span class="text"><a target="_blank" href="/modpack.html?mod=${r}">整合包已收录</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (o) $(`<li class="col-lg-6"><span class="title">${o}</span><span class="text"><a target="_blank" href="https://play.mcmod.cn/list/?classid=${r}">服务器已安装</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (a) $(`<li class="col-lg-6"><span class="title">${a}%</span><span class="text">模组服安装率</span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (l) $(`<li class="col-lg-6"><span class="title">${l}</span><span class="text"><a target="_blank" href="https://www.mcmod.cn/worldgen.html?mod=${r}">资源分布数据</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (d) $(`<li class="col-lg-6"><span class="title">${d}</span><span class="text">本站下载量</span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	$(".class-item-type .mold:not(.mold-0)")
		.each((e, t) => {
			$('<span class="mcmodder-mold-num">')
				.text(parseInt($(t)
						.find(".count")
						.text()
						.slice(1))
					.toLocaleString())
				.css({
					color: $(t)
						.find(".title")
						.css("color")
				})
				.appendTo(t)
		});
	if (getConfig("moveAds")) $(".class-text .comment-ad")
		.insertAfter($(".class-text > *")
			.last());
	window.unfoldAdvanceClassData = function() {
		let a = $.ajax({
			url: `https://www.mcmod.cn/class/edit/${r}/`,
			async: true,
			type: "GET",
			complete: function() {
				let e = $("<html>")
					.html(a.responseText);
				if ($(".edit-unlogining", e)
					.length) {
					if ($(".edit-unlogining", e)
						.text()
						.includes("登录")) common_msg("错误", "请重新登录或关闭隐身模式后再操作~", "err");
					else common_msg("错误", "受本模组区域限制，无法直接获取高级信息...", "err");
					return
				}
				let t = e.find("#class-modid")
					.val();
				let i = e.find("#class-cfprojectid")
					.val();
				let o = e.find("#class-mrprojectid")
					.val();
				if (t) $(`<li class="col-lg-6"><span class="title">${t}</span><span class="text">MODID</span></li>`)
					.insertAfter($(".col-lg-6")
						.last());
				if (i) $(`<li class="col-lg-6"><span class="title">${i}</span><span class="text">CFID</span></li>`)
					.insertAfter($(".col-lg-6")
						.last());
				if (o) $(`<li class="col-lg-6"><span class="title">${o}</span><span class="text">MRID</span></li>`)
					.insertAfter($(".col-lg-6")
						.last());
				$(".mcmodder-class-info-fold")
					.remove()
			}
		})
	};
	if (currentUid && r) $(`<a class="btn mcmodder-class-info-fold btn-outline-secondary mcmodder-content-block"><i class="fas fa-chevron-down"></i>&nbsp;展开高级信息</a>`)
		.click(unfoldAdvanceClassData)
		.insertAfter($(".col-lg-6")
			.last());
	$(".class-text > span.figure")
		.addClass("mcmodder-golden-alert")
		.css("width", "100%")
}

function diffInit() {
	textCompare()
}

function classAddInit() {
	$('<button id="mcmodder-crash-protector" class="btn btn-sm btn-dark">一键刷新</button>')
		.appendTo($("div.text-danger")
			.first())
		.click(() => {
			$(this)
				.html("一键刷新 (处理中...)");
			let e = async function(e) {
				let t = await fetch("https://www.mcmod.cn/class/add/", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
					},
					body: ""
				});
				let i = $("<html>")
					.html(await t.text());
				$("div.common-rowlist-block:nth-child(2) > div:nth-child(2)")
					.html($("div.common-rowlist-block:nth-child(2) > div:nth-child(2)", i)
						.html());
				$(this)
					.html("一键刷新")
			};
			e()
		});
	addStyle(".radio {width: 10000px;} .mcmodder-tip {margin-left: 10px; font-size: 12px !important; color: gray;}");
	$("#edit-page-2, #edit-page-3")
		.attr("class", "tab-pane active");
	$("div.swiper-container")
		.remove();
	editorLoad();
	if (!getConfig("classAddHelper")) return;
	let t = $("p.title");
	for (let e in t.toArray()) {
		t.eq(e)
			.attr("id", "mcmodder-title-" + e);
		sidebarLi = $('<li style="height: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">')
			.appendTo(sidebarUl);
		switch (parseInt(e)) {
			case 18:
				sidebarLi.append('<i class="mcmodder-slim-light fa fa-check" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-18">CFID:</a>');
				break;
			case 19:
				sidebarLi.append('<i class="mcmodder-slim-light fa fa-check" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-19">MRID:</a>');
				break;
			default:
				sidebarLi.append('<i class="mcmodder-slim-danger fa fa-close" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-' + e + '">' + t.eq(e)
					.html() + "</a>")
		}
		switch (parseInt(e)) {
			case 12:
				sidebarLi.append('<ul style="margin-left: 30px;"><li>客户端: <span class="mcmodder-content-1" style="color: gray"></span></li><li>服务端: <span class="mcmodder-content-2" style="color: gray"></span></li></ul>');
				sidebarLi.css({
					height: null
				});
				break;
			case 4:
				sidebarLi.append('<ul style="margin-left: 30px;"><li>核心: <span class="mcmodder-content-1" style="color: gray"></span></li><li>其他: <span class="mcmodder-content-2" style="color: gray"></span></li></ul>');
				sidebarLi.css({
					height: null
				});
				break;
			case 7:
				let e = sidebarLi.html() + '<ul style="margin-left: 30px;">';
				$("div.checkbox", $("p#mcmodder-title-6")
						.parent())
					.each(function() {
						e += '<li api="' + $("input[data-multi-name=class-data]", this)
							.attr("value") + '" style="">' + $("label", this)
							.text() + ': <span class="mcmodder-content-' + $("input[data-multi-name=class-data]", this)
							.attr("value") + '" style="color: gray"></span></li>'
					});
				e += "</ul>";
				sidebarLi.html(e);
				sidebarLi.css({
					height: null
				});
				break;
			default:
				sidebarLi.append('<span class="mcmodder-content" style="color: gray"></span>')
		}
		sidebarLi.find("a")
			.click(function() {
				$(document.getElementById(this.href.split("#")[1]))
					.addClass("mcmodder-mark-gold");
				setTimeout(() => {
					scrollBy(0, window.innerHeight / -2.5)
				}, 20);
				setTimeout(() => {
					document.getElementById(this.href.split("#")[1])
						.style.removeProperty("background-color")
				}, 1e3)
			})
	}
	$("li", $("div.common-class-category")
			.get(0))
		.each(function() {
			this.style.width = "10000px";
			$('<span style="color: gray; font-size: 12px;"></span>')
				.appendTo(this)
				.html($("a", this)
					.attr("data-original-title"));
			$("a", this)
				.click(function() {
					setTimeout(() => {
						const e = ["", "科技", "魔法", "冒险", "农业", "装饰", "", "LIB", "", "", "", "", "", "", "", "", "", "", "", "", "", "魔改", "", "实用", "辅助"];
						let t = $("ul#mcmodder-sidebar")
							.children()
							.eq(4);
						t.find("span.mcmodder-content-2")
							.html("");
						t.find("span.mcmodder-content-1")
							.html($("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")
									.get(0))
								.length > 0 ? e[parseInt($("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")
										.get(0))
									.attr("data-category-id"))] : "");
						$("a.normal.gray[data-category-selected=true]", $("div.common-class-category")
								.get(0))
							.each(function() {
								t.find("span.mcmodder-content-2")
									.append($(this)
										.text() + ", ")
							});
						t.find("i")
							.attr("class", $("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")
									.get(0))
								.length < 1 || $("a.normal.gray[data-category-selected=true]", $("div.common-class-category")
									.get(0))
								.length < 1 ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check");
						$(".tooltip.bs-tooltip-top.show")
							.remove()
					}, 100)
				})
		});
	$("input[type=text]")
		.each(function() {
			this.addEventListener("focusout", function() {
				if (this.parentNode.parentNode.childNodes[0].className === "title") {
					let e = $("ul#mcmodder-sidebar")
						.eq(parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", "")));
					e.find("i")
						.attr("class", this.value === "" ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check");
					e.find("span.mcmodder-content")
						.html(this.value)
				} else if (this.parentNode.className === "bootstrap-tagsinput") {
					let e = $("ul#mcmodder-sidebar")
						.children()
						.eq(parseInt(this.parentNode.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", "")));
					e.find("span.mcmodder-content")
						.html("");
					e.find("i")
						.attr("class", $("span.tag.label.label-info", this.parentNode)
							.length < 1 ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check");
					$("span.tag.label.label-info", this.parentNode)
						.each(function() {
							$("span.mcmodder-content", e)
								.append($(this)
									.text() + ", ")
						})
				}
			})
		});
	$("input[type=radio]")
		.click(function() {
			let e = $("ul#mcmodder-sidebar")
				.eq(parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", "")));
			if (this.parentNode.parentNode.childNodes[0].id != "mcmodder-title-12") {
				e.find("span.mcmodder-content")
					.html($("label", this.parentNode)
						.text());
				e.find("i")
					.attr("class", this.id.split("-")[this.id.split("-")
						.length - 1] === "0" ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check")
			} else {
				e.find("span.mcmodder-content-" + (this.id.includes("class-data-mode-1") ? "1" : "2"))
					.html($("label", this.parentNode)
						.text());
				e.find("i")
					.attr("class", $("input#class-data-mode-1-0")
						.get(0)
						.checked || $("input#class-data-mode-2-0")
						.get(0)
						.checked ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check")
			}
		});
	$("input[type=checkbox]")
		.bind("change", function() {
			let e = $("ul#mcmodder-sidebar")
				.eq(parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", "")));
			e.find("span.mcmodder-content")
				.html("");
			e.find("i")
				.attr("class", "mcmodder-common-danger fa fa-close");
			$("input[type=checkbox]", this.parentNode.parentNode)
				.each(function() {
					if (this.checked) {
						e.find("span.mcmodder-content")
							.append($("label", this.parentNode)
								.text()
								.split(" (")[0] + ", ");
						e.find("i")
							.attr("class", "mcmodder-common-light fa fa-check")
					}
				})
		});
	$("p#mcmodder-title-8.title")
		.parent()
		.find("input, label")
		.click(function() {
			setTimeout(() => {
				let e = $("ul#mcmodder-sidebar")
					.children()
					.eq(8);
				$("i", e)
					.get(0)
					.className = $("img#class-cover-preview-img")
					.attr("src")
					.indexOf("base64") < 0 || $("input#class-data-cover-delete")
					.checked ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check"
			}, 200)
		});
	$("p#mcmodder-title-7.title")
		.parent()
		.find("input")
		.eq(0)
		.bind("change", function() {
			let e = $("ul#mcmodder-sidebar")
				.children()
				.eq(7);
			$("span.mcmodder-content", e)
				.html("")
		});
	let e = function(e, t) {
		for (i in $(`p#mcmodder-title-${e}.title`)
			.parent()
			.find("div.radio")
			.toArray()) $(`p#mcmodder-title-${e}.title`)
			.parent()
			.find("div.radio")
			.eq(i)
			.attr("class", "mcmodder-tip")
			.html(t[i])
			.append("<span />");
		$(`p#mcmodder-title-${e}.title`)
			.parent()
			.find("p.tips")
			.remove()
	};
	e(12, ["", "需要正确安装在客户端上才能运行模组。", "不安装也可以运行模组，但安装后提供额外的功能。", "安装后不会有任何效果，或是导致游戏无法正常启动。", "", "需要正确安装在服务端上才能运行模组。", "不安装也可以运行模组，但安装后提供额外的功能。", "安装后不会有任何效果，或是导致游戏无法正常启动。"]);
	e(16, ["", "状态正常，保持更新。", "开发成员超过 6 个月但不满 1 年没有发布更新文件，或是仅发布了相关更新计划。", "开发成员超过 1 年没有发布更新文件，或明确表示弃坑。"]);
	e(17, ["作者未明确表态。同样适用于源码已被公开，但指定的协议并不属于开源许可协议的情况~", "源码已被公开，且已指定开源许可协议。常见的开源许可协议包括 GPL, LGPL, MIT, BSD, MPL, Apache License 等。许可协议通常需以源码所在地为准~", "作者已声明不会公开模组源码。"])
}

function adminInit() {
	const e = new MutationObserver(function(t, e) {
		for (let e of t) {
			let e = $("#connect-frame > div.page-header > h1.title")
				.get(0);
			if ($(e)
				.text() === "模组区内容审核") {
				let e = $(".container-widget")
					.get(0);
				e.insertBefore(e.childNodes[2], e.childNodes[1]);
				let t = function() {
					let e = getConfig("autoVerifyDelay");
					if (e && e > .01) setConfig(`nextAutoVerifyTime-${currentUid}`, Date.now() + e * 60 * 60 * 1e3, "scheduledEvent");
					$("#mcmodder-check-verification")
						.text("一键查询待审项 (加载中...)");
					let t = $("#class-version-list > option");
					let a = t.toArray()
						.map(e => $(e)
							.attr("value"));
					let r = 1,
						n = 0;
					let l = async function(e) {
						let t = await fetch("https://admin.mcmod.cn/frame/pageVerifyMod-list/", {
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
							},
							body: "data=" + JSON.stringify({
								classID: e
							})
						});
						let i = await t.text();
						let o = parseInt(toChinese(i)
							.split("总待审：")[1].split("个。")[0]);
						if (o > 0 && n === 0) $("button.btn:nth-child(2)")
							.first()
							.click();
						n += o;
						if (o > 0) {
							let e = $("ul.dropdown-menu:nth-child(1)")
								.children()
								.get(r);
							$(e)
								.addClass("mcmodder-mark-gold");
							if ($("span.text-danger", e.childNodes[0])
								.length > 0) $("span.text-danger", e.childNodes[0])
								.remove();
							e.childNodes[0].innerHTML += `<span class="text-danger">${o}个待审！</span>`
						}
						if (a.length > r + 1) {
							setTimeout(() => {
								l(a[++r])
							}, 300);
							return
						} else $("#mcmodder-check-verification")
							.text(`一键查询待审项 (${n}个)`)
					};
					if (a) l(a[1])
				};
				$('<button class="btn" id="mcmodder-check-verification" data-toggle="tooltip" data-original-title="快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。">一键查询待审项</button>')
					.insertAfter(".selectJump.bs3")
					.click(t);
				if (getConfig("autoVerifyDelay") >= .01) $(`<span style="margin-left: 10px;">距离自动查询: <span class="mcmodder-timer" data-source="nextAutoVerifyTime-${currentUid}"></span></span>`)
					.insertAfter("#mcmodder-check-verification");
				window.lastRefundText = {};
				const i = new MutationObserver(function(t, e) {
					for (let e of t) {
						if (e.target.id === "verify-window-frame" && $(e.addedNodes)
							.filter((e, t) => t.className?.includes("verify-info-table"))
							.length) {
							$(".verify-copy-btn")
								.parent()
								.filter((e, t) => $(t)
									.css("position") === "absolute")
								.remove();
							textCompare();
							let e = JSON.parse($("#verify-pass-btn")
									.attr("data-data"))
								.verifyID;
							$("#verify-reason")
								.val(lastRefundText[e] || "")
								.bind("focusout", function() {
									lastRefundText[e] = $(this)
										.val()
								})
						}
					}
				});
				i.observe($("#connect-frame-sub")
					.get(0), {
						childList: true,
						subtree: true
					})
			}
			if ($(e)
				.text() === "MC百科后台管理中心") {
				let i;
				$("td:first-child()")
					.each((e, t) => {
						i = t.innerText;
						t.innerHTML = `<a href="https://www.mcmod.cn/center/${i}" target="_blank">${i}</a>`
					})
			}
			if ($(e)
				.text() === "样式管理") {
				const o = new MutationObserver(function(e, t) {
					for (let i of e) {
						if (!(i.addedNodes.length > 7 || i.removedNodes.length > 7) || $(".item-list-table")
							.length) return;
						let e = $('<table class="table table-bordered item-list-table item-list-table-1"><thead><tr><th colspan="3"><span class="title"><a target="_blank" href="//www.mcmod.cn/class/8.html">[M3]更多喵呜机 (More Meowing Machinery)</a> 的 物品/方块 资料 (预览)</span></th></tr></thead><tbody><tr><th class="item-list-type-left" style="padding: 0px">一级分类</th><th class="item-list-type-left" style="padding: 0px">二级分类</th><td class="item-list-type-right" style="padding: 0px"><ul><li><span><a href="/item/5281.html" target="_blank"><img class="icon" alt="锡矿石" src="//i.mcmod.cn/item/icon/32x32/0/5281.png?v=3" width="15" height="15"></a><a href="/item/5281.html" target="_blank" >锡矿石</a></span></li><li><span><a href="//www.mcmod.cn/item/40226.html" target="_blank"><img class="icon" alt="锇矿石" src="//i.mcmod.cn/item/icon/32x32/4/40226.png?v=5" width="15" height="15"></a><a href="//www.mcmod.cn/item/40226.html" target="_blank" >锇矿石</a></span></li><li><span><a href="/item/40227.html" target="_blank"><img class="icon" alt="铜矿石" src="//i.mcmod.cn/item/icon/32x32/4/40227.png?v=3" width="15" height="15"></a><a href="//www.mcmod.cn/item/40227.html" target="_blank" >铜矿石</a></span></li><li><span><a href="/item/40337.html" target="_blank"><img class="icon alt="盐块" src="//i.mcmod.cn/item/icon/32x32/4/40337.png?v=2" width="15" height="15"></a><a href="//www.mcmod.cn/item/40337.html" target="_blank" >盐块</a></span></li></ul></td></tr></tbody></table>')
							.appendTo(i.target);
						i.target.insertBefore(e, $(".table-condensed")[1]);
						addStyle("", "mcmodder-style-preview");
						let t = $("#connect-frame-sub script")
							.html() + "//end";
						$("#itemlist-head-th")
							.val(t.split('$("#itemlist-head-th").val("')[1].split('");$("#itemlist-body-th").val("')[0].replaceAll("\\n", "\n"));
						$("#itemlist-body-th")
							.val(t.split('");$("#itemlist-body-th").val("')[1].split('");$("#itemlist-body-td").val("')[0].replaceAll("\\n", "\n"));
						$("#itemlist-body-td")
							.val(t.split('");$("#itemlist-body-td").val("')[1].split('");//end')[0].replaceAll("\\n", "\n"));
						$("#connect-frame-sub textarea")
							.addClass("mcmodder-monospace");
						$("textarea.style-box")
							.each(function() {
								$(this)
									.bind("change", function() {
										let e = e => $(e)
											.val()
											.replace(/<!--[\s\S]*?-->/g, "");
										let t = e("#itemlist-head-th"),
											i = e("#itemlist-body-th"),
											o = e("#itemlist-body-td");
										$("#mcmodder-style-preview")
											.html("table.item-list-table.item-list-table-1 {table-layout: auto}.item-list-table.item-list-table-1 thead th {" + t + "}.item-list-table.item-list-table-1 thead th * {color:inherit}.item-list-table.item-list-table-1 thead th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody th {" + i + "}.item-list-table.item-list-table-1 tbody th * {color:inherit}.item-list-table.item-list-table-1 tbody th a:hover {color:inherit; opacity:.75}.item-list-table.item-list-table-1 tbody td {" + o + "}.item-list-table.item-list-table-1 tbody td * {color:inherit}.item-list-table.item-list-table-1 tbody td th {" + i + "}.item-list-table.item-list-table-1 tbody td a:hover {color:inherit; opacity:.75}.item-list-table th,.item-list-table td {border-color:#DADADA}.item-list-table {position:relative; margin-bottom:10px}.item-list-table .title {width:100%; margin:0; line-height:30px; font-size:14px; font-weight:bold; text-align:center; display:block}.item-list-table th {background-color:#f9f9f9; font-size:14px; color:#222}.item-list-table .item-list-type-left {width:100px; text-align:center; vertical-align:middle; font-size:12px}.item-list-table .item-list-type-right ul {width:100%; display:block}.item-list-table .item-list-type-right li {display:inline-block; margin-right:10px; font-size:14px}.item-list-table .item-list-type-right li img {margin-right:5px}.item-list-table .item-list-type-right li .null {color:#F30}.item-list-table .item-list-type-right li .null:hover {color:#222}.item-list-table .empty td {line-height:120px; font-size:14px; text-align:center; color:#777}.item-list-table .item-list-type-right li .more {color:#777}.item-list-table .item-list-type-right li .more:hover {color:#222}.item-list-table .item-list-type-right li .more i {margin-right:5px}.item-list-table .title a {text-decoration:underline; text-transform: none;}.item-list-table td {padding:0}.item-list-type-right ul {padding:.75rem}.item-list-table table {width:100%}.item-list-table table td {border-bottom:0; border-right:0}.item-list-table table th {border-bottom:0; border-left:0}.item-list-table:last-child {margin-bottom:0}.item-list-type-right .loading {position:absolute}.item-list-style-setting {text-align:right; font-size:12px; line-height:30px; position:absolute; bottom:-5px; right:5px}.item-list-style-setting i {margin-right:5px}.item-list-style-setting a {color:#99a2aa}.item-list-style-setting a:hover {color:#222}.item-list-branch-frame {width:100%; margin-bottom:10px}.item-list-branch-frame li {display:inline-block; margin-right:5px}.item-list-switch,.item-list-switch-fold {position:absolute; right:10px; top:8px}.item-list-switch-fold {right:auto; left:10px}.item-list-switch li,.item-list-switch-fold {display:inline-block; margin-left:10px; color:#99a2aa}.item-list-pages {padding:0; margin:0}.item-list-pages ul {margin-bottom:10px}@media(max-width:990px) {.item-list-style-setting { position:inherit;  bottom:0 }}@media(max-width:980px) {.item-list-switch { top:-10px }}@media(max-width:720px) {.item-list-switch-fold { top:25px }}@media(max-width:460px) {.item-list-table .item-list-type-left { width:80px;  padding:5px }}@media(max-width:360px) {.item-list-table .item-list-type-left { width:50px;  padding:5px }}@media(max-width:260px) {.item-list-table .item-list-type-left { width:0;  padding:5px }}")
									})
							});
						$("textarea.style-box")
							.trigger("change")
					}
				});
				o.observe($("div#connect-frame-sub")
					.get(0), {
						childList: true
					})
			}
		}
	});
	e.observe($(".connect-area")
		.get(0), {
			childList: true
		})
}

function rankInit() {
	addStyle(".rank-list-block li {width: auto; display: block; margin: 6px} .progress-bar {background-color: gold; color: black} .progress {border-radius: .0rem}");

	function e(e) {
		if ($(e)
			.find(".empty")
			.length) return {
			value: 0,
			rate: 100
		};
		let d = Array.from($("ul > li", e));
		let t = e.appendChild(document.createElement("div"));
		let i = e.appendChild(document.createElement("div"));
		let o = e.appendChild(document.createElement("div"));
		t.style.width = i.style.width = o.style.width = "33.333%";
		t.style.display = i.style.display = o.style.display = "inline-block";
		let s = t.appendChild(document.createElement("ul"));
		let c = i.appendChild(document.createElement("ul"));
		let m = o.appendChild(document.createElement("ul"));
		let p = parseFloat($("span.score", d[0])
			.text());
		let h = d.length;
		let u = 0,
			f = 0,
			a = 0,
			g = 0;
		for (let l in d) {
			let e = null,
				t = null;
			if (l < h / 3) e = s.appendChild(document.createElement("li"));
			else if (l < h * 2 / 3) e = c.appendChild(document.createElement("li"));
			else e = m.appendChild(document.createElement("li"));
			let i = e.appendChild(document.createElement("div"));
			let o = $(d[l])
				.attr("data-content");
			if (o.includes("字节")) o = o.replace("字节", " B")
				.replace("(约", '<span style="color: gray; display: inline">(~')
				.replace("个汉字)", "汉字)</span>");
			else o = o.replace("次", " 次");
			let a = $("a", d[l])
				.get(0)
				.href;
			let r = parseFloat($("span.score", d[l])
				.text());
			if (isNaN(r)) r = 0;
			f += r;
			let n = $("a.name", d[l])
				.text();
			i.style.display = "inline-block";
			i = i.appendChild(document.createElement("i"));
			i.style.float = "left";
			i.style.backgroundImage = 'url("' + $("img", d[l])
				.attr("src")
				.replace() + '")';
			i.style.backgroundSize = "cover";
			i.style.width = i.style.height = "40px";
			i = e.appendChild(document.createElement("div"));
			i.style.display = "inline-block";
			i.style.width = "calc(100% - 40px)";
			if (l > 0 && $(d[l])
				.attr("data-content") != $(d[l - 1])
				.attr("data-content")) g = l;
			switch (parseInt(g)) {
				case 0:
					t = '<i class="fa fa-trophy" style="margin-right: 4px; color:goldenrod"></i>';
					break;
				case 1:
					t = '<i class="fa fa-trophy" style="margin-right: 4px; color:silver"></i>';
					break;
				case 2:
					t = '<i class="fa fa-trophy" style="margin-right: 4px; color:brown"></i>';
					break;
				default:
					t = '<span style="margin-right: 4px; display: inline; font-size: 13px" class="mcmodder-common-light">#' + (parseInt(g) + 1) + "</span>"
			}
			i.innerHTML = `<p style="font-size: 14px; height: 20px; overflow: hidden;">${t}<a style="text-align: left; font-weight: bold; display: inline; font-size: 14px;" href="${a}" target="_blank">${n+(n===currentUsername?" (我)":"")}</a> (${r}%) </p><div class="progress" style="width: 100%;height: 20px;position:relative"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${r/p*100}%;"><span style="text-align: center; display: inline; position: absolute">${o}</span></div>`;
			if (n === currentUsername) $("a", i)
				.get(0)
				.style.color = "red";
			u += parseInt(o.split(" B")[0].replace(",", ""))
		}
		$("ul", e)
			.first()
			.remove();
		return {
			value: u,
			rate: f
		}
	}
	let t = e($(".rank-list-block")
			.get(0)),
		i = e($(".rank-list-block")
			.get(1));
	if (t.value || i.value) $("<span>")
		.appendTo(".rank-list-frame")
		.attr("class", "mcmodder-golden-alert")
		.html(`全体百科用户在 ${$(".rank-search-area .badge-secondary").first().text()} 累计贡献了` + (i.value ? `约 <span class="mcmodder-common-light">${parseInt(i.value*100/i.rate).toLocaleString()}</span> 次` : "") + (t.value ? `共约 <span class="mcmodder-common-light">${parseInt(t.value*100/t.rate).toLocaleString()}</span> 字节` : "") + "的编辑量！");
	$(".popover")
		.remove();
	setTimeout(commentInit, 1e3);
	let o = new URLSearchParams(window.location.search);
	let a = getStartTime(new Date(parseInt(o.get("starttime")) * 1e3), 0) / 1e3;
	let r = getStartTime(new Date(parseInt(o.get("endtime")) * 1e3), 0) / 1e3;
	if (!(a && r)) return;
	let n = async function(o) {
		o = Math.max(o, 1496332800);
		if (!getConfig(o, "rankData")) {
			let e = [];
			let t = await fetch(`https://www.mcmod.cn/rank.html?starttime=${o}&endtime=${o}`, {
				method: "GET",
				headers: {
					"Content-Type": "text/html; charset=UTF-8"
				}
			});
			let i = $("<html>")
				.html(await t.text()
					.replaceAll("src=", "data-src="));
			i.find(".rank-list-block:nth-child(1) li")
				.each(function() {
					e.push({
						value: $(this)
							.attr("data-content")
							.split("字节")[0].replaceAll(",", ""),
						user: $("a", this)
							.attr("href")
							.split("center.mcmod.cn/")[1].split("/")[0]
					})
				});
			setConfig(o, JSON.stringify(e), "rankData");
			common_msg("提示", `成功保存 ${new Date(o*1e3).toString()} 的贡献数据~`, "ok")
		}
		o += 24 * 60 * 60;
		if (o <= r) setTimeout(n(o), 1e3)
	};
	n(a)
}

function verifyInit() {
	if ($("p.empty")
		.length) return;
	let e = $(".verify-list-frame .list-row-limit p")
		.first(),
		t = e.text()
		.match(/\d+/g)
		.map(Number)
		.map(e => e.toLocaleString());
	e.html(`<ul class="verify-rowlist"><li><span class="title">${t[1]}</span><span class="text"><i data-toggle="tooltip" data-original-title="日常审核时间段为 19:00 ~ 次日 07:00" class="fa fa-question-circle"></i> 48 小时内已处理</span></li><li><span class="title">${t[2]}</span><span class="text">今日已处理</span></li><li><span class="title">${t[3]}</span><span class="text">今日新提交</span></li><li><span class="title">${t[4]}</span><span class="text">剩余待审</span></li></ul>`);
	addStyle(".table-bordered thead td, .table-bordered thead th {text-align: center; min-width: 3em;} .btn-group-sm > .btn, .btn-sm {padding: .0rem .5rem} .table > tbody > tr > td:nth-child(4) > p {display: inline;} td {text-overflow: ellipsis; overflow: hidden; white-space: nowrap;} .verify-list-list td:nth-child(4) i {width: unset; margin: unset;}");
	let i = $(".table"),
		a = Object.entries(PublicLangData.verify_list.state.list);
	const r = ["", "fa fa-spinner", "fa fa-check", "fa fa-close", "fa fa-mail-reply"];
	i.find("thead th")
		.last()
		.html("状态")
		.after("<th>审核人</th><th>最后审核</th><th>操作</th><th>附言</span></th>");
	i.find("thead > tr:nth-child(1) > th:nth-child(3)")
		.append("&nbsp;");
	let o = i.find("tbody > tr > td:nth-child(4)");
	let n;
	o.each((e, t) => {
		t = $(t);
		n = ["", "", "", "", ""];
		let i = t.find("p:first-child()"),
			o = i.text();
		a.forEach(e => {
			if (o === e[1]) i.html(`<i data-toggle="tooltip" data-original-title="${o}" class="${r[e[0]]}"></i>`)
		});
		n[0] = i.get(0)
			.outerHTML;
		t.find("p:not(p:first-child())")
			.each(function() {
				let e = this.innerHTML,
					t = this.textContent.split(": "),
					i = this.outerHTML.replaceAll(t[0] + ": ", "");
				if (t[0] === PublicLangData.verify_list.verifynum) n[0] += `&nbsp;<p data-toggle="tooltip" data-original-title="${t[0]}: ${t[1]}">(${parseInt(t[1])})</p>`;
				else if (t[0] === PublicLangData.verify_list.verifyuser) n[1] = i;
				else if (t[0] === PublicLangData.verify_list.time.verifytime) n[2] = i;
				else if (t[0] === PublicLangData.verify_list.reason) n[4] = i
			});
		n[3] = t.contents()
			.filter("*:not(p)")
			.prop("outerHTML");
		t.after(n.reduce((e, t) => `${e}<td>${t?t:""}</td>`, ""))
			.remove()
	});
	if (i.find("thead th")
		.eq(2)
		.text()
		.includes("最后审核时间")) {
		i.find("thead th:nth-child(6), tbody td:nth-child(6)")
			.remove();
		i.find("thead th")
			.eq(2)
			.text("最后审核")
	}
	$(".table i.fa-lightbulb-o")
		.parent()
		.each((e, t) => {
			let i = $(t)
				.text(),
				o = "";
			for (let e = 0; e < i.length; e++) o += i[e].charCodeAt() <= 255 ? i[e] : " ";
			let a = o.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
			a.forEach(e => {
				t.innerHTML = i.replace(e, '<a href="' + e + '" target="_blank">' + e + "</a>")
			})
		});
	const l = [{
		reg: /^添加模组/,
		label: "添加模组",
		exclude: "中的"
	}, {
		reg: /^添加整合包/,
		label: "添加整合包",
		exclude: "中的"
	}, {
		reg: /^添加.+教程/,
		label: "添加教程"
	}, {
		reg: /^编辑模组/,
		label: "编辑模组",
		exclude: "中的"
	}, {
		reg: /^编辑整合包/,
		label: "编辑整合包",
		exclude: "中的"
	}, {
		reg: /^编辑.+个人作者\/开发团队。/,
		label: "编辑作者"
	}, {
		reg: /^编辑.+教程。/,
		label: "编辑教程"
	}, {
		reg: /^在.+中添加.+/,
		label: "添加资料",
		exclude: "更新日志。",
		exclude2: "合成表"
	}, {
		reg: /^在.+中添加.+更新日志。/,
		label: "添加日志"
	}, {
		reg: /^编辑.+中的.+/,
		label: "编辑资料",
		exclude: "更新日志。",
		exclude2: "合成表"
	}, {
		reg: /^编辑.+中的.+更新日志。/,
		label: "编辑日志"
	}, {
		reg: /^在资料.+中添加一张合成表。/,
		label: "添加合成表"
	}, {
		reg: /^编辑资料.+中的一张合成表。/,
		label: "编辑合成表"
	}, {
		reg: /^删除资料.+中的一张合成表。/,
		label: "删除合成表"
	}];
	let d = new Array(l.length)
		.fill(null)
		.map(() => [0, 0, 0, 0, 0]);
	$(".verify-list-list-table tbody tr")
		.each(function() {
			let t = $("td:nth-child(2)", this)
				.text();
			l.forEach((e, o) => {
				if (e.reg.test(t) && (!e.exclude || !t.includes(e.exclude)) && (!e.exclude2 || !t.includes(e.exclude2))) {
					$(this)
						.attr("edit-type", o.toString());
					d[o][0]++;
					let i = $("td:nth-child(4) p:first-child() i", this)
						.attr("class");
					r.forEach((e, t) => {
						if (i.includes(e)) d[o][t]++
					})
				}
			})
		});
	$("[edit-type=3],[edit-type=9]")
		.each(function() {
			let e = $("td:nth-child(4)", this),
				i = "item";
			if (!e.text()
				.includes(PublicLangData.verify_list.state.list[1])) return;
			switch (parseInt($(this)
				.attr("edit-type"))) {
				case 3:
					i = "class";
					break;
				case 9:
					i = "item"
			}
			let t = $("td:nth-child(2) a", this)
				.filter((e, t) => {
					return t.href.includes("/" + i + "/")
				});
			if (t.length) $("td", this)
				.last()
				.prev()
				.append(` <a href="/${i}/edit/${t.attr("href").split("/"+i+"/")[1].split(".html")[0]}/" target="_blank">查看改动</a>`)
		});
	let s = parseInt((new Date)
		.getTime() / 1e3);
	let c = window.location.href.split("verify.html?")[1]?.split("&page=")[0];
	const m = 24 * 60 * 60;
	$(".verify-list-search-area")
		.append(`<a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${c}&starttime=${s-30*m}&endtime=${s}" style="margin-left: 8px;">近30天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${c}&starttime=${s-7*m}&endtime=${s}" style="margin-left: 8px;">近7天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${c}&starttime=${s-3*m}&endtime=${s}" style="margin-left: 8px;">近3天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${c}&starttime=${s-1*m}&endtime=${s}" style="margin-left: 8px;">近24小时</a>`);
	let p = $('<div class="verify-list-search-area">');
	l.forEach((e, t) => {
		if (!d[t][0]) return;
		let i = $('<div class="checkbox" style="display: inline-block;">');
		let o = `<input type="checkbox" id="mcmodder-type-${t}"><label for="mcmodder-type-${t}">${e.label} <span>(`;
		if (d[t][1]) o += `<span class="text-muted">${d[t][1]}</span>`;
		if (d[t][2]) o += `<span class="text-success">${d[t][2]}</span>`;
		if (d[t][3]) o += `<span class="text-danger">${d[t][3]}</span>`;
		if (d[t][4]) o += `<span style="color: lightgray;">${d[t][4]}</span>`;
		o += `)</span></label>`;
		i.html(o);
		i.find("span:not(span:last-child())")
			.each(function() {
				this.outerHTML += "/"
			});
		i.find("input")
			.bind("change", function() {
				let i = [],
					e = $("#mcmodder-verify-search")
					.val()
					.trim()
					.toLowerCase();
				$("div.checkbox input", $(this)
						.parent()
						.parent()
						.parent())
					.filter((e, t) => t.checked)
					.each((e, t) => i.push(this.id.split("-")[2]));
				$(".verify-list-list-table tbody tr")
					.each(function() {
						if ((!i.length || i.includes($(this)
								.attr("edit-type"))) && $("td:nth-child(2)", this)
							.text()
							.toLowerCase()
							.includes(e || "")) $(this)
							.removeAttr("style");
						else this.style.display = "none"
					})
			});
		i.appendTo(p)
	});
	p.appendTo(".verify-list-list-head fieldset");
	p = $('<div class="verify-list-search-area">');
	$('<input id="mcmodder-verify-search" class="form-control" placeholder="搜索...">')
		.bind("change", function() {
			let e = [],
				t = $("#mcmodder-verify-search")
				.val()
				.trim()
				.toLowerCase();
			$("div.checkbox input", $(this)
					.parent()
					.parent()
					.parent())
				.each(function() {
					if (this.checked) e.push(this.id.split("-")[2])
				});
			$(".verify-list-list-table tbody tr")
				.each(function() {
					if ((!e.length || e.includes($(this)
							.attr("edit-type"))) && $("td:nth-child(2)", this)
						.text()
						.toLowerCase()
						.includes(t || "")) $(this)
						.removeAttr("style");
					else this.style.display = "none"
				})
		})
		.appendTo(p);
	p.appendTo(".verify-list-list-head fieldset");
	if (getConfig("fastUrge")) {
		$('<button id="mcmodder-fast-urge" class="btn btn-sm" data-toggle="tooltip" data-html="true" data-original-title="一键对当前列表中可催审的审核项催审！审核项提交 24 小时后可催审，首次催审后每隔 1 小时可再次催审。<br>催审并不会对管理员发送强提醒，但能够使审核项在后台的待审列表中排在更靠前的位置。">一键催审</button>')
			.insertBefore(".verify-list-list")
			.click(function() {
				$(this)
					.html("一键催审 (处理中...)");
				let a = $(".verify-urge-btn")
					.toArray();
				let r = a.map(e => $(e)
					.attr("data-id"));
				let n = 0,
					l = 0;
				let d = async function(e) {
					let t = await fetch("https://www.mcmod.cn/action/edit/doUrge/", {
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
						},
						body: "nVerifyID=" + e
					});
					let i = await t.text();
					let o = JSON.parse(i)
						.state;
					if (o === 0) {
						n++;
						$(a[l])
							.html("催审成功")
							.attr("class", "ml-1 text-muted")
					}
					if (r.length > l + 1) {
						setTimeout(() => {
							d(r[++l])
						}, 300);
						return
					} else $(this)
						.html(`一键催审 (${n}项已处理)`)
				};
				if (r[0]) d(r[0]);
				else $(this)
					.html("一键催审 (无可催审项)")
			})
	}
	window.dispatchEvent(new Event("resize"));
	updateItemTooltip()
}

function queueInit() {
	let e = $(".verify-queue-list-table tr")
		.filter((e, t) => $("a[rel=nofollow]", t)
			.text() === currentUsername)[0];
	e.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});
	$(e)
		.addClass("mcmodder-mark-gold");
	setTimeout(() => {
		$(e)
			.removeClass("mcmodder-mark-gold")
	}, 1e3)
}

function centerInit() {
	let d = window.location.href.split("center.mcmod.cn/")[1].split("/")[0],
		s, c, m, e;
	$(".common-center, .common-frame")
		.addClass("mcmodder-disable-modern");
	window.updateSettings = function() {
		$("div.center-block[data-menu-frame=9] input")
			.each(function() {
				if (this.type === "checkbox") setConfig($(this)
					.parent()
					.attr("data-todo"), this.checked ? "true" : "false");
				else if (this.type === "text" || this.type === "color") setConfig($(this)
					.attr("data-todo"), this.value)
			});
		common_msg("提示", PublicLangData.center.setting.complete, "ok")
	};
	const t = new MutationObserver(function(t, i) {
		for (let e of t) {
			if (e.addedNodes.length > 1) {
				$(document)
					.off("change", ".center-setting-block .checkbox")
					.off("change", ".center-setting-block .form-control")
					.on("change", ".center-block[data-menu-frame!=9] .center-setting-block .checkbox", function() {
						var e = $(this)
							.children("input");
						setSetting(e.attr("data-todo"), e.is(":checked") ? 1 : 0)
					})
					.on("change", ".center-block[data-menu-frame!=9] .center-setting-block .form-control", function() {
						setSetting($(this)
							.attr("data-todo"), $(this)
							.val()
							.trim())
					});
				$("#setting-link-style-preview")
					.attr("data-content", '<img alt="link style" src="//i.mcmod.cn/editor/upload/20210506/1620236406_2_BaUm.png" width="220" ></a>');
				let e = $("div.center-main.setting.menuarea")
					.get(0);
				$("<li>")
					.html('<a data-menu-select="9" href="javascript:void(0);">插件设置</a>')
					.appendTo("#center-setting-frame > div.center-sub-menu > ul")
					.bind("change", function() {
						var e = $(this)
							.attr("data-menu-select");
						if (e) {
							var t = $(this)
								.parent()
								.parent()
								.parent(),
								i = t.parent()
								.children(".center-main");
							t.children("ul")
								.find("a")
								.removeClass("active"), $(this)
								.addClass("active"), i.children(".center-block")
								.hide(), i.children(`.center-block[data-menu-frame='${e}']`)
								.show()
						}
					});
				let t = $('<div class="center-block hidden" data-menu-frame="9" style="display: none;">')
					.appendTo(e);
				let o = "",
					a = 0;
				settingList.forEach((e, t) => {
					if (e.value) e.description += `（默认：${e.value}）`;
					const i = ["checkbox", "", "text", "color", "text"];
					switch (e.type) {
						case 2:
						case 3:
						case 4:
							o += `<div class="center-setting-block"><div class="setting-item"><span class="title">${e.title}:</span><input type="${i[e.type]}" class="form-control" placeholder="${e.title}.." data-todo="${e.todo}" data-id="${a}"></div><p class="text-muted">${e.description}</p></div>`;
							break;
						default:
							o += `<div class="center-setting-block"><div class="setting-item"><div class="checkbox" data-todo="${e.todo}"><input id="mcmodder-settings-${t}" type="checkbox" data-id="${a}"><label for="mcmodder-settings-${t}">${e.title}</label></div></div><p class="text-muted">${e.description}</p></div>`
					}
					a++
				});
				t.html(`<div class="center-block-head"><span class="title mcmodder-slim-dark">Mcmodder设置</span><span style="font-size: 12px; color: gray; margin-left: 1em;">版本 v${mcmodderVersion} ~ ☆</span></div><div class="center-content">${o}</div>`);
				$("div.center-block[data-menu-frame=9] div.checkbox > input")
					.each(function() {
						this.checked = getConfig($(this)
							.parent()
							.attr("data-todo")) ? true : false;
						$(this)
							.click(window.updateSettings)
					});
				$("div.center-block[data-menu-frame=9] input.form-control")
					.each(function() {
						this.value = getConfig($(this)
							.attr("data-todo")) || settingList[$(this)
							.attr("data-id")]?.value || "";
						$(this)
							.bind("change", window.updateSettings)
					});
				i.disconnect();
				$('<button id="mcmodder-update-check-manual" class="btn" style="margin: 0 10px 0 10px;">立即检查更新</button>')
					.insertAfter("[for=mcmodder-settings-3]")
					.click(doCheckUpdate)
					.parent()
					.append(getConfig("autoCheckUpdate") ? '<span class="mcmodder-timer" data-source="nextAutoUpdateTime"></span>' : "");
				$('<textarea class="form-control mcmodder-monospace" id="mcmodder-splash-text">')
					.appendTo($("#mcmodder-settings-8")
						.parents(".center-setting-block"))
					.val(GM_getValue("mcmodderSplashList"));
				if (!adminUid.includes(currentUid) && !getConfig("adminModList", `userProfile-${currentUid}`)?.length) $("[data-todo=autoVerifyDelay]")
					.parents(".center-setting-block")
					.hide()
			}
		}
	});
	const o = new MutationObserver(function(t, r) {
		for (let e of t) {
			if (e.addedNodes[0].className = "center-main lv" && $(".lv-title")
				.length) {
				let t = parseInt($("i.common-user-lv")
						.text()
						.replace("Lv.", "")),
					e = $(".lv-title")
					.get(0),
					o = parseInt($(".lv-title > span:nth-child(2)")
						.text()
						.replace("升级进度: ", "")
						.replace(",", ""));
				e.innerHTML += '<span>升至<i class="common-user-lv large lv-' + Math.min(t + 1, 30) + '">Lv.<input id="mcmodder-lv-input" maxlength="2"></i> 还需经验: <span id="mcmodder-expreq" style="margin-right: 0px">-</span> Exp</span>';
				$("input#mcmodder-lv-input", e)
					.val(Math.min(t + 1, 30));
				$("input#mcmodder-lv-input", e)
					.bind("change", function() {
						let t = parseInt($("i.common-user-lv")
								.text()
								.replace("Lv.", "")),
							i = Math.min(parseInt(this.value), 30);
						if (i < 0 || i > 30 || isNaN(i) || t >= i) {
							$("span#mcmodder-expreq")
								.text("-");
							return
						}
						let o = -parseInt($(".lv-title > span:nth-child(2)")
							.text()
							.replace("升级进度: ", "")
							.replace(",", ""));
						for (let e = t; e <= i - 1; e++) o += expReq[e];
						$("span#mcmodder-expreq")
							.text(o.toLocaleString());
						this.parentNode.className = "common-user-lv large lv-" + i
					});
				$("input#mcmodder-lv-input", e)
					.trigger("change");
				let a = o;
				if (o < 1e5)
					for (let e = 1; e < t; e++) a += expReq[e];
				window.editnum = {
					change: function() {
						let e = a;
						for (i = parseInt((s + 1) / 1e3) * 1e3; i <= Math.min(19e3, parseInt($(this)
							.val() / 1e3 - 1) * 1e3); i += 1e3) {
							e += (i + 1e3) / 2
						}
						for (i = parseInt((c + 1) / 5e4) * 5e4; i <= Math.min(95e4, parseInt($("#mcmodder-editbyte")
							.val() / 5e4 - 1) * 5e4); i += 5e4) {
							e += (i + 5e4) / 100
						}
						refreshExpBar(e, a)
					},
					keydown: function(e) {
						let t = parseInt($(this)
							.val());
						if (t < 1e3) return;
						switch (parseInt(e.keyCode)) {
							case 40:
								if (t < 1e3) return;
								$(this)
									.val(t - 1e3)
									.trigger("change");
								return;
							case 38:
								$(this)
									.val(t + 1e3);
								$(this)
									.trigger("change")
						}
					}
				};
				window.editbyte = {
					change: function() {
						let e = a;
						for (i = parseInt((c + 1) / 5e4) * 5e4; i <= Math.min(95e4, parseInt($(this)
							.val() / 5e4 - 1) * 5e4); i += 5e4) {
							e += (i + 5e4) / 100
						}
						for (i = parseInt((s + 1) / 1e3) * 1e3; i <= Math.min(19e3, parseInt($("#mcmodder-editnum")
							.val() / 1e3 - 1) * 1e3); i += 1e3) {
							e += (i + 1e3) / 2
						}
						refreshExpBar(e, a)
					},
					keydown: function(e) {
						let t = parseInt($(this)
							.val());
						switch (parseInt(e.keyCode)) {
							case 40:
								if (t < 5e4) return;
								$(this)
									.val(t - 5e4)
									.change();
								return;
							case 38:
								$(this)
									.val(t + 5e4);
								$(this)
									.change()
						}
					}
				};
				$(e)
					.append(`<span>总经验: <span id="mcmodder-totalexp" style="margin-right: 0px">${a.toLocaleString()} Exp</span></span><span>次数计算器: <input id="mcmodder-editnum"></span><span>字数计算器: <input id="mcmodder-editbyte"></span>`);
				$("#mcmodder-editnum")
					.val(s)
					.bind({
						change: window.editnum.change,
						keydown: window.editnum.keydown
					});
				$("#mcmodder-editbyte")
					.val(c)
					.bind({
						change: window.editbyte.change,
						keydown: window.editbyte.keydown
					});
				if (s === undefined) $("#mcmodder-editnum, #mcmodder-editbyte")
					.attr({
						disabled: "disabled",
						placeholder: "需要从主页获取数据.."
					});
				r.disconnect()
			}
		}
	});
	const a = new MutationObserver(function(t, i) {
		for (let e of t) {
			if (e.removedNodes[0]?.className === "loading") {
				$(".center-content.background")
					.contents()
					.filter((e, t) => t.nodeType === Node.COMMENT_NODE)
					.each(function() {
						$(this)
							.parent()
							.append(this.textContent)
					});
				i.disconnect()
			}
		}
	});
	const r = new MutationObserver(function(t, i) {
		for (let e of t) {
			if (e.removedNodes[0]?.className === "loading") {
				i.disconnect();
				if (currentUid === d) {
					advancementList.forEach(e => {
						if (e.isCustom) $(`<div class="center-task-block "><div class="center-task-border"><span class="icon"><img src="${e.img}" alt="task"></span><div class="task-item"><span class="title">${PublicLangData.center.task.list[e.langdata].title}</span><span class="difficulty">${'<i class="fa fa-star"></i>'.repeat(e.level||5)}</span><span class="text"><p>${PublicLangData.center.task.list[e.langdata].content}</p></span></div><span class="task-exp"><i class="fa fa-gift" style="margin-right:4px;"></i>奖励: ${e.reward?PublicLangData.center.item.list[userItemList[e.reward[0].id].langdata].title:"-"}</span><span class="task-rate"><i class="fas fa-hourglass-half" style="margin-right:4px;font-size:10px;"></i>进度: 0 / ${e.range||PublicLangData.center.task.list[e.langdata].range}</span></div></div>`)
							.appendTo(`.task > [data-menu-frame=${e.category}] > .center-content`)
					})
				}
				let n, l;
				for (let e = 1; e <= 2; e++) {
					n = l = 0;
					$(`.task [data-menu-frame=${e}] .center-task-block`)
						.each((e, t) => {
							let i = $(t)
								.find(".title")
								.text(),
								o = 0,
								a = $(t)
								.find(".finished")
								.length;
							let r = advancementList.find(e => PublicLangData.center.task.list[e.langdata].title === i);
							if (!r?.progress) o += r?.exp || 0, n += o, l += a * o;
							else
								for (let t = 1; t <= r.max; t++) o = advancementList.find(e => e.id === r.id && e.progress === t)?.exp || 0, l += (t < r.progress + a) * o, n += o
						});
					$(`.task [data-menu-frame=${e}] .center-block-head`)
						.append(`<span class="${l<n*.88?"text-muted":"mcmodder-chroma"}" style="margin-left: 1em;">${l.toLocaleString()} Exp / ${n.toLocaleString()} Exp 已取得 (${(l/n*100).toFixed(1)}% 完成)</span>`)
				}
			}
		}
	});
	const n = new MutationObserver(function(t, l) {
		for (let e of t) {
			if (e.addedNodes[0]?.className === "center-total") {
				let e = $(".center-content.admin-list");
				if (e.length != 2) e.each(function() {
					this.style.width = 100 / e.length + "%"
				});
				let t = $(".center-total > ul")
					.get(0);
				let i = $(t)
					.contents()
					.filter((e, t) => t.nodeType === Node.COMMENT_NODE)
					.get(0);
				let o = t.appendChild(document.createElement("li"));
				o.outerHTML = i.textContent.replace(" 次", " 字节");
				t.insertBefore($(".center-total li:last-child()")
					.get(0), $(".center-total li:nth-child(4)")
					.get(0));
				i.remove();
				$(`<li><span class="title">科龄</span><span class="text">${parseInt((Date.now()-Date.parse($(".center-total li:nth-child(7) span.text").text()))/(24*60*60*1e3)).toLocaleString()} 天</span></li>`)
					.insertAfter($("li:last-child()", t));
				$(".center-total li")
					.each(function() {
						let e = $(".title", this);
						$(".text", this)
							.attr("class", "title");
						e.attr("class", "text")
					});
				s = parseInt($(".center-total li:nth-child(2) .title")
					.text()
					.replace(" 次", "")
					.replaceAll(",", ""));
				c = parseInt($(".center-total li:nth-child(3) .title")
					.text()
					.replace(" 字节", "")
					.replaceAll(",", ""));
				m = parseInt($(".center-total li:nth-child(4) .title")
					.text()
					.replace(" 字节", "")
					.replaceAll(",", ""));
				$("#mcmodder-editnum")
					.val(s);
				$("#mcmodder-editbyte")
					.val(c);
				$("#mcmodder-editnum, #mcmodder-editbyte")
					.removeAttr("disabled")
					.removeAttr("placeholder");
				$(".admin-list ul")
					.each(function() {
						if (this.clientHeight > 400) {
							$(this)
								.attr("style", "max-height: 400px; overflow: hidden;");
							$('<a class="mcmodder-slim-dark" style="width: 100%; display: inline-block; text-align: center;">轻触展开</a>')
								.appendTo(this.parentNode)
								.click(function() {
									let e = $("ul", this.parentNode)
										.get(0);
									$(this)
										.html(e.style.maxHeight === "400px" ? "轻触收起" : "轻触展开");
									e.style.maxHeight = e.style.maxHeight === "unset" ? "400px" : "unset";
									if (e.style.maxHeight === "400px") this.scrollIntoView({
										behavior: "smooth",
										block: "center"
									})
								})
						}
					});
				if (currentUid === d) {
					$(".admin-list")
						.each(function() {
							let e = "",
								t = "",
								i = $(".title", this)
								.text();
							if (i.includes("编辑员")) t = "editorModList";
							else if (i.includes("管理员")) t = "adminModList";
							else if (i.includes("开发者")) t = "devModList";
							$("li a", this)
								.each(function() {
									e += this.href.split("/class/")[1].split(".html")[0] + ","
								});
							if (getConfig(t, `userProfile-${currentUid}`) != e) {
								setConfig(t, e, `userProfile-${currentUid}`);
								common_msg("提示", "成功更新个人模组区域~", "ok")
							}
						})
				}
				let a = JSON.parse(GM_getValue("rankData") || "[]"),
					r = [
						[0, "center"],
						[1, "mcmod"],
						[2, "cn"]
					],
					n = {};
				Object.keys(a)
					.forEach(e => {
						let t = new Date((e - 24 * 60 * 60) * 1e3),
							i = `${1900+t.getYear()}-${(1+t.getMonth()).toString().padStart(2,"0")}-${t.getDate().toString().padStart(2,"0")}`,
							o = JSON.parse(a[e]);
						o.forEach(e => {
							if (e.user == d) {
								r.push([i, parseInt(e.value)]);
								n[i] = parseInt(e.value)
							}
						})
					});
				setTimeout(() => {
					centerEditChart = echarts.getInstanceById($("#center-editchart-obj")
						.attr("_echarts_instance_"));
					if (getConfig("nightMode")) centerEditChart.setOption({
						tooltip: [{
							backgroundColor: "#222"
						}],
						calendar: [{
							dayLabel: {
								color: "#fff"
							},
							yearLabel: {
								color: "#ee6"
							},
							monthLabel: {
								color: "#fff"
							},
							itemStyle: {
								color: "#3330",
								borderColor: "#444"
							}
						}]
					});
					if (getConfig("enableAprilFools")) {
						let e = centerEditChart.getOption();
						e.series[0].data = e.series[0].data.map(e => {
							if (e[0] < 3) return e;
							return [e[0], e[1] + Math.floor(Math.random() * 120)]
						});
						centerEditChart.setOption(e)
					}
				}, 1e3);
				$('<button class="mcmodder-byte-chart btn btn-light">转为字数统计</button>')
					.appendTo($(".edit-chart-frame")
						.first())
					.click(function() {
						let e = echarts.getInstanceById($("#center-editchart-obj")
							.attr("_echarts_instance_"));
						if ($(this)
							.text() === "转为字数统计") {
							$(".title-sub", this.parentNode)
								.text("历史成功完成改动操作的字数");
							window.originalData = e.getOption();
							e.setOption({
								calendar: [{
									range: parseInt($("#center-editchart-select .filter-option-inner-inner")
										.text())
								}],
								series: [{
									data: r
								}],
								visualMap: [{
									inRange: {
										color: ["#66CAC6", "#0078F0", "#3411B9", "#B711A9", "#680B2D", "#000000"]
									},
									range: [0, getConfig("maxByteColorValue")],
									max: getConfig("maxByteColorValue")
								}],
								tooltip: [{
									formatter: function(e) {
										var t = e.data[0],
											i = "",
											o = "";
										return n[t] && (i = ` <b>${n[t].toLocaleString()}字节</b> (约${parseFloat((n[t]/3).toFixed(1)).toLocaleString()}汉字)`), "<p>" + e.marker + t.substring(5) + i + "</p>"
									}
								}]
							});
							this.innerHTML = "转为次数统计"
						} else {
							e.setOption(Object.assign(originalData, {
								calendar: [{
									range: parseInt($("#center-editchart-select .filter-option-inner-inner")
										.text())
								}]
							}));
							$(this)
								.parent()
								.find(".title-sub")
								.html("历史成功完成改动操作的次数");
							this.innerHTML = "转为字数统计"
						}
					});
				if (getConfig("nightMode")) $(".post-block img")
					.bind("load", function() {
						if (this.src === "https://www.mcmod.cn/pages/class/images/none.jpg") this.src = "https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg"
					});
				updateItemTooltip();
				setTimeout(commentInit, 1e3);
				l.disconnect()
			}
		}
	});
	if ($("#center-page-setting")
		.length > 0) t.observe($("#center-page-setting")
		.get(0), {
			childList: true
		});
	n.observe($("#center-page-home")
		.get(0), {
			childList: true
		});
	o.observe($("#center-page-rank")
		.get(0), {
			childList: true
		});
	if ($("#center-page-card")
		.length) a.observe($("#center-page-card")
		.get(0), {
			childList: true
		});
	if ($("#center-page-task")
		.length) r.observe($("#center-page-task")
		.get(0), {
			childList: true
		});
	if (getConfig("enableAprilFools")) addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background: var(--mcmodder-bgncolor); z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ");
	let l = window.getComputedStyle(document.body)["background-image"].replace('url("', "")
		.replace('")', "");
	if (l != getConfig("defaultBackground") && ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"].includes(l.split(".")
		.pop()
		.toLowerCase())) $("div.bbs-link")
		.append(`<p align="right"><a href="${l}" target="_blank">查看个人中心背景图片</a></p>`);
	$("div.bbs-link")
		.append(`<p align="right"><a href="https://www.mcmod.cn/verify.html?order=createtime&userid=${d}" target="_blank">查看近期提交审核列表</a></p>`);
	window.addUserBlacklist = function() {
		let e = getConfig("userBlacklist")
			.replaceAll(" ", "")
			.split(",");
		if (e.includes(d)) {
			setConfig("userBlacklist", e.filter(e => e != d)
				.reduce((e, t) => e + ", " + t));
			common_msg("提示", `成功将 UID:${d} 从用户黑名单中移除~`, "ok")
		} else {
			e.push(d);
			setConfig("userBlacklist", e.reduce((e, t) => e + "," + t));
			common_msg("提示", `成功将 UID:${d} 加入用户黑名单~`, "ok")
		}
	};
	$("div.bbs-link")
		.append(`<p align="right"><a id="mcmodder-user-blacklist" class="mcmodder-slim-danger">屏蔽该用户</a></p>`);
	$("#mcmodder-user-blacklist")
		.get(0)
		.onclick = window.addUserBlacklist
}

function commentInit() {
	if (getConfig("commentExpandHeight")) {
		let e = getConfig("commentExpandHeight") || "300";
		addStyle(`.comment-row-text {max-height: ${e}px;}`)
	}
	let i = function() {
		if (!$(".common-comment-block.lazy")
			.length || $(".comment-close")
			.length)
			if (getConfig("unlockComment")) {
				const a = "common-comment-block lazy";
				let e = $(".center-block:last-child()")
					.get(0) || $(".common-comment-block.lazy .comment-editor")
					.get(0) || $(".author-row")
					.get(0),
					t, i;
				let o = document.getElementsByClassName(a);
				if (e && (!o.length || $(".comment-close")
					.length)) {
					i = document.createElement("div");
					i.className = a;
					i.style = "";
					t = e.appendChild(i);
					addScript(t, "comment_channel = '1';comment_user_id = '1';comment_user_editnum = '19732';comment_user_wordnum = '1356802';$(document).ready(function(){$(\".comment-channel-list li a.c1\").click();});");
					t.append('<div><ul class="comment-floor"></ul></div>');
					addScript(t, 'get_comment(comment_container,comment_type);var isUEReady=0;if($(".comment-editor-area .editor-frame").length>0&&0==isUEReady)var ueObj=$.ajax({url:"//www.mcmod.cn/static/ueditor/",async:!0,type:"post",data:{type:"comment"},xhrFields:{withCredentials:true},crossDomain:true,complete:function(e){$(".comment-editor-area .editor-frame .load").html(ueObj.responseText),isUEReady=1}});');
					if ($(".comment-close")
						.length && $(".comment-dl-tips")
						.length) {
						$(".comment-close")
							.remove()
					}
				}
			}
	};
	if (window.location.href.includes("center.mcmod.cn") || window.location.href.includes("/author/")) i();
	if (window.location.href.includes("#comment-")) $(".common-comment-block.lazy")
		.get(0)?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	const e = new MutationObserver(function(t, e) {
		function a(e) {
			if ($("input.comment-id", e)
				.get(0)?.value === window.location.href.split("comment-")[1]) {
				setTimeout(() => {
					e.scrollIntoView({
						behavior: "smooth",
						block: "center"
					});
					$(e)
						.addClass("mcmodder-mark-gold");
					setTimeout(() => {
						$(e)
							.removeClass("mcmodder-mark-gold")
					}, 2e3)
				}, 800)
			}
		}
		for (let e of t) {
			if ((e.target.className === "comment-floor" || e.target.className === "comment-reply-floor") && e.addedNodes.length > 0) {
				$(".comment-reply-row-time", e.target)
					.each(function() {
						$(this)
							.append(` (${$(this).attr("title")})`)
					});
				if (e.target.className === "comment-floor") {
					$("ul.pagination.common-pages > span")
						.each(function() {
							this.innerHTML += '快速跳转至：第&nbsp;<input id="mcmodder-gotopage" class="form-control">&nbsp;页。';
							$("#mcmodder-gotopage", this)
								.val($(this)
									.text()
									.replace("当前 ", "")
									.split(" / ")[0])
								.bind("focusout", function() {
									let e = parseInt(this.value);
									if (e < 1 || e > parseInt($(this)
										.text()
										.replace("当前 ", "")
										.split(" / ")[1])) return;
									comment_nowpage = e;
									get_comment(comment_container, comment_type)
								})
						});
					let i = parseInt(getConfig("missileAlertHeight")) || 1e3;
					let o = parseInt(getConfig("commentExpandHeight")) || 300;
					$("div.comment-row-content", e.target)
						.each(function() {
							if (getConfig("userBlacklist")
								.replace(" ", "")
								.split(",")
								.includes($("a.poped", this)
									.attr("data-uid"))) {
								this.parentNode.remove();
								return
							}
							if (getConfig("enableAprilFools") && $("a.poped", this)
								.attr("data-uid") == currentUid && window.location.href.includes("/class/")) {
								let e = userLv.title.replace(PublicLangData.comment.suffix.mod_admin + " (", "")
									.replace(PublicLangData.comment.suffix.mod_manager + " (", "")
									.replace(PublicLangData.comment.suffix.mod_developer + " (", "")
									.replaceAll(")", "");
								$(".common-user-lv", this)
									.attr({
										class: "common-user-lv manager",
										title: PublicLangData.comment.suffix.mod_manager + " (" + e + ")",
										href: "https://t.bilibili.com/779290398405165095"
									})
									.text(PublicLangData.comment.suffix.mod_manager)
							}
							a(this);
							let e = $("div.comment-row-text-content.common-text.font14", this)
								.get(0);
							if (getConfig("ignoreEmptyLine")) $(e)
								.children()
								.filter((e, t) => t.innerHTML === "<br>")
								.remove();
							let t = parseInt(e.clientHeight);
							if (t > o && t < 300 && o < 300) {
								$(`<a class="fold text-muted"><i class="fas fa-chevron-down"></i>${PublicLangData.comment.fold.down}</a>`)
									.appendTo(this);
								this.insertBefore($("a.fold.text-muted", this)
									.get(0), $("ul.comment-tools", this)
									.get(0))
							}
							if (getConfig("missileAlert") && t > i) $("a.fold.text-muted", this)
								.append(' - <span class="mcmodder-slim-danger">核弹警告！</span>本楼展开后将会长达 <span class="mcmodder-common-danger">' + t.toLocaleString() + " px</span>！")
						})
				} else if (e.target.className === "comment-reply-floor" && getConfig("replyLink")) {
					$("div.comment-reply-row", e.target)
						.each(function() {
							if (getConfig("userBlacklist")
								.replace(" ", "")
								.split(",")
								.includes($("a.poped", this)
									.attr("data-uid"))) this.remove();
							a(this);
							let t = $("div.comment-reply-row-text-content.common-text.font14", this)
								.first();
							let i = t.html()
								.replaceAll("<br>", " "),
								o = "";
							for (let e = 0; e < i.length; e++) o += i[e].charCodeAt() <= 255 ? i[e] : " ";
							let e = o.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
							e.forEach(function(e) {
								t.html(t.html()
									.replace(e, '<a href="' + e + '" target="_blank">' + e + "</a>"))
							})
						})
				}
			} else if (e.target.className === "common-comment-block lazy" && e.addedNodes.length > 0) i()
		}
	});
	if ($(".common-comment-block.lazy")
		.length) e.observe($(".common-comment-block.lazy")
		.get(0), {
			childList: true,
			subtree: true
		})
}
window.versionCompare = function(e, t) {
	const i = e.split(".")
		.map(Number);
	const o = t.split(".")
		.map(Number);
	for (let e = 0; e < Math.max(i.length, o.length); e++) {
		const a = i[e] || 0;
		const r = o[e] || 0;
		if (a > r) return 1;
		if (a < r) return -1
	}
	return 0
};

function scheduleEvents() {
	if (getConfig("autoCheckUpdate")) {
		let e = parseInt(getConfig(`nextAutoUpdateTime`, "scheduledEvent")) || 0,
			t = Date.now();
		setTimeout(async function() {
			doCheckUpdate()
		}, t > e ? 1 : e - t + 100)
	}
	if (currentUid && getConfig("autoCheckin")) {
		let e = parseInt(getConfig(`nextCheckInTime-${currentUid}`, "scheduledEvent")) || 0,
			t = Date.now();
		let i = t > e ? 1 : e - t + 100;
		setTimeout(async function() {
			if (document.domain === "center.mcmod.cn") {
				let e = await fetch("https://center.mcmod.cn/action/doUserCheckIn/", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
					},
					body: "nCenterID=" + currentUid
				});
				let t = await e.text();
				let i = JSON.parse(t),
					o = "";
				if (!i.state && i.amount) o = "自动签到已执行！获得知识碎片 " + i.amount + " 个~";
				else if (i.state === 182) o = "自动签到已执行！但是似乎早就签到过啦~";
				else if (i.state === 109) o = "自动签到已执行！但是似乎被别的百科页面抢先一步了~";
				setConfig(`nextCheckInTime-${currentUid}`, getStartTime(new Date), "scheduledEvent");
				if (o) try {
					common_msg("提示", o, !i.state ? "ok" : "err")
				} catch (e) {
					alert(o)
				}
			} else open("https://center.mcmod.cn/")
		}, i);
		if (i < 2) return
	}
	let d = parseFloat(getConfig("autoVerifyDelay"));
	let s = getConfig("adminModList", `userProfile-${currentUid}`)?.split(",") || [];
	if (d && s.length && d >= .01) {
		let e = parseInt(getConfig(`nextAutoVerifyTime-${currentUid}`, "scheduledEvent")) || 0,
			t = Date.now();
		setTimeout(async function() {
			if (document.domain != "admin.mcmod.cn") {
				open("https://admin.mcmod.cn/");
				return
			}
			let a = 0,
				r = 0,
				n = "";
			let l = async function(e) {
				let t = await fetch("https://admin.mcmod.cn/frame/pageVerifyMod-list/", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
					},
					body: "data=" + JSON.stringify({
						classID: e
					})
				});
				let i = await t.text();
				let o = parseInt(toChinese(i)
					.split("总待审：")[1].split("个。")[0]);
				r += o;
				if (s.length > a + 2) {
					setTimeout(() => {
						l(s[++a])
					}, 300);
					return
				} else {
					n = r ? `当前所管理的模组共有 ${r} 个待审项，请尽快处理~` : "当前无待审项~";
					common_msg("提示", n, !r ? "ok" : "err");
					setConfig(`nextAutoVerifyTime-${currentUid}`, Date.now() + d * 60 * 60 * 1e3, "scheduledEvent");
					if (r) $("[data-page=pageVerifyMod]")
						.click()
				}
			};
			if (s) l(s[0])
		}, t > e ? 100 : e - t + 100);
		if (e - t < 2) return
	}
	let e = parseFloat(getConfig("alwaysNotify"));
	if (window.location.href.includes("https://www.mcmod.cn/") && typeof fuc_topmenu_sync && e && e >= .1) setInterval(async () => {
		let e = await fetch("https://www.mcmod.cn/frame/CommonHeader/", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
			},
			body: "version=4.0"
		});
		let t = JSON.parse(await e.text());
		if (t.state || !t.user.login || !t.user.msg_count) {
			$(".mcmodder-rednum")
				.hide();
			return
		}
		$(".mcmodder-rednum")
			.text(t.user.msg_count)
			.show();
		$(".header-layer .fa-bell")
			.parent()
			.attr("href", "https://www.mcmod.cn/message/")
	}, Math.max(e * 1e3 * 60, 6e3));
	if (document.location.href.includes("/class/history/")) return;
	let t = parseFloat(getConfig("subscribeDelay"));
	let c = getConfig(`subscribeModlist-${currentUid}`)?.split(",") || [];
	if (t && c.length && t >= .01) {
		let e = parseInt(getConfig(`nextSubscribeTime-${currentUid}`, "scheduledEvent")) || 0,
			t = Date.now();
		setTimeout(async function() {
			let n = 0,
				e = "";
			let l = async function(a) {
				let e = `https://www.mcmod.cn/class/history/${a}.html`;
				let t = await fetch(e, {
					method: "GET"
				});
				let i = $("<html>")
					.html(await t.text());
				let o = Date.parse($(".history-list-frame li:first-child() .time", i)
						.text()?.split(" (")[0]),
					r = parseInt(getConfig(a, "latestEditTime"));
				if (!r) setConfig(a, o, "latestEditTime");
				else if (r < o) {
					open(`${e}?t=${r}`);
					setConfig(a, o, "latestEditTime")
				}
				if (getConfig("subscribeComment")) {
					let e = await fetch("https://www.mcmod.cn/frame/comment/CommentRow/", {
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
						},
						body: "data=" + JSON.stringify({
							type: "class",
							channel: 1,
							doid: a,
							page: 1,
							selfonly: 0
						})
					});
					let t = JSON.parse(await e.text())?.data?.row || [];
					let i = (t[0]?.floor.includes("# 置顶 #") ? t[1]?.id : t[0]?.id) || 0,
						o = parseInt(getConfig(a, "latestComment"));
					if (!o) setConfig(a, i, "latestComment");
					else if (o < i) {
						open(`https://www.mcmod.cn/class/${a}.html#comment-${i}`);
						setConfig(a, i, "latestComment")
					}
				}
				if (c.length > n + 1) {
					setTimeout(() => {
						l(c[++n])
					}, 1e3);
					return
				} else setConfig(`nextSubscribeTime-${currentUid}`, Date.now() + d * 60 * 60 * 1e3, "scheduledEvent")
			};
			if (c) l(c[0])
		}, t > e ? 100 : e - t + 100);
		if (e - t < 2) return
	}
}

function structureEditorInit() {
	$("title, .common-nav .item")
		.html("结构编辑器");
	$(".search-frame, .eat-frame")
		.remove();
	$(".info-frame")
		.html('<div class="common-text" />');
	$('<link type="text/css" href="/static/public/css/item/item.frame.css?v=8" rel="stylesheet"><link type="text/css" href="/static/public/css/item/structure_browser.frame.css" rel="stylesheet">')
		.appendTo("head");
	async function e() {
		await loadScript(document.head, null, "/static/public/plug/three/three.min.js");
		await loadScript(document.head, null, "/static/public/plug/three/three.orbit-controls.min.js");
		await loadScript(document.head, null, "/static/public/plug/three/three.tween.min.js");
		loadScript(document.head, 'import{EXGridHelper}from"/static/public/plug/three/three.ex-grid-helper.js";window.structure_enchanted_grid_helper=function(r,e,t,i,d){return new EXGridHelper(r,e,t,i,d)}', null, "module");
		loadScript(document.body, `comment_container = ${getConfig("structureSelected")||"36016"};`);
		await loadScript(document.body, null, "/static/public/js/item/mc.structure_browser.functions.js");
		await loadScript(document.body, null, "/static/public/js/item/mc.item.functions.js?v=12");
		$(`<div>选取预设结构：<select id="mcmodder-structure-selector"><option value="36016">[36016] 通用机械-聚变反应堆</option><option value="36550">[36550] 沉浸工程-斗轮式挖掘机</option><option value="161900">[161900] 自然灵气-灵气充能台</option><option value="192950">[192950] 冰火传说-龙钢锻炉</option><option value="202730">[202730] 魔法金属-高炉</option><option value="775298">[775298] 格雷科技现代版-土高炉</option></select></div>`)
			.appendTo(".info-frame");
		$("#mcmodder-structure-selector")
			.val(comment_container)
			.change(function() {
				setConfig("structureSelected", $(this)
					.val());
				location.reload()
			});
		$('<div>操作状态：<div class="radio"><input id="previewMode" name="mode" type="radio" checked="1"><label for="previewMode">预览模式</label></div><div class="radio"><input id="editMode" name="mode" type="radio"><label for="editMode">编辑模式</label></div></div>')
			.appendTo(".info-frame");
		structure_browser.blocktype_list = [];
		structure_browser.get_block_type = function() {
			structure_browser.blocktype_list = [];
			structure_browser.cube_list.forEach(e => {
				let t = {
					item: e.data.name.item,
					mod: e.data.name.mod,
					face: e.material.map(e => e.map.image.src),
					id: e.data.id
				};
				for (j of structure_browser.blocktype_list)
					if (JSON.stringify(t) === JSON.stringify(j)) return;
				structure_browser.blocktype_list.push(t)
			})
		};
		structure_browser.remove_block = function(t) {
			structure_browser.cube_list = structure_browser.cube_list.filter(e => e.uuid != t);
			structure_browser.group.children = structure_browser.group.children.filter(e => e.uuid != t);
			structure_browser.scene.remove(structure_browser.group);
			structure_browser.scene.add(structure_browser.group)
		};
		let t = structure_browser.onDocumentMouseUp;
		structure_browser.onDocumentMouseUp = function(e) {
			if ($("#previewMode")
				.get(0)
				.checked) t(e);
			else {
				if (e.button != 2 || $("item[name=blocktype]:checked()")
					.length) return;
				const r = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
				if (r.length) {
					let e = r[0].face.normal,
						t = r[0].object.data.position[0] + e.x,
						i = r[0].object.data.position[1] + e.z,
						o = r[0].object.data.layer + e.y;
					let a = structure_browser.blocktype_list[parseInt($("input[name=blocktype]:checked()")
						.attr("id")
						.split("block-selector-")[1])];
					if (structure_browser.cube_list.filter(e => t === e.data.position[0] && o === e.data.layer && i === e.data.position[1])
						.length) return;
					structure_browser.set_block(o - 1, [t, i], [a.face[0].split("/texture/")[1].split("/")[0], a.face[0].split("/texture/")[1].split("/")[1], a.face[0].includes("/fill.")], [a.id, a.item, a.mod])
				}
			}
		};
		let i = structure_browser.onDocumentClick;
		structure_browser.onDocumentClick = function(e) {
			if ($("#previewMode")
				.get(0)
				.checked) i(e);
			else {
				const t = structure_browser.raycaster.intersectObjects(structure_browser.cube_list);
				if (t.length) structure_browser.remove_block(t[0].object.uuid)
			}
		};
		$('<div>方块列表：<table id="block-selector"><thead><th>操作</th><th>方块名称</th><th>所属模组</th><th>右-左-上-下-前-后</th><th>对应资料ID</th></thead><tbody></tbody></div>')
			.appendTo(".info-frame")
	}
	e();
	setTimeout(() => {
		$("#structure-close")
			.hide();
		structure_browser.get_block_type();
		structure_browser.blocktype_list.forEach((e, t) => {
			$("<tr>" + [`<div class="radio"><input id="block-selector-${t}" name="blocktype" type="radio"><label for="block-selector-${t}">选取</label></div>`, e.item, e.mod, e.face.reduce((e, t) => e + `<img src="${t}" width="24">`, ""), e.id].reduce((e, t) => e + "<td>" + t + "</td>", "") + "</tr>")
				.appendTo("#block-selector tbody")
		})
	}, 3e3)
}(() => {
	"use strict";
	customStyle();
	let e = window.location.href;
	if (getConfig("forceV4") && e === "https://www.mcmod.cn/") window.location.href = "https://www.mcmod.cn/v4/";
	advancementList = [{
		langdata: "old_text_word_length_1000",
		category: 2,
		id: 0,
		exp: 350
	}, {
		langdata: "old_text_word_length_0",
		category: 2,
		id: 1,
		exp: 350
	}, {
		langdata: "view_below_50",
		category: 2,
		id: 2,
		exp: 350
	}, {
		langdata: "last_edit_365",
		category: 2,
		id: 3,
		exp: 350
	}, {
		langdata: "edit_times_20",
		category: 2,
		id: 4,
		exp: 350
	}, {
		langdata: "add_post_word_length_10000",
		category: 2,
		id: 5,
		exp: 520
	}, {
		langdata: "edit_class_area_100",
		category: 2,
		id: 6,
		exp: 400
	}, {
		langdata: "download_mods_1",
		category: 3,
		id: 12,
		exp: 0,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/4/40221.png"
	}, {
		langdata: "keep_edit_240days",
		category: 3,
		id: 10,
		exp: 0
	}, {
		langdata: "wait_a_minute",
		category: 3,
		id: 13,
		exp: 0,
		range: 3,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/0/9378.png"
	}, {
		langdata: "fault_finder",
		category: 3,
		id: 14,
		exp: 0,
		range: 10,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/0/940.png"
	}, {
		langdata: "master_editor",
		category: 3,
		id: 15,
		exp: 0,
		range: 1,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/0/6724.png"
	}, {
		langdata: "click_girl_100_times",
		category: 3,
		id: 16,
		exp: 0,
		range: 100,
		isCustom: true,
		img: "/ueditor/dialogs/emotion/images/mcmod_2020/13.gif"
	}, {
		langdata: "skillful_craftsman",
		category: 3,
		id: 17,
		exp: 0,
		range: 1,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/77/770349.png"
	}, {
		langdata: "grave_digger",
		category: 3,
		id: 18,
		exp: 0,
		range: 1,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/7/72138.png"
	}, {
		langdata: "all_your_fault",
		category: 3,
		id: 19,
		exp: 0,
		range: 1e3,
		isCustom: true,
		img: "//i.mcmod.cn/item/icon/128x128/3/37698.png",
		reward: [{
			id: 6
		}]
	}, {
		langdata: "mcmod_10th",
		category: 3,
		id: 11,
		exp: 0
	}, {
		langdata: "user_view_center",
		category: 1,
		id: 22,
		exp: 1
	}, {
		langdata: "user_push_class",
		category: 1,
		id: 23,
		exp: 1
	}, {
		langdata: "user_add_class",
		category: 1,
		id: 24,
		exp: 10
	}, {
		langdata: "user_add_modpack",
		category: 1,
		id: 25,
		exp: 10
	}, {
		langdata: "user_add_post",
		category: 1,
		id: 26,
		exp: 25
	}];
	for (let e = 1; e <= 20; e++) advancementList.push({
		langdata: "user_edit_all_" + e,
		category: 2,
		id: 7,
		progress: e,
		exp: e * 500,
		max: 20
	});
	for (let e = 1; e <= 20; e++) advancementList.push({
		langdata: "user_word_all_" + e,
		category: 2,
		id: 8,
		progress: e,
		exp: e * 500,
		max: 20
	});
	for (let e = 1; e <= 6; e++) advancementList.push({
		langdata: "user_word_avg_" + e,
		category: 2,
		id: 9,
		progress: e,
		exp: parseInt(expReq[e * 5] / 10),
		max: 6
	});
	for (let e = 2; e <= 30; e++) advancementList.push({
		langdata: "user_lv_" + e,
		category: 2,
		id: 21,
		progress: e - 1,
		exp: 0,
		max: 29
	});
	for (let e = 1; e <= 5; e++) advancementList.push({
		langdata: "user_edit_today_" + e,
		category: 1,
		id: 27,
		progress: e,
		exp: [1, 10, 25, 50, 100][e - 1],
		max: 5
	});
	for (let e = 1; e <= 5; e++) advancementList.push({
		langdata: "user_word_today_" + e,
		category: 1,
		id: 28,
		progress: e,
		exp: [1, 10, 25, 50, 100][e - 1],
		max: 5
	});
	userItemList = [{
		langdata: "knowledge_fragment",
		id: 0
	}, {
		langdata: "technique_crystal",
		id: 1,
		isCustom: true
	}, {
		langdata: "memory_cube",
		id: 2,
		isCustom: true
	}, {
		langdata: "canning_civilization",
		id: 3,
		isCustom: true
	}, {
		langdata: "wisdom_singularity",
		id: 4,
		isCustom: true
	}, {
		langdata: "mr_torcherino",
		id: 5
	}, {
		langdata: "red_button",
		id: 6,
		isCustom: true
	}, {
		langdata: "medal_of_friendship",
		id: 7,
		isCustom: true
	}, {
		langdata: "test_1",
		id: 8,
		isCustom: true
	}, {
		langdata: "vanilla",
		id: 9,
		isCustom: true
	}];
	scheduleEvents();
	if (getConfig("useNotoSans")) {
		$('<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&amp;display=swap" rel="stylesheet">')
			.appendTo("head");
		addStyle('* {font-family: "Noto Sans SC","Microsoft YaHei","微软雅黑","宋体",sans-serif}')
	}
	$("span")
		.filter((e, t) => $(t)
			.attr("style") === "position: absolute;color: #555;border-radius: 5px;border: 1px solid #555;font-size: 12px;padding: 0 2px;left:5px;top:5px;bottom:auto;right:auto;background:RGBA(255,255,255,.45);")
		.html("<a>× 广告</a>")
		.find("a")
		.click(function() {
			$(this)
				.parent()
				.parent()
				.hide()
		});
	if (getConfig("enableSplashTracker") && (e === "https://www.mcmod.cn/" || e === "https://www.mcmod.cn/v4/")) setTimeout(function() {
		if (!GM_getValue("mcmodderSplashList") || GM_getValue("mcmodderSplashList") === "undefined") GM_setValue("mcmodderSplashList", "# MC百科闪烁标语\n");
		let e = $($("div.ooops div.text")
				.get(0) || $("div.splash span")
				.get(0) || document.body)
			.text();
		GM_setValue("mcmodderSplashList", GM_getValue("mcmodderSplashList") + e + "\n");
		try {
			common_msg("提示", `成功记录闪烁标语~ 内容为: ${e}`, "ok")
		} catch (e) {}
	}, 300);
	if (getConfig("freezeAdvancements")) $(".common-task-tip")
		.attr({
			id: "task-mcmodder-frozen",
			class: "mcmodder-task-tip"
		});
	if (getConfig("enableAprilFools")) {
		if (e.includes("/author/22957.html")) $("div.author-user-avatar img")
			.attr("src", "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif")
	}
	if (getConfig("tableFix")) {
		$("table [align]")
			.each((e, t) => $(t)
				.css("text-align", $(t)
					.attr("align")))
			.removeAttr("align");
		$("table [valign]")
			.each((e, t) => $(t)
				.css("vertical-align", $(t)
					.attr("valign")))
			.removeAttr("valign");
		addStyle("th {text-align: center;}")
	}
	addStyle('@keyframes fadeIn {from {opacity: 0;} to {opacity: 1;}} .common-imglist a[rel=nofollow] img, .sidebar .user-info img {border-radius: 50%} .common-rowlist-block .title, .common-imglist-block .title, .popover-header {background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2));} .common-center .item-table i {background-image: url(//i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png); background-position: -0px -0px; width: 34px; height: 34px;} body > .content, .fold-list-object-ul .count, .item-table-gui-slot .view, .table-striped > tbody > tr:nth-of-type(2n+1), .common-select .find-close, .tools-list li {background-color: transparent;} .common-center .maintext .itemname .name h5, .itemname h5, .center-block-head .title, .common-center .post-row .postname .name h5, .common-center .right .class-title h3, .mcmodder-data-frame .class-title h3, .common-comment-block .comment-title, .mcmodder-title, .modal-title, .tools-title {text-decoration: underline 4px var(--mcmodder-tc1); text-underline-position: under; line-height: 2; font-size: 24px;} .itemname h5 {margin: 0 0 .5em 0;} .item-h5-ename {font-size: 16px; font-weight: lighter; color: gray;} .class-title .short-name {font-size: 18px;font-weight: bold;margin-right: 5px;display: inline-block;} .class-title h3 {font-size: 18px;font-weight: bold;display: inline-block;margin: 0;} .class-title h4 {font-size: 15px;color: #777;display: inline-block;margin: 0 0 0 10px;} .header-layer .header-layer-block .title, .center-content.admin-list .title, .modlist-filter-block .title, .relation > span, .common-center .right .tab-content ul.tab-ul p.title, .mcmodder-subtitle, .col-form-label {text-decoration: underline 3px var(--mcmodder-tc1); text-underline-position: under; line-height: 2; font-size: 18px; font-weight: unset; color: var(--mcmodder-txcolor);} .common-center {background-color: transparent; margin-top: 6em; border: unset; padding: .5em;  border-radius: 0px; margin: 0 10% 0 10%; width: 80%;} .common-center .right .class-text-top {min-height: unset; padding-right: unset;}  .common-frame {padding: 0px; max-width: unset;} .col-lg-12.common-rowlist-2 .title, .center-total li .title, .class-info-left .col-lg-6 .title, .verify-rowlist .title, .class-excount .infos .span .n {color: var(--mcmodder-txcolor); justify-content: center; display: flex; width: 100%; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;} .center-total li .title {overflow: unset;} .class-excount, .comment-dl-tips {width: unset;} .col-lg-12.common-rowlist-2 .text, .center-total li .text, .class-info-left .col-lg-6 .text, .verify-rowlist .text {color: #666; text-align: center; display: block; width: 100%; font-size: 12px;} .common-center .maintext .item-give {width: unset; border: unset; background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2))} .common-center .maintext .item-give span {font-size: 14px; color: unset; font-family: consolas, monospace;} body .common-nav {padding: 0 .8em 0 .8em; margin-top: 8em;} .item-dict a {color: var(--mcmodder-txcolor); font-family: consolas, monospace; border-radius: 10px; background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2)); padding: 5px; margin-right: .5em;} .center-content.admin-list li, .center-content.edit-list li, .common-rowlist.borderbottom li, .header-layer .header-layer-block li, .common-center .right .class-relation-list .relation li, .item-search-frame, .item-used-frame {padding-bottom: .3em; border-bottom: 2px dashed var(--mcmodder-tca1);} .col-lg-6 {padding: 0; display: inline-block;} .header-layer {padding: 1em !important; padding-left: 3em !important; padding-right: 3em !important; background-color: var(--mcmodder-bgcolor) !important; backdrop-filter: blur(10px);} border: unset; .header-layer .header-layer-block {width: 250px;} .header-menu-widget-homepage .header-layer-block.layer-category {width: 170px !important;} .header-layer .header-layer-block li:nth-child(2n+1) {margin-right: 25px;} .class-menu-page li i, .common-fuc-group i, #server-tool i, .server-listtype-switch li i, .header-layer-block i, .common-center .class-edit-block li a i, .common-menu-page li i, .center-main.favorite .favorite-fold-fuc i, .common-center .right .class-relation-list .relation i {color: var(--mcmodder-td1); margin-right: .5em} .class-excount .star .fire i {color: goldenrod} .class-menu-page, .common-menu-page, .link-list li.link-row, .modlist-block .title p, .others-list li, #relation-frame .relation-list, #modlist-frame .modlist-list, #relation-frame .relation-list .relation-group li, #modlist-frame .modlist-list .modlist-group li, .class-excount .infos, .common-index-block ul.list-block .info, .page-app::before, .server-list-index .page-app, #server-tool .action {background: transparent; border: unset;} .class-menu-page li.active, .common-menu-page li.active {border-top-color: var(--mcmodder-td2);} .center-menu li.active a, .center-menu li:hover a {border-bottom-color: var(--mcmodder-td2)} .center-content.lv-info .lv-bar .progress-bar {background: linear-gradient(90deg,var(--mcmodder-tc1),var(--mcmodder-tc2));} .common-center .right .class-info .class-info-left .author li {height: 60px;} .common-center .right .class-info .class-info-left .author li .avatar {width: 55px; height: 55px;} .common-center .right .class-info .class-info-left .author li .member {padding: 5px 10px; background-color: var(--mcmodder-bgcolor); border: unset; border-radius: unset; max-width: 160px;} .common-center .right .class-info .class-info-left .author li a {font-size: 14px;} .common-center .right .class-info .class-info-left .author li .avatar img {width: 55px; height: 55px; padding: 5px; border-radius: 50%;} .common-center .right .class-info .class-info-left .author .frame {height: unset;} .common-center .right .class-info .class-info-left .author li .member .name {max-width: 245px;} .structure-block-label .item-table-hover-t1, .structure-block-label .item-table-hover-t2 {color: #ddd !important;} .common-fuc-group .action {background-color: #fff8; padding: 2px;} .tooltip-inner, body .edui-default .edui-bubble .edui-popup-content {max-width: unset; color: var(--mcmodder-txcolor); background-color: var(--mcmodder-bgcolor); backdrop-filter: blur(10px); border-radius: 1rem; padding: .5em 1em; animation: fadeIn .3s ease-out forwards; border: solid 10px; border-image: linear-gradient(45deg, var(--mcmodder-tc1), var(--mcmodder-tc2)) 1 stretch; clip-path: inset(0 round 1rem); position: relative; box-shadow: 5px 5px 5px gray;} .common-center .right {padding-left: 280px;} .col-lg-12.server-listtype-switch {padding-left: 1em;} .tooltip-inner::after, .edui-default .edui-bubble .edui-popup-content::after {position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; content: \'\'; border-radius: 10px; z-index: -2; border: 5px solid var(--mcmodder-bgcolor);} .bs-tooltip-auto[x-placement^="top"] .arrow::before, .bs-tooltip-top .arrow::before {border-top-color: var(--mcmodder-bgcolor); backdrop-filter: blur(10px);} .class-excount .star .block-left, .bootstrap-tagsinput .tag {background: linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));} @media (max-width: 1200px) {body .header-user .header-user-info .header-panel {left: unset; right: 0;}} .header-user .header-user-info .header-panel {left: -200%;} .header-user .header-user-info .header-panel {width: 400px !important; padding-top: 70px; animation: fadeIn ease-out .2s both} .header-user .header-user-info .header-panel .header-layer {padding: 1em !important;} .header-user .header-user-info .header-panel .header-layer-block {margin-top: 75px;} .mcmodder-profile {position: absolute; left: 50%; top: -55px; transform: translate(-50%);} .mcmodder-profile img {width: 110px; height: 110px; padding: 2px; background-color: #fff; border-radius: 50%; margin-bottom: 0.8em;} .common-center .center {max-width: unset;} .mcmodder-profile p {font-weight: bold;} .header-layer {position: relative;} .common-center .left, .common-center .right:not(.col-lg-12) {width: 275px;} .common-center .left {position: absolute; left: 0;} .mcmodder-class-init.col-lg-12.right {padding-right: 280px;} @media (min-width: 1281px) {.common-center .right .class-info .class-info-left.mcmodder-class-source-info, .mcmodder-info-right {display: none;} .header-right .header-search form {top: .5em; right: 9.5em;}} @media (max-width: 1280px) {.common-center .right:not(.col-lg-12) {display: none;} .common-center .right .class-info .class-info-left.mcmodder-class-source-info, .mcmodder-info-right {display: block;} .mcmodder-info-right {width: 230px;} .mcmodder-class-init.col-lg-12.right {padding-right: 0;} .common-center {margin: 0 1% 0 1%; width: 98%;}} .class-text {margin: 0 1em 0 1em;} .mcmodder-modloader {height: 24px; margin: 3px; display: flex; justify-content: center;} .mcmodder-loadername {font-size: 16px; margin-left: .2em;} .common-nav, .common-center .left, .class-info-right, .class-text, .center-block, .center-total, .common-menu-page, .item-list-filter, .item-list-table, .item-row, .common-menu-area, .rank-head-frame, .rank-list-frame, .common-center .center > div:not(.right, .logreg-frame), .author-row > div:not(.dropdown), .donate-frame > *:not(hr), .center > fieldset, .center > ul, .center .main > div:not(.nav), .oredict-list-table, .modal-content, *:not(.center-block) > .common-comment-block.lazy, .common-center .left, .common-center .post-row, .version-content-empty, .swal2-popup, .popover, .panel, .panel-default, .panel-title, .edit-unlogining, .common-select, .item-table-main, .log-frame > p, .about-frame > *, body > .container > *, .modfile-main-frame > * {background-color: var(--mcmodder-bgcolor); border-radius: 1em; padding: 1em; box-shadow: rgba(50, 50, 100, 0.5) 0px 2px 4px 0px;} .item-list-table {border-radius: 0;} .bd-callout p {font-size: 12px; color: #6c757d;} #edui1, .mold, .progress-list, .class-item-type li, .post-block, .tools-list li > *, .comment-row, .common-center .item-data, .item-table-area, .common-icon-text.edit-history, .bd-callout, .tab-ul > .text-danger, .center-task-block, .center-content.lv-info, .center-card-block.badges, .common-center .maintext .item-give, .modlist-block, .verify-info-table, .common-world-gen-block, .common-world-gen-data, .header-search form .class-info-right > ul, .item-text > .item-info-table, .class-excount, .common-text-menu, #mcmodder-text-result, .mcmodder-golden-alert, .mcmodder-gui-alert, .mcmodder-changelog {background-color: var(--mcmodder-bgcolor); border-radius: 1em; margin: .6em; padding: .6em; box-shadow: rgba(50, 50, 100, 0.2) 0px 2px 4px 0px;} .mcmodder-gui-alert {max-width: 60%; background: linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2)); padding: 1em; line-height: 1.8} .mcmodder-changelog {max-height: 300px; overflow: scroll; text-align: left; font-size: 14px;} .mcmodder-changelog li {margin-left: 2em;} .mcmodder-changelog ul li {list-style-type: disc;} .tag li, .mcver li a, .common-center .maintext .itemname .tool, .author-user-frame .author-tool, .common-center .right .class-relation-list .relation li, .common-fuc-group li, #server-tool li, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-border, .common-center .post-row .postname .tool li a, .edit-tools a, .center-main.attitude li, .bootstrap-tagsinput .tag, .list_item, .ta_date, .ta_calendar {color: var(--mcmodder-txcolor); background-color: var(--mcmodder-bgcolor); border-radius: 1em; box-shadow: rgba(50, 50, 100, 0.1) 0px 2px 4px 0px; padding: .2em .5em .2em .5em; line-height: unset;} .common-comment-block.lazy {width: unset; margin: 1em;} .common-comment-block .comment-row {padding: 10px 20px 20px 10px;} .tooltip.show {opacity: 1;} .class-info-right {vertical-align: top; display: inline-block; width: 20%;} .header-layer-block a {color: #334;} .header-layer-block li {position: relative;} .header-user:not(.unlogin) li {width: 180px;} .header-layer-block .fa {position: absolute; top: 50%; transform: translate(0, -50%); color: #666;} body .edui-default span.edui-clickable {color: #33f; text-decoration: unset;} body .edui-default .edui-toolbar .edui-button .edui-state-checked .edui-button-wrap, body .edui-default .edui-toolbar .edui-splitbutton .edui-state-checked .edui-splitbutton-body, body .edui-default .edui-toolbar .edui-menubutton .edui-state-checked .edui-menubutton-body, body .edui-default .edui-menu-body .edui-state-hover, body .edui-default .edui-list .edui-state-hover, body .edui-default .edui-toolbar .edui-splitbutton .edui-state-opened .edui-splitbutton-body, body .edui-default .edui-toolbar .edui-menubutton .edui-state-opened .edui-menubutton-body {background-color: var(--mcmodder-tca1); border-color: var(--mcmodder-ta1);} .common-pages .page-item .page-link {background-color: transparent; border-color: #fff8;} .common-pages .page-item.active .page-link, .badge, .center-menu .badge, .author-mods .block .info .badge.badge-mod, .author-mods .block .info .badge.badge-modpack, .center-main.favorite .common-pages .page-item.active .page-link, .center-main.favorite .favorite-fold-list a.active, .center-main.favorite .favorite-slot-menu ol a.active {background-color: var(--mcmodder-tca1); color: var(--mcmodder-td1); border-color: #fff8; text-shadow: 1px 1px 1px #fff8;} .center-main.favorite .favorite-fold-list a.active span {color: inherit;} .modlist-filter-block ul:not(.common-class-category) li.main span, .center-item-popover-b {background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));} .form-control:focus {border-color: var(--mcmodder-tc2); box-shadow: 0 0 0 .2em var(--mcmodder-tcaa2);} .form-control, .bootstrap-tagsinput {background-color: var(--mcmodder-bgcolor);} .fixed-top {position: fixed; top: 50px; width: 100%;} .item-used-frame, .item-search-frame {width: 100%; max-height: 500px; margin-bottom: .5em;} .item-table-block .power_area, .common-center .right .class-relation-list fieldset {border-color: var(--mcmodder-tca1); border-radius: .8em;} .mcmodder-rednum {z-index: 1; position: absolute; top: 4px; left: 25px; padding: 0 4px; min-width: 15px; border-radius: 10px; background-color: #fa5a57; color: #fff; font-size: 12px; line-height: 15px;} .common-center .right .class-info .class-info-right {top: 0; right: .5em; width: 270px;} .common-class-category li .normal, .c_0 {border-radius: 1em;} .badge {line-height: 1.5; border-radius: 1em; font-weight: unset; padding: .25em .8em;} .common-center .right .class-post-frame .post-block, .class-item-type li {width: calc(33.3% - 1.2em); padding: .6em;} .class-item-type li .title {font-size: 16px;} .mcmodder-content-block:hover {background-color: aliceblue;} .dark .mcmodder-content-block:hover {background-color: #012;} .common-center .right .class-info .mcver ul ul li {margin-right: unset;} .mcmodder-golden-alert {background-color: #fe8d; width: 90%; display: inline-block; text-align: center;} .modal-content, footer, .un_links, .under, .row.footer, .page-header, .swal2-popup, .popover {backdrop-filter: blur(20px) brightness(140%); background-color: var(--mcmodder-bgcolor);} .sidebar {background: #3d464daa; backdrop-filter: blur(5px);} .common-center .maintext .item-text {padding-right: 0;} .common-center .item-data {width: 220px;} body .header-container {background-image: linear-gradient(#434c53aa, #3c454caa); backdrop-filter: blur(20px); background-color: transparent;} .btn, .alert, .form-control, .bootstrap-tagsinput {border-radius: 1em; padding: .6em; box-shadow: rgba(50, 50, 100, 0.3) 0px 2px 4px 0px;} .mcmodder-gui-in {position: absolute; right: 0; bottom: -.25em; color: var(--mcmodder-tc1); text-shadow: 2px 2px 1px var(--mcmodder-td1);} .mcmodder-gui-out {position: absolute; right: 0; bottom: -.25em; color: var(--mcmodder-tc2); text-shadow: 2px 2px 1px var(--mcmodder-td2);} .item-list-filter .form-control {border-radius: 1em !important;} .center-task-block {width: 30%;} .center-task-border, .center-card-border {border: unset; margin: unset;} .center-main.favorite .favorite-slot-ul li, .common-user-card .card-userinfo .exp-rate {border-color: transparent; background-color: transparent;} .center-card-view {background-color: var(--mcmodder-bgcolor); margin: 4em 1em;} .center-content.post-list .post-block {padding: .6em;} .center-content.post-list .post-block .info .other .click {display: inline-block; max-width: calc(100% - 3em); overflow: hidden; text-overflow: ellipsis;} .common-center .left .class-rating-block #class-rating {background: unset;} .verify-rowlist, #mcmodder-verify-search, #mcmodder-mod-search, #mcmodder-fetch-version-cf, #mcmodder-fetch-version-mr, #mcmodder-template-title, #mcmodder-template-description, #mcmodder-history-search {text-align: center;} #mcmodder-gotopage {width: 50px; text-align: center; display: inline;} .verify-rowlist li {width: 10em; display: inline-block;} .common-center .item-data {position: relative; z-index: 1; float: right;} .common-text .common-text-menu, .common-center .maintext .quote_text {width: 75%;} .center-total li {width:12.5%} .center-content.post-list .post-block {width: calc(12.5% - 1.2em)} @media(max-width:1200px) {.center-total li {width:25%} .center-content.post-list .post-block {width: calc(33% - 1.2em)}} .common-text .item-info-table table, #mcmodder-version-menu, #block-selector {width: 100%;} .message-main {padding-left: 200px !important;} #mcmodder-editnum, #mcmodder-editbyte {width: 5em; height: 2em; border-radius: .5em; padding: .3em; border: 1px solid var(--mcmodder-tca2); background-color: transparent;} #mcmodder-lv-input {text-align: center; height: 20px; width: 25px; margin-right: 0px; color: yellow; background: transparent; border: none; font-weight: bold; text-shadow: 1px 1px 1px #333;} .class-excount .star .block-left {text-shadow: 2px 2px 2px #333;} .center-block-head .more {right: 2em;} #item-table-item-input {width: 100%; border-top-right-radius: 1em; border-bottom-right-radius: 1em;} .header-right .header-user .header-user-avatar img {border-color: #fff8;} .common-center .class-edit-block {width: unset;} .common-link-frame-style-2 ul li {width: 100%; overflow: initial;} .mcmodder-class-info-fold {width: 100%; color: gray !important; margin: 10px 0;} .common-center .right .class-relation-list .relation li {height: 2em;} .class_block .right .list .no1 .rank i {background: url(/images/index_icon.png) #fff0; background-position: -17px -92px;} .class_block .left .list .name a {background-color: #fff0;} .version-menu {margin-top: 0} #mcmodder-version-menu tbody * {white-space: nowrap; overflow: hidden;} #mcmodder-version-menu td {border: 1px solid var(--mcmodder-tc1);} .logreg-panel .input-group-text {border-radius: 1rem;} .mcmodder-data-frame {overflow: hidden; max-width: 600px; max-height:400px; text-align: left; display: inline-block} .mcmodder-data-frame img {max-height: 135px; max-width: 240px;} #mcmodder-splash-text {width: 100%; height: 300px;} .tooltip .item-info-table {display: inline-block; width: unset; vertical-align: top; margin: 2em 1em 0 0;} .mcmodder-data-frame .quote_text legend {font-size: 12px; color: #777;} .news_block .right .addArea a {background-image: url(https://i.mcmod.cn/editor/upload/20250331/1743434611_179043_ghtQ.png)} .mcmodder-mark-gold {background-color: #fd04; border: 1px solid #fd08;} .mcmodder-mark-aqua {background-color: #8fd4; border: 1px solid #8fd8;} .mcmodder-mark-pink {background-color: #fcc4; border: 1px solid #fcc8;} .mcmodder-mark-greenyellow {background-color: #bf34; border: 1px solid #bf38;} @media(min-width:992px) {.item-text > .item-info-table {display: none;}} @media(max-width:991px) {.common-center .maintext .item-content > .item-data {display: none;}} .common-text .table-scroll {width: auto;} .author-user-frame.hascontent {width: 220px; margin: 0 20px;} .common-center .author-row .author-content {border-radius: 1em; margin-top: 45px;} .table-bordered:not(.item-list-table) td, .table-bordered:not(.item-list-table) th, .table:not(.item-list-table) thead th {border-color: var(--mcmodder-tc1);} pre#mcmodder-text-result {font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;display:block;border:1px solid var(--mcmodder-tca1);color:var(--mcmodder-txcolor);max-height:300px;padding:.25em;font-size:12px;} pre del, #del_num{font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";text-decoration:none;color:#b30000;background:#f333} pre ins, #ins_num{font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";color:#406619;text-decoration:none;background:#3f33} .mcmodder-monospace {font-family: Consolas, monospace;} .class-item-type .mold {position: relative;} .mcmodder-mold-num {position: absolute; right: .3em; bottom: 0; font-style: italic; opacity: .1; font-size: 3em !important;} .waifu .waifu-tips {box-sizing: content-box;} body .edui-default .edui-toolbar .edui-button .edui-icon, body .edui-default .edui-toolbar .edui-menubutton .edui-icon, body .edui-default .edui-toolbar .edui-splitbutton .edui-icon {width: 26px !important;} body .edui-default .edui-toolbar .edui-colorbutton .edui-colorlump {bottom: -1px; left: 4px;} .mcmodder-edui-box {text-align: center; line-height: 1.45;} .mcmodder-edui-arrow {text-align: center; line-height: 2; font-size: .7em;} #item-icon-16x-preview-img {display: inline-block; margin: 10px 0; border: 1px solid #DDD; border-radius: 5px; padding: 2px;} #icon-32x-editor, #icon-128x-editor {width: 50%; display: inline-block; margin-right: 1em;} .info-frame .radio {display: inline-block; margin-right: 1em;} .pages_system .Pbtn, .pages_system .Pbtn_on {background-color: transparent !important;} .verify-list-search-area label span {color: gray; margin-left: 0px;} .item-row .maintext td .item-table-hover {width: initial; display: inline-block;} #mcmodder-crash-protector {margin-left: 10px;} .header-right .header-search form {background-color: var(--mcmodder-bgcolor);} #header-search-input {background-color: transparent;} .verify-list-list td p {max-width: unset;} .verify-list-list .slidetips {display: block;}');
	if (getConfig("tableLeftAlign")) addStyle(".maintext table {margin: unset;} .common-text .figure {display: inline-block; width: unset;} .mcmodder-byte-chart {position: absolute; top: 0px; left: 0px;}");
	$(".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a")
		.addClass("mcmodder-content-block");
	$(".common-nav .line")
		.html('<i class="fa fa-chevron-right" />');
	$(".oredict-ad, .worldgen-list-ad")
		.remove();
	if (getConfig("defaultBackground") != "none") $("body")
		.filter((e, t) => $(t)
			.css("background-image") === "none")
		.css({
			background: `url(${getConfig("defaultBackground")||"https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg"}) fixed`,
			"background-size": "100%"
		});
	nightStyle += ".col-lg-12.common-rowlist-2 .title {color: #ccc;}";
	$(`<div class="mcmodder-profile">${$(".header-user-avatar").html()}<p>${$(".header-user-name").text()}</p></div>`)
		.insertBefore(".header-user .header-layer-block:first-child()");
	const i = {
		"后台管理": "fa fa-university",
		"文件管理": "fa fa-upload",
		"社群管理": "fa fa-university",
		"我的收藏": "fa fa-star",
		"待审列表": "fa fa-mortar-board",
		"用户等级": "fa fa-line-chart",
		"短评动态": "fa fa-bell",
		"成就进度": "fa fa-calendar-check-o",
		"物品背包": "fa fa-suitcase",
		"设置中心": "fa fa-gear",
		"退出登录": "fa fa-sign-out",
		"社群主页": "fa fa-home",
		"修改信息": "fa fa-gear",
		"我的主题": "fa fa-file-text",
		"我的回复": "fa fa-reply-all",
		"社群积分": "fa fa-bar-chart",
		"社群等级": "fa fa-line-chart",
		"社群任务": "fa fa-calendar-check-o",
		"社群勋章": "fa fa-trophy"
	};
	$(".header-user .header-layer-block li a")
		.each((e, t) => {
			$(t)
				.replaceWith(`<a${$(t).text()==="退出登录"?' id="common-logout-btn"':" href="+t.href+' target="_blank"'}><i class="${i[$(t).text()]}" style="left: .5em;"/>${$(t).text()}<i class="fa fa-chevron-right" style="right: .5em;"/></a>`)
		});
	let t = parseInt($(".header-user-msg b")
		.text());
	$(".header-user-msg")
		.remove();
	$(`<div class="mcmodder-rednum">${t}</div>`)
		.hide()
		.appendTo(".header-user-avatar");
	$(`<div class="mcmodder-rednum">${t}</div>`)
		.hide()
		.insertAfter(".header-layer .fa-bell");
	$(".header-layer .fa-bell")
		.parent()
		.click(() => $(".mcmodder-rednum")
			.hide());
	if (t) {
		$(".mcmodder-rednum")
			.text(t)
			.show();
		$(".header-layer .fa-bell")
			.parent()
			.attr("href", "https://www.mcmod.cn/message/")
	}
	let o = $(".text-area.common-text, .item-content.common-text, .post-row");
	o.find("*")
		.filter((e, t) => $(t)
			.css("background-color") === "rgb(255, 255, 255)")
		.css({
			"background-color": "unset"
		});
	o.find("span")
		.filter((e, t) => $(t)
			.css("color") === "rgb(0, 0, 0)")
		.css({
			color: "unset"
		});
	window.compareOnload = false;
	window.isNightMode = getConfig("nightMode");
	window.isInvisible = getConfig("invisibility");
	window.enableNightMode = function() {
		addStyle(nightStyle, "mcmodder-night-controller");
		classRatingChart?.setOption({
			backgroundColor: "#1118",
			axisPointer: [{
				lineStyle: {
					color: "#444"
				}
			}],
			tooltip: [{
				backgroundColor: "#222",
				shadowColor: "#fff2",
				textStyle: {
					color: "#ddd"
				}
			}]
		});
		centerEditChart?.setOption({
			tooltip: [{
				backgroundColor: "#222"
			}],
			calendar: [{
				dayLabel: {
					color: "#fff"
				},
				yearLabel: {
					color: "#ee6"
				},
				monthLabel: {
					color: "#fff"
				},
				itemStyle: {
					color: "#3330",
					borderColor: "#444"
				}
			}]
		});
		$("html")
			.addClass("dark");
		ueditorFrame.forEach(e => {
			addStyle(nightStyle, "mcmodder-night-controller", e);
			$("html", e)
				.addClass("dark")
		})
	};
	window.disableNightMode = function() {
		$("#mcmodder-night-controller")
			.remove();
		classRatingChart?.setOption({
			backgroundColor: "#fff8",
			axisPointer: [{
				lineStyle: {
					color: "#B9BEC9"
				}
			}],
			tooltip: []
		});
		centerEditChart?.setOption({
			tooltip: [{
				backgroundColor: "#fff"
			}],
			calendar: [{
				dayLabel: {
					color: "#000"
				},
				yearLabel: {
					color: "#aaa"
				},
				monthLabel: {
					color: "#000"
				},
				itemStyle: {
					color: "#fff0",
					borderColor: "#bbb"
				}
			}]
		});
		$("html")
			.removeClass("dark");
		ueditorFrame.forEach(e => {
			$("#mcmodder-night-controller", e)
				.remove();
			$("html", e)
				.removeClass("dark")
		})
	};
	window.switchNightMode = function() {
		if (isNightMode) {
			$("#mcmodder-night-controller")
				.remove();
			$("#mcmodder-night-switch i")
				.css({
					"text-shadow": "0px 0px 5px gold"
				});
			disableNightMode();
			setConfig("nightMode", false)
		} else {
			$("#mcmodder-night-switch i")
				.css({
					"text-shadow": "unset"
				});
			enableNightMode();
			setConfig("nightMode", true)
		}
		isNightMode = !isNightMode
	};
	window.switchInvisibility = function() {
		if (isInvisible) {
			$.cookie("_uuid", getConfig("user_uuid"), {
				expires: 30,
				path: "/",
				domain: ".mcmod.cn"
			});
			$("#mcmodder-invisibility i")
				.css({
					"text-shadow": "unset"
				});
			$(".header-user-avatar img")
				.css({
					filter: "unset"
				});
			setConfig("invisibility", false)
		} else {
			setConfig("user_uuid", $.cookie("_uuid"));
			$.cookie("_uuid", null, {
				path: "/",
				domain: ".mcmod.cn"
			});
			$("#mcmodder-invisibility i")
				.css({
					"text-shadow": "0px 0px 5px aqua"
				});
			$(".header-user-avatar img")
				.css({
					filter: "grayscale(100%)"
				});
			setConfig("invisibility", true)
		}
		isInvisible = !isInvisible
	};
	isNightMode ? enableNightMode() : disableNightMode();
	$(".header-container .header-search, .top-right")
		.append('<button id="mcmodder-night-switch" data-toggle="tooltip" data-original-title="夜间模式"><i class="fa fa-lightbulb-o"></i></button>')
		.find("#mcmodder-night-switch")
		.click(switchNightMode);
	$(".header-container .header-search")
		.append('<button id="mcmodder-invisibility" data-toggle="tooltip" data-original-title="隐身模式"><i class="fa fa-low-vision"></i></button>')
		.find("#mcmodder-invisibility")
		.click(switchInvisibility);
	if (!isNightMode) $("#mcmodder-night-switch i")
		.css({
			"text-shadow": "0px 0px 5px gold"
		});
	if (isInvisible) $("#mcmodder-invisibility i")
		.css({
			"text-shadow": "0px 0px 5px aqua"
		});
	generalEditorObserver.observe(document.body, {
		childList: true,
		subtree: true
	});
	if (!getConfig("templateList") || !JSON.parse(getConfig("templateList") || "[]")?.length) setConfig("templateList", JSON.stringify([{
		id: "general_armor",
		title: "套装/盔甲/铠甲/XX套",
		description: "适用于将“头盔”、“胸甲”、“护腿”、“靴子”综合到同一个父资料中一起介绍时使用。",
		content: '<p><br/></p><table width="435"><tbody><tr><th style="word-break: break-all;" valign="top" align="center">装备部位<br/></th><th style="word-break: break-all;" valign="top" align="center">提供盔甲值<br/></th><th style="word-break: break-all;" valign="top" align="center">提供盔甲韧性<br/></th><th style="word-break: break-all;">特殊属性<br/></th></tr><tr><td style="word-break: break-all;" valign="middle" align="center">头盔</td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">胸甲<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">护腿<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">靴子<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr></tbody></table>'
	}]));
	setInterval(() => {
		$(".mcmodder-timer")
			.each((e, t) => {
				$(t)
					.text(timeFormatter(parseInt(getConfig($(t)
						.attr("data-source"), "scheduledEvent")) - Date.now()))
			})
	}, 1e3);
	if (e.includes("/item/tab/") && !e.includes(".html")) setTimeout(tabInit, 1e3);
	if (e.includes("/class/edit/") || e.includes("/modpack/edit/") || e.includes("/sandbox/") || e.includes("/post/edit/") || e.includes("/author/edit/")) editorLoad();
	if (e.includes("/item/edit/") || e.includes("/item/add/")) itemEditorInit();
	if (e.includes("/class/edit/") || e.includes("/class/add/")) setTimeout(classEditorInit, 1e3);
	if (e.includes("/item/") && e.includes(".html") && !e.includes("/diff/") && !e.includes("/list/")) itemInit();
	if (e.includes("/post/") && e.includes(".html")) postInit();
	if (e.includes("/item/list/")) itemListInit();
	if (e.includes("/oredict/")) oredictPageInit();
	if (e.includes("/history.html") || e.includes("/history/")) historyInit();
	if (e.includes("/verify.html")) verifyHistoryInit();
	if (e.includes("/queue.html")) queueInit();
	if (e.includes("/class/add/")) classAddInit();
	if (e.includes("/version/add") || e.includes("/version/edit")) versionInit();
	else if (e.includes("/class/version/")) versionListInit();
	if (/class\/[0-9]*\.html/.test(e) || /modpack\/[0-9]*\.html/.test(e)) classInit();
	if (e.includes("/diff/") && !e.includes("/list/")) diffInit();
	if (e.includes("/rank.html") && getConfig("advancedRanklist")) rankInit();
	if (e.includes("/class/") || e.includes("/author/")) setTimeout(commentInit, 1e3);
	if (e.includes("center.mcmod.cn")) centerInit();
	if (e.includes("admin.mcmod.cn")) adminInit();
	if (e.includes("www.mcmod.cn/mcmodder/structureeditor/")) structureEditorInit();
	if (e.includes("www.mcmod.cn") && !e.includes("tools/cbcreator") && getConfig("enableLive2D")) {
		$('<div class="waifu"><div class="waifu-tips" style="opacity: 0;"></div><canvas id="live2d" width="220" height="260" class="live2d"></canvas><ul class="waifu-tool"><li name="menu" page="pageHome" class="active"><span data-original-title="返回主页" data-toggle="tooltip" class="fui-home"></span></li><li><span data-original-title="赶走" data-toggle="tooltip" class="fui-cross"></span></li></ul></div>')
			.prependTo("body");
		$('<link rel="stylesheet" type="text/css" href="//www.mcmod.cn/live2d/waifu.css">')
			.appendTo("head");
		$('<script src="//www.mcmod.cn/live2d/waifu-tips.js" /><script src="//www.mcmod.cn/live2d/live2d.js" /><script type="text/javascript">initModel("//www.mcmod.cn/live2d/")<\/script>')
			.appendTo("body");
		$(document)
			.on("click", ".waifu-tool .fui-cross", function() {
				$.cookie("mcmodgirl_hide", null, {
					path: "/"
				});
				setConfig("enableLive2D", false)
			})
	}
	$(".common-background")
		.remove();
	$("#key")
		.css({
			color: "var(--mcmodder-txcolor)"
		});
	updateItemTooltip();
	$("title")
		.html($("title")
			.html()
			.replace(" - MC百科|最大的Minecraft中文MOD百科", ""));
	$(".copyleft")
		.last()
		.append(`<br>☆ MCMODDER v${mcmodderVersion} ☆ ——MC百科编审辅助工具`);
	$(".sidebar-plan .space")
		.last()
		.append(`<br>mcmodder-v${mcmodderVersion}`)
})();
