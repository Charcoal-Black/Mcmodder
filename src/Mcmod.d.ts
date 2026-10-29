/* Swal */
interface SweetAlertInputTypes {
  text: string;
  email: string;
  password: string;
  number: string;
  tel: string;
  select: string;
  radio: string;
  checkbox: boolean;
}

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
  interface SweetAlertOption<T extends keyof SweetAlertInputTypes | null = null> {
    type?: "success" | "warning" | "info" | "error" | "question";
    title?: string;
    text?: string;
    input?: T;
    inputValue?: T extends null ? undefined : SweetAlertInputTypes[T];
    inputOptions?: Record<string, string>;
    html?: string;
    footer?: string;
    customClass?: string;
    showConfirmButton?: boolean;
    showCancelButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColor?: string;
    cancelButtonColor?: string;
    allowOutsideClick?: boolean;
    allowEscapeKey?: boolean;
    preConfirm?: (...args: any[]) => any;
  }
  interface SweetAlertCallbackState<T extends keyof SweetAlertInputTypes | null> {
    value: SweetAlertInputTypes[T];
  }
  interface SweetAlertStatic {
    fire<T extends keyof SweetAlertInputTypes | null = null>(
      option: SweetAlertOption<T>,
    ): Promise<T extends null ? { value: boolean } : SweetAlertCallbackState<T>>;
    close(): void;
    isLoading(): boolean;
  }
  var swal: SweetAlertStatic;

  var iziToast: any;

  /* MCMOD */
  function common_msg(title: string, message: string, state: string): void;

  function showTaskTip(
    imageUrl: string,
    title: string,
    text: string,
    achieveTime: string,
    progress: number,
    rewardExp: number | string,
  ): number;

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
  var comment_channel: string | undefined;
  var get_comment: any;
  var get_reply_comment: (
    target: JQuery,
    replyID: string | number,
    page: number,
    showLoadImg?: boolean,
  ) => unknown;
  var editAutoSaveLoop: any;
  var nAutoSave: any;
  var bindFastSubmit: any;
  var editSave: any;
  var nClassID: string;
  var nItemID: string;
  var strEditType: any;
  var strEventUrl: any;
  var comment_container: any;
  var strTableSlotFocus: string;
  var getEditorData: (isTest: boolean) => any;
}

export {};
