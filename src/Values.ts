import { GM_getValue, GM_info, GM_openInTab } from "$";
import defaultEditReasons from "./assets/json/input/EditReason.json";
import defaultVerifyReasons from "./assets/json/input/VerifyReason.json";

export class Values {
  static readonly menuCommands = {
    settings: function () {
      GM_openInTab("https://center.mcmod.cn/#/setting/", { active: true });
    },
    structureEditor: function () {
      GM_openInTab(`${Values.hostname}/mcmodder/structureeditor/`, {
        active: true,
      });
    },
    jsonHelper: function () {
      GM_openInTab(`${Values.hostname}/mcmodder/jsonhelper/`, { active: true });
    },
    exportLogs: function () {
      $("html")
        .empty()
        .html(
          '若遇封IP，请在向作者反馈时发送下列内容，并告知具体封禁时间（精确到秒）以及被封禁时已打开的百科页面数量。下列内容可能包含敏感信息，可考虑私信发送。<textarea id="mcmodder-log-export" style="min-height: 800px; min-width: 100%;">',
        );
      $("#mcmodder-log-export").val(
        GM_getValue("mcmodderSettings") +
          "\n" +
          GM_getValue("scheduleRequestList") +
          "\n" +
          GM_getValue("mcmodderLogger"),
      );
    },
  } as const;

  private static reverseMap<T extends Readonly<Record<PropertyKey, PropertyKey>>>(obj: T) {
    const reversed: Record<PropertyKey, PropertyKey> = {};
    (Object.entries(obj) as [PropertyKey, PropertyKey][]).forEach(([a, b]) => {
      reversed[b] = a;
    });
    return reversed as Readonly<ReverseMap<T>>;
  }

  private static arrayToMap<
    T extends ReadonlyArray<Record<PropertyKey, PropertyKey>>,
    K extends keyof ElementOf<T>,
  >(arr: T, key: K) {
    return arr.reduce(
      (acc, item) => {
        acc[item[key]] = item;
        return acc;
      },
      {} as Record<PropertyKey, Record<PropertyKey, PropertyKey>>,
    ) as ArrayToMap<T, K>;
  }

  static readonly hostname = window.location.href.startsWith("https://www1.mcmod.cn/")
    ? "https://www1.mcmod.cn"
    : "https://www.mcmod.cn";

  static readonly assets = {
    almanacs: "https://i.mcmod.cn/editor/upload/20250731/1753943312_179043_WEbO.png",
    progress1: "https://i.mcmod.cn/editor/upload/20241008/1728389750_179043_rcRM.png",
    progress2: "https://i.mcmod.cn/editor/upload/20241018/1729266514_179043_vZVb.png",
    sprite: "https://i.mcmod.cn/editor/upload/20241019/1729313235_179043_fNWH.png",
    cake: "https://i.mcmod.cn/editor/upload/20250802/1754100170_179043_DWqe.png",
    candle: "https://i.mcmod.cn/editor/upload/20250802/1754100652_179043_shqU.png",
    bg: "https://s21.ax1x.com/2025/01/05/pE9Avh4.jpg",
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
        item: "/static/public/js/item/mc.item.functions.js",
      },
      css: {
        bootstrapSelect: "/static/public/css/bootstrap-select.min.css",
        item: "/static/public/css/item/item.frame.css",
        structureBrowser: "/static/public/css/item/structure_browser.frame.css",
      },
      aprilFools: {
        mcr: "https://i.mcmod.cn/editor/upload/20230331/1680246648_2_vWiM.gif",
      },
      imagesNone: `${this.hostname}/pages/class/images/none.jpg`,
      loading: `${this.hostname}/static/public/images/loading-colourful.gif`,
      iconStyleSample: "https://i.mcmod.cn/editor/upload/20210506/1620236406_2_BaUm.png",
      emptyItemIcon32x: "https://i.mcmod.cn/item/icon/32x32/0.png",
      emptyItemIcon128x: "https://i.mcmod.cn/item/icon/128x128/0.png",
      level: {
        levelup: "/static/public/sound/task/levelup.ogg",
        challengeComplete: "/static/public/sound/task/challenge_complete.ogg",
      },
    },
    js: {
      markdownit: "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/11.0.1/markdown-it.min.js",
      pangu: "https://cdn.jsdelivr.net/npm/pangu@7.2.0/dist/browser/pangu.umd.min.js",
      turndown: "https://cdnjs.cloudflare.com/ajax/libs/turndown/7.2.1/turndown.min.js",
      codemirror: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/codemirror.min.js",
      codemirrorMod: {
        htmlEmbedded:
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/htmlembedded/htmlembedded.min.js",
        markdown:
          "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/mode/markdown/markdown.min.js",
      },
      jsBeautify: "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.15.4/beautify-html.min.js",
    },
    css: {
      codemirror: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.20/codemirror.min.css",
    },
    nightMode: {
      bg: "https://s41.ax1x.com/2026/05/13/peXw6Sg.png",
      imagesNone: "https://i.mcmod.cn/editor/upload/20241213/1734019784_179043_sDxX.jpg",
    },
    font: {
      link: {
        2: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap",
        3: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
      fontFamily: {
        1: '"-apple-system", "Segoe UI", "Roboto", "Ubuntu", "Arial", "Helvetica", sans-serif',
        2: '"Noto Sans SC", sans-serif',
        3: '"Inter", sans-serif',
      },
    },
    storage: {
      indexes: {
        mcmodderItemData: [
          "id",
          "itemType",
          "registerName",
          "metadata",
          "name",
          "englishName",
          "creativeTabName",
          "branch",
          "type",
          "jumpTo",
          "jumpParent",
          "generalTo",
          "generalParent",
          "OredictList",
        ],
        mcmodderRecipeData: ["gui_id"],
      },
      keys: {
        mcmodderItemData: [
          "id",
          "itemType",
          "registerName",
          "metadata",
          "smallIcon",
          "largeIcon",
          "name",
          "englishName",
          "creativeTabName",
          "branch",
          "type",
          "jumpTo",
          "jumpParent",
          "generalTo",
          "generalParent",
          "generalNum",
          "OredictList",
          "harvestTools",
          "maxStackSize",
          "maxDurability",
        ],
        mcmodderRecipeData: [
          "in_id",
          "out_id",
          "in_num",
          "out_num",
          "in_chance",
          "out_chance",
          "power_num",
          "gui_id",
        ],
      },
    },
  } as const;

  static readonly mcmodderVersion = GM_info.script.version || "Unknown";
  static readonly MAX_REQUEST_COUNT = 10000;
  /**
   * 已排定时刻允许领先当前时间的最大倍数（以 {@link MAX_REQUEST_COUNT} 为单位）。
   *
   * `lastRequestTime` 是持久化在 `mcmodderSettings` 里的全局发包游标，会跨刷新、跨重装、跨标签页
   * 沿用。一旦它异常地领先当前时间（例如由旧版本留下的畸形数据、云端同步覆盖了本地设置等），
   * 新排进来的请求就会各自等上几小时，直接把整条发包队列堵死 —— 表现为「装上脚本后长时间不请求」，
   * 积压再在恢复后一并涌出。
   *
   * 读到的值领先得比这还多，就认定它已不可信，直接丢弃并以当前时间重新起算，而不是照着它继续排期。
   *
   * @warning 该阈值必须**严格大于** {@link MAX_REQUEST_COUNT} 对应的队列上限，否则恢复逻辑会先把
   *   所有超限情形吃掉，令 `Utils.updateRequestTime` 的排队上限形同虚设。
   *   2 表示「领先超过两倍上限」才判定为脏数据，与上限之间留有充足间隔。
   */
  static readonly REQUEST_SCHEDULE_MAX_DRIFT_FACTOR = Values.MAX_REQUEST_COUNT * 2;
  static readonly MAX_RECIPE_LENGTH = 100;
  /**
   * 跨标签页弹窗广播的过期时长（毫秒）：无人可见的标签页所发记录保留这么久，
   * 期间任意标签页变为可见即补弹，超时则丢弃（避免陈旧通知在很久之后突然弹出）。
   */
  static readonly MODAL_BROADCAST_EXPIRE = 60 * 1000;
  /**
   * 跨标签页请求提示通道的记录条数上限：GM Storage 中的记录数组最多保留这么多条，
   * 超出时从最旧的开始丢弃（防止长时间挂机后无上限增长）。
   */
  static readonly REQUEST_TOAST_BUFFER_SIZE = 50;
  /**
   * 跨标签页请求提示记录的过期时长（毫秒）：写入与补弹时都会剔除比这更旧的记录，
   * 避免切回标签页时弹出早已过时的请求。
   */
  static readonly REQUEST_TOAST_EXPIRE = 60 * 1000;
  /** 本标签页从隐藏变为可见时，最多补弹多少条积压的请求提示（其余丢弃） */
  static readonly REQUEST_TOAST_FLUSH_COUNT = 15;
  /**
   * 本标签页「已处理记录 id」集合的容量：只增不删的数组每次写入都会把全部记录重新送达，
   * 靠这个集合做本地去重，容量取略大于 {@link Values.REQUEST_TOAST_BUFFER_SIZE} 即可。
   */
  static readonly REQUEST_TOAST_DEDUP_SIZE = 100;
  /** 单条请求提示的自动消失时长（毫秒） */
  static readonly REQUEST_TOAST_TIMEOUT = 5 * 1000;

  static get headerContainerHeight() {
    return $(".top-main, .header-container, #top").get(0)?.getBoundingClientRect()?.height || 50;
  }

  static get errorMessage() {
    return typeof PublicLangData != "undefined" ? PublicLangData.warning.inform : {};
  }

  static readonly iconMap = {
    后台管理: "fa fa-university",
    文件管理: "fa fa-upload",
    社群管理: "fa fa-university",
    我的收藏: "fa fa-star",
    待审列表: "fa fa-mortar-board",
    用户等级: "fa fa-line-chart",
    短评动态: "fa fa-bell",
    成就进度: "fa fa-calendar-check-o",
    物品背包: "fa fa-suitcase",
    设置中心: "fa fa-gear",
    退出登录: "fa fa-sign-out",
    社群主页: "fa fa-home",
    修改信息: "fa fa-gear",
    我的主题: "fa fa-file-text",
    我的回复: "fa fa-reply-all",
    社群积分: "fa fa-bar-chart",
    社群等级: "fa fa-line-chart",
    社群任务: "fa fa-calendar-check-o",
    社群勋章: "fa fa-trophy",
  } as const;

  static readonly adTitleCss =
    "position: absolute;color: #555;border-radius: 5px;border: 1px solid #555;font-size: 12px;padding: 0 2px;left:5px;top:5px;bottom:auto;right:auto;background:RGBA(255,255,255,.45);";

  static readonly maxLevel = 30;
  static readonly expRequisition = [
    0,
    20,
    20,
    200,
    240,
    480,
    960,
    1728,
    2918,
    4597,
    6698,
    8930,
    10716,
    11252,
    9752,
    5851,
    6437,
    7080,
    7787,
    8567,
    9423,
    10366,
    11402,
    12543,
    13796,
    15177,
    16694,
    18363,
    20200,
    22219,
    24442,
    Number.MAX_SAFE_INTEGER - 3e5,
  ];
  static readonly formatColors = [
    "000000",
    "0000AA",
    "00AA00",
    "00AAAA",
    "AA0000",
    "AA00AA",
    "FFAA00",
    "AAAAAA",
    "555555",
    "5555FF",
    "55FF55",
    "55FFFF",
    "FF5555",
    "FF55FF",
    "FFFF55",
    "FFFFFF",
  ];
  static readonly ueButton1 = [
    "fullscreen",
    "emotion",
    "undo",
    "redo",
    "insertunorderedlist",
    "insertorderedlist",
    "link",
    "unlink",
    "insertimage",
    "justifyleft",
    "justifycenter",
    "justifyright",
    "justifyjustify",
    "indent",
    "removeformat",
    "formatmatch",
    "inserttable",
    "deletetable",
    "bold",
    "italic",
    "underline",
    "horizontal",
    "forecolor",
    "spechars",
    "superscript",
    "subscript",
    "mctitle",
  ];
  static readonly ueButton2 = [
    "window-maximize",
    "smile-o",
    "rotate-left",
    "rotate-right",
    "list-ul",
    "list-ol",
    "link",
    "unlink",
    "image",
    "align-left",
    "align-center",
    "align-right",
    "align-justify",
    "indent",
    "eraser",
    "paint-brush",
    "table",
    "trash",
    "bold",
    "italic",
    "underline",
    "minus",
    "font",
    "book",
    "superscript",
    "subscript",
    "header",
  ];
  static readonly adminIDList = [
    2, 8, 9, 208, 331, 7926, 7949, 10167, 12422, 14115, 17038, 21294, 29797, 672797,
  ];
  static readonly ignoredContextFormatters = [
    "h1=",
    "h2=",
    "h3=",
    "h4=",
    "h5=",
    "ban:",
    "mark:",
    "icon:",
  ];
  static readonly supportedImageSuffix = ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"];
  static readonly importableKeys = [
    "name",
    "englishName",
    "registerName",
    "metadata",
    "OredictList",
    "type",
    "maxStackSize",
    "maxDurability",
    "smallIcon",
    "largeIcon",
  ];
  //用于 < 26.1的版本列表
  static readonly allVersionList = [
    [],
    [],
    [5],
    [2],
    [2, 3, 7],
    [2],
    [4], // 1.6-
    [2, 4, 5, 8, 9, 10],
    [0, 8, 9],
    [0, 4], // 1.7 ~ 1.9
    [0, 1, 2],
    [0, 1, 2],
    [0, 1, 2],
    [0, 1, 2], // 1.11 ~ 1.13
    [0, 1, 2, 3, 4],
    [0, 1, 2],
    [0, 1, 2, 3, 4, 5], // 1.14 ~ 1.16
    [0, 1],
    [0, 1, 2],
    [0, 1, 2, 3, 4], // 1.17 ~ 1.19
    [0, 1, 2, 3, 4, 5, 6],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // 1.20 ~ 1.21
  ];
  //26.1以后的版本列表 YY.D.H
  static readonly newVersionList = [
    [[], [0, 1, 2, 3]], // 26: 26.0(none), 26.1([0, 1])
  ];

  static readonly loaderID = {
    Forge: "1",
    Fabric: "2",
    Quilt: "11",
    NeoForge: "13",
    Rift: "3",
    LiteLoader: "4",
    NilLoader: "14",
    Cleanroom: "15",
    JavaAgent: "17",
    Sandbox: "9",
    数据包: "5",
    内容包: "16",
    行为包: "8",
    命令方块: "6",
    文件覆盖: "7",
    其他: "10",
  } as const;

  static readonly reversedLoaderID = this.reverseMap(this.loaderID);

  static readonly loaderSupportVersions = {
    "1": [
      ">=1.21.4",
      "1.21.4",
      "1.21.3",
      "1.21.1",
      "1.21",
      "1.20.6",
      "1.20.4",
      "1.20.3",
      "1.20.2",
      "1.20.1",
      "1.20",
      "1.19.4",
      "1.19.3",
      "1.19.2",
      "1.19.1",
      "1.19",
      "1.18.2",
      "1.18.1",
      "1.18",
      "1.17.1",
      "1.16.5",
      "1.16.4",
      "1.16.3",
      "1.16.2",
      "1.16.1",
      "1.15.2",
      "1.15.1",
      "1.15",
      "1.14.4",
      "1.14.3",
      "1.14.2",
      "1.13.2",
      "1.12.2",
      "1.12.1",
      "1.12",
      "1.11.2",
      "1.11",
      "1.10.2",
      "1.10",
      "1.9.4",
      "1.9",
      "1.8.9",
      "1.8.8",
      "1.8",
      "1.7.10",
      "1.7.2",
      "1.6.4",
      "1.6.2",
      "1.5.2",
      "1.4.7",
      "1.4.3",
      "1.4.2",
      "1.3.2",
      "1.2.5",
      "远古版本",
    ],
    "2": [
      ">=1.21.4",
      "1.21.4",
      "1.21.3",
      "1.21.2",
      "1.21.1",
      "1.21",
      "1.20.6",
      "1.20.5",
      "1.20.4",
      "1.20.3",
      "1.20.2",
      "1.20.1",
      "1.20",
      "1.19.4",
      "1.19.3",
      "1.19.2",
      "1.19.1",
      "1.19",
      "1.18.2",
      "1.18.1",
      "1.18",
      "1.17.1",
      "1.17",
      "1.16.5",
      "1.16.4",
      "1.16.3",
      "1.16.2",
      "1.16.1",
      "1.16",
      "1.15.2",
      "1.15.1",
      "1.15",
      "1.14.4",
      "1.14.3",
      "1.14.2",
      "1.14.1",
      "1.14",
    ],
    "11": [
      ">=1.21.4",
      "1.21.4",
      "1.21.3",
      "1.21.2",
      "1.21.1",
      "1.21",
      "1.20.6",
      "1.20.5",
      "1.20.4",
      "1.20.3",
      "1.20.2",
      "1.20.1",
      "1.20",
      "1.19.4",
      "1.19.3",
      "1.19.2",
      "1.19.1",
      "1.19",
      "1.18.2",
      "1.18.1",
      "1.18",
      "1.17.1",
      "1.17",
      "1.16.5",
      "1.16.4",
      "1.16.3",
      "1.16.2",
      "1.16.1",
      "1.16",
      "1.15.2",
      "1.15.1",
      "1.15",
      "1.14.4",
      "1.14.3",
      "1.14.2",
      "1.14.1",
      "1.14",
    ],
    "13": [
      ">=1.21.4",
      "1.21.4",
      "1.21.3",
      "1.21.2",
      "1.21.1",
      "1.21",
      "1.20.6",
      "1.20.5",
      "1.20.4",
      "1.20.3",
      "1.20.2",
      "1.20.1",
    ],
    "3": ["1.13.2", "1.13.1", "1.13"],
    "4": [
      "1.12.2",
      "1.12.1",
      "1.12",
      "1.11.2",
      "1.11",
      "1.10.2",
      "1.10",
      "1.9.4",
      "1.9",
      "1.8.9",
      "1.8",
      "1.7.10",
      "1.7.2",
      "1.6.4",
      "1.6.2",
      "1.5.2",
      "1.4.7",
      "1.4.2",
      "1.3.2",
    ],
    "15": ["1.12.2"],
    "9": ["1.18.2", "1.18.1", "1.18"],
    "6": [">=1.4.2"],
    "5": [">=1.13"],
  } as const;

  static readonly authorPositionMap = {
    owner: "所有者",
    programmer: "程序",
    artist: "美术",
    sound: "音效",
    planner: "策划",
    writer: "文案",
    builder: "建筑",
    contributor: "贡献者",
    mascot: "吉祥物",
    other: "其他",
  } as const;

  static readonly reversedAuthorPositionMap = this.reverseMap(this.authorPositionMap);

  static readonly licenseTypeName = {
    source: "源码",
    asset: "资产",
    artifact: "构建",
  } as const;

  static readonly classCategories = [
    { index: 0, name: "科技", type: 0, value: "1,1" },
    { index: 1, name: "魔法", type: 0, value: "1,2" },
    { index: 2, name: "冒险", type: 0, value: "1,3" },
    { index: 3, name: "农业", type: 0, value: "1,4" },
    { index: 4, name: "装饰", type: 0, value: "1,5" },
    { index: 5, name: "实用", type: 0, value: "1,23" },
    { index: 6, name: "辅助", type: 0, value: "1,24" },
    { index: 7, name: "魔改", type: 0, value: "1,21" },
    { index: 8, name: "LIB", type: 0, value: "1,7" },
    { index: 9, name: "资源", type: 1, value: "0,8" },
    { index: 10, name: "世界", type: 1, value: "0,9" },
    { index: 11, name: "群系", type: 1, value: "0,10" },
    { index: 12, name: "结构", type: 1, value: "0,35" },
    { index: 13, name: "生物", type: 1, value: "0,11" },
    { index: 14, name: "能源", type: 1, value: "0,12" },
    { index: 15, name: "存储", type: 1, value: "0,13" },
    { index: 16, name: "物流", type: 1, value: "0,14" },
    { index: 17, name: "道具", type: 1, value: "0,15" },
    { index: 18, name: "安全", type: 1, value: "0,6" },
    { index: 19, name: "红石", type: 1, value: "0,16" },
    { index: 20, name: "食物", type: 1, value: "0,17" },
    { index: 21, name: "模型", type: 1, value: "0,18" },
    { index: 22, name: "关卡", type: 1, value: "0,34" },
    { index: 23, name: "指南", type: 1, value: "0,19" },
    { index: 24, name: "破坏", type: 1, value: "0,20" },
    { index: 25, name: "Meme", type: 1, value: "0,22" },
    { index: 26, name: "中式", type: 1, value: "0,25" },
    { index: 27, name: "日式", type: 1, value: "0,26" },
    { index: 28, name: "西式", type: 1, value: "0,27" },
    { index: 29, name: "恐怖", type: 1, value: "0,28" },
    { index: 30, name: "建材", type: 1, value: "0,29" },
    { index: 31, name: "生存", type: 1, value: "0,30" },
    { index: 32, name: "指令", type: 1, value: "0,31" },
    { index: 33, name: "优化", type: 1, value: "0,32" },
    { index: 34, name: "国创", type: 1, value: "0,33" },
  ] as const;

  static readonly classCategoryNameMap = this.arrayToMap(this.classCategories, "name");

  static readonly classCategoryValueMap = this.arrayToMap(this.classCategories, "value");

  static readonly licenseName = {
    ARR: "[ARR] All Rights Reserved（非许可协议）",
    "BSD-1-Clause": "[BSD-1-Clause] 1-clause BSD License",
    "AFL-3.0": "[AFL-3.0] Academic Free License v. 3.0",
    "APL-1.0": "[APL-1.0] Adaptive Public License 1.0",
    "Apache-2.0": "[Apache-2.0] Apache License, Version 2.0",
    "Apache-1.1": "[Apache-1.1] Apache Software License, version 1.1",
    "APSL-2.0": "[APSL-2.0] Apple Public Source License 2.0",
    "Artistic-1.0-Perl": "[Artistic-1.0-Perl] Artistic License (Perl) 1.0",
    "Artistic-1.0": "[Artistic-1.0] Artistic License 1.0",
    "Artistic-2.0": "[Artistic-2.0] Artistic License 2.0",
    AAL: "[AAL] Attribution Assurance License",
    "BlueOak-1.0.0": "[BlueOak-1.0.0] Blue Oak Model License",
    "BSL-1.0": "[BSL-1.0] Boost Software License 1.0",
    "BSD-2-Clause-Patent": "[BSD-2-Clause-Patent] BSD+Patent",
    "BSD-3-Clause-Open-MPI": "[BSD-3-Clause-Open-MPI] BSD-3-Clause-Open-MPI",
    CC0: "[CC0] CC0",
    "CC-BY-4.0": "[CC-BY-4.0] CC BY 4.0",
    "CC-BY-SA-4.0": "[CC-BY-SA-4.0] CC BY-SA 4.0",
    "CC-BY-NC-4.0": "[CC-BY-NC-4.0] CC BY-NC 4.0",
    "CC-BY-NC-SA-4.0": "[CC-BY-NC-SA-4.0] CC BY-NC-SA 4.0",
    "CC-BY-ND-4.0": "[CC-BY-ND-4.0] CC BY-ND 4.0",
    "CC-BY-NC-ND-4.0": "[CC-BY-NC-ND-4.0] CC BY-NC-ND 4.0",
    "CECILL-2.1": "[CECILL-2.1] Cea Cnrs Inria Logiciel Libre License, version 2.1",
    "CERN-OHL-P-2.0": "[CERN-OHL-P-2.0] CERN Open Hardware Licence Version 2 – Permissive",
    "CERN-OHL-S-2.0": "[CERN-OHL-S-2.0] CERN Open Hardware Licence Version 2 – Strongly Reciprocal",
    "CERN-OHL-W-2.0": "[CERN-OHL-W-2.0] CERN Open Hardware Licence Version 2 – Weakly Reciprocal",
    "MIT-CMU": "[MIT-CMU] CMU License",
    "CDDL-1.1": "[CDDL-1.1] COMMON DEVELOPMENT AND DISTRIBUTION LICENSE (CDDL)",
    "CDDL-1.0": "[CDDL-1.0] Common Development and Distribution License 1.0",
    "CPAL-1.0": "[CPAL-1.0] Common Public Attribution License Version 1.0",
    "CPL-1.0": "[CPL-1.0] Common Public License Version 1.0",
    "CATOSL-1.1": "[CATOSL-1.1] Computer Associates Trusted Open Source License 1.1",
    "CAL-1.0": "[CAL-1.0] Cryptographic Autonomy License",
    "CUA-OPL-1.0": "[CUA-OPL-1.0] CUA Office Public License",
    curl: "[curl] curl License",
    "EPL-1.0": "[EPL-1.0] Eclipse Public License -v 1.0",
    "EPL-2.0": "[EPL-2.0] Eclipse Public License version 2.0",
    "eCos-2.0": "[eCos-2.0] eCos License version 2.0",
    "ECL-1.0": "[ECL-1.0] Educational Community License, Version 1.0",
    "ECL-2.0": "[ECL-2.0] Educational Community License, Version 2.0",
    "EFL-1.0": "[EFL-1.0] Eiffel Forum License, version 1",
    "EFL-2.0": "[EFL-2.0] Eiffel Forum License, Version 2",
    Entessa: "[Entessa] Entessa Public License Version. 1.0",
    EUDatagrid: "[EUDatagrid] EU DataGrid Software License",
    "EUPL-1.2": "[EUPL-1.2] European Union Public Licence, version 1.2",
    Fair: "[Fair] Fair License",
    "Frameworx-1.0": "[Frameworx-1.0] Frameworx License 1.0",
    "AGPL-3.0": "[AGPL-3.0] GNU Affero General Public License version 3",
    "GPL-3.0": "[GPL-3.0] GNU General Public License version 3",
    "GPL-2.0": "[GPL-2.0] GNU General Public License version 2",
    "GPL-1.0": "[GPL-1.0] GNU General Public License, version 1",
    "LGPL-3.0": "[LGPL-3.0] GNU Lesser General Public License version 3",
    "LGPL-2.1": "[LGPL-2.1] GNU Lesser General Public License version 2.1",
    "LGPL-2.0": "[LGPL-2.0] GNU Library General Public License version 2",
    HPND: "[HPND] Historical Permission Notice and Disclaimer",
    "IPL-1.0": "[IPL-1.0] IBM Public License Version 1.0",
    ICU: "[ICU] ICU License",
    Intel: "[Intel] Intel Open Source License",
    IPA: "[IPA] IPA Font License",
    ISC: "[ISC] ISC License",
    JOSL: "[JOSL] Jabber Open Source License",
    Jam: "[Jam] JAM License",
    "LPPL-1.3c": "[LPPL-1.3c] LaTeX Project Public License, Version 1.3c",
    "BSD-3-Clause-LBNL": "[BSD-3-Clause-LBNL] Lawrence Berkeley National Labs BSD Variant License",
    "LiLiQ-P-1.1": "[LiLiQ-P-1.1] Licence Libre du Québec – Permissive version 1.1",
    "LiLiQ-Rplus-1.1": "[LiLiQ-Rplus-1.1] Licence Libre du Québec – Réciprocité forte version 1.1",
    "LiLiQ-R-1.1": "[LiLiQ-R-1.1] Licence Libre du Québec – Réciprocité version 1.1",
    LANLBV: "[LANLBV] Los Alamos National Labs BSD-3 Variant",
    "LPL-1.02": "[LPL-1.02] Lucent Public License Version 1.02",
    "LPL-1.0": "[LPL-1.0] Lucent Public License, Plan 9, version 1.0",
    "MS-PL": "[MS-PL] Microsoft Public License",
    "MS-RL": "[MS-RL] Microsoft Reciprocal License",
    MirOS: "[MirOS] MirOS Licence",
    "MIT-0": "[MIT-0] MIT No Attribution License",
    MCVWL: "[MCVWL] MITRE Collaborative Virtual Workspace License",
    Motosoto: "[Motosoto] Motosoto Open Source License",
    "MPL-2.0": "[MPL-2.0] Mozilla Public License 2.0",
    "MPL-1.1": "[MPL-1.1] Mozilla Public License 1.1",
    "MPL-1.0": "[MPL-1.0] Mozilla Public License, version 1.0",
    "MulanPSL-2.0": "[MulanPSL-2.0] Mulan Permissive Software License v2",
    Multics: "[Multics] Multics License",
    "NASA-1.3": "[NASA-1.3] NASA Open Source Agreement v1.3",
    Naumen: "[Naumen] NAUMEN Public License",
    NOKIA: "[NOKIA] Nokia Open Source License Version 1.0a",
    "NPOSL-3.0": "[NPOSL-3.0] Non-Profit Open Software License version 3.0",
    NTP: "[NTP] NTP License",
    OGTSL: "[OGTSL] Open Group Test Suite License",
    "OLFL-1.3": "[OLFL-1.3] Open Logistics Foundation License v1.3",
    "OSL-2.1": "[OSL-2.1] Open Software License 2.1",
    "OSL-1.0": "[OSL-1.0] Open Software License, version 1.0",
    "OLDAP-2.8": "[OLDAP-2.8] OpenLDAP Public License Version 2.8",
    "OSC-1.0": "[OSC-1.0] OSC License 1.0",
    "OSET-PL-2.1": "[OSET-PL-2.1] OSET Public License version 2.1",
    "PHP-3.0": "[PHP-3.0] PHP License 3.0",
    "PHP-3.01": "[PHP-3.01] PHP License 3.01",
    "Python-2.0": "[Python-2.0] Python License, Version 2",
    "RPSL-1.0": "[RPSL-1.0] RealNetworks Public Source License Version 1.0",
    "RPL-1.5": "[RPL-1.5] Reciprocal Public License 1.5",
    "RPL-1.1": "[RPL-1.1] Reciprocal Public License, version 1.1",
    "OFL-1.1": "[OFL-1.1] SIL OPEN FONT LICENSE",
    "SimPL-2.0": "[SimPL-2.0] Simple Public License",
    SISSL: "[SISSL] Sun Industry Standards Source License",
    "SPL-1.0": "[SPL-1.0] Sun Public License, Version 1.0",
    "BSD-2-Clause": "[BSD-2-Clause] 2-Clause BSD License",
    "BSD-3-Clause": "[BSD-3-Clause] 3-Clause BSD License",
    "CNRI-Python": "[CNRI-Python] CNRI portion of the multi-part Python License",
    "EUPL-1.1": "[EUPL-1.1] European Union Public License, version 1.1",
    MIT: "[MIT] MIT License",
    NGPL: "[NGPL] Nethack General Public License",
    "OCLC-2.0": "[OCLC-2.0] OCLC Research Public License 2.0 License",
    "OSL-3.0": "[OSL-3.0] Open Software License 3.0",
    PostgreSQL: "[PostgreSQL] PostgreSQL License",
    "QPL-1.0": "[QPL-1.0] Q Public License Version",
    RSCPL: "[RSCPL] Ricoh Source Code Public License",
    Sleepycat: "[Sleepycat] Sleepycat License",
    "Watcom-1.0": "[Watcom-1.0] Sybase Open Source Licence",
    "UPL-1.0": "[UPL-1.0] Universal Permissive License Version 1.0",
    NCSA: "[NCSA] University of Illinois/NCSA Open Source License",
    Unlicense: "[Unlicense] Unlicense",
    "VSL-1.0": "[VSL-1.0] Vovida Software License v. 1.0",
    "W3C-20150513": "[W3C-20150513] W3C® Software and Document license",
    wxWindows: "[wxWindows] wxWindows Library Licence",
    Xnet: "[Xnet] X.Net, Inc. License",
    Zlib: "[Zlib] zlib/libpng License",
    "Unicode-3.0": "[Unicode-3.0] UNICODE LICENSE V3",
    "Unicode-DFS-2016":
      "[Unicode-DFS-2016] Unicode, Inc. License Agreement – Data Files and Software",
    "UCL-1.0": "[UCL-1.0] Upstream Compatibility License v1.0",
    WordNet: "[WordNet] WordNet",
    WTFPL: "[WTFPL] WTFPL License",
    "0BSD": "[0BSD] Zero-Clause BSD",
    "ZPL-2.0": "[ZPL-2.0] Zope Public License 2.0",
    "ZPL-2.1 ": "[ZPL-2.1 ] Zope Public License 2.1",
    other: "其他",
  };

  static readonly reversedLicenseMap = this.reverseMap(this.licenseName);

  static readonly siteMap = {
    official: "官方",
    curseforge: "CurseForge",
    modrinth: "Modrinth",
    mcbbs: "MCBBS",
    klpbbs: "KLPBBS",
    minebbs: "MineBBS",
    mczwlt: "红石中继站",
    mcbbs_co: "MCBBS纪念版",
    mcbbs_co_archives: "MCBBS纪念版-帖子存档",
    sourceforge: "SourceForge",
    minecraft_forum: "Minecraft Forum",
    planetminecraft: "Planetminecraft",
    mcpedl: "MCPEDL",
    spigotmc: "SpigotMC",
    wiki: "WIKI",
    github: "GitHub",
    gitlab: "GitLab",
    gitee: "Gitee",
    gitea: "Gitea",
    gitpod: "Gitpod",
    gitcode: "GitCode",
    bitbucket: "Bitbucket",
    maven: "Maven",
    crowdin: "Crowdin",
    mastodon: "Mastodon",
    baidupan: "百度网盘",
    aliyundrive: "阿里云盘",
    quark: "夸克网盘",
    weiyun: "微云",
    lanzouyun: "蓝奏云",
    hecaiyun: "和彩云",
    ctyun: "天翼云",
    cowtransfer: "奶牛快传",
    google_drive: "Google Drive",
    onedrive: "OneDrive",
    dropbox: "Dropbox",
    mediafire: "MediaFire",
    bilibili: "B站",
    weibo: "微博",
    tieba: "贴吧",
    zhihu: "知乎",
    bcy: "半次元",
    ftb: "FTB",
    patreon: "Patreon",
    bmc: "Buy Me a Coffee",
    kofi: "ko-fi",
    afdian: "爱发电",
    kook: "KOOK",
    discord: "Discord",
    twitter: "Twitter",
    youtube: "YouTube",
    reddit: "Reddit",
    other: "其他",
  };

  static readonly reversedSiteMap = this.reverseMap(this.siteMap);

  static readonly mcVersionMap = {
    "1": "远古版本",
    "2": "1.2.5",
    "3": "1.4.7",
    "4": "1.5.2",
    "5": "1.6.2",
    "6": "1.6.4",
    "7": "1.7.2",
    "8": "1.7.4",
    "9": "1.7.5",
    "10": "1.7.8",
    "11": "1.7.9",
    "12": "1.7.10",
    "13": "1.8",
    "14": "1.8.8",
    "15": "1.8.9",
    "16": "1.9",
    "17": "1.9.4",
    "18": "1.10",
    "19": "1.10.2",
    "20": "1.11",
    "21": "1.11.2",
    "22": "1.3.2",
    "23": "1.12",
    "24": "1.12.1",
    "25": "1.12.2",
    "26": "1.13",
    "27": "1.13.2",
    "28": "1.13.1",
    "29": "1.14",
    "30": "1.14.1",
    "31": "1.14.2",
    "32": "1.14.3",
    "33": "1.14.4",
    "34": "1.10.1",
    "35": "1.11.1",
    "36": "1.15",
    "37": "1.15.1",
    "38": "1.15.2",
    "39": "1.16",
    "40": "1.4.3",
    "41": "1.16.1",
    "42": "1.16.2",
    "43": "1.16.3",
    "44": "1.16.4",
    "45": "1.16.5",
    "46": "1.17",
    "47": "1.17.1",
    "48": "1.18",
    "49": "1.18.1",
    "50": "1.18.2",
    "51": "1.4.2",
    "52": "1.19",
    "53": "1.19.1",
    "54": "1.19.2",
    "55": "1.19.3",
    "56": "1.20",
    "57": "1.19.4",
    "58": "1.20.1",
    "59": "1.20.2",
    "60": "1.20.3",
    "61": "1.20.4",
    "62": "1.20.5",
    "63": "1.20.6",
    "64": "1.21",
    "65": "1.21.1",
    "66": "1.21.2",
    "67": "1.21.3",
    "68": "1.21.4",
    "69": "1.21.5",
    "70": "1.21.6",
    "71": "1.21.7",
    "72": "1.21.8",
    "73": "1.21.9",
    "74": "1.21.10",
    "75": "1.21.11",
    "76": "26.1",
    "77": "26.1.1",
    "78": "26.1.2",
    "79": "26.2",
    "80": "26.3",
    "81": "1.5.1",
    "82": "1.6.1",
    "83": "1.4.4",
    "84": "1.4.5",
    "85": "1.4.6",
    "86": "26.4",
  } as const;

  static readonly reversedMcVersionMap = this.reverseMap(this.mcVersionMap);

  static readonly modEnvironmentModeMap = {
    "0": "待考证",
    "1": "需装",
    "2": "可选",
    "3": "无效",
  } as const;

  static readonly reversedModEnvironmentModeMap = this.reverseMap(this.modEnvironmentModeMap);

  static readonly modPlatformMap = {
    "1": "JAVA版 (JAVA Edition)",
    "2": "基岩版 (Bedrock Edition)",
  } as const;

  static readonly reversedModPlatformMap = this.reverseMap(this.modPlatformMap);

  static readonly modRelationTypeMap = {
    "1": "前置",
    "2": "拓展",
    "3": "联动",
  } as const;

  static readonly reversedModRelationTypeMap = this.reverseMap(this.modRelationTypeMap);

  static readonly modSourceMap = {
    "0": "不显示",
    "1": "开源",
    "2": "闭源",
  } as const;

  static readonly reversedModSourceMap = this.reverseMap(this.modSourceMap);

  static readonly modStatusMap = {
    "0": "不确定",
    "1": "活跃",
    "2": "半弃坑",
    "3": "停更",
  } as const;

  static readonly reversedModStatusMap = this.reverseMap(this.modStatusMap);

  static readonly searchOption = [
    { reg: /^添加模组/, label: "添加模组", exclude: "中的" },
    { reg: /^添加整合包/, label: "添加整合包", exclude: "中的" },
    { reg: /^添加.+教程/, label: "添加教程" },
    { reg: /^编辑模组/, label: "编辑模组", exclude: "中的" },
    { reg: /^编辑整合包/, label: "编辑整合包", exclude: "中的" },
    { reg: /^编辑.+个人作者\/开发团队。/, label: "编辑作者" },
    { reg: /^编辑.+教程。/, label: "编辑教程" },
    {
      reg: /^在.+中添加.+/,
      label: "添加资料",
      exclude: "更新日志。",
      exclude2: "合成表",
    },
    { reg: /^在.+中添加.+更新日志。/, label: "添加日志" },
    {
      reg: /^编辑.+中的.+/,
      label: "编辑资料",
      exclude: "更新日志。",
      exclude2: "合成表",
    },
    { reg: /^编辑.+中的.+更新日志。/, label: "编辑日志" },
    { reg: /^在资料.+中添加一张合成表。/, label: "添加合成表" },
    { reg: /^编辑资料.+中的一张合成表。/, label: "编辑合成表" },
    { reg: /^删除资料.+中的一张合成表。/, label: "删除合成表" },
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
    { lang: "vanilla", id: 9, isCustom: true },
  ];

  static readonly nonItemTypeList = {
    // 综合类型
    class: { text: "模组", icon: "fa-cubes" },
    modpack: { text: "整合包", icon: "fa-file-zip-o" },
    author: { text: "个人作者", icon: "fa-user" },
    authors: { text: "开发团队", icon: "fa-users" },
    oredict: { text: "矿物词典/物品标签", icon: "fa-tag" },
  } as const;

  static readonly itemDefaultTypeList: ItemCustomTypeList = [
    // 默认资料类型
    {
      classID: 0,
      typeID: 1,
      text: "物品/方块",
      icon: "\ue604",
      color: "#1b9100",
    },
    {
      classID: 0,
      typeID: 2,
      text: "群系/群落",
      icon: "\ue61e",
      color: "#e69a37",
    },
    {
      classID: 0,
      typeID: 3,
      text: "世界/维度",
      icon: "\ue62c",
      color: "#975a0a",
    },
    {
      classID: 0,
      typeID: 4,
      text: "生物/实体",
      icon: "\ue643",
      color: "#0c55b9",
    },
    {
      classID: 0,
      typeID: 5,
      text: "附魔/魔咒",
      icon: "\ue6b2",
      color: "#a239e4",
    },
    {
      classID: 0,
      typeID: 6,
      text: "BUFF/DEBUFF",
      icon: "\ue608",
      color: "#e4393f",
    },
    {
      classID: 0,
      typeID: 7,
      text: "多方块结构",
      icon: "\ue662",
      color: "#810914",
    },
    {
      classID: 0,
      typeID: 8,
      text: "自然生成",
      icon: "\ue627",
      color: "#d91baf",
    },
    {
      classID: 0,
      typeID: 9,
      text: "绑定热键",
      icon: "\ue600",
      color: "#3a6299",
    },
    {
      classID: 0,
      typeID: 10,
      text: "游戏设定",
      icon: "\ue628",
      color: "#4382d8",
    },
  ];

  static readonly itemCustomTypeList: ItemCustomTypeList = [
    {
      classID: 683,
      typeID: 103,
      text: "工具属性",
      icon: "fa-shapes",
      color: "#c300ff",
    },
    {
      classID: 3725,
      typeID: 205,
      text: "工具属性",
      icon: "fa-shapes",
      color: "#c300ff",
    },
    {
      classID: 10374,
      typeID: 230,
      text: "工具属性",
      icon: "fa-shapes",
      color: "#c300ff",
    },
    {
      classID: 1111,
      typeID: 165,
      text: "元素/要素",
      icon: "fa-mortar-pestle",
      color: "#90f",
    },
    {
      classID: 1111,
      typeID: 159,
      text: "新版已移除",
      icon: "fa-clock-o",
      color: "#b56f34",
    },
    {
      classID: 1111,
      typeID: 301,
      text: "交易",
      icon: "fa-shopping-cart",
      color: "#ffd700",
    },
    {
      classID: 1111,
      typeID: 163,
      text: "技能",
      icon: "fa-star-of-david",
      color: "#6cf",
    },
    {
      classID: 4869,
      typeID: 240,
      text: "版本更新移除",
      icon: "fa-clock-o",
      color: "#490404",
    },
    {
      classID: 1269,
      typeID: 277,
      text: "技能/能力",
      icon: "fa-magic",
      color: "#32d4a9",
    },
    {
      classID: 513,
      typeID: 131,
      text: "工具能力",
      icon: "fa-tools",
      color: "#f4d329",
    },
    {
      classID: 513,
      typeID: 190,
      text: "成就",
      icon: "fa-star",
      color: "#00e5f0",
    },
    {
      classID: 4869,
      typeID: 283,
      text: "成就/进度",
      icon: "fa-star",
      color: "#e5ff04",
    },
    {
      classID: 10145,
      typeID: 310,
      text: "成就/进度",
      icon: "fa-star",
      color: "#f60",
    },
    {
      classID: 2021,
      typeID: 191,
      text: "编辑规范",
      icon: "fa-book",
      color: "#000",
    },
    {
      classID: 12850,
      typeID: 246,
      text: "材料类型",
      icon: "fa-sitemap",
      color: "#0a9",
    },
    {
      classID: 23974,
      typeID: 319,
      text: "材料类型",
      icon: "fa-sitemap",
      color: "#0a9",
    },
  ];

  static readonly defaultGuiBound: RecipeJsonFrameGuiBound[] = [
    { guiID: "minecraft:crafting", mcmodID: 1 },
    { guiID: "minecraft:smelting", mcmodID: 2 },
    { guiID: "minecraft:blasting", mcmodID: 797 },
    { guiID: "minecraft:smoking", mcmodID: 923 },
    { guiID: "minecraft:campfire_smoking", mcmodID: 1083 },
    { guiID: "minecraft:stonecutting", mcmodID: 421 },
    { guiID: "minecraft:smithing", mcmodID: 1222 }, // TODO 1.19- 使用 ID=404 的 GUI
    { guiID: "minecraft:brewing", mcmodID: 282 },
  ];

  static readonly defaultTemplateList = [
    {
      id: "general_armor",
      title: "套装/盔甲/铠甲/XX套",
      description: "适用于将“头盔”、“胸甲”、“护腿”、“靴子”综合到同一个父资料中一起介绍时使用。",
      content: (
        import.meta.glob("./html/defaultTemplate.html", {
          query: "?raw",
          eager: true,
        })["./html/defaultTemplate.html"] as { default: string }
      ).default,
    },
  ];

  static readonly defaultInputSuggestion: Record<string, InputSimplifiedSuggestion[]> = {
    editReasons: defaultEditReasons,
    verifyReasons: defaultVerifyReasons,
  };
}
