import { GM_getValue } from "$";
import { Mcmodder } from "../Mcmodder";
import { HeadConfigs, McmodderTable } from "../table/Table";
import { McmodderUtils } from "../Utils";

export type ConfigParser = (config: string) => any;
export type DataParser = (key: string, value: any) => any;

export class McmodderConfigResourceInteractor<McmodderTableData extends Object> {
  static getTableID(id: string) {
    return `mcmodder-config-table-${ id }`;
  }

  parent: Mcmodder;
  id: string;
  table: McmodderTable<McmodderTableData>;
  isLoaded: boolean;
  isShown: boolean;
  $instance: JQuery;
  protected configParser: Function;
  protected dataParser: Function;

  constructor(parent: Mcmodder, id: string, name: string, headOptions: HeadConfigs<McmodderTableData>, 
      configParser?: ConfigParser | null, dataParser?: DataParser | null) {
    this.parent = parent;
    this.id = id;
    this.table = new McmodderTable(parent, {
      id: McmodderConfigResourceInteractor.getTableID(id),
    }, headOptions);
    this.table.hide();
    this.isLoaded = false;
    this.isShown = false;
    this.configParser = configParser || ((config: any) => JSON.parse(config || "{}"));
    this.dataParser = dataParser || ((_: any, item: any) => item);

    this.$instance = $(`
      <div>
        <a>${ name }</a> = 
        <span>${ McmodderUtils.getFormattedSize(GM_getValue(id)?.length) }</span>
      </div>
    `);
    this.table.$instance.appendTo(this.$instance);
    this.$instance.find("a").click(() => this._onClick());
  }

  load() {
    let data = this.configParser(GM_getValue(this.id));
    this.table.showLoading();
    Object.keys(data).forEach(key => {
      this.table.appendData(this.dataParser(key, data[key]));
    });
    this.table.refreshAll();
    this.isLoaded = true;
  }

  _onClick() {
    if (!this.isShown) {
      if (!this.isLoaded) this.load();
      this.table.show();
      this.isShown = true;
    }
    else {
      this.table.hide();
      this.isShown = false;
    }
  }
}