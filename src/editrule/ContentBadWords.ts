/**
 * 正文词库检查（机翻 / 第一人称 / 不确定 / 不规范 / 版本模糊）。
 *
 * 词库与匹配方式对齐百科原生校验脚本 `mc.edit.verify.functions.js`：
 *
 * - 词库来自站点的公开资源 `/static/public/json/badwords.json`；
 * - 不区分大小写，按词库顺序做子串匹配，命中的词以「, 」拼接；
 * - 提示文案取自 `PublicLangData.editor.inform.list`，去掉原生用于高亮的 `<b>`。
 *
 * 模组正文与资料正文共用这套词库，因此本类不做字段判断，只接收已经去掉 HTML 标签的文本。
 */
export class ContentBadWords {
  /** 疑似机翻的词汇。 */
  private static readonly machine = [
    "机翻",
    "国防部",
    "球员",
    "香草",
    "香子兰",
    "暴徒",
    "暴民",
    "欧盟",
    "安德",
    "雷射艇",
    "水雷艇",
    "产卵",
    "街区",
    "食谱",
    "射频",
    "胸部",
    "雷石东",
    "直放站",
    "大火杆",
    "老板",
    "库存",
    "广藿香",
    "滴答作响",
    "织物",
  ] as const;

  /** 疑似第一人称 / 主观的词汇。 */
  private static readonly self = [
    "最强",
    "毫无",
    "没啥",
    "笔者",
    "编者",
    "小编",
    "本人",
    "我想",
    "我有",
    "我还",
    "亲测",
    "我们",
    "我最",
    "实测",
    "我觉得",
    "我认为",
    "我感觉",
    "感觉像",
    "最厉害",
    "我测试",
    "我实验",
    "有一次",
    "经测试",
    "这是我",
    "个人试过",
    "个人测试",
    "个人认为",
    "并无卵用",
    "无太大用",
    "当我没说",
    "我还以为",
    "强烈推荐",
    "测试发现",
  ] as const;

  /** 表达不确定的词汇。 */
  private static readonly notsure = [
    "据说",
    "也许",
    "大概",
    "传闻",
    "好像",
    "貌似",
    "似乎",
    "疑似",
    "目测",
    "推测",
    "不知道",
    "待补充",
    "不见得",
    "不清楚",
    "不确定",
    "不太清楚",
    "作用不明",
    "尚未测试",
    "有待测试",
  ] as const;

  /** 不规范 / 错别字 / 易误用的词汇。 */
  private static readonly rule = [
    "党",
    "撸",
    "搞",
    "妈",
    "咋",
    "屎",
    "尿",
    "傻",
    "稿",
    "fuck",
    "shit",
    "nigger",
    "233",
    "666",
    "蓝瘦",
    "笑尿",
    "骚年",
    "鬼畜",
    "纠结",
    "竟然",
    "居然",
    "逗比",
    "mmp",
    "苦逼",
    "百度",
    "剁手",
    "隔壁",
    "蛋疼",
    "二货",
    "牛逼",
    "牛B",
    "牛批",
    "土豪",
    "狂魔",
    "这货",
    "很坑",
    "名堂",
    "坑货",
    "坑爹",
    "搞啥",
    "傻逼",
    "搞基",
    "炸妈",
    "膜法",
    "蛤蛤",
    "脑残",
    "撸树",
    "难搞",
    "智障",
    "弱智",
    "B格",
    "逼格",
    "逗比",
    "搞事",
    "？？",
    "！！",
    "。。",
    "，，",
    "：。",
    "。：",
    "，。",
    "。，",
    "；。",
    "。；",
    "；：",
    "：；",
    "，；",
    "；，",
    "找死",
    "亏死",
    "搞死",
    "耐操",
    "水货",
    "制杖",
    "…………",
    "白痴",
    "神器",
    "duang",
    "秒杀",
    "贴脸",
    "作死",
    "大佬",
    "萌新",
    "奥数",
    "纬度",
    "立场",
    "下届",
    "单词",
    "上海",
    "饱食度",
    "饱腹度",
    "饱腹值",
    "饥饿度",
    "凋落物",
    "演讲稿",
    "坚守者",
    "镐子",
    "奔溃",
    "炸天",
    "这东西",
    "毛特效",
    "伸手党",
    "就很气",
    "玩意儿",
    "草泥马",
    "麒麟臂",
    "小伙伴",
    "揣兜里",
    "洗洗睡",
    "这玩意",
    "分分钟",
    "也不赖",
    "咕咕咕",
    "啊啊啊",
    "嘤嘤嘤",
    "逮虾户",
    "奥利给",
    "贼恶心",
    "你觉得",
    "小朋友",
    "小学生",
    "石乐志",
    "失了智",
    "不解释",
    "不一一",
    "弱爆了",
    "给扬了",
    "一毛一样",
    "卡爆渣机",
    "突然发现",
    "不存在的",
    "手动滑稽",
    "不要觉得",
    "意义不明",
    "光速去世",
    "直接升天",
    "一发入魂",
    "不喜勿喷",
    "自己看着办",
    "不过多解释",
  ] as const;

  /** 对版本号的模糊描述。 */
  private static readonly version = [
    "新版",
    "旧版",
    "高版",
    "低版",
    "老版",
    "新的版",
    "旧的版",
  ] as const;

  /** 按词库顺序找出所有命中的词，以「, 」拼接；与原生 `in_array(..., true)` 一致。 */
  private static match(text: string, words: readonly string[]) {
    const lower = text.toLowerCase();
    return words.filter((word) => lower.includes(word.toLowerCase())).join(", ");
  }

  /**
   * @param text 已经去掉 HTML 标签的正文
   * @param result 当前编辑类型共用的查错结果
   */
  static check(text: string, result: VerifyCheckResult) {
    const machine = this.match(text, this.machine);
    if (machine.length > 0) {
      result.warning.push(
        `正文介绍中含有疑似机翻的词汇: (${machine})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。`,
      ); // common_content_machine
    }

    const self = this.match(text, this.self);
    if (self.length > 0) {
      result.warning.push(
        `（【重要】）正文介绍中含有疑似第一人称/主观的介绍: (${self})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。`,
      ); // common_content_self
    }

    const notsure = this.match(text, this.notsure);
    if (notsure.length > 0) {
      result.warning.push(
        `正文介绍中含有疑似不确定的介绍: (${notsure})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。`,
      ); // common_content_notsure
    }

    const rule = this.match(text, this.rule);
    if (rule.length > 0) {
      result.warning.push(
        `正文介绍中含有疑似不规范/错字的词汇: (${rule})，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。`,
      ); // common_content_rule
    }

    const version = this.match(text, this.version);
    if (version.length > 0) {
      result.info.push(
        `正文介绍中含有疑似对版本模糊的描述: (${version})，虽描述并无大碍，但必须同时附上具体的版本号，不能只用“新版”、“旧版”等模糊描述，具体请参考“编辑帮助”中的《百科主站编辑规范》，如为误报可忽略。`,
      ); // common_content_version
    }
  }

  /** 与 {@link check} 相同，但接收原始 HTML。 */
  static checkHtml(html: string | undefined, result: VerifyCheckResult) {
    if (html === undefined) {
      return;
    }
    this.check(html.replace(/<\/?.+?>/g, "").trim(), result);
  }
}
