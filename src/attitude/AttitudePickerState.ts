import { reactive } from "vue";

/**
 * 自定义表态选择面板的共享状态。
 *
 * 面板全站唯一：`AttitudeSystem` 负责打开、定位与挂载，`AttitudePicker.vue` 负责渲染与关闭
 * （Esc / 点击面板外部 / 滚动）。同一时刻只允许一个面板实例，因此位置与上下文都放在这里，
 * 而不是逐次创建组件实例。
 */
export interface AttitudePickerState {
  visible: boolean;
  /** 面板当前对应的短评 id：再次点击同一条短评的表态按钮即关闭面板 */
  commentId: string;
  /** 面板固定定位坐标（px，相对视口） */
  left: number;
  top: number;
  /** 我在该短评下已表态的类型（用于高亮） */
  active: string[];
  /** 最近使用的 emoji（本机维度，最多 `Values.attitude.recentEmojisLimit` 个） */
  recents: string[];
  /** 我上传的贴纸（面板打开时懒加载；未取到时为空数组） */
  stickers: SupabaseAttitudeSticker[];
  /** 今日贴纸上传达额（服务端返回；未知时为 null） */
  stickerQuota: SupabaseAttitudeStickerQuota | null;
  /** 贴纸列表是否正在加载 */
  stickerLoading: boolean;
  /** 已解析出图片地址的贴纸：`sticker:<id>` → 图片地址（最近使用区渲染用） */
  stickerUrls: Record<string, string>;
  /** 用户选中某个类型（由 `AttitudeSystem` 接管写入） */
  onPick: (attitudeType: string) => void;
  /** 用户上传本地图片作为贴纸（由 `AttitudeSystem` 接管上传；成功后会直接表态） */
  onUpload: (file: File) => Promise<void> | void;
  /** 请求关闭面板（Esc / 点击面板外部 / 页面滚动）；由 `AttitudeSystem` 落地 */
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
 * 把面板夹取到视口内（按面板当前的实际尺寸计算）。
 *
 * 打开面板与面板内展开「全部 emoji」后各调用一次，这样 JS 侧无需重复 CSS 里的尺寸常量。
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
