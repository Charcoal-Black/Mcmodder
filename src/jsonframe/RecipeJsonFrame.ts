import { McmodderMap } from "../map/Map";
import { Mcmodder } from "../Mcmodder";
import { McmodderItemData, McmodderJsonStorage, McmodderRecipeData, McmodderRecipeIngredient, RecipeJsonFrameGuiBound } from "../types";
import { McmodderEditableTable } from "../table/EditableTable";
import { McmodderTable } from "../table/Table";
import { ItemDisplay } from "../widget/ItemDisplay";
import { JsonFrame } from "./JsonFrame";
import { McmodderInputType } from "../config/ConfigUtils";
import { McmodderUtils } from "../Utils";

export class RecipeJsonFrame extends JsonFrame<McmodderRecipeData> {
  protected getConfigName() {
    return "mcmodderRecipeJsonStorage";
  }
  override readonly table: McmodderEditableTable<McmodderRecipeData>;
  private readonly itemMap = new McmodderMap<McmodderItemData>("registerName");
  private readonly tagMap = new McmodderMap<McmodderItemData>("OredictList");
  private readonly guiMap = new McmodderMap<RecipeJsonFrameGuiBound>("guiID");
  private guiBound?: RecipeJsonFrameGuiBound[];

  private readonly itemListDisplay = (
    ids?: Record<string, McmodderRecipeIngredient>,
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

  protected more() {
    McmodderUtils.commonMsg("暂无更多选项，敬请期待~");
  }

  private readonly itemInputDisplay = (_: any, row: Partial<McmodderRecipeData>) => {
    return this.itemListDisplay(row.in_id, row.in_num, row.in_chance);
  }

  private readonly itemOutputDisplay = (_: any, row: Partial<McmodderRecipeData>) => {
    return this.itemListDisplay(row.out_id, row.out_num, row.out_chance);
  }
  
  constructor(id: string, parent: Mcmodder) {
    super(id, parent);

    // map init
    const selection: McmodderJsonStorage = this.parent.utils.getAllConfig("mcmodderJsonStorage", {});
    Object.values(selection).forEach(content => {
      this.itemMap.add(content);
      this.tagMap.add(content);
    });

    this.updateGuiBound();

    this.table = new McmodderEditableTable<McmodderRecipeData>(parent, { class: "table jsonframe-table" }, {
      gui_id: "GUI",
      input: ["输入", this.itemInputDisplay],
      output: ["输出", this.itemOutputDisplay],
      power_text: ["额外数据", McmodderTable.DISPLAYRULE_ARRAY]
    }, {
      in_id: {readonly: true},
      out_id: {readonly: true},
      in_num: {readonly: true},
      out_num: {readonly: true},
      in_chance: {readonly: true},
      out_chance: {readonly: true},
      power_num: {readonly: true},
      gui_id: McmodderInputType.TEXT
    }, () => {
      this.updateToolBar();
    });

    this.addTool("bindGui", "绑定百科GUI", () => !!this.activeFileName, () => this.bindGui());

    this.table.$instance.appendTo(this.content);
  }

  private updateGuiBound() {
    this.guiMap.clear();
    this.guiBound = this.parent.utils.getAllConfig("guiBound") || [];
    this.guiMap.add(this.guiBound!);
  }

  private getCurrentGuiSet() {
    const set = new Set<string>();
    this.table.getAllData().forEach(recipe => {
      if (recipe.gui_id) {
        set!.add(recipe.gui_id);
      }
    });
    this.guiBound?.forEach(bound => {
      set!.add(bound.guiID);
    });
    return set;
  }

  private bindGui() {
    swal.fire({
      title: "绑定百科GUI",
      html: `<div class="jsonframe-bindgui-frame" />`,
      customClass: "swal2-popup-wider",
      showConfirmButton: false,
      showCancelButton: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      cancelButtonText: "完事了"
    });

    const fileTable = new McmodderEditableTable<RecipeJsonFrameGuiBound>(this.parent, {}, {
      guiID: ["GUI 注册名", McmodderTable.DISPLAYRULE_MONOSPACE],
      mcmodID: "对应百科 ID",
      img: ["GUI 图片", (_, data) => {
        return data.mcmodID ? `<img src="//i.mcmod.cn/gui/bg/${ data.mcmodID }.gif"><img>` : "-";
      }]
    }, {
      guiID: null,
      mcmodID: McmodderInputType.NUMBER
    }, () => {
      fileTable.saveAll();
      this.parent.utils.setAllConfig("guiBound", fileTable.getAllData());
    });

    const content: RecipeJsonFrameGuiBound[] = [];
    this.getCurrentGuiSet().forEach(id => {
      const bound = this.guiMap.get(id);
      content.push({
        guiID: id,
        mcmodID: bound ? bound[0].mcmodID : 0
      });
    });
    fileTable.setAllData(content);

    fileTable.$instance.appendTo(".jsonframe-bindgui-frame");
  }
}