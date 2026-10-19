import { type Ref, watch } from "vue";

/**
 * 贴纸浏览区（`AttitudeStickerBrowser`）的选中态守卫：列表变化后（取消收藏、删除、重新拉取…）
 * 让 `selected` 与列表对齐——列表里已经没有的那张就置空，还在的话就改用列表里的最新记录。
 *
 * 必须由**持有 `selected` 的那个组件**来调用（`AttitudeStickerList` / `AttitudeStickerPlaza`）：
 * 浏览区只是通过 `v-model:selected` 借用宿主的 ref，一旦列表被置为待刷新（例如广场里取消共享
 * 后 `plazaStickers` 变成 `undefined`），浏览区会被卸载，它的 watch 与 `emit` 都不再可靠，
 * 而这个 ref 还留在宿主身上——只有宿主能维护它。
 *
 * 「改用最新记录」不只是兜底：使用方里既有整体换新数组的（表态面板的 `shallowRef`），
 * 也有在深 `ref` 数组里原地改元素的（个人中心），只有统一从列表取记录，预览区里的
 * 共享状态、名称之类的字段才不会停留在旧值上。
 *
 * 用法：`useStickerSelectionGuard(selected, () => props.stickers)`
 */
export function useStickerSelectionGuard(
  selected: Ref<SupabaseAttitudeSticker | null>,
  stickers: () => SupabaseAttitudeSticker[] | undefined,
) {
  // `deep`：深 `ref` 的使用方会原地改行内字段（重命名、共享状态…），浅比较捕捉不到
  watch(
    () => stickers(),
    (list) => {
      const current = selected.value;
      if (!current) return;
      const fresh = list?.find((item) => item.id === current.id);
      if (!fresh) {
        // 已离开列表（取消收藏、删除、取消共享后重拉…）：收起预览区
        selected.value = null;
      } else if (fresh !== current) {
        selected.value = fresh;
      }
    },
    { deep: true },
  );
}
