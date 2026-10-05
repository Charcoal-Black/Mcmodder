import { reactive } from "vue";

/**
 * 自定义表态选择面板的共享状态：`AttitudeSystem` 负责打开、定位与挂载，`AttitudePicker.vue` 负责渲染与关闭。
 */
export interface AttitudePickerState {
  visible: boolean;
  /** 面板当前对应的短评 id（再次点击同一条短评即关闭） */
  commentId: string;
  /** 面板固定定位坐标（px，相对视口） */
  left: number;
  top: number;
  /** 我在该短评下已表态的类型 */
  active: string[];
  /** 最近使用的 emoji（本机维度） */
  recents: string[];
  /** 我上传的贴纸（面板打开时懒加载） */
  stickers: SupabaseAttitudeSticker[];
  /** 今日贴纸上传达额（null = 未知） */
  stickerQuota: SupabaseAttitudeStickerQuota | null;
  stickerLoading: boolean;
  /** `sticker:<id>` → 已解析出的图片地址（最近使用区渲染用） */
  stickerUrls: Record<string, string>;
  /** 用户选中某个类型（`AttitudeSystem` 接管写入） */
  onPick: (attitudeType: string) => void;
  /** 用户上传本地图片作为贴纸（`AttitudeSystem` 接管；成功后直接用它表态） */
  onUpload: (file: File) => Promise<void> | void;
  /** 请求关闭面板（`AttitudeSystem` 落地） */
  onClose: () => void;
}

export const attitudePickerState = reactive<AttitudePickerState>({
  visible: false,
  commentId: "",
  left: 0,
  top: 0,
  active: [],
  recents: [],
  stickers: [],
  stickerQuota: null,
  stickerLoading: false,
  stickerUrls: {},
  onPick: () => {},
  onUpload: () => {},
  onClose: () => {},
});

/**
 * 把面板夹取到视口内（按面板当前实际尺寸）：打开面板与展开「全部 emoji」后各调用一次，
 * 这样 JS 侧无需重复 CSS 里的尺寸常量。
 */
export function clampAttitudePanelPosition() {
  const panel = document.getElementById("mcmodder-attitude-panel");
  if (!panel) return;
  const { width, height } = panel.getBoundingClientRect();
  attitudePickerState.left = Math.min(
    Math.max(8, attitudePickerState.left),
    Math.max(8, window.innerWidth - width - 8),
  );
  attitudePickerState.top = Math.min(
    Math.max(8, attitudePickerState.top),
    Math.max(8, window.innerHeight - height - 8),
  );
}
