import { GM_getValue, GM_info, GM_openInTab } from "$";
import { ItemCustomTypeList } from "./types";

export class McmodderValues {

  static readonly menuCommands = {
    settings: function () {
      GM_openInTab("https://center.mcmod.cn/#/setting/", { active: true });
    },
    structureEditor: function () {
      GM_openInTab("https://www.mcmod.cn/mcmodder/structureeditor/", { active: true });
    },
    jsonHelper: function () {
      GM_openInTab("https://www.mcmod.cn/mcmodder/jsonhelper/", { active: true });
    },
    exportLogs: function () {
      $("html").empty().html('若遇封IP，请在向作者反馈时发送下列内容，并告知具体封禁时间（精确到秒）以及被封禁时已打开的百科页面数量。下列内容可能包含敏感信息，可考虑私信发送。<textarea id="mcmodder-log-export" style="min-height: 800px; min-width: 100%;">');
      $("#mcmodder-log-export").val(GM_getValue("mcmodderSettings") + "\n" + GM_getValue("scheduleRequestList") + "\n" + GM_getValue("mcmodderLogger"));
    }
  } as const;

  static readonly assets = {
    almanacs: 'https://i.mcmod.cn/editor/upload/20250731/1753943312_179043_WEbO.png',
    progress1: "https://i.mcmod.cn/editor/upload/20241008/1728389750_179043_rcRM.png",
    progress2: "https://i.mcmod.cn/editor/upload/20241018/1729266514_179043_vZVb.png",
    sprite: 'https://i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png',
    cake: 'https://i.mcmod.cn/editor/upload/20250802/1754100170_179043_DWqe.png',
    candle: 'https://i.mcmod.cn/editor/upload/20250802/1754100652_179043_shqU.png',
    mcmod: {
      js: {
        bootstrap: "/static/public/js/bootstrap.min.js",
        bootstrapSelect: "/static/public/js/bootstrap-select.min.js",
        sortable: "/static/public/js/jquery.sortable.min.js",
        tableSorter: "/plugs/tablesorter/js/jquery.tablesorter.min.js",
        three: "/static/public/plug/three/three.min.js",
        threeOrbitControls: "/static/public/plug/three/three.orbit-controls.min.js",
        threeTween: "/static/public/plug/three/three.tween.min.js",
        structureBrowser: "/static/public/js/item/mc.structure_browser.functions.js",
        item: "/static/public/js/item/mc.item.functions.js"
      },
      css: {
        bootstrapSelect: "/static/public/css/bootstrap-select.min.css",
        item: "/static/public/css/item/item.frame.css",
        structureBrowser: "/static/public/css/item/structure_browser.frame.css",
      },
      aprilFools: {
        mcr: "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif"
      },
      imagesNone: 'https://www.mcmod.cn/pages/class/images/none.jpg',
      loading: 'https://www.mcmod.cn/static/public/images/loading-colourful.gif',
      iconStyleSample: 'https://i.mcmod.cn/editor/upload/20210506/1620236406_2_BaUm.png',
      emptyItemIcon32x: "https://i.mcmod.cn/item/icon/32x32/0.png",
      emptyItemIcon128x: "https://i.mcmod.cn/item/icon/128x128/0.png",
      level: {
        levelup: "/static/public/sound/task/levelup.ogg",
        challengeComplete: "/static/public/sound/task/challenge_complete.ogg"
      }
    },
    js: {
      jsdiff: "https://kmcha.com/static/js/diff.js", // https://github.com/kpdecker/jsdiff
      markdownit: "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.1/markdown-it.min.js"
    },
    nightMode: {
      imagesNone: 'https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg'
    }
  } as const;

  static readonly mcmodderVersion = GM_info.script.version || "Unknown";
  static readonly MAX_REQUEST_COUNT = 10000;
  static readonly MAX_RECIPE_LENGTH = 100;
  static get headerContainerHeight() { return $(".top-main, .header-container, #top").get(0)?.getBoundingClientRect()?.height || 50; } // 50
  static get errorMessage() { return typeof PublicLangData != "undefined" ? PublicLangData.warning.inform : {}; }
  
  static readonly iconMap = {
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
  } as const;

  static readonly maxLevel = 30;
  static readonly expRequisition = [0, 20, 20, 200, 240, 480, 960, 1728, 2918, 4597, 6698,
    8930, 10716, 11252, 9752, 5851, 6437, 7080, 7787, 8567, 9423,
    10366, 11402, 12543, 13796, 15177, 16694, 18363, 20200, 22219, 24442,
    Number.MAX_SAFE_INTEGER - 3e5];
  static readonly formatColors = ["000000", "0000AA", "00AA00", "00AAAA", "AA0000", "AA00AA", "FFAA00", "AAAAAA",
    "555555", "5555FF", "55FF55", "55FFFF", "FF5555", "FF55FF", "FFFF55", "FFFFFF"];
  static readonly ueButton1 = ["fullscreen","emotion","undo","redo","insertunorderedlist","insertorderedlist",
    "link","unlink","insertimage","justifyleft","justifycenter","justifyright","justifyjustify","indent",
    "removeformat","formatmatch","inserttable","deletetable","bold","italic","underline","horizontal","forecolor",
    "spechars","superscript","subscript","mctitle"];
  static readonly ueButton2 = ["window-maximize","smile-o","rotate-left","rotate-right","list-ul","list-ol",
    "link","unlink","image","align-left","align-center","align-right","align-justify","indent","eraser",
    "paint-brush","table","trash","bold","italic","underline","minus","font","book","superscript",
    "subscript","header"];
  static readonly adminIDList = [2, 8, 9, 208, 331, 7926, 7949, 10167, 12422, 14115, 17038, 21294, 29797, 672797];
  static readonly ignoredContextFormatters = ["h1=", "h2=", "h3=", "h4=", "h5=", "ban:", "mark:", "icon:"];
  static readonly supportedImageSuffix = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];
  static readonly importableKeys = ["name", "englishName", "registerName", "metadata", "OredictList",
    "type", "maxStackSize", "maxDurability", "smallIcon", "largeIcon"];

  static readonly allVersionList = [
    [], [], [5], [2], [2, 3, 7], [2], [4], // 1.6-
    [2, 4, 5, 8, 9, 10], [0, 8, 9], [0, 4], // 1.7 ~ 1.9
    [0, 1, 2], [0, 1, 2], [0, 1, 2], [0, 1, 2], // 1.11 ~ 1.13
    [0, 1, 2, 3, 4], [0, 1, 2], [0, 1, 2, 3, 4, 5], // 1.14 ~ 1.16
    [0, 1], [0, 1, 2], [0, 1, 2, 3, 4], // 1.17 ~ 1.19
    [0, 1, 2, 3, 4, 5, 6], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11] // 1.20 ~ 1.21
  ];
  static readonly newVersionList: Record<string, number[]> = {
    "26.1": [], // 26.1.x
  };

  static readonly loaderSupportVersions = {
    "1": [">=1.21.4", "1.21.4", "1.21.3", "1.21.1", "1.21", "1.20.6", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.13.2", "1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8.8", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.3", "1.4.2", "1.3.2", "1.2.5", "远古版本"],
    "2": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
    "11": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1", "1.20", "1.19.4", "1.19.3", "1.19.2", "1.19.1", "1.19", "1.18.2", "1.18.1", "1.18", "1.17.1", "1.17", "1.16.5", "1.16.4", "1.16.3", "1.16.2", "1.16.1", "1.16", "1.15.2", "1.15.1", "1.15", "1.14.4", "1.14.3", "1.14.2", "1.14.1", "1.14"],
    "13": [">=1.21.4", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6", "1.20.5", "1.20.4", "1.20.3", "1.20.2", "1.20.1"],
    "3": ["1.13.2", "1.13.1", "1.13"],
    "4": ["1.12.2", "1.12.1", "1.12", "1.11.2", "1.11", "1.10.2", "1.10", "1.9.4", "1.9", "1.8.9", "1.8", "1.7.10", "1.7.2", "1.6.4", "1.6.2", "1.5.2", "1.4.7", "1.4.2", "1.3.2"],
    "9": ["1.18.2", "1.18.1", "1.18"],
    "6": [">=1.4.2"],
    "5": [">=1.13"]
  } as const;

  static readonly searchOption = [
    { reg: /^添加模组/, label: "添加模组", exclude: "中的" },
    { reg: /^添加整合包/, label: "添加整合包", exclude: "中的" },
    { reg: /^添加.+教程/, label: "添加教程" },
    { reg: /^编辑模组/, label: "编辑模组", exclude: "中的" },
    { reg: /^编辑整合包/, label: "编辑整合包", exclude: "中的" },
    { reg: /^编辑.+个人作者\/开发团队。/, label: "编辑作者" },
    { reg: /^编辑.+教程。/, label: "编辑教程" },
    { reg: /^在.+中添加.+/, label: "添加资料", exclude: "更新日志。", exclude2: "合成表" },
    { reg: /^在.+中添加.+更新日志。/, label: "添加日志" },
    { reg: /^编辑.+中的.+/, label: "编辑资料", exclude: "更新日志。", exclude2: "合成表" },
    { reg: /^编辑.+中的.+更新日志。/, label: "编辑日志" },
    { reg: /^在资料.+中添加一张合成表。/, label: "添加合成表" },
    { reg: /^编辑资料.+中的一张合成表。/, label: "编辑合成表" },
    { reg: /^删除资料.+中的一张合成表。/, label: "删除合成表" }
  ];

  static readonly userItemList = [
    { lang: "knowledge_fragment", id: 0 },
    { lang: "technique_crystal", id: 1, isCustom: true },
    { lang: "memory_cube", id: 2, isCustom: true },
    { lang: "canning_civilization", id: 3, isCustom: true },
    { lang: "wisdom_singularity", id: 4, isCustom: true },
    { lang: "mr_torcherino", id: 5 },
    { lang: "red_button", id: 6, isCustom: true },
    { lang: "medal_of_friendship", id: 7, isCustom: true },
    { lang: "test_1", id: 8, isCustom: true },
    { lang: "vanilla", id: 9, isCustom: true }
  ];

  static readonly nonItemTypeList = { // 综合类型
    "class": { text: '模组', icon: "fa-cubes" },
    "modpack": { text: '整合包', icon: "fa-file-zip-o" },
    "author": { text: '个人作者', icon: "fa-user" },
    "authors": { text: '开发团队', icon: "fa-users" }
  } as const;

  static readonly itemDefaultTypeList: ItemCustomTypeList = [ // 默认资料类型
    { classID: 0, typeID: 1, text: '物品/方块', icon: "\ue604", color: "#1b9100" },
    { classID: 0, typeID: 2, text: '群系/群落', icon: "\ue61e", color: "#e69a37" },
    { classID: 0, typeID: 3, text: '世界/维度', icon: "\ue62c", color: "#975a0a" },
    { classID: 0, typeID: 4, text: '生物/实体', icon: "\ue643", color: "#0c55b9" },
    { classID: 0, typeID: 5, text: '附魔/魔咒', icon: "\ue6b2", color: "#a239e4" },
    { classID: 0, typeID: 6, text: 'BUFF/DEBUFF', icon: "\ue608", color: "#e4393f" },
    { classID: 0, typeID: 7, text: '多方块结构', icon: "\ue662", color: "#810914" },
    { classID: 0, typeID: 8, text: '自然生成', icon: "\ue627", color: "#d91baf" },
    { classID: 0, typeID: 9, text: '绑定热键', icon: "\ue600", color: "#3a6299" },
    { classID: 0, typeID: 10, text: '游戏设定', icon: "\ue628", color: "#4382d8" }
  ];

  static readonly itemCustomTypeList: ItemCustomTypeList = [
    { classID: 683, typeID: 103, text: "工具属性", icon: "fa-shapes", color: "#c300ff" },
    { classID: 3725, typeID: 205, text: "工具属性", icon: "fa-shapes", color: "#c300ff" },
    { classID: 10374, typeID: 230, text: "工具属性", icon: "fa-shapes", color: "#c300ff" },
    { classID: 1111, typeID: 165, text: "元素/要素", icon: "fa-mortar-pestle", color: "#90f" },
    { classID: 1111, typeID: 159, text: "新版已移除", icon: "fa-clock-o", color: "#b56f34" },
    { classID: 1111, typeID: 301, text: "交易", icon: "fa-shopping-cart", color: "#ffd700" },
    { classID: 1111, typeID: 163, text: "技能", icon: "fa-star-of-david", color: "#6cf" },
    { classID: 4869, typeID: 240, text: "版本更新移除", icon: "fa-clock-o", color: "#490404" },
    { classID: 1269, typeID: 277, text: "技能/能力", icon: "fa-magic", color: "#32d4a9" },
    { classID: 513, typeID: 131, text: "工具能力", icon: "fa-tools", color: "#f4d329" },
    { classID: 513, typeID: 190, text: "成就", icon: "fa-star", color: "#00e5f0" },
    { classID: 4869, typeID: 283, text: "成就/进度", icon: "fa-star", color: "#e5ff04" },
    { classID: 10145, typeID: 310, text: "成就/进度", icon: "fa-star", color: "#f60" },
    { classID: 2021, typeID: 191, text: "编辑规范", icon: "fa-book", color: "#000" },
    { classID: 12850, typeID: 246, text: "材料类型", icon: "fa-sitemap", color: "#0a9" },
    { classID: 23974, typeID: 319, text: "材料类型", icon: "fa-sitemap", color: "#0a9" }
  ];

  static readonly defaultTemplateList = [{
    id: "general_armor",
    title: "套装/盔甲/铠甲/XX套",
    description: "适用于将“头盔”、“胸甲”、“护腿”、“靴子”综合到同一个父资料中一起介绍时使用。",
    content: `<p><br/></p>
    <table width="435">
      <tbody>
        <tr>
          <th style="word-break: break-all;" valign="top" align="center">装备部位<br/></th>
          <th style="word-break: break-all;" valign="top" align="center">提供盔甲值<br/></th>
          <th style="word-break: break-all;" valign="top" align="center">提供盔甲韧性<br/></th>
          <th style="word-break: break-all;">特殊属性<br/></th>
        </tr>
        <tr>
          <td style="word-break: break-all;" valign="middle" align="center">头盔</td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
          <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
        </tr>
        <tr>
          <td style="word-break: break-all;" valign="middle" align="center">胸甲<br/>
          </td><td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
          <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
        </tr>
        <tr>
          <td style="word-break: break-all;" valign="middle" align="center">护腿<br/></td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td>
          <td colspan="1" rowspan="1" valign="middle" align="center">-<br/></td>
        </tr>
        <tr>
          <td style="word-break: break-all;" valign="middle" align="center">靴子<br/></td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:armor=1, ]</td>
          <td style="word-break: break-all;" valign="middle" align="center">[icon:toughness=1, ]</td
          <td colspan="1" rowspan="1" style="word-break: break-all;" valign="middle" align="center">-<br/></td>
        </tr>
      </tbody>
    </table>`
  }];
}