import { Mcmodder } from "../Mcmodder";
import { AdvancementData } from "../types";

export const enum AdvancementID {
  OLD_TEXT_WORD_LENGTH_1000,
  OLD_TEXT_WORD_LENGTH_0,
  VIEW_BELOW_50,
  LAST_EDIT_365,
  EDIT_TIMES_20,
  ADD_POST_WORD_LENGTH_10000,
  EDIT_CLASS_AREA_100,
  USER_EDIT_ALL,
  USER_WORD_ALL,
  USER_WORD_AVG,
  KEEP_EDIT_240DAYS,
  MCMOD_10TH,
  DOWNLOAD_MODS_1,
  WAIT_A_MINUTE,
  FAULT_FINDER,
  MASTER_EDITOR,
  CLICK_GIRL_100_TIMES,
  SKILLFUL_CRAFTSMAN,
  GRAVE_DIGGER,
  ALL_YOUR_FAULT,
  SO_GOOD_TEACHER,
  USER_LV,
  USER_EDIT_TODAY,
  USER_WORD_TODAY,
  USER_ADD_CLASS,
  USER_ADD_MODPACK,
  USER_ADD_POST
}

export const enum AdvancementType {
  DAILY = 1,
  COMMON,
  SPECIAL
}

type LangGenerator = (tier: number) => string;
type RangeGenerator = (tier: number) => number;
type ExpGenerator = (tier: number) => number;
type ImageGenerator = ((tier: number) => string) | null;
type RewardGenerator = ((tier: number) => number) | null;

export class AdvancementUtils {

  parent: Mcmodder;
  list: AdvancementData[];

  constructor(parent: Mcmodder) {
    this.parent = parent;
    this.list = [];
  }

  add(lang: string, category: AdvancementType, id: AdvancementID, range: number,
      exp: number, image?: string | null, reward?: number | null, tier?: number) {
    this.list.push({
      lang: lang,
      category: category,
      id: id,
      range: range || 1,
      exp: exp || 0,
      image: image,
      reward: reward,
      tier: tier,
      isCustom: image ? true : false
    });
    return this;
  }

  addTiered(maxTier: number, langGen: LangGenerator, category: AdvancementType, id: number, 
      rangeGen: RangeGenerator, expGen?: ExpGenerator, imageGen?: ImageGenerator, rewardGen?: RewardGenerator) {
    for (let tier = 1; tier <= maxTier; ++tier) {
      this.add(
        langGen(tier),
        category,
        id,
        rangeGen ? rangeGen(tier) : 1,
        expGen ? expGen(tier) : 0,
        imageGen ? imageGen(tier) : null,
        rewardGen ? rewardGen(tier) : null,
        tier
      );
      const t = this.list.slice(-2);
      if (tier > 1) t[1].prev = t[0], t[0].next = t[1]; // 双链表
    }
    return this;
  }

  getData(id: AdvancementID) {
    return this.list.filter(e => e.id == id)[0];
  }

  getAll() {
    return JSON.parse(this.parent.utils.getProfile("advancements") || "[]");
  }

  getSingleProgress(id: AdvancementID) {
    let advancements = this.getAll();
    for (let i of advancements) {
      if (i.id == id) return i.progress;
    }
    return 0;
  }

  setProgress(id: AdvancementID, value: number) {
    if (!this.parent.utils.getConfig("customAdvancements")) return;
    let advancements = this.getAll(), max = this.getData(id).range, f = 1;
    for (let i of advancements) {
      if (i.id == id) {
        f = 0;
        if (i.progress == max && value >= i.progress) return;
        i.progress = Math.min(value, max);
        if (i.progress >= max) {
          const rawCompletion: string = this.parent.utils.getProfile("completed");
          let completion: AdvancementID[] = [];
          if (rawCompletion) {
            completion = rawCompletion.split(",").map(Number);
          }
          completion.push(id);
          this.parent.utils.setProfile("completed", completion.join(","));
        }
        break;
      }
    }
    if (f) advancements.push({ id: id, progress: value });
    this.parent.utils.setProfile("advancements", JSON.stringify(advancements));
  }

  addProgress(id: AdvancementID, value = 1) {
    this.setProgress(id, this.getSingleProgress(id) + value);
  }
}