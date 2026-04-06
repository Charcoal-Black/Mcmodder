import { McmodderPermission } from "../config/ConfigUtils";
import { Mcmodder } from "../Mcmodder";
import { McmodderEditableTable } from "../table/EditableTable";
import { McmodderUtils } from "../Utils";
import { McmodderValues } from "../Values";

type OnClickCallback = (ev: JQueryEventObject) => any;
type DisplayCondition = () => boolean;

interface JsonFrameToolData {
  text: string,
  displayCondition: DisplayCondition,
  onClick: OnClickCallback,
  instance: JQuery
}

export abstract class JsonFrame<McmodderTableData extends Object> {

  protected abstract getConfigName(): string;
  protected parent: Mcmodder;
  id: string;
  $instance: JQuery;
  instance: Element;
  menu: JQuery;
  fixedMenu: JQuery;
  menuContent: JQuery;
  content: JQuery;
  tools: Record<string, JsonFrameToolData>;
  activeFileName: string;
  isFixedMenuVisible: boolean;
  hasRearranged: boolean;
  table?: McmodderEditableTable<McmodderTableData>;
  fileSelector: JQuery;
  selectionList: string[] = [];

  constructor(id: string, parent: Mcmodder) {
    this.parent = parent;
    if (!this.parent.utils.getAllConfig(this.getConfigName())) {
      this.parent.utils.setAllConfig(this.getConfigName(), {});
    }

    let instance = $(`
    <div id="jsonframe_${ id }" class="mcmodder-jsonframe">
      <div class="jsonframe-menu">
        <div class="jsonframe-menucontent">
          <select id="jsonframe_${ id }-select" class="jsonframe-select"></select>
        </div>
      </div>
      <div class="jsonframe-menu jsonframe-fixedmenu"></div>
      <div class="jsonframe-content"></div>
    </div>`);
    instance.find("select, button, label").addClass("btn").addClass("btn-sm");

    this.id = id;
    this.$instance = instance;
    this.menu = instance.find(".jsonframe-menu:not(.jsonframe-fixedmenu)");
    this.fixedMenu = instance.find(".jsonframe-fixedmenu").hide();
    this.menuContent = this.menu.find(".jsonframe-menucontent");
    this.content = instance.find(".jsonframe-content");
    this.tools = {};
    this.activeFileName = "";
    this.instance = instance.get(0);
    this.isFixedMenuVisible = true;
    this.hasRearranged = false;

    // this.moreMenu = [];

    this.addTool("importLocal", "从本地导入JSON", () => true, e => {
      const fileList = (e.target as HTMLInputElement)?.files;
      if (!fileList) return;
      const file = fileList[0];
      this.importFromFile(file);
    }, false, {
      type: "file",
      accept: "application/json"
    })
    .addTool("saveedit", "保存修改", () => !!this.activeFileName || this.hasRearranged, () => this.saveEdit())
    .addTool("rename", "重命名", () => !!this.activeFileName && !this.table!.unsavedUnitCount, () => this.rename())
    .addTool("deleteall", "删除当前文件", () => !!this.activeFileName, async () => {
      if (await this.deleteJson(this.activeFileName)) this.reset();
    })
    .addTool("more", "更多...", () => typeof this.more === "function", () => this.more());

    this.fileSelector = instance.find(`#jsonframe_${ id }-select`).change(e => {
      this.activeFileName = (e.currentTarget as HTMLInputElement).value;
      if (this.activeFileName) this.loadJson(this.activeFileName);
      else this.reset();
    });

    this.updateToolBar();

    $(document).scroll(McmodderUtils.throttle(() => {
      const frameRect = this.instance.getBoundingClientRect();
      const isFrameVisible = 
      frameRect.top < McmodderValues.headerContainerHeight &&
      frameRect.bottom >= McmodderValues.headerContainerHeight;
      
      if (isFrameVisible && this.isFixedMenuVisible) {
        this.updateFixedMenu();
        this.menuContent.appendTo(this.fixedMenu.show());
        this.isFixedMenuVisible = false;
      }
      else if (!isFrameVisible && !this.isFixedMenuVisible) {
        this.fixedMenu.hide();
        this.menuContent.appendTo(this.menu);
        this.isFixedMenuVisible = true;
      }
    }, 16));
    $(window).resize(McmodderUtils.throttle((_e: JQueryEventObject) => this.updateFixedMenu(), 16));

    this.updateSelection();
  }

  addTool(id: string, text: string, displayCondition: DisplayCondition, onClick: OnClickCallback, dangerMode = false, labelAttr?: object) {
    const nodeID = `jsonframe_${ this.id }-${ id }`;
    const data: JsonFrameToolData = {
      text: text,
      displayCondition: displayCondition,
      onClick: onClick,
      instance: $()
    };
    data.instance = $(`<${ labelAttr ? "label" : "button" }>`)
    .attr(labelAttr ? "id" : "for", nodeID)
    .addClass("btn btn-sm")
    .text(data.text)
    .appendTo(this.menuContent);
    if (dangerMode) data.instance.addClass("btn-danger");
    if (labelAttr) {
      $(`<input id=${ nodeID }>`)
      .attr(labelAttr)
      .change(e => onClick(e))
      .hide()
      .appendTo(data.instance);
    }
    else {
      data.instance
      .click(e => data.onClick(e));
    }
    this.tools[id] = data;
    return this;
  }

  protected parseText(text: string) {
    let success = 0, fail = 0, save: McmodderTableData[] | undefined;
    try {
      save = JSON.parse(text);
      success = 1;
    } catch (err) {
      this.onCaughtParseException(err);
      fail = 1;
    }
    return {
      success: success,
      fail: fail,
      result: save
    };
  }

  protected onCaughtParseException(err: unknown) {
    console.error("Error phasing raw JSON data: " + err);
    McmodderUtils.commonMsg(String(err), false, "解析错误");
  }

  importFromText(text: string, saveAs: string) {
    // 处理重名
    if (Object.keys(this.selectionList).includes(saveAs)) {
      let i = 2, dot = saveAs.lastIndexOf("."), main = saveAs.slice(0, dot), extension = saveAs.slice(dot + 1);
      let newName;
      while ((newName = `${ main }(${ i }).${ extension }`) && Object.keys(this.selectionList).includes(newName)) i++;
      saveAs = newName!;
    }
    const {success, fail, result} = this.parseText(text);
    if (success) {
      this.parent.utils.setConfig(saveAs, result, this.getConfigName());
      this.updateSelection();
      McmodderUtils.commonMsg(`已读取并保存为 ${ saveAs }，其中 ${ success } 条解析成功，${ fail } 条解析失败。`);
    }
  }

  importFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = o => {
      const result = o.target?.result;
      if (typeof result === "string") {
        this.importFromText(result, file.name);
      }
    };
    reader.readAsText(file);
  }

  isAvailableFileName(fileName: string) {
    return !!(fileName && Object.keys(this.selectionList).includes(fileName));
  }

  updateToolBar() {
    Object.keys(this.tools).forEach(key => {
      const data = this.tools[key];
      const instance = data.instance;
      if (data.displayCondition()) instance.show();
      else instance.hide();
    });
    this.fileSelector.show();
  }

  updateFixedMenu() {
    this.fixedMenu.css("width", this.instance.getBoundingClientRect().width + "px");
  }

  updateSelection(selection = this.parent.utils.getAllConfig(this.getConfigName())) {
    this.selectionList = selection;
    const selector = this.$instance.find(".jsonframe-select");
    selector.html('<option value="">选择一个JSON文件</option>');
    Object.keys(selection).filter(e => e).forEach(e => $(`<option value=${ e }>${ e }</option>`).appendTo(selector));
    // selector.selectpicker("render");
  }

  fileExistedInquire(fileName: string) {
    return swal.fire({
      type: "warning",
      title: "文件名重复",
      text: `在脚本内部存储中已存在拥有该文件名 (${ fileName }) 的文件，继续导入将会覆盖此文件，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "覆盖",
      cancelButtonText: "取消",
    });
  }

  async newJson(fileName: string, content: string) {
    let storages = this.parent.utils.getAllConfig(this.getConfigName());
    if (Object.keys(storages).includes(fileName)) return new Promise(resolve => {
      this.fileExistedInquire(fileName)
      .then(isConfirm => {
        if (isConfirm.value) {
          this.parent.utils.setConfig(fileName, content, this.getConfigName());
          resolve(true);
        }
        else resolve(false);
      });
    });
    else {
      this.parent.utils.setConfig(fileName, content, this.getConfigName());
      return true;
    }
  }

  loadJson(fileName: string) {
    this.table!.selectedRowCount = 0;
    this.table!.unsavedUnitCount = 0;
    this.table!.setAllData(this.parent.utils.getConfig(fileName, this.getConfigName(), []));
    this.hasRearranged = false;
    this.updateToolBar();
  }

  saveEdit() {
    if (!this.table!.unsavedUnitCount) {
      McmodderUtils.commonMsg("当前暂无需要保存的改动...", false);
      return;
    }
    this.table!.saveAll();
    this.updateToolBar();
    this.parent.utils.setConfig(this.activeFileName, this.table!.getAllData(), this.getConfigName());
    McmodderUtils.commonMsg("所有改动均已保存~");
  }

  rename() {
    const name = this.activeFileName;
    if (!name) return;
    swal.fire({
      title: "重命名当前文件",
      html: `将当前已打开的文件重命名为... <input class="form-control" id="jsonframe-rename-input">`,
      showCancelButton: true,
      preConfirm: () => {
        const newName = McmodderUtils.regulateFileName(input.val().trim());
        if (name === newName) return;
        
        const storage = this.parent.utils.getAllConfig(this.getConfigName(), {});
        const fileData = storage[name];
        delete storage[name];
        storage[newName] = fileData;
        this.parent.utils.setAllConfig(this.getConfigName(), storage);

        let database: string[] = this.parent.utils.getConfig("jsonDatabase") || [];
        database = database.filter(e => e != name);
        database.push(newName);
        this.parent.utils.setConfig("jsonDatabase", database);

        McmodderUtils.commonMsg("文件重命名成功~");
        this.activeFileName = newName;
        this.updateSelection();
      }
    });
    var input = $("#jsonframe-rename-input").val(name).change(e => {
      const target = e.currentTarget as HTMLInputElement;
      let newName = target.value.trim();
      target.value = McmodderUtils.regulateFileName(newName);
    });
    /*.keydown(e => {
      if (e.keyCode === 13) Swal.clickConfirm();
    }*/
  }

  submitEdit() {
    if (!this.parent.currentUID) {
      McmodderUtils.commonMsg("请先登录~", false);
      return;
    }
    const lv: number = this.parent.utils.getProfile("lv");
    const permission: McmodderPermission = this.parent.utils.getProfile("permission");
    if (lv < 5 && !(permission === McmodderPermission.EDITOR || permission >= McmodderPermission.ADMIN)) {
      McmodderUtils.commonMsg("当前提交编辑需要验证码，暂无法使用此功能~（免验证码条件：用户主站等级≥Lv.5 或 已是任意模组编辑员或拥有更高权限）", false);
      return;
    }
    McmodderUtils.commonMsg("此功能尚未完工，敬请期待~");
  }

  protected abstract more(): void;

  fileDeleteInquire(fileName: string): Promise<SweetAlertCallbackState> {
    return new Promise(resolve => swal.fire({
      type: "warning",
      title: "警告",
      text: `您正在尝试删除 (${fileName})，此操作不可逆，确定要继续吗？`,
      showCancelButton: true,
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonColor: "var(--mcmodder-color-danger)"
    }).then(isConfirm => resolve(isConfirm)));
  }

  async deleteJson(fileName: string) {
    if (!this.isAvailableFileName(fileName)) return new Promise(resolve => resolve(false));
    return this.fileDeleteInquire(fileName).then(isConfirm => {
      if (isConfirm.value) {
        this.parent.utils.setConfig(this.activeFileName, null, this.getConfigName());
        let linking: string[] = this.parent.utils.getConfig("jsonDatabase") || [];
        this.parent.utils.setConfig("jsonDatabase", linking.filter(name => name != fileName));
        McmodderUtils.commonMsg(`成功删除 ${fileName} ~`);
        this.updateSelection();
        return true;
      }
      else return false;
    });
  }

  reset() {
    this.activeFileName = "";
    this.table!.selectedRowCount = 0;
    this.table!.empty();
    this.$instance.find(".jsonframe-deleteall, .jsonframe-saveall").hide();
  }

  protected onStopRearrage() {
    this.hasRearranged = true;
    this.updateToolBar();
  }
}