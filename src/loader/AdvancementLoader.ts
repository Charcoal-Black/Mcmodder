import { AdvancementType, AdvancementUtils } from "../advancement/AdvancementUtils";
import { McmodderUtils } from "../Utils";

export class AdvancementLoader {
  static run(advs: AdvancementUtils) {
    advs.add("old_text_word_length_1000", AdvancementType.COMMON, 0, 1, 350, null, null)
    .add("old_text_word_length_0", AdvancementType.COMMON, 1, 1, 350, null, null)
    .add("view_below_50", AdvancementType.COMMON, 2, 1, 350, null, null)
    .add("last_edit_365", AdvancementType.COMMON, 3, 1, 350, null, null)
    .add("edit_times_20", AdvancementType.COMMON, 4, 1, 350, null, null)
    .add("add_post_word_length_10000", AdvancementType.COMMON, 5, 1, 520, null, null)
    .add("edit_class_area_100", AdvancementType.COMMON, 6, 1, 400, null, null)
    .add("download_mods_1", AdvancementType.SPECIAL, 12, 1, 0, McmodderUtils.getImageURLByItemID(40221, 128), null)
    .add("keep_edit_240days", AdvancementType.SPECIAL, 10, 1, 0, null, null)
    .add("wait_a_minute", AdvancementType.SPECIAL, 13, 3, 0, McmodderUtils.getImageURLByItemID(9378, 128), null)
    .add("fault_finder", AdvancementType.SPECIAL, 14, 10, 0, McmodderUtils.getImageURLByItemID(940, 128), null)
    .add("master_editor", AdvancementType.SPECIAL, 15, 1, 0, McmodderUtils.getImageURLByItemID(6724, 128), null)
    .add("click_girl_100_times", AdvancementType.SPECIAL, 16, 100, 0, "/ueditor/dialogs/emotion/images/mcmod_2020/13.gif", null)
    .add("skillful_craftsman", AdvancementType.SPECIAL, 17, 1, 0, McmodderUtils.getImageURLByItemID(770349, 128), null)
    .add("grave_digger", AdvancementType.SPECIAL, 18, 1, 0, McmodderUtils.getImageURLByItemID(72138, 128), null)
    .add("all_your_fault", AdvancementType.SPECIAL, 19, 1000, 0, McmodderUtils.getImageURLByItemID(37698, 128), null)
    .add("so_good_together", AdvancementType.SPECIAL, 20, 1, 0, McmodderUtils.getImageURLByItemID(221811, 128), null)
    .add("mcmod_10th", AdvancementType.SPECIAL, 11, 1, 0, null, null)
    .add("user_view_center", AdvancementType.DAILY, 22, 1, 0, null, null)
    .add("user_push_class", AdvancementType.DAILY, 23, 1, 0, null, null)
    .add("user_add_class", AdvancementType.DAILY, 24, 1, 0, null, null)
    .add("user_add_modpack", AdvancementType.DAILY, 25, 1, 0, null, null)
    .add("user_add_post", AdvancementType.DAILY, 26, 1, 0, null, null)

    .addTiered(20, tier => `user_edit_all_${ tier }`, AdvancementType.COMMON, 
      7, tier => tier * 1e3, tier => tier * 500, null, null)
    .addTiered(20, tier => `user_word_all_${ tier }`, AdvancementType.COMMON,
      8, tier => tier * 5e4, tier => tier * 500, null, null)
    .addTiered(6, tier => `user_word_avg_${ tier }`, AdvancementType.COMMON,
      9, _ => 50, tier => [192, 669, 585, 942, 1517, 2444][tier - 1])
    .addTiered(29, tier => `user_lv_${ tier + 1 }`, AdvancementType.COMMON,
      21, _ => 1, _ => 0, null, null)
    .addTiered(5, tier => `user_edit_today_${ tier }`, AdvancementType.DAILY,
      27, tier => [1, 10, 20, 50, 100][tier - 1], 
      tier => [1, 10, 25, 50, 100][tier - 1], null, null)
    .addTiered(5, tier => `user_word_today_${ tier }`, AdvancementType.DAILY,
      28, tier => [50, 500, 1000, 2500, 5000][tier - 1], 
      tier => [1, 10, 25, 50, 100][tier - 1], null, null);
  }
}