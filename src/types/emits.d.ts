export interface AutoLinkOptionEmitPayload {
  click: [type: AutoLinkEntryType, id: string, textHalf: string, textFull: string];
}

/** 贴纸离开某个列表的原因 */
export type StickerRemovedReason = "deleted" | "unfavorited" | "unshared";

/** `AttitudeStickerBrowser` 的事件 */
export interface AttitudeStickerBrowserEmitPayload {
  /**
   * 该行已离开当前列表，父组件应把它从自己的数组里剔除：
   *
   * - `deleted`：贴纸已删除（两个列表里都没有了）
   * - `unfavorited`：取消收藏，离开了「我的贴纸库」（广场里不适用）
   * - `unshared`：取消共享，离开了贴纸广场（「我的贴纸」里仍然保留）
   */
  stickerRemoved: [sticker: SupabaseAttitudeSticker, reason: StickerRemovedReason];
}

/** `AttitudeStickerList` 的事件 */
export interface AttitudeStickerListEmitPayload {
  /** 重命名成功：传入服务端确认后的新记录，父组件用它替换列表里的旧记录 */
  stickerRenamed: [sticker: SupabaseAttitudeSticker];
  /** 贴纸被移出「我的贴纸库」（删除 / 取消收藏）：父组件应把它从列表里剔除 */
  stickerRemoved: [sticker: SupabaseAttitudeSticker];
}

/** `AttitudeStickerPlaza` 的事件 */
export interface AttitudeStickerPlazaEmitPayload {
  /** 我共享的贴纸离开了广场（取消共享 / 删除）：父组件应刷新广场列表 */
  stickerRemoved: [sticker: SupabaseAttitudeSticker];
}
