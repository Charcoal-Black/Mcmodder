import { McmodderMap } from "../Map";
import { Mcmodder } from "../Mcmodder";
import { McmodderItemData, McmodderItemList, McmodderJsonStorage, McmodderRecipeData } from "../types";
import { McmodderEditableTable } from "../table/EditableTable";
import { HeadReadonlyConfig, McmodderTable } from "../table/Table";
import { ItemDisplay } from "../widget/ItemDisplay";
import { JsonFrame } from "./JsonFrame";

export class RecipeJsonFrame extends JsonFrame<McmodderRecipeData> {
  protected getConfigName() {
    return "mcmodderRecipeJsonStorage";
  }
  readonly table: McmodderEditableTable<McmodderRecipeData>;
  private readonly itemMap: McmodderMap<McmodderItemData>;
  private readonly tagMap: McmodderMap<McmodderItemData>;

  private readonly itemListDisplay = (
    ids?: Record<string, string>,
    counts?: Record<string, number>,
    chances?: Record<string, number>
  ) => {
    let res = "";
    if (ids) Object.keys(ids).forEach(id => {
      const count = counts && counts[id];
      const chance = chances && chances[id];
      const display = new ItemDisplay(this.itemMap, this.tagMap, ids[id], count, chance);
      res += display.getHTML();
    });
    return res;
  }

  private readonly itemInputDisplay = (_: any, row: McmodderRecipeData) => {
    return this.itemListDisplay(row.in_id, row.in_num, row.in_chance);
  }

  private readonly itemOutputDisplay = (_: any, row: McmodderRecipeData) => {
    return this.itemListDisplay(row.out_id, row.out_num, row.out_chance);
  }
  
  constructor(id: string, parent: Mcmodder) {
    super(id, parent);

    // map init
    let itemRegistry: McmodderItemList = [];
    const selection: McmodderJsonStorage = this.parent.utils.getAllConfig("mcmodderJsonStorage", {});
    Object.keys(selection).forEach(fileName => {
      itemRegistry = itemRegistry.concat(selection[fileName]);
    });
    this.itemMap = new McmodderMap<McmodderItemData>(itemRegistry, "registerName");
    this.tagMap = new McmodderMap<McmodderItemData>(itemRegistry, "OredictList");

    this.table = new McmodderEditableTable(parent, { class: "table jsonframe-table" }, {
      gui_id: new HeadReadonlyConfig("GUI"),
      input: new HeadReadonlyConfig("输入", this.itemInputDisplay),
      output: new HeadReadonlyConfig("输出", this.itemOutputDisplay),
      power_text: new HeadReadonlyConfig("额外数据", McmodderTable.DISPLAYRULE_ARRAY)
    }, () => {
      this.updateToolBar();
    });

    this.table.$instance.appendTo(this.content);
  }
}