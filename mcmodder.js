// ==UserScript==
// @name         Mcmodder
// @namespace    http://www.mcmod.cn/
// @version      1.2.1
// @description  MC百科编审辅助工具
// @author       charcoalblack__
// @license      AGPL-3.0
// @match        https://*.mcmod.cn/*
// @exclude      https://bbs.mcmod.cn/*
// @exclude      https://www.mcmod.cn/modpack/*
// @exclude      https://play.mcmod.cn/
// @exclude      https://www.mcmod.cn/tools/*/*
// @run-at       document-end
// @iconURL      https://www.mcmod.cn/static/public/images/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
GM_registerMenuCommand("打开设置", setting);
const mcmodderVersion = "1.2.1";
const settingList = [{
	id: "mcmodder-theme-color-1",
	todo: "themeColor1",
	title: "主题样式颜色1",
	description: "插件主题样式颜色1。（默认：#86c155）",
	type: 3,
	value: "#86c155"
}, {
	id: "mcmodder-theme-color-2",
	todo: "themeColor2",
	title: "主题样式颜色2",
	description: "插件主题样式颜色2。（默认：#58b6d8）",
	type: 3,
	value: "#58b6d8"
}, {
	id: "mcmodder-theme-color-3",
	todo: "themeColor3",
	title: "主题样式颜色3",
	description: "插件主题样式颜色3。（默认：#ff3030）",
	type: 3,
	value: "#ff3030"
}, {
	id: "mcmodder-update-check",
	todo: "autoCheckUpdate",
	title: "自动检查更新",
	description: "每隔一段时间自动检查更新，并在有新更新可用时提醒。",
	type: 0
}, {
	id: "mcmodder-disable-gradient",
	todo: "disableGradient",
	title: "禁用文字渐变",
	description: "如果安装此插件后页面文字出现异常色块，则请勾选此项。",
	type: 0
}, {
	id: "mcmodder-force-v4",
	todo: "forceV4",
	title: "强制v4",
	description: "打开百科任意非v4主页时，自动跳转到v4主页。",
	type: 0
}, {
	id: "mcmodder-splash-tracker",
	todo: "enableSplashTracker",
	title: "闪烁标语追踪器",
	description: "打开百科任意主页时，自动记录页面所弹出的<del>重生骚话语录</del>闪烁标语。",
	type: 0
}, {
	id: "mcmodder-enable-april-fools",
	todo: "enableAprilFools",
	title: "愚人节特性",
	description: "允许百科愚人节彩蛋在任意日期触发。",
	type: 0
}, {
	id: "mcmodder-auto-checkin",
	todo: "autoCheckin",
	title: "自动签到",
	description: "每日首次访问百科，或是本机时间为 00:00:00 时，自动执行签到操作。",
	type: 0
}, {
	id: "mcmodder-default-background",
	todo: "defaultBackground",
	title: "默认背景",
	description: "输入一个图片链接 URL。若当前页面没有设置背景，则自动使用此背景。",
	type: 2,
	value: "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg"
}, {
	id: "mcmodder-background-alpha",
	todo: "backgroundAlpha",
	title: "背景透明度",
	description: "输入一个范围在 128 ~ 255 之内的值，用于控制背景透明度，数值越小透明度越高。（默认：204）",
	type: 2,
	value: 204
}, {
	id: "mcmodder-editor-auto-resize",
	todo: "editorAutoResize",
	title: "编辑器尺寸自适应",
	description: "使编辑器的长度随正文内容，宽度随窗口尺寸自动调整。",
	type: 0
}, {
	id: "mcmodder-item-detail",
	todo: "tabSelectorInfo",
	title: "物品搜索详情",
	description: "在合成表编辑界面中搜索物品时，显示每个物品的详细信息，并将属于当前模组（包括前置和拓展模组）的物品置顶。",
	type: 0
}, {
	id: "mcmodder-editor-stats",
	todo: "editorStats",
	title: "编辑量实时统计",
	description: "实时显示编辑器中的有效正文字节数和字节变动量。不保证 100% 精确，且除正文改动外的其他操作也可能会影响最终的字节变动量。",
	type: 0
}, {
	id: "mcmodder-autoclose-swal",
	todo: "autoCloseSwal",
	title: "渐入佳境",
	description: "成功提交审核后不再强制跳转至待审列表页面。对免审编辑无效。",
	type: 0
}, {
	id: "mcmodder-latex",
	todo: "latexEditor",
	title: "LaTeX 编辑器",
	description: '(WIP) 基于 <a href="https://www.mathjax.org">MathJax</a> 的 MC 百科编辑器 LaTeX 渲染功能。使用一对美元符号 "$" 括起编辑器中的 LaTeX 代码后，轻触编辑器菜单中的“转换”按钮即可。',
	type: 0
}, {
	id: "mcmodder-markdown",
	todo: "markdownIt",
	title: "编辑器 Markdown 支持",
	description: "(Beta!) 在编辑器中实现一键 Markdown→HTML 转换。",
	type: 0
}, {
	id: "mcmodder-version-helper",
	todo: "versionHelper",
	title: "日志智能管理",
	description: "允许从其他网站获取模组版本列表，并支持一键补充缺失的日志。支持 CurseForge 和 Modrinth 双平台。",
	type: 0
}, {
	id: "mcmodder-subscribe-modlist",
	todo: "subscribeModlist",
	title: "关注模组列表",
	description: "(WIP) 在历史编辑记录页面中置顶并高亮所关注模组的相关记录。请注意合成表编辑等记录中不会直接显示所属模组，要想启用此特性，您可能需要在关注此模组后打开一次本模组的资料列表以根据物品 ID 匹配模组。输入要关注的模组 ID，多个 ID 间用半角逗号隔开。",
	type: 2
}, {
	id: "mcmodder-compacted-child",
	todo: "compactedChild",
	title: "紧凑化综合子资料",
	description: "减少每个综合子资料所占用的页面空间。",
	type: 0
}, {
	id: "mcmodder-compacted-tablist",
	todo: "compactedTablist",
	title: "紧凑化合成表",
	description: '减少每个合成表所占用的页面空间，同时使用物品小图标替代材料统计中的物品名称，以及显示合成表 ID！本机安装字体 <a href="https://ftp.gnu.org/gnu/unifont/" target="_blank">Unifont</a> 后食用风味更佳。',
	type: 0
}, {
	id: "mcmodder-advanced-ranklist",
	todo: "advancedRanklist",
	title: "加强版贡献榜",
	description: "让贡献榜中各用户的昵称、排名、编辑量、编辑占比一目了然！",
	type: 0
}, {
	id: "mcmodder-max-byte-color-value",
	todo: "maxByteColorValue",
	title: "字数活跃图表最大有效值",
	description: "决定字数活跃图表的总体颜色深度。（默认：30,000）",
	type: 2,
	value: 3e4
}, {
	id: "mcmodder-freeze-advancements",
	todo: "freezeAdvancements",
	title: "冻结进度",
	description: "使窗口右上角弹出的进度框不再自动消失。快截图留念吧！",
	type: 0
}, {
	id: "mcmodder-unlock-comment",
	todo: "unlockComment",
	title: "无限制留言板",
	description: "强行显示目标用户留言板，或是模组/作者的短评区，即使其已受天体运动影响而关闭。请勿滥用，除非你想见到重生亲手把这个特性毙掉。",
	type: 0
}, {
	id: "mcmodder-ignore-empty-line",
	todo: "ignoreEmptyLine",
	title: "忽略短评空白行",
	description: "隐藏短评正文中的空白行。",
	type: 0
}, {
	id: "mcmodder-reply-link",
	todo: "replyLink",
	title: "楼中楼跳转链接",
	description: "轻触短评楼中楼里出现的链接来快捷访问。该功能可能无法正确识别后文紧随其他文字的链接。",
	type: 0
}, {
	id: "mcmodder-missile-alert",
	todo: "missileAlert",
	title: "核弹警告",
	description: "当短评长度超过特定值时，弹出核弹警告。",
	type: 0
}, {
	id: "mcmodder-missile-alert-height",
	todo: "missileAlertHeight",
	title: "核弹触发最短长度",
	description: "设置核弹警告触发所需的短评长度下限，单位为 px。（默认：1,000）",
	type: 2,
	value: 1e3
}, {
	id: "mcmodder-comment-expand-height",
	todo: "commentExpandHeight",
	title: "短评折叠最短长度",
	description: "设置短评被折叠时所显示的长度，单位为 px。（默认：300）",
	type: 2,
	value: 300
}, {
	id: "mcmodder-user-blacklist",
	todo: "userBlacklist",
	title: "用户黑名单",
	description: "自动屏蔽所选定用户发布的短评和回复。输入要屏蔽的用户 UID，多个 UID 间用半角逗号隔开。",
	type: 2
}, {
	id: "mcmodder-verify-delay",
	todo: "autoVerifyDelay",
	title: "自动查询待审项",
	description: "设置相邻两次自动查询待审项的最短冷却时间，单位为小时，设置为小于 0.01 以禁用。若启用，则当打开百科页面时，自动查询所管理模组的待审项，并弹出提示消息。由于一些限制，该特性只能在百科后台页面触发。（默认：0）",
	type: 2,
	value: 0
}, {
	id: "mcmodder-fast-urge",
	todo: "fastUrge",
	title: "快速催审",
	description: "在待审列表中显示“一键催审”按钮。",
	type: 0
}];
const loadingColorful = '<img src="/static/public/images/loading-colourful.gif"></img>';

function setting() {
	window.open("https://center.mcmod.cn/#/setting/")
}
window.getConfig = function(t, e = "mcmodderSettings") {
	if (!GM_getValue(e)) GM_setValue(e, "{}");
	let i = JSON.parse(GM_getValue(e))[t];
	if (!i) settingList.forEach(e => {
		if (e.todo === t) return e.value || ""
	});
	switch (i) {
		case "true":
			return true;
		case "false":
			return false;
		default:
			return i
	}
	return ""
};
window.setConfig = function(e, t, i = "mcmodderSettings") {
	if (!GM_getValue(i)) GM_setValue("mcmodderSettings", "{}");
	let o = JSON.parse(GM_getValue(i));
	o[e] = t;
	GM_setValue(i, JSON.stringify(o))
};
let nightStyle = ":root {--mcmodder-bgcolor: rgba(17,17,17," + Math.max(Math.min(parseInt(getConfig("backgroundAlpha") || 204), 255), 128) / 255 + "); --mcmodder-txcolor: #ddd;} html, body, pre, code {color: var(--mcmodder-txcolor);} .edui-default .edui-editor-toolbarboxinner {} .edui-default .edui-editor-toolbarboxouter { background-color: #050505 !important; background-image: linear-gradient(to bottom,#555,#777) !important;} .common-center .right .tab-content ul.tab-ul p.title, .common-link-frame .title, .center-block-head .title, .center-content.admin-list .title, .center-sub-menu a:hover, .center-content.edit-chart-frame .title-main, .author-mods .title, .author-member .title, .author-partner .title, .page-header .title, .panel-title, .page-header .title, thead {color: #ee6;} .common-center .right .tab-content li.tab-li .tips { color: #aaf;}.common-center .right .tab-content li.tab-li .tips.red, .common-center .right .tab-content li.tab-li .tips.red a { color: #faf;}.form-control, input {border-color: #333; box-shadow: inset 0px 1px 0px #111;} .edui-default .edui-default .edui-menu-body .state-hover { background: #d6d;} .arrow, .comment-row .comment-tools .comment-attitude-list .comment-attitude-list-hover ul, .dropdown-menu, .center-task-block .icon, .edui-default .edui-toolbar .edui-combox .edui-combox-body, .edui-default .edui-popup, .edui-default .edui-popup-content, .edui-default .edui-dialog-shadow, .modal-content, .header-search form, .searchbox, .radio label::before, .checkbox label::before, .popover-header { background: var(--mcmodder-bgcolor) !important; border-color: #444; color: #ddd;} common-menu-page li, .bootstrap-tagsinput .tag {border-color: #444;} .bootstrap-tagsinput { background-color: #000; border-color: #333;} .common-menu-page li, .comment-quote-block, .comment-skip-block .common-text table th, th, .common-class-category li .normal.gray { background-color: #111; border-color: #333;}.common-nav li, .common-nav a, p {color: #bbb;} a { color: #6bf;}.alert-primary { color: #b8daff; background-color: #226; border-color: #224;} .alert-warning {border-color: #660; background-color: #330} .item-category li, .common-text table th, .center-content.post-list .post-block .cover img, .center-card-view { background-color: var(--mcmodder-bgcolor); border-color: #333;} .form-control ::selection, .item-table-block .text, .edui-default .edui-editor { background-color: #000;} .selectTdClass { background-color: #07122d !important;} td, th, .news_block .left .block img, .edui-default .edui-dialog-titlebar { border-color: #333 !important;} .history-list-frame li, .common-comment-block .comment-row { border-bottom-color: #333; } .topic_block .dec a, .right a.class{ color: #fff; } div, ul, li, .chart_block .list li a, .news_block .left .name a,  .class_block .left .list .name a, .class_block .right .list a, .post_block .list li .postTitle a, .card_block ul li a, .dropdown-item, .common-nav a.home, input, .common-comment-block .comment-title, .common-fuc-group span, .checkbox label::after { color: var(--mcmodder-txcolor); text-shadow: 1px 1px 1px #f0f8ff40 } .class_block .title a { color: #dd6; } .pages_system .Pbtn, .pages_system .Pbtn_on { background-color: #000 !important; } .class_block .left .list .frame, .common-text-title-1, hr, .table-bordered > thead > tr > th, .table-bordered > tbody > tr > th, .table-bordered > tfoot > tr > th, .table-bordered > thead > tr > td, .table-bordered > tbody > tr > td, .table-bordered > tfoot > tr > td, .panel, .center-card-block.background .center-card-border, .center-card-block.badges .center-card-border, .center-card-block.tracker .center-card-border.rank-1 { border-color: #333; } .class_block .left .list .items { border-top-color: #333; }  .news_block .right .editor, .bd-callout, .webui-popover-title { border-color: #222; } .news_block .right .editor ul a { color: #88f; } .progress { background-color: #e9ecef55; } .common-comment-block .comment-row-username a { color: #938a82; } .rank-head-frame fieldset, .history-list-head fieldset, .common-fuc-group li, .table-bordered td, .table-bordered th, .table thead th, .common-center .maintext .quote_text { border-color: #555; } .common-pages .page-item .page-link, .common-class-category li .normal.gray, .badge-light { background-color: #333; color: #fff; } .page-link, .verify-list-list-head fieldset { border-color: #777; } .class-excount .infos, exp-rate text-muted, .class_block .left .list .name, .class_block .right .list, .common-user-card .card-container .tracker-frame .block .item, .modlist-filter-block ul:not(.common-class-category) li.main a, .common-fuc-group .action, .center-main.favorite .favorite-fold-list a, .news_block .right .count, .center-main.favorite .favorite-slot-menu ol a, .popover, .main .nav ul li, .edui-popup-content, .item-table-block .title, .webui-popover-title, .page-header {background-color: var(--mcmodder-bgcolor);} .form-control:disabled, .form-control[readonly] {background-color: #222;} .common-center .right .class-info .col-lg-4, .content, .common-center .left .class-rating-submit, .common-center .right .class-info .class-info-left .tag, .common-center .right .class-info .class-info-left .tag a, .rank-list-block .title b, .common-rowlist-2 li, .common-center .maintext .item-jump p, .edit-autolink-frame .tips, .center-content.edit-chart-frame .title-sub, .comment-quote-block, .comment-skip-block {color: #aaa;} .class-excount .infos .span .n, h1, h2, h3, h4, h5, h6, .center-sub-menu a, .rank-list-block a, .common-menu-page a, .common-text p, .list_block .menu li a, .verify-list-list td a.text-muted, .az_block .menu li, .az_block .list li a, .swal2-popup .swal2-title, .star_block .list li a, .list_block .list li a, .item-category a, .common-icon-text a, .dropdown-menu > li > a, .sidebar-open-button, .sidepanel-open-button, .searchbutton, .top-right .profilebox .col-lg-12.common-rowlist-2 .title, .center-total li .title, .class-info-left .col-lg-6 .title, .common-text .common-text-menu li a span, .class-item-type li .content, .common-center .class-edit-block li a, .worldgen-list li p.name a, .class_block .left .list .name a, .modlist-block .title p, .modlist-block .title a , .modlist-filter-block ul:not(.common-class-category) li.main a, .header-search #header-search-submit, .common-center .right .class-relation-list legend {color: var(--mcmodder-txcolor);} .center-main.favorite .favorite-slot-ul li {border-color: #000} .header-layer, .webui-popover-inner {background-color: #000 !important; border-color: #111 !important; box-shadow: 1px 1px 4px #222 !important;} .edit-autolink-list li:not(.empty):not(.limit):hover, .modlist-filter-block ul:not(.common-class-category) li.main a:hover {background-color: #445} .center-content.item-list li.rank_1 {border-color: #222; background-color: #000; background-image: radial-gradient(at 60px 50px, #222 20%, #111);} .edui-default .edui-toolbar .edui-button .edui-state-hover .edui-button-wrap {background-color: #499 !important; border-color: #6cc !important;} .radio label::after {background-color: #ddd} .uknowtoomuch {text-shadow: 0px 0px !important;} #top {background-color: #135;} .header-layer-block a {color: #aac;} .mcmodder-golden-alert {background-color: #552d;}";
let classRatingChart, centerEditChart;
try {
	classRatingChart = echarts.getInstanceById($("#class-rating")
		.attr("_echarts_instance_"));
	centerEditChart = echarts.getInstanceById($("#center-editchart-obj")
		.attr("_echarts_instance_"))
} catch (e) {}
let ueditorFrame = [];
const generalEditorObserver = new MutationObserver(function(t, e) {
	for (let e of t) {
		if (e.target.id === "edui1_iframeholder" && e.addedNodes.length) {
			setTimeout(() => {
				ueditorFrame.push($("#ueditor_0")[0].contentDocument);
				if (isNightMode) ueditorFrame.forEach(e => {
					addStyle(nightStyle, "mcmodder-night-controller", e);
					$("html", e)
						.addClass("dark")
				})
			}, 300);
			generalEditorObserver.disconnect()
		}
	}
});
generalEditorObserver.observe(document.body, {
	childList: true,
	subtree: true
});

function addStyle(e, t = "", i = document) {
	let o = $("head", i)[0].appendChild(document.createElement("style"));
	$(o)
		.attr("type", "text/css")
		.html(e);
	if (t) o.id = t
}

function addScript(e, t) {
	let i = document.createElement("script");
	i.type = "text/JavaScript";
	i.innerHTML = t;
	e.appendChild(i)
}
let getStartTime = (e, t = 1) => new Date(e.setHours(0, 0, 0, 0))
	.getTime() + 24 * 60 * 60 * 1e3 * t;

function customStyle() {
	let e = (e, t) => {
		let i = parseInt(e.slice(1), 16);
		let o = t * 255;
		let a = (i >> 16) - o;
		let n = ((i & 65280) >> 8) - o;
		let r = (i & 255) - o;
		return "#" + (0 | Math.max(Math.min(a, 255), 0) << 16 | Math.max(Math.min(n, 255), 0) << 8 | Math.max(Math.min(r, 255), 0))
			.toString(16)
			.padStart(6, "0")
	};
	let t = getConfig("themeColor1") || "#86c155",
		i = getConfig("themeColor2") || "#58b6d8",
		o = getConfig("themeColor3") || "#ff3030",
		a = e(t, .2),
		n = e(i, .2),
		r = t + "80",
		l = i + "80",
		d = a + "80",
		c = n + "80";
	addStyle(":root {--mcmodder-tc1:" + t + "; --mcmodder-tc2:" + i + "; --mcmodder-tc3:" + o + "; --mcmodder-td1:" + a + "; --mcmodder-td2:" + n + "; --mcmodder-tca1:" + r + "; --mcmodder-tca2:" + l + "; --mcmodder-tda1:" + d + "; --mcmodder-tda2:" + c + "; --mcmodder-bgcolor: rgba(255,255,255," + Math.max(Math.min(parseInt(getConfig("backgroundAlpha") || 204), 255), 128) / 255 + "); --mcmodder-txcolor: #333; --mcmodder-platform-forge: #5b6197; --mcmodder-platform-fabric: #8a7b71; --mcmodder-platform-neoforge: #dc895c; --mcmodder-platform-quilt: #8b61b4; --mcmodder-platform-liteloader: #4c90de;}");
	addStyle(".form-control {width:100%;box-sizing:border-box;padding:4px;color:var(--mcmodder-txcolor);}  .form-control::placeholder{color:#999}  .item-id{margin-right:2px;border-radius:5px;font-size:12px;font-weight:unset;}  .item-ename{font-size:12px;color:#999;}  .item-modabbr{font-size:12px;color:#555;}  .btn {background:linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));}  .btn-dark, .dropdown-item.active {background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));}  .btn-outline-dark {border-color:var(--mcmodder-tda1)}  .mcmodder-task-tip { width:320px; height:85px; position:fixed; right:0; top:-50px; z-index:1000; background-color:#212121; border:4px solid #555; box-shadow:0 0 0 1px #000; border-radius:6px}.mcmodder-task-tip .icon { width:48px; height:48px; margin:5px 0 0 5px; border:1px solid #DDD; border-radius:10px; text-align:center; float:left}.mcmodder-task-tip .icon img { width:32px; height:32px; margin-top:8px}.mcmodder-task-tip .info { width:100%; padding-left:60px; position:absolute}.mcmodder-task-tip .info .title { line-height:25px; font-size:14px; font-weight:bold; color:#fafa00}.mcmodder-task-tip .info .text,.mcmodder-task-tip .info .time { line-height:20px; font-size:12px; color:#FFF}.mcmodder-task-tip .info .time { position:absolute; left:10px; bottom:0}.mcmodder-task-tip .info .range { margin-top:10px; line-height:20px; margin-right:5px; font-size:12px; color:#FFF; text-align:right} #mcmodder-night-switch, #mcmodder-invisibility {line-height: 30px;border: 0;background-color: transparent;color: #d8d8d8;cursor: url(//www.mcmod.cn/images/cursor/hand.png),auto;display: inline-block;} #mcmodder-night-switch:focus, #mcmodder-invisibility:focus {outline: none;} * {transition: color .3s ease-in-out, background-color .3s ease-in-out, border-color .3s ease-in-out;} .common-template-frame li p {line-height: unset;} .common-template-frame li {width: 100%; position: relative;} .center-setting-block .form-control[type=color] {width: 4em;}");
	if (!getConfig("disableGradient")) addStyle("  .mcmodder-common-light{background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;}  .mcmodder-slim-light{background:linear-gradient(45deg,var(--mcmodder-tc1),var(--mcmodder-tc2));background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;}  .mcmodder-common-dark{background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;}  .mcmodder-slim-dark{background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;}  .mcmodder-common-danger{background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);background-clip:text;color:transparent;font-weight:bold;text-shadow:1px 1px 1px #8884;}  .mcmodder-slim-danger{background:linear-gradient(45deg,var(--mcmodder-tc3),#f99779);background-clip:text;color:transparent;text-shadow:1px 1px 1px #8884;}  .mcmodder-chroma{color: transparent; background: linear-gradient(45deg,red,orange,green,purple,red); background-clip: text;text-shadow:1px 1px 1px #8884;}  ");
	else addStyle("  .mcmodder-common-light{color:var(--mcmodder-tc2);font-weight:bold;}  .mcmodder-slim-light{color:var(--mcmodder-tc1);}  .mcmodder-common-dark{color:var(--mcmodder-td2);font-weight:bold;}  .mcmodder-slim-dark{color:var(--mcmodder-td1);}  .mcmodder-common-danger{color:var(--mcmodder-tc3);font-weight:bold;}  .mcmodder-slim-danger{color:var(--mcmodder-tc3);font-weight:bold;}  .mcmodder-chroma{color: red;}  ");
	let s = $("head")[0].appendChild(document.createElement("script"));
	s.setAttribute("type", "text/javascript");
	s.innerHTML = 'currentUsername = $(".header-user-name")[0]?.childNodes[0]?.innerHTML || "";  currentUid = ($(".header-user-name a")[0] || $(".name.top-username a")[0])?.href?.split("//center.mcmod.cn/")[1]?.split("/")[0] || "0";  expReq = [0,20,20,200,240,480,960,1728,2918,4597,6698,8930,10716,11252,9752,5851,6437,7080,7787,8567,9423,10366,11402,12543,13796,15177,16694,18363,20200,22219,24442,2147000000];  autoLinkIndex = 1; originalContextLength = 0; contextLength = 0;  itemSearchCooldown = false;  async function AsyncItemSearch (s) {    if (itemSearchCooldown) return null;    itemSearchCooldown = true;    setTimeout(() => {itemSearchCooldown = false}, 3e2);    asyncItem = {      id: 0,      name: "",      englishName: "",      type: "",      modName: "",      modEnglishName: "",      modAbbreviation: ""    };    asyncResponse = await fetch("https://www.mcmod.cn/object/UEAutolink/", {      method: "POST",      headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},      body: "classID=0&key=" + s    });    asyncData = await asyncResponse.text();    raw = asyncData.split(\'<a title=\')[1].split(" - ");    asyncItem.type = raw[0];    asyncItem.id = raw[1].slice(3).split(" ")[0];    asyncItem.name = raw[1].slice(4 + asyncItem.id.length).split(" (")[0];    if (raw[1].includes("(")) asyncItem.englishName = raw[1].split("(")[1].split(")")[0];    if (raw[2].includes("]")) asyncItem.modAbbreviation = raw[2].slice(1).split("]")[0];    if (raw[2].includes("]")) asyncItem.modName = raw[2].split("]")[1].split("\\"")[0].split("(")[0];    else asyncItem.modName = raw[2].split("\\"")[0].split(" (")[0];    if (raw[2].includes("(")) asyncItem.modEnglishName = raw[2].split("(")[1].split(")")[0];  };  function itemSearch(s) {    AsyncItemSearch(s);    return asyncItem;  };  function toChinese(s) {    let chineseStr = "";    for (i = 0; i < s.length;) {      const unicode = s.substr(i, 6);      if (unicode.substr(0, 2) === "\\\\u") {chineseStr += String.fromCharCode(parseInt(unicode.substr(2), 16)); i += 6;}      else {chineseStr += unicode[0]; i += 1;}    }    return chineseStr;  };  function customDateStringToTimestamp(str) {    const [year, month, day, hour, minute, second] = str.split(/[- :]/);    return new Date(year, month - 1, day, hour, minute, second).getTime();  }  function clearContextFormatter(e) {    e = " " + e;    const r = ["h1=", "h2=", "h3=", "h4=", "h5=", "ban:", "mark:", "icon:"];    m = true;    while (m) {      m = false;      r.forEach(function (i) {        p = e.indexOf("[" + i);        if (p > -1) {          if (e.slice(p).indexOf("]") < 0) return;          m = true;          s = e.slice(p).split("]")[0].replace("[" + i, "");          if (i.indexOf("=") > -1) e = e.replace(e.slice(p).split("]")[0] + "]", s);          else if (i === "icon:" && s.includes("=")) {            s = s.split("=")[1].replace(",", "");            e = e.replace(e.slice(p).split("]")[0] + "]", s);          }          else e = e.replace(e.slice(p).split("]")[0] + "]", "");        }      });    }    return e.replace(" ", "");  }  function getContextLength(e) {    const encoder = new TextEncoder();    let r = clearContextFormatter(e);    return encoder.encode(r).length;  };  '
}
window.heightAutoResize = function() {
	let o = 25;
	let e = $("#ueditor_0")[0].contentDocument.body;
	$(e)
		.children()
		.each((e, t) => {
			let i = getComputedStyle(t);
			o += t.offsetHeight + parseFloat(i.marginTop) + parseFloat(i.marginBottom) + parseFloat(i.borderTopWidth) + parseFloat(i.borderBottomWidth)
		});
	o = Math.max(o, 300);
	$("#edui1")[0].style.height = o + $("#edui1_toolbarbox")[0].offsetHeight + "px";
	$("#edui1_iframeholder")[0].style.height = o + "px";
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
	$("#changed-text")[0].className = i < 0 ? "mcmodder-common-danger" : "mcmodder-common-light";
	$("#changed-text")
		.html((i > 0 ? "+" : "") + i.toLocaleString());
	let a = $(".mcmodder-editor-stats")
		.contents()
		.filter(e => e > 2);
	i ? a.show() : a.hide()
};
window.refreshExpBar = function(e, t = 0) {
	let i = 1,
		o = 0,
		a = 0,
		n = e;
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
			.html(`升级进度: ${n.toLocaleString()} / - Exp`);
		$(".lv-title span:nth-child(3)")
			.html(`升级还需经验: - Exp`)
	}
	$(".lv-title span:nth-child(1)")
		.html(`${n>t?"预测等级":"当前等级"}: <i class="common-user-lv large lv-${i}">Lv.${i}</i>`);
	$(".lv-title span:nth-child(5)")
		.html(`总经验: ${n.toLocaleString()} Exp`);
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
window.getCurseForgeFileList = function(u) {
	$("#mcmodder-version-menu")
		.show();
	$("#mcmodder-version-menu tbody")
		.html(loadingColorful);
	let a = [];
	let n = async function(e) {
		let t = await fetch(`https://www.curseforge.com/api/v1/mods/${u}/files?pageIndex=${e}&pageSize=50&sort=dateCreated&sortDescending=true&removeAlphas=false`, {
			method: "GET"
		});
		let i = await t.text();
		let o = JSON.parse(i);
		a = a.concat(o.data);
		if (o.pagination.totalCount > (e - 1) * 50) setTimeout(n(++e), 1e3);
		else {
			$("#mcmodder-version-menu tbody")
				.empty();
			a.forEach(e => {
				const t = ["-", "Release", "Beta", "Alpha"];
				let i = e.id,
					o = t[e.releaseType],
					a = e.fileName,
					n = e.gameVersions.filter(e => /\d+(\.\d+){1,2}(-\w+)*/.test(e)),
					r, l = new Date(e.dateCreated),
					d = "未找到",
					c = "-",
					s, m, p;
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
					if (h(a) === h(t)) d = e.name, c = e.mcver, s = e.date, m = e.logid
				});
				p = s ? "" : `<a href="/class/version/add/${window.location.href.split("/version/")[1].split(".html")[0]}/?cfid=${u}&fileid=${i}&ver=${h(a)}&mcver=${n}&date=${l.valueOf()}" target="_blank">补全日志</a>`;
				$("#mcmodder-version-menu tbody")
					.append(`<tr><td>${i}</td><td>${o}</td><td>${a}</td><td>${n}</td><td>${l.toLocaleString()}</td><td>${d}</td><td>${c}</td><td>${s?s.toLocaleString():"-"}</td><td>${p}</td></tr>`)
			})
		}
	};
	n(0)
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
				n, r = new Date(e.date_published),
				l = "未找到",
				d = "-",
				c, s, m;
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
				if (p(o) === p(t)) l = e.name, d = e.mcver, c = e.date, s = e.logid
			});
			m = c ? "" : `<a href="/class/version/add/${window.location.href.split("/version/")[1].split(".html")[0]}/?mrid=${h}&fileid=${t}&ver=${p(o)}&mcver=${a}&date=${r.valueOf()}" target="_blank">补全日志</a>`;
			$("#mcmodder-version-menu tbody")
				.append(`<tr><td>${t}</td><td>${i}</td><td>${o}</td><td>${a}</td><td>${r.toLocaleString()}</td><td>${l}</td><td>${d}</td><td>${c?c.toLocaleString():"-"}</td><td>${m}</td></tr>`)
		})
	};
	e(0)
};

function tabInit() {
	generalEditInit();
	window.guiFrame = $("#item-table-gui-frame")[0], slotFrame = $(".gui")[0];
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
	const e = $(".common-nav li:not(.line):nth-child(5) a")[0]?.href.split("/class/")[1].split(".html")[0];
	const n = $(".common-nav li:not(.line):nth-child(5) a")
		.text();
	let r = getConfig(e, "modDependences")
		.split(","),
		l = getConfig(e, "modExpansions")
		.split(",");
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
						if (n.includes(t)) this.style.backgroundColor = "gold";
						else
							for (let e of r)
								if (e.includes(t)) this.style.backgroundColor = "aquamarine";
								else
									for (let e of l)
										if (e.includes(t)) this.style.backgroundColor = "pink";
						if (this.style.backgroundColor) this.parentNode.insertBefore(this, this.parentNode.childNodes[a++]);
						let e = $("img", this)[0],
							i = e.alt.split(" (")[0],
							o = e.alt.replace(i + " (", "");
						$(`<div><span class="mcmodder-slim-dark zh-name">${$(this).attr("item-id")}</span><span class="zh-name">${i}</span><span class="en-name">${o.slice(0,o.length-1)} [${$(this).attr("data-original-title").split("<b>")[1].split("</b>")[0]}]</span><a class="delete"><i class="fa fa-trash" /></a></div>`)
							.appendTo(this);
						$(".delete", this)
							.bind("click", () => {
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
			t.observe($(".item-search")[0], {
				childList: true,
				subtree: true
			});
			if ($("#item-used-item")
				.length) i.observe($(".item-used-list")[0], {
				childList: true,
				subtree: true
			})
		});
		setTabSelectorInfo();
		let i = e;
		e.observe($(".item-search")[0], {
			childList: true,
			subtree: true
		});
		if ($("#item-used-item")
			.length) i.observe($(".item-used-list")[0], {
			childList: true,
			subtree: true
		})
	}
	window.guiLocker = function() {
		let e = $("input#mcmodder-gui-lock")[0].checked;
		setConfig("guiLocker", e ? $("#item-table-gui-select")
			.val() : 0)
	};
	$('<div class="checkbox" title="开始添加合成表时，自动将 GUI 设置为当前所使用的 GUI。修改现有的合成表不会触发此特性。"><input id="mcmodder-gui-lock" type="checkbox"><label for="mcmodder-gui-lock">锁定当前 GUI</label></div>')
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
		let e = $("input#mcmodder-shapeless-lock")[0].checked;
		setConfig("shapelessLocker", e.toString());
		if (e) $("#item-table-data-orderly-1")
			.click()
	};
	$('<div class="checkbox" title="开始添加合成表时，自动将摆放要求设置为无序合成。修改现有的合成表不会触发此特性。"><input id="mcmodder-shapeless-lock" type="checkbox"><label for="mcmodder-shapeless-lock">锁定无序</label></div>')
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
			.replace("使用 GTCEu 中对应的材料", '<a title="轻触插入备注" style="font-size: unset; text-decoration: underline;">使用 GTCEu 中对应的材料</a>'));
		$(".tab-ul p.text-danger a")
			.bind("click", function() {
				let e = "使用 GTCEu 中对应的材料。";
				let t = $("textarea[placeholder='备注..']");
				t.val(t.val()
					.replace(e, ""));
				t.val(`${e}\n${t.val()}`);
				common_msg(PublicLangData.remind, "成功将此提示插入备注中~", "ok")
			});
		r.concat(["Gregicality Legacy", "格雷科技社区版", "格雷科技5"])
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
	let a = $("input.value", $(".gui")[0])
		.toArray();
	let n = $("#item-table-gui-frame > .tab-li")
		.toArray();
	let r, l, d, c, s;
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
	for (let e of n) {
		r = $("input", e)[0];
		c = $("span.text-danger", e)
			.text() || "";
		l = $(r)
			.attr("data-multi-id");
		d = parseInt($(r)
			.attr("data-part"));
		switch (l) {
			case "slot-in-number":
				t[d].number = r.value, t[d].numberEditable = true, t[d].unit = c;
				break;
			case "slot-in-chance":
				t[d].chance = r.value, t[d].chanceEditable = true;
				break;
			case "slot-out-number":
				i[d].number = r.value, i[d].numberEditable = true, i[d].unit = c;
				break;
			case "slot-out-chance":
				i[d].number = r.value, i[d].chanceEditable = true;
				break;
			case "slot-power-number":
				o[d].id = $("p.title", e)
					.html()
					.split("<span")[0], o[d].number = r.value, o[d].valid = true, o[d].unit = c
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
	$("<td><strong>物品 ID</strong></td>")
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
	for (let e in t) {
		if (!t[e].valid) continue;
		recipeTr = p.appendChild(document.createElement("tr"));
		$(`<td><strong>${e} 号材料: ${t[e].unit}</strong></td>`)
			.appendTo(recipeTr)
			.css({
				align: "right"
			});
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		$("<input>")
			.appendTo(recipeTd)
			.attr({
				"data-part": e,
				"data-multi-id": "slot-in-item",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e
			})
			.val(t[e].id);
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeInput = recipeTd.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(recipeTd)
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
				title: "此材料未被管理员允许设置消耗数量。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			});
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeInput = recipeTd.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(recipeTd)
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
				title: "此材料未被管理员允许设置消耗概率。",
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
		recipeTr = p.appendChild(document.createElement("tr"));
		$(`<td><strong>${e} 号成品: ${t[e].unit}</strong></td>`)
			.appendTo(recipeTr)
			.css({
				align: "right"
			});
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		$("<input>")
			.appendTo(recipeTd)
			.attr({
				"data-part": e,
				"data-multi-id": "slot-out-item",
				"data-multi-name": "item-table-data",
				"data-multi-enable": true,
				class: "form-control slot-text slot-text" + e
			})
			.val(i[e].id);
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeInput = recipeTd.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(recipeTd)
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
				title: "此材料未被管理员允许设置消耗数量。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			});
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeInput = recipeTd.appendChild(document.createElement("input"));
		$(recipeInput)
			.appendTo(recipeTd)
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
				title: "此材料未被管理员允许设置消耗概率。",
				disabled: "disabled"
			})
			.css({
				cursor: "no-drop"
			})
	}
	for (let e in o) {
		if (!o[e].valid) continue;
		recipeTr = p.appendChild(document.createElement("tr"));
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeTd.align = "right";
		recipeTd.innerHTML = `<strong>${o[e].id}: ${o[e].unit}</strong>`;
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeTd = recipeTr.appendChild(document.createElement("td"));
		recipeInput = recipeTd.appendChild(document.createElement("input"));
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
		.addClass("mcmodder-gui-alert")
		.css({
			"max-width": "60%",
			background: "linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2))",
			padding: "1em",
			"line-height": "1.8"
		});
	$("input", p)
		.bind("change", function() {
			valueInput = $("div#item-table-gui-frame input[data-multi-id=" + $(this)
				.attr("data-multi-id") + "][data-part=" + $(this)
				.attr("data-part") + "]")[0];
			$(valueInput)
				.val(this.value)
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
					.attr("data-part") + "]", $("tbody", $("#item-table-gui-frame")[0])[0])[0];
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
	let i = 0;
	if (!$("#mcmodder-jsdiff")
		.length) {
		i = 1;
		let e = document.createElement("script");
		e.id = "mcmodder-jsdiff";
		e.src = "https://kmcha.com/static/js/diff.js";
		document.head.appendChild(e);
		addStyle('pre#mcmodder-text-result {font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;display:block;border:1px solid var(--mcmodder-tca1);color:var(--mcmodder-txcolor);max-height:300px;padding:.25em;font-size:12px;} del, #del_num{font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";text-decoration:none;color:#b30000;background:#f333} ins, #ins_num{font-family:SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New";color:#406619;text-decoration:none;background:#3f33}')
	}
	let o = ($(".difference-info")[0] || $("#verify-window-frame")[0] || $(".tab-content")[0])
		.appendChild(document.createElement("div"));
	o.id = "mcmodder-text-area";
	let d = o.appendChild(document.createElement("div"));
	let c = d.appendChild(document.createElement("span"));
	c.className = "mcmodder-slim-danger";
	let s = d.appendChild(document.createElement("span"));
	s.className = "mcmodder-slim-dark";
	let m = o.appendChild(document.createElement("pre"));
	m.id = "mcmodder-text-result";
	($(".difference-info")[0] || $("#verify-window-frame")[0] || $(".tab-content")[0])
	.insertBefore(o, $(".difference-area")[0] || $(".verify-info-table")[0] || $("#edit-page-1")[0]);
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
			.filter(function(e, t) {
				return $(t)
					.children()
					.text()
					.includes("介绍")
			})[0];
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
		$(m)
			.html(loadingColorful)
	}
	setTimeout(function() {
		$(m)
			.html("");
		var i = JsDiff[p.length + h.length > 5e4 ? "diffLines" : p.length + h.length > 15e3 ? "diffWords" : "diffChars"](p, h);
		var o = 0,
			a = 0,
			n = 0,
			r = 0;
		var l = document.createDocumentFragment();
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
				n += (new TextEncoder)
					.encode(e.textContent)
					.length
			} else if (i[t].added) {
				e = document.createElement("ins");
				e.appendChild(document.createTextNode(i[t].value));
				a++;
				r += (new TextEncoder)
					.encode(e.textContent)
					.length
			} else {
				e = document.createTextNode(i[t].value)
			}
			l.appendChild(e)
		}
		$(m)
			.text("");
		if (o || a) m.appendChild(l);
		else {
			$("#mcmodder-text-area")
				.remove();
			return
		}
		if (o) c.innerHTML = "删除: <strong>" + o.toLocaleString() + "</strong> 处 (<strong>" + n.toLocaleString() + "</strong> 字节) ";
		if (a) s.innerHTML = "新增: <strong>" + a.toLocaleString() + "</strong> 处 (<strong>" + r.toLocaleString() + "</strong> 字节) ";
		if (p.length + h.length > 5e3) {
			let e = d.appendChild(document.createElement("span"));
			e.outerHTML = '<span style="font-size: 12px; color: gray">*正文过长，将' + (p.length + h.length > 15e3 ? "按行对比" : "按句对比") + "而非按字对比，以节省性能~</span>"
		}
	}, i * 2e3)
};

function itemInit() {
	$("span.name > h5")
		.each(function() {
			let e = $(this)
				.text();
			if (e.includes(" (")) {
				e = ("<a>" + e)
					.replace(" (", '</a> <span style="font-size: 16px; font-weight: lighter; color: gray"><a>')
					.replace(")", "</a></span>")
			} else e = `<a>${e}</a>`;
			this.innerHTML = e;
			$("a", this)
				.bind("click", function() {
					navigator.clipboard.writeText($(this)
						.text());
					common_msg(PublicLangData.remind, "物品名称已成功复制到剪贴板~", "ok")
				})
		});
	let e = $("div.item-skip-list")
		.length && $("div.item-content")
		.length < 2;
	if ($(".item-dict")
		.contents()
		.length) $(".item-dict")
		.contents()[0].data = "[矿物词典/物品标签] ";
	$(".item-dict")
		.contents()
		.filter((e, t) => e && t.nodeType === 3)
		.remove();
	$(".maintext .table")
		.css({
			margin: "unset"
		})
		.filter((e, t) => $(t)
			.css("width") === "100%")
		.css({
			width: "unset"
		});
	$(".table.table-bordered.text-nowrap tbody")
		.filter((e, t) => $(t)
			.children()
			.length > 9)
		.find("tr:first-child() th:last-child()")
		.append(' [<a class="collapsetoggle">隐藏</a>]')
		.find(".collapsetoggle")
		.bind("click", function() {
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
	let i = $("span.name > h5")
		.parent()[0];
	if (i) {
		s = $("<span>")
			.css("font-size", "14px")
			.appendTo(i);
		let e = window.location.href.includes("/tab/") ? "tab/" : "";
		let t = parseInt(window.location.href.split("item/" + e)[1]);
		if (t > 1) s.html('<a href="/item/' + e + (t - 1) + '.html" class="mcmodder-common-danger" style="margin-left: 10px">&lt;&nbsp;' + (t - 1) + "&nbsp;</a>-");
		s.append(`<a href="/item/${e+(t+1)}.html" class="mcmodder-common-light"> ${t+1} &gt;</a>`)
	}
	if (e && getConfig("compactedChild")) {
		addStyle("table.table-bordered.righttable td {padding: 0rem;}");
		$("table.table-bordered.righttable")
			.each(function() {
				$("tr", this)[0].remove();
				let e = $("tr:first-child()", this)[0];
				$("tr:not(tr:first-child())", this)
					.each(function() {
						e.innerHTML += this.innerHTML;
						this.remove()
					});
				$("img", this)[0].style.display = "none";
				let t = $("img", this)[0].parentNode.appendChild(document.createElement("a"));
				t.className = "mcmodder-slim-dark";
				t.innerHTML = "轻触展开大图标";
				$(t)
					.bind("click", function() {
						let e = $("img", this.parentNode)[0];
						this.innerHTML = e.style.display === "none" ? "轻触收起大图标" : "轻触展开大图标";
						e.style.display = e.style.display === "none" ? "block" : "none"
					});
				$("div.common-fuc-group", this.parentNode.parentNode.parentNode.parentNode)[0].style.display = "none";
				$("div.item-info-table", this.parentNode.parentNode.parentNode)[0].style.display = "none"
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

function oredictPageInit() {
	addStyle(".mcmodder-mod-sort legend {font-size:14px;width:auto;margin:0 0 10px 10px;color:#555 !important;} .mcmodder-mod-sort fieldset {border:1px solid #DDD;padding:0;margin:0;margin-bottom:10px;display:inline-block;} .mcmodder-mod-sort fieldset:last-child {margin-bottom:0} .oredict-item-list li .name .sub {height: 20px; margin-left: 5px; display: inline-block} .oredict-item-list li .name {line-height: 20px;} .oredict-item-list li .name .main {height: 20px; display: inline-block;} .oredict-item-list li {width: 100%; margin-bottom: unset; height: unset;} .oredict-item-list {margin-left: .75rem; margin-right: .75rem;}");
	$("div.icon-128x img")
		.each(function() {
			this.remove()
		});
	sortFrame = $("div.oredict-frame")[0].appendChild(document.createElement("div"));
	sortFrame.className = "mcmodder-mod-sort";
	sortFrame.innerHTML = '<input id="mcmodder-mod-search" placeholder="输入模组名称或编号以筛选..." class="form-control" style="text-align: center;">';
	$("div.oredict-item-list li")
		.each(function() {
			let e = $("div.sub.class a", this)
				.text(),
				t = $("div.sub.class a", this)[0].href.split("/class/")[1].split(".html")[0];
			if ($("div.mcmodder-mod-sort fieldset[mod-name=" + t + "]")
				.length < 1) $("div.mcmodder-mod-sort")
				.append(`<fieldset mod-name=${t}><legend><a href="/class/${t}.html" style="color: #555;" target="_blank">${e}</a></legend><div class="oredict-item-list"><ul></ul></div></fieldset>`);
			$("div.sub.class", this)
				.remove();
			$(`div.mcmodder-mod-sort fieldset[mod-name=${t}] ul`)
				.append(this.outerHTML);
			this.remove()
		});
	$("div.oredict-frame")[0].insertBefore(sortFrame, $("div.oredict-item-list")[0]);
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
	if ($(".badge-secondary")
		.text() === "最近100条") return;
	let o = parseInt($(".pagination span")
		.text()
		.split(" / ")[1]?.split(" 页")[0]);
	let a = window.location.href.split("starttime=")[1].split("&endtime=")[0];
	let n = window.location.href.split("endtime=")[1].split("&page=")[0];
	if (!o) return;
	let r = async function(e) {
		let t = await fetch(`https://www.mcmod.cn/history.html?starttime=${a}&endtime=${n}&page=${e}`, {
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
		common_msg(PublicLangData.remind, `成功加载第 ${e} / ${o} 页~`, "ok");
		if (e < o) setTimeout(r(++e), 1e3);
		else {
			let e = $(".history-list-head")[0].appendChild(document.createElement("input"));
			e.id = "mcmodder-history-search";
			e.className = "form-control";
			e.placeholder = "输入编辑记录内容以筛选...";
			e.style.textAlign = "center";
			$(e)
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
				})
		}
	};
	r(2);
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
	let n = async function(e) {
		let t = await fetch(`https://www.mcmod.cn/verify.html?${a}&page=${e}`, {
			method: "GET",
			headers: {
				"Content-Type": "text/html; charset=UTF-8"
			}
		});
		let i = document.createElement("html");
		i.innerHTML = await t.text();
		$(".verify-list-list-table tbody", i)
			.children()
			.appendTo(".verify-list-list-table tbody");
		common_msg(PublicLangData.remind, `成功加载第 ${e} / ${o} 页~`, "ok");
		if (e < o) setTimeout(n(++e), 1e3);
		else verifyInit()
	};
	n(2);
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
			let e = this.appendChild(document.createElement("td"));
			e.className = "text item-table-id";
			e.innerHTML = '<span class="mcmodder-slim-dark">' + $("td.text.item-table-remarks ul.table-tool a:first-child()", this)[0].href.split("/edit/")[1].split("/")[0]; + "</span>";
			this.insertBefore(e, this.childNodes[0])
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-gui")
		.each(function() {
			$("div.TableBlock", this)[0].style.display = "none";
			$(this.appendChild(document.createElement("a")))
				.attr("class", "mcmodder-slim-dark")
				.html("轻触展开 GUI")
				.bind("click", function() {
					let e = $("div.TableBlock", this.parentNode)[0];
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
			this.innerHTML = '<span class="mcmodder-tab-item-name">' + this.textContent + '</span><span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + parseInt(i / 1e4) + "/" + i + '.png); width: 32px; height: 32px; display: inline-block; position: relative; background-size: cover;"></span>';
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
				$("span.mcmodder-tab-item-icon", this)[0].innerHTML += '<span style="font-family: Unifont; color: black; position: absolute; right: 0px; bottom: 0px; line-height: ' + t + "px; font-size: " + t + 'px;">' + e + '</span><span style="font-family: Unifont; color: white; position: absolute; right: 1px; bottom: 1px; line-height: ' + t + "px; font-size: " + t + 'px;">' + e + "</span>"
			}
			if ($("span[data-original-title=合成后返还]", this.parentNode)
				.length > 0) {
				$("span.mcmodder-tab-item-icon", this)[0].innerHTML += '<span style="font-family: Unifont; color: black; position: absolute; right: 0px; bottom: 0px; line-height: 12px; font-size: 12px;">无损</span><span style="font-family: Unifont; color: lime; position: absolute; right: 1px; bottom: 1px; line-height: 12px; font-size: 12px;">无损</span>';
				$("span[data-original-title=合成后返还]", this.parentNode)
					.each(function() {
						this.remove()
					})
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
				$("span.mcmodder-tab-item-icon", this)[0].innerHTML += '<span style="font-family: Unifont; color: black; position: absolute; left: 0px; top: 1px; line-height: 16px; font-size: 16px;">#' + e + '</span><span style="font-family: Unifont; color: aqua; position: absolute; left: 1px; top: 0px; line-height: 16px; font-size: 16px;">#' + e + "</span>"
			}
			$("span", this.parentNode)
				.each(function() {
					if ($(this)
						.attr("data-original-title")?.indexOf("概率")) {
						let e = $(this)
							.text()
							.split("(")[1].split(")")[0];
						$("span.mcmodder-tab-item-icon", this.parentNode)[0].innerHTML += '<span style="font-family: Unifont; color: black; position: absolute; right: 0px; top: 1px; line-height: 16px; font-size: 12px;">' + e + '</span><span style="font-family: Unifont; color: yellow; position: absolute; right: 1px; top: 0px; line-height: 16px; font-size: 12px;">' + e + "</span>";
						this.remove()
					}
				});
			$(this)
				.parent()
				.contents()
				.filter((e, t) => t.nodeType === 3)
				.remove()
		});
	$("div.item-table-frame")
		.each(function() {
			if ($("tr", this)
				.length > 9 && !window.location.href.includes("/tab/") && !window.location.href.includes("/oredict/")) $("<tr>")
				.appendTo($("tbody", this)[0])
				.html(`<td colspan="4" style="text-align: center; padding: 5px;"><a class="mcmodder-common-danger" href="${$(".item-table-tips a",this.parentNode.parentNode).attr("href")}">显示的合成表数量已达到 10 个，可能有更多合成表已被隐藏！轻触此处查看所有合成/用途~</span></td>`)
		});
	$("span.mcmodder-tab-item-name")
		.css({
			display: "none"
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-count p")
		.filter((e, t) => $(t)
			.text() === "↓")
		.each(function() {
			let e = parseInt($("[mcmodder-gui-id]", this.parentNode)
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
			this.innerHTML = '<span style="background-image: url(' + a + '); height: 32px; width: 64px; display: inline-block; background-size: cover; margin-left: 5px; margin-right: 5px; position: relative;">' + (e ? i < 0 ? '<span class="mcmodder-tab-item-icon" style="background-image: url(//i.mcmod.cn/item/icon/32x32/' + parseInt(e / 1e4) + "/" + e + '.png); width: 32px; height: 32px; display: inline-block; position: absolute; left: 12px; background-size: cover;"></span>' : '<span class="mcmodder-tab-item-icon" style="background-image: url(' + t + "); background-position: -" + i + "px -" + o + 'px; width: 34px; height: 34px; display: inline-block; position: absolute; left: 12px;"></span>' : "") + "</span>"
		});
	$("div.item-table-frame > table.item-table-block td.text.item-table-count span.noecho")
		.remove();
	$("fieldset.power_area > p:not(fieldset.power_area > p:last-child())")
		.each(function() {
			this.innerHTML += " ·"
		});
	$(".item-table-tips")
		.remove()
}

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
	let c = $(".common-nav > ul");
	window.modName = window.itemName = "";
	if (c && c[0].childNodes.length > 4) {
		c = c[0];
		modName = c.childNodes[4].textContent.replace("]", "] ");
		if (c.childNodes[8]) itemName = c.childNodes[8].textContent
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
				.attr("data-tag") === e.id) $(".common-template-frame .input-group input")[0].checked ? editor.execCommand("insertHtml", e.content) : editor.setContent(e.content);
			swal.close();
			$($("#ueditor_0")[0].contentWindow.document.body)
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
	}], window.itemCustomTypeList = [{
		text: "元素/要素",
		icon: "fa-mortar-pestle",
		color: "#90f"
	}, {
		text: "工具属性",
		icon: "fa-shapes",
		color: "#c300ff"
	}, {
		text: "成就/进度",
		icon: "fa-star",
		color: "#e3cc25"
	}, {
		text: "新版已移除",
		icon: "fa-clock-o",
		color: "#b56f34"
	}, {
		text: "技能",
		icon: "fa-star-of-david",
		color: "#6cf"
	}, {
		text: "技能/能力",
		icon: "fa-magic",
		color: "#32d4a9"
	}, {
		text: "编辑规范",
		icon: "fa-book",
		color: "#000"
	}, {
		text: "材料类型",
		icon: "fa-sitemap",
		color: "#0a9"
	}];
	const e = new MutationObserver(function(e, t) {
		for (let h of e) {
			if (h.type === "childList" && h?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title")
				.text() === "自动链接") {
				let e = h.addedNodes[0];
				let i, o = 1,
					a = "",
					n = "",
					t, r, l, d, c = $(".common-nav li:not(.line):nth-child(5) a")[0]?.href.split("/class/")[1].split(".html")[0];
				let s = $(".edit-autolink-list > ul", e)[0];
				let m = $("input.form-control", e)
					.val()
					.toLowerCase()
					.split(" ");
				if (!s) return;
				let p = $("li", s);
				$("button[type=submit]", e)
					.bind("click", () => {
						$(".edit-autolink-list input.form-control")
							.attr("disabled", "disabled")
					});
				if (m[0]?.includes("#")) {
					let e = document.createElement("li"),
						t = m[0].replaceAll("#", "");
					$(e)
						.html(`<li><a title="矿物词典/物品标签 - ${t}" data-type="oredict" data-text-full="#${t}" data-text-half="${t}" href="javascript:void(0);"><i class="fas fa-cubes mcmodder-chroma"></i> #${t}</a></li>`);
					$("a", e)
						.bind("click", function() {
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
					p.parent()
						.append(e);
					p = $("li", s)
				}
				p.filter((e, t) => t.className != "limit" && t.className != "empty")
					.each(function() {
						autoLinkIndex = 1, i = $("a", this)[0], a = i.title.split(" - ")[2] || "", n = a.includes("[") ? a.slice(1)
							.split("] ")[0] : a.split(" (")[0], r = $(i)
							.attr("data-id");
						nonItemTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<i class="fas ${e.icon} mcmodder-chroma"></i>`));
						itemDefaultTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<span class="iconfont icon" style="color: ${e.color}">${e.icon}</span>`));
						itemCustomTypeList.forEach(e => i.innerHTML = i.innerHTML.replace(e.text + " -", `<i class="fas ${e.icon}" style="color: ${e.color}"></i>`));
						i.innerHTML = i.innerHTML.replace("ID:" + r, '<span class="mcmodder-slim-dark item-id">' + r + "</span>");
						l = $(i)
							.attr("data-text-half");
						d = $(i)
							.attr("data-text-full")
							.replace(l, "");
						d = d.slice(2, d.length - 1);
						i.innerHTML = i.innerHTML.replace("(" + d + ")", '<span class="item-ename">' + d + "</span>");
						if (n) i.innerHTML = i.innerHTML.replace(r + "</span>", r + '</span> <span class="item-modabbr">[' + n + "]</span>");
						let e = getConfig(c, "modDependences")
							.split(","),
							t = getConfig(c, "modExpansions")
							.split(",");
						if (a === modName || n === "MC" || e.includes(a) || t.includes(a) || m.includes(n.toLowerCase()) || m.includes("原版") || $("a", this)
							.attr("data-type") === "oredict") {
							if ($(".item-modabbr", this)
								.length) {
								if (n === "MC" || e.includes(a)) $(".item-modabbr", this)[0].style.backgroundColor = "aquamarine";
								else if (t.includes(a)) $(".item-modabbr", this)[0].style.backgroundColor = "pink";
								else $(".item-modabbr", this)[0].style.backgroundColor = "gold";
								$(".item-modabbr", this)[0].style.fontWeight = "bold"
							}
							s.insertBefore(this, s.childNodes[o++]);
							if (m.includes(l.toLowerCase()) || m.includes(d.toLowerCase()) || $("a", this)
								.attr("data-type") === "oredict") {
								this.style.backgroundColor = "gold";
								s.insertBefore(this, s.childNodes[1]);
								$(".edit-autolink-list .empty")
									.remove()
							}
						}
					});
				$(".edit-autolink-list ul")
					.children()
					.each((e, t) => {
						if (e > 0 && e < 10) $("a", t)
							.append(`<span class="mcmodder-common-light item-ename"> [Alt+${e}]</span>`)
					});
				$("input.form-control", e)
					.bind("keyup", e => {
						if (!e.altKey) return;
						e.preventDefault();
						let t = e.key;
						if (t != parseInt(t)) return;
						let i = $(".edit-autolink-list ul")
							.children()[parseInt(t)];
						i.style.backgroundColor = "greenyellow";
						setTimeout(() => {
							$("a", i)
								.trigger("click")
						}, 200)
					})
			} else if (h.type === "childList" && h?.addedNodes[0]?.className === "swal2-container swal2-center swal2-fade swal2-shown" && $("h2#swal2-title")
				.text() === "插入模板") {
				$(".group li")
					.remove();
				window.templateList = JSON.parse(getConfig("templateList"));
				templateList.forEach(e => $(".group ul")
					.append(`<li data-tag="${e.id}"><p class="title">${e.title}</p><p>${e.description}</p><a style="position: absolute; right: .5em; top: .5em;" class="mcmodder-slim-danger"><i class="fa fa-trash" /></a></li>`));
				$(".group li")
					.bind("click", window.loadCustomTemplate);
				$(".group li a")
					.bind("click", window.removeTemplate);
				$(".group ul")
					.append(`<li><input id="template-title" class="form-control title" style="text-align: center; display: none;" placeholder="新模板标题... (必填)"><input id="template-description" class="form-control" style="text-align: center; display: none;" placeholder="新模板介绍... (必填)"><button id="mcmodder-add-template" class="btn btn-sm btn-dark">新建模板</button></li>`);
				$("#mcmodder-add-template")
					.bind("click", window.addTemplate)
			}
		}
	});
	e.observe(document.body, {
		childList: true
	});
	let s = $("#ueditor_0")[0].contentWindow.document;
	if ($(".edit-tools")
		.length) {
		let d;
		if (!$(".edit-tools")
			.length && $(".post-row")
			.length) {
			$("div.col-lg-12.left")
				.remove();
			$("div.col-lg-12.right")[0].style.paddingLeft = "0px";
			d = $(".post-row")[0].appendChild(document.createElement("span"));
			$(d)
				.attr("style", "font-size: 12px; margin-top: 10px; position: relative;")
		} else d = $(".edit-tools")[0].appendChild(document.createElement("span"));
		d.className = "mcmodder-editor-stats";
		d.innerHTML = '<i class="fa fa-edit"></i><span id="current-text" class="mcmodder-common-dark" style="margin-right: 0px">0</span><span style="margin-right: 0px">&nbsp;字节</span><i class="fa fa-line-chart" style="margin-left: .8em;"></i><span id="changed-text" class="mcmodder-common-light" style="margin-right: 0px">--</span><span style="margin-right: 0px">&nbsp;字节</span>';
		if (!$(".edit-user-alert.locked")
			.length) originalContextLength = $("#changed-text", d)[0].innerHTML = getContextLength(s.body.textContent);
		else {
			async function t() {
				$("#changed-text", d)
					.html(loadingColorful);
				originalContextLength = 0;
				let e = c.childNodes[c.childNodes.length - 3].childNodes[0].href;
				let t = await fetch(e, {
					method: "GET",
					headers: {
						"Content-Type": "text/html; charset=UTF-8"
					},
					credentials: "omit"
				});
				let i = document.createElement("html");
				i.innerHTML = await t.text();
				let o = $(".text-area.common-text", i)[0] || $(".item-content.common-text", i)[0];
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
				let n = $(s.body)
					.children();
				let r = "",
					l = "";
				a.each(function() {
					r += this.textContent + "\n";
					originalContextLength += getContextLength(this.textContent)
				});
				n.each(function() {
					let e = clearContextFormatter(this.textContent);
					if (e) l += e + "\n"
				});
				textCompare(r, l);
				heightAutoResize()
			}
			t()
		}
		if (!$(".edit-tools")
			.length && $(".post-row")
			.length) $(".post-row")[0].insertBefore($(".post-row > .mcmodder-editor-stats")[0], $(".post-row > #editor-ueeditor")[0]);
		window.addEventListener("resize", () => {
			$("#edui1")[0].style.width = ($(".common-menu-area")[0] || $(".post-row")[0])
				.clientWidth - 32 + "px";
			$("#edui1_iframeholder")[0].style.width = $(".edui-editor-toolbarboxinner")[0].clientWidth + "px"
		});
		window.dispatchEvent(new Event("resize"));
		heightAutoResize();
		$(s.body)
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
		const o = window.location.href.includes("?mrid=");
		if (getConfig("markdownIt") || o) {
			let e = document.createElement("script");
			e.id = "mcmodder-markdownit";
			e.src = "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js";
			s.head.appendChild(e);
			setTimeout(function() {
				$($(".edui-editor-toolbarboxinner")[0].appendChild(document.createElement("button")))
					.attr({
						id: "mcmodder-markdown-it",
						class: "btn btn-outline-dark btn-sm"
					})
					.html("Markdown → HTML")
					.bind("click", function() {
						let e = $("#ueditor_0")[0].contentWindow,
							t = e.document.body;
						$(t)
							.find("p > br")
							.remove();
						for (let i = 1; i < 6; i++) $(t)
							.find("> p")
							.filter((e, t) => t.innerText.slice(0, i + 1) === "#".repeat(i) + " ")
							.each((e, t) => $(t)
								.text(`[h${i}=${t.innerText.slice(i+1)}]`));
						const i = e.markdownit();
						const o = i.render(t.innerText);
						t.innerHTML = o
					});
				if (o) $("#mcmodder-markdown-it")
					.click()
			}, 2e3)
		}
	}
	const i = new MutationObserver(function(t, e) {
		for (let e of t) {
			if ($(".swal2-title")
				.text() === "提交成功" && e.addedNodes[0]?.className?.includes("swal2")) {
				swal.close();
				common_msg(PublicLangData.remind, "提交成功，请等待管理员审核~", "ok")
			}
		}
	});
	if (getConfig("autoCloseSwal")) i.observe(document.body, {
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
	e.observe($("#editor-frame")[0], {
		childList: true
	})
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
		let e = $(this)[0].files[0];
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
					.attr("src", t);
				imgResize(16, 32);
				imgResize(16, 128)
			}
		}, t.readAsDataURL(e)
	};
	const e = "#edit-page-1 .tab-ul hr:nth-child(6)";
	$("<img>")
		.attr({
			id: "item-icon-16x-preview-img",
			style: "display: inline-block; margin: 10px 0; border: 1px solid #DDD; border-radius: 5px; padding: 2px;"
		})
		.insertAfter(e);
	$("<br>")
		.insertAfter(e);
	$("<input>")
		.attr({
			id: "icon-input-16x",
			type: "file",
			accept: "image/*",
			class: "hidden"
		})
		.insertAfter(e)
		.bind("change", loadOriginal);
	$("<label>")
		.attr({
			id: "icon-input-16x-label",
			class: "btn btn-dark",
			for: "icon-input-16x"
		})
		.text("上传图标以自动调整尺寸")
		.insertAfter(e);
	$("<input>")
		.attr({
			id: "icon-16x",
			style: "display: none;"
		})
		.insertAfter(e);
	$("<input>")
		.attr({
			id: "icon-32x-editor",
			placeholder: "输入 Base64 格式小图标..."
		})
		.insertAfter("#icon-32x");
	$("<input>")
		.attr({
			id: "icon-128x-editor",
			placeholder: "输入 Base64 格式大图标..."
		})
		.insertAfter("#icon-128x");
	window.imgResize32 = function() {
		imgResize(32, 128)
	};
	window.imgResize128 = function() {
		imgResize(128, 32)
	};
	$("<button>")
		.attr("class", "btn")
		.text("同步至大图标")
		.insertAfter("#icon-32x-editor")
		.bind("click", window.imgResize32);
	$("<button>")
		.attr("class", "btn")
		.text("同步至小图标")
		.insertAfter("#icon-128x-editor")
		.bind("click", window.imgResize128);
	$("#icon-32x, #icon-128x")
		.bind("change", function() {
			let e = $(this)
				.val();
			if (e && e.slice(0, 11) != "data:image/") $(this)
				.val("data:image/png;base64," + e);
			$(`#item-${this.id}-preview-img`)
				.attr("src", $(this)
					.val());
			$(`#${this.id}-editor`)
				.val($(this)
					.val())
		});
	$("#icon-32x-editor, #icon-128x-editor")
		.attr({
			class: "form-control",
			style: "width: 50%; display: inline-block; margin-right: 1em;"
		})
		.bind("change", function() {
			$("#" + this.id.replace("-editor", ""))
				.val($(this)
					.val())
				.trigger("change")
		});
	$("#icon-32x-editor")
		.val($("#icon-32x")
			.val());
	$("#icon-128x-editor")
		.val($("#icon-128x")
			.val());
	editorLoad()
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
				.split(/[\/,&]/);
			let a = $(t)
				.find(".name")
				.text(),
				n = $(t)
				.find(".time")
				.text();
			if (n === "未知时间") n = 0;
			versionList.push({
				date: new Date(n),
				name: a,
				mcver: o,
				logid: e
			})
		});
	if (getConfig("versionHelper")) {
		$('<div class="version-menu"><fieldset><legend>从其他网站获取版本列表</legend><div class="bd-callout"><p>该功能尚不保证能够准确对应版本列表与百科现有日志的版本号，对比结果仅供参考，提交日志前请仔细检查各信息是否正确~</p><p>添加时请注意：新增日志的版本号格式应尽可能与现有日志统一。例如，若其他版本号有前缀“v”，则新建日志的版本号也应带此前缀~</p></div><input id="mcmodder-fetch-version-cf" class="form-control" placeholder="输入 CFID 以查询..." style="text-align: center;"><input id="mcmodder-fetch-version-mr" class="form-control" placeholder="输入 MRID 以查询..." style="text-align: center;"><table id="mcmodder-version-menu"><thead><tr><th>文件 ID</th><th>发布状态</th><th>文件名称</th><th>支持 MC 版本</th><th>更新日期</th><th>对应日志版本号</th><th>对应日志支持版本</th><th>对应更新日期</th><th>操作</th></tr></thead><tbody></tbody></table></fieldset></div>')
			.insertBefore(".version-menu, .version-content-empty");
		$("#mcmodder-version-menu")
			.hide();
		$("#mcmodder-fetch-version-cf")
			.bind("change", () => {
				let e = $("#mcmodder-fetch-version-cf")
					.val();
				if (e != parseInt(e)) return;
				getCurseForgeFileList($("#mcmodder-fetch-version-cf")
					.val())
			});
		$("#mcmodder-fetch-version-mr")
			.bind("change", () => {
				let e = $("#mcmodder-fetch-version-mr")
					.val();
				if (!e) return;
				getModrinthFileList($("#mcmodder-fetch-version-mr")
					.val())
			})
	}
}

function versionInit() {
	generalEditInit();
	const e = new Date;
	const i = e.getFullYear();
	let o = (e, t, i) => t <= e && e <= i;
	$($("li.tab-li:nth-child(1)")[0].appendChild(document.createElement("input")))
		.attr({
			id: "mcmodder-date-editor",
			class: "form-control",
			placeholder: "输入 yymmdd 格式数字以快捷设置日期~"
		})
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
			$("li.tab-li:nth-child(3) > div:nth-child(2) > input:nth-child(1)")[0].focus()
		});
	setTimeout(editorInit, 1e3);
	let t = new URLSearchParams(window.location.search),
		c = 0,
		a;
	if (t.get("cfid")) c = 1, a = t.get("cfid");
	else if (t.get("mrid")) c = 2, a = t.get("mrid");
	if (c) {
		let e = async function(e, t, i, o, a) {
			let n, r, l;
			if (c === 1) {
				n = await fetch(`https://www.curseforge.com/api/v1/mods/${cfid}/files/${t}/change-log`, {
					method: "GET"
				});
				r = await n.text();
				l = JSON.parse(r)
					.changelogBody
			} else if (c === 2) {
				n = await fetch(`https://api.modrinth.com/v2/version/${t}`, {
					method: "GET"
				});
				r = await n.text();
				l = "<p>" + JSON.parse(r)
					.changelog.replaceAll("\n", "</p><p>") + "</p>"
			}
			if (l) setTimeout(() => {
				editor.setContent(l);
				let e = $("#ueditor_0")[0].contentDocument.body,
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
	let e = window.location.href.split("/class/")[1].split(".html")[0];
	let t = getConfig(e, "modDependences"),
		i = "";
	let o = getConfig(e, "modExpansions"),
		a = "";
	$("li.col-lg-12.relation")
		.each(function() {
			if ($("span[data-toggle=tooltip]:first-child()", this)
				.text()
				.includes("前置Mod")) {
				$("a[data-toggle=tooltip]", this)
					.each(function() {
						i += $(this)
							.text()
							.replaceAll("  ", " ") + ","
					})
			}
			if ($("span[data-toggle=tooltip]:first-child()", this)
				.text()
				.includes("依赖")) {
				$("a[data-toggle=tooltip]", this)
					.each(function() {
						a += $(this)
							.text()
							.replaceAll("  ", " ") + ","
					})
			}
		});
	if (t != i) {
		setConfig(e, i, "modDependences");
		common_msg(PublicLangData.remind, "成功更新此模组前置列表~", "ok")
	}
	if (o != a) {
		setConfig(e, a, "modExpansions");
		common_msg(PublicLangData.remind, "成功更新此模组拓展列表~", "ok")
	}
	$(".title")
		.filter((e, t) => t.textContent === "更新日志")
		.append(`<span class="more"><a href="/class/version/${e}.html" target="_blank">更多</a><a></a></span>`);
	if (getConfig("enableAprilFools")) {
		let t = 0,
			i = ["诅咒锻炉", "CurseFabric", "BlessForge", "BlessFabric"];
		for (let e of $("ul.common-link-icon-frame span.name")
			.toArray()) {
			if (e.innerHTML === "Discord") e.innerHTML = "Drocsid";
			if (e.innerHTML === "GitHub") e.innerHTML = "GayHub";
			if (e.innerHTML === "GitLab") e.innerHTML = "GayLab";
			if (e.innerHTML === "Gitee") e.innerHTML = "Giteeeeee";
			if (e.innerHTML === "Modrinth") e.innerHTML = "Pluginrinth";
			if (e.innerHTML === "CurseForge") e.innerHTML = i[t++ % 4]
		}
		$("div.frame span.avatar[title='MCreator - MCr'] img")
			.attr("src", "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif")
	}
	$(".class-info-left > ul > *, .common-link-frame .title")
		.contents()
		.filter((e, t) => t.nodeType === 3 && (["相关链接:", "模组标签: ", "支持的MC版本: "].includes(t.data) || t.data.includes("作者/开发团队")))
		.each(function() {
			$(this)
				.parent()
				.find("> i")
				.remove();
			$(this)
				.replaceWith(`<span class="mcmodder-subtitle">${this.data.replace(":","")}</span>`)
		});
	$(".class-info-left")
		.appendTo(".class-info-right");
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
	$(".common-background")
		.remove();
	$(".class-text .class-info-right")
		.remove();
	$(".common-center > .right")
		.insertBefore(".common-center .right");
	$(".common-center > .right")
		.remove();
	let n = parseInt($(".infolist.modpack")
		.text()
		.slice(2));
	let r = parseInt($(".infolist.server-count")
		.text()
		.slice(2));
	let l = parseFloat($(".infolist.server-pre")
		.text()
		.split("安装率为 ")[1]);
	let d = parseFloat($(".infolist.worldgen")
		.text()
		.split("有 ")[1]);
	$(".infolist.modpack, .infolist.server-count, .infolist.server-pre, .infolist.worldgen")
		.remove();
	if (n) $(`<li class="col-lg-6"><span class="title">${n}</span><span class="text"><a target="_blank" href="/modpack.html?mod=${e}">整合包已收录</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (r) $(`<li class="col-lg-6"><span class="title">${r}</span><span class="text"><a target="_blank" href="https://play.mcmod.cn/list/?classid=${e}">服务器已安装</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (l) $(`<li class="col-lg-6"><span class="title">${l}%</span><span class="text">模组服安装率</span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	if (d) $(`<li class="col-lg-6"><span class="title">${d}</span><span class="text"><a target="_blank" href="https://www.mcmod.cn/worldgen.html?mod=${e}">资源分布数据</a></span></li>`)
		.insertAfter($(".col-lg-6")
			.last());
	$(".class-text > span.figure")
		.addClass("mcmodder-golden-alert")
		.css("width", "100%");
	$(".figure img")
		.bind("load", function() {
			if (!this.src.includes("mcmod.cn")) {
				$(this)
					.parent()
					.append('<span class="mcmodder-common-danger" style="display: inherit;">该图片尚未本地化！</span>');
				this.style.border = "10px solid red"
			}
		})
}

function diffInit() {
	textCompare()
}

function classEditorInit() {
	addStyle(".radio {width: 10000px;} .mcmodder-tip {margin-left: 10px; font-size: 12px !important; color: gray;}");
	$("#edit-page-2, #edit-page-3")
		.attr("class", "tab-pane active");
	$("div.swiper-container")
		.remove();
	$(".col-lg-12.right")
		.attr("style", "position: relative;");
	$("div.common-menu-area")
		.attr("style", "width: 75%; display: inline-block;");
	let e = $(".col-lg-12.right")[0].appendChild(document.createElement("div"));
	e.setAttribute("style", "position: fixed; top: 100px; right: 250px; max-width: 250px;");
	let t = e.appendChild(document.createElement("ul")),
		o;
	t.id = "mcmodder-sidebar";
	editorLoad();
	let a = $("p.title");
	for (let e in a.toArray()) {
		a[e].id = "mcmodder-title-" + e;
		o = t.appendChild(document.createElement("li"));
		o.setAttribute("style", "height: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;");
		switch (parseInt(e)) {
			case 18:
				o.innerHTML = '<i class="mcmodder-slim-light fa fa-check" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-18">CFID:</a>';
				break;
			case 19:
				o.innerHTML = '<i class="mcmodder-slim-light fa fa-check" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-19">MRID:</a>';
				break;
			default:
				o.innerHTML = '<i class="mcmodder-slim-danger fa fa-close" style="margin-right: 5px"></i><a class="mcmodder-fastlink" style="margin-right: 5px" href="#mcmodder-title-' + e + '">' + a[e].innerHTML + "</a>"
		}
		switch (parseInt(e)) {
			case 12:
				o.innerHTML += '<ul style="margin-left: 30px;"><li>客户端: <span class="mcmodder-content-1" style="color: gray"></span></li><li>服务端: <span class="mcmodder-content-2" style="color: gray"></span></li></ul>';
				o.style.removeProperty("height");
				break;
			case 4:
				o.innerHTML += '<ul style="margin-left: 30px;"><li>核心: <span class="mcmodder-content-1" style="color: gray"></span></li><li>其他: <span class="mcmodder-content-2" style="color: gray"></span></li></ul>';
				o.style.removeProperty("height");
				break;
			case 7:
				let e = o.innerHTML + '<ul style="margin-left: 30px;">';
				$("div.checkbox", $("p#mcmodder-title-6")
						.parent())
					.each(function() {
						e += '<li api="' + $("input[data-multi-name=class-data]", this)
							.attr("value") + '" style="">' + $("label", this)
							.text() + ': <span class="mcmodder-content-' + $("input[data-multi-name=class-data]", this)
							.attr("value") + '" style="color: gray"></span></li>'
					});
				e += "</ul>";
				o.innerHTML = e;
				o.style.removeProperty("height");
				break;
			default:
				o.innerHTML += '<span class="mcmodder-content" style="color: gray"></span>'
		}
		$("a", o)
			.bind("click", function() {
				document.getElementById(this.href.split("#")[1])
					.style.backgroundColor = "gold";
				setTimeout(() => {
					scrollBy(0, window.innerHeight / -2.5)
				}, 20);
				setTimeout(() => {
					document.getElementById(this.href.split("#")[1])
						.style.removeProperty("background-color")
				}, 1e3)
			})
	}
	$("li", $("div.common-class-category")[0])
		.each(function() {
			this.style.width = "10000px";
			$(this.appendChild(document.createElement("span")))
				.css({
					color: "gray",
					"font-size": "12px"
				})
				.html($("a", this)
					.attr("data-original-title"));
			$("a", this)
				.bind("click", function() {
					setTimeout(() => {
						const e = ["", "科技", "魔法", "冒险", "农业", "装饰", "", "LIB", "", "", "", "", "", "", "", "", "", "", "", "", "", "魔改", "", "实用", "辅助"];
						let t = $("ul#mcmodder-sidebar")
							.children()[4];
						$("span.mcmodder-content-2", t)[0].innerHTML = "";
						$("span.mcmodder-content-1", t)[0].innerHTML = $("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")[0])
							.length > 0 ? e[parseInt($("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")[0])
								.attr("data-category-id"))] : "";
						$("a.normal.gray[data-category-selected=true]", $("div.common-class-category")[0])
							.each(function() {
								$("span.mcmodder-content-2", t)[0].innerHTML += $(this)
									.text() + ", "
							});
						$("i", t)[0].className = $("a:not(.normal.gray)[data-category-selected=true]", $("div.common-class-category")[0])
							.length < 1 || $("a.normal.gray[data-category-selected=true]", $("div.common-class-category")[0])
							.length < 1 ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check";
						$(".tooltip.bs-tooltip-top.show")
							.remove()
					}, 100)
				})
		});
	$("input[type=text]")
		.each(function() {
			this.addEventListener("focusout", function() {
				if (this.parentNode.parentNode.childNodes[0].className === "title") {
					let e = $("ul#mcmodder-sidebar")[0].childNodes[parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", ""))];
					$("i", e)[0].className = this.value === "" ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check";
					$("span.mcmodder-content", e)[0].innerHTML = this.value
				} else if (this.parentNode.className === "bootstrap-tagsinput") {
					let e = $("ul#mcmodder-sidebar")[0].childNodes[parseInt(this.parentNode.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", ""))];
					$("span.mcmodder-content", e)[0].innerHTML = "";
					$("i", e)[0].className = $("span.tag.label.label-info", this.parentNode)
						.length < 1 ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check";
					$("span.tag.label.label-info", this.parentNode)
						.each(function() {
							$("span.mcmodder-content", e)[0].innerHTML += $(this)
								.text() + ", "
						})
				}
			})
		});
	$("input[type=radio]")
		.bind("click", function() {
			let e = $("ul#mcmodder-sidebar")[0].childNodes[parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", ""))];
			if (this.parentNode.parentNode.childNodes[0].id != "mcmodder-title-12") {
				$("span.mcmodder-content", e)[0].innerHTML = $("label", this.parentNode)
					.text();
				$("i", e)[0].className = this.id.split("-")[this.id.split("-")
					.length - 1] === "0" ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check"
			} else {
				$("span.mcmodder-content-" + (this.id.includes("class-data-mode-1") ? "1" : "2"), e)[0].innerHTML = $("label", this.parentNode)
					.text();
				$("i", e)[0].className = $("input#class-data-mode-1-0")[0].checked || $("input#class-data-mode-2-0")[0].checked ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check"
			}
		});
	$("input[type=checkbox]")
		.bind("change", function() {
			let e = $("ul#mcmodder-sidebar")[0].childNodes[parseInt(this.parentNode.parentNode.childNodes[0].id.replace("mcmodder-title-", ""))];
			$("span.mcmodder-content", e)[0].innerHTML = "";
			$("i", e)[0].className = "mcmodder-common-danger fa fa-close";
			$("input[type=checkbox]", this.parentNode.parentNode)
				.each(function() {
					if (this.checked) {
						$("span.mcmodder-content", e)[0].innerHTML += $("label", this.parentNode)
							.text()
							.split(" (")[0] + ", ";
						$("i", e)[0].className = "mcmodder-common-light fa fa-check"
					}
				})
		});
	$("input,label", $("p#mcmodder-title-8.title")[0].parentNode)
		.bind("click", function() {
			setTimeout(() => {
				let e = $("ul#mcmodder-sidebar")[0].childNodes[8];
				$("i", e)[0].className = $("img#class-cover-preview-img")[0].src.indexOf("base64") < 0 || $("input#class-data-cover-delete")
					.checked ? "mcmodder-common-danger fa fa-close" : "mcmodder-common-light fa fa-check"
			}, 200)
		});
	$("input", $("p#mcmodder-title-7.title")[0].parentNode)
		.bind("change", function() {
			let e = $("ul#mcmodder-sidebar")[0].childNodes[7];
			$("span.mcmodder-content", e)[0].innerHTML = ""
		});
	let n = function(t, o) {
		for (i in $("div.radio", $(`p#mcmodder-title-${t}.title`)[0].parentNode)
			.toArray()) {
			let e = $("div.radio", $(`p#mcmodder-title-${t}.title`)[0].parentNode)[i].appendChild(document.createElement("span"));
			e.className = "mcmodder-tip";
			e.innerHTML = o[i]
		}
		$("p.tips", $(`p#mcmodder-title-${t}.title`)[0].parentNode)
			.remove()
	};
	n(12, ["", "需要正确安装在客户端上才能运行模组。", "不安装也可以运行模组，但安装后提供额外的功能。", "安装后不会有任何效果，或是导致游戏无法正常启动。", "", "需要正确安装在服务端上才能运行模组。", "不安装也可以运行模组，但安装后提供额外的功能。", "安装后不会有任何效果，或是导致游戏无法正常启动。"]);
	n(16, ["", "状态正常，保持更新。", "开发成员超过 6 个月但不满 1 年没有发布更新文件，或是仅发布了相关更新计划。", "开发成员超过 1 年没有发布更新文件，或明确表示弃坑。"]);
	n(17, ["作者未明确表态。同样适用于源码已被公开，但指定的协议并不属于开源许可协议的情况~", "源码已被公开，且已指定开源许可协议。常见的开源许可协议包括 GPL, LGPL, MIT, BSD, MPL, Apache License 等。许可协议通常需以源码所在地为准~", "作者已声明不会公开模组源码。"]);
	$($("div.text-danger")[0].appendChild(document.createElement("button")))
		.attr({
			class: "btn btn-sm btn-dark",
			style: "margin-left: 10px;"
		})
		.html("一键刷新")
		.bind("click", () => {
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
				let i = document.createElement("html");
				i.innerHTML = await t.text();
				$("div.common-rowlist-block:nth-child(2) > div:nth-child(2)")[0].innerHTML = $("div.common-rowlist-block:nth-child(2) > div:nth-child(2)", i)[0].innerHTML;
				$(this)
					.html("一键刷新")
			};
			e()
		})
}

function adminInit() {
	const e = new MutationObserver(function(t, e) {
		for (let e of t) {
			let e = $("#connect-frame > div.page-header > h1.title")[0];
			if ($(e)
				.text() === "模组区内容审核") {
				let e = $(".container-widget")[0];
				e.insertBefore(e.childNodes[2], e.childNodes[1]);
				$($(".select-row")[0].appendChild(document.createElement("button")))
					.attr({
						id: "mcmodder-check-verification",
						class: "btn",
						title: "快捷统计全部所管理模组区域的待审项数目，并予以高亮提示！对资深编辑员不适用。"
					})
					.html("一键查询待审项")
					.bind("click", function() {
						$("#mcmodder-check-verification")
							.text("一键查询待审项 (加载中...)");
						let e = $("#class-version-list > option");
						let a = e.toArray()
							.map(e => $(e)
								.attr("value"));
						let n = 1,
							r = 0;
						let l = async function(e) {
							let t = await fetch("https://admin.mcmod.cn/frame/pageVerifyMod-list/", {
								method: "POST",
								headers: {
									"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
								},
								body: 'data={"classID":"' + e + '"}'
							});
							let i = await t.text();
							let o = parseInt(toChinese(i)
								.split("总待审：")[1].split("个。")[0]);
							if (o > 0 && r === 0) $("button.btn:nth-child(2)")
								.click();
							r += o;
							if (o > 0) {
								let e = $("ul.dropdown-menu:nth-child(1)")[0].childNodes[n];
								e.style.backgroundColor = "gold";
								if ($("span.text-danger", e.childNodes[0])
									.length > 0) $("span.text-danger", e.childNodes[0])
									.remove();
								e.childNodes[0].innerHTML += `<span class="text-danger">${o}个待审！</span>`
							}
							if (a.length > n + 1) {
								setTimeout(() => {
									l(a[++n])
								}, 300);
								return
							} else $("#mcmodder-check-verification")
								.html(`一键查询待审项 (${r}个)`)
						};
						if (a) l(a[1])
					});
				const i = new MutationObserver(function(t, e) {
					for (let e of t) {
						if (e.target.id === "verify-window-frame" && $(e.addedNodes)
							.filter((e, t) => t.className.includes("verify-info-table"))
							.length) {
							$(".verify-copy-btn")
								.parent()
								.filter((e, t) => $(t)
									.css("position") === "absolute")
								.remove();
							textCompare()
						}
					}
				});
				i.observe($("#connect-frame-sub")[0], {
					childList: true,
					subtree: true
				})
			}
			if ($(e)
				.text() === "样式管理") {
				const o = new MutationObserver(function(e, t) {
					for (let i of e) {
						if (!(i.addedNodes.length > 7 || i.removedNodes.length > 7) || $(".item-list-table")
							.length) return;
						let e = i.target.appendChild(document.createElement("table"));
						e.className = "table table-bordered item-list-table item-list-table-1";
						e.innerHTML = '<thead><tr><th colspan="3"><span class="title"><a target="_blank" href="//www.mcmod.cn/class/8.html">[M3]更多喵呜机 (More Meowing Machinery)</a> 的 物品/方块 资料 (预览)</span></th></tr></thead><tbody><tr><th class="item-list-type-left" style="padding: 0px">一级分类</th><th class="item-list-type-left" style="padding: 0px">二级分类</th><td class="item-list-type-right" style="padding: 0px"><ul><li><span><a href="/item/5281.html" target="_blank"><img class="icon" alt="锡矿石" src="//i.mcmod.cn/item/icon/32x32/0/5281.png?v=3" width="15" height="15"></a><a href="/item/5281.html" target="_blank" >锡矿石</a></span></li><li><span><a href="//www.mcmod.cn/item/40226.html" target="_blank"><img class="icon" alt="锇矿石" src="//i.mcmod.cn/item/icon/32x32/4/40226.png?v=5" width="15" height="15"></a><a href="//www.mcmod.cn/item/40226.html" target="_blank" >锇矿石</a></span></li><li><span><a href="/item/40227.html" target="_blank"><img class="icon" alt="铜矿石" src="//i.mcmod.cn/item/icon/32x32/4/40227.png?v=3" width="15" height="15"></a><a href="//www.mcmod.cn/item/40227.html" target="_blank" >铜矿石</a></span></li><li><span><a href="/item/40337.html" target="_blank"><img class="icon alt="盐块" src="//i.mcmod.cn/item/icon/32x32/4/40337.png?v=2" width="15" height="15"></a><a href="//www.mcmod.cn/item/40337.html" target="_blank" >盐块</a></span></li></ul></td></tr></tbody>';
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
				o.observe($("div#connect-frame-sub")[0], {
					childList: true
				})
			}
		}
	});
	e.observe($(".connect-area")[0], {
		childList: true
	})
}

function rankInit() {
	addStyle(".rank-list-block li {width: auto; display: block; margin: 6px}  .progress-bar {background-color: gold; color: black}  .progress {border-radius: .0rem}");

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
		let c = t.appendChild(document.createElement("ul"));
		let s = i.appendChild(document.createElement("ul"));
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
			if (l < h / 3) e = c.appendChild(document.createElement("li"));
			else if (l < h * 2 / 3) e = s.appendChild(document.createElement("li"));
			else e = m.appendChild(document.createElement("li"));
			let i = e.appendChild(document.createElement("div"));
			let o = $(d[l])
				.attr("data-content");
			if (o.includes("字节")) o = o.replace("字节", " B")
				.replace("(约", '<span style="color: gray; display: inline">(~')
				.replace("个汉字)", "汉字)</span>");
			else o = o.replace("次", " 次");
			let a = $("a", d[l])[0].href;
			let n = parseFloat($("span.score", d[l])
				.text());
			if (isNaN(n)) n = 0;
			f += n;
			let r = $("a.name", d[l])
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
			i.style.width = "75%";
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
			i.innerHTML = `<p style="font-size: 14px; height: 20px; overflow: hidden;">${t}<a style="text-align: left; font-weight: bold; display: inline; font-size: 14px;" href="${a}" target="_blank">${r+(r===currentUsername?" (我)":"")}</a> (${n}%) </p><div class="progress" style="width: 100%;height: 20px;position:relative"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${n/p*100}%;"><span style="text-align: center; display: inline; position: absolute">${o}</span></div>`;
			if (r === currentUsername) $("a", i)[0].style.color = "red";
			u += parseInt(o.split(" B")[0].replace(",", ""))
		}
		$("ul", e)[0].remove();
		return {
			value: u,
			rate: f
		}
	}
	let t = e($(".rank-list-block")[0]),
		i = e($(".rank-list-block")[1]);
	if (t.value || i.value) $("<span>")
		.appendTo(".rank-list-frame")
		.attr("class", "mcmodder-golden-alert")
		.html(`全体百科用户在 ${$(".rank-search-area .badge-secondary").first().text()} 累计贡献了` + (i.value ? `约 <span class="mcmodder-common-light">${parseInt(i.value*100/i.rate).toLocaleString()}</span> 次` : "") + (t.value ? `共约 <span class="mcmodder-common-light">${parseInt(t.value*100/t.rate).toLocaleString()}</span> 字节` : "") + "的编辑量！");
	$(".popover")
		.remove();
	setTimeout(commentInit, 1e3);
	let o = getStartTime(new Date(parseInt(window.location.href.split("starttime=")[1]?.split("&endtime=")[0] * 1e3)), 0) / 1e3;
	let a = getStartTime(new Date(parseInt(window.location.href.split("endtime=")[1]?.split("&page=")[0] * 1e3)), 0) / 1e3;
	if (!(o && a)) return;
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
			let i = document.createElement("html");
			i.innerHTML = await t.text();
			$(".rank-list-block:nth-child(1) li", i)
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
			common_msg(PublicLangData.remind, `成功保存 ${new Date(o*1e3).toString()} 的贡献数据~`, "ok")
		}
		o += 24 * 60 * 60;
		if (o <= a) setTimeout(n(o), 1e3)
	};
	n(o)
}

function verifyInit() {
	if ($("p.empty")
		.length) return;
	let e = $(".verify-list-frame .list-row-limit p"),
		t = e.text()
		.match(/\d+/g);
	e.html(`<ul class="verify-rowlist"><li><span class="title">${t[1]}</span><span class="text">48 小时内已处理</span></li><li><span class="title">${t[2]}</span><span class="text">今日已处理</span></li><li><span class="title">${t[3]}</span><span class="text">今日新提交</span></li><li><span class="title">${t[4]}</span><span class="text">剩余待审</span></li></ul>`);
	$(".table > thead > tr:nth-child(1) > th:nth-child(3)")[0].innerHTML += "&nbsp;";
	$(".table > thead > tr:nth-child(1) > th:nth-child(4)")[0].style.width = "25%";
	addStyle(".table-bordered thead td, .table-bordered thead th {text-align: center}  .btn-group-sm > .btn, .btn-sm {padding: .0rem .5rem}");
	$(".table > tbody > tr > td:nth-child(4) > p")
		.each(function() {
			this.style.display = "inline";
			this.innerHTML = this.innerHTML.replace("已通过", '<i class="fa fa-check"></i>已通过')
				.replace("已退回", '<i class="fa fa-close"></i>已退回')
				.replace("退回次数:", '<i class="fa fa-mail-reply"></i>')
				.replace("审核中", '<i class="fa fa-spinner"></i>审核中')
				.replace("已撤回", '<i class="fa fa-mail-reply"></i>已撤回')
				.replace("审核人: ", '<i class="fa fa-mortar-board"></i>')
				.replace("最后审核: ", '<i class="fa fa-clock-o"></i>')
				.replace("当前附言: ", '<i class="fa fa-lightbulb-o"></i>') + " / "
		});
	$(".table i.fa-lightbulb-o")
		.parent()
		.each(function() {
			let t = $(this)
				.text(),
				i = "";
			for (let e = 0; e < t.length; e++) i += t[e].charCodeAt() <= 255 ? t[e] : " ";
			let e = i.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
			e.forEach(e => {
				this.innerHTML = t.replace(e, '<a href="' + e + '" target="_blank">' + e + "</a>")
			})
		});
	const o = [{
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
	let a = new Array(o.length)
		.fill(null)
		.map(() => [0, 0, 0, 0]);
	$(".verify-list-list-table tbody tr")
		.each(function() {
			let i = $("td:nth-child(2)", this)
				.text();
			o.forEach((e, t) => {
				if (e.reg.test(i) && (!e.exclude || !i.includes(e.exclude)) && (!e.exclude2 || !i.includes(e.exclude2))) {
					$(this)
						.attr("edit-type", t.toString());
					a[t][0]++;
					let e = $("td:nth-child(4) p:first-child()", this)
						.text();
					if (e.includes("已通过")) a[t][1]++;
					else if (e.includes("已退回")) a[t][2]++;
					else if (e.includes("审核中")) a[t][3]++
				}
			})
		});
	$("[edit-type=3],[edit-type=9]")
		.each(function() {
			let e = $("td:nth-child(4)", this),
				i = "item";
			if (!e.text()
				.includes("审核中")) return;
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
			if (t.length) e.append(` <a href="/${i}/edit/${t.attr("href").split("/"+i+"/")[1].split(".html")[0]}/" target="_blank">查看改动</a>`)
		});
	let i = parseInt((new Date)
		.getTime() / 1e3);
	let n = window.location.href.split("verify.html?")[1]?.split("&page=")[0];
	const r = 24 * 60 * 60;
	$(".verify-list-search-area")[0].innerHTML += `<a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${n}&starttime=${i-30*r}&endtime=${i}" style="margin-left: 8px;">近30天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${n}&starttime=${i-7*r}&endtime=${i}" style="margin-left: 8px;">近7天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${n}&starttime=${i-3*r}&endtime=${i}" style="margin-left: 8px;">近3天</a><a class="btn btn-light border-dark btn-sm" target="_blank" href="/verify.html?${n}&starttime=${i-1*r}&endtime=${i}" style="margin-left: 8px;">近24小时</a>`;
	let l = document.createElement("div");
	l.className = "verify-list-search-area";
	addStyle(".verify-list-search-area label span {color: gray; margin-left: 0px;}");
	o.forEach((e, t) => {
		if (!a[t][0]) return;
		let i = document.createElement("div");
		i.className = "checkbox";
		i.style.display = "inline-block";
		let o = `<input type="checkbox" id="mcmodder-type-${t}"><label for="mcmodder-type-${t}">${e.label} <span>(`;
		if (a[t][1]) o += `<span class="text-success">${a[t][1]}</span>`;
		if (a[t][2]) o += `<span class="text-danger">${a[t][2]}</span>`;
		if (a[t][3]) o += `<span class="text-muted">${a[t][3]}</span>`;
		o += `)</span></label>`;
		$(i)
			.html(o);
		$("span:not(span:last-child())", i)
			.each(function() {
				this.outerHTML += "/"
			});
		$("input", i)
			.bind("change", function() {
				let e = [],
					t = $("#mcmodder-verify-search")
					.val()
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
			});
		$(i)
			.appendTo($(l))
	});
	$(l)
		.appendTo(".verify-list-list-head fieldset");
	l = document.createElement("div");
	l.className = "verify-list-search-area";
	$(document.createElement("input"))
		.attr({
			id: "mcmodder-verify-search",
			class: "form-control",
			placeholder: "搜索...",
			style: "text-align: center;"
		})
		.bind("change", function() {
			let e = [],
				t = $("#mcmodder-verify-search")
				.val()
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
		.appendTo($(l));
	$(l)
		.appendTo(".verify-list-list-head fieldset");
	if (getConfig("fastUrge")) {
		$($(".table > thead > tr > th:nth-child(3)")[0].appendChild(document.createElement("button")))
			.attr({
				class: "btn btn-dark btn-sm",
				id: "mcmodder-fast-urge",
				title: "一键对当前列表中可催审的审核项催审！审核项提交 24 小时后可催审，首次催审后每隔 1 小时可再次催审。催审并不会对管理员发送强提醒，但能够使审核项在后台的待审列表中排在更靠前的位置！"
			})
			.html("一键催审")
			.bind("click", function() {
				$(this)
					.html("一键催审 (处理中...)");
				let a = $(".verify-urge-btn")
					.toArray();
				let n = a.map(e => $(e)
					.attr("data-id"));
				let r = 0,
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
						r++;
						$(a[l])
							.html("催审成功")
							.attr("class", "ml-1 text-muted")
					}
					if (n.length > l + 1) {
						setTimeout(() => {
							d(n[++l])
						}, 300);
						return
					} else $(this)
						.html(`一键催审 (${r}项已处理)`)
				};
				if (n[0]) d(n[0]);
				else $(this)
					.html("一键催审 (无可催审项)")
			})
	}
}

function queueInit() {
	let e = $(".verify-queue-list-table tr")
		.filter((e, t) => $("a[rel=nofollow]", t)
			.text() === currentUsername)[0];
	e.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});
	e.style.backgroundColor = "gold";
	setTimeout(() => {
		$(e)
			.removeAttr("style")
	}, 1e3)
}

function centerInit() {
	let d = window.location.href.split("center.mcmod.cn/")[1].split("/")[0],
		c, s, m, e;
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
		common_msg(PublicLangData.remind, PublicLangData.center.setting.complete, "ok")
	};
	const t = new MutationObserver(function(t, a) {
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
				let e = $("div.center-main.setting.menuarea")[0];
				$("<li>")
					.html('<a class="mcmodder-slim-dark" data-menu-select="9" href="javascript:void(0);">插件设置</a>')
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
				let t = e.appendChild(document.createElement("div"));
				let i = "",
					o = 0;
				for (let e of settingList) {
					switch (e.type) {
						case 2:
							i += `<div class="center-setting-block"><div class="setting-item"><span class="title">${e.title}:</span><input type="text" class="form-control" placeholder="${e.title}.." data-todo="${e.todo}" data-id="${o}"></div><p class="text-muted">${e.description}</p></div>`;
							break;
						case 3:
							i += `<div class="center-setting-block"><div class="setting-item"><span class="title">${e.title}:</span><input type="color" class="form-control" placeholder="${e.title}.." data-todo="${e.todo}" data-id="${o}"></div><p class="text-muted">${e.description}</p></div>`;
							break;
						default:
							i += `<div class="center-setting-block"><div class="setting-item"><div class="checkbox" data-todo="${e.todo}"><input id="${e.id}" type="checkbox" data-id="${o}"><label for="${e.id}">${e.title}</label></div></div><p class="text-muted">${e.description}</p></div>`
					}
					o++
				}
				t.outerHTML = `<div class="center-block hidden" data-menu-frame="9" style="display: none;"><div class="center-block-head"><span class="title mcmodder-slim-dark">Mcmodder设置</span><span style="font-size: 12px; color: gray; margin-left: 1em;">版本 v${mcmodderVersion} ~ ☆</span></div><div class="center-content">${i}</div></div>`;
				$("div.center-block[data-menu-frame=9] div.checkbox > input")
					.each(function() {
						this.checked = getConfig($(this)
							.parent()
							.attr("data-todo")) ? true : false;
						$(this)
							.bind("click", window.updateSettings)
					});
				$("div.center-block[data-menu-frame=9] input.form-control")
					.each(function() {
						this.value = getConfig($(this)
							.attr("data-todo")) || settingList[$(this)
							.attr("data-id")]?.value || "";
						$(this)
							.bind("change", window.updateSettings)
					});
				a.disconnect();
				$("<pre>")
					.appendTo($("#mcmodder-splash-tracker")
						.parents(".center-setting-block"))
					.attr("style", "max-height: 300px;")
					.html(`<code id="mcmodder-splash-text">${GM_getValue("mcmodderSplashList")}</code>`)
			}
		}
	});
	const o = new MutationObserver(function(t, n) {
		for (let e of t) {
			if (e.addedNodes[0].className = "center-main lv" && $(".lv-title")
				.length) {
				let t = parseInt($("i.common-user-lv")
						.text()
						.replace("Lv.", "")),
					e = $(".lv-title")[0],
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
						for (i = parseInt((c + 1) / 1e3) * 1e3; i <= Math.min(19e3, parseInt($(this)
							.val() / 1e3 - 1) * 1e3); i += 1e3) {
							e += (i + 1e3) / 2
						}
						for (i = parseInt((s + 1) / 5e4) * 5e4; i <= Math.min(95e4, parseInt($("#mcmodder-editbyte")
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
						for (i = parseInt((s + 1) / 5e4) * 5e4; i <= Math.min(95e4, parseInt($(this)
							.val() / 5e4 - 1) * 5e4); i += 5e4) {
							e += (i + 5e4) / 100
						}
						for (i = parseInt((c + 1) / 1e3) * 1e3; i <= Math.min(19e3, parseInt($("#mcmodder-editnum")
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
									.trigger("change");
								return;
							case 38:
								$(this)
									.val(t + 5e4);
								$(this)
									.trigger("change")
						}
					}
				};
				$(e)
					.append(`<span>总经验: <span id="mcmodder-totalexp" style="margin-right: 0px">${a.toLocaleString()} Exp</span></span><span>次数计算器: <input id="mcmodder-editnum"></span><span>字数计算器: <input id="mcmodder-editbyte"></span>`);
				$("#mcmodder-editnum")
					.val(c);
				$("#mcmodder-editbyte")
					.val(s);
				$("#mcmodder-editnum")
					.bind({
						change: window.editnum.change,
						keydown: window.editnum.keydown
					});
				$("#mcmodder-editbyte")
					.bind({
						change: window.editbyte.change,
						keydown: window.editbyte.keydown
					});
				if (c === undefined) $("#mcmodder-editnum, #mcmodder-editbyte")
					.attr({
						disabled: "disabled",
						placeholder: "需要从主页获取数据.."
					});
				n.disconnect()
			}
		}
	});
	const a = new MutationObserver(function(t, e) {
		for (let e of t) {
			if (e.removedNodes[0]?.className === "loading") {
				$(".center-content.background")
					.contents()
					.filter((e, t) => t.nodeType === 8)
					.each(function() {
						$(this)
							.parent()
							.append(this.textContent)
					})
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
				let t = $(".center-total > ul")[0];
				let i = $(t)
					.contents()
					.filter((e, t) => t.nodeType === 8)[0];
				let o = t.appendChild(document.createElement("li"));
				o.outerHTML = i.textContent.replace(" 次", " 字节");
				t.insertBefore($(".center-total li:last-child()")[0], $(".center-total li:nth-child(4)")[0]);
				i.remove();
				o = t.appendChild(document.createElement("li"));
				o.innerHTML = '<span class="title">科龄</span><span class="text">' + parseInt((Date.now() - Date.parse($(".center-total li:nth-child(7) span.text")
						.text())) / (24 * 60 * 60 * 1e3))
					.toLocaleString() + " 天 </span>";
				$(".center-total li")
					.each(function() {
						let e = $(".title", this);
						$(".text", this)
							.attr("class", "title");
						e.attr("class", "text")
					});
				c = parseInt($(".center-total li:nth-child(2) .title")
					.text()
					.replace(" 次", "")
					.replaceAll(",", ""));
				s = parseInt($(".center-total li:nth-child(3) .title")
					.text()
					.replace(" 字节", "")
					.replaceAll(",", ""));
				m = parseInt($(".center-total li:nth-child(4) .title")
					.text()
					.replace(" 字节", "")
					.replaceAll(",", ""));
				$("#mcmodder-editnum")
					.val(c);
				$("#mcmodder-editbyte")
					.val(s);
				$("#mcmodder-editnum, #mcmodder-editbyte")
					.removeAttr("disabled");
				$("#mcmodder-editnum, #mcmodder-editbyte")
					.removeAttr("placeholder");
				$(".admin-list ul")
					.each(function() {
						if (this.clientHeight > 400) {
							$(this)
								.attr("style", "max-height: 400px; overflow: hidden;");
							$(this.parentNode.appendChild(document.createElement("a")))
								.attr({
									class: "mcmodder-slim-dark",
									style: "width: 100%; display: inline-block; text-align: center;"
								})
								.html("轻触展开")
								.bind("click", function() {
									let e = $("ul", this.parentNode)[0];
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
								t = "";
							if ($(".title", this)
								.text()
								.includes("编辑员")) t = "editorModList";
							else if ($(".title", this)
								.text()
								.includes("管理员")) t = "adminModList";
							else if ($(".title", this)
								.text()
								.includes("开发者")) t = "devModList";
							$("li a", this)
								.each(function() {
									e += this.href.split("/class/")[1].split(".html")[0] + ","
								});
							if (getConfig(t, "userProfile") != e) {
								setConfig(t, e, "userProfile");
								common_msg(PublicLangData.remind, "成功更新个人模组区域~", "ok")
							}
						})
				}
				let a = JSON.parse(GM_getValue("rankData")),
					n = [
						[0, "center"],
						[1, "mcmod"],
						[2, "cn"]
					],
					r = {};
				Object.keys(a)
					.forEach(e => {
						let t = new Date((e - 24 * 60 * 60) * 1e3),
							i = `${1900+t.getYear()}-${(1+t.getMonth()).toString().padStart(2,"0")}-${t.getDate().toString().padStart(2,"0")}`,
							o = JSON.parse(a[e]);
						o.forEach(e => {
							if (e.user == d) {
								n.push([i, parseInt(e.value)]);
								r[i] = parseInt(e.value)
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
					})
				}, 1e3);
				$($(".edit-chart-frame")[0].appendChild(document.createElement("button")))
					.attr({
						class: "btn btn-light",
						style: "position: absolute; top: 0px; left: 0px;"
					})
					.text("转为字数统计")
					.bind("click", function() {
						let e = echarts.getInstanceById($("#center-editchart-obj")
							.attr("_echarts_instance_"));
						if ($(this)
							.text() === "转为字数统计") {
							$(".title-sub", this.parentNode)
								.text("历史成功完成改动操作的字数");
							window.originalData = e.getOption();
							e.setOption({
								series: [{
									data: n
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
										return r[t] && (i = ` <b>${r[t].toLocaleString()}字节</b> (约${parseFloat((r[t]/3).toFixed(1)).toLocaleString()}汉字)`), "<p>" + e.marker + t.substring(5) + i + "</p>"
									}
								}]
							});
							this.innerHTML = "转为次数统计"
						} else {
							e.setOption(originalData);
							$(".title-sub", this.parentNode)[0].innerHTML = "历史成功完成改动操作的次数";
							this.innerHTML = "转为字数统计"
						}
					});
				if (getConfig("nightMode")) $(".post-block img")
					.bind("load", function() {
						if (this.src === "https://www.mcmod.cn/pages/class/images/none.jpg") this.src = "https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg"
					});
				setTimeout(commentInit, 1e3);
				l.disconnect()
			}
		}
	});
	if ($("#center-page-setting")
		.length > 0) t.observe($("#center-page-setting")[0], {
		childList: true
	});
	n.observe($("#center-page-home")[0], {
		childList: true
	});
	o.observe($("#center-page-rank")[0], {
		childList: true
	});
	if ($("#center-page-card")
		.length) a.observe($("#center-page-card")[0], {
		childList: true
	});
	if (getConfig("enableAprilFools")) addStyle(" .center-task-block:first-child { animation:aprilfools 2.75s linear infinite; background:#FFF; z-index:999; } @keyframes aprilfools { 0% { -webkit-transform:rotate(0deg); } 25% { -webkit-transform:rotate(90deg); } 50% { -webkit-transform:rotate(180deg); } 75% { -webkit-transform:rotate(270deg); } 100% { -webkit-transform:rotate(360deg); } } ");
	let r = window.getComputedStyle(document.body)["background-image"];
	if (r != "none") $("div.bbs-link")
		.append(`<p align="right"><a href="${r.replace('url("',"").replace('")',"")}" target="_blank">查看个人中心背景图片</a></p>`);
	$("div.bbs-link")
		.append(`<p align="right"><a href="https://www.mcmod.cn/verify.html?order=createtime&userid=${d}" target="_blank">查看近期提交审核列表</a></p>`);
	window.addUserBlacklist = function() {
		let e = getConfig("userBlacklist")
			.replaceAll(" ", "")
			.split(",");
		if (e.includes(d)) {
			setConfig("userBlacklist", e.filter(e => e != d)
				.reduce((e, t) => e + ", " + t));
			common_msg(PublicLangData.remind, `成功将 UID:${d} 从用户黑名单中移除~`, "ok")
		} else {
			e.push(d);
			setConfig("userBlacklist", e.reduce((e, t) => e + "," + t));
			common_msg(PublicLangData.remind, `成功将 UID:${d} 加入用户黑名单~`, "ok")
		}
	};
	$("div.bbs-link")
		.append(`<p align="right"><a id="mcmodder-user-blacklist" class="mcmodder-slim-danger">屏蔽该用户</a></p>`);
	$("#mcmodder-user-blacklist")[0].onclick = window.addUserBlacklist;
	addStyle(".center-total li {width:12.4%} @media(max-width:1200px) {.center-total li {width:24.5%}}")
}

function commentInit() {
	if (getConfig("commentExpandHeight")) {
		let e = getConfig("commentExpandHeight") || "300";
		addStyle(`.comment-row-text {max-height: ${e}px;}`)
	}
	let i = function() {
		if (!$("div.common-comment-block.lazy")
			.length || $("div.comment-close")
			.length)
			if (getConfig("unlockComment")) {
				const a = "common-comment-block lazy";
				let e = $("div.center-block:last-child()")[0] || $(".common-comment-block.lazy .comment-editor")[0] || $(".author-row")[0],
					t, i;
				let o = document.getElementsByClassName(a);
				if (e && (!o.length || $("div.comment-close")
					.length)) {
					i = document.createElement("div");
					i.className = a;
					i.style = "";
					t = e.appendChild(i);
					addScript(t, "comment_channel = '1';comment_user_id = '1';comment_user_editnum = '19732';comment_user_wordnum = '1356802';$(document).ready(function(){$(\".comment-channel-list li a.c1\").click();});");
					i = document.createElement("div");
					i.innerHTML = '<ul class="comment-floor"></ul>';
					t.appendChild(i);
					addScript(t, 'get_comment(comment_container,comment_type);var isUEReady=0;if($(".comment-editor-area .editor-frame").length>0&&0==isUEReady)var ueObj=$.ajax({url:"//www.mcmod.cn/static/ueditor/",async:!0,type:"post",data:{type:"comment"},xhrFields:{withCredentials:true},crossDomain:true,complete:function(e){$(".comment-editor-area .editor-frame .load").html(ueObj.responseText),isUEReady=1}});');
					if ($("div.comment-close")
						.length && $("div.comment-dl-tips")
						.length) {
						$("div.comment-close")
							.remove()
					}
				}
			}
	};
	if (window.location.href.includes("center.mcmod.cn") || window.location.href.includes("/author/")) i();
	if (window.location.href.includes("#comment-")) $(".common-comment-block.lazy")[0]?.scrollIntoView({
		behavior: "smooth",
		block: "center"
	});
	const e = new MutationObserver(function(t, e) {
		function a(e) {
			if ($("input.comment-id", e)[0]?.value === window.location.href.split("comment-")[1]) {
				setTimeout(() => {
					e.scrollIntoView({
						behavior: "smooth",
						block: "center"
					});
					e.style.backgroundColor = "gold";
					setTimeout(() => {
						e.style.removeProperty("background-color")
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
							this.innerHTML += '快速跳转至：第&nbsp;<input id="mcmodder-gotopage" class="form-control" style="width: 50px; text-align: center; display: inline;">&nbsp;页。';
							$("#mcmodder-gotopage", this)
								.val($(this)
									.text()
									.replace("当前 ", "")
									.split(" / ")[0]);
							$("#mcmodder-gotopage", this)
								.bind("focusout", function() {
									if (parseInt(this.value) < 1 || parseInt(this.value) > parseInt($(this)
										.text()
										.replace("当前 ", "")
										.split(" / ")[1])) return;
									comment_nowpage = parseInt(this.value);
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
								.attr("data-uid") == currentUid && window.location.href.includes("/class/")) $(".common-user-lv", this)
								.attr({
									class: "common-user-lv manager",
									title: "本模组管理员 (" + userLv.title.replace("本模组管理员 (", "")
										.replace("本模组编辑员 (", "")
										.replaceAll(")", "") + ")",
									href: "https://t.bilibili.com/779290398405165095"
								})
								.text("本模组管理员");
							a(this);
							let e = $("div.comment-row-text-content.common-text.font14", this)[0];
							if (getConfig("ignoreEmptyLine")) $(e)
								.children()
								.filter((e, t) => t.innerHTML === "<br>")
								.remove();
							let t = parseInt(e.clientHeight);
							if (t > o && t < 300 && o < 300) {
								let e = this.appendChild(document.createElement("a"));
								e.outerHTML = '<a class="fold text-muted"><i class="fas fa-chevron-down"></i>展开更多内容</a>';
								this.insertBefore($("a.fold.text-muted", this)[0], $("ul.comment-tools", this)[0])
							}
							if (t > i && getConfig("missileAlert")) $("a.fold.text-muted", this)[0].innerHTML += ' - <span class="mcmodder-slim-danger">核弹警告！</span>本楼展开后将会长达 <span class="mcmodder-common-danger">' + t.toLocaleString() + " px</span>！"
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
							let t = $("div.comment-reply-row-text-content.common-text.font14", this)[0];
							let i = $(t)
								.html()
								.replaceAll("<br>", ""),
								o = "";
							for (let e = 0; e < i.length; e++) o += i[e].charCodeAt() <= 255 ? i[e] : " ";
							let e = o.match(/https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/g) || [];
							e.forEach(function(e) {
								$(t)
									.html(i.replace(e, '<a href="' + e + '" target="_blank">' + e + "</a>"))
							})
						})
				}
			} else if (e.target.className === "common-comment-block lazy" && e.addedNodes.length > 0) i()
		}
	});
	if ($(".common-comment-block.lazy")
		.length) e.observe($(".common-comment-block.lazy")[0], {
		childList: true,
		subtree: true
	})
}

function scheduleEvents() {
	if (getConfig("autoCheckUpdate")) {
		let n = (e, t) => {
			const i = e.split(".")
				.map(Number);
			const o = t.split(".")
				.map(Number);
			for (let e = 0; e < Math.max(i.length, o.length); e++) {
				const a = i[e] || 0;
				const n = o[e] || 0;
				if (a > n) return 1;
				if (a < n) return -1
			}
			return 0
		};
		let e = parseInt(GM_getValue("nextAutoUpdateTime", "scheduledEvent")) || 0,
			t = Date.now();
		setTimeout(async function() {
			let e = async function(e) {
				let t = await fetch("https://bbs.mcmod.cn/forum.php?mod=viewthread&tid=20483", {
					method: "GET"
				});
				let i = $("<html>")
					.html(await t.text()),
					o;
				let a = i.find("#postmessage_85878 font[size=5]")
					.first()
					.text()
					.split("Mcmodder v")[1].split(" --")[0];
				if (n(mcmodderVersion, a) < 0) {
					let e = i.find("#postmessage_85878 .spoilerbody")
						.first()
						.html();
					o = "https://bbs.mcmod.cn/" + i.find(".attnm a")
						.first()
						.attr("href");
					Swal.fire({
							type: "info",
							title: "Mcmodder 有新版本可用！",
							html: `<div class="mcmodder-golden-alert"><span class="mcmodder-common-danger">${mcmodderVersion}</span> → <span class="mcmodder-common-light">${a}</span></div><div class="mcmodder-changelog">${e}</div>`,
							confirmButtonText: "立即下载",
							showCancelButton: true,
							cancelButtonText: "稍后提醒"
						})
						.then(e => {
							if (e.value) open(o);
							else GM_setValue("nextAutoUpdateTime", Date.now() + 60 * 60 * 1e3, "scheduledEvent")
						})
				} else GM_setValue("nextAutoUpdateTime", Date.now() + 60 * 60 * 1e3, "scheduledEvent")
			};
			e()
		}, t > e ? 1 : e - t + 100)
	}
	if (getConfig("autoCheckin")) {
		let e = parseInt(GM_getValue("nextCheckInTime", "scheduledEvent")) || 0,
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
				GM_setValue("nextCheckInTime", getStartTime(new Date), "scheduledEvent");
				if (o) try {
					common_msg(PublicLangData.remind, o, !i.state ? "ok" : "err")
				} catch (e) {
					alert(o)
				}
			} else open("https://center.mcmod.cn/")
		}, i);
		if (i < 2) return
	}
	let c = parseFloat(getConfig("autoVerifyDelay"));
	if (c && c >= .01) {
		let e = parseInt(GM_getValue("nextAutoVerifyTime", "scheduledEvent")) || 0,
			t = Date.now();
		setTimeout(async function() {
			if (document.domain != "admin.mcmod.cn") {
				open("https://admin.mcmod.cn/");
				return
			}
			let a = getConfig("adminModList", "userProfile")?.split(",");
			let n = 0,
				r = 0,
				l = "";
			let d = async function(e) {
				let t = await fetch("https://admin.mcmod.cn/frame/pageVerifyMod-list/", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
					},
					body: 'data={"classID":"' + e + '"}'
				});
				let i = await t.text();
				let o = parseInt(toChinese(i)
					.split("总待审：")[1].split("个。")[0]);
				r += o;
				if (a.length > n + 2) {
					setTimeout(() => {
						d(a[++n])
					}, 300);
					return
				} else {
					l = r ? `当前所管理的模组共有 ${r} 个待审项，请尽快处理~` : "当前无待审项~";
					try {
						common_msg(PublicLangData.remind, l, !r ? "ok" : "err")
					} catch (e) {
						alert(l)
					}
					GM_setValue("nextAutoVerifyTime", Date.now() + c * 60 * 60 * 1e3, "scheduledEvent")
				}
			};
			if (a) d(a[0])
		}, t > e ? 100 : e - t + 100);
		if (e - t < 2) return
	}
}(() => {
	"use strict";
	customStyle();
	let e = window.location.href;
	if (getConfig("forceV4") && e === "https://www.mcmod.cn/") window.location.href = "https://www.mcmod.cn/v4/";
	scheduleEvents();
	if (getConfig("enableSplashTracker") && (e === "https://www.mcmod.cn/" || e === "https://www.mcmod.cn/v4/")) setTimeout(function() {
		if (!GM_getValue("mcmodderSplashList") || GM_getValue("mcmodderSplashList") === "undefined") GM_setValue("mcmodderSplashList", "# MC百科闪烁标语\n");
		let e = $($("div.ooops div.text")[0] || $("div.splash span")[0] || document.body)
			.text();
		GM_setValue("mcmodderSplashList", GM_getValue("mcmodderSplashList") + e + "\n");
		if (common_msg) common_msg(PublicLangData.remind, `成功记录闪烁标语~ 内容为: ${e}`, "ok")
	}, 300);
	if (getConfig("freezeAdvancements")) $(".common-task-tip")
		.attr({
			id: "task-mcmodder-frozen",
			class: "mcmodder-task-tip"
		});
	if (getConfig("enableAprilFools")) {
		if (e.includes("/author/22957.html")) $("div.author-user-avatar img")[0].src = "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif"
	}
	addStyle("@keyframes fadeIn {from {opacity: 0;} to {opacity: 1;}} .common-imglist a[rel=nofollow] img, .sidebar .user-info img {border-radius: 50%} .common-rowlist-block .title, .common-imglist-block .title {background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2));} .common-center .item-table i {background-image: url(//i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png); background-position: -0px -0px; width: 34px; height: 34px;} body > .content, .fold-list-object-ul .count, .item-table-gui-slot .view, .table-striped > tbody > tr:nth-of-type(2n+1), .common-select .find-close {background-color: transparent;} .common-center .maintext .itemname .name h5, .center-block-head .title, .common-center .post-row .postname .name h5, .common-center .right .class-title h3, .common-comment-block .comment-title, .mcmodder-title, .modal-title {text-decoration: underline 4px var(--mcmodder-tc1); text-underline-position: under; line-height: 2; font-size: 24px;} .header-layer .header-layer-block .title, .center-content.admin-list .title, .modlist-filter-block .title, .relation > span, .common-center .right .tab-content ul.tab-ul p.title, .mcmodder-subtitle, .col-form-label {text-decoration: underline 3px var(--mcmodder-tc1); text-underline-position: under; line-height: 2; font-size: 18px; font-weight: unset; color: var(--mcmodder-txcolor);} .common-center {background-color: transparent; margin-top: 6em; border: unset; padding: .5em;  border-radius: 0px; margin: 0 20% 0 15%; width: 70%;} .common-center .right .class-text-top {min-height: unset; padding-right: unset;}  .common-frame {padding: 0px; max-width: unset;} .col-lg-12.common-rowlist-2 .title, .center-total li .title, .class-info-left .col-lg-6 .title, .verify-rowlist .title, .class-excount .infos .span .n {color: #333; text-align: center; display: block; width: 100%; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;} .class-excount {width: unset;} .col-lg-12.common-rowlist-2 .text, .center-total li .text, .class-info-left .col-lg-6 .text, .verify-rowlist .text {color: #666; text-align: center; display: block; width: 100%; font-size: 12px;} .common-center .maintext .item-give {width: unset; border: unset; background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2))} .common-center .maintext .item-give span {font-size: 14px; color: unset; font-family: consolas;} body .common-nav {padding: 0 .8em 0 .8em; margin-top: 8em;} .item-dict a {color: #333; font-family: consolas; border-radius: 10px; background: linear-gradient(90deg,var(--mcmodder-tca1),var(--mcmodder-tca2)); padding: 5px; margin-right: .5em;} .center-content.admin-list li, .center-content.edit-list li, .common-rowlist.borderbottom li, .header-layer .header-layer-block li, .common-center .right .class-relation-list .relation li, .item-search-frame, .item-used-frame {padding-bottom: .3em; border-bottom: 2px dashed var(--mcmodder-tca1);} .col-lg-6 {padding: 0; display: inline-block;} .header-layer {padding: 1em !important; padding-left: 3em !important; padding-right: 3em !important; background-color: var(--mcmodder-bgcolor) !important; backdrop-filter: blur(10px);} border: unset; .header-layer .header-layer-block {width: 250px;} .header-menu-widget-homepage .header-layer-block.layer-category {width: 170px !important;} .header-layer .header-layer-block li:nth-child(2n+1) {margin-right: 25px;} .class-menu-page li i, .common-fuc-group i, .header-layer-block i, .common-center .class-edit-block li a i {color: var(--mcmodder-td1); margin-right: .5em} .class-excount .star .fire i {color: goldenrod} .class-menu-page, .common-menu-page, .link-list li.link-row, .modlist-block .title p, .others-list li, #relation-frame .relation-list, #modlist-frame .modlist-list, #relation-frame .relation-list .relation-group li, #modlist-frame .modlist-list .modlist-group li, .class-excount .infos {background: transparent; border: unset;} .class-menu-page li.active, .common-menu-page li.active {border-top-color: var(--mcmodder-td2);} .center-content.lv-info .lv-bar .progress-bar, .bootstrap-tagsinput .tag {background: linear-gradient(90deg,var(--mcmodder-tc1),var(--mcmodder-tc2));} .common-center .right .class-info .class-info-left .author li {height: 60px;} .common-center .right .class-info .class-info-left .author li .avatar {width: 55px; height: 55px;} .common-center .right .class-info .class-info-left .author li .member {padding: 5px 10px; background-color: var(--mcmodder-bgcolor); border: unset; border-radius: unset; max-width: 160px;} .common-center .right .class-info .class-info-left .author li a {font-size: 14px;} .common-center .right .class-info .class-info-left .author li .avatar img {width: 55px; height: 55px; padding: 5px; border-radius: 50%;} .common-center .right .class-info .class-info-left .author .frame {height: unset;} .common-center .right .class-info .class-info-left .author li .member .name {max-width: 245px;} .common-fuc-group .action {background-color: #fff8; padding: 2px;} .tooltip-inner, body .edui-default .edui-bubble .edui-popup-content {max-width: unset; color: var(--mcmodder-txcolor); background-color: var(--mcmodder-bgcolor); border-radius: 1rem; padding: .5em 1em; animation: fadeIn .3s ease-out forwards; border: solid 10px; border-image: linear-gradient(45deg, var(--mcmodder-tc1), var(--mcmodder-tc2)) 1 stretch; clip-path: inset(0 round 1rem); position: relative; box-shadow: 5px 5px 5px gray;} .common-center .right {padding-left: 280px;} .tooltip-inner::after, .edui-default .edui-bubble .edui-popup-content::after {position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; content: ''; border-radius: 10px; z-index: -2; border: 5px solid var(--mcmodder-bgcolor);} .bs-tooltip-auto[x-placement^=\"top\"] .arrow::before, .bs-tooltip-top .arrow::before {border-top-color: var(--mcmodder-bgcolor); backdrop-filter: blur(10px);} .class-excount .star .block-left {background: linear-gradient(45deg,var(--mcmodder-tca1),var(--mcmodder-tca2));} .header-user .header-user-info .header-panel {width: 400px !important; padding-top: 70px; animation: fadeIn ease-out .2s both} .header-user .header-user-info .header-panel .header-layer {padding: 1em !important;} .header-user .header-user-info .header-panel .header-layer-block {margin-top: 75px;} .mcmodder-profile {position: absolute; left: 50%; top: -55px; transform: translate(-50%);} .mcmodder-profile img {width: 110px; height: 110px; padding: 2px; background-color: #fff; border-radius: 50%; margin-bottom: 0.8em;} .common-center .center {display: inline-block; max-width: unset;} .mcmodder-profile p {font-weight: bold;} .header-layer {position: relative;} .common-center .left, .common-center .right:not(.col-lg-12) {width: 275px;} .common-center .left {position: absolute; left: 0;} .mcmodder-class-init.col-lg-12.right {padding-right: 280px;} @media (max-width: 1280px) {.common-center .right:not(.col-lg-12) {display: none;} .mcmodder-class-init.col-lg-12.right {padding-right: 0;} .common-center {margin: 0 1% 0 1%; width: 98%;}} .class-text {margin: 0 1em 0 1em;} .mcmodder-modloader {width: 24px; height: 24px; margin: 3px; display: inline-block;} .common-nav, .common-center .left, .class-info-right, .class-text, .center-block, .center-total, .common-menu-page, .common-item-mold-list, .item-list-filter, .item-list-table, .item-row, .common-menu-area, .rank-head-frame, .rank-list-frame, .common-center .center > div:not(.right), .author-row > div:not(.dropdown), .center > fieldset, .center > ul, .center .main > div:not(.nav), .oredict-list-table, .modal-content, *:not(.center-block) > .common-comment-block.lazy, .common-center .left, .common-center .post-row, .version-content-empty, .swal2-popup, .popover, .panel, .panel-default, .panel-title, .edit-unlogining, .common-select, .item-table-main, .log-frame > p, .about-frame > *, body > .container > *, .modfile-main-frame > * {background: var(--mcmodder-bgcolor); border-radius: 1em; padding: 1em; box-shadow: rgba(50, 50, 100, 0.5) 0px 2px 4px 0px;} .bd-callout p {font-size: 12px; color: #6c757d;} #edui1, .mold, .progress-list, .class-item-type li, .post-block, .tools-list li a, .comment-row, .common-center .item-data, .item-table-area, .comment-channel-list li a, .common-icon-text.edit-history, .bd-callout, .tab-ul > .text-danger, .center-task-block, .center-content.lv-info, .center-card-block.badges, .common-center .maintext .item-give, .modlist-block, .verify-info-table, .common-world-gen-block, .common-world-gen-data, .header-search form .class-info-right > ul, .class-excount, #mcmodder-text-result, .mcmodder-golden-alert, .mcmodder-gui-alert, .mcmodder-changelog {background: var(--mcmodder-bgcolor); border-radius: 1em; margin: .6em; padding: .6em; box-shadow: rgba(50, 50, 100, 0.2) 0px 2px 4px 0px;} .mcmodder-changelog {max-height: 300px; overflow: scroll; text-align: left; font-size: 14px;} .mcmodder-changelog li {margin-left: 2em;} .mcmodder-changelog ul li {list-style-type: disc;} .tag li, .mcver li a, .common-center .maintext .itemname .tool, .common-center .right .class-relation-list .relation li, .common-fuc-group li, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-border, .common-center .post-row .postname .tool li a, .edit-tools a, .center-main.attitude li, .bootstrap-tagsinput .tag {color: var(--mcmodder-txcolor); background: var(--mcmodder-bgcolor); border-radius: 1em; box-shadow: rgba(50, 50, 100, 0.1) 0px 2px 4px 0px; padding: .2em .5em .2em .5em; line-height: unset;} .common-comment-block.lazy {width: unset; margin: 1em;} .tooltip.show {opacity: 1;} .class-info-right {vertical-align: top; display: inline-block; width: 20%;} .header-layer-block a {color: #334;} .header-layer-block li {position: relative;} .header-user:not(.unlogin) li {width: 180px;} .header-layer-block .fa {position: absolute; top: 50%; transform: translate(0, -50%); color: #666;} body .edui-default span.edui-clickable {color: #33f; text-decoration: unset;} body .edui-default .edui-toolbar .edui-button .edui-state-checked .edui-button-wrap, body .edui-default .edui-toolbar .edui-splitbutton .edui-state-checked .edui-splitbutton-body, body .edui-default .edui-toolbar .edui-menubutton .edui-state-checked .edui-menubutton-body {background-color: var(--mcmodder-tca1); border-color: var(--mcmodder-ta1);} .common-pages .page-item .page-link {background-color: transparent; border-color: #fff8;} .common-pages .page-item.active .page-link, .badge-secondary {background-color: var(--mcmodder-tca1); color: var(--mcmodder-td1); border-color: #fff8; text-shadow: 1px 1px 1px #fff8;} .modlist-filter-block ul:not(.common-class-category) li.main span {background:linear-gradient(45deg,var(--mcmodder-td1),var(--mcmodder-td2));} .form-control, .bootstrap-tagsinput {background-color: var(--mcmodder-bgcolor);} .fixed-top {position: fixed; top: 50px; width: 100%;} .item-used-frame, .item-search-frame {width: 100%; max-height: 500px; margin-bottom: .5em;} .item-table-block .power_area, .common-center .right .class-relation-list fieldset {border-color: var(--mcmodder-tca1); border-radius: .8em;} .mcmodder-rednum {z-index: 1; position: absolute; top: 4px; left: 25px; padding: 0 4px; min-width: 15px; border-radius: 10px; background-color: #fa5a57; color: #fff; font-size: 12px; line-height: 15px;} .common-center .right .class-info .class-info-right {top: 0; right: .5em; width: 270px;} .common-class-category li .normal {border-radius: 1em;} .badge {line-height: 1.5; border-radius: 1em; font-weight: unset; padding: .25em .8em;} .common-center .right .class-post-frame .post-block, .class-item-type li {width: 30%; padding: .6em;} .class-item-type li .title {font-size: 16px;} .mcmodder-content-block:hover {background-color: aliceblue;} .dark .mcmodder-content-block:hover {background-color: darkblue;} .common-center .right .class-info .mcver ul ul li {margin-right: unset;} .mcmodder-golden-alert {background-color: #fe8d; width: 90%; display: inline-block; text-align: center;} .modal-content, footer, .row.footer, .page-header, .swal2-popup, .popover {backdrop-filter: blur(20px) brightness(140%); background-color: var(--mcmodder-bgcolor);} .sidebar {background: #3d464daa; backdrop-filter: blur(5px);} .common-center .maintext .item-text {padding-right: 0;} .common-center .item-data {width: 220px;} body .header-container {background-image: linear-gradient(#434c53aa, #3c454caa); backdrop-filter: blur(20px); background-color: transparent;} .btn, .alert, .form-control, .bootstrap-tagsinput {border-radius: 1em; padding: .6em; box-shadow: rgba(50, 50, 100, 0.3) 0px 2px 4px 0px;} .mcmodder-gui-in {position: absolute; right: 0; bottom: -.25em; color: var(--mcmodder-tc1); text-shadow: 2px 2px 1px var(--mcmodder-td1);} .mcmodder-gui-out {position: absolute; right: 0; bottom: -.25em; color: var(--mcmodder-tc2); text-shadow: 2px 2px 1px var(--mcmodder-td2);} .item-list-filter .form-control {border-radius: 1em !important;} .center-task-block {width: 30%;} .center-task-border, .center-card-border {border: unset; margin: unset;} .center-main.favorite .favorite-slot-ul li, .common-user-card .card-userinfo .exp-rate {border-color: transparent; background-color: transparent;} .center-card-view {background-color: var(--mcmodder-bgcolor); margin: 4em 1em;} .center-content.post-list .post-block {padding: .6em;} .common-center .left .class-rating-block #class-rating {background: unset;} .verify-rowlist {text-align: center;} .verify-rowlist li {width: 10em; display: inline-block;} .common-center .item-data {position: relative; z-index: 1; float: right;} .common-text .common-text-menu, .common-center .maintext .quote_text {width: 75%;} .common-text .item-info-table table, #mcmodder-version-menu {width: 100%;} .message-main {padding-left: 200px !important;} #mcmodder-editnum, #mcmodder-editbyte {width: 5em; height: 2em; border-radius: .5em; padding: .3em; border: 1px solid var(--mcmodder-tc2);} #mcmodder-lv-input {text-align: center; height: 20px; width: 25px; margin-right: 0px; color: yellow; background: transparent; border: none; font-weight: bold; text-shadow: 1px 1px 1px #333;}.center-block-head .more {right: 2em;} #item-table-item-input {width: 100%; border-top-right-radius: 1em; border-bottom-right-radius: 1em;} .header-right .header-user .header-user-avatar img {border-color: #fff8;} .common-center .class-edit-block {width: unset;} .common-link-frame-style-2 ul li {width: 100%; overflow: initial;} .common-center .right .class-relation-list .relation li {height: 2em;} .version-menu {margin-top: 0} #mcmodder-version-menu tbody * {white-space: nowrap; overflow: hidden;} #mcmodder-version-menu td {border: 1px solid var(--mcmodder-tc1);}");
	$(".mold, .progress-list, .class-item-type li, .post-block, .tag li, .mcver li a, .tools-list li a, .edit-tools span, .comment-row, .comment-channel-list li a, .class-relation-list .relation li, .btn, .mcmodder-gui-alert, .edit-tools > span, .center-sub-menu a, .center-content.admin-list a, .center-card-block.badges, .center-card-border, .modlist-block, .common-center .maintext .item-give, .common-center .post-row .postname .tool li a")
		.addClass("mcmodder-content-block");
	$(".common-nav .line")
		.html('<i class="fa fa-chevron-right" />');
	$(".oredict-ad, .worldgen-list-ad")
		.remove();
	$("body")
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
	if (t) {
		$(`<div class="mcmodder-rednum">${t}</div>`)
			.appendTo(".header-user-avatar");
		$(`<div class="mcmodder-rednum">${t}</div>`)
			.insertAfter(".header-layer .fa-bell");
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
	$(".header-container .header-search")
		.append('<button id="mcmodder-night-switch" title="夜间模式"><i class="fa fa-lightbulb-o"></i></button>')
		.find("#mcmodder-night-switch")
		.bind("click", switchNightMode);
	$(".header-container .header-search")
		.append('<button id="mcmodder-invisibility" title="隐身模式"><i class="fa fa-low-vision"></i></button>')
		.find("#mcmodder-invisibility")
		.bind("click", switchInvisibility);
	if (!isNightMode) $("#mcmodder-night-switch i")
		.css({
			"text-shadow": "0px 0px 5px gold"
		});
	if (isInvisible) $("#mcmodder-invisibility i")
		.css({
			"text-shadow": "0px 0px 5px aqua"
		});
	if (!getConfig("templateList") || !JSON.parse(getConfig("templateList"))?.length) setConfig("templateList", JSON.stringify([{
		id: "general_armor",
		title: "套装/盔甲/铠甲/XX套",
		description: "适用于将“头盔”、“胸甲”、“护腿”、“靴子”综合到同一个父资料中一起介绍时使用。",
		content: '<p><br/></p><table width="435"><tbody><tr><th style="word-break: break-all;" valign="top" align="center">装备部位<br/></th><th style="word-break: break-all;" valign="top" align="center">提供盔甲值<br/></th><th style="word-break: break-all;" valign="top" align="center">提供盔甲韧性<br/></th><th style="word-break: break-all;">特殊属性<br/></th></tr><tr><td style="word-break: break-all;" valign="middle" align="center">头盔</td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">胸甲<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">护腿<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" valign="middle" align="center">-<br/></td></tr><tr><td style="word-break: break-all;" valign="middle" align="center">靴子<br/></td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td><td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td><td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td></tr></tbody></table>'
	}]));
	const a = {
		Forge: '<svg viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0z"></path><path fill="none" stroke="var(--mcmodder-platform-forge)" stroke-width="2" d="M2 7.5h8v-2h12v2s-7 3.4-7 6 3.1 3.1 3.1 3.1l.9 3.9H5l1-4.1s3.8.1 4-2.9c.2-2.7-6.5-.7-8-6Z"></path></svg>',
		Fabric: '<svg viewBox="0 0 24 24"><path fill="none" stroke="var(--mcmodder-platform-fabric)" d="m820 761-85.6-87.6c-4.6-4.7-10.4-9.6-25.9 1-19.9 13.6-8.4 21.9-5.2 25.4 8.2 9 84.1 89 97.2 104 2.5 2.8-20.3-22.5-6.5-39.7 5.4-7 18-12 26-3 6.5 7.3 10.7 18-3.4 29.7-24.7 20.4-102 82.4-127 103-12.5 10.3-28.5 2.3-35.8-6-7.5-8.9-30.6-34.6-51.3-58.2-5.5-6.3-4.1-19.6 2.3-25 35-30.3 91.9-73.8 111.9-90.8" transform="matrix(.08671 0 0 .0867 -49.8 -56)" stroke-width="23"></path></svg>',
		NeoForge: '<svg viewBox="0 0 24 24"><g fill="none" stroke="var(--mcmodder-platform-neoforge)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m12 19.2v2m0-2v2"></path><path d="m8.4 1.3c0.5 1.5 0.7 3 0.1 4.6-0.2 0.5-0.9 1.5-1.6 1.5m8.7-6.1c-0.5 1.5-0.7 3-0.1 4.6 0.2 0.6 0.9 1.5 1.6 1.5"></path><path d="m3.6 15.8h-1.7m18.5 0h1.7"></path><path d="m3.2 12.1h-1.7m19.3 0h1.8"></path><path d="m8.1 12.7v1.6m7.8-1.6v1.6"></path><path d="m10.8 18h1.2m0 1.2-1.2-1.2m2.4 0h-1.2m0 1.2 1.2-1.2"></path><path d="m4 9.7c-0.5 1.2-0.8 2.4-0.8 3.7 0 3.1 2.9 6.3 5.3 8.2 0.9 0.7 2.2 1.1 3.4 1.1m0.1-17.8c-1.1 0-2.1 0.2-3.2 0.7m11.2 4.1c0.5 1.2 0.8 2.4 0.8 3.7 0 3.1-2.9 6.3-5.3 8.2-0.9 0.7-2.2 1.1-3.4 1.1m-0.1-17.8c1.1 0 2.1 0.2 3.2 0.7"></path><path d="m4 9.7c-0.2-1.8-0.3-3.7 0.5-5.5s2.2-2.6 3.9-3m11.6 8.5c0.2-1.9 0.3-3.7-0.5-5.5s-2.2-2.6-3.9-3"></path><path d="m12 21.2-2.4 0.4m2.4-0.4 2.4 0.4"></path></g></svg>',
		Quilt: '<svg stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24"><defs><path id="quilt" fill="none" stroke="var(--mcmodder-platform-quilt)" stroke-width="65.6" d="M442.5 233.9c0-6.4-5.2-11.6-11.6-11.6h-197c-6.4 0-11.6 5.2-11.6 11.6v197c0 6.4 5.2 11.6 11.6 11.6h197c6.4 0 11.6-5.2 11.6-11.7v-197Z"></path></defs><path fill="none" d="M0 0h24v24H0z"></path><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 -3.2)"></use><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 -3.2 7)"></use><use xlink:href="#quilt" stroke-width="65.6" transform="matrix(.03053 0 0 .03046 6.9 -3.2)"></use><path fill="none" stroke="currentColor" stroke-width="70.4" d="M442.5 234.8c0-7-5.6-12.5-12.5-12.5H234.7c-6.8 0-12.4 5.6-12.4 12.5V430c0 6.9 5.6 12.5 12.4 12.5H430c6.9 0 12.5-5.6 12.5-12.5V234.8Z" transform="rotate(45 3.5 24) scale(.02843 .02835)"></path></svg>',
		Rift: '<svg viewBox="0 0 24 24"><path fill="none" stroke="var(--mcmodder-platform-rift)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.7 6.6v10.8l9.3 5.3 9.3-5.3V6.6L12 1.3zm0 0L12 12m9.3-5.4L12 12m0 10.7V12"></path></svg>',
		LiteLoader: '<svg stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="1.5" viewBox="0 0 24 24"><rect width="24" height="24" fill="none"></rect><path d="m3.924 21.537s3.561-1.111 8.076-6.365c2.544-2.959 2.311-1.986 4-4.172" fill="none" stroke="currentColor" stroke-width="2px"></path><path d="m7.778 19s1.208-0.48 4.222 0c2.283 0.364 6.037-4.602 6.825-6.702 1.939-5.165 0.894-10.431 0.894-10.431s-4.277 4.936-6.855 7.133c-5.105 4.352-6.509 11-6.509 11" fill="none" stroke="currentColor" stroke-width="2px"></path></svg>',
		"数据包": '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clip-rule="evenodd"></path></svg>',
		"行为包": '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clip-rule="evenodd"></path></svg>'
	};
	$(".col-lg-12.common-rowlist-2 li, .class-text-top .col-lg-4")
		.each(function(i) {
			let e = $(this)
				.text();
			let t = e.split(e.includes("：") ? "：" : ": ");
			if (t[1] == parseInt(t[1])) t[1] = parseInt(t[1])
				.toLocaleString();
			if (t[0] === "支持平台") t[1] = t[1].replace(" (JAVA Edition)", "")
				.replace(" (Bedrock Edition)", "");
			else if (t[0] === "运作方式") {
				let e = t[1].split(", ");
				t[1] = "";
				e.forEach(e => t[1] += `<div class="mcmodder-modloader" title="${e}">${a[e]}</div>`)
			}
			if (t[0] === "运行环境") {
				let e = t[1].split(", ");
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
				.html(`<span class="title">${t[1]}</span><span class="text">${t[0]}</span>`);
			if (this.className === "col-lg-4") this.className = "col-lg-6"
		});
	$(".slider-block")
		.remove();
	$(".modlist-filter-block.auto button[type=submit]")
		.css({
			background: "transparent",
			color: "var(--mcmodder-txcolor)"
		});
	if (e.includes("/item/tab/") && !e.includes(".html")) setTimeout(tabInit, 1e3);
	if (e.includes("/class/edit/") || e.includes("/sandbox/") || e.includes("/post/edit/")) editorLoad();
	if (e.includes("/item/edit/") || e.includes("/item/add/")) itemEditorInit();
	if (e.includes("/item/") && e.includes(".html") && !e.includes("/diff/")) itemInit();
	if (e.includes("/oredict/")) oredictPageInit();
	if (e.includes("/history.html")) historyInit();
	if (e.includes("/verify.html")) verifyHistoryInit();
	if (e.includes("/queue.html")) queueInit();
	if (e.includes("/class/add/")) classEditorInit();
	if (e.includes("/version/add") || e.includes("/version/edit")) versionInit();
	else if (e.includes("/version/")) versionListInit();
	if (/class\/[0-9]*\.html/.test(e)) classInit();
	if (e.includes("/diff/") && !e.includes("/list/")) diffInit();
	if (e.includes("/rank.html") && getConfig("advancedRanklist")) rankInit();
	if (e.includes("/class/") || e.includes("/author/")) setTimeout(commentInit, 1e3);
	if (e.includes("center.mcmod.cn")) centerInit();
	if (e.includes("admin.mcmod.cn")) adminInit();
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
