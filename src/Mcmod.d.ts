declare global {
  /* JQuery */
  interface JQuery {
    selectpicker(key: string, value?: string): JQuery;
    sortable(option: any): JQuery;
    disableSelection(): JQuery;
    tooltip(option?: any): JQuery;
    webuiPopover(option?: any): JQuery;
  }

  /* Swal */
  interface SweetAlertCallbackState {
    value: boolean;
  }
  interface SweetAlertStatic {
    fire(option: any): Promise<SweetAlertCallbackState>;
    close(): void;
    isLoading(): boolean;
  }
  var swal: SweetAlertStatic;

  /* MCMOD */
  function common_msg(title: string, message: string, state: string): void;

  function showTaskTip(imageUrl: string, title: string, text: string, 
    achieveTime: string, progress: number, rewardExp: number | string): number;

  function setSetting(key: string, data: string | number): void;

  const baidu: any;
  const editor: any;
  const PublicLangData: any;
  const echarts: any;
  const structure_browser: any;

  var fuc_topmenu_v4: any;
  var SearchOn: any;
  var fuc_topmenu_sync: any;
  var comment_nowpage: any;
  var comment_container: any;
  var comment_type: any;
  var get_comment: any;
  var editAutoSaveLoop: any;
  var nAutoSave: any;
  var bindFastSubmit: any;
  var editSave: any;
  var nClassID: string;
  var nItemID: string;
  var strEditType: any;
  var strEventUrl: any;
  var comment_container: any;
  var getEditorData: (isTest: boolean) => any;
}

export {}